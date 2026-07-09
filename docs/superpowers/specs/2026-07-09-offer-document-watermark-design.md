# Offer Letter / Export Summary Logo Watermark — Design

**Date:** 2026-07-09
**Status:** Approved by user 2026-07-09
**Context:** Follows the offer terms expansion and dashboard topbar logo swap (shipped 2026-07-09, `baa6f9b`). That work deliberately kept `OfferLetter.jsx`/`ExportSummary.jsx` on the small `LogoMark` icon in their header, out of scope. This spec adds a separate, additive watermark to those same two documents using the marketing site's full logo asset.

## Problem

`OfferLetter.jsx` and `ExportSummary.jsx` are the two client-facing printable/PDF documents in the portal (offer letter, application summary export). They currently carry only a small header logo (`LogoMark`, an icon with no text). The user wants the same full logo used on the marketing Navbar (`Logo.png`) to also appear as a watermark inside these documents, for brand consistency on official client-facing paperwork.

## Decisions taken

| Question | Decision |
|----------|----------|
| Asset | The same `Logo.png` used by the marketing Navbar (full icon + wordmark), not the icon-only `LogoMark`/favicon mark |
| Scope | Additive — the existing header `LogoMark` in both documents is unchanged; the watermark is a new, separate layer |
| Print visibility | Visible both on screen and in the printed/saved PDF — the watermark is part of the document, not a screen-only decoration |
| Placement/style | One large, centered, faint copy of the logo behind the content (not a tiled/repeated pattern) |
| Documents | Both `OfferLetter.jsx` and `ExportSummary.jsx` |

## Design

### 1. Markup

Both files already render the shared document container identically:

```jsx
<div className={styles.document} data-print-document>
```

Add, as the first child of that div in both files:

```jsx
<img src={logoSrc} alt="" aria-hidden="true" className={styles.watermark} />
```

Import `logoSrc` from `@/assets/Logo.png` in both files (same asset and import path the marketing `Navbar.jsx` and dashboard `Topbar.jsx` already use). `alt=""` and `aria-hidden="true"` since the mark is purely decorative — the actual client-facing content (applicant name, terms, etc.) already carries the real information.

### 2. Styling (`ExportSummary.module.css`, shared by both files)

`.document` gains `position: relative` (currently unset, needed so the watermark positions relative to the document card rather than a further-up ancestor):

```css
.document {
  position: relative;
  /* ...existing rules unchanged... */
}
```

New `.watermark` rule:

```css
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

A negative `z-index` on a positioned child reliably renders it behind the parent's normal in-flow content (the standard CSS watermark technique) once the parent (`.document`) establishes a stacking context via `position: relative`. No other markup restructuring is needed — the existing header, meta row, and sections all remain normal-flow siblings and render above the watermark automatically.

### 3. Print behavior

No changes to `print.css`. The existing rule:

```css
[data-print-document] {
  box-shadow: none !important;
  border-radius: 0 !important;
  background: #ffffff !important;
  padding: 0 !important;
}
```

only resets the CSS `background` property (a background-image/color would be affected; a real `<img>` element is not). Because the watermark is implemented as an actual `<img>`, not a CSS `background-image`, it prints exactly as any other content image would — no `print-color-adjust` workaround needed, and this rule does not touch it.

### 4. Scope boundary

This assumes each document renders on roughly one printed page, matching how these documents are structured today (a handful of sections). The watermark is centered once relative to the full height of `.document`; it is not repeated per printed page. If a document ever grows long enough to paginate across multiple physical pages, the mark will appear once near the vertical center of the whole content rather than on every page — accepted as a trade-off, not built as multi-page tiling, since tiling was explicitly not the chosen placement style.

### 5. Testing

No new pure logic — this is presentational only. Existing render tests for both components (`OfferLetter.test.jsx`, and `ExportSummary.jsx`'s test file if one exists) should be spot-checked to confirm the new `<img>` doesn't break any existing text-matching assertions (e.g. a query like `getByRole('img')` that previously matched only `LogoMark`'s `<svg>` — note `LogoMark` renders an inline `<svg>`, not an `<img>`, so `getByAltText`/`getByRole('img', ...)` queries scoped to the header mark are unaffected). No new automated test is required for the visual watermark itself, since jsdom cannot verify opacity/positioning; correctness here is confirmed by manual visual/print-preview inspection.

## Out of scope

- Changing the existing header `LogoMark` in either document (stays as-is).
- Tiled/repeated watermark pattern.
- Per-page watermark repetition for multi-page documents.
- Any change to the dashboard Topbar or marketing Navbar (both already ship the full logo where intended).
