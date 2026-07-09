import { describe, expect, test } from 'vitest'
import {
  REQUIRED_FIELDS_SME,
  profileCompletion,
  overallDraftCompletion,
  canSubmit,
  resolveActionState,
  phaseFor,
  hasReachedOffer,
} from '@/lib/applicationState'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_SME_FIELDS = {
  businessName: 'Acme Traders', registrationNumber: 'RC-1234',
  businessType: 'private_limited', countryOfRegistration: 'Kenya',
  timeInOperation: '4', sector: 'Retail', employees: '12',
  email: 'founder@acme.test', confirmEmail: 'founder@acme.test',
  phone: '', confirmPhone: '', address: '',
  monthlySales: '85000', existingDebt: 'no',
  loanPurpose: 'working_capital', amountSought: '250000',
  description: 'Stock financing for the next quarter.',
}

function app(overrides = {}) {
  return {
    id: 'app-1',
    track: 'sme',
    status: 'draft',
    fields: {},
    business_profile: {},
    ...overrides,
  }
}

// ── profileCompletion (still used by non-SME tracks' business_profile form) ──

describe('profileCompletion', () => {
  test('empty profile scores 0', () => {
    expect(profileCompletion({})).toBe(0)
    expect(profileCompletion(null)).toBe(0)
    expect(profileCompletion(undefined)).toBe(0)
  })

  test('25 points per completed base section', () => {
    expect(profileCompletion({ progress: { registration: true } })).toBe(25)
    expect(
      profileCompletion({ progress: { registration: true, trading: true } })
    ).toBe(50)
    expect(
      profileCompletion({
        progress: { registration: true, trading: true, financials: true },
      })
    ).toBe(75)
    expect(
      profileCompletion({
        progress: { registration: true, trading: true, financials: true, purpose: true },
      })
    ).toBe(100)
  })

  test('false flags do not count', () => {
    expect(
      profileCompletion({ progress: { registration: true, trading: false } })
    ).toBe(25)
  })

  test('extended sections no longer affect the base score (Phase D)', () => {
    const full = {
      progress: { registration: true, trading: true, financials: true, purpose: true },
    }
    expect(profileCompletion(full, ['collateral'])).toBe(100)
    expect(profileCompletion(full)).toBe(100)
  })
})

// ── REQUIRED_FIELDS_SME ───────────────────────────────────────────────────────

describe('REQUIRED_FIELDS_SME', () => {
  test('lists the eleven required intake keys, contact email and its confirmation included', () => {
    expect(REQUIRED_FIELDS_SME).toEqual([
      'businessName', 'registrationNumber', 'businessType', 'countryOfRegistration',
      'timeInOperation', 'monthlySales', 'loanPurpose', 'amountSought',
      'description', 'email', 'confirmEmail',
    ])
  })
})

// ── overallDraftCompletion (SME: % of required fields filled) ────────────────

describe('overallDraftCompletion — SME', () => {
  test('nothing filled scores 0', () => {
    expect(overallDraftCompletion(app())).toBe(0)
  })

  test('all required fields filled scores 100', () => {
    expect(overallDraftCompletion(app({ fields: FULL_SME_FIELDS }))).toBe(100)
  })

  test('half the required fields filled scores 45 (6 of 11 fields)', () => {
    const half = {
      businessName: 'Acme', registrationNumber: 'RC-1',
      businessType: 'private_limited', countryOfRegistration: 'Kenya',
      timeInOperation: '4', email: 'test@acme.test',
    }
    expect(overallDraftCompletion(app({ fields: half }))).toBe(Math.round((6 / 11) * 100))
  })

  test('a completed self-check does not affect the score', () => {
    expect(
      overallDraftCompletion(
        app({
          fields: FULL_SME_FIELDS,
          eligibility: { completed_at: '2026-07-07T12:00:00Z', score: 8.2, band: 'Application-ready' },
        })
      )
    ).toBe(100)
  })

  test('blank strings do not count as filled', () => {
    expect(
      overallDraftCompletion(app({ fields: { ...FULL_SME_FIELDS, businessName: '   ' } }))
    ).toBeLessThan(100)
  })
})

// ── canSubmit — SME: required fields only, no self-check/document gate ──────

