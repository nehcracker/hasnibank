# Email / Phone Confirmation Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Confirm email" / "Confirm phone" double-entry fields to the Contact page, the dashboard SME `ApplicationForm`, and `SignupProfile`, so a typo can no longer become an applicant's saved (and unreachable) contact detail.

**Architecture:** Pure exact-match confirmation, no new backend/OTP/SMS integration. The dashboard form persists its confirm values into the draft's `fields` jsonb (matching how every other field on that form already works) and the match check lives in the existing `canSubmit()` gate in `applicationState.js`. The Contact page and SignupProfile keep their confirm values as local, un-persisted component state — they exist purely to block submission on mismatch, never sent to a server.

**Tech Stack:** React 19, Vite, Vitest + React Testing Library, CSS Modules with tokens from `src/styles/tokens.css`, Cloudflare Pages Functions (`functions/contact.js`).

**Design doc:** `docs/superpowers/specs/2026-07-09-contact-confirmation-fields-design.md`

## Global Constraints

- All colors via CSS custom properties from `src/styles/tokens.css` — do not introduce new hardcoded hex values (existing hardcoded `#e05252` in `Contact.module.css` is pre-existing and out of scope to fix; reuse its existing classes as-is rather than adding new hex)
- File extension `.jsx` for any file containing JSX
- Import alias `@/` → `src/`
- `npm run build` must pass with zero errors before each commit
- UI copy: premium/institutional tone, concise, no em dashes
- Server-side: never trust client input — `functions/contact.js` validates required fields itself, independent of client-side `validate()`
- Test runner: `npx vitest run <path>` for a single file, `npm run test:run` for the full suite

---

## File Map

| File | Change |
|------|--------|
| `src/lib/applicationState.js` | `canSubmit()` gains email/phone match check; `REQUIRED_FIELDS_SME` gains `'confirmEmail'` |
| `src/lib/__tests__/applicationState.test.js` | New cases for confirm-field matching |
| `src/data/initialFields.js` | `INITIAL_FIELDS.sme` gains `confirmEmail`, `confirmPhone` defaults |
| `src/pages/dashboard/ApplicationForm.jsx` | New Confirm email / Confirm phone inputs in the Contact group, with live inline mismatch text |
| `src/pages/dashboard/ApplicationForm.module.css` | New `.fieldError` rule |
| `src/pages/dashboard/__tests__/ApplicationForm.test.jsx` | Fix two now-ambiguous `getByLabelText(/email/i)` queries; add mismatch-display tests |
| `src/pages/Contact.jsx` | New `phone`, `confirmEmail`, `confirmPhone` fields; `validate()` match checks; confirm fields stripped before POST |
| `functions/contact.js` | `phone` added to required-field validation and the Resend email body |
| `src/pages/auth/SignupProfile.jsx` | New Confirm phone field; `handleSubmit` blocks on mismatch via the existing error banner |

No SQL migrations — every new value lives in existing jsonb columns or local component state.

---

### Task 1: `canSubmit()` match check in `applicationState.js`

**Files:**
- Modify: `src/lib/applicationState.js:26-30` (`REQUIRED_FIELDS_SME`), `:80-86` (`canSubmit`)
- Test: `src/lib/__tests__/applicationState.test.js`

