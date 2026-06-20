create table public.applications (
  id            uuid        primary key default gen_random_uuid(),
  applicant_id  uuid        not null unique references public.profiles(id) on delete cascade,
  track         text        not null check (track in ('sme', 'project', 'trade', 'acquisition')),
  amount_sought numeric     not null,
  currency      text        not null default 'USD',
  status        text        not null default 'submitted'
                            check (status in (
                              'submitted', 'kyc_verification', 'credit_assessment',
                              'funder_matching', 'term_sheet', 'offer_issued',
                              'offer_accepted', 'fee_payment', 'funded'
                            )),
  fields        jsonb       not null,
  created_at    timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "Borrowers read own application"
  on public.applications for select
  using (applicant_id = auth.uid());

create policy "Borrowers submit application"
  on public.applications for insert
  with check (applicant_id = auth.uid());

create policy "Staff full access to applications"
  on public.applications for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'staff'
  ));
