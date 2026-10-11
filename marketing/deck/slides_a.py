"""Slides 1-12: the pitch, the product walkthrough, and the manager workspace."""

from kit import *
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR


def s01_title(prs):
    s = slide(prs, INK)
    # The dark field stops short of the right edge; the ledger graphic sits beyond it.
    rect(s, 10.9, 0, W - 10.9, H, fill=INK_SOFT, line=None)

    logo(s, M, 0.92, 2.9, "paper")
    headline(s, "Your entire\nrental portfolio.\nOne place", size=82, top=3.00,
             color=PAPER, width=9.4, line=1.02)
    text(s, M, 7.30, 7.4,
         1.9,
         "A rental operating system for Qatar. Owners, managers, tenants, "
         "leases, cheques and reporting in one connected place.",
         size=25.5, color=DIM2, line=1.42)
    text(s, M, 9.75, 7.0, 0.42, "DOHA  ·  2026", font=MONO, size=21,
         color=DIM, spacing=250)

    # An abstract ledger: rows of figures, some settled, some outstanding.
    rows = [(0.00, 6.10, False), (0.14, 4.95, False), (0.07, 3.60, False),
            (0.28, 6.70, True), (0.03, 4.20, False), (0.17, 2.95, False),
            (0.31, 6.35, True), (0.11, 3.85, False), (0.22, 5.40, False),
            (0.05, 4.60, False), (0.36, 2.40, True), (0.19, 4.05, False),
            (0.08, 3.10, False)]
    y = 2.95
    rule(s, 11.6, y - 0.42, 7.5, color=LIME_DARK, weight=0.03)
    for dx, w, hot in rows:
        rect(s, 11.6 + dx, y, w, 0.105, fill=LIME if hot else RGBColor(0x4A, 0x33, 0x2E),
             line=None)
        y += 0.46
    return s


def s02_problem(prs):
    s = slide(prs)
    head(s, "01", "THE PROBLEM", "Owning property is simple.\nManaging it is not",
         size=78)
    text(s, M, 5.21, 6.49, 1.04,
         "As a portfolio grows, one tenancy is recorded in nine different places.",
         size=24, color=BODY, line=1.30)
    pill_row(s, M, 6.46,
             ["Spreadsheets", "WhatsApp threads", "Email", "Bank statements",
              "Post-dated cheques", "Paper contracts", "Contractors",
              "Accountants", "Property managers"],
             maxw=8.0)

    card(s, 10.17, 5.21, 8.67, 5.12, fill=INK, line=None, radius=0.18)
    text(s, 10.67, 5.67, 8.43, 0.38, "SO THE OWNER HAS TO ASK", font=MONO,
         size=20.25, color=LIME, spacing=150)
    qs = ["Has the rent been paid", "Who is overdue", "Which lease expires next",
          "Why QAR 3,500 was deducted", "Whether the repair was finished",
          "How much is coming this month"]
    for i, q in enumerate(qs):
        text(s, 10.67, 6.22 + i * 0.645, 8.43, 0.48, q, size=23.25, color=PAPER)
    corner(s)
    return s


def s03_idea(prs):
    s = slide(prs)
    head(s, "02", "THE IDEA", "Every event attached to the same record",
         size=60)

    # Ten links will not fit on one line at a readable size, so the chain
    # wraps at the point where the record stops being a thing and starts
    # being money.
    card(s, M, 4.52, CW, 2.00, fill=WHITE, line=BORDER)
    arrow_chain(s, M + 0.46, 4.86,
                ["Owner", "Property", "Building", "Unit", "Tenant"], size=22.5)
    arrow_chain(s, M + 0.46, 5.62,
                ["Lease", "Rent", "Maintenance", "Expenses", "Owner payout"],
                size=22.5)

    w, xs = grid(3)
    items = [("Handled", "The system holds the state, not a person's memory."),
             ("Accounted for", "Every figure traces to a lease, a payment and a date."),
             ("Local", "QAR, Qatari lease terms, cheque cycles, Doha districts.")]
    for x, (title, body) in zip(xs, items):
        card(s, x, 6.75, w, 2.55)
        text(s, x + 0.40, 7.12, w - 0.8, 0.46, title, size=28, color=INK, bold=True)
        text(s, x + 0.40, 7.78, w - 0.8, 1.3, body, size=21.75, color=BODY, line=1.32)
    corner(s)
    return s


