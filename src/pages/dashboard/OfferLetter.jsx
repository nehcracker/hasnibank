import './print.css'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { buildSchedule } from '@/lib/amortisation'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { financingTracks } from '@/data/financingData'
import LogoMark from '@/components/icons/LogoMark'
import styles from './ExportSummary.module.css'

const TRACK_LABELS = Object.fromEntries(financingTracks.map((t) => [t.id, t.title]))

const FREQUENCY_LABELS = {
  monthly: 'Monthly', quarterly: 'Quarterly',
  semiannual: 'Semi-annual', annual: 'Annual',
}

const STRUCTURE_LABELS = {
  amortising: 'Amortising', bullet: 'Bullet', balloon: 'Balloon',
}

const FEE_TIMING_LABELS = {
  on_signing: 'on signing', on_delivery: 'on delivery',
  on_disbursement: 'on disbursement', success_pct: 'success based, % of amount',
}

const PER_PERIOD_LABELS = {
  monthly: 'month', quarterly: 'quarter',
  semiannual: 'six months', annual: 'year',
}

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function longDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

/**
 * Derive the borrower-facing instalment figures from offer terms, reusing
 * the same amortisation engine the staff builder previews with.
 */
export function instalmentDetails(terms) {
  const principal = Number(terms.principal)
  const annualRatePct = Number(terms.annual_rate_pct)
  const termMonths = Number(terms.term_months)
  if (!principal || !annualRatePct || !termMonths) return null

  let schedule
  try {
    schedule = buildSchedule({
      principal,
      annualRatePct,
      termMonths,
      frequency: terms.repayment_frequency,
      graceMonths: Number(terms.grace_months) || 0,
      structure: terms.structure,
      balloonPct: Number(terms.balloon_pct) || 0,
    })
  } catch {
    return null
  }

  if (terms.structure === 'bullet') {
    return { kind: 'bullet', instalment: schedule[0].payment, principalAtMaturity: principal }
  }

  const graceMonths = Number(terms.grace_months) || 0
  const graceRow = graceMonths > 0 ? schedule.find((row) => row.principal === 0) : null
  const repaymentRow = schedule.find((row) => row.principal > 0) ?? schedule[0]
  const balloonAmount = Number(terms.balloon_pct) > 0
    ? (Number(terms.balloon_pct) / 100) * principal
    : 0

  return {
    kind: balloonAmount > 0 ? 'balloon' : 'amortising',
    instalment: repaymentRow.payment,
    graceInstalment: graceRow?.payment ?? null,
    graceMonths,
    balloonAmount,
  }
}

/** Borrower-facing instalment sentence, or null if terms are incomplete. */
export function instalmentLine(terms) {
  const details = instalmentDetails(terms)
  if (!details) return null
  const currency = terms.currency
  const per = PER_PERIOD_LABELS[terms.repayment_frequency] ?? terms.repayment_frequency

  if (details.kind === 'bullet') {
    return `Interest-only instalment: ${money(details.instalment, currency)} per ${per}. Principal of ${money(details.principalAtMaturity, currency)} is due in full at maturity.`
  }

  let line = `Instalment amount: ${money(details.instalment, currency)} per ${per}.`
  if (details.graceInstalment != null) {
    line += ` Interest-only during the first ${details.graceMonths} months: ${money(details.graceInstalment, currency)} per ${per}.`
  }
  if (details.kind === 'balloon') {
    line += ` The final payment includes a balloon of ${money(details.balloonAmount, currency)}.`
  }
  return line
}

/** Plain-sentence default-charges disclosure, or null if none are set. */
export function describeDefaultCharges(defaultCharges, currency) {
  if (!defaultCharges) return null
  const { late_fee: lateFee, penalty_rate_pct: penaltyRatePct, grace_days: graceDays } = defaultCharges
  const hasFee = Boolean(lateFee?.value)
  const hasPenalty = Boolean(penaltyRatePct)
  if (!hasFee && !hasPenalty) return null

  const feeText = hasFee
    ? (lateFee.type === 'percent_of_instalment'
        ? `a late fee of ${lateFee.value}% of the missed instalment`
        : `a late fee of ${money(lateFee.value, currency)}`)
    : null
  const penaltyText = hasPenalty
    ? `a penalty rate of ${penaltyRatePct}% per annum on the overdue balance`
    : null

  const charges = [feeText, penaltyText].filter(Boolean).join(' and ')
  return `Any payment more than ${graceDays || 0} days overdue is subject to ${charges}.`
}

/** Plain-sentence prepayment disclosure, or null if not set. */
export function describePrepayment(prepayment) {
  if (!prepayment) return null
  if (!prepayment.allowed) return 'Early settlement is not permitted under this offer.'
  const penalty = Number(prepayment.penalty_pct_of_remaining_principal) || 0
  if (penalty > 0) {
    return `Early settlement of this facility is permitted, subject to a penalty of ${penalty}% of the remaining principal.`
  }
  return 'Early settlement of this facility is permitted with no penalty.'
}

/**
 * Print-styled financing offer letter for the borrower's active offer.
 * Reuses the ExportSummary document styles and print.css data attributes.
 */
