import base64

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import UserAuditLog


User = get_user_model()
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class TechnicianProfileTests(APITestCase):
    def setUp(self):
        self.media_directory = settings.BASE_DIR / "test_technician_profile_media"
        self.media_directory.mkdir(exist_ok=True)
        self.settings_override = override_settings(MEDIA_ROOT=self.media_directory)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)

        self.password = "Technician-profile-password-2026"
        self.technician = User.objects.create_user(
            username="profile-technician",
            email="profile-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Tala",
            last_name="Santos",
            contact_number="+63 917 111 2233",
            department="IT Operations",
            technician_specialization=User.TechnicianSpecialization.NETWORK,
        )
        self.other_technician = User.objects.create_user(
            username="other-profile-technician",
            email="other-profile-technician@example.test",
            password=self.password,
            role=User.Role.TECHNICIAN,
            first_name="Other",
            last_name="Technician",
            technician_specialization=User.TechnicianSpecialization.HARDWARE,
        )
        self.regular_user = User.objects.create_user(
            username="profile-regular-user",
            email="profile-regular-user@example.test",
            password=self.password,
            role=User.Role.USER,
        )
        self.admin = User.objects.create_user(
            username="profile-technician-admin",
            email="profile-technician-admin@example.test",
            password=self.password,
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.technician)

    def tearDown(self):
        for user in User.objects.exclude(profile_image=""):
            user.profile_image.storage.delete(user.profile_image.name)
        super().tearDown()

    def avatar(self, name="avatar.png", content=PNG_BYTES, content_type="image/png"):
        return SimpleUploadedFile(name, content, content_type=content_type)

    def test_profile_retrieval_contains_professional_and_safe_account_data(self):
        response = self.client.get("/api/technician/profile/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.technician.id)
        self.assertEqual(response.data["role"], User.Role.TECHNICIAN)
        self.assertEqual(
            response.data["specialization"],
            User.TechnicianSpecialization.NETWORK,
        )
        self.assertEqual(response.data["specialization_display"], "Network Support")
        self.assertEqual(response.data["department"], "IT Operations")
        self.assertNotIn("password", response.data)
        self.assertNotIn("username", response.data)

    def test_profile_update_changes_personal_fields_and_records_audit_log(self):
        response = self.client.patch(
            "/api/technician/profile/",
            {
                "first_name": "Updated",
                "last_name": "Technician",
                "contact_number": "+63 918 999 0000",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.technician.refresh_from_db()
        self.assertEqual(self.technician.get_full_name(), "Updated Technician")
        self.assertEqual(self.technician.contact_number, "+63 918 999 0000")
        self.assertTrue(
            UserAuditLog.objects.filter(
                actor=self.technician,
                target_user=self.technician,
                action=UserAuditLog.Action.UPDATE,
            ).exists()
        )

    def test_email_specialization_role_status_and_department_are_read_only(self):
        response = self.client.patch(
            "/api/technician/profile/",
            {
                "email": "changed@example.test",
                "specialization": User.TechnicianSpecialization.SYSTEM_ADMIN,
                "department": "Executive Office",
                "role": User.Role.ADMIN,
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.technician.refresh_from_db()
        self.assertEqual(self.technician.email, "profile-technician@example.test")
        self.assertEqual(
            self.technician.technician_specialization,
            User.TechnicianSpecialization.NETWORK,
        )
        self.assertEqual(self.technician.department, "IT Operations")
        self.assertEqual(self.technician.role, User.Role.TECHNICIAN)
        self.assertTrue(self.technician.is_active)

    def test_profile_endpoint_always_uses_authenticated_technician(self):
        response = self.client.get(
            "/api/technician/profile/",
            {"technician_id": self.other_technician.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.technician.id)
        self.assertNotEqual(response.data["id"], self.other_technician.id)

    def test_non_technicians_and_anonymous_users_cannot_access_profile(self):
        for account, expected_status in (
            (self.regular_user, 403),
            (self.admin, 403),
            (None, 401),
        ):
            self.client.force_authenticate(user=account)
            response = self.client.get("/api/technician/profile/")
            self.assertEqual(response.status_code, expected_status)

    def test_avatar_upload_replacement_download_and_removal(self):
        uploaded = self.client.post(
            "/api/technician/profile/avatar/",
            {"avatar": self.avatar("first.png")},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, 200)
        self.assertTrue(uploaded.data["profile"]["has_avatar"])
        self.assertIn("specialization_display", uploaded.data["profile"])
        self.technician.refresh_from_db()
        first_name = self.technician.profile_image.name

        downloaded = self.client.get("/api/technician/profile/avatar/")
        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(downloaded["Content-Type"], "image/png")
        self.assertEqual(b"".join(downloaded.streaming_content), PNG_BYTES)

        replaced = self.client.post(
            "/api/technician/profile/avatar/",
            {"avatar": self.avatar("replacement.png")},
            format="multipart",
        )
        self.assertEqual(replaced.status_code, 200)
        self.technician.refresh_from_db()
        self.assertNotEqual(self.technician.profile_image.name, first_name)
        self.assertFalse(self.technician.profile_image.storage.exists(first_name))

        removed = self.client.delete("/api/technician/profile/avatar/")
        self.assertEqual(removed.status_code, 200)
        self.assertFalse(removed.data["profile"]["has_avatar"])
        self.assertEqual(
            self.client.get("/api/technician/profile/avatar/").status_code,
            404,
        )

    def test_avatar_validation_rejects_invalid_content_and_file_type(self):
        fake_image = self.client.post(
            "/api/technician/profile/avatar/",
            {"avatar": self.avatar(content=b"not a real image")},
            format="multipart",
        )
        wrong_type = self.client.post(
            "/api/technician/profile/avatar/",
            {"avatar": self.avatar("avatar.gif", content_type="image/gif")},
            format="multipart",
        )

        self.assertEqual(fake_image.status_code, 400)
        self.assertEqual(wrong_type.status_code, 400)
        self.technician.refresh_from_db()
        self.assertFalse(self.technician.profile_image)

    def test_incorrect_current_password_and_mismatch_are_rejected(self):
        incorrect = self.client.post(
            "/api/technician/profile/change-password/",
            {
                "current_password": "incorrect",
                "new_password": "Replacement-technician-password-2026",
                "confirm_new_password": "Replacement-technician-password-2026",
            },
            format="json",
        )
        mismatch = self.client.post(
            "/api/technician/profile/change-password/",
            {
                "current_password": self.password,
                "new_password": "Replacement-technician-password-2026",
                "confirm_new_password": "Different-technician-password-2026",
            },
            format="json",
        )

        self.assertEqual(incorrect.status_code, 400)
        self.assertIn("current_password", incorrect.data)
        self.assertEqual(mismatch.status_code, 400)
        self.assertIn("confirm_new_password", mismatch.data)

    def test_successful_password_change_revokes_token(self):
        token = Token.objects.create(user=self.technician)
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        new_password = "Replacement-technician-password-2026"

        response = self.client.post(
            "/api/technician/profile/change-password/",
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
        self.technician.refresh_from_db()
        self.assertTrue(self.technician.check_password(new_password))
        self.assertEqual(self.client.get("/api/technician/profile/").status_code, 401)
