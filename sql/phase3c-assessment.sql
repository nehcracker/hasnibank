-- Phase C: staff assessment workspace
-- Run in Supabase SQL Editor. Paste the WHOLE file with nothing selected,
-- then Run — a highlighted fragment runs alone and reports success.
--
-- Depends on: phase1..phase5 (applications, application_events, profiles,
-- client_ref, phase3b draft columns, public.is_staff()).
--
-- Design rule: internal and borrower-visible content live in DIFFERENT
-- tables with different RLS. Row-level security cannot hide columns, so a
-- shared table with a visibility flag would risk leaking internal credit
-- notes. Staff checks use public.is_staff() (security definer, phase5).

-- 0a. application_documents did not ship with the wizard phases — the
-- dashboard already queries it defensively. Created here because Phase C
-- verification (verified_at/verified_by) and RFI document responses need it.
create table if not exists public.application_documents (
  id             uuid        primary key default gen_random_uuid(),
  application_id uuid        not null references public.applications(id) on delete cascade,
  document_type  text        not null,
  label          text,
  note           text,
  storage_path   text,
  uploaded_by    uuid        not null references public.profiles(id),
  verified_at    timestamptz,
  verified_by    uuid        references public.profiles(id),
  created_at     timestamptz not null default now()
);

alter table public.application_documents enable row level security;

drop policy if exists "Borrowers read own documents" on public.application_documents;
create policy "Borrowers read own documents"
  on public.application_documents for select
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));

drop policy if exists "Borrowers upload own documents" on public.application_documents;
create policy "Borrowers upload own documents"
  on public.application_documents for insert
  with check (
    uploaded_by = auth.uid()
    and application_id in (
      select id from public.applications where applicant_id = auth.uid()
    )
  );

drop policy if exists "Staff full access to documents" on public.application_documents;
create policy "Staff full access to documents"
  on public.application_documents for all
  using (public.is_staff());

-- 0b. Private storage bucket for document uploads (RFI responses).
-- Path convention: <application_id>/<filename>
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

drop policy if exists "Borrowers upload to own application folder" on storage.objects;
create policy "Borrowers upload to own application folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.applications where applicant_id = auth.uid()
    )
  );

drop policy if exists "Borrowers read own application files" on storage.objects;
create policy "Borrowers read own application files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.applications where applicant_id = auth.uid()
    )
  );

drop policy if exists "Staff read all application files" on storage.objects;
create policy "Staff read all application files"
  on storage.objects for select to authenticated
  using (bucket_id = 'application-documents' and public.is_staff());

-- 0c. Extend the audit-event vocabulary. Phase C writes stage_override,
-- rfi, offer, and disbursement events; the phase2 check would reject them.
alter table public.application_events
  drop constraint if exists application_events_event_type_check;
alter table public.application_events
  add constraint application_events_event_type_check
  check (event_type in (
    'status_change', 'note', 'document', 'message', 'fee', 'payment',
    'stage_override', 'rfi', 'offer', 'disbursement'
  ));

-- 1. Findings: STAFF-ONLY. Internal notes never borrower-readable.
create table if not exists public.assessment_findings (
  id             uuid    primary key default gen_random_uuid(),
  application_id uuid    not null references public.applications(id) on delete cascade,
  pillar         text    not null check (pillar in
                   ('financial_records','collateral','documentation','compliance','capacity')),
  severity       text    not null check (severity in
                   ('informational','requires_improvement','critical')),
  score          numeric not null check (score >= 0),
  internal_note  text,
  created_by     uuid    not null references public.profiles(id),
  status         text    not null default 'open' check (status in ('open','resolved')),
  created_at     timestamptz default now()
);
alter table public.assessment_findings enable row level security;
drop policy if exists "Staff full access on findings" on public.assessment_findings;
create policy "Staff full access on findings" on public.assessment_findings
  for all using (public.is_staff());

-- 2. Finding notices: the borrower-visible statement, split table.
create table if not exists public.finding_notices (
  id             uuid primary key default gen_random_uuid(),
  finding_id     uuid not null references public.assessment_findings(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  statement      text not null,
  created_at     timestamptz default now()
);
alter table public.finding_notices enable row level security;
drop policy if exists "Borrowers read own notices" on public.finding_notices;
create policy "Borrowers read own notices" on public.finding_notices
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and a.applicant_id = auth.uid()));
drop policy if exists "Staff full access on notices" on public.finding_notices;
create policy "Staff full access on notices" on public.finding_notices
  for all using (public.is_staff());

