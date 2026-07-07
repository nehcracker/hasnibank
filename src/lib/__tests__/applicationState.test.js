import { describe, expect, test } from 'vitest'
import {
  profileCompletion,
  overallDraftCompletion,
  canSubmit,
  resolveActionState,
  phaseFor,
} from '@/lib/applicationState'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_PROGRESS = {
  progress: { registration: true, trading: true, financials: true, purpose: true },
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
    expect(resolveActionState(application)).toBe('draft_profile')
  })
})

const COMPLETED_CHECK = {
  answers: { q1: 1 }, score: 8.2, band: 'Application-ready',
  completed_at: '2026-07-07T12:00:00Z',
}

// ── overallDraftCompletion ────────────────────────────────────────────────────

describe('overallDraftCompletion', () => {
  test('nothing done scores 0', () => {
    expect(overallDraftCompletion(app())).toBe(0)
  })

  test('full profile without self-check scores 80', () => {
    expect(overallDraftCompletion(app({ business_profile: FULL_PROGRESS }))).toBe(80)
  })

  test('full profile with completed self-check scores 100', () => {
    expect(
      overallDraftCompletion(
        app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK })
      )
    ).toBe(100)
  })

  test('half profile without self-check scores 40', () => {
    const halfProfile = { progress: { registration: true, trading: true } }
    expect(overallDraftCompletion(app({ business_profile: halfProfile }))).toBe(40)
  })

  test('self-check alone scores 20', () => {
    expect(overallDraftCompletion(app({ eligibility: COMPLETED_CHECK }))).toBe(20)
  })
})

// ── canSubmit ─────────────────────────────────────────────────────────────────

describe('canSubmit', () => {
  test('true when profile complete and self-check completed', () => {
    expect(
      canSubmit(app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK }))
    ).toBe(true)
  })

  test('false when self-check missing', () => {
    expect(canSubmit(app({ business_profile: FULL_PROGRESS }))).toBe(false)
  })

  test('false when profile incomplete even with self-check', () => {
    expect(canSubmit(app({ eligibility: COMPLETED_CHECK }))).toBe(false)
  })

  test('any band passes: Not yet ready still submits', () => {
    expect(
      canSubmit(
        app({
          business_profile: FULL_PROGRESS,
          eligibility: { ...COMPLETED_CHECK, score: 2.0, band: 'Not yet ready' },
        })
      )
    ).toBe(true)
  })
})

// ── resolveActionState ────────────────────────────────────────────────────────

describe('resolveActionState', () => {
  test('draft with incomplete profile is draft_profile', () => {
    expect(resolveActionState(app())).toBe('draft_profile')
  })

  test('draft with complete profile is draft_selfcheck (self-check pending)', () => {
    expect(resolveActionState(app({ business_profile: FULL_PROGRESS }))).toBe(
      'draft_selfcheck'
    )
  })

  test('draft stays draft_selfcheck once the check is done (submit gate)', () => {
    expect(
      resolveActionState(
        app({ business_profile: FULL_PROGRESS, eligibility: COMPLETED_CHECK })
      )
    ).toBe('draft_selfcheck')
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
    expect(resolveActionState(app(), [openRfi])).toBe('draft_profile')
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
