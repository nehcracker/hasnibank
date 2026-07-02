import { describe, it, expect } from 'vitest'
import {
  paymentAmount,
  buildSchedule,
  totals,
  dscr,
} from '../amortisation.js'

// ---------------------------------------------------------------------------
// paymentAmount
// ---------------------------------------------------------------------------
describe('paymentAmount', () => {
  it('100k @ 12% over 12 monthly periods ≈ 8884.88', () => {
    const result = paymentAmount({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    expect(Math.abs(result - 8884.88)).toBeLessThanOrEqual(0.01)
  })

  it('zero rate: 120k / 12 monthly periods = 10000 exactly', () => {
    const result = paymentAmount({
      principal: 120000,
      annualRatePct: 0,
      termMonths: 12,
      frequency: 'monthly',
    })
    expect(result).toBe(10000)
  })

  it('converts frequency correctly — quarterly gives same PV as annual equivalent', () => {
    const r = paymentAmount({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'quarterly',
    })
    // 4 periods, r = 3% per period
    const expected = (100000 * 0.03) / (1 - Math.pow(1.03, -4))
    expect(Math.abs(r - expected)).toBeLessThanOrEqual(0.01)
  })
})

// ---------------------------------------------------------------------------
// buildSchedule — amortising (standard)
// ---------------------------------------------------------------------------
describe('buildSchedule: amortising', () => {
  it('returns 12 rows for a 12-month loan', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    expect(schedule).toHaveLength(12)
  })

  it('last balance ≤ 0.01 (loan fully repaid)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    expect(schedule[11].balance).toBeLessThanOrEqual(0.01)
  })

  it('sum of principal components ≈ original principal (±0.01)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const principalSum = schedule.reduce((s, row) => s + row.principal, 0)
    expect(Math.abs(principalSum - 100000)).toBeLessThanOrEqual(0.01)
  })

  it('each row has the expected shape', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    schedule.forEach((row, i) => {
      expect(row).toHaveProperty('period', i + 1)
      expect(row).toHaveProperty('payment')
      expect(row).toHaveProperty('interest')
      expect(row).toHaveProperty('principal')
      expect(row).toHaveProperty('balance')
    })
  })

  it('payment ≈ interest + principal for each row', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    schedule.forEach(row => {
      expect(Math.abs(row.payment - row.interest - row.principal)).toBeLessThan(0.001)
    })
  })
})

// ---------------------------------------------------------------------------
// buildSchedule — grace periods
// ---------------------------------------------------------------------------
describe('buildSchedule: grace periods', () => {
  it('periods 1-3 are interest-only (principal = 0)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      graceMonths: 3,
    })
    for (let i = 0; i < 3; i++) {
      expect(schedule[i].principal).toBeCloseTo(0, 8)
      expect(Math.abs(schedule[i].payment - schedule[i].interest)).toBeLessThan(0.001)
    }
  })

  it('amortisation starts at period 4 (principal > 0)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      graceMonths: 3,
    })
    expect(schedule[3].principal).toBeGreaterThan(0)
  })

  it('still produces 12 rows', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      graceMonths: 3,
    })
    expect(schedule).toHaveLength(12)
  })

  it('final balance ≤ 0.01 after grace period loan', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      graceMonths: 3,
    })
    expect(schedule[11].balance).toBeLessThanOrEqual(0.01)
  })
})

// ---------------------------------------------------------------------------
// buildSchedule — bullet
// ---------------------------------------------------------------------------
describe('buildSchedule: bullet', () => {
  it('periods 1-11 have principal = 0 (interest only)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      structure: 'bullet',
    })
    for (let i = 0; i < 11; i++) {
      expect(schedule[i].principal).toBeCloseTo(0, 8)
    }
  })

  it('final period includes full principal repayment', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      structure: 'bullet',
    })
    expect(Math.abs(schedule[11].principal - 100000)).toBeLessThanOrEqual(0.01)
  })

  it('final balance = 0', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      structure: 'bullet',
    })
    expect(schedule[11].balance).toBeCloseTo(0, 8)
  })

  it('returns 12 rows', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      structure: 'bullet',
    })
    expect(schedule).toHaveLength(12)
  })
})

// ---------------------------------------------------------------------------
// buildSchedule — balloon
// ---------------------------------------------------------------------------
describe('buildSchedule: balloon', () => {
  it('final period includes 30000 balloon lump (100k, 30% balloonPct)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      balloonPct: 30,
    })
    const lastRow = schedule[11]
    // final payment must be noticeably larger than the regular amortising payment
    // (at minimum it contains the 30000 balloon)
    expect(lastRow.payment).toBeGreaterThan(30000)
  })

  it('final balance ≤ 0.01 (loan fully closed)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      balloonPct: 30,
    })
    expect(schedule[11].balance).toBeLessThanOrEqual(0.01)
  })

  it('sum of principals ≈ 100000 (±0.01)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      balloonPct: 30,
    })
    const principalSum = schedule.reduce((s, row) => s + row.principal, 0)
    expect(Math.abs(principalSum - 100000)).toBeLessThanOrEqual(0.01)
  })

  it('returns 12 rows', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
      balloonPct: 30,
    })
    expect(schedule).toHaveLength(12)
  })
})

// ---------------------------------------------------------------------------
// totals
// ---------------------------------------------------------------------------
describe('totals', () => {
  it('totalPrincipal ≈ original principal (±0.01)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { totalPrincipal } = totals(schedule)
    expect(Math.abs(totalPrincipal - 100000)).toBeLessThanOrEqual(0.01)
  })

  it('totalPaid = totalInterest + totalPrincipal (±0.01)', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { totalPaid, totalInterest, totalPrincipal } = totals(schedule)
    expect(Math.abs(totalPaid - totalInterest - totalPrincipal)).toBeLessThanOrEqual(0.01)
  })

  it('totalInterest > 0 for a non-zero-rate loan', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { totalInterest } = totals(schedule)
    expect(totalInterest).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// dscr
// ---------------------------------------------------------------------------
describe('dscr', () => {
  it('NOI 12000 vs 100k/12%/12mo monthly → minDscr ≈ 1.35', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { minDscr } = dscr({ netOperatingIncomePerPeriod: 12000, schedule })
    expect(Math.abs(minDscr - 1.35)).toBeLessThan(0.05)
  })

  it('band is "adequate" for DSCR ≈ 1.35', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { band } = dscr({ netOperatingIncomePerPeriod: 12000, schedule })
    expect(band).toBe('adequate')
  })

  it('band is "strong" when NOI is very large', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { band } = dscr({ netOperatingIncomePerPeriod: 20000, schedule })
    expect(band).toBe('strong')
  })

  it('band is "insufficient" when NOI < payment', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { band } = dscr({ netOperatingIncomePerPeriod: 5000, schedule })
    expect(band).toBe('insufficient')
  })

  it('avgDscr is defined and positive', () => {
    const schedule = buildSchedule({
      principal: 100000,
      annualRatePct: 12,
      termMonths: 12,
      frequency: 'monthly',
    })
    const { avgDscr } = dscr({ netOperatingIncomePerPeriod: 12000, schedule })
    expect(avgDscr).toBeGreaterThan(0)
  })
})
