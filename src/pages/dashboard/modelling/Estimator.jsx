import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { buildSchedule, totals } from '@/lib/amortisation'
import ScheduleTable from './ScheduleTable'
import styles from './Modelling.module.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const fmtCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Periods per year by frequency name. */
const PERIODS_PER_YEAR = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
}

/** All candidate term-month options. */
const ALL_TERM_OPTIONS = [6, 12, 24, 36, 48, 60, 84, 120]

/**
 * Filter term options so that termMonths produces a whole number of periods
 * for the selected frequency.
 */
function validTermOptions(frequency) {
  const ppy = PERIODS_PER_YEAR[frequency]
  return ALL_TERM_OPTIONS.filter(t => ((t / 12) * ppy) % 1 === 0)
}

/** Resolve CSS custom property values for recharts (which cannot read CSS vars). */
function resolveChartColors() {
  const css = getComputedStyle(document.documentElement)
  return {
    gold: css.getPropertyValue('--color-gold').trim(),
    goldSoft: css.getPropertyValue('--color-gold-soft').trim(),
    border: css.getPropertyValue('--color-border').trim(),
    muted: css.getPropertyValue('--color-muted').trim(),
    navy: css.getPropertyValue('--color-navy').trim(),
  }
}

// ---------------------------------------------------------------------------
// Estimator
// ---------------------------------------------------------------------------

/**
 * Estimator
 *
 * Accepts `terms` and `onTermsChange` from the parent Modelling page so that
 * sibling tabs (e.g. DSCR in Task 6) can consume the same scenario state.
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
 *   onTermsChange: (patch: Partial<typeof terms>) => void,
 * }} props
 */
