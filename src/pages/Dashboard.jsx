import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ApplicationWizard from './wizard/ApplicationWizard'
import ApplicationStatus from './dashboard/ApplicationStatus'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [wizardState, setWizardState] = useState('loading')
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
          console.error('applications query failed:', error)
          setWizardState('idle')
          return
        }
        if (data) {
          setApplication(data)
          setWizardState('submitted')
        } else {
          setWizardState('idle')
        }
      })
  }, [user])

  function handleComplete(app) {
    setApplication(app)
    setWizardState('submitted')
  }

  if (wizardState === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.body}>Loading…</p>
        </div>
      </div>
    )
  }

  if (wizardState === 'active') {
    return <ApplicationWizard onComplete={handleComplete} />
  }

  if (wizardState === 'submitted') {
    return <ApplicationStatus application={application} />
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className={styles.body}>
          Ready to connect with capital? Start your financing application to be matched with
          our global network of funders and lenders.
        </p>
        <button className={styles.startBtn} onClick={() => setWizardState('active')}>
          Start Application
        </button>
      </div>
    </div>
  )
}
