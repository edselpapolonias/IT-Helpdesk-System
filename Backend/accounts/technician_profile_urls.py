from django.urls import path

from .profile_views import (
    TechnicianAvatarView,
    TechnicianChangePasswordView,
    TechnicianProfileView,
)


urlpatterns = [
    path("profile/", TechnicianProfileView.as_view(), name="technician-profile"),
    path(
        "profile/avatar/",
        TechnicianAvatarView.as_view(),
        name="technician-profile-avatar",
    ),
    path(
        "profile/change-password/",
        TechnicianChangePasswordView.as_view(),
        name="technician-profile-change-password",
    ),
]
