import { useState } from 'react'
import stageMeta, { PHASES } from '@/data/stageMeta'
import { phaseFor } from '@/lib/applicationState'
import ProgressTracker from './ProgressTracker'
import styles from './PhaseRail.module.css'

const STAGE_BY_KEY = Object.fromEntries(stageMeta.map((s) => [s.key, s]))

/** `draft` has no stageMeta entry — give it a borrower-facing label. */
function stageLabel(statusKey) {
  return STAGE_BY_KEY[statusKey]?.label ?? 'Draft'
}

/**
 * PhaseRail — the 9 staff stages condensed into 4 borrower phases.
 * The active phase expands to show its internal steps and the SLA for the
 * current stage. A toggle reveals the full 9-stage ProgressTracker.
 */
export default function PhaseRail({ status }) {
  const [detailOpen, setDetailOpen] = useState(false)
  const activePhase = phaseFor(status)
  const currentStage = STAGE_BY_KEY[status]

  return (
    <div className={styles.wrap}>
      <div className={styles.rail}>
        {PHASES.map(({ phase, label, statuses }) => {
          const state =
            phase < activePhase ? 'done' : phase === activePhase ? 'active' : 'future'
          return (
            <div
              key={phase}
              className={styles.segment}
              data-state={state}
              data-testid="phase-segment"
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <div className={styles.segmentHead}>
                <span className={styles.phaseNum}>{state === 'done' ? '✓' : phase}</span>
                <span className={styles.phaseLabel}>{label}</span>
              </div>
              <div className={styles.fillBar} data-state={state} />
              {state === 'active' && (
                <div className={styles.expanded}>
                  <ul className={styles.stepList}>
                    {statuses.map((key) => (
                      <li
                        key={key}
                        className={styles.step}
                        data-current={key === status || undefined}
                        title={STAGE_BY_KEY[key]?.description}
                      >
                        {stageLabel(key)}
                      </li>
                    ))}
                  </ul>
                  {currentStage?.slaDays && (
                    <p className={styles.sla}>
                      typically {currentStage.slaDays[0]} to {currentStage.slaDays[1]} business days
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className={styles.detailToggle}
        onClick={() => setDetailOpen((v) => !v)}
      >
        {detailOpen ? 'Hide detailed stages' : 'View all 9 stages'}
      </button>

      {detailOpen && <ProgressTracker status={status} />}
    </div>
  )
}
