import { supabase } from '@/lib/supabase'
import { EXTENDED_SECTIONS, getExtendedSections } from '@/data/extendedSections'
import { questions as eligibilityQuestions } from '@/data/eligibilityModel'
import { FIELD_LABELS } from '../adminMeta'
import styles from '../Admin.module.css'

const PROFILE_SECTION_META = [
  { key: 'registration', label: 'Registration details' },
  { key: 'trading',      label: 'Sector and trading history' },
  { key: 'financials',   label: 'Revenue and obligations' },
]

const PROFILE_FIELD_LABELS = {
  legalName: 'Legal company name', registrationNumber: 'Registration number',
  country: 'Country of incorporation', dateIncorporated: 'Date incorporated',
  sector: 'Sector', yearsTrading: 'Years trading', staffCount: 'Staff count',
  revenueBand: 'Annual revenue band', existingDebt: 'Existing debt',
  debtDetail: 'Debt detail',
  directors: 'Directors', ownership: 'Ownership breakdown',
  pepDeclaration: 'PEP declaration', collateralType: 'Collateral type',
  ownershipEvidence: 'Ownership evidence', estimatedValue: 'Estimated value',
  revenueHistory: 'Revenue history', facilities: 'Existing facilities',
  experience: 'Management experience',
}

/**
 * Key claims and the document expected to evidence each. Markers are set by
 * staff and persisted in application_events payloads — latest event wins.
 */
const EVIDENCE_PAIRS = [
  {
    key: 'registration',
    claim: 'Registration details',
    docType: 'certificate_of_incorporation',
    docLabel: 'Certificate of Incorporation',
  },
  {
    key: 'revenue',
    claim: 'Declared revenue',
    docType: 'bank_statements_12m',
    docLabel: '12-Month Bank Statements',
  },
  {
    key: 'identity',
    claim: 'Directors and ownership',
    docType: 'director_id',
    docLabel: 'Director / Owner ID',
  },
  {
    key: 'collateral',
    claim: 'Collateral',
    docType: 'ownership_evidence',
    docLabel: 'Ownership evidence',
  },
]

const MARKER_STATES = [
  { value: 'consistent',   label: 'Consistent' },
  { value: 'inconsistent', label: 'Inconsistent' },
  { value: 'unverified',   label: 'Unverified' },
]

/** Latest consistency marker per pair from the (desc-ordered) events feed. */
function markersFromEvents(events) {
  const markers = {}
  for (const ev of events) {
    const p = ev.payload ?? {}
    if (p.action === 'consistency_marker' && p.pair && !(p.pair in markers)) {
      markers[p.pair] = p.state
    }
  }
  return markers
}

function FieldRows({ entries, labels }) {
  const visible = entries.filter(
    ([, val]) => val !== '' && val !== null && val !== undefined
  )
  if (visible.length === 0) {
    return <p className={styles.muted}>Not provided yet.</p>
  }
  return visible.map(([key, val]) => (
    <div key={key} className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{labels[key] ?? key}</span>
      <span className={styles.fieldValue}>{String(val)}</span>
    </div>
  ))
}

/**
 * Application tab: submitted values on the left; on the right, the
 * field-versus-evidence consistency view and staff-toggled extended intake.
 */
