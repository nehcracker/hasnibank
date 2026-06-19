# Loan Application Wizard — Design Spec

**Date:** 2026-06-19
**Scope:** Self-serve financing application wizard on the borrower dashboard.

---

## Overview

A multi-step, single-session wizard that lets authenticated borrowers submit a financing application across four tracks. Lives entirely at `/dashboard` — no new routes. The dashboard renders one of three states: entry point → wizard → submitted confirmation.

---

## User Flow

1. Borrower logs in → lands on `/dashboard`
2. If no existing application: sees "Start Application" button
3. Clicks button → wizard opens inline (entry point replaced by wizard)
4. **Step 1 — Track Selection:** chooses one of four financing tracks
5. **Step 2 — Application Details:** fills track-specific fields; validated before Next
6. **Step 3 — Review & Submit:** reads back all entered data; can Edit (go back) or Submit
7. Submit → Supabase INSERT → dashboard transitions to confirmation state
8. Confirmation shows application reference (first 8 chars of UUID) and status: `Submitted`

On subsequent logins, Dashboard queries `applications` on mount — if a row exists for the borrower, the confirmation state is shown immediately (wizard bypassed). A borrower can only have one active application.

---

## Step 1 — Track Selection

Four cards rendered from the existing `financingTracks` array in `src/data/financingData.js`. Each card shows the track badge, title, and description. Selecting a card highlights it and enables the Next button.

Tracks:
- **SME Financing** (`sme`)
- **Project Funding** (`project`)
- **Trade Finance** (`trade`)
- **Acquisition Finance** (`acquisition`)

---

## Step 2 — Application Details (track-specific)

### SME Financing
| Field | Input type |
|-------|-----------|
| Business name | Text |
| Business type | Select: Sole Trader / Partnership / Private Limited / Public Company |
| Country of registration | Text |
| Annual revenue | Select: <$100k / $100k–$500k / $500k–$2M / $2M–$10M / >$10M |
| Loan purpose | Select: Working Capital / Equipment Finance / Business Expansion / Trade Finance |
| Amount sought (USD) | Number |
| Collateral available | Radio: Yes / No — if Yes, text description |
| Business & use-of-funds description | Textarea |

### Project Funding
| Field | Input type |
|-------|-----------|
| Project name | Text |
| Sector | Select: Infrastructure / Energy / Real Estate / Agriculture / Manufacturing / Mining & Resources |
| Preferred funding structure | Select: Debt Finance / Equity Finance / Joint Ventures / Structured Finance |
| Total project value (USD) | Number |
| Amount sought (USD) | Number |
| Project timeline | Select: <12 months / 1–3 years / 3–5 years / 5+ years |
| Key sponsors / parties | Text |
| Project description | Textarea |

### Trade Finance
| Field | Input type |
|-------|-----------|
| Company name | Text |
| Trade type | Select: Import LC / Export LC / Invoice Discounting / Supply Chain Finance |
| Counterparty country | Text |
| Transaction value (USD) | Number |
| Amount sought (USD) | Number |
| Transaction description | Textarea |

### Acquisition Finance
| Field | Input type |
|-------|-----------|
| Acquiring company name | Text |
| Target company / asset description | Text |
| Deal structure | Select: Leveraged Buyout / Management Buyout / Asset Acquisition / Share Acquisition |
| Total acquisition value (USD) | Number |
| Amount sought (USD) | Number |
| Expected closing timeline | Text |
| Deal description | Textarea |

All fields required. Validation on Next — inline error per field, no submission until clean.

---

## Step 3 — Review & Submit

Read-only summary of all entered data, grouped by section. An Edit button returns to Step 2 with data preserved. Submit button triggers the Supabase insert.

On submit:
- Button disabled + loading state
- On success → dashboard confirmation state
- On error → inline error message with retry; data preserved

---

## Dashboard States

### Entry point (no application)
Heading: "Welcome, {full_name}"
Body: brief description of the application process
CTA: "Start Application" button → mounts wizard

### Wizard active
Progress bar (Step 1 / 2 / 3) across top of wizard card
Back button on steps 2 and 3
Cancel link returns to entry point (data lost — no confirmation prompt needed for single-session)

