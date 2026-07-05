import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INITIAL_FIELDS } from '@/pages/wizard/ApplicationWizard'
import SmeFields from '@/pages/wizard/steps/SmeFields'
import ProjectFields from '@/pages/wizard/steps/ProjectFields'
import TradeFields from '@/pages/wizard/steps/TradeFields'
import AcquisitionFields from '@/pages/wizard/steps/AcquisitionFields'
import { SECTION_LABELS } from './ActionCard'
import styles from './BusinessProfileForm.module.css'

const SECTIONS = ['registration', 'trading', 'financials', 'purpose']

const TRACK_FIELD_COMPONENTS = {
  sme: SmeFields,
  project: ProjectFields,
  trade: TradeFields,
  acquisition: AcquisitionFields,
}

const REVENUE_BANDS = [
  { value: '<100k', label: 'Under $100k' },
  { value: '100k-500k', label: '$100k to $500k' },
  { value: '500k-2m', label: '$500k to $2M' },
  { value: '2m-10m', label: '$2M to $10M' },
  { value: '>10m', label: 'Over $10M' },
]

/**
 * BusinessProfileForm — resumable 4-section form writing to the draft
 * application's business_profile jsonb. Section 4 (funding purpose) reuses
 * the wizard's track-specific field components and keeps writing those
 * values to the `fields` jsonb so the admin detail view works unchanged.
 *
 * @param {object} props
 * @param {object} props.application    draft application row
 * @param {string} [props.initialSection]
 * @param {(app: object) => void} [props.onSaved]  called with the updated row after each save
 * @param {() => void} [props.onClose]
 */
