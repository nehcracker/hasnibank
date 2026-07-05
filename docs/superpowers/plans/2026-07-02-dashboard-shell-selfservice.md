# Dashboard Shell + Self-Service Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-07-02
**Updated:** 2026-07-05 — adds **Phase B: My Application redesign** (Tasks 14–19). Phase A tasks (1–13) may already be executed; verify checkboxes against the repo before re-running any of them.
**Goal:** Replace the single-page borrower dashboard with a persistent shell (collapsible sidebar + topbar + routed centre content), a stable Client ID, an amortisation/repayment modelling suite (estimator, actual schedule, DSCR, scenario comparison), an eligibility self-check, a per-track document requirements checklist, per-stage SLA display, realtime updates, and an application PDF export. **Phase B** then rebuilds My Application as a self-service workspace: a draft application state, a stage-aware action card that always names the borrower's next move, a business profile + KYC completion flow that new signups land in directly, a condensed four-phase progress rail, and fixes for three visual defects. Every feature exists to let SME borrowers and project sponsors self-serve instead of contacting staff.

**Architecture:** `/dashboard` becomes a nested layout route. `DashboardLayout.jsx` renders `Sidebar` + `Topbar` + `<Outlet>`; the marketing `Navbar`/`Footer` are suppressed for `/dashboard/*`. All child routes remain behind `ProtectedRoute requiredRole="borrower"`. The amortisation engine is a pure JS module (`src/lib/amortisation.js`) shared by the estimator, the actual-schedule view, DSCR, and scenario comparison — fully unit-tested, no React inside. Panels already specified in the loan-wizard plan (status tracker, documents, messages, fees — Phases 2–5) mount into shell routes via thin wrapper pages; this plan builds the shell and integration points, not those panels.

**Tech Stack:** React 18, Vite, React Router DOM (nested routes + `<Outlet>`), Supabase JS client (`@/lib/supabase`) incl. Realtime channels, `recharts`, CSS Modules, Vitest + React Testing Library, design tokens from `src/styles/tokens.css`.

---

## Decisions taken (override before running if wrong)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Client ID | **(a)** `client_ref` column on `profiles`, sequence-backed, format `HB-YYYY-NNNNN` | Professional, sequential, printable on documents |
| Actual amortisation source | Add `offer_terms` jsonb to `applications`, set by staff at offer issue | Without it only the estimator works |
| Wizard Phases 2–5 | **Not rebuilt here.** Shell exposes routes + wrapper pages; panels come from the existing loan-wizard plan | Avoid duplication |
| Charting | `recharts` (new dependency) | Fastest correct fit for this stack |
| PDF export | Print-stylesheet route (`window.print()`), no PDF library | Zero dependency, brandable via CSS |
| e-Signature, post-funding ledger, callback scheduling, SMS | **Out of scope** — future plan | Larger lifts, need separate decisions |
| Business profile storage (Phase B) | `business_profile` jsonb on `applications` (not a separate table) | One row per applicant already enforced; sections + progress live together; overridable to a `business_profiles` table if relational queries on it are ever needed |
| Draft state (Phase B) | Add `'draft'` to the `applications.status` check constraint; `submitted_at` column added | Application becomes the borrower's workspace before submission |
| Post-signup landing (Phase B) | Profile completion → `/dashboard/start` (track + amount) → draft created → `/dashboard/application` in action mode | Replaces mounting `ApplicationWizard` inline on the dashboard |

---

## Global Constraints

