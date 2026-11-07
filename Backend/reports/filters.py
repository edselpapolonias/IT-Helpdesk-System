from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from accounts.models import User
from tickets.models import Ticket, TicketCategory


DATE_RANGE_OPTIONS = (
    ("today", "Today"),
    ("last_7_days", "Last 7 Days"),
    ("last_30_days", "Last 30 Days"),
    ("last_90_days", "Last 90 Days"),
    ("this_month", "This Month"),
    ("last_month", "Last Month"),
    ("this_year", "This Year"),
    ("custom", "Custom Date Range"),
)


@dataclass(frozen=True)
class ReportFilters:
    date_range: str
    start_date: object
    end_date: object
    start_at: datetime
    end_at: datetime
    previous_start_at: datetime
    previous_end_at: datetime
    category: str
    priority: str
    technician_id: int | None
    status: str
    compare: bool

    @property
    def number_of_days(self):
        return (self.end_date - self.start_date).days + 1

    def serialized(self):
        return {
            "date_range": self.date_range,
            "date_from": self.start_date.isoformat(),
            "date_to": self.end_date.isoformat(),
            "category": self.category,
            "priority": self.priority,
            "technician": self.technician_id,
            "status": self.status,
            "compare": self.compare,
        }


def _month_start(value):
    return value.replace(day=1)


def _previous_month_bounds(today):
    this_month = _month_start(today)
    previous_end = this_month - timedelta(days=1)
    return _month_start(previous_end), previous_end


def _date_bounds(params):
    today = timezone.localdate()
    selected = params.get("date_range", "last_30_days").strip().lower()
    valid_ranges = {value for value, _ in DATE_RANGE_OPTIONS}
    if selected not in valid_ranges:
        raise ValidationError({"date_range": "Select a supported reporting period."})

    if selected == "today":
        start_date = end_date = today
    elif selected == "last_7_days":
        start_date, end_date = today - timedelta(days=6), today
    elif selected == "last_30_days":
        start_date, end_date = today - timedelta(days=29), today
    elif selected == "last_90_days":
        start_date, end_date = today - timedelta(days=89), today
    elif selected == "this_month":
        start_date, end_date = _month_start(today), today
    elif selected == "last_month":
        start_date, end_date = _previous_month_bounds(today)
    elif selected == "this_year":
        start_date, end_date = today.replace(month=1, day=1), today
    else:
        start_date = parse_date(params.get("date_from", ""))
        end_date = parse_date(params.get("date_to", ""))
        if start_date is None or end_date is None:
            raise ValidationError(
                {"date_range": "Custom reports require valid start and end dates."}
            )

    if start_date > end_date:
        raise ValidationError({"date_to": "End date must be on or after the start date."})
    if end_date > today:
        raise ValidationError({"date_to": "Reporting dates cannot be in the future."})
    if (end_date - start_date).days > 730:
        raise ValidationError({"date_range": "Reports are limited to two years."})
    return selected, start_date, end_date


def parse_report_filters(params):
    selected, start_date, end_date = _date_bounds(params)
    tz = timezone.get_current_timezone()
    start_at = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    end_at = timezone.make_aware(
        datetime.combine(end_date + timedelta(days=1), time.min),
        tz,
    )
    duration = end_at - start_at

    category = params.get("category", "all").strip().lower() or "all"
    if category != "all" and not TicketCategory.objects.filter(slug=category).exists():
        raise ValidationError({"category": "Select a valid ticket category."})

    priority = params.get("priority", "all").strip().upper() or "ALL"
    if priority != "ALL" and priority not in {value for value, _ in Ticket.Priority.choices}:
        raise ValidationError({"priority": "Select a valid ticket priority."})

    status = params.get("status", "all").strip().upper() or "ALL"
    if status != "ALL" and status not in {value for value, _ in Ticket.Status.choices}:
        raise ValidationError({"status": "Select a valid ticket status."})

    raw_technician = params.get("technician", "all")
    technician_id = None
    if str(raw_technician).strip().lower() not in {"", "all"}:
        try:
            technician_id = int(raw_technician)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"technician": "Select a valid technician."}) from exc
        if not User.objects.filter(pk=technician_id, role=User.Role.TECHNICIAN).exists():
            raise ValidationError({"technician": "Select a valid technician."})

    compare = str(params.get("compare", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    return ReportFilters(
        date_range=selected,
        start_date=start_date,
        end_date=end_date,
        start_at=start_at,
        end_at=end_at,
        previous_start_at=start_at - duration,
        previous_end_at=start_at,
        category=category,
        priority=priority,
        technician_id=technician_id,
        status=status,
        compare=compare,
    )


def apply_ticket_dimensions(queryset, filters, include_status=True):
    if filters.category != "all":
        queryset = queryset.filter(category__slug=filters.category)
    if filters.priority != "ALL":
        queryset = queryset.filter(priority=filters.priority)
    if include_status and filters.status != "ALL":
        queryset = queryset.filter(status=filters.status)
    if filters.technician_id is not None:
        queryset = queryset.filter(assigned_technician_id=filters.technician_id)
    return queryset


def apply_resolution_dimensions(queryset, filters):
    if filters.category != "all":
        queryset = queryset.filter(ticket__category__slug=filters.category)
    if filters.priority != "ALL":
        queryset = queryset.filter(ticket__priority=filters.priority)
    if filters.status != "ALL":
        queryset = queryset.filter(ticket__status=filters.status)
    if filters.technician_id is not None:
        queryset = queryset.filter(resolved_by_id=filters.technician_id)
    return queryset
