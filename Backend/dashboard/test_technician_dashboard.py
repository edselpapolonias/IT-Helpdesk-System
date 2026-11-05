from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketCategory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


User = get_user_model()


class TechnicianDashboardTests(APITestCase):
    def setUp(self):
        self.password = "Dashboard-test-password-2026"
        self.admin = User.objects.create_user(
            username="dashboard-admin",
            email="dashboard-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="dashboard-requester",
            email="dashboard-requester@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="dashboard-technician",
            email="dashboard-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Tina",
            last_name="Technician",
        )
        self.other_technician = User.objects.create_user(
            username="other-dashboard-technician",
            email="other-dashboard-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Other",
            last_name="Technician",
        )
        self.category = TicketCategory.objects.create(
            name="Dashboard Hardware",
            slug="dashboard-hardware",
        )
        self.client.force_authenticate(user=self.technician)

    def create_assignment(
        self,
        *,
        technician=None,
        status=Ticket.Status.ASSIGNED,
        priority=Ticket.Priority.MEDIUM,
        assigned_at=None,
        current=True,
        title=None,
        due_at=None,
    ):
        technician = technician or self.technician
        ticket = Ticket.objects.create(
            title=title or f"{status.title()} dashboard ticket",
            description="Ticket used for technician dashboard testing.",
            requester=self.requester,
            category=self.category,
            status=status,
            priority=priority,
            assigned_technician=technician if current else None,
            resolution_due_at=due_at,
        )
        assignment = TicketAssignment.objects.create(
            ticket=ticket,
            technician=technician,
            assigned_by=self.admin,
            assigned_at=assigned_at or timezone.now(),
            is_current=current,
            unassigned_at=None if current else timezone.now(),
        )
        return ticket, assignment

    def test_summary_uses_current_assignments_and_latest_resolution_attribution(self):
        now = timezone.now()
        self.create_assignment(status=Ticket.Status.ASSIGNED)
        self.create_assignment(status=Ticket.Status.REOPENED)
        self.create_assignment(status=Ticket.Status.IN_PROGRESS)

        resolved, _ = self.create_assignment(status=Ticket.Status.RESOLVED)
        TicketResolution.objects.create(
            ticket=resolved,
            resolved_by=self.technician,
            resolution_summary="Resolved by the signed-in technician.",
            resolved_at=now - timedelta(days=1),
        )

        completed, _ = self.create_assignment(status=Ticket.Status.CLOSED)
        completed.closed_at = now - timedelta(days=2)
        completed.save(update_fields=("closed_at", "updated_at"))
        TicketResolution.objects.create(
            ticket=completed,
            resolved_by=self.technician,
            resolution_summary="Completed by the signed-in technician.",
            resolved_at=now - timedelta(days=3),
        )

        not_attributed, _ = self.create_assignment(status=Ticket.Status.CLOSED)
        not_attributed.closed_at = now - timedelta(days=1)
        not_attributed.save(update_fields=("closed_at", "updated_at"))
        TicketResolution.objects.create(
            ticket=not_attributed,
            resolved_by=self.technician,
            resolution_summary="An older resolution.",
            resolved_at=now - timedelta(days=2),
        )
        TicketResolution.objects.create(
            ticket=not_attributed,
            resolved_by=self.other_technician,
            resolution_summary="The latest resolution belongs to someone else.",
            resolved_at=now - timedelta(days=1),
        )

        historical, old_assignment = self.create_assignment(current=False)
        TicketAssignment.objects.create(
            ticket=historical,
            technician=self.other_technician,
            assigned_by=self.admin,
            assigned_at=now,
            is_current=True,
        )
        historical.assigned_technician = self.other_technician
        historical.save(update_fields=("assigned_technician", "updated_at"))
        self.assertFalse(old_assignment.is_current)

        response = self.client.get("/api/technician/dashboard/summary/?days=30")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_assigned"], 6)
        self.assertEqual(response.data["pending"], 2)
        self.assertEqual(response.data["in_progress"], 1)
        self.assertEqual(response.data["resolved"], 1)
        self.assertEqual(response.data["completed"], 1)

    def test_recent_tickets_returns_only_latest_active_current_assignments(self):
        older_ticket, _ = self.create_assignment(
            assigned_at=timezone.now() - timedelta(days=2),
            title="Older current assignment",
        )
        newest_ticket, _ = self.create_assignment(
            status=Ticket.Status.IN_PROGRESS,
            assigned_at=timezone.now() - timedelta(hours=1),
            title="Newest current assignment",
        )
        self.create_assignment(
            technician=self.other_technician,
            title="Other technician ticket",
        )
        self.create_assignment(
            status=Ticket.Status.RESOLVED,
            title="Inactive resolved assignment",
        )

        response = self.client.get("/api/technician/dashboard/recent-tickets/")

        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(ids, [newest_ticket.id, older_ticket.id])

    def test_attention_uses_priority_first_action_and_real_due_dates(self):
        critical, critical_assignment = self.create_assignment(
            priority=Ticket.Priority.CRITICAL,
            assigned_at=timezone.now() - timedelta(hours=5),
            title="Critical ticket",
        )
        TroubleshootingLog.objects.create(
            ticket=critical,
            technician=self.technician,
            action_taken="Reviewed the critical issue.",
        )

        awaiting, _ = self.create_assignment(title="Awaiting first action")

        handled, _ = self.create_assignment(title="Already handled")
        TicketStatusHistory.objects.create(
            ticket=handled,
            previous_status=Ticket.Status.ASSIGNED,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.technician,
        )

        overdue, _ = self.create_assignment(
            status=Ticket.Status.IN_PROGRESS,
            due_at=timezone.now() - timedelta(hours=2),
            title="Actually overdue",
        )
        TroubleshootingLog.objects.create(
            ticket=overdue,
            technician=self.technician,
            action_taken="Investigated the overdue issue.",
        )
        other, _ = self.create_assignment(
            technician=self.other_technician,
            priority=Ticket.Priority.CRITICAL,
            title="Other technician critical ticket",
        )

        response = self.client.get("/api/technician/dashboard/attention/")

        self.assertEqual(response.status_code, 200)
        results = response.data["results"]
        ids = {item["id"] for item in results}
        self.assertEqual(ids, {critical.id, awaiting.id, overdue.id})
        self.assertNotIn(handled.id, ids)
        self.assertNotIn(other.id, ids)
        critical_result = next(item for item in results if item["id"] == critical.id)
        overdue_result = next(item for item in results if item["id"] == overdue.id)
        self.assertFalse(critical_result["awaiting_first_action"])
        self.assertGreaterEqual(critical_result["waiting_seconds"], 4 * 60 * 60)
        self.assertTrue(overdue_result["is_overdue"])
        self.assertIsNotNone(overdue_result["due_at"])
        self.assertIsNotNone(critical_assignment.assigned_at)

    def test_activity_contains_only_records_relevant_to_authenticated_technician(self):
        ticket, assignment = self.create_assignment(title="Activity ticket")
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.ASSIGNED,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.technician,
        )
        TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Checked the device.",
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Issue corrected.",
        )
        assignment.is_current = False
        assignment.unassigned_at = timezone.now()
        assignment.save(update_fields=("is_current", "unassigned_at"))

        other_ticket, _ = self.create_assignment(
            technician=self.other_technician,
            title="Private activity for another technician",
        )
        TroubleshootingLog.objects.create(
            ticket=other_ticket,
            technician=self.other_technician,
            action_taken="Other technician work.",
        )

        response = self.client.get("/api/technician/dashboard/activity/")

        self.assertEqual(response.status_code, 200)
        results = response.data["results"]
        self.assertTrue(results)
        self.assertTrue(all(item["ticket_id"] == ticket.id for item in results))
        event_types = {item["event_type"] for item in results}
        self.assertTrue(
            {"ASSIGNED", "REASSIGNED_AWAY", "WORK_STARTED", "TROUBLESHOOTING", "RESOLVED"}.issubset(event_types)
        )

    def test_non_technicians_cannot_access_dashboard_apis(self):
        for account in (self.admin, self.requester):
            self.client.force_authenticate(user=account)
            response = self.client.get("/api/technician/dashboard/summary/")
            self.assertEqual(response.status_code, 403)

        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get("/api/technician/dashboard/summary/").status_code,
            401,
        )

    def test_empty_dashboard_and_invalid_period(self):
        empty_technician = User.objects.create_user(
            username="empty-dashboard-technician",
            email="empty-dashboard-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.client.force_authenticate(user=empty_technician)

        summary = self.client.get("/api/technician/dashboard/summary/")
        recent = self.client.get("/api/technician/dashboard/recent-tickets/")
        attention = self.client.get("/api/technician/dashboard/attention/")
        activity = self.client.get("/api/technician/dashboard/activity/")
        invalid = self.client.get("/api/technician/dashboard/summary/?days=14")

        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["total_assigned"], 0)
        self.assertEqual(recent.data["results"], [])
        self.assertEqual(attention.data["results"], [])
        self.assertEqual(activity.data["results"], [])
        self.assertEqual(invalid.status_code, 400)
