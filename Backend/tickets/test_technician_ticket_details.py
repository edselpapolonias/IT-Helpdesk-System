from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketCategory,
    TicketPriorityHistory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


User = get_user_model()


class TechnicianTicketDetailsTests(APITestCase):
    def setUp(self):
        self.password = "Technician-details-password-2026"
        self.admin = User.objects.create_user(
            username="details-admin",
            email="details-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
            first_name="Ari",
            last_name="Admin",
        )
        self.requester = User.objects.create_user(
            username="details-requester",
            email="details-requester@example.test",
            password=self.password,
            role=User.Role.USER,
            first_name="Rina",
            last_name="Requester",
            department="Library",
            contact_number="09171234567",
        )
        self.technician = User.objects.create_user(
            username="details-technician",
            email="details-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Tomas",
            last_name="Technician",
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.other_technician = User.objects.create_user(
            username="details-other-technician",
            email="details-other-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.category = TicketCategory.objects.create(
            name="Details Hardware",
            slug="details-hardware",
        )
        self.client.force_authenticate(user=self.technician)

    def create_ticket(self, *, status=Ticket.Status.ASSIGNED, technician=None):
        technician = technician or self.technician
        ticket = Ticket.objects.create(
            title="Workstation will not boot",
            description="The workstation stops at a black screen.",
            location="Library - Desk 4",
            reported_urgency=Ticket.ReportedUrgency.URGENT,
            requester=self.requester,
            category=self.category,
            priority=Ticket.Priority.HIGH,
            status=status,
            assigned_technician=technician,
            resolution_due_at=timezone.now(),
        )
        assignment = TicketAssignment.objects.create(
            ticket=ticket,
            technician=technician,
            assigned_by=self.admin,
            assignment_notes="Check the power supply first.",
            is_current=True,
        )
        return ticket, assignment

    def reassign_away(self, ticket, assignment):
        assignment.is_current = False
        assignment.unassigned_at = timezone.now()
        assignment.save(update_fields=("is_current", "unassigned_at"))
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.other_technician,
            assigned_by=self.admin,
            reassignment_reason="Network support is now required.",
            is_current=True,
        )
        ticket.assigned_technician = self.other_technician
        ticket.save(update_fields=("assigned_technician", "updated_at"))

    def test_detail_returns_support_context_for_current_assignee(self):
        ticket, assignment = self.create_ticket()

        response = self.client.get(f"/api/technician/tickets/{ticket.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["access_mode"], "current")
        self.assertTrue(response.data["can_modify"])
        self.assertTrue(response.data["can_start_work"])
        self.assertEqual(response.data["requester"]["email"], self.requester.email)
        self.assertEqual(response.data["requester"]["contact_number"], "09171234567")
        self.assertEqual(response.data["assignment"]["id"], assignment.id)
        self.assertEqual(
            response.data["assignment"]["technician"]["specialization"],
            "Hardware Support",
        )

    def test_reassignment_revokes_active_detail_and_related_read_access(self):
        ticket, assignment = self.create_ticket()
        self.reassign_away(ticket, assignment)

        paths = (
            f"/api/technician/tickets/{ticket.id}/",
            f"/api/technician/tickets/{ticket.id}/history/",
            f"/api/technician/tickets/{ticket.id}/attachments/",
            f"/api/technician/tickets/{ticket.id}/troubleshooting/",
            f"/api/technician/tickets/{ticket.id}/resolutions/",
        )

        for path in paths:
            self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(
            self.client.post(
                f"/api/technician/tickets/{ticket.id}/start-work/"
            ).status_code,
            409,
        )

    def test_completed_ticket_is_read_only_for_related_technician(self):
        ticket, assignment = self.create_ticket(status=Ticket.Status.IN_PROGRESS)
        self.reassign_away(ticket, assignment)
        ticket.status = Ticket.Status.RESOLVED
        ticket.save(update_fields=("status", "resolved_at", "updated_at"))

        detail = self.client.get(f"/api/technician/tickets/{ticket.id}/")
        create_log = self.client.post(
            f"/api/technician/tickets/{ticket.id}/troubleshooting/",
            {"action_taken": "Attempted historical edit"},
            format="json",
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["access_mode"], "historical")
        self.assertFalse(detail.data["can_modify"])
        self.assertFalse(detail.data["can_resolve"])
        self.assertEqual(create_log.status_code, 409)

    def test_resolution_relationship_allows_completed_read_only_access(self):
        ticket, _ = self.create_ticket(
            status=Ticket.Status.RESOLVED,
            technician=self.other_technician,
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Replaced the failed power supply.",
        )

        response = self.client.get(f"/api/technician/tickets/{ticket.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["access_mode"], "historical")
        self.assertIsNone(response.data["assignment"])
        self.assertFalse(response.data["can_modify"])

    def test_private_attachments_are_listed_and_authorized_per_request(self):
        ticket, _ = self.create_ticket()
        attachment = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.requester,
            file="ticket_attachments/test/diagnostic.pdf",
            original_filename="../diagnostic.pdf",
            file_size=25,
        )
        list_url = f"/api/technician/tickets/{ticket.id}/attachments/"
        download_url = (
            f"/api/technician/tickets/{ticket.id}/attachments/"
            f"{attachment.id}/download/"
        )

        listing = self.client.get(list_url)
        with patch(
            "django.db.models.fields.files.FieldFile.open",
            return_value=BytesIO(b"private diagnostic output"),
        ):
            preview = self.client.get(f"{download_url}?preview=1")

        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data["results"][0]["file_type"], "PDF")
        self.assertTrue(listing.data["results"][0]["preview_supported"])
        self.assertNotIn("file", listing.data["results"][0])
        self.assertEqual(preview.status_code, 200)
        self.assertIn("inline", preview["Content-Disposition"])
        self.assertIn("diagnostic.pdf", preview["Content-Disposition"])
        self.assertEqual(preview["Cache-Control"], "private, no-store")

        self.client.force_authenticate(user=self.other_technician)
        self.assertEqual(self.client.get(download_url).status_code, 404)

    def test_activity_timeline_contains_only_recorded_events(self):
        ticket, _ = self.create_ticket(status=Ticket.Status.IN_PROGRESS)
        TicketPriorityHistory.objects.create(
            ticket=ticket,
            previous_priority=Ticket.Priority.MEDIUM,
            new_priority=Ticket.Priority.HIGH,
            changed_by=self.admin,
            reason="Business-critical workstation.",
        )
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.ASSIGNED,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.technician,
            reason="Technician started work.",
        )
        TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Checked power connections",
            notes="Power cable is working.",
        )

        response = self.client.get(
            f"/api/technician/tickets/{ticket.id}/history/"
        )

        self.assertEqual(response.status_code, 200)
        event_types = [item["type"] for item in response.data["results"]]
        self.assertEqual(
            event_types,
            ["submitted", "assignment", "priority", "status", "troubleshooting"],
        )
        self.assertNotIn("resolution", event_types)
        self.assertNotIn("closed", [item["title"].lower() for item in response.data["results"]])

    def test_troubleshooting_updates_are_internal_and_in_progress_only(self):
        in_progress, _ = self.create_ticket(status=Ticket.Status.IN_PROGRESS)
        assigned, _ = self.create_ticket(status=Ticket.Status.ASSIGNED)

        created = self.client.post(
            f"/api/technician/tickets/{in_progress.id}/troubleshooting/",
            {
                "action_taken": "Ran memory diagnostics",
                "notes": "No memory errors found.",
            },
            format="json",
        )
        visibility_attempt = self.client.post(
            f"/api/technician/tickets/{in_progress.id}/troubleshooting/",
            {
                "action_taken": "Shared update",
                "is_requester_visible": True,
            },
            format="json",
        )
        invalid_status = self.client.post(
            f"/api/technician/tickets/{assigned.id}/troubleshooting/",
            {"action_taken": "Started too early"},
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        log = TroubleshootingLog.objects.get(pk=created.data["id"])
        self.assertFalse(log.is_requester_visible)
        self.assertEqual(log.public_notes, "")
        self.assertEqual(visibility_attempt.status_code, 400)
        self.assertIn("is_requester_visible", visibility_attempt.data)
        self.assertEqual(invalid_status.status_code, 400)
        self.assertIn("status", invalid_status.data)
