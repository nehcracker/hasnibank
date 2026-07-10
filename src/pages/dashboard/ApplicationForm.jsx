import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INITIAL_FIELDS } from '@/data/initialFields'
import styles from './ApplicationForm.module.css'

const BUSINESS_TYPES = [
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'public_company', label: 'Public Company' },
]

const FINANCING_PURPOSES = [
  { value: 'working_capital', label: 'Working Capital' },
  { value: 'equipment_finance', label: 'Equipment Finance' },
  { value: 'business_expansion', label: 'Business Expansion' },
  { value: 'trade_finance', label: 'Trade Finance' },
]

/**
 * ApplicationForm — the single grouped SME application form (Phase D).
 *
 * Replaces the old business-profile-plus-self-check workspace with one
 * continuous form in four light-headed groups: Business, Contact,
 * Financials, and Financing request. Every value reads from and writes to
 * the draft application's `fields` jsonb; there is no per-section
 * "mark complete" step. Autosave is debounced 800ms after the last change.
 *
 * Only the SME track is in scope for this phase (see the Phase D plan's
 * "Intake scope" note) — project, trade, and acquisition continue through
 * BusinessProfileForm and their existing *Fields.jsx step component.
 *
 * @param {object} props
 * @param {object} props.application  draft application row (id, track, fields, amount_sought)
 * @param {object} [props.profile]    signed-in profile, for the email prefill
 * @param {(app: object) => void} [props.onSaved]  called with the updated row after each save
 * @param {() => void} [props.onClose]
 */
