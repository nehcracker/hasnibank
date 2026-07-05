import { Fragment } from 'react'
import styles from './Status.module.css'
import stageMeta from '@/data/stageMeta'

// STAGES derived from stageMeta — single source of truth
const STAGES = stageMeta.map(({ key, label }) => ({ key, label }))

export { STAGES }

export default function ProgressTracker({ status }) {
  const currentIdx = stageMeta.findIndex((s) => s.key === status)

  return (
    <div className={styles.trackerWrap}>
      <div className={styles.stages}>
        {stageMeta.map((stage, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'future'
          return (
            <Fragment key={stage.key}>
              {/* SLA copy lives in PhaseRail's expanded segment and the
                  in-review ActionCard, never under individual circles */}
              <div
                className={styles.stageCell}
                data-state={state}
                aria-current={state === 'active' ? 'step' : undefined}
                title={stage.description}
              >
                <div className={styles.stageDot}>
                  {state === 'done' ? '✓' : i + 1}
                </div>
                <span className={styles.stageLabel}>{stage.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={styles.connector} data-state={state} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