- All colors via CSS custom properties — exact token names: `--color-navy`, `--color-surface`, `--color-gold`, `--color-gold-soft`, `--color-ivory`, `--color-muted`, `--color-border`, `--color-success`, `--color-error`
- Font families: `var(--font-heading)` for Fraunces headings, `var(--font-body)` for Inter body
- Font sizes via tokens `--text-xs` … `--text-6xl`; spacing via `--space-1` … `--space-24`; radius `--radius-sm|md|lg`; transitions `var(--transition-fast)`
- File extension `.jsx` for all JSX-containing files; import alias `@/` → `src/`
- `supabase` from `@/lib/supabase`; `useAuth` from `@/hooks/useAuth` → `{ session, user, profile, role, loading }`
- `npm run build` must pass zero errors before each commit
- UI copy: "financing application", never "loan application"; tone premium/institutional; no promotional language; no em dashes in any UI copy
- Never hardcode hex values in CSS
- All new Supabase tables/columns ship with RLS in the same SQL file
- Currency display: `Intl.NumberFormat('en-US', { style: 'currency', currency })`; all computed money rounded to 2 dp before display

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `sql/phase3-shell.sql` | `client_ref` column + sequence + trigger + backfill; `offer_terms` jsonb; grants/RLS notes |
| `src/lib/amortisation.js` | Pure functions: `buildSchedule`, `paymentAmount`, `totals`, `dscr` |
| `src/lib/__tests__/amortisation.test.js` | Unit tests for the engine (known-answer cases) |
| `src/data/stageMeta.js` | 9 stages: key, label, description, `slaDays` typical duration |
| `src/data/docRequirements.js` | Per-track required document list (type key, label, description) |
| `src/data/eligibilityModel.js` | Question set + weights + scoring bands for readiness check |
| `src/layouts/DashboardLayout.jsx` | Shell: Sidebar + Topbar + `<Outlet>`; suppress marketing chrome |
| `src/layouts/DashboardLayout.module.css` | Shell grid, responsive collapse (icons ≤1024px, drawer ≤720px) |
| `src/layouts/Sidebar.jsx` | Nav sections, active-route gold highlight, collapse state |
| `src/layouts/Topbar.jsx` | Brand mark, ClientIdBadge, NotificationsBell, profile menu (name, company, sign out) |
| `src/components/dashboard/ClientIdBadge.jsx` | Displays `profile.client_ref`, copy-to-clipboard with confirmation tick |
| `src/components/dashboard/NotificationsBell.jsx` | Unread badge; dropdown of recent `application_events`; realtime-fed |
| `src/components/dashboard/ServiceCard.jsx` | Reusable card: icon, title, blurb, action link |
| `src/pages/dashboard/Overview.jsx` | Default route: 4 financing-track cards (no application) or application summary card (application exists) + self-service tool cards |
| `src/pages/dashboard/Modelling.jsx` | Tabs: Estimator · Actual schedule · DSCR · Compare |
| `src/pages/dashboard/modelling/Estimator.jsx` | Inputs (amount, rate, term, frequency, grace, structure, balloon %) → schedule + 2 charts |
| `src/pages/dashboard/modelling/ActualSchedule.jsx` | Renders `offer_terms` schedule; empty state if no offer yet |
| `src/pages/dashboard/modelling/DscrCalculator.jsx` | Cashflow inputs → DSCR vs modelled debt service, banded verdict |
| `src/pages/dashboard/modelling/ScenarioCompare.jsx` | 2–3 saved scenarios side by side: payment, total interest, total cost delta |
| `src/pages/dashboard/modelling/ScheduleTable.jsx` | Shared period-by-period table (period, payment, interest, principal, balance) |
| `src/pages/dashboard/modelling/Modelling.module.css` | All modelling styles |
| `src/pages/dashboard/Eligibility.jsx` | Self-assessment wizard → score /10, band, ranked fix-list |
| `src/pages/dashboard/DocChecklist.jsx` | Per-track requirements vs `application_documents`: outstanding / received / verified |
| `src/pages/dashboard/ExportSummary.jsx` | Print-styled application summary (brand header, Client ID, all fields) + Print/Save PDF button |
| `src/pages/dashboard/print.css` | `@media print` stylesheet: white background, navy `#1F3864`-free — uses site navy token, hides chrome |
| `src/pages/dashboard/ProfileSettings.jsx` | Read-only profile block + sign out (edit fields future scope) |
| `src/hooks/useApplication.js` | Fetch current user's application row once; expose `{ application, refresh }`; subscribe to realtime UPDATE |
| `src/hooks/useRealtimeEvents.js` | Supabase channel on `application_events` INSERT filtered by `application_id`; returns latest events + unread count |
| `src/pages/dashboard/__tests__/Overview.test.jsx` | Card-set switching by application presence |
| `src/pages/dashboard/__tests__/Eligibility.test.jsx` | Scoring bands correctness |
| `src/pages/dashboard/__tests__/DocChecklist.test.jsx` | Status derivation from documents list |
| `functions/notify/status.js` | Supabase DB webhook receiver → Resend email to borrower on status change (optional task, see Task 12) |
| `sql/phase3b-application-redesign.sql` | `'draft'` status, `business_profile` jsonb, `submitted_at` (Phase B) |
| `src/pages/dashboard/MyApplication.jsx` | Redesigned `/dashboard/application`: header + status pill, PhaseRail, ActionCard, supporting row, activity feed (Phase B) |
| `src/pages/dashboard/PhaseRail.jsx` | 4-phase condensed progress rail; active phase expands with internal steps + SLA; "View all 9 stages" detail toggle (Phase B) |
| `src/pages/dashboard/ActionCard.jsx` | Stage-aware state machine: draft-profile / draft-kyc / in-review / offer-issued / fee-due (Phase B) |
| `src/pages/dashboard/BusinessProfileForm.jsx` | 4-section resumable form writing to `business_profile` jsonb with autosave + completion % (Phase B) |
| `src/pages/dashboard/StartApplication.jsx` | `/dashboard/start`: track + amount + currency mini-form → inserts draft row → redirects to `/dashboard/application` (Phase B) |
| `src/pages/dashboard/__tests__/PhaseRail.test.jsx` | Phase mapping + active expansion (Phase B) |
| `src/pages/dashboard/__tests__/ActionCard.test.jsx` | State selection per status/data completeness (Phase B) |
| `src/lib/__tests__/applicationState.test.js` | Pure helpers: completion %, submission gate, action-state resolver (Phase B) |
| `src/lib/applicationState.js` | Pure helpers shared by ActionCard/Overview/pill (Phase B) |

### Modified files

