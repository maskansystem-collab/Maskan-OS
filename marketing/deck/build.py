"""Build the Maskan OS deck, with the brand fonts embedded."""

import sys, shutil, zipfile, re
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from kit import new_deck                       # noqa: E402
import slides_a as a                           # noqa: E402
import slides_b as b                           # noqa: E402

OUT = HERE / "Maskan-OS-deck.pptx"

# The running order. Page numbers and section numbers both derive from a
# slide's position here, so cutting one renumbers the rest automatically.
BUILDERS = [
    a.s_title, a.s_problem, a.s_idea, a.s_dashboard, a.s_rent, a.s_cheques,
    a.s_statements, a.s_maintenance, a.s_leases, a.s_compliance, a.s_roles,
    b.s_manager, b.s_owner_portal, b.s_tenant_portal, b.s_ownership,
    b.s_built, b.s_plans, b.s_why_now, b.s_roadmap, b.s_pilot, b.s_close,
]

# family -> (regular.ttf, bold.ttf)
FONTS = {
    "Archivo": ("Archivo-Regular.ttf", "Archivo-Bold.ttf"),
    "Inter Tight": ("InterTight-Regular.ttf", "InterTight-Bold.ttf"),
}
FONT_DIR = HERE / "fonts" / "fam"


def embed_fonts(pptx: Path):
    """Embed the brand fonts into the package.

    A .pptx carries no fonts of its own: anything not installed on the machine
    that opens it is silently substituted, and the substitute reflows every
    slide. Embedding ships the outlines inside the file so Archivo and Inter
    Tight render on a machine that has never seen them.

    PowerPoint reads these from /ppt/fonts/fontN.fntdata, declared in
    presentation.xml as <p:embeddedFontLst>. The parts are raw TrueType.
    """
    tmp = pptx.with_suffix(".tmp.pptx")
    with zipfile.ZipFile(pptx) as zin, \
         zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        names = zin.namelist()
        idx, entries, rels = 1, [], []
        for family, (reg, bold) in FONTS.items():
            parts = []
            for style, fn in (("regular", reg), ("bold", bold)):
                data = (FONT_DIR / fn).read_bytes()
                part = f"ppt/fonts/font{idx}.fntdata"
                rid = f"rIdFont{idx}"
                zout.writestr(part, data)
                rels.append((rid, f"fonts/font{idx}.fntdata"))
                parts.append((style, rid))
                idx += 1
            entries.append((family, parts))

        for n in names:
            data = zin.read(n)
            if n == "ppt/presentation.xml":
                xml = data.decode("utf-8")
                lst = ["<p:embeddedFontLst>"]
                for family, parts in entries:
                    lst.append(
                        f'<p:embeddedFont><p:font typeface="{family}" '
                        f'pitchFamily="34" charset="0"/>')
                    for style, rid in parts:
                        lst.append(f'<p:{style} r:id="{rid}"/>')
                    lst.append("</p:embeddedFont>")
                lst.append("</p:embeddedFontLst>")
                block = "".join(lst)
                # embeddedFontLst must precede sldSz in the schema's sequence
                xml = xml.replace("<p:sldSz", block + "<p:sldSz", 1)
                data = xml.encode("utf-8")
            elif n == "ppt/_rels/presentation.xml.rels":
                xml = data.decode("utf-8")
                add = "".join(
                    f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org'
                    f'/officeDocument/2006/relationships/font" Target="{tgt}"/>'
                    for rid, tgt in rels)
                xml = xml.replace("</Relationships>", add + "</Relationships>")
                data = xml.encode("utf-8")
            elif n == "[Content_Types].xml":
                xml = data.decode("utf-8")
                if "fntdata" not in xml:
                    xml = xml.replace(
                        "<Types ",
                        "<Types ", 1).replace(
                        "</Types>",
                        '<Default Extension="fntdata" ContentType='
                        '"application/x-fontdata"/></Types>')
                data = xml.encode("utf-8")
            zout.writestr(n, data)

    shutil.move(tmp, pptx)
    return idx - 1


def main():
    prs = new_deck()
    for i, fn in enumerate(BUILDERS, 1):
        fn(prs, i)
        print(f"  {i:2d}  {fn.__name__}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    n = embed_fonts(OUT)
    print(f"\n{len(BUILDERS)} slides, {n} font faces embedded -> {OUT}")


if __name__ == "__main__":
    main()
