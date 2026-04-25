from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.graphics.shapes import Drawing, Rect, String, Line


ROOT = Path("/Users/kkwenuja/development/Revo-infosurv/posMasterV3/posMasterV3")
DOCS = ROOT / "docs"
ASSETS = ROOT / "src" / "frontend" / "assets"
OUTPUT = DOCS / "POSMasterV3_BA_Overview.pdf"

PAGE_W, PAGE_H = A4


class BADocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kwargs):
        super().__init__(filename, **kwargs)
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
        )
        self.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[frame], onPage=self.draw_cover),
                PageTemplate(id="Body", frames=[frame], onPage=self.draw_body),
            ]
        )

    def afterFlowable(self, flowable):
        if hasattr(flowable, "_bookmark_name") and hasattr(flowable, "_heading_level"):
            self.canv.bookmarkPage(flowable._bookmark_name)
            self.canv.addOutlineEntry(
                flowable.getPlainText(),
                flowable._bookmark_name,
                level=flowable._heading_level,
                closed=False,
            )
            self.notify(
                "TOCEntry",
                (
                    flowable._heading_level,
                    flowable.getPlainText(),
                    self.page,
                    flowable._bookmark_name,
                ),
            )

    def handle_pageBegin(self):
        super().handle_pageBegin()
        if self.page == 2:
            self._handle_nextPageTemplate("Body")

    def draw_cover(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor("#e8f1fb"))
        canvas.rect(0, PAGE_H - 62 * mm, PAGE_W, 62 * mm, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor("#1f5aa6"))
        canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#dbeafe"))
        canvas.rect(0, PAGE_H - 15 * mm, PAGE_W, 2 * mm, fill=1, stroke=0)

        canvas.setStrokeColor(colors.HexColor("#bfd4ee"))
        canvas.setLineWidth(0.8)
        for y in [PAGE_H - 72 * mm, PAGE_H - 77 * mm, PAGE_H - 82 * mm]:
            canvas.line(22 * mm, y, PAGE_W - 22 * mm, y)

        canvas.restoreState()

    def draw_body(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor("#f5f9fd"))
        canvas.rect(0, PAGE_H - 15 * mm, PAGE_W, 15 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#d6e4f2"))
        canvas.line(0, PAGE_H - 15 * mm, PAGE_W, PAGE_H - 15 * mm)

        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(colors.HexColor("#123b6b"))
        canvas.drawString(doc.leftMargin, PAGE_H - 9.5 * mm, "POSMaster V3 Business Analysis Overview")

        canvas.setFont("Helvetica", 8.5)
        canvas.setFillColor(colors.HexColor("#4b647d"))
        canvas.drawRightString(PAGE_W - doc.rightMargin, PAGE_H - 9.5 * mm, f"Page {doc.page}")

        canvas.setStrokeColor(colors.HexColor("#d6e4f2"))
        canvas.line(doc.leftMargin, 11 * mm, PAGE_W - doc.rightMargin, 11 * mm)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#6b7f92"))
        canvas.drawString(doc.leftMargin, 7 * mm, "Prepared for business analysis, operational understanding, and requirement discovery")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=25,
        leading=31,
        textColor=colors.HexColor("#123b6b"),
        alignment=TA_CENTER,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSub",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4e6a84"),
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=22,
        spaceBefore=14,
        spaceAfter=6,
        textColor=colors.HexColor("#123b6b"),
        borderWidth=0,
    )
)
styles.add(
    ParagraphStyle(
        name="SubHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=15,
        spaceBefore=8,
        spaceAfter=4,
        textColor=colors.HexColor("#215280"),
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.3,
        leading=13.5,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#223548"),
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyJustify",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.3,
        leading=13.5,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor("#223548"),
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyCenter",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4e6a84"),
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.3,
        leading=11,
        textColor=colors.HexColor("#5d748a"),
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#173d66"),
    )
)


def heading(text, level, idx):
    style = styles["SectionHeading"] if level == 0 else styles["SubHeading"]
    p = Paragraph(text, style)
    p._bookmark_name = f"h_{level}_{idx}"
    p._heading_level = level
    return p


def para(text):
    return Paragraph(text, styles["Body"])


