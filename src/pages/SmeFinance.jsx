import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { serviceData } from '@/seo/structuredData'
import { smeServices } from '@/data/financingData'
import Hero from '@/components/sections/Hero'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import Card from '@/components/ui/Card'
import { useIntersection } from '@/hooks/useIntersection'
import styles from './SmeFinance.module.css'

function ServiceCard({ icon, title, description, index }) {
  const { ref, isVisible } = useIntersection()
  return (
    <Card>
      <div
        ref={ref}
        className={`${styles.serviceCard} fade-up ${isVisible ? 'visible' : ''}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.serviceTitle}>{title}</h3>
        <p className={styles.serviceDesc}>{description}</p>
      </div>
    </Card>
  )
}

export default function SmeFinance() {
  useSEO({ ...seoConfig.smeFinance, structuredData: serviceData[0] })

  return (
    <>
      <Hero
        imageKey="smeFinance"
        badge="SME Finance"
        heading="Finance Built for Growing Businesses"
        subheading="Access the working capital, equipment finance, and trade facilities your business needs to grow — matched to lenders who understand your sector."
        primaryCta={{ label: 'Apply for Financing', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />
      <section className={styles.services}>
        <Container>
          <SectionHeading
            label="Services"
            title="SME Financing Solutions"
            subtitle="Four core financing products covering the full lifecycle of business growth."
          />
          <div className={styles.grid}>
            {smeServices.map((service, i) => (
              <ServiceCard key={service.title} {...service} index={i} />
            ))}
          </div>
        </Container>
      </section>
      <CtaBand
        heading="Ready to Fund Your Next Phase?"
        subheading="Tell us your requirement and we'll match you with the right lender within days."
      />
    </>
  )
}
