from django.urls import path

from .technician_views import (
    TechnicianActivityView,
    TechnicianAttentionView,
    TechnicianDashboardSummaryView,
    TechnicianRecentTicketsView,
)


urlpatterns = [
    path("summary/", TechnicianDashboardSummaryView.as_view(), name="technician-dashboard-summary"),
    path("recent-tickets/", TechnicianRecentTicketsView.as_view(), name="technician-dashboard-recent-tickets"),
    path("attention/", TechnicianAttentionView.as_view(), name="technician-dashboard-attention"),
    path("activity/", TechnicianActivityView.as_view(), name="technician-dashboard-activity"),
]
