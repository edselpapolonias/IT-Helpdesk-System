from rest_framework import serializers

from tickets.models import Ticket


class UserRecentTicketSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "category",
            "priority",
            "status",
            "created_at",
        )

    def get_category(self, obj):
        return obj.category.name if obj.category_id else "Uncategorized"


class UserTicketDetailSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    assigned_technician = serializers.SerializerMethodField()

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
            "assigned_technician",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        )

    def get_category(self, obj):
        if obj.category_id is None:
            return None
        return {
            "id": obj.category_id,
            "name": obj.category.name,
            "slug": obj.category.slug,
        }

    def get_assigned_technician(self, obj):
        if obj.assigned_technician_id is None:
            return None
        technician = obj.assigned_technician
        return {
            "id": technician.id,
            "name": technician.get_full_name() or technician.username,
            "specialization": technician.get_technician_specialization_display(),
        }
