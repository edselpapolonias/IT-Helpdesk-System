from django.contrib import admin

from .models import (
    Ticket,
    TicketAttachment,
    TicketCategory,
    TicketPriorityHistory,
    TicketResolution,
    TicketStatusHistory,
    TroubleshootingLog,
)


@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "ticket_number",
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


admin.site.register(TicketStatusHistory)
admin.site.register(TicketPriorityHistory)
admin.site.register(TroubleshootingLog)
admin.site.register(TicketResolution)
admin.site.register(TicketAttachment)
