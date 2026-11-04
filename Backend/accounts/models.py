from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "IT Admin"
        TECHNICIAN = "TECHNICIAN", "IT Technician"
        USER = "USER", "User"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER
    )

    email = models.EmailField(unique=True)

    technician_specialization = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Primary technical specialization for technician accounts.",
    )

    department = models.CharField(max_length=150, blank=True, default="")
    contact_number = models.CharField(max_length=30, blank=True, default="")
    account_setup_completed = models.BooleanField(
        default=True,
        help_text="Whether the user has created a usable account password.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                name="accounts_user_email_case_insensitive_unique",
            )
        ]

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"


class UserAuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Created"
        UPDATE = "UPDATE", "Updated"
        ACTIVATE = "ACTIVATE", "Activated"
        DEACTIVATE = "DEACTIVATE", "Deactivated"
        PASSWORD_SETUP = "PASSWORD_SETUP", "Password setup completed"

    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_user_actions",
    )
    target_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="account_audit_events",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("target_user", "-created_at"))]

    def __str__(self):
        return f"{self.get_action_display()}: {self.target_user}"
