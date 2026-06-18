import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Dashboard.module.css'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>Staff Console</h1>
        <p className={styles.body}>
          The underwriting console is under development. Signed in as {user?.email}.
        </p>
        <button className={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </div>
    </div>
  )
}
