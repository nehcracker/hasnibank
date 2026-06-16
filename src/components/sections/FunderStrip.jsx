import Container from '@/components/ui/Container'
import styles from './FunderStrip.module.css'

const funders = [
  'International Finance Corp.',
  'European Investment Bank',
  'African Development Bank',
  'Gulf Capital Partners',
  'Asia Infrastructure Fund',
  'Meridian Private Credit',
]

export default function FunderStrip() {
  return (
    <section className={styles.section}>
      <Container>
        <p className={styles.label}>Trusted by funders and institutions worldwide</p>
        <div className={styles.strip}>
          {funders.map(name => (
            <span key={name} className={styles.funder}>{name}</span>
          ))}
        </div>
      </Container>
    </section>
  )
}
