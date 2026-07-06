import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { phaseFor } from '@/lib/applicationState'
import { rollupScore, gateCheck } from '@/lib/assessment'
import HeaderBand from './HeaderBand'
import RightRail from './RightRail'
import ApplicationTab from './tabs/ApplicationTab'
import AssessmentTab from './tabs/AssessmentTab'
import OfferTab from './tabs/OfferTab'
import FundingTab from './tabs/FundingTab'
import styles from './Admin.module.css'

const TABS = [
  { key: 'application', label: 'Application' },
  { key: 'assessment',  label: 'Assessment' },
  { key: 'offer',       label: 'Offer' },
  { key: 'funding',     label: 'Funding' },
]

const PHASE_TAB = { 1: 'application', 2: 'assessment', 3: 'offer', 4: 'funding' }

const EMPTY_RELATED = {
  documents: [], events: [], notes: [],
  findings: [], notices: [], rfis: [], offers: [], disbursements: [],
}

/**
 * Fetches all rows of one related table for an application. Phase C tables
 * are created by a manual migration, so a missing table degrades to an
 * empty list instead of breaking the whole workspace.
 */
async function fetchRows(table, applicationId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn(`[ApplicationWorkspace] ${table} unavailable:`, error.message)
    return []
  }
  return data ?? []
}

/**
 * Staff workspace for one application: header band, four phase tabs
 * mirroring the borrower's phases, and a persistent right rail.
 */
export default function ApplicationWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const [application, setApplication] = useState(null)
  const [related, setRelated] = useState(EMPTY_RELATED)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(null)

  const refreshRelated = useCallback(async () => {
    const [documents, events, notes, findings, notices, rfis, offers, disbursements] =
      await Promise.all([
        fetchRows('application_documents', id),
        fetchRows('application_events', id),
        fetchRows('internal_notes', id),
        fetchRows('assessment_findings', id),
        fetchRows('finding_notices', id),
        fetchRows('information_requests', id),
        fetchRows('offers', id),
        fetchRows('disbursements', id),
      ])
    setRelated({ documents, events, notes, findings, notices, rfis, offers, disbursements })
  }, [id])

  const refreshApplication = useCallback(async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*, applicant:profiles!applicant_id(full_name, email, phone, country, occupation, company_name, client_ref)')
      .eq('id', id)
      .single()
    if (error) {
      console.error('[ApplicationWorkspace] load error:', error.message)
      // PGRST116 = zero rows for .single(); anything else is a real failure
      if (error.code !== 'PGRST116') setLoadError(error.message)
      return null
    }
    setApplication(data)
    return data
  }, [id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    refreshApplication().then((app) => {
      if (cancelled) return
      if (app) {
        setActiveTab((current) => current ?? PHASE_TAB[phaseFor(app.status)])
        refreshRelated()
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [refreshApplication, refreshRelated])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.innerWide}><p className={styles.loadingMsg}>Loading…</p></div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className={styles.page}>
        <div className={styles.innerWide}>
          <p className={styles.loadingMsg}>
            {loadError ? `Failed to load application: ${loadError}` : 'Application not found.'}
          </p>
        </div>
      </div>
    )
  }

  const openRfiCount = related.rfis.filter((r) => r.status === 'open').length
  const { total: score } = rollupScore(related.findings)
  const gate = gateCheck(related.findings, related.rfis)
  const tab = activeTab ?? 'application'

  return (
    <div className={styles.page}>
      <div className={styles.innerWide}>
        <Link to="/admin" className={styles.backLink}>← Back to Applications</Link>

        <HeaderBand
          application={application}
          score={score}
          openRfiCount={openRfiCount}
          gate={gate}
          user={user}
          onStatusUpdated={(newStatus) => {
            setApplication((prev) => ({ ...prev, status: newStatus }))
            refreshRelated()
          }}
        />

        <div className={styles.tabStrip} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.workspaceGrid}>
          <div>
            {tab === 'application' && <ApplicationTab application={application} />}
            {tab === 'assessment'  && (
              <AssessmentTab
                application={application}
                findings={related.findings}
                notices={related.notices}
                rfis={related.rfis}
                user={user}
                onChanged={refreshRelated}
              />
            )}
            {tab === 'offer'       && <OfferTab />}
            {tab === 'funding'     && <FundingTab />}
          </div>

          <RightRail
            applicationId={application.id}
            user={user}
            documents={related.documents}
            events={related.events}
            notes={related.notes}
            onChanged={refreshRelated}
          />
        </div>
      </div>
    </div>
  )
}
