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
