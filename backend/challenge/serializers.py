import re

from rest_framework import serializers
from .models import Student, DayRoutine, Progress


ROUTINE_FIELDS = [
    "id", "day_number", "phase", "subject", "lecture",
    "bsc_lecture", "bsc_topic", "diploma_lecture", "diploma_topic",
    "motivational_line",
    "live_class_link", "question_bank_link", "exam_link", "book_link",
]
# The four resource links the dashboard renders as cards.
LINK_FIELDS = ["live_class_link", "question_bank_link", "exam_link", "book_link"]
_SCHEME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.\-]*://")


def normalize_link(value):
    """Links are pasted by hand in the admin panel, so stay permissive:
    a bare `youtu.be/xyz` should still reach the dashboard as a real link."""
    value = (value or "").strip()
    if not value:
        return ""
    if not _SCHEME_RE.match(value):
        value = "https://" + value
    return value[:500]


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["id", "name", "mobile", "started_at"]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    mobile = serializers.CharField(max_length=20)

    def validate_mobile(self, value):
        value = "".join(value.split())
        if not value:
            raise serializers.ValidationError("মোবাইল নাম্বার দিন।")
        return value

    def create(self, validated_data):
        student, created = Student.objects.get_or_create(
            mobile=validated_data["mobile"],
            defaults={"name": validated_data["name"]},
        )
        return student


def _link_field():
    """Plain CharField instead of URLField: a strict URL check here made the
    admin panel silently reject links typed without an `https://` prefix."""
    return serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True, default="",
    )


class DayRoutineSerializer(serializers.ModelSerializer):
    live_class_link = _link_field()
    question_bank_link = _link_field()
    exam_link = _link_field()
    book_link = _link_field()

    class Meta:
        model = DayRoutine
        fields = ROUTINE_FIELDS

    def validate(self, attrs):
        for name in LINK_FIELDS:
            if name in attrs:
                attrs[name] = normalize_link(attrs[name])
        return attrs


class ProgressSerializer(serializers.ModelSerializer):
    day_number = serializers.IntegerField(source="routine.day_number", read_only=True)

    class Meta:
        model = Progress
        fields = ["id", "day_number", "completed", "updated_at"]


class DayRoutineWriteSerializer(DayRoutineSerializer):
    """Same shape as the read serializer; kept separate for the admin endpoints."""
    pass


class AdminStudentSerializer(serializers.ModelSerializer):
    completed_days = serializers.SerializerMethodField()
    current_day = serializers.SerializerMethodField()
    progress_pct = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ["id", "name", "mobile", "started_at", "completed_days", "current_day", "progress_pct"]

    def _student_day_number(self, student):
        from django.utils import timezone
        from ..views import _student_day_number
        return _student_day_number(student)

    def get_completed_days(self, obj):
        return obj.progress.filter(completed=True).count()

    def get_current_day(self, obj):
        return self._student_day_number(obj)

    def get_progress_pct(self, obj):
        cd = self._student_day_number(obj)
        total = DayRoutine.objects.count() or 1
        comp = obj.progress.filter(completed=True).count()
        return round(comp / total * 100, 1)
