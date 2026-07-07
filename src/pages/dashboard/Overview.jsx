import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useApplication } from '@/hooks/useApplication'
import { financingTracks } from '@/data/financingData'
import { overallDraftCompletion } from '@/lib/applicationState'
import ServiceCard from '@/components/dashboard/ServiceCard'
import styles from './Overview.module.css'

/** Map track id → display label from the canonical data source */
const TRACK_LABEL = Object.fromEntries(financingTracks.map((t) => [t.id, t.title]))

const SELF_SERVICE_TOOLS = [
  { title: 'Repayment modelling', href: '/dashboard/modelling' },
  { title: 'Eligibility check',   href: '/dashboard/eligibility' },
  { title: 'Documents',           href: '/dashboard/documents' },
  { title: 'Export summary',      href: '/dashboard/export' },
]

function capitalise(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function Overview() {
  const { profile } = useAuth()
  const { application, loading } = useApplication()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const clientRef = profile?.client_ref
  const isDraft = application?.status === 'draft'

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading your overview...</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Welcome, {firstName}</h1>
        {clientRef && (
          <p className={styles.subline}>
            Client ID {clientRef} · quote this on any document or message
          </p>
        )}
      </header>

      {!application ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Financing services</h2>
          <div className={styles.grid}>
            {financingTracks.map((track) => (
              <ServiceCard
                key={track.id}
                badge={track.badge}
                title={track.title}
                description={track.description}
                actionLabel="Apply now"
                href={`/dashboard/start?track=${track.id}`}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your application</h2>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Track</span>
              <span className={styles.summaryValue}>
                {TRACK_LABEL[application.track] ?? application.track}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Amount sought</span>
              <span className={styles.summaryValue}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: application.currency ?? 'USD',
                }).format(application.amount_sought)}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Stage</span>
              <span className={styles.summaryValue}>
                {isDraft
                  ? `Draft · ${overallDraftCompletion(application)}% complete`
                  : capitalise(application.status)}
              </span>
            </div>
            <Link to="/dashboard/application" className={styles.viewLink}>
              {isDraft ? 'Resume' : 'View full application'}
            </Link>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Self-service tools</h2>
        <div className={styles.grid}>
          {SELF_SERVICE_TOOLS.map((tool) => (
            <ServiceCard
              key={tool.href}
              title={tool.title}
              href={tool.href}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
