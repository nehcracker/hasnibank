import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import Hero from '@/components/sections/Hero'
import HowItWorksSection from '@/components/sections/HowItWorks'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './HowItWorks.module.css'

const mechanics = [
  {
    title: 'Marketplace Matching',
    body: 'Unlike a single lender, Hasni Bank operates as a marketplace. Your requirement is presented to multiple funders simultaneously, generating competitive term sheets and ensuring you receive the most appropriate financing structure.',
  },
  {
    title: 'Sector Expertise',
    body: 'Our financing team brings deep experience across SME lending, infrastructure debt, energy equity, and structured finance. We translate your requirement into the language funders respond to.',
  },
  {
    title: 'Global Reach',
    body: 'Our network spans commercial banks, development finance institutions, private credit funds, and family offices across Europe, the Gulf, Asia-Pacific, and Sub-Saharan Africa.',
  },
]

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
            {mechanics.map(m => (
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
