import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className={styles.body}>
          Your financing application portal is coming soon. Our team will be in touch with next steps.
        </p>
        <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </div>
    </div>
  )
}
