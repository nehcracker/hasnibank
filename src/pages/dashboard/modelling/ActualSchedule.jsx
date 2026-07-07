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
import { supabase } from '@/lib/supabase'
import { buildSchedule, totals } from '@/lib/amortisation'
import ScheduleTable from './ScheduleTable'
import styles from './Modelling.module.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve CSS custom property hex values for recharts (which cannot read CSS vars). */
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

/**
 * Map offer_terms DB column names to amortisation engine parameter names.
 * @param {object} ot
 */
function mapOfferTerms(ot) {
  return {
    principal: Number(ot.principal),
    annualRatePct: Number(ot.annual_rate_pct),
    termMonths: Number(ot.term_months),
    frequency: ot.repayment_frequency ?? 'monthly',
    graceMonths: Number(ot.grace_months ?? 0),
    structure: ot.structure ?? 'amortising',
    balloonPct: Number(ot.balloon_pct ?? 0),
  }
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

// ---------------------------------------------------------------------------
// ActualSchedule
// ---------------------------------------------------------------------------

/**
 * ActualSchedule
 *
 * Displays the repayment schedule derived from the application's issued offer terms.
 * All term inputs are read-only.
 *
 * If no offer has been issued, renders an empty state with a prompt to use the Estimator.
 *
 * @param {{
 *   application: object | null,
 *   onGoToEstimator: () => void,
 * }} props
 */
export default function ActualSchedule({ application, onGoToEstimator }) {
  const [colors, setColors] = useState(null)
  const [startDate, setStartDate] = useState(null)

  // Resolve CSS token hex values once on mount.
  useEffect(() => {
    setColors(resolveChartColors())
  }, [])

  // The first disbursed tranche anchors the dated schedule (Phase C).
  useEffect(() => {
    if (!application?.id) return
    let cancelled = false
    supabase
      .from('disbursements')
      .select('actual_date')
      .eq('application_id', application.id)
      .eq('status', 'disbursed')
      .not('actual_date', 'is', null)
      .order('tranche_no', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Table may not exist yet in this environment — undated schedule
          console.warn('[ActualSchedule] disbursements unavailable:', error.message)
        } else if (data?.actual_date) {
          setStartDate(data.actual_date)
        }
      })
    return () => { cancelled = true }
  }, [application?.id])

  const offerTerms = application?.offer_terms
  const currency = offerTerms?.currency ?? 'USD'

  const fmtCurrency = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [currency]
  )

  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [currency]
  )

  const engineParams = useMemo(
    () => (offerTerms ? mapOfferTerms(offerTerms) : null),
    [offerTerms]
  )

  const schedule = useMemo(() => {
    if (!engineParams) return []
    try {
      return buildSchedule({
        ...engineParams,
        balloonPct: engineParams.structure === 'balloon' ? engineParams.balloonPct : 0,
        startDate,
      })
    } catch {
      return []
    }
  }, [engineParams, startDate])

  const { totalPaid, totalInterest } = useMemo(() => totals(schedule), [schedule])

  // Periodic payment: first non-grace period (mirrors Estimator logic).
  const periodicPayment =
    schedule.length > 0
      ? schedule[
          engineParams?.graceMonths > 0
            ? Math.min(engineParams.graceMonths, schedule.length - 1)
            : 0
        ].payment
      : 0

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

  const c = colors ?? {
    gold: '#CBA135',
    goldSoft: '#E2C572',
    border: '#2A3654',
    muted: '#9FA9BD',
    navy: '#0B1220',
  }

  const tooltipStyle = {
    backgroundColor: c.navy,
    border: `1px solid ${c.border}`,
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    color: '#F4F1E8',
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!offerTerms) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyStateText}>
          Your repayment schedule appears here once an offer is issued.
        </p>
        <button className={styles.emptyStateBtn} onClick={onGoToEstimator}>
          Use the Estimator to model scenarios
        </button>
      </div>
    )
  }

  // ── Schedule view ──────────────────────────────────────────────────────────

  const freqLabel = FREQUENCY_LABELS[engineParams.frequency] ?? engineParams.frequency
  const structLabel = STRUCTURE_LABELS[engineParams.structure] ?? engineParams.structure

  return (
    <div className={styles.actualSchedule}>
      {/* Offer banner */}
      <div className={styles.offerBanner}>
        <span className={styles.offerBannerCheck} aria-hidden="true">&#10003;</span>
        Terms from your issued offer
      </div>

      {/* Read-only terms display */}
      <div className={styles.inputPanel}>
        <h3 className={styles.inputPanelTitle}>Offer terms</h3>
        <div className={styles.inputGrid}>
          <div className={styles.field}>
            <span className={styles.label}>Financing amount</span>
            <span className={styles.termValue}>{fmtCurrency.format(engineParams.principal)}</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Annual rate</span>
            <span className={styles.termValue}>{engineParams.annualRatePct}%</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Term</span>
            <span className={styles.termValue}>{engineParams.termMonths} months</span>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Payment frequency</span>
            <span className={styles.termValue}>{freqLabel}</span>
          </div>
          {engineParams.graceMonths > 0 && (
            <div className={styles.field}>
              <span className={styles.label}>Grace period</span>
              <span className={styles.termValue}>{engineParams.graceMonths} months</span>
            </div>
          )}
          <div className={styles.field}>
            <span className={styles.label}>Structure</span>
            <span className={styles.termValue}>{structLabel}</span>
          </div>
          {engineParams.structure === 'balloon' && (
            <div className={styles.field}>
              <span className={styles.label}>Balloon</span>
              <span className={styles.termValue}>{engineParams.balloonPct}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Metric tiles */}
      <div className={styles.metricsRow}>
        <div className={styles.metricTile}>
          <span className={styles.metricLabel}>Periodic payment</span>
          <span className={styles.metricValue}>{fmtCurrency.format(periodicPayment)}</span>
          <span className={styles.metricSub}>per {freqLabel.toLowerCase()} period</span>
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

      {/* Charts */}
      {chartData.length > 0 && (
        <div className={styles.chartsGrid}>
          {/* Area chart: outstanding balance */}
          <div className={styles.chartCard}>
            <p className={styles.chartTitle}>Outstanding balance</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="actualBalanceGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#actualBalanceGrad)"
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
                  cursor={{ fill: c.gold, fillOpacity: 0.06 }}
                />
                <Legend
                  wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 12, color: c.muted }}
                />
                <Bar dataKey="interest" stackId="a" fill={c.border} name="Interest" />
                <Bar
                  dataKey="principal"
                  stackId="a"
                  fill={c.gold}
                  name="Principal"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Schedule table */}
      <ScheduleTable key={schedule.length} schedule={schedule} currency={currency} />
    </div>
  )
}