export default function BusinessProfileForm({
  application,
  initialSection = 'registration',
  onSaved,
  onClose,
}) {
  const [active, setActive] = useState(
    SECTIONS.includes(initialSection) ? initialSection : 'registration'
  )
  const [businessProfile, setBusinessProfile] = useState(() => ({
    registration: {},
    trading: {},
    financials: {},
    purpose: {},
    progress: {},
    ...(application.business_profile ?? {}),
  }))
  const [fields, setFields] = useState(() => ({
    ...INITIAL_FIELDS[application.track],
    ...(application.fields ?? {}),
    // Drafts are created with an amount; prefill the purpose form with it
    amountSought:
      application.fields?.amountSought || String(application.amount_sought ?? ''),
  }))
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'

  // ── Persistence ────────────────────────────────────────────────────────────

  const latest = useRef({ businessProfile, fields })
  latest.current = { businessProfile, fields }
  const debounceRef = useRef(null)
  const dirtyRef = useRef(false)

  async function persist() {
    setSaveState('saving')
    const { data, error } = await supabase
      .from('applications')
      .update({
        business_profile: latest.current.businessProfile,
        fields: latest.current.fields,
      })
      .eq('id', application.id)
      .select()
      .single()

    if (error) {
      console.error('[BusinessProfileForm] save error:', error.message)
      setSaveState('error')
      return null
    }
    setSaveState('saved')
    onSaved?.(data)
    return data
  }

  // Debounced autosave — 800ms after the last change
  useEffect(() => {
    if (!dirtyRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(persist, 800)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessProfile, fields])

  function setSection(section, updates) {
    dirtyRef.current = true
    setBusinessProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }))
  }

  function handleFieldsChange(updates) {
    dirtyRef.current = true
    setFields((prev) => ({ ...prev, ...updates }))
  }

  // ── Validation (mirrors wizard rules: required, positive numbers) ──────────

  function validateSection(section) {
    const data = businessProfile[section] ?? {}
    const e = {}
    if (section === 'registration') {
      if (!data.legalName?.trim()) e.legalName = 'Required'
      if (!data.registrationNumber?.trim()) e.registrationNumber = 'Required'
      if (!data.country?.trim()) e.country = 'Required'
      if (!data.dateIncorporated) e.dateIncorporated = 'Required'
    }
    if (section === 'trading') {
      if (!data.sector?.trim()) e.sector = 'Required'
      if (
        data.yearsTrading === undefined ||
        data.yearsTrading === '' ||
        isNaN(parseFloat(data.yearsTrading)) ||
        parseFloat(data.yearsTrading) < 0
      )
        e.yearsTrading = 'Enter a valid number of years'
      if (
        data.staffCount === undefined ||
        data.staffCount === '' ||
        isNaN(parseInt(data.staffCount, 10)) ||
        parseInt(data.staffCount, 10) < 1
      )
        e.staffCount = 'Enter a valid staff count'
    }
    if (section === 'financials') {
      if (!data.revenueBand) e.revenueBand = 'Required'
      if (!data.existingDebt) e.existingDebt = 'Required'
      if (data.existingDebt === 'yes' && !data.debtDetail?.trim())
        e.debtDetail = 'Please describe your existing obligations'
    }
    return e
  }

  async function markComplete(section) {
    const e = validateSection(section)
    setErrors(e)
    if (Object.keys(e).length > 0) return

    dirtyRef.current = true
    clearTimeout(debounceRef.current)
    const nextProfile = {
      ...latest.current.businessProfile,
      progress: { ...latest.current.businessProfile.progress, [section]: true },
    }
    latest.current.businessProfile = nextProfile
    setBusinessProfile(nextProfile)
    await persist()

    const idx = SECTIONS.indexOf(section)
    if (idx < SECTIONS.length - 1) {
      setActive(SECTIONS[idx + 1])
      setErrors({})
    } else {
      onClose?.()
    }
  }

  // Section 4 completes through the wizard component's own validated Next
  function handlePurposeComplete() {
    markComplete('purpose')
  }

  const progress = businessProfile.progress ?? {}
  const TrackFields = TRACK_FIELD_COMPONENTS[application.track] ?? SmeFields
  const activeIdx = SECTIONS.indexOf(active)

  const saveLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving...'
    if (saveState === 'saved') return 'Saved'
    if (saveState === 'error') return 'Could not save. Check your connection.'
    return ''
  }, [saveState])

  return (
    <div className={styles.form}>
      {/* Section stepper */}
      <div className={styles.stepper} role="tablist" aria-label="Profile sections">
        {SECTIONS.map((key, i) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={styles.stepBtn}
            data-active={active === key || undefined}
            data-done={progress[key] === true || undefined}
            onClick={() => setActive(key)}
          >
            <span className={styles.stepNum}>{progress[key] === true ? '✓' : i + 1}</span>
            <span className={styles.stepLabel}>{SECTION_LABELS[key]}</span>
          </button>
        ))}
      </div>

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

      {/* Section 1: Registration details */}
      {active === 'registration' && (
        <SectionFrame
          title={SECTION_LABELS.registration}
          sub="Your company's legal identity as it appears on official registers."
        >
          <Field label="Legal company name" error={errors.legalName}>
            <input
              className={styles.input}
              value={businessProfile.registration?.legalName ?? ''}
              onChange={(e) => setSection('registration', { legalName: e.target.value })}
            />
          </Field>
          <Field label="Registration number" error={errors.registrationNumber}>
            <input
              className={styles.input}
              value={businessProfile.registration?.registrationNumber ?? ''}
              onChange={(e) =>
                setSection('registration', { registrationNumber: e.target.value })
              }
            />
          </Field>
          <Field label="Country of incorporation" error={errors.country}>
            <input
              className={styles.input}
              value={businessProfile.registration?.country ?? ''}
              onChange={(e) => setSection('registration', { country: e.target.value })}
            />
          </Field>
          <Field label="Date incorporated" error={errors.dateIncorporated}>
            <input
              type="date"
              className={styles.input}
              value={businessProfile.registration?.dateIncorporated ?? ''}
              onChange={(e) =>
                setSection('registration', { dateIncorporated: e.target.value })
              }
            />
          </Field>
          <SectionNav onComplete={() => markComplete('registration')} />
        </SectionFrame>
      )}

      {/* Section 2: Sector and trading history */}
      {active === 'trading' && (
        <SectionFrame
          title={SECTION_LABELS.trading}
          sub="What your business does and how long it has been doing it."
        >
          <Field label="Sector" error={errors.sector}>
            <input
              className={styles.input}
              value={businessProfile.trading?.sector ?? ''}
              onChange={(e) => setSection('trading', { sector: e.target.value })}
              placeholder="e.g. Agri-processing, logistics, retail"
            />
          </Field>
          <Field label="Years trading" error={errors.yearsTrading}>
            <input
              type="number"
              min="0"
              className={styles.input}
              value={businessProfile.trading?.yearsTrading ?? ''}
              onChange={(e) => setSection('trading', { yearsTrading: e.target.value })}
            />
          </Field>
          <Field label="Staff count" error={errors.staffCount}>
            <input
              type="number"
              min="1"
              className={styles.input}
              value={businessProfile.trading?.staffCount ?? ''}
              onChange={(e) => setSection('trading', { staffCount: e.target.value })}
            />
          </Field>
          <SectionNav
            onBack={() => setActive('registration')}
            onComplete={() => markComplete('trading')}
          />
        </SectionFrame>
      )}

      {/* Section 3: Revenue and obligations */}
      {active === 'financials' && (
        <SectionFrame
          title={SECTION_LABELS.financials}
          sub="Your revenue scale and any existing debt obligations."
        >
          <Field label="Annual revenue band" error={errors.revenueBand}>
            <select
              className={styles.select}
              value={businessProfile.financials?.revenueBand ?? ''}
              onChange={(e) => setSection('financials', { revenueBand: e.target.value })}
            >
              <option value="">Select...</option>
              {REVENUE_BANDS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Existing debt obligations?" error={errors.existingDebt}>
            <div className={styles.radioGroup}>
              {['yes', 'no'].map((v) => (
                <label key={v} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="existingDebt"
                    value={v}
                    checked={businessProfile.financials?.existingDebt === v}
                    onChange={() => setSection('financials', { existingDebt: v })}
                  />
                  {v === 'yes' ? 'Yes' : 'No'}
                </label>
              ))}
            </div>
          </Field>
          {businessProfile.financials?.existingDebt === 'yes' && (
            <Field label="Existing debt detail" error={errors.debtDetail}>
              <input
                className={styles.input}
                value={businessProfile.financials?.debtDetail ?? ''}
                onChange={(e) => setSection('financials', { debtDetail: e.target.value })}
                placeholder="Lender, outstanding balance, repayment terms"
              />
            </Field>
          )}
          <SectionNav
            onBack={() => setActive('trading')}
            onComplete={() => markComplete('financials')}
          />
        </SectionFrame>
      )}

      {/* Section 4: Funding purpose — track-specific wizard fields */}
      {active === 'purpose' && (
        <div className={styles.purposeWrap}>
          <TrackFields
            fields={fields}
            onChange={handleFieldsChange}
            onBack={() => setActive('financials')}
            onNext={handlePurposeComplete}
          />
        </div>
      )}

      {activeIdx < 3 && (
        <p className={styles.caption}>
          Your progress saves automatically. Mark each section complete to unlock
          submission.
        </p>
      )}
    </div>
  )
}

function SectionFrame({ title, sub, children }) {
  return (
    <div>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p className={styles.sectionSub}>{sub}</p>
      <div className={styles.fieldset}>{children}</div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      {children}
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

function SectionNav({ onBack, onComplete }) {
  return (
    <div className={styles.navRow}>
      {onBack ? (
        <button type="button" className={styles.backBtn} onClick={onBack}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button type="button" className={styles.completeBtn} onClick={onComplete}>
        Mark complete
      </button>
    </div>
  )
}
