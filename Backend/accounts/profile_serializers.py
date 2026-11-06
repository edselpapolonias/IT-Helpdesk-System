import re
import struct
import zlib
from pathlib import Path

from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


CONTACT_PATTERN = re.compile(r"^\+?[0-9()\-\s]{7,25}$")
MAX_AVATAR_SIZE = 2 * 1024 * 1024
MAX_AVATAR_DIMENSION = 4096
ALLOWED_AVATAR_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def _valid_png(data):
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False

    offset = 8
    chunks = []
    width = height = None
    idat_parts = []
    expected_size = None

    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_end = offset + 12 + length
        if chunk_end > len(data):
            return False
        payload = data[offset + 8 : offset + 8 + length]
        expected_crc = struct.unpack(">I", data[offset + 8 + length : chunk_end])[0]
        if zlib.crc32(chunk_type + payload) & 0xFFFFFFFF != expected_crc:
            return False
        chunks.append(chunk_type)

        if chunk_type == b"IHDR":
            if len(chunks) != 1 or length != 13:
                return False
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", payload
            )
            channel_counts = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
            valid_depths = {
                0: {1, 2, 4, 8, 16},
                2: {8, 16},
                3: {1, 2, 4, 8},
                4: {8, 16},
                6: {8, 16},
            }
            if (
                width < 1
                or height < 1
                or width > MAX_AVATAR_DIMENSION
                or height > MAX_AVATAR_DIMENSION
                or color_type not in channel_counts
                or bit_depth not in valid_depths[color_type]
                or compression != 0
                or filtering != 0
                or interlace != 0
            ):
                return False
            row_bytes = (width * channel_counts[color_type] * bit_depth + 7) // 8
            expected_size = height * (row_bytes + 1)
        elif chunk_type == b"IDAT":
            idat_parts.append(payload)
        elif chunk_type == b"IEND":
            if length != 0 or chunk_end != len(data):
                return False
            break
        offset = chunk_end

    if not chunks or chunks[0] != b"IHDR" or chunks[-1] != b"IEND" or not idat_parts:
        return False
    try:
        decompressor = zlib.decompressobj()
        decoded = decompressor.decompress(b"".join(idat_parts), expected_size + 1)
        decoded += decompressor.flush()
    except zlib.error:
        return False
    return decompressor.eof and len(decoded) == expected_size


def _valid_jpeg(data):
    if len(data) < 4 or not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
        return False

    offset = 2
    found_dimensions = False
    start_of_frame_markers = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }

    while offset < len(data) - 2:
        if data[offset] != 0xFF:
            return False
        while offset < len(data) and data[offset] == 0xFF:
            offset += 1
        if offset >= len(data):
            return False
        marker = data[offset]
        offset += 1
        if marker == 0xDA:
            return found_dimensions
        if marker in {0x01, *range(0xD0, 0xD9)}:
            continue
        if offset + 2 > len(data):
            return False
        segment_length = struct.unpack(">H", data[offset : offset + 2])[0]
        if segment_length < 2 or offset + segment_length > len(data):
            return False
        if marker in start_of_frame_markers:
            if segment_length < 8:
                return False
            height, width = struct.unpack(">HH", data[offset + 3 : offset + 7])
            if (
                width < 1
                or height < 1
                or width > MAX_AVATAR_DIMENSION
                or height > MAX_AVATAR_DIMENSION
            ):
                return False
            found_dimensions = True
        offset += segment_length
    return False


def validate_avatar_file(upload):
    extension = Path(upload.name).suffix.lower()
    expected_type = ALLOWED_AVATAR_TYPES.get(extension)
    if expected_type is None:
        raise serializers.ValidationError("Upload a JPG, JPEG, or PNG image.")
    if upload.size > MAX_AVATAR_SIZE:
        raise serializers.ValidationError("Profile pictures must be 2 MB or smaller.")
    if getattr(upload, "content_type", None) != expected_type:
        raise serializers.ValidationError("The file type does not match its extension.")

    data = upload.read(MAX_AVATAR_SIZE + 1)
    upload.seek(0)
    is_valid = _valid_png(data) if expected_type == "image/png" else _valid_jpeg(data)
    if not is_valid:
        raise serializers.ValidationError("The uploaded file is not a valid image.")
    return upload


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    account_status = serializers.SerializerMethodField()
    has_avatar = serializers.SerializerMethodField()
    avatar_version = serializers.DateTimeField(
        source="profile_image_updated_at",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "contact_number",
            "department",
            "role",
            "role_display",
            "account_status",
            "date_joined",
            "last_login",
            "has_avatar",
            "avatar_version",
        )
        read_only_fields = fields

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_account_status(self, obj):
        return "Active" if obj.is_active else "Inactive"

    def get_has_avatar(self, obj):
        return bool(obj.profile_image)


class TechnicianProfileSerializer(UserProfileSerializer):
    specialization = serializers.CharField(
        source="technician_specialization",
        read_only=True,
    )
    specialization_display = serializers.CharField(
        source="get_technician_specialization_display",
        read_only=True,
    )

    class Meta(UserProfileSerializer.Meta):
        fields = UserProfileSerializer.Meta.fields + (
            "specialization",
            "specialization_display",
        )


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    allowed_fields = {"first_name", "last_name", "contact_number"}

    class Meta:
        model = User
        fields = ("first_name", "last_name", "contact_number")

    def to_internal_value(self, data):
        disallowed = set(data.keys()) - self.allowed_fields
        if disallowed:
            raise serializers.ValidationError(
                {field: "This account field cannot be changed here." for field in disallowed}
            )
        return super().to_internal_value(data)

    def validate_first_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("First name is required.")
        if len(value) > 150:
            raise serializers.ValidationError("First name must be 150 characters or fewer.")
        return value

    def validate_last_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Last name is required.")
        if len(value) > 150:
            raise serializers.ValidationError("Last name must be 150 characters or fewer.")
        return value

    def validate_contact_number(self, value):
        value = value.strip()
        if value and not CONTACT_PATTERN.fullmatch(value):
            raise serializers.ValidationError(
                "Enter a valid contact number using digits, spaces, parentheses, +, or -."
            )
        return value


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.FileField(write_only=True)

    def validate_avatar(self, value):
        return validate_avatar_file(value)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["user"]
        if not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError(
                {"current_password": "The current password is incorrect."}
            )
        if attrs["new_password"] != attrs["confirm_new_password"]:
            raise serializers.ValidationError(
                {"confirm_new_password": "The new passwords do not match."}
            )
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": "Choose a password different from your current password."}
            )
        try:
            password_validation.validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages}) from exc
        return attrs
