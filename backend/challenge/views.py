from datetime import timedelta
import secrets

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Student, DayRoutine, Progress, AdminToken
from .serializers import (
    DayRoutineSerializer, DayRoutineWriteSerializer, ProgressSerializer,
    RegisterSerializer, StudentSerializer, AdminStudentSerializer,
)

TOTAL_DAYS = 150
PHASES = [
    {"key": "বেসিক টু এডভান্স", "label": "বেসিক টু এডভান্স", "days": 100, "color": "#008643"},
    {"key": "ফাইনাল রিভিশন", "label": "ফাইনাল রিভিশন", "days": 30, "color": "#01542b"},
    {"key": "কুইক রিভিশন", "label": "কুইক রিভিশন", "days": 10, "color": "#fc465d"},
    {"key": "মডেল টেস্ট", "label": "মডেল টেস্ট", "days": 10, "color": "#667eea"},
]


def _student_day_number(student):
    """Day number (1-based) based on Asia/Dhaka date difference."""
    tz = timezone.get_current_timezone()
    today = timezone.localdate(timezone.now())
    start_date = timezone.localdate(student.started_at, tz)
    return (today - start_date).days + 1


# ===== Admin auth helpers =====
def _check_admin_token(request):
    """Return AdminToken if valid, else None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token_val = auth[7:].strip()
    try:
        obj = AdminToken.objects.get(token=token_val)
    except AdminToken.DoesNotExist:
        return None
    if not obj.is_valid():
        return None
    return obj


def _admin_required(view_func):
    """Simple decorator for admin endpoints."""
    from functools import wraps
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        request.admin_token = tok
        return view_func(self, request, *args, **kwargs)
    return wrapper


class MetaView(APIView):
    def get(self, request):
        return Response({
            "title": "১৫০ দিনে নার্স স্বপ্ন পূরণের চ্যালেঞ্জ",
            "total_days": TOTAL_DAYS,
            "phases": PHASES,
        })


class RegisterView(APIView):
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        student = ser.save()
        return Response({
            "student": StudentSerializer(student).first(),
        } if False else {
            "id": student.id,
            "name": student.name,
            "mobile": student.mobile,
            "started_at": student.started_at,
            "is_new": not Progress.objects.filter(student=student).exists(),
        }, status=status.HTTP_201_CREATED)


class StudentLookupView(APIView):
    """Get student by mobile number."""
    def get(self, request):
        mobile = (request.query_params.get("mobile") or "").strip()
        if not mobile:
            return Response({"detail": "mobile প্যারামিটার দিন।"}, status=400)
        try:
            student = Student.objects.get(mobile=mobile)
        except Student.DoesNotExist:
            return Response({"detail": "এই নাম্বারে কোনো অ্যাকাউন্ট নেই।"}, status=404)
        return Response(self._payload(student))

    def _payload(self, student):
        current_day = _student_day_number(student)
        current_day = max(1, min(current_day, TOTAL_DAYS))
        total = DayRoutine.objects.count()
        completed_qs = Progress.objects.filter(student=student, completed=True)
        completed = completed_qs.count()
        completed_day_numbers = list(
            completed_qs.values_list("routine__day_number", flat=True)
        )
        remaining = max(0, TOTAL_DAYS - current_day)
        missed = max(0, current_day - 1 - completed)
        try:
            today_routine = DayRoutine.objects.get(day_number=current_day)
            today_routine_data = DayRoutineSerializer(today_routine).data
            today_progress = Progress.objects.filter(
                student=student, routine=today_routine
            ).first()
        except DayRoutine.DoesNotExist:
            today_routine_data = None
            today_progress = None
        return {
            "id": student.id,
            "name": student.name,
            "mobile": student.mobile,
            "started_at": student.started_at,
            "current_day": current_day,
            "total_days": TOTAL_DAYS,
            "completed_days": completed,
            "completed_day_numbers": completed_day_numbers,
            "remaining_days": remaining,
            "missed_days": missed,
            "today_routine": today_routine_data,
            "today_completed": bool(today_progress and today_progress.completed),
        }


class RoutineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DayRoutine.objects.all().order_by("day_number")
    serializer_class = DayRoutineSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        phase = self.request.query_params.get("phase")
        subject = self.request.query_params.get("subject")
        if phase:
            qs = qs.filter(phase=phase)
        if subject:
            qs = qs.filter(subject=subject)
        return qs

    @action(detail=False, methods=["get"])
    def filters(self, request):
        phases = list(
            DayRoutine.objects.values_list("phase", flat=True).distinct().order_by("phase")
        )
        subjects = list(
            DayRoutine.objects.exclude(subject="").values_list("subject", flat=True).distinct().order_by("subject")
        )
        return Response({"phases": phases, "subjects": subjects})


class ProgressView(APIView):
    """Toggle / set completion for a given day for a student (by mobile)."""

    def post(self, request):
        mobile = (request.data.get("mobile") or "").strip()
        day_number = request.data.get("day_number")
        completed = request.data.get("completed")
        if not mobile or day_number is None:
            return Response({"detail": "mobile ও day_number দিন।"}, status=400)
        try:
            student = Student.objects.get(mobile=mobile)
        except Student.DoesNotExist:
            return Response({"detail": "অ্যাকাউন্ট পাওয়া যায়নি।"}, status=404)
        try:
            routine = DayRoutine.objects.get(day_number=day_number)
        except DayRoutine.DoesNotExist:
            return Response({"detail": "রুটিন পাওয়া যায়নি।"}, status=404)
        if completed is None:
            completed = True
        obj, _ = Progress.objects.update_or_create(
            student=student, routine=routine, defaults={"completed": bool(completed)},
        )
        return Response(ProgressSerializer(obj).data)


# ===== Admin endpoints =====
class AdminLoginView(APIView):
    """Admin login with username + password (Django superuser)."""

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        if not username or not password:
            return Response({"detail": "username ও password দিন।"}, status=400)
        user = authenticate(request, username=username, password=password)
        if not user or not user.is_staff:
            return Response({"detail": "ভুল ক্রেডেনশিয়াল বা অ্যাডমিন নন।"}, status=401)
        # invalidate old tokens for this user
        AdminToken.objects.filter(username=username).delete()
        token_val = secrets.token_hex(32)
        AdminToken.objects.create(
            token=token_val,
            username=username,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        return Response({
            "token": token_val,
            "username": username,
            "is_superuser": user.is_superuser,
        })


class AdminStatsView(APIView):
    def get(self, request):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        total_students = Student.objects.count()
        total_routines = DayRoutine.objects.count()
        total_progress = Progress.objects.filter(completed=True).count()
        # phase breakdown
        phases = []
        for p in PHASES:
            count = DayRoutine.objects.filter(phase=p["key"]).count()
            phases.append({"key": p["key"], "label": p["label"], "days": p["days"], "color": p["color"], "count": count})
        # recent students (last 5)
        recent = []
        for s in Student.objects.order_by("-started_at")[:5]:
            cd = _student_day_number(s)
            comp = s.progress.filter(completed=True).count()
            recent.append({
                "id": s.id, "name": s.name, "mobile": s.mobile,
                "started_at": s.started_at, "current_day": cd, "completed_days": comp,
            })
        # students per phase progress (avg completion)
        return Response({
            "total_students": total_students,
            "total_routines": total_routines,
            "total_completions": total_progress,
            "phases": phases,
            "recent_students": recent,
        })


class AdminStudentListView(APIView):
    def get(self, request):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        search = (request.query_params.get("search") or "").strip()
        qs = Student.objects.all().order_by("-started_at")
        if search:
            qs = qs.filter(name__icontains=search) | qs.filter(mobile__icontains=search)
        students = []
        for s in qs:
            cd = _student_day_number(s)
            comp = s.progress.filter(completed=True).count()
            total = DayRoutine.objects.count() or 1
            students.append({
                "id": s.id, "name": s.name, "mobile": s.mobile,
                "started_at": s.started_at, "current_day": cd,
                "completed_days": comp, "remaining_days": max(0, TOTAL_DAYS - cd),
                "progress_pct": round(comp / total * 100, 1),
            })
        return Response({"students": students, "count": len(students)})

    def delete(self, request):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        sid = request.data.get("id")
        if not sid:
            return Response({"detail": "id দিন।"}, status=400)
        Student.objects.filter(id=sid).delete()
        return Response({"ok": True})


class AdminRoutineView(APIView):
    """CRUD for DayRoutine (admin only)."""

    def get(self, request):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        qs = DayRoutine.objects.all().order_by("day_number")
        phase = request.query_params.get("phase")
        if phase:
            qs = qs.filter(phase=phase)
        return Response({"routines": DayRoutineWriteSerializer(qs, many=True).data})

    def post(self, request):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        ser = DayRoutineWriteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(DayRoutineWriteSerializer(obj).data, status=201)

    def put(self, request, pk=None):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        pk = pk or request.data.get("id")
        try:
            obj = DayRoutine.objects.get(pk=pk)
        except DayRoutine.DoesNotExist:
            return Response({"detail": "রুটিন পাওয়া যায়নি।"}, status=404)
        ser = DayRoutineWriteSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(DayRoutineWriteSerializer(ser.instance).data)

    def delete(self, request, pk=None):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        pk = pk or request.data.get("id")
        DayRoutine.objects.filter(pk=pk).delete()
        return Response({"ok": True})


class AdminStudentProgressView(APIView):
    """Get full progress history for a student (admin)."""

    def get(self, request, student_id):
        tok = _check_admin_token(request)
        if not tok:
            return Response({"detail": "অ্যাডমিন লগইন প্রয়োজন।"}, status=401)
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"detail": "শিক্ষার্থী পাওয়া যায়নি।"}, status=404)
        progress = Progress.objects.filter(student=student).select_related("routine").order_by("routine__day_number")
        cd = _student_day_number(student)
        return Response({
            "student": {
                "id": student.id, "name": student.name, "mobile": student.mobile,
                "started_at": student.started_at, "current_day": cd,
            },
            "progress": [
                {"day_number": p.routine.day_number, "completed": p.completed, "updated_at": p.updated_at}
                for p in progress
            ],
        })
