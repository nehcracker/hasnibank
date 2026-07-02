import styles from './Stub.module.css'

export default function MessagesPage() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Messages</span>
      <h1 className={styles.heading}>Messages</h1>
      <p className={styles.body}>
        Secure communications with your financing team will be available here once
        your application is under active review.
      </p>
    </div>
  )
}
