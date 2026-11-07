from collections import defaultdict
from datetime import timedelta

from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Max,
    OuterRef,
    Q,
    Subquery,
)
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone

from accounts.models import User
from tickets.models import Ticket, TicketAssignment, TicketCategory, TicketResolution

from .filters import apply_resolution_dimensions, apply_ticket_dimensions


ACTIONABLE_STATUSES = (
    Ticket.Status.OPEN,
    Ticket.Status.ASSIGNED,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.REOPENED,
)


def display_name(user):
    return user.get_full_name() or user.email


def duration_expression():
    return ExpressionWrapper(
        F("resolved_at") - F("ticket__created_at"),
        output_field=DurationField(),
    )


def first_resolution_queryset():
    first_id = TicketResolution.objects.filter(
        ticket_id=OuterRef("ticket_id")
    ).order_by("resolved_at", "id").values("id")[:1]
    return TicketResolution.objects.annotate(
        first_resolution_id=Subquery(first_id)
    ).filter(
        id=F("first_resolution_id"),
        resolved_at__gt=F("ticket__created_at"),
    )


def period_resolutions(filters, start_at=None, end_at=None):
    queryset = TicketResolution.objects.filter(
        resolved_at__gte=start_at or filters.start_at,
        resolved_at__lt=end_at or filters.end_at,
    )
    return apply_resolution_dimensions(queryset, filters)


def submission_cohort(filters, start_at=None, end_at=None):
    queryset = Ticket.objects.filter(
        created_at__gte=start_at or filters.start_at,
        created_at__lt=end_at or filters.end_at,
    )
    return apply_ticket_dimensions(queryset, filters)


def current_backlog(filters):
    queryset = Ticket.objects.filter(status__in=ACTIONABLE_STATUSES)
    return apply_ticket_dimensions(queryset, filters)


def percentage(numerator, denominator):
    if not denominator:
        return None
    return round((numerator / denominator) * 100, 1)


def seconds(value):
    return round(value.total_seconds(), 2) if value is not None else None


def percent_change(current, previous):
    if previous in (None, 0):
        return 0.0 if current == 0 else None
    return round(((current - previous) / previous) * 100, 1)


def _period_kpis(filters, start_at, end_at):
    submitted = submission_cohort(filters, start_at, end_at)
    resolutions = period_resolutions(filters, start_at, end_at)
    submitted_count = submitted.count()
    resolved_count = resolutions.values("ticket_id").distinct().count()
    cohort_resolved = submitted.filter(
        resolutions__resolved_at__lt=end_at,
    ).distinct().count()
    first_resolutions = apply_resolution_dimensions(
        first_resolution_queryset().filter(
            resolved_at__gte=start_at,
            resolved_at__lt=end_at,
        ),
        filters,
    ).annotate(resolution_duration=duration_expression())
    average = first_resolutions.aggregate(value=Avg("resolution_duration"))["value"]
    return {
        "submitted": submitted_count,
        "resolved": resolved_count,
        "cohort_resolution_rate": percentage(cohort_resolved, submitted_count),
        "average_resolution_seconds": seconds(average),
    }


def overview(filters):
    period = _period_kpis(filters, filters.start_at, filters.end_at)
    backlog = current_backlog(filters)
    resolutions = period_resolutions(filters)
    reopened = apply_resolution_dimensions(
        TicketResolution.objects.filter(
            reopened_at__gte=filters.start_at,
            reopened_at__lt=filters.end_at,
        ),
        filters,
    )
    attempts = resolutions.count()
    reopened_attempts = resolutions.filter(reopened_at__isnull=False).count()
    active_technicians = User.objects.filter(
        role=User.Role.TECHNICIAN,
        is_active=True,
    )
    if filters.technician_id is not None:
        active_technicians = active_technicians.filter(pk=filters.technician_id)

    result = {
        **period,
        "current_open_backlog": backlog.count(),
        "current_unassigned": backlog.filter(assigned_technician__isnull=True).count(),
        "reopened": reopened.values("ticket_id").distinct().count(),
        "resolution_attempts": attempts,
        "attempt_reopen_rate": percentage(reopened_attempts, attempts),
        "active_technicians": active_technicians.count(),
    }
    if filters.compare:
        previous = _period_kpis(
            filters,
            filters.previous_start_at,
            filters.previous_end_at,
        )
        result["comparison"] = {
            key: {
                "previous": previous[key],
                "change_percent": percent_change(result[key], previous[key]),
            }
            for key in (
                "submitted",
                "resolved",
                "cohort_resolution_rate",
                "average_resolution_seconds",
            )
        }
    return result


