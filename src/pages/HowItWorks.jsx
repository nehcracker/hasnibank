import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { howItWorksMechanics } from '@/data/siteConfig'
import Hero from '@/components/sections/Hero'
import HowItWorksSection from '@/components/sections/HowItWorks'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './HowItWorks.module.css'

export default function HowItWorksPage() {
  useSEO(seoConfig.howItWorks)

  return (
    <>
      <Hero
        imageKey="howItWorks"
        badge="Our Process"
        heading="Transparent Financing from Start to Finish"
        subheading="Four steps. One team. A global network working in your favour."
        primaryCta={{ label: 'Start Your Application', href: '/contact' }}
      />
      <HowItWorksSection />
      <section className={styles.mechanics}>
        <Container>
          <SectionHeading label="Marketplace Model" title="Why Hasni Bank Works" align="left" />
          <div className={styles.grid}>
            {howItWorksMechanics.map(m => (
              <div key={m.title} className={styles.mechCard}>
                <h3 className={styles.mechTitle}>{m.title}</h3>
                <p className={styles.mechBody}>{m.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  )
}
