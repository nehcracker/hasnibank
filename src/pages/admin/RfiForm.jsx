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
 *
 * Document collection is deferred to post-offer (Phase D): the "Document
 * upload" response type is only offered once `documentsAllowed` is true
 * (the caller passes `hasReachedOffer(application.status)`). The same gate
 * applies to `sectionTemplates`, the extended-section quick-fill buttons —
 * they represent evidence-style requests (collateral, shareholding, banking
 * history, track record) that are also deferred to post-offer.
 */
export default function RfiForm({
  initial = {},
  onSave,
  onCancel,
  saving = false,
  saveLabel = 'Send request',
  documentsAllowed = true,
  sectionTemplates = [],
}) {
  const availableTypes = documentsAllowed
    ? RESPONSE_TYPES
    : RESPONSE_TYPES.filter((t) => t.value !== 'document')

  const [prompt, setPrompt] = useState(initial.prompt ?? '')
  const [responseType, setResponseType] = useState(
    initial.response_type ?? (documentsAllowed ? 'document' : 'text')
  )
  const [dueDate, setDueDate] = useState(initial.due_date ?? '')

  function applyTemplate(section) {
    setPrompt(`${section.label}: ${section.fields.map((f) => f.label).join('; ')}`)
  }

  return (
    <div className={styles.inlineForm}>
      {documentsAllowed && sectionTemplates.length > 0 && (
        <div>
          <div className={styles.fieldLabelSm}>Use an extended-section template</div>
          <div className={styles.formActions}>
            {sectionTemplates.map((section) => (
              <button
                key={section.key}
                type="button"
                className={styles.ghostBtn}
                onClick={() => applyTemplate(section)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      )}
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
            {availableTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {!documentsAllowed && (
            <p className={styles.railItemMeta}>
              Document requests unlock once an offer is issued.
            </p>
          )}
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
