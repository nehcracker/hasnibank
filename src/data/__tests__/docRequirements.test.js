import { describe, it, expect } from 'vitest'
import {
  getRequirements,
  deriveChecklist,
  VERIFICATION_ENABLED,
} from '../docRequirements'

// ── getRequirements ───────────────────────────────────────────────────────────

describe('getRequirements', () => {
  it('sme → 6 items (4 common + 2 track-specific)', () => {
    expect(getRequirements('sme')).toHaveLength(6)
  })

  it('project → 7 items (4 common + 3 track-specific)', () => {
    expect(getRequirements('project')).toHaveLength(7)
  })

  it('trade → 6 items (4 common + 2 track-specific)', () => {
    expect(getRequirements('trade')).toHaveLength(6)
  })

  it('acquisition → 6 items (4 common + 2 track-specific)', () => {
    expect(getRequirements('acquisition')).toHaveLength(6)
  })

  it('unknown track → 4 common items only', () => {
    expect(getRequirements('unknown')).toHaveLength(4)
  })

  it('null track → 4 common items only', () => {
    expect(getRequirements(null)).toHaveLength(4)
  })

  it('each item has type, label, and description', () => {
    const items = getRequirements('sme')
    for (const item of items) {
      expect(typeof item.type).toBe('string')
      expect(typeof item.label).toBe('string')
      expect(typeof item.description).toBe('string')
      expect(item.type.length).toBeGreaterThan(0)
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
    }
  })
})

// ── deriveChecklist ───────────────────────────────────────────────────────────

describe('deriveChecklist', () => {
  const reqs = getRequirements('sme') // 6 items

  it('empty documents → all outstanding', () => {
    const result = deriveChecklist(reqs, [])
    expect(result).toHaveLength(6)
    expect(result.every((r) => r.status === 'outstanding')).toBe(true)
  })

  it('documents matching some types → those received, rest outstanding', () => {
    const docs = [
      { document_type: 'certificate_of_incorporation' },
      { document_type: 'director_id' },
    ]
    const result = deriveChecklist(reqs, docs)
    const received = result.filter((r) => r.status === 'received')
    const outstanding = result.filter((r) => r.status === 'outstanding')
    expect(received).toHaveLength(2)
    expect(outstanding).toHaveLength(4)
  })

  it('label fallback match → status received', () => {
    const reqs2 = getRequirements('sme')
    const targetLabel = reqs2[0].label
    const docs = [{ document_type: '__no_match__', label: targetLabel }]
    const result = deriveChecklist(reqs2, docs)
    const received = result.filter((r) => r.status === 'received')
    expect(received).toHaveLength(1)
  })

  it('counts are correct when one doc matches', () => {
    const docs = [{ document_type: 'bank_statements_12m' }]
    const result = deriveChecklist(reqs, docs)
    const receivedCount = result.filter((r) => r.status === 'received').length
    expect(receivedCount).toBe(1)
  })

  it('output items carry through type, label, description plus status', () => {
    const result = deriveChecklist(reqs, [])
    expect(typeof result[0].type).toBe('string')
    expect(typeof result[0].label).toBe('string')
    expect(typeof result[0].description).toBe('string')
    expect(result[0].status).toBe('outstanding')
  })
})

// ── VERIFICATION_ENABLED = false ──────────────────────────────────────────────

describe('VERIFICATION_ENABLED', () => {
  it('is exported as a boolean', () => {
    expect(typeof VERIFICATION_ENABLED).toBe('boolean')
  })

  it('is false (staff verification not yet live)', () => {
    expect(VERIFICATION_ENABLED).toBe(false)
  })

  it('no item ever derives verified status when VERIFICATION_ENABLED is false', () => {
    const reqs = getRequirements('project')
    // Provide docs for every requirement with a note hinting verification
    const docs = reqs.map((r) => ({
      document_type: r.type,
      note: 'verified by analyst',
    }))
    const result = deriveChecklist(reqs, docs)
    expect(result.some((r) => r.status === 'verified')).toBe(false)
  })
})
