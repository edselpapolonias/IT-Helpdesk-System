from datetime import timedelta

from django.db.models import (
    BooleanField,
    Case,
    Count,
    DateTimeField,
    Exists,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Value,
    When,
)
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsITTechnician
from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)

from .technician_serializers import (
    TechnicianAssignedTicketSerializer,
    TechnicianAttentionTicketSerializer,
)


ALLOWED_PERIODS = {7, 30, 90}
ACTIVE_STATUSES = (
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.REOPENED,
)
PENDING_STATUSES = (Ticket.Status.ASSIGNED, Ticket.Status.REOPENED)


def requested_period(request):
    raw_days = request.query_params.get("days", "30")
    try:
        days = int(raw_days)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"days": "Days must be 7, 30, or 90."}) from exc
    if days not in ALLOWED_PERIODS:
        raise ValidationError({"days": "Days must be 7, 30, or 90."})
    return days


def current_assignments_for(technician):
    return TicketAssignment.objects.filter(
        technician=technician,
        is_current=True,
        ticket__assigned_technician=technician,
    )


def latest_resolution_annotations():
    latest_resolution = TicketResolution.objects.filter(
        ticket_id=OuterRef("pk")
    ).order_by("-resolved_at", "-id")
    return {
        "latest_resolver_id": Subquery(
            latest_resolution.values("resolved_by_id")[:1],
            output_field=IntegerField(),
        ),
        "latest_resolution_at": Subquery(
            latest_resolution.values("resolved_at")[:1],
            output_field=DateTimeField(),
        ),
    }


class TechnicianDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsITTechnician]


class TechnicianDashboardSummaryView(TechnicianDashboardView):
    def get(self, request):
        days = requested_period(request)
        start_time = timezone.now() - timedelta(days=days)
        assignments = current_assignments_for(request.user)
        assignment_counts = assignments.aggregate(
            total_assigned=Count("id"),
            pending=Count("id", filter=Q(ticket__status__in=PENDING_STATUSES)),
            in_progress=Count(
                "id", filter=Q(ticket__status=Ticket.Status.IN_PROGRESS)
            ),
        )

        attributed_tickets = Ticket.objects.annotate(
            **latest_resolution_annotations()
        ).filter(latest_resolver_id=request.user.id)
        resolved = attributed_tickets.filter(
            status=Ticket.Status.RESOLVED,
            latest_resolution_at__gte=start_time,
        ).count()
        completed = attributed_tickets.filter(
            status=Ticket.Status.CLOSED,
            closed_at__gte=start_time,
        ).count()

        return Response(
            {
                "days": days,
                **assignment_counts,
                "resolved": resolved,
                "completed": completed,
                "definitions": {
                    "resolved": "Resolved by you and awaiting requester confirmation.",
                    "completed": "Closed after the latest resolution was completed by you.",
                },
            }
        )


class TechnicianRecentTicketsView(TechnicianDashboardView):
    def get(self, request):
        assignments = (
            current_assignments_for(request.user)
            .filter(ticket__status__in=ACTIVE_STATUSES)
            .select_related("ticket", "ticket__category")
            .order_by("-assigned_at", "-id")[:5]
        )
        return Response(
            {"results": TechnicianAssignedTicketSerializer(assignments, many=True).data}
        )


