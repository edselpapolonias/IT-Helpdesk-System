from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsITAdministrator

from .exports import build_csv, build_pdf
from .filters import DATE_RANGE_OPTIONS, parse_report_filters
from .services import build_report, metadata


class AdminReportsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsITAdministrator]


class ReportsMetadataView(AdminReportsAPIView):
    def get(self, request):
        result = metadata()
        result["date_ranges"] = [
            {"value": value, "label": label} for value, label in DATE_RANGE_OPTIONS
        ]
        result["defaults"] = {"date_range": "last_30_days"}
        return Response(result)


class ReportsAnalyticsView(AdminReportsAPIView):
    def get(self, request):
        filters = parse_report_filters(request.query_params)
        return Response(build_report(filters))


class ReportsCSVExportView(AdminReportsAPIView):
    def get(self, request):
        filters = parse_report_filters(request.query_params)
        response = HttpResponse(build_csv(filters), content_type="text/csv; charset=utf-8")
        filename = f"SAM_IT_Service_Tickets_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["X-Content-Type-Options"] = "nosniff"
        return response


class ReportsPDFExportView(AdminReportsAPIView):
    def get(self, request):
        filters = parse_report_filters(request.query_params)
        content = build_pdf(build_report(filters))
        response = HttpResponse(content, content_type="application/pdf")
        filename = f"SAM_IT_Service_Report_{timezone.localdate().isoformat()}.pdf"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["X-Content-Type-Options"] = "nosniff"
        return response
