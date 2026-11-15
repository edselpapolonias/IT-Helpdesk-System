"""WSGI compatibility entry point for manually configured hosting services."""

from config.wsgi import application


# Some hosting dashboards default to ``gunicorn app:app``.
app = application
