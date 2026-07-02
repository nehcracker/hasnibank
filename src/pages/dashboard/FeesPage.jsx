import styles from './Stub.module.css'

export default function FeesPage() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Fees &amp; payments</span>
      <h1 className={styles.heading}>Fees and payments</h1>
      <p className={styles.body}>
        A breakdown of applicable fees and your payment schedule will be shown here
        once a financing offer has been agreed and accepted.
      </p>
    </div>
  )
}
