import styles from '../Admin.module.css'

/** Placeholder until Task 27 delivers disbursement scheduling. */
export default function FundingTab() {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Funding</h2>
      <p className={styles.muted}>
        Disbursement tranches and the dated repayment schedule are being prepared.
      </p>
    </div>
  )
}