| File | What changes |
|------|-------------|
| `src/App.jsx` | `/dashboard` becomes parent route with `DashboardLayout` + children: `index` (Overview), `application`, `modelling`, `documents`, `messages`, `fees`, `eligibility`, `checklist`, `export`, `profile`. Marketing `Navbar`/`Footer` render only when `!pathname.startsWith('/dashboard')` |
| `src/pages/Dashboard.jsx` | Retired; wizard entry/state logic moves into `Overview.jsx` (import `ApplicationWizard` unchanged) |
| `src/pages/dashboard/ProgressTracker.jsx` (if built) | Accepts optional `slaDays` from `stageMeta`; in Phase B it becomes the "View all 9 stages" expanded detail inside `PhaseRail`, no longer the default view |
| `package.json` | Add `recharts` |
| `src/data/stageMeta.js` | Phase B: add `PHASES` export grouping the 9 stages into 4 borrower phases |
| `src/pages/auth/SignupProfile.jsx` | Phase B: on save, navigate to `/dashboard/start` instead of `/dashboard` |
| `src/pages/dashboard/Overview.jsx` | Phase B: service cards link to `/dashboard/start?track=<id>`; draft summary card shows "Draft, X% complete · Resume"; wizard no longer mounts inline |
| `src/layouts/Topbar.jsx` | Phase B defect fix: company fallback (Task 19) |
| `src/layouts/Sidebar.jsx` | Phase B defect fix: label "Repayments" (Task 19) |

---

## SQL — `sql/phase3-shell.sql`

```sql
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
update public.profiles p
set client_ref = 'HB-' || to_char(p.created_at, 'YYYY') || '-' ||
                 lpad(nextval('public.client_ref_seq')::text, 5, '0')
where p.client_ref is null;

-- 2. Structured offer terms, set by staff when issuing an offer
alter table public.applications
  add column if not exists offer_terms jsonb;

comment on column public.applications.offer_terms is
  'Shape: { "principal": number, "currency": "USD", "annual_rate_pct": number, "term_months": int, "repayment_frequency": "monthly"|"quarterly"|"semiannual"|"annual", "grace_months": int, "structure": "amortising"|"bullet"|"balloon", "balloon_pct": number }';

-- RLS: existing policies on profiles (own-row read) and applications
-- (borrower reads own; staff full) already cover both columns. No new policies.
```

---

## Amortisation engine contract — `src/lib/amortisation.js`

Pure, framework-free. All money in major units; internal math unrounded, rounding at the display layer.

```
paymentAmount({ principal, annualRatePct, termMonths, frequency }) -> number
  Standard annuity: r = annualRatePct/100/periodsPerYear, n = periods.
  r === 0 -> principal / n.

buildSchedule({ principal, annualRatePct, termMonths, frequency,
                graceMonths = 0, structure = 'amortising', balloonPct = 0 })
  -> [{ period, payment, interest, principal, balance }]
  Grace: interest-only payments during grace periods; amortisation runs
  over remaining periods.
  Bullet: interest-only every period; final period repays full principal.
  Balloon: balloonPct% of principal repaid as lump in final period;
  the remainder amortises over the term (final payment = last
  amortising instalment + balloon).
  Invariant: closing balance of last period === 0 (±0.01 tolerance).

totals(schedule) -> { totalPaid, totalInterest, totalPrincipal }

dscr({ netOperatingIncomePerPeriod, schedule }) ->
  { minDscr, avgDscr, band }
  band: >=1.5 'strong' | >=1.25 'adequate' | >=1.0 'thin' | <1.0 'insufficient'
```

`frequency` → periods per year: monthly 12, quarterly 4, semiannual 2, annual 1. `termMonths` must divide evenly into the chosen frequency; the Estimator constrains inputs so it always does.

---

## Task 1: SQL migration — client_ref + offer_terms

**Files:** Create `sql/phase3-shell.sql` (contents above)

- [ ] **Step 1:** Create the file exactly as specified
- [ ] **Step 2:** Run in Supabase SQL Editor. Verify: `select client_ref from profiles limit 5` shows `HB-2026-000NN` for all rows; `applications` has `offer_terms` column
- [ ] **Step 3:** Confirm `AuthContext`'s profile fetch uses `select('*')` so `client_ref` flows through without code change; if it selects named columns, add `client_ref`
- [ ] **Step 4:** Commit — `chore: client_ref + offer_terms migration for dashboard shell`

---

## Task 2: Amortisation engine (TDD)

**Files:** Create `src/lib/amortisation.js`, `src/lib/__tests__/amortisation.test.js`

- [ ] **Step 1: Write failing tests first.** Known-answer cases:
  - `paymentAmount({ principal: 100000, annualRatePct: 12, termMonths: 12, frequency: 'monthly' })` ≈ `8884.88` (±0.01)
  - Zero-rate: 120000 / 12 months = 10000 exactly
  - `buildSchedule` amortising: 12 rows, last balance ≤ 0.01, sum of principal column ≈ principal
  - Grace 3 months on 12-month monthly loan: periods 1–3 payment === interest only, principal 0; amortisation over 9
  - Bullet: every payment = interest; final period principal = full principal
  - Balloon 30%: final period includes 30000 lump on 100k; schedule still zeroes out
  - `dscr`: NOI 12000/period against schedule with max payment 8884.88 → minDscr ≈ 1.35, band `adequate`
