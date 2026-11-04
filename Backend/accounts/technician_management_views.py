from datetime import timedelta

from django.db import transaction
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Q, Value
from django.db.models.functions import Concat, Lower, TruncDate
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tickets.models import Ticket

from .models import User, UserAuditLog
from .permissions import IsITAdministrator
from .technician_management_serializers import (
    TechnicianCreateSerializer,
    TechnicianDetailSerializer,
    TechnicianListSerializer,
    TechnicianTicketSerializer,
    TechnicianUpdateSerializer,
)
from .user_management_views import development_setup_link


ACTIVE_TICKET_STATUSES = (Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS)
REPORTING_PERIODS = {7, 30, 90}
WORKLOAD_RULES = {
    "none": (0, 0),
    "light": (1, 3),
    "moderate": (4, 6),
    "heavy": (7, None),
}


class TechnicianPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


def resolution_duration_expression():
    return ExpressionWrapper(
        F("assigned_tickets__resolved_at") - F("assigned_tickets__created_at"),
        output_field=DurationField(),
    )


def annotated_technicians():
    valid_resolution = Q(
        assigned_tickets__status=Ticket.Status.RESOLVED,
        assigned_tickets__resolved_at__isnull=False,
        assigned_tickets__resolved_at__gt=F("assigned_tickets__created_at"),
    )
    return User.objects.filter(role=User.Role.TECHNICIAN).annotate(
        active_assigned_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status__in=ACTIVE_TICKET_STATUSES),
            distinct=True,
        ),
        resolved_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status=Ticket.Status.RESOLVED),
            distinct=True,
        ),
        total_current_assignments=Count("assigned_tickets", distinct=True),
        in_progress_tickets=Count(
            "assigned_tickets",
            filter=Q(assigned_tickets__status=Ticket.Status.IN_PROGRESS),
            distinct=True,
        ),
        average_resolution_time=Avg(
            resolution_duration_expression(),
            filter=valid_resolution,
        ),
    )


class AdminTechnicianMixin:
    permission_classes = [IsAuthenticated, IsITAdministrator]

    def get_queryset(self):
        return annotated_technicians()

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except User.DoesNotExist as exc:
            raise NotFound("Technician account not found.") from exc


def requested_days(request):
    try:
        days = int(request.query_params.get("days", "30"))
    except (TypeError, ValueError) as exc:
        raise ValidationError({"days": "Days must be 7, 30, or 90."}) from exc
    if days not in REPORTING_PERIODS:
        raise ValidationError({"days": "Days must be 7, 30, or 90."})
    return days