def s04_owner_sees(prs):
    s = slide(prs)
    head(s, "03", "WHAT THE OWNER SEES", "The portfolio, in one screen")

    top = 4.48
    stat(s, col_x(0)[0], top, COL, "UNITS", "48", "44 occupied · 4 vacant",
         bar=0.917)
    stat(s, col_x(1)[0], top, COL, "RENT DUE · AUG", "QAR 386,000",
         "Across 44 tenancies")
    stat(s, col_x(2)[0], top, COL, "COLLECTED", "QAR 357,500", "93% of rent due",
         value_color=GREEN)
    stat(s, col_x(3)[0], top, COL, "OUTSTANDING", "QAR 28,500", "4 tenancies",
         value_color=AMBER)

    card(s, M, 8.12, CW, 2.22, fill=INK, line=None, radius=0.18)
    text(s, M + 0.50, 8.54, 3.81, 0.38, "NEEDS ATTENTION", font=MONO, size=20.25,
         color=LIME, spacing=150)
    label_row(s, M + 4.62, 8.50, CW - 5.12,
              ["6 leases expiring before 1 Dec", "4 open work orders",
               "2 transfers awaiting verification"],
              size=22.5, color=PAPER)
    text(s, M + 0.50, 9.50, 12.0, 0.40,
         "Each one opens onto the lease, unit or work order behind it.",
         size=21, color=DIM2)
    corner(s)
    return s


def s05_rent(prs):
    s = slide(prs)
    head(s, "04", "RENT TRACKING", "Every QAR has a position")

    top = 4.40
    # The status column is sized for "Scheduled", the longest word in it.
    cols = [(M + 0.46, 6.2, PP_ALIGN.LEFT), (M + 7.0, 2.5, PP_ALIGN.RIGHT),
            (M + 9.8, 2.5, PP_ALIGN.RIGHT), (M + 12.6, 2.5, PP_ALIGN.RIGHT),
            (M + 15.2, 2.0, PP_ALIGN.RIGHT)]
    heads = ["UNIT · LEASE", "RENT DUE", "RECEIVED", "OUTSTANDING", "STATUS"]
    card(s, M, top, CW, 4.42, fill=WHITE, line=BORDER)
    for (x, w, al), hd in zip(cols, heads):
        text(s, x, top + 0.40, w, 0.38, hd, font=MONO, size=18.75, color=MUTED,
             spacing=120, align=al)
    rule(s, M + 0.46, top + 0.94, CW - 0.92)

    rows = [("Unit 1204 · QA-2026-0417", "9,500", "9,500", "—", "Paid", GREEN),
            ("Unit 0902 · QA-2026-0388", "10,000", "6,000", "4,000", "Due", AMBER),
            ("Unit 0410 · QA-2025-1122", "8,250", "—", "8,250", "Overdue", RED),
            ("Unit 1507 · QA-2026-0451", "12,000", "—", "12,000", "Scheduled", BLUE)]
    y = top + 1.22
    for label, due, recv, out, status, colour in rows:
        text(s, cols[0][0], y, cols[0][1], 0.42, label, size=22.5, color=INK)
        for (x, w, al), v, c in zip(cols[1:4], [due, recv, out],
                                    [INK, GREEN if recv != "—" else MUTED,
                                     colour if out != "—" else MUTED]):
            text(s, x, y, w, 0.42, v, font=MONO, size=22.5, color=c, align=al,
                 bold=True)
        text(s, cols[4][0], y - 0.04, cols[4][1], 0.44, status, font=MONO,
             size=19.5, color=colour, align=PP_ALIGN.RIGHT, bold=True)
        y += 0.84
        if label != rows[-1][0]:
            rule(s, M + 0.46, y - 0.22, CW - 0.92, color=RGBColor(0xF2, 0xEE, 0xEC))

    text(s, M, 9.42, 5.2, 0.38, "NOTHING RECONCILED BY HAND", font=MONO,
         size=19.5, color=MUTED, spacing=150)
    arrow_chain(s, M + 5.4, 9.36,
                ["Tenant", "Unit", "Lease", "Property", "Owner statement"],
                size=21)
    corner(s)
    return s


