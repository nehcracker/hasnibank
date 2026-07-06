import { describe, it, expect } from 'vitest'
import { ASSESSMENT_PILLARS, rollupScore, gateCheck } from '../assessment'

const finding = (overrides = {}) => ({
  id: 'f-1',
  pillar: 'financial_records',
  severity: 'informational',
  score: 1,
  status: 'open',
  ...overrides,
})

// ── ASSESSMENT_PILLARS ────────────────────────────────────────────────────────

describe('ASSESSMENT_PILLARS', () => {
  it('has five pillars whose maxima total 10', () => {
    expect(ASSESSMENT_PILLARS).toHaveLength(5)
    const total = ASSESSMENT_PILLARS.reduce((sum, p) => sum + p.max, 0)
    expect(total).toBeCloseTo(10)
  })

  it('keys match the phase3c pillar check constraint', () => {
    expect(ASSESSMENT_PILLARS.map((p) => p.key)).toEqual([
      'financial_records', 'collateral', 'documentation', 'compliance', 'capacity',
    ])
  })
})

// ── rollupScore ───────────────────────────────────────────────────────────────

describe('rollupScore', () => {
  it('no findings at all → total null, every pillar unassessed', () => {
    const { total, byPillar } = rollupScore([])
    expect(total).toBeNull()
    for (const p of ASSESSMENT_PILLARS) {
      expect(byPillar[p.key]).toEqual({ score: 0, max: p.max, assessed: false })
    }
  })

  it('sums finding scores within a pillar', () => {
    const { total, byPillar } = rollupScore([
      finding({ id: 'a', score: 1 }),
      finding({ id: 'b', score: 0.5 }),
    ])
    expect(byPillar.financial_records.score).toBeCloseTo(1.5)
    expect(byPillar.financial_records.assessed).toBe(true)
    expect(total).toBeCloseTo(1.5)
  })

  it('caps each pillar at its max', () => {
    const { total, byPillar } = rollupScore([
      finding({ id: 'a', score: 2 }),
      finding({ id: 'b', score: 2 }),
    ])
    expect(byPillar.financial_records.score).toBeCloseTo(2.5)
    expect(total).toBeCloseTo(2.5)
  })

  it('unassessed pillars contribute 0 while assessed pillars count', () => {
    const { total, byPillar } = rollupScore([
      finding({ id: 'a', pillar: 'compliance', score: 1.5 }),
      finding({ id: 'b', pillar: 'capacity', score: 1 }),
    ])
    expect(byPillar.compliance.score).toBeCloseTo(1.5)
    expect(byPillar.capacity.score).toBeCloseTo(1)
    expect(byPillar.financial_records.assessed).toBe(false)
    expect(total).toBeCloseTo(2.5)
  })

  it('resolved findings still contribute their score', () => {
    const { total } = rollupScore([finding({ status: 'resolved', score: 2 })])
    expect(total).toBeCloseTo(2)
  })

  it('full marks across all pillars → 10', () => {
    const { total } = rollupScore(
      ASSESSMENT_PILLARS.map((p, i) =>
        finding({ id: `f-${i}`, pillar: p.key, score: p.max })
      )
    )
    expect(total).toBeCloseTo(10)
  })
})

// ── gateCheck ─────────────────────────────────────────────────────────────────

describe('gateCheck', () => {
  it('clear when nothing outstanding', () => {
    expect(gateCheck([], [])).toEqual({ criticalOpen: 0, rfisOpen: 0, clear: true })
  })

  it('open critical finding blocks the gate', () => {
    const result = gateCheck([finding({ severity: 'critical' })], [])
    expect(result.criticalOpen).toBe(1)
    expect(result.clear).toBe(false)
  })

  it('resolved critical finding does not count', () => {
    const result = gateCheck([finding({ severity: 'critical', status: 'resolved' })], [])
    expect(result.criticalOpen).toBe(0)
    expect(result.clear).toBe(true)
  })

  it('open non-critical findings do not block', () => {
    const result = gateCheck([finding({ severity: 'requires_improvement' })], [])
    expect(result.criticalOpen).toBe(0)
    expect(result.clear).toBe(true)
  })

  it('open RFI blocks the gate; responded and resolved do not', () => {
    const rfi = (status) => ({ id: `r-${status}`, status })
    const result = gateCheck([], [rfi('open'), rfi('responded'), rfi('resolved')])
    expect(result.rfisOpen).toBe(1)
    expect(result.clear).toBe(false)
  })
})
