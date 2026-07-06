import { useState } from 'react'
import styles from './Admin.module.css'

const RESPONSE_TYPES = [
  { value: 'document', label: 'Document upload' },
  { value: 'text',     label: 'Written answer' },
  { value: 'figure',   label: 'Figure' },
]

/**
 * Information-request fields. Used standalone in the Assessment tab and
 * inline inside FindingForm. Pure form: collects values, parent persists.
 */
export default function RfiForm({ initial = {}, onSave, onCancel, saving = false, saveLabel = 'Send request' }) {
  const [prompt, setPrompt] = useState(initial.prompt ?? '')
  const [responseType, setResponseType] = useState(initial.response_type ?? 'document')
  const [dueDate, setDueDate] = useState(initial.due_date ?? '')

  return (
    <div className={styles.inlineForm}>
      <div>
        <div className={styles.fieldLabelSm}>What do you need from the applicant?</div>
        <textarea
          className={styles.noteField}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the item precisely so the applicant can respond in one pass."
          rows={2}
        />
      </div>
      <div className={styles.formRow}>
        <div>
          <div className={styles.fieldLabelSm}>Response type</div>
          <select
            className={styles.stageSelect}
            value={responseType}
            onChange={(e) => setResponseType(e.target.value)}
          >
            {RESPONSE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <div className={styles.fieldLabelSm}>Due date (optional)</div>
          <input
            type="date"
            className={styles.stageSelect}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.formActions}>
        <button
          className={styles.railBtn}
          disabled={saving || !prompt.trim()}
          onClick={() => onSave({
            prompt: prompt.trim(),
            response_type: responseType,
            due_date: dueDate || null,
          })}
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
        <button className={styles.ghostBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}
