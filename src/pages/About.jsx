import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { organizationData } from '@/seo/structuredData'
import Hero from '@/components/sections/Hero'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './About.module.css'

const values = [
  { title: 'Integrity',          body: 'We operate with transparency and honesty in every client and funder relationship. Our reputation is built on trust.' },
  { title: 'Excellence',         body: 'We bring institutional rigour to every mandate — from initial assessment through to completion.' },
  { title: 'Global Perspective', body: 'Our team and network span continents. We understand the nuances of cross-border financing and local market dynamics.' },
  { title: 'Partnership',        body: 'We are not a transaction machine. We work alongside clients as long-term financing partners invested in their success.' },
]

export default function About() {
  useSEO({ ...seoConfig.about, structuredData: organizationData })

  return (
    <>
      <Hero
        imageKey="about"
        badge="About Hasni Bank"
        heading="A Financing Marketplace Built on Trust"
        subheading="We exist to bridge the gap between businesses that need capital and the global institutions that provide it."
        primaryCta={{ label: 'Meet the Team', href: '/team' }}
      />

      <section className={styles.section}>
        <Container>
          <div className={styles.missionGrid}>
            <div>
              <SectionHeading label="Mission" title="Why We Exist" align="left" />
              <p className={styles.body}>
                Access to capital remains one of the biggest constraints on growth for businesses worldwide.
                Hasni Bank exists to remove that constraint — connecting creditworthy businesses and credible projects
                with the international financing they deserve, through a transparent and efficient marketplace model.
              </p>
            </div>
            <div>
              <SectionHeading label="Vision" title="Where We're Going" align="left" />
              <p className={styles.body}>
                To become the world's most trusted financing marketplace — the first call for any business or project
                sponsor seeking international capital, and the preferred origination partner for lenders and investors
                seeking quality deal flow across emerging and developed markets.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.altBg}`}>
        <Container>
          <SectionHeading label="Values" title="What Guides Us" />
          <div className={styles.valuesGrid}>
            {values.map(v => (
              <div key={v.title} className={styles.valueCard}>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueBody}>{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand heading="Partner With Us" subheading="Whether you need capital or deploy it, Hasni Bank connects you with the right counterpart." />
    </>
  )
}
