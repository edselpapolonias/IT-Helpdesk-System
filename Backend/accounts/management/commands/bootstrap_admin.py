import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import User


class Command(BaseCommand):
    help = "Create the initial IT administrator from deployment variables."

    @transaction.atomic
    def handle(self, *args, **options):
        email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("INITIAL_ADMIN_PASSWORD", "")
        username = os.getenv("INITIAL_ADMIN_USERNAME", "").strip() or email

        if not email and not password:
            self.stdout.write(
                self.style.WARNING(
                    "Initial admin variables are not set; skipping admin bootstrap."
                )
            )
            return

        if not email or not password:
            raise CommandError(
                "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must both be set."
            )

        try:
            validate_email(email)
        except ValidationError as exc:
            raise CommandError(
                "INITIAL_ADMIN_EMAIL is not a valid email address."
            ) from exc

        existing_user = User.objects.filter(email__iexact=email).first()
        if existing_user:
            changed_fields = []
            required_values = {
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "account_setup_completed": True,
            }
            for field_name, required_value in required_values.items():
                if getattr(existing_user, field_name) != required_value:
                    setattr(existing_user, field_name, required_value)
                    changed_fields.append(field_name)

            if changed_fields:
                existing_user.save(update_fields=changed_fields)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Initial IT administrator is ready: {existing_user.email}"
                )
            )
            return

        if User.objects.filter(username__iexact=username).exists():
            raise CommandError(
                "INITIAL_ADMIN_USERNAME is already used by another account."
            )

        candidate_user = User(
            username=username,
            email=email,
            role=User.Role.ADMIN,
            account_setup_completed=True,
        )
        try:
            validate_password(password, candidate_user)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=User.Role.ADMIN,
            account_setup_completed=True,
        )
        self.stdout.write(
            self.style.SUCCESS(f"Created initial IT administrator: {email}")
        )