**Interfaces:**
- Consumes: nothing new — `canSubmit(app)` keeps its existing `(app) => boolean` signature, still reads only `app.fields`/`app.track`/`app.business_profile`
- Produces: `canSubmit()` now also returns `false` when `fields.confirmEmail !== fields.email`, or when `fields.phone` is filled but `fields.confirmPhone !== fields.phone`. `REQUIRED_FIELDS_SME` now includes `'confirmEmail'` (11 entries instead of 10). Both are consumed by `ActionCard` (via `MyApplication.jsx`'s `canSubmitNow = canSubmit(application)`) with no signature change on that side.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/__tests__/applicationState.test.js`. First, extend the `FULL_SME_FIELDS` fixture (near the top of the file) to include matching confirm values:

```js
const FULL_SME_FIELDS = {
  businessName: 'Acme Traders', registrationNumber: 'RC-1234',
  businessType: 'private_limited', countryOfRegistration: 'Kenya',
  timeInOperation: '4', sector: 'Retail', employees: '12',
  email: 'founder@acme.test', confirmEmail: 'founder@acme.test',
  phone: '', confirmPhone: '', address: '',
  monthlySales: '85000', existingDebt: 'no',
  loanPurpose: 'working_capital', amountSought: '250000',
  description: 'Stock financing for the next quarter.',
}
```

Update the existing `REQUIRED_FIELDS_SME` test to expect the new 11th entry:

```js
describe('REQUIRED_FIELDS_SME', () => {
  test('lists the eleven required intake keys, contact email and its confirmation included', () => {
    expect(REQUIRED_FIELDS_SME).toEqual([
      'businessName', 'registrationNumber', 'businessType', 'countryOfRegistration',
      'timeInOperation', 'monthlySales', 'loanPurpose', 'amountSought',
      'description', 'email', 'confirmEmail',
    ])
  })
})
```

Add new cases inside the existing `describe('canSubmit — SME', ...)` block, after the `'phone and address are not required'` test:

```js
  test('false when confirmEmail does not match email', () => {
    expect(
      canSubmit(app({ fields: { ...FULL_SME_FIELDS, confirmEmail: 'typo@acme.test' } }))
    ).toBe(false)
  })

  test('false when phone is filled but confirmPhone does not match', () => {
    expect(
      canSubmit(
        app({
          fields: { ...FULL_SME_FIELDS, phone: '+254700000000', confirmPhone: '+254700000001' },
        })
      )
    ).toBe(false)
  })

  test('true when phone and confirmPhone match', () => {
    expect(
      canSubmit(
        app({
          fields: { ...FULL_SME_FIELDS, phone: '+254700000000', confirmPhone: '+254700000000' },
        })
      )
    ).toBe(true)
  })

  test('true when phone is blank, regardless of confirmPhone', () => {
    expect(
      canSubmit(app({ fields: { ...FULL_SME_FIELDS, phone: '', confirmPhone: '' } }))
    ).toBe(true)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/applicationState.test.js`
Expected: FAIL — the `REQUIRED_FIELDS_SME` test fails (array has 10 entries, not 11), and the confirmEmail/confirmPhone `canSubmit` cases fail because `canSubmit()` doesn't check them yet.

- [ ] **Step 3: Implement**

In `src/lib/applicationState.js`, update `REQUIRED_FIELDS_SME` (currently lines 26-30):

```js
export const REQUIRED_FIELDS_SME = [
  'businessName', 'registrationNumber', 'businessType', 'countryOfRegistration',
  'timeInOperation', 'monthlySales', 'loanPurpose', 'amountSought',
  'description', 'email', 'confirmEmail',
]
```

Update its doc comment immediately above (currently `/** Required \`fields\` jsonb keys ... phone, and address are optional. */`) to:

```js
/**
 * Required `fields` jsonb keys for the SME grouped application form.
 * Business, financing-request, and contact-email (plus its confirmation)
 * fields are required; sector, employees, phone, and address are optional.
 * Phone confirmation is conditionally required — see canSubmit().
 */
```

Update `canSubmit()` (currently lines 80-86):

```js
/**
 * Submission gate. SME: every REQUIRED_FIELDS_SME key present (non-blank) in
 * `fields`, confirmEmail matching email, and — if phone is filled —
 * confirmPhone matching phone. No self-check dependency, no document
 * dependency. Other tracks: the business profile fully complete, also with
 * no self-check requirement.
 */
export function canSubmit(app) {
  if (app?.track === 'sme') {
    const fields = app?.fields ?? {}
    const requiredOk = REQUIRED_FIELDS_SME.every((key) => filled(fields[key]))
    const emailMatches = fields.confirmEmail === fields.email
    const phoneMatches = !filled(fields.phone) || fields.confirmPhone === fields.phone
    return requiredOk && emailMatches && phoneMatches
  }
  return profileCompletion(app?.business_profile, app?.required_sections) === 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/applicationState.test.js`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/applicationState.js src/lib/__tests__/applicationState.test.js
git commit -m "feat: gate SME application submit on email/phone confirmation match"
```

---

### Task 2: Confirm email / Confirm phone fields in `ApplicationForm.jsx`

**Files:**
- Modify: `src/data/initialFields.js:14-20` (`INITIAL_FIELDS.sme`)
- Modify: `src/pages/dashboard/ApplicationForm.jsx:177-204` (Contact `FormGroup`)
- Modify: `src/pages/dashboard/ApplicationForm.module.css` (append `.fieldError`)
- Modify: `src/pages/dashboard/__tests__/ApplicationForm.test.jsx:57` and `:67` (disambiguate label queries), plus new tests

**Interfaces:**
- Consumes: `set(key, value)` (existing local setter in `ApplicationForm.jsx`, unchanged signature) to write `confirmEmail`/`confirmPhone` into the same `fields` state object Task 1's `canSubmit()` reads
- Produces: two new `fields` jsonb keys (`confirmEmail`, `confirmPhone`) that autosave exactly like every existing field on this form

- [ ] **Step 1: Write the failing tests**

First, fix the two existing ambiguous queries in `src/pages/dashboard/__tests__/ApplicationForm.test.jsx` — `getByLabelText(/email/i)` will match both "Email" and the new "Confirm email" label once Step 3 lands, so pin them to the exact label text (`getByLabelText` with a plain string is an exact match by default, unlike a regex):

```js
test('prefills email from the profile when the draft has none yet', () => {
  render(
    <ApplicationForm
      application={makeApp()}
      profile={{ email: 'founder@acme.test' }}
    />
  )
  expect(screen.getByLabelText('Email')).toHaveValue('founder@acme.test')
})

test('an existing draft email overrides the profile email', () => {
  render(
    <ApplicationForm
      application={makeApp({ fields: { email: 'draft@acme.test' } })}
      profile={{ email: 'founder@acme.test' }}
    />
  )
  expect(screen.getByLabelText('Email')).toHaveValue('draft@acme.test')
})
```

Then append new tests to the same file:

```js
test('shows a mismatch message when confirm email diverges from email', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'founder@acme.test' },
  })
  fireEvent.change(screen.getByLabelText('Confirm email'), {
    target: { value: 'typo@acme.test' },
  })

  expect(screen.getByText('Emails do not match')).toBeInTheDocument()
})