def _granularity(filters):
    if filters.number_of_days <= 45:
        return "day", TruncDay
    if filters.number_of_days <= 180:
        return "week", TruncWeek
    return "month", TruncMonth


def ticket_trends(filters):
    granularity, truncation = _granularity(filters)
    tz = timezone.get_current_timezone()
    submitted_rows = (
        submission_cohort(filters)
        .annotate(bucket=truncation("created_at", tzinfo=tz))
        .values("bucket")
        .annotate(count=Count("id"))
        .order_by("bucket")
    )
    resolved_rows = (
        period_resolutions(filters)
        .annotate(bucket=truncation("resolved_at", tzinfo=tz))
        .values("bucket")
        .annotate(count=Count("ticket_id", distinct=True))
        .order_by("bucket")
    )
    submitted = {row["bucket"].date(): row["count"] for row in submitted_rows}
    resolved = {row["bucket"].date(): row["count"] for row in resolved_rows}
    dates = sorted(set(submitted) | set(resolved))
    return {
        "granularity": granularity,
        "results": [
            {
                "date": value.isoformat(),
                "submitted": submitted.get(value, 0),
                "resolved": resolved.get(value, 0),
            }
            for value in dates
        ],
    }


def current_distributions(filters):
    cohort = submission_cohort(filters)
    status_rows = cohort.values("status").annotate(count=Count("id")).order_by()
    priority_rows = cohort.values("priority").annotate(count=Count("id")).order_by()
    status_labels = dict(Ticket.Status.choices)
    priority_labels = dict(Ticket.Priority.choices)
    total = cohort.count()
    return {
        "status": [
            {
                "key": value,
                "label": status_labels[value],
                "count": next((row["count"] for row in status_rows if row["status"] == value), 0),
                "percentage": percentage(
                    next((row["count"] for row in status_rows if row["status"] == value), 0),
                    total,
                ),
            }
            for value, _ in Ticket.Status.choices
        ],
        "priority": [
            {
                "key": value,
                "label": priority_labels[value],
                "count": next((row["count"] for row in priority_rows if row["priority"] == value), 0),
                "percentage": percentage(
                    next((row["count"] for row in priority_rows if row["priority"] == value), 0),
                    total,
                ),
            }
            for value, _ in Ticket.Priority.choices
        ],
        "cohort_total": total,
        "definition": "Current status and priority of tickets submitted during the selected period.",
    }


