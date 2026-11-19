from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Count, Q, Value
from django.db.models.functions import Concat, Lower
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tickets.models import Ticket

from .models import User, UserAuditLog
from .permissions import IsITAdministrator
from .user_management_serializers import (
    ManagedUserCreateSerializer,
    ManagedUserDetailSerializer,
    ManagedUserListSerializer,
    ManagedUserUpdateSerializer,
    PasswordSetupSerializer,
    UserTicketSerializer,
)


class ManagedUserPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class AdminUserQuerysetMixin:
    permission_classes = [IsAuthenticated, IsITAdministrator]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.USER)

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except User.DoesNotExist as exc:
            raise NotFound("Regular user account not found.") from exc


def parse_optional_date(raw_value, field_name):
    if not raw_value:
        return None
    parsed = parse_date(raw_value)
    if parsed is None:
        raise ValidationError({field_name: "Enter a valid date in YYYY-MM-DD format."})
    return parsed


def password_setup_link(user):
    query = urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
    )
    return f"{settings.FRONTEND_URL.rstrip('/')}/set-password?{query}"


def password_setup_invitation(user):
    return {
        "sent": False,
        "setup_link": password_setup_link(user),
        "message": (
            "Copy this secure setup link and send it privately to the account owner. "
            "The link becomes invalid after the password is created."
        ),
    }


class AdminUserListCreateView(AdminUserQuerysetMixin, generics.ListCreateAPIView):
    pagination_class = ManagedUserPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ManagedUserCreateSerializer
        return ManagedUserListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            searchable_name=Concat("first_name", Value(" "), "last_name")
        )
        search = self.request.query_params.get("search", "").strip()
        account_status = self.request.query_params.get("status", "all").lower()
        date_from = parse_optional_date(
            self.request.query_params.get("date_from"), "date_from"
        )
        date_to = parse_optional_date(
            self.request.query_params.get("date_to"), "date_to"
        )

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(searchable_name__icontains=search)
                | Q(email__icontains=search)
            )
        if account_status == "active":
            queryset = queryset.filter(is_active=True)
        elif account_status == "inactive":
            queryset = queryset.filter(is_active=False)
        elif account_status != "all":
            raise ValidationError(
                {"status": "Status must be all, active, or inactive."}
            )
        if date_from:
            queryset = queryset.filter(date_joined__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_joined__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError(
                {"date_to": "End date must be on or after the start date."}
            )

        ordering = self.request.query_params.get("ordering", "-date_joined")
        allowed_orderings = {
            "-date_joined": ("-date_joined",),
            "date_joined": ("date_joined",),
            "name": (Lower("first_name"), Lower("last_name"), Lower("email")),
            "-name": (
                Lower("first_name").desc(),
                Lower("last_name").desc(),
                Lower("email").desc(),
            ),
        }
        if ordering not in allowed_orderings:
            raise ValidationError({"ordering": "Unsupported ordering value."})
        return queryset.order_by(*allowed_orderings[ordering])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        UserAuditLog.objects.create(
            actor=request.user,
            target_user=user,
            action=UserAuditLog.Action.CREATE,
            changes={
                "email": user.email,
                "is_active": user.is_active,
                "account_setup_completed": False,
            },
        )
        response_data = ManagedUserDetailSerializer(user).data
        response_data["invitation"] = password_setup_invitation(user)
        response = Response(response_data, status=status.HTTP_201_CREATED)
        response["Cache-Control"] = "no-store"
        return response


class AdminUserDetailView(AdminUserQuerysetMixin, generics.RetrieveUpdateAPIView):
    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ManagedUserUpdateSerializer
        return ManagedUserDetailSerializer

    def patch(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = {
            field: {"from": getattr(user, field), "to": value}
            for field, value in serializer.validated_data.items()
            if getattr(user, field) != value
        }
        updated_user = serializer.save()
        if changes:
            UserAuditLog.objects.create(
                actor=request.user,
                target_user=updated_user,
                action=UserAuditLog.Action.UPDATE,
                changes=changes,
            )
        return Response(ManagedUserDetailSerializer(updated_user).data)


class AdminUserStatisticsView(AdminUserQuerysetMixin, APIView):
    def get(self, request):
        cutoff = timezone.now() - timedelta(days=30)
        counts = User.objects.filter(role=User.Role.USER).aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(is_active=True)),
            inactive=Count("id", filter=Q(is_active=False)),
            new=Count("id", filter=Q(date_joined__gte=cutoff)),
        )
        return Response(counts)


class AdminUserStatusView(AdminUserQuerysetMixin, APIView):
    action = None

    def post(self, request, pk):
        user = self.get_object()
        if self.action == "activate":
            if not user.account_setup_completed or not user.has_usable_password():
                raise ValidationError(
                    {
                        "detail": (
                            "This account cannot be activated until password setup is complete."
                        )
                    }
                )
            user.is_active = True
            action = UserAuditLog.Action.ACTIVATE
            detail = "User account activated."
        else:
            user.is_active = False
            Token.objects.filter(user=user).delete()
            action = UserAuditLog.Action.DEACTIVATE
            detail = "User account deactivated."
        user.save(update_fields=("is_active",))
        UserAuditLog.objects.create(
            actor=request.user,
            target_user=user,
            action=action,
            changes={"is_active": user.is_active},
        )
        return Response(
            {"detail": detail, "user": ManagedUserDetailSerializer(user).data}
        )


class AdminUserSetupLinkView(AdminUserQuerysetMixin, APIView):
    def post(self, request, pk):
        user = self.get_object()
        if user.account_setup_completed or user.has_usable_password():
            raise ValidationError(
                {"detail": "Password setup is already complete for this user."}
            )
        response = Response({"invitation": password_setup_invitation(user)})
        response["Cache-Control"] = "no-store"
        return response


class AdminUserTicketsView(AdminUserQuerysetMixin, APIView):
    def get(self, request, pk):
        user = self.get_object()
        tickets = Ticket.objects.filter(requester=user)
        statistics = tickets.aggregate(
            total=Count("id"),
            open=Count("id", filter=Q(status=Ticket.Status.OPEN)),
            in_progress=Count(
                "id", filter=Q(status=Ticket.Status.IN_PROGRESS)
            ),
            resolved=Count("id", filter=Q(status=Ticket.Status.RESOLVED)),
        )
        recent = tickets.select_related("category").order_by("-created_at")[:8]
        return Response(
            {
                "statistics": statistics,
                "recent_tickets": UserTicketSerializer(recent, many=True).data,
            }
        )


class PasswordSetupView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user_id = force_str(
                urlsafe_base64_decode(serializer.validated_data["uid"])
            )
            user = User.objects.get(
                pk=user_id,
                role__in=(User.Role.USER, User.Role.TECHNICIAN),
            )
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not default_token_generator.check_token(
            user, serializer.validated_data["token"]
        ):
            raise ValidationError(
                {"detail": "This password setup link is invalid or has expired."}
            )

        user.set_password(serializer.validated_data["password"])
        user.account_setup_completed = True
        user.save(update_fields=("password", "account_setup_completed"))
        UserAuditLog.objects.create(
            actor=None,
            target_user=user,
            action=UserAuditLog.Action.PASSWORD_SETUP,
            changes={"account_setup_completed": True},
        )
        return Response(
            {
                "detail": (
                    "Password setup complete. Your account is ready."
                    if user.is_active
                    else "Password setup complete. An administrator must activate your account."
                )
            }
        )
