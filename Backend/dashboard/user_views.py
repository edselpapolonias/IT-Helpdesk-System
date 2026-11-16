from datetime import timedelta
import mimetypes
from pathlib import Path

from django.db import IntegrityError, transaction
from django.db.models import Case, Count, F, IntegerField, Prefetch, Q, When
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsRegularUser
from tickets.models import (
    Ticket,
    TicketAttachment,
    TicketAssignment,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)

from .user_serializers import (
    ReopenRequestSerializer,
    UserRecentTicketSerializer,
    UserTicketCreateSerializer,
    UserTicketDetailSerializer,
    UserTicketListSerializer,
)


class RegularUserDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsRegularUser]


class UserTicketPagination(PageNumberPagination):
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


def user_ticket_queryset(user):
    return (
        Ticket.objects.filter(requester=user)
        .select_related("category", "assigned_technician")
        .prefetch_related(
            Prefetch(
                "attachments",
                queryset=TicketAttachment.objects.filter(
                    Q(is_requester_visible=True) | Q(uploaded_by=user)
                ),
                to_attr="requester_attachments",
            ),
            Prefetch(
                "troubleshooting_logs",
                queryset=TroubleshootingLog.objects.filter(
                    is_requester_visible=True
                ).select_related("technician").prefetch_related(
                    Prefetch(
                        "attachments",
                        queryset=TicketAttachment.objects.filter(
                            is_requester_visible=True
                        ),
                    )
                ),
                to_attr="requester_updates",
            ),
            Prefetch(
                "assignment_history",
                queryset=TicketAssignment.objects.filter(
                    is_current=True
                ).select_related("technician"),
                to_attr="current_assignments",
            ),
            "resolutions__resolved_by",
        )
    )


def user_ticket_detail(ticket_id, user):
    return user_ticket_queryset(user).get(pk=ticket_id)


