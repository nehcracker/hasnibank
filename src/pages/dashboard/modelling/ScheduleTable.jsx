import { useMemo, useState } from 'react'
import styles from './Modelling.module.css'

const PREVIEW_ROWS = 12

/**
 * ScheduleTable
 *
 * Renders a period-by-period amortisation schedule with a "Show all" expander.
 * First 12 rows are always visible; remaining rows toggle on demand.
 *
 * @param {{
 *   schedule: Array<{ period: number, payment: number, interest: number, principal: number, balance: number }>,
 *   currency?: string,
 * }} props
 */
export default function ScheduleTable({ schedule, currency = 'USD' }) {
  const fmt = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [currency]
  )
  const [expanded, setExpanded] = useState(false)

  if (!schedule || schedule.length === 0) return null

  const visible = expanded ? schedule : schedule.slice(0, PREVIEW_ROWS)
  const hiddenCount = schedule.length - PREVIEW_ROWS
  // Dated schedules (anchored to the first disbursement) gain a Due date column
  const dated = schedule.some(row => row.dueDate)
  const dateFmt = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })

  return (
    <div className={styles.tableCard}>
      <h3 className={styles.tableTitle}>Repayment schedule</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Period</th>
              {dated && <th>Due date</th>}
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
                {dated && <td>{row.dueDate ? dateFmt(row.dueDate) : ''}</td>}
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
