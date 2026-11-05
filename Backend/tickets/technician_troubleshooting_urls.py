from django.urls import path

from .technician_views import (
    TechnicianTroubleshootingDetailView,
    TechnicianTroubleshootingHistoryView,
)


urlpatterns = [
    path(
        "",
        TechnicianTroubleshootingHistoryView.as_view(),
        name="technician-troubleshooting-history",
    ),
    path(
        "<int:pk>/",
        TechnicianTroubleshootingDetailView.as_view(),
        name="technician-troubleshooting-detail",
    ),
]
