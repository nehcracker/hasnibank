# Loan Application Phase 2 — Status Dashboard + Admin Console

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 1 submission stub with a real borrower status dashboard (9-stage progress tracker, event timeline, context-sensitive action zone) and build a staff admin console (application list + detail view with stage control).

**Architecture:** `Dashboard.jsx` already manages `wizardState` — the `submitted` branch currently shows an inline stub; Phase 2 replaces it with `<ApplicationStatus>` which queries `application_events` and assembles `ProgressTracker`, `Timeline`, and `ActionZone`. The admin side adds one new route (`/admin/applications/:id`) to the existing `/admin` route; `Admin.jsx` becomes the list view and `AdminApplication.jsx` handles the detail; `StageControl` writes to both `applications.status` and `application_events`. All Supabase calls happen in the component closest to their data.

**Tech Stack:** React 18, Vite, Supabase JS client (`@/lib/supabase`), CSS Modules, Vitest + React Testing Library (`@testing-library/react`, `@testing-library/user-event`), design tokens from `src/styles/tokens.css`

## Global Constraints

- All colors via CSS custom properties — exact token names: `--color-navy`, `--color-surface`, `--color-gold`, `--color-gold-soft`, `--color-ivory`, `--color-muted`, `--color-border`, `--color-success`, `--color-error`
- Font families: `var(--font-heading)` for Fraunces headings, `var(--font-body)` for Inter body
- Font sizes via tokens: `--text-xs` through `--text-6xl`
- Spacing via tokens: `--space-1` through `--space-24`
- Border radius: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px)
- Transitions: `var(--transition-fast)` (150ms)
- File extension `.jsx` for all JSX-containing files
- Import alias `@/` maps to `src/`
- `supabase` client from `@/lib/supabase`; `useAuth` from `@/hooks/useAuth` — returns `{ session, user, profile, role, loading }`
- `npm run build` must pass zero errors before each commit
- UI copy: "financing application", not "loan application"; tone premium/institutional
- Never hardcode hex values in CSS

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `sql/phase2-tables.sql` | `application_events` table DDL + RLS policies |
| `src/pages/dashboard/ProgressTracker.jsx` | 9-stage horizontal stepper — pure presentational |
| `src/pages/dashboard/Timeline.jsx` | Chronological `application_events` feed — pure presentational |
| `src/pages/dashboard/ActionZone.jsx` | Context-sensitive action panel keyed to `applications.status` |
| `src/pages/dashboard/ApplicationStatus.jsx` | Assembles ProgressTracker + Timeline + ActionZone; queries events; owns Accept Offer mutation |
| `src/pages/dashboard/Status.module.css` | All styles for dashboard status sub-components |
| `src/pages/dashboard/__tests__/ProgressTracker.test.jsx` | Unit tests for ProgressTracker |
| `src/pages/dashboard/__tests__/ActionZone.test.jsx` | Unit tests for ActionZone |
| `src/pages/admin/AdminApplication.jsx` | `/admin/applications/:id` — two-column detail view |
| `src/pages/admin/StageControl.jsx` | Stage dropdown + optional note + "Update Status" — writes to DB |
| `src/pages/admin/Admin.module.css` | Styles for Admin list + AdminApplication + StageControl |

### Modified files

| File | What changes |
|------|-------------|
| `src/pages/Dashboard.jsx` | `submitted` branch imports and renders `<ApplicationStatus>` instead of inline stub |
| `src/pages/Admin.jsx` | Replace stub with application list table |
| `src/pages/wizard/ApplicationWizard.jsx` | Insert `status_change` event to `application_events` after successful Supabase insert |
| `src/App.jsx` | Add `/admin/applications/:id` route after line 47 |

---

### Task 1: Create application_events table in Supabase

**Files:**
- Create: `sql/phase2-tables.sql`

**Interfaces:**
- Produces: `public.application_events` table with columns `id`, `application_id`, `actor_id`, `actor_role`, `event_type`, `payload`, `created_at`; three RLS policies matching the pattern from `sql/phase1-applications.sql`
- Consumed by: Timeline (Task 4), ApplicationStatus (Task 5), StageControl (Task 7)

- [ ] **Step 1: Create the SQL file**

Create `sql/phase2-tables.sql`:

```sql
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
```

- [ ] **Step 2: Run the SQL in Supabase**

