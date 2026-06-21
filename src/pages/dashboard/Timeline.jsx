import styles from './Status.module.css'

const EVENT_LABELS = {
  status_change: 'Status Update',
  note:          'Note',
  document:      'Document',
  message:       'Message',
  fee:           'Fee Added',
  payment:       'Payment',
}

const STAGE_LABELS = {
  submitted: 'Submitted', kyc_verification: 'KYC Verification',
  credit_assessment: 'Credit Assessment', funder_matching: 'Funder Matching',
  term_sheet: 'Term Sheet', offer_issued: 'Offer Issued',
  offer_accepted: 'Offer Accepted', fee_payment: 'Fee Payment', funded: 'Funded',
}

function summarize(event_type, payload) {
  switch (event_type) {
    case 'status_change':
      return `Advanced to ${STAGE_LABELS[payload.new_status] ?? payload.new_status}`
    case 'note':
      return payload.body ?? 'Note added'
    case 'document':
      return `Document uploaded: ${payload.file_name ?? 'file'}`
    case 'message':
      return 'Message sent'
    case 'fee':
      return `Fee added: ${payload.label} — ${payload.currency ?? 'USD'} ${Number(payload.amount).toLocaleString('en-US')}`
    case 'payment':
      return 'Payment confirmed'
    default:
      return event_type
  }
}

export default function Timeline({ events }) {
  if (events.length === 0) {
    return (
      <div className={styles.timeline}>
        <h3 className={styles.timelineTitle}>Activity</h3>
        <p className={styles.emptyTimeline}>No activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.timeline}>
      <h3 className={styles.timelineTitle}>Activity</h3>
      <ul className={styles.eventList}>
        {events.map((ev) => (
          <li key={ev.id} className={styles.eventItem}>
            <div className={styles.eventDot} />
            <div>
              <div className={styles.eventBody}>
                <span className={styles.roleBadge} data-role={ev.actor_role}>
                  {ev.actor_role === 'staff' ? 'Hasni Team' : 'You'}
                </span>
                {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                {' — '}
                {summarize(ev.event_type, ev.payload ?? {})}
              </div>
              <div className={styles.eventMeta}>
                {new Date(ev.created_at).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
