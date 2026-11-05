import re
import tempfile
import uuid
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile, UploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from tickets.models import (
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketStatusHistory,
)


User = get_user_model()


class UserTicketSubmissionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="submitter",
            email="submitter@example.test",
            password="User-test-password-2026",
            role=User.Role.USER,
            first_name="Mara",
            last_name="Dela Cruz",
        )
        self.other_user = User.objects.create_user(
            username="other-requester",
            email="other@example.test",
            password="User-test-password-2026",
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="submission-admin",
            email="submission-admin@example.test",
            password="Admin-test-password-2026",
            role=User.Role.ADMIN,
        )
        self.category = TicketCategory.objects.create(
            name="Network and Internet",
            slug="network-and-internet",
        )
        self.inactive_category = TicketCategory.objects.create(
            name="Retired Service",
            slug="retired-service",
            is_active=False,
        )
        self.client.force_authenticate(user=self.user)

    def payload(self, **overrides):
        values = {
            "title": "Office Wi-Fi disconnects repeatedly",
            "category": self.category.id,
            "description": (
                "The office Wi-Fi disconnects every few minutes on my "
                "workstation and prevents access to shared files."
            ),
            "location": "Administration Building, Room 204",
            "reported_urgency": Ticket.ReportedUrgency.NORMAL,
            "submission_key": str(uuid.uuid4()),
        }
        values.update(overrides)
        return values

    def test_user_can_submit_ticket_with_server_controlled_fields(self):
        response = self.client.post(
            "/api/user/tickets/",
            self.payload(
                requester=self.other_user.id,
                priority=Ticket.Priority.CRITICAL,
                status=Ticket.Status.CLOSED,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        ticket = Ticket.objects.get(pk=response.data["id"])
        self.assertEqual(ticket.requester, self.user)
        self.assertEqual(ticket.priority, Ticket.Priority.MEDIUM)
        self.assertEqual(ticket.status, Ticket.Status.OPEN)
        self.assertEqual(ticket.reported_urgency, Ticket.ReportedUrgency.NORMAL)
        self.assertTrue(
            re.fullmatch(r"TKT-\d{4}-[A-F0-9]{12}", ticket.ticket_number)
        )
        history = TicketStatusHistory.objects.get(ticket=ticket)
        self.assertEqual(history.previous_status, Ticket.Status.OPEN)
        self.assertEqual(history.new_status, Ticket.Status.OPEN)
        self.assertEqual(history.changed_by, self.user)
        self.assertFalse(response.data["duplicate_submission"])

    def test_required_fields_category_and_urgency_are_validated(self):
        missing = self.client.post(
            "/api/user/tickets/",
            self.payload(title="", description="short", location=""),
            format="json",
        )
        inactive_category = self.client.post(
            "/api/user/tickets/",
            self.payload(category=self.inactive_category.id),
            format="json",
        )
        invalid_urgency = self.client.post(
            "/api/user/tickets/",
            self.payload(reported_urgency="CRITICAL"),
            format="json",
        )

        self.assertEqual(missing.status_code, 400)
        self.assertIn("title", missing.data)
        self.assertIn("description", missing.data)
        self.assertIn("location", missing.data)
        self.assertEqual(inactive_category.status_code, 400)
        self.assertIn("category", inactive_category.data)
        self.assertEqual(invalid_urgency.status_code, 400)
        self.assertIn("reported_urgency", invalid_urgency.data)
        self.assertEqual(Ticket.objects.count(), 0)

    def test_duplicate_submission_key_returns_existing_ticket_once(self):
        submission_key = str(uuid.uuid4())
        first = self.client.post(
            "/api/user/tickets/",
            self.payload(submission_key=submission_key),
            format="json",
        )
        duplicate = self.client.post(
            "/api/user/tickets/",
            self.payload(
                submission_key=submission_key,
                title="A different title must not create another ticket",
            ),
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(duplicate.data["id"], first.data["id"])
        self.assertTrue(duplicate.data["duplicate_submission"])
        self.assertEqual(Ticket.objects.count(), 1)
        self.assertEqual(TicketStatusHistory.objects.count(), 1)

    @override_settings(MEDIA_ROOT=tempfile.gettempdir())
    def test_multiple_valid_attachments_are_stored_privately(self):
        screenshot = SimpleUploadedFile(
            "wifi-error.png",
            b"\x89PNG\r\n\x1a\n" + b"screenshot-data",
            content_type="image/png",
        )
        report = SimpleUploadedFile(
            "diagnostic.pdf",
            b"%PDF-1.7\nprivate diagnostic",
            content_type="application/pdf",
        )
        response = self.client.post(
            "/api/user/tickets/",
            {**self.payload(), "attachments": [screenshot, report]},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["attachments"]), 2)
        attachments = TicketAttachment.objects.filter(ticket_id=response.data["id"])
        self.assertEqual(attachments.count(), 2)
        self.assertFalse(attachments.filter(is_requester_visible=False).exists())
        self.assertSetEqual(
            set(attachments.values_list("original_filename", flat=True)),
            {"wifi-error.png", "diagnostic.pdf"},
        )
        self.assertTrue(
            all(
                "/api/user/tickets/" in item["download_url"]
                for item in response.data["attachments"]
            )
        )
        for attachment in attachments:
            attachment.file.delete(save=False)

    def test_attachment_count_extension_content_and_size_are_validated(self):
        too_many = [
            SimpleUploadedFile(
                f"evidence-{index}.png",
                b"\x89PNG\r\n\x1a\ncontent",
                content_type="image/png",
            )
            for index in range(6)
        ]
        count_response = self.client.post(
            "/api/user/tickets/",
            {**self.payload(), "attachments": too_many},
            format="multipart",
        )
        extension_response = self.client.post(
            "/api/user/tickets/",
            {
                **self.payload(),
                "attachments": SimpleUploadedFile(
                    "script.exe",
                    b"MZ-untrusted",
                    content_type="application/octet-stream",
                ),
            },
            format="multipart",
        )
        spoofed_response = self.client.post(
            "/api/user/tickets/",
            {
                **self.payload(),
                "attachments": SimpleUploadedFile(
                    "not-an-image.png",
                    b"plain text",
                    content_type="image/png",
                ),
            },
            format="multipart",
        )
        oversized = UploadedFile(
            file=BytesIO(
                b"\x89PNG\r\n\x1a\n"
                + (b"x" * ((10 * 1024 * 1024) - 7))
            ),
            name="oversized.png",
            content_type="image/png",
            size=(10 * 1024 * 1024) + 1,
        )
        size_response = self.client.post(
            "/api/user/tickets/",
            {**self.payload(), "attachments": oversized},
            format="multipart",
        )

        for response in (
            count_response,
            extension_response,
            spoofed_response,
            size_response,
        ):
            self.assertEqual(response.status_code, 400)
            self.assertIn("attachments", response.data)
        self.assertEqual(Ticket.objects.count(), 0)

    def test_only_regular_authenticated_users_can_submit(self):
        self.client.force_authenticate(user=None)
        anonymous = self.client.post(
            "/api/user/tickets/", self.payload(), format="json"
        )
        self.client.force_authenticate(user=self.admin)
        admin = self.client.post(
            "/api/user/tickets/", self.payload(), format="json"
        )

        self.assertEqual(anonymous.status_code, 401)
        self.assertEqual(admin.status_code, 403)
        self.assertEqual(Ticket.objects.count(), 0)

    def test_submission_appears_in_admin_ticket_dashboard_and_assignment_views(self):
        created = self.client.post(
            "/api/user/tickets/", self.payload(), format="json"
        )
        self.client.force_authenticate(user=self.admin)

        ticket_list = self.client.get("/api/admin/tickets/")
        statistics = self.client.get("/api/admin/tickets/statistics/")
        dashboard = self.client.get("/api/admin/dashboard/summary/")
        unassigned = self.client.get("/api/admin/assignments/unassigned/")

        self.assertEqual(created.status_code, 201)
        self.assertEqual(ticket_list.data["count"], 1)
        self.assertEqual(ticket_list.data["results"][0]["id"], created.data["id"])
        self.assertEqual(statistics.data["total"], 1)
        self.assertEqual(statistics.data["unassigned"], 1)
        self.assertEqual(dashboard.data["total"], 1)
        self.assertEqual(dashboard.data["unassigned"], 1)
        self.assertEqual(unassigned.data["count"], 1)
        self.assertEqual(unassigned.data["results"][0]["id"], created.data["id"])

    def test_attachment_download_is_scoped_to_ticket_requester(self):
        ticket = Ticket.objects.create(
            requester=self.user,
            category=self.category,
            title="Existing attachment ticket",
            description="This ticket has an existing private diagnostic attachment.",
            location="Main Office",
        )
        attachment = TicketAttachment.objects.create(
            ticket=ticket,
            uploaded_by=self.user,
            file="ticket_attachments/test/private.pdf",
            original_filename="private.pdf",
            file_size=22,
        )
        url = (
            f"/api/user/tickets/{ticket.id}/attachments/"
            f"{attachment.id}/download/"
        )

        with patch(
            "django.db.models.fields.files.FieldFile.open",
            return_value=BytesIO(b"private diagnostic"),
        ):
            owner_response = self.client.get(url)
        self.client.force_authenticate(user=self.other_user)
        other_response = self.client.get(url)

        self.assertEqual(owner_response.status_code, 200)
        self.assertEqual(other_response.status_code, 404)
