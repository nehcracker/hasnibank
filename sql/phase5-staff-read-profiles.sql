-- Phase 5 — staff can read all borrower profiles
-- Run in Supabase SQL Editor.
--
-- profiles RLS only allowed own-row SELECT, so the admin views' embedded
-- applicant join (full_name, email, client_ref, ...) returned null for staff.
--
-- Note: the staff check must live in a SECURITY DEFINER function — an inline
-- `exists (select ... from profiles)` inside a policy ON profiles itself
-- would recurse (error 42P17).

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'staff'
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

drop policy if exists "Staff read all profiles" on public.profiles;
create policy "Staff read all profiles"
  on public.profiles for select
  using (public.is_staff());
