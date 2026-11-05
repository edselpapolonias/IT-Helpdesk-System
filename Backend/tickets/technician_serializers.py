from pathlib import Path

from rest_framework import serializers

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketResolution,
    TroubleshootingLog,
)


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

    class Meta:
        model = TroubleshootingLog
        fields = (
            "id",
            "technician",
            "action_taken",
            "notes",
            "is_requester_visible",
            "public_notes",
            "created_at",
        )

    def get_technician(self, obj):
        return {"id": obj.technician_id, "name": display_name(obj.technician)}


class TechnicianTroubleshootingCreateSerializer(serializers.Serializer):
    action_taken = serializers.CharField(max_length=220, trim_whitespace=True)
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        trim_whitespace=True,
    )

    def to_internal_value(self, data):
        allowed_fields = {"action_taken", "notes"}
        unknown_fields = set(data.keys()) - allowed_fields
        if unknown_fields:
            raise serializers.ValidationError(
                {
                    field: "This field cannot be set by technicians."
                    for field in unknown_fields
                }
            )
        return super().to_internal_value(data)


class TechnicianResolutionSerializer(serializers.ModelSerializer):
    resolved_by = serializers.SerializerMethodField()

    class Meta:
        model = TicketResolution
        fields = ("id", "resolved_by", "resolution_summary", "resolved_at")

    def get_resolved_by(self, obj):
        return {"id": obj.resolved_by_id, "name": display_name(obj.resolved_by)}
