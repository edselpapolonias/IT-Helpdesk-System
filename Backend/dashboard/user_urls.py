from django.urls import path

from .user_views import (
    UserDashboardSummaryView,
    UserRecentActivityView,
    UserRecentTicketsView,
    UserTicketAttachmentDownloadView,
    UserTicketCreateView,
    UserTicketDetailView,
)


urlpatterns = [
    path("dashboard/summary/", UserDashboardSummaryView.as_view(), name="user-dashboard-summary"),
    path("dashboard/recent-tickets/", UserRecentTicketsView.as_view(), name="user-dashboard-recent-tickets"),
    path("dashboard/recent-activity/", UserRecentActivityView.as_view(), name="user-dashboard-recent-activity"),
    path("tickets/", UserTicketCreateView.as_view(), name="user-ticket-create"),
    path("tickets/<int:pk>/", UserTicketDetailView.as_view(), name="user-ticket-detail"),
    path("tickets/<int:pk>/attachments/<int:attachment_id>/download/", UserTicketAttachmentDownloadView.as_view(), name="user-ticket-attachment-download"),
]
