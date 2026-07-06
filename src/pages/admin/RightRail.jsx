import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EVENT_LABELS, eventDetail } from './adminMeta'
import styles from './Admin.module.css'

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

/**
 * Persistent right rail of the staff workspace: internal notes (staff only),
 * document list with per-item verification, and the activity feed. Stays
 * mounted across tab switches so staff can cross-reference while working.
 */
export default function RightRail({ applicationId, user, documents, events, notes, onChanged }) {
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function addNote() {
    if (!noteBody.trim()) return
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('internal_notes').insert({
      application_id: applicationId,
      body: noteBody.trim(),
      created_by: user.id,
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setNoteBody('')
      onChanged()
    }
    setSaving(false)
  }

  async function verifyDocument(doc) {
    setError(null)
    const { error: updateError } = await supabase
      .from('application_documents')
      .update({ verified_at: new Date().toISOString(), verified_by: user.id })
      .eq('id', doc.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    const { error: eventError } = await supabase.from('application_events').insert({
      application_id: applicationId,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: 'document',
      payload: { action: 'verified', document_type: doc.document_type, label: doc.label },
    })
    if (eventError) console.warn('[RightRail] verify event failed:', eventError.message)
    onChanged()
  }

  return (
    <aside className={styles.rail}>
      <div className={styles.railSection}>
        <h3 className={styles.railTitle}>
          Internal notes <span className={styles.staffOnlyTag}>staff only</span>
        </h3>
        <textarea
          className={styles.noteField}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Add an internal note. Borrowers never see these."
          rows={3}
        />
        <button
          className={styles.railBtn}
          onClick={addNote}
          disabled={saving || !noteBody.trim()}
        >
          {saving ? 'Saving…' : 'Add note'}
        </button>
        {notes.length === 0 ? (
          <p className={styles.railEmpty}>No internal notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={styles.railItem}>
              <p className={styles.railItemBody}>{n.body}</p>
              <span className={styles.railItemMeta}>{shortDate(n.created_at)}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.railSection}>
        <h3 className={styles.railTitle}>Documents</h3>
        {documents.length === 0 ? (
          <p className={styles.railEmpty}>No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={styles.railItem}>
              <p className={styles.railItemBody}>{doc.label || doc.document_type}</p>
              <span className={styles.railItemMeta}>
                Uploaded {shortDate(doc.created_at)}
                {doc.verified_at ? ` · Verified ${shortDate(doc.verified_at)}` : ''}
              </span>
              {!doc.verified_at && (
                <button className={styles.verifyBtn} onClick={() => verifyDocument(doc)}>
                  Verify
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.railSection}>
        <h3 className={styles.railTitle}>Activity</h3>
        {events.length === 0 ? (
          <p className={styles.railEmpty}>No activity recorded yet.</p>
        ) : (
          events.slice(0, 12).map((ev) => (
            <div key={ev.id} className={styles.railItem}>
              <p className={styles.railItemBody}>
                {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                {eventDetail(ev) ? `: ${eventDetail(ev)}` : ''}
              </p>
              <span className={styles.railItemMeta}>{shortDate(ev.created_at)}</span>
            </div>
          ))
        )}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
    </aside>
  )
}
