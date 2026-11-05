from datetime import timedelta

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsITTechnician

from .models import Ticket, TicketAssignment, TicketStatusHistory
from .technician_serializers import (
    TechnicianTicketDetailSerializer,
    TechnicianTicketListSerializer,
)


ACTIVE_STATUSES = (
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.REOPENED,
)
STARTABLE_STATUSES = (Ticket.Status.ASSIGNED, Ticket.Status.REOPENED)


class TechnicianTicketConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The ticket assignment changed. Refresh your work queue."
    default_code = "assignment_conflict"


class TechnicianTicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def optional_date(raw_value, field_name):
    if not raw_value:
        return None
    parsed = parse_date(raw_value)
    if parsed is None:
        raise ValidationError({field_name: "Enter a valid YYYY-MM-DD date."})
    return parsed


def technician_assignments(technician):
    return TicketAssignment.objects.filter(
        technician=technician,
        is_current=True,
        ticket__assigned_technician=technician,
    ).select_related("ticket", "ticket__category", "ticket__requester")


class TechnicianTicketMixin:
    permission_classes = [IsAuthenticated, IsITTechnician]

    def get_queryset(self):
        return technician_assignments(self.request.user)

    def get_object(self):
        try:
            return self.get_queryset().get(ticket_id=self.kwargs["pk"])
        except TicketAssignment.DoesNotExist as exc:
            raise NotFound("Ticket not found in your current assignments.") from exc


class TechnicianTicketListView(TechnicianTicketMixin, generics.ListAPIView):
    serializer_class = TechnicianTicketListSerializer
    pagination_class = TechnicianTicketPagination

    def get_queryset(self):
        queryset = super().get_queryset().filter(ticket__status__in=ACTIVE_STATUSES)
        params = self.request.query_params
        search = params.get("search", "").strip()
        ticket_status = params.get("status", "all").strip().upper()
        priority = params.get("priority", "all").strip().upper()
        category = params.get("category", "all").strip()
        date_filter = params.get("date", "all").strip().lower()
        date_from = optional_date(params.get("date_from"), "date_from")
        date_to = optional_date(params.get("date_to"), "date_to")

        if search:
            queryset = queryset.annotate(
                requester_name=Concat(
                    "ticket__requester__first_name",
                    Value(" "),
                    "ticket__requester__last_name",
                )
            ).filter(
                Q(ticket__ticket_number__icontains=search)
                | Q(ticket__title__icontains=search)
                | Q(ticket__category__name__icontains=search)
                | Q(ticket__requester__first_name__icontains=search)
                | Q(ticket__requester__last_name__icontains=search)
                | Q(requester_name__icontains=search)
            )

        if ticket_status != "ALL":
            if ticket_status not in ACTIVE_STATUSES:
                raise ValidationError(
                    {"status": "Status must be Assigned, In Progress, or Reopened."}
                )
            queryset = queryset.filter(ticket__status=ticket_status)

        valid_priorities = {value for value, _ in Ticket.Priority.choices}
        if priority != "ALL":
            if priority not in valid_priorities:
                raise ValidationError({"priority": "Invalid ticket priority."})
            queryset = queryset.filter(ticket__priority=priority)

        if category != "all":
            queryset = queryset.filter(ticket__category__slug=category)

        today = timezone.localdate()
        if date_filter == "today":
            queryset = queryset.filter(assigned_at__date=today)
        elif date_filter == "last_7":
            queryset = queryset.filter(assigned_at__date__gte=today - timedelta(days=6))
        elif date_filter == "last_30":
            queryset = queryset.filter(assigned_at__date__gte=today - timedelta(days=29))
        elif date_filter not in ("all", "custom"):
            raise ValidationError({"date": "Invalid date filter."})
        if date_filter == "custom" and not (date_from or date_to):
            raise ValidationError(
                {"date": "A start or end date is required for a custom range."}
            )
        if date_from:
            queryset = queryset.filter(assigned_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(assigned_at__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError(
                {"date_to": "End date must be on or after the start date."}
            )

        ordering = params.get("ordering", "priority")
        priority_order = Case(
            When(ticket__priority=Ticket.Priority.CRITICAL, then=0),
            When(ticket__priority=Ticket.Priority.HIGH, then=1),
            When(ticket__priority=Ticket.Priority.MEDIUM, then=2),
            When(ticket__priority=Ticket.Priority.LOW, then=3),
            default=4,
            output_field=IntegerField(),
        )
        orderings = {
            "priority": (priority_order, "assigned_at", "id"),
            "assigned_at": ("assigned_at", "id"),
            "-assigned_at": ("-assigned_at", "-id"),
            "-updated_at": ("-ticket__updated_at", "-id"),
        }
        if ordering not in orderings:
            raise ValidationError({"ordering": "Unsupported ordering value."})
        return queryset.order_by(*orderings[ordering])


class TechnicianTicketStatisticsView(TechnicianTicketMixin, APIView):
    def get(self, request):
        return Response(
            self.get_queryset()
            .filter(ticket__status__in=ACTIVE_STATUSES)
            .aggregate(
                active=Count("id"),
                awaiting_action=Count(
                    "id", filter=Q(ticket__status__in=STARTABLE_STATUSES)
                ),
                in_progress=Count(
                    "id", filter=Q(ticket__status=Ticket.Status.IN_PROGRESS)
                ),
                critical=Count(
                    "id", filter=Q(ticket__priority=Ticket.Priority.CRITICAL)
                ),
            )
        )


class TechnicianTicketDetailView(TechnicianTicketMixin, generics.RetrieveAPIView):
    serializer_class = TechnicianTicketDetailSerializer


class TechnicianTicketStartWorkView(TechnicianTicketMixin, APIView):
    @transaction.atomic
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket.objects.select_for_update(), pk=pk)
        assignment = (
            TicketAssignment.objects.select_for_update()
            .filter(ticket=ticket, technician=request.user, is_current=True)
            .first()
        )

        if assignment is None:
            was_previously_assigned = TicketAssignment.objects.filter(
                ticket=ticket,
                technician=request.user,
                is_current=False,
            ).exists()
            if was_previously_assigned:
                raise TechnicianTicketConflict(
                    "This ticket has been reassigned. Refresh your work queue."
                )
            raise NotFound("Ticket not found in your current assignments.")

        if ticket.assigned_technician_id != request.user.id:
            raise TechnicianTicketConflict(
                "This ticket is no longer assigned to you. Refresh your work queue."
            )
        if ticket.status not in STARTABLE_STATUSES:
            raise ValidationError(
                {
                    "status": (
                        "Only Assigned or Reopened tickets can be started. "
                        f"This ticket is currently {ticket.get_status_display()}."
                    )
                }
            )
        if not ticket.can_transition_to(Ticket.Status.IN_PROGRESS):
            raise ValidationError(
                {"status": "This ticket cannot transition to In Progress."}
            )

        previous_status = ticket.status
        ticket.status = Ticket.Status.IN_PROGRESS
        ticket.save(update_fields=("status", "updated_at"))
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=previous_status,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=request.user,
            reason=(
                "Technician resumed work on the reopened ticket."
                if previous_status == Ticket.Status.REOPENED
                else "Technician started work on the assigned ticket."
            ),
        )

        refreshed = technician_assignments(request.user).get(pk=assignment.pk)
        return Response(
            {
                "detail": "Work started. The ticket is now In Progress.",
                "ticket": TechnicianTicketDetailSerializer(refreshed).data,
            }
        )
