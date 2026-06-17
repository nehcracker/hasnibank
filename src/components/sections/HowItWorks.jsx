import { useIntersection } from '@/hooks/useIntersection'
import { howItWorksSteps } from '@/data/siteConfig'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './HowItWorks.module.css'

function Step({ number, title, description, index }) {
  const { ref, isVisible } = useIntersection()
  return (
    <div
      ref={ref}
      className={[styles.step, 'fade-up', isVisible ? 'visible' : ''].filter(Boolean).join(' ')}
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
          {howItWorksSteps.map((step, i) => (
            <Step key={step.number} {...step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}
