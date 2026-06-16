import { siteConfig } from '@/data/siteConfig'

const BASE = siteConfig.siteUrl

export const seoConfig = {
  home: {
    title: 'Hasni Bank — Global Financing Solutions',
    description: 'Hasni Bank connects SMEs, entrepreneurs, and project sponsors with an international network of funders, lenders, and institutions.',
    keywords: 'global financing solutions, SME financing, project funding, international finance, business funding',
    canonical: `${BASE}/`,
  },
  smeFinance: {
    title: 'SME Finance — Working Capital & Business Loans | Hasni Bank',
    description: 'Access working capital, equipment finance, business expansion loans, and trade finance through our global funder network.',
    keywords: 'SME financing, business loans, working capital, equipment finance, trade finance solutions',
    canonical: `${BASE}/sme-finance`,
  },
  projectFunding: {
    title: 'Project Funding — Infrastructure & Energy Finance | Hasni Bank',
    description: 'Debt, equity, and structured finance for infrastructure, energy, real estate, and industrial projects worldwide.',
    keywords: 'project funding, infrastructure financing, energy finance, private financing solutions',
    canonical: `${BASE}/project-funding`,
  },
  howItWorks: {
    title: 'How It Works — Our Financing Process | Hasni Bank',
    description: 'A four-step process: submit your requirement, assessment, funder matching, and completion.',
    keywords: 'how it works, financing process, apply for funding, funder matching',
    canonical: `${BASE}/how-it-works`,
  },
  about: {
    title: 'About Hasni Bank — Our Mission & Values',
    description: 'Hasni Bank is a global financing marketplace built on integrity, excellence, and a deep understanding of international capital markets.',
    keywords: 'about Hasni Bank, global financing marketplace, international finance',
    canonical: `${BASE}/about`,
  },
  team: {
    title: 'Our Team — Hasni Bank',
    description: 'Meet the experienced financing professionals behind Hasni Bank.',
    keywords: 'Hasni Bank team, financing professionals',
    canonical: `${BASE}/team`,
  },
  insights: {
    title: 'Insights — Finance & Capital Markets | Hasni Bank',
    description: 'Expert analysis, guides, and updates on SME growth, international finance, project development, and trade finance.',
    keywords: 'finance insights, capital markets, SME growth strategies, trade finance updates',
    canonical: `${BASE}/insights`,
  },
  contact: {
    title: 'Apply for Financing — Hasni Bank',
    description: 'Submit your financing requirement and our team will assess your needs and connect you with the right funders.',
    keywords: 'apply for financing, contact Hasni Bank, funding application',
    canonical: `${BASE}/contact`,
  },
}
