# Loan Application Lifecycle — Design Spec

**Date:** 2026-06-19 (revised 2026-06-20)
**Scope:** Full financing application lifecycle — wizard, status tracking, documents, messaging, fees, and Paystack payment.

---

## Overview

A self-serve financing application system for authenticated borrowers, with a staff underwriting console for processing. Built in five sequential phases, each delivering independently testable software.

| Phase | Deliverable | Primary actor |
|-------|------------|---------------|
| 1 | Application Wizard — 3-step form to submit a financing application | Borrower |
| 2 | Status Dashboard + Admin Console — 9-stage lifecycle tracking | Borrower sees; Staff drives |
| 3 | Document Management — KYC uploads, offer letters, reports | Both |
| 4 | Messaging & Info Requests — threaded conversation per application | Both |
| 5 | Fees & Paystack — configurable fees, popup payment, webhook confirmation | Staff sets; Borrower pays |

---

## Application Lifecycle

Nine ordered stages:

```
Submitted → KYC Verification → Credit Assessment → Funder Matching →
Term Sheet → Offer Issued → Offer Accepted → Fee Payment → Funded
```

**Automatic transitions:**
- Wizard submit → `submitted` (instant)
- Borrower clicks "Accept Offer" → `offer_accepted`
- Paystack webhook confirms all fees paid → `funded`

**Staff-driven transitions:** all other stage advances/reverts, initiated from the admin console.

---

## Phase 1 — Application Wizard

### User flow

1. Borrower logs in → `/dashboard`
2. No existing application → "Start Application" entry point
3. Wizard opens inline (three steps, progress bar across top)
4. **Step 1 — Track Selection:** four cards from `financingTracks` data
5. **Step 2 — Application Details:** track-specific fields, validated before Next
6. **Step 3 — Review & Submit:** read-only summary; Edit goes back; Submit inserts to Supabase
7. On success → dashboard transitions to status view

Borrower can only have one application (enforced by `UNIQUE (applicant_id)` on `applications`).

### Track selection

Four tracks: SME Financing (`sme`), Project Funding (`project`), Trade Finance (`trade`), Acquisition Finance (`acquisition`). Cards rendered from existing `financingTracks` array in `src/data/financingData.js`.

### Application fields by track

**SME Financing:**
| Field | Input |
|-------|-------|
| Business name | Text |
| Business type | Select: Sole Trader / Partnership / Private Limited / Public Company |
| Country of registration | Text |
| Annual revenue | Select: <$100k / $100k–$500k / $500k–$2M / $2M–$10M / >$10M |
| Loan purpose | Select: Working Capital / Equipment Finance / Business Expansion / Trade Finance |
| Amount sought (USD) | Number |
| Collateral available | Radio Yes/No — if Yes, text description |
| Business & use-of-funds description | Textarea |

**Project Funding:**
| Field | Input |
|-------|-------|
| Project name | Text |
| Sector | Select: Infrastructure / Energy / Real Estate / Agriculture / Manufacturing / Mining & Resources |
| Preferred funding structure | Select: Debt Finance / Equity Finance / Joint Ventures / Structured Finance |
| Total project value (USD) | Number |
| Amount sought (USD) | Number |
| Project timeline | Select: <12 months / 1–3 years / 3–5 years / 5+ years |
| Key sponsors / parties | Text |
| Project description | Textarea |

**Trade Finance:**
| Field | Input |
|-------|-------|
| Company name | Text |
| Trade type | Select: Import LC / Export LC / Invoice Discounting / Supply Chain Finance |
| Counterparty country | Text |
| Transaction value (USD) | Number |
| Amount sought (USD) | Number |
| Transaction description | Textarea |

**Acquisition Finance:**
| Field | Input |
|-------|-------|
| Acquiring company name | Text |
| Target company / asset description | Text |
| Deal structure | Select: Leveraged Buyout / Management Buyout / Asset Acquisition / Share Acquisition |
| Total acquisition value (USD) | Number |
| Amount sought (USD) | Number |
| Expected closing timeline | Text |
| Deal description | Textarea |

All fields required. Inline validation on Next — no submission until clean.

### Wizard component architecture

