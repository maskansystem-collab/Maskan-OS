import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { LeaseWizard } from "@/features/leases/components/lease-wizard";
import { getPropertyOptions, getOwnerOptions } from "@/features/properties/queries";
import { getLeasableUnits, getTenantOptions } from "@/features/leases/queries";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

/**
 * New lease, on its own page.
 *
 * The wizard itself already existed and was mounted in a dialog on
 * /leases. The prototype gives it a page, which is the right shape for
 * nine steps: a dialog that tall fights the viewport, and a page can be
 * linked to, left and come back to.
 *
 * A tenant can be preselected with ?tenant=<id>, so "new lease" from a
 * tenant's record opens with them already filled in.
 */
export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { tenant } = await searchParams;
  const { ctx, membership } = await requireStaff();
  if (!hasPermission(ctx, membership.organisationId, "leases.manage")) redirect("/forbidden");

  const [properties, units, tenants, owners] = await Promise.all([
    getPropertyOptions(membership.organisationId),
    getLeasableUnits(membership.organisationId),
    getTenantOptions(membership.organisationId),
    getOwnerOptions(membership.organisationId),
  ]);

  return (
    <>
      <PageHeader
        title="New lease"
        breadcrumbs={[{ label: "Leases", href: "/leases" }, { label: "New" }]}
        description="Rent instalments are generated when the lease is activated, not while it is a draft."
      />
      <div className="mt-6 max-w-[780px]">
        <LeaseWizard
          properties={properties}
          units={units}
          tenants={tenants}
          owners={owners}
          defaultTenantId={tenant}
        />
      </div>
    </>
  );
}
