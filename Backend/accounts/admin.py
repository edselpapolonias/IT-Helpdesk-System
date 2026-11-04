from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, UserAuditLog


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Helpdesk access",
            {
                "fields": (
                    "role",
                    "department",
                    "contact_number",
                    "technician_specialization",
                    "account_setup_completed",
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Helpdesk access",
            {
                "fields": (
                    "email",
                    "role",
                    "department",
                    "contact_number",
                    "technician_specialization",
                )
            },
        ),
    )
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")


@admin.register(UserAuditLog)
class UserAuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "target_user", "actor", "created_at")
    list_filter = ("action", "created_at")
    search_fields = (
        "target_user__email",
        "target_user__first_name",
        "target_user__last_name",
        "actor__email",
    )
    readonly_fields = ("actor", "target_user", "action", "changes", "created_at")