class TechnicianAttentionView(TechnicianDashboardView):
    def get(self, request):
        technician = request.user
        technician_logs = TroubleshootingLog.objects.filter(
            ticket_id=OuterRef("ticket_id"),
            technician=technician,
            created_at__gte=OuterRef("assigned_at"),
        )
        technician_status_changes = TicketStatusHistory.objects.filter(
            ticket_id=OuterRef("ticket_id"),
            changed_by=technician,
            changed_at__gte=OuterRef("assigned_at"),
        )
        now = timezone.now()
        assignments = (
            current_assignments_for(technician)
            .filter(ticket__status__in=ACTIVE_STATUSES)
            .select_related("ticket", "ticket__category")
            .annotate(
                has_troubleshooting=Exists(technician_logs),
                has_status_action=Exists(technician_status_changes),
            )
            .annotate(
                awaiting_first_action=Case(
                    When(
                        has_troubleshooting=False,
                        has_status_action=False,
                        then=Value(True),
                    ),
                    default=Value(False),
                    output_field=BooleanField(),
                ),
                is_overdue=Case(
                    When(
                        ticket__resolution_due_at__isnull=False,
                        ticket__resolution_due_at__lt=now,
                        then=Value(True),
                    ),
                    default=Value(False),
                    output_field=BooleanField(),
                ),
                priority_rank=Case(
                    When(ticket__priority=Ticket.Priority.CRITICAL, then=0),
                    When(ticket__priority=Ticket.Priority.HIGH, then=1),
                    default=2,
                    output_field=IntegerField(),
                ),
            )
            .filter(
                Q(ticket__priority__in=(Ticket.Priority.CRITICAL, Ticket.Priority.HIGH))
                | Q(awaiting_first_action=True)
                | Q(is_overdue=True)
            )
            .order_by("priority_rank", "assigned_at", "id")[:8]
        )
        return Response(
            {"results": TechnicianAttentionTicketSerializer(assignments, many=True).data}
        )


class TechnicianActivityView(TechnicianDashboardView):
    result_limit = 12
    source_limit = 20

    def get(self, request):
        technician = request.user
        events = []

        assignments = (
            TicketAssignment.objects.filter(technician=technician)
            .select_related("ticket")
            .order_by("-assigned_at", "-id")[: self.source_limit]
        )
        for assignment in assignments:
            if assignment.assigned_at:
                events.append(
                    self.event(
                        assignment.ticket,
                        "ASSIGNED",
                        "Ticket assigned to you",
                        assignment.assigned_at,
                    )
                )
            if assignment.unassigned_at:
                events.append(
                    self.event(
                        assignment.ticket,
                        "REASSIGNED_AWAY",
                        "Ticket reassigned away from you",
                        assignment.unassigned_at,
                    )
                )

        status_changes = (
            TicketStatusHistory.objects.filter(changed_by=technician)
            .exclude(new_status=Ticket.Status.RESOLVED)
            .select_related("ticket")
            .order_by("-changed_at", "-id")[: self.source_limit]
        )
        for change in status_changes:
            if change.new_status == Ticket.Status.IN_PROGRESS:
                event_type = "WORK_STARTED"
                description = "Work started"
            else:
                event_type = "STATUS_UPDATED"
                description = f"Status updated to {change.get_new_status_display()}"
            events.append(
                self.event(change.ticket, event_type, description, change.changed_at)
            )

        logs = (
            TroubleshootingLog.objects.filter(technician=technician)
            .select_related("ticket")
            .order_by("-created_at", "-id")[: self.source_limit]
        )
        for log in logs:
            events.append(
                self.event(
                    log.ticket,
                    "TROUBLESHOOTING",
                    "Troubleshooting update recorded",
                    log.created_at,
                )
            )

        resolutions = (
            TicketResolution.objects.filter(resolved_by=technician)
            .select_related("ticket")
            .order_by("-resolved_at", "-id")[: self.source_limit]
        )
        for resolution in resolutions:
            events.append(
                self.event(
                    resolution.ticket,
                    "RESOLVED",
                    "Ticket resolved",
                    resolution.resolved_at,
                )
            )

        events.sort(key=lambda event: event["timestamp"], reverse=True)
        return Response({"results": events[: self.result_limit]})

    @staticmethod
    def event(ticket, event_type, description, timestamp):
        return {
            "id": f"{event_type}-{ticket.id}-{timestamp.isoformat()}",
            "ticket_id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "event_type": event_type,
            "description": description,
            "timestamp": timestamp,
        }
