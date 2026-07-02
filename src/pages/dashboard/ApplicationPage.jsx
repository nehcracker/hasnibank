import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ApplicationStatus from './ApplicationStatus'
import styles from './Stub.module.css'

/**
 * ApplicationPage
 * Shows ApplicationStatus when a submitted application exists,
 * otherwise renders a premium empty state.
 */
export default function ApplicationPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('loading') // 'loading' | 'exists' | 'none'
  const [application, setApplication] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('applications')
      .select('*')
      .eq('applicant_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[ApplicationPage]', error)
          setStatus('none')
          return
        }
        if (data) {
          setApplication(data)
          setStatus('exists')
        } else {
          setStatus('none')
        }
      })
  }, [user])

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <p className={styles.body}>Loading…</p>
      </div>
    )
  }

  if (status === 'exists') {
    return <ApplicationStatus application={application} />
  }

  return (
    <div className={styles.page}>
      <span className={styles.pill}>Application</span>
      <h1 className={styles.heading}>My application</h1>
      <p className={styles.body}>
        Your application details will appear here once you have submitted a financing request.
        Use the start button on your overview to begin.
      </p>
    </div>
  )
}
