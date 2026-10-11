"""Pages 1-11: the problem, the idea, and the product itself.

Every builder takes the page number and derives its own section number from
it, so removing or reordering a slide renumbers the deck automatically. The
numbers used to be hardcoded in each function, which is a quiet way to hand
a client a deck that jumps from 16 to 18.
"""

from kit import *
from pptx.enum.text import PP_ALIGN


def s_title(prs, n):
    s = slide(prs, INK)
    logo(s, M, 1.30, 2.70, "paper")
    headline(s, "Your entire rental\nportfolio. One place.",
             size=92, top=3.70, color=PAPER, width=14.0, line=1.02)
    lede(s, "A rental operating system for Qatar. Owners, managers, tenants, "
            "leases, cheques and reporting in one connected place.",
         top=7.55, width=11.5, color=ON_INK, size=26)
    text(s, M, 9.70, 10.0, 0.40, "DOHA · 2026", size=LABEL, color=ON_INK_DIM,
         track=260, bold=True)
    return s


def s_problem(prs, n):
    """The statement and the nine places, which used to be two slides."""
    s = slide(prs)
    head(s, f"{n - 1:02d} — The problem",
         "Owning property is simple.\nManaging it is not.", size=62, top=1.90)
    lede(s, "As a portfolio grows, one tenancy ends up recorded in nine "
            "different places — and none of them agree.",
         top=4.25, width=13.0, size=24)

    places = ["Spreadsheets", "WhatsApp threads", "Email",
              "Bank statements", "Post-dated cheques", "Paper contracts",
              "Contractors", "Accountants", "Property managers"]
    w, xs = col(3, gap=0.9)
    for i, place in enumerate(places):
        x = xs[i % 3]
        y = 5.75 + (i // 3) * 1.18
        rule(s, x, y, w, color=INK)
        text(s, x, y + 0.26, w, 0.55, place, size=24, color=INK)

    rule(s, M, 9.05, CW)
    text(s, M, 9.40, CW, 0.60,
         "So someone has to ask: has the rent been paid, who is overdue, "
         "which lease expires next, why QAR 3,500 was deducted.",
         size=21, color=BODY)
    page_mark(s, n)
    return s


def s_idea(prs, n):
    s = slide(prs, INK)
    eyebrow(s, f"{n - 1:02d} — The idea", color=ON_INK_DIM)
    headline(s, "Every event attached\nto the same record.",
             size=80, top=2.90, color=PAPER, line=1.04)

    chain = ["Owner", "Property", "Building", "Unit", "Tenant",
             "Lease", "Rent", "Maintenance", "Expenses", "Payout"]
    w, xs = col(5, gap=0.42)
    for i, item in enumerate(chain):
        x = xs[i % 5]
        y = 7.30 + (i // 5) * 1.10
        rule(s, x, y, w, color=INK_SOFT, weight=0.012)
        text(s, x, y + 0.24, w, 0.46, item, size=22, color=PAPER)
    page_mark(s, n, dark=True)
    return s


def s_dashboard(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — The workspace")
    headline(s, "Monday morning, answered", size=H2, top=1.86)
    caption(s, "Everything outstanding, everything expiring, everything "
               "awaiting a decision — on the screen that opens first.",
            top=2.90, size=23, color=BODY, width=13.0)
    picture(s, "dashboard-wide", M, 4.15, CW, 6.40)
    page_mark(s, n)
    return s


def s_rent(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Rent tracking")
    headline(s, "Every riyal has a position", size=H2, top=1.86)

    top = 3.50
    cols = [(M, 5.8, PP_ALIGN.LEFT), (M + 6.2, 2.5, PP_ALIGN.RIGHT),
            (M + 9.0, 2.5, PP_ALIGN.RIGHT), (M + 11.8, 2.5, PP_ALIGN.RIGHT),
            (M + 14.6, 2.2, PP_ALIGN.RIGHT)]
    for (x, w, al), h in zip(cols, ["Unit and lease", "Rent due", "Received",
                                    "Outstanding", "Status"]):
        text(s, x, top, w, 0.36, h.upper(), size=LABEL, color=MUTED,
             track=140, align=al, bold=True)
    rule(s, M, top + 0.62, CW, color=INK)

    rows = [("Unit 1204 · QA-2026-0417", "9,500", "9,500", "—", GREEN, "Paid"),
            ("Unit 0902 · QA-2026-0388", "10,000", "6,000", "4,000", AMBER, "Due"),
            ("Unit 0410 · QA-2025-1122", "8,250", "—", "8,250", RED, "Overdue"),
            ("Unit 1507 · QA-2026-0451", "12,000", "—", "12,000", MUTED, "Scheduled")]
    y = top + 1.00
    for i, (label, due, recv, out, colour, status) in enumerate(rows):
        text(s, cols[0][0], y, cols[0][1], 0.50, label, size=23, color=INK)
        for (x, w, al), v, c in zip(cols[1:4], [due, recv, out],
                                    [INK, GREEN if recv != "—" else MUTED, colour]):
            text(s, x, y, w, 0.50, v, font=DISPLAY, size=23, color=c,
                 align=al, bold=True)
        text(s, cols[4][0], y + 0.04, cols[4][1], 0.50, status, size=SMALL,
             color=colour, align=PP_ALIGN.RIGHT)
        y += 0.98
        if i < len(rows) - 1:
            rule(s, M, y - 0.26, CW)

    rule(s, M, 8.90, CW, color=INK)
    text(s, M, 9.22, CW, 0.60,
         "Nothing reconciled by hand. Every figure traces from the tenant to "
         "the unit, the lease, the property and the owner statement.",
         size=21, color=BODY)
    page_mark(s, n)
    return s


def s_cheques(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Payments")
    headline(s, "Built for how Qatar\nactually pays rent.", size=62, top=2.00,
             width=7.6, line=1.06)
    text(s, M, 5.40, 7.2, 2.6,
         "Post-dated cheques are tracked from received to cleared, and a "
         "replacement links to the cheque it replaces so the chain stays "
         "intact. Bank transfers are matched to the lease and the month.",
         size=22, color=BODY, line=1.44)
    text(s, M, 8.40, 7.2, 0.90,
         "Nothing about the way you collect rent has to change on day one.",
         font=DISPLAY, size=26, color=INK, bold=True, line=1.24)
    picture(s, "cheques", 9.55, 2.95, 9.05, 6.40)
    page_mark(s, n)
    return s


def s_statements(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Owner statements")
    headline(s, "We show the workings", size=H2, top=1.86)

    top = 3.40
    text(s, M, top, 7.6, 0.36, "STATEMENT · AUGUST 2026", size=LABEL,
         color=MUTED, track=140, bold=True)
    rule(s, M, top + 0.56, 7.6, color=INK)
    y = pairs(s, M, top + 0.92, 7.6,
              [("Gross rent received", "120,000", INK),
               ("Maintenance · 3 work orders", "−4,500", AMBER),
               ("Property expenses", "−2,000", AMBER),
               ("Management fee · 5%", "−6,000", AMBER),
               ("Adjustments", "500", INK)],
              size=22, gap=0.78, val_font=DISPLAY, key_w=5.0)
    rule(s, M, y + 0.04, 7.6, color=INK)
    text(s, M, y + 0.34, 3.6, 0.56, "Paid to owner", font=DISPLAY, size=26,
         color=INK, bold=True)
    text(s, M + 3.6, y + 0.28, 4.0, 0.62, "QAR 108,000", font=DISPLAY,
         size=30, color=INK, bold=True, align=PP_ALIGN.RIGHT)
    text(s, M, y + 1.06, 7.6, 0.36, "TRANSFERRED 5 SEPTEMBER 2026",
         size=LABEL, color=MUTED, track=120, bold=True)

    rx = M + 8.80
    rw = CW - 8.80
    text(s, rx, top, rw, 1.10, "No one has to explain the payout.",
         font=DISPLAY, size=32, color=INK, bold=True, line=1.20)
    text(s, rx, top + 1.30, rw, 2.0,
         "Each line opens onto the unit, invoice or work order behind it, and "
         "the owner, the manager and the accountant all read the same "
         "statement. Exports as a PDF, or as a ledger feed into your "
         "accounting software.",
         size=22, color=BODY, line=1.44)
    picture(s, "statements", rx, top + 3.70, rw, 3.70, align="left")
    page_mark(s, n)
    return s


def s_maintenance(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Maintenance")
    headline(s, "A work order, not a WhatsApp thread", size=H2, top=1.86)
    caption(s, "Every repair carries its own evidence, from the first "
               "photograph to the invoice on the owner's statement.",
            top=2.90, size=23, color=BODY, width=13.0)

    steps(s, M, 4.10, CW,
          ["Tenant reports the issue",
           "Photos attached to the unit",
           "Manager reviews and prices",
           "Vendor assigned with a date",
           "Vendor attends the unit",
           "Before and after evidence",
           "Invoice uploaded and approved",
           "Closed, and on the statement"],
          cols=4, rowgap=2.05)

    rule(s, M, 9.10, CW, color=INK)
    text(s, M, 9.44, CW, 0.56,
         "The owner sees what happened, who handled it, which unit, what it "
         "cost and when it closed.",
         size=21, color=BODY)
    page_mark(s, n)
    return s


def s_leases(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Leases and renewals")
    headline(s, "A renewal is not a surprise", size=H2, top=1.86)

    text(s, M, 3.40, 7.4, 0.40, "HELD AGAINST EVERY TENANCY", size=LABEL,
         color=MUTED, track=140, bold=True)
    listing(s, M, 4.00, 7.4,
            ["Tenant, lease start and lease end", "Rent and payment schedule",
             "Deposit held", "Documents and registration status",
             "Outstanding balance", "Renewal decision and history"],
            size=22, gap=0.78)

    rx = M + 8.80
    rw = CW - 8.80
    text(s, rx, 3.40, rw, 0.40, "EXPIRY FLAGGED AT", size=LABEL, color=MUTED,
         track=140, bold=True)
    dw = (rw - 3 * 0.34) / 4
    for i, d in enumerate(["120", "90", "60", "30"]):
        x = rx + i * (dw + 0.34)
        rule(s, x, 4.10, dw, color=INK)
        text(s, x, 4.34, dw, 1.10, d, font=DISPLAY, size=56, color=INK,
             bold=True, line=1.0)
        text(s, x, 5.50, dw, 0.36, "DAYS", size=LABEL, color=MUTED, track=120,
             bold=True)
    text(s, rx, 6.40, rw, 1.40,
         "…before the lease ends, with the renewal decision recorded against "
         "the tenancy rather than remembered by a person.",
         size=22, color=BODY, line=1.44)
    page_mark(s, n)
    return s


def s_compliance(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Compliance")
    headline(s, "Documents ready\nbefore they are\nasked for.", size=58,
             top=1.95, width=8.2, line=1.08)
    text(s, M, 5.50, 7.6, 2.4,
         "Maskan prepares and tracks. Official registration stays with the "
         "authorised government systems — we hold the operational record "
         "that feeds them.",
         size=22, color=BODY, line=1.44)
    rule(s, M, 7.80, 7.6)
    text(s, M, 8.10, 7.6, 1.5,
         "Aqarat already provides digital services including rental-contract "
         "registration and market indicators, and continues to expand that "
         "infrastructure.",
         size=SMALL, color=MUTED, line=1.42)

    rx = M + 9.00
    rw = CW - 9.00
    listing(s, rx, 2.30, rw,
            ["Lease registration status", "Registration references",
             "Tenant documents", "Owner documents", "Property documents",
             "Missing-document alerts", "Expiry tracking",
             "Renewal readiness"],
            size=23, gap=0.86)
    page_mark(s, n)
    return s


def s_roles(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Positioning")
    headline(s, "One system for the whole tenancy", size=H2, top=1.86)

    # Role names carry no possessive. The reader may be the managing agent
    # or may be the landlord themselves, and "your owners" shuts the second
    # one out of their own deck.
    roles = [("Staff", "Run the portfolio day to day",
              "Replaces the spreadsheet"),
             ("Owners", "See their own property and payout",
              "Replaces the monthly call"),
             ("Tenants", "Rent, lease, repairs and documents",
              "Replaces the WhatsApp thread"),
             ("Vendors", "Take the job, close it with evidence",
              "Replaces chasing by phone")]
    w, xs = col(4, gap=0.6)
    for x, (name, line1, line2) in zip(xs, roles):
        rule(s, x, 3.80, w, color=INK)
        text(s, x, 4.10, w, 0.60, name, font=DISPLAY, size=30, color=INK,
             bold=True)
        text(s, x, 4.95, w, 1.40, line1, size=21, color=BODY, line=1.30)
        text(s, x, 6.70, w, 0.80, line2, size=SMALL, color=MUTED, line=1.30)

    rule(s, M, 7.95, CW, color=INK)
    text(s, M, 8.30, 12.0, 0.70, "Four logins. One set of records.",
         font=DISPLAY, size=32, color=INK, bold=True)
    text(s, M, 9.20, 15.5, 0.60,
         "Each owner signs in and sees their own property and nothing else — "
         "whether that is you, or landlords you manage for.",
         size=21, color=BODY)
    page_mark(s, n)
    return s
