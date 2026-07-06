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

const CLEAR_GATE = { criticalOpen: 0, rfisOpen: 0, clear: true }

export default function StageControl({
  applicationId,
  currentStatus,
  userId,
  onUpdated,
  gate = CLEAR_GATE,
}) {
  const [selected, setSelected] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirmingOverride, setConfirmingOverride] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function handleUpdateClick() {
    // Warn, never block: unresolved critical findings or open requests
    // require an explicit, audited override before the stage moves.
    if (!gate.clear && selected !== currentStatus && !confirmingOverride) {
      setConfirmingOverride(true)
      return
    }
    performUpdate(!gate.clear && selected !== currentStatus)
  }

  async function performUpdate(isOverride) {
    setUpdating(true)
    setError(null)
    setSuccess(false)
    setConfirmingOverride(false)

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

    if (isOverride) {
      const { error: overrideError } = await supabase.from('application_events').insert({
        application_id: applicationId,
        actor_id: userId,
        actor_role: 'staff',
        event_type: 'stage_override',
        payload: {
          from: currentStatus,
          to: selected,
          critical_open: gate.criticalOpen,
          rfis_open: gate.rfisOpen,
        },
      })
      if (overrideError) console.error('Override event insert failed:', overrideError)
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
          onChange={(e) => {
            setSelected(e.target.value)
            setSuccess(false)
            setConfirmingOverride(false)
          }}
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

      {confirmingOverride ? (
        <div className={styles.overrideConfirm}>
          <p className={styles.overrideText}>
            Advancing with {gate.criticalOpen} critical finding
            {gate.criticalOpen === 1 ? '' : 's'} and {gate.rfisOpen} open request
            {gate.rfisOpen === 1 ? '' : 's'} will be logged as an override.
          </p>
          <div className={styles.formActions}>
            <button
              className={styles.updateBtn}
              onClick={() => performUpdate(true)}
              disabled={updating}
            >
              {updating ? 'Updating…' : 'Advance anyway'}
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => setConfirmingOverride(false)}
              disabled={updating}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className={styles.updateBtn}
          onClick={handleUpdateClick}
          disabled={updating}
        >
          {updating ? 'Updating…' : 'Update Status'}
        </button>
      )}

      {error   && <p className={styles.errorMsg}>{error}</p>}
      {success && <p className={styles.successMsg}>Status updated successfully.</p>}
    </div>
  )
}
