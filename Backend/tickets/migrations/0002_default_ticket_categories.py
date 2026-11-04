from django.db import migrations


DEFAULT_CATEGORIES = (
    ("Hardware", "hardware"),
    ("Software", "software"),
    ("Network / Internet", "network-internet"),
    ("Printer / Peripheral", "printer-peripheral"),
    ("Account / Login", "account-login"),
    ("Other", "other"),
)


def create_default_categories(apps, schema_editor):
    category_model = apps.get_model("tickets", "TicketCategory")
    for name, slug in DEFAULT_CATEGORIES:
        category_model.objects.get_or_create(slug=slug, defaults={"name": name})


def remove_default_categories(apps, schema_editor):
    category_model = apps.get_model("tickets", "TicketCategory")
    category_model.objects.filter(
        slug__in=[slug for _, slug in DEFAULT_CATEGORIES],
        tickets__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("tickets", "0001_initial")]

    operations = [
        migrations.RunPython(create_default_categories, remove_default_categories),
    ]
