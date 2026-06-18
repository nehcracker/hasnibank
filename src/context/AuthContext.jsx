import { createContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const AuthContext = createContext(null)

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session ?? null)
      if (session) {
        const p = await fetchProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session ?? null)
        if (session) {
          const p = await fetchProfile(session.user.id)
          setProfile(p)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
