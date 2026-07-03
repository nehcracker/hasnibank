import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import StageControl from './StageControl'
import styles from './Admin.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}

const FIELD_LABELS = {
  businessName: 'Business Name', businessType: 'Business Type',
  countryOfRegistration: 'Country of Registration', annualRevenue: 'Annual Revenue',
  loanPurpose: 'Financing Purpose', amountSought: 'Amount Sought',
  collateralAvailable: 'Collateral Available', collateralDescription: 'Collateral Description',
  description: 'Description',
  projectName: 'Project Name', sector: 'Sector', fundingStructure: 'Funding Structure',
  totalProjectValue: 'Total Project Value', projectTimeline: 'Project Timeline',
  keySponsors: 'Key Sponsors',
  companyName: 'Company Name', tradeType: 'Trade Type',
  counterpartyCountry: 'Counterparty Country', transactionValue: 'Transaction Value',
  acquiringCompanyName: 'Acquiring Company', targetDescription: 'Target Description',
  dealStructure: 'Deal Structure', totalAcquisitionValue: 'Total Acquisition Value',
  expectedClosingTimeline: 'Expected Closing',
}

export default function AdminApplication() {
  const { id } = useParams()
  const { user } = useAuth()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(full_name, email, phone, country, occupation, company_name, client_ref)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error) setApplication(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}><p className={styles.loadingMsg}>Loading…</p></div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}><p className={styles.loadingMsg}>Application not found.</p></div>
      </div>
    )
  }

  const fields = application.fields ?? {}
  const applicant = application.applicant

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link to="/admin" className={styles.backLink}>← Back to Applications</Link>
        <h1 className={styles.heading}>
          {TRACK_LABELS[application.track]} — {application.currency}{' '}
          {Number(application.amount_sought).toLocaleString('en-US')}
        </h1>

        <div className={styles.detailGrid}>
          {/* Left: applicant profile + application fields */}
          <div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Applicant</h2>
              {[
                ['Name', applicant?.full_name],
                ['Email', applicant?.email],
                ['Phone', applicant?.phone],
                ['Country', applicant?.country],
                ['Occupation', applicant?.occupation],
                ['Company', applicant?.company_name],
                ['Client ID', applicant?.client_ref],
              ].map(([label, value]) => (
                <div key={label} className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Application Fields</h2>
              {Object.entries(fields).map(([key, val]) =>
                val !== '' && val !== null && val !== undefined ? (
                  <div key={key} className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{FIELD_LABELS[key] ?? key}</span>
                    <span className={styles.fieldValue}>{String(val)}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Right: workflow */}
          <div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Stage Control</h2>
              <StageControl
                applicationId={application.id}
                currentStatus={application.status}
                userId={user.id}
                onUpdated={(newStatus) =>
                  setApplication((prev) => ({ ...prev, status: newStatus }))
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
