-- Phase 3d: persist the fundability self-check on the application
-- Run in Supabase SQL Editor. Paste the WHOLE file with nothing selected.
--
-- No new RLS: borrowers write this column on their own draft row via the
-- phase3b "Borrowers update own draft" policy; staff read via full access.

alter table public.applications
  add column if not exists eligibility jsonb;

comment on column public.applications.eligibility is
  'Fundability self-check result. Shape: { "answers": { "<qId>": 0|0.5|1 }, "score": number, "band": text, "completed_at": timestamptz }';
