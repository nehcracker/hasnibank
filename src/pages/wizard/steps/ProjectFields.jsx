import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function ProjectFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.projectName.trim()) e.projectName = 'Required'
    if (!fields.sector) e.sector = 'Required'
    if (!fields.fundingStructure) e.fundingStructure = 'Required'
    if (!fields.totalProjectValue || isNaN(parseFloat(fields.totalProjectValue)) || parseFloat(fields.totalProjectValue) <= 0)
      e.totalProjectValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.projectTimeline) e.projectTimeline = 'Required'
    if (!fields.keySponsors.trim()) e.keySponsors = 'Required'
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
      <h2 className={styles.sectionTitle}>Project Funding Details</h2>
      <p className={styles.sectionSub}>Tell us about your project and capital requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Project name" error={err('projectName')}>
          <input className={cls('projectName')} value={fields.projectName}
            onChange={(e) => set('projectName', e.target.value)} />
        </Field>
        <Field label="Sector" error={err('sector')}>
          <select className={selCls('sector')} value={fields.sector}
            onChange={(e) => set('sector', e.target.value)}>
            <option value="">Select…</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="energy">Energy</option>
            <option value="real_estate">Real Estate</option>
            <option value="agriculture">Agriculture</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="mining">Mining & Resources</option>
          </select>
        </Field>
        <Field label="Preferred funding structure" error={err('fundingStructure')}>
          <select className={selCls('fundingStructure')} value={fields.fundingStructure}
            onChange={(e) => set('fundingStructure', e.target.value)}>
            <option value="">Select…</option>
            <option value="debt">Debt Finance</option>
            <option value="equity">Equity Finance</option>
            <option value="joint_ventures">Joint Ventures</option>
            <option value="structured">Structured Finance</option>
          </select>
        </Field>
        <Field label="Total project value (USD)" error={err('totalProjectValue')}>
          <input type="number" min="1" className={cls('totalProjectValue')} value={fields.totalProjectValue}
            onChange={(e) => set('totalProjectValue', e.target.value)} placeholder="e.g. 10000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 5000000" />
        </Field>
        <Field label="Project timeline" error={err('projectTimeline')}>
          <select className={selCls('projectTimeline')} value={fields.projectTimeline}
            onChange={(e) => set('projectTimeline', e.target.value)}>
            <option value="">Select…</option>
            <option value="<12m">Under 12 months</option>
            <option value="1-3y">1 – 3 years</option>
            <option value="3-5y">3 – 5 years</option>
            <option value="5y+">5+ years</option>
          </select>
        </Field>
        <Field label="Key sponsors / parties" error={err('keySponsors')}>
          <input className={cls('keySponsors')} value={fields.keySponsors}
            onChange={(e) => set('keySponsors', e.target.value)}
            placeholder="Names of key project sponsors or parties involved" />
        </Field>
        <Field label="Project description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the project, its objectives, and current stage of development" />
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
