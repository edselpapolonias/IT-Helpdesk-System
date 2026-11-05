from django.urls import path

from .profile_views import UserAvatarView, UserChangePasswordView, UserProfileView


urlpatterns = [
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/avatar/", UserAvatarView.as_view(), name="user-profile-avatar"),
    path(
        "profile/change-password/",
        UserChangePasswordView.as_view(),
        name="user-profile-change-password",
    ),
]
