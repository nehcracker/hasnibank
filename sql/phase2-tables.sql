create table public.application_events (
  id              uuid        primary key default gen_random_uuid(),
  application_id  uuid        not null references public.applications(id) on delete cascade,
  actor_id        uuid        not null references public.profiles(id),
  actor_role      text        not null check (actor_role in ('borrower', 'staff')),
  event_type      text        not null check (event_type in (
                                'status_change', 'note', 'document', 'message', 'fee', 'payment'
                              )),
  payload         jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

alter table public.application_events enable row level security;

create policy "Borrowers read own events"
  on public.application_events for select
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));

create policy "Borrowers insert own events"
  on public.application_events for insert
  with check (
    actor_id = auth.uid()
    and application_id in (
      select id from public.applications where applicant_id = auth.uid()
    )
  );

create policy "Staff full access to events"
  on public.application_events for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'staff'
  ));
