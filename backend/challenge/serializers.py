from rest_framework import serializers
from .models import Student, DayRoutine, Progress


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


class DayRoutineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayRoutine
        fields = [
            "id", "day_number", "phase", "subject", "lecture",
            "bsc_topic", "diploma_topic",
            "live_class_link", "question_bank_link", "exam_link", "book_link",
        ]


class ProgressSerializer(serializers.ModelSerializer):
    day_number = serializers.IntegerField(source="routine.day_number", read_only=True)

    class Meta:
        model = Progress
        fields = ["id", "day_number", "completed", "updated_at"]


class DayRoutineWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayRoutine
        fields = [
            "id", "day_number", "phase", "subject", "lecture",
            "bsc_topic", "diploma_topic",
            "live_class_link", "question_bank_link", "exam_link", "book_link",
        ]


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
