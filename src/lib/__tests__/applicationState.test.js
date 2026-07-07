import { describe, expect, test } from 'vitest'
import {
  profileCompletion,
  kycCompletion,
  overallDraftCompletion,
  canSubmit,
  resolveActionState,
  phaseFor,
} from '@/lib/applicationState'
import { getRequirements } from '@/data/docRequirements'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_PROGRESS = {
  progress: { registration: true, trading: true, financials: true, purpose: true },
}

const SME_REQUIREMENTS = getRequirements('sme') // 4 common + 2 sme = 6 items

/** One uploaded document per requirement type */
function allDocs(track = 'sme') {
  return getRequirements(track).map((r) => ({ document_type: r.type }))
}

function app(overrides = {}) {
  return {
    id: 'app-1',
    track: 'sme',
    status: 'draft',
    business_profile: {},
    ...overrides,
  }
}

// ── profileCompletion ─────────────────────────────────────────────────────────

describe('profileCompletion', () => {
  test('empty profile scores 0', () => {
    expect(profileCompletion({})).toBe(0)
    expect(profileCompletion(null)).toBe(0)
    expect(profileCompletion(undefined)).toBe(0)
  })

  test('25 points per completed section', () => {
    expect(profileCompletion({ progress: { registration: true } })).toBe(25)
    expect(
      profileCompletion({ progress: { registration: true, trading: true } })
    ).toBe(50)
    expect(
      profileCompletion({
        progress: { registration: true, trading: true, financials: true },
      })
    ).toBe(75)
    expect(profileCompletion(FULL_PROGRESS)).toBe(100)
  })

  test('false flags do not count', () => {
    expect(
      profileCompletion({ progress: { registration: true, trading: false } })
    ).toBe(25)
  })
})

// ── kycCompletion ─────────────────────────────────────────────────────────────

describe('kycCompletion', () => {
  test('no documents means zero received', () => {
    const result = kycCompletion(SME_REQUIREMENTS, [])
    expect(result).toEqual({ received: 0, total: 6, pct: 0 })
  })

  test('all documents received', () => {
    const result = kycCompletion(SME_REQUIREMENTS, allDocs('sme'))
    expect(result).toEqual({ received: 6, total: 6, pct: 100 })
  })

  test('partial documents', () => {
    const docs = [
      { document_type: 'certificate_of_incorporation' },
      { document_type: 'director_id' },
      { document_type: 'proof_of_address' },
    ]
    const result = kycCompletion(SME_REQUIREMENTS, docs)
    expect(result.received).toBe(3)
    expect(result.total).toBe(6)
    expect(result.pct).toBe(50)
  })
})

// ── profileCompletion with extended sections (Phase C) ───────────────────────

describe('profileCompletion with required_sections', () => {
  const FULL_BASE = {
    progress: { registration: true, trading: true, financials: true, purpose: true },
  }

  test('base sections complete but a required extended section pending is under 100', () => {
    expect(profileCompletion(FULL_BASE, ['collateral'])).toBe(80)
  })

  test('base plus required extended section complete is 100', () => {
    const profile = {
      progress: { ...FULL_BASE.progress, collateral: true },
    }
    expect(profileCompletion(profile, ['collateral'])).toBe(100)
  })

  test('unknown keys in required_sections are ignored', () => {
    expect(profileCompletion(FULL_BASE, ['not_a_section'])).toBe(100)
  })

  test('draft with extended section pending stays draft_profile', () => {
    const application = app({
      business_profile: FULL_BASE,
      required_sections: ['banking'],
    })
    expect(resolveActionState(application, [])).toBe('draft_profile')
  })
})

// ── overallDraftCompletion ────────────────────────────────────────────────────

