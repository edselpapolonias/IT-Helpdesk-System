from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class TicketCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "ticket categories"

    def __str__(self):
        return self.name


class Ticket(models.Model):
    class Priority(models.TextChoices):
        CRITICAL = "CRITICAL", "Critical"
        HIGH = "HIGH", "High"
        MEDIUM = "MEDIUM", "Medium"
        LOW = "LOW", "Low"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        ASSIGNED = "ASSIGNED", "Assigned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    title = models.CharField(max_length=180)
    description = models.TextField()
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_tickets",
    )
    category = models.ForeignKey(
        TicketCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    priority = models.CharField(
        max_length=12,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    status = models.CharField(
        max_length=15,
        choices=Status.choices,
        default=Status.OPEN,
    )
    assigned_technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    resolution_due_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "created_at")),
            models.Index(fields=("priority", "status")),
            models.Index(fields=("resolved_at",)),
        ]

    def __str__(self):
        return f"TKT-{self.pk:05d}: {self.title}" if self.pk else self.title

    def clean(self):
        super().clean()
        if self.assigned_technician_id:
            user_model = self.assigned_technician.__class__
            if self.assigned_technician.role != user_model.Role.TECHNICIAN:
                raise ValidationError(
                    {"assigned_technician": "Assigned user must be an IT technician."}
                )

    def save(self, *args, **kwargs):
        if self.status == self.Status.RESOLVED and self.resolved_at is None:
            self.resolved_at = timezone.now()
        super().save(*args, **kwargs)
