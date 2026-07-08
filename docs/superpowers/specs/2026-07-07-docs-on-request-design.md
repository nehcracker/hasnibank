# Documents on Request + Fundability-Gated Draft — Design

**Date:** 2026-07-07
**Status:** Approved by user 2026-07-07
**Context:** Follows the dashboard shell / self-service plan (Phases A–C, all shipped). Supabase migrations through phase3c are file-based and applied manually.

## Problem

The draft application currently gates submission on a per-track KYC document checklist, but no general upload flow exists (the Documents page is a stub; the only working upload is the Phase C RFI response). The fundability self-check exists as a throwaway tool: its score is computed in memory and never seen by staff.

## Decision

Documents are uploaded **only when the assessment team requests them** (the existing RFI mechanism). The draft application centres on two things: the **business profile** and the **fundability self-check**.

Decisions taken with the user:

| Question | Decision |
|----------|----------|
| Self-check role | Required before submission, any score accepted; result persisted and staff-visible |
| Documents UI | One request-driven Documents page; Checklist page and sidebar link removed |
| Draft completion | 80% business profile, 20% self-check |
| Self-check storage | `eligibility` jsonb column on `applications` (approach A; no new table, existing draft-update RLS covers it) |

## Design

### 1. Submission gate and states (`src/lib/applicationState.js`)

- `canSubmit(app)` = `profileCompletion === 100` AND `app.eligibility?.completed_at` present. Documents no longer considered.
- `resolveActionState`: `draft_kyc` is replaced by **`draft_selfcheck`** (profile complete, self-check pending). Order: `draft_profile` → `draft_selfcheck` → submit enabled.
- `overallDraftCompletion(app)` = `round(profilePct * 0.8 + (selfCheckDone ? 20 : 0))`. `kycCompletion` is removed from gating (delete if no longer referenced).
- `rfi_open` behaviour (Phase C) unchanged.

### 2. Action card draft mode (`src/pages/dashboard/ActionCard.jsx`)

Part 2 heading changes from "Part 2: KYC documents" to "Part 2: Fundability self-check":

- Not started: one line of copy ("A short readiness check the assessment team sees alongside your profile.") and a "Run the self-check" button → `/dashboard/eligibility`.
- Completed: score `X.X / 10`, band chip, completed date, "Retake" link (draft only).
- Primary action logic unchanged in shape: resume profile → run self-check → Submit application.

### 3. Eligibility page persistence (`src/pages/dashboard/Eligibility.jsx`)

- On finishing the questionnaire, if a draft application exists: `update applications set eligibility = { answers, score, band, completed_at: now }` and insert a `note` audit event with detail "Fundability self-check completed".
- No application (or non-draft status): page works exactly as today, nothing persisted.
- Retake while draft overwrites the stored result.

### 4. Request-driven Documents page

- The RFI response mutation moves from `MyApplication.jsx` into a shared hook `src/hooks/useRfiResponse.js` (upload to `application-documents` bucket, insert `application_documents` row, flip RFI to `responded`, audit event). `MyApplication` and the Documents page both use it.
- `DocumentsPage.jsx` replaces its stub with two sections:
  1. **Requested by the assessment team** — open document-type RFIs, each with prompt, due date, and the upload control. Empty state: "Nothing is requested right now. The assessment team will ask here when a document is needed."
  2. **Your documents** — every `application_documents` row: label, uploaded date, received/verified state.
- Removed: `DocChecklist` route and page, Checklist sidebar link, Overview's "Document checklist" tool card (becomes "Documents"), checklist-derived counts in MyApplication's Documents support card (now "N uploaded · M requested").
- `src/data/docRequirements.js` keeps `deriveChecklist`/track lists only where staff features use the document-type vocabulary (evidence pairing); delete borrower-only exports if unreferenced.

### 5. Staff visibility (`src/pages/admin/tabs/ApplicationTab.jsx`)

Left column gains a "Fundability self-check" section: score, band, completed date, and the per-question answers (question text + chosen option), rendered from `application.eligibility`. Shows "Not completed" when absent (only possible for legacy rows; new submissions always carry it).

### 6. Migration (`sql/phase3d-eligibility.sql`)

```sql
alter table public.applications
  add column if not exists eligibility jsonb;
comment on column public.applications.eligibility is
  'Shape: { "answers": { qId: 0|0.5|1 }, "score": number, "band": text, "completed_at": timestamptz }';
```

No new RLS: borrowers write it via the existing "Borrowers update own draft" policy; staff read via their full-access policy.

### 7. Tests

- `applicationState.test.js`: rewrite `canSubmit`, `resolveActionState` draft branches, `overallDraftCompletion` fixtures for the 80/20 model and `draft_selfcheck`.
- `ActionCard.test.jsx`: `draft_selfcheck` renders self-check block and gates Submit on eligibility presence.
- `Overview.test.jsx`: update the 60%-weighting fixture to the new math.
- New: Eligibility persistence (save called with score/band on completion when draft exists).

### Out of scope

- Minimum-score submission gating (rejected: self-check is indicative only).
- Eligibility retake history (no table; latest result only).
- Any change to staff RFI/finding/offer/funding flows.

## Copy rules

Same as the parent plan: "financing application" never "loan application", no em dashes in UI copy, facilitation language, self-check keeps its disclaimer ("Indicative self-assessment only. It does not constitute an offer, approval, or advice.").
