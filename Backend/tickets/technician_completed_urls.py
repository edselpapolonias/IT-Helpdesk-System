from django.urls import path

from .technician_views import (
    TechnicianCompletedListView,
    TechnicianCompletedStatisticsView,
)


urlpatterns = [
    path("", TechnicianCompletedListView.as_view(), name="technician-completed-list"),
    path(
        "statistics/",
        TechnicianCompletedStatisticsView.as_view(),
        name="technician-completed-statistics",
    ),
]
