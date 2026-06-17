import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { insightsCategories } from '@/data/insightsData'
import { useIntersection } from '@/hooks/useIntersection'
import Hero from '@/components/sections/Hero'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './Insights.module.css'

export default function Insights() {
  useSEO(seoConfig.insights)
  const { ref, isVisible } = useIntersection()

  return (
    <>
      <Hero
        imageKey="insights"
        badge="Insights"
        heading="Finance Intelligence for Decision Makers"
        subheading="Guides, analysis, and updates from the Hasni Bank financing team."
      />
      <section className={styles.section}>
        <Container>
          <SectionHeading
            label="Categories"
            title="Explore by Topic"
            subtitle="Five areas of coverage spanning the full spectrum of international finance."
          />
          <div ref={ref} className={`${styles.grid} stagger-children ${isVisible ? 'visible' : ''}`}>
            {insightsCategories.map(cat => (
              <div key={cat.slug} className={`${styles.card} stagger-child`}>
                <span className={styles.icon}>{cat.icon}</span>
                <h3 className={styles.title}>{cat.title}</h3>
                <p className={styles.description}>{cat.description}</p>
                <span className={styles.comingSoon}>Articles coming soon</span>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
