"""
Drawing kit for the Maskan OS deck.

Design rules this encodes, and why:

* **No borders and no shadows.** Surfaces separate by fill and by whitespace.
  A bordered, drop-shadowed card is the single clearest tell of a 2010s
  slide template, and it was the first thing to go.
* **The product's own fonts.** Archivo for headings and figures, Inter Tight
  for everything else -- the same split as app/globals.css, where Archivo is
  display-only and never sets body copy. The deck and the signed-in product
  should look like one company.
* **Generous margins.** 1.6in rather than the old 1.17in, and far fewer
  elements per slide. Air is the main design material here.
* **One accent.** Lime appears at most once per slide, usually not at all.
  Colour otherwise carries meaning only in data.

Both fonts are embedded into the .pptx at build time, so the deck renders
correctly on a machine that has neither installed.
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from pathlib import Path

# --- palette ---------------------------------------------------------------
INK = RGBColor(0x17, 0x01, 0x00)
INK_SOFT = RGBColor(0x2B, 0x15, 0x12)
PAPER = RGBColor(0xFB, 0xF9, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SURFACE = RGBColor(0xF4, 0xF0, 0xEE)
HAIRLINE = RGBColor(0xEA, 0xE4, 0xE2)
BODY = RGBColor(0x5C, 0x4A, 0x46)
MUTED = RGBColor(0xA6, 0x98, 0x94)
ON_INK = RGBColor(0xC9, 0xBD, 0xBA)
ON_INK_DIM = RGBColor(0x8B, 0x7F, 0x7C)
LIME = RGBColor(0xC6, 0xF2, 0x4E)
GREEN = RGBColor(0x0F, 0x8A, 0x5F)
AMBER = RGBColor(0xB4, 0x53, 0x09)
RED = RGBColor(0xB9, 0x1C, 0x1C)

# --- stage and grid --------------------------------------------------------
W, H = 20.0, 11.25
M = 1.60                       # page margin
CW = W - 2 * M                 # 16.80in of content

DISPLAY = "Archivo"            # headings and figures only
TEXT = "Inter Tight"           # everything else

# --- type scale ------------------------------------------------------------
EYEBROW = 16
H1 = 72
H2 = 44
H3 = 28
LEAD = 27                      # opening paragraph
BODY_SZ = 21
SMALL = 18
LABEL = 15
FIG = 52
FIG_XL = 128

ASSETS = Path(__file__).parent


def col(n, gap=0.5):
    """Width and left edges for n equal columns across the content width."""
    w = (CW - gap * (n - 1)) / n
    return w, [M + i * (w + gap) for i in range(n)]


def new_deck():
    prs = Presentation()
    prs.slide_width = Inches(W)
    prs.slide_height = Inches(H)
    return prs


def slide(prs, bg=PAPER):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    f = s.background.fill
    f.solid()
    f.fore_color.rgb = bg
    return s


# --- primitives ------------------------------------------------------------

def _spacing(run, hundredths):
    run.font._rPr.set("spc", str(hundredths))


def _highlight(run, rgb):
    """Marker-pen highlight behind a run.

    Lime is a light colour: #C6F24E on the paper background is roughly 1.2:1
    contrast, which is invisible. So on light slides the accent cannot be the
    letterforms -- it has to sit behind them, with the text staying ink. On
    ink slides lime text is used directly instead.

    python-pptx does not expose a:highlight, and the schema fixes its position
    in rPr: after the fill, before a:latin.
    """
    rPr = run.font._rPr
    hl = rPr.makeelement(qn("a:highlight"), {})
    clr = rPr.makeelement(qn("a:srgbClr"), {"val": f"{rgb}"})
    hl.append(clr)
    rPr.insert_element_before(
        hl, "a:uLnTx", "a:uLn", "a:uFillTx", "a:uFill", "a:latin", "a:ea",
        "a:cs", "a:sym", "a:hlinkClick", "a:hlinkMouseOver", "a:rtl",
        "a:extLst")


def text(s, l, t, w, h, body, *, font=TEXT, size=BODY_SZ, color=BODY,
         bold=False, align=PP_ALIGN.LEFT, track=None, line=None,
         anchor=MSO_ANCHOR.TOP, after=0):
    """A text box.

    `body` is a string (newlines become paragraphs), or a list of paragraphs,
    where a paragraph may itself be a list of (text, overrides) runs.
    """
    box = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor

    paras = body if isinstance(body, list) else [body]
    flat = []
    for p in paras:
        # A literal newline inside a run does nothing in DrawingML; each line
        # has to become its own paragraph or it silently runs on and overflows.
        if isinstance(p, str) and "\n" in p:
            flat.extend(p.split("\n"))
        else:
            flat.append(p)

    for i, item in enumerate(flat):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line:
            p.line_spacing = line
        if after:
            p.space_after = Pt(after)
        runs = item if isinstance(item, list) else [(item, {})]
        for txt, over in runs:
            r = p.add_run()
            r.text = txt
            f = r.font
            f.name = over.get("font", font)
            f.size = Pt(over.get("size", size))
            f.bold = over.get("bold", bold)
            f.color.rgb = over.get("color", color)
            tr = over.get("track", track)
            if tr:
                _spacing(r, tr)
            hl = over.get("mark")
            if hl:
                _highlight(r, hl)
    return box


def block(s, l, t, w, h, *, fill=WHITE, radius=None):
    """A flat surface. No outline, no shadow -- deliberately."""
    shape = s.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(l), Inches(t), Inches(w), Inches(h))
    if radius:
        shape.adjustments[0] = min(0.5, radius / min(w, h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


def rule(s, l, t, w, *, color=HAIRLINE, weight=0.008):
    return block(s, l, t, w, weight, fill=color)


def picture(s, name, l, t, w, h=None, *, align="center"):
    """A product mockup, scaled to fit inside the given box.

    Passing only a width is how the first build put four screenshots off the
    bottom of the stage: a 1.6:1 screenshot 14in wide is 8.8in tall, and
    nothing in PowerPoint complains. Giving a height makes the box authoritative
    and the image is fitted inside it, which cannot overflow.
    """
    from PIL import Image
    path = ASSETS / "mock" / f"{name}.png"
    iw, ih = Image.open(path).size
    aspect = ih / iw
    if h is None:
        dw, dh = w, w * aspect
    else:
        dw, dh = (w, w * aspect) if w * aspect <= h else (h / aspect, h)
    x = l + (w - dw) / 2 if align == "center" else l
    return s.shapes.add_picture(str(path), Inches(x), Inches(t),
                                width=Inches(dw), height=Inches(dh))


def logo(s, l, t, w, variant="ink"):
    return s.shapes.add_picture(str(ASSETS / f"logo-{variant}.png"),
                                Inches(l), Inches(t),
                                width=Inches(w), height=Inches(w * 143 / 174))


# --- composed blocks -------------------------------------------------------

def eyebrow(s, label, *, color=MUTED, top=1.15):
    return text(s, M, top, CW, 0.34, label.upper(), font=TEXT, size=EYEBROW,
                color=color, track=220, bold=True)


def headline(s, title, *, accent=None, dark=False, size=H1, top=2.05,
             color=INK, width=CW, left=M, line=1.00, align=PP_ALIGN.LEFT):
    """A headline, optionally with one phrase picked out in lime.

    On ink the accent is the letterforms. On paper it cannot be -- lime is
    too light to read against it -- so the accent becomes a marker-pen
    highlight behind ink text instead. Same signal, opposite mechanics.
    """
    lines = title.split("\n")
    paras = []
    for ln in lines:
        if accent and accent in ln:
            before, _, after = ln.partition(accent)
            runs = []
            if before:
                runs.append((before, {}))
            runs.append((accent, {"color": LIME} if dark else {"mark": "C6F24E"}))
            if after:
                runs.append((after, {}))
            paras.append(runs)
        else:
            paras.append([(ln, {})])
    return text(s, left, top, width, len(lines) * size / 72 * line + 0.5,
                paras, font=DISPLAY, size=size, color=color, bold=True,
                line=line, align=align)


def head(s, label, title, *, size=H1, dark=False, top=2.05, width=CW,
         accent=None):
    """Eyebrow plus headline: the opening of a content slide."""
    eyebrow(s, label, color=ON_INK_DIM if dark else MUTED)
    headline(s, title, size=size, top=top, width=width, accent=accent,
             dark=dark, color=PAPER if dark else INK)


def lede(s, body, *, top, width=11.0, color=BODY, size=LEAD, left=M):
    return text(s, left, top, width, 2.0, body, size=size, color=color,
                line=1.40)


def figure(s, l, t, w, value, label, *, size=FIG, color=INK,
           label_color=MUTED, align=PP_ALIGN.LEFT):
    """A large number over a small label. No card around it."""
    text(s, l, t, w, size / 72 * 1.2, value, font=DISPLAY, size=size,
         color=color, bold=True, align=align, line=1.0)
    text(s, l, t + size / 72 * 1.15 + 0.10, w, 0.60, label, font=TEXT,
         size=SMALL, color=label_color, align=align, line=1.30)


def listing(s, l, t, w, items, *, size=BODY_SZ, color=INK, gap=0.62,
            dividers=True, divider_color=HAIRLINE):
    """A list separated by hairlines rather than boxed into cards."""
    y = t
    for i, item in enumerate(items):
        text(s, l, y, w, gap - 0.14, item, size=size, color=color)
        y += gap
        if dividers and i < len(items) - 1:
            rule(s, l, y - 0.16, w, color=divider_color)
    return y


def pairs(s, l, t, w, rows, *, size=BODY_SZ, gap=0.66, key_w=None,
          key_color=BODY, val_color=INK, val_font=None, dark=False,
          dividers=True):
    """Label on the left, value right-aligned. The deck's table primitive."""
    kw = key_w or w * 0.58
    y = t
    for i, (k, v, *rest) in enumerate(rows):
        vc = rest[0] if rest else val_color
        text(s, l, y, kw, gap - 0.16, k, size=size,
             color=ON_INK if dark else key_color)
        text(s, l + kw, y, w - kw, gap - 0.16, v, size=size,
             font=val_font or TEXT, color=vc, bold=True, align=PP_ALIGN.RIGHT)
        y += gap
        if dividers and i < len(rows) - 1:
            rule(s, l, y - 0.18, w,
                 color=INK_SOFT if dark else HAIRLINE)
    return y


