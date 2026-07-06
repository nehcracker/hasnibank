import { FIELD_LABELS } from '../adminMeta'
import styles from '../Admin.module.css'

/**
 * Application tab: the submitted profile and track fields.
 * Consistency review and extended intake toggles arrive with Task 25.
 */
export default function ApplicationTab({ application }) {
  const fields = application.fields ?? {}
  const applicant = application.applicant ?? {}

  return (
    <div>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Applicant</h2>
        {[
          ['Name', applicant.full_name],
          ['Email', applicant.email],
          ['Phone', applicant.phone],
          ['Country', applicant.country],
          ['Occupation', applicant.occupation],
          ['Company', applicant.company_name],
          ['Client ID', applicant.client_ref],
        ].map(([label, value]) => (
          <div key={label} className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{label}</span>
            <span className={styles.fieldValue}>{value || '—'}</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Application Fields</h2>
        {Object.entries(fields).filter(
          ([, val]) => val !== '' && val !== null && val !== undefined
        ).length === 0 ? (
          <p className={styles.muted}>No application fields provided yet.</p>
        ) : (
          Object.entries(fields).map(([key, val]) =>
            val !== '' && val !== null && val !== undefined ? (
              <div key={key} className={styles.fieldRow}>
                <span className={styles.fieldLabel}>{FIELD_LABELS[key] ?? key}</span>
                <span className={styles.fieldValue}>{String(val)}</span>
              </div>
            ) : null
          )
        )}
      </div>
    </div>
  )
}
