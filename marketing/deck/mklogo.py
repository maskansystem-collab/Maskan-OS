"""
Build the Maskan logo as a pure-path SVG and rasterise it.

The wordmark is converted to outlines rather than left as <text>. The deck
has to render identically wherever it is opened, and a <text> element would
depend on the renderer resolving "Archivo" -- which fc-list already shows
reporting itself as "Archivo SemiBold". Outlines remove that variable.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import cairosvg

FONTS = "/tmp/claude-0/-home-claude/c35c3465-4899-5ca3-a75f-d98cf8749513/scratchpad/fonts"
OUT = "/tmp/claude-0/-home-claude/c35c3465-4899-5ca3-a75f-d98cf8749513/scratchpad/logo"

# Straight from components/brand/logo.tsx so the deck and the product cannot drift.
HOUSE = "M99 50.7 L48.6 0 L0 49.6 L0 133 L100 133"
TEXT_X, TEXT_Y, TEXT_W, FONT_SIZE = 20, 104, 146, 52
WORD = "MASKAN"

font = TTFont(f"{FONTS}/Archivo-Bold.ttf")
upem = font["head"].unitsPerEm
gs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"]

# Natural advance width of the word at the target size.
names = [cmap[ord(ch)] for ch in WORD]
natural = sum(hmtx[n][0] for n in names) * FONT_SIZE / upem
# lengthAdjust="spacingAndGlyphs" scales glyphs and spacing alike.
squeeze = TEXT_W / natural

scale = FONT_SIZE / upem * squeeze
paths, pen_x = [], 0.0
for n in names:
    pen = SVGPathPen(gs)
    gs[n].draw(pen)
    d = pen.getCommands()
    if d:
        # y is negated: font space is y-up, SVG is y-down.
        paths.append(
            f'<path d="{d}" transform="translate({TEXT_X + pen_x:.3f},{TEXT_Y}) '
            f'scale({scale:.6f},{-scale:.6f})"/>'
        )
    pen_x += hmtx[n][0] * scale

print(f"natural={natural:.1f}px  squeeze={squeeze:.4f}  final={pen_x:.1f}px (target {TEXT_W})")


def svg(colour: str, stroke: float = 3.2) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 174 143">'
        f'<path d="{HOUSE}" fill="none" stroke="{colour}" stroke-width="{stroke}" '
        'stroke-linecap="square"/>'
        f'<g fill="{colour}">{"".join(paths)}</g>'
        "</svg>"
    )


def mark(colour: str) -> str:
    """The house alone, for corner marks."""
    return (
        '<xml/>'.replace("<xml/>", "")
        + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 142">'
        f'<path d="{HOUSE}" fill="none" stroke="{colour}" stroke-width="6" '
        'stroke-linecap="square"/></svg>'
    )


for name, colour in [("ink", "#170100"), ("paper", "#FBF9F8"), ("lime", "#C6F24E")]:
    cairosvg.svg2png(bytestring=svg(colour).encode(), write_to=f"{OUT}-{name}.png",
                     output_width=1740, output_height=1430)
    cairosvg.svg2png(bytestring=mark(colour).encode(), write_to=f"{OUT}-mark-{name}.png",
                     output_width=1080, output_height=1420)
    print("wrote", name)
