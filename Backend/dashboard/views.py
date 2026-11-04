from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsITAdministrator
from tickets.models import Ticket, TicketCategory

from .serializers import RecentTicketSerializer, TechnicianWorkloadSerializer


ALLOWED_PERIODS = {7, 30, 90}
ACTIONABLE_STATUSES = (
    Ticket.Status.OPEN,
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
)


def requested_period(request):
    raw_days = request.query_params.get("days", "30")
    try:
        days = int(raw_days)
    except (TypeError, ValueError) as exc:
        raise ValidationError({"days": "Days must be 7, 30, or 90."}) from exc

    if days not in ALLOWED_PERIODS:
        raise ValidationError({"days": "Days must be 7, 30, or 90."})
    return days


class AdminDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated, IsITAdministrator]


class DashboardSummaryView(AdminDashboardAPIView):
    def get(self, request):
        ticket_counts = Ticket.objects.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=Ticket.Status.OPEN)),
            in_progress=Count(
                "id", filter=Q(status=Ticket.Status.IN_PROGRESS)
            ),
            resolved=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
            critical=Count(
                "id",
                filter=Q(
                    priority=Ticket.Priority.CRITICAL,
                    status__in=ACTIONABLE_STATUSES,
                ),
            ),
            unassigned=Count(
                "id",
                filter=Q(
                    status__in=ACTIONABLE_STATUSES,
                    assigned_technician__isnull=True,
                ),
            ),
        )
        ticket_counts["active_technicians"] = User.objects.filter(
            role=User.Role.TECHNICIAN,
            is_active=True,
        ).count()
        return Response(ticket_counts)


class TicketTrendsView(AdminDashboardAPIView):
    def get(self, request):
        days = requested_period(request)
        today = timezone.localdate()
        start_date = today - timedelta(days=days - 1)
        tz = timezone.get_current_timezone()

        submitted_rows = (
            Ticket.objects.filter(created_at__date__gte=start_date)
            .annotate(day=TruncDate("created_at", tzinfo=tz))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        resolved_rows = (
            Ticket.objects.filter(resolved_at__date__gte=start_date)
            .annotate(day=TruncDate("resolved_at", tzinfo=tz))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        submitted = {row["day"]: row["count"] for row in submitted_rows}
        resolved = {row["day"]: row["count"] for row in resolved_rows}
        data = []
        for offset in range(days):
            day = start_date + timedelta(days=offset)
            data.append(
                {
                    "date": day.isoformat(),
                    "submitted": submitted.get(day, 0),
                    "resolved": resolved.get(day, 0),
                }
            )
        return Response({"days": days, "results": data})


class TicketCategoriesView(AdminDashboardAPIView):
    def get(self, request):
        days = requested_period(request)
        start_date = timezone.localdate() - timedelta(days=days - 1)
        categories = (
            TicketCategory.objects.filter(is_active=True)
            .annotate(
                count=Count(
                    "tickets",
                    filter=Q(tickets__created_at__date__gte=start_date),
                )
            )
            .values("id", "name", "slug", "count")
            .order_by("name")
        )
        return Response({"days": days, "results": list(categories)})


class RecentTicketsView(AdminDashboardAPIView):
    def get(self, request):
        tickets = Ticket.objects.select_related(
            "requester", "category", "assigned_technician"
        ).order_by("-created_at")[:8]
        return Response({"results": RecentTicketSerializer(tickets, many=True).data})


class TicketsAttentionView(AdminDashboardAPIView):
    def get(self, request):
        unresolved = Q(status__in=ACTIONABLE_STATUSES)
        counts = Ticket.objects.aggregate(
            unassigned=Count(
                "id",
                filter=unresolved & Q(assigned_technician__isnull=True),
            ),
            critical=Count(
                "id",
                filter=unresolved & Q(priority=Ticket.Priority.CRITICAL),
            ),
            overdue=Count(
                "id",
                filter=unresolved
                & Q(resolution_due_at__isnull=False)
                & Q(resolution_due_at__lt=timezone.now()),
            ),
        )
        return Response(counts)


class TechnicianWorkloadView(AdminDashboardAPIView):
    def get(self, request):
        days = requested_period(request)
        start_date = timezone.localdate() - timedelta(days=days - 1)
        technicians = (
            User.objects.filter(role=User.Role.TECHNICIAN)
            .annotate(
                active_assigned_tickets=Count(
                    "assigned_tickets",
                    filter=Q(
                        assigned_tickets__status__in=(
                            Ticket.Status.ASSIGNED,
                            Ticket.Status.IN_PROGRESS,
                        )
                    ),
                    distinct=True,
                ),
                resolved_tickets=Count(
                    "assigned_tickets",
                    filter=Q(
                        assigned_tickets__status=Ticket.Status.RESOLVED,
                        assigned_tickets__resolved_at__date__gte=start_date,
                    ),
                    distinct=True,
                ),
            )
            .order_by("first_name", "last_name", "username")
        )
        serializer = TechnicianWorkloadSerializer(technicians, many=True)
        return Response({"days": days, "results": serializer.data})
