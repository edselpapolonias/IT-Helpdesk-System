import csv
from html import escape
from io import BytesIO, StringIO

from django.db.models import DateTimeField, OuterRef, Subquery
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from tickets.models import Ticket, TicketResolution

from .filters import apply_ticket_dimensions


def _csv_safe(value):
    text = "" if value is None else str(value)
    if text.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + text
    return text


def filtered_ticket_rows(filters):
    latest_resolution = TicketResolution.objects.filter(
        ticket_id=OuterRef("pk"),
        resolved_at__lt=filters.end_at,
        resolved_at__gt=OuterRef("created_at"),
    ).order_by("-resolved_at", "-id")
    tickets = apply_ticket_dimensions(
        Ticket.objects.filter(
            created_at__gte=filters.start_at,
            created_at__lt=filters.end_at,
        ),
        filters,
    ).select_related("category", "assigned_technician").annotate(
        report_resolution_at=Subquery(
            latest_resolution.values("resolved_at")[:1],
            output_field=DateTimeField(),
        )
    ).order_by("-created_at")
    for ticket in tickets.iterator(chunk_size=500):
        resolved_at = ticket.report_resolution_at
        duration = resolved_at - ticket.created_at if resolved_at else None
        yield {
            "ticket_number": ticket.ticket_number,
            "title": ticket.title,
            "category": ticket.category.name if ticket.category else "Uncategorized",
            "priority": ticket.get_priority_display(),
            "status": ticket.get_status_display(),
            "submitted_at": timezone.localtime(ticket.created_at).isoformat(),
            "technician": (
                ticket.assigned_technician.get_full_name()
                or ticket.assigned_technician.email
                if ticket.assigned_technician_id
                else "Unassigned"
            ),
            "resolution_at": (
                timezone.localtime(resolved_at).isoformat() if resolved_at else ""
            ),
            "resolution_hours": (
                round(duration.total_seconds() / 3600, 2) if duration else ""
            ),
        }


def build_csv(filters):
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        (
            "Ticket Number",
            "Issue Title",
            "Category",
            "Priority",
            "Status",
            "Date Submitted",
            "Assigned Technician",
            "Resolution Date",
            "Resolution Duration Hours",
        )
    )
    for row in filtered_ticket_rows(filters):
        writer.writerow(
            (
                _csv_safe(row["ticket_number"]),
                _csv_safe(row["title"]),
                _csv_safe(row["category"]),
                row["priority"],
                row["status"],
                row["submitted_at"],
                _csv_safe(row["technician"]),
                row["resolution_at"],
                row["resolution_hours"],
            )
        )
    return "\ufeff" + output.getvalue()


def _duration(value):
    if value is None:
        return "N/A"
    hours = value / 3600
    if hours >= 48:
        return f"{hours / 24:.1f} days"
    return f"{hours:.1f} hours"


def _page_footer(canvas, document):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawString(
        18 * mm,
        10 * mm,
        getattr(document, "generated_label", "SAM IT Service Performance Report"),
    )
    canvas.drawRightString(
        landscape(A4)[0] - 18 * mm,
        10 * mm,
        f"Page {document.page}",
    )
    canvas.restoreState()


def _table(data, widths=None, header=True):
    table = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    commands = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dbe4df")),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f8faf9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#075b35")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    table.setStyle(TableStyle(commands))
    return table


