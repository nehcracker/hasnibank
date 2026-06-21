import { Fragment } from 'react'
import styles from './Status.module.css'

const STAGES = [
  { key: 'submitted',         label: 'Submitted' },
  { key: 'kyc_verification',  label: 'KYC Verification' },
  { key: 'credit_assessment', label: 'Credit Assessment' },
  { key: 'funder_matching',   label: 'Funder Matching' },
  { key: 'term_sheet',        label: 'Term Sheet' },
  { key: 'offer_issued',      label: 'Offer Issued' },
  { key: 'offer_accepted',    label: 'Offer Accepted' },
  { key: 'fee_payment',       label: 'Fee Payment' },
  { key: 'funded',            label: 'Funded' },
]

export { STAGES }

export default function ProgressTracker({ status }) {
  const currentIdx = STAGES.findIndex((s) => s.key === status)

  return (
    <div className={styles.trackerWrap}>
      <div className={styles.stages}>
        {STAGES.map((stage, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'future'
          return (
            <Fragment key={stage.key}>
              <div
                className={styles.stageCell}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                <div className={styles.stageDot}>
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <span className={styles.stageLabel}>{stage.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={styles.connector} data-state={state} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
