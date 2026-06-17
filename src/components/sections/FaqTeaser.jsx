import { useState } from 'react'
import { siteConfig } from '@/data/siteConfig'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './FaqTeaser.module.css'

function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  const answerId = `faq-answer-${index}`
  return (
    <div className={[styles.item, open ? styles.open : ''].filter(Boolean).join(' ')}>
      <button
        className={styles.question}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={answerId}
      >
        <span>{question}</span>
        <span className={styles.icon} aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <p id={answerId} className={styles.answer} hidden={!open}>{answer}</p>
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
            <FaqItem key={i} index={i} {...item} />
          ))}
        </div>
      </Container>
    </section>
  )
}
