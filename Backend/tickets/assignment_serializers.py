from django.utils import timezone
from rest_framework import serializers

from accounts.models import User

from .models import Ticket, TicketAssignment
from .serializers import TicketCategorySerializer, display_name


class UnassignedTicketSerializer(serializers.ModelSerializer):
    requester = serializers.SerializerMethodField()
    category = TicketCategorySerializer(read_only=True)
    waiting_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "description",
            "category",
            "priority",
            "status",
            "requester",
            "created_at",
            "waiting_seconds",
        )

    def get_requester(self, obj):
        return {
            "id": obj.requester_id,
            "name": display_name(obj.requester),
            "email": obj.requester.email,
        }

    def get_waiting_seconds(self, obj):
        return max(0, int((timezone.now() - obj.created_at).total_seconds()))


class EligibleTechnicianSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    specialization = serializers.CharField(source="technician_specialization")
    specialization_display = serializers.CharField(
        source="get_technician_specialization_display"
    )
    active_assigned_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()
    recommended = serializers.BooleanField()
    recommendation_reason = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "email",
            "specialization",
            "specialization_display",
            "active_assigned_tickets",
            "in_progress_tickets",
            "resolved_tickets",
            "is_active",
            "recommended",
            "recommendation_reason",
        )

    def get_name(self, obj):
        return display_name(obj)

    def get_recommendation_reason(self, obj):
        if not obj.recommended:
            return "Available active technician"
        category_name = self.context.get("category_name", "this category")
        return (
            f"Specialization matches {category_name}; ordered by active workload."
        )


class TechnicianWorkloadSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    specialization = serializers.CharField(source="technician_specialization")
    specialization_display = serializers.CharField(
        source="get_technician_specialization_display"
    )
    active_assigned_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "email",
            "specialization",
            "specialization_display",
            "active_assigned_tickets",
            "in_progress_tickets",
            "resolved_tickets",
            "is_active",
        )

    def get_name(self, obj):
        return display_name(obj)


class AssignmentCreateSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField(min_value=1)
    technician_id = serializers.IntegerField(min_value=1)
    assignment_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )


class ReassignmentCreateSerializer(serializers.Serializer):
    ticket_id = serializers.IntegerField(min_value=1)
    technician_id = serializers.IntegerField(min_value=1)
    assignment_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )
    reassignment_reason = serializers.CharField(
        allow_blank=False,
        max_length=2000,
    )


def user_summary(user):
    if user is None:
        return None
    return {
        "id": user.id,
        "name": display_name(user),
        "email": user.email,
    }


class AssignmentHistorySerializer(serializers.ModelSerializer):
    ticket = serializers.SerializerMethodField()
    previous_technician = serializers.SerializerMethodField()
    new_technician = serializers.SerializerMethodField()
    assigned_by = serializers.SerializerMethodField()
    reason = serializers.SerializerMethodField()

    class Meta:
        model = TicketAssignment
        fields = (
            "id",
            "ticket",
            "previous_technician",
            "new_technician",
            "assigned_by",
            "assigned_at",
            "unassigned_at",
            "assignment_notes",
            "reassignment_reason",
            "reason",
            "is_current",
        )

    def get_ticket(self, obj):
        return {
            "id": obj.ticket_id,
            "ticket_number": obj.ticket.ticket_number,
            "title": obj.ticket.title,
            "description": obj.ticket.description,
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
            "created_at": obj.ticket.created_at,
        }

    def get_previous_technician(self, obj):
        technician_id = getattr(obj, "previous_technician_id", None)
        if technician_id is None:
            return None
        return {
            "id": technician_id,
            "name": getattr(obj, "previous_technician_name", "").strip()
            or getattr(obj, "previous_technician_email", ""),
            "email": getattr(obj, "previous_technician_email", ""),
        }

    def get_new_technician(self, obj):
        return user_summary(obj.technician)

    def get_assigned_by(self, obj):
        return user_summary(obj.assigned_by)

    def get_reason(self, obj):
        return obj.reassignment_reason or obj.assignment_notes


class AssignmentResultSerializer(serializers.ModelSerializer):
    ticket = serializers.SerializerMethodField()
    technician = serializers.SerializerMethodField()
    assigned_by = serializers.SerializerMethodField()

    class Meta:
        model = TicketAssignment
        fields = (
            "id",
            "ticket",
            "technician",
            "assigned_by",
            "assigned_at",
            "assignment_notes",
            "reassignment_reason",
            "is_current",
        )

    def get_ticket(self, obj):
        return {
            "id": obj.ticket_id,
            "ticket_number": obj.ticket.ticket_number,
            "title": obj.ticket.title,
            "priority": obj.ticket.priority,
            "status": obj.ticket.status,
        }

    def get_technician(self, obj):
        return user_summary(obj.technician)

    def get_assigned_by(self, obj):
        return user_summary(obj.assigned_by)