def build_pdf(report):
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="SAM IT Service Performance Report",
        author="St. Paul University Surigao",
    )
    document.generated_label = (
        "Generated "
        + timezone.localtime(report["generated_at"]).strftime("%B %d, %Y %I:%M %p")
    )
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=19,
            leading=23,
            textColor=colors.HexColor("#075b35"),
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f5132"),
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    story = [
        Paragraph("St. Paul University Surigao", styles["ReportTitle"]),
        Paragraph("SAM - IT Helpdesk and Technical Support Management System", styles["Heading2"]),
        Paragraph("IT Service Performance Report", styles["Heading1"]),
        Spacer(1, 4 * mm),
        Paragraph(
            f"Reporting period: {report['filters']['date_from']} to {report['filters']['date_to']}<br/>"
            f"Generated: {timezone.localtime(report['generated_at']).strftime('%B %d, %Y %I:%M %p')}",
            styles["BodyText"],
        ),
        Spacer(1, 4 * mm),
    ]
    applied = [
        f"Category: {report['filters']['category']}",
        f"Priority: {report['filters']['priority']}",
        f"Status: {report['filters']['status']}",
        f"Technician: {report['filters']['technician'] or 'all'}",
    ]
    story.extend(
        [
            Paragraph("Applied filters", styles["SectionTitle"]),
            Paragraph(" | ".join(escape(item) for item in applied), styles["BodyText"]),
            Paragraph("Executive Summary", styles["SectionTitle"]),
        ]
    )
    overview = report["overview"]
    story.append(
        _table(
            [
                ["Submitted", "Resolved", "Cohort resolution rate", "Average first resolution", "Current backlog", "Current unassigned", "Reopened"],
                [
                    overview["submitted"],
                    overview["resolved"],
                    f"{overview['cohort_resolution_rate']}%" if overview["cohort_resolution_rate"] is not None else "N/A",
                    _duration(overview["average_resolution_seconds"]),
                    overview["current_open_backlog"],
                    overview["current_unassigned"],
                    overview["reopened"],
                ],
            ]
        )
    )

    story.extend([Paragraph("Ticket Volume Trends", styles["SectionTitle"])])
    trends = report["trends"]["results"] or []
    story.append(
        _table(
            [["Period", "Submitted", "Resolved"]]
            + [[row["date"], row["submitted"], row["resolved"]] for row in trends[:24]]
        )
    )
    story.extend([Paragraph("Current Status Distribution", styles["SectionTitle"])])
    story.append(
        _table(
            [["Status", "Tickets", "Percentage"]]
            + [
                [
                    row["label"],
                    row["count"],
                    f"{row['percentage']}%" if row["percentage"] is not None else "N/A",
                ]
                for row in report["distributions"]["status"]
            ]
        )
    )
    story.extend([Paragraph("Issue Category Analysis", styles["SectionTitle"])])
    categories = report["categories"]["performance"]
    story.append(
        _table(
            [["Category", "Submitted", "Resolved", "Cohort rate", "Average resolution", "Current backlog"]]
            + [
                [
                    row["name"],
                    row["submitted"],
                    row["resolved"],
                    f"{row['cohort_resolution_rate']}%" if row["cohort_resolution_rate"] is not None else "N/A",
                    _duration(row["average_resolution_seconds"]),
                    row["current_backlog"],
                ]
                for row in categories
            ]
        )
    )
    story.extend([Paragraph("Technician Performance", styles["SectionTitle"])])
    technicians = report["technicians"]["performance"]
    story.append(
        _table(
            [["Technician", "Specialization", "Active assignments", "Resolved tickets", "Average resolution", "Reopened", "Status"]]
            + [
                [
                    row["name"],
                    row["specialization"],
                    row["active_assignments"],
                    row["resolved_tickets"],
                    _duration(row["average_resolution_seconds"]),
                    row["reopened_after_resolution"],
                    "Active" if row["is_active"] else "Inactive",
                ]
                for row in technicians
            ]
        )
    )
    story.extend([PageBreak(), Paragraph("Backlog Analysis", styles["SectionTitle"])])
    backlog = report["backlog"]
    story.append(
        _table(
            [["Aging bucket", "Tickets", "Percentage"]]
            + [[row["label"], row["count"], f"{row['percentage']}%" if row["percentage"] is not None else "N/A"] for row in backlog["aging"]]
        )
    )
    story.extend([Paragraph("Oldest Unresolved Tickets", styles["SectionTitle"])])
    story.append(
        _table(
            [["Ticket", "Issue", "Category", "Priority", "Status", "Technician", "Days open"]]
            + [
                [row["ticket_number"], row["title"], row["category"], row["priority"], row["status"], row["technician"], row["days_open"]]
                for row in backlog["oldest"]
            ]
        )
    )
    story.extend([Paragraph("Key Insights & Recommendations", styles["SectionTitle"])])
    for insight in report["insights"]:
        story.append(
            Paragraph(
                f"<b>{escape(insight['title'])}</b> - {escape(insight['metric'])}<br/>"
                f"{escape(insight['explanation'])}<br/><i>Recommended action:</i> {escape(insight['recommendation'])}",
                styles["BodyText"],
            )
        )
        story.append(Spacer(1, 2 * mm))
    story.extend([Paragraph("Method Notes", styles["SectionTitle"])])
    for limitation in report["limitations"]:
        story.append(Paragraph(f"- {escape(limitation)}", styles["BodyText"]))

    document.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output.getvalue()
