import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useApplication } from '@/hooks/useApplication'
import { getRequirements, deriveChecklist } from '@/data/docRequirements'
import styles from './DocChecklist.module.css'

// ── Status icons (inline SVG, token-based colours) ────────────────────────

function OutstandingIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-muted)" strokeWidth="1.5" />
    </svg>
  )
}

function ReceivedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-gold)" strokeWidth="1.5" />
      <path
        d="M6.5 10l2.5 2.5 4.5-4.5"
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function VerifiedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-success)" strokeWidth="1.5" />
      <path
        d="M6.5 10l2.5 2.5 4.5-4.5"
        stroke="var(--color-success)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StatusIcon({ status }) {
  if (status === 'verified') {
    return (
      <span className={styles.iconVerified} aria-label="Verified">
        <VerifiedIcon />
      </span>
    )
  }
  if (status === 'received') {
    return (
      <span className={styles.iconReceived} aria-label="Received">
        <ReceivedIcon />
      </span>
    )
  }
  return (
    <span className={styles.iconOutstanding} aria-label="Outstanding">
      <OutstandingIcon />
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DocChecklist() {
  const { application, loading: appLoading } = useApplication()
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)

  useEffect(() => {
    if (!application?.id) return

    let cancelled = false
    setDocsLoading(true)

    supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', application.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Table may not exist yet in this environment — treat as empty list
          console.warn('[DocChecklist] application_documents unavailable:', error.message)
          setDocuments([])
        } else {
          setDocuments(data ?? [])
        }
        setDocsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [application?.id])

  const track = application?.track ?? null
  const requirements = getRequirements(track)
  const checklist = deriveChecklist(requirements, documents)

  const receivedCount = checklist.filter(
    (r) => r.status === 'received' || r.status === 'verified'
  ).length
  const totalCount = checklist.length

  const isLoading = appLoading || docsLoading

  if (isLoading) {
    return (
      <div className={styles.page}>
        <span className={styles.pill}>Documents</span>
        <h1 className={styles.heading}>Document checklist</h1>
        <p className={styles.loadingText}>Loading your checklist...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <span className={styles.pill}>Documents</span>
      <h1 className={styles.heading}>Document checklist</h1>

      {!application && (
        <p className={styles.trackNote}>
          Track-specific items appear once you start an application
        </p>
      )}

      {/* Summary bar */}
      <div className={styles.summaryBar}>
        <span className={styles.summaryText}>
          {receivedCount} of {totalCount} items received
        </span>
        <div className={styles.summaryTrack}>
          <div
            className={styles.summaryFill}
            style={{
              width:
                totalCount > 0
                  ? `${Math.round((receivedCount / totalCount) * 100)}%`
                  : '0%',
            }}
          />
        </div>
      </div>

      {/* Requirement rows */}
      <ul className={styles.list}>
        {checklist.map((item) => (
          <li key={item.type} className={styles.item}>
            <StatusIcon status={item.status} />
            <div className={styles.itemContent}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemDesc}>{item.description}</span>
            </div>
            {item.status === 'outstanding' && (
              <Link to="/dashboard/documents" className={styles.uploadLink}>
                Upload
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
