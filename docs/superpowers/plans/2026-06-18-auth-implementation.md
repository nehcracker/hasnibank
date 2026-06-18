# Phase 2 Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase-backed authentication with borrower self-signup, email verification, profile completion, staff invite-only access, and role-based route protection.

**Architecture:** Supabase Auth manages credentials, email verification, and JWT sessions. A React `AuthContext` wraps the app and exposes `{ session, user, profile, role, loading }`. A `ProtectedRoute` component guards private pages and redirects based on auth state and role.

**Tech Stack:** React 19, React Router 7, Vite 8, `@supabase/supabase-js`, CSS Modules, vitest + @testing-library/react

## Global Constraints

- All colour references use CSS custom properties from `src/styles/tokens.css`; no hardcoded hex values
- All JSX files use `.jsx` extension
- Path alias `@` maps to `src/`; use `@/` in all imports
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` required in `.env.local` for dev and in Cloudflare Pages environment settings for production
- Run `npm run build` to verify before every commit
- Commit immediately after each task completes (project workflow)

## Prerequisites (manual — Supabase dashboard)

Before running Task 1, confirm these are set up in your Supabase project:

**`public.profiles` table:**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, references `auth.users(id)` |
| `full_name` | `text` | NOT NULL |
| `company_name` | `text` | NOT NULL |
| `country` | `text` | NOT NULL |
| `role` | `text` | NOT NULL, default `'borrower'` |
| `profile_complete` | `boolean` | NOT NULL, default `false` |
| `created_at` | `timestamptz` | default `now()` |

**RLS policies on `profiles`:**
- `SELECT`: `auth.uid() = id`
- `INSERT`: `auth.uid() = id`
- `UPDATE`: `auth.uid() = id`

**Supabase Auth settings:**
- Email verification enabled (not auto-confirm)
- Site URL set to your Cloudflare Pages domain
- `http://localhost:5173` in the Redirect URLs allowlist

---

### Task 1: Dependencies + Dev Environment

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`
- Create: `.env.local`
- Create: `src/test-setup.js`

**Interfaces:**
- Produces: `vitest` test runner available; `@supabase/supabase-js` importable; `@testing-library/jest-dom` matchers active in all test files

- [ ] **Step 1: Install runtime and dev packages**

```bash
npm install @supabase/supabase-js
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: both commands complete without errors; new entries appear in `package.json`.

- [ ] **Step 2: Add vitest config to vite.config.js**

Replace the entire file:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 3: Update test script in package.json**

In `package.json`, replace the `"test"` line in `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create .env.local with placeholder values**

Create `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Fill in real values from: Supabase project dashboard → Settings → API.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 7: Verify test runner initialises**

```bash
npm run test:run
```

Expected: `No test files found` message or 0 tests — runner launches without error.

- [ ] **Step 8: Commit**

```bash
git add vite.config.js package.json package-lock.json src/test-setup.js .env.local
git commit -m "feat: install supabase-js and vitest for Phase 2 auth"
```

---

### Task 2: Supabase Client Singleton

**Files:**
- Create: `src/lib/supabase.js`

**Interfaces:**
- Produces: `export const supabase` — a configured Supabase client instance; imported by AuthContext, all auth pages, and Navbar

- [ ] **Step 1: Create the client file**

Create `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.js
git commit -m "feat: add Supabase client singleton"
```

---

### Task 3: AuthContext + useAuth Hook

**Files:**
- Create: `src/context/AuthContext.jsx`
- Create: `src/hooks/useAuth.js`

**Interfaces:**
- Produces:
  - `export const AuthContext` — the React context object (default value: `null`)
  - `export function AuthProvider({ children })` — wraps the app tree; manages `{ session, user, profile, role, loading }`
  - `export function useAuth()` from `src/hooks/useAuth.js` — returns `{ session, user, profile, role, loading }`; throws if used outside `AuthProvider`

- [ ] **Step 1: Create AuthContext.jsx**

Create `src/context/AuthContext.jsx`:

```jsx
import { createContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const AuthContext = createContext(null)

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session ?? null)
      if (session) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session ?? null)
        if (session) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Create useAuth.js**

Create `src/hooks/useAuth.js`:

```js
import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/context/AuthContext.jsx src/hooks/useAuth.js
git commit -m "feat: add AuthContext and useAuth hook"
```

---

### Task 4: ProtectedRoute

**Files:**
- Create: `src/components/auth/ProtectedRoute.jsx`
- Create: `src/components/auth/__tests__/ProtectedRoute.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/hooks/useAuth` — destructures `{ session, role, loading }`
- Produces: `export default function ProtectedRoute({ children, requiredRole? })` — renders `children` or redirects

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/__tests__/ProtectedRoute.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from '../ProtectedRoute'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  }
})

import { useAuth } from '@/hooks/useAuth'

beforeEach(() => vi.clearAllMocks())

describe('ProtectedRoute', () => {
  it('renders nothing interactive while loading', () => {
    useAuth.mockReturnValue({ loading: true, session: null, role: null })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.queryByText('content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    useAuth.mockReturnValue({ loading: false, session: null, role: null })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login')
  })

  it('redirects borrower away from staff route to /dashboard', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute requiredRole="staff"><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard')
  })

  it('redirects staff away from borrower route to /admin', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'staff' })
    render(<ProtectedRoute requiredRole="borrower"><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/admin')
  })

  it('renders children when authenticated with the correct role', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute requiredRole="borrower"><div>content</div></ProtectedRoute>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders children when authenticated with no role requirement', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run
```

Expected: FAIL — `Cannot find module '../ProtectedRoute'`

- [ ] **Step 3: Create ProtectedRoute.jsx**

Create `src/components/auth/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, role, loading } = useAuth()

  if (loading) return <div className="auth-loading" aria-busy="true" />

  if (!session) return <Navigate to="/login" replace />

  if (requiredRole === 'staff' && role !== 'staff') return <Navigate to="/dashboard" replace />
  if (requiredRole === 'borrower' && role !== 'borrower') return <Navigate to="/admin" replace />

  return children
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/ProtectedRoute.jsx src/components/auth/__tests__/ProtectedRoute.test.jsx
git commit -m "feat: add ProtectedRoute with role-based access control"
```

---

### Task 5: Login + Signup Pages

**Files:**
- Create: `src/pages/auth/Auth.module.css`
- Create: `src/pages/auth/Login.jsx`
- Create: `src/pages/auth/Signup.jsx`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`; `useNavigate`, `Link` from `react-router-dom`
- Produces: `export default function Login()`, `export default function Signup()`

- [ ] **Step 1: Create shared auth styles**

Create `src/pages/auth/Auth.module.css`:

```css
.page {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  background: var(--color-navy);
}

.card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
}

.heading {
  font-family: var(--font-heading);
  font-size: var(--text-2xl);
  color: var(--color-ivory);
  margin: 0 0 var(--space-2);
}

.subheading {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin: 0 0 var(--space-8);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  font-weight: 500;
}

.input {
  background: var(--color-navy);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-ivory);
  font-family: var(--font-body);
  font-size: var(--text-base);
  transition: border-color var(--transition-fast);
  outline: none;
}

.input:focus {
  border-color: var(--color-gold);
}

.error {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: #e57373;
  background: rgba(229, 115, 115, 0.08);
  border: 1px solid rgba(229, 115, 115, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
}

.submit {
  background: var(--color-gold);
  color: var(--color-navy);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), opacity var(--transition-fast);
  margin-top: var(--space-2);
}

