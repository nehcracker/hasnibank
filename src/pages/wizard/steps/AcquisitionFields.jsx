import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function AcquisitionFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.acquiringCompanyName.trim()) e.acquiringCompanyName = 'Required'
    if (!fields.targetDescription.trim()) e.targetDescription = 'Required'
    if (!fields.dealStructure) e.dealStructure = 'Required'
    if (!fields.totalAcquisitionValue || isNaN(parseFloat(fields.totalAcquisitionValue)) || parseFloat(fields.totalAcquisitionValue) <= 0)
      e.totalAcquisitionValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.expectedClosingTimeline.trim()) e.expectedClosingTimeline = 'Required'
    if (!fields.description.trim()) e.description = 'Required'
    return e
  }

  function handleNext() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) onNext()
  }

  const err = (k) => errors[k]
  const cls = (k) => `${styles.input} ${errors[k] ? styles.fieldErr : ''}`
  const selCls = (k) => `${styles.select} ${errors[k] ? styles.fieldErr : ''}`
  const txtCls = (k) => `${styles.textarea} ${errors[k] ? styles.fieldErr : ''}`

  return (
    <div>
      <h2 className={styles.sectionTitle}>Acquisition Finance Details</h2>
      <p className={styles.sectionSub}>Tell us about the acquisition and your financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Acquiring company name" error={err('acquiringCompanyName')}>
          <input className={cls('acquiringCompanyName')} value={fields.acquiringCompanyName}
            onChange={(e) => set('acquiringCompanyName', e.target.value)} />
        </Field>
        <Field label="Target company / asset description" error={err('targetDescription')}>
          <input className={cls('targetDescription')} value={fields.targetDescription}
            onChange={(e) => set('targetDescription', e.target.value)}
            placeholder="Name and brief description of the acquisition target" />
        </Field>
        <Field label="Deal structure" error={err('dealStructure')}>
          <select className={selCls('dealStructure')} value={fields.dealStructure}
            onChange={(e) => set('dealStructure', e.target.value)}>
            <option value="">Select…</option>
            <option value="lbo">Leveraged Buyout</option>
            <option value="mbo">Management Buyout</option>
            <option value="asset_acquisition">Asset Acquisition</option>
            <option value="share_acquisition">Share Acquisition</option>
          </select>
        </Field>
        <Field label="Total acquisition value (USD)" error={err('totalAcquisitionValue')}>
          <input type="number" min="1" className={cls('totalAcquisitionValue')} value={fields.totalAcquisitionValue}
            onChange={(e) => set('totalAcquisitionValue', e.target.value)} placeholder="e.g. 20000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 15000000" />
        </Field>
        <Field label="Expected closing timeline" error={err('expectedClosingTimeline')}>
          <input className={cls('expectedClosingTimeline')} value={fields.expectedClosingTimeline}
            onChange={(e) => set('expectedClosingTimeline', e.target.value)}
            placeholder="e.g. Q3 2026 or within 6 months" />
        </Field>
        <Field label="Deal description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the acquisition rationale, the target, and the strategic context" />
        </Field>
      </div>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={handleNext}>Next</button>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}<span className={styles.required}>*</span></label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}