def s06_payments(prs):
    s = slide(prs)
    head(s, "05", "PAYMENTS", "From cheque to cleared")

    w, xs = grid(3)
    top = 4.45
    blocks = [
        ("Post-dated cheques",
         ["RECEIVED", "STORED", "DUE", "SUBMITTED", "CLEARED", "BOUNCED"],
         "A replacement cheque links to the one it replaces. The chain stays intact.",
         None),
        ("Bank transfers",
         ["SUBMITTED", "VERIFIED", "ALLOCATED"],
         "The tenant uploads the receipt. Maskan matches it to the lease and the month.",
         None),
        ("Digital payments", [],
         "Built to integrate with authorised payment providers when the "
         "portfolio is ready.",
         "ROADMAP · PHASE 02"),
    ]
    CARD_H, BODY_Y = 5.05, 3.78       # body sits at a fixed depth in every card
    for x, (title, states, body, tag) in zip(xs, blocks):
        card(s, x, top, w, CARD_H)
        text(s, x + 0.40, top + 0.42, w - 0.8, 0.46, title, size=27, color=INK,
             bold=True)
        y = top + 1.08
        for st in states:
            colour = RED if st == "BOUNCED" else (GREEN if st == "CLEARED" else MUTED)
            bg = RED_PALE if st == "BOUNCED" else (GREEN_PALE if st == "CLEARED" else SURFACE)
            rect(s, x + 0.40, y, 2.56, 0.38, fill=bg, line=None, radius=0.10)
            text(s, x + 0.40, y + 0.04, 2.56, 0.32, st, font=MONO, size=16.5,
                 color=colour, spacing=130, align=PP_ALIGN.CENTER)
            y += 0.42
        if tag:
            rect(s, x + 0.40, y, 2.9, 0.42, fill=LIME_PALE, line=None, radius=0.10)
            text(s, x + 0.40, y + 0.06, 2.9, 0.32, tag, font=MONO, size=16.5,
                 color=LIME_DARK, spacing=120, align=PP_ALIGN.CENTER)
        text(s, x + 0.40, top + BODY_Y, w - 0.8, 1.0, body,
             size=20.25, color=BODY, line=1.28)

    text(s, M, 9.90, CW, 0.52,
         "Nothing about the way you collect rent has to change on day one.",
         size=26, color=INK, bold=True)
    corner(s)
    return s


def s07_statements(prs):
    s = slide(prs)
    head(s, "06", "OWNER STATEMENTS", "We show the workings")

    top = 4.30
    card(s, M, top, 10.1, 5.70)
    text(s, M + 0.46, top + 0.38, 6.0, 0.38, "STATEMENT · AUGUST 2026",
         font=MONO, size=19.5, color=MUTED, spacing=130)
    text(s, M + 6.6, top + 0.38, 3.0, 0.38, "QAR", font=MONO, size=19.5,
         color=MUTED, spacing=130, align=PP_ALIGN.RIGHT)
    rule(s, M + 0.46, top + 0.90, 9.18)

    lines = [("Gross rent received", "120,000", INK),
             ("Maintenance · 3 work orders", "− 4,500", AMBER),
             ("Property expenses", "− 2,000", AMBER),
             ("Management fee · 5%", "− 6,000", AMBER),
             ("Adjustments", "500", INK)]
    y = top + 1.10
    for label, value, colour in lines:
        text(s, M + 0.46, y, 6.2, 0.42, label, size=22.5, color=INK)
        text(s, M + 5.0, y, 4.64, 0.42, value, font=MONO, size=22.5,
             color=colour, align=PP_ALIGN.RIGHT, bold=True)
        y += 0.64
        rule(s, M + 0.46, y - 0.14, 9.18, color=RGBColor(0xF2, 0xEE, 0xEC))

    rule(s, M + 0.46, y + 0.04, 9.18, color=INK, weight=0.02)
    text(s, M + 0.46, y + 0.28, 6.2, 0.46, "Paid to owner", size=26, color=INK,
         bold=True)
    text(s, M + 4.6, y + 0.22, 5.04, 0.52, "QAR 108,000", font=MONO, size=30,
         color=INK, bold=True, align=PP_ALIGN.RIGHT)
    text(s, M + 0.46, y + 0.88, 7.0, 0.36, "TRANSFERRED 5 SEPTEMBER 2026",
         font=MONO, size=18, color=MUTED, spacing=130)

    rx = M + 10.56
    rw = CW - 10.56
    text(s, rx, top + 0.30, rw, 0.60, "No one has to explain the payout.",
         size=30, color=INK, bold=True)
    text(s, rx, top + 1.30, rw, 1.5,
         "Each line opens onto the unit, invoice or work order behind it. "
         "The same statement is seen by the owner, the manager and the accountant.",
         size=22.5, color=BODY, line=1.34)
    note(s, rx, top + 3.20, rw, 1.90, "EXPORTABLE",
         "PDF statement, or a ledger feed into your accounting software.",
         size=21.75)
    corner(s)
    return s


