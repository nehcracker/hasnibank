import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ProgressTracker from './ProgressTracker'
import Timeline from './Timeline'
import ActionZone from './ActionZone'
import styles from './Status.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing',
  project: 'Project Funding',
  trade: 'Trade Finance',
  acquisition: 'Acquisition Finance',
}

export default function ApplicationStatus({ application: initial }) {
  const { user } = useAuth()
  const [application, setApplication] = useState(initial)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    supabase
      .from('application_events')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? [])
        setEventsLoading(false)
      })
  }, [application.id])

  async function handleAcceptOffer() {
    setAccepting(true)
    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status: 'offer_accepted' })
      .eq('id', application.id)
      .select()
      .single()

    if (!error && updated) {
      const newEvent = {
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'status_change',
        payload: { new_status: 'offer_accepted' },
      }
      await supabase.from('application_events').insert(newEvent)
      setApplication(updated)
      setEvents((prev) => [
        ...prev,
        { ...newEvent, id: crypto.randomUUID(), created_at: new Date().toISOString() },
      ])
    }
    setAccepting(false)
  }

  return (
    <div className={styles.statusPage}>
      <div className={styles.statusInner}>
        <h1 className={styles.statusHeading}>Your Application</h1>
        <p className={styles.statusMeta}>
          <strong>{TRACK_LABELS[application.track]}</strong>
          {' · '}
          {application.currency}{' '}
          {Number(application.amount_sought).toLocaleString('en-US')}
          {' · Submitted '}
          {new Date(application.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>

        <ProgressTracker status={application.status} />

        <ActionZone
          status={application.status}
          onAcceptOffer={handleAcceptOffer}
          accepting={accepting}
        />

        {eventsLoading ? (
          <p className={styles.loadingMsg}>Loading activity…</p>
        ) : (
          <Timeline events={events} />
        )}
      </div>
    </div>
  )
}
