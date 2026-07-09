import { render, screen } from '@testing-library/react'

const { APPLICATION, mockSupabase, setOffer } = vi.hoisted(() => {
  const APPLICATION = { id: 'app-1', track: 'sme' }
  let currentOffer = null
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () => Promise.resolve({ data: currentOffer, error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  }
  return { APPLICATION, mockSupabase, setOffer: (o) => { currentOffer = o } }
})

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { client_ref: 'HB-2026-00100', full_name: 'Aminata Koroma', company_name: 'Solari AgroExports Ltd' },
  }),
}))
vi.mock('@/hooks/useApplication', () => ({
  useApplication: () => ({ application: APPLICATION, loading: false }),
}))

import OfferLetter from '../OfferLetter'

import {
  instalmentDetails,
  instalmentLine,
  describeDefaultCharges,
  describePrepayment,
} from '../OfferLetter'

const AMORTISING_TERMS = {
  principal: 100000,
  currency: 'USD',
  annual_rate_pct: 12,
  term_months: 12,
  repayment_frequency: 'monthly',
  structure: 'amortising',
  grace_months: 0,
  balloon_pct: 0,
}

test('instalmentLine reports the periodic payment for a plain amortising offer', () => {
  expect(instalmentLine(AMORTISING_TERMS)).toBe('Instalment amount: $8,884.88 per month.')
})

test('instalmentLine adds the grace-period instalment for an amortising offer with grace', () => {
  const terms = { ...AMORTISING_TERMS, term_months: 15, grace_months: 3 }
  const details = instalmentDetails(terms)
  expect(details.kind).toBe('amortising')
  expect(details.graceInstalment).not.toBeNull()
  const line = instalmentLine(terms)
  expect(line).toMatch(/^Instalment amount: \$[\d,.]+ per month\./)
  expect(line).toMatch(/Interest-only during the first 3 months: \$[\d,.]+ per month\./)
})

test('instalmentLine describes a bullet structure as interest-only with principal at maturity', () => {
  const terms = {
    principal: 50000, currency: 'USD', annual_rate_pct: 10, term_months: 12,
    repayment_frequency: 'monthly', structure: 'bullet', grace_months: 0, balloon_pct: 0,
  }
  expect(instalmentLine(terms)).toBe(
    'Interest-only instalment: $416.67 per month. Principal of $50,000.00 is due in full at maturity.'
  )
})

test('instalmentLine notes the final balloon payment for a balloon structure', () => {
  const terms = { ...AMORTISING_TERMS, term_months: 36, balloon_pct: 30 }
  const line = instalmentLine(terms)
  expect(line).toMatch(/^Instalment amount: \$[\d,.]+ per month\./)
  expect(line).toMatch(/The final payment includes a balloon of \$30,000\.00\./)
})

test('instalmentLine returns null when terms are incomplete', () => {
  expect(instalmentLine({ currency: 'USD' })).toBeNull()
})

test('describeDefaultCharges combines a flat late fee and a penalty rate', () => {
  const charges = {
    late_fee: { type: 'flat', value: 150 },
    penalty_rate_pct: 3,
    grace_days: 10,
  }
  expect(describeDefaultCharges(charges, 'USD')).toBe(
    'Any payment more than 10 days overdue is subject to a late fee of $150.00 and a penalty rate of 3% per annum on the overdue balance.'
  )
})

test('describeDefaultCharges reports a percent-of-instalment late fee alone', () => {
  const charges = { late_fee: { type: 'percent_of_instalment', value: 2 }, penalty_rate_pct: 0, grace_days: 5 }
  expect(describeDefaultCharges(charges, 'USD')).toBe(
    'Any payment more than 5 days overdue is subject to a late fee of 2% of the missed instalment.'
  )
})

test('describeDefaultCharges returns null when neither charge is set', () => {
  const charges = { late_fee: { type: 'flat', value: 0 }, penalty_rate_pct: 0, grace_days: 10 }
  expect(describeDefaultCharges(charges, 'USD')).toBeNull()
  expect(describeDefaultCharges(null, 'USD')).toBeNull()
})

test('describePrepayment reports the penalty percentage when one applies', () => {
  expect(describePrepayment({ allowed: true, penalty_pct_of_remaining_principal: 1.5 })).toBe(
    'Early settlement of this facility is permitted, subject to a penalty of 1.5% of the remaining principal.'
  )
})

test('describePrepayment reports no penalty when the percentage is zero', () => {
  expect(describePrepayment({ allowed: true, penalty_pct_of_remaining_principal: 0 })).toBe(
    'Early settlement of this facility is permitted with no penalty.'
  )
})

test('describePrepayment reports early settlement is not permitted', () => {
  expect(describePrepayment({ allowed: false, penalty_pct_of_remaining_principal: 0 })).toBe(
    'Early settlement is not permitted under this offer.'
  )
})

test('describePrepayment returns null when absent', () => {
  expect(describePrepayment(null)).toBeNull()
})

const BASE_TERMS = {
  principal: 100000, currency: 'USD', annual_rate_pct: 12, term_months: 12,
  repayment_frequency: 'monthly', structure: 'amortising', grace_months: 0, balloon_pct: 0,
  fees: [], conditions_precedent: [], covenants: [],
}

test('shows the instalment amount for the active offer', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  expect(await screen.findByText('Instalment amount: $8,884.88 per month.')).toBeInTheDocument()
})

test('omits default charges, prepayment, and disclosure sections for offers issued before this change', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  expect(screen.queryByText('Default charges')).not.toBeInTheDocument()
  expect(screen.queryByText('Prepayment')).not.toBeInTheDocument()
  expect(screen.queryByText('Security and collateral')).not.toBeInTheDocument()
  expect(screen.queryByText('Insurance requirements')).not.toBeInTheDocument()
})

test('renders default charges, prepayment, and disclosure sections when present', async () => {
  setOffer({
    id: 'offer-1',
    version: 1,
    status: 'issued',
    terms: {
      ...BASE_TERMS,
      default_charges: { late_fee: { type: 'flat', value: 150 }, penalty_rate_pct: 3, grace_days: 10 },
      prepayment: { allowed: true, penalty_pct_of_remaining_principal: 1.5 },
      security_description: 'General security agreement over business assets.',
      insurance_requirements: 'Comprehensive trade credit insurance.',
    },
  })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  expect(screen.getByText('Default charges')).toBeInTheDocument()
  expect(screen.getByText(/a late fee of \$150\.00 and a penalty rate of 3% per annum/)).toBeInTheDocument()
  expect(screen.getByText('Prepayment')).toBeInTheDocument()
  expect(screen.getByText(/subject to a penalty of 1\.5% of the remaining principal/)).toBeInTheDocument()
  expect(screen.getByText('Security and collateral')).toBeInTheDocument()
  expect(screen.getByText('General security agreement over business assets.')).toBeInTheDocument()
  expect(screen.getByText('Insurance requirements')).toBeInTheDocument()
  expect(screen.getByText('Comprehensive trade credit insurance.')).toBeInTheDocument()
})

test('renders the marketing logo as a watermark behind the document content', async () => {
  setOffer({ id: 'offer-1', version: 1, status: 'issued', terms: BASE_TERMS })
  render(<OfferLetter />)
  await screen.findByText('Instalment amount: $8,884.88 per month.')
  const watermark = screen.getByTestId('document-watermark')
  expect(watermark.tagName).toBe('IMG')
  expect(watermark).toHaveAttribute('alt', '')
  expect(watermark).toHaveAttribute('aria-hidden', 'true')
})
