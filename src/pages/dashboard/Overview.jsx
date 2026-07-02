import styles from './Stub.module.css'

/**
 * Overview — placeholder heading.
 * Task 4 replaces this with the full borrower overview panel.
 */
export default function Overview() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Dashboard</span>
      <h1 className={styles.heading}>Overview</h1>
      <p className={styles.body}>
        Your financing overview will appear here once your application is under review.
      </p>
    </div>
  )
}
