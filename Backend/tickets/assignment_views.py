from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import (
    BooleanField,
    Case,
    CharField,
    Count,
    IntegerField,
    OuterRef,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Concat, Lower
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsITAdministrator

from .assignment_serializers import (
    AssignmentCreateSerializer,
    AssignmentHistorySerializer,
    AssignmentResultSerializer,
    EligibleTechnicianSerializer,
    ReassignmentCreateSerializer,
    TechnicianWorkloadSerializer,
    UnassignedTicketSerializer,
)
from .models import Ticket, TicketAssignment, TicketStatusHistory


ACTIVE_STATUSES = (Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS)
UNRESOLVED_STATUSES = (
    Ticket.Status.OPEN,
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
)
CATEGORY_SPECIALIZATIONS = {
    "hardware": User.TechnicianSpecialization.HARDWARE,
    "software": User.TechnicianSpecialization.SOFTWARE,
    "network-internet": User.TechnicianSpecialization.NETWORK,
    "printer-peripheral": User.TechnicianSpecialization.HARDWARE,
    "account-login": User.TechnicianSpecialization.SYSTEM_ADMIN,
    "other": User.TechnicianSpecialization.GENERAL,
}


class AssignmentConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The assignment could not be completed because the ticket changed."
    default_code = "assignment_conflict"


class AssignmentPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class AdminAssignmentMixin:
    permission_classes = [IsAuthenticated, IsITAdministrator]


def optional_date(raw_value, field_name):
    if not raw_value:
        return None
    value = parse_date(raw_value)
    if value is None:
        raise ValidationError({field_name: "Enter a valid YYYY-MM-DD date."})
    return value


def priority_ordering():
    return Case(
        When(priority=Ticket.Priority.CRITICAL, then=0),
        When(priority=Ticket.Priority.HIGH, then=1),
        When(priority=Ticket.Priority.MEDIUM, then=2),
        When(priority=Ticket.Priority.LOW, then=3),
        default=4,
        output_field=IntegerField(),
    )


def technician_workload_queryset():
    return User.objects.filter(role=User.Role.TECHNICIAN).annotate(
        active_assigned_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status__in=ACTIVE_STATUSES),
            distinct=True,
        ),
        in_progress_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status=Ticket.Status.IN_PROGRESS),
            distinct=True,
        ),
        resolved_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status=Ticket.Status.RESOLVED),
            distinct=True,
        ),
    )


def history_queryset():
    previous = TicketAssignment.objects.filter(
        ticket_id=OuterRef("ticket_id"),
        id__lt=OuterRef("id"),
    ).order_by("-id")
    return (
        TicketAssignment.objects.select_related(
            "ticket",
            "ticket__category",
            "technician",
            "assigned_by",
        )
        .annotate(
            previous_technician_id=Subquery(
                previous.values("technician_id")[:1],
                output_field=IntegerField(),
            ),
            previous_technician_name=Subquery(
                previous.annotate(
                    name=Concat(
                        "technician__first_name",
                        Value(" "),
                        "technician__last_name",
                    )
                ).values("name")[:1],
                output_field=CharField(),
            ),
            previous_technician_email=Subquery(
                previous.values("technician__email")[:1],
                output_field=CharField(),
            ),
        )
        .order_by("-assigned_at", "-id")
    )


def validate_technician(technician_id):
    try:
        technician = User.objects.select_for_update().get(pk=technician_id)
    except User.DoesNotExist as exc:
        raise NotFound("Technician account not found.") from exc
    if technician.role != User.Role.TECHNICIAN:
        raise ValidationError({"technician_id": "Selected user is not a technician."})
    if not technician.is_active:
        raise ValidationError({"technician_id": "Inactive technicians cannot be assigned."})
    return technician


class AdminAssignmentStatisticsView(AdminAssignmentMixin, APIView):
    def get(self, request):
        ticket_counts = Ticket.objects.aggregate(
            unassigned=Count(
                "id",
                filter=Q(
                    status__in=UNRESOLVED_STATUSES,
                    assigned_technician__isnull=True,
                ),
            ),
            assigned=Count("id", filter=Q(status=Ticket.Status.ASSIGNED)),
            in_progress=Count("id", filter=Q(status=Ticket.Status.IN_PROGRESS)),
        )
        ticket_counts["active_technicians"] = User.objects.filter(
            role=User.Role.TECHNICIAN,
            is_active=True,
        ).count()
        return Response(ticket_counts)


