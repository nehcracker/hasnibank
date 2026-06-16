import { Link } from 'react-router-dom'
import { useIntersection } from '@/hooks/useIntersection'
import { financingTracks } from '@/data/financingData'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import Badge from '@/components/ui/Badge'
import styles from './FinancingTracks.module.css'

export default function FinancingTracks() {
  const { ref, isVisible } = useIntersection()

  return (
    <section className={styles.section}>
      <Container>
        <SectionHeading
          label="Solutions"
          title="Financing for Every Scale"
          subtitle="Whether you're an SME seeking working capital or a sponsor funding a $500M infrastructure project, we have a pathway for you."
        />
        <div
          ref={ref}
          className={['stagger-children', isVisible ? 'visible' : ''].filter(Boolean).join(' ') + ' ' + styles.grid}
        >
          {financingTracks.map(track => (
            <Link key={track.id} to={track.href} className={[styles.card, 'stagger-child'].join(' ')}>
              <Badge className={styles.badge}>{track.badge}</Badge>
              <h3 className={styles.title}>{track.title}</h3>
              <p className={styles.description}>{track.description}</p>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
