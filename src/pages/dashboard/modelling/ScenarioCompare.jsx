import { useMemo } from 'react'
import { buildSchedule, totals } from '@/lib/amortisation'
import styles from './Modelling.module.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format a signed delta value with an explicit + prefix for positive numbers. */
function fmtDelta(val) {
  const prefix = val > 0 ? '+' : ''
  return prefix + fmt.format(val)
}

const FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Semi-annual',
  annual: 'Annual',
}

const STRUCTURE_LABELS = {
  amortising: 'Amortising',
  bullet: 'Bullet',
  balloon: 'Balloon',
}

/**
 * Compute summary metrics for a scenario's terms.
 * @param {object} terms
 * @returns {{ periodicPayment: number, totalInterest: number, totalPaid: number }}
 */
function computeMetrics(terms) {
  try {
    const schedule = buildSchedule({
      principal: terms.amount,
      annualRatePct: terms.annualRatePct,
      termMonths: terms.termMonths,
      frequency: terms.frequency,
      graceMonths: terms.graceMonths,
      structure: terms.structure,
      balloonPct: terms.structure === 'balloon' ? terms.balloonPct : 0,
    })
    const { totalPaid, totalInterest } = totals(schedule)
    const periodicPayment =
      schedule.length > 0
        ? schedule[terms.graceMonths > 0 ? Math.min(terms.graceMonths, schedule.length - 1) : 0]
            .payment
        : 0
    return { periodicPayment, totalInterest, totalPaid }
  } catch {
    return { periodicPayment: 0, totalInterest: 0, totalPaid: 0 }
  }
}

// ---------------------------------------------------------------------------
// ScenarioCompare
// ---------------------------------------------------------------------------

/**
 * ScenarioCompare
 *
 * Renders up to three saved scenarios side-by-side with delta rows vs Scenario A.
 *
 * @param {{
 *   scenarios: Array<{ name: string, terms: object }>,
 *   onGoToEstimator: () => void,
 * }} props
 */
export default function ScenarioCompare({ scenarios, onGoToEstimator }) {
  const computed = useMemo(
    () => scenarios.map(s => ({ ...s, metrics: computeMetrics(s.terms) })),
    [scenarios]
  )

  // ── Empty state ────────────────────────────────────────────────────────────

  if (scenarios.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateText}>
          Save a scenario from the Estimator to compare terms side by side.
        </p>
        <button className={styles.emptyStateBtn} onClick={onGoToEstimator}>
          Go to Estimator
        </button>
      </div>
    )
  }

  // ── Comparison cards ───────────────────────────────────────────────────────

  const baseMetrics = computed[0].metrics

  return (
    <div className={styles.compareWrapper}>
      <div className={styles.compareCards}>
        {computed.map((s, i) => {
          const { metrics: m, terms: t } = s
          const isBase = i === 0

          const payDelta = m.periodicPayment - baseMetrics.periodicPayment
          const intDelta = m.totalInterest - baseMetrics.totalInterest
          const costDelta = m.totalPaid - baseMetrics.totalPaid

          return (
            <div key={s.name} className={styles.compareCard}>
              {/* Card header */}
              <div className={styles.compareCardHeader}>
                <span className={styles.compareScenarioName}>Scenario {s.name}</span>
                {isBase && <span className={styles.compareBaseBadge}>baseline</span>}
              </div>

              {/* Terms summary */}
              <div className={styles.compareTermsList}>
                <div className={styles.compareTerm}>
                  <span className={styles.compareTermLabel}>Amount</span>
                  <span className={styles.compareTermValue}>{fmt.format(t.amount)}</span>
                </div>
                <div className={styles.compareTerm}>
                  <span className={styles.compareTermLabel}>Annual rate</span>
                  <span className={styles.compareTermValue}>{t.annualRatePct}%</span>
                </div>
                <div className={styles.compareTerm}>
                  <span className={styles.compareTermLabel}>Term</span>
                  <span className={styles.compareTermValue}>{t.termMonths} months</span>
                </div>
                <div className={styles.compareTerm}>
                  <span className={styles.compareTermLabel}>Frequency</span>
                  <span className={styles.compareTermValue}>
                    {FREQUENCY_LABELS[t.frequency] ?? t.frequency}
                  </span>
                </div>
                <div className={styles.compareTerm}>
                  <span className={styles.compareTermLabel}>Structure</span>
                  <span className={styles.compareTermValue}>
                    {STRUCTURE_LABELS[t.structure] ?? t.structure}
                  </span>
                </div>
                {t.graceMonths > 0 && (
                  <div className={styles.compareTerm}>
                    <span className={styles.compareTermLabel}>Grace period</span>
                    <span className={styles.compareTermValue}>{t.graceMonths} months</span>
                  </div>
                )}
              </div>

              <div className={styles.compareDivider} />

              {/* Computed metrics */}
              <div className={styles.compareMetricsList}>
                <div className={styles.compareMetric}>
                  <span className={styles.compareMetricLabel}>Periodic payment</span>
                  <span className={styles.compareMetricValue}>{fmt.format(m.periodicPayment)}</span>
                </div>
                <div className={styles.compareMetric}>
                  <span className={styles.compareMetricLabel}>Total interest</span>
                  <span className={styles.compareMetricValue}>{fmt.format(m.totalInterest)}</span>
                </div>
                <div className={styles.compareMetric}>
                  <span className={styles.compareMetricLabel}>Total cost</span>
                  <span className={styles.compareMetricValue}>{fmt.format(m.totalPaid)}</span>
                </div>
              </div>

              {/* Delta row vs Scenario A (shown on B and C only) */}
              {!isBase && (
                <>
                  <div className={styles.compareDivider} />
                  <p className={styles.compareDeltaHeading}>vs Scenario A</p>
                  <div className={styles.compareMetricsList}>
                    <div className={styles.compareMetric}>
                      <span className={styles.compareMetricLabel}>Payment</span>
                      <span className={payDelta <= 0 ? styles.deltaPositive : styles.deltaNegative}>
                        {fmtDelta(payDelta)}
                      </span>
                    </div>
                    <div className={styles.compareMetric}>
                      <span className={styles.compareMetricLabel}>Interest</span>
                      <span className={intDelta <= 0 ? styles.deltaPositive : styles.deltaNegative}>
                        {fmtDelta(intDelta)}
                      </span>
                    </div>
                    <div className={styles.compareMetric}>
                      <span className={styles.compareMetricLabel}>Total cost</span>
                      <span
                        className={costDelta <= 0 ? styles.deltaPositive : styles.deltaNegative}
                      >
                        {fmtDelta(costDelta)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
