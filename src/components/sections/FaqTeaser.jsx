import { useState } from 'react'
import { siteConfig } from '@/data/siteConfig'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './FaqTeaser.module.css'

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={[styles.item, open ? styles.open : ''].filter(Boolean).join(' ')}>
      <button
        className={styles.question}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <span className={styles.icon} aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <p className={styles.answer}>{answer}</p>}
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
            <FaqItem key={i} {...item} />
          ))}
        </div>
      </Container>
    </section>
  )
}
