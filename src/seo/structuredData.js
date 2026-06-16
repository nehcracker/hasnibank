import { siteConfig } from '@/data/siteConfig'

const BASE = siteConfig.siteUrl

export const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hasni Bank',
  url: BASE,
  logo: `${BASE}/favicon.svg`,
  description: 'Global financing marketplace connecting SMEs and project sponsors with international capital.',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'financing@hasnibank.com',
    contactType: 'customer service',
  },
}

export const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Hasni Bank',
  url: BASE,
}

export const serviceData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'SME Financing',
    provider: { '@type': 'Organization', name: 'Hasni Bank' },
    description: 'Working capital, equipment finance, and expansion loans for small and medium enterprises.',
    url: `${BASE}/sme-finance`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Project Funding',
    provider: { '@type': 'Organization', name: 'Hasni Bank' },
    description: 'Debt, equity, and structured finance for infrastructure, energy, and industrial projects.',
    url: `${BASE}/project-funding`,
  },
]

export function getFAQStructuredData(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