def category_analytics(filters):
    submitted = submission_cohort(filters)
    category_rows = submitted.values(
        "category_id", "category__name", "category__slug"
    ).annotate(submitted=Count("id")).order_by("-submitted", "category__name")
    cohort_resolved_rows = submitted.filter(
        resolutions__resolved_at__lt=filters.end_at,
    ).values("category_id").annotate(count=Count("id", distinct=True))
    cohort_resolved = {row["category_id"]: row["count"] for row in cohort_resolved_rows}

    first_resolutions = apply_resolution_dimensions(
        first_resolution_queryset().filter(
            resolved_at__gte=filters.start_at,
            resolved_at__lt=filters.end_at,
        ),
        filters,
    ).annotate(resolution_duration=duration_expression())
    resolution_rows = first_resolutions.values("ticket__category_id").annotate(
        resolved=Count("ticket_id", distinct=True),
        average=Avg("resolution_duration"),
    )
    resolution_map = {row["ticket__category_id"]: row for row in resolution_rows}

    backlog_rows = current_backlog(filters).values("category_id").annotate(
        count=Count("id")
    )
    backlog_map = {row["category_id"]: row["count"] for row in backlog_rows}
    total = submitted.count()
    performance = []
    for row in category_rows:
        category_id = row["category_id"]
        resolution = resolution_map.get(category_id, {})
        resolved_cohort = cohort_resolved.get(category_id, 0)
        performance.append(
            {
                "id": category_id,
                "name": row["category__name"] or "Uncategorized",
                "slug": row["category__slug"] or "",
                "submitted": row["submitted"],
                "percentage": percentage(row["submitted"], total),
                "resolved": resolution.get("resolved", 0),
                "cohort_resolved": resolved_cohort,
                "cohort_resolution_rate": percentage(resolved_cohort, row["submitted"]),
                "average_resolution_seconds": seconds(resolution.get("average")),
                "current_backlog": backlog_map.get(category_id, 0),
                "resolution_sample": resolution.get("resolved", 0),
            }
        )

    patterns = list(
        submitted.exclude(location="")
        .values("category_id", "category__name", "location")
        .annotate(count=Count("id"), recent=Max("created_at"))
        .filter(count__gte=2)
        .order_by("-count", "-recent")[:8]
    )
    fallback = False
    if not patterns:
        fallback = True
        patterns = [
            {
                "category_id": row["category_id"],
                "category__name": row["category__name"],
                "location": "Multiple locations",
                "count": row["submitted"],
                "recent": None,
            }
            for row in category_rows
            if row["submitted"] >= 2
        ][:8]

    conditions = Q(pk__in=[])
    for pattern in patterns:
        clause = Q(category_id=pattern["category_id"])
        if not fallback:
            clause &= Q(location=pattern["location"])
        conditions |= clause
    related = defaultdict(list)
    if patterns:
        for ticket in submitted.filter(conditions).order_by("-created_at"):
            key = (ticket.category_id, "Multiple locations" if fallback else ticket.location)
            if len(related[key]) < 3:
                related[key].append(
                    {
                        "id": ticket.id,
                        "ticket_number": ticket.ticket_number,
                        "title": ticket.title,
                    }
                )
    recurring = [
        {
            "category": pattern["category__name"] or "Uncategorized",
            "location": pattern["location"],
            "count": pattern["count"],
            "recent_at": pattern["recent"],
            "related_tickets": related[
                (pattern["category_id"], pattern["location"])
            ],
            "basis": "category frequency" if fallback else "category and location frequency",
        }
        for pattern in patterns
    ]
    return {"performance": performance, "recurring": recurring}


def _assignment_dimensions(queryset, filters):
    if filters.category != "all":
        queryset = queryset.filter(ticket__category__slug=filters.category)
    if filters.priority != "ALL":
        queryset = queryset.filter(ticket__priority=filters.priority)
    if filters.status != "ALL":
        queryset = queryset.filter(ticket__status=filters.status)
    if filters.technician_id is not None:
        queryset = queryset.filter(technician_id=filters.technician_id)
    return queryset


def technician_analytics(filters):
    technicians = User.objects.filter(role=User.Role.TECHNICIAN)
    if filters.technician_id is not None:
        technicians = technicians.filter(pk=filters.technician_id)
    technicians = technicians.order_by("first_name", "last_name", "email")

    assignments = _assignment_dimensions(
        TicketAssignment.objects.filter(
            is_current=True,
            ticket__status__in=ACTIONABLE_STATUSES,
        ),
        filters,
    ).values("technician_id").annotate(count=Count("ticket_id", distinct=True))
    assignment_map = {row["technician_id"]: row["count"] for row in assignments}

    resolutions = period_resolutions(filters).filter(
        resolved_at__gt=F("ticket__created_at")
    ).annotate(resolution_duration=duration_expression())
    resolution_rows = resolutions.values("resolved_by_id").annotate(
        tickets=Count("ticket_id", distinct=True),
        attempts=Count("id"),
        average=Avg("resolution_duration"),
        reopened=Count("id", filter=Q(reopened_at__isnull=False)),
    )
    resolution_map = {row["resolved_by_id"]: row for row in resolution_rows}

    performance = []
    for technician in technicians:
        resolution = resolution_map.get(technician.id, {})
        performance.append(
            {
                "id": technician.id,
                "name": display_name(technician),
                "specialization": technician.get_technician_specialization_display() or "Not assigned",
                "active_assignments": assignment_map.get(technician.id, 0),
                "resolved_tickets": resolution.get("tickets", 0),
                "resolution_attempts": resolution.get("attempts", 0),
                "average_resolution_seconds": seconds(resolution.get("average")),
                "resolution_sample": resolution.get("attempts", 0),
                "reopened_after_resolution": resolution.get("reopened", 0),
                "is_active": technician.is_active,
            }
        )
    workload = sorted(
        [
            {"id": row["id"], "name": row["name"], "count": row["active_assignments"]}
            for row in performance
        ],
        key=lambda row: (-row["count"], row["name"]),
    )
    resolution_activity = sorted(
        [
            {
                "id": row["id"],
                "name": row["name"],
                "resolved": row["resolved_tickets"],
                "attempts": row["resolution_attempts"],
            }
            for row in performance
        ],
        key=lambda row: (-row["resolved"], row["name"]),
    )
    return {
        "performance": performance,
        "workload": workload,
        "resolution_activity": resolution_activity,
    }


