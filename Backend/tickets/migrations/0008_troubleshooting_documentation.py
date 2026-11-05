import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tickets", "0007_ticketattachment_is_requester_visible_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="troubleshootinglog",
            name="diagnosis",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="troubleshootinglog",
            name="submission_key",
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="ticketattachment",
            name="troubleshooting_log",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="attachments",
                to="tickets.troubleshootinglog",
            ),
        ),
        migrations.AddIndex(
            model_name="troubleshootinglog",
            index=models.Index(
                fields=["technician", "-created_at"],
                name="tickets_tr_tech_created_idx",
            ),
        ),
    ]
