# Email / Phone Confirmation Fields — Design

**Date:** 2026-07-09
**Status:** Approved by user 2026-07-09
**Context:** Three separate forms across the app collect a borrower's email and/or phone with no double-entry check, so a typo silently becomes the applicant's contact record — a non-verifiable value the assessment/funder-matching team can't reach. This spec adds "Confirm email" / "Confirm phone" double-entry fields (mechanism: exact-match confirmation, not OTP/format validation) to all three intake points: the public Contact page, the dashboard SME `ApplicationForm`, and `SignupProfile`.

## Problem

- **Contact page** (`Contact.jsx` / `functions/contact.js`): collects `email` only, no phone field, no confirmation of either.
- **Dashboard SME application** (`ApplicationForm.jsx`): collects `email` (required) and `phone` (optional) into the draft's `fields` jsonb, no confirmation.
- **Signup profile** (`SignupProfile.jsx`): collects `phone` (required); `email` is already proven reachable via Supabase's signup magic-link (`VerifyEmail.jsx`), so only phone needs a confirm field here.

## Decisions taken

| Question | Decision |
|----------|----------|
| Mechanism | Exact-match double-entry (Confirm field), not format regex, not OTP/SMS verification |
| Contact page phone | Add a new required `phone` field (doesn't exist today) alongside its confirm field, so the page matches the other two forms |
| Signup email | Out of scope — magic-link already proves reachability |
| Where confirm values live | Contact page: client-only, never sent to the worker. Dashboard form: persisted into `fields` jsonb like every other field, since `canSubmit()` reads only from `fields`. Signup profile: local component state, not persisted to `profiles` |
| Match rule for optional phone | Dashboard `phone` is optional; `confirmPhone` is required *only if* `phone` is non-blank, and must equal it |

## Design

### 1. Public Contact page (`Contact.jsx`, `Contact.module.css`, `functions/contact.js`)

**Form state** — extend `INITIAL`:
```js
const INITIAL = {
  fullName: '', companyName: '', email: '', confirmEmail: '',
  phone: '', confirmPhone: '', country: '',
  fundingRequirement: '', financingType: '', projectDescription: '',
}
```

**Layout** — add a `Phone` field next to `Email Address` (new second row), and a `Confirm Email` / `Confirm Phone` pair on the row that follows, using the existing `Field` helper and `styles.row` two-column pattern already used for the other rows.

**`validate()`** gains:
```js
if (!data.phone.trim())          errs.phone = 'Phone number is required'
if (!data.confirmEmail.trim())   errs.confirmEmail = 'Please confirm your email'
else if (data.confirmEmail.trim().toLowerCase() !== data.email.trim().toLowerCase())
                                  errs.confirmEmail = 'Emails do not match'
if (!data.confirmPhone.trim())   errs.confirmPhone = 'Please confirm your phone number'
else if (data.confirmPhone.trim() !== data.phone.trim())
                                  errs.confirmPhone = 'Phone numbers do not match'
```
Errors render through the existing `Field` component's `error` prop (`styles.errorMsg`), same as every other field on this form — no new error styling needed.

**Submit payload** — only the final `email` and `phone` are sent; `confirmEmail`/`confirmPhone` are stripped before the `fetch('/contact', ...)` call (they're a client-side typo gate, not new data):
```js
const { confirmEmail, confirmPhone, ...payload } = form
body: JSON.stringify(payload)
```

**`functions/contact.js`** — add `phone` to the destructured body and required-field validation (same pattern as the other required fields), and add a `Phone:` line to the Resend email body. No `confirmEmail`/`confirmPhone` handling needed server-side — the worker never receives them.

### 2. Dashboard SME Application Form (`ApplicationForm.jsx`, `ApplicationForm.module.css`, `initialFields.js`, `applicationState.js`)

**`initialFields.js`** — add to `INITIAL_FIELDS.sme`:
```js
email: '', confirmEmail: '', phone: '', confirmPhone: '', address: '',
```

**`ApplicationForm.jsx`** — in the existing `Contact` group, add "Confirm email" directly after Email and "Confirm phone" directly after Phone. Each shows an inline mismatch message the moment the two values diverge (live, not just on blur) — mirroring the `saveState` reactivity already in this component:
```jsx
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
```
Same shape for Confirm phone, gated additionally on `fields.phone` being non-blank (if `phone` is blank, no confirm field mismatch is shown — an empty confirm is fine).

**`ApplicationForm.module.css`** — new rule, matching `Contact.module.css`'s `errorMsg` sizing/color:
```css
.fieldError {
  font-size: var(--text-xs);
  color: var(--color-error);
  margin: 0;
}
```

**`applicationState.js`** — `canSubmit()` is the actual submission gate (the Submit button lives in `ActionCard`, outside this form). Add a match check alongside the existing required-fields check, SME branch only:
```js
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
`REQUIRED_FIELDS_SME` also gains `'confirmEmail'` (email is already required, so its confirm must be present too) — `phone`/`confirmPhone` stay out of that list since phone remains optional; the `phoneMatches` check above handles the conditional case directly.

`overallDraftCompletion()` is left untouched — it's a progress indicator, not a gate, and adding two more always-counted keys would understate completion for users who haven't reached the Contact group yet without changing behavior that matters. (No spec ambiguity here: only `canSubmit` needs the match check to actually block submission.)

### 3. Signup profile (`SignupProfile.jsx`, `Auth.module.css`)

**Component state** — add `confirmPhone` alongside the existing `phone` state.

**Layout** — add a "Confirm phone" field directly after Phone, same `styles.field`/`styles.label`/`styles.input` pattern as every other field on this form.

**`handleSubmit`** — add a check before the existing `supabase.from('profiles').insert(...)` call:
```js
if (phone.trim() !== confirmPhone.trim()) {
  setError('Phone numbers do not match')
  setLoading(false)
  return
}
```
Reuses the existing `error`/`styles.error` banner — no new error UI needed here, consistent with how this form already surfaces the "Could not save your profile" error.

### 4. Error handling summary

| Form | Mismatch surfaced as | Blocks |
|------|----------------------|--------|
| Contact page | Per-field `errorMsg` under Confirm Email / Confirm Phone | `handleSubmit` early-returns via existing `validate()` gate |
| Dashboard ApplicationForm | Live per-field `fieldError` text, no blocking within the form itself (it only autosaves) | `canSubmit()` keeps the Submit button disabled in `ActionCard` until fields match |
| SignupProfile | Existing top-of-form `error` banner | `handleSubmit` early-returns before the Supabase insert |

### 5. Testing

- `applicationState.test.js`: extend the existing `canSubmit — SME` describe block with cases for confirmEmail mismatch, confirmPhone mismatch when phone is present, and confirmPhone blank when phone is blank (should still pass).
- `ApplicationForm.test.jsx` (if present) / new test: typing a non-matching confirm value shows the inline error; matching clears it.
- `Contact.jsx` has no existing test file — none added, consistent with the rest of that page's test coverage (none today).
- `SignupProfile.jsx` has no existing test file — none added, same reasoning.
- Manual verification (per `npm run build` + dev server check): submit each of the three forms with mismatched values and confirm the block; then with matching values and confirm success.

## Out of scope

- OTP/SMS/email-link verification of phone or email (rejected mechanism — see Decisions).
- Format/regex validation of email or phone shape (existing `type="email"`/`type="tel"` input hints are unchanged, nothing stricter added).
- Adding a phone field to Signup.jsx's account-creation step (email/password only, unchanged).
- Adding email confirmation to SignupProfile.jsx (magic-link already covers it).
- Any change to `profiles` schema, `applications` schema, or new SQL migrations — all new fields ride in existing jsonb/local state.
