"""Pages 12-21: the logins, the proof, the commercials and the close."""

from kit import *
from pptx.enum.text import PP_ALIGN


def _portal(prs, n, label, title, lede_text, screens, shot, accent=None):
    """Shared layout for the owner and tenant slides.

    The function index sits on the left in two columns and the product shot
    takes the right half. Stacking the shot under a full-width index left it
    either tiny or off the bottom of the stage.
    """
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — {label}")
    headline(s, title, accent=accent, size=H2, top=1.86)
    caption(s, lede_text, top=2.90, size=22, color=BODY, width=9.0)

    LW = 8.00
    cw = (LW - 0.5) / 2
    for i, (name, desc) in enumerate(screens):
        x = M + (i % 2) * (cw + 0.5)
        y = 4.05 + (i // 2) * 1.22
        rule(s, x, y, cw, color=HAIRLINE)
        text(s, x, y + 0.20, cw, 0.40, name, size=20, color=INK, bold=True)
        text(s, x, y + 0.64, cw, 0.50, desc, size=16, color=MUTED, line=1.24)

    picture(s, shot, M + LW + 1.00, 4.05, CW - LW - 1.00, 6.20, align="left")
    page_mark(s, n)
    return s


def s_manager(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — The workspace")
    headline(s, "Everything the agency does in a day", size=H2, top=1.86)

    groups = [("Portfolio", ["Properties", "Buildings", "Units", "Vacancy",
                             "Owners"]),
              ("Letting", ["Leasing pipeline", "Offers", "Offer builder",
                           "Tenants", "Leases"]),
              ("Money", ["Payments", "Cheque register", "Take payment",
                         "Outstanding", "Reconciliation", "Ledger",
                         "Expenses", "Statements", "Opening balances"]),
              ("Operations", ["Maintenance", "Work orders", "Reports",
                              "Settings"])]
    w, xs = col(4, gap=0.6)
    for x, (name, items) in zip(xs, groups):
        rule(s, x, 3.40, w, color=INK)
        text(s, x, 3.68, w, 0.50, name, font=DISPLAY, size=26, color=INK,
             bold=True)
        for i, it in enumerate(items):
            text(s, x, 4.44 + i * 0.52, w, 0.46, it, size=20, color=BODY)

    rule(s, M, 9.30, CW, color=INK)
    text(s, M, 9.64, CW, 0.60,
         "One place for the work already being done — and no second system "
         "to keep in step with it.",
         size=21, color=BODY)
    page_mark(s, n)
    return s


def s_owner_portal(prs, n):
    return _portal(
        prs, n, "Owner portal", "Every owner gets their own login",
        "Whether you own the portfolio or manage it for someone else, each "
        "owner signs in to their own property, money and documents.",
        [("Overview", "Occupancy, rent, outstanding"),
         ("Properties", "Buildings, units, tenancies"),
         ("Finance", "Income, expenses, transactions"),
         ("Statements", "This month and every month before"),
         ("Maintenance", "Open work, closed work, cost"),
         ("Documents", "Ownership and property papers"),
         ("Ownership", "Shares and how income splits"),
         ("Offers", "Accept or decline offers"),
         ("Vacancy", "What is empty, and since when"),
         ("Mandate", "The management agreement")],
        "owner", accent="their own login")


def s_tenant_portal(prs, n):
    return _portal(
        prs, n, "Tenant portal", "Tenants stop calling the office",
        "What is due, what is paid, what is being repaired — answered "
        "without anyone picking up the phone.",
        [("Home", "What is due and what is open"),
         ("Rent", "Every instalment, paid and upcoming"),
         ("Lease", "Dates, rent, deposit, renewal"),
         ("Contract", "The signed tenancy contract"),
         ("Maintenance", "Report an issue, follow it to close"),
         ("Documents", "QID, passport, receipts"),
         ("Messages", "One thread with the agent")],
        "tenant", accent="stop calling")


def s_ownership(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Ownership structures")
    headline(s, "Split at the share,\nnot the spreadsheet.", size=52,
             top=1.95, width=8.4, line=1.10)
    text(s, M, 5.00, 7.8, 2.2,
         "A property can have more than one owner, and they rarely own it "
         "equally. Maskan holds the share itself, so income, expenses and "
         "the management fee divide automatically.",
         size=22, color=BODY, line=1.44)
    text(s, M, 7.70, 7.8, 0.40, "OWNERSHIP CAN SIT AT", size=LABEL,
         color=MUTED, track=140, bold=True)
    text(s, M, 8.25, 7.8, 0.60,
         "Property level · Building level · Individual unit level",
         size=22, color=INK)

    rx, rw = M + 9.20, CW - 9.20
    text(s, rx, 3.30, rw, 0.40, "PROPERTY NET INCOME · AUGUST 2026",
         size=LABEL, color=MUTED, track=140, bold=True)
    text(s, rx, 3.82, rw, 1.30, "QAR 90,000", font=DISPLAY, size=58,
         color=INK, bold=True, line=1.0)
    rule(s, rx, 5.40, rw, color=INK)

    for i, (name, pct, amount) in enumerate(
            [("Owner A", 0.60, "QAR 54,000"), ("Owner B", 0.40, "QAR 36,000")]):
        y = 5.85 + i * 2.05
        text(s, rx, y, 3.0, 0.50, name, size=23, color=INK, bold=True)
        text(s, rx + 3.0, y, rw - 3.0, 0.50, amount, font=DISPLAY, size=25,
             color=INK, bold=True, align=PP_ALIGN.RIGHT)
        block(s, rx, y + 0.78, rw, 0.10, fill=HAIRLINE)
        block(s, rx, y + 0.78, rw * pct, 0.10, fill=LIME)
        text(s, rx, y + 1.06, rw, 0.40,
             f"{int(pct * 100)}% share · own statement, own login",
             size=SMALL, color=MUTED)
    page_mark(s, n)
    return s


def s_built(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — What is built")
    headline(s, "Built, not planned", accent="Built", size=H1, top=1.90)
    caption(s, "Everything in this deck works today. Nothing here is waiting "
               "on a future release.",
            top=3.20, size=23, color=BODY, width=13.0)

    # Counts of screens, tables and security policies were in the first cut.
    # Those are build metrics; these are the four questions a property
    # company actually asks before signing.
    items = [("Your records stay yours",
              "One agency cannot see another's tenancies, owners or money. "
              "That separation sits in the database itself, not in the screen."),
             ("English and Arabic",
              "Built for Qatar from the start — QAR, Qatari lease terms, "
              "cheque cycles and Doha districts, right-to-left included."),
             ("Nothing is locked in",
              "Statements export as PDF, the ledger feeds your accounting "
              "software, and your records leave whenever you want them to."),
             ("Every figure traces back",
              "Each number on a statement opens onto the lease, the payment "
              "and the date behind it. Nothing is a rounded summary.")]
    w, xs = col(4, gap=0.6)
    for x, (title, bodytext) in zip(xs, items):
        rule(s, x, 4.70, w, color=INK)
        text(s, x, 5.02, w, 1.10, title, font=DISPLAY, size=25, color=INK,
             bold=True, line=1.18)
        text(s, x, 6.30, w, 2.6, bodytext, size=20, color=BODY, line=1.42)
    page_mark(s, n)
    return s


def s_why_now(prs, n):
    s = slide(prs, INK)
    eyebrow(s, f"{n - 1:02d} — Why now", color=ON_INK_DIM)
    text(s, M, 2.90, 13.0, 2.60, "35,917", font=DISPLAY, size=FIG_XL,
         color=LIME, bold=True, line=1.0)
    text(s, M, 5.70, 12.5, 1.60,
         "rental contracts registered in Qatar in the fourth quarter of "
         "2025 — a record quarter, per Aqarat.",
         size=30, color=PAPER, line=1.34)
    rule(s, M, 7.90, CW, color=INK_SOFT, weight=0.012)
    text(s, M, 8.30, 8.4, 1.60,
         "Every quarter of 2025 recorded more rental contracts than the same "
         "quarter of 2024, while Aqarat kept expanding digital registration.",
         size=21, color=ON_INK, line=1.42)
    text(s, M + 9.4, 8.30, CW - 9.4, 1.60,
         "The gap is not listings. It is the operations behind every tenancy.",
         font=DISPLAY, size=28, color=PAPER, bold=True, line=1.28)
    page_mark(s, n, dark=True)
    return s


def s_roadmap(prs, n):
    s = slide(prs)
    eyebrow(s, f"{n - 1:02d} — Roadmap")
    headline(s, "Operations first, then the lifecycle", size=H2, top=1.86)

    phases = [("Live", "Maskan Core", "Leases, rent, maintenance, statements"),
              ("02", "Digital payments", "Automated matching and reconciliation"),
              ("03", "Market intelligence", "Your rents against official indicators"),
              ("04", "Listing distribution", "Vacant unit to published advert"),
              ("05", "Rental marketplace", "Search, apply, sign"),
              ("06", "Tenant services", "Moving, cleaning, internet, insurance")]
    w, xs = col(6, gap=0.44)
    for i, (x, (phase, title, body)) in enumerate(zip(xs, phases)):
        live = i == 0
        rule(s, x, 3.90, w, color=INK if live else HAIRLINE,
             weight=0.022 if live else 0.008)
        text(s, x, 4.18, w, 0.36, phase.upper(), size=LABEL,
             color=INK if live else MUTED, track=140, bold=True)
        text(s, x, 4.76, w, 1.10, title, font=DISPLAY, size=24, color=INK,
             bold=True, line=1.18)
        text(s, x, 6.10, w, 1.70, body, size=19, color=BODY, line=1.34)

    rule(s, M, 8.40, CW)
    text(s, M, 8.80, 11.0, 0.70, "Vacant · Rented · Managed · Renewed",
         font=DISPLAY, size=28, color=INK, bold=True)
    text(s, M, 9.70, 13.0, 0.50,
         "Each phase extends the same record rather than starting a new one.",
         size=21, color=BODY)
    page_mark(s, n)
    return s


def s_close(prs, n):
    s = slide(prs, INK)
    headline(s, "Rent, collected.", accent="collected.", dark=True,
             size=108, top=3.60, color=PAPER, width=14.0, line=1.0)
    text(s, M, 5.90, 12.0, 1.40,
         "Your properties already produce this record every day. "
         "Maskan is where it finally adds up.",
         size=28, color=ON_INK, line=1.38)
    rule(s, M, 8.60, CW, color=INK_SOFT, weight=0.012)
    logo(s, M, 9.10, 2.30, "paper")
    text(s, W - M - 8.0, 9.75, 8.0, 0.44, "maskan.qa · DOHA, QATAR",
         size=LABEL, color=ON_INK_DIM, track=200, bold=True,
         align=PP_ALIGN.RIGHT)
    return s
