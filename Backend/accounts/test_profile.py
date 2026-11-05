import base64

from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


User = get_user_model()
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class UserProfileTests(APITestCase):
    def setUp(self):
        self.media_directory = settings.BASE_DIR / "test_media"
        self.media_directory.mkdir(exist_ok=True)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_directory)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        self.password = "Original-test-password-2026"
        self.user = User.objects.create_user(
            username="profile-user",
            email="profile@example.test",
            password=self.password,
            role=User.Role.USER,
            first_name="Profile",
            last_name="User",
            department="Registrar",
            contact_number="+63 912 345 6789",
        )
        self.other_user = User.objects.create_user(
            username="other-profile-user",
            email="other-profile@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="profile-admin",
            email="profile-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        for user in User.objects.exclude(profile_image=""):
            user.profile_image.storage.delete(user.profile_image.name)
        super().tearDown()

    def avatar(self, name="avatar.png", content=PNG_BYTES, content_type="image/png"):
        return SimpleUploadedFile(name, content, content_type=content_type)

    def test_profile_retrieval_contains_safe_account_information(self):
        response = self.client.get("/api/user/profile/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["department"], "Registrar")
        self.assertEqual(response.data["role"], User.Role.USER)
        self.assertNotIn("password", response.data)
        self.assertNotIn("username", response.data)

    def test_profile_update_changes_only_permitted_fields(self):
        response = self.client.patch(
            "/api/user/profile/",
            {
                "first_name": "Updated",
                "last_name": "Name",
                "contact_number": "+63 917 000 1122",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.get_full_name(), "Updated Name")
        self.assertEqual(self.user.contact_number, "+63 917 000 1122")

    def test_administrative_profile_fields_are_rejected(self):
        response = self.client.patch(
            "/api/user/profile/",
            {
                "email": "changed@example.test",
                "department": "IT",
                "role": User.Role.ADMIN,
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "profile@example.test")
        self.assertEqual(self.user.department, "Registrar")
        self.assertEqual(self.user.role, User.Role.USER)
        self.assertTrue(self.user.is_active)

    def test_invalid_personal_information_is_rejected(self):
        blank_name = self.client.patch(
            "/api/user/profile/", {"first_name": "   "}, format="json"
        )
        invalid_contact = self.client.patch(
            "/api/user/profile/", {"contact_number": "call-me"}, format="json"
        )

        self.assertEqual(blank_name.status_code, 400)
        self.assertIn("first_name", blank_name.data)
        self.assertEqual(invalid_contact.status_code, 400)
        self.assertIn("contact_number", invalid_contact.data)

    def test_avatar_upload_replacement_download_and_removal(self):
        uploaded = self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar("first.png")},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, 200)
        self.assertTrue(uploaded.data["profile"]["has_avatar"])
        self.user.refresh_from_db()
        first_name = self.user.profile_image.name
        self.assertTrue(self.user.profile_image.storage.exists(first_name))

        downloaded = self.client.get("/api/user/profile/avatar/")
        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(downloaded["Content-Type"], "image/png")
        self.assertEqual(b"".join(downloaded.streaming_content), PNG_BYTES)

        replaced = self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar("replacement.png")},
            format="multipart",
        )
        self.assertEqual(replaced.status_code, 200)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.profile_image.name, first_name)
        self.assertFalse(self.user.profile_image.storage.exists(first_name))

        removed = self.client.delete("/api/user/profile/avatar/")
        self.assertEqual(removed.status_code, 200)
        self.assertFalse(removed.data["profile"]["has_avatar"])
        self.assertEqual(self.client.get("/api/user/profile/avatar/").status_code, 404)

    def test_avatar_validation_checks_size_type_and_real_content(self):
        fake_image = self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar(content=b"not a real image")},
            format="multipart",
        )
        wrong_type = self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar("avatar.gif", content_type="image/gif")},
            format="multipart",
        )
        oversized = self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar(content=b"0" * (2 * 1024 * 1024 + 1))},
            format="multipart",
        )

        self.assertEqual(fake_image.status_code, 400)
        self.assertEqual(wrong_type.status_code, 400)
        self.assertEqual(oversized.status_code, 400)

    def test_avatar_endpoint_never_exposes_another_users_picture(self):
        self.client.force_authenticate(user=self.other_user)
        self.client.post(
            "/api/user/profile/avatar/",
            {"avatar": self.avatar()},
            format="multipart",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/user/profile/avatar/")

        self.assertEqual(response.status_code, 404)

    def test_admin_and_unauthenticated_accounts_cannot_use_regular_user_profile(self):
        self.client.force_authenticate(user=self.admin)
        admin_response = self.client.get("/api/user/profile/")
        self.client.force_authenticate(user=None)
        anonymous_response = self.client.get("/api/user/profile/")

        self.assertEqual(admin_response.status_code, 403)
        self.assertEqual(anonymous_response.status_code, 401)

    def test_incorrect_current_password_and_mismatch_are_rejected(self):
        incorrect = self.client.post(
            "/api/user/profile/change-password/",
            {
                "current_password": "incorrect",
                "new_password": "Replacement-test-password-2026",
                "confirm_new_password": "Replacement-test-password-2026",
            },
            format="json",
        )
        mismatch = self.client.post(
            "/api/user/profile/change-password/",
            {
                "current_password": self.password,
                "new_password": "Replacement-test-password-2026",
                "confirm_new_password": "Different-test-password-2026",
            },
            format="json",
        )

        self.assertEqual(incorrect.status_code, 400)
        self.assertIn("current_password", incorrect.data)
        self.assertEqual(mismatch.status_code, 400)
        self.assertIn("confirm_new_password", mismatch.data)

    def test_django_password_validation_is_enforced(self):
        response = self.client.post(
            "/api/user/profile/change-password/",
            {
                "current_password": self.password,
                "new_password": "123",
                "confirm_new_password": "123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)

    def test_successful_password_change_revokes_token(self):
        token = Token.objects.create(user=self.user)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        new_password = "Replacement-test-password-2026"

        response = self.client.post(
            "/api/user/profile/change-password/",
            {
                "current_password": self.password,
                "new_password": new_password,
                "confirm_new_password": new_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["session_invalidated"])
        self.assertFalse(Token.objects.filter(key=token.key).exists())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
        self.assertEqual(self.client.get("/api/user/profile/").status_code, 401)