class UserDashboardSummaryView(RegularUserDashboardView):
    def get(self, request):
        tickets = Ticket.objects.filter(requester=request.user)
        counts = tickets.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=Ticket.Status.OPEN)),
            assigned=Count("id", filter=Q(status=Ticket.Status.ASSIGNED)),
            in_progress=Count("id", filter=Q(status=Ticket.Status.IN_PROGRESS)),
            resolved=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
            reopened=Count("id", filter=Q(status=Ticket.Status.REOPENED)),
            closed=Count("id", filter=Q(status=Ticket.Status.CLOSED)),
        )
        counts["status_distribution"] = [
            {"status": status, "count": counts[key]}
            for status, key in (
                (Ticket.Status.OPEN, "open"),
                (Ticket.Status.ASSIGNED, "assigned"),
                (Ticket.Status.IN_PROGRESS, "in_progress"),
                (Ticket.Status.RESOLVED, "resolved"),
                (Ticket.Status.REOPENED, "reopened"),
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
            .exclude(previous_status=F("new_status"))
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
        ticket = get_object_or_404(user_ticket_queryset(request.user), pk=pk)
        return Response(UserTicketDetailSerializer(ticket).data)


class UserTicketCreateView(RegularUserDashboardView):
    pagination_class = UserTicketPagination

    def get(self, request):
        base_queryset = Ticket.objects.filter(requester=request.user)
        summary = base_queryset.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=Ticket.Status.OPEN)),
            active=Count(
                "id",
                filter=Q(
                    status__in=(Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS)
                ),
            ),
            resolved=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
        )
        queryset = base_queryset.select_related(
            "category", "assigned_technician"
        )
        params = request.query_params
        search = params.get("search", "").strip()
        ticket_status = params.get("status", "").strip().upper()
        priority = params.get("priority", "").strip().upper()
        category = params.get("category", "").strip()
        date_filter = params.get("date", "all").strip().lower()
        date_from = optional_date(params.get("date_from"), "date_from")
        date_to = optional_date(params.get("date_to"), "date_to")

        if search:
            queryset = queryset.filter(
                Q(ticket_number__icontains=search)
                | Q(title__icontains=search)
                | Q(description__icontains=search)
            )
        if ticket_status:
            valid_statuses = {value for value, _ in Ticket.Status.choices}
            if ticket_status not in valid_statuses:
                raise ValidationError({"status": "Invalid ticket status."})
            queryset = queryset.filter(status=ticket_status)
        if priority:
            valid_priorities = {value for value, _ in Ticket.Priority.choices}
            if priority not in valid_priorities:
                raise ValidationError({"priority": "Invalid ticket priority."})
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category__slug=category)

        today = timezone.localdate()
        if date_filter == "last_7":
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
            queryset = queryset.order_by("-created_at")
        elif ordering == "created_at":
            queryset = queryset.order_by("created_at")
        elif ordering == "-updated_at":
            queryset = queryset.order_by("-updated_at")
        elif ordering == "priority":
            priority_order = Case(
                When(priority=Ticket.Priority.CRITICAL, then=0),
                When(priority=Ticket.Priority.HIGH, then=1),
                When(priority=Ticket.Priority.MEDIUM, then=2),
                When(priority=Ticket.Priority.LOW, then=3),
                default=4,
                output_field=IntegerField(),
            )
            queryset = queryset.order_by(priority_order, "-created_at")
        else:
            raise ValidationError({"ordering": "Unsupported ordering value."})

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        response = paginator.get_paginated_response(
            UserTicketListSerializer(page, many=True).data
        )
        response.data["summary"] = summary
        return response

    def post(self, request):
        payload = {
            "title": request.data.get("title", ""),
            "category": request.data.get("category", ""),
            "description": request.data.get("description", ""),
            "location": request.data.get("location", ""),
            "reported_urgency": request.data.get("reported_urgency", ""),
            "submission_key": request.data.get("submission_key", ""),
            "attachments": request.FILES.getlist("attachments"),
        }
        serializer = UserTicketCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        submission_key = values["submission_key"]

        existing = Ticket.objects.filter(submission_key=submission_key).first()
        if existing is not None:
            if existing.requester_id != request.user.id:
                raise ValidationError(
                    {"submission_key": "This submission key is already in use."}
                )
            existing = user_ticket_detail(existing.pk, request.user)
            data = UserTicketDetailSerializer(existing).data
            data["duplicate_submission"] = True
            return Response(data)

        saved_attachments = []
        try:
            with transaction.atomic():
                ticket = Ticket.objects.create(
                    submission_key=submission_key,
                    requester=request.user,
                    title=values["title"],
                    category=values["category"],
                    description=values["description"],
                    location=values["location"],
                    reported_urgency=values["reported_urgency"],
                    priority=Ticket.Priority.MEDIUM,
                    status=Ticket.Status.OPEN,
                )
                TicketStatusHistory.objects.create(
                    ticket=ticket,
                    previous_status=Ticket.Status.OPEN,
                    new_status=Ticket.Status.OPEN,
                    changed_by=request.user,
                    reason="Ticket submitted by requester.",
                )
                for upload in values.get("attachments", []):
                    attachment = TicketAttachment(
                        ticket=ticket,
                        uploaded_by=request.user,
                        file=upload,
                        original_filename=Path(upload.name).name,
                        file_size=upload.size,
                        is_requester_visible=True,
                    )
                    attachment.full_clean()
                    saved_attachments.append(attachment)
                    attachment.save()
        except IntegrityError:
            for attachment in saved_attachments:
                attachment.file.delete(save=False)
            existing = Ticket.objects.filter(
                submission_key=submission_key,
                requester=request.user,
            ).first()
            if existing is None:
                raise
            existing = user_ticket_detail(existing.pk, request.user)
            data = UserTicketDetailSerializer(existing).data
            data["duplicate_submission"] = True
            return Response(data)
        except Exception:
            for attachment in saved_attachments:
                attachment.file.delete(save=False)
            raise

        ticket = user_ticket_detail(ticket.pk, request.user)
        data = UserTicketDetailSerializer(ticket).data
        data["duplicate_submission"] = False
        return Response(data, status=201)


