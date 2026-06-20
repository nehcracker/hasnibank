import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import TrackSelect from './steps/TrackSelect'
import styles from './Wizard.module.css'

const STEPS = ['Track', 'Details', 'Review']

const INITIAL_FIELDS = {
  sme: {
    businessName: '', businessType: '', countryOfRegistration: '',
    annualRevenue: '', loanPurpose: '', amountSought: '',
    collateralAvailable: '', collateralDescription: '', description: '',
  },
  project: {
    projectName: '', sector: '', fundingStructure: '',
    totalProjectValue: '', amountSought: '', projectTimeline: '',
    keySponsors: '', description: '',
  },
  trade: {
    companyName: '', tradeType: '', counterpartyCountry: '',
    transactionValue: '', amountSought: '', description: '',
  },
  acquisition: {
    acquiringCompanyName: '', targetDescription: '', dealStructure: '',
    totalAcquisitionValue: '', amountSought: '',
    expectedClosingTimeline: '', description: '',
  },
}

export default function ApplicationWizard({ onComplete }) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [track, setTrack] = useState(null)
  const [fields, setFields] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function handleTrackSelect(trackId) {
    setTrack(trackId)
    setFields(INITIAL_FIELDS[trackId])
  }

  function handleFieldChange(updates) {
    setFields((prev) => ({ ...prev, ...updates }))
  }

  function handleNext() { setStep((s) => s + 1) }
  function handleBack() { setStep((s) => s - 1) }
  function handleGoToStep(n) { setStep(n) }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase
      .from('applications')
      .insert({
        applicant_id: user.id,
        track,
        amount_sought: parseFloat(fields.amountSought),
        currency: 'USD',
        status: 'submitted',
        fields,
      })
      .select()
      .single()

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }
    onComplete(data)
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <ProgressBar currentStep={step} />

        {step === 1 && (
          <>
            <TrackSelect selectedTrack={track} onSelect={handleTrackSelect} />
            <div className={styles.navRow}>
              <span />
              <button className={styles.nextBtn} onClick={handleNext} disabled={!track}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <DetailsPlaceholder track={track} onBack={handleBack} onNext={handleNext} />
        )}

        {step === 3 && (
          <ReviewPlaceholder
            onBack={handleBack}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </div>
    </div>
  )
}

function ProgressBar({ currentStep }) {
  return (
    <div className={styles.progress}>
      {STEPS.map((label, i) => {
        const num = i + 1
        const done = num < currentStep
        const active = num === currentStep
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div className={`${styles.stepItem} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
              <span className={`${styles.stepNum} ${active ? styles.active : ''} ${done ? styles.done : ''}`}>
                {done ? '✓' : num}
              </span>
              {label}
            </div>
            {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
          </div>
        )
      })}
    </div>
  )
}

function DetailsPlaceholder({ track, onBack, onNext }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Application Details</h2>
      <p className={styles.sectionSub}>
        {track ? `${track.toUpperCase()} fields — coming in Task 4` : 'No track selected'}
      </p>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.nextBtn} onClick={onNext}>Next</button>
      </div>
    </div>
  )
}

function ReviewPlaceholder({ onBack, onSubmit, submitting, submitError }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Review & Submit</h2>
      <p className={styles.sectionSub}>Review placeholder — coming in Task 5</p>
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.submitBtn} onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
      {submitError && <p className={styles.submitError}>{submitError}</p>}
    </div>
  )
}
