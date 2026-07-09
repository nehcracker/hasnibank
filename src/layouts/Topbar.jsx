import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ClientIdBadge from '@/components/dashboard/ClientIdBadge'
import NotificationsBell from '@/components/dashboard/NotificationsBell'
import LogoMark from '@/components/icons/LogoMark'
import logoSrc from '@/assets/Logo.png'
import styles from './Topbar.module.css'

function HamburgerIcon() {
  return (
    <svg className={styles.menuIcon} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="19" y2="6" />
      <line x1="3" y1="11" x2="19" y2="11" />
      <line x1="3" y1="16" x2="19" y2="16" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13 10l-4-4v3H4v2h5v3l4-4zM9 2H4a2 2 0 00-2 2v12a2 2 0 002 2h5v-2H4V4h5V2z" />
    </svg>
  )
}

/**
 * Company line renders only for a real value. Seeded test profiles carried
 * filler like "NOT NULL"; company_name is required at signup so this only
 * guards seeded rows.
 */
function displayCompany(name) {
  if (!name) return null
  const trimmed = name.trim()
  if (!trimmed || /^(not null|null|n\/a|none|-+)$/i.test(trimmed)) return null
  return trimmed
}

export default function Topbar({ onMenuToggle }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header className={styles.topbar}>
      {/* Hamburger — visible only on mobile */}
      <button
        className={styles.menuBtn}
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <HamburgerIcon />
      </button>

      {/* Brand mark */}
      <Link to="/dashboard" className={styles.brand}>
        <LogoMark size={32} className={styles.brandMark} />
        <span className={styles.brandWordmark}>
          <span className={styles.brandHasni}>HASNI</span>
          <span className={styles.brandBank}>BANK</span>
        </span>
        <img src={logoSrc} alt="Hasni Bank" className={styles.brandFull} />
      </Link>

      {/* Centre: Client ID badge */}
      <div className={styles.centre}>
        {profile && <ClientIdBadge profile={profile} />}
      </div>

      {/* Right cluster */}
      <div className={styles.right}>
        <NotificationsBell />

        {/* Profile menu */}
        <div className={styles.profileMenu} ref={menuRef}>
          <button
            className={styles.profileToggle}
            onClick={() => setOpen(v => !v)}
            aria-haspopup="true"
            aria-expanded={open}
          >
            <div>
              <p className={styles.profileName}>
                {profile?.full_name ?? 'Account'}
              </p>
              {displayCompany(profile?.company_name) && (
                <p className={styles.profileCompany}>
                  {displayCompany(profile.company_name)}
                </p>
              )}
            </div>
            <span className={`${styles.profileChevron}${open ? ' ' + styles.rotated : ''}`}>
              <ChevronDown />
            </span>
          </button>

          {open && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownInfo}>
                <p className={styles.dropdownName}>{profile?.full_name ?? '—'}</p>
                {displayCompany(profile?.company_name) && (
                  <p className={styles.dropdownCompany}>
                    {displayCompany(profile.company_name)}
                  </p>
                )}
              </div>
              <button
                className={styles.dropdownSignOut}
                onClick={handleSignOut}
                role="menuitem"
              >
                <SignOutIcon />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