describe('overallDraftCompletion', () => {
  test('nothing done scores 0', () => {
    expect(overallDraftCompletion(app(), [])).toBe(0)
  })

  test('everything done scores 100', () => {
    expect(
      overallDraftCompletion(app({ business_profile: FULL_PROGRESS }), allDocs('sme'))
    ).toBe(100)
  })

  test('profile complete, no KYC gives 60', () => {
    expect(
      overallDraftCompletion(app({ business_profile: FULL_PROGRESS }), [])
    ).toBe(60)
  })

  test('KYC complete, no profile gives 40', () => {
    expect(overallDraftCompletion(app(), allDocs('sme'))).toBe(40)
  })

  test('half profile, half KYC gives 50', () => {
    const halfProfile = { progress: { registration: true, trading: true } }
    const halfDocs = [
      { document_type: 'certificate_of_incorporation' },
      { document_type: 'director_id' },
      { document_type: 'proof_of_address' },
    ]
    expect(
      overallDraftCompletion(app({ business_profile: halfProfile }), halfDocs)
    ).toBe(50)
  })
})

// ── canSubmit ─────────────────────────────────────────────────────────────────

describe('canSubmit', () => {
  test('true when profile complete and all KYC received', () => {
    expect(
      canSubmit(app({ business_profile: FULL_PROGRESS }), allDocs('sme'))
    ).toBe(true)
  })

  test('false when profile incomplete', () => {
    expect(canSubmit(app(), allDocs('sme'))).toBe(false)
  })

  test('false when one KYC item outstanding', () => {
    const docs = allDocs('sme').slice(0, -1)
    expect(canSubmit(app({ business_profile: FULL_PROGRESS }), docs)).toBe(false)
  })
})

// ── resolveActionState ────────────────────────────────────────────────────────

describe('resolveActionState', () => {
  test('draft with incomplete profile is draft_profile', () => {
    expect(resolveActionState(app(), [])).toBe('draft_profile')
  })

  test('draft with complete profile and outstanding KYC is draft_kyc', () => {
    expect(
      resolveActionState(app({ business_profile: FULL_PROGRESS }), [])
    ).toBe('draft_kyc')
  })

  test('draft with complete profile and complete KYC is draft_kyc (submit gate)', () => {
    expect(
      resolveActionState(app({ business_profile: FULL_PROGRESS }), allDocs('sme'))
    ).toBe('draft_kyc')
  })

  test.each(['submitted', 'kyc_verification', 'credit_assessment', 'funder_matching'])(
    '%s is in_review',
    (status) => {
      expect(resolveActionState(app({ status }), [])).toBe('in_review')
    }
  )

  test.each(['term_sheet', 'offer_issued'])('%s is offer_issued', (status) => {
    expect(resolveActionState(app({ status }), [])).toBe('offer_issued')
  })

  test.each(['offer_accepted', 'fee_payment'])('%s is fee_due', (status) => {
    expect(resolveActionState(app({ status }), [])).toBe('fee_due')
  })

  test('funded is funded', () => {
    expect(resolveActionState(app({ status: 'funded' }), [])).toBe('funded')
  })

  // Phase C: open information requests force action mode past draft
  const openRfi = { id: 'r-1', status: 'open' }

  test.each([
    'submitted', 'kyc_verification', 'credit_assessment', 'funder_matching',
    'term_sheet', 'offer_issued', 'offer_accepted', 'fee_payment', 'funded',
  ])('%s with an open RFI is rfi_open', (status) => {
    expect(resolveActionState(app({ status }), [], [openRfi])).toBe('rfi_open')
  })

  test('draft with an open RFI keeps its draft state', () => {
    expect(resolveActionState(app(), [], [openRfi])).toBe('draft_profile')
  })

  test('responded and resolved RFIs do not force action mode', () => {
    const rfis = [{ id: 'a', status: 'responded' }, { id: 'b', status: 'resolved' }]
    expect(resolveActionState(app({ status: 'credit_assessment' }), [], rfis)).toBe('in_review')
  })

  test('omitting the rfis argument keeps prior behaviour', () => {
    expect(resolveActionState(app({ status: 'credit_assessment' }), [])).toBe('in_review')
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
