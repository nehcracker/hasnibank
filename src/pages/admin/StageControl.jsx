import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './Admin.module.css'

const STAGES = [
  { key: 'submitted',         label: 'Submitted' },
  { key: 'kyc_verification',  label: 'KYC Verification' },
  { key: 'credit_assessment', label: 'Credit Assessment' },
  { key: 'funder_matching',   label: 'Funder Matching' },
  { key: 'term_sheet',        label: 'Term Sheet' },
  { key: 'offer_issued',      label: 'Offer Issued' },
  { key: 'offer_accepted',    label: 'Offer Accepted' },
  { key: 'fee_payment',       label: 'Fee Payment' },
  { key: 'funded',            label: 'Funded' },
]

export default function StageControl({ applicationId, currentStatus, userId, onUpdated }) {
  const [selected, setSelected] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleUpdate() {
    setUpdating(true)
    setError(null)
    setSuccess(false)

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: selected })
      .eq('id', applicationId)

    if (updateError) {
      setError(updateError.message)
      setUpdating(false)
      return
    }

    const payload = { new_status: selected }
    if (note.trim()) payload.note = note.trim()

    const { error: eventError } = await supabase.from('application_events').insert({
      application_id: applicationId,
      actor_id: userId,
      actor_role: 'staff',
      event_type: 'status_change',
      payload,
    })

    if (eventError) {
      console.error('Event insert failed:', eventError)
      setError('Status updated, but the audit trail entry failed. Please refresh.')
      setUpdating(false)
      return
    }

    setNote('')
    setSuccess(true)
    setUpdating(false)
    onUpdated(selected)
  }

  return (
    <div className={styles.stageControl}>
      <div>
        <div className={styles.fieldLabelSm}>Stage</div>
        <select
          className={styles.stageSelect}
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setSuccess(false) }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <div className={styles.fieldLabelSm}>Note (optional)</div>
        <textarea
          className={styles.noteField}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for this stage change…"
        />
      </div>
      <button
        className={styles.updateBtn}
        onClick={handleUpdate}
        disabled={updating}
      >
        {updating ? 'Updating…' : 'Update Status'}
      </button>
      {error   && <p className={styles.errorMsg}>{error}</p>}
      {success && <p className={styles.successMsg}>Status updated successfully.</p>}
    </div>
  )
}
