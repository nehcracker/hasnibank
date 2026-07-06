import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_PILLARS, SEVERITY_LABELS } from '@/lib/assessment'
import styles from './Admin.module.css'

/**
 * Records one assessment finding: pillar, severity, score contribution,
 * the internal note (staff only), an optional borrower-visible statement
 * (split finding_notices table), and an optional linked RFI.
 */
export default function FindingForm({ applicationId, user, onSaved, onCancel }) {
  const [pillar, setPillar] = useState(ASSESSMENT_PILLARS[0].key)
  const [severity, setSeverity] = useState('informational')
  const [score, setScore] = useState('0')
  const [internalNote, setInternalNote] = useState('')
  const [statement, setStatement] = useState('')
  const [withRfi, setWithRfi] = useState(false)
  const [rfiPrompt, setRfiPrompt] = useState('')
  const [rfiType, setRfiType] = useState('document')
  const [rfiDue, setRfiDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const pillarMax = ASSESSMENT_PILLARS.find((p) => p.key === pillar)?.max ?? 0

  async function save() {
    setSaving(true)
    setError(null)

    const { data: finding, error: findingError } = await supabase
      .from('assessment_findings')
      .insert({
        application_id: applicationId,
        pillar,
        severity,
        score: Math.min(Math.max(Number(score) || 0, 0), pillarMax),
        internal_note: internalNote.trim() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (findingError) {
      setError(findingError.message)
      setSaving(false)
      return
    }

    if (statement.trim()) {
      const { error: noticeError } = await supabase.from('finding_notices').insert({
        finding_id: finding.id,
        application_id: applicationId,
        statement: statement.trim(),
      })
      if (noticeError) {
        setError(`Finding saved, but the applicant statement failed: ${noticeError.message}`)
        setSaving(false)
        return
      }
    }

    if (withRfi && rfiPrompt.trim()) {
      const { error: rfiError } = await supabase.from('information_requests').insert({
        application_id: applicationId,
        finding_id: finding.id,
        prompt: rfiPrompt.trim(),
        response_type: rfiType,
        due_date: rfiDue || null,
        created_by: user.id,
      })
      if (rfiError) {
        setError(`Finding saved, but the information request failed: ${rfiError.message}`)
        setSaving(false)
        return
      }
      await supabase.from('application_events').insert({
        application_id: applicationId,
        actor_id: user.id,
        actor_role: 'staff',
        event_type: 'rfi',
        payload: { action: 'requested', prompt: rfiPrompt.trim() },
      })
    }

    // Generic audit entry; internal content never enters the borrower-readable feed
    await supabase.from('application_events').insert({
      application_id: applicationId,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: 'note',
      payload: { detail: 'Assessment updated' },
    })

    setSaving(false)
    onSaved()
  }

  return (
    <div className={styles.inlineForm}>
      <div className={styles.formRow}>
        <div>
          <div className={styles.fieldLabelSm}>Pillar</div>
          <select className={styles.stageSelect} value={pillar} onChange={(e) => setPillar(e.target.value)}>
            {ASSESSMENT_PILLARS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div className={styles.fieldLabelSm}>Severity</div>
          <select className={styles.stageSelect} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <div className={styles.fieldLabelSm}>Score (0 to {pillarMax})</div>
          <input
            type="number"
            className={styles.stageSelect}
            min="0"
            max={pillarMax}
            step="0.25"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className={styles.fieldLabelSm}>Internal note (staff only)</div>
        <textarea
          className={styles.noteField}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          placeholder="Your working assessment. Never shown to the applicant."
          rows={2}
        />
      </div>

      <div>
        <div className={styles.fieldLabelSm}>Statement visible to the applicant (optional)</div>
        <textarea
          className={styles.noteField}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="A clear, neutral statement the applicant will see."
          rows={2}
        />
      </div>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={withRfi}
          onChange={(e) => setWithRfi(e.target.checked)}
        />
        Also request information from the applicant
      </label>

      {withRfi && (
        <>
          <div>
            <div className={styles.fieldLabelSm}>Request</div>
            <textarea
              className={styles.noteField}
              value={rfiPrompt}
              onChange={(e) => setRfiPrompt(e.target.value)}
              placeholder="What exactly should the applicant provide?"
              rows={2}
            />
          </div>
          <div className={styles.formRow}>
            <div>
              <div className={styles.fieldLabelSm}>Response type</div>
              <select className={styles.stageSelect} value={rfiType} onChange={(e) => setRfiType(e.target.value)}>
                <option value="document">Document upload</option>
                <option value="text">Written answer</option>
                <option value="figure">Figure</option>
              </select>
            </div>
            <div>
              <div className={styles.fieldLabelSm}>Due date (optional)</div>
              <input
                type="date"
                className={styles.stageSelect}
                value={rfiDue}
                onChange={(e) => setRfiDue(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className={styles.formActions}>
        <button className={styles.railBtn} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save finding'}
        </button>
        <button className={styles.ghostBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  )
}