test('clears the email mismatch message once the values match', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'founder@acme.test' },
  })
  fireEvent.change(screen.getByLabelText('Confirm email'), {
    target: { value: 'founder@acme.test' },
  })

  expect(screen.queryByText('Emails do not match')).not.toBeInTheDocument()
})

test('shows a mismatch message when confirm phone diverges from phone', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '+254700000000' },
  })
  fireEvent.change(screen.getByLabelText('Confirm phone'), {
    target: { value: '+254700000001' },
  })

  expect(screen.getByText('Phone numbers do not match')).toBeInTheDocument()
})

test('does not show a phone mismatch when phone is still blank', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Confirm phone'), {
    target: { value: '+254700000001' },
  })

  expect(screen.queryByText('Phone numbers do not match')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/dashboard/__tests__/ApplicationForm.test.jsx`
Expected: FAIL — `getByLabelText('Confirm email')` / `getByLabelText('Confirm phone')` find no element yet; the two disambiguated prefill tests still pass (they already resolve correctly against 'Email' alone, whether or not Confirm email exists) but are included so they stay green after Step 3.

- [ ] **Step 3: Implement**

In `src/data/initialFields.js`, update the `sme` block (currently line 17):

```js
    email: '', confirmEmail: '', phone: '', confirmPhone: '', address: '',
```

In `src/pages/dashboard/ApplicationForm.jsx`, replace the Contact `FormGroup` (currently lines 177-204) with:

```jsx
      <FormGroup title="Contact" sub="Where the assessment team reaches you.">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className={styles.input}
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Confirm email" htmlFor="confirmEmail">
          <input
            id="confirmEmail"
            type="email"
            className={styles.input}
            value={fields.confirmEmail}
            onChange={(e) => set('confirmEmail', e.target.value)}
          />
          {fields.confirmEmail && fields.confirmEmail !== fields.email && (
            <p className={styles.fieldError}>Emails do not match</p>
          )}
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input
            id="phone"
            type="tel"
            className={styles.input}
            value={fields.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Confirm phone" htmlFor="confirmPhone">
          <input
            id="confirmPhone"
            type="tel"
            className={styles.input}
            value={fields.confirmPhone}
            onChange={(e) => set('confirmPhone', e.target.value)}
          />
          {fields.phone && fields.confirmPhone && fields.confirmPhone !== fields.phone && (
            <p className={styles.fieldError}>Phone numbers do not match</p>
          )}
        </Field>
        <Field label="Business address" htmlFor="address">
          <input
            id="address"
            className={styles.input}
            value={fields.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </Field>
      </FormGroup>
```

Append to `src/pages/dashboard/ApplicationForm.module.css`:

```css

.fieldError {
  font-size: var(--text-xs);
  color: var(--color-error);
  margin: 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/dashboard/__tests__/ApplicationForm.test.jsx`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Run the full test suite to catch any other regression**

Run: `npm run test:run`
Expected: PASS. (`applicationState.test.js`'s `overallDraftCompletion — SME` tests use `FULL_SME_FIELDS` from that file's own local fixture, already updated in Task 1, so no cross-file breakage expected — this step confirms it.)

- [ ] **Step 6: Commit**

```bash
git add src/data/initialFields.js src/pages/dashboard/ApplicationForm.jsx src/pages/dashboard/ApplicationForm.module.css src/pages/dashboard/__tests__/ApplicationForm.test.jsx
git commit -m "feat: add confirm email/phone fields to the SME application form"
```

---

### Task 3: Phone + confirmation fields on the public Contact page

**Files:**
- Modify: `src/pages/Contact.jsx`

**Interfaces:**
- Consumes: the existing `Field` helper defined at the bottom of `Contact.jsx` (`{ label, name, type, value, onChange, error }`), unchanged
- Produces: `functions/contact.js` (Task 4) now receives a `phone` key in its POST body in addition to the existing `fullName, companyName, email, country, fundingRequirement, financingType, projectDescription`

No test file exists for `Contact.jsx` today (consistent with the rest of that page's coverage) — this task is verified by build + manual check in Task 6 rather than an automated test.

- [ ] **Step 1: Update `INITIAL` and the Field row layout**

In `src/pages/Contact.jsx`, replace the `INITIAL` constant (currently lines 22-25):

```js
const INITIAL = {
  fullName: '', companyName: '', email: '', confirmEmail: '',
  phone: '', confirmPhone: '', country: '',
  fundingRequirement: '', financingType: '', projectDescription: '',
}
```

Replace **both** existing `<div className={styles.row}>` blocks that currently follow the Full Name/Company Name row — the Email Address/Country row and the Funding Requirement/Financing Type row (currently lines 115-135, from the `<div className={styles.row}>` opening the Email Address field through the closing `</div>` after the Financing Type `<select>`) — with these four rows:

```jsx
              <div className={styles.row}>
                <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
                <Field label="Confirm Email Address" name="confirmEmail" type="email" value={form.confirmEmail} onChange={handleChange} error={errors.confirmEmail} />
              </div>
              <div className={styles.row}>
                <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} />
                <Field label="Confirm Phone Number" name="confirmPhone" type="tel" value={form.confirmPhone} onChange={handleChange} error={errors.confirmPhone} />
              </div>
              <div className={styles.row}>
                <Field label="Country" name="country" value={form.country} onChange={handleChange} error={errors.country} />
                <Field label="Funding Requirement (e.g. $2M working capital)" name="fundingRequirement" value={form.fundingRequirement} onChange={handleChange} error={errors.fundingRequirement} />
              </div>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="financingType" className={styles.label}>Financing Type</label>
                  <select
                    id="financingType"
                    name="financingType"
                    value={form.financingType}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.financingType ? styles.inputError : ''}`}
                  >
                    <option value="">Select a type…</option>
                    {financingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.financingType && <p className={styles.errorMsg}>{errors.financingType}</p>}
                </div>
              </div>
```

The `projectDescription` field group and everything after it (currently starting line 136) is untouched — this edit only replaces the two rows between the Full Name/Company Name row and the Project Description field group, so there is exactly one `id="financingType"` element in the file both before and after this change.

- [ ] **Step 2: Add match validation to `validate()`**

Replace `validate()` (currently lines 33-43):

```js
  function validate(data) {
    const errs = {}
    if (!data.fullName.trim())           errs.fullName = 'Full name is required'
    if (!data.companyName.trim())        errs.companyName = 'Company name is required'
    if (!data.email.trim())              errs.email = 'Email is required'
    if (!data.confirmEmail.trim())       errs.confirmEmail = 'Please confirm your email'
    else if (data.confirmEmail.trim().toLowerCase() !== data.email.trim().toLowerCase())
                                          errs.confirmEmail = 'Emails do not match'
    if (!data.phone.trim())              errs.phone = 'Phone number is required'
    if (!data.confirmPhone.trim())       errs.confirmPhone = 'Please confirm your phone number'
    else if (data.confirmPhone.trim() !== data.phone.trim())
                                          errs.confirmPhone = 'Phone numbers do not match'
    if (!data.country.trim())            errs.country = 'Country is required'
    if (!data.fundingRequirement.trim()) errs.fundingRequirement = 'Funding requirement is required'
    if (!data.financingType)             errs.financingType = 'Please select a financing type'
    if (!data.projectDescription.trim()) errs.projectDescription = 'Project description is required'
    return errs
  }
```

- [ ] **Step 3: Strip confirm fields before POST**

Replace the body of `handleSubmit` (currently lines 51-73):

```js
  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setStatus('loading')
    const { confirmEmail, confirmPhone, ...payload } = form
    try {
      const res = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json()
        if (data.errors) setErrors(data.errors)
        setStatus('idle')
      }
    } catch {
      setStatus('error')
    }
  }
```

- [ ] **Step 4: Verify the page compiles**

Run: `npm run build`
Expected: build succeeds with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Contact.jsx
git commit -m "feat: add phone and email/phone confirmation to the Contact page"
```

---

### Task 4: `phone` required field in `functions/contact.js`

**Files:**
- Modify: `functions/contact.js`

**Interfaces:**
- Consumes: the trimmed `payload` object Task 3 now POSTs (`fullName, companyName, email, phone, country, fundingRequirement, financingType, projectDescription` — no confirm fields)
- Produces: an `errors.phone` entry (422 response) when `phone` is missing, matching every other required-field error already returned by this handler

No test file exists for `functions/contact.js` today — verified in Task 6 by build + manual submission.

- [ ] **Step 1: Add `phone` to destructuring and validation**

In `functions/contact.js`, replace the destructuring and validation block (currently lines 13-24):

```js
  const { fullName, companyName, email, phone, country, fundingRequirement, financingType, projectDescription } = body

  const errors = {}
  if (!fullName?.trim())           errors.fullName = 'Full name is required'
  if (!companyName?.trim())        errors.companyName = 'Company name is required'
  if (!email?.trim())              errors.email = 'Email is required'
  if (!phone?.trim())              errors.phone = 'Phone number is required'
  if (!country?.trim())            errors.country = 'Country is required'
  if (!fundingRequirement?.trim()) errors.fundingRequirement = 'Funding requirement is required'
  if (!financingType?.trim())      errors.financingType = 'Financing type is required'
  if (!projectDescription?.trim()) errors.projectDescription = 'Project description is required'

  if (Object.keys(errors).length) return json({ errors }, 422)
```

- [ ] **Step 2: Add phone to the Resend email body**

Replace the `resend.emails.send` call's `text` array (currently lines 33-45):

```js
      text: [
        `New financing inquiry from ${fullName} at ${companyName}.`,
        '',
        `Full Name:            ${fullName}`,
        `Company:              ${companyName}`,
        `Email:                ${email}`,
        `Phone:                ${phone}`,
        `Country:              ${country}`,
        `Funding Requirement:  ${fundingRequirement}`,
        `Financing Type:       ${financingType}`,
        '',
        'Project Description:',
        projectDescription,
      ].join('\n'),
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds with zero errors (this file isn't part of the Vite build graph, but the command is the project's standard pre-commit check per Global Constraints).

- [ ] **Step 4: Commit**

```bash
git add functions/contact.js
git commit -m "feat: require and relay phone number in the contact worker"
```

---

### Task 5: Confirm phone field on `SignupProfile.jsx`

**Files:**
- Modify: `src/pages/auth/SignupProfile.jsx`

**Interfaces:**
- Consumes: nothing new — reuses the component's existing `error`/`setError` state and `styles.error` banner class from `Auth.module.css`
- Produces: nothing consumed elsewhere — `confirmPhone` is never persisted (the `supabase.from('profiles').insert(...)` call keeps writing only `phone`)

No test file exists for `SignupProfile.jsx` today — verified in Task 6 by build + manual signup walkthrough.

- [ ] **Step 1: Add `confirmPhone` state**

In `src/pages/auth/SignupProfile.jsx`, add alongside the existing `phone` state (currently line 13):

```js
  const [phone, setPhone] = useState('')
  const [confirmPhone, setConfirmPhone] = useState('')
```

- [ ] **Step 2: Add the match check to `handleSubmit`**

Replace the start of `handleSubmit` (currently lines 22-26):

```js
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (phone.trim() !== confirmPhone.trim()) {
      setError('Phone numbers do not match')
      return
    }

    setLoading(true)
```

- [ ] **Step 3: Add the Confirm phone field to the form**

Insert directly after the existing Phone field block (currently lines 97-108, ending `</div>` before the Occupation field):

```jsx
          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Phone</label>
            <input
              id="phone"
              className={styles.input}
              type="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPhone">Confirm phone</label>
            <input
              id="confirmPhone"
              className={styles.input}
              type="tel"
              autoComplete="tel"
              required
              value={confirmPhone}
              onChange={e => setConfirmPhone(e.target.value)}
            />
          </div>
```

- [ ] **Step 4: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/auth/SignupProfile.jsx
git commit -m "feat: require phone confirmation on the signup profile step"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `npm run test:run`
Expected: all tests pass, including the Task 1 and Task 2 additions.

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: build succeeds with zero errors.

- [ ] **Step 3: Manual check — Contact page**

Run: `npm run dev`, open `/contact`. Fill every field, put a different value in "Confirm Email Address" than "Email Address", submit — confirm the "Emails do not match" inline error appears and the request is not sent (check Network tab / no navigation to the success state). Fix the mismatch, do the same for phone, then submit fully matching values — confirm the "Application Received" success state renders.

- [ ] **Step 4: Manual check — Dashboard SME application**

Sign in as a borrower with an SME draft application (or create one via `/dashboard/start`). Open the application form. Fill Email, then type a different value into Confirm email — confirm "Emails do not match" appears live as you type, with no separate submit action needed to see it. Correct it to match. Repeat for Phone/Confirm phone. Close the form (back to `ActionCard`) and confirm "Submit application" is enabled once all required fields including both confirmations match, and stays as "Resume" (not a disabled Submit) if you reopen and break the match again.

- [ ] **Step 5: Manual check — Signup profile**

Go through `/signup` → verify email → `/signup/profile`. Enter a Phone value and a different Confirm phone value, submit — confirm the red error banner reads "Phone numbers do not match" and the profile is not created (still on `/signup/profile`). Fix it and submit again — confirm it proceeds to `/dashboard/start`.

- [ ] **Step 6: Package for handoff**

Per `CLAUDE.md`: after `npm run build` passes, package `dist/` as a zip for handoff between sessions (matches existing project convention — no new packaging step introduced by this feature).