def steps(s, l, t, w, items, *, cols=4, gap=0.5, rowgap=1.70, size=BODY_SZ):
    """Numbered steps with no card chrome -- a rule, a number, a line."""
    cw = (w - gap * (cols - 1)) / cols
    for i, label in enumerate(items):
        x = l + (i % cols) * (cw + gap)
        y = t + (i // cols) * rowgap
        rule(s, x, y, cw, color=INK)
        text(s, x, y + 0.24, cw, 0.34, f"{i + 1:02d}", font=DISPLAY,
             size=LABEL, color=MUTED, bold=True, track=80)
        text(s, x, y + 0.68, cw, 0.90, label, size=size, color=INK, line=1.26)


def caption(s, body, *, top, color=MUTED, size=SMALL, width=CW, left=M,
            align=PP_ALIGN.LEFT):
    return text(s, left, top, width, 0.50, body, size=size, color=color,
                align=align, line=1.35)


def page_mark(s, n, *, dark=False):
    """A quiet slide number. The only furniture on a content slide."""
    text(s, W - M - 1.2, H - 0.92, 1.2, 0.34, f"{n:02d}", font=TEXT,
         size=LABEL, color=ON_INK_DIM if dark else MUTED,
         align=PP_ALIGN.RIGHT, track=100)
