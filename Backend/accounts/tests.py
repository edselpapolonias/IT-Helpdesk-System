from urllib.parse import parse_qs, urlparse

from django.contrib.auth import authenticate, get_user_model
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from tickets.models import Ticket

from .models import UserAuditLog


User = get_user_model()


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.password = "A-strong-test-password-2026"
        self.admin = User.objects.create_user(
            username="helpdesk-admin",
            email="admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.regular_user = User.objects.create_user(
            username="regular-user",
            email="user@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.technician = User.objects.create_user(
            username="login-technician",
            email="technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
        )

    def test_admin_can_login_and_receive_authenticated_profile(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.admin.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], User.Role.ADMIN)
        self.assertTrue(Token.objects.filter(user=self.admin).exists())

    def test_regular_user_can_login_to_requester_portal(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.regular_user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], User.Role.USER)
        self.assertTrue(Token.objects.filter(user=self.regular_user).exists())

    def test_technician_can_login_to_technician_portal(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.technician.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], User.Role.TECHNICIAN)
        self.assertTrue(Token.objects.filter(user=self.technician).exists())

    def test_invalid_credentials_return_generic_error(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.admin.email, "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "The email or password is incorrect.")

    def test_logout_revokes_token(self):
        token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Token.objects.filter(user=self.admin).exists())


class AdminUserManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="user-manager",
            email="manager@example.test",
            password="Admin-test-password-2026",
            role=User.Role.ADMIN,
        )
        self.technician = User.objects.create_user(
            username="restricted-technician",
            email="technician@example.test",
            password="Technician-test-password-2026",
            role=User.Role.TECHNICIAN,
        )
        self.regular = User.objects.create_user(
            username="existing-user",
            email="existing@example.test",
            password="User-test-password-2026",
            role=User.Role.USER,
            first_name="Existing",
            last_name="User",
            department="Registrar",
            contact_number="+63 912 345 6789",
        )
        self.client.force_authenticate(user=self.admin)

    def test_admin_creates_regular_user_with_unusable_password(self):
        response = self.client.post(
            "/api/admin/users/",
            {
                "first_name": "Ana",
                "last_name": "Santos",
                "email": "ana.santos@example.test",
                "department": "Library",
                "contact_number": "+63 917 123 4567",
                "is_active": True,
                "role": "ADMIN",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="ana.santos@example.test")
        self.assertEqual(user.role, User.Role.USER)
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.account_setup_completed)
        self.assertFalse(response.data["invitation"]["sent"])
        self.assertIn("setup_link", response.data["invitation"])
        self.assertTrue(
            UserAuditLog.objects.filter(
                target_user=user, action=UserAuditLog.Action.CREATE, actor=self.admin
            ).exists()
        )

    def test_duplicate_email_is_rejected_case_insensitively(self):
        response = self.client.post(
            "/api/admin/users/",
            {
                "first_name": "Duplicate",
                "last_name": "Account",
                "email": "EXISTING@example.test",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_regular_user_and_technician_cannot_access_admin_users(self):
        for account in (self.regular, self.technician):
            self.client.force_authenticate(user=account)
            response = self.client.get("/api/admin/users/")
            self.assertEqual(response.status_code, 403)

    def test_list_filters_searches_orders_and_paginates_users(self):
        for index in range(12):
            User.objects.create_user(
                username=f"student-{index}",
                email=f"student-{index}@example.test",
                role=User.Role.USER,
                first_name=f"Student {index:02d}",
                last_name="Tester",
                is_active=index % 2 == 0,
            )
        self.client.force_authenticate(user=self.admin)

        page = self.client.get("/api/admin/users/?status=active&ordering=name")
        search = self.client.get("/api/admin/users/?search=Existing%20User")

        self.assertEqual(page.status_code, 200)
        self.assertEqual(len(page.data["results"]), 7)
        self.assertEqual(search.data["count"], 1)
        self.assertEqual(search.data["results"][0]["email"], self.regular.email)

    def test_statistics_use_only_regular_user_accounts(self):
        self.regular.is_active = False
        self.regular.save(update_fields=("is_active",))

        response = self.client.get("/api/admin/users/statistics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["active"], 0)
        self.assertEqual(response.data["inactive"], 1)
        self.assertEqual(response.data["new"], 1)

    def test_admin_edits_allowed_fields_without_role_escalation(self):
        response = self.client.patch(
            f"/api/admin/users/{self.regular.id}/",
            {
                "department": "Finance",
                "role": "ADMIN",
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.regular.refresh_from_db()
        self.assertEqual(self.regular.department, "Finance")
        self.assertEqual(self.regular.role, User.Role.USER)
        self.assertTrue(self.regular.is_active)

    def test_deactivation_revokes_tokens_and_prevents_authentication(self):
        token = Token.objects.create(user=self.regular)
        response = self.client.post(
            f"/api/admin/users/{self.regular.id}/deactivate/"
        )

        self.assertEqual(response.status_code, 200)
        self.regular.refresh_from_db()
        self.assertFalse(self.regular.is_active)
        self.assertFalse(Token.objects.filter(key=token.key).exists())
        self.assertIsNone(
            authenticate(
                username=self.regular.username,
                password="User-test-password-2026",
            )
        )

    def test_activation_requires_completed_password_setup(self):
        self.regular.set_unusable_password()
        self.regular.account_setup_completed = False
        self.regular.is_active = False
        self.regular.save()

        response = self.client.post(
            f"/api/admin/users/{self.regular.id}/activate/"
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(DEBUG=True, FRONTEND_URL="http://localhost:5173")
    def test_password_setup_link_sets_password_without_plaintext_storage(self):
        create_response = self.client.post(
            "/api/admin/users/",
            {
                "first_name": "Setup",
                "last_name": "User",
                "email": "setup@example.test",
            },
            format="json",
        )
        query = parse_qs(urlparse(create_response.data["invitation"]["setup_link"]).query)
        self.client.force_authenticate(user=None)

        response = self.client.post(
            "/api/auth/setup-password/",
            {
                "uid": query["uid"][0],
                "token": query["token"][0],
                "password": "Secure-setup-password-2026",
                "password_confirm": "Secure-setup-password-2026",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(email="setup@example.test")
        self.assertTrue(user.account_setup_completed)
        self.assertTrue(user.check_password("Secure-setup-password-2026"))

    def test_user_ticket_endpoint_returns_real_statistics(self):
        Ticket.objects.create(
            title="Open request",
            description="Testing user ticket statistics.",
            requester=self.regular,
            status=Ticket.Status.OPEN,
        )
        Ticket.objects.create(
            title="Resolved request",
            description="Testing resolved user tickets.",
            requester=self.regular,
            status=Ticket.Status.RESOLVED,
        )

        response = self.client.get(
            f"/api/admin/users/{self.regular.id}/tickets/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["statistics"]["total"], 2)
        self.assertEqual(response.data["statistics"]["open"], 1)
        self.assertEqual(response.data["statistics"]["resolved"], 1)
