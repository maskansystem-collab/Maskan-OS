# The Maskan OS deck

`Maskan-OS-deck.pptx`, 24 slides, built from source rather than hand-placed so
that a change to the product is a change to a Python file, not an afternoon of
dragging boxes.

```bash
pip install python-pptx
python3 build.py          # writes Maskan-OS-deck.pptx beside this file
```

## Layout

| File | What it holds |
| --- | --- |
| `kit.py` | The grid, the palette and the drawing primitives |
| `slides_a.py` | Slides 1–12: the pitch and the product walkthrough |
| `slides_b.py` | Slides 13–24: portals, proof, commercials, close |
| `build.py` | The running order |
| `mklogo.py` | Regenerates `assets/logo-*.png` from the SVG |

## The grid

A 20in × 11.25in stage with a 1.17in margin and a 17.67in content width,
divided into four 4.26in columns with a 0.21in gutter. These numbers were read
out of the previous deck so the two sit on the same grid; `grid(n)` gives even
columns for any other count.

## Two things worth knowing before editing

**Fonts are Arial and Courier New on purpose.** A .pptx carries no fonts.
Anything not installed on the machine that opens it is silently substituted,
and the substitute reflows the slide. The brand faces — Archivo and Inter
Tight — appear only in the logo, which is a PNG with the wordmark already
converted to outlines, so it cannot be substituted. Changing the typeface here
trades a deck that renders identically everywhere for one that renders
correctly only on machines with the fonts installed.

**Nothing clips.** A text box that is too small does not truncate; it spills
over whatever is beneath it, and the spill is invisible until the slide is
rendered. So after any edit:

```bash
soffice --headless --convert-to pdf Maskan-OS-deck.pptx --outdir .
pdftoppm -png -r 55 Maskan-OS-deck.pdf s      # then look at every page
```

Measuring a string by multiplying its length by an average character width is
what caused most of the first build's overflows — `CHAR_W` is deliberately
generous, and `label_row()` exists so that rows of labels use even columns,
which cannot overflow, instead of estimated widths, which did.

## Keeping the numbers true

Slides 11, 12, 13, 14, 16 and 17 state counts that come from the codebase and
the schema, not from marketing:

```bash
find app -name page.tsx | wc -l                      # screens  (slide 17: 57)
grep -c '^create table'  supabase/migrations/*.sql   # tables   (slide 17: 70)
grep -c '^create policy' supabase/migrations/*.sql   # policies (slide 17: 159)
sed -n '/insert into plans/,/on conflict/p' \
    supabase/migrations/0017_reference_data.sql      # plans    (slide 18)
```

If those change, change the slides.
