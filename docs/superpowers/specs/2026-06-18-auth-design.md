# Auth Design — Phase 2

**Date:** 2026-06-18
**Scope:** Authentication, session management, and role-based routing for Hasni Bank Phase 2.

---

## Overview

Implement auth for two user types — borrowers (self-register) and staff (invitation-only) — using Supabase Auth with a React AuthContext and a ProtectedRoute guard. All Phase 2 features (KYB/KYC, loan wizard, borrower dashboard, underwriting console) gate on this foundation.

---

## Architecture

**Provider:** Supabase Auth + `@supabase/supabase-js`

**Pattern:** Approach C — Supabase Auth + React AuthContext + ProtectedRoute wrapper.
- Supabase handles credential storage, password hashing, email verification, and session tokens.
- A React `AuthContext` holds the resolved session, user, profile, role, and loading state.
- A `ProtectedRoute` component wraps all authenticated routes and enforces role-based access.
- No Cloudflare Functions needed for auth itself at this stage; all auth operations go directly to Supabase via the JS SDK.

---

## Supabase Schema

### `public.profiles`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, references `auth.users(id)` |
| `full_name` | `text` | NOT NULL |
| `company_name` | `text` | NOT NULL |
| `country` | `text` | NOT NULL |
| `role` | `text` | NOT NULL, default `'borrower'` — `'borrower' | 'staff'` |
| `profile_complete` | `boolean` | NOT NULL, default `false` |
| `created_at` | `timestamptz` | default `now()` |

**RLS policies:** Users can only read and write their own row. Role is set on insert — borrowers always receive `'borrower'`; staff receive `'staff'` via Supabase invite metadata.

---

## User Types & Account Model

- **Borrowers** — self-register via `/signup`; go through email verification + profile completion step.
- **Staff** — no public signup; accounts created via Supabase invite email only; land at `/admin` after setting password.
- Single `profiles` table with a `role` field distinguishes the two types.

---

## New Files

```
src/
├── lib/
│   └── supabase.js                 Supabase client singleton
├── context/
│   └── AuthContext.jsx             Session + profile + role provider; listens to onAuthStateChange
├── hooks/
│   └── useAuth.js                  Convenience hook — consumes AuthContext
├── components/
│   └── auth/
│       └── ProtectedRoute.jsx      Route guard; redirects unauthenticated or wrong-role visitors
└── pages/
    ├── auth/
    │   ├── Login.jsx               Email + password login; routes by role on success
    │   ├── Signup.jsx              Email + password registration; leads to VerifyEmail
    │   ├── SignupProfile.jsx       Step 2 — full_name, company_name, country; writes to profiles
    │   └── VerifyEmail.jsx         Static holding page shown after signup, before email confirmation
    ├── Dashboard.jsx               Borrower stub (wizard, KYB added in later phases)
    └── Admin.jsx                   Staff stub (underwriting console added in later phases)
```

**Existing files touched:**
- `src/App.jsx` — add auth routes; wrap `/dashboard` and `/admin` with `ProtectedRoute`
- `src/components/layout/Navbar.jsx` — Login button for unauthenticated visitors; user menu (email + Sign out) for authenticated users

---

## Data Flow

### AuthContext state shape
```js
{ session, user, profile, role, loading }
```
On mount: `supabase.auth.getSession()` → if session exists, fetch `profiles` row → set state. Subscribes to `onAuthStateChange` for login / logout / token refresh.

### Borrower signup sequence
1. `/signup` → `supabase.auth.signUp({ email, password, options: { emailRedirectTo: '/signup/profile' } })` → Supabase sends verification email
2. User lands on `/verify-email` (no session yet)
3. User clicks email link → Supabase confirms → session established → `onAuthStateChange` fires
4. `ProtectedRoute` on `/signup/profile` sees `profile_complete = false` → allows through
5. `/signup/profile` → insert row into `profiles` → set `profile_complete = true` → navigate to `/dashboard`

### Login sequence
1. `/login` → `supabase.auth.signInWithPassword({ email, password })` → session established
2. `AuthContext` fetches `profiles` row → role resolved
3. Navigate: `role === 'staff'` → `/admin`, else → `/dashboard`

### Sign out
`supabase.auth.signOut()` → session cleared → redirect to `/`

---

## ProtectedRoute behaviour

| Visitor state | Destination |
|---------------|-------------|
| Not authenticated | `/login` |
| Authenticated, `role = borrower`, route requires `staff` | `/dashboard` |
| Authenticated, `role = staff`, route requires `borrower` | `/admin` |
| Session resolving | Neutral loading screen (no flash) |

---

## Error Handling

### Auth errors

| Scenario | Response |
|----------|----------|
| Wrong email/password | Inline: "Invalid email or password" |
| Email not confirmed | Redirect to `/verify-email` with resend link |
| Email already registered | Inline: "An account with this email already exists" |
| Network failure | Inline: "Something went wrong. Please try again." |
| Profile insert fails | Show retry; do not leave user in verified-but-no-profile limbo |

### Session edge cases

| Scenario | Response |
|----------|----------|
| Token expired mid-session | `onAuthStateChange` fires → `AuthContext` clears → `ProtectedRoute` → `/login` |
| Borrower visits `/admin` | Redirect to `/dashboard` |
| Staff visits `/dashboard` | Redirect to `/admin` |
| Profile already complete visits `/signup/profile` | Redirect to `/dashboard` |

---

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Both needed in `.env.local` for dev and in Cloudflare Pages environment settings for production.

---

## Dependencies

```
@supabase/supabase-js
```
