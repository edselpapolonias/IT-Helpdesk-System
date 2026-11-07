from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from tickets.models import (
    Ticket,
    TicketAssignment,
    TicketCategory,
    TicketResolution,
)


User = get_user_model()


class ReportsAPITests(APITestCase):
    def setUp(self):
        self.password = "Reports-test-password-2026"
        self.admin = User.objects.create_user(
            username="reports-admin",
            email="reports-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.requester = User.objects.create_user(
            username="reports-requester",
            email="reports-requester@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.tech_one = User.objects.create_user(
            username="reports-tech-one",
            email="reports-tech-one@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Alex",
            last_name="Network",
            technician_specialization=User.TechnicianSpecialization.NETWORK,
        )
        self.tech_two = User.objects.create_user(
            username="reports-tech-two",
            email="reports-tech-two@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Bea",
            last_name="Hardware",
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.network = TicketCategory.objects.create(
            name="Reports Network",
            slug="reports-network",
        )
        self.hardware = TicketCategory.objects.create(
            name="Reports Hardware",
            slug="reports-hardware",
        )
        self.now = timezone.now()
        self.client.force_authenticate(user=self.admin)

    def params(self, **overrides):
        values = {
            "date_range": "custom",
            "date_from": (timezone.localdate() - timedelta(days=29)).isoformat(),
            "date_to": timezone.localdate().isoformat(),
        }
        values.update(overrides)
        return values

    def create_ticket(
        self,
        *,
        age_days=1,
        status=Ticket.Status.OPEN,
        category=None,
        technician=None,
        priority=Ticket.Priority.MEDIUM,
        title="Reports test issue",
        location="Main Campus",
    ):
        ticket = Ticket.objects.create(
            title=title,
            description="Reporting analytics test data.",
            requester=self.requester,
            category=category or self.network,
            priority=priority,
            status=status,
            assigned_technician=technician,
            location=location,
        )
        created_at = self.now - timedelta(days=age_days)
        Ticket.objects.filter(pk=ticket.pk).update(created_at=created_at)
        ticket.refresh_from_db()
        return ticket

    def add_resolution(self, ticket, *, technician=None, age_days=0.5, reopened=False):
        resolved_at = self.now - timedelta(days=age_days)
        resolution = TicketResolution.objects.create(
            ticket=ticket,
            resolved_by=technician or self.tech_one,
            resolution_summary="Issue corrected and verified.",
            actions_performed="Applied and tested the corrective action.",
            resolved_at=resolved_at,
            reopened_at=(resolved_at + timedelta(hours=2) if reopened else None),
            reopen_reason="Issue returned after verification." if reopened else "",
        )
        return resolution

    def test_permissions_protect_analytics_and_exports(self):
        for account, expected in (
            (self.requester, 403),
            (self.tech_one, 403),
            (None, 401),
        ):
            self.client.force_authenticate(user=account)
            self.assertEqual(
                self.client.get("/api/admin/reports/analytics/", self.params()).status_code,
                expected,
            )
            self.assertEqual(
                self.client.get("/api/admin/reports/export/csv/", self.params()).status_code,
                expected,
            )

    def test_metadata_and_filter_validation(self):
        metadata = self.client.get("/api/admin/reports/metadata/")
        reversed_dates = self.client.get(
            "/api/admin/reports/analytics/",
            self.params(
                date_from=timezone.localdate().isoformat(),
                date_to=(timezone.localdate() - timedelta(days=2)).isoformat(),
            ),
        )
        invalid_technician = self.client.get(
            "/api/admin/reports/analytics/",
            self.params(technician=self.requester.id),
        )

        self.assertEqual(metadata.status_code, 200)
        self.assertEqual(len(metadata.data["priorities"]), 4)
        self.assertTrue(any(item["value"] == "last_30_days" for item in metadata.data["date_ranges"]))
        self.assertEqual(reversed_dates.status_code, 400)
        self.assertIn("date_to", reversed_dates.data)
        self.assertEqual(invalid_technician.status_code, 400)

    def test_overview_uses_metric_specific_timestamps(self):
        old_ticket = self.create_ticket(age_days=45, status=Ticket.Status.RESOLVED)
        self.add_resolution(old_ticket, age_days=5)
        cohort_resolved = self.create_ticket(age_days=4, status=Ticket.Status.RESOLVED)
        self.add_resolution(cohort_resolved, age_days=2)
        self.create_ticket(age_days=3, status=Ticket.Status.OPEN)

        response = self.client.get("/api/admin/reports/analytics/", self.params())

        self.assertEqual(response.status_code, 200)
        overview = response.data["overview"]
        self.assertEqual(overview["submitted"], 2)
        self.assertEqual(overview["resolved"], 2)
        self.assertEqual(overview["cohort_resolution_rate"], 50.0)
        self.assertEqual(overview["current_open_backlog"], 1)
        self.assertGreater(overview["average_resolution_seconds"], 0)

    def test_multiple_attempts_preserve_attempt_count_without_double_counting_tickets(self):
        ticket = self.create_ticket(age_days=8, status=Ticket.Status.RESOLVED)
        self.add_resolution(ticket, age_days=6, reopened=True)
        self.add_resolution(ticket, age_days=2)

        response = self.client.get("/api/admin/reports/analytics/", self.params())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["overview"]["resolved"], 1)
        self.assertEqual(response.data["overview"]["resolution_attempts"], 2)
        self.assertEqual(response.data["overview"]["reopened"], 1)
        self.assertEqual(response.data["overview"]["attempt_reopen_rate"], 50.0)

    def test_resolution_credit_uses_resolver_not_current_assignee(self):
        ticket = self.create_ticket(
            age_days=5,
            status=Ticket.Status.RESOLVED,
            technician=self.tech_two,
        )
        self.add_resolution(ticket, technician=self.tech_one, age_days=1)
        TicketAssignment.objects.create(
            ticket=ticket,
            technician=self.tech_two,
            assigned_by=self.admin,
            is_current=True,
        )

        response = self.client.get("/api/admin/reports/analytics/", self.params())

        performance = {
            row["id"]: row for row in response.data["technicians"]["performance"]
        }
        self.assertEqual(performance[self.tech_one.id]["resolved_tickets"], 1)
        self.assertEqual(performance[self.tech_two.id]["resolved_tickets"], 0)
        self.assertEqual(performance[self.tech_two.id]["active_assignments"], 0)

    def test_category_recurring_and_backlog_analytics_use_real_records(self):
        for index in range(3):
            self.create_ticket(
                age_days=16 + index,
                category=self.hardware,
                priority=Ticket.Priority.HIGH,
                title=f"Printer station {index}",
                location="Library",
            )

        response = self.client.get("/api/admin/reports/analytics/", self.params())

        self.assertEqual(response.status_code, 200)
        categories = response.data["categories"]["performance"]
        hardware = next(row for row in categories if row["id"] == self.hardware.id)
        self.assertEqual(hardware["submitted"], 3)
        recurring = response.data["categories"]["recurring"][0]
        self.assertEqual(recurring["location"], "Library")
        self.assertEqual(recurring["count"], 3)
        self.assertEqual(len(recurring["related_tickets"]), 3)
        self.assertEqual(response.data["backlog"]["aging"][-1]["count"], 3)
        self.assertEqual(
            response.data["backlog"]["unassigned"]["never_assigned_current_count"],
            3,
        )

    def test_empty_period_returns_na_ratios_and_reliable_insufficient_data_insight(self):
        response = self.client.get("/api/admin/reports/analytics/", self.params())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["overview"]["submitted"], 0)
        self.assertIsNone(response.data["overview"]["cohort_resolution_rate"])
        self.assertIsNone(response.data["overview"]["average_resolution_seconds"])
        self.assertIn("Insufficient", response.data["insights"][0]["title"])

    def test_csv_export_respects_filters_and_blocks_formula_injection(self):
        self.create_ticket(
            age_days=2,
            category=self.network,
            title="=HYPERLINK(\"https://example.test\")",
        )
        self.create_ticket(age_days=2, category=self.hardware, title="Hardware issue")

        response = self.client.get(
            "/api/admin/reports/export/csv/",
            self.params(category=self.network.slug),
        )
        content = response.content.decode("utf-8-sig")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv; charset=utf-8")
        self.assertIn("'=HYPERLINK", content)
        self.assertNotIn("Hardware issue", content)

    def test_pdf_export_is_a_real_filtered_pdf(self):
        self.create_ticket(age_days=2, category=self.network)

        response = self.client.get("/api/admin/reports/export/pdf/", self.params())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-"))
        self.assertGreater(len(response.content), 2000)

    def test_comparison_and_distribution_percentages_are_consistent(self):
        self.create_ticket(age_days=2, status=Ticket.Status.OPEN)
        self.create_ticket(age_days=3, status=Ticket.Status.RESOLVED)

        response = self.client.get(
            "/api/admin/reports/analytics/",
            self.params(compare="true"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("comparison", response.data["overview"])
        self.assertEqual(response.data["overview"]["comparison"]["submitted"]["previous"], 0)
        percentages = [
            row["percentage"]
            for row in response.data["distributions"]["status"]
            if row["percentage"] is not None
        ]
        self.assertEqual(sum(percentages), 100.0)

    def test_inactive_technician_remains_in_historical_performance(self):
        ticket = self.create_ticket(age_days=4, status=Ticket.Status.RESOLVED)
        self.add_resolution(ticket, technician=self.tech_two, age_days=1)
        self.tech_two.is_active = False
        self.tech_two.save(update_fields=["is_active"])

        response = self.client.get("/api/admin/reports/analytics/", self.params())
        performance = {
            row["id"]: row for row in response.data["technicians"]["performance"]
        }

        self.assertEqual(performance[self.tech_two.id]["resolved_tickets"], 1)
        self.assertFalse(performance[self.tech_two.id]["is_active"])
        self.assertEqual(response.data["overview"]["active_technicians"], 1)
