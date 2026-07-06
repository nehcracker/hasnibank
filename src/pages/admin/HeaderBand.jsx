import StageControl from './StageControl'
import { TRACK_LABELS } from './adminMeta'
import styles from './Admin.module.css'

function formatAmount(application) {
  return `${application.currency} ${Number(application.amount_sought).toLocaleString('en-US')}`
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Applicant summary band across the top of the staff workspace:
 * identity, transaction facts, assessment score chip, open-RFI counter,
 * and the stage control on the right.
 */
export default function HeaderBand({ application, score, openRfiCount, user, onStatusUpdated }) {
  const applicant = application.applicant ?? {}
  const submitted = formatDate(application.submitted_at)
  const started = formatDate(application.created_at)

  return (
    <div className={styles.headerBand}>
      <div className={styles.headerIdentity}>
        <h1 className={styles.headerName}>{applicant.full_name || 'Unnamed applicant'}</h1>
        <p className={styles.headerCompany}>
          {applicant.company_name || ''}
          {applicant.client_ref ? ` · ${applicant.client_ref}` : ''}
        </p>
        <p className={styles.headerFacts}>
          {TRACK_LABELS[application.track] ?? application.track} · {formatAmount(application)}
          {submitted ? ` · Submitted ${submitted}` : started ? ` · Started ${started}` : ''}
        </p>
        <div className={styles.headerChips}>
          <span className={styles.statusBadge} data-status={application.status}>
            {application.status.replace(/_/g, ' ')}
          </span>
          <span className={styles.scoreChip} title="Assessment score from pillar findings">
            Score: {score == null ? 'not yet assessed' : `${score.toFixed(1)} / 10`}
          </span>
          <span
            className={openRfiCount > 0 ? styles.rfiChipOpen : styles.rfiChip}
            title="Open information requests"
          >
            {openRfiCount} RFI{openRfiCount === 1 ? '' : 's'} open
          </span>
        </div>
      </div>

      <div className={styles.headerStage}>
        <div className={styles.fieldLabelSm}>Stage control</div>
        <StageControl
          applicationId={application.id}
          currentStatus={application.status}
          userId={user.id}
          onUpdated={onStatusUpdated}
        />
      </div>
    </div>
  )
}