**New files:**
```
src/pages/wizard/
├── ApplicationWizard.jsx       owns step (1|2|3) and form data state
├── Wizard.module.css           progress bar, nav buttons, card shell
└── steps/
    ├── TrackSelect.jsx         step 1
    ├── SmeFields.jsx           step 2a
    ├── ProjectFields.jsx       step 2b
    ├── TradeFields.jsx         step 2c
    ├── AcquisitionFields.jsx   step 2d
    └── ReviewSubmit.jsx        step 3
```

**Modified files:**
- `src/pages/Dashboard.jsx` — manages `wizardState` (`idle` | `active` | `submitted`) and mounts wizard or status view
- `src/pages/Dashboard.module.css` — entry point and confirmation styles

**Data flow:**
```
Dashboard onMount → query applications for current user
  → found: show status view (Phase 2)
  → not found: show entry point → Start → wizardState = 'active'

ApplicationWizard { step, track, fields }
  step 1 → TrackSelect
  step 2 → SmeFields | ProjectFields | TradeFields | AcquisitionFields
  step 3 → ReviewSubmit

handleSubmit → supabase.from('applications').insert({
  applicant_id: user.id, track,
  amount_sought: fields.amountSought,
  currency: 'USD',
  status: 'submitted',
  fields
}) → onComplete(row)
```

---

## Phase 2 — Status Dashboard + Admin Console

### Borrower dashboard

Replaces the confirmation stub. Three sub-components assembled by `Dashboard.jsx`:

**Progress tracker** — horizontal stepper, all 9 stages. Current stage in gold, completed ticked, future muted.

**Timeline feed** — chronological list of `application_events` rows. Each entry shows: actor role (You / Hasni Team), event type label, timestamp, and payload summary (e.g. "Status advanced to Credit Assessment", "Note: additional financials requested").

**Action zone** — context-sensitive, keyed to `applications.status`:
| Stage | Action shown |
|-------|-------------|
| `kyc_verification` | KYC document upload form (Phase 3) |
| `offer_issued` | "View Offer Letter" + "Accept Offer" button |
| `fee_payment` | Outstanding fees list + "Pay Now" button (Phase 5) |
| Any stage with unread staff message | Message thread highlighted with reply box |
| All others | "Your application is being reviewed" |

**Documents panel** — list of all `application_documents` rows for this application; each row shows filename, type, date, and a download link.

**Message thread** — always visible; borrower can message at any stage.

### Admin console

**`/admin` — Application list view**

Table of all applications:
| Column | Value |
|--------|-------|
| Applicant | `profiles.full_name` |
| Track | track label |
| Amount sought | formatted currency |
| Stage | current status badge |
| Submitted | `created_at` date |
| Days open | days since submission |

Clicking a row navigates to `/admin/applications/:id`.

**`/admin/applications/:id` — Detail view**

Two-column layout:

*Left — Application data:*
- Applicant profile block (name, company, country)
- All submitted `fields` jsonb values, rendered by track
- Documents panel — list with download links; "Upload Document" button (type selector: term_sheet / offer_letter / report / other)
- Fee panel — list of `application_fees` rows; "Add Fee" form (fee_type, label, amount, currency)

*Right — Workflow:*
- Stage control: current stage label + dropdown of all 9 stages + optional note textarea + "Update Status" button
- "Flag Info Required" button — posts a staff message to the thread; the borrower's action zone highlights the message thread
- Message thread — full conversation; staff reply box at bottom

### New routes in App.jsx

```
/admin                        → <Admin /> (ProtectedRoute requiredRole="staff")
/admin/applications/:id       → <AdminApplication /> (ProtectedRoute requiredRole="staff")
```

---

## Phase 3 — Document Management

### Storage

Supabase Storage bucket: `application-documents`
Path pattern: `{application_id}/{document_type}/{uuid}-{file_name}`
RLS: borrowers access only `{their_application_id}/*`; staff access all.

### Borrower uploads

Triggered from the action zone during `kyc_verification` stage, and from the message thread when responding to an info request. Accepted types: PDF, JPG, PNG (max 10 MB per file). On successful upload:
1. Insert row to `application_documents` (`document_type: 'kyc'` or `'supporting'`)
2. Insert row to `application_events` (`event_type: 'document'`, payload includes file_name and type)