def resolution_analytics(filters):
    first_resolutions = apply_resolution_dimensions(
        first_resolution_queryset().filter(
            resolved_at__gte=filters.start_at,
            resolved_at__lt=filters.end_at,
        ),
        filters,
    ).annotate(resolution_duration=duration_expression())
    one_hour = timedelta(hours=1)
    four_hours = timedelta(hours=4)
    eight_hours = timedelta(hours=8)
    one_day = timedelta(days=1)
    three_days = timedelta(days=3)
    counts = first_resolutions.aggregate(
        under_one=Count("id", filter=Q(resolution_duration__lt=one_hour)),
        one_to_four=Count(
            "id",
            filter=Q(resolution_duration__gte=one_hour, resolution_duration__lt=four_hours),
        ),
        four_to_eight=Count(
            "id",
            filter=Q(resolution_duration__gte=four_hours, resolution_duration__lt=eight_hours),
        ),
        eight_to_twenty_four=Count(
            "id",
            filter=Q(resolution_duration__gte=eight_hours, resolution_duration__lt=one_day),
        ),
        one_to_three_days=Count(
            "id",
            filter=Q(resolution_duration__gte=one_day, resolution_duration__lt=three_days),
        ),
        over_three=Count("id", filter=Q(resolution_duration__gte=three_days)),
    )
    distribution = [
        {"label": "Under 1 hour", "count": counts["under_one"]},
        {"label": "1-4 hours", "count": counts["one_to_four"]},
        {"label": "4-8 hours", "count": counts["four_to_eight"]},
        {"label": "8-24 hours", "count": counts["eight_to_twenty_four"]},
        {"label": "1-3 days", "count": counts["one_to_three_days"]},
        {"label": "More than 3 days", "count": counts["over_three"]},
    ]
    category_rows = first_resolutions.values(
        "ticket__category_id", "ticket__category__name"
    ).annotate(
        average=Avg("resolution_duration"),
        count=Count("ticket_id", distinct=True),
    ).order_by("-average")
    category = [
        {
            "id": row["ticket__category_id"],
            "name": row["ticket__category__name"] or "Uncategorized",
            "average_resolution_seconds": seconds(row["average"]),
            "count": row["count"],
        }
        for row in category_rows
    ]
    granularity, truncation = _granularity(filters)
    trend_rows = first_resolutions.annotate(
        bucket=truncation("resolved_at", tzinfo=timezone.get_current_timezone())
    ).values("bucket").annotate(
        average=Avg("resolution_duration"),
        count=Count("id"),
    ).order_by("bucket")
    trends = [
        {
            "date": row["bucket"].date().isoformat(),
            "average_resolution_seconds": seconds(row["average"]),
            "count": row["count"],
        }
        for row in trend_rows
    ]
    return {
        "distribution": distribution,
        "by_category": category,
        "trends": trends,
        "granularity": granularity,
        "definition": "First valid resolution timestamp minus ticket creation timestamp.",
    }


