# Offer Terms Expansion + Dashboard Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default charges, prepayment terms, security/insurance disclosure, and an instalment-amount line to the offer builder and borrower letter, and swap the dashboard topbar's small logo mark for the marketing site's full logo asset.

**Architecture:** Extend the existing `offers.terms` jsonb shape (already shared identically by the staff builder `OfferTab.jsx` and the borrower-facing `OfferLetter.jsx`) with four new keys — `default_charges`, `prepayment`, `security_description`, `insurance_requirements` — following the exact pattern already used by `fees[]`/`conditions_precedent[]`/`covenants[]`. No SQL migration: the column is already `jsonb`. Separately, `Topbar.jsx` gains the same `Logo.png` raster asset the marketing `Navbar.jsx` already uses, shown via a CSS breakpoint alongside (not replacing in the DOM) the existing `LogoMark` icon fallback, mirroring how the topbar already CSS-hides its text wordmark at narrow widths.

**Tech Stack:** React 18, Vite, Vitest + React Testing Library, existing `src/lib/amortisation.js` pure functions (unchanged), CSS Modules with design tokens from `src/styles/tokens.css`.

## Global Constraints

- All colors via CSS custom properties (`--color-navy`, `--color-surface`, `--color-gold`, `--color-gold-soft`, `--color-ivory`, `--color-muted`, `--color-border`, `--color-success`, `--color-error`) — never hardcode hex
- `.jsx` extension for all JSX files; `@/` import alias resolves to `src/`
- Currency display via `Intl.NumberFormat('en-US', { style: 'currency', currency })`
- UI copy: "financing application" never "loan application"; no em dashes; facilitation language (offers are terms of the facility, never framed as Hasni Bank directly lending or levying charges itself)
- `npm run build` must pass with zero errors before each commit
- No new SQL migration required for this plan — `offers.terms` is already `jsonb`
- Default charges are disclosed terms only; they are never simulated into `buildSchedule()` or any projection

---

## Task 1: Extend offer terms shape helpers in `OfferTab.jsx` (TDD)

**Files:**
- Modify: `src/pages/admin/tabs/OfferTab.jsx:44-76` (the `formFromTerms`/`termsFromForm` functions)
- Test: Create `src/pages/admin/tabs/__tests__/OfferTab.test.jsx`

**Interfaces:**
- Produces: `formFromTerms(application, terms)` and `termsFromForm(form)`, both now exported, with these additional form keys: `lateFeeType` (`'flat' | 'percent_of_instalment'`), `lateFeeValue` (string), `penaltyRatePct` (string), `graceDays` (string), `prepaymentAllowed` (boolean), `prepaymentPenaltyPct` (string), `securityDescription` (string), `insuranceRequirements` (string). And these additional terms keys: `default_charges: { late_fee: { type, value }, penalty_rate_pct, grace_days }`, `prepayment: { allowed, penalty_pct_of_remaining_principal }`, `security_description`, `insurance_requirements`.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/admin/tabs/__tests__/OfferTab.test.jsx`:

```jsx
import { formFromTerms, termsFromForm } from '../OfferTab'

const APPLICATION = { amount_sought: 250000, currency: 'USD' }

test('formFromTerms defaults default charges, prepayment, and disclosure fields when no terms exist', () => {
  const form = formFromTerms(APPLICATION, null)
  expect(form.lateFeeType).toBe('flat')
  expect(form.lateFeeValue).toBe('')
  expect(form.penaltyRatePct).toBe('')
  expect(form.graceDays).toBe('10')
  expect(form.prepaymentAllowed).toBe(true)
  expect(form.prepaymentPenaltyPct).toBe('0')
  expect(form.securityDescription).toBe('')
  expect(form.insuranceRequirements).toBe('')
})

test('formFromTerms reads default charges, prepayment, and disclosure fields from stored terms', () => {
  const terms = {
    default_charges: {
      late_fee: { type: 'percent_of_instalment', value: 2 },
      penalty_rate_pct: 3,
      grace_days: 15,
    },
    prepayment: { allowed: false, penalty_pct_of_remaining_principal: 1.5 },
    security_description: 'General security agreement over business assets.',
    insurance_requirements: 'Comprehensive trade credit insurance.',
  }
  const form = formFromTerms(APPLICATION, terms)
  expect(form.lateFeeType).toBe('percent_of_instalment')
  expect(form.lateFeeValue).toBe('2')
  expect(form.penaltyRatePct).toBe('3')
  expect(form.graceDays).toBe('15')
  expect(form.prepaymentAllowed).toBe(false)
  expect(form.prepaymentPenaltyPct).toBe('1.5')
  expect(form.securityDescription).toBe('General security agreement over business assets.')
  expect(form.insuranceRequirements).toBe('Comprehensive trade credit insurance.')
})

