import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Sidebar.module.css'

/* ── Inline SVG icons (20×20, fill="currentColor") ── */
function IconOverview() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
    </svg>
  )
}

function IconApplication() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4H6zm0 2h5v3h3v9H6V4zm2 6h4v1H8v-1zm0 3h4v1H8v-1z" />
    </svg>
  )
}

function IconModelling() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 17h16v1H2v-1zm2-2h2V9H4v6zm4 0h2V5H8v10zm4 0h2V8h-2v7zm4 0h2V3h-2v12z" />
    </svg>
  )
}

function IconDocuments() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 6a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />
    </svg>
  )
}

function IconMessages() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H6l-4 3V4z" />
    </svg>
  )
}

function IconFees() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm0 3h16v2H2V9z" />
    </svg>
  )
}

function IconEligibility() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2l8 3v5c0 4-3 7.5-8 9-5-1.5-8-5-8-9V5l8-3zm3.3 5.7l-4 4-1.6-1.6-1.4 1.4 3 3 5.4-5.4-1.4-1.4z" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z" />
    </svg>
  )
}

function IconSignOut() {
  return (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13 10l-4-4v3H4v2h5v3l4-4zM9 2H4a2 2 0 00-2 2v12a2 2 0 002 2h5v-2H4V4h5V2z" />
    </svg>
  )
}

/* ── Nav item definitions ────────────────────────── */
const NAV_ITEMS = [
  { to: '/dashboard',             end: true,  label: 'Overview',             Icon: IconOverview },
  { to: '/dashboard/application',             label: 'My application',       Icon: IconApplication },
  { to: '/dashboard/modelling',               label: 'Repayments',           Icon: IconModelling },
  { to: '/dashboard/documents',               label: 'Documents',            Icon: IconDocuments },
  { to: '/dashboard/messages',                label: 'Messages',             Icon: IconMessages },
  { to: '/dashboard/fees',                    label: 'Fees and payments',    Icon: IconFees },
  { to: '/dashboard/eligibility',             label: 'Eligibility check',    Icon: IconEligibility },
]

const BOTTOM_ITEMS = [
  { to: '/dashboard/profile', label: 'Profile and settings', Icon: IconProfile },
]

export default function Sidebar({ onClose }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function navLinkClass({ isActive }) {
    return isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
  }

  return (
    <nav className={styles.sidebar} aria-label="Dashboard navigation">
      {/* Main nav items */}
      <ul className={styles.nav}>
        {NAV_ITEMS.map(({ to, end, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={navLinkClass}
              title={label}
              onClick={onClose}
            >
              <Icon />
              <span className={styles.label}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className={styles.divider} role="separator" />

      {/* Bottom section: profile + sign out */}
      <div className={styles.bottom}>
        {BOTTOM_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={navLinkClass}
            title={label}
            onClick={onClose}
          >
            <Icon />
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}

        <button
          className={styles.signOutBtn}
          onClick={handleSignOut}
          title="Sign out"
        >
          <IconSignOut />
          <span className={styles.label}>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
