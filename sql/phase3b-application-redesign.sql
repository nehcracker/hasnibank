-- Phase B: My Application redesign
-- Run in Supabase SQL Editor.
--
-- Before running, verify the existing status check-constraint name:
--   select conname from pg_constraint
--   where conrelid = 'public.applications'::regclass;
-- The default name for the inline check on `status` is
-- `applications_status_check`; adjust the drop below if it differs.

-- 1. Allow a pre-submission draft state
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in (
    'draft', 'submitted', 'kyc_verification', 'credit_assessment',
    'funder_matching', 'term_sheet', 'offer_issued', 'offer_accepted',
    'fee_payment', 'funded'
  ));
alter table public.applications alter column status set default 'draft';

-- 2. Business profile workspace + submission timestamp
alter table public.applications
  add column if not exists business_profile jsonb not null default '{}'::jsonb,
  add column if not exists submitted_at timestamptz;

comment on column public.applications.business_profile is
  'Shape: { "registration": {...}, "trading": {...}, "financials": {...}, "purpose": {...}, "progress": { "registration": bool, "trading": bool, "financials": bool, "purpose": bool } }';

-- 3. Borrowers may update their own row ONLY while in draft
drop policy if exists "Borrowers update own draft" on public.applications;
create policy "Borrowers update own draft"
  on public.applications for update
  using (applicant_id = auth.uid() and status = 'draft')
  with check (applicant_id = auth.uid()
              and status in ('draft', 'submitted'));

-- 4. Borrowers may accept an issued offer (offer_issued -> offer_accepted).
-- Without this, the dashboard "Accept offer" update is silently blocked by
-- RLS — no borrower update policy existed before Phase B.
drop policy if exists "Borrowers accept own offer" on public.applications;
create policy "Borrowers accept own offer"
  on public.applications for update
  using (applicant_id = auth.uid() and status = 'offer_issued')
  with check (applicant_id = auth.uid() and status = 'offer_accepted');
