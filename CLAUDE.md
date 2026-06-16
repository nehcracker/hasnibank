# CLAUDE.md

Project guidance for working on **Hasni Bank** (`hasnibank.com`). Read this before writing or changing code.

## Project overview

Hasni Bank is a global financing **marketplace** that matches SMEs, entrepreneurs, and large project sponsors with capital from an international network of funders, lenders, and institutions. It is positioned as a sophisticated private-banking-grade financing partner — not a deposit-taking retail bank.

The build is segmented into two phases:

- **Phase 1 — Web app:** public marketing site (current focus).
- **Phase 2 — Backend & dashboards:** auth, KYB/KYC, the loan application wizard, the self-service financing flow, borrower dashboard, and underwriting console.

Do not pull Phase 2 concerns (auth, data models, money movement) into Phase 1 work.

## Positioning & voice

- Lead with the **marketplace** framing: Hasni connects applicants to funders; it is not framed as the direct lender.
- Tone is premium, institutional, and trustworthy — international private finance, not consumer fintech.
- Use the approved copy from the content spec verbatim where provided. Keep headlines confident and concise.

## Tech stack

- **Frontend:** React + Vite
- **Hosting:** Cloudflare Pages
- **Backend (forms):** Cloudflare Pages Functions / Workers (`functions/`)
- **Routing:** client-side React routing
- **Styling:** CSS with design tokens in `src/styles/tokens.css` (no UI framework)

## Commands

```bash
npm install          # install dependencies
npm run dev          # local dev server (Vite)
npm run build        # production build — ALWAYS run to verify before delivery
npm run preview      # preview the production build locally
```

Builds are verified with `npm run build` and packaged as a zip for handoff between sessions. Code is pushed to GitHub between phases.

## Project structure

```
hasni-bank/
├── functions/contact.js          Pages Function — financing/contact form handler
├── public/
├── src/
│   ├── assets/images/
│   ├── components/
│   │   ├── layout/                Navbar (scroll + mobile overlay), Footer
│   │   ├── sections/              Hero, HowItWorks, FinancingTracks, Stats,
│   │   │                          FunderStrip, FaqTeaser, CtaBand
│   │   ├── ui/                    Button, Card, Badge, SectionHeading, Container
│   │   └── icons/                 SVG icon components
│   ├── pages/                     Home, SmeFinance, ProjectFunding, HowItWorks,
│   │                              About, Team, Insights, Contact
│   ├── data/                      siteConfig, navData, financingData, teamData, insightsData
│   ├── hooks/                     useSEO, useScrollPosition
│   ├── seo/                       seoConfig.js, structuredData.js
│   ├── styles/                    tokens.css, globals.css
│   ├── App.jsx
│   └── main.jsx
├── index.html · vite.config.js · package.json
```

Use `.jsx` for any file containing JSX. Keep components small and composable; section components live in `components/sections/` and are assembled by page components in `pages/`.

## Design system

Brand identity: midnight navy + gold + ivory, serif headlines over sans-serif body for a private-banking feel. All values live in `src/styles/tokens.css` as CSS custom properties — reference tokens, never hardcode hex in components.

| Token | Hex | Use |
|-------|-----|-----|
| Midnight navy | `#0B1220` | Page background, trust/strength |
| Surface | `#16213B` | Cards, raised panels |
| Gold | `#CBA135` | Primary accent, CTAs, wealth signal |
| Gold soft | `#E2C572` | Hover, highlights, secondary accent |
| Ivory | `#F4F1E8` | Primary text on navy, clarity |
| Muted | `#9FA9BD` | Secondary text on navy |
| Border | `#2A3654` | Hairline borders on dark surfaces |
| Success | `#3FA37A` | Verified / approved states |

Typography:

- **Headings:** Fraunces (serif) — prestige and heritage.
- **Body:** Inter (sans-serif) — modern, neutral, legible.
- Sentence case for UI labels; keep weights restrained.

## Pages & sections

- **Home:** Hero (4 trust points) → HowItWorks (4 steps) → FinancingTracks (4) → Stats (4 metrics) → FunderStrip → FaqTeaser (3 Qs) → CtaBand
- **SME Finance:** Hero → Services (Working Capital, Equipment, Expansion, Trade) → CTA
- **Project Funding:** Hero → Sectors (Infrastructure, Energy, Real Estate, Agriculture, Manufacturing, Mining) → Funding Structures (Debt, Equity, Joint Ventures, Structured) → CTA
- **How It Works:** 4-step flow (Submit → Assessment → Funder Matching → Completion) + marketplace matching mechanics
- **About:** Hero → Mission → Vision → Core Values (Integrity, Excellence, Global Perspective, Partnership)
- **Team:** 4 role cards (CEO, Head of Financing, Senior Financial Analyst, Client Relationship Manager)
- **Insights:** 5-category index (SME Growth Strategies, International Finance Trends, Project Development Insights, Capital Raising Guidance, Trade Finance Updates); article-ready, post template deferred
- **Contact:** Hero → 7-field form → success state

Financing tracks: SME Financing and Project Funding have dedicated pages. Trade Finance and Acquisition Finance appear as home-level track cards (Trade Finance also lists as an SME sub-service).

## Data layer

Page content is data-driven — edit the data files, not the components:

- `siteConfig.js` — brand, nav, contact details, stats, FAQ entries, SEO defaults/keywords
- `financingData.js` — the 4 tracks, SME sub-services, project sectors and funding structures
- `teamData.js` — the 4 roles
- `insightsData.js` — the 5 categories

## Contact form / Worker

`functions/contact.js` handles submissions. Payload schema:

```
fullName, companyName, email, country,
fundingRequirement, financingType, projectDescription
```

On success, return the approved confirmation: applicant is thanked and told the financing team will review and respond with next steps. Validate required fields server-side; never trust client input.

## SEO

Config-driven, reusing the established pattern: `seoConfig.js` holds per-page meta; `useSEO` injects tags; `structuredData.js` emits JSON-LD for `Organization`, `WebSite`, `Service`, and `FAQPage`. Primary keywords: global financing solutions, SME financing, project funding, international finance, business funding, trade finance solutions, infrastructure financing, private financing solutions.

## Working conventions

- **Review before coding.** Present scope and an audit (severity-rated where relevant) and wait for explicit approval before writing files.
- **Phase by phase.** Do not jump ahead into a later phase's scope.
- **Verify every build** with `npm run build` before handoff; package as a zip.
- **Push to GitHub** between sessions.
- Prefer tokens and data files over hardcoded values; keep the marketplace voice consistent across all copy.

## Compliance note

Hasni Bank operates as a financing marketplace/workflow platform. Avoid copy or features that imply deposit-taking, direct lending, or money movement that would require banking/lending licenses until that positioning and the supporting licensing/partnerships are confirmed.
