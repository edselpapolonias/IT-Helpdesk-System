from django.urls import path

from .user_management_views import PasswordSetupView
from .views import CurrentUserView, LoginView, LogoutView


urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
    path("setup-password/", PasswordSetupView.as_view(), name="setup-password"),
]
