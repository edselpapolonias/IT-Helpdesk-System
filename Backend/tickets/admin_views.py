from datetime import timedelta
from pathlib import Path

from django.db import transaction
from django.db.models import Case, Count, F, IntegerField, Q, Value, When
from django.db.models.functions import Concat
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsITAdministrator

from .models import (
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketPriorityHistory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)
from .serializers import (
    PriorityUpdateSerializer,
    StatusTransitionSerializer,
    TicketAttachmentVisibilitySerializer,
    TicketAttachmentSerializer,
    TicketCategorySerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketResolutionSerializer,
    TroubleshootingVisibilitySerializer,
    TroubleshootingLogSerializer,
)


ACTIONABLE_STATUSES = (
    Ticket.Status.OPEN,
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.REOPENED,
)


class TicketPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class AdminTicketMixin:
    permission_classes = [IsAuthenticated, IsITAdministrator]

    def get_queryset(self):
        return Ticket.objects.select_related(
            "requester", "category", "assigned_technician"
        )

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except Ticket.DoesNotExist as exc:
            raise NotFound("Ticket not found.") from exc


def optional_date(raw_value, field_name):
    if not raw_value:
        return None
    parsed = parse_date(raw_value)
    if parsed is None:
        raise ValidationError({field_name: "Enter a valid YYYY-MM-DD date."})
    return parsed


class AdminTicketListView(AdminTicketMixin, generics.ListAPIView):
    serializer_class = TicketListSerializer
    pagination_class = TicketPagination

    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            requester_name=Concat(
                "requester__first_name",
                Value(" "),
                "requester__last_name",
            )
        )
        params = self.request.query_params
        search = params.get("search", "").strip()
        ticket_status = params.get("status", "").strip().upper()
        priority = params.get("priority", "").strip().upper()
        category = params.get("category", "").strip()
        assignment = params.get("assignment", "all").lower()
        date_filter = params.get("date", "all").lower()
        date_from = optional_date(params.get("date_from"), "date_from")
        date_to = optional_date(params.get("date_to"), "date_to")

        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search)
                | Q(title__icontains=search)
                | Q(requester__first_name__icontains=search)
                | Q(requester__last_name__icontains=search)
                | Q(requester_name__icontains=search)
                | Q(requester__email__icontains=search)
            )
        valid_statuses = {value for value, _ in Ticket.Status.choices}
        if ticket_status:
            if ticket_status not in valid_statuses:
                raise ValidationError({"status": "Invalid ticket status."})
            queryset = queryset.filter(status=ticket_status)
        valid_priorities = {value for value, _ in Ticket.Priority.choices}
        if priority:
            if priority not in valid_priorities:
                raise ValidationError({"priority": "Invalid ticket priority."})
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category__slug=category)
        if assignment == "assigned":
            queryset = queryset.filter(assigned_technician__isnull=False)
        elif assignment == "unassigned":
            queryset = queryset.filter(assigned_technician__isnull=True)
        elif assignment != "all":
            raise ValidationError(
                {"assignment": "Assignment must be all, assigned, or unassigned."}
            )

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
            raise ValidationError(
                {"date": "A start or end date is required for a custom range."}
            )
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError(
                {"date_to": "End date must be on or after the start date."}
            )

        ordering = params.get("ordering", "-created_at")
        if ordering == "-created_at":
            return queryset.order_by("-created_at")
        if ordering == "created_at":
            return queryset.order_by("created_at")
        if ordering == "-updated_at":
            return queryset.order_by("-updated_at")
        priority_order = Case(
            When(priority=Ticket.Priority.CRITICAL, then=0),
            When(priority=Ticket.Priority.HIGH, then=1),
            When(priority=Ticket.Priority.MEDIUM, then=2),
            When(priority=Ticket.Priority.LOW, then=3),
            default=4,
            output_field=IntegerField(),
        )
        if ordering == "priority":
            return queryset.order_by(priority_order, "-created_at")
        if ordering == "-priority":
            return queryset.order_by(priority_order.desc(), "-created_at")
        raise ValidationError({"ordering": "Unsupported ordering value."})


class AdminTicketDetailView(AdminTicketMixin, generics.RetrieveAPIView):
    serializer_class = TicketDetailSerializer


