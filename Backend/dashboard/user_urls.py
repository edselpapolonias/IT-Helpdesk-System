from django.urls import path

from .user_views import (
    UserDashboardSummaryView,
    UserRecentActivityView,
    UserRecentTicketsView,
    UserTicketDetailView,
)


urlpatterns = [
    path("dashboard/summary/", UserDashboardSummaryView.as_view(), name="user-dashboard-summary"),
    path("dashboard/recent-tickets/", UserRecentTicketsView.as_view(), name="user-dashboard-recent-tickets"),
    path("dashboard/recent-activity/", UserRecentActivityView.as_view(), name="user-dashboard-recent-activity"),
    path("tickets/<int:pk>/", UserTicketDetailView.as_view(), name="user-ticket-detail"),
]