class UserTicketResolutionConfirmView(RegularUserDashboardView):
    @transaction.atomic
    def post(self, request, pk):
        ticket = get_object_or_404(
            Ticket.objects.select_for_update(),
            pk=pk,
            requester=request.user,
        )
        if ticket.requester_confirmed_at:
            return Response(
                UserTicketDetailSerializer(
                    user_ticket_detail(ticket.id, request.user)
                ).data
            )
        if ticket.status != Ticket.Status.RESOLVED:
            raise ValidationError(
                {"status": "Only resolved tickets can be confirmed."}
            )
        if ticket.reopen_requested_at:
            raise ValidationError(
                {"status": "A reopening request is already pending review."}
            )
        resolution = ticket.resolutions.select_for_update().order_by(
            "-resolved_at", "-id"
        ).first()
        if resolution is None:
            raise ValidationError(
                {"status": "This ticket does not have a recorded resolution."}
            )
        confirmed_at = timezone.now()
        ticket.requester_confirmed_at = confirmed_at
        ticket.status = Ticket.Status.CLOSED
        ticket.closed_at = confirmed_at
        ticket.save(
            update_fields=(
                "requester_confirmed_at",
                "status",
                "closed_at",
                "updated_at",
            )
        )
        resolution.closed_at = confirmed_at
        resolution.save(update_fields=("closed_at",))
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.RESOLVED,
            new_status=Ticket.Status.CLOSED,
            changed_by=request.user,
            reason="Resolution confirmed by requester.",
        )
        return Response(
            UserTicketDetailSerializer(
                user_ticket_detail(ticket.id, request.user)
            ).data
        )


class UserTicketReopenRequestView(RegularUserDashboardView):
    @transaction.atomic
    def post(self, request, pk):
        serializer = ReopenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = get_object_or_404(
            Ticket.objects.select_for_update(),
            pk=pk,
            requester=request.user,
        )
        if ticket.requester_confirmed_at:
            raise ValidationError(
                {"status": "A confirmed resolution cannot be reopened here."}
            )
        if ticket.status != Ticket.Status.RESOLVED:
            raise ValidationError(
                {"status": "Only resolved tickets can request reopening."}
            )
        if ticket.reopen_requested_at:
            raise ValidationError(
                {"status": "A reopening request is already pending review."}
            )
        resolution = ticket.resolutions.select_for_update().order_by(
            "-resolved_at", "-id"
        ).first()
        if resolution is None:
            raise ValidationError(
                {"status": "This ticket does not have a recorded resolution."}
            )
        reopened_at = timezone.now()
        ticket.reopen_requested_at = reopened_at
        ticket.reopen_reason = serializer.validated_data["reason"]
        ticket.status = Ticket.Status.REOPENED
        ticket.save(
            update_fields=(
                "reopen_requested_at",
                "reopen_reason",
                "status",
                "updated_at",
            )
        )
        resolution.reopened_at = reopened_at
        resolution.reopen_reason = serializer.validated_data["reason"]
        resolution.save(update_fields=("reopened_at", "reopen_reason"))
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.RESOLVED,
            new_status=Ticket.Status.REOPENED,
            changed_by=request.user,
            reason=serializer.validated_data["reason"],
        )
        return Response(
            UserTicketDetailSerializer(
                user_ticket_detail(ticket.id, request.user)
            ).data
        )


