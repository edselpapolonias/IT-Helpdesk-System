from pathlib import Path

from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import NotFound
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, UserAuditLog
from .permissions import IsITTechnician, IsRegularUser
from .profile_serializers import (
    AvatarUploadSerializer,
    ChangePasswordSerializer,
    TechnicianProfileSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated, IsRegularUser]
    profile_serializer_class = UserProfileSerializer

    def get(self, request):
        return Response(self.profile_serializer_class(request.user).data)

    def patch(self, request):
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            serializer = UserProfileUpdateSerializer(
                user,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            changes = {
                field: {"from": getattr(user, field), "to": value}
                for field, value in serializer.validated_data.items()
                if getattr(user, field) != value
            }
            user = serializer.save()
            if changes:
                UserAuditLog.objects.create(
                    actor=user,
                    target_user=user,
                    action=UserAuditLog.Action.UPDATE,
                    changes=changes,
                )
        return Response(self.profile_serializer_class(user).data)


class UserAvatarView(APIView):
    permission_classes = [IsAuthenticated, IsRegularUser]
    parser_classes = [MultiPartParser, FormParser]
    profile_serializer_class = UserProfileSerializer

    def get(self, request):
        user = request.user
        if not user.profile_image:
            raise NotFound("No profile picture is available.")
        try:
            avatar_file = user.profile_image.open("rb")
        except FileNotFoundError as exc:
            raise NotFound("No profile picture is available.") from exc
        extension = Path(user.profile_image.name).suffix.lower()
        content_type = "image/png" if extension == ".png" else "image/jpeg"
        response = FileResponse(avatar_file, content_type=content_type)
        response["Content-Disposition"] = "inline; filename=profile-picture%s" % extension
        response["Cache-Control"] = "private, max-age=300"
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            old_name = user.profile_image.name if user.profile_image else ""
            storage = user.profile_image.storage
            user.profile_image = serializer.validated_data["avatar"]
            user.profile_image_updated_at = timezone.now()
            user.save(update_fields=("profile_image", "profile_image_updated_at"))
            UserAuditLog.objects.create(
                actor=user,
                target_user=user,
                action=UserAuditLog.Action.UPDATE,
                changes={"profile_image": {"from": bool(old_name), "to": True}},
            )
        if old_name and old_name != user.profile_image.name:
            storage.delete(old_name)

        return Response(
            {
                "detail": "Profile picture updated successfully.",
                "profile": self.profile_serializer_class(user).data,
            }
        )

    def delete(self, request):
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            old_name = user.profile_image.name if user.profile_image else ""
            storage = user.profile_image.storage
            user.profile_image = ""
            user.profile_image_updated_at = timezone.now()
            user.save(update_fields=("profile_image", "profile_image_updated_at"))
            if old_name:
                UserAuditLog.objects.create(
                    actor=user,
                    target_user=user,
                    action=UserAuditLog.Action.UPDATE,
                    changes={"profile_image": {"from": True, "to": False}},
                )
        if old_name:
            storage.delete(old_name)

        return Response(
            {
                "detail": "Profile picture removed.",
                "profile": self.profile_serializer_class(user).data,
            }
        )


class UserChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsRegularUser]

    def post(self, request):
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            serializer = ChangePasswordSerializer(
                data=request.data,
                context={"user": user},
            )
            serializer.is_valid(raise_exception=True)
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=("password",))
            Token.objects.filter(user=user).delete()

        return Response(
            {
                "detail": "Password changed successfully. Sign in again with your new password.",
                "session_invalidated": True,
            },
            status=status.HTTP_200_OK,
        )


class TechnicianProfileView(UserProfileView):
    permission_classes = [IsAuthenticated, IsITTechnician]
    profile_serializer_class = TechnicianProfileSerializer


class TechnicianAvatarView(UserAvatarView):
    permission_classes = [IsAuthenticated, IsITTechnician]
    profile_serializer_class = TechnicianProfileSerializer


class TechnicianChangePasswordView(UserChangePasswordView):
    permission_classes = [IsAuthenticated, IsITTechnician]
