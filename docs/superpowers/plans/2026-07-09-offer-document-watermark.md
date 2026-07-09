# Offer Letter / Export Summary Logo Watermark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the marketing site's full logo as a large, faint, centered watermark behind the content of both `OfferLetter.jsx` and `ExportSummary.jsx`, visible on screen and in print, additive to the existing header `LogoMark`.

**Architecture:** A single real `<img>` element (not a CSS `background-image`, so it prints reliably without a `print-color-adjust` workaround) is inserted as the first child of the shared `.document` container in both files, using the same `Logo.png` asset the marketing `Navbar.jsx` and dashboard `Topbar.jsx` already import. A negative `z-index` on the absolutely-positioned image, combined with `position: relative` on `.document`, renders it behind the existing normal-flow content with no other markup changes.

**Tech Stack:** React 18, Vite, Vitest + React Testing Library, CSS Modules (`ExportSummary.module.css`, shared by both files).

## Global Constraints

- All colors via CSS custom properties — never hardcode hex (this feature introduces no new colors, only `opacity`/`position`/`z-index`/`width` — flag if that changes)
- `.jsx` extension for all JSX files; `@/` import alias resolves to `src/`
- `npm run build` must pass with zero errors before each commit
- The watermark must not alter the existing header `LogoMark` in either document
- The watermark must be visible both on screen and in print (no `data-print-hide`, no reliance on `print-color-adjust`)
- `data-testid` is an established convention in this codebase (see `src/pages/admin/tabs/AssessmentTab.jsx`, `src/pages/dashboard/PhaseRail.jsx`) — use it for the watermark since a decorative `<img alt="">` is excluded from the accessibility tree's `img` role by default and cannot be reliably queried via `getByRole('img')`

---

## Task 1: Watermark on the offer letter + shared CSS

**Files:**
- Modify: `src/pages/dashboard/OfferLetter.jsx:1-11` (new import), `:237` (insert watermark as first child of `.document`)
- Modify: `src/pages/dashboard/ExportSummary.module.css:46-52` (`.document` gains `position: relative`), add new `.watermark` rule after it
- Test: Modify `src/pages/dashboard/__tests__/OfferLetter.test.jsx` (append one test)

**Interfaces:**
- Consumes: `logoSrc` from `@/assets/Logo.png` (existing asset, already imported by `src/components/layout/Navbar.jsx` and `src/layouts/Topbar.jsx`)
- Produces: `.watermark` CSS class in `ExportSummary.module.css`, reused unchanged by Task 2

- [ ] **Step 1: Write the failing test**