- [ ] **Step 2:** `npx vitest run src/lib/__tests__/amortisation.test.js` — expect FAIL (module missing)
- [ ] **Step 3:** Implement per the contract above until all pass
- [ ] **Step 4:** Commit — `feat: pure amortisation engine with grace, bullet, balloon, DSCR`

---

## Task 3: Shell — DashboardLayout, Sidebar, Topbar, routing

**Files:** Create `src/layouts/DashboardLayout.jsx` + module CSS, `Sidebar.jsx`, `Topbar.jsx`, `src/components/dashboard/ClientIdBadge.jsx`. Modify `src/App.jsx`.

**Sidebar nav (order fixed):** Overview `/dashboard` · My application `/dashboard/application` · Repayment modelling `/dashboard/modelling` · Documents `/dashboard/documents` · Checklist `/dashboard/checklist` · Messages `/dashboard/messages` · Fees and payments `/dashboard/fees` · Eligibility check `/dashboard/eligibility` · divider · Profile and settings `/dashboard/profile` · Sign out (action, not route).

- [ ] **Step 1:** Build `DashboardLayout`: CSS grid `auto 1fr` columns, topbar row spanning full width; sidebar 224px, collapses to 64px icon rail ≤1024px (labels hidden, `title` attr for tooltip), off-canvas drawer with hamburger ≤720px
- [ ] **Step 2:** `Sidebar` uses `NavLink`; active link: `--color-surface` background + `--color-gold-soft` text. `end` prop on the index link so Overview doesn't stay lit on children
- [ ] **Step 3:** `Topbar`: brand mark (Fraunces, gold) linking to `/dashboard`; `ClientIdBadge`; placeholder bell slot (Task 8 fills it); profile menu showing `profile.full_name`, `profile.company_name`, Sign out (`supabase.auth.signOut()` → `/`)
- [ ] **Step 4:** `ClientIdBadge`: renders `profile.client_ref ?? '—'`; click copies via `navigator.clipboard.writeText`, swaps copy icon for a tick for 1.5s
- [ ] **Step 5:** Rewire `App.jsx`: nested route block
  ```jsx
  <Route path="/dashboard" element={
    <ProtectedRoute requiredRole="borrower"><DashboardLayout /></ProtectedRoute>
  }>
    <Route index element={<Overview />} />
    <Route path="application" element={<ApplicationPage />} />
    <Route path="modelling" element={<Modelling />} />
    <Route path="documents" element={<DocumentsPage />} />
    <Route path="checklist" element={<DocChecklist />} />
    <Route path="messages" element={<MessagesPage />} />
    <Route path="fees" element={<FeesPage />} />
    <Route path="eligibility" element={<Eligibility />} />
    <Route path="export" element={<ExportSummary />} />
    <Route path="profile" element={<ProfileSettings />} />
  </Route>
  ```
  `ApplicationPage`, `DocumentsPage`, `MessagesPage`, `FeesPage` are thin wrappers that render the loan-wizard-plan panels if present, else a styled "available once your application progresses" empty state — the shell must build green regardless of Phases 2–5 status
- [ ] **Step 6:** Suppress marketing chrome: in `App.jsx`, `const inPortal = useLocation().pathname.startsWith('/dashboard')`; render `Navbar`/`Footer` only when `!inPortal`
- [ ] **Step 7:** `npm run build` zero errors; manual check: all ten routes resolve, sidebar collapses at both breakpoints
- [ ] **Step 8:** Commit — `feat: dashboard shell with sidebar, topbar, client ID, nested routes`

---

## Task 4: useApplication hook + Overview page

**Files:** Create `src/hooks/useApplication.js`, `src/pages/dashboard/Overview.jsx`, `ServiceCard.jsx`, tests. Retire `src/pages/Dashboard.jsx` (logic moves here).

- [ ] **Step 1 (failing tests):** Overview renders 4 financing-track cards when hook returns `application: null`; renders one summary card (track label, formatted amount, stage label, Client ID) when an application exists; self-service tool cards render in both states
- [ ] **Step 2:** `useApplication`: on mount `select('*').eq('applicant_id', user.id).maybeSingle()`; expose `{ application, loading, refresh }`
- [ ] **Step 3:** Overview: heading `Welcome, {first name}` + subline `Client ID {client_ref} · quote this on any document or message`. No application → section "Financing services" with 4 `ServiceCard`s from `financingData.js`, each launching `ApplicationWizard` with that track preselected (wizard component unchanged). Application exists → "Your application" summary card linking to `/dashboard/application`. Below, "Self-service tools" cards: Repayment modelling, Eligibility check, Document checklist, Export summary — each links to its route
- [ ] **Step 4:** Tests pass, build passes
- [ ] **Step 5:** Commit — `feat: overview with service cards and application summary`

---

## Task 5: Repayment modelling — Estimator + charts

**Files:** Create `Modelling.jsx`, `modelling/Estimator.jsx`, `modelling/ScheduleTable.jsx`, `Modelling.module.css`. Add `recharts`.

