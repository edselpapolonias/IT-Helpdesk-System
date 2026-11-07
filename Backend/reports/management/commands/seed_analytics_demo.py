import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from accounts.models import User
from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketCategory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


DEMO_NAMESPACE = uuid.UUID("65b6c677-9abc-41c1-bbb3-d714ce5673bf")
DEMO_PREFIX = "Analytics Demo"


TICKET_SPECS = (
    {"title": "Campus Wi-Fi disconnects in the library", "category": "network-internet", "location": "Main Library", "priority": "CRITICAL", "status": "IN_PROGRESS", "age": 1, "assign_after": 1},
    {"title": "Printer repeatedly jams during enrollment", "category": "printer-peripheral", "location": "Registrar Office", "priority": "HIGH", "status": "RESOLVED", "age": 2, "assign_after": 0.5, "resolution_hours": 0.75},
    {"title": "Office application closes when saving files", "category": "software", "location": "Finance Office", "priority": "MEDIUM", "status": "CLOSED", "age": 4, "assign_after": 1, "resolution_hours": 3},
    {"title": "Laboratory computer does not power on", "category": "hardware", "location": "Computer Laboratory 1", "priority": "CRITICAL", "status": "ASSIGNED", "age": 6, "assign_after": 8},
    {"title": "Faculty account locked after password attempts", "category": "account-login", "location": "Faculty Room", "priority": "LOW", "status": "RESOLVED", "age": 3, "assign_after": 0.5, "resolution_hours": 1.5},
    {"title": "Intermittent wireless connection near archives", "category": "network-internet", "location": "Main Library", "priority": "HIGH", "status": "REOPENED", "age": 8, "assign_after": 4, "resolution_hours": 12, "reopen_after": 30},
    {"title": "Toner warning on student services printer", "category": "printer-peripheral", "location": "Registrar Office", "priority": "LOW", "status": "OPEN", "age": 10},
    {"title": "Browser displays certificate warning", "category": "software", "location": "Computer Laboratory 2", "priority": "MEDIUM", "status": "IN_PROGRESS", "age": 12, "assign_after": 14},
    {"title": "Projector image flickers during presentations", "category": "hardware", "location": "Audio Visual Room", "priority": "HIGH", "status": "RESOLVED", "age": 14, "assign_after": 5, "resolution_hours": 36},
    {"title": "Network switch outage affects administration wing", "category": "network-internet", "location": "Administration Building", "priority": "CRITICAL", "status": "CLOSED", "age": 16, "assign_after": 0.25, "resolution_hours": 8},
    {"title": "Student portal password reset request", "category": "account-login", "location": "Student Services", "priority": "MEDIUM", "status": "RESOLVED", "age": 5, "assign_after": 0.25, "resolution_hours": 0.4},
    {"title": "Print queue remains stuck after restart", "category": "printer-peripheral", "location": "Registrar Office", "priority": "MEDIUM", "status": "ASSIGNED", "age": 18, "assign_after": 36},
    {"title": "Operating system update fails on laboratory PCs", "category": "software", "location": "Computer Laboratory 1", "priority": "HIGH", "status": "IN_PROGRESS", "age": 20, "assign_after": 18},
    {"title": "Keyboard keys are unresponsive", "category": "hardware", "location": "Computer Laboratory 1", "priority": "LOW", "status": "OPEN", "age": 22},
    {"title": "Slow internet connection in reading area", "category": "network-internet", "location": "Main Library", "priority": "HIGH", "status": "REOPENED", "age": 25, "assign_after": 10, "resolution_hours": 72, "reopen_after": 36},
    {"title": "Scanner is not detected by workstation", "category": "printer-peripheral", "location": "Registrar Office", "priority": "MEDIUM", "status": "RESOLVED", "age": 28, "assign_after": 6, "resolution_hours": 20, "reopen_after": 24, "second_resolution_hours": 120},
    {"title": "Design software license cannot be activated", "category": "software", "location": "Engineering Laboratory", "priority": "HIGH", "status": "CLOSED", "age": 9, "assign_after": 2, "resolution_hours": 48},
    {"title": "Multi-factor authentication code not received", "category": "account-login", "location": "Faculty Room", "priority": "MEDIUM", "status": "RESOLVED", "age": 7, "assign_after": 1, "resolution_hours": 5},
    {"title": "Classroom audio has no output", "category": "other", "location": "Room 301", "priority": "MEDIUM", "status": "OPEN", "age": 15},
    {"title": "Remote access connection fails off campus", "category": "network-internet", "location": "Remote Access", "priority": "HIGH", "status": "RESOLVED", "age": 40, "assign_after": 12, "resolution_hours": 840},
)


