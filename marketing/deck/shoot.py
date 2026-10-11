"""Screenshot real product screens out of the maskan-v2 prototype.

The prototype is a single self-contained HTML file routed by location.hash,
so it needs no database and no dev server -- which is the only reason real
product imagery is available at all in this environment.
"""
import asyncio
from playwright.async_api import async_playwright

SRC = "file:///mnt/user-data/outputs/maskan-v2.html"
OUT = "/tmp/claude-0/-home-claude/c35c3465-4899-5ca3-a75f-d98cf8749513/scratchpad/shots"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

ROUTES = ["dashboard", "today", "properties", "leases", "cheques", "statements",
          "outstanding", "finance", "maintenance", "owners", "tenants",
          "owner", "tenant", "vendor", "record-payment"]


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        pg = await b.new_page(viewport={"width": 1680, "height": 1050},
                              device_scale_factor=2)
        await pg.goto(SRC)
        await pg.wait_for_timeout(2000)
        # The prototype wears a sandbox banner and a role-switcher overlay.
        # Both are development furniture and must not appear in a client deck.
        await pg.add_style_tag(content="""
            #switcher, #dhg, #toasts { display: none !important; }
            [class*="sandbox"], [class*="demo-banner"] { display: none !important; }
        """)
        await pg.evaluate("""() => {
            for (const el of document.querySelectorAll('body > *, #root > *')) {
                const t = (el.textContent || '').slice(0, 120);
                if (t.includes('Interactive demo') || t.includes('SANDBOX')) el.remove();
            }
        }""")
        await pg.wait_for_timeout(400)
        for r in ROUTES:
            await pg.evaluate(f"window.go ? window.go({r!r}) : (location.hash = {r!r})")
            await pg.wait_for_timeout(1300)
            await pg.screenshot(path=f"{OUT}/{r}.png")
            head = await pg.evaluate(
                "document.querySelector('main h1, main h2, h1')?.textContent?.trim()?.slice(0,46) || '?'")
            print(f"{r:16s} {head}")
        await b.close()


asyncio.run(main())
