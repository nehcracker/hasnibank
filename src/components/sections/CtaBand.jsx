import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
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
