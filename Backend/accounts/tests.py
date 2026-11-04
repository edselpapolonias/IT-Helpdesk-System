from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


User = get_user_model()


class AdminAuthenticationTests(APITestCase):
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

    def test_admin_can_login_and_receive_authenticated_profile(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.admin.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["role"], User.Role.ADMIN)
        self.assertTrue(Token.objects.filter(user=self.admin).exists())

    def test_non_admin_cannot_login_to_admin_portal(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.regular_user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Token.objects.filter(user=self.regular_user).exists())

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
