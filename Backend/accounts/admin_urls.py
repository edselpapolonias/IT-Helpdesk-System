from django.urls import path

from .user_management_views import (
    AdminUserDetailView,
    AdminUserListCreateView,
    AdminUserSetupLinkView,
    AdminUserStatisticsView,
    AdminUserStatusView,
    AdminUserTicketsView,
)


urlpatterns = [
    path("", AdminUserListCreateView.as_view(), name="admin-user-list"),
    path("statistics/", AdminUserStatisticsView.as_view(), name="admin-user-statistics"),
    path("<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path(
        "<int:pk>/activate/",
        AdminUserStatusView.as_view(action="activate"),
        name="admin-user-activate",
    ),
    path(
        "<int:pk>/deactivate/",
        AdminUserStatusView.as_view(action="deactivate"),
        name="admin-user-deactivate",
    ),
    path(
        "<int:pk>/setup-link/",
        AdminUserSetupLinkView.as_view(),
        name="admin-user-setup-link",
    ),
    path(
        "<int:pk>/tickets/",
        AdminUserTicketsView.as_view(),
        name="admin-user-tickets",
    ),
]
