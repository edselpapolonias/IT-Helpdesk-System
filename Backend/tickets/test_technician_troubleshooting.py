from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketCategory,
    TroubleshootingLog,
)


User = get_user_model()


class TechnicianTroubleshootingTests(APITestCase):
    def setUp(self):
        self.password = "Troubleshooting-password-2026"
        self.admin = User.objects.create_user(
            username="troubleshooting-admin",
            email="troubleshooting-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="troubleshooting-requester",
            email="troubleshooting-requester@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="troubleshooting-technician",
            email="troubleshooting-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Tina",
            last_name="Technician",
        )
        self.other_technician = User.objects.create_user(
            username="troubleshooting-other",
            email="troubleshooting-other@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.category = TicketCategory.objects.create(
            name="Troubleshooting Network",
            slug="troubleshooting-network",
        )
        self.ticket = Ticket.objects.create(
            title="Office network connection drops",
            description="Connection drops every few minutes.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.IN_PROGRESS,
            assigned_technician=self.technician,
        )
        self.assignment = TicketAssignment.objects.create(
            ticket=self.ticket,
            technician=self.technician,
            assigned_by=self.admin,
            is_current=True,
        )
        self.client.force_authenticate(user=self.technician)

    def endpoint(self):
        return f"/api/technician/tickets/{self.ticket.id}/troubleshooting/"

    def test_requester_visible_log_and_attachment_are_created_atomically(self):
        screenshot = SimpleUploadedFile(
            "adapter.png",
            b"\x89PNG\r\n\x1a\n" + b"diagnostic-image",
            content_type="image/png",
        )

        with patch(
            "django.db.models.fields.files.FieldFile.save",
            return_value=None,
        ):
            response = self.client.post(
                self.endpoint(),
                {
                    "action_taken": "Checked the network adapter",
                    "diagnosis": "The adapter was disabled.",
                    "notes": "The adapter was enabled and connectivity was restored.",
                    "visibility": "REQUESTER_VISIBLE",
                    "submission_key": str(uuid4()),
                    "attachments": [screenshot],
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        log = TroubleshootingLog.objects.get(pk=response.data["id"])
        self.assertEqual(log.technician, self.technician)
        self.assertEqual(log.ticket, self.ticket)
        self.assertEqual(log.diagnosis, "The adapter was disabled.")
        self.assertTrue(log.is_requester_visible)
        self.assertEqual(
            log.public_notes,
            "The adapter was enabled and connectivity was restored.",
        )
        attachment = TicketAttachment.objects.get(troubleshooting_log=log)
        self.assertTrue(attachment.is_requester_visible)
        self.assertEqual(response.data["visibility"], "REQUESTER_VISIBLE")
        self.assertEqual(response.data["attachments"][0]["id"], attachment.id)

        self.client.force_authenticate(user=self.requester)
        requester_detail = self.client.get(f"/api/user/tickets/{self.ticket.id}/")
        self.assertEqual(requester_detail.status_code, 200)
        update = requester_detail.data["technician_updates"][0]
        self.assertEqual(update["diagnosis"], "The adapter was disabled.")
        self.assertEqual(update["attachments"][0]["id"], attachment.id)

    def test_internal_log_is_hidden_from_requester(self):
        evidence = SimpleUploadedFile(
            "switch-config.pdf",
            b"%PDF-1.7 internal evidence",
            content_type="application/pdf",
        )
        with patch(
            "django.db.models.fields.files.FieldFile.save",
            return_value=None,
        ):
            response = self.client.post(
                self.endpoint(),
                {
                    "action_taken": "Reviewed switch configuration",
                    "diagnosis": "Management VLAN mismatch.",
                    "notes": "Internal infrastructure details.",
                    "submission_key": str(uuid4()),
                    "attachments": [evidence],
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["visibility"], "INTERNAL")
        self.client.force_authenticate(user=self.requester)
        requester_detail = self.client.get(f"/api/user/tickets/{self.ticket.id}/")
        self.assertEqual(requester_detail.data["technician_updates"], [])
        self.assertEqual(requester_detail.data["attachments"], [])
        attachment_id = response.data["attachments"][0]["id"]
        self.assertEqual(
            self.client.get(
                f"/api/user/tickets/{self.ticket.id}/attachments/{attachment_id}/download/"
            ).status_code,
            404,
        )

    def test_submission_key_prevents_duplicate_logs(self):
        submission_key = str(uuid4())
        payload = {
            "action_taken": "Restarted the access point",
            "visibility": "INTERNAL",
            "submission_key": submission_key,
        }

        first = self.client.post(self.endpoint(), payload, format="multipart")
        duplicate = self.client.post(self.endpoint(), payload, format="multipart")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 200)
        self.assertTrue(duplicate.data["duplicate_submission"])
        self.assertEqual(
            TroubleshootingLog.objects.filter(submission_key=submission_key).count(),
            1,
        )

    def test_required_action_and_attachment_content_are_validated(self):
        missing_action = self.client.post(
            self.endpoint(),
            {"submission_key": str(uuid4())},
            format="multipart",
        )
        disguised_file = SimpleUploadedFile(
            "evidence.png",
            b"this is not a png image",
            content_type="image/png",
        )
        invalid_attachment = self.client.post(
            self.endpoint(),
            {
                "action_taken": "Captured evidence",
                "submission_key": str(uuid4()),
                "attachments": [disguised_file],
            },
            format="multipart",
        )

        self.assertEqual(missing_action.status_code, 400)
        self.assertIn("action_taken", missing_action.data)
        self.assertEqual(invalid_attachment.status_code, 400)
        self.assertIn("attachments", invalid_attachment.data)
        self.assertEqual(TroubleshootingLog.objects.count(), 0)

    def test_reassignment_and_invalid_status_block_new_logs(self):
        self.assignment.is_current = False
        self.assignment.save(update_fields=("is_current",))
        TicketAssignment.objects.create(
            ticket=self.ticket,
            technician=self.other_technician,
            assigned_by=self.admin,
            is_current=True,
        )
        self.ticket.assigned_technician = self.other_technician
        self.ticket.save(update_fields=("assigned_technician", "updated_at"))

        reassigned = self.client.post(
            self.endpoint(),
            {
                "action_taken": "Attempted after reassignment",
                "submission_key": str(uuid4()),
            },
            format="multipart",
        )
        self.assertEqual(reassigned.status_code, 409)

        second_ticket = Ticket.objects.create(
            title="Assigned but not started",
            description="Waiting for work to start.",
            requester=self.requester,
            category=self.category,
            status=Ticket.Status.ASSIGNED,
            assigned_technician=self.technician,
        )
        TicketAssignment.objects.create(
            ticket=second_ticket,
            technician=self.technician,
            assigned_by=self.admin,
            is_current=True,
        )
        invalid_status = self.client.post(
            f"/api/technician/tickets/{second_ticket.id}/troubleshooting/",
            {
                "action_taken": "Attempted before starting",
                "submission_key": str(uuid4()),
            },
            format="multipart",
        )
        self.assertEqual(invalid_status.status_code, 400)
        self.assertIn("status", invalid_status.data)

    def test_history_search_visibility_pagination_and_detail_are_isolated(self):
        for index in range(12):
            TroubleshootingLog.objects.create(
                ticket=self.ticket,
                technician=self.technician,
                action_taken=f"Diagnostic action {index}",
                diagnosis="Packet loss found" if index == 3 else "",
                is_requester_visible=index % 2 == 0,
                public_notes="Requester update" if index % 2 == 0 else "",
            )
        other_log = TroubleshootingLog.objects.create(
            ticket=self.ticket,
            technician=self.other_technician,
            action_taken="Another technician private action",
        )

        page = self.client.get(
            "/api/technician/troubleshooting/",
            {"page": 2, "page_size": 5},
        )
        searched = self.client.get(
            "/api/technician/troubleshooting/",
            {"search": "Packet loss", "visibility": "INTERNAL"},
        )
        visible = self.client.get(
            "/api/technician/troubleshooting/",
            {"visibility": "REQUESTER_VISIBLE"},
        )
        own_detail = self.client.get(
            f"/api/technician/troubleshooting/{TroubleshootingLog.objects.filter(technician=self.technician).first().id}/"
        )
        other_detail = self.client.get(
            f"/api/technician/troubleshooting/{other_log.id}/"
        )

        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.data["count"], 12)
        self.assertEqual(len(page.data["results"]), 5)
        self.assertEqual(searched.data["count"], 1)
        self.assertEqual(visible.data["count"], 6)
        self.assertEqual(own_detail.status_code, 200)
        self.assertEqual(other_detail.status_code, 404)
