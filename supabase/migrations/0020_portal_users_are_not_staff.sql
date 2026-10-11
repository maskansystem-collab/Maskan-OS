-- =====================================================================
-- 0020_portal_users_are_not_staff.sql
--
-- Closes a cross-tenant read leak.
--
-- Every staff read policy in 0015 is gated on `is_org_member(org_id)`,
-- which is true for *any* row in organisation_members — and tenants,
-- owners and vendors with portal logins are organisation_members too.
-- A tenant signing in to pay their rent could therefore read every other
-- tenant's record, every owner, every property, every payment, cheque,
-- bank account and owner statement in the organisation. Confirmed against
-- a local database: a tenant portal user saw both properties in an
-- organisation holding two, and the full owners table.
--
-- Writes were never exposed: write policies go through has_permission(),
-- and the tenant, property_owner and vendor roles are seeded with no
-- permission rows at all. This is a read leak only.
--
-- The fix separates the two senses of membership that 0015 conflated:
--
--   is_org_member(org)  "has a row in this organisation" — still correct
--                       for the organisation record itself, shared
--                       reference data, and a member's own rows
--   is_org_staff(org)   "works here" — holds at least one staff role
--
-- 48 select policies move to is_org_staff. Nine deliberately keep
-- is_org_member, because a portal user does need them: the organisation
-- row, app_settings, feature_flags, roles, the two category tables,
-- document_templates, and their own membership and role rows — the last
-- two narrowed to the member's own rows rather than the whole team.
--
-- Portal access itself is unaffected. Each of these policies already had
-- a separate portal clause scoped to the signed-in tenant, owner or
-- vendor, and those clauses are untouched: the tenant still reads their
-- own lease, their own payments and their own documents.
--
-- The policy bodies below are reproduced from the live catalogue with
-- only the function name substituted, so no policy logic is rewritten
-- here beyond that one change.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "Works here": a member holding at least one role that is not purely a
-- portal role. A member with no roles at all is not staff either.
-- ---------------------------------------------------------------------
create or replace function is_org_staff(org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_super_admin() or exists (
    select 1
    from organisation_members om
    join member_roles mr on mr.organisation_member_id = om.id
    join roles r on r.id = mr.role_id
    where om.organisation_id = org_id
      and om.profile_id = auth.uid()
      and om.is_active = true
      and (r.key is null or r.key not in ('tenant', 'property_owner', 'vendor'))
  );
$$;

grant execute on function is_org_staff(uuid) to public;

-- ---------------------------------------------------------------------
-- A member's own membership and roles, rather than the whole team's
-- ---------------------------------------------------------------------
drop policy if exists org_members_select on organisation_members;
create policy org_members_select on organisation_members for select
  using (is_org_staff(organisation_id) or profile_id = auth.uid());

drop policy if exists member_roles_select on member_roles;
create policy member_roles_select on member_roles for select
  using (exists (
    select 1 from organisation_members om
    where om.id = member_roles.organisation_member_id
      and (is_org_staff(om.organisation_id) or om.profile_id = auth.uid())
  ));

-- ---------------------------------------------------------------------
-- Staff read policies: is_org_member -> is_org_staff
-- ---------------------------------------------------------------------
drop policy if exists bank_accounts_select on bank_accounts;
create policy bank_accounts_select on bank_accounts for select
  using (is_org_staff(organisation_id));

drop policy if exists buildings_select on buildings;
create policy buildings_select on buildings for select
  using ((EXISTS ( SELECT 1
   FROM properties p
  WHERE ((p.id = buildings.property_id) AND is_org_staff(p.organisation_id)))));

drop policy if exists charges_select on charges;
create policy charges_select on charges for select
  using (is_org_staff(organisation_id));

drop policy if exists cheque_events_select on cheque_events;
create policy cheque_events_select on cheque_events for select
  using ((EXISTS ( SELECT 1
   FROM cheques c
  WHERE ((c.id = cheque_events.cheque_id) AND is_org_staff(c.organisation_id)))));

drop policy if exists cheque_images_select on cheque_images;
create policy cheque_images_select on cheque_images for select
  using ((EXISTS ( SELECT 1
   FROM cheques c
  WHERE ((c.id = cheque_images.cheque_id) AND is_org_staff(c.organisation_id)))));

drop policy if exists cheques_select on cheques;
create policy cheques_select on cheques for select
  using (is_org_staff(organisation_id));

drop policy if exists credits_select on credits;
create policy credits_select on credits for select
  using (is_org_staff(organisation_id));

drop policy if exists documents_select on documents;
create policy documents_select on documents for select
  using (is_org_staff(organisation_id));

drop policy if exists lease_documents_select on lease_documents;
create policy lease_documents_select on lease_documents for select
  using ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_documents.lease_id) AND (is_org_staff(l.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = l.tenant_id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists lease_events_select on lease_events;
create policy lease_events_select on lease_events for select
  using ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_events.lease_id) AND is_org_staff(l.organisation_id)))));

