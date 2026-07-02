import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './ProfileSettings.module.css'

export default function ProfileSettings() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function Field({ label, value }) {
    return (
      <div className={styles.field}>
        <span className={styles.label}>{label}</span>
        <span className={value ? styles.value : styles.valueEmpty}>
          {value || 'Not provided'}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Profile and settings</h1>

      <div className={styles.card}>
        <Field label="Full name"     value={profile?.full_name} />
        <div className={styles.divider} />
        <Field label="Company"       value={profile?.company_name} />
        <div className={styles.divider} />
        <Field label="Client ID"     value={profile?.client_ref} />
        <div className={styles.divider} />
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
