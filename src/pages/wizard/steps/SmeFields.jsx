import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function SmeFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) {
    onChange({ [key]: value })
  }

  function validate() {
    const e = {}
    if (!fields.businessName.trim()) e.businessName = 'Required'
    if (!fields.businessType) e.businessType = 'Required'
    if (!fields.countryOfRegistration.trim()) e.countryOfRegistration = 'Required'
    if (!fields.annualRevenue) e.annualRevenue = 'Required'
    if (!fields.loanPurpose) e.loanPurpose = 'Required'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
    if (!fields.collateralAvailable) e.collateralAvailable = 'Required'
    if (fields.collateralAvailable === 'yes' && !fields.collateralDescription.trim())
      e.collateralDescription = 'Please describe the collateral'
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
      <h2 className={styles.sectionTitle}>SME Financing Details</h2>
      <p className={styles.sectionSub}>Tell us about your business and financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Business name" error={err('businessName')}>
          <input className={cls('businessName')} value={fields.businessName}
            onChange={(e) => set('businessName', e.target.value)} />
        </Field>
        <Field label="Business type" error={err('businessType')}>
          <select className={selCls('businessType')} value={fields.businessType}
            onChange={(e) => set('businessType', e.target.value)}>
            <option value="">Select…</option>
            <option value="sole_trader">Sole Trader</option>
            <option value="partnership">Partnership</option>
            <option value="private_limited">Private Limited</option>
            <option value="public_company">Public Company</option>
          </select>
        </Field>
        <Field label="Country of registration" error={err('countryOfRegistration')}>
          <input className={cls('countryOfRegistration')} value={fields.countryOfRegistration}
            onChange={(e) => set('countryOfRegistration', e.target.value)} />
        </Field>
        <Field label="Annual revenue" error={err('annualRevenue')}>
          <select className={selCls('annualRevenue')} value={fields.annualRevenue}
            onChange={(e) => set('annualRevenue', e.target.value)}>
            <option value="">Select…</option>
            <option value="<100k">Under $100k</option>
            <option value="100k-500k">$100k – $500k</option>
            <option value="500k-2m">$500k – $2M</option>
            <option value="2m-10m">$2M – $10M</option>
            <option value=">10m">Over $10M</option>
          </select>
        </Field>
        <Field label="Financing purpose" error={err('loanPurpose')}>
          <select className={selCls('loanPurpose')} value={fields.loanPurpose}
            onChange={(e) => set('loanPurpose', e.target.value)}>
            <option value="">Select…</option>
            <option value="working_capital">Working Capital</option>
            <option value="equipment_finance">Equipment Finance</option>
            <option value="business_expansion">Business Expansion</option>
            <option value="trade_finance">Trade Finance</option>
          </select>
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 500000" />
        </Field>
        <Field label="Collateral available?" error={err('collateralAvailable')}>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input type="radio" name="collateral" value="yes"
                checked={fields.collateralAvailable === 'yes'}
                onChange={() => set('collateralAvailable', 'yes')} />
              Yes
            </label>
            <label className={styles.radioLabel}>
              <input type="radio" name="collateral" value="no"
                checked={fields.collateralAvailable === 'no'}
                onChange={() => set('collateralAvailable', 'no')} />
              No
            </label>
          </div>
        </Field>
        {fields.collateralAvailable === 'yes' && (
          <Field label="Collateral description" error={err('collateralDescription')}>
            <input className={cls('collateralDescription')} value={fields.collateralDescription}
              onChange={(e) => set('collateralDescription', e.target.value)}
              placeholder="Describe the collateral offered" />
          </Field>
        )}
        <Field label="Business & use-of-funds description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe your business and how you intend to use the funds" />
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