export default function Estimator({ terms, onTermsChange }) {
  const [colors, setColors] = useState(null)

  // Resolve CSS token hex values once on mount (recharts cannot read CSS vars).
  useEffect(() => {
    setColors(resolveChartColors())
  }, [])

  // Compute valid term options for current frequency; clamp if needed.
  const termOptions = useMemo(() => validTermOptions(terms.frequency), [terms.frequency])

  // If the current termMonths is not valid for this frequency, auto-correct.
  useEffect(() => {
    if (!termOptions.includes(terms.termMonths)) {
      const nearest = termOptions.reduce((prev, curr) =>
        Math.abs(curr - terms.termMonths) < Math.abs(prev - terms.termMonths) ? curr : prev
      )
      onTermsChange({ termMonths: nearest })
    }
  }, [terms.frequency, terms.termMonths, termOptions, onTermsChange])

  // Build the schedule on every terms change.
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

  const { totalPaid, totalInterest } = useMemo(() => totals(schedule), [schedule])

  // Recharts data: shorten x-axis labels for large schedules.
  const chartData = useMemo(
    () =>
      schedule.map(row => ({
        period: row.period,
        balance: Math.max(0, row.balance),
        interest: row.interest,
        principal: row.principal,
      })),
    [schedule]
  )

  // Periodic payment from first non-grace period (or first period for bullet).
  const periodicPayment = schedule.length > 0 ? schedule[terms.graceMonths > 0 ? Math.min(terms.graceMonths, schedule.length - 1) : 0].payment : 0

  function handle(key, value) {
    onTermsChange({ [key]: value })
  }

  const c = colors ?? { gold: '#CBA135', goldSoft: '#E2C572', border: '#2A3654', muted: '#9FA9BD', navy: '#0B1220' }

  const tooltipStyle = {
    backgroundColor: c.navy,
    border: `1px solid ${c.border}`,
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: '#F4F1E8',
  }

  return (
    <div className={styles.estimator}>
      {/* ── Inputs ── */}
      <div className={styles.inputPanel}>
        <h3 className={styles.inputPanelTitle}>Scenario parameters</h3>
        <div className={styles.inputGrid}>
          {/* Amount */}
          <div className={styles.field}>
            <label className={styles.label}>Financing amount (USD)</label>
            <input
              className={styles.input}
              type="number"
              min={1000}
              step={1000}
              value={terms.amount}
              onChange={e => handle('amount', Math.max(0, Number(e.target.value)))}
            />
          </div>

          {/* Annual rate */}
          <div className={styles.field}>
            <label className={styles.label}>Annual rate (%)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={terms.annualRatePct}
              onChange={e => handle('annualRatePct', Math.max(0, Number(e.target.value)))}
            />
          </div>

          {/* Term */}
          <div className={styles.field}>
            <label className={styles.label}>Term (months)</label>
            <select
              className={styles.select}
              value={terms.termMonths}
              onChange={e => handle('termMonths', Number(e.target.value))}
            >
              {termOptions.map(t => (
                <option key={t} value={t}>{t} months</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div className={styles.field}>
            <label className={styles.label}>Payment frequency</label>
            <select
              className={styles.select}
              value={terms.frequency}
              onChange={e => handle('frequency', e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semiannual">Semi-annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          {/* Grace months */}
          <div className={styles.field}>
            <label className={styles.label}>Grace period (months)</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              max={24}
              step={1}
              value={terms.graceMonths}
              onChange={e =>
                handle('graceMonths', Math.min(24, Math.max(0, Number(e.target.value))))
              }
            />
          </div>

          {/* Structure */}
          <div className={styles.field}>
            <label className={styles.label}>Structure</label>
            <select
              className={styles.select}
              value={terms.structure}
              onChange={e => handle('structure', e.target.value)}
            >
              <option value="amortising">Amortising</option>
              <option value="bullet">Bullet</option>
              <option value="balloon">Balloon</option>
            </select>
          </div>

          {/* Balloon % — only when structure === balloon */}
          {terms.structure === 'balloon' && (
            <div className={styles.field}>
              <label className={styles.label}>Balloon (%)</label>
              <input
                className={styles.input}
                type="number"
                min={10}
                max={50}
                step={5}
                value={terms.balloonPct}
                onChange={e =>
                  handle('balloonPct', Math.min(50, Math.max(10, Number(e.target.value))))
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Metric tiles ── */}
      <div className={styles.metricsRow}>
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Periodic payment</span>
          <span className={styles.metricValue}>{fmtCurrency.format(periodicPayment)}</span>
          <span className={styles.metricSub}>per {terms.frequency.replace('semiannual', 'semi-annual')} period</span>
        </div>
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Total interest</span>
          <span className={styles.metricValue}>{fmtCurrency.format(totalInterest)}</span>
          <span className={styles.metricSub}>over {schedule.length} periods</span>
        </div>
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Total cost of financing</span>
          <span className={styles.metricValue}>{fmtCurrency.format(totalPaid)}</span>
          <span className={styles.metricSub}>principal + interest</span>
        </div>
      </div>

      {/* ── Charts ── */}
      {chartData.length > 0 && (
        <div className={styles.chartsGrid}>
          {/* Area chart: outstanding balance */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Outstanding balance</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.goldSoft} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={c.goldSoft} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: c.muted, fontSize: 11 }}
                  axisLine={{ stroke: c.border }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => fmtCompact.format(v)}
                  tick={{ fill: c.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={v => [fmtCurrency.format(v), 'Balance']}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: c.muted }}
                  cursor={{ stroke: c.goldSoft, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={c.goldSoft}
                  strokeWidth={2}
                  fill="url(#balanceGrad)"
                  dot={false}
                  name="Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked bar chart: interest vs principal */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Interest vs principal per period</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: c.muted, fontSize: 11 }}
                  axisLine={{ stroke: c.border }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => fmtCompact.format(v)}
                  tick={{ fill: c.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(v, name) => [fmtCurrency.format(v), name]}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: c.muted }}
                  cursor={{ fill: 'rgba(203,161,53,0.06)' }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12, color: c.muted }}
                />
                <Bar dataKey="interest" stackId="a" fill={c.border} name="Interest" />
                <Bar dataKey="principal" stackId="a" fill={c.gold} name="Principal" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Schedule table ── */}
      <ScheduleTable schedule={schedule} />
    </div>
  )
}