-- 3. Information requests (RFIs)
create table if not exists public.information_requests (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  finding_id     uuid references public.assessment_findings(id),
  prompt         text not null,
  response_type  text not null check (response_type in ('document','text','figure')),
  due_date       date,
  status         text not null default 'open' check (status in
                   ('open','responded','resolved','rejected')),
  response_payload jsonb,
  responded_at   timestamptz,
  resolution_note text,
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz default now()
);
alter table public.information_requests enable row level security;
drop policy if exists "Borrowers read own rfis" on public.information_requests;
create policy "Borrowers read own rfis" on public.information_requests
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and a.applicant_id = auth.uid()));
drop policy if exists "Borrowers respond to open rfis" on public.information_requests;
create policy "Borrowers respond to open rfis" on public.information_requests
  for update using (
    status = 'open' and exists (select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid()))
  with check (status = 'responded');
drop policy if exists "Staff full access on rfis" on public.information_requests;
create policy "Staff full access on rfis" on public.information_requests
  for all using (public.is_staff());

-- 4. Internal notes: STAFF-ONLY
create table if not exists public.internal_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  body           text not null,
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz default now()
);
alter table public.internal_notes enable row level security;
drop policy if exists "Staff full access on internal notes" on public.internal_notes;
create policy "Staff full access on internal notes" on public.internal_notes
  for all using (public.is_staff());

-- 5. Offers: versioned; at most one active per application
create table if not exists public.offers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  version        int  not null default 1,
  terms          jsonb not null, -- offer_terms shape + fees[], conditions_precedent[], covenants[]
  valid_until    date,
  status         text not null default 'draft' check (status in
                   ('draft','issued','superseded','accepted','declined','expired')),
  accepted_at    timestamptz,
  acceptance_meta jsonb, -- { declaration: text }
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz default now(),
  unique (application_id, version)
);
alter table public.offers enable row level security;
drop policy if exists "Borrowers read issued offers" on public.offers;
create policy "Borrowers read issued offers" on public.offers
  for select using (status <> 'draft' and exists (select 1 from public.applications a
    where a.id = application_id and a.applicant_id = auth.uid()));
drop policy if exists "Borrowers accept issued offers" on public.offers;
create policy "Borrowers accept issued offers" on public.offers
  for update using (
    status = 'issued' and exists (select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid()))
  with check (status = 'accepted');
drop policy if exists "Staff full access on offers" on public.offers;
create policy "Staff full access on offers" on public.offers
  for all using (public.is_staff());

-- 6. Disbursements
create table if not exists public.disbursements (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  tranche_no     int  not null,
  amount         numeric not null,
  planned_date   date,
  actual_date    date,
  conditions     jsonb,
  status         text not null default 'planned' check (status in
                   ('planned','conditions_pending','disbursed')),
  created_at     timestamptz default now(),
  unique (application_id, tranche_no)
);
alter table public.disbursements enable row level security;
drop policy if exists "Borrowers read own disbursements" on public.disbursements;
create policy "Borrowers read own disbursements" on public.disbursements
  for select using (exists (select 1 from public.applications a
    where a.id = application_id and a.applicant_id = auth.uid()));
drop policy if exists "Staff full access on disbursements" on public.disbursements;
create policy "Staff full access on disbursements" on public.disbursements
  for all using (public.is_staff());

-- 7. Extended intake: staff-toggled additional borrower sections
alter table public.applications
  add column if not exists required_sections text[] not null default '{}';

-- 8. Lookup indexes for the per-application panels
create index if not exists idx_findings_application on public.assessment_findings (application_id);
create index if not exists idx_notices_application  on public.finding_notices (application_id);
create index if not exists idx_rfis_application     on public.information_requests (application_id);
create index if not exists idx_notes_application    on public.internal_notes (application_id);
create index if not exists idx_offers_application   on public.offers (application_id);
create index if not exists idx_disb_application     on public.disbursements (application_id);
create index if not exists idx_docs_application     on public.application_documents (application_id);

-- 9. Realtime: borrower dashboard subscribes to RFI and offer changes
do $$ begin
  alter publication supabase_realtime add table public.information_requests;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.offers;
exception when duplicate_object then null; end $$;

-- ── Post-run verification (run separately, as a borrower session) ──────────
-- Borrower CAN:  select finding_notices / information_requests for own app;
--                update an own open RFI to 'responded' (only);
--                select offers where status <> 'draft'.
-- Borrower CANNOT: select assessment_findings or internal_notes (0 rows /
--                permission behaviour), see draft offers, update resolved RFIs.
