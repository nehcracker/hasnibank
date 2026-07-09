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