describe('canSubmit — SME', () => {
  test('true once every required field is present', () => {
    expect(canSubmit(app({ fields: FULL_SME_FIELDS }))).toBe(true)
  })

  test('true even with no self-check at all', () => {
    expect(canSubmit(app({ fields: FULL_SME_FIELDS, eligibility: undefined }))).toBe(true)
  })

  test('false when a required field is missing', () => {
    const { monthlySales, ...rest } = FULL_SME_FIELDS
    expect(canSubmit(app({ fields: rest }))).toBe(false)
  })

  test('false on an empty draft', () => {
    expect(canSubmit(app())).toBe(false)
  })

  test('phone and address are not required', () => {
    expect(
      canSubmit(app({ fields: { ...FULL_SME_FIELDS, phone: '', address: '' } }))
    ).toBe(true)
  })

  test('false when confirmEmail does not match email', () => {
    expect(
      canSubmit(app({ fields: { ...FULL_SME_FIELDS, confirmEmail: 'typo@acme.test' } }))
    ).toBe(false)
  })

  test('false when phone is filled but confirmPhone does not match', () => {
    expect(
      canSubmit(
        app({
          fields: { ...FULL_SME_FIELDS, phone: '+254700000000', confirmPhone: '+254700000001' },
        })
      )
    ).toBe(false)
  })

  test('true when phone and confirmPhone match', () => {
    expect(
      canSubmit(
        app({
          fields: { ...FULL_SME_FIELDS, phone: '+254700000000', confirmPhone: '+254700000000' },
        })
      )
    ).toBe(true)
  })

  test('true when phone is blank, regardless of confirmPhone', () => {
    expect(
      canSubmit(app({ fields: { ...FULL_SME_FIELDS, phone: '', confirmPhone: '' } }))
    ).toBe(true)
  })
})

// ── canSubmit — non-SME tracks keep the business-profile gate, self-check optional ─

describe('canSubmit — non-SME tracks', () => {
  const FULL_PROFILE = {
    progress: { registration: true, trading: true, financials: true, purpose: true },
  }

  test('true when the business profile is fully complete, no self-check required', () => {
    expect(
      canSubmit(app({ track: 'project', business_profile: FULL_PROFILE, fields: {} }))
    ).toBe(true)
  })

  test('false when the business profile is incomplete', () => {
    expect(canSubmit(app({ track: 'project', business_profile: {} }))).toBe(false)
  })
})

// ── resolveActionState ────────────────────────────────────────────────────────

describe('resolveActionState', () => {
  test('any draft resolves to the single draft state regardless of completion', () => {
    expect(resolveActionState(app())).toBe('draft')
    expect(resolveActionState(app({ fields: FULL_SME_FIELDS }))).toBe('draft')
  })

  test.each(['submitted', 'kyc_verification', 'credit_assessment', 'funder_matching'])(
    '%s is in_review',
    (status) => {
      expect(resolveActionState(app({ status }))).toBe('in_review')
    }
  )

  test.each(['term_sheet', 'offer_issued'])('%s is offer_issued', (status) => {
    expect(resolveActionState(app({ status }))).toBe('offer_issued')
  })

  test.each(['offer_accepted', 'fee_payment'])('%s is fee_due', (status) => {
    expect(resolveActionState(app({ status }))).toBe('fee_due')
  })

  test('funded is funded', () => {
    expect(resolveActionState(app({ status: 'funded' }))).toBe('funded')
  })

  // Phase C: open information requests force action mode past draft
  const openRfi = { id: 'r-1', status: 'open' }

  test.each([
    'submitted', 'kyc_verification', 'credit_assessment', 'funder_matching',
    'term_sheet', 'offer_issued', 'offer_accepted', 'fee_payment', 'funded',
  ])('%s with an open RFI is rfi_open', (status) => {
    expect(resolveActionState(app({ status }), [openRfi])).toBe('rfi_open')
  })

  test('draft with an open RFI keeps its draft state', () => {
    expect(resolveActionState(app(), [openRfi])).toBe('draft')
  })

  test('responded and resolved RFIs do not force action mode', () => {
    const rfis = [{ id: 'a', status: 'responded' }, { id: 'b', status: 'resolved' }]
    expect(resolveActionState(app({ status: 'credit_assessment' }), rfis)).toBe('in_review')
  })
})

// ── phaseFor ──────────────────────────────────────────────────────────────────

describe('phaseFor', () => {
  test.each([
    ['draft', 1],
    ['submitted', 1],
    ['kyc_verification', 1],
    ['credit_assessment', 2],
    ['funder_matching', 2],
    ['term_sheet', 3],
    ['offer_issued', 3],
    ['offer_accepted', 3],
    ['fee_payment', 4],
    ['funded', 4],
  ])('%s is phase %i', (status, phase) => {
    expect(phaseFor(status)).toBe(phase)
  })
})

// ── hasReachedOffer (Phase D: gates document RFIs to post-offer) ────────────

describe('hasReachedOffer', () => {
  test.each(['draft', 'submitted', 'kyc_verification', 'credit_assessment', 'funder_matching', 'term_sheet'])(
    '%s has not reached offer',
    (status) => {
      expect(hasReachedOffer(status)).toBe(false)
    }
  )

  test.each(['offer_issued', 'offer_accepted', 'fee_payment', 'funded'])(
    '%s has reached offer',
    (status) => {
      expect(hasReachedOffer(status)).toBe(true)
    }
  )
})
