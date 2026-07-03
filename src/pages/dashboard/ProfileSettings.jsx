import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import styles from './ProfileSettings.module.css'

function ReadOnlyField({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={value ? styles.value : styles.valueEmpty}>
        {value || 'Not provided'}
      </span>
    </div>
  )
}

function InputField({ label, id, value, onChange, type = 'text', autoComplete }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={styles.input}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

export default function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '', company_name: '', country: '', phone: '', occupation: '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // 'saved' | 'error'

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '',
      company_name: profile.company_name ?? '',
      country: profile.country ?? '',
      phone: profile.phone ?? '',
      occupation: profile.occupation ?? '',
    })
  }, [profile])

  function setField(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setStatus(null)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim(),
        country: form.country.trim(),
        phone: form.phone.trim(),
        occupation: form.occupation.trim(),
      })
      .eq('id', user.id)

    if (error) {
      setStatus('error')
    } else {
      await refreshProfile()
      setStatus('saved')
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Profile and settings</h1>

      <form className={styles.card} onSubmit={handleSave} noValidate>
        <ReadOnlyField label="Email" value={user?.email} />
        <div className={styles.divider} />
        <ReadOnlyField label="Client ID" value={profile?.client_ref} />
        <div className={styles.divider} />
        <InputField label="Full name" id="fullName" autoComplete="name"
          value={form.full_name} onChange={setField('full_name')} />
        <InputField label="Company" id="companyName" autoComplete="organization"
          value={form.company_name} onChange={setField('company_name')} />
        <InputField label="Country" id="country" autoComplete="country-name"
          value={form.country} onChange={setField('country')} />
        <InputField label="Phone" id="phone" type="tel" autoComplete="tel"
          value={form.phone} onChange={setField('phone')} />
        <InputField label="Occupation" id="occupation" autoComplete="organization-title"
          value={form.occupation} onChange={setField('occupation')} />

        {status === 'error' && (
          <p className={styles.statusError} role="alert">
            Could not save your changes. Please try again.
          </p>
        )}
        {status === 'saved' && (
          <p className={styles.statusSaved} role="status">Changes saved.</p>
        )}

        <button className={styles.saveBtn} type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className={styles.signOutRow}>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
