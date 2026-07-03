import { useEffect, useState } from 'react'
import { useApplication } from '@/hooks/useApplication'
import Estimator from './modelling/Estimator'
import ActualSchedule from './modelling/ActualSchedule'
import DscrCalculator from './modelling/DscrCalculator'
import ScenarioCompare from './modelling/ScenarioCompare'
import styles from './modelling/Modelling.module.css'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TERMS = {
  amount: 100000,
  annualRatePct: 12,
  termMonths: 36,
  frequency: 'monthly',
  graceMonths: 0,
  structure: 'amortising',
  balloonPct: 30,
}

const TABS = [
  { id: 'estimator', label: 'Estimator' },
  { id: 'actual', label: 'Actual schedule' },
  { id: 'dscr', label: 'DSCR' },
  { id: 'compare', label: 'Compare' },
]

/** Scenario slot names — max 3 in-memory scenarios. */
const SCENARIO_NAMES = ['A', 'B', 'C']

// ---------------------------------------------------------------------------
// Modelling page
// ---------------------------------------------------------------------------

export default function Modelling() {
  const { application } = useApplication()
  const [activeTab, setActiveTab] = useState('estimator')

  // Terms state is lifted here so sibling tabs (DSCR, Compare) can consume the same scenario.
  const [terms, setTerms] = useState(() => ({
    ...DEFAULT_TERMS,
    // Prefill amount from application when available.
    amount:
      application?.amount_sought != null
        ? Number(application.amount_sought)
        : DEFAULT_TERMS.amount,
  }))

  // In-memory scenario snapshots (max 3, named A / B / C).
  const [scenarios, setScenarios] = useState([])

  // Patch-based updater — only override the keys that changed.
  // Grace must stay strictly below the term or the engine's remaining-period
  // count goes negative and the schedule never closes to zero.
  function handleTermsChange(patch) {
    setTerms(prev => {
      const next = { ...prev, ...patch }
      next.graceMonths = Math.max(0, Math.min(next.graceMonths, next.termMonths - 1))
      return next
    })
  }

  // Snapshot the current terms as the next available scenario slot.
  function saveScenario() {
    if (scenarios.length >= 3) return
    const name = SCENARIO_NAMES[scenarios.length]
    setScenarios(prev => [...prev, { name, terms: { ...terms } }])
  }

  // Once application loads (or changes), sync amount_sought into terms.
  useEffect(() => {
    if (application?.amount_sought != null) {
      setTerms(prev => ({ ...prev, amount: Number(application.amount_sought) }))
    }
  }, [application?.amount_sought])

  const canSave = scenarios.length < 3

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Repayment modelling</h1>
      <p className={styles.subline}>
        Model financing scenarios and review projected repayment schedules before
        committing to a structure.
      </p>

      {/* ── Tab bar ── */}
      <div className={styles.tabBar} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab}${activeTab === tab.id ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Estimator tab ── */}
      {activeTab === 'estimator' && (
        <>
          <div className={styles.saveScenarioBar}>
            <button
              className={`${styles.saveScenarioBtn}${!canSave ? ` ${styles.saveScenarioBtnDisabled}` : ''}`}
              onClick={saveScenario}
              disabled={!canSave}
              title={
                !canSave ? 'All three scenario slots (A, B, C) are in use' : undefined
              }
            >
              {canSave
                ? `Save as scenario ${SCENARIO_NAMES[scenarios.length]}`
                : 'Scenarios full (A / B / C saved)'}
            </button>
            {scenarios.length > 0 && (
              <span className={styles.saveScenarioCount}>
                {scenarios.map(s => s.name).join(', ')} saved
              </span>
            )}
          </div>
          <Estimator terms={terms} onTermsChange={handleTermsChange} />
        </>
      )}

      {/* ── Actual schedule tab ── */}
      {activeTab === 'actual' && (
        <ActualSchedule
          application={application}
          onGoToEstimator={() => setActiveTab('estimator')}
        />
      )}

      {/* ── DSCR calculator tab ── */}
      {activeTab === 'dscr' && <DscrCalculator terms={terms} />}

      {/* ── Scenario compare tab ── */}
      {activeTab === 'compare' && (
        <ScenarioCompare
          scenarios={scenarios}
          onGoToEstimator={() => setActiveTab('estimator')}
        />
      )}
    </div>
  )
}