def backlog_analytics(filters):
    now = timezone.now()
    backlog = current_backlog(filters).annotate(
        age=ExpressionWrapper(now - F("created_at"), output_field=DurationField())
    )
    one_day = timedelta(days=1)
    three_days = timedelta(days=4)
    seven_days = timedelta(days=8)
    fourteen_days = timedelta(days=15)
    counts = backlog.aggregate(
        under_one=Count("id", filter=Q(age__lt=one_day)),
        one_to_three=Count("id", filter=Q(age__gte=one_day, age__lt=three_days)),
        four_to_seven=Count("id", filter=Q(age__gte=three_days, age__lt=seven_days)),
        eight_to_fourteen=Count("id", filter=Q(age__gte=seven_days, age__lt=fourteen_days)),
        over_fourteen=Count("id", filter=Q(age__gte=fourteen_days)),
    )
    total = backlog.count()
    aging = [
        {"label": "Under 1 day", "count": counts["under_one"]},
        {"label": "1-3 days", "count": counts["one_to_three"]},
        {"label": "4-7 days", "count": counts["four_to_seven"]},
        {"label": "8-14 days", "count": counts["eight_to_fourteen"]},
        {"label": "More than 14 days", "count": counts["over_fourteen"]},
    ]
    for row in aging:
        row["percentage"] = percentage(row["count"], total)

    oldest = []
    for ticket in backlog.select_related(
        "category", "assigned_technician"
    ).order_by("created_at")[:10]:
        oldest.append(
            {
                "id": ticket.id,
                "ticket_number": ticket.ticket_number,
                "title": ticket.title,
                "category": ticket.category.name if ticket.category else "Uncategorized",
                "priority": ticket.priority,
                "status": ticket.status,
                "technician": (
                    display_name(ticket.assigned_technician)
                    if ticket.assigned_technician_id
                    else "Unassigned"
                ),
                "days_open": round((now - ticket.created_at).total_seconds() / 86400, 1),
            }
        )

    first_assignment_at = TicketAssignment.objects.filter(
        ticket_id=OuterRef("pk"),
        assigned_at__isnull=False,
    ).order_by("assigned_at", "id").values("assigned_at")[:1]
    assigned_cohort = submission_cohort(filters).annotate(
        first_assignment_at=Subquery(first_assignment_at)
    ).filter(
        first_assignment_at__isnull=False,
        first_assignment_at__gte=F("created_at"),
    ).annotate(
        assignment_wait=ExpressionWrapper(
            F("first_assignment_at") - F("created_at"),
            output_field=DurationField(),
        )
    )
    assigned_wait = assigned_cohort.aggregate(
        average=Avg("assignment_wait"),
        count=Count("id"),
    )
    never_assigned = backlog.filter(assignment_history__isnull=True).distinct().annotate(
        current_wait=ExpressionWrapper(
            now - F("created_at"),
            output_field=DurationField(),
        )
    )
    never_assigned_wait = never_assigned.aggregate(
        count=Count("id"),
        average=Avg("current_wait"),
        longest=Max("current_wait"),
    )
    unassigned = {
        "assigned_ticket_count": assigned_wait["count"],
        "average_first_assignment_seconds": seconds(assigned_wait["average"]),
        "never_assigned_current_count": never_assigned_wait["count"],
        "average_never_assigned_wait_seconds": seconds(never_assigned_wait["average"]),
        "longest_never_assigned_wait_seconds": seconds(never_assigned_wait["longest"]),
    }
    priority_rows = backlog.values("priority").annotate(count=Count("id"))
    return {
        "total": total,
        "aging": aging,
        "priority_breakdown": list(priority_rows),
        "oldest": oldest,
        "unassigned": unassigned,
        "definition": "Current unresolved tickets measured from submission time.",
    }


