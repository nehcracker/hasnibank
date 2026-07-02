import styles from './Stub.module.css'

export default function ExportSummary() {
  return (
    <div className={styles.page}>
      <span className={styles.pill}>Export</span>
      <h1 className={styles.heading}>Export summary</h1>
      <p className={styles.body}>
        A downloadable summary of your application and financing terms will be
        available here once your application has been finalised.
      </p>
    </div>
  )
}