def para_justify(text):
    return Paragraph(text, styles["BodyJustify"])


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["Body"])) for item in items],
        bulletType="bullet",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=7.5,
    )


def card(title, body, bg="#ffffff"):
    t = Table(
        [[Paragraph(title, styles["Callout"])], [Paragraph(body, styles["Body"])]],
        colWidths=[82 * mm],
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#d6e4f2")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def summary_cards():
    t = Table(
        [
            [card("Primary Purpose", "Run branch-level POS and inventory operations in a controlled desktop environment.", "#fafdff"),
             card("Primary Users", "Cashiers, inventory staff, outlet managers, and administrators.", "#fafdff")],
            [card("Business Strengths", "Inventory control, sales execution, user governance, and sync-aware operations.", "#fafdff"),
             card("Deployment Model", "Installed desktop application with online real-time synchronization.", "#fafdff")],
        ],
        colWidths=[86 * mm, 86 * mm],
    )
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6)]))
    return t


def simple_table(rows, widths, header="#123b6b", stripe="#f7fbff", fs=8.8):
    t = Table(rows, colWidths=widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d6e4f2")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor(stripe)]),
                ("FONTSIZE", (0, 0), (-1, -1), fs),
                ("LEADING", (0, 0), (-1, -1), fs + 2),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def module_table():
    rows = [
        ["Module", "What The Business Uses It For", "Primary Users", "Current Maturity View"],
        ["Notifications", "See operational messages, system status, and alerts.", "All logged-in users", "Supportive"],
        ["Inventory", "Maintain items, stock, suppliers, restocking, pricing, and disposal.", "Inventory staff, managers", "Strong"],
        ["Sales", "Process transactions, manage checkout, review history, apply offers/discounts.", "Cashiers, managers", "Strong"],
        ["Users", "Create users, assign roles, and control access.", "Admins, managers", "Strong"],
        ["Settings", "Configure business/application behavior, sync visibility, and updates.", "Admins, managers", "Strong"],
    ]
    return simple_table(rows, [27 * mm, 83 * mm, 35 * mm, 30 * mm])


def actor_table():
    rows = [
        ["Actor", "Business Responsibility", "Likely System Access"],
        ["Cashier", "Perform sales, checkout, hold/retrieve orders, review transaction details.", "Sales, notifications"],
        ["Inventory Staff", "Maintain items, receive stock, track stock movement, update prices, manage suppliers.", "Inventory, notifications"],
        ["Outlet Manager", "Oversee outlet operations, monitor activity, review settings and controlled functions.", "Inventory, sales, settings, users depending on role"],
        ["Administrator", "Manage users, permissions, operational settings, updates, and broader system controls.", "Full system access"],
        ["Business Owner / Operations Lead", "Use outputs for operational oversight and policy decisions.", "Reports, settings, high-level review areas"],
    ]
    return simple_table(rows, [32 * mm, 90 * mm, 53 * mm], header="#215280")


def entity_table():
    rows = [
        ["Entity", "Business Meaning", "Why It Matters"],
        ["Branch", "A store, outlet, or operational location.", "Separates context, stock ownership, and branch-level operations."],
        ["User / Role", "A staff profile and assigned responsibility level.", "Controls who can do what inside the system."],
        ["Item", "A sellable or managed product record.", "Core master data for inventory and sales."],
        ["Stock", "Quantity, batch, pricing, and availability of an item.", "Represents what is actually available to sell or manage."],
        ["Supplier", "Source/vendor for stock purchases.", "Supports procurement and stock intake."],
        ["Restock", "A stock receiving event.", "Updates inventory and creates purchasing traceability."],
        ["Sale", "A completed retail transaction.", "Creates revenue and reduces stock."],
        ["Member", "A customer profile with account/credit relevance.", "Supports named customer handling and balance tracking."],
        ["Offer / Discount", "A pricing rule or promotion.", "Impacts final selling price and revenue behavior."],
        ["Disposed Item", "Inventory removed from usable stock.", "Improves accuracy and auditability."],
    ]
    return simple_table(rows, [29 * mm, 57 * mm, 87 * mm], header="#1f5aa6")


def process_table():
    rows = [
        ["Business Process", "Typical Steps", "Expected Business Outcome"],
        ["Initial setup", "Select configuration folder, choose outlet, initialize startup files, proceed to login.", "Machine becomes ready for outlet operations."],
        ["Inventory setup", "Define categories, UOMs, items, and branch relevance.", "Business can maintain a usable inventory master."],
        ["Restocking", "Select supplier, enter inbound stock, capture quantity and price, save transaction.", "Stock balances increase and replenishment is recorded."],
        ["Sales processing", "Select items, apply pricing or discounts, attach member if needed, confirm payment, complete sale.", "Sale is recorded and stock is reduced."],
        ["User governance", "Create users, assign permissions, enforce session controls.", "Access is controlled and responsibilities are separated."],
    ]
    return simple_table(rows, [33 * mm, 94 * mm, 47 * mm], header="#2b5f8f", stripe="#f7fbff")


def observations_table():
    rows = [
        ["Area", "Observation", "BA Implication"],
        ["Sales reporting", "Reporting area exists but is not fully complete in the current application.", "Treat reporting scope as partial and validate with stakeholders."],
        ["Cloud sync", "Sync is operationally important and visible in system behavior.", "Requirements should define sync ownership, timing, and failure handling."],
        ["Branch context", "Branch is a recurring concept across setup and operations.", "Branch rules should be documented explicitly in requirements."],
        ["Access control", "Roles and permissions are built into route/module access.", "Permission matrices should be captured in BA/UAT artifacts."],
    ]
    return simple_table(rows, [30 * mm, 70 * mm, 74 * mm], header="#8a5a15", stripe="#fffaf3")


def image_row():
    imgs = [
        ASSETS / "Dashboard_inventory.png",
        ASSETS / "Dashboard_sales.png",
        ASSETS / "Dashboard_users.png",
        ASSETS / "Dashboard_settings.png",
    ]
    cells = []
    for img in imgs:
        if img.exists():
            cells.append(Image(str(img), width=18 * mm, height=18 * mm))
    t = Table([cells], colWidths=[42 * mm] * len(cells))
    t.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d6e4f2")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e3edf7")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return t


