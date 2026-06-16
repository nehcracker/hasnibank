# Hasni Bank Phase 1 — Implementation Plan Design

**Date:** 2026-06-16
**Scope:** How to build the Phase 1 marketing site from scratch through a passing production build.
**Based on:** `2026-06-15-hasni-bank-phase1-design.md`

---

## Decisions

| Question | Decision |
|----------|----------|
| Build approach | Layer-by-layer with milestone gates |
| Contact form email delivery | Resend API (`RESEND_API_KEY` env var) |
| Component styles | CSS Modules (`.module.css` per component) |
| Plan endpoint | Passing `npm run build` — no deployment steps |

---

## Overall Structure

Six sequential milestones. Each depends on the previous. Milestones 1–3 are infrastructure (no visible output beyond a blank page). Milestones 4–6 produce runnable, visible results.

```
Milestone 1  Scaffold + design system
Milestone 2  UI primitives + layout shell
Milestone 3  Data layer + hooks + SEO
Milestone 4  Section components
Milestone 5  Pages
Milestone 6  Contact function + production build
```

---

## Milestone 1 — Scaffold + Design System

**Entry state:** Empty directory.
**Exit state:** `npm run dev` shows a blank navy page with Fraunces + Inter fonts loading.

### Tasks
1. `npm create vite@latest hasni-bank -- --template react`
2. Install deps: `react-router-dom`, `resend`
3. Strip Vite boilerplate (delete default App.css, assets, template JSX)
4. `src/styles/tokens.css` — 8 CSS custom properties (navy, surface, gold, gold-soft, ivory, muted, border, success), typography scale, spacing scale
5. `src/styles/globals.css` — CSS reset, base body/html styles, animation keyframes (`.fade-up`, `.fade-in`, `.stagger-children`/`.stagger-child`), `@media (prefers-reduced-motion)` override
6. `index.html` — Google Fonts link (Fraunces + Inter), favicon reference, page title
7. `vite.config.js` — base path `/` for Cloudflare Pages

---

## Milestone 2 — UI Primitives + Layout Shell

**Entry state:** Blank navy page with fonts.
**Exit state:** Navbar and Footer visible on a blank page; all 8 routes resolve without errors.

### Tasks
1. `src/hooks/useScrollPosition.js` — returns scroll Y offset; needed by Navbar below
2. `src/components/ui/Container.jsx` + `Container.module.css` — max-width wrapper with horizontal padding
3. `src/components/ui/Button.jsx` + `Button.module.css` — `variant` prop: `primary` (gold fill) / `outline` (gold border)
4. `src/components/ui/Badge.jsx` + `Badge.module.css` — small label pill (gold-on-surface)
5. `src/components/ui/SectionHeading.jsx` + `SectionHeading.module.css` — Fraunces heading + optional muted subtitle
6. `src/components/ui/Card.jsx` + `Card.module.css` — surface-coloured raised panel with border
7. `src/components/layout/Navbar.jsx` + `Navbar.module.css` — sticky nav, scroll shadow via `useScrollPosition`, mobile hamburger overlay
8. `src/components/layout/Footer.jsx` + `Footer.module.css` — links, copyright, brand mark
9. `src/App.jsx` — React Router `<Routes>` shell with placeholder `<div>` per route, Navbar + Footer wrapping all routes
10. `src/main.jsx` — mounts App, imports globals + tokens

---

## Milestone 3 — Data Layer + Hooks + SEO

**Entry state:** Layout shell with placeholder routes.
**Exit state:** No visual change; all imports resolve without errors.

### Data files
1. `src/data/siteConfig.js` — brand name, contact email, stats (4 metrics), FAQ entries (3), SEO defaults
2. `src/data/navData.js` — nav links with labels, routes, dropdown structure
3. `src/data/financingData.js` — 4 financing tracks, SME sub-services (4), project sectors (6), funding structures (4)
4. `src/data/teamData.js` — 4 role cards (name, title, bio)
5. `src/data/insightsData.js` — 5 category objects (name, description, icon label)

