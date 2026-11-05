import mimetypes
from datetime import timedelta
from pathlib import Path

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.db.models.functions import Concat
from django.http import FileResponse
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

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketStatusHistory,
    TroubleshootingLog,
)
from .technician_serializers import (
    TechnicianAttachmentSerializer,
    TechnicianResolutionSerializer,
    TechnicianTicketDetailSerializer,
    TechnicianTicketListSerializer,
    TechnicianTroubleshootingCreateSerializer,
    TechnicianTroubleshootingSerializer,
)


ACTIVE_STATUSES = (
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.REOPENED,
)
STARTABLE_STATUSES = (Ticket.Status.ASSIGNED, Ticket.Status.REOPENED)
COMPLETED_STATUSES = (Ticket.Status.RESOLVED, Ticket.Status.CLOSED)
PREVIEW_FILE_TYPES = {"JPG", "JPEG", "PNG", "PDF"}


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


def technician_ticket_access(technician, pk, *, require_current=False, lock=False):
    ticket_queryset = Ticket.objects.select_related(
        "category", "requester", "assigned_technician"
    )
    if lock:
        ticket_queryset = ticket_queryset.select_for_update(of=("self",))
    try:
        ticket = ticket_queryset.get(pk=pk)
    except Ticket.DoesNotExist as exc:
        raise NotFound("Ticket not found.") from exc

    assignment_queryset = TicketAssignment.objects.filter(
        ticket=ticket,
        technician=technician,
    ).select_related("technician", "assigned_by")
    if lock:
        assignment_queryset = assignment_queryset.select_for_update(of=("self",))

    current_assignment = assignment_queryset.filter(
        is_current=True,
        ticket__assigned_technician=technician,
    ).first()
    if current_assignment is not None and ticket.status in ACTIVE_STATUSES:
        return ticket, current_assignment, "current"

    has_assignment_history = assignment_queryset.exists()
    if require_current:
        if has_assignment_history:
            raise TechnicianTicketConflict(
                "This ticket is no longer an active assignment. Refresh your work queue."
            )
        raise NotFound("Ticket not found in your current assignments.")

    has_resolution_history = ticket.resolutions.filter(resolved_by=technician).exists()
    if ticket.status in COMPLETED_STATUSES and (
        has_assignment_history or has_resolution_history
    ):
        assignment = assignment_queryset.order_by("-assigned_at", "-id").first()
        return ticket, assignment, "historical"

    raise NotFound("Ticket not found in your current or completed work.")


def detail_serializer(ticket, assignment, access_mode):
    return TechnicianTicketDetailSerializer(
        ticket,
        context={
            "access_assignment": assignment,
            "access_mode": access_mode,
        },
    )


def display_name(user):
    return user.get_full_name() or user.username


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


class TechnicianTicketDetailView(TechnicianTicketMixin, APIView):
    def get(self, request, pk):
        ticket, assignment, access_mode = technician_ticket_access(request.user, pk)
        return Response(detail_serializer(ticket, assignment, access_mode).data)


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
                "ticket": detail_serializer(
                    refreshed.ticket,
                    refreshed,
                    "current",
                ).data,
            }
        )


