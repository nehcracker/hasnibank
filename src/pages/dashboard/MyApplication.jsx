import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import { useRfiResponse } from '@/hooks/useRfiResponse'
import stageMeta from '@/data/stageMeta'
import { financingTracks } from '@/data/financingData'
import {
  overallDraftCompletion,
  canSubmit,
  resolveActionState,
} from '@/lib/applicationState'
import { buildSchedule } from '@/lib/amortisation'
import PhaseRail from './PhaseRail'
import ActionCard from './ActionCard'
import BusinessProfileForm from './BusinessProfileForm'
import styles from './MyApplication.module.css'

const TRACK_LABEL = Object.fromEntries(financingTracks.map((t) => [t.id, t.title]))
const STAGE_LABEL = Object.fromEntries(stageMeta.map((s) => [s.key, s.label]))

const EVENT_META = {
  status_change: { label: 'Status update', to: '/dashboard/application' },
  stage_override: { label: 'Status update', to: '/dashboard/application' },
  note: { label: 'Note', to: '/dashboard/application' },
  document: { label: 'Document', to: '/dashboard/documents' },
  message: { label: 'Message', to: '/dashboard/messages' },
  fee: { label: 'Fee', to: '/dashboard/fees' },
  payment: { label: 'Payment', to: '/dashboard/fees' },
  rfi: { label: 'Information request', to: '/dashboard/application' },
  offer: { label: 'Offer', to: '/dashboard/application' },
  disbursement: { label: 'Disbursement', to: '/dashboard/application' },
}

const RFI_EVENT_DETAIL = {
  requested: 'New item requested by the assessment team',
  responded: 'Your response was sent for review',
  resolved: 'A requested item was resolved',
  returned: 'A request was returned with a reviewer note',
  withdrawn: 'A request was withdrawn',
}

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

/** Activity copy: "{Event label}: {detail}" — colon separator, no em dashes. */
function eventDetail(ev) {
  const payload = ev.payload ?? {}
  switch (ev.event_type) {
    case 'status_change':
      return `Advanced to ${STAGE_LABEL[payload.new_status] ?? payload.new_status}`
    case 'stage_override':
      return `Advanced to ${STAGE_LABEL[payload.to] ?? payload.to}`
    case 'rfi':
      return RFI_EVENT_DETAIL[payload.action] ?? 'Information request updated'
    case 'offer':
      return payload.detail ?? 'Offer updated'
    case 'disbursement':
      return payload.detail ?? 'Disbursement updated'
    case 'note':
      return payload.body ?? 'Note added'
    case 'document':
      return `${payload.file_name ?? 'File'} uploaded`
    case 'message':
      return 'New message in your thread'
    case 'fee':
      return `${payload.label ?? 'Fee'}, ${money(payload.amount ?? 0, payload.currency ?? 'USD')}`
    case 'payment':
      return 'Payment confirmed'
    default:
      return ev.event_type
  }
}

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

