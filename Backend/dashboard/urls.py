from django.urls import path

from .views import (
    DashboardSummaryView,
    RecentTicketsView,
    TechnicianWorkloadView,
    TicketCategoriesView,
    TicketTrendsView,
    TicketsAttentionView,
)


urlpatterns = [
    path("summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("ticket-trends/", TicketTrendsView.as_view(), name="ticket-trends"),
    path(
        "ticket-categories/",
        TicketCategoriesView.as_view(),
        name="ticket-categories",
    ),
    path(
        "recent-tickets/",
        RecentTicketsView.as_view(),
        name="recent-tickets",
    ),
    path("attention/", TicketsAttentionView.as_view(), name="ticket-attention"),
    path(
        "technician-workload/",
        TechnicianWorkloadView.as_view(),
        name="technician-workload",
    ),
]
