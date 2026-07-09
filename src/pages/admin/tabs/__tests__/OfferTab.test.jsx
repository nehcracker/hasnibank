import { render, screen, fireEvent } from '@testing-library/react'
import OfferTab, { formFromTerms, termsFromForm } from '../OfferTab'

const APPLICATION = { amount_sought: 250000, currency: 'USD' }

test('formFromTerms defaults default charges, prepayment, and disclosure fields when no terms exist', () => {
  const form = formFromTerms(APPLICATION, null)
  expect(form.lateFeeType).toBe('flat')
  expect(form.lateFeeValue).toBe('')
  expect(form.penaltyRatePct).toBe('')
  expect(form.graceDays).toBe('10')
  expect(form.prepaymentAllowed).toBe(true)
  expect(form.prepaymentPenaltyPct).toBe('0')
  expect(form.securityDescription).toBe('')
  expect(form.insuranceRequirements).toBe('')
})

test('formFromTerms reads default charges, prepayment, and disclosure fields from stored terms', () => {
  const terms = {
    default_charges: {
      late_fee: { type: 'percent_of_instalment', value: 2 },
      penalty_rate_pct: 3,
      grace_days: 15,
    },
    prepayment: { allowed: false, penalty_pct_of_remaining_principal: 1.5 },
    security_description: 'General security agreement over business assets.',
    insurance_requirements: 'Comprehensive trade credit insurance.',
  }
  const form = formFromTerms(APPLICATION, terms)
  expect(form.lateFeeType).toBe('percent_of_instalment')
  expect(form.lateFeeValue).toBe('2')
  expect(form.penaltyRatePct).toBe('3')
  expect(form.graceDays).toBe('15')
  expect(form.prepaymentAllowed).toBe(false)
  expect(form.prepaymentPenaltyPct).toBe('1.5')
  expect(form.securityDescription).toBe('General security agreement over business assets.')
  expect(form.insuranceRequirements).toBe('Comprehensive trade credit insurance.')
})

function baseForm(overrides) {
  return {
    principal: '250000', currency: 'USD', annualRatePct: '12', termMonths: '36',
    frequency: 'monthly', graceMonths: '0', structure: 'amortising', balloonPct: '30',
    fees: [], conditions: [], covenants: [],
    lateFeeType: 'flat', lateFeeValue: '150', penaltyRatePct: '3', graceDays: '10',
    prepaymentAllowed: true, prepaymentPenaltyPct: '1.5',
    securityDescription: 'General security agreement.',
    insuranceRequirements: 'Trade credit insurance required.',
    ...overrides,
  }
}

test('termsFromForm writes default charges, prepayment, and disclosure fields', () => {
  const terms = termsFromForm(baseForm())
  expect(terms.default_charges).toEqual({
    late_fee: { type: 'flat', value: 150 },
    penalty_rate_pct: 3,
    grace_days: 10,
  })
  expect(terms.prepayment).toEqual({ allowed: true, penalty_pct_of_remaining_principal: 1.5 })
  expect(terms.security_description).toBe('General security agreement.')
  expect(terms.insurance_requirements).toBe('Trade credit insurance required.')
})

test('termsFromForm zeroes the prepayment penalty when early settlement is not permitted', () => {
  const terms = termsFromForm(baseForm({ prepaymentAllowed: false }))
  expect(terms.prepayment).toEqual({ allowed: false, penalty_pct_of_remaining_principal: 0 })
})

const OFFER_TAB_APPLICATION = { id: 'app-1', amount_sought: 250000, currency: 'USD' }

test('renders default charges, prepayment, and disclosure fields', () => {
  render(
    <OfferTab application={OFFER_TAB_APPLICATION} offers={[]} user={{ id: 'staff-1' }} onChanged={vi.fn()} />
  )
  expect(screen.getByText('Late fee')).toBeInTheDocument()
  expect(screen.getByText(/penalty rate/i)).toBeInTheDocument()
  expect(screen.getByText(/grace days before charges apply/i)).toBeInTheDocument()
  expect(screen.getByText('Early settlement permitted')).toBeInTheDocument()
  expect(screen.getByText('Security and collateral')).toBeInTheDocument()
  expect(screen.getByText('Insurance requirements')).toBeInTheDocument()
})

test('prepayment penalty input is hidden once early settlement is switched off', () => {
  render(
    <OfferTab application={OFFER_TAB_APPLICATION} offers={[]} user={{ id: 'staff-1' }} onChanged={vi.fn()} />
  )
  expect(screen.getByText(/prepayment penalty % of remaining principal/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: /early settlement permitted/i }))
  expect(screen.queryByText(/prepayment penalty % of remaining principal/i)).not.toBeInTheDocument()
})
