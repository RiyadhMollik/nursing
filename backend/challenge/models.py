from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=120)
    mobile = models.CharField(max_length=20, unique=True, db_index=True)
    started_at = models.DateTimeField(auto_now_add=True)
    # day 1 starts on the date of started_at (Asia/Dhaka)

    def __str__(self):
        return f"{self.name} ({self.mobile})"


class DayRoutine(models.Model):
    PHASE_CHOICES = [
        ("বেসিক টু এডভান্স", "বেসিক টু এডভান্স"),
        ("ফাইনাল রিভিশন", "ফাইনাল রিভিশন"),
        ("কুইক রিভিশন", "কুইক রিভিশন"),
        ("মডেল টেস্ট", "মডেল টেস্ট"),
    ]

    day_number = models.PositiveIntegerField(unique=True, db_index=True)
    phase = models.CharField(max_length=40, choices=PHASE_CHOICES)
    subject = models.CharField(max_length=80, blank=True)
    lecture = models.CharField(max_length=120, blank=True)
    bsc_topic = models.TextField(blank=True)
    diploma_topic = models.TextField(blank=True)
    live_class_link = models.URLField(max_length=500, blank=True)
    question_bank_link = models.URLField(max_length=500, blank=True)
    exam_link = models.URLField(max_length=500, blank=True)
    book_link = models.URLField(max_length=500, blank=True)

    class Meta:
        ordering = ["day_number"]

    def __str__(self):
        return f"Day-{self.day_number} ({self.phase})"


class Progress(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="progress")
    routine = models.ForeignKey(DayRoutine, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "routine")

    def __str__(self):
        return f"{self.student_id} Day-{self.routine.day_number} {'✓' if self.completed else '·'}"


class AdminToken(models.Model):
    token = models.CharField(max_length=64, unique=True, db_index=True)
    username = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"{self.username} ({'valid' if self.is_valid() else 'expired'})"
