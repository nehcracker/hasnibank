import { useState, useEffect } from 'react'
import { useIntersection } from '@/hooks/useIntersection'
import { siteConfig } from '@/data/siteConfig'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './Stats.module.css'

function StatItem({ value, suffix = '', prefix = '', label }) {
  const { ref, isVisible } = useIntersection(0.3)
  const [count, setCount] = useState(0)
  const isDecimal = !Number.isInteger(value)

  useEffect(() => {
    if (!isVisible) return
    const duration = 1800
    const steps = 60
    const inc = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(current + inc, value)
      setCount(isDecimal ? Math.round(current * 10) / 10 : Math.floor(current))
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, value, isDecimal])

  return (
    <div ref={ref} className={styles.stat}>
      <div className={styles.value}>{prefix}{count}{suffix}</div>
      <div className={styles.label}>{label}</div>
    </div>
  )
}

export default function Stats() {
  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="Impact"
          title="Financing at Scale"
          subtitle="Trusted by businesses and project sponsors across six continents."
        />
        <div className={styles.grid}>
          {siteConfig.stats.map((stat, i) => (
            <StatItem key={i} {...stat} />
          ))}
        </div>
      </Container>
    </section>
  )
}
