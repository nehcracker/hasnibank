/**
 * useRealtimeEvents
 *
 * Fetches and subscribes to application_events for a given application.
 *
 * MANUAL STEP: Realtime must be enabled on `application_events` and `applications`
 * in Supabase Dashboard → Database → Replication before live updates work.
 *
 * @param {string|null|undefined} applicationId
 * @returns {{ events: object[], unreadCount: number, markAllSeen: () => void }}
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Unique per-instance suffix — see useApplication.js: reusing a channel topic
// across consumers (or a StrictMode remount racing async channel removal)
// throws when postgres_changes callbacks are added after subscribe().
let channelSeq = 0

export function useRealtimeEvents(applicationId) {
  const [events, setEvents] = useState([])
  // Initialise to now so pre-existing events do not count as unread on mount
  const [lastSeenAt, setLastSeenAt] = useState(() => new Date())
  const channelRef = useRef(null)

  useEffect(() => {
    if (!applicationId) {
      setEvents([])
      return
    }

    // Initial fetch — last 20 events newest-first
    supabase
      .from('application_events')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('[useRealtimeEvents] fetch error:', error.message)
          return
        }
        setEvents(data ?? [])
      })

    // Subscribe to new inserts for this application
    const channel = supabase
      .channel(`events-${applicationId}-${++channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'application_events',
          filter: 'application_id=eq.' + applicationId,
        },
        (payload) => {
          setEvents(prev => [payload.new, ...prev])
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [applicationId])

  // Events newer than lastSeenAt are unread
  const unreadCount = events.filter(
    ev => new Date(ev.created_at) > lastSeenAt
  ).length

  // Called when the dropdown opens — clears the unread count
  const markAllSeen = useCallback(() => {
    setLastSeenAt(new Date())
  }, [])

  return { events, unreadCount, markAllSeen }
}