export default function OfferLetter() {
  const { profile } = useAuth()
  const { application, loading: appLoading } = useApplication()
  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!application?.id) {
      if (!appLoading) setLoading(false)
      return
    }
    let cancelled = false
    supabase
      .from('offers')
      .select('*')
      .eq('application_id', application.id)
      .in('status', ['issued', 'accepted'])
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('[OfferLetter] offers unavailable:', error.message)
        } else {
          setOffer(data)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [application?.id, appLoading])

  if (loading || appLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading your offer...</p>
      </div>
    )
  }

  if (!application || !offer) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1 className={styles.emptyHeading}>No offer on file</h1>
          <p className={styles.emptyBody}>
            Your offer letter appears here once the team issues terms for your
            financing application.
          </p>
          <Link to="/dashboard/application" className={styles.emptyLink}>
            Back to your application
          </Link>
        </div>
      </div>
    )
  }

  const terms = offer.terms ?? {}
  const fees = terms.fees ?? []
  const conditions = terms.conditions_precedent ?? []
  const covenants = terms.covenants ?? []
  const generatedDate = longDate(new Date().toISOString())

  const termRows = [
    ['Principal', money(Number(terms.principal ?? 0), terms.currency)],
    ['Annual rate', `${terms.annual_rate_pct}%`],
    ['Term', `${terms.term_months} months`],
    [
      'Repayment frequency',
      FREQUENCY_LABELS[terms.repayment_frequency] ?? terms.repayment_frequency,
    ],
    ['Structure', STRUCTURE_LABELS[terms.structure] ?? terms.structure],
  ]
  if (Number(terms.grace_months) > 0) {
    termRows.push(['Grace period', `${terms.grace_months} months`])
  }
  if (Number(terms.balloon_pct) > 0) {
    termRows.push(['Balloon', `${terms.balloon_pct}% of principal`])
  }
  if (offer.valid_until) {
    termRows.push(['Valid until', longDate(offer.valid_until)])
  }

  return (
    <div className={styles.page}>
      <div className={styles.controls} data-print-hide>
        <button className={styles.printBtn} onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className={styles.document} data-print-document>
        <div className={styles.brandHeader}>
          <div className={styles.brandRow}>
            <LogoMark size={40} className={styles.brandMark} />
            <div>
              <p className={`${styles.wordmark} hasni-wordmark`}>Hasni Bank</p>
              <p className={styles.tagline}>Global financing marketplace</p>
            </div>
          </div>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Client ID</span>
            <span className={styles.metaValue}>{profile?.client_ref ?? 'N/A'}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Offer version</span>
            <span className={styles.metaValue}>{offer.version}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Generated</span>
            <span className={styles.metaValue}>{generatedDate}</span>
          </span>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Financing offer</h2>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Applicant</span>
            <span className={styles.fieldValue}>
              {profile?.full_name}
              {profile?.company_name ? `, ${profile.company_name}` : ''}
            </span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Financing track</span>
            <span className={styles.fieldValue}>
              {TRACK_LABELS[application.track] ?? application.track}
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Terms</h2>
          {termRows.map(([label, value]) => (
            <div key={label} className={styles.fieldRow}>
              <span className={styles.fieldLabel}>{label}</span>
              <span className={styles.fieldValue}>{value}</span>
            </div>
          ))}
          {instalmentLine(terms) && (
            <p className={styles.fieldValue} style={{ marginTop: 'var(--space-3)' }}>
              {instalmentLine(terms)}
            </p>
          )}
        </section>

        {fees.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Fees</h2>
            {fees.map((fee, i) => (
              <div key={i} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{fee.label}</span>
                <span className={styles.fieldValue}>
                  {money(Number(fee.amount ?? 0), terms.currency)}
                  {fee.timing ? ` (${FEE_TIMING_LABELS[fee.timing] ?? fee.timing})` : ''}
                </span>
              </div>
            ))}
          </section>
        )}

        {conditions.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Conditions precedent</h2>
            {conditions.map((c, i) => (
              <div key={i} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{i + 1}.</span>
                <span className={styles.fieldValue}>{c}</span>
              </div>
            ))}
          </section>
        )}

        {covenants.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Covenants</h2>
            {covenants.map((c, i) => (
              <div key={i} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{i + 1}.</span>
                <span className={styles.fieldValue}>{c}</span>
              </div>
            ))}
          </section>
        )}

        {describeDefaultCharges(terms.default_charges, terms.currency) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Default charges</h2>
            <p className={styles.fieldValue}>
              {describeDefaultCharges(terms.default_charges, terms.currency)}
            </p>
          </section>
        )}

        {describePrepayment(terms.prepayment) && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Prepayment</h2>
            <p className={styles.fieldValue}>{describePrepayment(terms.prepayment)}</p>
          </section>
        )}

        {terms.security_description && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Security and collateral</h2>
            <p className={styles.fieldValue}>{terms.security_description}</p>
          </section>
        )}

        {terms.insurance_requirements && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Insurance requirements</h2>
            <p className={styles.fieldValue}>{terms.insurance_requirements}</p>
          </section>
        )}

        {offer.status === 'accepted' && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Acceptance</h2>
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Accepted on</span>
              <span className={styles.fieldValue}>{longDate(offer.accepted_at)}</span>
            </div>
            {offer.acceptance_meta?.declaration && (
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Declaration</span>
                <span className={styles.fieldValue}>
                  {offer.acceptance_meta.declaration}
                </span>
              </div>
            )}
          </section>
        )}

        <p className={styles.footer}>
          Generated from the Hasni Bank client portal. Financing is arranged
          through the Hasni Bank funder network; this letter does not constitute
          a direct lending commitment by Hasni Bank. Reference your Client ID in
          all correspondence.
        </p>
      </div>
    </div>
  )
}
