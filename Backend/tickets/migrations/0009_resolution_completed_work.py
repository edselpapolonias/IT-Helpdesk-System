import django.db.models.deletion
from django.db import migrations, models


def preserve_existing_outcomes(apps, schema_editor):
    Ticket = apps.get_model("tickets", "Ticket")
    TicketResolution = apps.get_model("tickets", "TicketResolution")

    for ticket in Ticket.objects.filter(status="CLOSED").iterator():
        latest = TicketResolution.objects.filter(ticket_id=ticket.id).order_by(
            "-resolved_at", "-id"
        ).first()
        if latest is not None:
            latest.closed_at = ticket.closed_at
            latest.save(update_fields=("closed_at",))

    for ticket in Ticket.objects.filter(status="REOPENED").iterator():
        latest = TicketResolution.objects.filter(ticket_id=ticket.id).order_by(
            "-resolved_at", "-id"
        ).first()
        if latest is not None:
            latest.reopened_at = ticket.reopen_requested_at
            latest.reopen_reason = ticket.reopen_reason
            latest.save(update_fields=("reopened_at", "reopen_reason"))


class Migration(migrations.Migration):
    dependencies = [
        ("tickets", "0008_troubleshooting_documentation"),
    ]

    operations = [
        migrations.AddField(
            model_name="ticketresolution",
            name="root_cause",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="actions_performed",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="submission_key",
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="reopened_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="ticketresolution",
            name="reopen_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="ticketattachment",
            name="resolution",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="attachments",
                to="tickets.ticketresolution",
            ),
        ),
        migrations.AddIndex(
            model_name="ticketresolution",
            index=models.Index(
                fields=["resolved_by", "-resolved_at"],
                name="tickets_res_resolver_date_idx",
            ),
        ),
        migrations.RunPython(preserve_existing_outcomes, migrations.RunPython.noop),
    ]