def flow_diagram(title, steps, accent="#1f5aa6"):
    d = Drawing(180 * mm, 34 * mm)
    d.add(String(0, 29 * mm, title, fontName="Helvetica-Bold", fontSize=10.5, fillColor=colors.HexColor("#173d66")))
    step_w = 31 * mm
    gap = 4 * mm
    y = 7 * mm
    for i, step in enumerate(steps):
        x = i * (step_w + gap)
        fill = colors.HexColor("#ffffff")
        stroke = colors.HexColor(accent)
        d.add(Rect(x, y, step_w, 12 * mm, rx=3, ry=3, fillColor=fill, strokeColor=stroke, strokeWidth=1))
        d.add(String(x + step_w / 2, y + 6 * mm, step, textAnchor="middle", fontName="Helvetica-Bold", fontSize=7, fillColor=colors.HexColor("#23415f")))
        if i < len(steps) - 1:
            x1 = x + step_w
            x2 = x + step_w + gap - 1 * mm
            d.add(Line(x1, y + 6 * mm, x2, y + 6 * mm, strokeColor=colors.HexColor("#7b91a6"), strokeWidth=1))
            d.add(Line(x2 - 1.6 * mm, y + 7 * mm, x2, y + 6 * mm, strokeColor=colors.HexColor("#7b91a6"), strokeWidth=1))
            d.add(Line(x2 - 1.6 * mm, y + 5 * mm, x2, y + 6 * mm, strokeColor=colors.HexColor("#7b91a6"), strokeWidth=1))
    return d