drop policy if exists lease_parties_select on lease_parties;
create policy lease_parties_select on lease_parties for select
  using ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_parties.lease_id) AND is_org_staff(l.organisation_id)))));

drop policy if exists renewal_offers_staff_select on lease_renewal_offers;
create policy renewal_offers_staff_select on lease_renewal_offers for select
  using ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_renewal_offers.lease_id) AND is_org_staff(l.organisation_id)))));

drop policy if exists leases_staff_select on leases;
create policy leases_staff_select on leases for select
  using (is_org_staff(organisation_id));

drop policy if exists maint_attachments_select on maintenance_attachments;
create policy maint_attachments_select on maintenance_attachments for select
  using ((EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_attachments.maintenance_request_id) AND (is_org_staff(mr.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = mr.tenant_id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists maint_comments_select on maintenance_comments;
create policy maint_comments_select on maintenance_comments for select
  using (((EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_comments.maintenance_request_id) AND (is_org_staff(mr.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = mr.tenant_id) AND (om.profile_id = auth.uid())))))))) AND ((is_internal = false) OR (EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_comments.maintenance_request_id) AND is_org_staff(mr.organisation_id)))))));

drop policy if exists maint_requests_staff_select on maintenance_requests;
create policy maint_requests_staff_select on maintenance_requests for select
  using (is_org_staff(organisation_id));

drop policy if exists management_fees_select on management_fees;
create policy management_fees_select on management_fees for select
  using (is_org_staff(organisation_id));

drop policy if exists mandate_properties_select on mandate_properties;
create policy mandate_properties_select on mandate_properties for select
  using ((EXISTS ( SELECT 1
   FROM mandates m
  WHERE ((m.id = mandate_properties.mandate_id) AND is_org_staff(m.organisation_id)))));

drop policy if exists mandates_staff_select on mandates;
create policy mandates_staff_select on mandates for select
  using (is_org_staff(organisation_id));

