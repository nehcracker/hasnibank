import { useIntersection } from '@/hooks/useIntersection'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
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
          {steps.map((step, i) => (
            <Step key={step.number} {...step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  )
}