export default function ApplicationTab({ application, documents, events, user, onChanged }) {
  const fields = application.fields ?? {}
  const applicant = application.applicant ?? {}
  const businessProfile = application.business_profile ?? {}
  const requiredSections = application.required_sections ?? []
  const markers = markersFromEvents(events)

  async function setMarker(pairKey, state) {
    const { error } = await supabase.from('application_events').insert({
      application_id: application.id,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: 'note',
      payload: { action: 'consistency_marker', pair: pairKey, state },
    })
    if (error) {
      console.error('[ApplicationTab] marker save failed:', error.message)
      return
    }
    onChanged()
  }

  async function toggleSection(sectionKey, enabled) {
    const next = enabled
      ? [...new Set([...requiredSections, sectionKey])]
      : requiredSections.filter((k) => k !== sectionKey)
    const { error } = await supabase
      .from('applications')
      .update({ required_sections: next })
      .eq('id', application.id)
    if (error) {
      console.error('[ApplicationTab] required_sections update failed:', error.message)
      return
    }
    onChanged()
  }

  return (
    <div className={styles.appTabGrid}>
      {/* Left: everything the applicant submitted */}
      <div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Applicant</h2>
          <FieldRows
            labels={{}}
            entries={[
              ['Name', applicant.full_name],
              ['Email', applicant.email],
              ['Phone', applicant.phone],
              ['Country', applicant.country],
              ['Occupation', applicant.occupation],
              ['Company', applicant.company_name],
              ['Client ID', applicant.client_ref],
            ]}
          />
        </div>

        {PROFILE_SECTION_META.map(({ key, label }) => (
          <div key={key} className={styles.section}>
            <h2 className={styles.sectionTitle}>{label}</h2>
            <FieldRows
              entries={Object.entries(businessProfile[key] ?? {})}
              labels={PROFILE_FIELD_LABELS}
            />
          </div>
        ))}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Funding purpose</h2>
          <FieldRows entries={Object.entries(fields)} labels={FIELD_LABELS} />
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Fundability self-check</h2>
          {application.eligibility ? (
            <>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Score</span>
                <span className={styles.fieldValue}>
                  {Number(application.eligibility.score).toFixed(1)} / 10 ·{' '}
                  {application.eligibility.band}
                </span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Completed</span>
                <span className={styles.fieldValue}>
                  {new Date(application.eligibility.completed_at).toLocaleDateString('en-US', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </div>
              {eligibilityQuestions.map((q) => {
                const value = application.eligibility.answers?.[q.id]
                const chosen = q.options.find((o) => o.value === value)
                return (
                  <div key={q.id} className={styles.fieldRow}>
                    <span className={styles.fieldLabel}>{q.text}</span>
                    <span className={styles.fieldValue}>{chosen?.label ?? 'Not answered'}</span>
                  </div>
                )
              })}
            </>
          ) : (
            <p className={styles.muted}>Not completed.</p>
          )}
        </div>

        {getExtendedSections(requiredSections).map((section) => (
          <div key={section.key} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.label}</h2>
            <FieldRows
              entries={Object.entries(businessProfile[section.key] ?? {})}
              labels={PROFILE_FIELD_LABELS}
            />
          </div>
        ))}
      </div>

      {/* Right: consistency review + extended intake */}
      <div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Evidence consistency</h2>
          {EVIDENCE_PAIRS.map((pair) => {
            const doc = documents.find((d) => d.document_type === pair.docType)
            const state = markers[pair.key] ?? 'unverified'
            return (
              <div key={pair.key} className={styles.evidenceRow}>
                <div>
                  <p className={styles.evidenceClaim}>{pair.claim}</p>
                  <p className={styles.railItemMeta}>
                    Evidence: {pair.docLabel} · {doc ? 'received' : 'not received'}
                  </p>
                </div>
                <div className={styles.markerGroup} role="group" aria-label={`${pair.claim} consistency`}>
                  {MARKER_STATES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={styles.markerBtn}
                      data-state={m.value}
                      data-active={state === m.value || undefined}
                      onClick={() => setMarker(pair.key, m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Extended intake</h2>
          <p className={styles.muted}>
            Require only what this transaction size justifies. Enabled sections
            appear in the applicant's business profile immediately.
          </p>
          {EXTENDED_SECTIONS.map((section) => (
            <label key={section.key} className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={requiredSections.includes(section.key)}
                onChange={(e) => toggleSection(section.key, e.target.checked)}
              />
              <span>
                {section.label}
                <span className={styles.toggleDesc}>{section.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
