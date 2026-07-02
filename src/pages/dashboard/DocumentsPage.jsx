import styles from './Stub.module.css'

export default function DocumentsPage() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Documents</span>
      <h1 className={styles.heading}>Documents</h1>
      <p className={styles.body}>
        Securely upload and manage your supporting documentation here once your
        application progresses to the due diligence stage.
      </p>
    </div>
  )
}
