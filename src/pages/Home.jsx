import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { organizationData, websiteData, getFAQStructuredData } from '@/seo/structuredData'
import { siteConfig } from '@/data/siteConfig'
import Hero from '@/components/sections/Hero'
import HowItWorks from '@/components/sections/HowItWorks'
import FinancingTracks from '@/components/sections/FinancingTracks'
import Stats from '@/components/sections/Stats'
import FunderStrip from '@/components/sections/FunderStrip'
import FaqTeaser from '@/components/sections/FaqTeaser'
import CtaBand from '@/components/sections/CtaBand'

export default function Home() {
  useSEO({
    ...seoConfig.home,
    structuredData: [organizationData, websiteData, getFAQStructuredData(siteConfig.faq)],
  })

  return (
    <>
      <Hero
        imageKey="home"
        badge="Global Financing Marketplace"
        heading="Connect to the Capital Your Business Deserves"
        subheading="Hasni Bank matches SMEs, entrepreneurs, and project sponsors with an international network of funders, lenders, and institutions."
        primaryCta={{ label: 'Apply for Financing', href: '/contact' }}
        secondaryCta={{ label: 'How It Works', href: '/how-it-works' }}
      />
      <HowItWorks />
      <FinancingTracks />
      <Stats />
      <FunderStrip />
      <FaqTeaser />
      <CtaBand />
    </>
  )
}