function baseForm(overrides) {
  return {
    principal: '250000', currency: 'USD', annualRatePct: '12', termMonths: '36',
    frequency: 'monthly', graceMonths: '0', structure: 'amortising', balloonPct: '30',
    fees: [], conditions: [], covenants: [],
    lateFeeType: 'flat', lateFeeValue: '150', penaltyRatePct: '3', graceDays: '10',
    prepaymentAllowed: true, prepaymentPenaltyPct: '1.5',
    securityDescription: 'General security agreement.',
    insuranceRequirements: 'Trade credit insurance required.',
    ...overrides,
  }
}

test('termsFromForm writes default charges, prepayment, and disclosure fields', () => {
  const terms = termsFromForm(baseForm())
  expect(terms.default_charges).toEqual({
    late_fee: { type: 'flat', value: 150 },
    penalty_rate_pct: 3,
    grace_days: 10,
  })
  expect(terms.prepayment).toEqual({ allowed: true, penalty_pct_of_remaining_principal: 1.5 })
  expect(terms.security_description).toBe('General security agreement.')
  expect(terms.insurance_requirements).toBe('Trade credit insurance required.')
})

test('termsFromForm zeroes the prepayment penalty when early settlement is not permitted', () => {
  const terms = termsFromForm(baseForm({ prepaymentAllowed: false }))
  expect(terms.prepayment).toEqual({ allowed: false, penalty_pct_of_remaining_principal: 0 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/tabs/__tests__/OfferTab.test.jsx`
Expected: FAIL — `formFromTerms`/`termsFromForm` are not exported from `../OfferTab` (or, once export is added in isolation, fail on missing new fields).

- [ ] **Step 3: Implement**

In `src/pages/admin/tabs/OfferTab.jsx`, replace lines 44-59 (`formFromTerms`) with:

```js
/** Builder form state from stored offer terms (or application defaults). */
export function formFromTerms(application, terms) {
  return {
    principal: String(terms?.principal ?? application.amount_sought ?? ''),
    currency: terms?.currency ?? application.currency ?? 'USD',
    annualRatePct: String(terms?.annual_rate_pct ?? 12),
    termMonths: String(terms?.term_months ?? 36),
    frequency: terms?.repayment_frequency ?? 'monthly',
    graceMonths: String(terms?.grace_months ?? 0),
    structure: terms?.structure ?? 'amortising',
    balloonPct: String(terms?.balloon_pct ?? 30),
    fees: terms?.fees ?? [],
    conditions: terms?.conditions_precedent ?? [],
    covenants: terms?.covenants ?? [],
    lateFeeType: terms?.default_charges?.late_fee?.type ?? 'flat',
    lateFeeValue: String(terms?.default_charges?.late_fee?.value ?? ''),
    penaltyRatePct: String(terms?.default_charges?.penalty_rate_pct ?? ''),
    graceDays: String(terms?.default_charges?.grace_days ?? 10),
    prepaymentAllowed: terms?.prepayment?.allowed ?? true,
    prepaymentPenaltyPct: String(terms?.prepayment?.penalty_pct_of_remaining_principal ?? 0),
    securityDescription: terms?.security_description ?? '',
    insuranceRequirements: terms?.insurance_requirements ?? '',
  }
}
```

Replace lines 61-76 (`termsFromForm`) with:

```js
/** Stored offer_terms shape from builder form state. */
export function termsFromForm(form) {
  return {
    principal: Number(form.principal),
    currency: form.currency,
    annual_rate_pct: Number(form.annualRatePct),
    term_months: Number(form.termMonths),
    repayment_frequency: form.frequency,
    grace_months: Number(form.graceMonths) || 0,
    structure: form.structure,
    balloon_pct: form.structure === 'balloon' ? Number(form.balloonPct) || 0 : 0,
    fees: form.fees.filter((f) => f.label.trim()),
    conditions_precedent: form.conditions.filter((c) => c.trim()),
    covenants: form.covenants.filter((c) => c.trim()),
    default_charges: {
      late_fee: { type: form.lateFeeType, value: Number(form.lateFeeValue) || 0 },
      penalty_rate_pct: Number(form.penaltyRatePct) || 0,
      grace_days: Number(form.graceDays) || 0,
    },
    prepayment: {
      allowed: form.prepaymentAllowed,
      penalty_pct_of_remaining_principal: form.prepaymentAllowed
        ? Number(form.prepaymentPenaltyPct) || 0
        : 0,
    },
    security_description: form.securityDescription.trim(),
    insurance_requirements: form.insuranceRequirements.trim(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/tabs/__tests__/OfferTab.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/tabs/OfferTab.jsx src/pages/admin/tabs/__tests__/OfferTab.test.jsx
git commit -m "feat: extend offer terms shape with default charges, prepayment, disclosure fields"
```

---

## Task 2: Add the new fields to the offer builder UI

**Files:**
- Modify: `src/pages/admin/tabs/OfferTab.jsx` (JSX only — insert a new form section; add a boolean-checkbox setter)
- Test: Modify `src/pages/admin/tabs/__tests__/OfferTab.test.jsx` (append)

**Interfaces:**
- Consumes: `formFromTerms`/`termsFromForm` and their new keys from Task 1
- Uses existing CSS classes: `styles.formRow`, `styles.fieldLabelSm`, `styles.stageSelect`, `styles.noteField`, `styles.toggleRow` (all already defined in `src/pages/admin/Admin.module.css`) — no new CSS

- [ ] **Step 1: Write the failing tests**

Add `import { render, screen, fireEvent } from '@testing-library/react'` and `import OfferTab from '../OfferTab'` to the **top** of `src/pages/admin/tabs/__tests__/OfferTab.test.jsx`, alongside the existing `import { formFromTerms, termsFromForm } from '../OfferTab'` line (combine into one `import OfferTab, { formFromTerms, termsFromForm } from '../OfferTab'` line). Then append these two tests at the bottom of the file:

```jsx
const OFFER_TAB_APPLICATION = { id: 'app-1', amount_sought: 250000, currency: 'USD' }

test('renders default charges, prepayment, and disclosure fields', () => {
  render(
    <OfferTab application={OFFER_TAB_APPLICATION} offers={[]} user={{ id: 'staff-1' }} onChanged={vi.fn()} />
  )
  expect(screen.getByText('Late fee')).toBeInTheDocument()
  expect(screen.getByText(/penalty rate/i)).toBeInTheDocument()
  expect(screen.getByText(/grace days before charges apply/i)).toBeInTheDocument()
  expect(screen.getByText('Early settlement permitted')).toBeInTheDocument()
  expect(screen.getByText('Security and collateral')).toBeInTheDocument()
  expect(screen.getByText('Insurance requirements')).toBeInTheDocument()
})

test('prepayment penalty input is hidden once early settlement is switched off', () => {
  render(
    <OfferTab application={OFFER_TAB_APPLICATION} offers={[]} user={{ id: 'staff-1' }} onChanged={vi.fn()} />
  )
  expect(screen.getByText(/prepayment penalty % of remaining principal/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /early settlement permitted/i }))
  expect(screen.queryByText(/prepayment penalty % of remaining principal/i)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/tabs/__tests__/OfferTab.test.jsx`
Expected: FAIL — none of the new field labels exist in the rendered output yet.

- [ ] **Step 3: Implement**

In `src/pages/admin/tabs/OfferTab.jsx`, insert this new block immediately after the closing `</div>` of the `ListEditor` `formRow` (the block containing "Conditions precedent" and "Covenants", ending just before `{preview && (`):

```jsx
        <div className={styles.formRow} style={{ marginTop: 'var(--space-4)' }}>
          <div>
            <div className={styles.fieldLabelSm}>Late fee</div>
            <select className={styles.stageSelect} value={form.lateFeeType} onChange={set('lateFeeType')}>
              <option value="flat">Flat amount</option>
              <option value="percent_of_instalment">Percent of instalment</option>
            </select>
          </div>
          <div>
            <div className={styles.fieldLabelSm}>
              {form.lateFeeType === 'flat' ? 'Late fee amount' : 'Late fee %'}
            </div>
            <input
              type="number"
              step="0.1"
              className={styles.stageSelect}
              value={form.lateFeeValue}
              onChange={set('lateFeeValue')}
            />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Penalty rate % (per annum, on overdue balance)</div>
            <input
              type="number"
              step="0.1"
              className={styles.stageSelect}
              value={form.penaltyRatePct}
              onChange={set('penaltyRatePct')}
            />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Grace days before charges apply</div>
            <input
              type="number"
              min="0"
              className={styles.stageSelect}
              value={form.graceDays}
              onChange={set('graceDays')}
            />
          </div>
        </div>

        <div className={styles.formRow} style={{ marginTop: 'var(--space-4)' }}>
          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={form.prepaymentAllowed}
              onChange={(e) => setForm((prev) => ({ ...prev, prepaymentAllowed: e.target.checked }))}
            />
            Early settlement permitted
          </label>
          {form.prepaymentAllowed && (
            <div>
              <div className={styles.fieldLabelSm}>Prepayment penalty % of remaining principal</div>
              <input
                type="number"
                step="0.1"
                min="0"
                className={styles.stageSelect}
                value={form.prepaymentPenaltyPct}
                onChange={set('prepaymentPenaltyPct')}
              />
            </div>
          )}
        </div>

        <div className={styles.formRow} style={{ marginTop: 'var(--space-4)' }}>
          <div>
            <div className={styles.fieldLabelSm}>Security and collateral</div>
            <textarea
              className={styles.noteField}
              value={form.securityDescription}
              onChange={set('securityDescription')}
              placeholder="e.g. General security agreement over business assets"
            />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Insurance requirements</div>
            <textarea
              className={styles.noteField}
              value={form.insuranceRequirements}
              onChange={set('insuranceRequirements')}
              placeholder="e.g. Comprehensive trade credit insurance naming Hasni Bank as loss payee"
            />
          </div>
        </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/tabs/__tests__/OfferTab.test.jsx`
Expected: PASS (6 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/tabs/OfferTab.jsx src/pages/admin/tabs/__tests__/OfferTab.test.jsx
git commit -m "feat: default charges, prepayment, and disclosure fields in the offer builder"
```

---

## Task 3: Document the new terms shape in the SQL comment

**Files:**
- Modify: `sql/phase3c-assessment.sql:180`

No test — this is a comment-only documentation change; the column is already `jsonb` and needs no migration.

- [ ] **Step 1: Update the comment**

Change line 180 from:

```sql
  terms          jsonb not null, -- offer_terms shape + fees[], conditions_precedent[], covenants[]
```

to:

```sql
  terms          jsonb not null, -- offer_terms shape + fees[], conditions_precedent[], covenants[],
                                  -- default_charges{late_fee{type,value},penalty_rate_pct,grace_days},
                                  -- prepayment{allowed,penalty_pct_of_remaining_principal},
                                  -- security_description, insurance_requirements
```

- [ ] **Step 2: Commit**

```bash
git add sql/phase3c-assessment.sql
git commit -m "docs: document default charges and prepayment keys on offers.terms"
```

---

## Task 4: Instalment, default-charge, and prepayment description helpers in `OfferLetter.jsx` (TDD)

**Files:**
- Modify: `src/pages/dashboard/OfferLetter.jsx:1-36` (add an import and three exported pure functions)
- Test: Create `src/pages/dashboard/__tests__/OfferLetter.test.jsx`

**Interfaces:**
- Consumes: `buildSchedule` from `src/lib/amortisation.js` (existing, unchanged signature)
- Produces: `instalmentDetails(terms)` returning `{ kind: 'amortising'|'balloon'|'bullet', instalment, graceInstalment, graceMonths, balloonAmount, principalAtMaturity } | null`; `instalmentLine(terms)` returning a display string or `null`; `describeDefaultCharges(defaultCharges, currency)` returning a string or `null`; `describePrepayment(prepayment)` returning a string or `null`. Task 5 renders all of these.

- [ ] **Step 1: Write the failing tests**

Create `src/pages/dashboard/__tests__/OfferLetter.test.jsx`:

```jsx
import {
  instalmentDetails,
  instalmentLine,
  describeDefaultCharges,
  describePrepayment,
} from '../OfferLetter'

const AMORTISING_TERMS = {
  principal: 100000,
  currency: 'USD',
  annual_rate_pct: 12,
  term_months: 12,
  repayment_frequency: 'monthly',
  structure: 'amortising',
  grace_months: 0,
  balloon_pct: 0,
}

test('instalmentLine reports the periodic payment for a plain amortising offer', () => {
  expect(instalmentLine(AMORTISING_TERMS)).toBe('Instalment amount: $8,884.88 per month.')
})

test('instalmentLine adds the grace-period instalment for an amortising offer with grace', () => {
  const terms = { ...AMORTISING_TERMS, term_months: 15, grace_months: 3 }
  const details = instalmentDetails(terms)
  expect(details.kind).toBe('amortising')
  expect(details.graceInstalment).not.toBeNull()
  const line = instalmentLine(terms)
  expect(line).toMatch(/^Instalment amount: \$[\d,.]+ per month\./)
  expect(line).toMatch(/Interest-only during the first 3 months: \$[\d,.]+ per month\./)
})

test('instalmentLine describes a bullet structure as interest-only with principal at maturity', () => {
  const terms = {
    principal: 50000, currency: 'USD', annual_rate_pct: 10, term_months: 12,
    repayment_frequency: 'monthly', structure: 'bullet', grace_months: 0, balloon_pct: 0,
  }
  expect(instalmentLine(terms)).toBe(
    'Interest-only instalment: $416.67 per month. Principal of $50,000.00 is due in full at maturity.'
  )
})

test('instalmentLine notes the final balloon payment for a balloon structure', () => {
  const terms = { ...AMORTISING_TERMS, term_months: 36, balloon_pct: 30 }
  const line = instalmentLine(terms)
  expect(line).toMatch(/^Instalment amount: \$[\d,.]+ per month\./)
  expect(line).toMatch(/The final payment includes a balloon of \$30,000\.00\./)
})

test('instalmentLine returns null when terms are incomplete', () => {
  expect(instalmentLine({ currency: 'USD' })).toBeNull()
})

test('describeDefaultCharges combines a flat late fee and a penalty rate', () => {
  const charges = {
    late_fee: { type: 'flat', value: 150 },
    penalty_rate_pct: 3,
    grace_days: 10,
  }
  expect(describeDefaultCharges(charges, 'USD')).toBe(
    'Any payment more than 10 days overdue is subject to a late fee of $150.00 and a penalty rate of 3% per annum on the overdue balance.'
  )
})

test('describeDefaultCharges reports a percent-of-instalment late fee alone', () => {
  const charges = { late_fee: { type: 'percent_of_instalment', value: 2 }, penalty_rate_pct: 0, grace_days: 5 }
  expect(describeDefaultCharges(charges, 'USD')).toBe(
    'Any payment more than 5 days overdue is subject to a late fee of 2% of the missed instalment.'
  )
})

test('describeDefaultCharges returns null when neither charge is set', () => {
  const charges = { late_fee: { type: 'flat', value: 0 }, penalty_rate_pct: 0, grace_days: 10 }
  expect(describeDefaultCharges(charges, 'USD')).toBeNull()
  expect(describeDefaultCharges(null, 'USD')).toBeNull()
})

test('describePrepayment reports the penalty percentage when one applies', () => {
  expect(describePrepayment({ allowed: true, penalty_pct_of_remaining_principal: 1.5 })).toBe(
    'Early settlement of this facility is permitted, subject to a penalty of 1.5% of the remaining principal.'
  )
})

test('describePrepayment reports no penalty when the percentage is zero', () => {
  expect(describePrepayment({ allowed: true, penalty_pct_of_remaining_principal: 0 })).toBe(
    'Early settlement of this facility is permitted with no penalty.'
  )
})

test('describePrepayment reports early settlement is not permitted', () => {
  expect(describePrepayment({ allowed: false, penalty_pct_of_remaining_principal: 0 })).toBe(
    'Early settlement is not permitted under this offer.'
  )
})

test('describePrepayment returns null when absent', () => {
  expect(describePrepayment(null)).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: FAIL — `instalmentDetails`, `instalmentLine`, `describeDefaultCharges`, `describePrepayment` are not exported from `../OfferLetter`.

- [ ] **Step 3: Implement**

In `src/pages/dashboard/OfferLetter.jsx`, add the import at line 4 (alongside the existing `supabase` import):

```js
import { buildSchedule } from '@/lib/amortisation'
```

Add this constant after the existing `FEE_TIMING_LABELS` block (after line 25):

```js
const PER_PERIOD_LABELS = {
  monthly: 'month', quarterly: 'quarter',
  semiannual: 'six months', annual: 'year',
}
```

Add these three functions after the existing `longDate` function (after line 36), before the component:

```js
/**
 * Derive the borrower-facing instalment figures from offer terms, reusing
 * the same amortisation engine the staff builder previews with.
 */
export function instalmentDetails(terms) {
  const principal = Number(terms.principal)
  const annualRatePct = Number(terms.annual_rate_pct)
  const termMonths = Number(terms.term_months)
  if (!principal || !annualRatePct || !termMonths) return null

  let schedule
  try {
    schedule = buildSchedule({
      principal,
      annualRatePct,
      termMonths,
      frequency: terms.repayment_frequency,
      graceMonths: Number(terms.grace_months) || 0,
      structure: terms.structure,
      balloonPct: Number(terms.balloon_pct) || 0,
    })
  } catch {
    return null
  }

  if (terms.structure === 'bullet') {
    return { kind: 'bullet', instalment: schedule[0].payment, principalAtMaturity: principal }
  }

  const graceMonths = Number(terms.grace_months) || 0
  const graceRow = graceMonths > 0 ? schedule.find((row) => row.principal === 0) : null
  const repaymentRow = schedule.find((row) => row.principal > 0) ?? schedule[0]
  const balloonAmount = Number(terms.balloon_pct) > 0
    ? (Number(terms.balloon_pct) / 100) * principal
    : 0

  return {
    kind: balloonAmount > 0 ? 'balloon' : 'amortising',
    instalment: repaymentRow.payment,
    graceInstalment: graceRow?.payment ?? null,
    graceMonths,
    balloonAmount,
  }
}

/** Borrower-facing instalment sentence, or null if terms are incomplete. */
export function instalmentLine(terms) {
  const details = instalmentDetails(terms)
  if (!details) return null
  const currency = terms.currency
  const per = PER_PERIOD_LABELS[terms.repayment_frequency] ?? terms.repayment_frequency

  if (details.kind === 'bullet') {
    return `Interest-only instalment: ${money(details.instalment, currency)} per ${per}. Principal of ${money(details.principalAtMaturity, currency)} is due in full at maturity.`
  }

  let line = `Instalment amount: ${money(details.instalment, currency)} per ${per}.`
  if (details.graceInstalment != null) {
    line += ` Interest-only during the first ${details.graceMonths} months: ${money(details.graceInstalment, currency)} per ${per}.`
  }
  if (details.kind === 'balloon') {
    line += ` The final payment includes a balloon of ${money(details.balloonAmount, currency)}.`
  }
  return line
}

/** Plain-sentence default-charges disclosure, or null if none are set. */
export function describeDefaultCharges(defaultCharges, currency) {
  if (!defaultCharges) return null
  const { late_fee: lateFee, penalty_rate_pct: penaltyRatePct, grace_days: graceDays } = defaultCharges
  const hasFee = Boolean(lateFee?.value)
  const hasPenalty = Boolean(penaltyRatePct)
  if (!hasFee && !hasPenalty) return null

  const feeText = hasFee
    ? (lateFee.type === 'percent_of_instalment'
        ? `a late fee of ${lateFee.value}% of the missed instalment`
        : `a late fee of ${money(lateFee.value, currency)}`)
    : null
  const penaltyText = hasPenalty
    ? `a penalty rate of ${penaltyRatePct}% per annum on the overdue balance`
    : null

  const charges = [feeText, penaltyText].filter(Boolean).join(' and ')
  return `Any payment more than ${graceDays || 0} days overdue is subject to ${charges}.`
}

/** Plain-sentence prepayment disclosure, or null if not set. */
export function describePrepayment(prepayment) {
  if (!prepayment) return null
  if (!prepayment.allowed) return 'Early settlement is not permitted under this offer.'
  const penalty = Number(prepayment.penalty_pct_of_remaining_principal) || 0
  if (penalty > 0) {
    return `Early settlement of this facility is permitted, subject to a penalty of ${penalty}% of the remaining principal.`
  }
  return 'Early settlement of this facility is permitted with no penalty.'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/OfferLetter.jsx src/pages/dashboard/__tests__/OfferLetter.test.jsx
git commit -m "feat: instalment amount, default charges, and prepayment description helpers for the offer letter"
```

---

## Task 5: Render the new sections on the offer letter

**Files:**
- Modify: `src/pages/dashboard/OfferLetter.jsx` (JSX only — add one paragraph and four conditional sections)
- Test: Modify `src/pages/dashboard/__tests__/OfferLetter.test.jsx` (append)

**Interfaces:**
- Consumes: `instalmentLine`, `describeDefaultCharges`, `describePrepayment` from Task 4; `terms.security_description`, `terms.insurance_requirements` from the offer's stored terms

- [ ] **Step 1: Write the failing tests**

Keep the existing first line of `src/pages/dashboard/__tests__/OfferLetter.test.jsx` (`import { instalmentDetails, instalmentLine, describeDefaultCharges, describePrepayment } from '../OfferLetter'`) and the Task 4 tests below it exactly as they are. Insert the block below **above** that existing import line, then append the three new tests at the bottom of the file (after the Task 4 tests).

Insert at the very top of the file, before the existing import:

```jsx
import { render, screen } from '@testing-library/react'

const { APPLICATION, mockSupabase, setOffer } = vi.hoisted(() => {
  const APPLICATION = { id: 'app-1', track: 'sme' }
  let currentOffer = null
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: currentOffer, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  }
  return { APPLICATION, mockSupabase, setOffer: (o) => { currentOffer = o } }
})

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { client_ref: 'HB-2026-00100', full_name: 'Aminata Koroma', company_name: 'Solari AgroExports Ltd' },
  }),
}))
vi.mock('@/hooks/useApplication', () => ({
  useApplication: () => ({ application: APPLICATION, loading: false }),
}))

import OfferLetter from '../OfferLetter'

const BASE_TERMS = {
  principal: 100000, currency: 'USD', annual_rate_pct: 12, term_months: 12,
  repayment_frequency: 'monthly', structure: 'amortising', grace_months: 0, balloon_pct: 0,
  fees: [], conditions_precedent: [], covenants: [],
}

test('shows the instalment amount for the active offer', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  expect(await screen.findByText('Instalment amount: $8,884.88 per month.')).toBeInTheDocument()
})

test('omits default charges, prepayment, and disclosure sections for offers issued before this change', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  expect(screen.queryByText('Default charges')).not.toBeInTheDocument()
  expect(screen.queryByText('Prepayment')).not.toBeInTheDocument()
  expect(screen.queryByText('Security and collateral')).not.toBeInTheDocument()
  expect(screen.queryByText('Insurance requirements')).not.toBeInTheDocument()
})

test('renders default charges, prepayment, and disclosure sections when present', async () => {
  setOffer({
    id: 'offer-1',
    version: 1,
    status: 'issued',
    terms: {
      ...BASE_TERMS,
      default_charges: { late_fee: { type: 'flat', value: 150 }, penalty_rate_pct: 3, grace_days: 10 },
      prepayment: { allowed: true, penalty_pct_of_remaining_principal: 1.5 },
      security_description: 'General security agreement over business assets.',
      insurance_requirements: 'Comprehensive trade credit insurance.',
    },
  })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  expect(screen.getByText('Default charges')).toBeInTheDocument()
  expect(screen.getByText(/a late fee of \$150\.00 and a penalty rate of 3% per annum/)).toBeInTheDocument()
  expect(screen.getByText('Prepayment')).toBeInTheDocument()
  expect(screen.getByText(/subject to a penalty of 1\.5% of the remaining principal/)).toBeInTheDocument()
  expect(screen.getByText('Security and collateral')).toBeInTheDocument()
  expect(screen.getByText('General security agreement over business assets.')).toBeInTheDocument()
  expect(screen.getByText('Insurance requirements')).toBeInTheDocument()
  expect(screen.getByText('Comprehensive trade credit insurance.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: FAIL on the three new render tests — none of the new markup exists yet.

- [ ] **Step 3: Implement**

In `src/pages/dashboard/OfferLetter.jsx`, inside the "Terms" `<section>` (the one with `<h2 className={styles.sectionTitle}>Terms</h2>`), immediately after the `{termRows.map(...)}` block, add:

```jsx
          {instalmentLine(terms) && (
            <p className={styles.fieldValue} style={{ marginTop: 'var(--space-3)' }}>
              {instalmentLine(terms)}
            </p>
          )}
```

Then, immediately after the Covenants `section` block (after its closing `)}`) and before the `{offer.status === 'accepted' && (` block, add:

```jsx
        {describeDefaultCharges(terms.default_charges, terms.currency) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Default charges</h2>
            <p className={styles.fieldValue}>
              {describeDefaultCharges(terms.default_charges, terms.currency)}
            </p>
          </section>
        )}

        {describePrepayment(terms.prepayment) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Prepayment</h2>
            <p className={styles.fieldValue}>{describePrepayment(terms.prepayment)}</p>
          </section>
        )}

        {terms.security_description && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Security and collateral</h2>
            <p className={styles.fieldValue}>{terms.security_description}</p>
          </section>
        )}

        {terms.insurance_requirements && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Insurance requirements</h2>
            <p className={styles.fieldValue}>{terms.insurance_requirements}</p>
          </section>
        )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: PASS (14 tests total)

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/OfferLetter.jsx src/pages/dashboard/__tests__/OfferLetter.test.jsx
git commit -m "feat: render instalment amount, default charges, prepayment, and disclosure sections on the offer letter"
```

---

## Task 6: Swap the dashboard topbar logo to the marketing site's asset

**Files:**
- Modify: `src/layouts/Topbar.jsx:1-89` (add the `Logo.png` import and image element)
- Modify: `src/layouts/Topbar.module.css:40-82` (add the `.brandFull` rule and the wide-screen breakpoint)
- Test: Create `src/layouts/__tests__/Topbar.test.jsx`

**Interfaces:**
- Consumes: `@/assets/Logo.png` (existing asset, already used by `src/components/layout/Navbar.jsx`)
- No changes to `Topbar`'s own props (`{ onMenuToggle }`) or to `OfferLetter.jsx`/`ExportSummary.jsx`, which keep `LogoMark` unchanged per the approved design

- [ ] **Step 1: Write the failing test**

Create `src/layouts/__tests__/Topbar.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { full_name: 'Aminata Koroma', company_name: 'Solari AgroExports Ltd', client_ref: 'HB-2026-00100' },
  }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
vi.mock('@/components/dashboard/ClientIdBadge', () => ({ default: () => null }))
vi.mock('@/components/dashboard/NotificationsBell', () => ({ default: () => null }))

import Topbar from '../Topbar'

test('renders the marketing site logo asset alongside the existing icon mark', () => {
  render(
    <MemoryRouter>
      <Topbar onMenuToggle={() => {}} />
    </MemoryRouter>
  )
  // The full lockup: shown at wide widths, hidden below 1024px by CSS.
  expect(screen.getByAltText('Hasni Bank')).toBeInTheDocument()
  // The icon-only mark: kept in the DOM as the sub-1024px fallback.
  expect(screen.getByText('HASNI')).toBeInTheDocument()
  expect(screen.getByText('BANK')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/layouts/__tests__/Topbar.test.jsx`
Expected: FAIL — `screen.getByAltText('Hasni Bank')` finds nothing, since no `<img>` exists in `Topbar.jsx` yet.

- [ ] **Step 3: Implement**

In `src/layouts/Topbar.jsx`, add the import after the existing `LogoMark` import (line 7):

```js
import logoSrc from '@/assets/Logo.png'
```

Replace the "Brand mark" block (lines 82-89):

```jsx
      {/* Brand mark */}
      <Link to="/dashboard" className={styles.brand}>
        <LogoMark size={32} className={styles.brandMark} />
        <span className={styles.brandWordmark}>
          <span className={styles.brandHasni}>HASNI</span>
          <span className={styles.brandBank}>BANK</span>
        </span>
      </Link>
```

with:

```jsx
      {/* Brand mark */}
      <Link to="/dashboard" className={styles.brand}>
        <LogoMark size={32} className={styles.brandMark} />
        <span className={styles.brandWordmark}>
          <span className={styles.brandHasni}>HASNI</span>
          <span className={styles.brandBank}>BANK</span>
        </span>
        <img src={logoSrc} alt="Hasni Bank" className={styles.brandFull} />
      </Link>
```

In `src/layouts/Topbar.module.css`, replace the existing collapse rule (lines 76-82):

```css
/* Collapse to mark-only at the sidebar's icon-rail breakpoint so the
   topbar echoes the same "icons only" density as the collapsed sidebar. */
@media (max-width: 1024px) {
  .brandWordmark {
    display: none;
  }
}
```

with:

```css
.brandFull {
  display: none;
  height: 32px;
  width: auto;
}

/* Below the sidebar's icon-rail breakpoint, keep the same icon-only mark
   density the collapsed sidebar already uses. At and above it, show the
   marketing site's full logo lockup instead of the icon + text wordmark. */
@media (max-width: 1024px) {
  .brandWordmark {
    display: none;
  }
}

@media (min-width: 1025px) {
  .brandMark,
  .brandWordmark {
    display: none;
  }

  .brandFull {
    display: block;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/layouts/__tests__/Topbar.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Topbar.jsx src/layouts/Topbar.module.css src/layouts/__tests__/Topbar.test.jsx
git commit -m "feat: dashboard topbar uses the marketing site's logo asset at wide widths"
```

---

## Task 7: Final verification

- [ ] **Step 1:** Run the full suite

Run: `npx vitest run`
Expected: All suites pass, including the 6 new/changed test files from Tasks 1-6.

- [ ] **Step 2:** Run the production build

Run: `npm run build`
Expected: Zero errors (the pre-existing chunk-size warning is not a failure).

- [ ] **Step 3:** Copy sweep

Read through every string added in Tasks 1-6 (offer builder labels, offer letter sentences) and confirm: no em dashes, "financing application" phrasing where applicable, no direct-lending claims (default charges and prepayment terms are described as terms of the offer, never as Hasni Bank itself levying or waiving them).

- [ ] **Step 4:** Manual print-preview check

Open `/dashboard/offer-letter` (or the equivalent route) for an application with an issued offer carrying the new fields, and use the browser print preview to confirm the four new sections and the instalment line appear in the printed layout, matching the existing conditions/covenants sections' styling.

Do not push — confirm with the user before running `git push`, consistent with this project's working convention.
