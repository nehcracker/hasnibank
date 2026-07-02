import { describe, it, expect } from 'vitest'
import { questions, scoreAnswers, getBand } from '../eligibilityModel'

// ── Answer fixtures ──────────────────────────────────────────────────────────

const ALL_BEST = Object.fromEntries(questions.map(q => [q.id, 1]))
const ALL_WORST = Object.fromEntries(questions.map(q => [q.id, 0]))

// Mixed: financial q1=1, q2=0.5 · collateral q3=1, q4=1 · project_docs q5=0, q6=0
//        compliance q7=1, q8=0 · capacity q9=0.5, q10=0.5
// Pillar scores: financial=18.75, collateral=20, project_docs=0, compliance=7.5, capacity=10
// Total=56.25 → score=5.6 · band="Conditionally ready"
// Fixes: project_docs (forgone 20) › capacity (forgone 10) › compliance (forgone 7.5)
const MIXED = {
  q1: 1,   q2: 0.5,   // financial
  q3: 1,   q4: 1,     // collateral
  q5: 0,   q6: 0,     // project_docs
  q7: 1,   q8: 0,     // compliance
  q9: 0.5, q10: 0.5,  // capacity
}

// ── scoreAnswers ─────────────────────────────────────────────────────────────

describe('scoreAnswers', () => {
  it('all-best answers → score 10.0, band "Application-ready", empty fix list', () => {
    const { score, band, fixes } = scoreAnswers(ALL_BEST)
    expect(score).toBe(10.0)
    expect(band).toBe('Application-ready')
    expect(fixes).toHaveLength(0)
  })

  it('all-worst answers → score 0.0, band "Not yet ready", all 5 pillars ordered by weight descending', () => {
    const { score, band, fixes } = scoreAnswers(ALL_WORST)
    expect(score).toBe(0.0)
    expect(band).toBe('Not yet ready')
    expect(fixes).toHaveLength(5)
    // Financial (forgone 25) first, Compliance (forgone 15) last
    expect(fixes[0].pillar).toBe('financial')
    expect(fixes[4].pillar).toBe('compliance')
    // Three equal-forgone (20) in definition order: collateral, project_docs, capacity
    expect(fixes[1].pillar).toBe('collateral')
    expect(fixes[2].pillar).toBe('project_docs')
    expect(fixes[3].pillar).toBe('capacity')
  })

  it('mixed fixture → score 5.6, band "Conditionally ready", fix list ordered by points forgone', () => {
    const { score, band, fixes } = scoreAnswers(MIXED)
    expect(score).toBe(5.6)
    expect(band).toBe('Conditionally ready')
    expect(fixes).toHaveLength(3)
    expect(fixes[0].pillar).toBe('project_docs') // forgone 20
    expect(fixes[1].pillar).toBe('capacity')     // forgone 10
    expect(fixes[2].pillar).toBe('compliance')   // forgone 7.5
    // Each fix must carry label and remediation
    expect(typeof fixes[0].label).toBe('string')
    expect(typeof fixes[0].remediation).toBe('string')
    expect(typeof fixes[0].pointsForgone).toBe('number')
  })
})

// ── getBand boundaries ───────────────────────────────────────────────────────

describe('getBand', () => {
  it('score 7.5 → "Application-ready"', () => {
    expect(getBand(7.5)).toBe('Application-ready')
  })

  it('score 5.0 → "Conditionally ready"', () => {
    expect(getBand(5.0)).toBe('Conditionally ready')
  })

  it('score 4.9 → "Not yet ready"', () => {
    expect(getBand(4.9)).toBe('Not yet ready')
  })
})
