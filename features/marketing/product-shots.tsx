/**
 * Product shots.
 *
 * These are SVG recreations of the real screens, not screenshots. They use
 * the same tokens the app does, so they stay correct when the theme moves,
 * they are crisp on any display, they weigh a few kilobytes instead of a
 * few hundred, and they animate. The figures match the seeded demo data so
 * nothing here claims numbers the product cannot produce.
 */

/** The dark collection hero, as it appears at the top of the dashboard. */
export function DashboardShot({ className }: { className?: string }) {
  const trend = [94, 91, 88, 85, 82, 79];
  const W = 250, H = 74, PAD = 10, TOP = 14, BOT = 62;
  const pts = trend.map((r, i) => ({
    x: PAD + (i * (W - PAD * 2)) / (trend.length - 1),
    y: BOT - (r / 100) * (BOT - TOP),
  }));
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-neutral-900 shadow-2xl">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
          <span className="ml-3 text-[11px] text-white/35">maskan.qa/dashboard</span>
        </div>

        <div className="grid sm:grid-cols-[1fr_260px]">
          <div className="px-6 py-5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8B7F7C]">
              Rent collection, September
            </p>
            <p className="mt-2.5 font-display text-[34px] font-extrabold leading-none tabular-nums tracking-[-0.048em] text-neutral-50 [font-stretch:106%]">
              QAR 298,400
            </p>
            <p className="mt-1 text-[12px] text-on-ink">collected of QAR 377,700 due</p>

            <div className="mt-4 h-[7px] max-w-[320px] overflow-hidden rounded-full bg-white/[0.14]">
              <div className="h-full rounded-full bg-lime [animation:grow-bar_1.4s_cubic-bezier(.22,1,.36,1)_both]" style={{ width: "79%" }} />
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-[#8B7F7C]">
              <span><b className="text-neutral-50">79%</b> collected</span>
              <span><b className="text-neutral-50">QAR 79,300</b> outstanding</span>
              <span><b className="text-neutral-50">9</b> behind</span>
            </div>
          </div>

          <div className="border-t border-white/[0.09] bg-white/[0.045] px-5 py-4 sm:border-l sm:border-t-0">
            <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#8B7F7C]">
              Six months
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-[62px] w-full" aria-hidden>
              <defs>
                <linearGradient id="shot-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6F24E" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`} fill="url(#shot-fill)" />
              <path
                d={`M${line}`} fill="none" stroke="#C6F24E" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                pathLength={1} strokeDasharray={1} strokeDashoffset={1}
                className="[animation:draw-line_1.6s_cubic-bezier(.22,1,.36,1)_.2s_both]"
              />
              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill="#C6F24E"
                className="[animation:fade-in_.4s_ease_1.6s_both]" />
            </svg>
            <p className="mt-1.5 text-[11px] text-[#8B7F7C]">
              79% this month, <span className="text-[#F5A9A9]">down from 94%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The arrears table, showing the ageing buckets. */
export function ArrearsShot({ className }: { className?: string }) {
  const rows = [
    ["Elena Petrova", "The Pearl · 1204", "31 to 60 days", "QAR 31,500", "warn"],
    ["Ahmed Hassan", "West Bay · 302", "Over 90 days", "QAR 24,600", "bad"],
    ["Li Wei", "Lusail Marina · 503", "1 to 30 days", "QAR 11,000", "warn"],
    ["Carlos Silva", "Al Waab · Villa 4", "1 to 30 days", "QAR 8,200", "warn"],
  ] as const;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[16px] border border-neutral-200 bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <p className="font-display text-[15px] font-extrabold tracking-[-0.03em] text-neutral-900 [font-stretch:104%]">
            Outstanding rent
          </p>
          <p className="text-[12px] text-neutral-500">Aged from the oldest unpaid instalment</p>
        </div>

        {/* the ageing distribution, as one bar */}
        <div className="px-5 pt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="bg-neutral-300 [animation:grow-bar_1s_cubic-bezier(.22,1,.36,1)_both]" style={{ width: "22%" }} />
            <div className="bg-amber-500 [animation:grow-bar_1s_cubic-bezier(.22,1,.36,1)_.1s_both]" style={{ width: "46%" }} />
            <div className="bg-red-600 [animation:grow-bar_1s_cubic-bezier(.22,1,.36,1)_.2s_both]" style={{ width: "32%" }} />
          </div>
        </div>

        <table className="mt-3 w-full border-collapse text-[12.5px]">
          <thead className="border-y border-neutral-200 bg-[#F9F6F4]">
            <tr>
              {["Tenant", "Unit", "Age", "Owed"].map((h, i) => (
                <th key={h} className={`px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.085em] text-neutral-400 ${i === 0 ? "pl-5" : ""} ${i === 3 ? "pr-5 text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([who, unit, age, owed, tone], i) => (
              <tr key={who} className="[animation:slide-up_.4s_cubic-bezier(.22,1,.36,1)_both]" style={{ animationDelay: `${i * 90 + 200}ms` }}>
                <td className="border-t border-neutral-100 py-2.5 pl-5 pr-3 font-medium text-neutral-900">{who}</td>
                <td className="border-t border-neutral-100 px-3 py-2.5 text-neutral-600">{unit}</td>
                <td className="border-t border-neutral-100 px-3 py-2.5">
                  <span className={`rounded-full border px-2 py-[2px] text-[10.5px] font-semibold ${
                    tone === "bad" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                    {age}
                  </span>
                </td>
                <td className="border-t border-neutral-100 py-2.5 pl-3 pr-5 text-right tabular-nums font-medium text-neutral-900">{owed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The cheque register, which is the screen nothing else in the market has. */
export function ChequeShot({ className }: { className?: string }) {
  const cheques = [
    ["CHQ 448120", "Qatar Islamic", "1 Oct", "QAR 12,500", "Held", "held"],
    ["CHQ 448121", "QNB", "1 Nov", "QAR 12,500", "Due in 6d", "soon"],
    ["CHQ 773455", "Doha Bank", "1 Sep", "QAR 54,000", "Bounced", "bad"],
  ] as const;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-[16px] border border-neutral-200 bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <p className="font-display text-[15px] font-extrabold tracking-[-0.03em] text-neutral-900 [font-stretch:104%]">
            Cheques held on file
          </p>
          <p className="text-[12px] text-neutral-500">A cheque is not money until it clears</p>
        </div>
        <div className="space-y-2 p-4">
          {cheques.map(([no, bank, date, amt, state, tone], i) => (
            <div key={no}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-neutral-200 px-3.5 py-2.5 [animation:slide-up_.4s_cubic-bezier(.22,1,.36,1)_both]"
              style={{ animationDelay: `${i * 120 + 150}ms` }}>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium tabular-nums text-neutral-900">{no}</p>
                <p className="text-[11px] text-neutral-500">{bank} · dated {date}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-[12.5px] tabular-nums text-neutral-900">{amt}</span>
                <span className={`rounded-full border px-2 py-[2px] text-[10.5px] font-semibold ${
                  tone === "bad" ? "border-red-200 bg-red-50 text-red-700"
                  : tone === "soon" ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600"}`}>
                  {state}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