def system_map():
    d = Drawing(180 * mm, 58 * mm)
    center_x = 90 * mm
    center_y = 28 * mm

    d.add(Rect(center_x - 23 * mm, center_y - 8 * mm, 46 * mm, 16 * mm, rx=4, ry=4, fillColor=colors.HexColor("#edf5fc"), strokeColor=colors.HexColor("#1f5aa6"), strokeWidth=1.2))
    d.add(String(center_x, center_y + 2, "POSMaster V3", textAnchor="middle", fontName="Helvetica-Bold", fontSize=12, fillColor=colors.HexColor("#123b6b")))
    d.add(String(center_x, center_y - 4, "Retail operations core", textAnchor="middle", fontName="Helvetica", fontSize=7, fillColor=colors.HexColor("#5b7289")))

    nodes = [
        (15 * mm, 40 * mm, "Cashiers"),
        (15 * mm, 12 * mm, "Inventory Staff"),
        (75 * mm, 48 * mm, "Managers"),
        (145 * mm, 40 * mm, "Cloud Sync"),
        (145 * mm, 12 * mm, "Updates"),
        (75 * mm, 3 * mm, "Suppliers / Members"),
    ]
    for x, y, label in nodes:
        d.add(Rect(x, y, 28 * mm, 10 * mm, rx=3, ry=3, fillColor=colors.white, strokeColor=colors.HexColor("#c2d7ea"), strokeWidth=1))
        d.add(String(x + 14 * mm, y + 3.7 * mm, label, textAnchor="middle", fontName="Helvetica-Bold", fontSize=7.1, fillColor=colors.HexColor("#2a4866")))

    lines = [
        ((43 * mm, 45 * mm), (center_x - 23 * mm, center_y + 5 * mm)),
        ((43 * mm, 17 * mm), (center_x - 23 * mm, center_y - 5 * mm)),
        ((89 * mm, 48 * mm), (center_x, center_y + 8 * mm)),
        ((145 * mm, 45 * mm), (center_x + 23 * mm, center_y + 5 * mm)),
        ((145 * mm, 17 * mm), (center_x + 23 * mm, center_y - 5 * mm)),
        ((89 * mm, 13 * mm), (center_x, center_y - 8 * mm)),
    ]
    for (x1, y1), (x2, y2) in lines:
        d.add(Line(x1, y1, x2, y2, strokeColor=colors.HexColor("#8aa4bb"), strokeWidth=1))
    return d


def cover_story():
    story = []
    logo = ASSETS / "app_logo" / "app_logo.png"
    story.append(Spacer(1, 34 * mm))
    if logo.exists():
        story.append(Image(str(logo), width=26 * mm, height=26 * mm))
        story.append(Spacer(1, 7 * mm))
    story.append(Paragraph("POSMaster V3", styles["CoverTitle"]))
    story.append(Paragraph("Business Analysis Overview", styles["CoverTitle"]))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("A business-facing overview of the system, its users, modules, operational flows, business entities, controls, and current scope boundaries.", styles["CoverSub"]))
    story.append(Spacer(1, 14 * mm))
    story.append(image_row())
    story.append(Spacer(1, 14 * mm))
    story.append(Paragraph("Prepared from the current application structure in the POSMaster V3 repository for Business Analysts, Product Owners, Operations Leads, and implementation stakeholders.", styles["CoverSub"]))
    story.append(Spacer(1, 18 * mm))
    story.append(card("Document Intent", "Provide an easy-to-read, low-technical, business-level understanding of how the system works, what business capabilities it supports, and which areas require further BA clarification.", "#ffffff"))
    story.append(PageBreak())
    return story