class AdminUnassignedTicketView(AdminAssignmentMixin, APIView):
    pagination_class = AssignmentPagination

    def get(self, request):
        queryset = (
            Ticket.objects.select_related("requester", "category")
            .filter(
                status__in=UNRESOLVED_STATUSES,
                assigned_technician__isnull=True,
            )
            .annotate(
                requester_name=Concat(
                    "requester__first_name",
                    Value(" "),
                    "requester__last_name",
                )
            )
        )
        search = request.query_params.get("search", "").strip()
        priority = request.query_params.get("priority", "").strip().upper()
        category = request.query_params.get("category", "").strip()
        date_filter = request.query_params.get("date", "all").lower()
        date_from = optional_date(request.query_params.get("date_from"), "date_from")
        date_to = optional_date(request.query_params.get("date_to"), "date_to")

        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search)
                | Q(title__icontains=search)
                | Q(requester__first_name__icontains=search)
                | Q(requester__last_name__icontains=search)
                | Q(requester_name__icontains=search)
            )
        if priority:
            valid_priorities = {value for value, _ in Ticket.Priority.choices}
            if priority not in valid_priorities:
                raise ValidationError({"priority": "Invalid ticket priority."})
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category__slug=category)

        today = timezone.localdate()
        if date_filter == "today":
            queryset = queryset.filter(created_at__date=today)
        elif date_filter == "last_7":
            queryset = queryset.filter(created_at__date__gte=today - timedelta(days=6))
        elif date_filter == "last_30":
            queryset = queryset.filter(created_at__date__gte=today - timedelta(days=29))
        elif date_filter not in ("all", "custom"):
            raise ValidationError({"date": "Invalid date filter."})
        if date_filter == "custom" and not (date_from or date_to):
            raise ValidationError({"date": "A date is required for a custom range."})
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError({"date_to": "End date must follow the start date."})

        ordering = request.query_params.get("ordering", "priority")
        if ordering == "priority":
            queryset = queryset.order_by(priority_ordering(), "created_at")
        elif ordering == "waiting":
            queryset = queryset.order_by("created_at")
        elif ordering == "-created_at":
            queryset = queryset.order_by("-created_at")
        else:
            raise ValidationError({"ordering": "Unsupported ordering value."})

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            UnassignedTicketSerializer(page, many=True).data
        )