- [ ] **Step 1:** `npm install recharts`
- [ ] **Step 2:** `Modelling.jsx` = tab bar (Estimator · Actual schedule · DSCR · Compare), tab state local, active tab gold underline
- [ ] **Step 3:** Estimator inputs: amount (prefilled from `application.amount_sought` when present), annual rate % (default 12), term months (select: 6/12/24/36/48/60/84/120), frequency, grace months (0–24), structure (amortising/bullet/balloon), balloon % (10–50, only when balloon). Recompute schedule on change via `buildSchedule`
- [ ] **Step 4:** Outputs: three metric tiles (periodic payment, total interest, total cost) then two `recharts` charts — `AreaChart` of outstanding balance over periods; stacked `BarChart` of interest vs principal per period. Chart colours: principal `var(--color-gold)`, interest `var(--color-border)`, balance line `var(--color-gold-soft)` — pass resolved hex via `getComputedStyle(document.documentElement).getPropertyValue(...)` since recharts can't read CSS vars in all props
- [ ] **Step 5:** `ScheduleTable` below charts, first 12 rows + "Show all" expander; columns Period, Payment, Interest, Principal, Balance, all currency-formatted
- [ ] **Step 6:** Build passes; visual check both charts in the navy theme
- [ ] **Step 7:** Commit — `feat: repayment estimator with amortisation charts`

---

## Task 6: Actual schedule + DSCR + scenario comparison

**Files:** Create `modelling/ActualSchedule.jsx`, `modelling/DscrCalculator.jsx`, `modelling/ScenarioCompare.jsx`

- [ ] **Step 1:** ActualSchedule: if `application?.offer_terms` present → banner "Terms from your issued offer" + same tiles/charts/table driven by those terms, inputs read-only. Else empty state: "Your repayment schedule appears here once an offer is issued." with link to Estimator tab
- [ ] **Step 2:** DSCR: inputs — net operating income per period + frequency (or per year, divided down); uses current Estimator terms (lift shared terms state up into `Modelling.jsx`). Output: min DSCR, average DSCR, band chip (strong `--color-success` / adequate gold / thin muted / insufficient `--color-error`) and one plain sentence per band, e.g. insufficient: "Projected income does not cover debt service at these terms. Consider a longer term, lower amount, or a grace period."
- [ ] **Step 3:** ScenarioCompare: "Save as scenario" button on Estimator snapshots current terms (max 3, named A/B/C, in-memory state); Compare tab renders saved scenarios side-by-side cards (terms summary, payment, total interest, total cost) + delta row vs Scenario A. Empty state prompts saving from the Estimator
- [ ] **Step 4:** Build + commit — `feat: actual schedule, DSCR calculator, scenario comparison`

---

## Task 7: Eligibility self-check

**Files:** Create `src/data/eligibilityModel.js`, `src/pages/dashboard/Eligibility.jsx`, test

**Model (in `eligibilityModel.js`):** 10 questions across 5 weighted pillars mirroring the fundability methodology — Financial records (25): audited/management accounts available? revenue trend? · Collateral and security (20): collateral available? clean title/ownership evidence? · Project/business documentation (20): business plan or feasibility study? offtake/contracts in hand? · Compliance (15): registration current? tax compliance? · Capacity (20): management track record? existing debt service history? Each answer maps to 0/0.5/1; score = Σ(answer × pillar weight)/10, displayed /10. Bands: ≥7.5 "Application-ready" · 5–7.4 "Conditionally ready" · <5 "Not yet ready". Fix-list = pillars scoring <60% of their weight, ordered by points forgone, each with one concrete remediation line.

- [ ] **Step 1 (failing test):** All-best answers → 10.0 and "Application-ready"; all-worst → 0.0 and "Not yet ready"; a mixed fixture → expected band + fix-list ordered by impact
- [ ] **Step 2:** Implement scoring in the data module (pure function `scoreAnswers(answers) -> { score, band, fixes }`) so the test needs no rendering
- [ ] **Step 3:** Eligibility page: one question per card, radio answers, progress indicator; result screen with score dial (simple SVG arc, gold), band chip, fix-list; CTA "Start application" only when band ≠ "Not yet ready", else CTA links to Document checklist
- [ ] **Step 4:** Include the disclaimer line: "Indicative self-assessment only. It does not constitute an offer, approval, or advice."
- [ ] **Step 5:** Tests + build pass; commit — `feat: eligibility self-check with weighted fundability scoring`

---

## Task 8: Realtime — useRealtimeEvents + NotificationsBell

**Files:** Create `src/hooks/useRealtimeEvents.js`, `src/components/dashboard/NotificationsBell.jsx`. Modify `Topbar.jsx`.

- [ ] **Step 1:** Supabase dashboard → Database → Replication: enable realtime on `application_events` and `applications` (manual step, document in plan comments)
- [ ] **Step 2:** `useRealtimeEvents(applicationId)`: initial fetch of last 20 events desc; `supabase.channel('events-' + applicationId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'application_events', filter: 'application_id=eq.' + applicationId }, handler)`; prepend new rows; unread count = events newer than a `lastSeenAt` timestamp kept in state, reset when the dropdown opens. Clean up channel on unmount
- [ ] **Step 3:** In `useApplication`, subscribe to UPDATE on the user's `applications` row and refresh — status changes propagate to the tracker with no reload
- [ ] **Step 4:** `NotificationsBell`: bell icon + gold count badge; dropdown lists event label + relative time; entries link to the relevant route (status → application, document → documents, message → messages, fee/payment → fees)
- [ ] **Step 5:** Build passes; manual check: staff status change in another session updates the borrower view live
- [ ] **Step 6:** Commit — `feat: realtime events, live status refresh, notifications bell`

