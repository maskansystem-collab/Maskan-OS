// Shared row shapes for the maintenance feature.
//
// These live apart from queries.ts because vendor-job-card.tsx is a client
// component and needs VendorJobRow. Importing it from queries.ts pulled
// lib/supabase/server.ts into the client graph, which surfaced as a
// "Pages Router / next/headers" build error. A type-only import is erased
// by TypeScript but the bundler still resolves the module, so the type has
// to live somewhere with no server imports.

import type { MaintenancePriority, MaintenanceStatus } from "@/types/database";

export interface VendorJobRow {
  workOrderId: string;
  requestId: string;
  request_code: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduled_at: string | null;
  estimated_cost: number | null;
  approved_amount: number | null;
  actual_amount: number | null;
  instructions: string | null;
  property_name: string;
  unit_number: string;
  access_notes: string | null;
  /** The category the request was filed under. */
  category?: string | null;
  // Completion and sign-off, added by 0021. The person who accepts the
  // work on site is usually the tenant, who has no login, so the
  // signature is a name rather than a profile.
  completed_at?: string | null;
  completion_notes?: string | null;
  parts_used?: string | null;
  signed_off_name?: string | null;
  signed_off_at?: string | null;
}
