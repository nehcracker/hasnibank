import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import { navLinks } from '@/data/navData'
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
