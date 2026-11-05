from pathlib import Path

from rest_framework import serializers

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketResolution,
    TroubleshootingLog,
)


MAX_TROUBLESHOOTING_ATTACHMENTS = 5
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
ALLOWED_TROUBLESHOOTING_ATTACHMENTS = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".pdf": b"%PDF-",
}


def validate_supporting_attachments(files):
    if len(files) > MAX_TROUBLESHOOTING_ATTACHMENTS:
        raise serializers.ValidationError(
            f"A maximum of {MAX_TROUBLESHOOTING_ATTACHMENTS} attachments is allowed."
        )
    for upload in files:
        safe_name = Path(upload.name).name
        extension = Path(safe_name).suffix.lower()
        expected_signature = ALLOWED_TROUBLESHOOTING_ATTACHMENTS.get(extension)
        if expected_signature is None:
            raise serializers.ValidationError(
                "Only JPG, JPEG, PNG, and PDF attachments are allowed."
            )
        if upload.size > MAX_ATTACHMENT_SIZE:
            raise serializers.ValidationError(
                f"{safe_name} exceeds the 10 MB file size limit."
            )
        signature = upload.read(8)
        upload.seek(0)
        if not signature.startswith(expected_signature):
            raise serializers.ValidationError(
                f"{safe_name} does not match its file extension."
            )
    return files


def display_name(user):
    return user.get_full_name() or user.username


class TechnicianTicketListSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="ticket_id")
    ticket_number = serializers.CharField(source="ticket.ticket_number")
    title = serializers.CharField(source="ticket.title")
    category = serializers.SerializerMethodField()
    priority = serializers.CharField(source="ticket.priority")
    status = serializers.CharField(source="ticket.status")
    requester = serializers.SerializerMethodField()
    date_assigned = serializers.DateTimeField(source="assigned_at", allow_null=True)
    updated_at = serializers.DateTimeField(source="ticket.updated_at")
    can_start_work = serializers.SerializerMethodField()

    class Meta:
        model = TicketAssignment
        fields = (
            "id",
            "ticket_number",
            "title",
            "category",
            "priority",
            "status",
            "requester",
            "date_assigned",
            "updated_at",
            "can_start_work",
        )

    def get_category(self, obj):
        if obj.ticket.category is None:
            return None
        return {
            "id": obj.ticket.category_id,
            "name": obj.ticket.category.name,
            "slug": obj.ticket.category.slug,
        }

    def get_requester(self, obj):
        return {
            "id": obj.ticket.requester_id,
            "name": display_name(obj.ticket.requester),
        }

    def get_can_start_work(self, obj):
        return obj.ticket.status in (Ticket.Status.ASSIGNED, Ticket.Status.REOPENED)


class TechnicianTicketDetailSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    requester = serializers.SerializerMethodField()
    assignment = serializers.SerializerMethodField()
    access_mode = serializers.SerializerMethodField()
    date_assigned = serializers.SerializerMethodField()
    can_modify = serializers.SerializerMethodField()
    can_start_work = serializers.SerializerMethodField()
    can_add_troubleshooting = serializers.SerializerMethodField()
    can_resolve = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "description",
            "category",
            "location",
            "reported_urgency",
            "priority",
            "status",
            "requester",
            "assignment",
            "access_mode",
            "date_assigned",
            "created_at",
            "updated_at",
            "resolution_due_at",
            "resolved_at",
            "closed_at",
            "reopen_reason",
            "can_modify",
            "can_start_work",
            "can_add_troubleshooting",
            "can_resolve",
        )

    def get_category(self, obj):
        if obj.category is None:
            return None
        return {
            "id": obj.category_id,
            "name": obj.category.name,
            "slug": obj.category.slug,
        }

    def get_requester(self, obj):
        return {
            "id": obj.requester_id,
            "name": display_name(obj.requester),
            "department": obj.requester.department,
            "email": obj.requester.email,
            "contact_number": obj.requester.contact_number,
        }

    def get_assignment(self, obj):
        assignment = self.context.get("access_assignment")
        if assignment is None:
            return None
        assigned_by = None
        if assignment.assigned_by_id:
            assigned_by = {
                "id": assignment.assigned_by_id,
                "name": display_name(assignment.assigned_by),
            }
        return {
            "id": assignment.id,
            "technician": {
                "id": assignment.technician_id,
                "name": display_name(assignment.technician),
                "specialization": (
                    assignment.technician.get_technician_specialization_display()
                    if assignment.technician.technician_specialization
                    else "Not specified"
                ),
            },
            "assigned_by": assigned_by,
            "assigned_at": assignment.assigned_at,
            "assignment_notes": assignment.assignment_notes,
            "is_current": assignment.is_current,
        }

    def get_access_mode(self, obj):
        return self.context.get("access_mode", "historical")

    def get_date_assigned(self, obj):
        assignment = self.context.get("access_assignment")
        return assignment.assigned_at if assignment else None

    def get_can_modify(self, obj):
        return self.get_access_mode(obj) == "current"

    def get_can_start_work(self, obj):
        return self.get_can_modify(obj) and obj.status in (
            Ticket.Status.ASSIGNED,
            Ticket.Status.REOPENED,
        )

    def get_can_add_troubleshooting(self, obj):
        return self.get_can_modify(obj) and obj.status == Ticket.Status.IN_PROGRESS

    def get_can_resolve(self, obj):
        return self.get_can_modify(obj) and obj.status == Ticket.Status.IN_PROGRESS


class TechnicianAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    preview_supported = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = (
            "id",
            "original_filename",
            "file_size",
            "file_type",
            "preview_supported",
            "is_requester_visible",
            "uploaded_by",
            "uploaded_at",
        )

    def get_uploaded_by(self, obj):
        return {"id": obj.uploaded_by_id, "name": display_name(obj.uploaded_by)}

    def get_file_type(self, obj):
        return Path(obj.original_filename).suffix.lstrip(".").upper() or "FILE"

    def get_preview_supported(self, obj):
        return self.get_file_type(obj) in {"JPG", "JPEG", "PNG", "PDF"}


class TechnicianTroubleshootingSerializer(serializers.ModelSerializer):
    technician = serializers.SerializerMethodField()
    ticket = serializers.SerializerMethodField()
    visibility = serializers.SerializerMethodField()
    attachments = TechnicianAttachmentSerializer(many=True, read_only=True)
    can_view_ticket = serializers.SerializerMethodField()

    class Meta:
        model = TroubleshootingLog
        fields = (
            "id",
            "ticket",
            "technician",
            "action_taken",
            "diagnosis",
            "notes",
            "visibility",
            "is_requester_visible",
            "public_notes",
            "attachments",
            "can_view_ticket",
            "created_at",
        )

    def get_technician(self, obj):
        return {"id": obj.technician_id, "name": display_name(obj.technician)}

    def get_ticket(self, obj):
        return {
            "id": obj.ticket_id,
            "ticket_number": obj.ticket.ticket_number,
            "title": obj.ticket.title,
            "status": obj.ticket.status,
        }

    def get_visibility(self, obj):
        return "REQUESTER_VISIBLE" if obj.is_requester_visible else "INTERNAL"

    def get_can_view_ticket(self, obj):
        request = self.context.get("request")
        if request is None:
            return True
        user = request.user
        if (
            obj.ticket.status in {
                Ticket.Status.ASSIGNED,
                Ticket.Status.IN_PROGRESS,
                Ticket.Status.REOPENED,
            }
            and obj.ticket.assigned_technician_id == user.id
            and obj.ticket.assignment_history.filter(
                technician=user,
                is_current=True,
            ).exists()
        ):
            return True
        if obj.ticket.status in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
            return obj.ticket.assignment_history.filter(technician=user).exists() or (
                obj.ticket.resolutions.filter(resolved_by=user).exists()
            )
        return False


class TechnicianTroubleshootingCreateSerializer(serializers.Serializer):
    action_taken = serializers.CharField(max_length=220, trim_whitespace=True)
    diagnosis = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )
    visibility = serializers.ChoiceField(
        choices=("INTERNAL", "REQUESTER_VISIBLE"),
        default="INTERNAL",
    )
    submission_key = serializers.UUIDField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )

    def validate_attachments(self, files):
        return validate_supporting_attachments(files)


class TechnicianResolutionSerializer(serializers.ModelSerializer):
    resolved_by = serializers.SerializerMethodField()
    attachments = TechnicianAttachmentSerializer(many=True, read_only=True)
    outcome = serializers.SerializerMethodField()

    class Meta:
        model = TicketResolution
        fields = (
            "id",
            "resolved_by",
            "resolution_summary",
            "root_cause",
            "actions_performed",
            "notes",
            "resolved_at",
            "closed_at",
            "reopened_at",
            "reopen_reason",
            "outcome",
            "attachments",
        )

    def get_resolved_by(self, obj):
        return {"id": obj.resolved_by_id, "name": display_name(obj.resolved_by)}

    def get_outcome(self, obj):
        if obj.reopened_at:
            return "REOPENED"
        if obj.closed_at:
            return "CLOSED"
        return "AWAITING_CONFIRMATION"


class TechnicianResolutionCreateSerializer(serializers.Serializer):
    resolution_summary = serializers.CharField(
        max_length=5000,
        trim_whitespace=True,
    )
    root_cause = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )
    actions_performed = serializers.CharField(
        max_length=5000,
        trim_whitespace=True,
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )
    confirmed_accurate = serializers.BooleanField()
    submission_key = serializers.UUIDField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )

    def validate_confirmed_accurate(self, value):
        if not value:
            raise serializers.ValidationError(
                "Confirm that the troubleshooting and resolution record is accurate."
            )
        return value

    def validate_attachments(self, files):
        return validate_supporting_attachments(files)


class TechnicianCompletedResolutionSerializer(TechnicianResolutionSerializer):
    ticket = serializers.SerializerMethodField()
    can_view_ticket = serializers.SerializerMethodField()
    attempt_number = serializers.SerializerMethodField()

    class Meta(TechnicianResolutionSerializer.Meta):
        fields = TechnicianResolutionSerializer.Meta.fields + (
            "ticket",
            "can_view_ticket",
            "attempt_number",
        )

    def get_ticket(self, obj):
        return {
            "id": obj.ticket_id,
            "ticket_number": obj.ticket.ticket_number,
            "title": obj.ticket.title,
            "category": (
                {
                    "id": obj.ticket.category_id,
                    "name": obj.ticket.category.name,
                    "slug": obj.ticket.category.slug,
                }
                if obj.ticket.category_id
                else None
            ),
            "priority": obj.ticket.priority,
            "status": obj.ticket.status,
        }

    def get_can_view_ticket(self, obj):
        request = self.context.get("request")
        if request is None:
            return True
        user = request.user
        if obj.ticket.status in {Ticket.Status.RESOLVED, Ticket.Status.CLOSED}:
            return True
        return (
            obj.ticket.assigned_technician_id == user.id
            and obj.ticket.assignment_history.filter(
                technician=user,
                is_current=True,
            ).exists()
        )

    def get_attempt_number(self, obj):
        resolutions = sorted(
            obj.ticket.resolutions.all(),
            key=lambda resolution: (resolution.resolved_at, resolution.id),
        )
        return next(
            (index for index, resolution in enumerate(resolutions, start=1) if resolution.id == obj.id),
            1,
        )