class AdminEligibleTechnicianView(AdminAssignmentMixin, APIView):
    def get(self, request):
        ticket_id = request.query_params.get("ticket")
        if not ticket_id:
            raise ValidationError({"ticket": "Ticket ID is required."})
        ticket = get_object_or_404(
            Ticket.objects.select_related("category"),
            pk=ticket_id,
        )
        specialization = CATEGORY_SPECIALIZATIONS.get(
            ticket.category.slug if ticket.category_id else "other",
            User.TechnicianSpecialization.GENERAL,
        )
        queryset = technician_workload_queryset().filter(is_active=True).annotate(
            recommended=Case(
                When(technician_specialization=specialization, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(technician_specialization__icontains=search)
            )
        queryset = queryset.order_by(
            "-recommended",
            "active_assigned_tickets",
            Lower("first_name"),
            Lower("last_name"),
        )
        serializer = EligibleTechnicianSerializer(
            queryset,
            many=True,
            context={
                "category_name": ticket.category.name if ticket.category_id else "Other"
            },
        )
        return Response({"results": serializer.data})


class AdminTechnicianWorkloadView(AdminAssignmentMixin, APIView):
    def get(self, request):
        queryset = technician_workload_queryset().order_by(
            "-is_active",
            "active_assigned_tickets",
            Lower("first_name"),
            Lower("last_name"),
        )
        return Response(
            {"results": TechnicianWorkloadSerializer(queryset, many=True).data}
        )


class AdminAssignmentHistoryView(AdminAssignmentMixin, APIView):
    pagination_class = AssignmentPagination

    def get(self, request):
        queryset = history_queryset()
        ticket_search = request.query_params.get("ticket", "").strip()
        technician_id = request.query_params.get("technician", "").strip()
        date_from = optional_date(request.query_params.get("date_from"), "date_from")
        date_to = optional_date(request.query_params.get("date_to"), "date_to")
        if ticket_search:
            queryset = queryset.filter(
                Q(ticket__ticket_number__icontains=ticket_search)
                | Q(ticket__title__icontains=ticket_search)
            )
        if technician_id:
            try:
                technician_id = int(technician_id)
            except ValueError as exc:
                raise ValidationError({"technician": "Invalid technician ID."}) from exc
            queryset = queryset.filter(technician_id=technician_id)
        if date_from:
            queryset = queryset.filter(assigned_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(assigned_at__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError({"date_to": "End date must follow the start date."})
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            AssignmentHistorySerializer(page, many=True).data
        )


class AdminAssignmentListCreateView(AdminAssignmentMixin, APIView):
    pagination_class = AssignmentPagination

    def get(self, request):
        queryset = history_queryset().filter(is_current=True)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(
            AssignmentHistorySerializer(page, many=True).data
        )

    def post(self, request):
        serializer = AssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                try:
                    ticket = Ticket.objects.select_for_update().get(
                        pk=serializer.validated_data["ticket_id"]
                    )
                except Ticket.DoesNotExist as exc:
                    raise NotFound("Ticket not found.") from exc
                if ticket.status == Ticket.Status.CLOSED:
                    raise ValidationError({"ticket_id": "Closed tickets cannot be assigned."})
                if ticket.assigned_technician_id or TicketAssignment.objects.filter(
                    ticket=ticket,
                    is_current=True,
                ).exists():
                    raise AssignmentConflict("This ticket already has a current assignment.")
                if ticket.status != Ticket.Status.OPEN:
                    raise ValidationError(
                        {"ticket_id": "Only open, unassigned tickets can be assigned."}
                    )
                technician = validate_technician(
                    serializer.validated_data["technician_id"]
                )
                assignment = TicketAssignment.objects.create(
                    ticket=ticket,
                    technician=technician,
                    assigned_by=request.user,
                    assigned_at=timezone.now(),
                    assignment_notes=serializer.validated_data.get(
                        "assignment_notes", ""
                    ),
                )
                previous_status = ticket.status
                ticket.assigned_technician = technician
                ticket.status = Ticket.Status.ASSIGNED
                ticket.save(
                    update_fields=("assigned_technician", "status", "updated_at")
                )
                TicketStatusHistory.objects.create(
                    ticket=ticket,
                    previous_status=previous_status,
                    new_status=Ticket.Status.ASSIGNED,
                    changed_by=request.user,
                    reason="Technician assigned.",
                )
        except IntegrityError as exc:
            raise AssignmentConflict(
                "This ticket received another assignment. Refresh and try again."
            ) from exc
        assignment = TicketAssignment.objects.select_related(
            "ticket", "technician", "assigned_by"
        ).get(pk=assignment.pk)
        return Response(
            AssignmentResultSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )


class AdminReassignmentView(AdminAssignmentMixin, APIView):
    def post(self, request):
        serializer = ReassignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                try:
                    ticket = Ticket.objects.select_for_update().get(
                        pk=serializer.validated_data["ticket_id"]
                    )
                except Ticket.DoesNotExist as exc:
                    raise NotFound("Ticket not found.") from exc
                if ticket.status == Ticket.Status.CLOSED:
                    raise ValidationError(
                        {"ticket_id": "Closed tickets cannot be reassigned."}
                    )
                if ticket.status not in ACTIVE_STATUSES:
                    raise ValidationError(
                        {"ticket_id": "Only assigned or in-progress tickets can be reassigned."}
                    )
                current = (
                    TicketAssignment.objects.select_for_update()
                    .filter(ticket=ticket, is_current=True)
                    .first()
                )
                if current is None or ticket.assigned_technician_id is None:
                    raise AssignmentConflict(
                        "Current assignment history is missing. Refresh before retrying."
                    )
                technician = validate_technician(
                    serializer.validated_data["technician_id"]
                )
                if technician.id == current.technician_id:
                    raise ValidationError(
                        {"technician_id": "Select a different technician."}
                    )
                changed_at = timezone.now()
                TicketAssignment.objects.filter(pk=current.pk).update(
                    is_current=False,
                    unassigned_at=changed_at,
                )
                assignment = TicketAssignment.objects.create(
                    ticket=ticket,
                    technician=technician,
                    assigned_by=request.user,
                    assigned_at=changed_at,
                    assignment_notes=serializer.validated_data.get(
                        "assignment_notes", ""
                    ),
                    reassignment_reason=serializer.validated_data[
                        "reassignment_reason"
                    ],
                )
                ticket.assigned_technician = technician
                ticket.save(update_fields=("assigned_technician", "updated_at"))
        except IntegrityError as exc:
            raise AssignmentConflict(
                "The assignment changed concurrently. Refresh and try again."
            ) from exc
        assignment = TicketAssignment.objects.select_related(
            "ticket", "technician", "assigned_by"
        ).get(pk=assignment.pk)
        return Response(AssignmentResultSerializer(assignment).data)
