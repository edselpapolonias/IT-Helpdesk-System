from django.urls import path

from .technician_management_views import (
    AdminTechnicianDetailView,
    AdminTechnicianListCreateView,
    AdminTechnicianPerformanceView,
    AdminTechnicianSetupLinkView,
    AdminTechnicianStatisticsView,
    AdminTechnicianStatusView,
    AdminTechnicianTicketsView,
)


urlpatterns = [
    path("", AdminTechnicianListCreateView.as_view(), name="admin-technician-list"),
    path(
        "statistics/",
        AdminTechnicianStatisticsView.as_view(),
        name="admin-technician-statistics",
    ),
    path(
        "<int:pk>/",
        AdminTechnicianDetailView.as_view(),
        name="admin-technician-detail",
    ),
    path(
        "<int:pk>/activate/",
        AdminTechnicianStatusView.as_view(action="activate"),
        name="admin-technician-activate",
    ),
    path(
        "<int:pk>/deactivate/",
        AdminTechnicianStatusView.as_view(action="deactivate"),
        name="admin-technician-deactivate",
    ),
    path(
        "<int:pk>/setup-link/",
        AdminTechnicianSetupLinkView.as_view(),
        name="admin-technician-setup-link",
    ),
    path(
        "<int:pk>/tickets/",
        AdminTechnicianTicketsView.as_view(),
        name="admin-technician-tickets",
    ),
    path(
        "<int:pk>/performance/",
        AdminTechnicianPerformanceView.as_view(),
        name="admin-technician-performance",
    ),
]
