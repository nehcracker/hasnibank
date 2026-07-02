/**
 * Amortisation engine — pure JS, no React, no side-effects.
 *
 * All internal arithmetic is unrounded; callers that render money should round
 * at the display layer.  Test assertions use ±0.01 tolerance.
 */

/** @type {Record<string, number>} */
const PERIODS_PER_YEAR = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
}

// ---------------------------------------------------------------------------
// paymentAmount
// ---------------------------------------------------------------------------

/**
 * Return the fixed periodic payment for a standard annuity.
 *
 * @param {{ principal: number, annualRatePct: number, termMonths: number, frequency: string }} opts
 * @returns {number}
 */
export function paymentAmount({ principal, annualRatePct, termMonths, frequency }) {
  const periodsPerYear = PERIODS_PER_YEAR[frequency]
  const n = (termMonths / 12) * periodsPerYear   // total periods
  const r = annualRatePct / 100 / periodsPerYear // periodic rate

  if (r === 0) return principal / n

  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

// ---------------------------------------------------------------------------
// buildSchedule
// ---------------------------------------------------------------------------

/**
 * Build a full amortisation schedule.
 *
 * Structures:
 *   'amortising' — standard reducing-balance (default)
 *   'bullet'     — interest-only every period; final period repays full principal
 *   Use balloonPct > 0 on an amortising loan for a balloon structure.
 *
 * Grace:
 *   graceMonths periods of interest-only before amortisation begins.
 *   Amortisation then runs over the remaining (totalPeriods - gracePeriods) periods.
 *
 * Balloon:
 *   balloonPct % of ORIGINAL principal is withheld as a lump sum to the final period.
 *   The remainder ((1 - balloonPct/100) * principal) amortises normally over the full term.
 *   Final payment = last amortising instalment + balloon lump.
 *
 * @param {{
 *   principal: number,
 *   annualRatePct: number,
 *   termMonths: number,
 *   frequency: string,
 *   graceMonths?: number,
 *   structure?: 'amortising' | 'bullet',
 *   balloonPct?: number
 * }} opts
 * @returns {{ period: number, payment: number, interest: number, principal: number, balance: number }[]}
 */
export function buildSchedule({
  principal,
  annualRatePct,
  termMonths,
  frequency,
  graceMonths = 0,
  structure = 'amortising',
  balloonPct = 0,
}) {
  const periodsPerYear = PERIODS_PER_YEAR[frequency]
  const totalPeriods = (termMonths / 12) * periodsPerYear
  const r = annualRatePct / 100 / periodsPerYear

  // ── Bullet ────────────────────────────────────────────────────────────────
  if (structure === 'bullet') {
    const schedule = []
    let balance = principal

    for (let period = 1; period <= totalPeriods; period++) {
      const interest = balance * r

      if (period < totalPeriods) {
        // Interest-only; balance unchanged (principal = 0)
        schedule.push({ period, payment: interest, interest, principal: 0, balance })
      } else {
        // Final period: repay full remaining principal
        const payment = interest + balance
        schedule.push({ period, payment, interest, principal: balance, balance: 0 })
      }
    }

    return schedule
  }

  // ── Amortising (with optional grace and/or balloon) ────────────────────────
  const balloonAmount = (balloonPct / 100) * principal
  const amortisingPrincipal = principal - balloonAmount

  // Convert graceMonths → grace periods (same frequency basis)
  const gracePeriods = Math.round((graceMonths / 12) * periodsPerYear)
  const amortisingPeriods = totalPeriods - gracePeriods

  // Regular payment is computed on the amortising portion only,
  // over the amortising sub-term.
  const amortisingTermMonths = (amortisingPeriods / periodsPerYear) * 12
  const regularPayment = paymentAmount({
    principal: amortisingPrincipal,
    annualRatePct,
    termMonths: amortisingTermMonths,
    frequency,
  })

  const schedule = []
  let balance = amortisingPrincipal

  for (let period = 1; period <= totalPeriods; period++) {
    const interest = balance * r

    if (period <= gracePeriods) {
      // Interest-only grace period; balance unchanged
      schedule.push({ period, payment: interest, interest, principal: 0, balance })
    } else if (period < totalPeriods) {
      // Standard amortising period
      const principalComponent = regularPayment - interest
      balance -= principalComponent
      schedule.push({
        period,
        payment: regularPayment,
        interest,
        principal: principalComponent,
        balance,
      })
    } else {
      // Final period: close out remaining amortising balance + balloon lump
      const principalComponent = balance
      const finalPayment = interest + principalComponent + balloonAmount
      schedule.push({
        period,
        payment: finalPayment,
        interest,
        principal: principalComponent + balloonAmount,
        balance: 0,
      })
    }
  }

  return schedule
}

// ---------------------------------------------------------------------------
// totals
// ---------------------------------------------------------------------------

/**
 * Aggregate payment, interest and principal totals from a schedule.
 *
 * @param {ReturnType<typeof buildSchedule>} schedule
 * @returns {{ totalPaid: number, totalInterest: number, totalPrincipal: number }}
 */
export function totals(schedule) {
  let totalPaid = 0
  let totalInterest = 0
  let totalPrincipal = 0

  for (const row of schedule) {
    totalPaid += row.payment
    totalInterest += row.interest
    totalPrincipal += row.principal
  }

  return { totalPaid, totalInterest, totalPrincipal }
}

// ---------------------------------------------------------------------------
// dscr
// ---------------------------------------------------------------------------

/**
 * Compute Debt Service Coverage Ratio metrics against a schedule.
 *
 * @param {{ netOperatingIncomePerPeriod: number, schedule: ReturnType<typeof buildSchedule> }} opts
 * @returns {{ minDscr: number, avgDscr: number, band: 'strong' | 'adequate' | 'thin' | 'insufficient' }}
 */
export function dscr({ netOperatingIncomePerPeriod, schedule }) {
  const dscrValues = schedule.map(row => netOperatingIncomePerPeriod / row.payment)

  const minDscr = Math.min(...dscrValues)
  const avgDscr = dscrValues.reduce((s, v) => s + v, 0) / dscrValues.length

  let band
  if (minDscr >= 1.5) band = 'strong'
  else if (minDscr >= 1.25) band = 'adequate'
  else if (minDscr >= 1.0) band = 'thin'
  else band = 'insufficient'

  return { minDscr, avgDscr, band }
}