def generate_insights(report, filters):
    insights = []
    categories = report["categories"]["performance"]
    if categories:
        largest = categories[0]
        if largest["submitted"] >= 3 and (largest["percentage"] or 0) >= 30:
            insights.append(
                {
                    "severity": "info",
                    "title": "High ticket volume in one category",
                    "metric": f"{largest['percentage']}% of submitted tickets",
                    "explanation": f"{largest['name']} accounts for {largest['submitted']} submitted tickets during this period.",
                    "recommendation": "Review recurring causes, documentation, and preventive maintenance for this category.",
                    "link": f"/it-admin/tickets?category={largest['slug']}",
                }
            )
    overall_average = report["overview"]["average_resolution_seconds"]
    slow_categories = [
        row
        for row in report["resolution"]["by_category"]
        if row["count"] >= 3
        and overall_average
        and row["average_resolution_seconds"] > overall_average * 1.5
    ]
    if slow_categories:
        slowest = slow_categories[0]
        insights.append(
            {
                "severity": "warning",
                "title": "Slower resolution category",
                "metric": f"{slowest['count']} qualifying tickets",
                "explanation": f"{slowest['name']} tickets take substantially longer than the overall first-resolution average.",
                "recommendation": "Review troubleshooting procedures, escalation paths, and equipment availability for this category.",
                "link": "/it-admin/tickets",
            }
        )
    workloads = report["technicians"]["workload"]
    active_total = sum(row["count"] for row in workloads)
    if active_total >= 4 and workloads and workloads[0]["count"] / active_total >= 0.5:
        busiest = workloads[0]
        insights.append(
            {
                "severity": "warning",
                "title": "Uneven technician workload",
                "metric": f"{busiest['count']} of {active_total} active assignments",
                "explanation": f"{busiest['name']} currently handles at least half of the filtered active assignments.",
                "recommendation": "Review assignment distribution and available technician specializations.",
                "link": "/it-admin/assignments",
            }
        )
    long_unassigned = current_backlog(filters).filter(
        assigned_technician__isnull=True,
        created_at__lt=timezone.now() - timedelta(days=2),
    ).count()
    if long_unassigned:
        insights.append(
            {
                "severity": "critical" if long_unassigned >= 5 else "warning",
                "title": "Long-unassigned support requests",
                "metric": f"{long_unassigned} tickets waiting over 2 days",
                "explanation": "Unresolved requests have remained without a current technician assignment beyond the review threshold.",
                "recommendation": "Review the unassigned queue and prioritize technician allocation.",
                "link": "/it-admin/assignments",
            }
        )
    if report["overview"]["attempt_reopen_rate"] is not None and report["overview"]["resolution_attempts"] >= 5 and report["overview"]["attempt_reopen_rate"] >= 20:
        insights.append(
            {
                "severity": "warning",
                "title": "Frequent reopening after resolution",
                "metric": f"{report['overview']['attempt_reopen_rate']}% attempt reopen rate",
                "explanation": "A notable share of resolution attempts recorded during this period were later reopened.",
                "recommendation": "Review resolution verification and requester confirmation procedures.",
                "link": "/it-admin/tickets?status=REOPENED",
            }
        )
    if not insights:
        insights.append(
            {
                "severity": "neutral",
                "title": "Insufficient evidence for a reliable recommendation",
                "metric": "Limited qualifying data",
                "explanation": "Not enough data is available to generate reliable insights for this period.",
                "recommendation": "Continue recording ticket categories, assignments, resolutions, and reopening outcomes.",
                "link": "/it-admin/tickets",
            }
        )
    return insights


def build_report(filters):
    report = {
        "generated_at": timezone.now(),
        "filters": filters.serialized(),
        "overview": overview(filters),
        "trends": ticket_trends(filters),
        "distributions": current_distributions(filters),
        "categories": category_analytics(filters),
        "technicians": technician_analytics(filters),
        "resolution": resolution_analytics(filters),
        "backlog": backlog_analytics(filters),
        "definitions": {
            "submitted": "Ticket creation timestamp within the selected period.",
            "resolved": "Distinct tickets with one or more resolution records in the selected period.",
            "cohort_resolution_rate": "Tickets submitted in the period with a resolution recorded by the reporting cutoff, divided by submitted tickets.",
            "average_resolution_time": "Average first valid resolution timestamp minus ticket creation timestamp for first resolutions in the period.",
            "reopened": "Distinct tickets whose resolution attempt was reopened during the selected period.",
            "workload": "Current assignments in Open, Assigned, In Progress, or Reopened status.",
        },
        "limitations": [
            "Backlog, unassigned counts, technician workload, and status distribution use current state because complete historical snapshots are unavailable.",
            "No SLA compliance percentage is shown because the project has no configured SLA policy.",
            "Recurring issues use category and location frequency and do not claim a shared root cause.",
            "The technician filter follows metric context: current assignee for current-state ticket metrics and recorded resolver for resolution activity.",
        ],
    }
    report["insights"] = generate_insights(report, filters)
    return report


def metadata():
    technicians = User.objects.filter(role=User.Role.TECHNICIAN).order_by(
        "first_name", "last_name", "email"
    )
    return {
        "categories": list(
            TicketCategory.objects.filter(is_active=True).values("id", "name", "slug")
        ),
        "technicians": [
            {"id": technician.id, "name": display_name(technician), "is_active": technician.is_active}
            for technician in technicians
        ],
        "priorities": [
            {"value": value, "label": label} for value, label in Ticket.Priority.choices
        ],
        "statuses": [
            {"value": value, "label": label} for value, label in Ticket.Status.choices
        ],
    }
