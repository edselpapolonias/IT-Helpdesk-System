from django.contrib import admin

from .models import Ticket, TicketCategory


@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "requester",
        "priority",
        "status",
        "assigned_technician",
        "created_at",
    )
    list_filter = ("status", "priority", "category")
    search_fields = ("title", "description", "requester__email")
    autocomplete_fields = ("requester", "assigned_technician")
