from rest_framework import serializers

from tickets.models import Ticket

from .models import User
from .user_management_serializers import EmailValidationMixin, available_username


class TechnicianListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    specialization = serializers.CharField(source="technician_specialization")
    specialization_display = serializers.CharField(
        source="get_technician_specialization_display",
        read_only=True,
    )
    active_assigned_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "contact_number",
            "specialization",
            "specialization_display",
            "active_assigned_tickets",
            "resolved_tickets",
            "is_active",
            "account_setup_completed",
            "date_joined",
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class TechnicianDetailSerializer(TechnicianListSerializer):
    role = serializers.CharField(source="get_role_display", read_only=True)
    total_historical_assignments = serializers.IntegerField()
    total_current_assignments = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    average_resolution_seconds = serializers.SerializerMethodField()

    class Meta(TechnicianListSerializer.Meta):
        fields = TechnicianListSerializer.Meta.fields + (
            "role",
            "last_login",
            "total_historical_assignments",
            "total_current_assignments",
            "in_progress_tickets",
            "average_resolution_seconds",
        )

    def get_average_resolution_seconds(self, obj):
        duration = getattr(obj, "average_resolution_time", None)
        return duration.total_seconds() if duration is not None else None

class TechnicianCreateSerializer(EmailValidationMixin, serializers.ModelSerializer):
    specialization = serializers.ChoiceField(
        source="technician_specialization",
        choices=User.TechnicianSpecialization.choices,
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "contact_number",
            "specialization",
            "is_active",
        )
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
            "email": {"required": True},
            "contact_number": {"required": False, "allow_blank": True},
            "is_active": {"required": False, "default": True},
        }

    def create(self, validated_data):
        user = User(
            **validated_data,
            username=available_username(validated_data["email"]),
            role=User.Role.TECHNICIAN,
            account_setup_completed=False,
        )
        user.set_unusable_password()
        user.save()
        return user


class TechnicianUpdateSerializer(EmailValidationMixin, serializers.ModelSerializer):
    specialization = serializers.ChoiceField(
        source="technician_specialization",
        choices=User.TechnicianSpecialization.choices,
    )

    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "contact_number",
            "specialization",
        )


class TechnicianTicketSerializer(serializers.ModelSerializer):
    ticket_id = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    assignment_date = serializers.DateTimeField(
        source="current_assignment_date",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_id",
            "title",
            "category",
            "priority",
            "status",
            "assignment_date",
            "created_at",
            "resolved_at",
        )

    def get_ticket_id(self, obj):
        return obj.ticket_number

    def get_category(self, obj):
        return obj.category.name if obj.category else "Uncategorized"