### Staff uploads

From admin detail view "Upload Document" button. Type options: `term_sheet`, `offer_letter`, `report`, `other`. On upload:
1. Insert to `application_documents`
2. Insert to `application_events`
3. If `document_type = 'offer_letter'`: also advance `applications.status` to `offer_issued`

### Download

Supabase Storage signed URLs (1-hour expiry) generated server-side via a Cloudflare Pages Function (`functions/documents/signed-url.js`) — never expose storage credentials to the client.

---

## Phase 4 — Messaging & Info Requests

### Message thread

Visible on both the borrower dashboard and admin detail view. Rendered from `application_messages` ordered by `created_at` ascending. Each message shows: sender role badge (You / Hasni Team), message body, timestamp.

Reply box at bottom for both parties. On send:
1. Insert to `application_messages`
2. Insert to `application_events` (`event_type: 'message'`)

### Info Required flag

Staff clicks "Flag Info Required" in the admin console:
1. Posts a staff message to the thread with the request body
2. Inserts a `status_change` event with payload `{ note: 'Info required' }`
3. Does NOT change `applications.status` — the stage stays where it is; only the action zone highlights the thread

When borrower replies and staff is satisfied, staff manually advances the stage.

### Unread indicators

`application_messages` rows have a `read_by_borrower` boolean (default `false`) and `read_by_staff` boolean (default `false`). Set to `true` when the respective party opens the thread. The borrower dashboard and admin list view show an unread badge when the other party has unread messages.

---

## Phase 5 — Fees & Paystack

### Fee lifecycle

1. Staff adds a fee from the admin detail view — inserts to `application_fees` with `status: 'pending'`; inserts a `fee` event to `application_events`
2. Borrower's action zone (during `fee_payment` stage) lists all pending fees with type, label, amount, currency
3. Borrower clicks "Pay Now" — calls `POST /api/payment/initialize` with `{ fee_ids: [...] }`
4. Cloudflare Function calls Paystack `POST /transaction/initialize` server-side with: `amount` (sum of fees in kobo/smallest currency unit), `email` (user.email), `currency`, `metadata: { application_id, fee_ids }`; returns `{ access_code, reference }` to client
5. Paystack inline popup opens using `access_code`; borrower completes payment
6. On popup `onSuccess` callback: call `POST /api/payment/verify` with `{ reference }` as a belt-and-suspenders client-side check (does not trust result — webhook is authoritative)
7. Paystack sends webhook to `POST /api/payment/webhook`

### Webhook handler (`functions/payment/webhook.js`)

1. Verify HMAC-SHA512 signature using `PAYSTACK_SECRET_KEY` env var — reject if invalid
2. Handle `charge.success` event only — ignore all others
3. Extract `metadata.application_id` and `metadata.fee_ids` from payload
4. Mark each fee in `fee_ids` as `status: 'paid'`, set `paystack_reference`
5. Insert `payment` event to `application_events`
6. Check if ALL `application_fees` for this `application_id` are `paid` — if yes: advance `applications.status` to `funded`; insert `status_change` event
7. Return `200 OK` — Paystack retries on non-200

### Security

- `PAYSTACK_SECRET_KEY` stored in Cloudflare Pages environment variables only — never in client code
- Webhook signature verified before any DB write
- Fee amounts set by staff only; client never sends an amount to pay — it sends fee IDs; the server resolves the amount from the DB

---

## Data Model

### Base table: `public.applications`

Create this in Phase 1 with the full 9-stage status constraint — no need to alter later:

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
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'staff'));
```

### New tables

```sql
-- Universal timeline
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

-- Documents
create table public.application_documents (
  id              uuid        primary key default gen_random_uuid(),
  application_id  uuid        not null references public.applications(id) on delete cascade,
  uploaded_by     uuid        not null references public.profiles(id),
  uploader_role   text        not null check (uploader_role in ('borrower', 'staff')),
  document_type   text        not null check (document_type in (
                                'kyc', 'supporting', 'term_sheet', 'offer_letter', 'report', 'other'
                              )),
  file_name       text        not null,
  storage_path    text        not null,
  created_at      timestamptz not null default now()
);

