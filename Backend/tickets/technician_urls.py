from django.urls import path

from .technician_views import (
    TechnicianTicketAttachmentDownloadView,
    TechnicianTicketAttachmentsView,
    TechnicianTicketDetailView,
    TechnicianTicketHistoryView,
    TechnicianTicketListView,
    TechnicianTicketResolutionsView,
    TechnicianTicketStartWorkView,
    TechnicianTicketStatisticsView,
    TechnicianTicketTroubleshootingView,
)


urlpatterns = [
    path("", TechnicianTicketListView.as_view(), name="technician-ticket-list"),
    path("statistics/", TechnicianTicketStatisticsView.as_view(), name="technician-ticket-statistics"),
    path("<int:pk>/", TechnicianTicketDetailView.as_view(), name="technician-ticket-detail"),
    path("<int:pk>/history/", TechnicianTicketHistoryView.as_view(), name="technician-ticket-history"),
    path("<int:pk>/attachments/", TechnicianTicketAttachmentsView.as_view(), name="technician-ticket-attachments"),
    path(
        "<int:pk>/attachments/<int:attachment_id>/download/",
        TechnicianTicketAttachmentDownloadView.as_view(),
        name="technician-ticket-attachment-download",
    ),
    path(
        "<int:pk>/troubleshooting/",
        TechnicianTicketTroubleshootingView.as_view(),
        name="technician-ticket-troubleshooting",
    ),
    path("<int:pk>/resolutions/", TechnicianTicketResolutionsView.as_view(), name="technician-ticket-resolutions"),
    path("<int:pk>/start-work/", TechnicianTicketStartWorkView.as_view(), name="technician-ticket-start-work"),
]