---

## Task 9: Document requirements checklist

**Files:** Create `src/data/docRequirements.js`, `src/pages/dashboard/DocChecklist.jsx`, test

**Requirements data (per track, extend as needed):** common — certificate of incorporation, director/owner ID, proof of address, 12-month bank statements; `sme` adds management accounts, tax clearance; `project` adds feasibility study, land/title or site evidence, sponsor profile; `trade` adds counterparty contract or PO, trade history; `acquisition` adds target financials, heads of terms.

- [ ] **Step 1 (failing test):** given a requirements list and a documents array, derivation returns `outstanding` (no matching doc), `received` (matching `document_type`/label uploaded), `verified` (matching doc AND a `note` event flagging verification — until staff verification exists, treat received as terminal and hide the verified state behind a constant `VERIFICATION_ENABLED = false`)
- [ ] **Step 2:** Implement pure `deriveChecklist(requirements, documents)` in the data module
- [ ] **Step 3:** Page: track-appropriate list (from `application.track`; if no application yet, show common list with note "Track-specific items appear once you start an application"); each row = status icon (outstanding: muted circle, received: gold tick, verified: `--color-success` tick), label, one-line description; outstanding rows link to `/dashboard/documents`
- [ ] **Step 4:** Summary bar at top: "N of M items received"
- [ ] **Step 5:** Tests + build; commit — `feat: per-track document requirements checklist`

---

## Task 10: Stage SLA metadata

**Files:** Create `src/data/stageMeta.js`. Modify `ProgressTracker.jsx` if present (else the wrapper empty state consumes it later).

- [ ] **Step 1:** `stageMeta.js`: array of 9 `{ key, label, description, slaDays: [min, max] }` — e.g. `kyc_verification` 3–5, `credit_assessment` 5–10, `funder_matching` 10–20, `term_sheet` 5–10, `offer_issued` 3–7 (values are placeholders; confirm with Kevin before launch, marked `// TODO confirm SLAs`)
- [ ] **Step 2:** If `ProgressTracker` exists: under the active stage render "typically {min}–{max} business days" in `--text-xs` muted. Also render each stage's description as a `title` tooltip
- [ ] **Step 3:** Build; commit — `feat: per-stage expected timelines`

---

## Task 11: Application summary export (print PDF)

**Files:** Create `src/pages/dashboard/ExportSummary.jsx`, `print.css`

- [ ] **Step 1:** Page renders a document-styled summary: brand header (Hasni Bank wordmark), Client ID, generated date, applicant block (name, company, country), application block (track, amount, currency, current stage, submitted date), then every non-empty `fields` entry with the FIELD_LABELS mapping from the admin view. Footer line: "Generated from the Hasni Bank client portal. Reference your Client ID in all correspondence."
- [ ] **Step 2:** `print.css` under `@media print`: hide sidebar/topbar/buttons, white background, dark text, A4 margins via `@page { margin: 2cm }`. Screen view keeps portal theme
- [ ] **Step 3:** "Print / Save as PDF" button → `window.print()`
- [ ] **Step 4:** No application → empty state linking to Overview
- [ ] **Step 5:** Build; manual print-preview check; commit — `feat: printable application summary export`

---

## Task 12 (optional — confirm before running): Status-change email notifications

**Files:** Create `functions/notify/status.js`

- [ ] **Step 1:** Supabase Database Webhook on `applications` UPDATE → POST to `https://<site>/api/notify/status` with a shared secret header (`NOTIFY_WEBHOOK_SECRET` env var; reject mismatches)
- [ ] **Step 2:** Function: verify secret; if `old.status !== new.status`, look up borrower email via service-role client (`SUPABASE_SERVICE_ROLE_KEY`), send Resend email (existing `RESEND_API_KEY`): subject "Your financing application has moved to {stage label}", body with Client ID, new stage, portal link. Return 200 always after verification
- [ ] **Step 3:** No client-side changes. Add both env vars to Cloudflare Pages; document in `.dev.vars.example`
- [ ] **Step 4:** Commit — `feat: status-change email notifications via Resend`

---

## Task 13: Final verification + push

- [ ] **Step 1:** `npx vitest run` — all suites pass (amortisation, Overview, Eligibility, DocChecklist, plus any pre-existing)
- [ ] **Step 2:** `npm run build` — zero errors
- [ ] **Step 3:** Manual sweep: every sidebar route on desktop, icon rail at 1024px, drawer at 720px; Client ID copies; estimator charts render; eligibility scores; checklist derives; export prints
- [ ] **Step 4:** `git push origin main`

---

# Phase B — My Application redesign

**Design principle:** the page always answers "whose move is it, and what exactly is the move?" Two modes, switched automatically: **action mode** (borrower owes something — the action dominates) and **monitoring mode** (Hasni owes something — progress, SLA, and preparation prompts). Reference mockup approved 2026-07-04.

**Phase mapping (add to `stageMeta.js` as `PHASES`):**

