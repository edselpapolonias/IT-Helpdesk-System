from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from tickets.models import Ticket, TicketCategory, TicketResolution


User = get_user_model()


class AdminDashboardAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.test",
            password="test-password",
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="requester",
            email="requester@example.test",
            password="test-password",
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="technician",
            email="technician@example.test",
            password="test-password",
            role=User.Role.TECHNICIAN,
            technician_specialization="Network Support",
        )
        self.category = TicketCategory.objects.create(
            name="Test Network",
            slug="test-network",
        )

    def authenticate_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_dashboard_requires_authentication(self):
        response = self.client.get("/api/admin/dashboard/summary/")
        self.assertEqual(response.status_code, 401)

    def test_dashboard_rejects_authenticated_non_admin(self):
        self.client.force_authenticate(user=self.requester)
        response = self.client.get("/api/admin/dashboard/summary/")
        self.assertEqual(response.status_code, 403)

    def test_empty_summary_returns_real_zero_values(self):
        self.authenticate_admin()
        response = self.client.get("/api/admin/dashboard/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(response.data["active_technicians"], 1)

    def test_summary_and_attention_counts_use_ticket_state(self):
        Ticket.objects.create(
            title="Critical router outage",
            description="Router is unavailable.",
            requester=self.requester,
            category=self.category,
            priority=Ticket.Priority.CRITICAL,
            status=Ticket.Status.OPEN,
            resolution_due_at=timezone.now() - timedelta(hours=1),
        )
        Ticket.objects.create(
            title="Assigned access request",
            description="Account access is required.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.IN_PROGRESS,
            assigned_technician=self.technician,
        )
        Ticket.objects.create(
            title="Resolved printer issue",
            description="Printer was reconnected.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.RESOLVED,
            assigned_technician=self.technician,
        )
        self.authenticate_admin()

        summary = self.client.get("/api/admin/dashboard/summary/")
        attention = self.client.get("/api/admin/dashboard/attention/")

        self.assertEqual(summary.data["total"], 3)
        self.assertEqual(summary.data["open"], 1)
        self.assertEqual(summary.data["in_progress"], 1)
        self.assertEqual(summary.data["resolved"], 1)
        self.assertEqual(summary.data["unassigned"], 1)
        self.assertEqual(attention.data["critical"], 1)
        self.assertEqual(attention.data["overdue"], 1)

    def test_summary_keeps_requester_confirmed_tickets_in_resolved_total(self):
        Ticket.objects.create(
            title="Confirmed printer repair",
            description="The requester confirmed the completed repair.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.CLOSED,
            assigned_technician=self.technician,
            resolved_at=timezone.now() - timedelta(minutes=5),
            closed_at=timezone.now(),
        )
        self.authenticate_admin()

        response = self.client.get("/api/admin/dashboard/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolved"], 1)

    def test_resolved_trend_uses_resolution_date(self):
        ticket = Ticket.objects.create(
            title="Older ticket resolved today",
            description="Resolution trend date test.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.RESOLVED,
            assigned_technician=self.technician,
        )
        Ticket.objects.filter(pk=ticket.pk).update(
            created_at=timezone.now() - timedelta(days=100)
        )
        self.authenticate_admin()

        response = self.client.get("/api/admin/dashboard/ticket-trends/?days=7")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sum(item["submitted"] for item in response.data["results"]), 0)
        self.assertEqual(sum(item["resolved"] for item in response.data["results"]), 1)

    def test_invalid_reporting_period_is_rejected(self):
        self.authenticate_admin()
        response = self.client.get("/api/admin/dashboard/ticket-trends/?days=14")
        self.assertEqual(response.status_code, 400)

    def test_category_counts_follow_the_selected_period(self):
        recent_ticket = Ticket.objects.create(
            title="Recent network issue",
            description="Recent category count test.",
            requester=self.requester,
            category=self.category,
        )
        older_ticket = Ticket.objects.create(
            title="Old network issue",
            description="Old category count test.",
            requester=self.requester,
            category=self.category,
        )
        Ticket.objects.filter(pk=older_ticket.pk).update(
            created_at=timezone.now() - timedelta(days=20)
        )
        self.authenticate_admin()

        response = self.client.get(
            "/api/admin/dashboard/ticket-categories/?days=7"
        )

        self.assertEqual(response.status_code, 200)
        category = next(
            item for item in response.data["results"] if item["id"] == self.category.id
        )
        self.assertEqual(category["count"], 1)
        self.assertIsNotNone(recent_ticket.pk)

    def test_recent_tickets_are_ordered_newest_first(self):
        older = Ticket.objects.create(
            title="Older request",
            description="Older recent ticket test.",
            requester=self.requester,
        )
        newer = Ticket.objects.create(
            title="Newer request",
            description="Newer recent ticket test.",
            requester=self.requester,
        )
        Ticket.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=1)
        )
        self.authenticate_admin()

        response = self.client.get("/api/admin/dashboard/recent-tickets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], newer.id)

    def test_technician_workload_reports_active_and_resolved_counts(self):
        Ticket.objects.create(
            title="Active ticket",
            description="Active workload test.",
            requester=self.requester,
            status=Ticket.Status.ASSIGNED,
            assigned_technician=self.technician,
        )
        resolved = Ticket.objects.create(
            title="Resolved ticket",
            description="Resolved workload test.",
            requester=self.requester,
            status=Ticket.Status.RESOLVED,
            assigned_technician=self.technician,
        )
        TicketResolution.objects.create(
            ticket=resolved,
            resolved_by=self.technician,
            resolution_summary="Issue resolved by the assigned technician.",
        )
        closed = Ticket.objects.create(
            title="Closed ticket",
            description="Requester-confirmed workload test.",
            requester=self.requester,
            status=Ticket.Status.CLOSED,
            assigned_technician=self.technician,
            resolved_at=timezone.now() - timedelta(minutes=5),
            closed_at=timezone.now(),
        )
        TicketResolution.objects.create(
            ticket=closed,
            resolved_by=self.technician,
            resolution_summary="Requester confirmed this resolution.",
            resolved_at=closed.resolved_at,
            closed_at=closed.closed_at,
        )
        self.authenticate_admin()

        response = self.client.get(
            "/api/admin/dashboard/technician-workload/?days=30"
        )

        self.assertEqual(response.status_code, 200)
        technician = response.data["results"][0]
        self.assertEqual(technician["active_assigned_tickets"], 1)
        self.assertEqual(technician["resolved_tickets"], 2)
