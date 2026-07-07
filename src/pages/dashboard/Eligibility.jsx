import { useState, useId, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { questions, scoreAnswers } from '@/data/eligibilityModel'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import styles from './Eligibility.module.css'

// ── Score dial (SVG arc gauge) ────────────────────────────────────────────────
// 270-degree arc starting at the 7:30 position (bottom-left),
// sweeping clockwise through 12, 3, and ending at 4:30 (bottom-right).

const R = 45
const CX = 60
const CY = 60
const CIRCUMFERENCE = 2 * Math.PI * R        // ≈ 282.74
const ARC_LENGTH = CIRCUMFERENCE * 0.75       // 270° portion ≈ 212.06

function ScoreDial({ score }) {
  const filledArc = Math.max(0, Math.min((score / 10) * ARC_LENGTH, ARC_LENGTH))

  return (
    <svg
      viewBox="0 0 120 120"
      width="180"
      height="180"
      className={styles.dial}
      role="img"
      aria-label={`Fundability score: ${score.toFixed(1)} out of 10`}
    >
      {/* Background track — 270° arc */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        className={styles.dialTrack}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${ARC_LENGTH.toFixed(3)} ${CIRCUMFERENCE.toFixed(3)}`}
        transform={`rotate(135 ${CX} ${CY})`}
      />
      {/* Gold fill arc */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        className={styles.dialFill}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filledArc.toFixed(3)} ${CIRCUMFERENCE.toFixed(3)}`}
        transform={`rotate(135 ${CX} ${CY})`}
      />
      {/* Score value */}
      <text x={CX} y={CY - 4} textAnchor="middle" className={styles.dialScore}>
        {score.toFixed(1)}
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" className={styles.dialUnit}>
        out of 10
      </text>
    </svg>
  )
}

// ── Band chip class map ───────────────────────────────────────────────────────

const BAND_CHIP_CLASS = {
  'Application-ready': styles.bandReady,
  'Conditionally ready': styles.bandConditional,
  'Not yet ready': styles.bandNotReady,
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Eligibility() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const groupId = useId()

  const { user } = useAuth()
  const { application, refresh } = useApplication()
  const savedRef = useRef(false)
  const isDraft = application?.status === 'draft'

  const isComplete = step >= questions.length
  const currentQ = isComplete ? null : questions[step]
  const currentAnswer = currentQ != null ? (answers[currentQ.id] ?? null) : null
  const hasAnswer = currentAnswer !== null

  // Persist the result to the draft application the first time the result
  // screen is reached; retakes reset the flag so a new run overwrites.
  useEffect(() => {
    if (!isComplete || !isDraft || savedRef.current) return
    savedRef.current = true
    const { score, band } = scoreAnswers(answers)
    const eligibility = {
      answers,
      score,
      band,
      completed_at: new Date().toISOString(),
    }
    supabase
      .from('applications')
      .update({ eligibility })
      .eq('id', application.id)
      .then(({ error }) => {
        if (error) {
          console.warn('[Eligibility] save failed:', error.message)
          return
        }
        supabase.from('application_events').insert({
          application_id: application.id,
          actor_id: user.id,
          actor_role: 'borrower',
          event_type: 'note',
          payload: { detail: 'Fundability self-check completed' },
        }).then(({ error: eventError }) => {
          if (eventError) console.warn('[Eligibility] event insert failed:', eventError.message)
        })
        refresh?.()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, isDraft])

  function handleSelect(value) {
    if (!currentQ) return
    setAnswers(prev => ({ ...prev, [currentQ.id]: value }))
  }

  function handleNext() {
    if (step < questions.length - 1) {
      setStep(s => s + 1)
    } else {
      setStep(questions.length) // advance to results
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  function handleRetake() {
    savedRef.current = false
    setStep(0)
    setAnswers({})
  }

  // ── Result screen ───────────────────────────────────────────────────────────

  if (isComplete) {
    const { score, band, fixes } = scoreAnswers(answers)
    const ctaHref = application ? '/dashboard/application' : '/dashboard'
    const ctaLabel = application ? 'Back to your application' : 'Start financing application'

    return (
      <div className={styles.page}>
        <span className={styles.pill}>Eligibility check</span>
        <h1 className={styles.heading}>Your fundability score</h1>

        <div className={styles.resultCard}>
          <ScoreDial score={score} />

          <span className={`${styles.bandChip} ${BAND_CHIP_CLASS[band] ?? ''}`}>
            {band}
          </span>

          {isDraft && (
            <p className={styles.disclaimer}>
              Result saved to your application for the assessment team.
            </p>
          )}

          {fixes.length > 0 && (
            <div className={styles.fixSection}>
              <h2 className={styles.fixHeading}>Areas to strengthen</h2>
              <ul className={styles.fixList}>
                {fixes.map(fix => (
                  <li key={fix.pillar} className={styles.fixItem}>
                    <span className={styles.fixPillar}>{fix.label}</span>
                    <span className={styles.fixRemediation}>{fix.remediation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link to={ctaHref} className={styles.ctaButton}>
            {ctaLabel}
          </Link>

          <button
            type="button"
            onClick={handleRetake}
            className={styles.retakeButton}
          >
            Retake assessment
          </button>

          <p className={styles.disclaimer}>
            Indicative self-assessment only. It does not constitute an offer, approval, or advice.
          </p>
        </div>
      </div>
    )
  }

  // ── Question screen ─────────────────────────────────────────────────────────

  const progressPct = (step / questions.length) * 100

  return (
    <div className={styles.page}>
      <span className={styles.pill}>Eligibility check</span>
      <h1 className={styles.heading}>Fundability self-check</h1>

      <div className={styles.progressBar} role="progressbar" aria-valuenow={step + 1} aria-valuemax={questions.length}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>
      <p className={styles.progressLabel}>
        Question {step + 1} of {questions.length}
      </p>

      <div className={styles.card}>
        <p className={styles.questionText}>{currentQ.text}</p>

        <ul className={styles.optionsList} role="radiogroup" aria-label={currentQ.text}>
          {currentQ.options.map(opt => {
            const isChecked = currentAnswer === opt.value
            const inputId = `${groupId}-${currentQ.id}-${opt.value}`
            return (
              <li key={opt.value} className={styles.optionItem}>
                <label
                  htmlFor={inputId}
                  className={`${styles.optionLabel} ${isChecked ? styles.optionChecked : ''}`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name={`${groupId}-${currentQ.id}`}
                    value={opt.value}
                    checked={isChecked}
                    onChange={() => handleSelect(opt.value)}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioCustom} aria-hidden="true" />
                  <span className={styles.optionText}>{opt.label}</span>
                </label>
              </li>
            )
          })}
        </ul>

        <div className={styles.navButtons}>
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className={styles.backButton}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswer}
            className={styles.nextButton}
          >
            {step < questions.length - 1 ? 'Next' : 'See results'}
          </button>
        </div>
      </div>
    </div>
  )
}
