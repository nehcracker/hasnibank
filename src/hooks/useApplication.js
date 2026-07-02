import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * useApplication
 *
 * Fetches the current user's single financing application on mount.
 * Exposes a refresh() function so callers (e.g. Overview) can re-fetch
 * after the wizard completes.
 *
 * @returns {{ application: object|null, loading: boolean, refresh: () => Promise<void> }}
 */
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

  useEffect(() => {
    refresh()
  }, [refresh])

  return { application, loading, refresh }
}
