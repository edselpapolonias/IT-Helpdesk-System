from django.urls import path

from .assignment_views import (
    AdminAssignmentHistoryView,
    AdminAssignmentListCreateView,
    AdminAssignmentStatisticsView,
    AdminEligibleTechnicianView,
    AdminReassignmentView,
    AdminTechnicianWorkloadView,
    AdminUnassignedTicketView,
)


urlpatterns = [
    path("", AdminAssignmentListCreateView.as_view(), name="admin-assignment-list-create"),
    path("reassign/", AdminReassignmentView.as_view(), name="admin-assignment-reassign"),
    path("unassigned/", AdminUnassignedTicketView.as_view(), name="admin-assignment-unassigned"),
    path("history/", AdminAssignmentHistoryView.as_view(), name="admin-assignment-history"),
    path("eligible-technicians/", AdminEligibleTechnicianView.as_view(), name="admin-assignment-eligible"),
    path("workloads/", AdminTechnicianWorkloadView.as_view(), name="admin-assignment-workloads"),
    path("statistics/", AdminAssignmentStatisticsView.as_view(), name="admin-assignment-statistics"),
]
