import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import TrackSelect from './steps/TrackSelect'
import SmeFields from './steps/SmeFields'
import ProjectFields from './steps/ProjectFields'
import TradeFields from './steps/TradeFields'
import AcquisitionFields from './steps/AcquisitionFields'
import ReviewSubmit from './steps/ReviewSubmit'
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
      setSubmitError('Something went wrong — please try again or contact support.')
      setSubmitting(false)
      return
    }

    await supabase.from('application_events').insert({
      application_id: data.id,
      actor_id: user.id,
      actor_role: 'borrower',
      event_type: 'status_change',
      payload: { new_status: 'submitted' },
    })

    setSubmitting(false)
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

        {step === 2 && track === 'sme' && (
          <SmeFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
        )}
        {step === 2 && track === 'project' && (
          <ProjectFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
        )}
        {step === 2 && track === 'trade' && (
          <TradeFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
        )}
        {step === 2 && track === 'acquisition' && (
          <AcquisitionFields fields={fields} onChange={handleFieldChange} onBack={handleBack} onNext={handleNext} />
        )}

        {step === 3 && (
          <ReviewSubmit
            track={track}
            fields={fields}
            onEditTrack={() => handleGoToStep(1)}
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
