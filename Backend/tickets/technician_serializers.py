from rest_framework import serializers

from .models import Ticket, TicketAssignment


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


class TechnicianTicketDetailSerializer(TechnicianTicketListSerializer):
    description = serializers.CharField(source="ticket.description")
    location = serializers.CharField(source="ticket.location")
    reported_urgency = serializers.CharField(source="ticket.reported_urgency")
    requester = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="ticket.created_at")
    resolution_due_at = serializers.DateTimeField(
        source="ticket.resolution_due_at",
        allow_null=True,
    )

    class Meta(TechnicianTicketListSerializer.Meta):
        fields = TechnicianTicketListSerializer.Meta.fields + (
            "description",
            "location",
            "reported_urgency",
            "created_at",
            "resolution_due_at",
        )

    def get_requester(self, obj):
        return {
            "id": obj.ticket.requester_id,
            "name": display_name(obj.ticket.requester),
            "department": obj.ticket.requester.department,
        }
