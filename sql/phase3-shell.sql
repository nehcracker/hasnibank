-- 1. Client reference: HB-<year>-<zero-padded sequence>
create sequence if not exists public.client_ref_seq start 1;

alter table public.profiles
  add column if not exists client_ref text unique;

create or replace function public.assign_client_ref()
returns trigger language plpgsql security definer as $$
begin
  if new.client_ref is null then
    new.client_ref := 'HB-' || to_char(now(), 'YYYY') || '-' ||
                      lpad(nextval('public.client_ref_seq')::text, 5, '0');
  end if;
  return new;
end $$;

drop trigger if exists set_client_ref on public.profiles;
create trigger set_client_ref
  before insert on public.profiles
  for each row execute function public.assign_client_ref();

-- Backfill existing profiles, oldest first so numbering respects tenure
do $$
declare
  r record;
begin
  for r in
    select id, created_at from public.profiles
    where client_ref is null
    order by created_at asc
  loop
    update public.profiles
    set client_ref = 'HB-' || to_char(r.created_at, 'YYYY') || '-' ||
                     lpad(nextval('public.client_ref_seq')::text, 5, '0')
    where id = r.id;
  end loop;
end $$;

-- 2. Structured offer terms, set by staff when issuing an offer
alter table public.applications
  add column if not exists offer_terms jsonb;

comment on column public.applications.offer_terms is
  'Shape: { "principal": number, "currency": "USD", "annual_rate_pct": number, "term_months": int, "repayment_frequency": "monthly"|"quarterly"|"semiannual"|"annual", "grace_months": int, "structure": "amortising"|"bullet"|"balloon", "balloon_pct": number }';

-- RLS: existing policies on profiles (own-row read) and applications
-- (borrower reads own; staff full) already cover both columns. No new policies.
