import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { useRfiResponse } from '@/hooks/useRfiResponse'
import { hasReachedOffer } from '@/lib/applicationState'
import styles from './DocumentsPage.module.css'

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Request-driven documents page: uploads happen only when the assessment
 * team asks (document-type information requests). Below the requests,
 * everything already uploaded with its received or verified state.
 */
export default function DocumentsPage() {
  const { user } = useAuth()
  const { application, loading: appLoading } = useApplication()
  const [documents, setDocuments] = useState([])
  const [rfis, setRfis] = useState([])

  const load = useCallback(async () => {
    if (!application?.id) return
    const [docsRes, rfisRes] = await Promise.all([
      supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', application.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('information_requests')
        .select('*')
        .eq('application_id', application.id)
        .eq('response_type', 'document')
        .order('created_at', { ascending: true }),
    ])
    // Tables may not exist yet in this environment — treat as empty lists
    if (docsRes.error) {
      console.warn('[DocumentsPage] application_documents unavailable:', docsRes.error.message)
      setDocuments([])
    } else {
      setDocuments(docsRes.data ?? [])
    }
    if (rfisRes.error) {
      console.warn('[DocumentsPage] information_requests unavailable:', rfisRes.error.message)
      setRfis([])
    } else {
      setRfis(rfisRes.data ?? [])
    }
  }, [application?.id])

  useEffect(() => {
    load()
  }, [load])

  const { respondRfi, respondingRfiId } = useRfiResponse({
    application,
    user,
    onDone: load,
  })

  const openRequests = rfis.filter((r) => r.status === 'open')
  const offerReached = hasReachedOffer(application?.status)

  if (appLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>Loading your documents...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.pill}>Documents</span>
      <h1 className={styles.heading}>Documents</h1>
      <p className={styles.intro}>
        {offerReached
          ? 'You only upload documents when the assessment team requests them. Open requests appear below with everything you have already provided.'
          : 'This page previews what will be requested. Document uploads are collected only once a financing offer has been issued.'}
      </p>

      <section className={styles.section} aria-label="Requested documents">
        <h2 className={styles.sectionTitle}>Requested by the assessment team</h2>
        {openRequests.length === 0 ? (
          <p className={styles.muted}>
            {offerReached
              ? 'Nothing is requested right now. The assessment team will ask here when a document is needed.'
              : 'Nothing to upload yet. Document requests open once an offer is issued.'}
          </p>
        ) : (
          openRequests.map((rfi) => (
            <div key={rfi.id} className={styles.requestRow}>
              <p className={styles.requestPrompt}>{rfi.prompt}</p>
              <p className={styles.muted}>
                {rfi.due_date ? `Needed by ${shortDate(rfi.due_date)}` : 'No due date set'}
              </p>
              <label className={styles.uploadControl}>
                <span className={styles.uploadControlLabel}>
                  {respondingRfiId === rfi.id ? 'Uploading...' : 'Upload response'}
                </span>
                <input
                  type="file"
                  className={styles.fileInput}
                  aria-label="Upload response"
                  disabled={respondingRfiId === rfi.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) respondRfi(rfi, { file })
                  }}
                />
              </label>
            </div>
          ))
        )}
      </section>

      <section className={styles.section} aria-label="Your documents">
        <h2 className={styles.sectionTitle}>Your documents</h2>
        {documents.length === 0 ? (
          <p className={styles.muted}>Nothing uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={styles.docRow}>
              <span className={styles.docLabel}>{doc.label || doc.document_type}</span>
              <span className={doc.verified_at ? styles.docVerified : styles.docReceived}>
                {doc.verified_at
                  ? `Verified ${shortDate(doc.verified_at)}`
                  : `Received ${shortDate(doc.created_at)}`}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