Open the Supabase project dashboard → SQL Editor → paste the full contents of `sql/phase2-tables.sql` → Run. Confirm the `application_events` table appears in the Table Editor with all 7 columns.

- [ ] **Step 3: Commit**

```bash
git add sql/phase2-tables.sql
git commit -m "chore: add application_events table SQL for Phase 2"
```

---

### Task 2: ProgressTracker component

**Files:**
- Create: `src/pages/dashboard/ProgressTracker.jsx`
- Create: `src/pages/dashboard/Status.module.css` (tracker section only)
- Create: `src/pages/dashboard/__tests__/ProgressTracker.test.jsx`

**Interfaces:**
- Consumes: `status: string` — one of the 9 stage keys
- Produces: `<ProgressTracker status="..." />` used by ApplicationStatus (Task 5)

- [ ] **Step 1: Write the failing test**

Create `src/pages/dashboard/__tests__/ProgressTracker.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import ProgressTracker from '../ProgressTracker'

test('renders all 9 stage labels', () => {
  render(<ProgressTracker status="submitted" />)
  expect(screen.getByText('Submitted')).toBeInTheDocument()
  expect(screen.getByText('KYC Verification')).toBeInTheDocument()
  expect(screen.getByText('Credit Assessment')).toBeInTheDocument()
  expect(screen.getByText('Funder Matching')).toBeInTheDocument()
  expect(screen.getByText('Term Sheet')).toBeInTheDocument()
  expect(screen.getByText('Offer Issued')).toBeInTheDocument()
  expect(screen.getByText('Offer Accepted')).toBeInTheDocument()
  expect(screen.getByText('Fee Payment')).toBeInTheDocument()
  expect(screen.getByText('Funded')).toBeInTheDocument()
})

test('marks current stage with aria-current="step"', () => {
  render(<ProgressTracker status="credit_assessment" />)
  const cell = screen.getByText('Credit Assessment').closest('[data-state]')
  expect(cell).toHaveAttribute('aria-current', 'step')
  expect(cell).toHaveAttribute('data-state', 'active')
})

test('marks prior stages as done', () => {
  render(<ProgressTracker status="credit_assessment" />)
  const cell = screen.getByText('Submitted').closest('[data-state]')
  expect(cell).toHaveAttribute('data-state', 'done')
})

test('marks future stages as future', () => {
  render(<ProgressTracker status="submitted" />)
  const cell = screen.getByText('Funded').closest('[data-state]')
  expect(cell).toHaveAttribute('data-state', 'future')
  expect(cell).not.toHaveAttribute('aria-current')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/dashboard/__tests__/ProgressTracker.test.jsx
```
Expected: FAIL — "Cannot find module '../ProgressTracker'"

- [ ] **Step 3: Create Status.module.css with tracker styles**

Create `src/pages/dashboard/Status.module.css`:

```css
/* ── Progress Tracker ─────────────────────────────────── */
.trackerWrap {
  padding: var(--space-6) 0 var(--space-8);
  overflow-x: auto;
}

.stages {
  display: flex;
  align-items: flex-start;
  min-width: 560px;
}

.stageCell {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.stageDot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-navy);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-family: var(--font-body);
  color: var(--color-muted);
  position: relative;
  z-index: 1;
  transition: var(--transition-fast);
}

.stageCell[data-state='done'] .stageDot {
  background: var(--color-gold);
  border-color: var(--color-gold);
  color: var(--color-navy);
}

.stageCell[data-state='active'] .stageDot {
  border-color: var(--color-gold);
  color: var(--color-gold);
  box-shadow: 0 0 0 3px rgba(203, 161, 53, 0.2);
}

.stageLabel {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  font-family: var(--font-body);
  color: var(--color-muted);
  text-align: center;
  line-height: 1.3;
  max-width: 68px;
}

.stageCell[data-state='done'] .stageLabel   { color: var(--color-gold-soft); }
.stageCell[data-state='active'] .stageLabel { color: var(--color-gold); font-weight: 600; }

.connector {
  flex: 1;
  min-width: var(--space-3);
  height: 2px;
  background: var(--color-border);
  margin-top: 13px;
  align-self: flex-start;
  transition: var(--transition-fast);
}

.connector[data-state='done'] { background: var(--color-gold); }
```

- [ ] **Step 4: Implement ProgressTracker**

Create `src/pages/dashboard/ProgressTracker.jsx`:

