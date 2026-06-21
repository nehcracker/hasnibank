import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './admin/Admin.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}

const STATUS_LABELS = {
  submitted: 'Submitted', kyc_verification: 'KYC Verification',
  credit_assessment: 'Credit Assessment', funder_matching: 'Funder Matching',
  term_sheet: 'Term Sheet', offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted', fee_payment: 'Fee Payment', funded: 'Funded',
}

export default function Admin() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setApplications(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.loadingMsg}>Loading applications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Applications</h1>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Track</th>
              <th>Amount Sought</th>
              <th>Stage</th>
              <th>Submitted</th>
              <th>Days Open</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.muted}>No applications yet.</td>
              </tr>
            )}
            {applications.map((app) => {
              const daysOpen = Math.floor(
                (Date.now() - new Date(app.created_at)) / (1000 * 60 * 60 * 24)
              )
              return (
                <tr
                  key={app.id}
                  className={styles.tableRow}
                  onClick={() => navigate(`/admin/applications/${app.id}`)}
                >
                  <td>
                    <div>{app.applicant?.full_name ?? '—'}</div>
                    <div className={styles.muted}>{app.applicant?.email}</div>
                  </td>
                  <td>{TRACK_LABELS[app.track] ?? app.track}</td>
                  <td>{app.currency} {Number(app.amount_sought).toLocaleString('en-US')}</td>
                  <td>
                    <span className={styles.statusBadge} data-status={app.status}>
                      {STATUS_LABELS[app.status] ?? app.status}
                    </span>
                  </td>
                  <td className={styles.muted}>
                    {new Date(app.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                  </td>
                  <td className={styles.muted}>{daysOpen}d</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