class AdminTicketStatisticsView(AdminTicketMixin, APIView):
    def get(self, request):
        counts = Ticket.objects.aggregate(
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
        return Response(counts)


class AdminTicketPriorityView(AdminTicketMixin, APIView):
    @transaction.atomic
    def patch(self, request, pk):
        serializer = PriorityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = get_object_or_404(
            Ticket.objects.select_for_update(),
            pk=pk,
        )
        new_priority = serializer.validated_data["priority"]
        if ticket.priority == new_priority:
            raise ValidationError(
                {"priority": "The ticket already has this priority."}
            )
        previous = ticket.priority
        ticket.priority = new_priority
        ticket.save(update_fields=("priority", "updated_at"))
        TicketPriorityHistory.objects.create(
            ticket=ticket,
            previous_priority=previous,
            new_priority=new_priority,
            changed_by=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        refreshed = AdminTicketMixin.get_queryset(self).get(pk=ticket.pk)
        return Response(TicketDetailSerializer(refreshed).data)


class AdminTicketStatusView(AdminTicketMixin, APIView):
    @transaction.atomic
    def post(self, request, pk):
        serializer = StatusTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = get_object_or_404(
            Ticket.objects.select_for_update(),
            pk=pk,
        )
        new_status = serializer.validated_data["status"]
        if not ticket.can_transition_to(new_status):
            raise ValidationError(
                {
                    "status": (
                        f"Transition from {ticket.get_status_display()} to "
                        f"{dict(Ticket.Status.choices)[new_status]} is not permitted."
                    )
                }
            )
        if new_status in (Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS):
            if ticket.assigned_technician_id is None:
                raise ValidationError(
                    {"status": "A technician must be assigned first."}
                )
        if new_status == Ticket.Status.RESOLVED:
            resolutions = ticket.resolutions.order_by("-resolved_at")
            if ticket.reopen_requested_at:
                resolutions = resolutions.filter(
                    resolved_at__gt=ticket.reopen_requested_at
                )
            resolution = resolutions.first()
            if resolution is None:
                raise ValidationError(
                    {
                        "status": (
                            "A new resolution record is required before resolving."
                            if ticket.reopen_requested_at
                            else "A resolution record is required before resolving."
                        )
                    }
                )
            ticket.resolved_at = resolution.resolved_at
            ticket.requester_confirmed_at = None
            ticket.reopen_requested_at = None
            ticket.reopen_reason = ""
        previous = ticket.status
        ticket.status = new_status
        ticket.save()
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=previous,
            new_status=new_status,
            changed_by=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        refreshed = AdminTicketMixin.get_queryset(self).get(pk=ticket.pk)
        return Response(TicketDetailSerializer(refreshed).data)


class AdminTicketHistoryView(AdminTicketMixin, APIView):
    def get(self, request, pk):
        ticket = self.get_object()
        events = [
            {
                "type": "submitted",
                "title": "Ticket submitted",
                "description": "Technical support request created.",
                "actor": ticket.requester.get_full_name() or ticket.requester.username,
                "timestamp": ticket.created_at,
            }
        ]
        for item in ticket.priority_history.select_related("changed_by"):
            events.append(
                {
                    "type": "priority",
                    "title": "Priority updated",
                    "description": (
                        f"{item.get_previous_priority_display()} to "
                        f"{item.get_new_priority_display()}"
                        + (f" — {item.reason}" if item.reason else "")
                    ),
                    "actor": item.changed_by.get_full_name()
                    or item.changed_by.username,
                    "timestamp": item.changed_at,
                }
            )
        for item in ticket.status_history.select_related("changed_by"):
            if item.previous_status == item.new_status:
                continue
            events.append(
                {
                    "type": "status",
                    "title": f"Status changed to {item.get_new_status_display()}",
                    "description": item.reason,
                    "actor": item.changed_by.get_full_name()
                    or item.changed_by.username,
                    "timestamp": item.changed_at,
                }
            )
        assignments = ticket.assignment_history.select_related(
            "technician", "assigned_by"
        ).order_by("assigned_at", "id")
        for index, item in enumerate(assignments):
            technician_name = item.technician.get_full_name() or item.technician.username
            description = (
                item.reassignment_reason
                if index > 0 and item.reassignment_reason
                else item.assignment_notes
            )
            events.append(
                {
                    "type": "assignment",
                    "title": (
                        f"Ticket reassigned to {technician_name}"
                        if index > 0
                        else f"Ticket assigned to {technician_name}"
                    ),
                    "description": description,
                    "actor": (
                        item.assigned_by.get_full_name()
                        or item.assigned_by.username
                        if item.assigned_by_id
                        else "Legacy assignment import"
                    ),
                    "timestamp": item.assigned_at or ticket.created_at,
                }
            )
        for item in ticket.troubleshooting_logs.select_related("technician"):
            events.append(
                {
                    "type": "troubleshooting",
                    "title": item.action_taken,
                    "description": item.notes,
                    "actor": item.technician.get_full_name()
                    or item.technician.username,
                    "timestamp": item.created_at,
                }
            )
        for item in ticket.resolutions.select_related("resolved_by"):
            events.append(
                {
                    "type": "resolution",
                    "title": "Resolution recorded",
                    "description": item.resolution_summary,
                    "actor": item.resolved_by.get_full_name()
                    or item.resolved_by.username,
                    "timestamp": item.resolved_at,
                }
            )
        return Response(
            {"results": sorted(events, key=lambda event: event["timestamp"])}
        )


class AdminTicketTroubleshootingView(AdminTicketMixin, APIView):
    def get(self, request, pk):
        ticket = self.get_object()
        logs = ticket.troubleshooting_logs.select_related(
            "technician"
        ).prefetch_related("attachments")
        return Response(
            {"results": TroubleshootingLogSerializer(logs, many=True).data}
        )


class AdminTicketTroubleshootingVisibilityView(AdminTicketMixin, APIView):
    @transaction.atomic
    def patch(self, request, pk, log_id):
        serializer = TroubleshootingVisibilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        log = get_object_or_404(
            TroubleshootingLog.objects.select_for_update().select_related(
                "technician"
            ),
            pk=log_id,
            ticket_id=pk,
        )
        log.is_requester_visible = serializer.validated_data[
            "is_requester_visible"
        ]
        if "public_notes" in serializer.validated_data:
            log.public_notes = serializer.validated_data["public_notes"]
        log.save(update_fields=("is_requester_visible", "public_notes"))
        return Response(TroubleshootingLogSerializer(log).data)


class AdminTicketResolutionsView(AdminTicketMixin, APIView):
    def get(self, request, pk):
        ticket = self.get_object()
        resolutions = ticket.resolutions.select_related("resolved_by")
        return Response(
            {"results": TicketResolutionSerializer(resolutions, many=True).data}
        )


class AdminTicketAttachmentsView(AdminTicketMixin, APIView):
    def get(self, request, pk):
        ticket = self.get_object()
        attachments = ticket.attachments.select_related("uploaded_by")
        return Response(
            {"results": TicketAttachmentSerializer(attachments, many=True).data}
        )


class AdminTicketAttachmentVisibilityView(AdminTicketMixin, APIView):
    @transaction.atomic
    def patch(self, request, pk, attachment_id):
        serializer = TicketAttachmentVisibilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = get_object_or_404(
            TicketAttachment.objects.select_for_update().select_related(
                "uploaded_by"
            ),
            pk=attachment_id,
            ticket_id=pk,
        )
        attachment.is_requester_visible = serializer.validated_data[
            "is_requester_visible"
        ]
        attachment.save(update_fields=("is_requester_visible",))
        return Response(TicketAttachmentSerializer(attachment).data)


class AdminTicketAttachmentDownloadView(AdminTicketMixin, APIView):
    def get(self, request, pk, attachment_id):
        attachment = get_object_or_404(
            TicketAttachment.objects.select_related("ticket"),
            pk=attachment_id,
            ticket_id=pk,
        )
        return FileResponse(
            attachment.file.open("rb"),
            as_attachment=True,
            filename=Path(attachment.original_filename).name,
        )


class TicketCategoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TicketCategorySerializer
    pagination_class = None
    queryset = TicketCategory.objects.filter(is_active=True).order_by("name")
