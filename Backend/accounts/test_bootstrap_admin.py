from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from accounts.models import User


class BootstrapAdminCommandTests(TestCase):
    @patch.dict(
        "os.environ",
        {
            "INITIAL_ADMIN_EMAIL": "admin@spus.edu.ph",
            "INITIAL_ADMIN_PASSWORD": "Strong-Test-Password-2026!",
            "INITIAL_ADMIN_USERNAME": "spus-admin",
        },
        clear=False,
    )
    def test_creates_it_administrator(self):
        call_command("bootstrap_admin", stdout=StringIO())

        user = User.objects.get(email="admin@spus.edu.ph")
        self.assertEqual(user.username, "spus-admin")
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("Strong-Test-Password-2026!"))

    @patch.dict(
        "os.environ",
        {
            "INITIAL_ADMIN_EMAIL": "admin@spus.edu.ph",
            "INITIAL_ADMIN_PASSWORD": "Replacement-Password-2026!",
            "INITIAL_ADMIN_USERNAME": "spus-admin",
        },
        clear=False,
    )
    def test_existing_account_is_promoted_without_resetting_password(self):
        user = User.objects.create_user(
            username="existing-user",
            email="admin@spus.edu.ph",
            password="Original-Password-2026!",
            role=User.Role.USER,
            is_staff=False,
            is_superuser=False,
        )

        call_command("bootstrap_admin", stdout=StringIO())

        user.refresh_from_db()
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("Original-Password-2026!"))

    @patch.dict(
        "os.environ",
        {
            "INITIAL_ADMIN_EMAIL": "",
            "INITIAL_ADMIN_PASSWORD": "",
            "INITIAL_ADMIN_USERNAME": "",
        },
        clear=False,
    )
    def test_skips_when_initial_credentials_are_not_configured(self):
        call_command("bootstrap_admin", stdout=StringIO())
        self.assertFalse(User.objects.exists())