class TechnicianTicketHistoryView(TechnicianTicketMixin, APIView):
    def get(self, request, pk):
        ticket, _, _ = technician_ticket_access(request.user, pk)
        events = [
            {
                "id": f"submitted-{ticket.id}",
                "type": "submitted",
                "title": "Ticket submitted",
                "description": "Technical support request created.",
                "actor": display_name(ticket.requester),
                "timestamp": ticket.created_at,
            }
        ]

        for item in ticket.priority_history.select_related("changed_by"):
            description = (
                f"{item.get_previous_priority_display()} to "
                f"{item.get_new_priority_display()}"
            )
            if item.reason:
                description = f"{description} - {item.reason}"
            events.append(
                {
                    "id": f"priority-{item.id}",
                    "type": "priority",
                    "title": "Priority updated",
                    "description": description,
                    "actor": display_name(item.changed_by),
                    "timestamp": item.changed_at,
                }
            )

        for item in ticket.status_history.select_related("changed_by"):
            if item.previous_status == item.new_status:
                continue
            title = f"Status changed to {item.get_new_status_display()}"
            if item.new_status == Ticket.Status.IN_PROGRESS:
                title = (
                    "Work resumed"
                    if item.previous_status == Ticket.Status.REOPENED
                    else "Work started"
                )
            elif item.new_status == Ticket.Status.REOPENED:
                title = "Ticket reopened"
            elif item.new_status == Ticket.Status.RESOLVED:
                title = "Ticket resolved"
            elif item.new_status == Ticket.Status.CLOSED:
                title = "Ticket closed"
            events.append(
                {
                    "id": f"status-{item.id}",
                    "type": "status",
                    "title": title,
                    "description": item.reason,
                    "actor": display_name(item.changed_by),
                    "timestamp": item.changed_at,
                }
            )

        assignments = ticket.assignment_history.select_related(
            "technician", "assigned_by"
        ).order_by("assigned_at", "id")
        for index, item in enumerate(assignments):
            technician_name = display_name(item.technician)
            description = ""
            if item.technician_id == request.user.id:
                description = (
                    item.reassignment_reason
                    if index > 0 and item.reassignment_reason
                    else item.assignment_notes
                )
            events.append(
                {
                    "id": f"assignment-{item.id}",
                    "type": "assignment",
                    "title": (
                        f"Ticket reassigned to {technician_name}"
                        if index > 0
                        else f"Ticket assigned to {technician_name}"
                    ),
                    "description": description,
                    "actor": (
                        display_name(item.assigned_by)
                        if item.assigned_by_id
                        else "System"
                    ),
                    "timestamp": item.assigned_at or ticket.created_at,
                }
            )

        for item in ticket.troubleshooting_logs.select_related("technician"):
            events.append(
                {
                    "id": f"troubleshooting-{item.id}",
                    "type": "troubleshooting",
                    "title": item.action_taken,
                    "description": item.notes,
                    "actor": display_name(item.technician),
                    "timestamp": item.created_at,
                }
            )

        for item in ticket.resolutions.select_related("resolved_by"):
            events.append(
                {
                    "id": f"resolution-{item.id}",
                    "type": "resolution",
                    "title": "Resolution recorded",
                    "description": item.resolution_summary,
                    "actor": display_name(item.resolved_by),
                    "timestamp": item.resolved_at,
                }
            )

        return Response(
            {"results": sorted(events, key=lambda event: event["timestamp"])}
        )


class TechnicianTicketAttachmentsView(TechnicianTicketMixin, APIView):
    def get(self, request, pk):
        ticket, _, _ = technician_ticket_access(request.user, pk)
        attachments = ticket.attachments.select_related("uploaded_by")
        return Response(
            {"results": TechnicianAttachmentSerializer(attachments, many=True).data}
        )


class TechnicianTicketAttachmentDownloadView(TechnicianTicketMixin, APIView):
    def get(self, request, pk, attachment_id):
        technician_ticket_access(request.user, pk)
        attachment = get_object_or_404(
            TicketAttachment.objects.select_related("ticket"),
            pk=attachment_id,
            ticket_id=pk,
        )
        file_type = Path(attachment.original_filename).suffix.lstrip(".").upper()
        preview_requested = request.query_params.get("preview") == "1"
        if preview_requested and file_type not in PREVIEW_FILE_TYPES:
            raise ValidationError(
                {"preview": "Preview is available only for JPG, JPEG, PNG, and PDF files."}
            )

        safe_filename = Path(attachment.original_filename).name
        content_type = mimetypes.guess_type(safe_filename)[0] or "application/octet-stream"
        response = FileResponse(
            attachment.file.open("rb"),
            as_attachment=not preview_requested,
            filename=safe_filename,
            content_type=content_type,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class TechnicianTicketTroubleshootingView(TechnicianTicketMixin, APIView):
    def get(self, request, pk):
        ticket, _, _ = technician_ticket_access(request.user, pk)
        logs = ticket.troubleshooting_logs.select_related("technician")
        return Response(
            {"results": TechnicianTroubleshootingSerializer(logs, many=True).data}
        )

    @transaction.atomic
    def post(self, request, pk):
        ticket, _, _ = technician_ticket_access(
            request.user,
            pk,
            require_current=True,
            lock=True,
        )
        if ticket.status != Ticket.Status.IN_PROGRESS:
            raise ValidationError(
                {"status": "Troubleshooting updates require an In Progress ticket."}
            )
        serializer = TechnicianTroubleshootingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=request.user,
            is_requester_visible=False,
            public_notes="",
            **serializer.validated_data,
        )
        return Response(
            TechnicianTroubleshootingSerializer(log).data,
            status=status.HTTP_201_CREATED,
        )


class TechnicianTicketResolutionsView(TechnicianTicketMixin, APIView):
    def get(self, request, pk):
        ticket, _, _ = technician_ticket_access(request.user, pk)
        resolutions = ticket.resolutions.select_related("resolved_by")
        return Response(
            {"results": TechnicianResolutionSerializer(resolutions, many=True).data}
        )
