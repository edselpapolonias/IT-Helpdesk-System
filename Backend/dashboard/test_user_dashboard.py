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
)


User = get_user_model()


class RegularUserDashboardAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="dashboard-user",
            email="dashboard-user@example.test",
            password="User-password-2026",
            role=User.Role.USER,
            first_name="Paolo",
            last_name="Santos",
        )
        self.other_user = User.objects.create_user(
            username="other-dashboard-user",
            email="other-dashboard-user@example.test",
            password="User-password-2026",
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="dashboard-admin",
            email="dashboard-admin@example.test",
            password="Admin-password-2026",
            role=User.Role.ADMIN,
        )
        self.technician = User.objects.create_user(
            username="dashboard-tech",
            email="dashboard-tech@example.test",
            password="Tech-password-2026",
            role=User.Role.TECHNICIAN,
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.category = TicketCategory.objects.get(slug="hardware")
        self.client.force_authenticate(user=self.user)

    def create_ticket(self, requester=None, **overrides):
        values = {
            "requester": requester or self.user,
            "title": "Campus computer issue",
            "description": "The workstation needs technical support.",
            "category": self.category,
        }
        values.update(overrides)
        return Ticket.objects.create(**values)

    def test_summary_counts_only_authenticated_users_tickets(self):
        self.create_ticket(status=Ticket.Status.OPEN)
        self.create_ticket(title="Assigned", status=Ticket.Status.ASSIGNED)
        self.create_ticket(title="In progress", status=Ticket.Status.IN_PROGRESS)
        self.create_ticket(title="Resolved", status=Ticket.Status.RESOLVED)
        self.create_ticket(title="Closed", status=Ticket.Status.CLOSED)
        self.create_ticket(requester=self.other_user, title="Someone else's ticket")

        response = self.client.get("/api/user/dashboard/summary/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 5)
        self.assertEqual(response.data["open"], 1)
        self.assertEqual(response.data["assigned"], 1)
        self.assertEqual(response.data["in_progress"], 1)
        self.assertEqual(response.data["resolved"], 1)
        self.assertEqual(response.data["closed"], 1)
        self.assertEqual(
            sum(item["count"] for item in response.data["status_distribution"]),
            5,
        )

    def test_recent_tickets_returns_latest_five_and_excludes_other_users(self):
        created = []
        for index in range(6):
            ticket = self.create_ticket(title=f"User ticket {index}")
            Ticket.objects.filter(pk=ticket.pk).update(
                created_at=timezone.now() + timedelta(minutes=index)
            )
            created.append(ticket)
        self.create_ticket(requester=self.other_user, title="Private other ticket")

        response = self.client.get("/api/user/dashboard/recent-tickets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertEqual(response.data["results"][0]["id"], created[-1].id)
        self.assertNotIn(
            "Private other ticket",
            [item["title"] for item in response.data["results"]],
        )

    def test_activity_is_user_scoped_and_hides_internal_notes(self):
        ticket = self.create_ticket()
        other = self.create_ticket(requester=self.other_user, title="Other private ticket")
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.technician,
            assigned_by=self.admin,
            assignment_notes="SECRET ADMIN INSTRUCTIONS",
        )
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.ASSIGNED,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.admin,
            reason="SECRET STATUS REASON",
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="SECRET TECHNICAL NOTES",
        )
        TicketStatusHistory.objects.create(
            ticket=other,
            previous_status=Ticket.Status.OPEN,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.admin,
        )

        response = self.client.get("/api/user/dashboard/recent-activity/")
        serialized = str(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertIn(ticket.ticket_number, serialized)
        self.assertNotIn(other.ticket_number, serialized)
        self.assertNotIn("SECRET", serialized)

    def test_user_can_retrieve_own_ticket_but_not_another_users_ticket(self):
        own = self.create_ticket()
        other = self.create_ticket(requester=self.other_user)

        own_response = self.client.get(f"/api/user/tickets/{own.id}/")
        other_response = self.client.get(f"/api/user/tickets/{other.id}/")

        self.assertEqual(own_response.status_code, 200)
        self.assertEqual(own_response.data["ticket_number"], own.ticket_number)
        self.assertEqual(other_response.status_code, 404)

    def test_admin_and_technician_cannot_access_regular_user_endpoints(self):
        endpoints = (
            "/api/user/dashboard/summary/",
            "/api/user/dashboard/recent-tickets/",
            "/api/user/dashboard/recent-activity/",
        )
        for account in (self.admin, self.technician):
            self.client.force_authenticate(user=account)
            for endpoint in endpoints:
                self.assertEqual(self.client.get(endpoint).status_code, 403)

    def test_empty_dashboard_returns_zeroes_and_empty_results(self):
        summary = self.client.get("/api/user/dashboard/summary/")
        recent = self.client.get("/api/user/dashboard/recent-tickets/")
        activity = self.client.get("/api/user/dashboard/recent-activity/")

        self.assertEqual(summary.data["total"], 0)
        self.assertEqual(summary.data["open"], 0)
        self.assertEqual(recent.data["results"], [])
        self.assertEqual(activity.data["results"], [])