| Phase | Label | Statuses |
|-------|-------|----------|
| 1 | Apply | `draft`, `submitted`, `kyc_verification` |
| 2 | Assessment | `credit_assessment`, `funder_matching` |
| 3 | Offer | `term_sheet`, `offer_issued`, `offer_accepted` |
| 4 | Funding | `fee_payment`, `funded` |

---

## Task 14: SQL migration — draft status, business_profile, submitted_at

  **Files:** Create `sql/phase3b-application-redesign.sql`

  ```sql
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
  create policy "Borrowers update own draft"
    on public.applications for update
    using (applicant_id = auth.uid() and status = 'draft')
    with check (applicant_id = auth.uid()
                and status in ('draft', 'submitted'));
  ```

  - [ ] **Step 1:** Verify the exact existing check-constraint name via `select conname from pg_constraint where conrelid = 'public.applications'::regclass;` and adjust the drop statement if it differs
  - [ ] **Step 2:** Run in Supabase SQL Editor; verify a borrower session can update its own draft row but not a submitted one
  - [ ] **Step 3:** Confirm `amount_sought` stays NOT NULL — drafts are always created with track + amount (Task 18), so no relaxation needed
  - [ ] **Step 4:** Commit — `chore: draft status, business_profile jsonb, submitted_at migration`

---

## Task 15: Pure state helpers + PhaseRail (TDD)

**Files:** Create `src/lib/applicationState.js` + test, `src/pages/dashboard/PhaseRail.jsx` + test. Modify `src/data/stageMeta.js` (add `PHASES`).

**`applicationState.js` contract:**

```
profileCompletion(businessProfile) -> 0..100
  25 points per completed section flag in business_profile.progress.

kycCompletion(requirements, documents) -> { received, total, pct }
  Reuses deriveChecklist from docRequirements.

overallDraftCompletion(app, documents) -> 0..100
  60% weight business profile, 40% weight required KYC.

canSubmit(app, documents) -> boolean
  profileCompletion === 100 AND all required KYC items received.

resolveActionState(app, documents) ->
  'draft_profile' | 'draft_kyc' | 'in_review' | 'offer_issued' | 'fee_due' | 'funded'
  draft + profile < 100        -> 'draft_profile'
  draft + profile 100 + KYC out -> 'draft_kyc'
  submitted..funder_matching    -> 'in_review'
  term_sheet | offer_issued     -> 'offer_issued'
  offer_accepted | fee_payment  -> 'fee_due'
  funded                        -> 'funded'

phaseFor(status) -> 1..4  (per PHASES table above)
```

- [ ] **Step 1 (failing tests):** every branch of `resolveActionState`; completion math fixtures; `canSubmit` false when one KYC item outstanding; `phaseFor` for all 10 statuses
- [ ] **Step 2:** Implement `applicationState.js` and the `PHASES` export until green
- [ ] **Step 3 (failing tests):** `PhaseRail` renders 4 segments; segment for `phaseFor(status)` carries the active class and shows its internal step labels + SLA line ("typically N to M business days", horizontal, inside the expanded segment — never stacked under a circle); completed phases show a full gold fill bar; "View all 9 stages" toggle reveals the existing `ProgressTracker`
- [ ] **Step 4:** Implement `PhaseRail`; active segment: `--color-surface` bg + `--color-gold` border; inactive: `--color-border` border, muted text
- [ ] **Step 5:** All tests + build pass; commit — `feat: application state helpers and four-phase progress rail`

---

## Task 16: ActionCard + BusinessProfileForm (TDD)

**Files:** Create `src/pages/dashboard/ActionCard.jsx` + test, `BusinessProfileForm.jsx`

**ActionCard renders by `resolveActionState`:**

| State | Content |
|-------|---------|
| `draft_profile` | Title "Complete your application", completion % bar, two-column layout: Part 1 business profile section list (tick = complete), Part 2 KYC top-3 outstanding with inline Upload targets + "+N more in the checklist" link. Primary button "Resume: {first incomplete section}" opens `BusinessProfileForm` at that section. Caption: "Your progress saves automatically. Submission unlocks when both parts are complete." |
| `draft_kyc` | Same frame; Part 1 all ticked; primary action shifts to the first outstanding upload; when `canSubmit` flips true, primary button becomes "Submit application" → sets `status='submitted'`, `submitted_at=now()`, inserts `status_change` event, switches page to monitoring mode |
| `in_review` | "Nothing needed from you right now." + SLA for current stage + "While you wait" list: Run the eligibility check · Model your repayments · Review your document checklist (each links to its route) |
| `offer_issued` | Offer summary from `offer_terms` (amount, rate, term) + View/Download + Accept action (delegates to existing ActionZone mutation if built, else links to `/dashboard/documents`) + "See your repayment schedule" → Modelling actual tab |
| `fee_due` | Amount due, what it covers, Pay button (delegates to Fees route) |
| `funded` | Congratulatory close-out + link to export summary |

**BusinessProfileForm sections (writing to `business_profile` jsonb):** 1. Registration details (legal name, registration number, country, date incorporated) · 2. Sector and trading history (sector, years trading, staff count) · 3. Revenue and obligations (revenue band, existing debt yes/no + detail) · 4. Funding purpose — reuses the track-specific field set from `src/pages/wizard/steps/*Fields.jsx`, still writing those values to `fields` jsonb as Phase 1 wizard did, so the admin detail view keeps working unchanged.

