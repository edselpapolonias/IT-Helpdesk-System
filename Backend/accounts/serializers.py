from rest_framework import serializers

from .models import User


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)


class UserSummarySerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
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
            "email",
            "name",
            "role",
            "has_avatar",
            "avatar_version",
        )

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_has_avatar(self, obj):
        return bool(obj.profile_image)
