from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsRegularUser
from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketResolution,
    TicketStatusHistory,
)

from .user_serializers import UserRecentTicketSerializer, UserTicketDetailSerializer


class RegularUserDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsRegularUser]


class UserDashboardSummaryView(RegularUserDashboardView):
    def get(self, request):
        tickets = Ticket.objects.filter(requester=request.user)
        counts = tickets.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=Ticket.Status.OPEN)),
            assigned=Count("id", filter=Q(status=Ticket.Status.ASSIGNED)),
            in_progress=Count("id", filter=Q(status=Ticket.Status.IN_PROGRESS)),
            resolved=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
            closed=Count("id", filter=Q(status=Ticket.Status.CLOSED)),
        )
        counts["status_distribution"] = [
            {"status": status, "count": counts[key]}
            for status, key in (
                (Ticket.Status.OPEN, "open"),
                (Ticket.Status.ASSIGNED, "assigned"),
                (Ticket.Status.IN_PROGRESS, "in_progress"),
                (Ticket.Status.RESOLVED, "resolved"),
                (Ticket.Status.CLOSED, "closed"),
            )
        ]
        return Response(counts)


class UserRecentTicketsView(RegularUserDashboardView):
    def get(self, request):
        tickets = (
            Ticket.objects.filter(requester=request.user)
            .select_related("category")
            .order_by("-created_at")[:5]
        )
        return Response(
            {"results": UserRecentTicketSerializer(tickets, many=True).data}
        )


class UserRecentActivityView(RegularUserDashboardView):
    def get(self, request):
        events = []
        submitted = Ticket.objects.filter(requester=request.user).only(
            "id", "ticket_number", "created_at"
        ).order_by("-created_at")[:10]
        for ticket in submitted:
            events.append(
                {
                    "type": "submitted",
                    "title": "Ticket submitted",
                    "ticket_id": ticket.id,
                    "ticket_number": ticket.ticket_number,
                    "timestamp": ticket.created_at,
                    "description": "Your support request was received by the helpdesk.",
                }
            )

        assignments = (
            TicketAssignment.objects.filter(
                ticket__requester=request.user,
                assigned_at__isnull=False,
            )
            .select_related("ticket", "technician")
            .order_by("-assigned_at")[:10]
        )
        for assignment in assignments:
            technician_name = (
                assignment.technician.get_full_name()
                or assignment.technician.username
            )
            events.append(
                {
                    "type": "assignment",
                    "title": (
                        "Technician reassigned"
                        if assignment.reassignment_reason
                        else "Technician assigned"
                    ),
                    "ticket_id": assignment.ticket_id,
                    "ticket_number": assignment.ticket.ticket_number,
                    "timestamp": assignment.assigned_at,
                    "description": f"{technician_name} is assigned to your request.",
                }
            )

        status_changes = (
            TicketStatusHistory.objects.filter(ticket__requester=request.user)
            .exclude(new_status=Ticket.Status.ASSIGNED)
            .select_related("ticket")
            .order_by("-changed_at")[:10]
        )
        for change in status_changes:
            events.append(
                {
                    "type": "status",
                    "title": f"Ticket marked {change.get_new_status_display()}",
                    "ticket_id": change.ticket_id,
                    "ticket_number": change.ticket.ticket_number,
                    "timestamp": change.changed_at,
                    "description": (
                        f"Status changed from {change.get_previous_status_display()} "
                        f"to {change.get_new_status_display()}."
                    ),
                }
            )

        resolutions = (
            TicketResolution.objects.filter(ticket__requester=request.user)
            .select_related("ticket")
            .order_by("-resolved_at")[:10]
        )
        for resolution in resolutions:
            events.append(
                {
                    "type": "resolution",
                    "title": "Resolution recorded",
                    "ticket_id": resolution.ticket_id,
                    "ticket_number": resolution.ticket.ticket_number,
                    "timestamp": resolution.resolved_at,
                    "description": "The technician recorded a resolution for your request.",
                }
            )

        events.sort(key=lambda event: event["timestamp"], reverse=True)
        return Response({"results": events[:10]})


class UserTicketDetailView(RegularUserDashboardView):
    def get(self, request, pk):
        ticket = get_object_or_404(
            Ticket.objects.select_related("category", "assigned_technician"),
            pk=pk,
            requester=request.user,
        )
        return Response(UserTicketDetailSerializer(ticket).data)
