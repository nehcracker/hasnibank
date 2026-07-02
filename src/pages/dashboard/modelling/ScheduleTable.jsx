import { useState } from 'react'
import styles from './Modelling.module.css'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const PREVIEW_ROWS = 12

/**
 * ScheduleTable
 *
 * Renders a period-by-period amortisation schedule with a "Show all" expander.
 * First 12 rows are always visible; remaining rows toggle on demand.
 *
 * @param {{ schedule: Array<{ period: number, payment: number, interest: number, principal: number, balance: number }> }} props
 */
export default function ScheduleTable({ schedule }) {
  const [expanded, setExpanded] = useState(false)

  if (!schedule || schedule.length === 0) return null

  const visible = expanded ? schedule : schedule.slice(0, PREVIEW_ROWS)
  const hiddenCount = schedule.length - PREVIEW_ROWS

  return (
    <div className={styles.tableCard}>
      <h3 className={styles.tableTitle}>Repayment schedule</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Period</th>
              <th>Payment</th>
              <th>Interest</th>
              <th>Principal</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr key={row.period}>
                <td>{row.period}</td>
                <td>{fmt.format(row.payment)}</td>
                <td>{fmt.format(row.interest)}</td>
                <td>{fmt.format(row.principal)}</td>
                <td>{fmt.format(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.length > PREVIEW_ROWS && (
        <div className={styles.tableFooter}>
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded
              ? 'Show fewer periods'
              : `Show all ${schedule.length} periods (${hiddenCount} more)`}
          </button>
        </div>
      )}
    </div>
  )
}
