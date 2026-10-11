import { requireStaff } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/context";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ImportWizard } from "@/features/import/components/import-wizard";

export const dynamic = "force-dynamic";

/**
 * The migration centre.
 *
 * The wizard, the CSV parsing, the column mapping, the row validation and
 * the import action were all already written — only this route file was
 * missing, so both links to /import from onboarding returned a 404.
 *
 * Importing writes records in bulk, so it is gated on the same permission
 * that governs creating them by hand.
 */
export default async function ImportPage() {
  const { ctx, membership } = await requireStaff();
  if (!hasPermission(ctx, membership.organisationId, "properties.manage")) redirect("/forbidden");

  return (
    <>
      <PageHeader
        title="Import a spreadsheet"
        description="Bring properties, units, owners and tenants across from the records you already keep. Every row is checked before anything is written."
      />
      <ImportWizard />
    </>
  );
}