drop policy if exists occupants_select on occupants;
create policy occupants_select on occupants for select
  using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = occupants.tenant_id) AND (is_org_staff(t.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = t.id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists owner_contacts_select on owner_contacts;
create policy owner_contacts_select on owner_contacts for select
  using ((EXISTS ( SELECT 1
   FROM owners o
  WHERE ((o.id = owner_contacts.owner_id) AND is_org_staff(o.organisation_id)))));

drop policy if exists owner_statement_items_select on owner_statement_items;
create policy owner_statement_items_select on owner_statement_items for select
  using ((EXISTS ( SELECT 1
   FROM owner_statements os
  WHERE ((os.id = owner_statement_items.owner_statement_id) AND (is_org_staff(os.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.owner_id = os.owner_id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists owner_statements_staff_select on owner_statements;
create policy owner_statements_staff_select on owner_statements for select
  using (is_org_staff(organisation_id));

drop policy if exists owner_transactions_staff_select on owner_transactions;
create policy owner_transactions_staff_select on owner_transactions for select
  using (is_org_staff(organisation_id));

drop policy if exists owners_staff_select on owners;
create policy owners_staff_select on owners for select
  using (is_org_staff(organisation_id));

drop policy if exists payment_allocations_select on payment_allocations;
create policy payment_allocations_select on payment_allocations for select
  using ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_allocations.payment_id) AND is_org_staff(p.organisation_id)))));

drop policy if exists payment_evidence_select on payment_evidence;
create policy payment_evidence_select on payment_evidence for select
  using ((EXISTS ( SELECT 1
   FROM payments p
  WHERE ((p.id = payment_evidence.payment_id) AND (is_org_staff(p.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = p.tenant_id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists payments_staff_select on payments;
create policy payments_staff_select on payments for select
  using (is_org_staff(organisation_id));

drop policy if exists properties_staff_select on properties;
create policy properties_staff_select on properties for select
  using (is_org_staff(organisation_id));

drop policy if exists property_documents_select on property_documents;
create policy property_documents_select on property_documents for select
  using (is_org_staff(property_organisation(property_id)));

drop policy if exists property_expenses_select on property_expenses;
create policy property_expenses_select on property_expenses for select
  using (is_org_staff(organisation_id));

drop policy if exists property_owners_select on property_owners;
create policy property_owners_select on property_owners for select
  using (is_org_staff(property_organisation(property_id)));

drop policy if exists receipts_select on receipts;
create policy receipts_select on receipts for select
  using ((is_org_staff(organisation_id) OR (EXISTS ( SELECT 1
   FROM (payments p
     JOIN organisation_members om ON ((om.tenant_id = p.tenant_id)))
  WHERE ((p.id = receipts.payment_id) AND (om.profile_id = auth.uid()))))));

drop policy if exists rent_instalments_staff_select on rent_instalments;
create policy rent_instalments_staff_select on rent_instalments for select
  using (is_org_staff(organisation_id));

drop policy if exists rent_schedules_select on rent_schedules;
create policy rent_schedules_select on rent_schedules for select
  using ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = rent_schedules.lease_id) AND is_org_staff(l.organisation_id)))));

drop policy if exists tenant_contacts_select on tenant_contacts;
create policy tenant_contacts_select on tenant_contacts for select
  using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = tenant_contacts.tenant_id) AND (is_org_staff(t.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = t.id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists tenant_documents_select on tenant_documents;
create policy tenant_documents_select on tenant_documents for select
  using ((EXISTS ( SELECT 1
   FROM tenants t
  WHERE ((t.id = tenant_documents.tenant_id) AND (is_org_staff(t.organisation_id) OR (EXISTS ( SELECT 1
           FROM organisation_members om
          WHERE ((om.tenant_id = t.id) AND (om.profile_id = auth.uid())))))))));

drop policy if exists tenants_staff_select on tenants;
create policy tenants_staff_select on tenants for select
  using (is_org_staff(organisation_id));

drop policy if exists undertakings_staff_select on undertakings;
create policy undertakings_staff_select on undertakings for select
  using (is_org_staff(organisation_id));

drop policy if exists unit_owners_select on unit_owners;
create policy unit_owners_select on unit_owners for select
  using (is_org_staff(unit_organisation(unit_id)));

drop policy if exists units_staff_select on units;
create policy units_staff_select on units for select
  using (is_org_staff(organisation_id));

drop policy if exists vendor_contacts_select on vendor_contacts;
create policy vendor_contacts_select on vendor_contacts for select
  using ((EXISTS ( SELECT 1
   FROM vendors v
  WHERE ((v.id = vendor_contacts.vendor_id) AND (is_org_staff(v.organisation_id) OR is_vendor_member(v.id))))));

drop policy if exists vendor_documents_select on vendor_documents;
create policy vendor_documents_select on vendor_documents for select
  using ((EXISTS ( SELECT 1
   FROM vendors v
  WHERE ((v.id = vendor_documents.vendor_id) AND (is_org_staff(v.organisation_id) OR is_vendor_member(v.id))))));

drop policy if exists vendor_invoices_select on vendor_invoices;
create policy vendor_invoices_select on vendor_invoices for select
  using ((EXISTS ( SELECT 1
   FROM vendors v
  WHERE ((v.id = vendor_invoices.vendor_id) AND (is_org_staff(v.organisation_id) OR is_vendor_member(v.id))))));

drop policy if exists vendor_members_select on vendor_members;
create policy vendor_members_select on vendor_members for select
  using ((EXISTS ( SELECT 1
   FROM vendors v
  WHERE ((v.id = vendor_members.vendor_id) AND (is_org_staff(v.organisation_id) OR is_vendor_member(v.id))))));

drop policy if exists vendors_staff_select on vendors;
create policy vendors_staff_select on vendors for select
  using (is_org_staff(organisation_id));

drop policy if exists wo_events_select on work_order_events;
create policy wo_events_select on work_order_events for select
  using ((EXISTS ( SELECT 1
   FROM work_orders wo
  WHERE ((wo.id = work_order_events.work_order_id) AND (is_org_staff(wo.organisation_id) OR is_vendor_member(wo.vendor_id))))));

drop policy if exists work_orders_staff_select on work_orders;
create policy work_orders_staff_select on work_orders for select
  using (is_org_staff(organisation_id));


-- ---------------------------------------------------------------------
-- An owner reads their own owner record
--
-- `tenants` and `vendors` each have a self-select policy; `owners` never
-- did. Nobody noticed because is_org_member() let an owner read the whole
-- owners table, so the missing policy looked like working access. With
-- that gone the owner portal would read nothing at all, so the policy its
-- siblings always had is added here, in the same shape.
-- ---------------------------------------------------------------------
drop policy if exists owners_self_select on owners;
create policy owners_self_select on owners for select
  using (exists (
    select 1 from organisation_members om
    where om.owner_id = owners.id
      and om.profile_id = auth.uid()
      and om.is_active
  ));