.submit:hover:not(:disabled) {
  background: var(--color-gold-soft);
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footer {
  margin-top: var(--space-6);
  text-align: center;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.footerLink {
  color: var(--color-gold);
  text-decoration: none;
  font-weight: 500;
}

.footerLink:hover {
  color: var(--color-gold-soft);
}
```

- [ ] **Step 2: Create Login.jsx**

Create `src/pages/auth/Login.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Auth.module.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('not confirmed')) {
        navigate('/verify-email')
      } else if (
        error.message.toLowerCase().includes('invalid') ||
        error.message.toLowerCase().includes('credentials')
      ) {
        setError('Invalid email or password')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    navigate(profile?.role === 'staff' ? '/admin' : '/dashboard', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Sign in to your Hasni Bank account</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          New to Hasni Bank?{' '}
          <Link to="/signup" className={styles.footerLink}>Create an account</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Signup.jsx**

Create `src/pages/auth/Signup.jsx`:

```jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Auth.module.css'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/signup/profile`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    sessionStorage.setItem('signup_email', email)
    navigate('/verify-email')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Create an account</h1>
        <p className={styles.subheading}>Apply for financing through Hasni Bank's global network</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/auth/
git commit -m "feat: add Login and Signup auth pages"
```

---

### Task 6: VerifyEmail + SignupProfile Pages

**Files:**
- Create: `src/pages/auth/VerifyEmail.jsx`
- Create: `src/pages/auth/SignupProfile.jsx`

**Interfaces:**
- Consumes: `useAuth()` — destructures `{ user, profile }` (SignupProfile only); `supabase`; `useNavigate`; `Auth.module.css`
- Produces: `export default function VerifyEmail()`, `export default function SignupProfile()`

- [ ] **Step 1: Create VerifyEmail.jsx**

Create `src/pages/auth/VerifyEmail.jsx`:

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Auth.module.css'

export default function VerifyEmail() {
  const email = sessionStorage.getItem('signup_email') || ''
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/signup/profile` },
    })
    setResent(true)
    setResending(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Check your email</h1>
        <p className={styles.subheading}>
          We sent a verification link to{' '}
          <strong style={{ color: 'var(--color-ivory)' }}>
            {email || 'your email address'}
          </strong>
          . Click it to activate your account.
        </p>

        {resent ? (
          <p className={styles.footer} style={{ color: 'var(--color-success)' }}>
            Verification email resent.
          </p>
        ) : (
          <p className={styles.footer}>
            Didn't receive it?{' '}
            <button
              onClick={handleResend}
              disabled={resending || !email}
              className={styles.footerLink}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
            >
              {resending ? 'Sending…' : 'Resend email'}
            </button>
          </p>
        )}

        <p className={styles.footer} style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/login" className={styles.footerLink}>Back to login</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create SignupProfile.jsx**

Create `src/pages/auth/SignupProfile.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Auth.module.css'

export default function SignupProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.profile_complete) navigate('/dashboard', { replace: true })
  }, [profile, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      company_name: companyName,
      country,
      role: 'borrower',
      profile_complete: true,
    })

    if (error) {
      setError('Could not save your profile. Please try again.')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('signup_email')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Complete your profile</h1>
        <p className={styles.subheading}>Tell us about yourself and your business</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className={styles.input}
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              className={styles.input}
              type="text"
              autoComplete="organization"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="country">Country</label>
            <input
              id="country"
              className={styles.input}
              type="text"
              autoComplete="country-name"
              required
              value={country}
              onChange={e => setCountry(e.target.value)}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/auth/VerifyEmail.jsx src/pages/auth/SignupProfile.jsx
git commit -m "feat: add VerifyEmail and SignupProfile pages"
```

---

### Task 7: Dashboard + Admin Stubs

**Files:**
- Create: `src/pages/Dashboard.jsx`
- Create: `src/pages/Dashboard.module.css`
- Create: `src/pages/Admin.jsx`

**Interfaces:**
- Consumes: `useAuth()` — destructures `{ profile }` (Dashboard) and `{ user }` (Admin); `supabase`; `useNavigate`
- Produces: `export default function Dashboard()`, `export default function Admin()`

- [ ] **Step 1: Create Dashboard.module.css**

Create `src/pages/Dashboard.module.css`:

```css
.page {
  min-height: calc(100vh - var(--navbar-height));
  background: var(--color-navy);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.inner {
  max-width: 640px;
  width: 100%;
  text-align: center;
}

.heading {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  color: var(--color-ivory);
  margin: 0 0 var(--space-4);
}

.body {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--color-muted);
  margin: 0 0 var(--space-8);
  line-height: 1.6;
}

.signOut {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-6);
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.signOut:hover {
  border-color: var(--color-gold);
  color: var(--color-gold);
}
```

- [ ] **Step 2: Create Dashboard.jsx**

Create `src/pages/Dashboard.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className={styles.body}>
          Your financing application portal is coming soon. Our team will be in touch with next steps.
        </p>
        <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Admin.jsx**

Create `src/pages/Admin.jsx`:

```jsx
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Dashboard.module.css'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Staff Console</h1>
        <p className={styles.body}>
          The underwriting console is under development. Signed in as {user?.email}.
        </p>
        <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.jsx src/pages/Dashboard.module.css src/pages/Admin.jsx
git commit -m "feat: add borrower Dashboard and staff Admin stub pages"
```

---

### Task 8: App.jsx Wiring

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `AuthProvider` from `@/context/AuthContext`; `ProtectedRoute` from `@/components/auth/ProtectedRoute`; all new page imports
- Produces: fully wired React Router tree with `AuthProvider` wrapping all routes and `ProtectedRoute` guarding `/signup/profile`, `/dashboard`, `/admin`

- [ ] **Step 1: Replace src/App.jsx**

Replace the entire file:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Home from '@/pages/Home'
import SmeFinance from '@/pages/SmeFinance'
import ProjectFunding from '@/pages/ProjectFunding'
import HowItWorksPage from '@/pages/HowItWorks'
import About from '@/pages/About'
import Team from '@/pages/Team'
import Insights from '@/pages/Insights'
import Contact from '@/pages/Contact'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import VerifyEmail from '@/pages/auth/VerifyEmail'
import SignupProfile from '@/pages/auth/SignupProfile'
import Dashboard from '@/pages/Dashboard'
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main style={{ paddingTop: 'var(--navbar-height)' }}>
          <Routes>
            <Route path="/"                element={<Home />} />
            <Route path="/sme-finance"     element={<SmeFinance />} />
            <Route path="/project-funding" element={<ProjectFunding />} />
            <Route path="/how-it-works"    element={<HowItWorksPage />} />
            <Route path="/about"           element={<About />} />
            <Route path="/team"            element={<Team />} />
            <Route path="/insights"        element={<Insights />} />
            <Route path="/contact"         element={<Contact />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<Signup />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/signup/profile"  element={
              <ProtectedRoute><SignupProfile /></ProtectedRoute>
            } />
            <Route path="/dashboard"       element={
              <ProtectedRoute requiredRole="borrower"><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin"           element={
              <ProtectedRoute requiredRole="staff"><Admin /></ProtectedRoute>
            } />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire auth routes and AuthProvider into App"
```

---

### Task 9: Navbar Auth Integration

**Files:**
- Modify: `src/components/layout/Navbar.jsx`
- Modify: `src/components/layout/Navbar.module.css`

**Interfaces:**
- Consumes: `useAuth()` — destructures `{ user, loading }`; `supabase` from `@/lib/supabase`; `useNavigate` from `react-router-dom`
- Produces: Navbar renders `Log in` + `Get Started` for unauthenticated visitors; renders user email + `Sign out` button for authenticated users; mobile menu includes both states

- [ ] **Step 1: Replace Navbar.jsx**

Replace the entire file:

```jsx
import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { navLinks } from '@/data/navData'
import logoSrc from '@/assets/Logo.png'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const scrollY = useScrollPosition()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className={`${styles.header} ${scrollY > 20 ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo} aria-label="Hasni Bank — Home">
          <img src={logoSrc} alt="Hasni Bank" className={styles.logoImg} />
        </Link>

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

        {!loading && (
          <div className={styles.authArea}>
            {user ? (
              <>
                <span className={styles.userEmail}>{user.email}</span>
                <button className={styles.signOutBtn} onClick={handleSignOut}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.loginLink}>Log in</Link>
                <Link to="/contact" className={styles.cta}>Get Started</Link>
              </>
            )}
          </div>
        )}

        <button
          className={styles.hamburger}
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <span /><span /><span />
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className={styles.mobileMenu} aria-label="Mobile navigation">
          {navLinks.map(link => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) => `${styles.mobileLink} ${isActive ? styles.active : ''}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          {!loading && (
            user ? (
              <button
                className={styles.mobileCta}
                onClick={() => { setOpen(false); handleSignOut() }}
              >
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" className={styles.mobileLink} onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link to="/contact" className={styles.mobileCta} onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </>
            )
          )}
        </nav>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Append auth styles to Navbar.module.css**

Read `src/components/layout/Navbar.module.css` to find the end of the file, then append these rules (do not replace existing content):

```css
/* Auth area — replaces the standalone .cta for layout positioning */
.authArea {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.loginLink {
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.loginLink:hover {
  color: var(--color-ivory);
}

.userEmail {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  color: var(--color-muted);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.signOutBtn {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-3);
  color: var(--color-muted);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}

.signOutBtn:hover {
  border-color: var(--color-gold);
  color: var(--color-gold);
}
```

Note: if the existing `.cta` rule in Navbar.module.css has `margin-left: auto`, remove that property from `.cta` to avoid double-shifting — the `.authArea` wrapper now owns the left-push.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

Expected: 6 ProtectedRoute tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.jsx src/components/layout/Navbar.module.css
git commit -m "feat: add auth-aware login/user menu to Navbar"
```

---

## Post-implementation checklist

- [ ] Fill in real Supabase credentials in `.env.local`
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Cloudflare Pages environment settings
- [ ] Confirm `profiles` table and RLS policies exist in Supabase (see Prerequisites above)
- [ ] Add `http://localhost:5173` and `https://hasnibank.com` to Supabase Auth → URL Configuration → Redirect URLs
- [ ] Run `npm run dev` and walk through: signup → verify email → profile completion → dashboard → sign out → login
- [ ] Test staff flow: create a staff user via Supabase invite → set password → confirm `/admin` route
