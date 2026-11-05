from django.urls import path

from .technician_views import (
    TechnicianTicketDetailView,
    TechnicianTicketListView,
    TechnicianTicketStartWorkView,
    TechnicianTicketStatisticsView,
)


urlpatterns = [
    path("", TechnicianTicketListView.as_view(), name="technician-ticket-list"),
    path("statistics/", TechnicianTicketStatisticsView.as_view(), name="technician-ticket-statistics"),
    path("<int:pk>/", TechnicianTicketDetailView.as_view(), name="technician-ticket-detail"),
    path("<int:pk>/start-work/", TechnicianTicketStartWorkView.as_view(), name="technician-ticket-start-work"),
]