-- Messages
create table public.application_messages (
  id                uuid        primary key default gen_random_uuid(),
  application_id    uuid        not null references public.applications(id) on delete cascade,
  author_id         uuid        not null references public.profiles(id),
  author_role       text        not null check (author_role in ('borrower', 'staff')),
  body              text        not null,
  read_by_borrower  boolean     not null default false,
  read_by_staff     boolean     not null default false,
  created_at        timestamptz not null default now()
);

-- Fees
create table public.application_fees (
  id                  uuid        primary key default gen_random_uuid(),
  application_id      uuid        not null references public.applications(id) on delete cascade,
  fee_type            text        not null check (fee_type in ('administration', 'underwriting', 'other')),
  label               text        not null,
  amount              numeric     not null,
  currency            text        not null default 'USD',
  status              text        not null default 'pending'
                                  check (status in ('pending', 'paid')),
  paystack_reference  text,
  created_at          timestamptz not null default now()
);
```

### RLS policies

```sql
-- application_events: borrowers read own; staff read/write all
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
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'staff'));

-- application_documents: same pattern
alter table public.application_documents enable row level security;
create policy "Borrowers read own documents"
  on public.application_documents for select
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));
create policy "Borrowers upload own documents"
  on public.application_documents for insert
  with check (
    uploaded_by = auth.uid()
    and application_id in (
      select id from public.applications where applicant_id = auth.uid()
    )
  );
create policy "Staff full access to documents"
  on public.application_documents for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'staff'));

-- application_messages: same pattern
alter table public.application_messages enable row level security;
create policy "Borrowers read own messages"
  on public.application_messages for select
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));
create policy "Borrowers send own messages"
  on public.application_messages for insert
  with check (
    author_id = auth.uid()
    and application_id in (
      select id from public.applications where applicant_id = auth.uid()
    )
  );
create policy "Borrowers mark own messages read"
  on public.application_messages for update
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));
create policy "Staff full access to messages"
  on public.application_messages for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'staff'));

-- application_fees: borrowers read only; staff full access
alter table public.application_fees enable row level security;
create policy "Borrowers read own fees"
  on public.application_fees for select
  using (application_id in (
    select id from public.applications where applicant_id = auth.uid()
  ));
create policy "Staff full access to fees"
  on public.application_fees for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'staff'));
```

---

## New Cloudflare Pages Functions

```
functions/
├── payment/
│   ├── initialize.js   POST /api/payment/initialize — calls Paystack, returns access_code
│   ├── verify.js       POST /api/payment/verify — client-side belt-and-suspenders check
│   └── webhook.js      POST /api/payment/webhook — Paystack webhook receiver
└── documents/
    └── signed-url.js   POST /api/documents/signed-url — returns Supabase signed URL
```

Environment variables to add to Cloudflare Pages:
- `PAYSTACK_SECRET_KEY` — Paystack secret key (server only, never `VITE_` prefixed)
- `SUPABASE_SERVICE_ROLE_KEY` — for webhook and server-side Supabase writes (never `VITE_` prefixed)

---

## Component Architecture

### New files (Phases 2–5)

```
src/pages/
├── wizard/                     (Phase 1 — as above)
├── dashboard/
│   ├── ApplicationStatus.jsx   progress tracker + timeline + action zone + docs + messages
│   ├── ProgressTracker.jsx     9-stage horizontal stepper
│   ├── Timeline.jsx            application_events feed
│   ├── ActionZone.jsx          context-sensitive panel keyed to status
│   ├── DocumentsPanel.jsx      document list with signed-URL downloads
│   ├── MessageThread.jsx       threaded conversation
│   └── Dashboard.module.css    extended with status view styles
├── admin/
│   ├── AdminList.jsx           /admin — application list table
│   ├── AdminApplication.jsx    /admin/applications/:id — detail view
│   ├── StageControl.jsx        status dropdown + note + update button
│   ├── AdminDocuments.jsx      document list + upload form
│   ├── FeePanel.jsx            fee list + add fee form
│   └── Admin.module.css
```

### Styling

All components follow the existing design system (midnight navy + gold + ivory, Fraunces headings, Inter body). All colours via CSS custom properties from `tokens.css`. No hardcoded hex values anywhere.
