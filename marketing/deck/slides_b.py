"""Slides 13-24: portals, proof, commercials and the close."""

from kit import *
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR


def _portal(prs, number, label, title, lede, screens, *, cols=5):
    """Shared layout for the owner and tenant portal slides."""
    s = slide(prs)
    head(s, number, label, title)
    text(s, M, 4.18, 13.0, 0.46, lede, size=23.25, color=BODY)

    w, xs = grid(cols)
    for i, (num, name, desc) in enumerate(screens):
        x = xs[i % cols]
        y = 5.00 + (i // cols) * 2.78
        card(s, x, y, w, 2.60)
        text(s, x + 0.34, y + 0.32, 1.0, 0.36, num, font=MONO, size=19.5,
             color=LIME_DARK, bold=True, spacing=100)
        text(s, x + 0.34, y + 0.76, w - 0.68, 0.44, name, size=24, color=INK,
             bold=True)
        text(s, x + 0.34, y + 1.22, w - 0.68, 1.14, desc, size=18.75,
             color=BODY, line=1.22)
    corner(s)
    return s


def s13_owner_portal(prs):
    return _portal(
        prs, "12", "OWNER PORTAL", "Ten screens. Nothing else",
        "The owner signs in and sees the asset — never the agency's workings.",
        [("01", "Overview", "Occupancy, rent collected and outstanding"),
         ("02", "Properties", "Buildings, units and their tenancies"),
         ("03", "Finance", "Income, expenses and every transaction"),
         ("04", "Statements", "This month, and every month before it"),
         ("05", "Maintenance", "Open work, completed work, and cost"),
         ("06", "Documents", "Ownership and property papers"),
         ("07", "Ownership", "Shares, co-owners and how income splits"),
         ("08", "Offers", "Offers on vacant units, to accept or decline"),
         ("09", "Vacancy", "What is empty, and for how long"),
         ("10", "Mandate", "The management agreement and terms")])


def s14_tenant_portal(prs):
    return _portal(
        prs, "13", "TENANT PORTAL", "Seven screens for the home",
        "The tenant answers their own questions instead of calling the office.",
        [("01", "Home", "What is due, what is open, what is next"),
         ("02", "Rent", "Every instalment, paid and upcoming"),
         ("03", "Lease", "Dates, rent, deposit and renewal status"),
         ("04", "Contract", "The signed tenancy contract itself"),
         ("05", "Maintenance", "Report an issue, follow it to close"),
         ("06", "Documents", "QID, passport, receipts and notices"),
         ("07", "Messages", "One thread with the managing agent")],
        cols=4)


def s15_ownership(prs):
    s = slide(prs)
    head(s, "14", "OWNERSHIP STRUCTURES", "Split at the share, not the spreadsheet")

    top = 4.50
    card(s, M, top, 7.6, 1.92, fill=INK, line=None, radius=0.16)
    text(s, M + 0.46, top + 0.30, 6.6, 0.38, "PROPERTY NET INCOME", font=MONO,
         size=19.5, color=LIME, spacing=140)
    text(s, M + 0.46, top + 0.74, 6.6, 0.68, "QAR 90,000", font=MONO, size=38,
         color=PAPER, bold=True)
    text(s, M + 0.46, top + 1.44, 6.6, 0.34, "August 2026 · after fees and expenses",
         size=19.5, color=DIM2)

    for i, (name, pct, amount) in enumerate(
            [("OWNER A · 60%", 0.60, "QAR 54,000"), ("OWNER B · 40%", 0.40, "QAR 36,000")]):
        y = top + 2.22 + i * 1.86
        card(s, M, y, 7.6, 1.62)
        text(s, M + 0.46, y + 0.26, 4.0, 0.38, name, font=MONO, size=19.5,
             color=MUTED, spacing=130)
        text(s, M + 0.46, y + 0.68, 4.4, 0.54, amount, font=MONO, size=28,
             color=INK, bold=True)
        text(s, M + 4.0, y + 0.80, 3.14, 0.34, "Own statement, own login",
             size=18.75, color=BODY, align=PP_ALIGN.RIGHT)
        rect(s, M + 0.46, y + 1.32, 6.68, 0.08, fill=BORDER, line=None)
        rect(s, M + 0.46, y + 1.32, 6.68 * pct, 0.08, fill=LIME, line=None)

    rx, rw = M + 8.2, CW - 8.2
    text(s, rx, top + 0.20, rw, 1.2,
         "A property can have more than one owner, and they rarely own it equally.",
         size=30, color=INK, bold=True, line=1.20)
    text(s, rx, top + 1.70, rw, 1.5,
         "Maskan holds the share itself, so income, expenses and the management "
         "fee divide automatically — and each owner signs in to their own portion.",
         size=22.5, color=BODY, line=1.34)
    text(s, rx, top + 3.56, rw, 0.38, "OWNERSHIP CAN SIT AT", font=MONO,
         size=19.5, color=MUTED, spacing=140)
    for i, lvl in enumerate(["Property level", "Building level", "Individual unit level"]):
        y = top + 4.04 + i * 0.72
        card(s, rx, y, rw, 0.62, fill=SURFACE, line=None)
        text(s, rx + 0.34, y + 0.13, rw - 0.68, 0.40, lvl, size=22.5, color=INK)
    corner(s)
    return s


def s16_migration(prs):
    s = slide(prs)
    head(s, "15", "MIGRATION", "Give us the files you already have")

    text(s, M, 4.30, 10.0, 0.46,
         "The migration centre takes your existing records as they are:",
         size=23.25, color=BODY)
    pill_row(s, M, 4.98,
             ["Properties", "Buildings", "Units", "Owners", "Tenants", "Leases",
              "Cheques", "Deposits", "Outstanding balances", "Opening owner balances"],
             maxw=10.2)
    text(s, M, 7.30, 10.2, 1.3,
         "Then Maskan reconciles what it loaded against your own totals, line by "
         "line, before you rely on it.",
         size=23.25, color=INK, line=1.32)

    rx, rw = M + 10.9, CW - 10.9
    card(s, rx, 4.30, rw, 5.45, fill=INK, line=None, radius=0.18)
    text(s, rx + 0.52, 4.76, rw - 1.04, 0.38, "RECONCILIATION CHECK", font=MONO,
         size=20.25, color=LIME, spacing=150)
    for i, (label, value) in enumerate([("Your records", "QAR 428,500"),
                                        ("Maskan", "QAR 428,500")]):
        y = 5.50 + i * 1.18
        text(s, rx + 0.52, y, 3.2, 0.42, label, size=23.25, color=DIM2)
        text(s, rx + 2.2, y - 0.06, rw - 2.72, 0.52, value, font=MONO, size=27,
             color=PAPER, bold=True, align=PP_ALIGN.RIGHT)
    rule(s, rx + 0.52, 7.86, rw - 1.04, color=RGBColor(0x4A, 0x33, 0x2E), weight=0.02)
    text(s, rx + 0.52, 8.16, 3.2, 0.42, "VARIANCE", font=MONO, size=20.25,
         color=LIME, spacing=140)
    text(s, rx + 2.2, 8.06, rw - 2.72, 0.62, "0.00", font=MONO, size=36,
         color=LIME, bold=True, align=PP_ALIGN.RIGHT)
    text(s, rx + 0.52, 8.92, rw - 1.04, 0.52,
         "If it does not reconcile, it does not go live.",
         size=21, color=DIM2)
    corner(s)
    return s


def s17_built(prs):
    s = slide(prs)
    head(s, "16", "WHAT IS BUILT", "Not a prototype")

    top = 4.48
    stat(s, col_x(0)[0], top, COL, "SCREENS BUILT", "57", "Across five roles")
    stat(s, col_x(1)[0], top, COL, "DATABASE TABLES", "70", "One connected schema")
    stat(s, col_x(2)[0], top, COL, "SECURITY POLICIES", "159",
         "Row-level, in the database")
    stat(s, col_x(3)[0], top, COL, "ROLES", "5",
         "Manager, owner, tenant, vendor, platform")

    card(s, M, 7.55, CW, 2.78, fill=INK, line=None, radius=0.18)
    text(s, M + 0.60, 8.00, 13.0, 0.56,
         "Separation is enforced by the database, not the screen.",
         size=29, color=PAPER, bold=True)
    text(s, M + 0.60, 8.74, 10.6, 1.30,
         "Every table carries row-level security. A manager at one agency cannot "
         "read another agency's records even if the application is wrong — the "
         "database refuses the row.",
         size=21.75, color=DIM2, line=1.34)
    for i, (k, v) in enumerate([("Currency", "QAR, minor units"),
                                ("Locale", "English and Arabic"),
                                ("Timezone", "Asia/Qatar")]):
        y = 8.70 + i * 0.56
        text(s, M + 11.9, y, 2.4, 0.40, k, font=MONO, size=18.75, color=LIME,
             spacing=120)
        text(s, M + 14.2, y, 3.2, 0.40, v, size=20.25, color=DIM2)
    corner(s)
    return s


def s18_plans(prs):
    s = slide(prs)
    head(s, "17", "PLANS", "Priced by the size of the portfolio")

    plans = [("TRIAL", "0", "25 units", "3 users", False),
             ("STARTER", "499", "50 units", "5 users", False),
             ("GROWTH", "1,499", "200 units", "15 users", True),
             ("PROFESSIONAL", "3,999", "750 units", "40 users", False),
             ("ENTERPRISE", "—", "Unlimited", "Unlimited", False)]
    w, xs = grid(5)
    top = 4.50
    for x, (name, price, units, users, feature) in zip(xs, plans):
        dark = feature
        card(s, x, top, w, 4.30, fill=INK if dark else WHITE,
             line=None if dark else BORDER)
        text(s, x + 0.34, top + 0.40, w - 0.68, 0.38, name, font=MONO, size=19.5,
             color=LIME if dark else MUTED, spacing=140, bold=True)
        if price == "—":
            text(s, x + 0.34, top + 0.96, w - 0.68, 0.60, "Custom", size=30,
                 color=PAPER if dark else INK, bold=True)
        else:
            text(s, x + 0.34, top + 0.92, w - 0.68, 0.66,
                 [[("QAR ", {"size": 19.5, "color": MUTED if not dark else DIM2}),
                   (price, {"size": 34, "color": PAPER if dark else INK})]],
                 font=MONO, bold=True)
            text(s, x + 0.34, top + 1.62, w - 0.68, 0.32, "per month", size=18.75,
                 color=DIM2 if dark else MUTED)
        rule(s, x + 0.34, top + 2.10, w - 0.68,
             color=RGBColor(0x4A, 0x33, 0x2E) if dark else BORDER)
        for i, v in enumerate([units, users]):
            text(s, x + 0.34, top + 2.34 + i * 0.52, w - 0.68, 0.42, v,
                 size=22.5, color=PAPER if dark else INK)
        text(s, x + 0.34, top + 3.48, w - 0.68, 0.38,
             "Included" if name != "TRIAL" else "30 days", font=MONO, size=17.25,
             color=LIME if dark else MUTED, spacing=120)

    text(s, M, 9.30, CW, 0.52,
         "Online payments from Starter. WhatsApp notifications and advanced "
         "reporting from Growth. White-label on Enterprise.",
         size=21.75, color=BODY)
    corner(s)
    return s


def s19_why_now(prs):
    s = slide(prs)
    head(s, "18", "WHY NOW", "The market is registering, not operating",
         size=60)

    card(s, M, 4.70, 8.6, 4.10, fill=INK, line=None, radius=0.18)
    text(s, M + 0.60, 5.20, 7.4, 1.60, "35,917", font=MONO, size=108,
         color=LIME, bold=True)
    text(s, M + 0.60, 6.92, 7.4, 1.50,
         "rental contracts registered in Qatar in the fourth quarter of 2025 — "
         "a record quarter, per Aqarat.",
         size=23.25, color=DIM2, line=1.32)

    rx, rw = M + 9.2, CW - 9.2
    text(s, rx, 4.90, rw, 1.8,
         "Every quarter of 2025 recorded more rental contracts than the same "
         "quarter of 2024, while Aqarat kept expanding digital registration and "
         "market information.",
         size=24, color=BODY, line=1.36)
    rule(s, rx, 7.10, rw, color=INK, weight=0.02)
    text(s, rx, 7.46, rw, 1.40,
         [[("The gap is not listings. It is the operations behind every tenancy",
            {}), (".", {"color": LIME})]],
         size=34, color=INK, bold=True, line=1.18)
    corner(s)
    return s


def s20_scope(prs):
    s = slide(prs)
    head(s, "19", "SCOPE", "What Maskan is not")

    items = [("Not your bank",
              "Payments are processed by authorised financial providers. "
              "We record and reconcile them."),
             ("Not your accountant",
              "Maskan feeds your accounting and ERP software instead of "
              "replacing it."),
             ("Not the government",
              "Official lease registration remains with the relevant "
              "authorities."),
             ("Not a listing site",
              "We start at the operation of the property, not the advert for it.")]
    w, xs = grid(4)
    for x, (title, body) in zip(xs, items):
        card(s, x, 4.70, w, 4.30)
        rect(s, x + 0.36, 5.10, 0.44, 0.08, fill=LIME, line=None)
        text(s, x + 0.36, 5.46, w - 0.72, 0.96, title, size=28, color=INK,
             bold=True, line=1.18)
        text(s, x + 0.36, 6.68, w - 0.72, 2.0, body, size=21.75, color=BODY,
             line=1.34)
    text(s, M, 9.52, CW, 0.52,
         "A narrow product that does the operational job completely, and hands "
         "off cleanly everywhere else.",
         size=23.25, color=MUTED)
    corner(s)
    return s


def s21_roadmap(prs):
    s = slide(prs)
    head(s, "20", "ROADMAP", "Operations first, then the lifecycle")

    phases = [("01 · LIVE", "Maskan Core", "Leases, rent, maintenance, statements", True),
              ("02", "Digital payments", "Automated matching and reconciliation", False),
              ("03", "Market intelligence", "Your rents against official indicators", False),
              ("04", "Listing distribution", "Vacant unit to published advert", False),
              ("05", "Rental marketplace", "Search, apply, sign", False),
              ("06", "Tenant services", "Moving, cleaning, internet, insurance", False)]
    w, xs = grid(6)
    for x, (phase, title, body, live) in zip(xs, phases):
        card(s, x, 4.55, w, 3.70, fill=INK if live else WHITE,
             line=None if live else BORDER)
        text(s, x + 0.30, 4.92, w - 0.60, 0.36, phase, font=MONO, size=18,
             color=LIME if live else MUTED, spacing=140, bold=True)
        text(s, x + 0.30, 5.46, w - 0.60, 0.90, title, size=24,
             color=PAPER if live else INK, bold=True, line=1.18)
        text(s, x + 0.30, 6.60, w - 0.60, 1.4, body, size=19.5,
             color=DIM2 if live else BODY, line=1.26)

    card(s, M, 8.70, CW, 1.64, fill=SURFACE, line=None, radius=0.16)
    arrow_chain(s, M + 0.60, 9.30, ["Vacant", "Rented", "Managed", "Renewed"],
                size=27)
    text(s, M + 10.6, 9.38, 6.5, 0.42,
         "Each phase extends the same record.",
         size=21, color=BODY)
    corner(s)
    return s


def s22_pilot(prs):
    s = slide(prs)
    head(s, "21", "PILOT", "Start with 25 to 50 units")

    card(s, M, 4.55, 8.6, 4.86)
    text(s, M + 0.52, 4.98, 7.5, 0.38, "WE CONFIGURE", font=MONO, size=20.25,
         color=MUTED, spacing=150)
    for i, it in enumerate(["Properties, units, owners and tenants",
                            "Active leases and payment schedules",
                            "Existing cheques and opening balances"]):
        y = 5.62 + i * 0.68
        rect(s, M + 0.52, y + 0.16, 0.14, 0.14, fill=LIME, line=None, radius=0.07)
        text(s, M + 0.92, y, 7.2, 0.46, it, size=22.5, color=INK)
    rule(s, M + 0.52, 7.86, 7.56)
    text(s, M + 0.52, 8.14, 7.56, 0.90,
         "Maskan then runs alongside your current process. Nothing is switched off.",
         size=21.75, color=BODY, line=1.30)

    rx, rw = M + 9.2, CW - 9.2
    card(s, rx, 4.55, rw, 4.86, fill=INK, line=None, radius=0.18)
    text(s, rx + 0.52, 4.98, rw - 1.04, 0.38, "YOU MEASURE", font=MONO,
         size=20.25, color=LIME, spacing=150)
    for i, it in enumerate(['Time to answer "has the rent been paid"',
                            "Hours spent reconciling each month",
                            "Outstanding payments caught earlier",
                            "Maintenance closed with evidence",
                            "Renewals actioned before expiry"]):
        y = 5.58 + i * 0.62
        rect(s, rx + 0.52, y + 0.16, 0.14, 0.14, fill=LIME, line=None, radius=0.07)
        text(s, rx + 0.92, y, rw - 1.5, 0.46, it, size=22.5, color=PAPER)
    text(s, rx + 0.52, 8.78, rw - 1.04, 0.48,
         "If it holds up, expand the portfolio.", size=24, color=LIME, bold=True)
    corner(s)
    return s


def s23_next(prs):
    s = slide(prs)
    head(s, "22", "NEXT SESSION",
         "We want your workflow, not a verdict on the software", size=60)

    qs = ["How do you manage the portfolio today", "How is rent collected",
          "How are cheques tracked", "How are payments reconciled",
          "How is maintenance handled", "How are owner payouts calculated",
          "How are renewals tracked", "What takes the most time",
          "What causes the most mistakes"]
    w, xs = grid(3)
    for i, q in enumerate(qs):
        x = xs[i % 3]
        y = 5.05 + (i // 3) * 1.64
        card(s, x, y, w, 1.36)
        text(s, x + 0.40, y + 0.42, w - 0.80, 0.56, q, size=23.25, color=INK)
    corner(s)
    return s


def s24_close(prs):
    s = slide(prs)
    bgs = slide  # keep the paper background
    rect(s, 0, 0, W, H, fill=INK, line=None)

    words = ["RENT", "CHEQUES", "LEASES", "MAINTENANCE", "EXPENSES",
             "STATEMENTS", "RENEWALS"]
    x = M
    for i, word in enumerate(words):
        wd = len(word) * 25.5 * 0.0092
        text(s, x, 1.60, wd + 0.3, 0.50, word, font=MONO, size=25.5,
             color=LIME if i % 3 == 0 else RGBColor(0x5E, 0x46, 0x41), spacing=200)
        x += wd + 0.52

    text(s, M, 3.20, 13.6, 1.70,
         "Your properties already produce this record every day. "
         "Maskan is where it finally adds up.",
         size=34, color=DIM2, line=1.36)

    headline(s, "Rent, collected", size=108, top=5.60, color=PAPER, width=14.0,
             line=1.0)

    rule(s, M, 8.40, CW, color=RGBColor(0x4A, 0x33, 0x2E), weight=0.02)
    logo(s, M, 9.00, 2.2, "paper")
    text(s, M + 8.0, 9.78, 9.67, 0.44, "maskan.qa  ·  DOHA, QATAR", font=MONO,
         size=21, color=DIM, spacing=200, align=PP_ALIGN.RIGHT)
    return s
