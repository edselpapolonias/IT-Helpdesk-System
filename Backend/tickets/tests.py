from io import BytesIO
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketPriorityHistory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


User = get_user_model()


class TicketManagementAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="ticket-admin",
            email="ticket-admin@example.test",
            password="Admin-test-password-2026",
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="ticket-requester",
            email="ticket-requester@example.test",
            password="User-test-password-2026",
            role=User.Role.USER,
            first_name="Rina",
            last_name="Santos",
            department="Registrar",
            contact_number="+63 912 555 0110",
        )
        self.technician = User.objects.create_user(
            username="ticket-technician",
            email="ticket-technician@example.test",
            password="Technician-test-password-2026",
            role=User.Role.TECHNICIAN,
            first_name="Leo",
            last_name="Cruz",
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.category = TicketCategory.objects.create(
            name="Test Hardware",
            slug="test-hardware",
        )
        self.client.force_authenticate(user=self.admin)

    def create_ticket(self, **overrides):
        values = {
            "title": "Desktop will not boot",
            "description": "The workstation does not respond to the power button.",
            "requester": self.requester,
            "category": self.category,
            "location": "Registrar Office",
            "reported_urgency": Ticket.ReportedUrgency.HIGH,
        }
        values.update(overrides)
        return Ticket.objects.create(**values)

    def test_ticket_numbers_are_unique_and_not_count_based(self):
        first = self.create_ticket()
        second = self.create_ticket(title="Second incident")

        self.assertNotEqual(first.ticket_number, second.ticket_number)
        self.assertRegex(first.ticket_number, r"^TKT-\d{4}-[A-F0-9]{12}$")

    def test_admin_list_search_filters_sorting_and_pagination(self):
        for index in range(12):
            self.create_ticket(
                title=f"Printer incident {index:02d}",
                priority=(
                    Ticket.Priority.CRITICAL
                    if index == 0
                    else Ticket.Priority.LOW
                ),
                status=Ticket.Status.OPEN,
            )
        page = self.client.get("/api/admin/tickets/?page=1")
        search = self.client.get("/api/admin/tickets/?search=Printer%20incident%2000")
        filtered = self.client.get(
            f"/api/admin/tickets/?priority=CRITICAL&category={self.category.slug}&assignment=unassigned&ordering=priority"
        )

        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.data["count"], 12)
        self.assertEqual(len(page.data["results"]), 10)
        self.assertEqual(search.data["count"], 1)
        self.assertEqual(filtered.data["count"], 1)

    def test_non_admins_cannot_access_admin_ticket_endpoints(self):
        ticket = self.create_ticket()
        for account in (self.requester, self.technician):
            self.client.force_authenticate(user=account)
            self.assertEqual(self.client.get("/api/admin/tickets/").status_code, 403)
            self.assertEqual(
                self.client.get(f"/api/admin/tickets/{ticket.id}/").status_code,
                403,
            )

    def test_detail_returns_real_requester_and_assignment_information(self):
        ticket = self.create_ticket(assigned_technician=self.technician)
        response = self.client.get(f"/api/admin/tickets/{ticket.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["ticket_number"], ticket.ticket_number)
        self.assertEqual(response.data["requester"]["department"], "Registrar")
        self.assertEqual(
            response.data["assigned_technician"]["id"], self.technician.id
        )
        self.assertFalse(response.data["assignment"]["history_available"])

    def test_priority_update_is_validated_audited_and_updates_dashboard(self):
        ticket = self.create_ticket(priority=Ticket.Priority.MEDIUM)
        response = self.client.patch(
            f"/api/admin/tickets/{ticket.id}/priority/",
            {"priority": Ticket.Priority.CRITICAL, "reason": "Campus-wide impact"},
            format="json",
        )
        dashboard = self.client.get("/api/admin/dashboard/summary/")

        self.assertEqual(response.status_code, 200)
        ticket.refresh_from_db()
        self.assertEqual(ticket.priority, Ticket.Priority.CRITICAL)
        history = TicketPriorityHistory.objects.get(ticket=ticket)
        self.assertEqual(history.previous_priority, Ticket.Priority.MEDIUM)
        self.assertEqual(history.changed_by, self.admin)
        self.assertEqual(dashboard.data["critical"], 1)

    def test_invalid_or_unchanged_priority_is_rejected(self):
        ticket = self.create_ticket(priority=Ticket.Priority.HIGH)
        invalid = self.client.patch(
            f"/api/admin/tickets/{ticket.id}/priority/",
            {"priority": "URGENT"},
            format="json",
        )
        unchanged = self.client.patch(
            f"/api/admin/tickets/{ticket.id}/priority/",
            {"priority": Ticket.Priority.HIGH},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(unchanged.status_code, 400)

    def test_status_workflow_requires_assignment_and_resolution_history(self):
        unassigned = self.create_ticket()
        rejected_assignment = self.client.post(
            f"/api/admin/tickets/{unassigned.id}/status/",
            {"status": Ticket.Status.ASSIGNED},
            format="json",
        )
        self.assertEqual(rejected_assignment.status_code, 400)

        ticket = self.create_ticket(
            title="Workflow incident",
            assigned_technician=self.technician,
        )
        for new_status in (Ticket.Status.ASSIGNED, Ticket.Status.IN_PROGRESS):
            response = self.client.post(
                f"/api/admin/tickets/{ticket.id}/status/",
                {"status": new_status},
                format="json",
            )
            self.assertEqual(response.status_code, 200)
        missing_resolution = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.RESOLVED},
            format="json",
        )
        self.assertEqual(missing_resolution.status_code, 400)

        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Replaced the failed power supply.",
        )
        resolved = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.RESOLVED},
            format="json",
        )
        closed = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.CLOSED},
            format="json",
        )

        self.assertEqual(resolved.status_code, 200)
        self.assertEqual(closed.status_code, 200)
        self.assertEqual(TicketStatusHistory.objects.filter(ticket=ticket).count(), 4)
        ticket.refresh_from_db()
        self.assertIsNotNone(ticket.resolved_at)
        self.assertIsNotNone(ticket.closed_at)

    def test_history_troubleshooting_and_resolution_endpoints_use_real_records(self):
        ticket = self.create_ticket(assigned_technician=self.technician)
        TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Checked power connections",
            notes="Power supply failed diagnostics.",
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Installed a replacement power supply.",
        )

        history = self.client.get(f"/api/admin/tickets/{ticket.id}/history/")
        logs = self.client.get(
            f"/api/admin/tickets/{ticket.id}/troubleshooting/"
        )
        resolutions = self.client.get(
            f"/api/admin/tickets/{ticket.id}/resolutions/"
        )

        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data["results"]), 3)
        self.assertEqual(logs.data["results"][0]["action_taken"], "Checked power connections")
        self.assertEqual(
            resolutions.data["results"][0]["resolved_by"]["id"],
            self.technician.id,
        )

    def test_category_deletion_is_protected_when_used(self):
        self.create_ticket()
        with self.assertRaises(ProtectedError):
            self.category.delete()

    def test_attachment_download_requires_admin_authorization(self):
        ticket = self.create_ticket()
        attachment = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.requester,
            file="ticket_attachments/test/diagnostic.txt",
            original_filename="diagnostic.txt",
            file_size=25,
        )
        url = (
            f"/api/admin/tickets/{ticket.id}/attachments/"
            f"{attachment.id}/download/"
        )

        with patch(
            "django.db.models.fields.files.FieldFile.open",
            return_value=BytesIO(b"private diagnostic output"),
        ):
            admin_response = self.client.get(url)
        self.assertEqual(admin_response.status_code, 200)
        self.client.force_authenticate(user=self.requester)
        requester_response = self.client.get(url)
        self.assertEqual(requester_response.status_code, 403)

    def test_statistics_use_actual_ticket_state(self):
        self.create_ticket(
            priority=Ticket.Priority.CRITICAL,
            status=Ticket.Status.OPEN,
        )
        self.create_ticket(
            title="In progress issue",
            status=Ticket.Status.IN_PROGRESS,
            assigned_technician=self.technician,
        )
        resolved = self.create_ticket(
            title="Resolved issue",
            status=Ticket.Status.RESOLVED,
            assigned_technician=self.technician,
        )
        Ticket.objects.filter(pk=resolved.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )

        response = self.client.get("/api/admin/tickets/statistics/")

        self.assertEqual(response.data["total"], 3)
        self.assertEqual(response.data["critical"], 1)
        self.assertEqual(response.data["unassigned"], 1)
        self.assertEqual(response.data["in_progress"], 1)
        self.assertEqual(response.data["resolved"], 1)

    def test_empty_ticket_database_returns_zero_statistics_and_empty_page(self):
        statistics = self.client.get("/api/admin/tickets/statistics/")
        listing = self.client.get("/api/admin/tickets/")

        self.assertEqual(statistics.status_code, 200)
        self.assertEqual(
            statistics.data,
            {
                "total": 0,
                "open": 0,
                "in_progress": 0,
                "resolved": 0,
                "critical": 0,
                "unassigned": 0,
            },
        )
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["count"], 0)
        self.assertEqual(listing.data["results"], [])
