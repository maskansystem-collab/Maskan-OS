# The Maskan OS deck

`Maskan-OS-deck.pptx`, 24 slides, built from source rather than placed by
hand so that a change to the product is a change to a Python file.

```bash
pip install python-pptx pillow fonttools brotli
python3 build.py          # writes Maskan-OS-deck.pptx beside this file
```

| File | What it holds |
| --- | --- |
| `kit.py` | Grid, palette, type scale, drawing primitives |
| `slides_a.py` | Slides 1–12: the problem, the idea, the product |
| `slides_b.py` | Slides 13–24: portals, proof, commercials, close |
| `build.py` | Running order, and the font embedding |
| `shoot.py` | Recaptures the product mockups in `mock/` |
| `mklogo.py` | Regenerates `logo-*.png` from the SVG in `components/brand/` |

## Design rules

The deck is deliberately flat: **no card borders, no drop shadows**. Surfaces
separate by fill and by whitespace, and structure is carried by hairline
rules. Bordered, shadowed cards are the clearest tell of a dated slide
template.

Type follows the product exactly — **Archivo** for headings and figures,
**Inter Tight** for everything else, the same display/body split as
`app/globals.css`, where Archivo is display-only and never sets body copy.
The logo's wordmark is set in Inter Tight.

Margins are 1.6in on a 20 × 11.25in stage, leaving 16.8in of content. Colour
is mostly ink on paper; lime appears at most once a slide, and otherwise only
where it carries meaning in data.

## Fonts are embedded

A .pptx carries no fonts. Anything not installed on the machine that opens it
is silently substituted, and the substitute reflows every slide. `build.py`
therefore writes the four faces into `ppt/fonts/*.fntdata` and declares them
in `presentation.xml` as `<p:embeddedFontLst>`, so the deck renders correctly
on a machine that has never seen Archivo or Inter Tight.

The PDF export embeds them too, which is why the PDF is the copy to send.

## Mockups are real product

`mock/` holds screenshots captured from `maskan-v2.html` — the prototype is a
single self-contained file routed by `location.hash`, so it needs no database
and no dev server. `shoot.py` recaptures them and strips the sandbox banner
and the role-switcher overlay, which are development furniture and must never
reach a client deck. Re-run it after a UI change:

```bash
python3 -I shoot.py      # writes shots/, then re-run the crop step in mklogo-style
```

## Nothing clips — so look at every page

A text box that is too small does not truncate in PowerPoint; it spills over
whatever is beneath it, invisibly, until the slide is rendered. After any
edit:

```bash
soffice --headless --convert-to pdf Maskan-OS-deck.pptx --outdir .
pdftoppm -png -r 55 Maskan-OS-deck.pdf s      # then look at all 24
```

Two traps already paid for: `picture()` must be given a height, or a 1.6:1
screenshot 14in wide silently becomes 8.8in tall and runs off the stage; and
a literal `\n` inside a run does nothing in DrawingML, so `text()` splits
lines into separate paragraphs itself.

## Write for the buyer, not for the build

The deck once counted screens, tables and row-level security policies.
Those are build metrics. Nobody buys "ten screens", and reciting them makes
the product read as a software project rather than as something that
collects rent. If a number cannot finish the sentence "…so you will…",
it does not belong on a slide.

The same applies to the possessive. "Your owners" assumes the reader is a
managing agent; a landlord reading their own deck is then being told about
someone else's owners. Role names stay neutral — staff, owners, tenants,
vendors — and anything addressed at the owner says plainly that it works
whether you own the portfolio or manage it for someone else.

## No pricing

Prices are not in this deck and should not be added back. Money is a
conversation, not a slide — the plan tiers live in
`supabase/migrations/0017_reference_data.sql` if a figure is needed for a
specific proposal.

## The lime accent

`headline(..., accent="collected.")` picks one phrase out of a headline.
How it renders depends on the background, and this is not a style choice:

* **On ink**, pass `dark=True` and the accent becomes lime letterforms.
* **On paper**, it becomes a marker-pen highlight behind ink text, because
  lime on the paper background is roughly 1.2:1 contrast — lime type on a
  light slide is not a subtle accent, it is unreadable.

Use it on the payoff word and nowhere else. It currently falls on about
every other slide; much more often and it stops meaning anything.

## Numbering

Page numbers and section numbers both derive from a slide's position in
`BUILDERS`, so cutting or reordering a slide renumbers the deck. Nothing
should ever hardcode either again — that is how a deck ends up jumping
from 16 to 18 in front of a client.