class AdminTechnicianListCreateView(
    AdminTechnicianMixin,
    generics.ListCreateAPIView,
):
    pagination_class = TechnicianPagination

    def get_serializer_class(self):
        return (
            TechnicianCreateSerializer
            if self.request.method == "POST"
            else TechnicianListSerializer
        )

    def get_queryset(self):
        queryset = super().get_queryset().annotate(
            searchable_name=Concat("first_name", Value(" "), "last_name")
        )
        search = self.request.query_params.get("search", "").strip()
        account_status = self.request.query_params.get("status", "all").lower()
        specialization = self.request.query_params.get("specialization", "").strip()
        workload = self.request.query_params.get("workload", "all").lower()

        if search:
            matching_specializations = [
                value
                for value, label in User.TechnicianSpecialization.choices
                if search.lower() in label.lower()
            ]
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(searchable_name__icontains=search)
                | Q(email__icontains=search)
                | Q(technician_specialization__icontains=search)
                | Q(technician_specialization__in=matching_specializations)
            )
        if account_status == "active":
            queryset = queryset.filter(is_active=True)
        elif account_status == "inactive":
            queryset = queryset.filter(is_active=False)
        elif account_status != "all":
            raise ValidationError(
                {"status": "Status must be all, active, or inactive."}
            )
        valid_specializations = {
            value for value, _ in User.TechnicianSpecialization.choices
        }
        if specialization:
            if specialization not in valid_specializations:
                raise ValidationError({"specialization": "Invalid specialization."})
            queryset = queryset.filter(technician_specialization=specialization)
        if workload != "all":
            if workload not in WORKLOAD_RULES:
                raise ValidationError({"workload": "Invalid workload level."})
            minimum, maximum = WORKLOAD_RULES[workload]
            queryset = queryset.filter(active_assigned_tickets__gte=minimum)
            if maximum is not None:
                queryset = queryset.filter(active_assigned_tickets__lte=maximum)

        ordering = self.request.query_params.get("ordering", "name")
        allowed_orderings = {
            "name": (Lower("first_name"), Lower("last_name"), Lower("email")),
            "-name": (
                Lower("first_name").desc(),
                Lower("last_name").desc(),
                Lower("email").desc(),
            ),
            "-date_joined": ("-date_joined",),
            "date_joined": ("date_joined",),
            "-active_tickets": ("-active_assigned_tickets", "first_name"),
            "active_tickets": ("active_assigned_tickets", "first_name"),
        }
        if ordering not in allowed_orderings:
            raise ValidationError({"ordering": "Unsupported ordering value."})
        return queryset.order_by(*allowed_orderings[ordering])

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        technician = serializer.save()
        UserAuditLog.objects.create(
            actor=request.user,
            target_user=technician,
            action=UserAuditLog.Action.CREATE,
            changes={
                "role": User.Role.TECHNICIAN,
                "specialization": technician.technician_specialization,
                "is_active": technician.is_active,
                "account_setup_completed": False,
            },
        )
        setup_link = development_setup_link(technician)
        response_data = TechnicianDetailSerializer(
            annotated_technicians().get(pk=technician.pk)
        ).data
        response_data["invitation"] = {
            "sent": False,
            "setup_link": setup_link,
            "message": (
                "Email delivery is not configured. Copy the development setup link securely."
                if setup_link
                else "Email delivery must be configured before invitations can be sent."
            ),
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


class AdminTechnicianDetailView(
    AdminTechnicianMixin,
    generics.RetrieveUpdateAPIView,
):
    def get_serializer_class(self):
        return (
            TechnicianUpdateSerializer
            if self.request.method == "PATCH"
            else TechnicianDetailSerializer
        )

    def patch(self, request, *args, **kwargs):
        technician = self.get_object()
        serializer = self.get_serializer(technician, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = {}
        for field, value in serializer.validated_data.items():
            current = getattr(technician, field)
            if current != value:
                changes[field] = {"from": current, "to": value}
        serializer.save()
        if changes:
            UserAuditLog.objects.create(
                actor=request.user,
                target_user=technician,
                action=UserAuditLog.Action.UPDATE,
                changes=changes,
            )
        refreshed = annotated_technicians().get(pk=technician.pk)
        return Response(TechnicianDetailSerializer(refreshed).data)


class AdminTechnicianStatisticsView(AdminTechnicianMixin, APIView):
    def get(self, request):
        counts = User.objects.filter(role=User.Role.TECHNICIAN).aggregate(
            total=Count("id", distinct=True),
            active=Count("id", filter=Q(is_active=True), distinct=True),
            inactive=Count("id", filter=Q(is_active=False), distinct=True),
            with_active_assignments=Count(
                "id",
                filter=Q(assigned_tickets__status__in=ACTIVE_TICKET_STATUSES),
                distinct=True,
            ),
        )
        return Response(counts)


class AdminTechnicianStatusView(AdminTechnicianMixin, APIView):
    action = None

    def post(self, request, pk):
        technician = self.get_object()
        if self.action == "deactivate":
            active_count = technician.active_assigned_tickets
            if active_count:
                return Response(
                    {
                        "detail": (
                            "Reassign or resolve active tickets before deactivating this technician."
                        ),
                        "active_ticket_count": active_count,
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            technician.is_active = False
            Token.objects.filter(user=technician).delete()
            action = UserAuditLog.Action.DEACTIVATE
            detail = "Technician account deactivated."
        else:
            if (
                not technician.account_setup_completed
                or not technician.has_usable_password()
            ):
                raise ValidationError(
                    {
                        "detail": (
                            "This account cannot be activated until password setup is complete."
                        )
                    }
                )
            technician.is_active = True
            action = UserAuditLog.Action.ACTIVATE
            detail = "Technician account activated."
        technician.save(update_fields=("is_active",))
        UserAuditLog.objects.create(
            actor=request.user,
            target_user=technician,
            action=action,
            changes={"is_active": technician.is_active},
        )
        refreshed = annotated_technicians().get(pk=technician.pk)
        return Response(
            {"detail": detail, "technician": TechnicianDetailSerializer(refreshed).data}
        )


class AdminTechnicianTicketsView(AdminTechnicianMixin, APIView):
    def get(self, request, pk):
        technician = self.get_object()
        tickets = Ticket.objects.filter(assigned_technician=technician).select_related(
            "category"
        )
        active = tickets.filter(status__in=ACTIVE_TICKET_STATUSES).order_by(
            "-created_at"
        )
        completed = tickets.filter(status=Ticket.Status.RESOLVED).order_by(
            "-resolved_at"
        )
        return Response(
            {
                "active_tickets": TechnicianTicketSerializer(active, many=True).data,
                "completed_tickets": TechnicianTicketSerializer(
                    completed[:10], many=True
                ).data,
                "assignment_date_available": False,
            }
        )


class AdminTechnicianPerformanceView(AdminTechnicianMixin, APIView):
    def get(self, request, pk):
        technician = self.get_object()
        days = requested_days(request)
        today = timezone.localdate()
        start_date = today - timedelta(days=days - 1)
        resolved = Ticket.objects.filter(
            assigned_technician=technician,
            status=Ticket.Status.RESOLVED,
            resolved_at__date__gte=start_date,
            resolved_at__gt=F("created_at"),
        )
        average = resolved.aggregate(
            value=Avg(
                ExpressionWrapper(
                    F("resolved_at") - F("created_at"),
                    output_field=DurationField(),
                )
            )
        )["value"]
        rows = (
            resolved.annotate(
                day=TruncDate(
                    "resolved_at", tzinfo=timezone.get_current_timezone()
                )
            )
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        counts = {row["day"]: row["count"] for row in rows}
        trend = [
            {
                "date": (start_date + timedelta(days=offset)).isoformat(),
                "resolved": counts.get(start_date + timedelta(days=offset), 0),
            }
            for offset in range(days)
        ]
        return Response(
            {
                "days": days,
                "resolved_tickets": resolved.count(),
                "average_resolution_seconds": (
                    average.total_seconds() if average is not None else None
                ),
                "resolution_trend": trend,
                "resolution_time_definition": (
                    "Time from ticket submission to resolution; tickets without valid "
                    "resolution timestamps are excluded."
                ),
            }
        )
