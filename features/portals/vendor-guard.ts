import { requireRole } from "@/lib/permissions/guards";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve the vendor behind the signed-in contractor.
 *
 * The link may sit on the membership, or only in vendor_members when the
 * account was attached to a vendor without the membership column being set.
 * Both the vendor portal and the job detail screen need this, so it lives
 * here rather than being written out twice and drifting.
 *
 * Returns a null vendorId rather than throwing: the caller shows a "not
 * linked" state, which is a configuration problem for an administrator to
 * fix, not an access error.
 */
export async function requireVendor() {
  const { ctx, membership } = await requireRole("vendor");

  let vendorId = membership.vendorId;
  if (!vendorId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vendor_members")
      .select("vendor_id")
      .eq("profile_id", ctx.userId)
      .eq("is_active", true)
      .limit(1);
    vendorId = data?.[0]?.vendor_id ?? null;
  }

  return { ctx, membership, vendorId };
}
