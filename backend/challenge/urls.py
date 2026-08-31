from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MetaView, RegisterView, StudentLookupView, RoutineViewSet, ProgressView,
    AdminLoginView, AdminStatsView, AdminStudentListView, AdminRoutineView,
    AdminStudentProgressView,
)

router = DefaultRouter()
router.register("routine", RoutineViewSet, basename="routine")

urlpatterns = [
    path("meta/", MetaView.as_view()),
    path("register/", RegisterView.as_view()),
    path("student/", StudentLookupView.as_view()),
    path("progress/", ProgressView.as_view()),
    path("", include(router.urls)),
    # Admin
    path("admin/login/", AdminLoginView.as_view()),
    path("admin/stats/", AdminStatsView.as_view()),
    path("admin/students/", AdminStudentListView.as_view()),
    path("admin/routine/", AdminRoutineView.as_view()),
    path("admin/routine/<int:pk>/", AdminRoutineView.as_view()),
    path("admin/student/<int:student_id>/progress/", AdminStudentProgressView.as_view()),
]
