from django.urls import path

from .admin_views import (
    AdminTicketAttachmentDownloadView,
    AdminTicketAttachmentsView,
    AdminTicketDetailView,
    AdminTicketHistoryView,
    AdminTicketListView,
    AdminTicketPriorityView,
    AdminTicketResolutionsView,
    AdminTicketStatisticsView,
    AdminTicketStatusView,
    AdminTicketTroubleshootingView,
)


urlpatterns = [
    path("", AdminTicketListView.as_view(), name="admin-ticket-list"),
    path("statistics/", AdminTicketStatisticsView.as_view(), name="admin-ticket-statistics"),
    path("<int:pk>/", AdminTicketDetailView.as_view(), name="admin-ticket-detail"),
    path("<int:pk>/priority/", AdminTicketPriorityView.as_view(), name="admin-ticket-priority"),
    path("<int:pk>/status/", AdminTicketStatusView.as_view(), name="admin-ticket-status"),
    path("<int:pk>/history/", AdminTicketHistoryView.as_view(), name="admin-ticket-history"),
    path("<int:pk>/troubleshooting/", AdminTicketTroubleshootingView.as_view(), name="admin-ticket-troubleshooting"),
    path("<int:pk>/resolutions/", AdminTicketResolutionsView.as_view(), name="admin-ticket-resolutions"),
    path("<int:pk>/attachments/", AdminTicketAttachmentsView.as_view(), name="admin-ticket-attachments"),
    path("<int:pk>/attachments/<int:attachment_id>/download/", AdminTicketAttachmentDownloadView.as_view(), name="admin-ticket-attachment-download"),
]
