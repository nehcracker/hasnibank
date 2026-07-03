# Extended user details on the dashboard — design

**Date:** 2026-07-04
**Request:** "On the dashboard we need more details on the user — email, phone, country, occupation etc."

## Current state

- `profiles` stores: `id, full_name, company_name, country, role, profile_complete, client_ref`. Country is captured at signup but never displayed.
- Email lives only on the Supabase auth user; phone and occupation exist nowhere.
- Borrower **Profile & settings** shows only Full name / Company / Client ID, read-only.
- Admin application view shows only the applicant's full name.

## Decisions

(User was away when asked; recommended options applied.)

1. **Location — both surfaces.** Full details on the borrower's Profile & settings page; applicant contact details on the admin application view so staff can reach applicants.
2. **Capture — editable profile page.** Signup stays short (name, company, country). Phone and occupation are added/updated on Profile & settings; empty values show "Not provided". Existing users fill in gaps themselves.

## Changes

### Schema (`sql/phase4-profile-details.sql` — run in Supabase SQL editor)

- `alter table profiles add column` `email`, `phone`, `occupation` (all `text`, nullable).
- Backfill `email` from `auth.users` for existing rows (admin queries can't join `auth.users` from the client, so email is mirrored into `profiles`).
- New RLS policy: users can `update` their own profile row.

### Frontend

- **`AuthContext`** — adds `refreshProfile()` so pages can re-sync the cached profile after a save.
- **`SignupProfile`** — the profile insert now also records `email: user.email` for new users.
- **`ProfileSettings`** — becomes an editable form. Read-only: Email (from auth user), Client ID. Editable: Full name, Company, Country, Phone, Occupation. Save updates `profiles`, refreshes context, shows saved/error status. Sign out moves below the card.
- **`AdminApplication`** — Applicant section now shows Name, Email, Phone, Country, Occupation, Company, Client ID (— when missing).

## Error handling

- Profile save failure shows an inline alert; form state is preserved for retry.
- Missing values render as "Not provided" (borrower) / "—" (admin); no crashes on old rows without the new columns' data.

## Testing

- `npm run build` and existing vitest suite must pass.
- Manual: edit profile fields → save → values persist after reload; admin view shows the applicant's contact details.
