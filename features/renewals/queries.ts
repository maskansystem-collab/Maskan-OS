import { createClient } from "@/lib/supabase/server";

/**
 * The renewal pipeline.
 *
 * Nothing new is stored: a lease has an end date, and
 * lease_renewal_offers records what was put to the tenant and what they
 * said. The pipeline is those two read together, so it cannot disagree
 * with either.
 */

/** Inside this many days of expiry, a lease needs an offer out. */
const ACTION_WINDOW_DAYS = 90;

export type RenewalBand = "needs_offer" | "offer_out" | "accepted" | "declined" | "lapsed";

export interface RenewalRow {
  leaseId: string;
  lease_code: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  end_date: string;
  daysLeft: number;
  monthly_rent: number;
  lease_status: string;
  offer: {
    id: string;
    new_monthly_rent: number;
    new_start_date: string;
    new_end_date: string;
    status: string;
    created_at: string;
    responded_at: string | null;
  } | null;
  /** The uplift the offer asks for, as a percentage of current rent. */
  upliftPct: number | null;
  band: RenewalBand;
}

const daysBetween = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

function bandFor(daysLeft: number, offerStatus: string | null): RenewalBand {
  if (offerStatus === "accepted") return "accepted";
  if (offerStatus === "declined") return "declined";
  if (offerStatus === "pending" || offerStatus === "discussion_requested") return "offer_out";
  // No live offer. Expired already is lapsed; still running needs one.
  return daysLeft < 0 ? "lapsed" : "needs_offer";
}

export async function listRenewals(
  organisationId: string,
  filters: { band?: string } = {}
): Promise<RenewalRow[]> {
  const supabase = await createClient();

  // Leases worth chasing: running, or recently ended without a renewal.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + ACTION_WINDOW_DAYS);
  const floor = new Date();
  floor.setDate(floor.getDate() - 180);

  const { data: leases } = await supabase
    .from("leases")
    .select(
      `id, lease_code, end_date, monthly_rent, status,
       tenants!inner ( name ), properties!inner ( name ), units!inner ( unit_number )`
    )
    .eq("organisation_id", organisationId)
    .in("status", ["active", "expiring", "renewal_offered", "expired"])
    .gte("end_date", floor.toISOString().slice(0, 10))
    .lte("end_date", horizon.toISOString().slice(0, 10))
    .order("end_date");

  if (!leases || leases.length === 0) return [];

  const { data: offers } = await supabase
    .from("lease_renewal_offers")
    .select(
      `id, lease_id, new_monthly_rent, new_start_date, new_end_date, status,
       created_at, responded_at`
    )
    .in("lease_id", leases.map((l) => l.id))
    .order("created_at", { ascending: false });

  // Most recent offer per lease: an earlier declined one should not hide
  // the one currently out.
  const latest = new Map<string, NonNullable<RenewalRow["offer"]>>();
  for (const o of offers ?? []) {
    if (!latest.has(o.lease_id)) {
      latest.set(o.lease_id, {
        id: o.id,
        new_monthly_rent: Number(o.new_monthly_rent),
        new_start_date: o.new_start_date,
        new_end_date: o.new_end_date,
        status: o.status,
        created_at: o.created_at,
        responded_at: o.responded_at,
      });
    }
  }

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  const rows: RenewalRow[] = leases.map((l) => {
    const offer = latest.get(l.id) ?? null;
    const rent = Number(l.monthly_rent);
    const daysLeft = daysBetween(l.end_date);
    return {
      leaseId: l.id,
      lease_code: l.lease_code,
      tenant_name: one(l.tenants)?.name ?? "—",
      property_name: one(l.properties)?.name ?? "—",
      unit_number: one(l.units)?.unit_number ?? "—",
      end_date: l.end_date,
      daysLeft,
      monthly_rent: rent,
      lease_status: l.status,
      offer,
      upliftPct:
        offer && rent > 0
          ? Math.round(((offer.new_monthly_rent - rent) / rent) * 1000) / 10
          : null,
      band: bandFor(daysLeft, offer?.status ?? null),
    };
  });

  return filters.band ? rows.filter((r) => r.band === filters.band) : rows;
}
