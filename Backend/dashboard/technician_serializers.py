from django.utils import timezone
from rest_framework import serializers

from tickets.models import TicketAssignment


class TechnicianAssignedTicketSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="ticket_id")
    ticket_id = serializers.CharField(source="ticket.ticket_number")
    title = serializers.CharField(source="ticket.title")
    category = serializers.SerializerMethodField()
    priority = serializers.CharField(source="ticket.priority")
    status = serializers.CharField(source="ticket.status")
    date_assigned = serializers.DateTimeField(source="assigned_at")

    class Meta:
        model = TicketAssignment
        fields = (
            "id",
            "ticket_id",
            "title",
            "category",
            "priority",
            "status",
            "date_assigned",
        )

    def get_category(self, obj):
        return obj.ticket.category.name if obj.ticket.category else "Uncategorized"


class TechnicianAttentionTicketSerializer(TechnicianAssignedTicketSerializer):
    waiting_seconds = serializers.SerializerMethodField()
    awaiting_first_action = serializers.BooleanField()
    is_overdue = serializers.BooleanField()
    due_at = serializers.DateTimeField(source="ticket.resolution_due_at", allow_null=True)
    attention_reasons = serializers.SerializerMethodField()

    class Meta(TechnicianAssignedTicketSerializer.Meta):
        fields = TechnicianAssignedTicketSerializer.Meta.fields + (
            "waiting_seconds",
            "awaiting_first_action",
            "is_overdue",
            "due_at",
            "attention_reasons",
        )

    def get_waiting_seconds(self, obj):
        if not obj.assigned_at:
            return 0
        return max(0, int((timezone.now() - obj.assigned_at).total_seconds()))

    def get_attention_reasons(self, obj):
        reasons = []
        if obj.ticket.priority in (obj.ticket.Priority.CRITICAL, obj.ticket.Priority.HIGH):
            reasons.append(f"{obj.ticket.get_priority_display()} priority")
        if obj.awaiting_first_action:
            reasons.append("Awaiting first action")
        if obj.is_overdue:
            reasons.append("Past resolution due date")
        return reasons
