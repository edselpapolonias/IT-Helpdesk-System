from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Ticket, TicketAssignment, TicketCategory, TicketStatusHistory


User = get_user_model()


class TechnicianAssignedTicketTests(APITestCase):
    def setUp(self):
        self.password = "Assigned-ticket-password-2026"
        self.admin = User.objects.create_user(
            username="assigned-admin",
            email="assigned-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="assigned-requester",
            email="assigned-requester@example.test",
            password=self.password,
            role=User.Role.USER,
            first_name="Rina",
            last_name="Requester",
            department="Library",
        )
        self.technician = User.objects.create_user(
            username="assigned-technician",
            email="assigned-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.other_technician = User.objects.create_user(
            username="other-assigned-technician",
            email="other-assigned-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )
        self.category = TicketCategory.objects.create(
            name="Assigned Hardware",
            slug="assigned-hardware",
        )
        self.other_category = TicketCategory.objects.create(
            name="Assigned Network",
            slug="assigned-network",
        )
        self.client.force_authenticate(user=self.technician)

    def assign(
        self,
        *,
        technician=None,
        status=Ticket.Status.ASSIGNED,
        priority=Ticket.Priority.MEDIUM,
        category=None,
        title=None,
        assigned_at=None,
    ):
        technician = technician or self.technician
        ticket = Ticket.objects.create(
            title=title or f"{status.title()} assigned ticket",
            description="Technician assigned ticket test description.",
            location="Main Building",
            requester=self.requester,
            category=category or self.category,
            priority=priority,
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

    def reassign_away(self, ticket, assignment):
        changed_at = timezone.now()
        assignment.is_current = False
        assignment.unassigned_at = changed_at
        assignment.save(update_fields=("is_current", "unassigned_at"))
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.other_technician,
            assigned_by=self.admin,
            assigned_at=changed_at,
            is_current=True,
            reassignment_reason="Different specialization required.",
        )
        ticket.assigned_technician = self.other_technician
        ticket.save(update_fields=("assigned_technician", "updated_at"))

    def test_list_contains_only_current_active_assignments_for_request_user(self):
        assigned, _ = self.assign(title="My assigned request")
        progress, _ = self.assign(
            status=Ticket.Status.IN_PROGRESS,
            title="My active work",
        )
        reopened, _ = self.assign(
            status=Ticket.Status.REOPENED,
            title="My reopened work",
        )
        self.assign(
            technician=self.other_technician,
            title="Another technician request",
        )
        self.assign(status=Ticket.Status.RESOLVED, title="Resolved work")
        reassigned, old_assignment = self.assign(title="Reassigned away")
        self.reassign_away(reassigned, old_assignment)

        response = self.client.get("/api/technician/tickets/")

        self.assertEqual(response.status_code, 200)
        ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(ids, {assigned.id, progress.id, reopened.id})

    def test_search_combined_filters_sorting_and_pagination(self):
        now = timezone.now()
        critical, _ = self.assign(
            priority=Ticket.Priority.CRITICAL,
            title="Router failure in library",
            category=self.other_category,
            assigned_at=now - timedelta(days=2),
        )
        self.assign(
            status=Ticket.Status.IN_PROGRESS,
            priority=Ticket.Priority.LOW,
            title="Printer setup",
            assigned_at=now,
        )
        for index in range(10):
            self.assign(
                priority=Ticket.Priority.MEDIUM,
                title=f"Bulk assigned request {index}",
                assigned_at=now - timedelta(hours=index),
            )

        filtered = self.client.get(
            "/api/technician/tickets/",
            {
                "search": "Router failure",
                "priority": "CRITICAL",
                "category": self.other_category.slug,
                "date": "last_7",
                "ordering": "priority",
            },
        )
        requester_search = self.client.get(
            "/api/technician/tickets/", {"search": "Rina Requester"}
        )
        page = self.client.get(
            "/api/technician/tickets/", {"page": 2, "page_size": 5}
        )

        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.data["results"][0]["id"], critical.id)
        self.assertEqual(requester_search.data["count"], 12)
        self.assertEqual(page.status_code, 200)
        self.assertEqual(len(page.data["results"]), 5)

    def test_statistics_use_active_current_assignments(self):
        self.assign(status=Ticket.Status.ASSIGNED, priority=Ticket.Priority.CRITICAL)
        self.assign(status=Ticket.Status.REOPENED)
        self.assign(status=Ticket.Status.IN_PROGRESS)
        self.assign(status=Ticket.Status.RESOLVED, priority=Ticket.Priority.CRITICAL)
        self.assign(technician=self.other_technician, priority=Ticket.Priority.CRITICAL)

        response = self.client.get("/api/technician/tickets/statistics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["active"], 3)
        self.assertEqual(response.data["awaiting_action"], 2)
        self.assertEqual(response.data["in_progress"], 1)
        self.assertEqual(response.data["critical"], 1)

    def test_detail_is_available_only_for_current_owner(self):
        owned, _ = self.assign(title="Owned detail")
        other, _ = self.assign(
            technician=self.other_technician,
            title="Other technician detail",
        )

        owned_response = self.client.get(f"/api/technician/tickets/{owned.id}/")
        other_response = self.client.get(f"/api/technician/tickets/{other.id}/")

        self.assertEqual(owned_response.status_code, 200)
        self.assertEqual(owned_response.data["requester"]["name"], "Rina Requester")
        self.assertEqual(owned_response.data["requester"]["department"], "Library")
        self.assertEqual(other_response.status_code, 404)

    def test_start_work_succeeds_for_assigned_and_reopened_tickets(self):
        assigned, _ = self.assign(status=Ticket.Status.ASSIGNED)
        reopened, _ = self.assign(status=Ticket.Status.REOPENED)

        assigned_response = self.client.post(
            f"/api/technician/tickets/{assigned.id}/start-work/"
        )
        reopened_response = self.client.post(
            f"/api/technician/tickets/{reopened.id}/start-work/"
        )

        self.assertEqual(assigned_response.status_code, 200)
        self.assertEqual(reopened_response.status_code, 200)
        for ticket in (assigned, reopened):
            ticket.refresh_from_db()
            self.assertEqual(ticket.status, Ticket.Status.IN_PROGRESS)
            history = TicketStatusHistory.objects.get(
                ticket=ticket,
                new_status=Ticket.Status.IN_PROGRESS,
            )
            self.assertEqual(history.changed_by, self.technician)
        self.assertFalse(assigned_response.data["ticket"]["can_start_work"])

    def test_invalid_start_work_transition_is_rejected_without_history(self):
        ticket, _ = self.assign(status=Ticket.Status.IN_PROGRESS)

        response = self.client.post(
            f"/api/technician/tickets/{ticket.id}/start-work/"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.data)
        self.assertFalse(TicketStatusHistory.objects.filter(ticket=ticket).exists())

    def test_reassigned_ticket_start_is_rejected_as_conflict(self):
        ticket, assignment = self.assign()
        self.reassign_away(ticket, assignment)

        response = self.client.post(
            f"/api/technician/tickets/{ticket.id}/start-work/"
        )

        self.assertEqual(response.status_code, 409)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.ASSIGNED)
        self.assertEqual(ticket.assigned_technician, self.other_technician)

    def test_non_technicians_are_denied(self):
        ticket, _ = self.assign()
        for account in (self.admin, self.requester):
            self.client.force_authenticate(user=account)
            self.assertEqual(self.client.get("/api/technician/tickets/").status_code, 403)
            self.assertEqual(
                self.client.post(
                    f"/api/technician/tickets/{ticket.id}/start-work/"
                ).status_code,
                403,
            )

    def test_start_work_is_visible_to_admin_and_requester_apis(self):
        ticket, _ = self.assign()
        start = self.client.post(
            f"/api/technician/tickets/{ticket.id}/start-work/"
        )
        self.assertEqual(start.status_code, 200)

        self.client.force_authenticate(user=self.admin)
        admin_detail = self.client.get(f"/api/admin/tickets/{ticket.id}/")
        self.client.force_authenticate(user=self.requester)
        requester_detail = self.client.get(f"/api/user/tickets/{ticket.id}/")

        self.assertEqual(admin_detail.status_code, 200)
        self.assertEqual(admin_detail.data["status"], Ticket.Status.IN_PROGRESS)
        self.assertEqual(requester_detail.status_code, 200)
        self.assertEqual(requester_detail.data["status"], Ticket.Status.IN_PROGRESS)
