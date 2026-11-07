from django.urls import path

from .views import (
    ReportsAnalyticsView,
    ReportsCSVExportView,
    ReportsMetadataView,
    ReportsPDFExportView,
)


urlpatterns = [
    path("metadata/", ReportsMetadataView.as_view(), name="reports-metadata"),
    path("analytics/", ReportsAnalyticsView.as_view(), name="reports-analytics"),
    path("export/csv/", ReportsCSVExportView.as_view(), name="reports-export-csv"),
    path("export/pdf/", ReportsPDFExportView.as_view(), name="reports-export-pdf"),
]
