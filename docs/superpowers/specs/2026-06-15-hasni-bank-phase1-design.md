# Hasni Bank Phase 1 — Web App Design Spec

**Date:** 2026-06-15
**Scope:** Phase 1 public marketing site only. No auth, no dashboards, no money movement.

---

## Architecture

React + Vite SPA deployed to Cloudflare Pages. Client-side routing via React Router DOM. No UI framework — plain CSS with design tokens. One Cloudflare Pages Function (`functions/contact.js`) for server-side contact form handling.

### File Structure

```
hasni-bank/
├── functions/
│   └── contact.js                 Pages Function — contact/financing form handler
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/images/             (empty — no local images in scaffold)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx         Sticky nav with scroll shadow, mobile overlay
│   │   │   └── Footer.jsx
│   │   ├── sections/
│   │   │   ├── Hero.jsx           Reusable hero with photo bg + gradient overlay
│   │   │   ├── HowItWorks.jsx     4-step process section
│   │   │   ├── FinancingTracks.jsx 4 track cards
│   │   │   ├── Stats.jsx          4 animated counters
│   │   │   ├── FunderStrip.jsx    Logo/trust strip
│   │   │   ├── FaqTeaser.jsx      3 accordion Qs
│   │   │   └── CtaBand.jsx        Bottom CTA bar
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── SectionHeading.jsx
│   │   │   └── Container.jsx
│   │   └── icons/                 SVG icon components
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── SmeFinance.jsx
│   │   ├── ProjectFunding.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── About.jsx
│   │   ├── Team.jsx
│   │   ├── Insights.jsx
│   │   └── Contact.jsx
│   ├── data/
│   │   ├── siteConfig.js          brand, nav, contact, stats, FAQ, SEO defaults
│   │   ├── navData.js
│   │   ├── financingData.js       4 tracks, SME sub-services, project sectors
│   │   ├── teamData.js            4 role cards
│   │   └── insightsData.js        5 categories
│   ├── hooks/
│   │   ├── useSEO.js              Injects per-page meta tags
│   │   ├── useScrollPosition.js   Navbar scroll shadow trigger
│   │   └── useIntersection.js     IntersectionObserver for scroll animations
│   ├── seo/
│   │   ├── seoConfig.js           Per-page meta (title, description, keywords)
│   │   └── structuredData.js      JSON-LD: Organization, WebSite, Service, FAQPage
│   ├── styles/
│   │   ├── tokens.css             CSS custom properties (brand colours, typography)
│   │   └── globals.css            Reset, base styles, animation keyframes
│   ├── App.jsx                    Router + layout shell
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## Design System

All values in `src/styles/tokens.css` as CSS custom properties. Never hardcode hex in components.

| Token | Hex | Use |
|-------|-----|-----|
| `--color-navy` | `#0B1220` | Page background |
| `--color-surface` | `#16213B` | Cards, raised panels |
| `--color-gold` | `#CBA135` | Primary accent, CTAs |
| `--color-gold-soft` | `#E2C572` | Hover, highlights |
| `--color-ivory` | `#F4F1E8` | Primary text |
| `--color-muted` | `#9FA9BD` | Secondary text |
| `--color-border` | `#2A3654` | Hairline borders |
| `--color-success` | `#3FA37A` | Verified states |

**Typography:** Fraunces (serif) for headings, Inter (sans-serif) for body — loaded via Google Fonts in `index.html`.

---

## Pages

| Page | Route | Key Sections |
|------|-------|-------------|
| Home | `/` | Hero → HowItWorks → FinancingTracks → Stats → FunderStrip → FaqTeaser → CtaBand |
| SME Finance | `/sme-finance` | Hero → Services (4) → CTA |
| Project Funding | `/project-funding` | Hero → Sectors (6) → Funding Structures (4) → CTA |
| How It Works | `/how-it-works` | Hero → 4-step flow → Matching mechanics |
| About | `/about` | Hero → Mission → Vision → Core Values (4) |
| Team | `/team` | Hero → 4 role cards |
| Insights | `/insights` | Hero → 5 category cards |
| Contact | `/contact` | Hero → 7-field form → success state |

---

## Animation System

### `useIntersection` hook
Wraps `IntersectionObserver`. Returns `{ ref, isVisible }`. Components attach the ref and add `.visible` class when `isVisible` is true. Threshold: 0.15 (triggers when 15% of element is in viewport).

### Animation classes (in `globals.css`)

- **`.fade-up`** — translates from `translateY(30px)` to `translateY(0)` + opacity 0→1. Used on headings and paragraphs.
- **`.fade-in`** — pure opacity 0→1. Used on hero backgrounds and images.
- **`.stagger-children`** — parent class; each direct `.stagger-child` gets `animation-delay: calc(var(--child-index) * 0.1s)`. Used on card grids.

All transitions: `duration 0.6s`, easing `cubic-bezier(0.16, 1, 0.3, 1)`.

`@media (prefers-reduced-motion: reduce)` disables all animations globally.

---

## Imagery

**Hero backgrounds:** Unsplash Source URLs served as CSS `background-image`. Each hero overlays `linear-gradient(rgba(11,18,32,0.75), rgba(11,18,32,0.85))` to maintain brand colour and text legibility.

| Page | Unsplash query |
|------|----------------|
| Home | `city,finance` |
| SME Finance | `business,office` |
| Project Funding | `infrastructure,construction` |
| How It Works | `meeting,handshake` |
| About | `architecture,modern` |
| Team | `office,professional` |
| Contact | `city,skyline` |

No local image assets — images are replaceable by swapping URLs in data files before launch.

---

## Contact Form

**Route:** POST `/contact` (handled by `functions/contact.js`)

**Fields:** `fullName`, `companyName`, `email`, `country`, `fundingRequirement`, `financingType`, `projectDescription`

**Validation:** Required fields validated server-side. Client shows inline errors on empty submit. On success: confirmation message per approved copy ("thank you — financing team will review and respond with next steps"). Never trust client input.

---

## SEO

Config-driven via `seoConfig.js`. `useSEO` hook injects `<title>`, `<meta name="description">`, and canonical URL per page. `structuredData.js` emits JSON-LD for `Organization`, `WebSite`, `Service`, and `FAQPage`.

Primary keywords: global financing solutions, SME financing, project funding, international finance, business funding, trade finance solutions, infrastructure financing, private financing solutions.

---

## Out of Scope (Phase 2)

Auth, KYB/KYC, loan application wizard, self-service financing flow, borrower dashboard, underwriting console, deposit-taking copy, direct lending claims.
