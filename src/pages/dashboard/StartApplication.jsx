import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { financingTracks } from '@/data/financingData'
import TrackSelect from '@/pages/wizard/steps/TrackSelect'
import styles from './StartApplication.module.css'

const CURRENCIES = ['USD', 'EUR', 'GBP']
const TRACK_IDS = financingTracks.map((t) => t.id)

/**
 * StartApplication — /dashboard/start
 * Track + amount + currency mini-form. Inserts a draft application row and
 * sends the borrower straight into the action-mode workspace.
 */
export default function StartApplication() {
  const { user } = useAuth()
  const { application, loading } = useApplication()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const preselect = searchParams.get('track')
  const [track, setTrack] = useState(TRACK_IDS.includes(preselect) ? preselect : null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // One application per applicant — an existing row goes straight to the workspace
  useEffect(() => {
    if (!loading && application) {
      navigate('/dashboard/application', { replace: true })
    }
  }, [loading, application, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const parsed = parseFloat(amount)
    if (!track) {
      setError('Select a financing track to continue.')
      return
    }
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('applications').insert({
      applicant_id: user.id,
      track,
      amount_sought: parsed,
      currency,
      status: 'draft',
      fields: {},
      business_profile: {},
    })

    if (insertError) {
      // UNIQUE violation: a row already exists — go to the workspace
      if (insertError.code === '23505') {
        navigate('/dashboard/application', { replace: true })
        return
      }
      console.error('[StartApplication] insert error:', insertError.message)
      setError('Could not start your application. Please try again.')
      setSaving(false)
      return
    }

    navigate('/dashboard/application')
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Start your financing application</h1>
        <p className={styles.subline}>
          Choose a track and indicative amount. You can complete the rest of your
          application at your own pace; progress saves automatically.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TrackSelect selectedTrack={track} onSelect={setTrack} />

        <div className={styles.amountRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="amount">
              Amount sought
            </label>
            <input
              id="amount"
              type="number"
              min="1"
              className={styles.input}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500000"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className={styles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={saving}>
          {saving ? 'Starting...' : 'Start application'}
        </button>
      </form>
    </div>
  )
}
