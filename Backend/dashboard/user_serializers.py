from pathlib import Path

from rest_framework import serializers

from tickets.models import Ticket, TicketCategory


MAX_ATTACHMENTS = 5
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_TYPES = {
    ".jpg": ("image/jpeg", lambda header: header.startswith(b"\xff\xd8\xff")),
    ".jpeg": ("image/jpeg", lambda header: header.startswith(b"\xff\xd8\xff")),
    ".png": (
        "image/png",
        lambda header: header.startswith(b"\x89PNG\r\n\x1a\n"),
    ),
    ".pdf": ("application/pdf", lambda header: header.startswith(b"%PDF-")),
}


class UserRecentTicketSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "category",
            "priority",
            "status",
            "created_at",
        )

    def get_category(self, obj):
        return obj.category.name if obj.category_id else "Uncategorized"


class UserTicketDetailSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    assigned_technician = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = (
            "id",
            "ticket_number",
            "title",
            "description",
            "category",
            "location",
            "reported_urgency",
            "priority",
            "status",
            "assigned_technician",
            "attachments",
            "created_at",
            "updated_at",
            "resolved_at",
            "closed_at",
        )

    def get_category(self, obj):
        if obj.category_id is None:
            return None
        return {
            "id": obj.category_id,
            "name": obj.category.name,
            "slug": obj.category.slug,
        }

    def get_assigned_technician(self, obj):
        if obj.assigned_technician_id is None:
            return None
        technician = obj.assigned_technician
        return {
            "id": technician.id,
            "name": technician.get_full_name() or technician.username,
            "specialization": technician.get_technician_specialization_display(),
        }

    def get_attachments(self, obj):
        return [
            {
                "id": attachment.id,
                "original_filename": attachment.original_filename,
                "file_size": attachment.file_size,
                "uploaded_at": attachment.uploaded_at,
                "download_url": (
                    f"/api/user/tickets/{obj.id}/attachments/"
                    f"{attachment.id}/download/"
                ),
            }
            for attachment in obj.attachments.all()
        ]


class UserTicketCreateSerializer(serializers.Serializer):
    title = serializers.CharField(
        min_length=5,
        max_length=180,
        trim_whitespace=True,
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=TicketCategory.objects.filter(is_active=True)
    )
    description = serializers.CharField(
        min_length=20,
        max_length=5000,
        trim_whitespace=True,
    )
    location = serializers.CharField(
        min_length=2,
        max_length=180,
        trim_whitespace=True,
    )
    reported_urgency = serializers.ChoiceField(
        choices=Ticket.ReportedUrgency.choices
    )
    submission_key = serializers.UUIDField()
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
    )

    def validate_title(self, value):
        return " ".join(value.split())

    def validate_description(self, value):
        return value.strip()

    def validate_location(self, value):
        return " ".join(value.split())

    def validate_attachments(self, files):
        if len(files) > MAX_ATTACHMENTS:
            raise serializers.ValidationError(
                f"A maximum of {MAX_ATTACHMENTS} attachments is allowed."
            )
        for upload in files:
            safe_name = Path(upload.name).name
            extension = Path(safe_name).suffix.lower()
            if extension not in ALLOWED_ATTACHMENT_TYPES:
                raise serializers.ValidationError(
                    f"{safe_name}: only JPG, JPEG, PNG, and PDF files are allowed."
                )
            if not upload.size:
                raise serializers.ValidationError(f"{safe_name}: the file is empty.")
            if upload.size > MAX_ATTACHMENT_SIZE:
                raise serializers.ValidationError(
                    f"{safe_name}: files must not exceed 10 MB."
                )
            expected_mime, signature_check = ALLOWED_ATTACHMENT_TYPES[extension]
            header = upload.read(16)
            upload.seek(0)
            if not signature_check(header):
                raise serializers.ValidationError(
                    f"{safe_name}: file contents do not match the selected format."
                )
            if upload.content_type not in (expected_mime, "application/octet-stream"):
                raise serializers.ValidationError(
                    f"{safe_name}: the reported file type is not valid."
                )
            if len(safe_name) > 255:
                raise serializers.ValidationError(
                    f"{safe_name[:40]}...: the filename is too long."
                )
        return files
