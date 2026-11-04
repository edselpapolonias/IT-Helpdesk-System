from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "IT Admin"
        TECHNICIAN = "TECHNICIAN", "IT Technician"
        USER = "USER", "User"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER
    )

    email = models.EmailField(unique=True)

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"