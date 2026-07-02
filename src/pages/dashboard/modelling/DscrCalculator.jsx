import { useMemo, useState } from 'react'
import { buildSchedule, dscr } from '@/lib/amortisation'
import styles from './Modelling.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Periods per year by frequency name — mirrors the amortisation engine. */
const PERIODS_PER_YEAR = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
}

const BAND_LABELS = {
  strong: 'Strong',
  adequate: 'Adequate',
  thin: 'Thin',
  insufficient: 'Insufficient',
}

const BAND_MESSAGES = {
  strong: 'Projected income comfortably covers debt service at these terms.',
  adequate: 'Projected income covers debt service with a reasonable buffer.',
  thin:
    'Projected income covers debt service with little room for variance. Consider a longer term or lower amount.',
  insufficient:
    'Projected income does not cover debt service at these terms. Consider a longer term, lower amount, or a grace period.',
}

const BAND_STYLE = {
  strong: styles.bandStrong,
  adequate: styles.bandAdequate,
  thin: styles.bandThin,
  insufficient: styles.bandInsufficient,
}

// ---------------------------------------------------------------------------
// DscrCalculator
// ---------------------------------------------------------------------------

/**
 * DscrCalculator
 *
 * Computes the Debt Service Coverage Ratio against the current Estimator terms.
 * Accepts net operating income as a periodic or annual figure and converts as needed.
 *
 * @param {{
 *   terms: {
 *     amount: number,
 *     annualRatePct: number,
 *     termMonths: number,
 *     frequency: string,
 *     graceMonths: number,
 *     structure: string,
 *     balloonPct: number,
 *   },
 * }} props
 */
export default function DscrCalculator({ terms }) {
  const [noi, setNoi] = useState('')
  const [incomeFreq, setIncomeFreq] = useState('per-period')

  const schedule = useMemo(() => {
    try {
      return buildSchedule({
        principal: terms.amount,
        annualRatePct: terms.annualRatePct,
        termMonths: terms.termMonths,
        frequency: terms.frequency,
        graceMonths: terms.graceMonths,
        structure: terms.structure,
        balloonPct: terms.structure === 'balloon' ? terms.balloonPct : 0,
      })
    } catch {
      return []
    }
  }, [terms])

  const result = useMemo(() => {
    const noiNum = parseFloat(noi)
    if (!noiNum || noiNum <= 0 || schedule.length === 0) return null

    const ppy = PERIODS_PER_YEAR[terms.frequency] ?? 12
    const noiPerPeriod = incomeFreq === 'per-year' ? noiNum / ppy : noiNum

    try {
      return dscr({ netOperatingIncomePerPeriod: noiPerPeriod, schedule })
    } catch {
      return null
    }
  }, [noi, incomeFreq, schedule, terms.frequency])

  return (
    <div className={styles.dscrWrapper}>
      {/* ── Inputs ── */}
      <div className={styles.inputPanel}>
        <h3 className={styles.inputPanelTitle}>Income parameters</h3>
        <p className={styles.dscrNote}>
          Based on the current Estimator terms. Adjust those to see how coverage changes.
        </p>
        <div className={styles.inputGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Net operating income</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              step={1000}
              placeholder="0"
              value={noi}
              onChange={e => setNoi(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Income frequency</label>
            <select
              className={styles.select}
              value={incomeFreq}
              onChange={e => setIncomeFreq(e.target.value)}
            >
              <option value="per-period">Per repayment period</option>
              <option value="per-year">Per year (divided across periods)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {result ? (
        <div className={styles.dscrResults}>
          <div className={styles.metricsRow}>
            <div className={styles.metricTile}>
              <span className={styles.metricLabel}>Minimum DSCR</span>
              <span className={styles.metricValue}>{result.minDscr.toFixed(2)}x</span>
              <span className={styles.metricSub}>worst-case period</span>
            </div>
            <div className={styles.metricTile}>
              <span className={styles.metricLabel}>Average DSCR</span>
              <span className={styles.metricValue}>{result.avgDscr.toFixed(2)}x</span>
              <span className={styles.metricSub}>across all periods</span>
            </div>
            <div className={styles.metricTile}>
              <span className={styles.metricLabel}>Coverage band</span>
              <span className={`${styles.bandChip} ${BAND_STYLE[result.band]}`}>
                {BAND_LABELS[result.band]}
              </span>
              <span className={styles.metricSub}>&nbsp;</span>
            </div>
          </div>
          <div className={styles.dscrMessageCard}>
            <p className={styles.dscrMessage}>{BAND_MESSAGES[result.band]}</p>
          </div>
        </div>
      ) : (
        <div className={styles.dscrPrompt}>
          <p className={styles.dscrPromptText}>
            Enter your net operating income above to see your debt service coverage ratio.
          </p>
        </div>
      )}
    </div>
  )
}
