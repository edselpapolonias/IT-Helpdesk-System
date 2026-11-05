import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone


def generate_ticket_number():
    return f"TKT-{timezone.now():%Y}-{uuid.uuid4().hex[:12].upper()}"


def attachment_upload_path(instance, filename):
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"ticket_attachments/{instance.ticket_id}/{uuid.uuid4().hex}.{extension}"


def validate_attachment_size(file):
    maximum_size = 10 * 1024 * 1024
    if file.size > maximum_size:
        raise ValidationError("Attachments must not exceed 10 MB.")


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
        REOPENED = "REOPENED", "Reopened"
        CLOSED = "CLOSED", "Closed"

    class ReportedUrgency(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        URGENT = "URGENT", "Urgent"

    ALLOWED_STATUS_TRANSITIONS = {
        Status.OPEN: {Status.ASSIGNED},
        Status.ASSIGNED: {Status.IN_PROGRESS},
        Status.IN_PROGRESS: {Status.RESOLVED},
        Status.RESOLVED: {Status.REOPENED, Status.CLOSED},
        Status.REOPENED: {Status.ASSIGNED, Status.IN_PROGRESS},
        Status.CLOSED: set(),
    }

    ticket_number = models.CharField(
        max_length=32,
        unique=True,
        editable=False,
        default=generate_ticket_number,
    )
    submission_key = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        editable=False,
    )
    title = models.CharField(max_length=180)
    description = models.TextField()
    location = models.CharField(max_length=180, blank=True, default="")
    reported_urgency = models.CharField(
        max_length=12,
        choices=ReportedUrgency.choices,
        default=ReportedUrgency.NORMAL,
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="requested_tickets",
    )
    category = models.ForeignKey(
        TicketCategory,
        on_delete=models.PROTECT,
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
    closed_at = models.DateTimeField(null=True, blank=True)
    requester_confirmed_at = models.DateTimeField(null=True, blank=True)
    reopen_requested_at = models.DateTimeField(null=True, blank=True)
    reopen_reason = models.TextField(blank=True, default="")
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
        return f"{self.ticket_number}: {self.title}"

    def can_transition_to(self, new_status):
        return new_status in self.ALLOWED_STATUS_TRANSITIONS.get(self.status, set())

    def clean(self):
        super().clean()
        if self.assigned_technician_id:
            user_model = self.assigned_technician.__class__
            if self.assigned_technician.role != user_model.Role.TECHNICIAN:
                raise ValidationError(
                    {"assigned_technician": "Assigned user must be an IT technician."}
                )
            if not self.assigned_technician.is_active:
                raise ValidationError(
                    {
                        "assigned_technician": (
                            "Inactive technicians cannot receive new assignments."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        if self.status == self.Status.RESOLVED and self.resolved_at is None:
            self.resolved_at = timezone.now()
        if self.status == self.Status.CLOSED and self.closed_at is None:
            self.closed_at = timezone.now()
        super().save(*args, **kwargs)


class TicketAssignment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="assignment_history",
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="performed_ticket_assignments",
    )
    assigned_at = models.DateTimeField(default=timezone.now, null=True, blank=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    assignment_notes = models.TextField(blank=True, default="")
    reassignment_reason = models.TextField(blank=True, default="")
    is_current = models.BooleanField(default=True)

    class Meta:
        ordering = ("-assigned_at", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=("ticket",),
                condition=models.Q(is_current=True),
                name="tickets_one_current_assignment_per_ticket",
            )
        ]
        indexes = [
            models.Index(fields=("technician", "is_current")),
            models.Index(fields=("ticket", "-assigned_at")),
        ]

    def __str__(self):
        return f"{self.ticket.ticket_number} assigned to {self.technician}"

    def clean(self):
        super().clean()
        user_model = self.technician.__class__
        if self.technician.role != user_model.Role.TECHNICIAN:
            raise ValidationError({"technician": "Assigned user must be a technician."})
        if self.is_current and not self.technician.is_active:
            raise ValidationError(
                {"technician": "Inactive technicians cannot receive assignments."}
            )
        if self.assigned_by_id and self.assigned_by.role != user_model.Role.ADMIN:
            raise ValidationError(
                {"assigned_by": "Assignments must be performed by an administrator."}
            )


class TicketStatusHistory(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    previous_status = models.CharField(max_length=15, choices=Ticket.Status.choices)
    new_status = models.CharField(max_length=15, choices=Ticket.Status.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_status_changes",
    )
    reason = models.TextField(blank=True, default="")
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("changed_at",)


class TicketPriorityHistory(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="priority_history",
    )
    previous_priority = models.CharField(max_length=12, choices=Ticket.Priority.choices)
    new_priority = models.CharField(max_length=12, choices=Ticket.Priority.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_priority_changes",
    )
    reason = models.TextField(blank=True, default="")
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("changed_at",)


class TroubleshootingLog(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="troubleshooting_logs",
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="troubleshooting_logs",
    )
    action_taken = models.CharField(max_length=220)
    diagnosis = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    is_requester_visible = models.BooleanField(default=False)
    public_notes = models.TextField(blank=True, default="")
    submission_key = models.UUIDField(
        unique=True,
        null=True,
        blank=True,
        editable=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(
                fields=("technician", "-created_at"),
                name="tickets_tr_tech_created_idx",
            ),
        ]

    def clean(self):
        super().clean()
        user_model = self.technician.__class__
        if self.technician.role != user_model.Role.TECHNICIAN:
            raise ValidationError({"technician": "User must be an IT technician."})


class TicketResolution(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="resolutions",
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_resolutions",
    )
    resolution_summary = models.TextField()
    resolved_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("resolved_at",)


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ticket_attachments",
    )
    troubleshooting_log = models.ForeignKey(
        TroubleshootingLog,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    file = models.FileField(
        upload_to=attachment_upload_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=(
                    "png",
                    "jpg",
                    "jpeg",
                    "gif",
                    "webp",
                    "pdf",
                    "txt",
                    "doc",
                    "docx",
                )
            ),
            validate_attachment_size,
        ],
    )
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()
    is_requester_visible = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("uploaded_at",)
