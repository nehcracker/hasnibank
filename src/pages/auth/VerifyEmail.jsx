import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import styles from './Auth.module.css'

export default function VerifyEmail() {
  const email = sessionStorage.getItem('signup_email') || ''
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleResend() {
    if (!email || resending) return
    setResending(true)
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/signup/profile` },
    })
    setResent(true)
    setResending(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Check your email</h1>
        <p className={styles.subheading}>
          We sent a verification link to{' '}
          <strong style={{ color: 'var(--color-ivory)' }}>
            {email || 'your email address'}
          </strong>
          . Click it to activate your account.
        </p>

        {resent ? (
          <p className={styles.footer} style={{ color: 'var(--color-success)' }}>
            Verification email resent.
          </p>
        ) : (
          <p className={styles.footer}>
            Didn't receive it?{' '}
            <button
              onClick={handleResend}
              disabled={resending || !email}
              className={styles.footerLink}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
            >
              {resending ? 'Sending…' : 'Resend email'}
            </button>
          </p>
        )}

        <p className={styles.footer} style={{ marginTop: 'var(--space-4)' }}>
          <Link to="/login" className={styles.footerLink}>Back to login</Link>
        </p>
      </div>
    </div>
  )
}