def s08_maintenance(prs):
    s = slide(prs)
    head(s, "07", "MAINTENANCE", "A work order, not a WhatsApp thread")

    steps = [("01", "Tenant reports the issue"), ("02", "Photos attached to the unit"),
             ("03", "Manager reviews and prices"), ("04", "Vendor assigned with a date"),
             ("05", "Vendor attends the unit"), ("06", "Before and after evidence"),
             ("07", "Invoice uploaded, cost approved"), ("08", "Closed, and on the statement")]
    w, xs = grid(4)
    for i, (num, label) in enumerate(steps):
        x = xs[i % 4]
        y = 4.45 + (i // 4) * 1.74
        card(s, x, y, w, 1.46)
        rect(s, x + 0.32, y + 0.30, 0.52, 0.52, fill=LIME_PALE, line=None, radius=0.14)
        text(s, x + 0.32, y + 0.40, 0.52, 0.34, num, font=MONO, size=19.5,
             color=LIME_DARK, bold=True, align=PP_ALIGN.CENTER)
        text(s, x + 1.04, y + 0.34, w - 1.36, 0.80, label, size=21.75, color=INK,
             line=1.22)

    card(s, M, 8.40, CW, 1.94, fill=INK, line=None, radius=0.18)
    text(s, M + 0.50, 8.82, 3.6, 0.38, "THE OWNER SEES", font=MONO, size=20.25,
         color=LIME, spacing=150)
    label_row(s, M + 4.40, 8.78, CW - 4.90,
              ["What happened", "Who handled it", "Which unit", "What it cost",
               "When it closed"], size=22.5, color=PAPER)
    text(s, M + 0.50, 9.56, 12.0, 0.40,
         "Evidence, cost and dates stay attached to the unit for the life of the asset.",
         size=21, color=DIM2)
    corner(s)
    return s


def s09_leases(prs):
    s = slide(prs)
    head(s, "08", "LEASES", "A renewal is not a surprise")

    fields = ["Tenant", "Lease start", "Lease end", "Rent and schedule", "Deposit",
              "Documents", "Outstanding balance", "Renewal status",
              "Registration status", "Full tenancy history"]
    w, xs = grid(5)
    for i, f in enumerate(fields):
        x = xs[i % 5]
        y = 4.50 + (i // 5) * 1.38
        card(s, x, y, w, 1.20)
        text(s, x + 0.34, y + 0.26, w - 0.68, 0.80, f, size=22.5, color=INK,
             line=1.20)

    card(s, M, 7.52, CW, 2.60, fill=INK, line=None, radius=0.18)
    text(s, M + 0.60, 7.96, 6.0, 0.38, "EXPIRY FLAGGED AT", font=MONO, size=20.25,
         color=LIME, spacing=150)
    x = M + 0.60
    for d in ["120", "90", "60", "30"]:
        rect(s, x, 8.52, 1.34, 1.02, fill=INK_SOFT, line=None, radius=0.14)
        text(s, x, 8.70, 1.34, 0.62, d, font=MONO, size=33, color=LIME,
             bold=True, align=PP_ALIGN.CENTER)
        x += 1.54
    text(s, x + 0.20, 8.82, 10.4, 0.90,
         "days before the lease ends — with the renewal decision recorded against it",
         size=23.25, color=DIM2, line=1.26)
    corner(s)
    return s


def s10_compliance(prs):
    s = slide(prs)
    # Sized to clear the content below on one line rather than wrapping into it.
    head(s, "09", "COMPLIANCE", "Documents ready before they are asked for",
         size=56)

    items = ["Lease registration status", "Registration references", "Tenant documents",
             "Owner documents", "Property documents", "Missing-document alerts",
             "Expiry tracking", "Renewal readiness"]
    w, xs = grid(2)
    left_w = 10.1
    card(s, M, 4.45, left_w, 5.30)
    for i, it in enumerate(items):
        y = 4.88 + i * 0.60
        rect(s, M + 0.46, y + 0.16, 0.14, 0.14, fill=LIME, line=None, radius=0.07)
        text(s, M + 0.86, y, left_w - 1.3, 0.44, it, size=22.5, color=INK)

    rx, rw = M + 10.56, CW - 10.56
    text(s, rx, 4.72, rw, 0.60, "Maskan prepares and tracks.", size=30,
         color=INK, bold=True)
    text(s, rx, 5.62, rw, 1.6,
         "Official registration stays with the authorised government systems. "
         "We hold the operational record that feeds them.",
         size=22.5, color=BODY, line=1.34)
    note(s, rx, 7.55, rw, 2.20, "CONTEXT",
         "Aqarat already provides digital services including rental-contract "
         "registration and market indicators, and continues to expand that "
         "infrastructure.",
         fill=SURFACE, label_color=MUTED, size=21)
    corner(s)
    return s


def s11_roles(prs):
    s = slide(prs)
    head(s, "10", "POSITIONING", "One system for the whole tenancy")

    roles = [("MANAGER", "Operate the portfolio", "30 screens"),
             ("OWNER", "Understand the asset", "10 screens"),
             ("TENANT", "Everything about the home", "7 screens"),
             ("VENDOR", "Manage the work", "Assigned jobs"),
             ("PLATFORM", "Operate the service", "Admin console")]
    w, xs = grid(5)
    for x, (name, line1, line2) in zip(xs, roles):
        card(s, x, 4.50, w, 3.60)
        rect(s, x, 4.50, w, 0.10, fill=LIME, line=None)
        text(s, x + 0.36, 5.05, w - 0.72, 0.40, name, font=MONO, size=21,
             color=INK, spacing=150, bold=True)
        text(s, x + 0.36, 5.70, w - 0.72, 1.2, line1, size=23.25, color=BODY,
             line=1.26)
        text(s, x + 0.36, 7.30, w - 0.72, 0.40, line2, font=MONO, size=18.75,
             color=MUTED, spacing=100)

    card(s, M, 8.54, CW, 1.80, fill=INK, line=None, radius=0.18)
    text(s, M + 0.60, 9.00, 12.0, 0.60, "Five views. One ledger underneath.",
         size=30, color=PAPER, bold=True)
    text(s, M + 0.60, 9.70, 16.4, 0.42,
         "Every role reads the same records. Row-level security in the database "
         "decides which of them each person can see.",
         size=21, color=DIM2)
    corner(s)
    return s


def s12_manager(prs):
    s = slide(prs)
    head(s, "11", "THE MANAGER WORKSPACE", "Thirty screens, four jobs")

    groups = [
        ("PORTFOLIO", ["Properties", "Buildings", "Units", "Vacancy", "Owners"]),
        ("LETTING", ["Leasing pipeline", "Offers", "Offer builder", "Tenants", "Leases"]),
        ("MONEY", ["Payments", "Cheque register", "Take payment", "Outstanding",
                   "Reconciliation", "Ledger", "Expenses", "Statements",
                   "Opening balances"]),
        ("OPERATIONS", ["Maintenance", "Work orders", "Reports", "Settings"]),
    ]
    w, xs = grid(4)
    for x, (name, items) in zip(xs, groups):
        card(s, x, 4.45, w, 5.30)
        rect(s, x + 0.34, 4.82, 1.9, 0.44, fill=LIME_PALE, line=None, radius=0.10)
        text(s, x + 0.34, 4.90, 1.9, 0.32, name, font=MONO, size=16.5,
             color=LIME_DARK, spacing=130, align=PP_ALIGN.CENTER)
        for i, it in enumerate(items):
            text(s, x + 0.34, 5.52 + i * 0.44, w - 0.68, 0.40, it, size=20.25,
                 color=INK)
    corner(s)
    return s
