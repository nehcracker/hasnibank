import { useEffect, useState } from 'react'
import { useApplication } from '@/hooks/useApplication'
import Estimator from './modelling/Estimator'
import styles from './modelling/Modelling.module.css'

// ---------------------------------------------------------------------------
// Default scenario terms
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

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'estimator', label: 'Estimator' },
  { id: 'actual', label: 'Actual schedule' },
  { id: 'dscr', label: 'DSCR' },
  { id: 'compare', label: 'Compare' },
]

const PLACEHOLDERS = {
  actual: 'Your repayment schedule appears here once an offer is issued.',
  dscr: 'DSCR calculator arrives with the next update.',
  compare: 'Scenario comparison arrives with the next update.',
}

// ---------------------------------------------------------------------------
// Modelling page
// ---------------------------------------------------------------------------

export default function Modelling() {
  const { application } = useApplication()
  const [activeTab, setActiveTab] = useState('estimator')

  // Terms state is lifted here so future tabs (e.g. DSCR) can consume the same scenario.
  const [terms, setTerms] = useState(() => ({
    ...DEFAULT_TERMS,
    // Prefill amount from application when available.
    amount:
      application?.amount_sought != null
        ? Number(application.amount_sought)
        : DEFAULT_TERMS.amount,
  }))

  // Patch-based updater — only override the keys that changed.
  function handleTermsChange(patch) {
    setTerms(prev => ({ ...prev, ...patch }))
  }

  // Once application loads (or changes), sync amount_sought into terms.
  useEffect(() => {
    if (application?.amount_sought != null) {
      setTerms(prev => ({ ...prev, amount: Number(application.amount_sought) }))
    }
  }, [application?.amount_sought])

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

      {/* ── Tab content ── */}
      {activeTab === 'estimator' && (
        <Estimator terms={terms} onTermsChange={handleTermsChange} />
      )}

      {activeTab !== 'estimator' && (
        <p className={styles.placeholder}>{PLACEHOLDERS[activeTab]}</p>
      )}
    </div>
  )
}
