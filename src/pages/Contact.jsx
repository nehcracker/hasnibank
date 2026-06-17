import { useState } from 'react'
import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import Hero from '@/components/sections/Hero'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import Button from '@/components/ui/Button'
import styles from './Contact.module.css'

const financingTypes = [
  'SME Working Capital',
  'Equipment Finance',
  'Business Expansion',
  'Trade Finance',
  'Infrastructure / Project Debt',
  'Project Equity',
  'Structured Finance',
  'Acquisition Finance',
  'Other',
]

const INITIAL = {
  fullName: '', companyName: '', email: '', country: '',
  fundingRequirement: '', financingType: '', projectDescription: '',
}

export default function Contact() {
  useSEO(seoConfig.contact)
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  function validate(data) {
    const errs = {}
    if (!data.fullName.trim())           errs.fullName = 'Full name is required'
    if (!data.companyName.trim())        errs.companyName = 'Company name is required'
    if (!data.email.trim())              errs.email = 'Email is required'
    if (!data.country.trim())            errs.country = 'Country is required'
    if (!data.fundingRequirement.trim()) errs.fundingRequirement = 'Funding requirement is required'
    if (!data.financingType)             errs.financingType = 'Please select a financing type'
    if (!data.projectDescription.trim()) errs.projectDescription = 'Project description is required'
    return errs
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(errs => ({ ...errs, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setStatus('loading')
    try {
      const res = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json()
        if (data.errors) setErrors(data.errors)
        setStatus('idle')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <>
        <Hero imageKey="contact" badge="Contact" heading="Thank You" />
        <section className={styles.section}>
          <Container>
            <div className={styles.successBox}>
              <h2 className={styles.successHeading}>Application Received</h2>
              <p className={styles.successBody}>
                Thank you for submitting your financing requirement. Our financing team will review your application and respond with next steps within 3–5 business days.
              </p>
            </div>
          </Container>
        </section>
      </>
    )
  }

  return (
    <>
      <Hero
        imageKey="contact"
        badge="Apply for Financing"
        heading="Tell Us About Your Requirement"
        subheading="Complete the form below and our team will assess your financing need and connect you with the right funders."
      />
      <section className={styles.section}>
        <Container>
          <div className={styles.formWrap}>
            <SectionHeading
              label="Application"
              title="Financing Inquiry"
              subtitle="All fields are required. Your information is treated with complete confidentiality."
              align="left"
            />
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              <div className={styles.row}>
                <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} error={errors.fullName} />
                <Field label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} />
              </div>
              <div className={styles.row}>
                <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
                <Field label="Country" name="country" value={form.country} onChange={handleChange} error={errors.country} />
              </div>
              <div className={styles.row}>
                <Field label="Funding Requirement (e.g. $2M working capital)" name="fundingRequirement" value={form.fundingRequirement} onChange={handleChange} error={errors.fundingRequirement} />
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Financing Type</label>
                  <select
                    name="financingType"
                    value={form.financingType}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.financingType ? styles.inputError : ''}`}
                  >
                    <option value="">Select a type…</option>
                    {financingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.financingType && <p className={styles.errorMsg}>{errors.financingType}</p>}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Project / Business Description</label>
                <textarea
                  name="projectDescription"
                  value={form.projectDescription}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe your project or business and how the financing will be used…"
                  className={`${styles.input} ${styles.textarea} ${errors.projectDescription ? styles.inputError : ''}`}
                />
                {errors.projectDescription && <p className={styles.errorMsg}>{errors.projectDescription}</p>}
              </div>
              {status === 'error' && (
                <p className={styles.serverError}>Something went wrong. Please try again.</p>
              )}
              <Button type="submit" variant="primary" className={styles.submit}>
                {status === 'loading' ? 'Submitting…' : 'Submit Application'}
              </Button>
            </form>
          </div>
        </Container>
      </section>
    </>
  )
}

function Field({ label, name, type = 'text', value, onChange, error }) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  )
}