class Command(BaseCommand):
    help = "Create 20 idempotent demo tickets for the Reports & Analytics module."

    def handle(self, *args, **options):
        admin = User.objects.filter(role=User.Role.ADMIN, is_active=True).first()
        requester = User.objects.filter(role=User.Role.USER, is_active=True).first()
        technician = User.objects.filter(role=User.Role.TECHNICIAN, is_active=True).first()
        if not admin or not requester or not technician:
            raise CommandError(
                "An active administrator, regular user, and technician are required."
            )

        categories = {
            category.slug: category
            for category in TicketCategory.objects.filter(is_active=True)
        }
        missing = sorted({spec["category"] for spec in TICKET_SPECS} - categories.keys())
        if missing:
            raise CommandError(f"Missing active ticket categories: {', '.join(missing)}")

        now = timezone.now()
        created = 0
        skipped = 0
        with transaction.atomic():
            for index, spec in enumerate(TICKET_SPECS, start=1):
                seed_key = uuid.uuid5(DEMO_NAMESPACE, f"ticket-{index:02d}")
                if Ticket.objects.filter(submission_key=seed_key).exists():
                    skipped += 1
                    continue
                self._create_ticket(
                    index=index,
                    spec=spec,
                    now=now,
                    seed_key=seed_key,
                    admin=admin,
                    requester=requester,
                    technician=technician,
                    category=categories[spec["category"]],
                )
                created += 1

        seeded = Ticket.objects.filter(
            submission_key__in=[
                uuid.uuid5(DEMO_NAMESPACE, f"ticket-{index:02d}")
                for index in range(1, len(TICKET_SPECS) + 1)
            ]
        )
        status_counts = {
            row["status"]: row["count"]
            for row in seeded.values("status").annotate(count=Count("id"))
        }
        self.stdout.write(
            self.style.SUCCESS(
                f"Analytics demo ready: {created} created, {skipped} already present, "
                f"{seeded.count()} total demo tickets."
            )
        )
        self.stdout.write(f"Status distribution: {status_counts}")

    def _create_ticket(
        self,
        *,
        index,
        spec,
        now,
        seed_key,
        admin,
        requester,
        technician,
        category,
    ):
        created_at = now - timedelta(days=spec["age"])
        assigned_at = (
            created_at + timedelta(hours=spec["assign_after"])
            if "assign_after" in spec
            else None
        )
        first_resolution_at = (
            created_at + timedelta(hours=spec["resolution_hours"])
            if "resolution_hours" in spec
            else None
        )
        reopened_at = (
            first_resolution_at + timedelta(hours=spec["reopen_after"])
            if first_resolution_at and "reopen_after" in spec
            else None
        )
        final_resolution_at = (
            created_at + timedelta(hours=spec["second_resolution_hours"])
            if "second_resolution_hours" in spec
            else first_resolution_at
        )
        closed_at = (
            final_resolution_at + timedelta(hours=8)
            if spec["status"] == Ticket.Status.CLOSED
            else None
        )
        is_assigned = assigned_at is not None

        ticket = Ticket.objects.create(
            submission_key=seed_key,
            title=f"{DEMO_PREFIX} {index:02d}: {spec['title']}",
            description=(
                "Demonstration support request created for Reports & Analytics testing. "
                "This record can be identified by the 'Analytics Demo' title prefix."
            ),
            location=spec["location"],
            reported_urgency=(
                Ticket.ReportedUrgency.URGENT
                if spec["priority"] in {Ticket.Priority.CRITICAL, Ticket.Priority.HIGH}
                else Ticket.ReportedUrgency.NORMAL
            ),
            requester=requester,
            category=category,
            priority=spec["priority"],
            status=spec["status"],
            assigned_technician=technician if is_assigned else None,
            resolved_at=final_resolution_at,
            closed_at=closed_at,
            requester_confirmed_at=closed_at,
            reopen_requested_at=(
                reopened_at if spec["status"] == Ticket.Status.REOPENED else None
            ),
            reopen_reason=(
                "The issue returned during requester verification."
                if spec["status"] == Ticket.Status.REOPENED
                else ""
            ),
        )
        Ticket.objects.filter(pk=ticket.pk).update(
            created_at=created_at,
            updated_at=max(
                value
                for value in (created_at, assigned_at, final_resolution_at, reopened_at, closed_at)
                if value is not None
            ),
        )

        if assigned_at:
            active_statuses = {
                Ticket.Status.ASSIGNED,
                Ticket.Status.IN_PROGRESS,
                Ticket.Status.REOPENED,
            }
            is_current = spec["status"] in active_statuses
            TicketAssignment.objects.create(
                ticket=ticket,
                technician=technician,
                assigned_by=admin,
                assigned_at=assigned_at,
                unassigned_at=None if is_current else final_resolution_at,
                assignment_notes="Analytics demo assignment.",
                is_current=is_current,
            )

        history = []
        if assigned_at:
            history.append((Ticket.Status.OPEN, Ticket.Status.ASSIGNED, assigned_at))
        if spec["status"] not in {Ticket.Status.OPEN, Ticket.Status.ASSIGNED}:
            progress_at = assigned_at + timedelta(hours=1)
            history.append((Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS, progress_at))
        if first_resolution_at:
            history.append(
                (Ticket.Status.IN_PROGRESS, Ticket.Status.RESOLVED, first_resolution_at)
            )
        if reopened_at:
            history.append(
                (Ticket.Status.RESOLVED, Ticket.Status.REOPENED, reopened_at)
            )
        if "second_resolution_hours" in spec:
            history.extend(
                [
                    (
                        Ticket.Status.REOPENED,
                        Ticket.Status.IN_PROGRESS,
                        reopened_at + timedelta(hours=1),
                    ),
                    (
                        Ticket.Status.IN_PROGRESS,
                        Ticket.Status.RESOLVED,
                        final_resolution_at,
                    ),
                ]
            )
        if closed_at:
            history.append((Ticket.Status.RESOLVED, Ticket.Status.CLOSED, closed_at))

        for previous, new, changed_at in history:
            item = TicketStatusHistory.objects.create(
                ticket=ticket,
                previous_status=previous,
                new_status=new,
                changed_by=admin,
                reason="Analytics demo status history.",
            )
            TicketStatusHistory.objects.filter(pk=item.pk).update(changed_at=changed_at)

        if assigned_at and spec["status"] not in {
            Ticket.Status.ASSIGNED,
            Ticket.Status.OPEN,
        }:
            log = TroubleshootingLog.objects.create(
                ticket=ticket,
                technician=technician,
                action_taken="Performed initial diagnosis and documented findings",
                diagnosis=f"Demonstration diagnosis for {category.name.lower()} support.",
                notes="Analytics demo troubleshooting activity.",
                is_requester_visible=True,
                public_notes="The IT team is investigating and testing a solution.",
            )
            TroubleshootingLog.objects.filter(pk=log.pk).update(
                created_at=assigned_at + timedelta(hours=2)
            )

        if first_resolution_at:
            TicketResolution.objects.create(
                ticket=ticket,
                resolved_by=technician,
                resolution_summary="The reported issue was corrected and service was verified.",
                root_cause=f"Demonstration root cause for {category.name.lower()}.",
                actions_performed="Diagnosed the issue, applied the corrective action, and tested service.",
                notes="Analytics demo resolution attempt.",
                resolved_at=first_resolution_at,
                closed_at=closed_at if "second_resolution_hours" not in spec else None,
                reopened_at=reopened_at,
                reopen_reason=(
                    "The issue returned during requester verification."
                    if reopened_at
                    else ""
                ),
            )
        if "second_resolution_hours" in spec:
            TicketResolution.objects.create(
                ticket=ticket,
                resolved_by=technician,
                resolution_summary="A follow-up correction resolved the recurring scanner issue.",
                root_cause="The device driver required a complete reinstall.",
                actions_performed="Removed the old driver, installed the current driver, and retested scanning.",
                notes="Second analytics demo resolution attempt.",
                resolved_at=final_resolution_at,
            )
