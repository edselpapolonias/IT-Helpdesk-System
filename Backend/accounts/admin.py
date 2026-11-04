from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Helpdesk access",
            {"fields": ("role", "technician_specialization")},
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Helpdesk access",
            {"fields": ("email", "role", "technician_specialization")},
        ),
    )
    list_display = ("username", "email", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
