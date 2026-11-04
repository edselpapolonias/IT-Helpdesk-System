from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Ticket,
    TicketAssignment,
    TicketCategory,
    TicketStatusHistory,
)


User = get_user_model()


class TechnicianAssignmentAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="assignment-admin",
            email="assignment-admin@example.test",
            password="Admin-password-2026",
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="assignment-requester",
            email="assignment-requester@example.test",
            password="Requester-password-2026",
            role=User.Role.USER,
            first_name="Mia",
            last_name="Reyes",
        )
        self.hardware_technician = self.create_technician(
            "hardware-tech@example.test",
            "Harvey",
            User.TechnicianSpecialization.HARDWARE,
        )
        self.network_technician = self.create_technician(
            "network-tech@example.test",
            "Nora",
            User.TechnicianSpecialization.NETWORK,
        )
        self.inactive_technician = self.create_technician(
            "inactive-tech@example.test",
            "Inactive",
            User.TechnicianSpecialization.GENERAL,
            is_active=False,
        )
        self.hardware = TicketCategory.objects.get(slug="hardware")
        self.network = TicketCategory.objects.get(slug="network-internet")
        self.client.force_authenticate(user=self.admin)

    def create_technician(self, email, first_name, specialization, is_active=True):
        return User.objects.create_user(
            username=email.split("@")[0],
            email=email,
            password="Technician-password-2026",
            role=User.Role.TECHNICIAN,
            first_name=first_name,
            last_name="Technician",
            technician_specialization=specialization,
            is_active=is_active,
        )

    def create_ticket(self, **overrides):
        values = {
            "requester": self.requester,
            "title": "Desktop will not start",
            "description": "The desktop has power but does not complete startup.",
            "category": self.hardware,
            "priority": Ticket.Priority.HIGH,
        }
        values.update(overrides)
        return Ticket.objects.create(**values)

    def assign(self, ticket, technician=None, notes="Inspect the workstation."):
        return self.client.post(
            "/api/admin/assignments/",
            {
                "ticket_id": ticket.id,
                "technician_id": (technician or self.hardware_technician).id,
                "assignment_notes": notes,
            },
            format="json",
        )

    def test_assigns_open_ticket_and_records_status_and_audit_history(self):
        ticket = self.create_ticket()

        response = self.assign(ticket)

        self.assertEqual(response.status_code, 201)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_technician, self.hardware_technician)
        self.assertEqual(ticket.status, Ticket.Status.ASSIGNED)
        assignment = TicketAssignment.objects.get(ticket=ticket, is_current=True)
        self.assertEqual(assignment.assigned_by, self.admin)
        self.assertEqual(assignment.assignment_notes, "Inspect the workstation.")
        self.assertTrue(
            TicketStatusHistory.objects.filter(
                ticket=ticket,
                previous_status=Ticket.Status.OPEN,
                new_status=Ticket.Status.ASSIGNED,
                changed_by=self.admin,
            ).exists()
        )

    def test_critical_ticket_can_be_assigned_and_matching_specialist_is_recommended(self):
        ticket = self.create_ticket(priority=Ticket.Priority.CRITICAL)
        recommendation = self.client.get(
            f"/api/admin/assignments/eligible-technicians/?ticket={ticket.id}"
        )

        self.assertEqual(recommendation.status_code, 200)
        self.assertEqual(
            recommendation.data["results"][0]["id"],
            self.hardware_technician.id,
        )
        self.assertTrue(recommendation.data["results"][0]["recommended"])
        self.assertEqual(self.assign(ticket).status_code, 201)

    def test_reassignment_closes_previous_record_and_preserves_history(self):
        ticket = self.create_ticket()
        self.assign(ticket)

        response = self.client.post(
            "/api/admin/assignments/reassign/",
            {
                "ticket_id": ticket.id,
                "technician_id": self.network_technician.id,
                "reassignment_reason": "Network symptoms require a network specialist.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_technician, self.network_technician)
        self.assertEqual(ticket.status, Ticket.Status.ASSIGNED)
        history = TicketAssignment.objects.filter(ticket=ticket).order_by("id")
        self.assertEqual(history.count(), 2)
        self.assertFalse(history[0].is_current)
        self.assertIsNotNone(history[0].unassigned_at)
        self.assertTrue(history[1].is_current)
        self.assertEqual(
            history[1].reassignment_reason,
            "Network symptoms require a network specialist.",
        )

    def test_reassigning_in_progress_ticket_preserves_status(self):
        ticket = self.create_ticket()
        self.assign(ticket)
        Ticket.objects.filter(pk=ticket.pk).update(status=Ticket.Status.IN_PROGRESS)

        response = self.client.post(
            "/api/admin/assignments/reassign/",
            {
                "ticket_id": ticket.id,
                "technician_id": self.network_technician.id,
                "reassignment_reason": "Escalated for network diagnostics.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.IN_PROGRESS)

    def test_rejects_inactive_and_non_technician_users(self):
        inactive_ticket = self.create_ticket(title="Inactive technician test")
        inactive = self.assign(inactive_ticket, self.inactive_technician)
        non_technician_ticket = self.create_ticket(title="Role validation test")
        invalid_role = self.assign(non_technician_ticket, self.requester)

        self.assertEqual(inactive.status_code, 400)
        self.assertEqual(invalid_role.status_code, 400)
        self.assertFalse(TicketAssignment.objects.exists())

    def test_rejects_duplicate_invalid_and_closed_ticket_assignments(self):
        ticket = self.create_ticket()
        self.assign(ticket)
        duplicate = self.assign(ticket, self.network_technician)
        missing = self.client.post(
            "/api/admin/assignments/",
            {"ticket_id": 999999, "technician_id": self.hardware_technician.id},
            format="json",
        )
        closed = self.create_ticket(title="Closed request", status=Ticket.Status.CLOSED)
        closed_response = self.assign(closed)

        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(closed_response.status_code, 400)

    def test_database_constraint_prevents_two_current_assignments(self):
        ticket = self.create_ticket()
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.hardware_technician,
            assigned_by=self.admin,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TicketAssignment.objects.create(
                    ticket=ticket,
                    technician=self.network_technician,
                    assigned_by=self.admin,
                )

        self.assertEqual(
            TicketAssignment.objects.filter(ticket=ticket, is_current=True).count(),
            1,
        )

    def test_workloads_do_not_count_reassigned_ticket_for_previous_technician(self):
        ticket = self.create_ticket()
        self.assign(ticket)
        self.client.post(
            "/api/admin/assignments/reassign/",
            {
                "ticket_id": ticket.id,
                "technician_id": self.network_technician.id,
                "reassignment_reason": "Workload balancing.",
            },
            format="json",
        )

        response = self.client.get("/api/admin/assignments/workloads/")
        workloads = {item["id"]: item for item in response.data["results"]}
        self.assertEqual(
            workloads[self.hardware_technician.id]["active_assigned_tickets"], 0
        )
        self.assertEqual(
            workloads[self.network_technician.id]["active_assigned_tickets"], 1
        )

    def test_unassigned_search_filter_sort_pagination_and_waiting_time(self):
        old = self.create_ticket(
            title="Old critical network outage",
            category=self.network,
            priority=Ticket.Priority.CRITICAL,
        )
        Ticket.objects.filter(pk=old.pk).update(
            created_at=timezone.now() - timedelta(hours=5)
        )
        for index in range(11):
            self.create_ticket(title=f"Queued hardware request {index:02d}")

        response = self.client.get(
            "/api/admin/assignments/unassigned/?search=network&priority=CRITICAL"
            "&category=network-internet&ordering=waiting&page=1"
        )
        page = self.client.get("/api/admin/assignments/unassigned/?page=2")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], old.id)
        self.assertGreaterEqual(response.data["results"][0]["waiting_seconds"], 17900)
        self.assertEqual(page.status_code, 200)
        self.assertEqual(len(page.data["results"]), 2)

    def test_history_filters_and_returns_previous_and_new_technicians(self):
        ticket = self.create_ticket()
        self.assign(ticket)
        self.client.post(
            "/api/admin/assignments/reassign/",
            {
                "ticket_id": ticket.id,
                "technician_id": self.network_technician.id,
                "reassignment_reason": "Specialist escalation.",
            },
            format="json",
        )

        response = self.client.get(
            f"/api/admin/assignments/history/?ticket={ticket.ticket_number}"
            f"&technician={self.network_technician.id}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        row = response.data["results"][0]
        self.assertEqual(row["previous_technician"]["id"], self.hardware_technician.id)
        self.assertEqual(row["new_technician"]["id"], self.network_technician.id)
        self.assertTrue(row["is_current"])

    def test_assignment_apis_are_admin_only(self):
        ticket = self.create_ticket()
        self.client.force_authenticate(user=self.requester)

        endpoints = (
            "/api/admin/assignments/",
            "/api/admin/assignments/unassigned/",
            "/api/admin/assignments/history/",
            "/api/admin/assignments/workloads/",
            "/api/admin/assignments/statistics/",
        )
        for endpoint in endpoints:
            self.assertEqual(self.client.get(endpoint).status_code, 403)
        self.assertEqual(
            self.client.post(
                "/api/admin/assignments/",
                {
                    "ticket_id": ticket.id,
                    "technician_id": self.hardware_technician.id,
                },
                format="json",
            ).status_code,
            403,
        )

    def test_assignment_updates_statistics_dashboard_and_ticket_detail(self):
        ticket = self.create_ticket()
        before = self.client.get("/api/admin/assignments/statistics/")
        self.assign(ticket)
        after = self.client.get("/api/admin/assignments/statistics/")
        dashboard = self.client.get("/api/admin/dashboard/summary/")
        detail = self.client.get(f"/api/admin/tickets/{ticket.id}/")

        self.assertEqual(before.data["unassigned"], 1)
        self.assertEqual(after.data["unassigned"], 0)
        self.assertEqual(after.data["assigned"], 1)
        self.assertEqual(dashboard.data["unassigned"], 0)
        self.assertTrue(detail.data["assignment"]["history_available"])
        self.assertEqual(
            detail.data["assignment"]["assigned_by"]["id"], self.admin.id
        )