def build_pdf():
    doc = BADocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=22 * mm,
        bottomMargin=16 * mm,
        title="POSMaster V3 Business Analysis Overview",
        author="OpenAI Codex",
    )

    story = []
    story.extend(cover_story())

    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(name="TOC1", fontName="Helvetica", fontSize=10, leading=12, leftIndent=10, firstLineIndent=-4, spaceBefore=3, textColor=colors.HexColor("#173d66")),
        ParagraphStyle(name="TOC2", fontName="Helvetica", fontSize=9, leading=11, leftIndent=22, firstLineIndent=-4, spaceBefore=2, textColor=colors.HexColor("#5b7289")),
    ]

    idx = 1
    story.append(heading("Table of Contents", 0, idx)); idx += 1
    story.append(Spacer(1, 3 * mm))
    story.append(toc)
    story.append(PageBreak())

    story.append(heading("Executive Summary", 0, idx)); idx += 1
    story.append(para_justify("POSMaster V3 is a desktop-based point-of-sale and inventory management system intended to support daily retail branch operations. The system combines branch setup, user access control, inventory master maintenance, stock replenishment, sales processing, supplier handling, member/customer support, settings, software update handling, and online real-time synchronization."))
    story.append(para_justify("From a business analysis perspective, the most important takeaway is that this is not just a checkout application. It is an outlet operations platform. The inventory and sales modules form the operational core, while users, settings, and session controls provide the governance layer required to run the business safely and consistently."))
    story.append(Spacer(1, 2 * mm))
    story.append(summary_cards())
    story.append(Spacer(1, 4 * mm))
    story.append(system_map())

    story.append(heading("Document Audit Summary", 0, idx)); idx += 1
    story.append(para_justify("The earlier PDF version was reviewed before this revision. Three practical issues were identified and addressed in this update."))
    story.append(bullets([
        "The first version was too summary-level for business analysis usage and did not explain enough process detail.",
        "The original visual style leaned darker than necessary and was not optimized for print readability or easy scanning.",
        "Several sections described modules, but did not sufficiently explain business purpose, business outcomes, and areas needing further clarification.",
    ]))
    story.append(para_justify("This revised edition uses a white-theme layout, larger whitespace, lighter tables, clearer diagrams, and more explicit business explanations so that it can be used as a stronger BA starting point."))

    story.append(heading("Business Objective and Scope", 0, idx)); idx += 1
    story.append(para_justify("The system appears designed to centralize outlet operations in a single application so that business users can maintain stock, sell products, manage suppliers, control user access, and continue operating even when connectivity is unstable."))
    story.append(bullets([
        "Maintain accurate item and stock records.",
        "Support faster and more controlled point-of-sale transactions.",
        "Track restocking, pricing changes, and inventory adjustments.",
        "Provide role-based access and operational accountability.",
        "Support branch-aware operation with optional data synchronization.",
    ]))

    story.append(heading("Business Users and Actors", 0, idx)); idx += 1
    story.append(actor_table())
    story.append(Spacer(1, 2 * mm))
    story.append(para_justify("The access model in the application suggests that not all users see the same navigation or have the same authority. This matters for BA documentation because role matrices and module permissions will likely be part of future requirement and UAT work."))

    story.append(heading("Functional Scope", 0, idx)); idx += 1
    story.append(module_table())
    story.append(Spacer(1, 3 * mm))
    story.append(image_row())
    story.append(Spacer(1, 3 * mm))
    story.append(para_justify("These modules represent the business-facing shell of the application. Inventory and Sales are the transactional core. Users and Settings provide governance and administration. Notifications appear to function as an operational awareness area rather than as a separate transactional module."))

    story.append(heading("High-Level Business Flows", 0, idx)); idx += 1
    story.append(flow_diagram("Initial Setup and Access", ["First run", "Select outlet", "Create config", "Login", "Open dashboard"]))
    story.append(Spacer(1, 2 * mm))
    story.append(flow_diagram("Inventory Operations", ["Create item", "Restock", "Track stock", "Adjust price", "Review history"], "#2d7a4f"))
    story.append(Spacer(1, 2 * mm))
    story.append(flow_diagram("Sales Operations", ["Select items", "Apply offers", "Checkout", "Record sale", "Update balances"], "#7b5cc4"))
    story.append(Spacer(1, 2 * mm))
    story.append(flow_diagram("Governance and Support", ["Assign roles", "Control access", "Monitor sessions", "Sync", "Update app"], "#9b6b18"))

    story.append(PageBreak())

    story.append(heading("Detailed Module Understanding", 0, idx)); idx += 1
    details = [
        ("Startup and Initial Setup", "The system contains a dedicated startup path before standard login. Business-wise, this means the application expects local outlet configuration before normal use begins. Users choose a configuration folder and an outlet/branch. This indicates that the software is installed and initialized per operating environment rather than being a purely centralized browser application."),
        ("Login and Session Control", "The dashboard is protected behind login, and the application also contains single-session behavior. This means the same user account should not operate freely across multiple devices at once. That is a useful control for accountability, fraud reduction, and preventing shared credentials from being used in parallel."),
        ("Notifications", "Notifications act as a monitoring/support area. They likely communicate operational status, sync state, or important system messages. For a BA, this means the module should be considered part of operational control, not merely a cosmetic dashboard landing page."),
        ("Inventory", "Inventory is the broadest module. It supports viewing items and stock, adding items, recording restocking, maintaining suppliers, updating prices, checking history, running inventory reports, configuring inventory-related data, and tracking disposed items. This suggests the system is intended to support the full operational lifecycle of stock, from master-data setup to ongoing stock movement control."),
        ("Sales", "The sales module supports the main selling workflow. It includes the sale view, transaction history, inventory visibility from the selling side, offers and discounts, and sales configuration. There is also a sales reporting area, but the current codebase indicates that this part is still under development. BA documentation should therefore mark reporting scope as evolving."),
        ("Users", "The user area contains user management and role management. The presence of route-level and navigation-level permission checks means user governance is a deliberate business feature, not a minor administrative tool. This should be reflected in requirement traceability and access-control testing."),
        ("Settings", "Settings combines business and operational controls. This includes app settings, user-level settings, startup behavior, cloud-sync visibility, branch-related behavior, and software update handling. This module is important because it bridges everyday operations with machine-level or deployment-level control."),
    ]
    for title, body in details:
        story.append(heading(title, 1, idx)); idx += 1
        story.append(para_justify(body))

    story.append(heading("Core Business Entities", 0, idx)); idx += 1
    story.append(entity_table())
    story.append(Spacer(1, 2 * mm))
    story.append(para_justify("These entities are the core business objects that BA, QA, and product teams should keep consistent across process documentation, screen mapping, UAT scenarios, and report definitions."))

    story.append(heading("Representative Business Processes", 0, idx)); idx += 1
    story.append(process_table())
    story.append(Spacer(1, 3 * mm))
    story.append(para_justify("The processes above reflect the most visible operational patterns in the application. They are suitable starting points for swimlanes, use cases, and UAT scenarios."))

    story.append(heading("Branch and Operating Model", 0, idx)); idx += 1
    story.append(para_justify("Branch handling appears throughout the system. Startup includes outlet selection, inventory data includes branch relevance, and transactions appear to operate in a branch-aware context. This indicates that branch separation is a core business concept rather than a reporting-only attribute."))
    story.append(para_justify("For business analysis work, branch-specific visibility rules should be captured clearly. Key questions include whether users are tied to one branch, whether branch switching is allowed, and whether stock and transactions are isolated or consolidated across branches."))

    story.append(heading("Cloud Synchronization and Offline Operation", 0, idx)); idx += 1
    story.append(para_justify("The application now operates as an online-first system with real-time synchronization. Business-wise, this means the live service is the source of truth for operational activity."))
    story.append(bullets([
        "Useful in locations with unstable or intermittent internet connectivity.",
        "Reduces operational downtime during network issues.",
        "Introduces BA concerns around source-of-truth ownership and conflict handling.",
        "Makes sync timing and exception handling important requirement topics.",
    ]))

    story.append(heading("Business Controls and Governance", 0, idx)); idx += 1
    story.append(para_justify("Several governance controls are visible in the application and should be treated as business requirements rather than purely technical behavior."))
    story.append(bullets([
        "Protected access to dashboard areas after authentication.",
        "Role- and permission-driven visibility of modules and actions.",
        "Single active session behavior for user accounts.",
        "Controlled access to user administration features.",
        "Visibility of realtime status and operational messages.",
    ]))

    story.append(heading("Current Observations and BA Implications", 0, idx)); idx += 1
    story.append(observations_table())

    story.append(heading("Recommended BA Follow-Up Areas", 0, idx)); idx += 1
    story.append(bullets([
        "Confirm the exact branch operating model and branch-switching rules.",
        "Define the member/customer business model, especially around balances and credit sales.",
        "Clarify discount approval rules and ownership of promotional configuration.",
        "Document return and disposal approval rules, evidence requirements, and audit expectations.",
        "Define mandatory operational reports versus future/planned reports.",
        "Capture the desired sync model, conflict handling rules, and business ownership of synchronized data.",
    ]))

    story.append(heading("Conclusion", 0, idx)); idx += 1
    story.append(para_justify("POSMaster V3 is best understood as a branch-aware retail operations platform rather than a simple billing screen. The application combines inventory control, sales processing, user governance, branch-aware behavior, and operational settings in a single desktop product."))
    story.append(para_justify("For a business analyst, the most important areas to focus on next are branch rules, inventory workflows, sales scenarios, role/permission governance, and sync-related business ownership. This document is now suitable as a more readable and detailed baseline for that next level of BA work."))

    doc.multiBuild(story)


if __name__ == "__main__":
    build_pdf()
    print(f"Created {OUTPUT}")
