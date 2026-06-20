import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import ApplicationWizard from './wizard/ApplicationWizard'
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
      .then(({ data }) => {
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
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.heading}>Application Submitted</h1>
          <p className={styles.body}>
            Thank you{profile?.full_name ? `, ${profile.full_name}` : ''}. Your financing application
            has been received. Our team will review it and be in touch with next steps.
          </p>
          <p className={styles.meta}>
            Track: <strong>{TRACK_LABELS[application?.track]}</strong>
            &nbsp;·&nbsp;
            Amount sought: <strong>USD {Number(application?.amount_sought).toLocaleString('en-US')}</strong>
          </p>
        </div>
      </div>
    )
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

const TRACK_LABELS = {
  sme: 'SME Financing',
  project: 'Project Funding',
  trade: 'Trade Finance',
  acquisition: 'Acquisition Finance',
}
