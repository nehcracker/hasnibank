import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { serviceData } from '@/seo/structuredData'
import { projectSectors, fundingStructures } from '@/data/financingData'
import { useIntersection } from '@/hooks/useIntersection'
import Hero from '@/components/sections/Hero'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import styles from './ProjectFunding.module.css'

export default function ProjectFunding() {
  useSEO({ ...seoConfig.projectFunding, structuredData: serviceData[1] })
  const { ref: sectorsRef, isVisible: sectorsVisible } = useIntersection()
  const { ref: structuresRef, isVisible: structuresVisible } = useIntersection()

  return (
    <>
      <Hero
        imageKey="projectFunding"
        badge="Project Funding"
        heading="Capital for Projects That Shape the Future"
        subheading="Debt, equity, and structured finance for infrastructure, energy, real estate, and industrial projects across six continents."
        primaryCta={{ label: 'Submit Your Project', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />

      <section className={styles.section}>
        <Container>
          <SectionHeading label="Sectors" title="Industries We Finance" subtitle="Our global funder network spans every major project sector." />
          <div ref={sectorsRef} className={`${styles.sectorsGrid} stagger-children ${sectorsVisible ? 'visible' : ''}`}>
            {projectSectors.map(sector => (
              <div key={sector.title} className={`${styles.sectorCard} stagger-child`}>
                <span className={styles.icon}>{sector.icon}</span>
                <h3 className={styles.sectorTitle}>{sector.title}</h3>
                <p className={styles.sectorDesc}>{sector.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className={`${styles.section} ${styles.altBg}`}>
        <Container>
          <SectionHeading label="Structures" title="How We Structure Your Financing" subtitle="Every project has a unique capital requirement. We tailor the structure accordingly." />
          <div ref={structuresRef} className={`${styles.structuresGrid} stagger-children ${structuresVisible ? 'visible' : ''}`}>
            {fundingStructures.map(structure => (
              <Card key={structure.title} className={`stagger-child ${styles.structureCard}`}>
                <h3 className={styles.structureTitle}>{structure.title}</h3>
                <p className={styles.structureDesc}>{structure.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        heading="Have a Project in Mind?"
        subheading="Submit your project details and we will connect you with the right financing structure and funders."
      />
    </>
  )
}
