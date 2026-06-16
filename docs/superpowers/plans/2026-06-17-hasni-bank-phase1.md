# Hasni Bank Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hasni Bank Phase 1 public marketing site from a blank directory through a passing `npm run build`.

**Architecture:** React + Vite SPA with client-side routing (React Router DOM), plain CSS Modules referencing design tokens, one Cloudflare Pages Function (`functions/contact.js`) that validates a 7-field financing form and sends email via Resend.

**Tech Stack:** React 18, Vite 5, React Router DOM 6, Resend SDK, Cloudflare Pages Functions, CSS Modules, Google Fonts (Fraunces + Inter)

---

## File Map

```
hasni-bank/
├── functions/
│   └── contact.js
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx + Navbar.module.css
│   │   │   └── Footer.jsx + Footer.module.css
│   │   ├── sections/
│   │   │   ├── Hero.jsx + Hero.module.css
│   │   │   ├── HowItWorks.jsx + HowItWorks.module.css
│   │   │   ├── FinancingTracks.jsx + FinancingTracks.module.css
│   │   │   ├── Stats.jsx + Stats.module.css
│   │   │   ├── FunderStrip.jsx + FunderStrip.module.css
│   │   │   ├── FaqTeaser.jsx + FaqTeaser.module.css
│   │   │   └── CtaBand.jsx + CtaBand.module.css
│   │   └── ui/
│   │       ├── Button.jsx + Button.module.css
│   │       ├── Badge.jsx + Badge.module.css
│   │       ├── Card.jsx + Card.module.css
│   │       ├── Container.jsx + Container.module.css
│   │       └── SectionHeading.jsx + SectionHeading.module.css
│   ├── data/
│   │   ├── siteConfig.js
│   │   ├── navData.js
│   │   ├── financingData.js
│   │   ├── teamData.js
│   │   └── insightsData.js
│   ├── hooks/
│   │   ├── useScrollPosition.js
│   │   ├── useIntersection.js
│   │   └── useSEO.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── SmeFinance.jsx
│   │   ├── ProjectFunding.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── About.jsx
│   │   ├── Team.jsx
│   │   ├── Insights.jsx
│   │   └── Contact.jsx
│   ├── seo/
│   │   ├── seoConfig.js
│   │   └── structuredData.js
│   ├── styles/
│   │   ├── tokens.css
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── .dev.vars.example
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## MILESTONE 1 — Scaffold + Design System

---

### Task 1: Initialize Vite + React project

**Files:**
- Create: `package.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx` (Vite scaffold)

- [ ] **Step 1: Scaffold the project**

Run inside `H:\Hasni Bank`:
```bash
npm create vite@latest . -- --template react
```
When prompted about existing files, select "Ignore files and continue".

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install react-router-dom resend
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server starts on `http://localhost:5173`. Browser shows default Vite + React page. Press Ctrl+C.

---

### Task 2: Strip Vite boilerplate

**Files:**
- Delete: `src/App.css`, `src/assets/react.svg`
- Modify: `src/index.css` → delete all content

- [ ] **Step 1: Remove default Vite assets**

```bash
rm src/App.css src/assets/react.svg
```

- [ ] **Step 2: Clear index.css**

Replace `src/index.css` with an empty file — it will be replaced by our globals.css import in main.jsx.

```css
/* intentionally blank — see src/styles/globals.css */
```

- [ ] **Step 3: Clear App.jsx to a stub**

Replace `src/App.jsx` completely:
```jsx
export default function App() {
  return <div />
}
```

---

### Task 3: Create design tokens

**Files:**
- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the file**

```css
:root {
  /* Brand colours */
  --color-navy: #0B1220;
  --color-surface: #16213B;
  --color-gold: #CBA135;
  --color-gold-soft: #E2C572;
  --color-ivory: #F4F1E8;
  --color-muted: #9FA9BD;
  --color-border: #2A3654;
  --color-success: #3FA37A;

  /* Typography */
  --font-heading: 'Fraunces', Georgia, serif;
  --font-body: 'Inter', system-ui, sans-serif;

  /* Font sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
  --text-6xl: 3.75rem;

  /* Spacing (multiples of 4px) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-base: 300ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 600ms cubic-bezier(0.16, 1, 0.3, 1);

  /* Layout */
  --max-width-xl: 1280px;
  --section-padding-y: var(--space-20);
}
```

---

### Task 4: Create global styles

**Files:**
- Create: `src/styles/globals.css`

- [ ] **Step 1: Create the file**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html { scroll-behavior: smooth; }

body {
  background-color: var(--color-navy);
  color: var(--color-ivory);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
  color: var(--color-ivory);
}

a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
button { cursor: pointer; border: none; background: none; font-family: inherit; }

/* ── Animation classes ── */
.fade-up {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity var(--transition-slow), transform var(--transition-slow);
}
.fade-up.visible { opacity: 1; transform: translateY(0); }

.fade-in {
  opacity: 0;
  transition: opacity var(--transition-slow);
}
.fade-in.visible { opacity: 1; }

.stagger-children .stagger-child {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity var(--transition-slow), transform var(--transition-slow);
}
.stagger-children.visible .stagger-child:nth-child(1) { transition-delay: 0ms; }
.stagger-children.visible .stagger-child:nth-child(2) { transition-delay: 100ms; }
.stagger-children.visible .stagger-child:nth-child(3) { transition-delay: 200ms; }
.stagger-children.visible .stagger-child:nth-child(4) { transition-delay: 300ms; }
.stagger-children.visible .stagger-child:nth-child(5) { transition-delay: 400ms; }
.stagger-children.visible .stagger-child:nth-child(6) { transition-delay: 500ms; }
.stagger-children.visible .stagger-child { opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: reduce) {
  .fade-up, .fade-in, .stagger-children .stagger-child {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

### Task 5: Update index.html and vite.config.js

**Files:**
- Modify: `index.html`
- Modify: `vite.config.js`

- [ ] **Step 1: Replace index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
    <title>Hasni Bank — Global Financing Solutions</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
})
```

- [ ] **Step 3: Add a placeholder favicon**

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0B1220"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="serif" font-size="18" fill="#CBA135">H</text>
</svg>
```

---

### Task 6: Commit Milestone 1

- [ ] **Step 1: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite/React project with design tokens and global styles"
```

Expected: Clean commit. `npm run dev` shows blank navy page with Fraunces + Inter fonts loading (verify in browser before committing).

---

## MILESTONE 2 — UI Primitives + Layout Shell

---

### Task 7: Create useScrollPosition hook

**Files:**
- Create: `src/hooks/useScrollPosition.js`

- [ ] **Step 1: Create the hook**

```js
import { useState, useEffect } from 'react'

export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrollY
}
```

---

### Task 8: Create navData.js (needed by Navbar and Footer)

**Files:**
- Create: `src/data/navData.js`

- [ ] **Step 1: Create the file**

```js
export const navLinks = [
  { label: 'SME Finance',    href: '/sme-finance' },
  { label: 'Project Funding', href: '/project-funding' },
  { label: 'How It Works',   href: '/how-it-works' },
  { label: 'About',          href: '/about' },
  { label: 'Insights',       href: '/insights' },
]
```

---

### Task 9: Create Container component

**Files:**
- Create: `src/components/ui/Container.jsx`
- Create: `src/components/ui/Container.module.css`

- [ ] **Step 1: Create Container.jsx**

```jsx
import styles from './Container.module.css'

