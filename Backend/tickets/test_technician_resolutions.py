from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import (
    Ticket,
    TicketAssignment,
    TicketAttachment,
    TicketCategory,
    TicketResolution,
    TicketStatusHistory,
)


User = get_user_model()


class TechnicianResolutionTests(APITestCase):
    def setUp(self):
        self.password = "Resolution-password-2026"
        self.admin = User.objects.create_user(
            username="resolution-admin",
            email="resolution-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="resolution-requester",
            email="resolution-requester@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="resolution-technician",
            email="resolution-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Rene",
            last_name="Resolver",
        )
        self.other_technician = User.objects.create_user(
            username="resolution-other",
            email="resolution-other@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.category = TicketCategory.objects.create(
            name="Resolution Network",
            slug="resolution-network",
        )
        self.client.force_authenticate(user=self.technician)

    def create_ticket(
        self,
        *,
        status=Ticket.Status.IN_PROGRESS,
        technician=None,
        assigned_at=None,
        title="Network adapter unavailable",
    ):
        technician = technician or self.technician
        ticket = Ticket.objects.create(
            title=title,
            description="The workstation cannot connect to the network.",
            requester=self.requester,
            category=self.category,
            priority=Ticket.Priority.HIGH,
            status=status,
            assigned_technician=technician,
        )
        assignment = TicketAssignment.objects.create(
            ticket=ticket,
            technician=technician,
            assigned_by=self.admin,
            assigned_at=assigned_at or timezone.now(),
            is_current=True,
        )
        return ticket, assignment

    def payload(self, **overrides):
        values = {
            "resolution_summary": "Network connectivity was restored.",
            "root_cause": "The network adapter was disabled.",
            "actions_performed": "Enabled the adapter, renewed the IP address, and verified access.",
            "notes": "Connection remained stable during final testing.",
            "confirmed_accurate": "true",
            "submission_key": str(uuid4()),
        }
        values.update(overrides)
        return values

    def resolve_url(self, ticket):
        return f"/api/technician/tickets/{ticket.id}/resolve/"

    def test_successful_resolution_is_atomic_and_visible_across_roles(self):
        ticket, _ = self.create_ticket()
        evidence = SimpleUploadedFile(
            "connectivity.pdf",
            b"%PDF-1.7 resolution evidence",
            content_type="application/pdf",
        )
        payload = self.payload(attachments=[evidence])

        with patch(
            "django.db.models.fields.files.FieldFile.save",
            return_value=None,
        ):
            response = self.client.post(
                self.resolve_url(ticket),
                payload,
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.RESOLVED)
        self.assertIsNotNone(ticket.resolved_at)
        resolution = TicketResolution.objects.get(ticket=ticket)
        self.assertEqual(resolution.resolved_by, self.technician)
        self.assertEqual(resolution.root_cause, payload["root_cause"])
        self.assertEqual(resolution.actions_performed, payload["actions_performed"])
        attachment = TicketAttachment.objects.get(resolution=resolution)
        self.assertFalse(attachment.is_requester_visible)
        history = TicketStatusHistory.objects.get(ticket=ticket)
        self.assertEqual(history.previous_status, Ticket.Status.IN_PROGRESS)
        self.assertEqual(history.new_status, Ticket.Status.RESOLVED)
        self.assertEqual(history.changed_by, self.technician)

        self.client.force_authenticate(user=self.admin)
        admin_detail = self.client.get(f"/api/admin/tickets/{ticket.id}/")
        self.client.force_authenticate(user=self.requester)
        requester_detail = self.client.get(f"/api/user/tickets/{ticket.id}/")
        self.assertEqual(admin_detail.data["status"], Ticket.Status.RESOLVED)
        self.assertEqual(requester_detail.data["status"], Ticket.Status.RESOLVED)
        self.assertTrue(requester_detail.data["needs_confirmation"])
        self.assertEqual(
            requester_detail.data["resolution"]["summary"],
            payload["resolution_summary"],
        )
        self.assertNotIn("root_cause", requester_detail.data["resolution"])
        self.assertNotIn("actions_performed", requester_detail.data["resolution"])
        self.assertNotIn("notes", requester_detail.data["resolution"])

    def test_duplicate_submission_returns_existing_resolution(self):
        ticket, _ = self.create_ticket()
        payload = self.payload()

        first = self.client.post(self.resolve_url(ticket), payload, format="multipart")
        duplicate = self.client.post(
            self.resolve_url(ticket), payload, format="multipart"
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(duplicate.status_code, 200)
        self.assertTrue(duplicate.data["duplicate_submission"])
        self.assertEqual(TicketResolution.objects.filter(ticket=ticket).count(), 1)
        self.assertEqual(
            TicketStatusHistory.objects.filter(
                ticket=ticket,
                new_status=Ticket.Status.RESOLVED,
            ).count(),
            1,
        )

    def test_required_fields_confirmation_and_attachment_are_validated(self):
        ticket, _ = self.create_ticket()
        missing = self.client.post(
            self.resolve_url(ticket),
            self.payload(
                resolution_summary="",
                actions_performed="",
                confirmed_accurate="false",
            ),
            format="multipart",
        )
        disguised = SimpleUploadedFile(
            "evidence.png",
            b"not a valid image",
            content_type="image/png",
        )
        invalid_file = self.client.post(
            self.resolve_url(ticket),
            self.payload(attachments=[disguised]),
            format="multipart",
        )

        self.assertEqual(missing.status_code, 400)
        self.assertIn("resolution_summary", missing.data)
        self.assertIn("actions_performed", missing.data)
        self.assertIn("confirmed_accurate", missing.data)
        self.assertEqual(invalid_file.status_code, 400)
        self.assertIn("attachments", invalid_file.data)
        self.assertEqual(TicketResolution.objects.count(), 0)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.IN_PROGRESS)

    def test_reassignment_invalid_status_and_roles_are_rejected(self):
        ticket, assignment = self.create_ticket()
        assignment.is_current = False
        assignment.unassigned_at = timezone.now()
        assignment.save(update_fields=("is_current", "unassigned_at"))
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.other_technician,
            assigned_by=self.admin,
            is_current=True,
        )
        ticket.assigned_technician = self.other_technician
        ticket.save(update_fields=("assigned_technician", "updated_at"))

        reassigned = self.client.post(
            self.resolve_url(ticket), self.payload(), format="multipart"
        )
        assigned_ticket, _ = self.create_ticket(status=Ticket.Status.ASSIGNED)
        invalid_status = self.client.post(
            self.resolve_url(assigned_ticket), self.payload(), format="multipart"
        )

        self.assertEqual(reassigned.status_code, 409)
        self.assertEqual(invalid_status.status_code, 400)
        for user in (self.admin, self.requester):
            self.client.force_authenticate(user=user)
            self.assertEqual(
                self.client.post(
                    self.resolve_url(assigned_ticket),
                    self.payload(),
                    format="multipart",
                ).status_code,
                403,
            )

    def test_reopen_and_second_resolution_preserve_attempt_history(self):
        ticket, _ = self.create_ticket()
        first = self.client.post(
            self.resolve_url(ticket), self.payload(), format="multipart"
        )
        self.assertEqual(first.status_code, 201)
        first_resolution = TicketResolution.objects.get(ticket=ticket)

        self.client.force_authenticate(user=self.requester)
        reopened = self.client.post(
            f"/api/user/tickets/{ticket.id}/reopen/",
            {"reason": "The connection failed again."},
            format="json",
        )
        self.assertEqual(reopened.status_code, 200)
        first_resolution.refresh_from_db()
        self.assertIsNotNone(first_resolution.reopened_at)
        self.assertEqual(first_resolution.reopen_reason, "The connection failed again.")

        self.client.force_authenticate(user=self.technician)
        started = self.client.post(
            f"/api/technician/tickets/{ticket.id}/start-work/"
        )
        second = self.client.post(
            self.resolve_url(ticket),
            self.payload(
                resolution_summary="Replaced the failing network adapter.",
                actions_performed="Installed and tested a replacement adapter.",
            ),
            format="multipart",
        )

        self.assertEqual(started.status_code, 200)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(TicketResolution.objects.filter(ticket=ticket).count(), 2)
        self.assertTrue(
            TicketResolution.objects.filter(pk=first_resolution.pk).exists()
        )
        latest = TicketResolution.objects.filter(ticket=ticket).last()
        self.assertEqual(
            latest.resolution_summary,
            "Replaced the failing network adapter.",
        )

    def test_requester_confirmation_records_resolution_outcome(self):
        ticket, _ = self.create_ticket()
        self.client.post(self.resolve_url(ticket), self.payload(), format="multipart")
        resolution = TicketResolution.objects.get(ticket=ticket)

        self.client.force_authenticate(user=self.requester)
        confirmed = self.client.post(
            f"/api/user/tickets/{ticket.id}/confirm-resolution/"
        )

        self.assertEqual(confirmed.status_code, 200)
        resolution.refresh_from_db()
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.CLOSED)
        self.assertIsNotNone(resolution.closed_at)
        self.assertEqual(resolution.closed_at, ticket.closed_at)

    def test_completed_list_filters_isolates_and_paginates_actual_resolutions(self):
        for index in range(12):
            ticket, _ = self.create_ticket(title=f"Completed issue {index}")
            TicketResolution.objects.create(
                ticket=ticket,
                resolved_by=self.technician,
                resolution_summary=f"Resolved issue {index}",
                actions_performed="Performed corrective action.",
                resolved_at=timezone.now(),
            )
        other_ticket, _ = self.create_ticket(technician=self.other_technician)
        TicketResolution.objects.create(
            ticket=other_ticket,
            resolved_by=self.other_technician,
            resolution_summary="Another technician resolution",
        )

        page = self.client.get(
            "/api/technician/completed/",
            {"page": 2, "page_size": 5},
        )
        searched = self.client.get(
            "/api/technician/completed/",
            {"search": "Completed issue 3"},
        )
        filtered = self.client.get(
            "/api/technician/completed/",
            {"category": self.category.slug, "status": Ticket.Status.IN_PROGRESS},
        )

        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.data["count"], 12)
        self.assertEqual(len(page.data["results"]), 5)
        self.assertEqual(searched.data["count"], 1)
        self.assertEqual(filtered.data["count"], 12)

    def test_completed_statistics_use_resolution_attribution_and_assignment_time(self):
        now = timezone.now()
        first_ticket, _ = self.create_ticket(assigned_at=now - timedelta(hours=10))
        first = TicketResolution.objects.create(
            ticket=first_ticket,
            resolved_by=self.technician,
            resolution_summary="First resolution",
            actions_performed="First action",
            resolved_at=now - timedelta(hours=2),
            closed_at=now - timedelta(hours=1),
        )
        second_ticket, _ = self.create_ticket(assigned_at=now - timedelta(hours=6))
        TicketResolution.objects.create(
            ticket=second_ticket,
            resolved_by=self.technician,
            resolution_summary="Second resolution",
            actions_performed="Second action",
            resolved_at=now - timedelta(hours=2),
            reopened_at=now - timedelta(hours=1),
            reopen_reason="Issue returned.",
        )
        other_ticket, _ = self.create_ticket(
            technician=self.other_technician,
            assigned_at=now - timedelta(hours=12),
        )
        TicketResolution.objects.create(
            ticket=other_ticket,
            resolved_by=self.other_technician,
            resolution_summary="Other technician resolution",
        )

        response = self.client.get("/api/technician/completed/statistics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resolved_this_month_attempts"], 2)
        self.assertEqual(response.data["resolved_this_month_tickets"], 2)
        self.assertEqual(response.data["closed_after_my_resolution"], 1)
        self.assertEqual(response.data["reopened_after_my_resolution"], 1)
        self.assertAlmostEqual(response.data["average_resolution_seconds"], 21600, delta=2)
        self.assertEqual(first.resolved_by, self.technician)
