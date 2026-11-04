from rest_framework import serializers

from accounts.models import User
from tickets.models import Ticket


class RecentTicketSerializer(serializers.ModelSerializer):
    ticket_id = serializers.SerializerMethodField()
    requester = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    assigned_technician = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_id",
            "title",
            "requester",
            "category",
            "priority",
            "status",
            "assigned_technician",
            "created_at",
        )

    def get_ticket_id(self, obj):
        return obj.ticket_number

    def get_requester(self, obj):
        return obj.requester.get_full_name() or obj.requester.username

    def get_category(self, obj):
        return obj.category.name if obj.category else "Uncategorized"

    def get_assigned_technician(self, obj):
        if obj.assigned_technician is None:
            return None
        return (
            obj.assigned_technician.get_full_name()
            or obj.assigned_technician.username
        )


class TechnicianWorkloadSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    active_assigned_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "specialization",
            "active_assigned_tickets",
            "resolved_tickets",
            "is_active",
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_specialization(self, obj):
        return obj.get_technician_specialization_display()