### Submitted confirmation
Heading: "Application Submitted"
Reference: `#` + first 8 chars of application UUID
Status badge: "Submitted — Under Review"
Body: "Our financing team will review your application and contact you within 5 business days."

---

## Supabase Schema

### `public.applications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `applicant_id` | `uuid` | NOT NULL, FK → `profiles(id)` |
| `track` | `text` | NOT NULL — `sme` \| `project` \| `trade` \| `acquisition` |
| `amount_sought` | `numeric` | NOT NULL |
| `currency` | `text` | NOT NULL, default `'USD'` |
| `status` | `text` | NOT NULL, default `'submitted'` |
| `fields` | `jsonb` | NOT NULL — track-specific field data |
| `created_at` | `timestamptz` | default `now()` |

**RLS policies:**
- `SELECT`: `applicant_id = auth.uid()`
- `INSERT`: `applicant_id = auth.uid()`
- No UPDATE or DELETE for borrowers

**Status values:** `submitted` | `under_review` | `approved` | `declined` — updated by staff only (future Admin console).

---

## Component Architecture

### New files

```
src/pages/wizard/
├── ApplicationWizard.jsx       owns step (1|2|3) and form data state
├── Wizard.module.css           progress bar, nav buttons, card shell
└── steps/
    ├── TrackSelect.jsx         step 1 — track selection cards
    ├── SmeFields.jsx           step 2 — SME form fields
    ├── ProjectFields.jsx       step 2 — Project form fields
    ├── TradeFields.jsx         step 2 — Trade form fields
    ├── AcquisitionFields.jsx   step 2 — Acquisition form fields
    └── ReviewSubmit.jsx        step 3 — summary + submit
```

### Modified files

- `src/pages/Dashboard.jsx` — replaces stub; manages `wizardState` (`idle` | `active` | `submitted`) and `application` data
- `src/pages/Dashboard.module.css` — adds entry point and confirmation styles

### Data flow

```
Dashboard
  wizardState: 'idle' | 'active' | 'submitted'
  application: null | { id, status, track, ... }

  onMount → supabase.from('applications').select().eq('applicant_id', user.id).single()
    → if found: wizardState = 'submitted', application = row
    → if not found: wizardState = 'idle'

  idle  → renders entry point → "Start Application" → wizardState = 'active'
  active → renders <ApplicationWizard onComplete={handleComplete} onCancel={...} />
  submitted → renders confirmation with application.id and application.status

ApplicationWizard
  step: 1 | 2 | 3
  track: null | 'sme' | 'project' | 'trade' | 'acquisition'
  fields: {}   ← merged on each step-2 form change

  step 1 → <TrackSelect value={track} onChange={setTrack} onNext={→ step 2} />
  step 2 → <SmeFields|ProjectFields|TradeFields|AcquisitionFields
              value={fields} onChange={setFields}
              onBack={→ step 1} onNext={→ step 3} />
  step 3 → <ReviewSubmit track={track} fields={fields}
              onBack={→ step 2} onSubmit={handleSubmit} />

handleSubmit → supabase.from('applications').insert({
  applicant_id: user.id, track, amount_sought: fields.amountSought,
  currency: 'USD', fields
}) → onComplete(insertedRow)
```

---

## Styling

Follows the existing design system (midnight navy + gold + ivory, Fraunces headings, Inter body). All colours reference CSS custom properties from `tokens.css`. Wizard uses the same card shell pattern as the auth pages (`Auth.module.css`). Track selection cards match the visual style of the `FinancingTracks` section component.

---

## SQL to run in Supabase

```sql
create table public.applications (
  id            uuid      primary key default gen_random_uuid(),
  applicant_id  uuid      not null unique references public.profiles(id) on delete cascade,
  track         text      not null check (track in ('sme', 'project', 'trade', 'acquisition')),
  amount_sought numeric   not null,
  currency      text      not null default 'USD',
  status        text      not null default 'submitted'
                          check (status in ('submitted', 'under_review', 'approved', 'declined')),
  fields        jsonb     not null,
  created_at    timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "Borrowers can read own applications"
  on public.applications for select
  using (applicant_id = auth.uid());

create policy "Borrowers can submit applications"
  on public.applications for insert
  with check (applicant_id = auth.uid());
```