- [ ] **Step 1 (failing tests):** ActionCard renders correct block per mocked state; Submit button absent until `canSubmit`; in_review lists three prompts
- [ ] **Step 2:** Implement ActionCard (presentational; all data via props)
- [ ] **Step 3:** BusinessProfileForm: one section visible at a time with a section stepper; debounced autosave (800ms) via `update({ business_profile })` on the draft row; per-section "Mark complete" sets the progress flag; validation per field mirrors wizard rules
- [ ] **Step 4:** Tests + build pass; commit — `feat: stage-aware action card and resumable business profile form`

---

## Task 17: MyApplication page assembly

**Files:** Create `src/pages/dashboard/MyApplication.jsx`. Modify route: `/dashboard/application` now renders `MyApplication` (the thin `ApplicationPage` wrapper from Task 3 is retired).

**Zone order (per approved mockup):**
1. Header strip: Fraunces "Your application"; subline `{track label} · {currency amount} · {client_ref} · Started/Submitted {date}`; right-aligned status pill — action mode: gold-bordered "Action required · Draft {X}% complete"; monitoring mode: muted "In review, no action needed"
2. `PhaseRail`
3. `ActionCard`
4. Supporting row (3 cards): Documents (received/outstanding counts → checklist), Repayments (mini balance sparkline from estimator terms prefilled with `amount_sought` → Modelling), Messages (latest thread line + unread badge → Messages)
5. Activity feed: from `useRealtimeEvents`; copy format `"{Event label}: {detail}"` — colon separator, **no em dashes** (fixes current "Status Update — Advanced to Submitted"); each entry deep-links to its section

- [ ] **Step 1:** Assemble the page from Tasks 15–16 components; wire `useApplication` + `useRealtimeEvents` + `deriveChecklist`
- [ ] **Step 2:** No application at all → redirect to `/dashboard` (Overview owns the start flow)
- [ ] **Step 3:** Manual check of both modes by toggling a test row between `draft` and `credit_assessment`
- [ ] **Step 4:** Build passes; commit — `feat: my application self-service workspace`

---

## Task 18: Start flow + post-signup redirect + Overview rewire

**Files:** Create `src/pages/dashboard/StartApplication.jsx` (route `/dashboard/start`). Modify `SignupProfile.jsx`, `Overview.jsx`, `App.jsx`.

- [ ] **Step 1:** `StartApplication`: track cards (reuse `TrackSelect` visuals; preselect from `?track=` param) + amount + currency; submit inserts `{ applicant_id, track, amount_sought, currency, status: 'draft', fields: {}, business_profile: {} }` then navigates to `/dashboard/application`. If a row already exists (UNIQUE violation or pre-check), redirect straight to `/dashboard/application`
- [ ] **Step 2:** `SignupProfile.jsx`: after profile insert succeeds, `navigate('/dashboard/start')` — new borrowers land directly in the start flow, then the action-mode workspace
- [ ] **Step 3:** `Overview.jsx`: service cards link to `/dashboard/start?track={id}` (remove inline `ApplicationWizard` mount); when a draft exists, summary card reads "Draft · {X}% complete" with Resume → `/dashboard/application`; when submitted+, unchanged summary
- [ ] **Step 4:** Add `/dashboard/start` route in `App.jsx` inside the layout block
- [ ] **Step 5:** Full flow manual test: fresh signup → verify email → profile → start → draft workspace; refresh mid-form resumes at saved state
- [ ] **Step 6:** Commit — `feat: draft start flow and post-signup redirect into application workspace`

---

## Task 19: Defect fixes + Phase B verification

- [ ] **Step 1:** `Topbar.jsx`: profile menu second line renders `profile?.company_name` only when truthy and not a placeholder — never raw filler like "NOT NULL"; fall back to nothing. Root cause note: seeded test profile lacked a real company name; `company_name` is already NOT NULL at signup so this only affects seeded rows
- [ ] **Step 2:** `Sidebar.jsx`: rename "Repayment modelling" label to "Repayments" (route unchanged) — kills the truncation
- [ ] **Step 3:** Confirm no SLA text renders under individual tracker circles anywhere; SLA lives only inside `PhaseRail`'s expanded segment and the in_review ActionCard
- [ ] **Step 4:** Sweep all UI copy added in Phase B for em dashes and "loan application" phrasing — both are violations
- [ ] **Step 5:** `npx vitest run` all green; `npm run build` zero errors; `git push origin main`
- [ ] **Step 6:** Commit — `fix: topbar company fallback, sidebar label, SLA placement`

---

## Out of Scope (future plans)

- e-Signature for offer/term-sheet acceptance (needs signing-flow decision: in-house canvas vs provider)
- Post-funding repayment ledger and statements (needs repayment schedule table + payment reconciliation)
- Multi-currency FX display (needs rate source decision)
- Callback scheduling, SMS notifications
- Staff-side UI for setting `offer_terms` (small addition to the admin detail view — belongs in the loan-wizard Phase 2/3 work; until built, set via Supabase Table Editor)
- Wizard Phases 2–5 panels themselves (existing loan-wizard plan)