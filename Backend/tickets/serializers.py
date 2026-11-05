from rest_framework import serializers

from .models import (
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketResolution,
    TroubleshootingLog,
)


def display_name(user):
    return user.get_full_name() or user.username


class TicketCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketCategory
        fields = ("id", "name", "slug")


class TicketListSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    category = TicketCategorySerializer(read_only=True)
    assigned_technician = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "requester",
            "category",
            "priority",
            "status",
            "assigned_technician",
            "created_at",
            "updated_at",
        )

    def get_requester(self, obj):
        return {
            "id": obj.requester_id,
            "name": display_name(obj.requester),
            "email": obj.requester.email,
        }

    def get_assigned_technician(self, obj):
        if obj.assigned_technician is None:
            return None
        return {
            "id": obj.assigned_technician_id,
            "name": display_name(obj.assigned_technician),
            "specialization": (
                obj.assigned_technician.get_technician_specialization_display()
            ),
        }


class TicketDetailSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    category = TicketCategorySerializer(read_only=True)
    assigned_technician = serializers.SerializerMethodField()
    assignment = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
            "requester_confirmed_at",
            "reopen_requested_at",
            "reopen_reason",
            "requester",
            "assigned_technician",
            "assignment",
        )

    def get_requester(self, obj):
        return {
            "id": obj.requester_id,
            "name": display_name(obj.requester),
            "email": obj.requester.email,
            "department": obj.requester.department,
            "contact_number": obj.requester.contact_number,
        }

    def get_assigned_technician(self, obj):
        if obj.assigned_technician is None:
            return None
        return {
            "id": obj.assigned_technician_id,
            "name": display_name(obj.assigned_technician),
            "email": obj.assigned_technician.email,
            "specialization": (
                obj.assigned_technician.get_technician_specialization_display()
            ),
        }

    def get_assignment(self, obj):
        assignment = (
            obj.assignment_history.filter(is_current=True)
            .select_related("assigned_by")
            .first()
        )
        if assignment is not None:
            return {
                "id": assignment.id,
                "assigned_at": assignment.assigned_at,
                "assigned_by": (
                    {
                        "id": assignment.assigned_by_id,
                        "name": display_name(assignment.assigned_by),
                    }
                    if assignment.assigned_by_id
                    else None
                ),
                "assignment_notes": assignment.assignment_notes,
                "history_available": True,
            }
        return {
            "assigned_at": None,
            "assigned_by": None,
            "assignment_notes": "",
            "history_available": False,
        }


class PriorityUpdateSerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=Ticket.Priority.choices)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class StatusTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Ticket.Status.choices)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class TroubleshootingLogSerializer(serializers.ModelSerializer):
    technician = serializers.SerializerMethodField()

    class Meta:
        model = TroubleshootingLog
        fields = ("id", "technician", "action_taken", "notes", "created_at")

    def get_technician(self, obj):
        return {"id": obj.technician_id, "name": display_name(obj.technician)}


class TicketResolutionSerializer(serializers.ModelSerializer):
    resolved_by = serializers.SerializerMethodField()

    class Meta:
        model = TicketResolution
        fields = ("id", "resolved_by", "resolution_summary", "resolved_at")

    def get_resolved_by(self, obj):
        return {"id": obj.resolved_by_id, "name": display_name(obj.resolved_by)}


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = (
            "id",
            "original_filename",
            "file_size",
            "uploaded_by",
            "uploaded_at",
            "download_url",
        )

    def get_uploaded_by(self, obj):
        return {"id": obj.uploaded_by_id, "name": display_name(obj.uploaded_by)}

    def get_download_url(self, obj):
        return f"/api/admin/tickets/{obj.ticket_id}/attachments/{obj.id}/download/"