```jsx
import { Fragment } from 'react'
import styles from './Status.module.css'

const STAGES = [
  { key: 'submitted',         label: 'Submitted' },
  { key: 'kyc_verification',  label: 'KYC Verification' },
  { key: 'credit_assessment', label: 'Credit Assessment' },
  { key: 'funder_matching',   label: 'Funder Matching' },
  { key: 'term_sheet',        label: 'Term Sheet' },
  { key: 'offer_issued',      label: 'Offer Issued' },
  { key: 'offer_accepted',    label: 'Offer Accepted' },
  { key: 'fee_payment',       label: 'Fee Payment' },
  { key: 'funded',            label: 'Funded' },
]

export { STAGES }

export default function ProgressTracker({ status }) {
  const currentIdx = STAGES.findIndex((s) => s.key === status)

  return (
    <div className={styles.trackerWrap}>
      <div className={styles.stages}>
        {STAGES.map((stage, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'future'
          return (
            <Fragment key={stage.key}>
              <div
                className={styles.stageCell}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <div className={styles.stageDot}>
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <span className={styles.stageLabel}>{stage.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={styles.connector} data-state={state} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/pages/dashboard/__tests__/ProgressTracker.test.jsx
```
Expected: 4 tests PASS

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/dashboard/ProgressTracker.jsx src/pages/dashboard/Status.module.css src/pages/dashboard/__tests__/ProgressTracker.test.jsx
git commit -m "feat: 9-stage ProgressTracker component"
```

---

### Task 3: ActionZone component

**Files:**
- Create: `src/pages/dashboard/ActionZone.jsx`
- Modify: `src/pages/dashboard/Status.module.css` (append action zone styles)
- Create: `src/pages/dashboard/__tests__/ActionZone.test.jsx`

**Interfaces:**
- Consumes: `status: string`, `onAcceptOffer: () => Promise<void>`, `accepting: boolean`
- Produces: `<ActionZone status="..." onAcceptOffer={fn} accepting={bool} />` used by ApplicationStatus (Task 5)

- [ ] **Step 1: Write the failing test**

Create `src/pages/dashboard/__tests__/ActionZone.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActionZone from '../ActionZone'

test('shows review message for submitted status', () => {
  render(<ActionZone status="submitted" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/being reviewed/i)).toBeInTheDocument()
})

test('shows review message for funder_matching status', () => {
  render(<ActionZone status="funder_matching" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/being reviewed/i)).toBeInTheDocument()
})

test('shows Accept Offer button for offer_issued status', () => {
  render(<ActionZone status="offer_issued" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByRole('button', { name: /accept offer/i })).toBeInTheDocument()
})

test('calls onAcceptOffer when Accept Offer clicked', async () => {
  const user = userEvent.setup()
  const fn = vi.fn()
  render(<ActionZone status="offer_issued" onAcceptOffer={fn} accepting={false} />)
  await user.click(screen.getByRole('button', { name: /accept offer/i }))
  expect(fn).toHaveBeenCalledOnce()
})

test('disables button and shows Accepting… while accepting', () => {
  render(<ActionZone status="offer_issued" onAcceptOffer={() => {}} accepting={true} />)
  const btn = screen.getByRole('button', { name: /accepting/i })
  expect(btn).toBeDisabled()
})

