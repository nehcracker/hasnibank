import { useState } from 'react'
import styles from '../Wizard.module.css'

export default function TradeFields({ fields, onChange, onBack, onNext }) {
  const [errors, setErrors] = useState({})

  function set(key, value) { onChange({ [key]: value }) }

  function validate() {
    const e = {}
    if (!fields.companyName.trim()) e.companyName = 'Required'
    if (!fields.tradeType) e.tradeType = 'Required'
    if (!fields.counterpartyCountry.trim()) e.counterpartyCountry = 'Required'
    if (!fields.transactionValue || isNaN(parseFloat(fields.transactionValue)) || parseFloat(fields.transactionValue) <= 0)
      e.transactionValue = 'Enter a valid amount greater than 0'
    if (!fields.amountSought || isNaN(parseFloat(fields.amountSought)) || parseFloat(fields.amountSought) <= 0)
      e.amountSought = 'Enter a valid amount greater than 0'
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
      <h2 className={styles.sectionTitle}>Trade Finance Details</h2>
      <p className={styles.sectionSub}>Tell us about your trade transaction and financing requirements.</p>
      <div className={styles.fieldset}>
        <Field label="Company name" error={err('companyName')}>
          <input className={cls('companyName')} value={fields.companyName}
            onChange={(e) => set('companyName', e.target.value)} />
        </Field>
        <Field label="Trade type" error={err('tradeType')}>
          <select className={selCls('tradeType')} value={fields.tradeType}
            onChange={(e) => set('tradeType', e.target.value)}>
            <option value="">Select…</option>
            <option value="import_lc">Import Letter of Credit</option>
            <option value="export_lc">Export Letter of Credit</option>
            <option value="invoice_discounting">Invoice Discounting</option>
            <option value="supply_chain">Supply Chain Finance</option>
          </select>
        </Field>
        <Field label="Counterparty country" error={err('counterpartyCountry')}>
          <input className={cls('counterpartyCountry')} value={fields.counterpartyCountry}
            onChange={(e) => set('counterpartyCountry', e.target.value)}
            placeholder="Country of the trade counterparty" />
        </Field>
        <Field label="Transaction value (USD)" error={err('transactionValue')}>
          <input type="number" min="1" className={cls('transactionValue')} value={fields.transactionValue}
            onChange={(e) => set('transactionValue', e.target.value)} placeholder="e.g. 2000000" />
        </Field>
        <Field label="Amount sought (USD)" error={err('amountSought')}>
          <input type="number" min="1" className={cls('amountSought')} value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)} placeholder="e.g. 1500000" />
        </Field>
        <Field label="Transaction description" error={err('description')}>
          <textarea className={txtCls('description')} value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the trade transaction, goods or services, and timeline" />
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