/** Mini outstanding-balance sparkline from indicative terms. */
function Sparkline({ principal }) {
  const points = useMemo(() => {
    if (!principal || principal <= 0) return null
    const schedule = buildSchedule({
      principal,
      annualRatePct: 12,
      termMonths: 36,
      frequency: 'monthly',
    })
    const balances = [principal, ...schedule.map((row) => row.balance)]
    const max = Math.max(...balances)
    const w = 120
    const h = 32
    return balances
      .map((b, i) => {
        const x = (i / (balances.length - 1)) * w
        const y = h - (b / max) * (h - 2) - 1
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [principal])

  if (!points) return null
  return (
    <svg
      className={styles.sparkline}
      viewBox="0 0 120 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-gold-soft)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function MyApplication() {
  const { user, profile } = useAuth()
  const { application, loading, refresh, applyUpdate } = useApplication()
  const { events } = useRealtimeEvents(application?.id)

  const [documents, setDocuments] = useState([])
  const [rfis, setRfis] = useState([])
  const [offers, setOffers] = useState([])

  const loadOffers = useCallback(async () => {
    if (!application?.id) return
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('application_id', application.id)
      .order('version', { ascending: false })
    if (error) {
      // Table may not exist yet in this environment — treat as empty list
      console.warn('[MyApplication] offers unavailable:', error.message)
      setOffers([])
    } else {
      setOffers(data ?? [])
    }
  }, [application?.id])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])
  const [formSection, setFormSection] = useState(null) // section key = form open
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const loadRfis = useCallback(async () => {
    if (!application?.id) return
    const { data, error } = await supabase
      .from('information_requests')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: true })
    if (error) {
      // Table may not exist yet in this environment — treat as empty list
      console.warn('[MyApplication] information_requests unavailable:', error.message)
      setRfis([])
    } else {
      setRfis(data ?? [])
    }
  }, [application?.id])

  const { respondRfi, respondingRfiId } = useRfiResponse({
    application,
    user,
    onDone: loadRfis,
  })

  useEffect(() => {
    loadRfis()
  }, [loadRfis])

  // Staff-created requests appear without a refresh
  useEffect(() => {
    if (!application?.id) return
    const channel = supabase
      .channel(`rfis-${application.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'information_requests',
          filter: `application_id=eq.${application.id}`,
        },
        () => loadRfis()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [application?.id, loadRfis])

  useEffect(() => {
    if (!application?.id) return
    let cancelled = false
    supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', application.id)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // Table may not exist yet in this environment — treat as empty list
          console.warn('[MyApplication] application_documents unavailable:', error.message)
          setDocuments([])
        } else {
          setDocuments(data ?? [])
        }
      })
    return () => {
      cancelled = true
    }
  }, [application?.id])

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading your application...</p>
      </div>
    )
  }

  // Overview owns the start flow
  if (!application) {
    return <Navigate to="/dashboard" replace />
  }

  const state = resolveActionState(application, rfis)
  const completionPct = overallDraftCompletion(application)
  const canSubmitNow = canSubmit(application)
  const isDraft = application.status === 'draft'
  const actionMode = ['draft_profile', 'draft_selfcheck', 'rfi_open', 'offer_issued', 'fee_due'].includes(state)
  const openRfiCount = rfis.filter((r) => r.status === 'open').length
  const openDocRequests = rfis.filter(
    (r) => r.status === 'open' && r.response_type === 'document'
  ).length
  const activeOffer =
    offers.find((o) => o.status === 'issued') ??
    offers.find((o) => o.status === 'accepted') ??
    null

  const latestMessage = events.find((ev) => ev.event_type === 'message')

  async function handleSubmit() {
    setSubmitting(true)
    const { error } = await supabase
      .from('applications')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', application.id)

    if (!error) {
      await supabase.from('application_events').insert({
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'status_change',
        payload: { new_status: 'submitted' },
      })
      await refresh()
    } else {
      console.error('[MyApplication] submit error:', error.message)
    }
    setSubmitting(false)
  }

  async function handleAcceptOffer(declared) {
    setAccepting(true)

    // Record acceptance on the versioned offer first (Phase C); the
    // application status change below remains the source of truth for stage
    if (activeOffer && declared) {
      const declaration = `I have read and accept the terms of this offer${
        application.business_profile?.registration?.legalName
          ? ` on behalf of ${application.business_profile.registration.legalName}`
          : ''
      }.`
      const { error: offerError } = await supabase
        .from('offers')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          acceptance_meta: { declaration },
        })
        .eq('id', activeOffer.id)
      if (offerError) {
        console.error('[MyApplication] offer accept error:', offerError.message)
      } else {
        await supabase.from('application_events').insert({
          application_id: application.id,
          actor_id: user.id,
          actor_role: 'borrower',
          event_type: 'offer',
          payload: { detail: `Offer version ${activeOffer.version} accepted` },
        })
        await loadOffers()
      }
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: 'offer_accepted' })
      .eq('id', application.id)

    if (!error) {
      await supabase.from('application_events').insert({
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'status_change',
        payload: { new_status: 'offer_accepted' },
      })
      await refresh()
    } else {
      console.error('[MyApplication] accept error:', error.message)
    }
    setAccepting(false)
  }

  const dateLine = isDraft
    ? `Started ${new Date(application.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
    : `Submitted ${new Date(application.submitted_at ?? application.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}`

  return (
    <div className={styles.page}>
      {/* 1. Header strip */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Your application</h1>
          <p className={styles.subline}>
            {TRACK_LABEL[application.track] ?? application.track}
            {' · '}
            {money(application.amount_sought, application.currency)}
            {profile?.client_ref && <>{' · '}{profile.client_ref}</>}
            {' · '}
            {dateLine}
          </p>
        </div>
        {actionMode ? (
          <span className={styles.pillAction}>
            {isDraft
              ? `Action required · Draft ${completionPct}% complete`
              : state === 'rfi_open'
                ? `Action required · ${openRfiCount} item${openRfiCount === 1 ? '' : 's'} requested`
                : 'Action required'}
          </span>
        ) : (
          <span className={styles.pillMonitor}>
            {state === 'funded' ? 'Funded' : 'In review, no action needed'}
          </span>
        )}
      </header>

      {/* 2. Phase rail */}
      <PhaseRail status={application.status} />

      {/* 3. Action card / business profile form */}
      {formSection && isDraft ? (
        <BusinessProfileForm
          application={application}
          initialSection={formSection}
          onSaved={applyUpdate}
          onClose={() => setFormSection(null)}
        />
      ) : (
        <ActionCard
          state={state}
          application={application}
          completionPct={completionPct}
          canSubmitNow={canSubmitNow}
          submitting={submitting}
          accepting={accepting}
          rfis={rfis}
          respondingRfiId={respondingRfiId}
          offer={activeOffer}
          onResume={(section) => setFormSection(section)}
          onSubmit={handleSubmit}
          onAcceptOffer={handleAcceptOffer}
          onRespondRfi={respondRfi}
        />
      )}

      {/* 4. Supporting row */}
      <div className={styles.supportRow}>
        <Link to="/dashboard/documents" className={styles.supportCard}>
          <h3 className={styles.supportTitle}>Documents</h3>
          <p className={styles.supportValue}>
            {documents.length} uploaded
            {openDocRequests > 0 && (
              <span className={styles.supportMuted}>, {openDocRequests} requested</span>
            )}
          </p>
        </Link>

        <Link to="/dashboard/modelling" className={styles.supportCard}>
          <h3 className={styles.supportTitle}>Repayments</h3>
          <Sparkline principal={Number(application.amount_sought)} />
          <p className={styles.supportMuted}>Indicative balance over 36 months</p>
        </Link>

        <Link to="/dashboard/messages" className={styles.supportCard}>
          <h3 className={styles.supportTitle}>Messages</h3>
          <p className={styles.supportValue}>
            {latestMessage ? eventDetail(latestMessage) : 'No messages yet'}
          </p>
        </Link>
      </div>

      {/* 5. Activity feed */}
      <section className={styles.activity} aria-label="Activity">
        <h2 className={styles.activityTitle}>Activity</h2>
        {events.length === 0 ? (
          <p className={styles.activityEmpty}>No activity recorded yet.</p>
        ) : (
          <ul className={styles.eventList}>
            {events.map((ev) => {
              const meta = EVENT_META[ev.event_type] ?? EVENT_META.note
              return (
                <li key={ev.id} className={styles.eventItem}>
                  <span className={styles.eventDot} />
                  <Link to={meta.to} className={styles.eventLink}>
                    {meta.label}: {eventDetail(ev)}
                  </Link>
                  <span className={styles.eventTime}>{relativeTime(ev.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
