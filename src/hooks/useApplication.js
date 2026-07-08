import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * useApplication
 *
 * Fetches the current user's single financing application on mount.
 * Subscribes to realtime UPDATE events on the applications table so that
 * status changes made by staff propagate to the borrower view without a reload.
 * Exposes a refresh() function so callers (e.g. Overview) can re-fetch
 * after the wizard completes.
 *
 * MANUAL STEP: Realtime must be enabled on `applications` in Supabase
 * Dashboard → Database → Replication for live status updates to work.
 *
 * @returns {{ application: object|null, loading: boolean, refresh: () => Promise<void>, applyUpdate: (row: object) => void }}
 */
// Channel topics must be unique per hook instance: supabase.channel() returns
// the existing channel for an already-registered topic, and adding
// postgres_changes callbacks to a channel that another consumer has already
// subscribed throws — which unmounted the whole dashboard tree.
let channelSeq = 0

export function useApplication() {
  const { user } = useAuth()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('applicant_id', user.id)
      .maybeSingle()
    if (error) {
      console.error('[useApplication] fetch error:', error.message)
      setApplication(null)
    } else {
      setApplication(data)
    }
    setLoading(false)
  }, [user])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  /**
   * Applies a row the caller already fetched (e.g. an update's `.select()`
   * result) directly to state, with no network round trip and no `loading`
   * toggle. Callers that autosave on a timer (BusinessProfileForm) must use
   * this instead of refresh() — refresh()'s loading flip causes consumers
   * that branch on `loading` to unmount their active view on every save.
   */
  const applyUpdate = useCallback((row) => {
    setApplication(row)
  }, [])

  // Realtime subscription — UPDATE on this user's application row
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`application-status-${user.id}-${++channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: 'applicant_id=eq.' + user.id,
        },
        (payload) => {
          setApplication(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return { application, loading, refresh, applyUpdate }
}
