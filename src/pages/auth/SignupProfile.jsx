import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './Auth.module.css'

export default function SignupProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile?.profile_complete) navigate('/dashboard', { replace: true })
  }, [profile, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      company_name: companyName,
      country,
      role: 'borrower',
      profile_complete: true,
    })

    if (error) {
      setError('Could not save your profile. Please try again.')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('signup_email')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Complete your profile</h1>
        <p className={styles.subheading}>Tell us about yourself and your business</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error} role="alert">{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              className={styles.input}
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              className={styles.input}
              type="text"
              autoComplete="organization"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="country">Country</label>
            <input
              id="country"
              className={styles.input}
              type="text"
              autoComplete="country-name"
              required
              value={country}
              onChange={e => setCountry(e.target.value)}
            />
          </div>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
