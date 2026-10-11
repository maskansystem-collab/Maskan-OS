"""
Drawing kit for the Maskan OS deck.

The measurements here are not invented: they were read back out of the
existing Rent_OS_slide_deck with python-pptx, so the refreshed deck sits on
exactly the same grid as the one it replaces. A 20in x 11.25in stage, a
1.17in margin, and a four-column grid of 4.26in cards with a 0.21in gutter
that adds up to the 17.67in content width.

Typefaces are deliberately Arial and Courier New rather than the product's
Archivo and Inter Tight. A .pptx carries no fonts: anything not installed on
the machine that opens it is silently substituted, and the substitute
reflows the slide. Arial and Courier New are present everywhere. The one
place the real brand face appears is the logo, which is a PNG with the
wordmark already converted to outlines, so it cannot be substituted at all.
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
import copy
from pathlib import Path

# --- palette, straight from app/globals.css --------------------------------
INK = RGBColor(0x17, 0x01, 0x00)
INK_SOFT = RGBColor(0x33, 0x20, 0x1C)
PAPER = RGBColor(0xFB, 0xF9, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SURFACE = RGBColor(0xF7, 0xF3, 0xF1)
BORDER = RGBColor(0xEA, 0xE4, 0xE2)
MUTED = RGBColor(0xA6, 0x98, 0x94)
BODY = RGBColor(0x5C, 0x4A, 0x46)
DIM = RGBColor(0x8B, 0x7F, 0x7C)
DIM2 = RGBColor(0xC9, 0xBD, 0xBA)
LIME = RGBColor(0xC6, 0xF2, 0x4E)
LIME_PALE = RGBColor(0xED, 0xFB, 0xC4)
LIME_DARK = RGBColor(0x3F, 0x4A, 0x18)
GREEN = RGBColor(0x0F, 0x8A, 0x5F)
GREEN_PALE = RGBColor(0xE9, 0xFA, 0xF2)
AMBER = RGBColor(0xB4, 0x53, 0x09)
AMBER_PALE = RGBColor(0xFF, 0xFB, 0xEB)
RED = RGBColor(0xB9, 0x1C, 0x1C)
RED_PALE = RGBColor(0xFE, 0xF2, 0xF2)
BLUE = RGBColor(0x03, 0x69, 0xA1)
BLUE_PALE = RGBColor(0xF0, 0xF9, 0xFF)

# --- grid ------------------------------------------------------------------
W, H = 20.0, 11.25
M = 1.17                      # page margin
CW = 17.67                    # content width
COL = 4.26                    # card width in the four-up grid
GUT = 0.21                    # gutter

SANS = "Arial"
MONO = "Courier New"

LOGO = str(Path(__file__).parent / "assets" / "logo")


def col_x(i: int, span: int = 1) -> tuple[float, float]:
    """Left edge and width of `span` columns starting at column `i`."""
    return M + i * (COL + GUT), span * COL + (span - 1) * GUT


def grid(n: int, gutter: float = GUT) -> tuple[float, list[float]]:
    """Width and left edges for `n` equal columns spanning the content width."""
    w = (CW - gutter * (n - 1)) / n
    return w, [M + i * (w + gutter) for i in range(n)]


def new_deck() -> Presentation:
    prs = Presentation()
    prs.slide_width = Inches(W)
    prs.slide_height = Inches(H)
    return prs


def slide(prs: Presentation, bg=PAPER):
    s = prs.slides.add_slide(prs.slide_layouts[6])   # blank
    bgfill = s.background.fill
    bgfill.solid()
    bgfill.fore_color.rgb = bg
    return s


# --- primitives ------------------------------------------------------------

def _tx(s, l, t, w, h):
    box = s.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return box, tf


def _set_spacing(run, hundredths: int):
    """Letter-spacing, which python-pptx does not expose."""
    run.font._rPr.set("spc", str(hundredths))


def text(s, l, t, w, h, body, *, font=SANS, size=24, color=BODY, bold=False,
         align=PP_ALIGN.LEFT, spacing=None, line=None, anchor=MSO_ANCHOR.TOP,
         space_after=0):
    """A text box. `body` may be a string or a list of (text, overrides) runs."""
    box, tf = _tx(s, l, t, w, h)
    tf.vertical_anchor = anchor
    lines = body if isinstance(body, list) else [body]
    # A literal newline inside a run does nothing in DrawingML; each line has
    # to become its own paragraph or it silently runs on and overflows.
    expanded = []
    for item in lines:
        if isinstance(item, str) and "\n" in item:
            expanded.extend(item.split("\n"))
        else:
            expanded.append(item)
    lines = expanded
    for i, item in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line:
            p.line_spacing = line
        if space_after:
            p.space_after = Pt(space_after)
        runs = item if isinstance(item, list) else [(item, {})]
        for txt, over in runs:
            r = p.add_run()
            r.text = txt
            f = r.font
            f.name = over.get("font", font)
            f.size = Pt(over.get("size", size))
            f.bold = over.get("bold", bold)
            f.color.rgb = over.get("color", color)
            sp = over.get("spacing", spacing)
            if sp:
                _set_spacing(r, sp)
    return box


def rect(s, l, t, w, h, *, fill=WHITE, line=BORDER, lw=1.0, radius=None):
    shape = s.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
        Inches(l), Inches(t), Inches(w), Inches(h))
    if radius:
        # adjustment is the corner radius as a fraction of the shorter side
        shape.adjustments[0] = min(0.5, radius / min(w, h))
    if fill is None:
        shape.fill.background()
    else:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(lw)
    shape.shadow.inherit = False
    if shape.has_text_frame:
        shape.text_frame.text = ""
    return shape


def logo(s, l, t, w, variant="ink"):
    """The full lockup. Aspect is fixed by the artwork at 174:143."""
    return s.shapes.add_picture(f"{LOGO}-{variant}.png", Inches(l), Inches(t),
                                width=Inches(w), height=Inches(w * 143 / 174))


def mark(s, l, t, w, variant="faint"):
    """The house alone. Aspect 108:142."""
    return s.shapes.add_picture(f"{LOGO}-mark-{variant}.png", Inches(l), Inches(t),
                                width=Inches(w), height=Inches(w * 142 / 108))


# --- composed blocks -------------------------------------------------------

def eyebrow(s, label, *, color=MUTED, top=0.96):
    return text(s, M, top, CW, 0.42, label, font=MONO, size=22.5,
                color=color, spacing=150)


def headline(s, title, *, size=66, top=2.35, color=INK, dot=True, width=CW,
             left=M, line=1.04):
    """A headline with the lime full stop the deck uses as its signature.

    Explicit line breaks become separate paragraphs, and the full stop is
    appended to the last of them so it always trails the final word.
    """
    parts = title.split("\n")
    paras = [[(p, {})] for p in parts]
    if dot:
        paras[-1].append((".", {"color": LIME}))
    height = len(parts) * size / 72 * line + 0.4
    return text(s, left, top, width, height, paras, font=SANS, size=size,
                color=color, bold=True, line=line)


def label_row(s, left, top, width, labels, *, size=23.25, color=INK,
              font=SANS, h=0.42):
    """Labels spread evenly across a width.

    Measuring a string by multiplying its length by an average character
    width is what overflowed the first build: one long label pushed every
    label after it off the slide. Even columns cannot overflow.
    """
    n = len(labels)
    cw = width / n
    for i, label in enumerate(labels):
        text(s, left + i * cw, top, cw - 0.12, h, label, font=font, size=size,
             color=color)
    return top + h


def head(s, number, label, title, *, size=66, dark=False, dot=True):
    """Eyebrow plus headline — the opening of nearly every content slide."""
    eyebrow(s, f"{number} — {label}", color=DIM if dark else MUTED)
    headline(s, title, size=size, color=PAPER if dark else INK, dot=dot)


def card(s, l, t, w, h, *, fill=WHITE, line=BORDER, radius=0.14):
    return rect(s, l, t, w, h, fill=fill, line=line, radius=radius)


def stat(s, l, t, w, label, value, caption, *, h=2.50, value_color=INK,
         fill=WHITE, line=BORDER, bar=None):
    """A labelled figure card: mono label, mono figure, small caption."""
    card(s, l, t, w, h, fill=fill, line=line)
    pad = 0.36
    text(s, l + pad, t + pad, w - 2 * pad, 0.38, label, font=MONO, size=20.25,
         color=MUTED, spacing=120)
    text(s, l + pad, t + pad + 0.49, w - 2 * pad, 0.62, value, font=MONO,
         size=33, color=value_color, bold=True)
    text(s, l + pad, t + pad + 1.22, w - 2 * pad, 0.34, caption, font=SANS,
         size=19.5, color=BODY)
    if bar is not None:
        track = w - 2 * pad
        rect(s, l + pad, t + h - 0.56, track, 0.06, fill=BORDER, line=None)
        rect(s, l + pad, t + h - 0.56, track * bar, 0.06, fill=LIME, line=None)


# Arial's average advance for mixed-case text, in inches per character per
# point. Measured generously on purpose: a chip that is slightly too wide
# looks fine, one that is slightly too narrow wraps its last letter onto a
# second line and spills out of the shape.
CHAR_W = 0.0098


def _pill_w(label: str, size: float, padx: float) -> float:
    return len(label) * size * CHAR_W + padx * 2


def pill(s, l, t, label, *, size=21, fill=WHITE, line=BORDER, color=BODY,
         padx=0.26, h=0.55):
    """A rounded chip sized to its label. Returns the width it consumed."""
    w = _pill_w(label, size, padx)
    rect(s, l, t, w, h, fill=fill, line=line, radius=h / 2)
    # The inner box is given the full chip width less a hair, not the width
    # minus both paddings, so a slightly wide glyph cannot force a wrap.
    text(s, l + padx, t + (h - 0.37) / 2 + 0.02, w - padx - 0.06, 0.37, label,
         font=SANS, size=size, color=color)
    return w


def pill_row(s, left, top, labels, *, maxw=CW, gap=0.16, rowgap=0.12, **kw):
    """Chips flowed over as many rows as they need."""
    size, padx = kw.get("size", 21), kw.get("padx", 0.26)
    x, y = left, top
    for label in labels:
        w = _pill_w(label, size, padx)
        if x > left and x + w > left + maxw:
            x, y = left, y + 0.55 + rowgap
        pill(s, x, y, label, **kw)
        x += w + gap
    return y + 0.55


def rule(s, l, t, w, *, color=BORDER, weight=0.012):
    return rect(s, l, t, w, weight, fill=color, line=None)


def note(s, l, t, w, h, label, body, *, fill=LIME_PALE, label_color=LIME_DARK,
         body_color=INK, size=21):
    """The pale callout box used for asides."""
    card(s, l, t, w, h, fill=fill, line=None)
    pad = 0.34
    text(s, l + pad, t + pad, w - 2 * pad, 0.34, label, font=MONO, size=18.75,
         color=label_color, spacing=140)
    text(s, l + pad, t + pad + 0.46, w - 2 * pad, h - pad * 2 - 0.46, body,
         font=SANS, size=size, color=body_color, line=1.26)


def arrow_chain(s, left, top, items, *, size=22.5, gap=0.30, color=INK,
                arrow_color=MUTED):
    """Owner → Property → Building → … laid out on one line."""
    x = left
    for i, item in enumerate(items):
        w = len(item) * size * CHAR_W
        text(s, x, top, w + 0.1, 0.42, item, font=SANS, size=size, color=color,
             bold=True)
        x += w + gap
        if i < len(items) - 1:
            text(s, x, top, 0.3, 0.42, "→", font=SANS, size=size,
                 color=arrow_color)
            x += 0.3 + gap
    return x


def numbered(s, l, t, w, num, title, body, *, h=1.9, fill=WHITE, line=BORDER,
             num_color=LIME_DARK, num_bg=LIME_PALE):
    """A numbered step card."""
    card(s, l, t, w, h, fill=fill, line=line)
    pad = 0.32
    rect(s, l + pad, t + pad, 0.52, 0.52, fill=num_bg, line=None, radius=0.14)
    text(s, l + pad, t + pad + 0.10, 0.52, 0.34, num, font=MONO, size=19.5,
         color=num_color, bold=True, align=PP_ALIGN.CENTER)
    text(s, l + pad + 0.72, t + pad + 0.06, w - pad * 2 - 0.72, 0.40, title,
         font=SANS, size=23.25, color=INK, bold=True)
    if body:
        text(s, l + pad, t + pad + 0.78, w - pad * 2, h - pad * 2 - 0.78, body,
             font=SANS, size=19.5, color=BODY, line=1.24)


def corner(s, dark=False):
    """The quiet house mark that runs on every content slide.

    It sits in the header band beside the eyebrow rather than the footer: the
    footer is where the dark summary cards land, and the mark was printing on
    top of them.
    """
    mark(s, W - M - 0.30, 0.90, 0.30, "dimdark" if dark else "faint")
