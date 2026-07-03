import './print.css'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import stageMeta from '@/data/stageMeta'
import { financingTracks } from '@/data/financingData'
import styles from './ExportSummary.module.css'

// FIELD_LABELS mirrors src/pages/admin/AdminApplication.jsx.
// If you add or rename a field label there, update this copy too.
const FIELD_LABELS = {
  businessName: 'Business Name',
  businessType: 'Business Type',
  countryOfRegistration: 'Country of Registration',
  annualRevenue: 'Annual Revenue',
  loanPurpose: 'Financing Purpose',
  amountSought: 'Amount Sought',
  collateralAvailable: 'Collateral Available',
  collateralDescription: 'Collateral Description',
  description: 'Description',
  projectName: 'Project Name',
  sector: 'Sector',
  fundingStructure: 'Funding Structure',
  totalProjectValue: 'Total Project Value',
  projectTimeline: 'Project Timeline',
  keySponsors: 'Key Sponsors',
  companyName: 'Company Name',
  tradeType: 'Trade Type',
  counterpartyCountry: 'Counterparty Country',
  transactionValue: 'Transaction Value',
  acquiringCompanyName: 'Acquiring Company',
  targetDescription: 'Target Description',
  dealStructure: 'Deal Structure',
  totalAcquisitionValue: 'Total Acquisition Value',
  expectedClosingTimeline: 'Expected Closing',
}

const TRACK_LABELS = Object.fromEntries(financingTracks.map((t) => [t.id, t.title]))

/** Converts a camelCase key to a readable label as a fallback. */
function humanise(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ExportSummary() {
  const { profile } = useAuth()
  const { application, loading } = useApplication()

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading your application...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1 className={styles.emptyHeading}>No application on file</h1>
          <p className={styles.emptyBody}>
            Submit a financing application to generate your summary document.
          </p>
          <Link to="/dashboard" className={styles.emptyLink}>
            Return to Overview
          </Link>
        </div>
      </div>
    )
  }

  const stageLabel =
    stageMeta.find((s) => s.key === application.status)?.label ?? application.status
  const trackLabel = TRACK_LABELS[application.track] ?? application.track
  const fields = application.fields ?? {}
  const nonEmptyFields = Object.entries(fields).filter(
    ([, val]) => val !== '' && val !== null && val !== undefined
  )

  return (
    <div className={styles.page}>
      {/* Controls — hidden on print via data-print-hide */}
      <div className={styles.controls} data-print-hide>
        <button className={styles.printBtn} onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      {/* Document card */}
      <div className={styles.document} data-print-document>
        {/* Brand header */}
        <div className={styles.brandHeader}>
          <p className={`${styles.wordmark} hasni-wordmark`}>Hasni Bank</p>
          <p className={styles.tagline}>Global financing marketplace</p>
        </div>

        {/* Meta row: Client ID + generated date */}
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Client ID</span>
            <span className={styles.metaValue}>{profile?.client_ref ?? 'N/A'}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Generated</span>
            <span className={styles.metaValue}>{generatedDate}</span>
          </span>
        </div>

        {/* Applicant block */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Applicant</h2>
          {[
            ['Full name', profile?.full_name],
            ['Company', profile?.company_name],
            ['Country', profile?.country],
          ].map(([label, value]) =>
            value ? (
              <div key={label} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{label}</span>
                <span className={styles.fieldValue}>{value}</span>
              </div>
            ) : null
          )}
        </section>

        {/* Application block */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Application</h2>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Financing track</span>
            <span className={styles.fieldValue}>{trackLabel}</span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Amount sought</span>
            <span className={styles.fieldValue}>
              {formatAmount(application.amount_sought, application.currency)}
            </span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Current stage</span>
            <span className={styles.fieldValue}>{stageLabel}</span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Submitted</span>
            <span className={styles.fieldValue}>{formatDate(application.created_at)}</span>
          </div>
        </section>

        {/* Fields section */}
        {nonEmptyFields.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Application details</h2>
            {nonEmptyFields.map(([key, val]) => (
              <div key={key} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{FIELD_LABELS[key] ?? humanise(key)}</span>
                <span className={styles.fieldValue}>{String(val)}</span>
              </div>
            ))}
          </section>
        )}

        {/* Footer */}
        <p className={styles.footer}>
          Generated from the Hasni Bank client portal. Reference your Client ID in all correspondence.
        </p>
      </div>
    </div>
  )
}
