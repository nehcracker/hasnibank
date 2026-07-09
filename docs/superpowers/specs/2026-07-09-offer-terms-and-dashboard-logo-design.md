# Offer Terms Expansion + Dashboard Logo — Design

**Date:** 2026-07-09
**Status:** Approved by user 2026-07-09
**Context:** Follows Phase C (staff assessment workspace, versioned `offers` table, `OfferTab.jsx`, `OfferLetter.jsx`) and Phase D (SME simplification + dashboard logo wiring, shipped 2026-07-08). Extends the existing `offers.terms` jsonb shape; no schema migration required.

## Problem

The offer builder and borrower-facing letter carry principal, rate, term, frequency, structure, grace, fees, conditions precedent, and covenants — but nothing about what happens if a payment is missed, whether early settlement is allowed, or what collateral/insurance backs the facility. The letter also never shows the borrower their actual per-period instalment amount, even though the amortisation engine already computes it and the staff builder already previews it live. Separately, the dashboard topbar uses a small vector mark (`LogoMark.jsx`) plus styled text, while the marketing Navbar uses a richer raster asset (`src/assets/Logo.png`) — the two don't match.

These are two independent pieces of work covered in one spec because they were requested together; they touch disjoint files and can be implemented (and later executed) separately.

## Decisions taken

| Question | Decision |
|----------|----------|
| Storage | New keys inside the existing `offers.terms` jsonb, matching the pattern already used by `fees[]`/`conditions_precedent[]`/`covenants[]`; no SQL migration |
| Late fee | Staff picks a type per offer: flat amount or percent of the missed instalment |
| Grace before default charges | Yes — staff sets a "days overdue before charges apply" figure |
| Penalty rate | A separate annual percentage applied to the overdue balance, alongside (not instead of) the late fee |
| Prepayment | An allowed yes/no toggle plus an optional penalty percentage of the remaining principal (0 = no penalty) |
| Extra disclosed terms | Security/collateral and insurance requirements only; governing law and dispute resolution are out of scope |
| Security/insurance structure | Single free-text field each, not itemized lists — these read as a paragraph in the letter, not a checklist |
| Instalment amount | Added to `OfferLetter.jsx` only; `OfferTab.jsx` already shows a live preview during editing |
| Default-charge math | Disclosed as terms only. Not simulated into `buildSchedule()` or any "what if you miss a payment" projection |
| Logo scope | Topbar (`Topbar.jsx`) swaps to `Logo.png` at ≥1024px, matching the marketing Navbar exactly. Below 1024px, the topbar keeps the existing `LogoMark` icon-only fallback (unchanged collapse behaviour). `OfferLetter.jsx` and `ExportSummary.jsx` keep their current `LogoMark` usage |

## Design

### 1. Data shape — `offers.terms` jsonb addition

New keys alongside the existing `principal`/`currency`/`annual_rate_pct`/`term_months`/`repayment_frequency`/`structure`/`grace_months`/`balloon_pct`/`fees[]`/`conditions_precedent[]`/`covenants[]`:

```
default_charges: {
  late_fee: { type: 'flat' | 'percent_of_instalment', value: number },
  penalty_rate_pct: number,
  grace_days: number
},
prepayment: {
  allowed: boolean,
  penalty_pct_of_remaining_principal: number   // 0 = no penalty
},
security_description: string,   // free text, may be empty
insurance_requirements: string  // free text, may be empty
```

Update the shape comment on `offers.terms` in `sql/phase3c-assessment.sql` to document these keys (comment-only change, not a schema migration — the column is already `jsonb`).

Considered and rejected:
- A separate `offer_charges` table — unneeded normalization for descriptive terms of the same versioned offer; the existing `offers` versioning (draft → issued → superseded) already covers renegotiation.
- An institution-wide default-charges policy applied to every offer — breaks the per-offer flexibility the `fees[]` pattern already relies on; Hasni brokers across funders whose terms vary per deal.

### 2. Staff builder (`src/pages/admin/tabs/OfferTab.jsx`)

New "Default charges and other terms" section, placed after the existing fees/conditions precedent/covenants inputs:

- **Late fee**: a type toggle (Flat amount / Percent of instalment) plus the corresponding numeric input.
- **Penalty rate**: numeric input, annual percentage applied to the overdue balance.
- **Grace period**: numeric input, days overdue before either charge applies.
- **Prepayment**: an allowed yes/no toggle; when yes, an optional penalty percentage input (0 = no penalty) appears.
- **Security and collateral**: a text area.
- **Insurance requirements**: a text area.

The existing live preview panel (payment amount, total cost via `buildSchedule`) is unchanged — these fields are disclosure only and never feed the schedule calculation.

### 3. Borrower letter (`src/pages/dashboard/OfferLetter.jsx`)

Four additions, each rendered only when the underlying data is present (older offers issued before this change won't have these keys):

**Instalment amount** — a new line near the existing terms summary, phrased per `structure`:
- `amortising`, no grace: "Instalment amount: {currency} {payment} per {frequency}."
- `amortising` with `grace_months > 0`: adds "Interest-only during grace: {currency} {gracePayment} per {frequency} for {grace_months} months."
- `bullet`: "Interest-only instalment: {currency} {payment} per {frequency}. Principal of {currency} {principal} is due in full at maturity."
- `balloon`: "Instalment amount: {currency} {payment} per {frequency}. The final payment includes a balloon of {currency} {balloonAmount}."

Values come from the existing `paymentAmount()`/`buildSchedule()` functions in `src/lib/amortisation.js` — no new calculation logic, just reading the first steady-state period's `payment` (and, for grace, the grace-period payment) the same way `OfferTab`'s live preview and `ActualSchedule.jsx` already do.

**Default charges** — one paragraph combining late fee, penalty rate, and grace days into plain sentences, e.g. "A late fee of 2% of the missed instalment applies to any payment more than 10 days overdue, together with a penalty rate of 3% per annum on the overdue balance." Omitted entirely if `default_charges` is absent.

**Prepayment** — one line: "Early settlement of this facility is permitted, subject to a penalty of 1.5% of the remaining principal." or, when `penalty_pct_of_remaining_principal` is 0, "Early settlement of this facility is permitted with no penalty." or, when `allowed` is false, "Early settlement is not permitted under this offer." Omitted if `prepayment` is absent.

**Security/insurance** — two paragraphs, each rendered only when its string is non-empty.

`print.css` needs no changes: these are plain content blocks in the existing document flow, same as the current conditions-precedent/covenants sections.

### 4. Copy and compliance

Same house rules as the rest of the dashboard: "financing application" never "loan application," no em dashes, facilitation language throughout. Default-charge and prepayment phrasing must read as terms of the facility, not a direct claim by Hasni Bank ("This offer includes...", "A late fee applies...", never "We will charge you...").

### 5. Backward compatibility

Offers issued before this change carry no `default_charges`, `prepayment`, `security_description`, or `insurance_requirements` keys. All four rendering blocks in `OfferLetter.jsx` must check for presence and omit the section rather than render empty/broken markup.

### 6. Logo (`src/layouts/Topbar.jsx` + `Topbar.module.css`)

At ≥1024px, replace the current `LogoMark` + text-wordmark combo with the same `Logo.png` asset the marketing Navbar uses (`src/assets/Logo.png`), sized to roughly 32–36px height to sit comfortably in the 64px topbar. Below 1024px, keep the existing `LogoMark` icon-only rendering unchanged — that collapse behaviour already works and `Logo.png` is a single raster lockup that can't be cropped down to an icon-only view. `OfferLetter.jsx` and `ExportSummary.jsx` are unchanged.

### 7. Tests

- `OfferTab.jsx` has no existing test file; add `src/pages/admin/tabs/__tests__/OfferTab.test.jsx` covering the new fields' presence and the prepayment-penalty input's conditional visibility (hidden when "allowed" is off).
- `OfferLetter` rendering tests: each of the four new blocks renders when its data is present and is omitted when absent (backward-compatibility case); instalment-line phrasing covers all four `structure` values.
- No new pure-function tests needed for the terms themselves — they're descriptive. The instalment number is already covered by the existing `amortisation.test.js` suite.

## Out of scope

- Governing law and dispute resolution terms.
- Simulating missed payments or default scenarios in the amortisation engine or any schedule view.
- Any change to `OfferLetter`/`ExportSummary` logo usage (stays `LogoMark`).
- Institution-wide or per-track default-charge policy (per-offer only, set by staff each time).