test('shows funded congratulations message', () => {
  render(<ActionZone status="funded" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/pages/dashboard/__tests__/ActionZone.test.jsx
```
Expected: FAIL — "Cannot find module '../ActionZone'"

- [ ] **Step 3: Append action zone styles to Status.module.css**

Add to the end of `src/pages/dashboard/Status.module.css`:

```css
/* ── Action Zone ──────────────────────────────────────── */
.actionZone {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin-top: var(--space-6);
}

.actionTitle {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  color: var(--color-ivory);
  margin: 0 0 var(--space-3);
}

.actionMsg {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0;
  line-height: 1.6;
}

.actionMsg strong { color: var(--color-ivory); }

.fundedMsg { color: var(--color-success); font-weight: 600; }

.acceptBtn {
  margin-top: var(--space-4);
  display: inline-block;
  background: var(--color-gold);
  color: var(--color-navy);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  cursor: pointer;
  transition: var(--transition-fast);
}

.acceptBtn:hover:not(:disabled) { background: var(--color-gold-soft); }
.acceptBtn:disabled { opacity: 0.6; cursor: not-allowed; }
```

- [ ] **Step 4: Implement ActionZone**

Create `src/pages/dashboard/ActionZone.jsx`:

```jsx
import styles from './Status.module.css'

export default function ActionZone({ status, onAcceptOffer, accepting }) {
  return (
    <div className={styles.actionZone}>
      <h3 className={styles.actionTitle}>Next Steps</h3>
      <ActionContent status={status} onAcceptOffer={onAcceptOffer} accepting={accepting} />
    </div>
  )
}

function ActionContent({ status, onAcceptOffer, accepting }) {
  if (status === 'funded') {
    return (
      <p className={`${styles.actionMsg} ${styles.fundedMsg}`}>
        Congratulations — your financing has been funded. Our team will be in touch with
        final disbursement details.
      </p>
    )
  }

  if (status === 'offer_issued') {
    return (
      <>
        <p className={styles.actionMsg}>
          Your offer letter is ready. Review the terms and accept to proceed.
        </p>
        <button
          className={styles.acceptBtn}
          onClick={onAcceptOffer}
          disabled={accepting}
        >
          {accepting ? 'Accepting…' : 'Accept Offer'}
        </button>
      </>
    )
  }

  if (status === 'offer_accepted') {
    return (
      <p className={styles.actionMsg}>
        You have accepted the offer. Our team is preparing the next steps.
      </p>
    )
  }

  return (
    <p className={styles.actionMsg}>
      Your financing application is <strong>being reviewed</strong> by our team. We will
      be in touch as it advances through each stage.
    </p>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/pages/dashboard/__tests__/ActionZone.test.jsx
```
Expected: 6 tests PASS

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 7: Commit**

```bash
git add src/pages/dashboard/ActionZone.jsx src/pages/dashboard/Status.module.css src/pages/dashboard/__tests__/ActionZone.test.jsx
git commit -m "feat: ActionZone component with offer-accept flow"
```

---

### Task 4: Timeline component

**Files:**
- Create: `src/pages/dashboard/Timeline.jsx`
- Modify: `src/pages/dashboard/Status.module.css` (append timeline styles)

**Interfaces:**
- Consumes: `events: Array<{ id: string, actor_role: string, event_type: string, payload: object, created_at: string }>` — rows from `application_events`
- Produces: `<Timeline events={events} />` used by ApplicationStatus (Task 5)

Timeline is purely presentational — ApplicationStatus owns the Supabase query.

- [ ] **Step 1: Append timeline styles to Status.module.css**

Add to the end of `src/pages/dashboard/Status.module.css`:

```css
/* ── Timeline ─────────────────────────────────────────── */
.timeline {
  margin-top: var(--space-8);
}

.timelineTitle {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  color: var(--color-ivory);
  margin: 0 0 var(--space-4);
}

.eventList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.eventItem {
  display: grid;
  grid-template-columns: 8px 1fr;
  gap: var(--space-3);
  align-items: start;
}

.eventDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gold);
  margin-top: 5px;
  flex-shrink: 0;
}

.eventBody {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ivory);
  line-height: 1.5;
}

.eventMeta {
  font-size: var(--text-xs);
  color: var(--color-muted);
  margin-top: var(--space-1);
}

.roleBadge {
  display: inline-block;
  font-size: var(--text-xs);
  padding: 1px 7px;
  border-radius: var(--radius-sm);
  margin-right: var(--space-2);
  background: var(--color-border);
  color: var(--color-ivory);
}

.roleBadge[data-role='staff'] {
  background: rgba(203, 161, 53, 0.15);
  color: var(--color-gold-soft);
}

.emptyTimeline {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  font-style: italic;
}
```

- [ ] **Step 2: Implement Timeline**

Create `src/pages/dashboard/Timeline.jsx`:

```jsx
import styles from './Status.module.css'

const EVENT_LABELS = {
  status_change: 'Status Update',
  note:          'Note',
  document:      'Document',
  message:       'Message',
  fee:           'Fee Added',
  payment:       'Payment',
}

const STAGE_LABELS = {
  submitted: 'Submitted', kyc_verification: 'KYC Verification',
  credit_assessment: 'Credit Assessment', funder_matching: 'Funder Matching',
  term_sheet: 'Term Sheet', offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted', fee_payment: 'Fee Payment', funded: 'Funded',
}

function summarize(event_type, payload) {
  switch (event_type) {
    case 'status_change':
      return `Advanced to ${STAGE_LABELS[payload.new_status] ?? payload.new_status}`
    case 'note':
      return payload.body ?? 'Note added'
    case 'document':
      return `Document uploaded: ${payload.file_name ?? 'file'}`
    case 'message':
      return 'Message sent'
    case 'fee':
      return `Fee added: ${payload.label} — ${payload.currency ?? 'USD'} ${Number(payload.amount).toLocaleString('en-US')}`
    case 'payment':
      return 'Payment confirmed'
    default:
      return event_type
  }
}

export default function Timeline({ events }) {
  if (events.length === 0) {
    return (
      <div className={styles.timeline}>
        <h3 className={styles.timelineTitle}>Activity</h3>
        <p className={styles.emptyTimeline}>No activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      <h3 className={styles.timelineTitle}>Activity</h3>
      <ul className={styles.eventList}>
        {events.map((ev) => (
          <li key={ev.id} className={styles.eventItem}>
            <div className={styles.eventDot} />
            <div>
              <div className={styles.eventBody}>
                <span className={styles.roleBadge} data-role={ev.actor_role}>
                  {ev.actor_role === 'staff' ? 'Hasni Team' : 'You'}
                </span>
                {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                {' — '}
                {summarize(ev.event_type, ev.payload ?? {})}
              </div>
              <div className={styles.eventMeta}>
                {new Date(ev.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/Timeline.jsx src/pages/dashboard/Status.module.css
git commit -m "feat: Timeline component for application_events feed"
```

---

### Task 5: ApplicationStatus + Dashboard + Wizard integration

**Files:**
- Create: `src/pages/dashboard/ApplicationStatus.jsx`
- Modify: `src/pages/dashboard/Status.module.css` (append page-level styles)
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/wizard/ApplicationWizard.jsx`

**Interfaces:**
- Consumes: `application: { id, track, status, amount_sought, currency, created_at }` prop from Dashboard
- Produces: replaces the inline submitted stub in Dashboard; ApplicationWizard also writes the first event

- [ ] **Step 1: Append page-level styles to Status.module.css**

Add to the end of `src/pages/dashboard/Status.module.css`:

```css
/* ── ApplicationStatus page ───────────────────────────── */
.statusPage {
  min-height: 100vh;
  background: var(--color-navy);
  padding: var(--space-8) var(--space-4);
}

.statusInner {
  max-width: 900px;
  margin: 0 auto;
}

.statusHeading {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  color: var(--color-ivory);
  margin: 0 0 var(--space-2);
}

.statusMeta {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0 0 var(--space-6);
}

.statusMeta strong { color: var(--color-gold-soft); }

.loadingMsg {
  font-family: var(--font-body);
  color: var(--color-muted);
}
```

- [ ] **Step 2: Implement ApplicationStatus**

Create `src/pages/dashboard/ApplicationStatus.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ProgressTracker from './ProgressTracker'
import Timeline from './Timeline'
import ActionZone from './ActionZone'
import styles from './Status.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing',
  project: 'Project Funding',
  trade: 'Trade Finance',
  acquisition: 'Acquisition Finance',
}

export default function ApplicationStatus({ application: initial }) {
  const { user } = useAuth()
  const [application, setApplication] = useState(initial)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    supabase
      .from('application_events')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? [])
        setEventsLoading(false)
      })
  }, [application.id])

  async function handleAcceptOffer() {
    setAccepting(true)
    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status: 'offer_accepted' })
      .eq('id', application.id)
      .select()
      .single()

    if (!error && updated) {
      const newEvent = {
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'status_change',
        payload: { new_status: 'offer_accepted' },
      }
      await supabase.from('application_events').insert(newEvent)
      setApplication(updated)
      setEvents((prev) => [
        ...prev,
        { ...newEvent, id: crypto.randomUUID(), created_at: new Date().toISOString() },
      ])
    }
    setAccepting(false)
  }

  return (
    <div className={styles.statusPage}>
      <div className={styles.statusInner}>
        <h1 className={styles.statusHeading}>Your Application</h1>
        <p className={styles.statusMeta}>
          <strong>{TRACK_LABELS[application.track]}</strong>
          {' · '}
          {application.currency}{' '}
          {Number(application.amount_sought).toLocaleString('en-US')}
          {' · Submitted '}
          {new Date(application.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>

        <ProgressTracker status={application.status} />

        <ActionZone
          status={application.status}
          onAcceptOffer={handleAcceptOffer}
          accepting={accepting}
        />

        {eventsLoading ? (
          <p className={styles.loadingMsg}>Loading activity…</p>
        ) : (
          <Timeline events={events} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update Dashboard.jsx**

Replace the full contents of `src/pages/Dashboard.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ApplicationWizard from './wizard/ApplicationWizard'
import ApplicationStatus from './dashboard/ApplicationStatus'
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
      .then(({ data, error }) => {
        if (error) {
          console.error('applications query failed:', error)
          setWizardState('idle')
          return
        }
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
    return <ApplicationStatus application={application} />
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
```

- [ ] **Step 4: Update ApplicationWizard.jsx to write submitted event**

In `src/pages/wizard/ApplicationWizard.jsx`, replace the `handleSubmit` function:

```jsx
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

  await supabase.from('application_events').insert({
    application_id: data.id,
    actor_id: user.id,
    actor_role: 'borrower',
    event_type: 'status_change',
    payload: { new_status: 'submitted' },
  })

  setSubmitting(false)
  onComplete(data)
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/dashboard/ApplicationStatus.jsx src/pages/dashboard/Status.module.css src/pages/Dashboard.jsx src/pages/wizard/ApplicationWizard.jsx
git commit -m "feat: ApplicationStatus replaces submission stub — progress tracker, timeline, action zone"
```

---

### Task 6: Admin application list

**Files:**
- Modify: `src/pages/Admin.jsx` — replace stub with list table
- Create: `src/pages/admin/Admin.module.css`

**Interfaces:**
- Consumes: all `applications` rows joined to `profiles` via `applicant_id` FK — needs `full_name`, `email`
- Produces: clickable table at `/admin`; row click navigates to `/admin/applications/:id`

- [ ] **Step 1: Create Admin.module.css**

Create `src/pages/admin/Admin.module.css`:

```css
/* ── Shared admin layout ──────────────────────────────── */
.page {
  min-height: 100vh;
  background: var(--color-navy);
  padding: var(--space-8) var(--space-4);
}

.inner {
  max-width: 1100px;
  margin: 0 auto;
}

.heading {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  color: var(--color-ivory);
  margin: 0 0 var(--space-6);
}

.loadingMsg {
  font-family: var(--font-body);
  color: var(--color-muted);
}

/* ── Application list table ───────────────────────────── */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.table td {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ivory);
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.tableRow {
  cursor: pointer;
  transition: var(--transition-fast);
}

.tableRow:hover td { background: var(--color-surface); }

.statusBadge {
  display: inline-block;
  font-size: var(--text-xs);
  font-family: var(--font-body);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-border);
  color: var(--color-ivory);
  white-space: nowrap;
}

.statusBadge[data-status='funded']        { background: rgba(63,163,122,0.2);  color: var(--color-success); }
.statusBadge[data-status='offer_issued']  { background: rgba(203,161,53,0.2);  color: var(--color-gold-soft); }
.statusBadge[data-status='offer_accepted']{ background: rgba(203,161,53,0.15); color: var(--color-gold-soft); }

.muted {
  color: var(--color-muted);
  font-size: var(--text-xs);
}

/* ── Admin detail layout ──────────────────────────────── */
.detailGrid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: var(--space-8);
  align-items: start;
}

@media (max-width: 768px) {
  .detailGrid { grid-template-columns: 1fr; }
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

.fieldRow {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.fieldLabel {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-muted);
  min-width: 160px;
  flex-shrink: 0;
}

.fieldValue {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-ivory);
}

.backLink {
  display: inline-block;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-gold-soft);
  text-decoration: none;
  margin-bottom: var(--space-6);
}

.backLink:hover { color: var(--color-gold); }

/* ── Stage Control ────────────────────────────────────── */
.stageControl {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.fieldLabelSm {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-muted);
  margin-bottom: var(--space-1);
}

.stageSelect,
.noteField {
  width: 100%;
  background: var(--color-navy);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-ivory);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  box-sizing: border-box;
}

.noteField {
  resize: vertical;
  min-height: 80px;
}

.updateBtn {
  background: var(--color-gold);
  color: var(--color-navy);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  cursor: pointer;
  transition: var(--transition-fast);
}

.updateBtn:hover:not(:disabled) { background: var(--color-gold-soft); }
.updateBtn:disabled { opacity: 0.6; cursor: not-allowed; }

.errorMsg   { font-family: var(--font-body); font-size: var(--text-xs); color: var(--color-error); }
.successMsg { font-family: var(--font-body); font-size: var(--text-xs); color: var(--color-success); }
```

- [ ] **Step 2: Replace Admin.jsx with list view**

Replace the full contents of `src/pages/Admin.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './admin/Admin.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}

const STATUS_LABELS = {
  submitted: 'Submitted', kyc_verification: 'KYC Verification',
  credit_assessment: 'Credit Assessment', funder_matching: 'Funder Matching',
  term_sheet: 'Term Sheet', offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted', fee_payment: 'Fee Payment', funded: 'Funded',
}

export default function Admin() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setApplications(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.loadingMsg}>Loading applications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Applications</h1>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Track</th>
              <th>Amount Sought</th>
              <th>Stage</th>
              <th>Submitted</th>
              <th>Days Open</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.muted}>No applications yet.</td>
              </tr>
            )}
            {applications.map((app) => {
              const daysOpen = Math.floor(
                (Date.now() - new Date(app.created_at)) / (1000 * 60 * 60 * 24)
              )
              return (
                <tr
                  key={app.id}
                  className={styles.tableRow}
                  onClick={() => navigate(`/admin/applications/${app.id}`)}
                >
                  <td>
                    <div>{app.applicant?.full_name ?? '—'}</div>
                    <div className={styles.muted}>{app.applicant?.email}</div>
                  </td>
                  <td>{TRACK_LABELS[app.track] ?? app.track}</td>
                  <td>{app.currency} {Number(app.amount_sought).toLocaleString('en-US')}</td>
                  <td>
                    <span className={styles.statusBadge} data-status={app.status}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </td>
                  <td className={styles.muted}>
                    {new Date(app.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </td>
                  <td className={styles.muted}>{daysOpen}d</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin.jsx src/pages/admin/Admin.module.css
git commit -m "feat: admin application list view"
```

---

### Task 7: Admin application detail + StageControl + route

**Files:**
- Create: `src/pages/admin/StageControl.jsx`
- Create: `src/pages/admin/AdminApplication.jsx`
- Modify: `src/App.jsx` — add one route after line 47

**Interfaces:**
- `StageControl` consumes: `applicationId: string`, `currentStatus: string`, `userId: string`, `onUpdated: (newStatus: string) => void`
- `AdminApplication` reads `id` from `useParams()`
- Both import from `src/pages/admin/Admin.module.css`

- [ ] **Step 1: Implement StageControl**

Create `src/pages/admin/StageControl.jsx`:

```jsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './Admin.module.css'

const STAGES = [
  { key: 'submitted',         label: 'Submitted' },
  { key: 'kyc_verification',  label: 'KYC Verification' },
  { key: 'credit_assessment', label: 'Credit Assessment' },
  { key: 'funder_matching',   label: 'Funder Matching' },
  { key: 'term_sheet',        label: 'Term Sheet' },
  { key: 'offer_issued',      label: 'Offer Issued' },
  { key: 'offer_accepted',    label: 'Offer Accepted' },
  { key: 'fee_payment',       label: 'Fee Payment' },
  { key: 'funded',            label: 'Funded' },
]

export default function StageControl({ applicationId, currentStatus, userId, onUpdated }) {
  const [selected, setSelected] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleUpdate() {
    setUpdating(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: selected })
      .eq('id', applicationId)

    if (updateError) {
      setError(updateError.message)
      setUpdating(false)
      return
    }

    const payload = { new_status: selected }
    if (note.trim()) payload.note = note.trim()

    await supabase.from('application_events').insert({
      application_id: applicationId,
      actor_id: userId,
      actor_role: 'staff',
      event_type: 'status_change',
      payload,
    })

    setNote('')
    setSuccess(true)
    setUpdating(false)
    onUpdated(selected)
  }

  return (
    <div className={styles.stageControl}>
      <div>
        <div className={styles.fieldLabelSm}>Stage</div>
        <select
          className={styles.stageSelect}
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setSuccess(false) }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <div className={styles.fieldLabelSm}>Note (optional)</div>
        <textarea
          className={styles.noteField}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for this stage change…"
        />
      </div>
      <button
        className={styles.updateBtn}
        onClick={handleUpdate}
        disabled={updating}
      >
        {updating ? 'Updating…' : 'Update Status'}
      </button>
      {error   && <p className={styles.errorMsg}>{error}</p>}
      {success && <p className={styles.successMsg}>Status updated successfully.</p>}
    </div>
  )
}
```

- [ ] **Step 2: Implement AdminApplication**

Create `src/pages/admin/AdminApplication.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import StageControl from './StageControl'
import styles from './Admin.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}

const FIELD_LABELS = {
  businessName: 'Business Name', businessType: 'Business Type',
  countryOfRegistration: 'Country of Registration', annualRevenue: 'Annual Revenue',
  loanPurpose: 'Loan Purpose', amountSought: 'Amount Sought',
  collateralAvailable: 'Collateral Available', collateralDescription: 'Collateral Description',
  description: 'Description',
  projectName: 'Project Name', sector: 'Sector', fundingStructure: 'Funding Structure',
  totalProjectValue: 'Total Project Value', projectTimeline: 'Project Timeline',
  keySponsors: 'Key Sponsors',
  companyName: 'Company Name', tradeType: 'Trade Type',
  counterpartyCountry: 'Counterparty Country', transactionValue: 'Transaction Value',
  acquiringCompanyName: 'Acquiring Company', targetDescription: 'Target Description',
  dealStructure: 'Deal Structure', totalAcquisitionValue: 'Total Acquisition Value',
  expectedClosingTimeline: 'Expected Closing',
}

export default function AdminApplication() {
  const { id } = useParams()
  const { user } = useAuth()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(full_name, email)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setApplication(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}><p className={styles.loadingMsg}>Loading…</p></div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}><p className={styles.loadingMsg}>Application not found.</p></div>
      </div>
    )
  }

  const fields = application.fields ?? {}
  const applicant = application.applicant

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/admin" className={styles.backLink}>← Back to Applications</Link>
        <h1 className={styles.heading}>
          {TRACK_LABELS[application.track]} — {application.currency}{' '}
          {Number(application.amount_sought).toLocaleString('en-US')}
        </h1>

        <div className={styles.detailGrid}>
          {/* Left: applicant profile + application fields */}
          <div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Applicant</h2>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Name</span>
                <span className={styles.fieldValue}>{applicant?.full_name ?? '—'}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Email</span>
                <span className={styles.fieldValue}>{applicant?.email ?? '—'}</span>
              </div>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Application Fields</h2>
              {Object.entries(fields).map(([key, val]) =>
                val !== '' && val !== null && val !== undefined ? (
                  <div key={key} className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{FIELD_LABELS[key] ?? key}</span>
                    <span className={styles.fieldValue}>{String(val)}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Right: workflow */}
          <div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Stage Control</h2>
              <StageControl
                applicationId={application.id}
                currentStatus={application.status}
                userId={user.id}
                onUpdated={(newStatus) =>
                  setApplication((prev) => ({ ...prev, status: newStatus }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add route to App.jsx**

In `src/App.jsx`, add the import after line 19 (`import Admin from '@/pages/Admin'`):

```jsx
import AdminApplication from '@/pages/admin/AdminApplication'
```

Then add the route after line 47 (after the `/admin` route, before `</Routes>`):

```jsx
<Route path="/admin/applications/:id" element={
  <ProtectedRoute requiredRole="staff"><AdminApplication /></ProtectedRoute>
} />
```

The Routes block should then end:
```jsx
            <Route path="/admin"           element={
              <ProtectedRoute requiredRole="staff"><Admin /></ProtectedRoute>
            } />
            <Route path="/admin/applications/:id" element={
              <ProtectedRoute requiredRole="staff"><AdminApplication /></ProtectedRoute>
            } />
          </Routes>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass (ProgressTracker × 4, ActionZone × 6, ProtectedRoute existing tests)

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/StageControl.jsx src/pages/admin/AdminApplication.jsx src/App.jsx
git commit -m "feat: admin detail view with stage control — Phase 2 complete"
```

---

### Task 8: Push to GitHub

- [ ] **Step 1: Final build check**

```bash
npm run build
```
Expected: zero errors

- [ ] **Step 2: Push**

```bash
git push origin main
```
