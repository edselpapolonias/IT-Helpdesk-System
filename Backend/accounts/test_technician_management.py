from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from tickets.models import Ticket

from .models import UserAuditLog


User = get_user_model()


class TechnicianManagementAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="technician-manager",
            email="technician-manager@example.test",
            password="Admin-test-password-2026",
            role=User.Role.ADMIN,
        )
        self.regular = User.objects.create_user(
            username="regular-requester",
            email="regular-requester@example.test",
            password="User-test-password-2026",
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="network-technician",
            email="network-technician@example.test",
            password="Technician-test-password-2026",
            role=User.Role.TECHNICIAN,
            first_name="Nora",
            last_name="Reyes",
            technician_specialization=User.TechnicianSpecialization.NETWORK,
            contact_number="+63 917 555 0101",
        )
        self.client.force_authenticate(user=self.admin)

    @override_settings(DEBUG=True, FRONTEND_URL="http://localhost:5173")
    def test_admin_creates_technician_with_secure_setup_link(self):
        response = self.client.post(
            "/api/admin/technicians/",
            {
                "first_name": "Marco",
                "last_name": "Dela Cruz",
                "email": "marco@example.test",
                "contact_number": "+63 912 555 0102",
                "specialization": User.TechnicianSpecialization.HARDWARE,
                "is_active": True,
                "role": User.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        technician = User.objects.get(email="marco@example.test")
        self.assertEqual(technician.role, User.Role.TECHNICIAN)
        self.assertEqual(
            technician.technician_specialization,
            User.TechnicianSpecialization.HARDWARE,
        )
        self.assertFalse(technician.has_usable_password())
        self.assertFalse(technician.account_setup_completed)
        self.assertIn("uid=", response.data["invitation"]["setup_link"])
        self.assertTrue(
            UserAuditLog.objects.filter(
                actor=self.admin,
                target_user=technician,
                action=UserAuditLog.Action.CREATE,
            ).exists()
        )

    def test_duplicate_email_and_invalid_specialization_are_rejected(self):
        duplicate = self.client.post(
            "/api/admin/technicians/",
            {
                "first_name": "Duplicate",
                "last_name": "Email",
                "email": self.regular.email.upper(),
                "specialization": User.TechnicianSpecialization.GENERAL,
            },
            format="json",
        )
        invalid = self.client.post(
            "/api/admin/technicians/",
            {
                "first_name": "Invalid",
                "last_name": "Specialization",
                "email": "invalid-specialization@example.test",
                "specialization": "UNSUPPORTED",
            },
            format="json",
        )

        self.assertEqual(duplicate.status_code, 400)
        self.assertIn("email", duplicate.data)
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("specialization", invalid.data)

    def test_non_admin_accounts_cannot_access_technician_api(self):
        for account in (self.regular, self.technician):
            self.client.force_authenticate(user=account)
            response = self.client.get("/api/admin/technicians/")
            self.assertEqual(response.status_code, 403)

    def test_search_specialization_workload_filter_and_pagination(self):
        for index in range(11):
            User.objects.create_user(
                username=f"support-tech-{index}",
                email=f"support-tech-{index}@example.test",
                role=User.Role.TECHNICIAN,
                first_name=f"Support {index:02d}",
                last_name="Engineer",
                technician_specialization=User.TechnicianSpecialization.SOFTWARE,
            )
        for index in range(4):
            Ticket.objects.create(
                title=f"Moderate workload {index}",
                description="Technician workload filter test.",
                requester=self.regular,
                assigned_technician=self.technician,
                status=Ticket.Status.ASSIGNED,
            )

        page = self.client.get(
            "/api/admin/technicians/?search=Software%20Support&page=1"
        )
        workload = self.client.get(
            "/api/admin/technicians/?workload=moderate"
        )

        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.data["count"], 11)
        self.assertEqual(len(page.data["results"]), 10)
        self.assertEqual(workload.data["count"], 1)
        self.assertEqual(workload.data["results"][0]["id"], self.technician.id)

    def test_editing_cannot_change_role_or_account_status(self):
        response = self.client.patch(
            f"/api/admin/technicians/{self.technician.id}/",
            {
                "specialization": User.TechnicianSpecialization.SYSTEM_ADMIN,
                "role": User.Role.ADMIN,
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.technician.refresh_from_db()
        self.assertEqual(self.technician.role, User.Role.TECHNICIAN)
        self.assertTrue(self.technician.is_active)
        self.assertEqual(
            self.technician.technician_specialization,
            User.TechnicianSpecialization.SYSTEM_ADMIN,
        )

    def test_deactivation_is_blocked_while_active_tickets_exist(self):
        Ticket.objects.create(
            title="Active assignment",
            description="Must be reassigned before deactivation.",
            requester=self.regular,
            assigned_technician=self.technician,
            status=Ticket.Status.IN_PROGRESS,
        )

        response = self.client.post(
            f"/api/admin/technicians/{self.technician.id}/deactivate/"
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["active_ticket_count"], 1)
        self.technician.refresh_from_db()
        self.assertTrue(self.technician.is_active)

    def test_deactivation_without_active_tickets_revokes_token(self):
        token = Token.objects.create(user=self.technician)

        response = self.client.post(
            f"/api/admin/technicians/{self.technician.id}/deactivate/"
        )

        self.assertEqual(response.status_code, 200)
        self.technician.refresh_from_db()
        self.assertFalse(self.technician.is_active)
        self.assertFalse(Token.objects.filter(key=token.key).exists())

    def test_inactive_technician_cannot_receive_new_assignment(self):
        self.technician.is_active = False
        self.technician.save(update_fields=("is_active",))
        ticket = Ticket(
            title="Invalid inactive assignment",
            description="Inactive technicians must not receive new work.",
            requester=self.regular,
            assigned_technician=self.technician,
            status=Ticket.Status.ASSIGNED,
        )

        with self.assertRaises(ValidationError):
            ticket.full_clean()

    def test_statistics_and_dashboard_count_use_real_technicians(self):
        inactive = User.objects.create_user(
            username="inactive-technician",
            email="inactive-technician@example.test",
            role=User.Role.TECHNICIAN,
            technician_specialization=User.TechnicianSpecialization.GENERAL,
            is_active=False,
        )
        Ticket.objects.create(
            title="Assigned ticket",
            description="Active technician statistics test.",
            requester=self.regular,
            assigned_technician=self.technician,
            status=Ticket.Status.ASSIGNED,
        )

        statistics = self.client.get("/api/admin/technicians/statistics/")
        dashboard = self.client.get("/api/admin/dashboard/summary/")

        self.assertEqual(statistics.data["total"], 2)
        self.assertEqual(statistics.data["active"], 1)
        self.assertEqual(statistics.data["inactive"], 1)
        self.assertEqual(statistics.data["with_active_assignments"], 1)
        self.assertEqual(dashboard.data["active_technicians"], 1)
        self.assertIsNotNone(inactive.pk)

    def test_detail_tickets_and_performance_use_real_resolution_data(self):
        active = Ticket.objects.create(
            title="Current incident",
            description="Active ticket list test.",
            requester=self.regular,
            assigned_technician=self.technician,
            status=Ticket.Status.IN_PROGRESS,
        )
        resolved = Ticket.objects.create(
            title="Resolved incident",
            description="Performance duration test.",
            requester=self.regular,
            assigned_technician=self.technician,
            status=Ticket.Status.RESOLVED,
        )
        Ticket.objects.filter(pk=resolved.pk).update(
            created_at=timezone.now() - timedelta(hours=2)
        )

        detail = self.client.get(
            f"/api/admin/technicians/{self.technician.id}/"
        )
        tickets = self.client.get(
            f"/api/admin/technicians/{self.technician.id}/tickets/"
        )
        performance = self.client.get(
            f"/api/admin/technicians/{self.technician.id}/performance/?days=30"
        )

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["total_historical_assignments"], 0)
        self.assertEqual(detail.data["total_current_assignments"], 2)
        self.assertEqual(detail.data["active_assigned_tickets"], 1)
        self.assertEqual(detail.data["resolved_tickets"], 1)
        self.assertEqual(tickets.data["active_tickets"][0]["id"], active.id)
        self.assertTrue(tickets.data["assignment_date_available"])
        self.assertEqual(performance.data["resolved_tickets"], 1)
        self.assertGreater(performance.data["average_resolution_seconds"], 7000)
        self.assertEqual(
            sum(item["resolved"] for item in performance.data["resolution_trend"]),
            1,
        )