Append to `src/pages/dashboard/__tests__/OfferLetter.test.jsx` (this file already has a `setOffer`/`BASE_TERMS` render-test setup from prior work — reuse it, don't redefine):

```jsx
test('renders the marketing logo as a watermark behind the document content', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  const watermark = screen.getByTestId('document-watermark')
  expect(watermark.tagName).toBe('IMG')
  expect(watermark).toHaveAttribute('alt', '')
  expect(watermark).toHaveAttribute('aria-hidden', 'true')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: FAIL — `getByTestId('document-watermark')` finds nothing, since no such element exists in `OfferLetter.jsx` yet.

- [ ] **Step 3: Implement**

In `src/pages/dashboard/OfferLetter.jsx`, add this import immediately after the existing `LogoMark` import (currently line 8):

```js
import logoSrc from '@/assets/Logo.png'
```

Replace the opening of the document container (currently line 237):

```jsx
      <div className={styles.document} data-print-document>
```

with:

```jsx
      <div className={styles.document} data-print-document>
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          data-testid="document-watermark"
          className={styles.watermark}
        />
```

(The rest of the existing content — `brandHeader`, `metaRow`, sections, footer — stays exactly as it is, now simply following this new first child.)

In `src/pages/dashboard/ExportSummary.module.css`, replace the existing `.document` rule (currently lines 46-52):

```css
.document {
  background: var(--color-document-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: 0 8px 40px rgba(0 0 0 / 0.35);
  color: var(--color-document-text);
}
```

with:

```css
.document {
  position: relative;
  background: var(--color-document-bg);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  box-shadow: 0 8px 40px rgba(0 0 0 / 0.35);
  color: var(--color-document-text);
}

.watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 65%;
  height: auto;
  opacity: 0.07;
  z-index: -1;
  pointer-events: none;
  user-select: none;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/dashboard/__tests__/OfferLetter.test.jsx`
Expected: PASS (16 tests total — 15 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/OfferLetter.jsx src/pages/dashboard/ExportSummary.module.css src/pages/dashboard/__tests__/OfferLetter.test.jsx
git commit -m "feat: logo watermark on the offer letter document"
```

---

## Task 2: Watermark on the export summary

**Files:**
- Modify: `src/pages/dashboard/ExportSummary.jsx:1-8` (new import), `:118` (insert watermark as first child of `.document`)
- Test: Create `src/pages/dashboard/__tests__/ExportSummary.test.jsx` (this file does not exist yet)

**Interfaces:**
- Consumes: `logoSrc` from `@/assets/Logo.png` (same asset as Task 1); `.watermark` CSS class from `ExportSummary.module.css` (added in Task 1, no new CSS needed here since both files share the same module)

- [ ] **Step 1: Write the failing test**

Create `src/pages/dashboard/__tests__/ExportSummary.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: {
      client_ref: 'HB-2026-00100',
      full_name: 'Aminata Koroma',
      company_name: 'Solari AgroExports Ltd',
      country: 'Kenya',
    },
  }),
}))

const APPLICATION = {
  id: 'app-1',
  track: 'sme',
  status: 'submitted',
  amount_sought: 250000,
  currency: 'USD',
  created_at: '2026-07-01T00:00:00Z',
  fields: {},
}

vi.mock('@/hooks/useApplication', () => ({
  useApplication: () => ({ application: APPLICATION, loading: false }),
}))

import ExportSummary from '../ExportSummary'

test('renders the marketing logo as a watermark behind the document content', () => {
  render(
    <MemoryRouter>
      <ExportSummary />
    </MemoryRouter>
  )
  const watermark = screen.getByTestId('document-watermark')
  expect(watermark.tagName).toBe('IMG')
  expect(watermark).toHaveAttribute('alt', '')
  expect(watermark).toHaveAttribute('aria-hidden', 'true')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/dashboard/__tests__/ExportSummary.test.jsx`
Expected: FAIL — `getByTestId('document-watermark')` finds nothing.

- [ ] **Step 3: Implement**

In `src/pages/dashboard/ExportSummary.jsx`, add this import immediately after the existing `LogoMark` import (currently line 7):

```js
import logoSrc from '@/assets/Logo.png'
```

Replace the opening of the document container (currently line 118):

```jsx
      <div className={styles.document} data-print-document>
```

with:

```jsx
      <div className={styles.document} data-print-document>
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          data-testid="document-watermark"
          className={styles.watermark}
        />
```

(The rest of the existing content stays exactly as it is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/dashboard/__tests__/ExportSummary.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/pages/dashboard/ExportSummary.jsx src/pages/dashboard/__tests__/ExportSummary.test.jsx
git commit -m "feat: logo watermark on the export summary document"
```

---

## Task 3: Final verification

- [ ] **Step 1:** Run the full suite

Run: `npx vitest run`
Expected: All suites pass, including the 2 changed/new test files from Tasks 1-2.

- [ ] **Step 2:** Run the production build

Run: `npm run build`
Expected: Zero errors (the pre-existing chunk-size warning is not an error).

- [ ] **Step 3:** Manual visual/print-preview check

Open `/dashboard/offer-letter` (with an issued offer on an application) and `/dashboard/export`, and use the browser's print preview on each to confirm: the watermark is faintly visible behind the text at a legible-but-unobtrusive opacity, does not overlap or obscure any field values, and is centered on the document in both the on-screen view and the print preview. Confirm the existing header `LogoMark` icon is unchanged in both documents.

Do not push — confirm with the user before running `git push`, consistent with this project's working convention.