class UserTicketActivityView(RegularUserDashboardView):
    def get(self, request, pk):
        ticket = get_object_or_404(
            Ticket.objects.filter(requester=request.user),
            pk=pk,
        )
        events = [
            {
                "type": "submitted",
                "title": "Ticket Submitted",
                "description": "Your support request was received by the helpdesk.",
                "actor": request.user.get_full_name() or request.user.username,
                "timestamp": ticket.created_at,
            }
        ]

        assignments = ticket.assignment_history.select_related(
            "technician"
        ).order_by("assigned_at", "id")
        for index, assignment in enumerate(assignments):
            technician_name = (
                assignment.technician.get_full_name()
                or assignment.technician.username
            )
            events.append(
                {
                    "type": "assignment",
                    "title": (
                        "Technician Reassigned"
                        if index > 0
                        else "Technician Assigned"
                    ),
                    "description": f"{technician_name} was assigned to your request.",
                    "actor": technician_name,
                    "timestamp": assignment.assigned_at or ticket.created_at,
                }
            )

        status_titles = {
            Ticket.Status.IN_PROGRESS: "Work Started",
            Ticket.Status.RESOLVED: "Ticket Resolved",
            Ticket.Status.REOPENED: "Ticket Reopened",
            Ticket.Status.CLOSED: "Ticket Closed",
        }
        status_descriptions = {
            Ticket.Status.IN_PROGRESS: "The technician started working on the issue.",
            Ticket.Status.RESOLVED: "A resolution was recorded for your review.",
            Ticket.Status.REOPENED: "The issue was returned to the support queue.",
            Ticket.Status.CLOSED: "The support request was closed.",
        }
        history = ticket.status_history.select_related("changed_by").order_by(
            "changed_at", "id"
        )
        for change in history:
            if change.previous_status == change.new_status:
                continue
            if change.new_status == Ticket.Status.ASSIGNED and assignments.exists():
                continue
            events.append(
                {
                    "type": "status",
                    "title": status_titles.get(
                        change.new_status,
                        f"Status Changed to {change.get_new_status_display()}",
                    ),
                    "description": status_descriptions.get(
                        change.new_status,
                        "The ticket status was updated.",
                    ),
                    "actor": (
                        change.changed_by.get_full_name()
                        or change.changed_by.username
                    ),
                    "timestamp": change.changed_at,
                }
            )

        updates = ticket.troubleshooting_logs.filter(
            is_requester_visible=True
        ).select_related("technician")
        for update in updates:
            events.append(
                {
                    "type": "troubleshooting",
                    "title": "Troubleshooting Updated",
                    "description": update.action_taken,
                    "actor": (
                        update.technician.get_full_name()
                        or update.technician.username
                    ),
                    "timestamp": update.created_at,
                }
            )

        resolutions = ticket.resolutions.select_related("resolved_by")
        for resolution in resolutions:
            events.append(
                {
                    "type": "resolution",
                    "title": "Resolution Provided",
                    "description": resolution.resolution_summary,
                    "actor": (
                        resolution.resolved_by.get_full_name()
                        or resolution.resolved_by.username
                    ),
                    "timestamp": resolution.resolved_at,
                }
            )

        events.sort(key=lambda event: event["timestamp"])
        for index, event in enumerate(events):
            event["is_current"] = index == len(events) - 1
        return Response({"results": events})


class UserTicketResolutionView(RegularUserDashboardView):
    def get(self, request, pk):
        ticket = get_object_or_404(user_ticket_queryset(request.user), pk=pk)
        data = UserTicketDetailSerializer(ticket).data
        return Response(
            {
                "resolution": data["resolution"],
                "resolution_response": data["resolution_response"],
                "needs_confirmation": data["needs_confirmation"],
                "requester_confirmed_at": data["requester_confirmed_at"],
                "reopen_requested_at": data["reopen_requested_at"],
                "reopen_reason": data["reopen_reason"],
            }
        )


class UserTicketAttachmentDownloadView(RegularUserDashboardView):
    def get(self, request, pk, attachment_id):
        attachment = get_object_or_404(
            TicketAttachment.objects.select_related("ticket").filter(
                Q(is_requester_visible=True) | Q(uploaded_by=request.user)
            ),
            pk=attachment_id,
            ticket_id=pk,
            ticket__requester=request.user,
        )
        preview_extensions = {".jpg", ".jpeg", ".png", ".pdf"}
        wants_preview = request.query_params.get("preview") == "1"
        allow_preview = Path(attachment.original_filename).suffix.lower() in preview_extensions
        safe_filename = Path(attachment.original_filename).name
        content_type = mimetypes.guess_type(safe_filename)[0] or "application/octet-stream"
        response = FileResponse(
            attachment.file.open("rb"),
            as_attachment=not (wants_preview and allow_preview),
            filename=safe_filename,
            content_type=content_type,
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
