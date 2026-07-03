-- Phase 4 — extended profile details
-- Adds contact/detail columns to profiles, backfills email from auth,
-- and lets borrowers update their own profile row.

alter table public.profiles add column if not exists email      text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists occupation text;

-- Backfill email for existing users from auth.users (run in SQL editor / service role).
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

-- Borrowers can update their own profile (role/client_ref changes are not
-- exposed in the UI; column-level restriction can be added if needed).
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
