# Documents on Request + Fundability-Gated Draft — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date:** 2026-07-07
**Spec:** `docs/superpowers/specs/2026-07-07-docs-on-request-design.md` (approved 2026-07-07)

**Goal:** Documents are uploaded only when the assessment team requests them (existing RFI flow); the draft application gates submission on the business profile (80% of completion) plus a completed fundability self-check (20%, any score, persisted to `applications.eligibility` and shown to staff).

**Architecture:** One jsonb column (`eligibility`) on `applications` carries the self-check result; existing "Borrowers update own draft" RLS covers writes, staff full-access covers reads. The pure state helpers in `src/lib/applicationState.js` drop all document awareness; the RFI response mutation moves from `MyApplication.jsx` into a shared `useRfiResponse` hook so the rebuilt request-driven Documents page reuses it. The Checklist page and its nav entry are deleted.

**Tech Stack:** React 18 + Vite, Supabase JS (`@/lib/supabase`), Vitest + React Testing Library, CSS Modules with tokens from `src/styles/tokens.css`.

## Global Constraints

- All colors via CSS custom properties (`--color-navy`, `--color-surface`, `--color-gold`, `--color-gold-soft`, `--color-ivory`, `--color-muted`, `--color-border`, `--color-success`, `--color-error`); never hardcode hex
- Fonts `var(--font-heading)` / `var(--font-body)`; sizes `--text-xs`…; spacing `--space-*`; radius `--radius-*`
- `.jsx` for JSX files; `@/` alias → `src/`
- UI copy: "financing application" never "loan application"; no em dashes in UI copy; facilitation language for anything about funds moving
- Self-check disclaimer stays verbatim: "Indicative self-assessment only. It does not constitute an offer, approval, or advice."
- `npm run build` zero errors before every commit; commit after every task
- Supabase migrations are files in `sql/` run manually by the user in the SQL Editor (paste whole file, nothing selected)
- Tables may not exist yet in an environment: every new Supabase read degrades to an empty list with `console.warn`, never a crash

---

### Task 1: SQL migration — `eligibility` jsonb

**Files:**
- Create: `sql/phase3d-eligibility.sql`

**Interfaces:**
- Produces: `applications.eligibility` jsonb, shape `{ "answers": { "<qId>": 0|0.5|1 }, "score": number, "band": string, "completed_at": ISO timestamptz string }`. Written by borrowers while `status = 'draft'` via the existing "Borrowers update own draft" policy; read by staff via their full-access policy. No new RLS.

- [ ] **Step 1: Create the file**

```sql
-- Phase 3d: persist the fundability self-check on the application
-- Run in Supabase SQL Editor. Paste the WHOLE file with nothing selected.
--
-- No new RLS: borrowers write this column on their own draft row via the
-- phase3b "Borrowers update own draft" policy; staff read via full access.

alter table public.applications
  add column if not exists eligibility jsonb;

comment on column public.applications.eligibility is
  'Fundability self-check result. Shape: { "answers": { "<qId>": 0|0.5|1 }, "score": number, "band": text, "completed_at": timestamptz }';
```

- [ ] **Step 2: Commit**

```bash
git add sql/phase3d-eligibility.sql
git commit -m "chore: eligibility jsonb migration for persisted self-check"
```

(The user runs the file manually; the UI from later tasks tolerates the column being absent because `app.eligibility` is simply `undefined`.)

---

### Task 2: State helpers — 80/20 completion, self-check gate, `draft_selfcheck` (TDD)

**Files:**
- Modify: `src/lib/applicationState.js`
- Test: `src/lib/__tests__/applicationState.test.js`

**Interfaces:**
- Produces (exact signatures later tasks rely on):
  - `selfCheckComplete(app) -> boolean` — true when `app?.eligibility?.completed_at` is truthy
  - `overallDraftCompletion(app) -> number` — `round(profilePct * 0.8) + (selfCheckComplete ? 20 : 0)`; **documents parameter removed**
  - `canSubmit(app) -> boolean` — profile 100% AND self-check complete; **documents parameter removed**
  - `resolveActionState(app, rfis = []) -> 'draft_profile'|'draft_selfcheck'|'rfi_open'|'in_review'|'offer_issued'|'fee_due'|'funded'` — **documents parameter removed; `draft_kyc` renamed `draft_selfcheck`**
  - `profileCompletion(businessProfile, requiredSections)` and `phaseFor(status)` unchanged
  - `kycCompletion` is **deleted** (no remaining callers after Tasks 3/5/6)

- [ ] **Step 1: Rewrite the affected tests.** In `src/lib/__tests__/applicationState.test.js`:

Remove `kycCompletion` from the import and delete the whole `describe('kycCompletion', ...)` block. Replace the `overallDraftCompletion`, `canSubmit`, and `resolveActionState` describe blocks with:

```js
const COMPLETED_CHECK = {
  answers: { q1: 1 }, score: 8.2, band: 'Application-ready',
  completed_at: '2026-07-07T12:00:00Z',
}

// ── overallDraftCompletion ────────────────────────────────────────────────────

describe('overallDraftCompletion', () => {
  test('nothing done scores 0', () => {
    expect(overallDraftCompletion(app())).toBe(0)
  })

  test('full profile without self-check scores 80', () => {
    expect(overallDraftCompletion(app({ business_profile: FULL_PROGRESS }))).toBe(80)
  })

  test('full profile with completed self-check scores 100', () => {
    expect(
      overallDraftCompletion(
        app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK })
      )
    ).toBe(100)
  })

  test('half profile without self-check scores 40', () => {
    const halfProfile = { progress: { registration: true, trading: true } }
    expect(overallDraftCompletion(app({ business_profile: halfProfile }))).toBe(40)
  })

  test('self-check alone scores 20', () => {
    expect(overallDraftCompletion(app({ eligibility: COMPLETED_CHECK }))).toBe(20)
  })
})

// ── canSubmit ─────────────────────────────────────────────────────────────────

describe('canSubmit', () => {
  test('true when profile complete and self-check completed', () => {
    expect(
      canSubmit(app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK }))
    ).toBe(true)
  })

  test('false when self-check missing', () => {
    expect(canSubmit(app({ business_profile: FULL_PROGRESS }))).toBe(false)
  })

  test('false when profile incomplete even with self-check', () => {
    expect(canSubmit(app({ eligibility: COMPLETED_CHECK }))).toBe(false)
  })

  test('any band passes: Not yet ready still submits', () => {
    expect(
      canSubmit(
        app({
          business_profile: FULL_PROGRESS,
          eligibility: { ...COMPLETED_CHECK, score: 2.0, band: 'Not yet ready' },
        })
      )
    ).toBe(true)
  })
})

// ── resolveActionState ────────────────────────────────────────────────────────

describe('resolveActionState', () => {
  test('draft with incomplete profile is draft_profile', () => {
    expect(resolveActionState(app())).toBe('draft_profile')
  })

  test('draft with complete profile is draft_selfcheck (self-check pending)', () => {
    expect(resolveActionState(app({ business_profile: FULL_PROGRESS }))).toBe(
      'draft_selfcheck'
    )
  })

  test('draft stays draft_selfcheck once the check is done (submit gate)', () => {
    expect(
      resolveActionState(
        app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK })
      )
    ).toBe('draft_selfcheck')
  })

  test.each(['submitted', 'kyc_verification', 'credit_assessment', 'funder_matching'])(
    '%s is in_review',
    (status) => {
      expect(resolveActionState(app({ status }))).toBe('in_review')
    }
  )

  test.each(['term_sheet', 'offer_issued'])('%s is offer_issued', (status) => {
    expect(resolveActionState(app({ status }))).toBe('offer_issued')
  })

  test.each(['offer_accepted', 'fee_payment'])('%s is fee_due', (status) => {
    expect(resolveActionState(app({ status }))).toBe('fee_due')
  })

  test('funded is funded', () => {
    expect(resolveActionState(app({ status: 'funded' }))).toBe('funded')
  })

  // Phase C: open information requests force action mode past draft
  const openRfi = { id: 'r-1', status: 'open' }

  test.each([
    'submitted', 'kyc_verification', 'credit_assessment', 'funder_matching',
    'term_sheet', 'offer_issued', 'offer_accepted', 'fee_payment', 'funded',
  ])('%s with an open RFI is rfi_open', (status) => {
    expect(resolveActionState(app({ status }), [openRfi])).toBe('rfi_open')
  })

  test('draft with an open RFI keeps its draft state', () => {
    expect(resolveActionState(app(), [openRfi])).toBe('draft_profile')
  })

  test('responded and resolved RFIs do not force action mode', () => {
    const rfis = [{ id: 'a', status: 'responded' }, { id: 'b', status: 'resolved' }]
    expect(resolveActionState(app({ status: 'credit_assessment' }), rfis)).toBe('in_review')
  })
})
```

Also update the extended-sections describe: the `draft with extended section pending stays draft_profile` test call changes from `resolveActionState(application, [])` to `resolveActionState(application)`. Keep `profileCompletion` and `phaseFor` blocks unchanged. Delete the `allDocs` fixture and the `SME_REQUIREMENTS` constant plus the `getRequirements` import if nothing else uses them.

- [ ] **Step 2: Run the tests — expect FAIL**

Run: `npx vitest run src/lib/__tests__/applicationState.test.js`
Expected: FAIL (`draft_selfcheck` unknown, completion math wrong, `canSubmit` still requires documents).

- [ ] **Step 3: Implement.** In `src/lib/applicationState.js`:

Remove the `getRequirements, deriveChecklist` import (docRequirements) and delete `kycCompletion`. Replace `overallDraftCompletion`, `canSubmit`, and the top of `resolveActionState`:

```js
/** True once the borrower has completed the fundability self-check. */
export function selfCheckComplete(app) {
  return Boolean(app?.eligibility?.completed_at)
}

/**
 * Weighted draft completion: 80% business profile, 20% self-check.
 * Documents no longer count; they are provided on request after submission.
 *
 * @param {object} app - application row (business_profile, required_sections, eligibility)
 * @returns {number} 0..100
 */
export function overallDraftCompletion(app) {
  const profilePct = profileCompletion(app?.business_profile, app?.required_sections)
  return Math.round(profilePct * 0.8) + (selfCheckComplete(app) ? 20 : 0)
}

/**
 * Submission gate: business profile fully complete AND the fundability
 * self-check completed (any score).
 */
export function canSubmit(app) {
  return (
    profileCompletion(app?.business_profile, app?.required_sections) === 100 &&
    selfCheckComplete(app)
  )
}

/**
 * Resolves which ActionCard state applies.
 *
 * Open information requests outrank every post-draft state: the applicant
 * owes a response, so the card switches to action mode until staff resolve
 * or the applicant responds.
 *
 * @param {Array} rfis - information_requests rows for the application
 * @returns {'draft_profile'|'draft_selfcheck'|'rfi_open'|'in_review'|'offer_issued'|'fee_due'|'funded'}
 */
export function resolveActionState(app, rfis = []) {
  const status = app?.status
  if (status === 'draft') {
    return profileCompletion(app?.business_profile, app?.required_sections) < 100
      ? 'draft_profile'
      : 'draft_selfcheck'
  }
  if (rfis.some((r) => r.status === 'open')) {
    return 'rfi_open'
  }
  if (['submitted', 'kyc_verification', 'credit_assessment', 'funder_matching'].includes(status)) {
    return 'in_review'
  }
  if (status === 'term_sheet' || status === 'offer_issued') return 'offer_issued'
  if (status === 'offer_accepted' || status === 'fee_payment') return 'fee_due'
  return 'funded'
}
```

- [ ] **Step 4: Run the file's tests — expect PASS**

Run: `npx vitest run src/lib/__tests__/applicationState.test.js`
Expected: PASS. (The full suite still fails until Tasks 3 and 5 update the callers — that is expected; do NOT run the full suite as the gate here.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/applicationState.js src/lib/__tests__/applicationState.test.js
git commit -m "feat: draft gate on business profile plus fundability self-check"
```

---

### Task 3: ActionCard — self-check block replaces KYC part 2 (TDD)

**Files:**
- Modify: `src/pages/dashboard/ActionCard.jsx`
- Test: `src/pages/dashboard/__tests__/ActionCard.test.jsx`

**Interfaces:**
- Consumes: `application.eligibility` (Task 1 shape); states `draft_profile`/`draft_selfcheck` from Task 2.
- Produces: `ActionCard` props change — `checklist` prop is removed entirely; everything else (`state`, `application`, `completionPct`, `canSubmitNow`, `submitting`, `accepting`, `rfis`, `respondingRfiId`, `offer`, callbacks) unchanged. `SECTION_LABELS` export unchanged.

- [ ] **Step 1: Update the tests.** In `ActionCard.test.jsx`:

Delete the `SME_CHECKLIST_EMPTY`/`SME_CHECKLIST_FULL` fixtures, the `deriveChecklist`/`getRequirements` import, and the `checklist` key in `setup`'s defaults. Delete the test `draft_profile lists top 3 outstanding KYC items with a more link`. Replace the two `draft_kyc` tests with:

```jsx
const COMPLETED_CHECK = {
  answers: { q1: 1 }, score: 8.2, band: 'Application-ready',
  completed_at: '2026-07-07T12:00:00Z',
}

const FULL_PROFILE = {
  progress: { registration: true, trading: true, financials: true, purpose: true },
}

test('draft_profile shows the self-check as part 2 with a run link', () => {
  setup({ state: 'draft_profile' })
  expect(screen.getByText('Part 2: Fundability self-check')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /run the self-check/i })).toHaveAttribute(
    'href',
    '/dashboard/eligibility'
  )
})

test('draft_selfcheck without a completed check has no submit button', () => {
  setup({
    state: 'draft_selfcheck',
    application: makeApp({ business_profile: FULL_PROFILE }),
    canSubmitNow: false,
  })
  expect(
    screen.queryByRole('button', { name: /submit application/i })
  ).not.toBeInTheDocument()
  // Primary action steers to the self-check instead
  expect(screen.getAllByRole('link', { name: /run the self-check/i }).length).toBeGreaterThan(0)
})

test('draft_selfcheck with completed check shows score, band, and submit', () => {
  const onSubmit = vi.fn()
  setup({
    state: 'draft_selfcheck',
    application: makeApp({
      business_profile: FULL_PROFILE,
      eligibility: COMPLETED_CHECK,
    }),
    canSubmitNow: true,
    completionPct: 100,
    onSubmit,
  })
  expect(screen.getByText(/8\.2 \/ 10/)).toBeInTheDocument()
  expect(screen.getByText(/application-ready/i)).toBeInTheDocument()
  const btn = screen.getByRole('button', { name: /submit application/i })
  btn.click()
  expect(onSubmit).toHaveBeenCalled()
})
```

Also update the in_review test: the third prompt text changes from `review your document checklist` to `review your documents`.

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/pages/dashboard/__tests__/ActionCard.test.jsx`
Expected: FAIL (Part 2 still renders KYC documents).

- [ ] **Step 3: Implement.** In `ActionCard.jsx`:

1. In `WHILE_YOU_WAIT`, change `{ label: 'Review your document checklist', to: '/dashboard/checklist' }` to `{ label: 'Review your documents', to: '/dashboard/documents' }`.
2. In `CardBody`, route both `'draft_profile'` and `'draft_selfcheck'` to `DraftBlock` (replace the `'draft_kyc'` case label).
3. Remove the `checklist = []` prop from `ActionCard` and its pass-through to `CardBody`.
4. Replace `DraftBlock` in full:

```jsx
function DraftBlock({
  state,
  application,
  completionPct,
  canSubmitNow,
  submitting,
  onResume,
  onSubmit,
}) {
  const sectionOrder = sectionOrderFor(application)
  const progress = application?.business_profile?.progress ?? {}
  const firstIncomplete = sectionOrder.find((s) => progress[s] !== true)
  const eligibility = application?.eligibility
  const checkDone = Boolean(eligibility?.completed_at)

  return (
    <>
      <h2 className={styles.title}>Complete your application</h2>

      <div className={styles.progressRow}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${completionPct}%` }} />
        </div>
        <span className={styles.progressLabel}>{completionPct}% complete</span>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Part 1: Business profile</h3>
          <ul className={styles.itemList}>
            {sectionOrder.map((key) => (
              <li key={key} className={styles.item}>
                {progress[key] === true ? <TickIcon /> : <CircleIcon />}
                <span
                  className={
                    progress[key] === true ? styles.itemDone : styles.itemPending
                  }
                >
                  {SECTION_LABELS[key]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Part 2: Fundability self-check</h3>
          {checkDone ? (
            <>
              <ul className={styles.itemList}>
                <li className={styles.item}>
                  <TickIcon />
                  <span className={styles.itemDone}>
                    Completed · {Number(eligibility.score).toFixed(1)} / 10 · {eligibility.band}
                  </span>
                </li>
              </ul>
              <Link to="/dashboard/eligibility" className={styles.moreLink}>
                Retake the self-check
              </Link>
            </>
          ) : (
            <>
              <p className={styles.itemPending}>
                A short readiness check the assessment team sees alongside your
                profile. Any score is accepted.
              </p>
              <Link to="/dashboard/eligibility" className={styles.uploadLink}>
                Run the self-check
              </Link>
            </>
          )}
        </div>
      </div>

      <div className={styles.actionRow}>
        {state === 'draft_profile' && firstIncomplete && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onResume?.(firstIncomplete)}
          >
            Resume: {SECTION_LABELS[firstIncomplete]}
          </button>
        )}
        {state === 'draft_selfcheck' &&
          (canSubmitNow ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onSubmit?.()}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          ) : (
            <Link to="/dashboard/eligibility" className={styles.primaryBtn}>
              Run the self-check
            </Link>
          ))}
      </div>

      <p className={styles.caption}>
        Your progress saves automatically. Submission unlocks when both parts are
        complete.
      </p>
    </>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/pages/dashboard/__tests__/ActionCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/ActionCard.jsx src/pages/dashboard/__tests__/ActionCard.test.jsx
git commit -m "feat: action card part 2 becomes the fundability self-check"
```

---

### Task 4: Eligibility page persists the result to the draft application

**Files:**
- Modify: `src/pages/dashboard/Eligibility.jsx`
- Test: Create `src/pages/dashboard/__tests__/Eligibility.test.jsx`

**Interfaces:**
- Consumes: `useApplication()` → `{ application, refresh }`; `useAuth()` → `{ user }`; `scoreAnswers(answers)` from `@/data/eligibilityModel`.
- Produces: on reaching the result screen with a draft application, writes `applications.eligibility = { answers, score, band, completed_at }` and inserts a `note` audit event with `payload.detail = 'Fundability self-check completed'`. Non-draft or no application: no writes.

- [ ] **Step 1: Write the failing test** at `src/pages/dashboard/__tests__/Eligibility.test.jsx`:

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseAuth, mockUseApplication, mockUpdate, mockInsert } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseApplication: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(() => Promise.resolve({ error: null })),
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useApplication', () => ({ useApplication: mockUseApplication }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table) => {
      if (table === 'applications') {
        return { update: mockUpdate }
      }
      return { insert: mockInsert }
    },
  },
}))

import Eligibility from '../Eligibility'

function setup(application) {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
  mockUseApplication.mockReturnValue({
    application,
    loading: false,
    refresh: vi.fn(),
  })
  mockUpdate.mockReturnValue({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })
  return render(
    <MemoryRouter>
      <Eligibility />
    </MemoryRouter>
  )
}

/** Answer all 10 questions with the best option and advance to results. */
function completeQuestionnaire() {
  for (let i = 0; i < 10; i++) {
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[radios.length - 1])
    fireEvent.click(screen.getByRole('button', { name: /next|see results/i }))
  }
}

test('completing the check on a draft application saves the result', async () => {
  setup({ id: 'app-1', status: 'draft' })
  completeQuestionnaire()
  await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
  const payload = mockUpdate.mock.calls[0][0]
  expect(payload.eligibility.score).toBeCloseTo(10)
  expect(payload.eligibility.band).toBe('Application-ready')
  expect(payload.eligibility.completed_at).toBeTruthy()
  expect(Object.keys(payload.eligibility.answers)).toHaveLength(10)
})

test('no application means no save', async () => {
  setup(null)
  completeQuestionnaire()
  expect(screen.getByText(/your fundability score/i)).toBeInTheDocument()
  expect(mockUpdate).not.toHaveBeenCalled()
})

test('submitted application means no save', async () => {
  setup({ id: 'app-1', status: 'submitted' })
  completeQuestionnaire()
  expect(mockUpdate).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/pages/dashboard/__tests__/Eligibility.test.jsx`
Expected: FAIL (`mockUpdate` never called; component has no persistence).

- [ ] **Step 3: Implement.** In `Eligibility.jsx`:

1. Add imports:

```jsx
import { useState, useId, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
```

2. Inside the component, after the existing state:

```jsx
const { user } = useAuth()
const { application, refresh } = useApplication()
const savedRef = useRef(false)
const isDraft = application?.status === 'draft'

// Persist the result to the draft application the first time the result
// screen is reached; retakes reset the flag so a new run overwrites.
useEffect(() => {
  if (!isComplete || !isDraft || savedRef.current) return
  savedRef.current = true
  const { score, band } = scoreAnswers(answers)
  const eligibility = {
    answers,
    score,
    band,
    completed_at: new Date().toISOString(),
  }
  supabase
    .from('applications')
    .update({ eligibility })
    .eq('id', application.id)
    .then(({ error }) => {
      if (error) {
        console.warn('[Eligibility] save failed:', error.message)
        return
      }
      supabase.from('application_events').insert({
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'note',
        payload: { detail: 'Fundability self-check completed' },
      })
      refresh?.()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isComplete, isDraft])
```

3. In `handleRetake`, add `savedRef.current = false` before resetting state.
4. Replace the result-screen CTA block (the `/dashboard/checklist` link must go — that route is deleted in Task 6):

```jsx
const ctaHref = application ? '/dashboard/application' : '/dashboard'
const ctaLabel = application ? 'Back to your application' : 'Start financing application'
```

5. Below the band chip on the result screen (only when `isDraft`), add a saved note:

```jsx
{isDraft && (
  <p className={styles.disclaimer}>
    Result saved to your application for the assessment team.
  </p>
)}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/pages/dashboard/__tests__/Eligibility.test.jsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/Eligibility.jsx src/pages/dashboard/__tests__/Eligibility.test.jsx
git commit -m "feat: persist fundability self-check to the draft application"
```

---

### Task 5: `useRfiResponse` hook + MyApplication and Overview rewire

**Files:**
- Create: `src/hooks/useRfiResponse.js`
- Modify: `src/pages/dashboard/MyApplication.jsx`
- Modify: `src/pages/dashboard/Overview.jsx`
- Test: `src/pages/dashboard/__tests__/Overview.test.jsx`

**Interfaces:**
- Produces: `useRfiResponse({ application, user, onDone }) -> { respondRfi, respondingRfiId }` where `respondRfi(rfi, { file? , value? })` performs the document upload (bucket `application-documents`, path `${application.id}/rfi-${rfi.id}-${Date.now()}-${file.name}`) or inline value response, flips the RFI to `responded`, writes the audit event, then calls `onDone()`. Task 6's Documents page consumes this exact signature.
- Consumes: Task 2 signatures (`overallDraftCompletion(app)`, `canSubmit(app)`, `resolveActionState(app, rfis)`), Task 3's ActionCard props (no `checklist`).

- [ ] **Step 1: Create the hook** at `src/hooks/useRfiResponse.js` (logic moved verbatim from `MyApplication.handleRespondRfi`):

```js
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Shared borrower-side RFI response mutation, used by the My Application
 * action card and the Documents page.
 *
 * respondRfi(rfi, { file })  - document response: upload + document row
 * respondRfi(rfi, { value }) - text or figure response
 */
export function useRfiResponse({ application, user, onDone }) {
  const [respondingRfiId, setRespondingRfiId] = useState(null)

  async function respondRfi(rfi, response) {
    setRespondingRfiId(rfi.id)
    try {
      let responsePayload

      if (response.file) {
        const path = `${application.id}/rfi-${rfi.id}-${Date.now()}-${response.file.name}`
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(path, response.file)
        if (uploadError) throw uploadError

        const { data: doc, error: docError } = await supabase
          .from('application_documents')
          .insert({
            application_id: application.id,
            document_type: 'rfi_response',
            label: response.file.name,
            note: 'Uploaded in response to an information request',
            storage_path: path,
            uploaded_by: user.id,
          })
          .select()
          .single()
        if (docError) throw docError
        responsePayload = { document_id: doc.id, label: response.file.name }
      } else {
        responsePayload = { value: response.value }
      }

      const { error: updateError } = await supabase
        .from('information_requests')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString(),
          response_payload: responsePayload,
        })
        .eq('id', rfi.id)
      if (updateError) throw updateError

      await supabase.from('application_events').insert({
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'rfi',
        payload: { action: 'responded', prompt: rfi.prompt },
      })
      await onDone?.()
    } catch (error) {
      console.error('[useRfiResponse] response failed:', error.message)
    }
    setRespondingRfiId(null)
  }

  return { respondRfi, respondingRfiId }
}
```

- [ ] **Step 2: Rewire `MyApplication.jsx`:**

1. Imports: remove `getRequirements, deriveChecklist` (docRequirements); add `import { useRfiResponse } from '@/hooks/useRfiResponse'`.
2. Delete the whole `handleRespondRfi` function and the `respondingRfiId` state; replace with (after `loadRfis` is defined):

```jsx
const { respondRfi, respondingRfiId } = useRfiResponse({
  application,
  user,
  onDone: loadRfis,
})
```

3. Replace the derived values block:

```jsx
const state = resolveActionState(application, rfis)
const completionPct = overallDraftCompletion(application)
const canSubmitNow = canSubmit(application)
const isDraft = application.status === 'draft'
const actionMode = ['draft_profile', 'draft_selfcheck', 'rfi_open', 'offer_issued', 'fee_due'].includes(state)
const openRfiCount = rfis.filter((r) => r.status === 'open').length
const openDocRequests = rfis.filter(
  (r) => r.status === 'open' && r.response_type === 'document'
).length
```

(delete the `checklist`, `receivedCount`, `outstandingCount` lines).
4. ActionCard call: remove the `checklist={checklist}` prop; `onRespondRfi={respondRfi}` (was `handleRespondRfi`).
5. Documents support card: link changes from `/dashboard/checklist` to `/dashboard/documents`, body becomes:

```jsx
<Link to="/dashboard/documents" className={styles.supportCard}>
  <h3 className={styles.supportTitle}>Documents</h3>
  <p className={styles.supportValue}>
    {documents.length} uploaded
    {openDocRequests > 0 && (
      <span className={styles.supportMuted}>, {openDocRequests} requested</span>
    )}
  </p>
</Link>
```

- [ ] **Step 3: Rewire `Overview.jsx`:**

1. Delete the documents fetch `useEffect`, the `documents` state, and the `supabase` import (completion no longer needs documents).
2. `overallDraftCompletion(application, documents)` → `overallDraftCompletion(application)`.
3. In `SELF_SERVICE_TOOLS`, replace `{ title: 'Document checklist', href: '/dashboard/checklist' }` with `{ title: 'Documents', href: '/dashboard/documents' }`.

- [ ] **Step 4: Update `Overview.test.jsx`:** the draft fixture (full profile, no self-check) now expects 80%:

```jsx
// Full profile, no self-check: 80% weighted completion
expect(screen.getByText(/draft · 80% complete/i)).toBeInTheDocument()
```

The `vi.mock('@/lib/supabase', ...)` block can stay (harmless) or be deleted with the fetch — prefer deleting it.

- [ ] **Step 5: Run tests and build**

Run: `npx vitest run src/pages/dashboard/__tests__/Overview.test.jsx src/pages/dashboard/__tests__/ActionCard.test.jsx && npm run build`
Expected: PASS, build zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useRfiResponse.js src/pages/dashboard/MyApplication.jsx src/pages/dashboard/Overview.jsx src/pages/dashboard/__tests__/Overview.test.jsx
git commit -m "feat: shared rfi response hook, document-free draft completion"
```

---

### Task 6: Request-driven Documents page; delete the Checklist

**Files:**
- Modify: `src/pages/dashboard/DocumentsPage.jsx` (replace stub)
- Create: `src/pages/dashboard/DocumentsPage.module.css`
- Delete: `src/pages/dashboard/DocChecklist.jsx`
- Modify: `src/App.jsx` (remove `checklist` route + `DocChecklist` import)
- Modify: `src/layouts/Sidebar.jsx` (remove Checklist nav item)

**Interfaces:**
- Consumes: `useRfiResponse` (Task 5 signature), `useApplication`, `useAuth`.
- Produces: nothing consumed by later tasks. `src/data/docRequirements.js` and its tests are intentionally left untouched (canonical per-track document vocabulary; staff evidence pairing uses its type strings).

- [ ] **Step 1: Replace `DocumentsPage.jsx`:**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { useRfiResponse } from '@/hooks/useRfiResponse'
import styles from './DocumentsPage.module.css'

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Request-driven documents page: uploads happen only when the assessment
 * team asks (document-type information requests). Below the requests,
 * everything already uploaded with its received or verified state.
 */
export default function DocumentsPage() {
  const { user } = useAuth()
  const { application, loading: appLoading } = useApplication()
  const [documents, setDocuments] = useState([])
  const [rfis, setRfis] = useState([])

  const load = useCallback(async () => {
    if (!application?.id) return
    const [docsRes, rfisRes] = await Promise.all([
      supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('information_requests')
        .select('*')
        .eq('application_id', application.id)
        .eq('response_type', 'document')
        .order('created_at', { ascending: true }),
    ])
    // Tables may not exist yet in this environment — treat as empty lists
    if (docsRes.error) {
      console.warn('[DocumentsPage] application_documents unavailable:', docsRes.error.message)
      setDocuments([])
    } else {
      setDocuments(docsRes.data ?? [])
    }
    if (rfisRes.error) {
      console.warn('[DocumentsPage] information_requests unavailable:', rfisRes.error.message)
      setRfis([])
    } else {
      setRfis(rfisRes.data ?? [])
    }
  }, [application?.id])

  useEffect(() => {
    load()
  }, [load])

  const { respondRfi, respondingRfiId } = useRfiResponse({
    application,
    user,
    onDone: load,
  })

  const openRequests = rfis.filter((r) => r.status === 'open')

  if (appLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading your documents...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.pill}>Documents</span>
      <h1 className={styles.heading}>Documents</h1>
      <p className={styles.intro}>
        You only upload documents when the assessment team requests them. Open
        requests appear below with everything you have already provided.
      </p>

      <section className={styles.section} aria-label="Requested documents">
        <h2 className={styles.sectionTitle}>Requested by the assessment team</h2>
        {openRequests.length === 0 ? (
          <p className={styles.muted}>
            Nothing is requested right now. The assessment team will ask here
            when a document is needed.
          </p>
        ) : (
          openRequests.map((rfi) => (
            <div key={rfi.id} className={styles.requestRow}>
              <p className={styles.requestPrompt}>{rfi.prompt}</p>
              <p className={styles.muted}>
                {rfi.due_date ? `Needed by ${shortDate(rfi.due_date)}` : 'No due date set'}
              </p>
              <label className={styles.uploadControl}>
                <span className={styles.uploadControlLabel}>
                  {respondingRfiId === rfi.id ? 'Uploading...' : 'Upload response'}
                </span>
                <input
                  type="file"
                  className={styles.fileInput}
                  aria-label="Upload response"
                  disabled={respondingRfiId === rfi.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) respondRfi(rfi, { file })
                  }}
                />
              </label>
            </div>
          ))
        )}
      </section>

      <section className={styles.section} aria-label="Your documents">
        <h2 className={styles.sectionTitle}>Your documents</h2>
        {documents.length === 0 ? (
          <p className={styles.muted}>Nothing uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={styles.docRow}>
              <span className={styles.docLabel}>{doc.label || doc.document_type}</span>
              <span className={doc.verified_at ? styles.docVerified : styles.docReceived}>
                {doc.verified_at
                  ? `Verified ${shortDate(doc.verified_at)}`
                  : `Received ${shortDate(doc.created_at)}`}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Create `DocumentsPage.module.css`:**

```css
.page {
  padding: var(--space-8) var(--space-6);
  max-width: 760px;
}

.pill {
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-gold-soft);
  border: 1px solid var(--color-gold);
  border-radius: var(--radius-sm);
  padding: 2px 10px;
  margin-bottom: var(--space-4);
}

.heading {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  color: var(--color-ivory);
  margin: 0 0 var(--space-2);
}

.intro {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0 0 var(--space-8);
  max-width: 60ch;
}

.section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.sectionTitle {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  color: var(--color-ivory);
  margin: 0 0 var(--space-4);
}

.muted {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0;
}

.requestRow {
  border: 1px solid var(--color-gold);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.requestPrompt {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ivory);
  margin: 0 0 var(--space-1);
  white-space: pre-line;
}

.requestRow .muted { margin-bottom: var(--space-3); }

.uploadControl {
  display: inline-block;
  cursor: pointer;
}

.uploadControlLabel {
  display: inline-block;
  background: var(--color-gold);
  color: var(--color-navy);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-4);
  transition: var(--transition-fast);
}

.uploadControl:hover .uploadControlLabel { background: var(--color-gold-soft); }

.fileInput {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.docRow {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border);
  padding: var(--space-3) 0;
}

.docRow:first-of-type { border-top: none; padding-top: 0; }

.docLabel {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ivory);
  overflow-wrap: anywhere;
}

.docReceived {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-gold-soft);
  white-space: nowrap;
}

.docVerified {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-success);
  white-space: nowrap;
}
```

- [ ] **Step 3: Delete the checklist.**

1. `git rm src/pages/dashboard/DocChecklist.jsx`
2. `src/App.jsx`: remove the `import DocChecklist from '@/pages/dashboard/DocChecklist'` line and the `<Route path="checklist" element={<DocChecklist />} />` line.
3. `src/layouts/Sidebar.jsx`: remove the `{ to: '/dashboard/checklist', label: 'Checklist', Icon: IconChecklist },` entry from `NAV_ITEMS` and delete the now-unused `IconChecklist` component.

- [ ] **Step 4: Sweep for dangling references**

Run: `npx vitest run && npm run build`
Then: search the codebase for `/dashboard/checklist` and `DocChecklist` — zero hits expected (Tasks 3–5 already rewired ActionCard, MyApplication, Overview, Eligibility).
Expected: all tests pass, build zero errors, no hits.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: request-driven documents page, checklist retired"
```

---

### Task 7: Staff view — self-check block in the Application tab

**Files:**
- Modify: `src/pages/admin/tabs/ApplicationTab.jsx`

**Interfaces:**
- Consumes: `application.eligibility` (Task 1 shape); `questions` from `@/data/eligibilityModel` (each `{ id, text, options: [{ label, value }] }`).

- [ ] **Step 1: Implement.** In `ApplicationTab.jsx`:

1. Add import: `import { questions as eligibilityQuestions } from '@/data/eligibilityModel'`.
2. In the left column, directly after the "Funding purpose" section, add:

```jsx
<div className={styles.section}>
  <h2 className={styles.sectionTitle}>Fundability self-check</h2>
  {application.eligibility ? (
    <>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Score</span>
        <span className={styles.fieldValue}>
          {Number(application.eligibility.score).toFixed(1)} / 10 ·{' '}
          {application.eligibility.band}
        </span>
      </div>
      <div className={styles.fieldRow}>
        <span className={styles.fieldLabel}>Completed</span>
        <span className={styles.fieldValue}>
          {new Date(application.eligibility.completed_at).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      </div>
      {eligibilityQuestions.map((q) => {
        const value = application.eligibility.answers?.[q.id]
        const chosen = q.options.find((o) => o.value === value)
        return (
          <div key={q.id} className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{q.text}</span>
            <span className={styles.fieldValue}>{chosen?.label ?? 'Not answered'}</span>
          </div>
        )
      })}
    </>
  ) : (
    <p className={styles.muted}>Not completed.</p>
  )}
</div>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/tabs/ApplicationTab.jsx
git commit -m "feat: staff see the borrower fundability self-check"
```

---

### Task 8: Final verification + push

- [ ] **Step 1:** `npx vitest run` — all suites green.
- [ ] **Step 2:** `npm run build` — zero errors (the ~1 MB chunk warning is pre-existing and acceptable).
- [ ] **Step 3:** Copy sweep over files changed in this plan: no em dashes in UI strings (code comments exempt), no "loan application", disclaimer line intact on the Eligibility result screen.
- [ ] **Step 4:** Manual pass (needs `sql/phase3d-eligibility.sql` applied): fresh draft → profile complete → card steers to self-check → complete it → score/band appear on the card → Submit unlocks → staff Application tab shows the self-check block → staff sends a document RFI → borrower Documents page shows the request → upload → staff sees the document in the right rail.
- [ ] **Step 5:** `git push origin main`. Remind the user: run `sql/phase3d-eligibility.sql` in the Supabase SQL Editor (whole file, nothing selected).

---

## Out of Scope

- Minimum-score submission gating (self-check is indicative only)
- Self-check retake history (latest result only)
- Any change to staff RFI, finding, offer, or funding flows
- Deleting `src/data/docRequirements.js` (kept as the canonical per-track document vocabulary)
