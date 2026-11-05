from django.urls import path

from .user_views import (
    UserDashboardSummaryView,
    UserRecentActivityView,
    UserRecentTicketsView,
    UserTicketAttachmentDownloadView,
    UserTicketActivityView,
    UserTicketCreateView,
    UserTicketDetailView,
    UserTicketReopenRequestView,
    UserTicketResolutionConfirmView,
    UserTicketResolutionView,
)


urlpatterns = [
    path("dashboard/summary/", UserDashboardSummaryView.as_view(), name="user-dashboard-summary"),
    path("dashboard/recent-tickets/", UserRecentTicketsView.as_view(), name="user-dashboard-recent-tickets"),
    path("dashboard/recent-activity/", UserRecentActivityView.as_view(), name="user-dashboard-recent-activity"),
    path("tickets/", UserTicketCreateView.as_view(), name="user-ticket-create"),
    path("tickets/<int:pk>/", UserTicketDetailView.as_view(), name="user-ticket-detail"),
    path("tickets/<int:pk>/activity/", UserTicketActivityView.as_view(), name="user-ticket-activity"),
    path("tickets/<int:pk>/resolution/", UserTicketResolutionView.as_view(), name="user-ticket-resolution"),
    path("tickets/<int:pk>/confirm-resolution/", UserTicketResolutionConfirmView.as_view(), name="user-ticket-confirm-resolution"),
    path("tickets/<int:pk>/request-reopen/", UserTicketReopenRequestView.as_view(), name="user-ticket-request-reopen"),
    path("tickets/<int:pk>/reopen/", UserTicketReopenRequestView.as_view(), name="user-ticket-reopen"),
    path("tickets/<int:pk>/attachments/<int:attachment_id>/download/", UserTicketAttachmentDownloadView.as_view(), name="user-ticket-attachment-download"),
]
