from django.urls import path

from .admin_views import TicketCategoryListView


urlpatterns = [
    path("", TicketCategoryListView.as_view(), name="ticket-category-list"),
]
