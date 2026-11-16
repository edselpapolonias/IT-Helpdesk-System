from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketCategory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


User = get_user_model()


class UserTicketDetailsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ticket-detail-user",
            email="ticket-detail-user@example.test",
            role=User.Role.USER,
            first_name="Mika",
            last_name="Santos",
        )
        self.other_user = User.objects.create_user(
            username="other-ticket-detail-user",
            email="other-ticket-detail-user@example.test",
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="ticket-detail-admin",
            email="ticket-detail-admin@example.test",
            role=User.Role.ADMIN,
        )
        self.technician = User.objects.create_user(
            username="ticket-detail-tech",
            email="ticket-detail-tech@example.test",
            role=User.Role.TECHNICIAN,
            first_name="Nico",
            last_name="Ramos",
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.category = TicketCategory.objects.get(slug="hardware")
        self.client.force_authenticate(user=self.user)

    def create_ticket(self, **overrides):
        values = {
            "requester": self.user,
            "title": "Desktop display issue",
            "description": "The desktop monitor loses its signal during normal use.",
            "category": self.category,
            "location": "Accounting Office",
        }
        values.update(overrides)
        return Ticket.objects.create(**values)

    def resolved_ticket(self):
        ticket = self.create_ticket(
            status=Ticket.Status.RESOLVED,
            assigned_technician=self.technician,
            resolved_at=timezone.now(),
        )
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.technician,
            assigned_by=self.admin,
            assignment_notes="PRIVATE ASSIGNMENT NOTES",
        )
        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Replaced the display cable and verified stable output.",
        )
        return ticket

    def test_detail_returns_assignment_and_only_public_technician_updates(self):
        ticket = self.resolved_ticket()
        internal = TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Internal diagnostics",
            notes="SECRET INTERNAL ROOT CAUSE",
        )
        shared = TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Display cable tested",
            notes="SECRET INTERNAL SERIAL NUMBER",
            is_requester_visible=True,
            public_notes="The faulty display cable was replaced.",
        )

        response = self.client.get(f"/api/user/tickets/{ticket.id}/")
        serialized = str(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["assignment"]["status"], "ASSIGNED")
        self.assertIsNotNone(response.data["assignment"]["assigned_at"])
        self.assertEqual(len(response.data["technician_updates"]), 1)
        self.assertEqual(response.data["technician_updates"][0]["id"], shared.id)
        self.assertNotEqual(response.data["technician_updates"][0]["id"], internal.id)
        self.assertNotIn("SECRET", serialized)
        self.assertIn("faulty display cable", serialized)

    def test_activity_is_chronological_real_and_hides_internal_text(self):
        ticket = self.resolved_ticket()
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.ASSIGNED,
            new_status=Ticket.Status.IN_PROGRESS,
            changed_by=self.admin,
            reason="SECRET ADMIN STATUS REASON",
        )
        TicketStatusHistory.objects.create(
            ticket=ticket,
            previous_status=Ticket.Status.IN_PROGRESS,
            new_status=Ticket.Status.RESOLVED,
            changed_by=self.admin,
            reason="SECRET RESOLUTION REVIEW",
        )
        TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Internal-only inspection",
            notes="SECRET INTERNAL NOTES",
        )
        TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Tested replacement cable",
            notes="SECRET DEVICE INVENTORY",
            is_requester_visible=True,
            public_notes="The new cable passed the display test.",
        )

        response = self.client.get(f"/api/user/tickets/{ticket.id}/activity/")
        serialized = str(response.data)
        titles = [event["title"] for event in response.data["results"]]
        timestamps = [event["timestamp"] for event in response.data["results"]]

        self.assertEqual(response.status_code, 200)
        self.assertIn("Ticket Submitted", titles)
        self.assertIn("Technician Assigned", titles)
        self.assertIn("Work Started", titles)
        self.assertIn("Troubleshooting Updated", titles)
        self.assertIn("Resolution Provided", titles)
        self.assertEqual(timestamps, sorted(timestamps))
        self.assertTrue(response.data["results"][-1]["is_current"])
        self.assertNotIn("SECRET", serialized)
        self.assertNotIn("Internal-only inspection", serialized)

    def test_attachment_listing_preview_and_download_require_visibility(self):
        ticket = self.create_ticket()
        requester_upload = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.user,
            file="ticket_attachments/test/requester.png",
            original_filename="requester.png",
            file_size=120,
        )
        shared = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.technician,
            file="ticket_attachments/test/shared.pdf",
            original_filename="shared.pdf",
            file_size=240,
            is_requester_visible=True,
        )
        private = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.technician,
            file="ticket_attachments/test/private.pdf",
            original_filename="private.pdf",
            file_size=360,
        )

        detail = self.client.get(f"/api/user/tickets/{ticket.id}/")
        attachment_ids = {item["id"] for item in detail.data["attachments"]}
        shared_url = (
            f"/api/user/tickets/{ticket.id}/attachments/{shared.id}/download/"
        )
        private_url = (
            f"/api/user/tickets/{ticket.id}/attachments/{private.id}/download/"
        )
        with patch(
            "django.db.models.fields.files.FieldFile.open",
            return_value=BytesIO(b"%PDF-1.7 private response"),
        ):
            preview = self.client.get(f"{shared_url}?preview=1")

        self.assertSetEqual(attachment_ids, {requester_upload.id, shared.id})
        self.assertTrue(
            next(
                item for item in detail.data["attachments"] if item["id"] == shared.id
            )["preview_supported"]
        )
        self.assertEqual(preview.status_code, 200)
        self.assertTrue(preview.headers["Content-Disposition"].startswith("inline"))
        self.assertEqual(preview.headers["Content-Type"], "application/pdf")
        self.assertEqual(preview.headers["Cache-Control"], "private, no-store")
        self.assertEqual(preview.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.client.get(private_url).status_code, 404)

    def test_resolution_endpoint_is_requester_scoped(self):
        ticket = self.resolved_ticket()
        response = self.client.get(f"/api/user/tickets/{ticket.id}/resolution/")
        self.client.force_authenticate(user=self.other_user)
        private = self.client.get(f"/api/user/tickets/{ticket.id}/resolution/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("display cable", response.data["resolution"]["summary"])
        self.assertTrue(response.data["needs_confirmation"])
        self.assertEqual(private.status_code, 404)

    def test_admin_can_explicitly_share_reviewed_update_and_attachment(self):
        ticket = self.create_ticket()
        log = TroubleshootingLog.objects.create(
            ticket=ticket,
            technician=self.technician,
            action_taken="Reviewed device logs",
            notes="SECRET INTERNAL DIAGNOSTIC DETAIL",
        )
        attachment = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.technician,
            file="ticket_attachments/test/reviewed.pdf",
            original_filename="reviewed.pdf",
            file_size=180,
        )
        self.client.force_authenticate(user=self.admin)
        shared_log = self.client.patch(
            f"/api/admin/tickets/{ticket.id}/troubleshooting/{log.id}/visibility/",
            {
                "is_requester_visible": True,
                "public_notes": "The device logs were reviewed and no hardware failure was found.",
            },
            format="json",
        )
        shared_attachment = self.client.patch(
            f"/api/admin/tickets/{ticket.id}/attachments/{attachment.id}/visibility/",
            {"is_requester_visible": True},
            format="json",
        )
        self.client.force_authenticate(user=self.user)
        detail = self.client.get(f"/api/user/tickets/{ticket.id}/")
        serialized = str(detail.data)

        self.assertEqual(shared_log.status_code, 200)
        self.assertEqual(shared_attachment.status_code, 200)
        self.assertIn("no hardware failure", serialized)
        self.assertIn("reviewed.pdf", serialized)
        self.assertNotIn("SECRET", serialized)

    def test_reopening_is_audited_actionable_and_requires_new_resolution(self):
        ticket = self.resolved_ticket()
        previous_resolution = ticket.resolutions.get()
        reopened = self.client.post(
            f"/api/user/tickets/{ticket.id}/reopen/",
            {"reason": "The monitor lost its signal again after several minutes."},
            format="json",
        )

        self.assertEqual(reopened.status_code, 200)
        self.assertEqual(reopened.data["status"], Ticket.Status.REOPENED)
        self.assertEqual(ticket.resolutions.count(), 1)
        self.assertTrue(ticket.assignment_history.get().is_current)
        history = TicketStatusHistory.objects.get(
            ticket=ticket,
            new_status=Ticket.Status.REOPENED,
        )
        self.assertEqual(history.changed_by, self.user)

        self.client.force_authenticate(user=self.admin)
        queue = self.client.get("/api/admin/tickets/?status=REOPENED")
        started = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.IN_PROGRESS},
            format="json",
        )
        missing_new_resolution = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.RESOLVED},
            format="json",
        )

        self.assertEqual(queue.data["count"], 1)
        self.assertEqual(started.status_code, 200)
        self.assertEqual(missing_new_resolution.status_code, 400)

        TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=self.technician,
            resolution_summary="Replaced the monitor after the reopened request.",
            resolved_at=timezone.now(),
        )
        resolved_again = self.client.post(
            f"/api/admin/tickets/{ticket.id}/status/",
            {"status": Ticket.Status.RESOLVED},
            format="json",
        )

        self.assertEqual(resolved_again.status_code, 200)
        self.assertEqual(ticket.resolutions.count(), 2)
        self.assertTrue(
            ticket.resolutions.filter(pk=previous_resolution.pk).exists()
        )
        self.assertIsNone(resolved_again.data["reopen_requested_at"])

    def test_confirmation_rejects_stale_or_unresolved_state_without_history(self):
        open_ticket = self.create_ticket()
        open_response = self.client.post(
            f"/api/user/tickets/{open_ticket.id}/confirm-resolution/",
            {},
            format="json",
        )
        resolved = self.resolved_ticket()
        Ticket.objects.filter(pk=resolved.pk).update(status=Ticket.Status.IN_PROGRESS)
        stale_response = self.client.post(
            f"/api/user/tickets/{resolved.id}/confirm-resolution/",
            {},
            format="json",
        )

        self.assertEqual(open_response.status_code, 400)
        self.assertEqual(stale_response.status_code, 400)
        self.assertFalse(
            TicketStatusHistory.objects.filter(
                new_status=Ticket.Status.CLOSED
            ).exists()
        )
