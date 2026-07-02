import styles from './Stub.module.css'

export default function DocChecklist() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Checklist</span>
      <h1 className={styles.heading}>Document checklist</h1>
      <p className={styles.body}>
        A guided checklist of required documents will appear here once your application
        has advanced to the assessment stage.
      </p>
    </div>
  )
}
