from django.contrib import admin

from .models import (
    Ticket,
    TicketAttachment,
    TicketAssignment,
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


@admin.register(TicketAssignment)
class TicketAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "ticket",
        "technician",
        "assigned_by",
        "assigned_at",
        "unassigned_at",
        "is_current",
    )
    list_filter = ("is_current", "assigned_at")
    search_fields = (
        "ticket__ticket_number",
        "ticket__title",
        "technician__email",
    )
    readonly_fields = (
        "ticket",
        "technician",
        "assigned_by",
        "assigned_at",
        "unassigned_at",
        "assignment_notes",
        "reassignment_reason",
        "is_current",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
