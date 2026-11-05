from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from tickets.models import (
    Ticket,
    TicketCategory,
    TicketResolution,
    TicketStatusHistory,
)


User = get_user_model()


class MyTicketsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="my-tickets-user",
            email="my-tickets-user@example.test",
            role=User.Role.USER,
            first_name="Ana",
            last_name="Reyes",
        )
        self.other_user = User.objects.create_user(
            username="private-ticket-user",
            email="private-ticket-user@example.test",
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="my-tickets-admin",
            email="my-tickets-admin@example.test",
            role=User.Role.ADMIN,
        )
        self.technician = User.objects.create_user(
            username="my-tickets-tech",
            email="my-tickets-tech@example.test",
            role=User.Role.TECHNICIAN,
            first_name="Leo",
            last_name="Cruz",
            technician_specialization=User.TechnicianSpecialization.NETWORK,
        )
        self.hardware = TicketCategory.objects.get(slug="hardware")
        self.network = TicketCategory.objects.get(slug="network-internet")
        self.client.force_authenticate(user=self.user)

    def create_ticket(self, requester=None, **overrides):
        values = {
            "requester": requester or self.user,
            "title": "Workstation support request",
            "description": "The workstation requires assistance from technical support.",
            "category": self.hardware,
            "location": "Main Building",
        }
        values.update(overrides)
        return Ticket.objects.create(**values)

    def resolve_ticket(self, **overrides):
        ticket = self.create_ticket(
            status=Ticket.Status.RESOLVED,
            resolved_at=timezone.now(),
            assigned_technician=self.technician,
            **overrides,
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Updated the network adapter and verified connectivity.",
        )
        return ticket

    def test_list_pagination_summary_and_results_are_requester_scoped(self):
        statuses = [
            Ticket.Status.OPEN,
            Ticket.Status.ASSIGNED,
            Ticket.Status.IN_PROGRESS,
            Ticket.Status.RESOLVED,
            Ticket.Status.CLOSED,
        ]
        for index in range(11):
            self.create_ticket(
                title=f"Personal ticket {index}",
                status=statuses[index % len(statuses)],
            )
        other = self.create_ticket(
            requester=self.other_user,
            title="Other user's private ticket",
        )

        response = self.client.get("/api/user/tickets/?page=1&page_size=5")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 11)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertEqual(response.data["summary"]["total"], 11)
        self.assertEqual(response.data["summary"]["active"], 4)
        self.assertEqual(response.data["summary"]["resolved"], 2)
        self.assertNotIn(other.id, [item["id"] for item in response.data["results"]])

    def test_search_and_combined_filters_return_only_matching_ticket(self):
        matching = self.create_ticket(
            title="VPN disconnects during payroll",
            description="The payroll VPN loses its secure tunnel every ten minutes.",
            category=self.network,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.ASSIGNED,
            assigned_technician=self.technician,
        )
        self.create_ticket(title="VPN guide request", priority=Ticket.Priority.LOW)
        self.create_ticket(
            title="High priority printer",
            category=self.network,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.OPEN,
        )
        self.create_ticket(
            requester=self.other_user,
            title="VPN disconnects during payroll",
            category=self.network,
            priority=Ticket.Priority.HIGH,
            status=Ticket.Status.ASSIGNED,
        )

        response = self.client.get(
            "/api/user/tickets/"
            "?search=payroll&status=ASSIGNED&priority=HIGH"
            f"&category={self.network.slug}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], matching.id)
        technician = response.data["results"][0]["assigned_technician"]
        self.assertEqual(technician["name"], "Leo Cruz")
        self.assertNotIn("email", technician)

    def test_date_filters_and_ordering_are_server_side(self):
        older = self.create_ticket(title="Older low priority", priority=Ticket.Priority.LOW)
        recent = self.create_ticket(
            title="Recent critical priority",
            priority=Ticket.Priority.CRITICAL,
        )
        Ticket.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=40),
            updated_at=timezone.now() - timedelta(days=2),
        )

        recent_only = self.client.get("/api/user/tickets/?date=last_30")
        highest_first = self.client.get("/api/user/tickets/?ordering=priority")
        invalid_custom = self.client.get("/api/user/tickets/?date=custom")

        self.assertEqual(recent_only.data["count"], 1)
        self.assertEqual(recent_only.data["results"][0]["id"], recent.id)
        self.assertEqual(highest_first.data["results"][0]["id"], recent.id)
        self.assertEqual(invalid_custom.status_code, 400)

    def test_resolved_ticket_exposes_real_pending_confirmation_state(self):
        ticket = self.resolve_ticket(title="Resolved network issue")

        listing = self.client.get("/api/user/tickets/?status=RESOLVED")
        detail = self.client.get(f"/api/user/tickets/{ticket.id}/")

        self.assertTrue(listing.data["results"][0]["needs_confirmation"])
        self.assertEqual(
            listing.data["results"][0]["resolution_response"], "PENDING"
        )
        self.assertEqual(detail.data["resolution_response"], "PENDING")
        self.assertIn("network adapter", detail.data["resolution"]["summary"])

    def test_requester_can_confirm_resolution_and_close_ticket(self):
        ticket = self.resolve_ticket()

        response = self.client.post(
            f"/api/user/tickets/{ticket.id}/confirm-resolution/",
            {},
            format="json",
        )
        repeated = self.client.post(
            f"/api/user/tickets/{ticket.id}/confirm-resolution/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], Ticket.Status.CLOSED)
        self.assertEqual(response.data["resolution_response"], "CONFIRMED")
        self.assertIsNotNone(response.data["requester_confirmed_at"])
        self.assertEqual(repeated.status_code, 200)
        history = TicketStatusHistory.objects.get(
            ticket=ticket,
            new_status=Ticket.Status.CLOSED,
        )
        self.assertEqual(history.changed_by, self.user)

    def test_requester_can_request_reopening_but_other_user_cannot(self):
        ticket = self.resolve_ticket()
        short = self.client.post(
            f"/api/user/tickets/{ticket.id}/request-reopen/",
            {"reason": "Still bad"},
            format="json",
        )
        response = self.client.post(
            f"/api/user/tickets/{ticket.id}/request-reopen/",
            {"reason": "The connection failed again after the technician left."},
            format="json",
        )
        duplicate = self.client.post(
            f"/api/user/tickets/{ticket.id}/request-reopen/",
            {"reason": "The issue is still happening after another restart."},
            format="json",
        )
        self.client.force_authenticate(user=self.other_user)
        forbidden = self.client.post(
            f"/api/user/tickets/{ticket.id}/confirm-resolution/",
            {},
            format="json",
        )

        self.assertEqual(short.status_code, 400)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolution_response"], "REOPEN_REQUESTED")
        self.assertFalse(response.data["needs_confirmation"])
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(forbidden.status_code, 404)

    def test_new_submission_appears_in_my_tickets(self):
        created = self.client.post(
            "/api/user/tickets/",
            {
                "title": "New printer request",
                "category": self.hardware.id,
                "description": "The printer is showing a paper feed error on every job.",
                "location": "Records Office",
                "reported_urgency": Ticket.ReportedUrgency.NORMAL,
                "submission_key": "078a0c38-124d-4d65-8077-1dbad0eb7899",
            },
            format="json",
        )
        listing = self.client.get("/api/user/tickets/?search=printer")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(listing.data["count"], 1)
        self.assertEqual(listing.data["results"][0]["id"], created.data["id"])

    def test_unauthenticated_and_non_regular_users_are_rejected(self):
        self.client.force_authenticate(user=None)
        anonymous = self.client.get("/api/user/tickets/")
        self.client.force_authenticate(user=self.admin)
        admin = self.client.get("/api/user/tickets/")

        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(admin.status_code, 403)
