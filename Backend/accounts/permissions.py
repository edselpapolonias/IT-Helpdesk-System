from rest_framework.permissions import BasePermission

from .models import User


class IsITAdministrator(BasePermission):
    message = "IT administrator access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.ADMIN
        )


class IsRegularUser(BasePermission):
    message = "Regular user access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.USER
        )


class IsITTechnician(BasePermission):
    message = "IT technician access is required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.TECHNICIAN
        )
