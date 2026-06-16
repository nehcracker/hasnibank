import { Link } from 'react-router-dom'
import Container from '@/components/ui/Container'
import { navLinks } from '@/data/navData'
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