export default function Container({ children, className = '' }) {
  return (
    <div className={`${styles.container} ${className}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create Container.module.css**

```css
.container {
  width: 100%;
  max-width: var(--max-width-xl);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

@media (min-width: 768px) {
  .container { padding: 0 var(--space-8); }
}
```

---

### Task 10: Create Button component

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Button.module.css`

- [ ] **Step 1: Create Button.jsx**

```jsx
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

export default function Button({ children, variant = 'primary', href, onClick, type = 'button', className = '' }) {
  const cls = `${styles.btn} ${styles[variant]} ${className}`
  if (href) return <Link to={href} className={cls}>{children}</Link>
  return <button type={type} onClick={onClick} className={cls}>{children}</button>
}
```

- [ ] **Step 2: Create Button.module.css**

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  text-decoration: none;
  white-space: nowrap;
  border: 2px solid transparent;
}

.primary {
  background-color: var(--color-gold);
  color: var(--color-navy);
  border-color: var(--color-gold);
}
.primary:hover {
  background-color: var(--color-gold-soft);
  border-color: var(--color-gold-soft);
}

.outline {
  background-color: transparent;
  color: var(--color-gold);
  border-color: var(--color-gold);
}
.outline:hover {
  background-color: var(--color-gold);
  color: var(--color-navy);
}
```

---

### Task 11: Create Badge component

**Files:**
- Create: `src/components/ui/Badge.jsx`
- Create: `src/components/ui/Badge.module.css`

- [ ] **Step 1: Create Badge.jsx**

```jsx
import styles from './Badge.module.css'

export default function Badge({ children, className = '' }) {
  return <span className={`${styles.badge} ${className}`}>{children}</span>
}
```

- [ ] **Step 2: Create Badge.module.css**

```css
.badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  background-color: rgba(203, 161, 53, 0.12);
  color: var(--color-gold);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(203, 161, 53, 0.25);
}
```

---

### Task 12: Create SectionHeading component

**Files:**
- Create: `src/components/ui/SectionHeading.jsx`
- Create: `src/components/ui/SectionHeading.module.css`

- [ ] **Step 1: Create SectionHeading.jsx**

```jsx
import styles from './SectionHeading.module.css'

export default function SectionHeading({ label, title, subtitle, align = 'center', className = '' }) {
  return (
    <div className={`${styles.heading} ${styles[align]} ${className}`}>
      {label && <span className={styles.label}>{label}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create SectionHeading.module.css**

```css
.heading { margin-bottom: var(--space-12); }
.center  { text-align: center; }
.left    { text-align: left; }

.label {
  display: inline-block;
  color: var(--color-gold);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: var(--space-3);
}

.title {
  font-size: var(--text-4xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-4);
}
@media (min-width: 768px) {
  .title { font-size: var(--text-5xl); }
}

.subtitle {
  font-size: var(--text-lg);
  color: var(--color-muted);
  max-width: 640px;
}
.center .subtitle { margin: 0 auto; }
```

---

### Task 13: Create Card component

**Files:**
- Create: `src/components/ui/Card.jsx`
- Create: `src/components/ui/Card.module.css`

- [ ] **Step 1: Create Card.jsx**

```jsx
import styles from './Card.module.css'

export default function Card({ children, className = '' }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}
```

- [ ] **Step 2: Create Card.module.css**

```css
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  transition: border-color var(--transition-base);
}
.card:hover { border-color: rgba(203, 161, 53, 0.3); }
```

---

### Task 14: Create Navbar component

**Files:**
- Create: `src/components/layout/Navbar.jsx`
- Create: `src/components/layout/Navbar.module.css`

- [ ] **Step 1: Create Navbar.jsx**

```jsx
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useScrollPosition } from '../../hooks/useScrollPosition'
import { navLinks } from '../../data/navData'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const scrollY = useScrollPosition()

  return (
    <header className={`${styles.header} ${scrollY > 20 ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>Hasni Bank</Link>

        <nav className={styles.nav}>
          {navLinks.map(link => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/contact" className={styles.cta}>Get Started</Link>

        <button className={styles.hamburger} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>

      {open && (
        <div className={styles.mobileMenu}>
          {navLinks.map(link => (
            <NavLink
              key={link.href}
              to={link.href}
              className={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <Link to="/contact" className={styles.mobileCta} onClick={() => setOpen(false)}>
            Get Started
          </Link>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Create Navbar.module.css**

```css
.header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  transition: background-color var(--transition-base), box-shadow var(--transition-base);
}
.scrolled {
  background-color: rgba(11, 18, 32, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 0 var(--color-border);
}

.inner {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  max-width: var(--max-width-xl);
  margin: 0 auto;
  padding: var(--space-4) var(--space-6);
}

.logo {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ivory);
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.nav { display: flex; gap: var(--space-6); margin-left: auto; }

.navLink {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-muted);
  transition: color var(--transition-fast);
  white-space: nowrap;
}
.navLink:hover, .navLink.active { color: var(--color-ivory); }

.cta {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-gold);
  color: var(--color-navy);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
  flex-shrink: 0;
}
.cta:hover { background-color: var(--color-gold-soft); }

.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: var(--space-2);
  margin-left: auto;
}
.hamburger span {
  display: block;
  width: 22px; height: 2px;
  background-color: var(--color-ivory);
  border-radius: 2px;
}

.mobileMenu {
  display: flex;
  flex-direction: column;
  padding: var(--space-4) var(--space-6) var(--space-6);
  background-color: rgba(11, 18, 32, 0.98);
  border-top: 1px solid var(--color-border);
}
.mobileLink {
  padding: var(--space-3) 0;
  font-size: var(--text-base);
  color: var(--color-muted);
  border-bottom: 1px solid var(--color-border);
  transition: color var(--transition-fast);
}
.mobileLink:hover { color: var(--color-ivory); }

.mobileCta {
  margin-top: var(--space-4);
  display: inline-flex;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-gold);
  color: var(--color-navy);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .nav, .cta { display: none; }
  .hamburger { display: flex; }
}
```

---

### Task 15: Create Footer component

**Files:**
- Create: `src/components/layout/Footer.jsx`
- Create: `src/components/layout/Footer.module.css`

- [ ] **Step 1: Create Footer.jsx**

```jsx
import { Link } from 'react-router-dom'
import Container from '../ui/Container'
import { navLinks } from '../../data/navData'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.grid}>
          <div>
            <span className={styles.logo}>Hasni Bank</span>
            <p className={styles.tagline}>
              Global financing solutions connecting businesses with international capital.
            </p>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeader}>Navigation</h4>
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} className={styles.link}>{link.label}</Link>
            ))}
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkHeader}>Get Started</h4>
            <Link to="/contact" className={styles.link}>Apply for Financing</Link>
            <Link to="/sme-finance" className={styles.link}>SME Finance</Link>
            <Link to="/project-funding" className={styles.link}>Project Funding</Link>
          </div>
        </div>
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Hasni Bank. All rights reserved.</p>
          <p className={styles.disclaimer}>
            Hasni Bank operates as a financing marketplace. Not a deposit-taking institution.
          </p>
        </div>
      </Container>
    </footer>
  )
}
```

- [ ] **Step 2: Create Footer.module.css**

```css
.footer {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--space-16) 0 var(--space-8);
  margin-top: auto;
}

.grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-12);
  padding-bottom: var(--space-12);
  border-bottom: 1px solid var(--color-border);
}
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; gap: var(--space-8); }
}

.logo {
  display: block;
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-4);
}

.tagline {
  color: var(--color-muted);
  font-size: var(--text-sm);
  line-height: 1.6;
  max-width: 280px;
}

.linkGroup { display: flex; flex-direction: column; gap: var(--space-3); }

.linkHeader {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-gold);
  margin-bottom: var(--space-4);
}

.link {
  color: var(--color-muted);
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}
.link:hover { color: var(--color-ivory); }

.bottom {
  padding-top: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-muted);
  font-size: var(--text-sm);
}
.disclaimer { font-size: var(--text-xs); opacity: 0.7; }
```

---

### Task 16: Create App.jsx routing shell and main.jsx

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Replace src/App.jsx with routing shell**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ paddingTop: '72px' }}>
        <Routes>
          <Route path="/"                element={<div />} />
          <Route path="/sme-finance"     element={<div />} />
          <Route path="/project-funding" element={<div />} />
          <Route path="/how-it-works"    element={<div />} />
          <Route path="/about"           element={<div />} />
          <Route path="/team"            element={<div />} />
          <Route path="/insights"        element={<div />} />
          <Route path="/contact"         element={<div />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Replace src/main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/globals.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Verify**

```bash
npm run dev
```
Expected: `http://localhost:5173` shows Navbar and Footer on a blank navy page. All nav links navigate without errors. Mobile hamburger visible below 768px.

---

### Task 17: Commit Milestone 2

- [ ] **Step 1: Commit**

```bash
git add .
git commit -m "feat: add UI primitives, layout shell (Navbar, Footer), and routing scaffold"
```

---

## MILESTONE 3 — Data Layer + Hooks + SEO

---

### Task 18: Create siteConfig.js

**Files:**
- Create: `src/data/siteConfig.js`

- [ ] **Step 1: Create the file**

```js
export const siteConfig = {
  name: 'Hasni Bank',
  tagline: 'Global Financing Solutions',
  contact: {
    email: 'financing@hasnibank.com',
  },
  stats: [
    { value: 2500,  suffix: '+',   label: 'Businesses Funded' },
    { value: 4.2,   prefix: '$', suffix: 'B+', label: 'Capital Deployed' },
    { value: 47,    suffix: '+',   label: 'Countries Reached' },
    { value: 92,    suffix: '%',   label: 'Approval Rate' },
  ],
  faq: [
    {
      question: 'What types of financing does Hasni Bank offer?',
      answer: 'We offer a broad spectrum of financing solutions including SME working capital, equipment financing, project debt and equity, trade finance, and acquisition finance. Our marketplace model connects you with the right funder for your specific need.',
    },
    {
      question: 'How long does the application process take?',
      answer: 'Initial assessment typically takes 3–5 business days. Once matched with a funder, the timeline depends on the complexity and size of your requirement, but most transactions complete within 30–90 days.',
    },
    {
      question: 'What is the minimum funding amount?',
      answer: 'We work with funding requirements from $500,000 for SME financing up to multi-billion dollar project finance mandates. Our global network gives you access to funders suited to your scale.',
    },
  ],
}
```

---

### Task 19: Create financingData.js

**Files:**
- Create: `src/data/financingData.js`

- [ ] **Step 1: Create the file**

```js
export const financingTracks = [
  {
    id: 'sme',
    badge: 'Business Finance',
    title: 'SME Financing',
    description: 'Working capital, equipment, trade, and expansion finance for small and medium enterprises.',
    href: '/sme-finance',
  },
  {
    id: 'project',
    badge: 'Large Projects',
    title: 'Project Funding',
    description: 'Debt, equity, and structured finance for infrastructure, energy, real estate, and industrial projects.',
    href: '/project-funding',
  },
  {
    id: 'trade',
    badge: 'Trade & Supply Chain',
    title: 'Trade Finance',
    description: 'Letters of credit, export financing, and supply chain solutions for international commerce.',
    href: '/contact',
  },
  {
    id: 'acquisition',
    badge: 'M&A Finance',
    title: 'Acquisition Finance',
    description: 'Leveraged buyout financing, management buyouts, and acquisition credit facilities.',
    href: '/contact',
  },
]

export const smeServices = [
  {
    icon: '◈',
    title: 'Working Capital',
    description: 'Revolving credit facilities and term loans to fund day-to-day operations and bridge cash flow gaps.',
  },
  {
    icon: '⬡',
    title: 'Equipment Finance',
    description: 'Asset-backed financing for machinery, technology, and fleet — preserve cash while building capacity.',
  },
  {
    icon: '◆',
    title: 'Business Expansion',
    description: 'Growth capital for opening new markets, hiring talent, or scaling production.',
  },
  {
    icon: '◇',
    title: 'Trade Finance',
    description: 'Import/export letters of credit, invoice discounting, and supply chain finance.',
  },
]

export const projectSectors = [
  { icon: '⬡', title: 'Infrastructure',       description: 'Roads, bridges, ports, airports, and utilities.' },
  { icon: '◈', title: 'Energy',               description: 'Renewable and conventional energy generation and distribution.' },
  { icon: '◆', title: 'Real Estate',          description: 'Commercial, residential, and mixed-use developments.' },
  { icon: '◇', title: 'Agriculture',          description: 'Agri-processing, irrigation, storage, and agribusiness.' },
  { icon: '▣', title: 'Manufacturing',        description: 'Industrial plant, production facilities, and supply chains.' },
  { icon: '▸', title: 'Mining & Resources',   description: 'Mining operations, refining, and resource extraction.' },
]

export const fundingStructures = [
  {
    title: 'Debt Finance',
    description: 'Senior, mezzanine, and subordinated loans from institutional lenders and development finance institutions.',
  },
  {
    title: 'Equity Finance',
    description: 'Equity investment from private equity, family offices, and institutional investors seeking project returns.',
  },
  {
    title: 'Joint Ventures',
    description: 'Structured co-investment arrangements for large-scale projects requiring both capital and operational partners.',
  },
  {
    title: 'Structured Finance',
    description: 'Bespoke blended finance, PPPs, and asset-backed structures tailored to complex project requirements.',
  },
]
```

---

### Task 20: Create teamData.js and insightsData.js

**Files:**
- Create: `src/data/teamData.js`
- Create: `src/data/insightsData.js`

- [ ] **Step 1: Create teamData.js**

```js
export const team = [
  {
    name: 'Ahmed Al-Hasni',
    title: 'Chief Executive Officer',
    bio: 'Two decades in international project finance and capital markets. Previously led financing mandates across MENA, Sub-Saharan Africa, and Southeast Asia.',
  },
  {
    name: 'Sarah Mitchell',
    title: 'Head of Financing',
    bio: 'Specialist in structured debt and mezzanine instruments with a background at leading European investment banks. Oversees funder relationships and deal structuring.',
  },
  {
    name: 'James Okonkwo',
    title: 'Senior Financial Analyst',
    bio: 'CFA charterholder with expertise in credit analysis and project feasibility assessment. Leads due diligence and financial modelling for all mandates.',
  },
  {
    name: 'Priya Nair',
    title: 'Client Relationship Manager',
    bio: 'Eight years managing institutional client relationships across Asia-Pacific and the Gulf. Guides applicants from initial inquiry through to funding completion.',
  },
]
```

- [ ] **Step 2: Create insightsData.js**

```js
export const insightsCategories = [
  {
    slug: 'sme-growth-strategies',
    title: 'SME Growth Strategies',
    description: 'Practical guidance on scaling your business, accessing new markets, and managing capital through growth phases.',
    icon: '◈',
  },
  {
    slug: 'international-finance-trends',
    title: 'International Finance Trends',
    description: 'Analysis of global capital markets, interest rate environments, and cross-border financing opportunities.',
    icon: '◆',
  },
  {
    slug: 'project-development-insights',
    title: 'Project Development Insights',
    description: 'In-depth guides on structuring, financing, and executing large infrastructure and energy projects.',
    icon: '⬡',
  },
  {
    slug: 'capital-raising-guidance',
    title: 'Capital Raising Guidance',
    description: 'Step-by-step resources for preparing investor materials, approaching funders, and negotiating terms.',
    icon: '◇',
  },
  {
    slug: 'trade-finance-updates',
    title: 'Trade Finance Updates',
    description: 'News and analysis on trade corridors, export credit, and supply chain finance developments.',
    icon: '▣',
  },
]
```

---

### Task 21: Create useIntersection and useSEO hooks

**Files:**
- Create: `src/hooks/useIntersection.js`
- Create: `src/hooks/useSEO.js`

- [ ] **Step 1: Create useIntersection.js**

```js
import { useState, useEffect, useRef } from 'react'

export function useIntersection(threshold = 0.15) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}
```

- [ ] **Step 2: Create useSEO.js**

```js
import { useEffect } from 'react'

export function useSEO({ title, description, keywords, canonical, structuredData }) {
  useEffect(() => {
    document.title = title

    setMeta('name', 'description', description)
    if (keywords) setMeta('name', 'keywords', keywords)
    if (canonical) setLink('canonical', canonical)

    if (structuredData) {
      document.querySelectorAll('script[data-sd]').forEach(el => el.remove())
      const items = Array.isArray(structuredData) ? structuredData : [structuredData]
      items.forEach((sd, i) => {
        const script = document.createElement('script')
        script.setAttribute('data-sd', String(i))
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(sd)
        document.head.appendChild(script)
      })
    }
  }, [title, description, keywords, canonical, structuredData])
}

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}
```

---

### Task 22: Create seoConfig.js and structuredData.js

**Files:**
- Create: `src/seo/seoConfig.js`
- Create: `src/seo/structuredData.js`

- [ ] **Step 1: Create seoConfig.js**

```js
const BASE = 'https://hasnibank.com'

export const seoConfig = {
  home: {
    title: 'Hasni Bank — Global Financing Solutions',
    description: 'Hasni Bank connects SMEs, entrepreneurs, and project sponsors with an international network of funders, lenders, and institutions.',
    keywords: 'global financing solutions, SME financing, project funding, international finance, business funding',
    canonical: `${BASE}/`,
  },
  smeFinance: {
    title: 'SME Finance — Working Capital & Business Loans | Hasni Bank',
    description: 'Access working capital, equipment finance, business expansion loans, and trade finance through our global funder network.',
    keywords: 'SME financing, business loans, working capital, equipment finance, trade finance solutions',
    canonical: `${BASE}/sme-finance`,
  },
  projectFunding: {
    title: 'Project Funding — Infrastructure & Energy Finance | Hasni Bank',
    description: 'Debt, equity, and structured finance for infrastructure, energy, real estate, and industrial projects worldwide.',
    keywords: 'project funding, infrastructure financing, energy finance, private financing solutions',
    canonical: `${BASE}/project-funding`,
  },
  howItWorks: {
    title: 'How It Works — Our Financing Process | Hasni Bank',
    description: 'A four-step process: submit your requirement, assessment, funder matching, and completion.',
    keywords: 'how it works, financing process, apply for funding, funder matching',
    canonical: `${BASE}/how-it-works`,
  },
  about: {
    title: 'About Hasni Bank — Our Mission & Values',
    description: 'Hasni Bank is a global financing marketplace built on integrity, excellence, and a deep understanding of international capital markets.',
    keywords: 'about Hasni Bank, global financing marketplace, international finance',
    canonical: `${BASE}/about`,
  },
  team: {
    title: 'Our Team — Hasni Bank',
    description: 'Meet the experienced financing professionals behind Hasni Bank.',
    keywords: 'Hasni Bank team, financing professionals',
    canonical: `${BASE}/team`,
  },
  insights: {
    title: 'Insights — Finance & Capital Markets | Hasni Bank',
    description: 'Expert analysis, guides, and updates on SME growth, international finance, project development, and trade finance.',
    keywords: 'finance insights, capital markets, SME growth strategies, trade finance updates',
    canonical: `${BASE}/insights`,
  },
  contact: {
    title: 'Apply for Financing — Hasni Bank',
    description: 'Submit your financing requirement and our team will assess your needs and connect you with the right funders.',
    keywords: 'apply for financing, contact Hasni Bank, funding application',
    canonical: `${BASE}/contact`,
  },
}
```

- [ ] **Step 2: Create structuredData.js**

```js
const BASE = 'https://hasnibank.com'

export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hasni Bank',
  url: BASE,
  logo: `${BASE}/favicon.svg`,
  description: 'Global financing marketplace connecting SMEs and project sponsors with international capital.',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'financing@hasnibank.com',
    contactType: 'customer service',
  },
}

export const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hasni Bank',
  url: BASE,
}

export const serviceData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'SME Financing',
    provider: { '@type': 'Organization', name: 'Hasni Bank' },
    description: 'Working capital, equipment finance, and expansion loans for small and medium enterprises.',
    url: `${BASE}/sme-finance`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Project Funding',
    provider: { '@type': 'Organization', name: 'Hasni Bank' },
    description: 'Debt, equity, and structured finance for infrastructure, energy, and industrial projects.',
    url: `${BASE}/project-funding`,
  },
]

export function getFAQStructuredData(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
```

---

### Task 23: Commit Milestone 3

- [ ] **Step 1: Verify build still passes**

```bash
npm run build
```
Expected: Build exits 0. No import errors.

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add data layer, hooks (useIntersection, useSEO, useScrollPosition), and SEO config"
```

---

## MILESTONE 4 — Section Components

---

### Task 24: Create Hero section

**Files:**
- Create: `src/components/sections/Hero.jsx`
- Create: `src/components/sections/Hero.module.css`

- [ ] **Step 1: Create Hero.jsx**

```jsx
import { Link } from 'react-router-dom'
import Container from '../ui/Container'
import Button from '../ui/Button'
import styles from './Hero.module.css'

const IMAGES = {
  home:           'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
  smeFinance:     'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1920&q=80',
  projectFunding: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80',
  howItWorks:     'https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=1920&q=80',
  about:          'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1920&q=80',
  team:           'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1920&q=80',
  insights:       'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&w=1920&q=80',
  contact:        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=80',
}

export default function Hero({ imageKey = 'home', badge, heading, subheading, primaryCta, secondaryCta }) {
  const img = IMAGES[imageKey] ?? IMAGES.home

  return (
    <section
      className={styles.hero}
      style={{
        backgroundImage: `linear-gradient(rgba(11,18,32,0.72), rgba(11,18,32,0.88)), url(${img})`,
      }}
    >
      <Container>
        <div className={styles.content}>
          {badge && <span className={styles.badge}>{badge}</span>}
          <h1 className={styles.heading}>{heading}</h1>
          {subheading && <p className={styles.subheading}>{subheading}</p>}
          {(primaryCta || secondaryCta) && (
            <div className={styles.actions}>
              {primaryCta  && <Button href={primaryCta.href}  variant="primary">{primaryCta.label}</Button>}
              {secondaryCta && <Button href={secondaryCta.href} variant="outline">{secondaryCta.label}</Button>}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create Hero.module.css**

```css
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: var(--space-24) 0 var(--space-20);
}

.content { max-width: 700px; }

.badge {
  display: inline-block;
  color: var(--color-gold);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: var(--space-4);
}

.heading {
  font-size: var(--text-5xl);
  font-weight: 700;
  color: var(--color-ivory);
  line-height: 1.1;
  margin-bottom: var(--space-6);
}
@media (min-width: 768px) { .heading { font-size: var(--text-6xl); } }

.subheading {
  font-size: var(--text-xl);
  color: rgba(244, 241, 232, 0.8);
  line-height: 1.6;
  margin-bottom: var(--space-8);
  max-width: 560px;
}

.actions { display: flex; gap: var(--space-4); flex-wrap: wrap; }
```

---

### Task 25: Create HowItWorks section

**Files:**
- Create: `src/components/sections/HowItWorks.jsx`
- Create: `src/components/sections/HowItWorks.module.css`

- [ ] **Step 1: Create HowItWorks.jsx**

```jsx
import { useIntersection } from '../../hooks/useIntersection'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import styles from './HowItWorks.module.css'

const steps = [
  { number: '01', title: 'Submit Your Requirement', description: 'Complete our structured financing application. Tell us about your business, the amount required, and how the capital will be used.' },
  { number: '02', title: 'Assessment',               description: 'Our financing team reviews your application within 3–5 business days and conducts an initial creditworthiness assessment.' },
  { number: '03', title: 'Funder Matching',           description: 'We match your requirement against our global network of lenders, investors, and institutions best suited to your profile.' },
  { number: '04', title: 'Completion',                description: 'Receive term sheets, negotiate directly with your matched funder, and complete your financing with our support throughout.' },
]

function Step({ number, title, description, index }) {
  const { ref, isVisible } = useIntersection()
  return (
    <div
      ref={ref}
      className={`${styles.step} fade-up ${isVisible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <span className={styles.number}>{number}</span>
      <h3 className={styles.stepTitle}>{title}</h3>
      <p className={styles.stepDesc}>{description}</p>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="Process"
          title="From Application to Funding"
          subtitle="A transparent four-step process designed to move you from requirement to capital efficiently."
        />
        <div className={styles.grid}>
          {steps.map((step, i) => (
            <Step key={step.number} {...step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create HowItWorks.module.css**

```css
.section {
  padding: var(--section-padding-y) 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-8);
}
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
}

.step {
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  position: relative;
}

.number {
  display: block;
  font-family: var(--font-heading);
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--color-gold);
  opacity: 0.4;
  margin-bottom: var(--space-4);
  line-height: 1;
}

.stepTitle {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-3);
}

.stepDesc {
  font-size: var(--text-base);
  color: var(--color-muted);
  line-height: 1.7;
}
```

---

### Task 26: Create FinancingTracks section

**Files:**
- Create: `src/components/sections/FinancingTracks.jsx`
- Create: `src/components/sections/FinancingTracks.module.css`

- [ ] **Step 1: Create FinancingTracks.jsx**

```jsx
import { Link } from 'react-router-dom'
import { useIntersection } from '../../hooks/useIntersection'
import { financingTracks } from '../../data/financingData'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import Badge from '../ui/Badge'
import styles from './FinancingTracks.module.css'

export default function FinancingTracks() {
  const { ref, isVisible } = useIntersection()

  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="Solutions"
          title="Financing for Every Scale"
          subtitle="Whether you're an SME seeking working capital or a sponsor funding a $500M infrastructure project, we have a pathway for you."
        />
        <div ref={ref} className={`${styles.grid} stagger-children ${isVisible ? 'visible' : ''}`}>
          {financingTracks.map(track => (
            <Link key={track.id} to={track.href} className={`${styles.card} stagger-child`}>
              <Badge className={styles.badge}>{track.badge}</Badge>
              <h3 className={styles.title}>{track.title}</h3>
              <p className={styles.description}>{track.description}</p>
              <span className={styles.arrow}>→</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create FinancingTracks.module.css**

```css
.section {
  padding: var(--section-padding-y) 0;
  background-color: var(--color-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-8);
  background-color: var(--color-navy);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: border-color var(--transition-base), transform var(--transition-base);
}
.card:hover {
  border-color: var(--color-gold);
  transform: translateY(-2px);
}

.badge { align-self: flex-start; }

.title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-ivory);
}

.description {
  font-size: var(--text-base);
  color: var(--color-muted);
  line-height: 1.7;
  flex: 1;
}

.arrow {
  color: var(--color-gold);
  font-size: var(--text-lg);
  transition: transform var(--transition-fast);
}
.card:hover .arrow { transform: translateX(4px); }
```

---

### Task 27: Create Stats section

**Files:**
- Create: `src/components/sections/Stats.jsx`
- Create: `src/components/sections/Stats.module.css`

- [ ] **Step 1: Create Stats.jsx**

```jsx
import { useState, useEffect } from 'react'
import { useIntersection } from '../../hooks/useIntersection'
import { siteConfig } from '../../data/siteConfig'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import styles from './Stats.module.css'

function StatItem({ value, suffix = '', prefix = '', label }) {
  const { ref, isVisible } = useIntersection(0.3)
  const [count, setCount] = useState(0)
  const isDecimal = !Number.isInteger(value)

  useEffect(() => {
    if (!isVisible) return
    const duration = 1800
    const steps = 60
    const inc = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(current + inc, value)
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current))
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, value, isDecimal])

  return (
    <div ref={ref} className={styles.stat}>
      <div className={styles.value}>{prefix}{count}{suffix}</div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}

export default function Stats() {
  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="Impact"
          title="Financing at Scale"
          subtitle="Trusted by businesses and project sponsors across six continents."
        />
        <div className={styles.grid}>
          {siteConfig.stats.map((stat, i) => (
            <StatItem key={i} {...stat} />
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create Stats.module.css**

```css
.section { padding: var(--section-padding-y) 0; }

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-8);
}
@media (max-width: 900px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; }
}

.stat { text-align: center; }

.value {
  font-family: var(--font-heading);
  font-size: var(--text-5xl);
  font-weight: 700;
  color: var(--color-gold);
  line-height: 1;
  margin-bottom: var(--space-3);
}

.label {
  font-size: var(--text-sm);
  color: var(--color-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

---

### Task 28: Create FunderStrip section

**Files:**
- Create: `src/components/sections/FunderStrip.jsx`
- Create: `src/components/sections/FunderStrip.module.css`

- [ ] **Step 1: Create FunderStrip.jsx**

```jsx
import Container from '../ui/Container'
import styles from './FunderStrip.module.css'

const funders = [
  'International Finance Corp.',
  'European Investment Bank',
  'African Development Bank',
  'Gulf Capital Partners',
  'Asia Infrastructure Fund',
  'Meridian Private Credit',
]

export default function FunderStrip() {
  return (
    <section className={styles.section}>
      <Container>
        <p className={styles.label}>Trusted by funders and institutions worldwide</p>
        <div className={styles.strip}>
          {funders.map(name => (
            <span key={name} className={styles.funder}>{name}</span>
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create FunderStrip.module.css**

```css
.section {
  padding: var(--space-12) 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.label {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: var(--space-8);
}

.strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-8) var(--space-12);
}

.funder {
  font-family: var(--font-heading);
  font-size: var(--text-base);
  color: var(--color-muted);
  opacity: 0.6;
  white-space: nowrap;
  transition: opacity var(--transition-base);
}
.funder:hover { opacity: 1; }
```

---

### Task 29: Create FaqTeaser section

**Files:**
- Create: `src/components/sections/FaqTeaser.jsx`
- Create: `src/components/sections/FaqTeaser.module.css`

- [ ] **Step 1: Create FaqTeaser.jsx**

```jsx
import { useState } from 'react'
import { siteConfig } from '../../data/siteConfig'
import Container from '../ui/Container'
import SectionHeading from '../ui/SectionHeading'
import styles from './FaqTeaser.module.css'

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`${styles.item} ${open ? styles.open : ''}`}>
      <button className={styles.question} onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className={styles.icon}>{open ? '−' : '+'}</span>
      </button>
      {open && <p className={styles.answer}>{answer}</p>}
    </div>
  )
}

export default function FaqTeaser() {
  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="FAQ"
          title="Common Questions"
          subtitle="Quick answers about how Hasni Bank works."
        />
        <div className={styles.list}>
          {siteConfig.faq.map((item, i) => (
            <FaqItem key={i} {...item} />
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create FaqTeaser.module.css**

```css
.section {
  padding: var(--section-padding-y) 0;
  background-color: var(--color-surface);
}

.list {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition-base);
}
.item.open { border-color: rgba(203, 161, 53, 0.4); }

.question {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-ivory);
  text-align: left;
  cursor: pointer;
  background: none;
  border: none;
}

.icon {
  color: var(--color-gold);
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.answer {
  padding: 0 var(--space-6) var(--space-6);
  font-size: var(--text-base);
  color: var(--color-muted);
  line-height: 1.7;
}
```

---

### Task 30: Create CtaBand section

**Files:**
- Create: `src/components/sections/CtaBand.jsx`
- Create: `src/components/sections/CtaBand.module.css`

- [ ] **Step 1: Create CtaBand.jsx**

```jsx
import Container from '../ui/Container'
import Button from '../ui/Button'
import styles from './CtaBand.module.css'

export default function CtaBand({
  heading = 'Ready to Secure Your Financing?',
  subheading = 'Submit your requirement and our team will match you with the right funders within days.',
  primaryCta = { label: 'Apply Now', href: '/contact' },
  secondaryCta = { label: 'How It Works', href: '/how-it-works' },
}) {
  return (
    <section className={styles.section}>
      <Container>
        <div className={styles.inner}>
          <div className={styles.copy}>
            <h2 className={styles.heading}>{heading}</h2>
            <p className={styles.subheading}>{subheading}</p>
          </div>
          <div className={styles.actions}>
            <Button href={primaryCta.href} variant="primary">{primaryCta.label}</Button>
            <Button href={secondaryCta.href} variant="outline">{secondaryCta.label}</Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 2: Create CtaBand.module.css**

```css
.section {
  padding: var(--space-20) 0;
  background: linear-gradient(135deg, rgba(203, 161, 53, 0.08) 0%, rgba(11, 18, 32, 0) 60%);
  border-top: 1px solid var(--color-border);
}

.inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-8);
}
@media (max-width: 768px) {
  .inner { flex-direction: column; text-align: center; }
}

.heading {
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-3);
}

.subheading {
  font-size: var(--text-base);
  color: var(--color-muted);
  max-width: 480px;
}

.actions {
  display: flex;
  gap: var(--space-4);
  flex-shrink: 0;
  flex-wrap: wrap;
}
@media (max-width: 768px) {
  .actions { justify-content: center; }
}
```

---

### Task 31: Verify sections — commit Milestone 4

- [ ] **Step 1: Temporarily wire sections into the Home route in App.jsx**

In `src/App.jsx`, replace `<Route path="/" element={<div />} />` with:
```jsx
import Hero from './components/sections/Hero'
import HowItWorks from './components/sections/HowItWorks'
import FinancingTracks from './components/sections/FinancingTracks'
import Stats from './components/sections/Stats'
import FunderStrip from './components/sections/FunderStrip'
import FaqTeaser from './components/sections/FaqTeaser'
import CtaBand from './components/sections/CtaBand'

// Inside Routes:
<Route path="/" element={
  <>
    <Hero
      imageKey="home"
      badge="Global Financing Marketplace"
      heading="Connect to the Capital Your Business Deserves"
      subheading="Hasni Bank matches SMEs and project sponsors with an international network of funders and institutions."
      primaryCta={{ label: 'Apply for Financing', href: '/contact' }}
      secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
    />
    <HowItWorks />
    <FinancingTracks />
    <Stats />
    <FunderStrip />
    <FaqTeaser />
    <CtaBand />
  </>
} />
```

- [ ] **Step 2: Check dev server**

```bash
npm run dev
```
Expected: Home route shows full-viewport hero, 4-step process, 4 financing track cards, 4 animated counters, funder strip, accordion FAQ, CTA band. Scroll animations trigger. FAQ accordion opens and closes.

- [ ] **Step 3: Revert App.jsx to placeholder routes**

Replace the Home route back to `<Route path="/" element={<div />} />` and remove the section imports. Pages are assembled in Milestone 5.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add all section components (Hero, HowItWorks, FinancingTracks, Stats, FunderStrip, FaqTeaser, CtaBand)"
```

---

## MILESTONE 5 — Pages

---

### Task 32: Create Home page

**Files:**
- Create: `src/pages/Home.jsx`

- [ ] **Step 1: Create Home.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { organizationData, websiteData, getFAQStructuredData } from '../seo/structuredData'
import { siteConfig } from '../data/siteConfig'
import Hero from '../components/sections/Hero'
import HowItWorks from '../components/sections/HowItWorks'
import FinancingTracks from '../components/sections/FinancingTracks'
import Stats from '../components/sections/Stats'
import FunderStrip from '../components/sections/FunderStrip'
import FaqTeaser from '../components/sections/FaqTeaser'
import CtaBand from '../components/sections/CtaBand'

export default function Home() {
  useSEO({
    ...seoConfig.home,
    structuredData: [organizationData, websiteData, getFAQStructuredData(siteConfig.faq)],
  })

  return (
    <>
      <Hero
        imageKey="home"
        badge="Global Financing Marketplace"
        heading="Connect to the Capital Your Business Deserves"
        subheading="Hasni Bank matches SMEs, entrepreneurs, and project sponsors with an international network of funders, lenders, and institutions."
        primaryCta={{ label: 'Apply for Financing', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />
      <HowItWorks />
      <FinancingTracks />
      <Stats />
      <FunderStrip />
      <FaqTeaser />
      <CtaBand />
    </>
  )
}
```

---

### Task 33: Create SmeFinance page

**Files:**
- Create: `src/pages/SmeFinance.jsx`

- [ ] **Step 1: Create SmeFinance.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { serviceData } from '../seo/structuredData'
import { smeServices } from '../data/financingData'
import Hero from '../components/sections/Hero'
import CtaBand from '../components/sections/CtaBand'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { useIntersection } from '../hooks/useIntersection'
import styles from './SmeFinance.module.css'

function ServiceCard({ icon, title, description, index }) {
  const { ref, isVisible } = useIntersection()
  return (
    <Card>
      <div
        ref={ref}
        className={`${styles.serviceCard} fade-up ${isVisible ? 'visible' : ''}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.serviceTitle}>{title}</h3>
        <p className={styles.serviceDesc}>{description}</p>
      </div>
    </Card>
  )
}

export default function SmeFinance() {
  useSEO({ ...seoConfig.smeFinance, structuredData: serviceData[0] })

  return (
    <>
      <Hero
        imageKey="smeFinance"
        badge="SME Finance"
        heading="Finance Built for Growing Businesses"
        subheading="Access the working capital, equipment finance, and trade facilities your business needs to grow — matched to lenders who understand your sector."
        primaryCta={{ label: 'Apply for Financing', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />
      <section className={styles.services}>
        <Container>
          <SectionHeading
            label="Services"
            title="SME Financing Solutions"
            subtitle="Four core financing products covering the full lifecycle of business growth."
          />
          <div className={styles.grid}>
            {smeServices.map((service, i) => (
              <ServiceCard key={service.title} {...service} index={i} />
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        heading="Ready to Fund Your Next Phase?"
        subheading="Tell us your requirement and we'll match you with the right lender within days."
      />
    </>
  )
}
```

- [ ] **Step 2: Create src/pages/SmeFinance.module.css**

```css
.services { padding: var(--section-padding-y) 0; }

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }

.serviceCard { display: flex; flex-direction: column; gap: var(--space-4); }

.icon {
  font-size: var(--text-3xl);
  color: var(--color-gold);
}

.serviceTitle {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ivory);
}

.serviceDesc {
  font-size: var(--text-base);
  color: var(--color-muted);
  line-height: 1.7;
}
```

---

### Task 34: Create ProjectFunding page

**Files:**
- Create: `src/pages/ProjectFunding.jsx`
- Create: `src/pages/ProjectFunding.module.css`

- [ ] **Step 1: Create ProjectFunding.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { serviceData } from '../seo/structuredData'
import { projectSectors, fundingStructures } from '../data/financingData'
import { useIntersection } from '../hooks/useIntersection'
import Hero from '../components/sections/Hero'
import CtaBand from '../components/sections/CtaBand'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import styles from './ProjectFunding.module.css'

export default function ProjectFunding() {
  useSEO({ ...seoConfig.projectFunding, structuredData: serviceData[1] })
  const { ref: sectorsRef, isVisible: sectorsVisible } = useIntersection()
  const { ref: structuresRef, isVisible: structuresVisible } = useIntersection()

  return (
    <>
      <Hero
        imageKey="projectFunding"
        badge="Project Funding"
        heading="Capital for Projects That Shape the Future"
        subheading="Debt, equity, and structured finance for infrastructure, energy, real estate, and industrial projects across six continents."
        primaryCta={{ label: 'Submit Your Project', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />

      <section className={styles.section}>
        <Container>
          <SectionHeading label="Sectors" title="Industries We Finance" subtitle="Our global funder network spans every major project sector." />
          <div ref={sectorsRef} className={`${styles.sectorsGrid} stagger-children ${sectorsVisible ? 'visible' : ''}`}>
            {projectSectors.map(sector => (
              <div key={sector.title} className={`${styles.sectorCard} stagger-child`}>
                <span className={styles.icon}>{sector.icon}</span>
                <h3 className={styles.sectorTitle}>{sector.title}</h3>
                <p className={styles.sectorDesc}>{sector.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.altBg}`}>
        <Container>
          <SectionHeading label="Structures" title="How We Structure Your Financing" subtitle="Every project has a unique capital requirement. We tailor the structure accordingly." />
          <div ref={structuresRef} className={`${styles.structuresGrid} stagger-children ${structuresVisible ? 'visible' : ''}`}>
            {fundingStructures.map(structure => (
              <Card key={structure.title} className={`stagger-child ${styles.structureCard}`}>
                <h3 className={styles.structureTitle}>{structure.title}</h3>
                <p className={styles.structureDesc}>{structure.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        heading="Have a Project in Mind?"
        subheading="Submit your project details and we will connect you with the right financing structure and funders."
      />
    </>
  )
}
```

- [ ] **Step 2: Create ProjectFunding.module.css**

```css
.section { padding: var(--section-padding-y) 0; }
.altBg { background-color: var(--color-surface); }

.sectorsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
@media (max-width: 900px) { .sectorsGrid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .sectorsGrid { grid-template-columns: 1fr; } }

.sectorCard {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.icon { font-size: var(--text-2xl); color: var(--color-gold); display: block; margin-bottom: var(--space-3); }
.sectorTitle { font-size: var(--text-lg); font-weight: 600; color: var(--color-ivory); margin-bottom: var(--space-2); }
.sectorDesc { font-size: var(--text-sm); color: var(--color-muted); line-height: 1.6; }

.structuresGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
@media (max-width: 768px) { .structuresGrid { grid-template-columns: 1fr; } }

.structureCard { display: flex; flex-direction: column; gap: var(--space-3); }
.structureTitle { font-size: var(--text-xl); font-weight: 600; color: var(--color-ivory); }
.structureDesc { font-size: var(--text-base); color: var(--color-muted); line-height: 1.7; }
```

---

### Task 35: Create HowItWorks page

**Files:**
- Create: `src/pages/HowItWorks.jsx`
- Create: `src/pages/HowItWorks.module.css`

- [ ] **Step 1: Create HowItWorks.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import Hero from '../components/sections/Hero'
import HowItWorksSection from '../components/sections/HowItWorks'
import CtaBand from '../components/sections/CtaBand'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import styles from './HowItWorks.module.css'

const mechanics = [
  {
    title: 'Marketplace Matching',
    body: 'Unlike a single lender, Hasni Bank operates as a marketplace. Your requirement is presented to multiple funders simultaneously, generating competitive term sheets and ensuring you receive the most appropriate financing structure.',
  },
  {
    title: 'Sector Expertise',
    body: 'Our financing team brings deep experience across SME lending, infrastructure debt, energy equity, and structured finance. We translate your requirement into the language funders respond to.',
  },
  {
    title: 'Global Reach',
    body: 'Our network spans commercial banks, development finance institutions, private credit funds, and family offices across Europe, the Gulf, Asia-Pacific, and Sub-Saharan Africa.',
  },
]

export default function HowItWorksPage() {
  useSEO(seoConfig.howItWorks)

  return (
    <>
      <Hero
        imageKey="howItWorks"
        badge="Our Process"
        heading="Transparent Financing from Start to Finish"
        subheading="Four steps. One team. A global network working in your favour."
        primaryCta={{ label: 'Start Your Application', href: '/contact' }}
      />
      <HowItWorksSection />
      <section className={styles.mechanics}>
        <Container>
          <SectionHeading label="Marketplace Model" title="Why Hasni Bank Works" align="left" />
          <div className={styles.grid}>
            {mechanics.map(m => (
              <div key={m.title} className={styles.mechCard}>
                <h3 className={styles.mechTitle}>{m.title}</h3>
                <p className={styles.mechBody}>{m.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  )
}
```

- [ ] **Step 2: Create HowItWorks.module.css**

```css
.mechanics {
  padding: var(--section-padding-y) 0;
  background-color: var(--color-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-8);
}
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

.mechCard {
  border-left: 2px solid var(--color-gold);
  padding-left: var(--space-6);
}

.mechTitle {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-3);
}

.mechBody {
  font-size: var(--text-base);
  color: var(--color-muted);
  line-height: 1.7;
}
```

---

### Task 36: Create About page

**Files:**
- Create: `src/pages/About.jsx`
- Create: `src/pages/About.module.css`

- [ ] **Step 1: Create About.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { organizationData } from '../seo/structuredData'
import Hero from '../components/sections/Hero'
import CtaBand from '../components/sections/CtaBand'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import styles from './About.module.css'

const values = [
  { title: 'Integrity',             body: 'We operate with transparency and honesty in every client and funder relationship. Our reputation is built on trust.' },
  { title: 'Excellence',            body: 'We bring institutional rigour to every mandate — from initial assessment through to completion.' },
  { title: 'Global Perspective',    body: 'Our team and network span continents. We understand the nuances of cross-border financing and local market dynamics.' },
  { title: 'Partnership',           body: 'We are not a transaction machine. We work alongside clients as long-term financing partners invested in their success.' },
]

export default function About() {
  useSEO({ ...seoConfig.about, structuredData: organizationData })

  return (
    <>
      <Hero
        imageKey="about"
        badge="About Hasni Bank"
        heading="A Financing Marketplace Built on Trust"
        subheading="We exist to bridge the gap between businesses that need capital and the global institutions that provide it."
        primaryCta={{ label: 'Meet the Team', href: '/team' }}
      />

      <section className={styles.section}>
        <Container>
          <div className={styles.missionGrid}>
            <div>
              <SectionHeading label="Mission" title="Why We Exist" align="left" />
              <p className={styles.body}>
                Access to capital remains one of the biggest constraints on growth for businesses worldwide. 
                Hasni Bank exists to remove that constraint — connecting creditworthy businesses and credible projects 
                with the international financing they deserve, through a transparent and efficient marketplace model.
              </p>
            </div>
            <div>
              <SectionHeading label="Vision" title="Where We're Going" align="left" />
              <p className={styles.body}>
                To become the world's most trusted financing marketplace — the first call for any business or project 
                sponsor seeking international capital, and the preferred origination partner for lenders and investors 
                seeking quality deal flow across emerging and developed markets.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.altBg}`}>
        <Container>
          <SectionHeading label="Values" title="What Guides Us" />
          <div className={styles.valuesGrid}>
            {values.map(v => (
              <div key={v.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueBody}>{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand heading="Partner With Us" subheading="Whether you need capital or deploy it, Hasni Bank connects you with the right counterpart." />
    </>
  )
}
```

- [ ] **Step 2: Create About.module.css**

```css
.section { padding: var(--section-padding-y) 0; }
.altBg { background-color: var(--color-surface); }

.missionGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
}
@media (max-width: 768px) { .missionGrid { grid-template-columns: 1fr; gap: var(--space-12); } }

.body { font-size: var(--text-lg); color: var(--color-muted); line-height: 1.8; }

.valuesGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-8);
}
@media (max-width: 768px) { .valuesGrid { grid-template-columns: 1fr; } }

.valueCard {
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.valueTitle {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-gold);
  margin-bottom: var(--space-3);
}

.valueBody { font-size: var(--text-base); color: var(--color-muted); line-height: 1.7; }
```

---

### Task 37: Create Team page

**Files:**
- Create: `src/pages/Team.jsx`
- Create: `src/pages/Team.module.css`

- [ ] **Step 1: Create Team.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { team } from '../data/teamData'
import Hero from '../components/sections/Hero'
import CtaBand from '../components/sections/CtaBand'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import styles from './Team.module.css'

export default function Team() {
  useSEO(seoConfig.team)

  return (
    <>
      <Hero
        imageKey="team"
        badge="Our Team"
        heading="Financing Expertise, Globally Connected"
        subheading="Decades of combined experience in international finance, structured credit, and capital markets."
        primaryCta={{ label: 'Work With Us', href: '/contact' }}
      />
      <section className={styles.section}>
        <Container>
          <SectionHeading
            label="Leadership"
            title="The People Behind Hasni Bank"
            subtitle="A team of seasoned professionals with deep networks across global capital markets."
          />
          <div className={styles.grid}>
            {team.map(member => (
              <div key={member.name} className={styles.card}>
                <div className={styles.avatar}>
                  <span className={styles.initials}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className={styles.name}>{member.name}</h3>
                <p className={styles.title}>{member.title}</p>
                <p className={styles.bio}>{member.bio}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand heading="Join Our Network" subheading="We work with experienced finance professionals and institutional partners worldwide." />
    </>
  )
}
```

- [ ] **Step 2: Create Team.module.css**

```css
.section { padding: var(--section-padding-y) 0; }

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-8);
}
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-gold), var(--color-gold-soft));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-2);
}

.initials {
  font-family: var(--font-heading);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-navy);
}

.name { font-size: var(--text-xl); font-weight: 600; color: var(--color-ivory); }
.title { font-size: var(--text-sm); color: var(--color-gold); font-weight: 500; letter-spacing: 0.05em; }
.bio { font-size: var(--text-base); color: var(--color-muted); line-height: 1.7; }
```

---

### Task 38: Create Insights page

**Files:**
- Create: `src/pages/Insights.jsx`
- Create: `src/pages/Insights.module.css`

- [ ] **Step 1: Create Insights.jsx**

```jsx
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import { insightsCategories } from '../data/insightsData'
import { useIntersection } from '../hooks/useIntersection'
import Hero from '../components/sections/Hero'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import styles from './Insights.module.css'

export default function Insights() {
  useSEO(seoConfig.insights)
  const { ref, isVisible } = useIntersection()

  return (
    <>
      <Hero
        imageKey="insights"
        badge="Insights"
        heading="Finance Intelligence for Decision Makers"
        subheading="Guides, analysis, and updates from the Hasni Bank financing team."
      />
      <section className={styles.section}>
        <Container>
          <SectionHeading
            label="Categories"
            title="Explore by Topic"
            subtitle="Five areas of coverage spanning the full spectrum of international finance."
          />
          <div ref={ref} className={`${styles.grid} stagger-children ${isVisible ? 'visible' : ''}`}>
            {insightsCategories.map(cat => (
              <div key={cat.slug} className={`${styles.card} stagger-child`}>
                <span className={styles.icon}>{cat.icon}</span>
                <h3 className={styles.title}>{cat.title}</h3>
                <p className={styles.description}>{cat.description}</p>
                <span className={styles.comingSoon}>Articles coming soon</span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Create Insights.module.css**

```css
.section { padding: var(--section-padding-y) 0; }

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
@media (max-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  transition: border-color var(--transition-base);
}
.card:hover { border-color: rgba(203, 161, 53, 0.3); }

.icon { font-size: var(--text-3xl); color: var(--color-gold); }
.title { font-size: var(--text-xl); font-weight: 600; color: var(--color-ivory); }
.description { font-size: var(--text-base); color: var(--color-muted); line-height: 1.7; flex: 1; }
.comingSoon { font-size: var(--text-xs); color: var(--color-muted); opacity: 0.5; letter-spacing: 0.05em; }
```

---

### Task 39: Create Contact page (client-side only)

**Files:**
- Create: `src/pages/Contact.jsx`
- Create: `src/pages/Contact.module.css`

- [ ] **Step 1: Create Contact.jsx**

```jsx
import { useState } from 'react'
import { useSEO } from '../hooks/useSEO'
import { seoConfig } from '../seo/seoConfig'
import Hero from '../components/sections/Hero'
import Container from '../components/ui/Container'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import styles from './Contact.module.css'

const financingTypes = [
  'SME Working Capital',
  'Equipment Finance',
  'Business Expansion',
  'Trade Finance',
  'Infrastructure / Project Debt',
  'Project Equity',
  'Structured Finance',
  'Acquisition Finance',
  'Other',
]

const INITIAL = {
  fullName: '', companyName: '', email: '', country: '',
  fundingRequirement: '', financingType: '', projectDescription: '',
}

export default function Contact() {
  useSEO(seoConfig.contact)
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  function validate(data) {
    const errs = {}
    if (!data.fullName.trim())           errs.fullName = 'Full name is required'
    if (!data.companyName.trim())        errs.companyName = 'Company name is required'
    if (!data.email.trim())              errs.email = 'Email is required'
    if (!data.country.trim())            errs.country = 'Country is required'
    if (!data.fundingRequirement.trim()) errs.fundingRequirement = 'Funding requirement is required'
    if (!data.financingType)             errs.financingType = 'Please select a financing type'
    if (!data.projectDescription.trim()) errs.projectDescription = 'Project description is required'
    return errs
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(errs => ({ ...errs, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setStatus('loading')
    try {
      const res = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  if (status === 'success') {
    return (
      <>
        <Hero imageKey="contact" badge="Contact" heading="Thank You" />
        <section className={styles.section}>
          <Container>
            <div className={styles.successBox}>
              <h2 className={styles.successHeading}>Application Received</h2>
              <p className={styles.successBody}>
                Thank you for submitting your financing requirement. Our financing team will review your application and respond with next steps within 3–5 business days.
              </p>
            </div>
          </Container>
        </section>
      </>
    )
  }

  return (
    <>
      <Hero
        imageKey="contact"
        badge="Apply for Financing"
        heading="Tell Us About Your Requirement"
        subheading="Complete the form below and our team will assess your financing need and connect you with the right funders."
      />
      <section className={styles.section}>
        <Container>
          <div className={styles.formWrap}>
            <SectionHeading
              label="Application"
              title="Financing Inquiry"
              subtitle="All fields are required. Your information is treated with complete confidentiality."
              align="left"
            />
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              <div className={styles.row}>
                <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} error={errors.fullName} />
                <Field label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} />
              </div>
              <div className={styles.row}>
                <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
                <Field label="Country" name="country" value={form.country} onChange={handleChange} error={errors.country} />
              </div>
              <div className={styles.row}>
                <Field label="Funding Requirement (e.g. $2M working capital)" name="fundingRequirement" value={form.fundingRequirement} onChange={handleChange} error={errors.fundingRequirement} />
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Financing Type</label>
                  <select
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
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Project / Business Description</label>
                <textarea
                  name="projectDescription"
                  value={form.projectDescription}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe your project or business and how the financing will be used…"
                  className={`${styles.input} ${styles.textarea} ${errors.projectDescription ? styles.inputError : ''}`}
                />
                {errors.projectDescription && <p className={styles.errorMsg}>{errors.projectDescription}</p>}
              </div>
              {status === 'error' && (
                <p className={styles.serverError}>Something went wrong. Please try again.</p>
              )}
              <Button type="submit" variant="primary" className={styles.submit}>
                {status === 'loading' ? 'Submitting…' : 'Submit Application'}
              </Button>
            </form>
          </div>
        </Container>
      </section>
    </>
  )
}

function Field({ label, name, type = 'text', value, onChange, error }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create Contact.module.css**

```css
.section { padding: var(--section-padding-y) 0; }

.formWrap { max-width: 760px; }

.form { display: flex; flex-direction: column; gap: var(--space-6); }

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}
@media (max-width: 640px) { .row { grid-template-columns: 1fr; } }

.fieldGroup { display: flex; flex-direction: column; gap: var(--space-2); }

.label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-ivory);
}

.input {
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-ivory);
  font-family: var(--font-body);
  font-size: var(--text-base);
  transition: border-color var(--transition-fast);
  width: 100%;
}
.input:focus { outline: none; border-color: var(--color-gold); }
.inputError { border-color: #e05252; }

.textarea { resize: vertical; min-height: 140px; }

.errorMsg { font-size: var(--text-xs); color: #e05252; }

.serverError {
  font-size: var(--text-sm);
  color: #e05252;
  padding: var(--space-3) var(--space-4);
  background-color: rgba(224, 82, 82, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(224, 82, 82, 0.3);
}

.submit { align-self: flex-start; }

.successBox {
  max-width: 560px;
  padding: var(--space-12);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.successHeading {
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-ivory);
  margin-bottom: var(--space-4);
}

.successBody { font-size: var(--text-lg); color: var(--color-muted); line-height: 1.8; }
```

---

### Task 40: Wire all pages into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace App.jsx with final version**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import SmeFinance from './pages/SmeFinance'
import ProjectFunding from './pages/ProjectFunding'
import HowItWorksPage from './pages/HowItWorks'
import About from './pages/About'
import Team from './pages/Team'
import Insights from './pages/Insights'
import Contact from './pages/Contact'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main style={{ paddingTop: '72px' }}>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/sme-finance"     element={<SmeFinance />} />
          <Route path="/project-funding" element={<ProjectFunding />} />
          <Route path="/how-it-works"    element={<HowItWorksPage />} />
          <Route path="/about"           element={<About />} />
          <Route path="/team"            element={<Team />} />
          <Route path="/insights"        element={<Insights />} />
          <Route path="/contact"         element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Verify all routes**

```bash
npm run dev
```
Expected: Every nav link renders its page. All hero images load. Scroll animations trigger. FAQ accordion works. Team initials render. Contact form shows validation errors on empty submit.

- [ ] **Step 3: Commit Milestone 5**

```bash
git add .
git commit -m "feat: add all 8 pages (Home, SME Finance, Project Funding, How It Works, About, Team, Insights, Contact)"
```

---

## MILESTONE 6 — Contact Function + Production Build

---

### Task 41: Create .dev.vars files and .gitignore entry

**Files:**
- Create: `.dev.vars.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create .dev.vars.example**

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- [ ] **Step 2: Create .dev.vars (local only — do not commit)**

Copy `.dev.vars.example` to `.dev.vars` and fill in your actual Resend API key:
```
RESEND_API_KEY=re_<your_actual_key>
```

- [ ] **Step 3: Ensure .gitignore excludes .dev.vars**

Open `.gitignore` and verify (or add) these lines:
```
.dev.vars
.env.local
```

---

### Task 42: Create the contact Pages Function

**Files:**
- Create: `functions/contact.js`

- [ ] **Step 1: Create functions/contact.js**

```js
import { Resend } from 'resend'

export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { fullName, companyName, email, country, fundingRequirement, financingType, projectDescription } = body

  const errors = {}
  if (!fullName?.trim())           errors.fullName = 'Full name is required'
  if (!companyName?.trim())        errors.companyName = 'Company name is required'
  if (!email?.trim())              errors.email = 'Email is required'
  if (!country?.trim())            errors.country = 'Country is required'
  if (!fundingRequirement?.trim()) errors.fundingRequirement = 'Funding requirement is required'
  if (!financingType?.trim())      errors.financingType = 'Financing type is required'
  if (!projectDescription?.trim()) errors.projectDescription = 'Project description is required'

  if (Object.keys(errors).length) return json({ errors }, 422)

  const resend = new Resend(env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: 'Hasni Bank <noreply@hasnibank.com>',
      to:   'financing@hasnibank.com',
      subject: `New Financing Inquiry — ${companyName}`,
      text: [
        `New financing inquiry from ${fullName} at ${companyName}.`,
        '',
        `Full Name:            ${fullName}`,
        `Company:              ${companyName}`,
        `Email:                ${email}`,
        `Country:              ${country}`,
        `Funding Requirement:  ${fundingRequirement}`,
        `Financing Type:       ${financingType}`,
        '',
        'Project Description:',
        projectDescription,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Resend error:', err)
    return json({ error: 'Failed to send. Please try again.' }, 500)
  }

  return json({ success: true }, 200)
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Note on local testing**

To test the function locally with Wrangler:
```bash
npx wrangler pages dev dist --compatibility-date=2024-09-23
```
This requires `npm run build` first and a valid `.dev.vars` file with a real `RESEND_API_KEY`.

For production: add `RESEND_API_KEY` in the Cloudflare Pages dashboard under Settings → Environment variables. No changes to `vite.config.js` are needed — Pages Functions read from `env`, not from the Vite build environment.

---

### Task 43: Run production build and fix any errors

**Files:**
- Modify: whichever files the build reports errors on

- [ ] **Step 1: Run the build**

```bash
npm run build
```

- [ ] **Step 2: Fix any errors reported**

Common issues to watch for:
- Missing imports (e.g. forgot to import a hook or component)
- Unused variable warnings promoted to errors
- CSS Module class names that don't match (check `.module.css` for typos)

Re-run `npm run build` after each fix until exit 0.

- [ ] **Step 3: Verify output**

```bash
npm run preview
```
Expected: Preview server starts. All 8 routes load. No console errors. Form validation works. Nav scroll shadow appears when scrolling down.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: add Cloudflare Pages Function for contact form (Resend email delivery), verified production build"
```

---

## Self-Review Checklist

| Spec requirement | Covered in |
|---|---|
| React + Vite + React Router DOM | Task 1 |
| tokens.css with 8 colour tokens | Task 3 |
| globals.css with fade-up, fade-in, stagger-children | Task 4 |
| Fraunces + Inter via Google Fonts | Task 5 |
| useScrollPosition → Navbar shadow | Tasks 7, 14 |
| navData.js | Task 8 |
| Container, Button, Badge, SectionHeading, Card | Tasks 9–13 |
| Navbar: sticky, scroll shadow, mobile hamburger | Task 14 |
| Footer: nav links, copyright, disclaimer | Task 15 |
| siteConfig (stats, FAQ) | Task 18 |
| financingData (tracks, SME services, project sectors, structures) | Task 19 |
| teamData (4 roles) | Task 20 |
| insightsData (5 categories) | Task 20 |
| useIntersection (threshold 0.15) | Task 21 |
| useSEO (title, description, keywords, canonical, JSON-LD) | Task 21 |
| seoConfig (per-page meta for 8 routes) | Task 22 |
| structuredData (Organization, WebSite, Service, FAQPage) | Task 22 |
| Hero (full-bleed image + gradient overlay, per-page imageKey) | Task 24 |
| HowItWorks (4 steps, fade-up) | Task 25 |
| FinancingTracks (4 cards, stagger) | Task 26 |
| Stats (4 counters, count-up on intersection) | Task 27 |
| FunderStrip (text-based placeholder funders) | Task 28 |
| FaqTeaser (3 accordion items) | Task 29 |
| CtaBand (gold band, primary + outline buttons) | Task 30 |
| Home page (7 sections) | Task 32 |
| SME Finance page (Hero + 4 services + CTA) | Task 33 |
| Project Funding page (Hero + 6 sectors + 4 structures + CTA) | Task 34 |
| How It Works page (Hero + steps + matching mechanics) | Task 35 |
| About page (Hero + Mission + Vision + 4 values) | Task 36 |
| Team page (Hero + 4 role cards) | Task 37 |
| Insights page (Hero + 5 category cards) | Task 38 |
| Contact page (Hero + 7-field form + success state) | Task 39 |
| functions/contact.js (7-field validation + Resend) | Task 42 |
| .dev.vars.example, .gitignore | Task 41 |
| prefers-reduced-motion override | Task 4 |
| CSS Modules throughout | Tasks 9–39 |
| npm run build exits 0 | Task 43 |
