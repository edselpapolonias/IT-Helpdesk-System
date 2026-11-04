import re

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.text import slugify
from rest_framework import serializers

from tickets.models import Ticket

from .models import User


CONTACT_PATTERN = re.compile(r"^\+?[0-9()\-\s]{7,25}$")


def available_username(email):
    local_part = email.split("@", 1)[0]
    base = slugify(local_part).replace("-", "_")[:135] or "user"
    candidate = base
    suffix = 1
    while User.objects.filter(username=candidate).exists():
        suffix += 1
        candidate = f"{base[:140 - len(str(suffix))]}_{suffix}"
    return candidate


class EmailValidationMixin:
    def validate_email(self, value):
        value = value.strip().lower()
        queryset = User.objects.filter(email__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )
        return value

    def validate_contact_number(self, value):
        value = value.strip()
        if value and not CONTACT_PATTERN.fullmatch(value):
            raise serializers.ValidationError(
                "Enter a valid contact number using digits, spaces, parentheses, +, or -."
            )
        return value

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("First name is required.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Last name is required.")
        return value


class ManagedUserListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "department",
            "contact_number",
            "is_active",
            "account_setup_completed",
            "date_joined",
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class ManagedUserDetailSerializer(ManagedUserListSerializer):
    role = serializers.CharField(source="get_role_display", read_only=True)

    class Meta(ManagedUserListSerializer.Meta):
        fields = ManagedUserListSerializer.Meta.fields + (
            "role",
            "last_login",
        )


class ManagedUserCreateSerializer(EmailValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "department",
            "contact_number",
            "is_active",
        )
        extra_kwargs = {
            "first_name": {"required": True, "allow_blank": False},
            "last_name": {"required": True, "allow_blank": False},
            "email": {"required": True},
            "department": {"required": False, "allow_blank": True},
            "contact_number": {"required": False, "allow_blank": True},
            "is_active": {"required": False, "default": True},
        }

    def create(self, validated_data):
        user = User(
            **validated_data,
            username=available_username(validated_data["email"]),
            role=User.Role.USER,
            account_setup_completed=False,
        )
        user.set_unusable_password()
        user.save()
        return user


class ManagedUserUpdateSerializer(EmailValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "first_name",
            "last_name",
            "email",
            "department",
            "contact_number",
        )


class UserTicketSerializer(serializers.ModelSerializer):
    ticket_id = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_id",
            "title",
            "category",
            "priority",
            "status",
            "created_at",
        )

    def get_ticket_id(self, obj):
        return f"TKT-{obj.id:05d}"

    def get_category(self, obj):
        return obj.category.name if obj.category else "Uncategorized"


class PasswordSetupSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        try:
            password_validation.validate_password(attrs["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs
