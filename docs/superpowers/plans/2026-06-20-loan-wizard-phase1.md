# Loan Wizard Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 3-step financing application wizard (track select → track fields → review/submit) that inserts a row into the `applications` Supabase table and transitions the Dashboard from entry-point to submitted confirmation.

**Architecture:** `Dashboard.jsx` manages a `wizardState` machine (`loading` → `idle` → `active` → `submitted`) by querying `applications` on mount. When `idle`, it shows a "Start Application" CTA. When `active`, it mounts `ApplicationWizard` inline (no separate route). `ApplicationWizard` orchestrates three steps: TrackSelect → track-specific field form → ReviewSubmit. On successful Supabase insert, `onComplete(row)` fires and Dashboard transitions to a submitted confirmation stub (the full status view is Phase 2).

**Tech Stack:** React 18, Vite, Supabase JS client (`@/lib/supabase`), CSS Modules, design tokens from `src/styles/tokens.css`, React Router DOM (no new routes needed)

## Global Constraints

- All colors via CSS custom properties — exact token names: `--color-navy`, `--color-surface`, `--color-gold`, `--color-gold-soft`, `--color-ivory`, `--color-muted`, `--color-border`, `--color-success`, `--color-error`
- Font families: `var(--font-heading)` for Fraunces headings, `var(--font-body)` for Inter body
- Font sizes via tokens: `--text-xs` (0.75rem) through `--text-6xl` (3.75rem)
- Spacing via tokens: `--space-1` (0.25rem) through `--space-24` (6rem)
- Border radius via tokens: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px)
- Transitions: `var(--transition-fast)` (150ms) for interactive elements
- File extension `.jsx` for all files containing JSX
- Import alias `@/` maps to `src/`
- `supabase` client imported from `@/lib/supabase`; `useAuth` from `@/hooks/useAuth`; `useAuth` returns `{ session, user, profile, role, loading }`
- `npm run build` must pass zero errors before each commit
- UI copy uses "financing application", not "loan application"; tone is premium/institutional
- Never hardcode hex values in CSS — use tokens only

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `sql/phase1-applications.sql` | Reference SQL for the `applications` table and RLS policies |
| `src/pages/wizard/ApplicationWizard.jsx` | Root wizard component — owns `step`, `track`, `fields`, `submitting`, `submitError` state; handles Supabase insert |
| `src/pages/wizard/Wizard.module.css` | All wizard styles: progress bar, track cards, field forms, review layout, nav buttons |
| `src/pages/wizard/steps/TrackSelect.jsx` | Step 1 — 4 track selection cards |
| `src/pages/wizard/steps/SmeFields.jsx` | Step 2a — SME Financing field form with inline validation |
| `src/pages/wizard/steps/ProjectFields.jsx` | Step 2b — Project Funding field form with inline validation |
| `src/pages/wizard/steps/TradeFields.jsx` | Step 2c — Trade Finance field form with inline validation |
| `src/pages/wizard/steps/AcquisitionFields.jsx` | Step 2d — Acquisition Finance field form with inline validation |
| `src/pages/wizard/steps/ReviewSubmit.jsx` | Step 3 — read-only summary of all fields; Submit triggers Supabase insert |

### Modified files
| File | What changes |
|------|-------------|
| `src/pages/Dashboard.jsx` | Replaced: adds application query on mount, `wizardState` machine, mounts wizard or confirmation |
| `src/pages/Dashboard.module.css` | Extended: adds `.startBtn` and `.meta` classes; corrects token names |

---

### Task 1: Create `applications` table in Supabase

**Files:**
- Create: `sql/phase1-applications.sql` (reference only — SQL must be run in the Supabase dashboard)

**Interfaces:**
- Produces: `public.applications` table with columns `id uuid PK`, `applicant_id uuid UNIQUE FK→profiles`, `track text`, `amount_sought numeric`, `currency text DEFAULT 'USD'`, `status text DEFAULT 'submitted'`, `fields jsonb`, `created_at timestamptz`; three RLS policies: borrowers read/insert own row, staff full access

- [ ] **Step 1: Create the SQL file**

Create `sql/phase1-applications.sql`:

```sql
create table public.applications (
  id            uuid        primary key default gen_random_uuid(),
  applicant_id  uuid        not null unique references public.profiles(id) on delete cascade,
  track         text        not null check (track in ('sme', 'project', 'trade', 'acquisition')),
  amount_sought numeric     not null,
  currency      text        not null default 'USD',
  status        text        not null default 'submitted'
                            check (status in (
                              'submitted', 'kyc_verification', 'credit_assessment',
                              'funder_matching', 'term_sheet', 'offer_issued',
                              'offer_accepted', 'fee_payment', 'funded'
                            )),
  fields        jsonb       not null,
  created_at    timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "Borrowers read own application"
  on public.applications for select
  using (applicant_id = auth.uid());

create policy "Borrowers submit application"
  on public.applications for insert
  with check (applicant_id = auth.uid());

create policy "Staff full access to applications"
  on public.applications for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'staff'
  ));
```

- [ ] **Step 2: Run the SQL in Supabase**

Open the Supabase project → SQL Editor → paste the full contents of `sql/phase1-applications.sql` → Run.

Expected output: "Success. No rows returned."

- [ ] **Step 3: Verify the table exists**

In Supabase SQL Editor run:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'applications' and table_schema = 'public'
order by ordinal_position;
```

Expected: 8 rows — `id`, `applicant_id`, `track`, `amount_sought`, `currency`, `status`, `fields`, `created_at`.

- [ ] **Step 4: Commit**

```bash
git add sql/phase1-applications.sql
git commit -m "chore: add applications table SQL for Phase 1"
```

---

### Task 2: Dashboard — wizardState machine and entry-point UI

**Files:**
- Modify: `src/pages/Dashboard.jsx` (full replacement)
- Modify: `src/pages/Dashboard.module.css` (full replacement)

**Interfaces:**
- Consumes: `useAuth()` → `{ user, profile }`; `supabase` from `@/lib/supabase`; `ApplicationWizard` from `./wizard/ApplicationWizard`
- Produces:
  - `wizardState === 'loading'` → loading paragraph
  - `wizardState === 'idle'` → welcome heading + "Start Application" gold button
  - `wizardState === 'active'` → mounts `<ApplicationWizard onComplete={handleComplete} />`
  - `wizardState === 'submitted'` → confirmation heading with track + amount summary
  - `handleComplete(row)` sets `application` state and transitions to `'submitted'`

- [ ] **Step 1: Replace Dashboard.jsx**

Replace the entire content of `src/pages/Dashboard.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ApplicationWizard from './wizard/ApplicationWizard'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [wizardState, setWizardState] = useState('loading')
  const [application, setApplication] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('applications')
      .select('*')
      .eq('applicant_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApplication(data)
          setWizardState('submitted')
        } else {
          setWizardState('idle')
        }
      })
  }, [user])

  function handleComplete(app) {
    setApplication(app)
    setWizardState('submitted')
  }

  if (wizardState === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.body}>Loading…</p>
        </div>
      </div>
    )
  }

  if (wizardState === 'active') {
    return <ApplicationWizard onComplete={handleComplete} />
  }

  if (wizardState === 'submitted') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.heading}>Application Submitted</h1>
          <p className={styles.body}>
            Thank you{profile?.full_name ? `, ${profile.full_name}` : ''}. Your financing application
            has been received. Our team will review it and be in touch with next steps.
          </p>
          <p className={styles.meta}>
            Track: <strong>{TRACK_LABELS[application?.track]}</strong>
            &nbsp;·&nbsp;
            Amount sought: <strong>USD {Number(application?.amount_sought).toLocaleString('en-US')}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className={styles.body}>
          Ready to connect with capital? Start your financing application to be matched with
          our global network of funders and lenders.
        </p>
        <button className={styles.startBtn} onClick={() => setWizardState('active')}>
          Start Application
        </button>
      </div>
    </div>
  )
}

const TRACK_LABELS = {
  sme: 'SME Financing',
  project: 'Project Funding',
  trade: 'Trade Finance',
  acquisition: 'Acquisition Finance',
}
```

- [ ] **Step 2: Replace Dashboard.module.css**

Replace the entire content of `src/pages/Dashboard.module.css`:

```css
.page {
  min-height: calc(100vh - var(--navbar-height));
  background: var(--color-navy);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-16) var(--space-6);
}

.inner {
  max-width: 600px;
  width: 100%;
}

.heading {
  font-family: var(--font-heading);
  font-size: var(--text-4xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin: 0 0 var(--space-4);
}

.body {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--color-muted);
  line-height: 1.7;
  margin: 0 0 var(--space-8);
}

.meta {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin-top: var(--space-6);
}

.meta strong {
  color: var(--color-ivory);
}

.startBtn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-3) var(--space-8);
  background: var(--color-gold);
  color: var(--color-navy);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.startBtn:hover {
  background: var(--color-gold-soft);
}

.signOut {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background: transparent;
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  margin-top: var(--space-8);
}

.signOut:hover {
  color: var(--color-gold);
  border-color: var(--color-gold);
}
```

- [ ] **Step 3: Create a temporary ApplicationWizard stub so the build passes**

Create `src/pages/wizard/ApplicationWizard.jsx`:

```jsx
export default function ApplicationWizard({ onComplete }) {
  return (
    <div style={{ padding: '4rem 2rem', color: 'var(--color-ivory)', fontFamily: 'var(--font-body)' }}>
      Wizard — coming in Task 3
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: zero errors. The bundle builds and outputs to `dist/`.

- [ ] **Step 5: Manual browser test**

Run `npm run dev`. Log in as a borrower with no application. Navigate to `/dashboard`.

- Confirm the page shows "Welcome, [name]" heading and "Start Application" gold button.
- Click "Start Application" — confirm the wizard stub text appears ("Wizard — coming in Task 3").
- Confirm there is no JavaScript console error.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.jsx src/pages/Dashboard.module.css src/pages/wizard/ApplicationWizard.jsx
git commit -m "feat: dashboard entry point and wizardState machine"
```

---

### Task 3: ApplicationWizard shell, progress bar, and TrackSelect

**Files:**
- Modify: `src/pages/wizard/ApplicationWizard.jsx` (replace stub with full shell)
- Create: `src/pages/wizard/Wizard.module.css`
- Create: `src/pages/wizard/steps/TrackSelect.jsx`

**Interfaces:**
- Consumes: `financingTracks` from `@/data/financingData` (shape: `{ id: string, badge: string, title: string, description: string }[]`)
- Produces:
  - `ApplicationWizard({ onComplete })` — exported default; owns state: `step` (1|2|3), `track` (string|null), `fields` (object), `submitting` (boolean), `submitError` (string|null); exposes `handleFieldChange(updates: object)` which merges into `fields`
  - `TrackSelect({ selectedTrack: string|null, onSelect: (id: string) => void })` — renders 4 cards; applies `styles.selected` class when `selectedTrack === track.id`
  - In `ApplicationWizard` JSX, step 1 "Next" button is disabled when `track` is null

- [ ] **Step 1: Create Wizard.module.css**

Create `src/pages/wizard/Wizard.module.css`:

```css
/* Page shell */
.page {
  min-height: calc(100vh - var(--navbar-height));
  background: var(--color-navy);
  padding: var(--space-12) var(--space-6) var(--space-16);
}

.container {
  max-width: 760px;
  margin: 0 auto;
}

/* ── Progress bar ── */
.progress {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-12);
}

.stepItem {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  white-space: nowrap;
}

.stepItem.active {
  color: var(--color-gold);
}

.stepItem.done {
  color: var(--color-success);
}

.stepNum {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 600;
  flex-shrink: 0;
}

.stepNum.active {
  background: var(--color-gold);
  border-color: var(--color-gold);
  color: var(--color-navy);
}

.stepNum.done {
  background: var(--color-success);
  border-color: var(--color-success);
  color: var(--color-navy);
}

.stepConnector {
  flex: 1;
  height: 1px;
  background: var(--color-border);
  margin: 0 var(--space-3);
  min-width: var(--space-8);
}

/* ── Section headings ── */
.sectionTitle {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin: 0 0 var(--space-2);
}

.sectionSub {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-muted);
  margin: 0 0 var(--space-8);
}

/* ── Track cards ── */
.trackGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

@media (max-width: 560px) {
  .trackGrid {
    grid-template-columns: 1fr;
  }
}

.trackCard {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.trackCard:hover {
  border-color: var(--color-gold-soft);
}

.trackCard.selected {
  border-color: var(--color-gold);
  box-shadow: 0 0 0 1px var(--color-gold);
}

.trackBadge {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-gold);
  margin-bottom: var(--space-2);
}

.trackTitle {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-1);
}

.trackDesc {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  line-height: 1.6;
}

/* ── Field forms ── */
.fieldset {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: var(--space-8);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-ivory);
}

.required {
  color: var(--color-gold);
  margin-left: 2px;
}

.input,
.select,
.textarea {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-ivory);
  width: 100%;
  transition: border-color var(--transition-fast);
}

.input::placeholder,
.textarea::placeholder {
  color: var(--color-muted);
  opacity: 0.6;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: var(--color-gold-soft);
}

.input.fieldErr,
.select.fieldErr,
.textarea.fieldErr {
  border-color: var(--color-error);
}

.select option {
  background: var(--color-surface);
  color: var(--color-ivory);
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

.errorMsg {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-error);
}

/* ── Radio group ── */
.radioGroup {
  display: flex;
  gap: var(--space-6);
}

.radioLabel {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-ivory);
  cursor: pointer;
}

.radioLabel input[type='radio'] {
  accent-color: var(--color-gold);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

/* ── Nav buttons ── */
.navRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
}

.backBtn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.backBtn:hover {
  color: var(--color-ivory);
  border-color: var(--color-muted);
}

.nextBtn,
.submitBtn {
  background: var(--color-gold);
  border: none;
  color: var(--color-navy);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  padding: var(--space-3) var(--space-8);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.nextBtn:hover,
.submitBtn:hover {
  background: var(--color-gold-soft);
}

.nextBtn:disabled,
.submitBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.submitError {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-error);
  margin-top: var(--space-3);
  text-align: right;
}

/* ── Review ── */
.reviewSection {
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.reviewSection:last-of-type {
  border-bottom: none;
}

.reviewSectionLabel {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-bottom: var(--space-4);
}

.reviewGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3) var(--space-6);
}

@media (max-width: 500px) {
  .reviewGrid {
    grid-template-columns: 1fr;
  }
}

.reviewItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reviewItem.span2 {
  grid-column: 1 / -1;
}

.reviewItemLabel {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.reviewItemValue {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-ivory);
}

.editLink {
  background: none;
  border: none;
  color: var(--color-gold);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: 0;
  margin-top: var(--space-4);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.editLink:hover {
  color: var(--color-gold-soft);
}
```

- [ ] **Step 2: Create TrackSelect.jsx**

Create `src/pages/wizard/steps/TrackSelect.jsx`:

```jsx
import { financingTracks } from '@/data/financingData'
import styles from '../Wizard.module.css'

export default function TrackSelect({ selectedTrack, onSelect }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Select your financing track</h2>
      <p className={styles.sectionSub}>Choose the type of financing that best fits your needs.</p>
      <div className={styles.trackGrid}>
        {financingTracks.map((track) => (
          <button
            key={track.id}
            type="button"
            className={`${styles.trackCard} ${selectedTrack === track.id ? styles.selected : ''}`}
            onClick={() => onSelect(track.id)}
          >
            <span className={styles.trackBadge}>{track.badge}</span>
            <div className={styles.trackTitle}>{track.title}</div>
            <div className={styles.trackDesc}>{track.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace ApplicationWizard.jsx with the full shell**

Replace the entire content of `src/pages/wizard/ApplicationWizard.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import TrackSelect from './steps/TrackSelect'
import styles from './Wizard.module.css'

const STEPS = ['Track', 'Details', 'Review']

const INITIAL_FIELDS = {
  sme: {
    businessName: '', businessType: '', countryOfRegistration: '',
    annualRevenue: '', loanPurpose: '', amountSought: '',
    collateralAvailable: '', collateralDescription: '', description: '',
  },
  project: {
    projectName: '', sector: '', fundingStructure: '',
    totalProjectValue: '', amountSought: '', projectTimeline: '',
    keySponsors: '', description: '',
  },
  trade: {
    companyName: '', tradeType: '', counterpartyCountry: '',
    transactionValue: '', amountSought: '', description: '',
  },
  acquisition: {
    acquiringCompanyName: '', targetDescription: '', dealStructure: '',
    totalAcquisitionValue: '', amountSought: '',
    expectedClosingTimeline: '', description: '',
  },
}

export default function ApplicationWizard({ onComplete }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [track, setTrack] = useState(null)
  const [fields, setFields] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function handleTrackSelect(trackId) {
    setTrack(trackId)
    setFields(INITIAL_FIELDS[trackId])
  }

  function handleFieldChange(updates) {
    setFields((prev) => ({ ...prev, ...updates }))
  }

  function handleNext() { setStep((s) => s + 1) }
  function handleBack() { setStep((s) => s - 1) }
  function handleGoToStep(n) { setStep(n) }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase
      .from('applications')
      .insert({
        applicant_id: user.id,
        track,
        amount_sought: parseFloat(fields.amountSought),
        currency: 'USD',
        status: 'submitted',
        fields,
      })
      .select()
      .single()

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    onComplete(data)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <>
            <TrackSelect selectedTrack={track} onSelect={handleTrackSelect} />
            <div className={styles.navRow}>
              <span />
              <button className={styles.nextBtn} onClick={handleNext} disabled={!track}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <DetailsPlaceholder track={track} onBack={handleBack} onNext={handleNext} />
        )}

        {step === 3 && (
          <ReviewPlaceholder
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </div>
    </div>
  )
}

function ProgressBar({ currentStep }) {
  return (
    <div className={styles.progress}>
      {STEPS.map((label, i) => {
        const num = i + 1
        const done = num < currentStep
        const active = num === currentStep
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className={`${styles.stepItem} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
              <span className={`${styles.stepNum} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
                {done ? '✓' : num}
              </span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
          </div>
        )
      })}
    </div>
  )
}

function DetailsPlaceholder({ track, onBack, onNext }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Application Details</h2>
      <p className={styles.sectionSub}>
        {track ? `${track.toUpperCase()} fields — coming in Task 4` : 'No track selected'}
      </p>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={onNext}>Next</button>
      </div>
    </div>
  )
}

function ReviewPlaceholder({ onBack, onSubmit, submitting, submitError }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Review & Submit</h2>
      <p className={styles.sectionSub}>Review placeholder — coming in Task 5</p>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.submitBtn} onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
      {submitError && <p className={styles.submitError}>{submitError}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: zero errors.

- [ ] **Step 5: Manual browser test**

Run `npm run dev`. Navigate to `/dashboard` → click "Start Application".

- Progress bar shows 3 steps; step 1 "Track" is active (gold circle).
- Four track cards render with badge, title, and description text.
- "Next" button is disabled (greyed out, cursor not-allowed).
- Click any track card — it gets a gold border + gold box-shadow (selected state). "Next" becomes enabled.
- Click "Next" — step 2 placeholder renders; progress bar shows step 2 active.
- Click "Back" — returns to step 1 with the same track still selected.

- [ ] **Step 6: Commit**

```bash
git add src/pages/wizard/ApplicationWizard.jsx src/pages/wizard/Wizard.module.css src/pages/wizard/steps/TrackSelect.jsx
git commit -m "feat: wizard shell, progress bar, and track selection step"
```

---

### Task 4: Track-specific field forms (Step 2)

**Files:**
- Create: `src/pages/wizard/steps/SmeFields.jsx`
- Create: `src/pages/wizard/steps/ProjectFields.jsx`
- Create: `src/pages/wizard/steps/TradeFields.jsx`
- Create: `src/pages/wizard/steps/AcquisitionFields.jsx`
- Modify: `src/pages/wizard/ApplicationWizard.jsx` (replace `DetailsPlaceholder` and its usages)

**Interfaces:**
- Each field component signature: `({ fields: object, onChange: (updates: object) => void, onBack: () => void, onNext: () => void })`
- `onChange` is called as `onChange({ fieldKey: newValue })` for every keystroke/change
- Validation fires on the "Next" button click; blocks advancement if any error; clears when resolved
- `collateralDescription` is only required when `fields.collateralAvailable === 'yes'` (SME only)
- Amount fields validated as: non-empty, parseable as float, greater than 0

Shared `Field` component (defined locally in each file — do not extract to avoid cross-file coupling at this stage):

```jsx
function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}<span className={styles.required}>*</span>
      </label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 1: Create SmeFields.jsx**

Create `src/pages/wizard/steps/SmeFields.jsx`:

```jsx
import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function SmeFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) {
    onChange({ [key]: value })
  }

  function validate() {
    const e = {}
    if (!fields.businessName.trim()) e.businessName = 'Required'
    if (!fields.businessType) e.businessType = 'Required'
    if (!fields.countryOfRegistration.trim()) e.countryOfRegistration = 'Required'
    if (!fields.annualRevenue) e.annualRevenue = 'Required'
    if (!fields.loanPurpose) e.loanPurpose = 'Required'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.collateralAvailable) e.collateralAvailable = 'Required'
    if (fields.collateralAvailable === 'yes' && !fields.collateralDescription.trim())
      e.collateralDescription = 'Please describe the collateral'
    if (!fields.description.trim()) e.description = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const err = (k) => errors[k]
  const cls = (k) => `${styles.input} ${errors[k] ? styles.fieldErr : ''}`
  const selCls = (k) => `${styles.select} ${errors[k] ? styles.fieldErr : ''}`
  const txtCls = (k) => `${styles.textarea} ${errors[k] ? styles.fieldErr : ''}`

  return (
    <div>
      <h2 className={styles.sectionTitle}>SME Financing Details</h2>
      <p className={styles.sectionSub}>Tell us about your business and financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Business name" error={err('businessName')}>
          <input className={cls('businessName')} value={fields.businessName}
            onChange={(e) => set('businessName', e.target.value)} />
        </Field>
        <Field label="Business type" error={err('businessType')}>
          <select className={selCls('businessType')} value={fields.businessType}
            onChange={(e) => set('businessType', e.target.value)}>
            <option value="">Select…</option>
            <option value="sole_trader">Sole Trader</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited</option>
            <option value="public_company">Public Company</option>
          </select>
        </Field>
        <Field label="Country of registration" error={err('countryOfRegistration')}>
          <input className={cls('countryOfRegistration')} value={fields.countryOfRegistration}
            onChange={(e) => set('countryOfRegistration', e.target.value)} />
        </Field>
        <Field label="Annual revenue" error={err('annualRevenue')}>
          <select className={selCls('annualRevenue')} value={fields.annualRevenue}
            onChange={(e) => set('annualRevenue', e.target.value)}>
            <option value="">Select…</option>
            <option value="<100k">Under $100k</option>
            <option value="100k-500k">$100k – $500k</option>
            <option value="500k-2m">$500k – $2M</option>
            <option value="2m-10m">$2M – $10M</option>
            <option value=">10m">Over $10M</option>
          </select>
        </Field>
        <Field label="Loan purpose" error={err('loanPurpose')}>
          <select className={selCls('loanPurpose')} value={fields.loanPurpose}
            onChange={(e) => set('loanPurpose', e.target.value)}>
            <option value="">Select…</option>
            <option value="working_capital">Working Capital</option>
            <option value="equipment_finance">Equipment Finance</option>
            <option value="business_expansion">Business Expansion</option>
            <option value="trade_finance">Trade Finance</option>
          </select>
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 500000" />
        </Field>
        <Field label="Collateral available?" error={err('collateralAvailable')}>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input type="radio" name="collateral" value="yes"
                checked={fields.collateralAvailable === 'yes'}
                onChange={() => set('collateralAvailable', 'yes')} />
              Yes
            </label>
            <label className={styles.radioLabel}>
              <input type="radio" name="collateral" value="no"
                checked={fields.collateralAvailable === 'no'}
                onChange={() => set('collateralAvailable', 'no')} />
              No
            </label>
          </div>
        </Field>
        {fields.collateralAvailable === 'yes' && (
          <Field label="Collateral description" error={err('collateralDescription')}>
            <input className={cls('collateralDescription')} value={fields.collateralDescription}
              onChange={(e) => set('collateralDescription', e.target.value)}
              placeholder="Describe the collateral offered" />
          </Field>
        )}
        <Field label="Business & use-of-funds description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe your business and how you intend to use the funds" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext}>Next</button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}<span className={styles.required}>*</span></label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Create ProjectFields.jsx**

Create `src/pages/wizard/steps/ProjectFields.jsx`:

```jsx
import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function ProjectFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.projectName.trim()) e.projectName = 'Required'
    if (!fields.sector) e.sector = 'Required'
    if (!fields.fundingStructure) e.fundingStructure = 'Required'
    if (!fields.totalProjectValue || isNaN(parseFloat(fields.totalProjectValue)) || parseFloat(fields.totalProjectValue) <= 0)
      e.totalProjectValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.projectTimeline) e.projectTimeline = 'Required'
    if (!fields.keySponsors.trim()) e.keySponsors = 'Required'
    if (!fields.description.trim()) e.description = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const err = (k) => errors[k]
  const cls = (k) => `${styles.input} ${errors[k] ? styles.fieldErr : ''}`
  const selCls = (k) => `${styles.select} ${errors[k] ? styles.fieldErr : ''}`
  const txtCls = (k) => `${styles.textarea} ${errors[k] ? styles.fieldErr : ''}`

  return (
    <div>
      <h2 className={styles.sectionTitle}>Project Funding Details</h2>
      <p className={styles.sectionSub}>Tell us about your project and capital requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Project name" error={err('projectName')}>
          <input className={cls('projectName')} value={fields.projectName}
            onChange={(e) => set('projectName', e.target.value)} />
        </Field>
        <Field label="Sector" error={err('sector')}>
          <select className={selCls('sector')} value={fields.sector}
            onChange={(e) => set('sector', e.target.value)}>
            <option value="">Select…</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="energy">Energy</option>
            <option value="real_estate">Real Estate</option>
            <option value="agriculture">Agriculture</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="mining">Mining & Resources</option>
          </select>
        </Field>
        <Field label="Preferred funding structure" error={err('fundingStructure')}>
          <select className={selCls('fundingStructure')} value={fields.fundingStructure}
            onChange={(e) => set('fundingStructure', e.target.value)}>
            <option value="">Select…</option>
            <option value="debt">Debt Finance</option>
            <option value="equity">Equity Finance</option>
            <option value="joint_ventures">Joint Ventures</option>
            <option value="structured">Structured Finance</option>
          </select>
        </Field>
        <Field label="Total project value (USD)" error={err('totalProjectValue')}>
          <input type="number" min="1" className={cls('totalProjectValue')} value={fields.totalProjectValue}
            onChange={(e) => set('totalProjectValue', e.target.value)} placeholder="e.g. 10000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 5000000" />
        </Field>
        <Field label="Project timeline" error={err('projectTimeline')}>
          <select className={selCls('projectTimeline')} value={fields.projectTimeline}
            onChange={(e) => set('projectTimeline', e.target.value)}>
            <option value="">Select…</option>
            <option value="<12m">Under 12 months</option>
            <option value="1-3y">1 – 3 years</option>
            <option value="3-5y">3 – 5 years</option>
            <option value="5y+">5+ years</option>
          </select>
        </Field>
        <Field label="Key sponsors / parties" error={err('keySponsors')}>
          <input className={cls('keySponsors')} value={fields.keySponsors}
            onChange={(e) => set('keySponsors', e.target.value)}
            placeholder="Names of key project sponsors or parties involved" />
        </Field>
        <Field label="Project description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the project, its objectives, and current stage of development" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext}>Next</button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}<span className={styles.required}>*</span></label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Create TradeFields.jsx**

Create `src/pages/wizard/steps/TradeFields.jsx`:

```jsx
import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function TradeFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.companyName.trim()) e.companyName = 'Required'
    if (!fields.tradeType) e.tradeType = 'Required'
    if (!fields.counterpartyCountry.trim()) e.counterpartyCountry = 'Required'
    if (!fields.transactionValue || isNaN(parseFloat(fields.transactionValue)) || parseFloat(fields.transactionValue) <= 0)
      e.transactionValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.description.trim()) e.description = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const err = (k) => errors[k]
  const cls = (k) => `${styles.input} ${errors[k] ? styles.fieldErr : ''}`
  const selCls = (k) => `${styles.select} ${errors[k] ? styles.fieldErr : ''}`
  const txtCls = (k) => `${styles.textarea} ${errors[k] ? styles.fieldErr : ''}`

  return (
    <div>
      <h2 className={styles.sectionTitle}>Trade Finance Details</h2>
      <p className={styles.sectionSub}>Tell us about your trade transaction and financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Company name" error={err('companyName')}>
          <input className={cls('companyName')} value={fields.companyName}
            onChange={(e) => set('companyName', e.target.value)} />
        </Field>
        <Field label="Trade type" error={err('tradeType')}>
          <select className={selCls('tradeType')} value={fields.tradeType}
            onChange={(e) => set('tradeType', e.target.value)}>
            <option value="">Select…</option>
            <option value="import_lc">Import Letter of Credit</option>
            <option value="export_lc">Export Letter of Credit</option>
            <option value="invoice_discounting">Invoice Discounting</option>
            <option value="supply_chain">Supply Chain Finance</option>
          </select>
        </Field>
        <Field label="Counterparty country" error={err('counterpartyCountry')}>
          <input className={cls('counterpartyCountry')} value={fields.counterpartyCountry}
            onChange={(e) => set('counterpartyCountry', e.target.value)}
            placeholder="Country of the trade counterparty" />
        </Field>
        <Field label="Transaction value (USD)" error={err('transactionValue')}>
          <input type="number" min="1" className={cls('transactionValue')} value={fields.transactionValue}
            onChange={(e) => set('transactionValue', e.target.value)} placeholder="e.g. 2000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 1500000" />
        </Field>
        <Field label="Transaction description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the trade transaction, goods or services, and timeline" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext}>Next</button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}<span className={styles.required}>*</span></label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 4: Create AcquisitionFields.jsx**

Create `src/pages/wizard/steps/AcquisitionFields.jsx`:

```jsx
import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function AcquisitionFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.acquiringCompanyName.trim()) e.acquiringCompanyName = 'Required'
    if (!fields.targetDescription.trim()) e.targetDescription = 'Required'
    if (!fields.dealStructure) e.dealStructure = 'Required'
    if (!fields.totalAcquisitionValue || isNaN(parseFloat(fields.totalAcquisitionValue)) || parseFloat(fields.totalAcquisitionValue) <= 0)
      e.totalAcquisitionValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.expectedClosingTimeline.trim()) e.expectedClosingTimeline = 'Required'
    if (!fields.description.trim()) e.description = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const err = (k) => errors[k]
  const cls = (k) => `${styles.input} ${errors[k] ? styles.fieldErr : ''}`
  const selCls = (k) => `${styles.select} ${errors[k] ? styles.fieldErr : ''}`
  const txtCls = (k) => `${styles.textarea} ${errors[k] ? styles.fieldErr : ''}`

  return (
    <div>
      <h2 className={styles.sectionTitle}>Acquisition Finance Details</h2>
      <p className={styles.sectionSub}>Tell us about the acquisition and your financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Acquiring company name" error={err('acquiringCompanyName')}>
          <input className={cls('acquiringCompanyName')} value={fields.acquiringCompanyName}
            onChange={(e) => set('acquiringCompanyName', e.target.value)} />
        </Field>
        <Field label="Target company / asset description" error={err('targetDescription')}>
          <input className={cls('targetDescription')} value={fields.targetDescription}
            onChange={(e) => set('targetDescription', e.target.value)}
            placeholder="Name and brief description of the acquisition target" />
        </Field>
        <Field label="Deal structure" error={err('dealStructure')}>
          <select className={selCls('dealStructure')} value={fields.dealStructure}
            onChange={(e) => set('dealStructure', e.target.value)}>
            <option value="">Select…</option>
            <option value="lbo">Leveraged Buyout</option>
            <option value="mbo">Management Buyout</option>
            <option value="asset_acquisition">Asset Acquisition</option>
            <option value="share_acquisition">Share Acquisition</option>
          </select>
        </Field>
        <Field label="Total acquisition value (USD)" error={err('totalAcquisitionValue')}>
          <input type="number" min="1" className={cls('totalAcquisitionValue')} value={fields.totalAcquisitionValue}
            onChange={(e) => set('totalAcquisitionValue', e.target.value)} placeholder="e.g. 20000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 15000000" />
        </Field>
        <Field label="Expected closing timeline" error={err('expectedClosingTimeline')}>
          <input className={cls('expectedClosingTimeline')} value={fields.expectedClosingTimeline}
            onChange={(e) => set('expectedClosingTimeline', e.target.value)}
            placeholder="e.g. Q3 2026 or within 6 months" />
        </Field>
        <Field label="Deal description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the acquisition rationale, the target, and the strategic context" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext}>Next</button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}<span className={styles.required}>*</span></label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 5: Wire field forms into ApplicationWizard — replace DetailsPlaceholder**

In `src/pages/wizard/ApplicationWizard.jsx`:

Add these four imports after the existing `TrackSelect` import line:

```jsx
import SmeFields from './steps/SmeFields'
import ProjectFields from './steps/ProjectFields'
import TradeFields from './steps/TradeFields'
import AcquisitionFields from './steps/AcquisitionFields'
```

Replace the single `{step === 2 && (<DetailsPlaceholder ... />)}` block with:

```jsx
{step === 2 && track === 'sme' && (
  <SmeFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
)}
{step === 2 && track === 'project' && (
  <ProjectFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
)}
{step === 2 && track === 'trade' && (
  <TradeFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
)}
{step === 2 && track === 'acquisition' && (
  <AcquisitionFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
)}
```

Then delete the `DetailsPlaceholder` function from the bottom of the file.

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```

Expected: zero errors.

- [ ] **Step 7: Manual browser test — all four tracks**

Run `npm run dev`. For each track, complete the following:

**SME track:**
1. Select SME Financing → Next
2. Click "Next" with no fields filled — every field shows a red error message; page does not advance
3. Fill "Business name" → click Next again — business name error disappears; all others remain
4. Select "Collateral available: Yes" — a "Collateral description" field appears below
5. Leave collateral description empty → click Next — error appears for that field
6. Fill all fields with valid data → click Next — advances to step 3 placeholder

**Project track (repeat from step 1, select Project Funding):**
- Verify all 8 fields render and validate correctly

**Trade + Acquisition:** Spot-check that fields render and at least one validation error appears when clicking Next empty.

- [ ] **Step 8: Commit**

```bash
git add src/pages/wizard/steps/SmeFields.jsx src/pages/wizard/steps/ProjectFields.jsx src/pages/wizard/steps/TradeFields.jsx src/pages/wizard/steps/AcquisitionFields.jsx src/pages/wizard/ApplicationWizard.jsx
git commit -m "feat: track-specific field forms with inline validation (step 2)"
```

---

### Task 5: ReviewSubmit + Supabase insert

**Files:**
- Create: `src/pages/wizard/steps/ReviewSubmit.jsx`
- Modify: `src/pages/wizard/ApplicationWizard.jsx` (replace `ReviewPlaceholder`; add `handleGoToStep`; pass `onEditTrack` and `onBack` to `ReviewSubmit`)

**Interfaces:**
- `ReviewSubmit({ track, fields, onEditTrack, onBack, onSubmit, submitting, submitError })`
  - `onEditTrack` → navigates back to step 1 (Edit button on the Track section)
  - `onBack` → navigates back to step 2 (Edit button on Details section + bottom Back button)
  - `onSubmit` → async; called on "Submit Application" button click
  - `submitting` → disables button and shows "Submitting…"
  - `submitError` → displayed below nav row when non-null
- Label maps (defined at top of ReviewSubmit.jsx, not exported): human-readable strings for every select/radio option value

- [ ] **Step 1: Create ReviewSubmit.jsx**

Create `src/pages/wizard/steps/ReviewSubmit.jsx`:

```jsx
import { financingTracks } from '@/data/financingData'
import styles from '../Wizard.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}
const BUSINESS_TYPE = {
  sole_trader: 'Sole Trader', partnership: 'Partnership',
  private_limited: 'Private Limited', public_company: 'Public Company',
}
const ANNUAL_REVENUE = {
  '<100k': 'Under $100k', '100k-500k': '$100k – $500k',
  '500k-2m': '$500k – $2M', '2m-10m': '$2M – $10M', '>10m': 'Over $10M',
}
const LOAN_PURPOSE = {
  working_capital: 'Working Capital', equipment_finance: 'Equipment Finance',
  business_expansion: 'Business Expansion', trade_finance: 'Trade Finance',
}
const SECTOR = {
  infrastructure: 'Infrastructure', energy: 'Energy', real_estate: 'Real Estate',
  agriculture: 'Agriculture', manufacturing: 'Manufacturing', mining: 'Mining & Resources',
}
const FUNDING_STRUCTURE = {
  debt: 'Debt Finance', equity: 'Equity Finance',
  joint_ventures: 'Joint Ventures', structured: 'Structured Finance',
}
const PROJECT_TIMELINE = {
  '<12m': 'Under 12 months', '1-3y': '1 – 3 years', '3-5y': '3 – 5 years', '5y+': '5+ years',
}
const TRADE_TYPE = {
  import_lc: 'Import Letter of Credit', export_lc: 'Export Letter of Credit',
  invoice_discounting: 'Invoice Discounting', supply_chain: 'Supply Chain Finance',
}
const DEAL_STRUCTURE = {
  lbo: 'Leveraged Buyout', mbo: 'Management Buyout',
  asset_acquisition: 'Asset Acquisition', share_acquisition: 'Share Acquisition',
}

function usd(n) {
  return `USD ${Number(n).toLocaleString('en-US')}`
}

export default function ReviewSubmit({ track, fields, onEditTrack, onBack, onSubmit, submitting, submitError }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Review & Submit</h2>
      <p className={styles.sectionSub}>
        Please review your application carefully before submitting.
      </p>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Financing Track</div>
        <div className={styles.reviewGrid}>
          <Item label="Track" value={TRACK_LABELS[track]} />
        </div>
        <button type="button" className={styles.editLink} onClick={onEditTrack}>
          Edit track selection
        </button>
      </div>

      {track === 'sme' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>SME Financing Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Business name" value={fields.businessName} />
            <Item label="Business type" value={BUSINESS_TYPE[fields.businessType]} />
            <Item label="Country of registration" value={fields.countryOfRegistration} />
            <Item label="Annual revenue" value={ANNUAL_REVENUE[fields.annualRevenue]} />
            <Item label="Loan purpose" value={LOAN_PURPOSE[fields.loanPurpose]} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Collateral available" value={fields.collateralAvailable === 'yes' ? 'Yes' : 'No'} />
            {fields.collateralAvailable === 'yes' && (
              <Item label="Collateral description" value={fields.collateralDescription} />
            )}
            <Item label="Description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'project' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Project Funding Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Project name" value={fields.projectName} />
            <Item label="Sector" value={SECTOR[fields.sector]} />
            <Item label="Funding structure" value={FUNDING_STRUCTURE[fields.fundingStructure]} />
            <Item label="Total project value" value={usd(fields.totalProjectValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Project timeline" value={PROJECT_TIMELINE[fields.projectTimeline]} />
            <Item label="Key sponsors / parties" value={fields.keySponsors} />
            <Item label="Project description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'trade' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Trade Finance Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Company name" value={fields.companyName} />
            <Item label="Trade type" value={TRADE_TYPE[fields.tradeType]} />
            <Item label="Counterparty country" value={fields.counterpartyCountry} />
            <Item label="Transaction value" value={usd(fields.transactionValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Transaction description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'acquisition' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Acquisition Finance Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Acquiring company" value={fields.acquiringCompanyName} />
            <Item label="Target description" value={fields.targetDescription} />
            <Item label="Deal structure" value={DEAL_STRUCTURE[fields.dealStructure]} />
            <Item label="Total acquisition value" value={usd(fields.totalAcquisitionValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Expected closing timeline" value={fields.expectedClosingTimeline} />
            <Item label="Deal description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.submitBtn} onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
      {submitError && <p className={styles.submitError}>{submitError}</p>}
    </div>
  )
}

function Item({ label, value, span2 }) {
  return (
    <div className={`${styles.reviewItem} ${span2 ? styles.span2 : ''}`}>
      <span className={styles.reviewItemLabel}>{label}</span>
      <span className={styles.reviewItemValue}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Wire ReviewSubmit into ApplicationWizard**

In `src/pages/wizard/ApplicationWizard.jsx`:

Add this import after the `AcquisitionFields` import:

```jsx
import ReviewSubmit from './steps/ReviewSubmit'
```

Replace the `{step === 3 && (<ReviewPlaceholder ... />)}` block with:

```jsx
{step === 3 && (
  <ReviewSubmit
    track={track}
    fields={fields}
    onEditTrack={() => handleGoToStep(1)}
    onBack={handleBack}
    onSubmit={handleSubmit}
    submitting={submitting}
    submitError={submitError}
  />
)}
```

Delete the `ReviewPlaceholder` function from the bottom of the file.

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: zero errors.

- [ ] **Step 4: Full end-to-end manual test**

Run `npm run dev`. Log in as a borrower. Navigate to `/dashboard`.

1. Click "Start Application"
2. Select "SME Financing" → Next
3. Fill all SME fields with valid test data (any values that satisfy validation)
4. Click Next → arrive at step 3 Review
5. **Verify review content:**
   - Track section shows "SME Financing"; "Edit track selection" link present
   - Details section shows all field values with human-readable labels (e.g. "Private Limited" not "private_limited", "Working Capital" not "working_capital", "USD 500,000" not "500000")
   - "Edit details" link present under the details section
6. **Verify edit navigation:**
   - Click "Edit track selection" → returns to step 1 (progress bar shows step 1 active)
   - Navigate forward again to step 3
   - Click "Edit details" → returns to step 2 (progress bar shows step 2 active, fields still populated)
   - Navigate forward again to step 3
7. Click "Submit Application"
   - Button shows "Submitting…" briefly
   - Dashboard transitions to "Application Submitted" confirmation showing track and formatted amount
8. Refresh the page — Dashboard immediately shows the submitted confirmation (loads from Supabase on mount, not from React state)
9. In Supabase dashboard → Table Editor → `applications`:
   - Verify the row exists with correct `track`, `amount_sought` (as a number), `currency: 'USD'`, `status: 'submitted'`, and `fields` JSONB containing all entered values

- [ ] **Step 5: Test the one-application-per-borrower constraint**

With the application already submitted, click browser back then navigate to `/dashboard` again. Verify the page immediately shows "Application Submitted" — not the entry-point button. (The unique constraint in the DB prevents a second insert; this confirms the Dashboard query guards it at the UI level too.)

- [ ] **Step 6: Commit**

```bash
git add src/pages/wizard/steps/ReviewSubmit.jsx src/pages/wizard/ApplicationWizard.jsx
git commit -m "feat: review & submit step with Supabase insert — Phase 1 complete"
```

---

### Task 6: Production build verification and push

**Files:** None modified

- [ ] **Step 1: Clean production build**

```bash
npm run build
```

Expected: build completes successfully; note the JS bundle size in the output.

- [ ] **Step 2: Preview the production build**

```bash
npm run preview
```

Open the preview URL (typically `http://localhost:4173`). Log in as a borrower. Confirm the wizard is accessible and the Dashboard entry-point renders correctly in the production build.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: push succeeds. Cloudflare Pages will auto-deploy from main within ~1 minute.
