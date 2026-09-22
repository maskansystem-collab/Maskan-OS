import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, Building2, CheckCircle2, FileSignature, Landmark,
  ReceiptText, ShieldCheck, Users, Wallet, Wrench,
} from "lucide-react";
import { getSessionContext } from "@/lib/permissions/context";
import { landingPathFor } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";
import { DashboardShot, ArrearsShot, ChequeShot } from "@/features/marketing/product-shots";
import { Button } from "@/components/ui/button";
import { MaskanLogo } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

/**
 * The front door.
 *
 * Signed-in visitors never see this: landingPathFor decides where each role
 * belongs and we redirect there, exactly as before. Signed-out visitors get
 * the marketing page rather than being bounced to a login form they have no
 * account for.
 */
export default async function LandingPage() {
  const ctx = await getSessionContext();
  if (ctx) redirect(landingPathFor(ctx));

  // Plans are readable without a session, so the pricing below is the real
  // table rather than a copy that drifts.
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("key, name, max_units, monthly_price_qar, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  const money = (n: number | null) =>
    n === null ? "Talk to us" : n === 0 ? "Free" : `QAR ${n.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-paper">
      {/* ── header ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-6 px-5">
          <Link href="/" aria-label="Maskan">
            <MaskanLogo className="h-[28px] w-auto text-neutral-900" />
          </Link>

          <nav className="hidden items-center gap-7 text-[13.5px] text-neutral-600 md:flex">
            {[["Platform", "#platform"], ["Cheques", "#cheques"], ["Portals", "#portals"], ["Pricing", "#pricing"]].map(
              ([label, href]) => (
                <a key={href} href={href} className="transition-colors hover:text-neutral-900">{label}</a>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-in" className="hidden sm:block">
              <Button size="sm">Book a walkthrough</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-[0.55]"
          style={{ background: "radial-gradient(60% 55% at 50% 0%, #EDFBC4 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-[1180px] px-5 pb-14 pt-16 sm:pt-20">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-600">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              Built for how property is actually let in Qatar
            </span>

            <h1 className="mt-5 font-display text-[clamp(36px,6vw,62px)] font-extrabold leading-[1.02] tracking-[-0.05em] text-neutral-900 [font-stretch:106%]">
              Rent collected. Cheques tracked.
              <br className="hidden sm:block" /> Owners paid on time.
            </h1>

            <p className="mx-auto mt-5 max-w-[620px] text-[16px] leading-relaxed text-neutral-600">
              Maskan runs the whole tenancy: the offer, the contract, the post-dated cheques
              sitting in your drawer, the arrears nobody chased, and the statement the owner
              is waiting for. One record per unit, per tenant, per owner.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/sign-in"><Button>Book a walkthrough</Button></Link>
              <a href="#platform">
                <Button variant="outline">
                  See what it covers <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>

          <DashboardShot className="mx-auto mt-12 max-w-[880px] [animation:slide-up_.8s_cubic-bezier(.22,1,.36,1)_.15s_both]" />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {([
              { label: "Every cheque, from received to cleared", Icon: Landmark },
              { label: "Arrears aged, not just totalled", Icon: Wallet },
              { label: "Owner statements that reconcile", Icon: ReceiptText },
            ] as const).map(({ label, Icon }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-[12px] border border-neutral-200 bg-white px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                <span className="text-[13px] text-neutral-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── what it covers ── */}
      <section id="platform" className="border-t border-neutral-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-neutral-400">
            What Maskan covers
          </p>
          <h2 className="mt-3 max-w-[660px] font-display text-[clamp(26px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
            From the first viewing to the final statement.
          </h2>
          <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-neutral-600">
            Nothing is bolted on. The lease that gets signed is the lease that generates the
            rent schedule, that the cheque is matched against, that the owner statement draws
            from.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {([
              { Icon: Building2, title: "Portfolio", body: "Properties, buildings, units and ownership splits. A unit held by two owners apportions every figure correctly." },
              { Icon: FileSignature, title: "Letting", body: "Enquiries, viewings and offers. Compare a twelve and a twenty-four month offer on what each earns per year, not the headline total." },
              { Icon: Wallet, title: "Rent and arrears", body: "Instalments and payments stay separate records joined by an allocation, which is the only honest way to record a part payment." },
              { Icon: Landmark, title: "Cheques", body: "Received, stored, submitted, cleared or bounced. The ledger only moves on clearing." },
              { Icon: Wrench, title: "Maintenance", body: "Requests from tenants, work orders to contractors, and a spend limit that decides what needs the owner's word." },
              { Icon: ReceiptText, title: "Owner statements", body: "Rent collected, less costs, less the fee. Finalising locks the figures and versions the statement." },
            ] as const).map(({ Icon, title, body }) => (
              <div key={title} className="reveal rounded-[16px] border border-neutral-200 bg-paper p-5 transition-colors hover:border-neutral-300">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-neutral-900 text-lime">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3.5 font-display text-[16px] font-extrabold tracking-[-0.03em] text-neutral-900 [font-stretch:104%]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── cheques, the differentiator ── */}
      <section id="cheques" className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-neutral-400">
              Post-dated cheques
            </p>
            <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
              A drawer full of cheques is not a ledger.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              Most systems treat a cheque as a payment the moment you take it. That is how a
              bounce three weeks later turns into a surprise, and how a tenant shows as paid
              while the money never arrived.
            </p>
            <ul className="mt-5 space-y-3">
              {[
                "Every cheque carries a state: received, stored, due soon, submitted, cleared, bounced or replaced.",
                "Only clearing moves the ledger. A bounce puts the debt straight back where it was.",
                "The register tells you what to deposit this week, before the date passes.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-neutral-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <ChequeShot className="reveal" />
        </div>
      </section>

      {/* ── arrears ── */}
      <section className="border-y border-neutral-200 bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-2">
          <ArrearsShot className="reveal order-2 lg:order-1" />
          <div className="reveal order-1 lg:order-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-neutral-400">
              Arrears
            </p>
            <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
              A total tells you nothing. An age tells you everything.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              Two hundred thousand outstanding is fine if it fell due yesterday and serious if
              it has been sitting for ninety days. Maskan ages every debt from the oldest
              unpaid instalment on the lease, so you chase the right tenant first.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
              The same applies to collection rate. Seventy-nine per cent is unremarkable on its
              own and alarming after three months at ninety-four, which is why the dashboard
              never shows the figure without the trend beside it.
            </p>
          </div>
        </div>
      </section>

      {/* ── portals ── */}
      <section id="portals" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <p className="text-[12px] font-bold uppercase tracking-[0.13em] text-neutral-400">
            Everyone in one system
          </p>
          <h2 className="mt-3 max-w-[640px] font-display text-[clamp(26px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
            Four ways in, one set of records.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {([
              { Icon: Users, title: "Your team", body: "Managers, accountants and maintenance staff see only what their role allows, enforced in the database rather than the interface." },
              { Icon: Building2, title: "Owners", body: "Their properties, their statements, their empty units and what the vacancy has cost them." },
              { Icon: ShieldCheck, title: "Tenants", body: "Rent schedule, how to pay, receipts, repairs and the renewal offer when it comes." },
              { Icon: Wrench, title: "Contractors", body: "Only the jobs assigned to them. Accept, arrive, finish." },
            ] as const).map(({ Icon, title, body }) => (
              <div key={title} className="reveal rounded-[16px] border border-neutral-200 bg-white p-5">
                <Icon className="h-4 w-4 text-neutral-400" />
                <h3 className="mt-3 font-display text-[15px] font-extrabold tracking-[-0.03em] text-neutral-900 [font-stretch:104%]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── the spreadsheet comparison ── */}
      <section className="border-t border-neutral-200 bg-neutral-900 py-16 text-neutral-50 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <h2 className="max-w-[720px] font-display text-[clamp(26px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.045em] [font-stretch:106%]">
            The spreadsheet does not know a cheque bounced.
          </h2>
          <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-on-ink">
            Most Qatari agencies run on a rent sheet, a cheque drawer, a WhatsApp group and one
            person who remembers everything. It works until that person takes leave.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#8B7F7C]">
                On a spreadsheet
              </p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-on-ink">
                {["Rent due lives in one file, cheques in a drawer, repairs in a chat",
                  "A part payment either marks the month paid or it does not",
                  "Owner statements rebuilt by hand every quarter",
                  "Nobody can say what is owed without an afternoon of adding up"].map((t) => (
                  <li key={t} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#6E625F]" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[16px] border border-lime/25 bg-lime/[0.07] p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-lime">On Maskan</p>
              <ul className="mt-4 space-y-2.5 text-[14px] text-neutral-50">
                {["One record per unit; everything else reads from it",
                  "A part payment settles part of a month and says so",
                  "Statements generate, then lock, then version if reissued",
                  "The figure is on the dashboard before you ask for it"].map((t) => (
                  <li key={t} className="flex gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lime" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── pricing, read from the real plans table ── */}
      <section id="pricing" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5">
          <h2 className="font-display text-[clamp(26px,3.4vw,40px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
            Priced by how many units you manage.
          </h2>
          <p className="mt-3 max-w-[560px] text-[15px] text-neutral-600">
            Every plan includes the full system. Larger plans raise the limits and add
            support, they do not unlock the parts you need to do the job.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(plans ?? []).map((p) => {
              const featured = p.key === "growth";
              return (
                <div key={p.key}
                  className={`reveal flex flex-col rounded-[16px] border p-6 ${
                    featured ? "border-neutral-900 bg-white shadow-lg" : "border-neutral-200 bg-white"}`}>
                  {featured && (
                    <span className="mb-3 w-fit rounded-full bg-lime px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-neutral-900">
                      Most agencies
                    </span>
                  )}
                  <h3 className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-neutral-900 [font-stretch:104%]">
                    {p.name}
                  </h3>
                  <p className="mt-2 font-display text-[28px] font-extrabold tabular-nums leading-none tracking-[-0.045em] text-neutral-900 [font-stretch:104%]">
                    {money(p.monthly_price_qar)}
                  </p>
                  <p className="mt-1 text-[12.5px] text-neutral-500">
                    {p.monthly_price_qar ? "a month" : "\u00A0"}
                  </p>
                  <p className="mt-4 text-[13.5px] text-neutral-600">
                    {p.max_units ? `Up to ${p.max_units} units` : "Unlimited units"}
                  </p>
                  <div className="mt-auto pt-6">
                    <Link href="/sign-in" className="block">
                      <Button variant={featured ? "default" : "outline"} size="sm" className="w-full">
                        {p.monthly_price_qar === null ? "Talk to us" : "Get started"}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── closing ── */}
      <section className="border-t border-neutral-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[680px] px-5 text-center">
          <h2 className="font-display text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.08] tracking-[-0.045em] text-neutral-900 [font-stretch:106%]">
            See it against your own portfolio.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-neutral-600">
            Bring a rent sheet and a handful of cheques. Half an hour is usually enough to
            tell whether this fits how you already work.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Link href="/sign-in"><Button>Book a walkthrough</Button></Link>
            <Link href="/sign-in"><Button variant="outline">Sign in</Button></Link>
          </div>
        </div>
      </section>

      {/* ── footer ── */}
      <footer className="border-t border-neutral-200 py-10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <MaskanLogo className="h-[22px] w-auto text-neutral-900" />
            <span className="text-[13px] text-neutral-600">Property management for Qatar</span>
          </div>
          <p className="text-[12.5px] text-neutral-400">
            © {new Date().getFullYear()} Maskan OS
          </p>
        </div>
      </footer>
    </div>
  );
}