### Hooks
6. `src/hooks/useIntersection.js` — wraps `IntersectionObserver`, returns `{ ref, isVisible }`, threshold 0.15
7. `src/hooks/useSEO.js` — sets `document.title`, injects `<meta name="description">` and canonical `<link>` per page

### SEO
9. `src/seo/seoConfig.js` — per-page objects: `{ title, description, keywords, canonical }` for all 8 routes
10. `src/seo/structuredData.js` — JSON-LD emitters for `Organization`, `WebSite`, `Service`, `FAQPage`; injected into `<head>` via `useSEO`

---

## Milestone 4 — Section Components

**Entry state:** Data layer and hooks in place.
**Exit state:** All sections wired temporarily into Home route; full Home page visible with working animations and accordion.

### Tasks
1. `src/components/sections/Hero.jsx` + module — full-bleed Unsplash `background-image`, navy gradient overlay, headline + subtitle + CTA; props: `heading`, `subheading`, `cta`, `imageTopic`
2. `src/components/sections/HowItWorks.jsx` + module — 4-step grid; `useIntersection` + `.fade-up` per step
3. `src/components/sections/FinancingTracks.jsx` + module — 4 track cards using `Card` + `Badge`; stagger animation; data from `financingData.js`
4. `src/components/sections/Stats.jsx` + module — 4 counters; counts from 0 to target on intersection; data from `siteConfig.js`
5. `src/components/sections/FunderStrip.jsx` + module — horizontal trust strip with text-based placeholder funder names in muted style
6. `src/components/sections/FaqTeaser.jsx` + module — 3 accordion items; open/close toggle state per item; data from `siteConfig.js`
7. `src/components/sections/CtaBand.jsx` + module — full-width gold-accented band with headline + primary + outline buttons

---

## Milestone 5 — Pages

**Entry state:** All section components working.
**Exit state:** All 8 routes show real content; nav links work.

### Tasks
1. `src/pages/Home.jsx` — Hero → HowItWorks → FinancingTracks → Stats → FunderStrip → FaqTeaser → CtaBand
2. `src/pages/SmeFinance.jsx` — Hero → 4 service cards → CtaBand
3. `src/pages/ProjectFunding.jsx` — Hero → 6 sector cards → 4 funding structure cards → CtaBand
4. `src/pages/HowItWorks.jsx` — Hero → HowItWorks section → matching mechanics prose block
5. `src/pages/About.jsx` — Hero → Mission → Vision → 4 Core Values cards
6. `src/pages/Team.jsx` — Hero → 4 role cards
7. `src/pages/Insights.jsx` — Hero → 5 category cards
8. `src/pages/Contact.jsx` — Hero → 7-field form with client-side required validation → success state on submit
9. Wire all 8 pages into `App.jsx` routes (replacing Milestone 2 placeholders)

---

## Milestone 6 — Contact Function + Production Build

**Entry state:** All pages assembled.
**Exit state:** `npm run build` exits 0. Form submits successfully and email is received via Resend.

### Tasks
1. `functions/contact.js` — validates 7 required fields server-side; calls Resend API (`context.env.RESEND_API_KEY`) to forward submission to site email; returns `{ success: true }` or field-level errors
2. `.dev.vars` — local secrets file for Pages Functions (`RESEND_API_KEY=...`); add to `.gitignore`. Document the key name in `.dev.vars.example`. In production, the key is set in the Cloudflare Pages dashboard — no `vite.config.js` changes needed.
3. Wire Contact page form to `POST /contact`; handle loading, success, and error states
4. Run `npm run build` — fix any missing imports or errors until exit 0

---

## Out of Scope

- Deployment to Cloudflare Pages (post-build, manual step)
- Auth, dashboards, KYB/KYC, loan wizard (Phase 2)
- Real funder logos in FunderStrip (pre-launch swap)
- Local image assets (Unsplash URLs used throughout)