export default function ApplicationForm({ application, profile, onSaved, onClose }) {
  const [fields, setFields] = useState(() => ({
    ...INITIAL_FIELDS.sme,
    ...(application.fields ?? {}),
    email: application.fields?.email || profile?.email || '',
    amountSought:
      application.fields?.amountSought || String(application.amount_sought ?? ''),
  }))
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'

  const latest = useRef(fields)
  latest.current = fields
  const debounceRef = useRef(null)
  const dirtyRef = useRef(false)

  async function persist() {
    setSaveState('saving')
    const { data, error } = await supabase
      .from('applications')
      .update({ fields: latest.current })
      .eq('id', application.id)
      .select()
      .single()

    if (error) {
      console.error('[ApplicationForm] save error:', error.message)
      setSaveState('error')
      return
    }
    setSaveState('saved')
    onSaved?.(data)
  }

  // Debounced autosave — 800ms after the last change
  useEffect(() => {
    if (!dirtyRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(persist, 800)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])

  function set(key, value) {
    dirtyRef.current = true
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const saveLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving...'
    if (saveState === 'saved') return 'Saved'
    if (saveState === 'error') return 'Could not save. Check your connection.'
    return ''
  }, [saveState])

  return (
    <div className={styles.form}>
      <div className={styles.saveRow}>
        <span className={styles.saveState} data-state={saveState}>
          {saveLabel}
        </span>
        {onClose && (
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <FormGroup title="Business" sub="Your company's identity and trading profile.">
        <Field label="Business name" htmlFor="businessName">
          <input
            id="businessName"
            className={styles.input}
            value={fields.businessName}
            onChange={(e) => set('businessName', e.target.value)}
          />
        </Field>
        <Field label="Registration number" htmlFor="registrationNumber">
          <input
            id="registrationNumber"
            className={styles.input}
            value={fields.registrationNumber}
            onChange={(e) => set('registrationNumber', e.target.value)}
          />
        </Field>
        <Field label="Business type" htmlFor="businessType">
          <select
            id="businessType"
            className={styles.select}
            value={fields.businessType}
            onChange={(e) => set('businessType', e.target.value)}
          >
            <option value="">Select...</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Country of registration" htmlFor="countryOfRegistration">
          <input
            id="countryOfRegistration"
            className={styles.input}
            value={fields.countryOfRegistration}
            onChange={(e) => set('countryOfRegistration', e.target.value)}
          />
        </Field>
        <Field label="Time in operation (years)" htmlFor="timeInOperation">
          <input
            id="timeInOperation"
            type="number"
            min="0"
            className={styles.input}
            value={fields.timeInOperation}
            onChange={(e) => set('timeInOperation', e.target.value)}
          />
        </Field>
        <Field label="Sector" htmlFor="sector">
          <input
            id="sector"
            className={styles.input}
            value={fields.sector}
            onChange={(e) => set('sector', e.target.value)}
            placeholder="e.g. Agri-processing, logistics, retail"
          />
        </Field>
        <Field label="Number of employees" htmlFor="employees">
          <input
            id="employees"
            type="number"
            min="0"
            className={styles.input}
            value={fields.employees}
            onChange={(e) => set('employees', e.target.value)}
          />
        </Field>
      </FormGroup>

      <FormGroup title="Contact" sub="Where the assessment team reaches you.">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className={styles.input}
            value={fields.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Confirm email" htmlFor="confirmEmail">
          <input
            id="confirmEmail"
            type="email"
            className={styles.input}
            value={fields.confirmEmail}
            onChange={(e) => set('confirmEmail', e.target.value)}
          />
          {fields.confirmEmail && fields.confirmEmail.trim().toLowerCase() !== fields.email.trim().toLowerCase() && (
            <p className={styles.fieldError}>Emails do not match</p>
          )}
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input
            id="phone"
            type="tel"
            className={styles.input}
            value={fields.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Confirm phone" htmlFor="confirmPhone">
          <input
            id="confirmPhone"
            type="tel"
            className={styles.input}
            value={fields.confirmPhone}
            onChange={(e) => set('confirmPhone', e.target.value)}
          />
          {fields.phone && fields.confirmPhone && fields.confirmPhone.trim() !== fields.phone.trim() && (
            <p className={styles.fieldError}>Phone numbers do not match</p>
          )}
        </Field>
        <Field label="Business address" htmlFor="address">
          <input
            id="address"
            className={styles.input}
            value={fields.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </Field>
      </FormGroup>

      <FormGroup title="Financials" sub="Your trading scale and existing obligations.">
        <Field label="Average monthly sales (USD)" htmlFor="monthlySales">
          <input
            id="monthlySales"
            type="number"
            min="0"
            className={styles.input}
            value={fields.monthlySales}
            onChange={(e) => set('monthlySales', e.target.value)}
          />
        </Field>
        <Field label="Existing debt obligations?" htmlFor="existingDebt">
          <div className={styles.radioGroup}>
            {['yes', 'no'].map((v) => (
              <label key={v} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="existingDebt"
                  value={v}
                  checked={fields.existingDebt === v}
                  onChange={() => set('existingDebt', v)}
                />
                {v === 'yes' ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
        </Field>
      </FormGroup>

      <FormGroup title="Financing request" sub="What you need and what it is for.">
        <Field label="Financing purpose" htmlFor="loanPurpose">
          <select
            id="loanPurpose"
            className={styles.select}
            value={fields.loanPurpose}
            onChange={(e) => set('loanPurpose', e.target.value)}
          >
            <option value="">Select...</option>
            {FINANCING_PURPOSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount sought (USD)" htmlFor="amountSought">
          <input
            id="amountSought"
            type="number"
            min="1"
            className={styles.input}
            value={fields.amountSought}
            onChange={(e) => set('amountSought', e.target.value)}
          />
        </Field>
        <Field label="Use of funds" htmlFor="description" full>
          <textarea
            id="description"
            rows={3}
            className={styles.textarea}
            value={fields.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe how the funds will be used"
          />
        </Field>
      </FormGroup>

      <p className={styles.caption}>
        Your progress saves automatically. The fundability self-check is an
        optional tool; it is never required to submit.
      </p>
    </div>
  )
}

function FormGroup({ title, sub, children }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <p className={styles.groupSub}>{sub}</p>
      <div className={styles.grid}>{children}</div>
    </section>
  )
}

function Field({ label, htmlFor, full, children }) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}
