import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_PILLARS, SEVERITY_LABELS, rollupScore, gateCheck } from '@/lib/assessment'
import { hasReachedOffer } from '@/lib/applicationState'
import { EXTENDED_SECTIONS } from '@/data/extendedSections'
import FindingForm from '../FindingForm'
import RfiForm from '../RfiForm'
import styles from '../Admin.module.css'

const RFI_STATUS_LABELS = {
  open: 'Awaiting applicant', responded: 'Response received',
  resolved: 'Resolved', rejected: 'Rejected',
}

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function responseSummary(rfi) {
  const p = rfi.response_payload ?? {}
  if (rfi.response_type === 'document') return p.label || p.document_type || 'Document uploaded'
  return p.value ?? ''
}

/**
 * Findings by pillar (internal note and borrower-visible statement in
 * hard-split blocks), the RFI lifecycle, and the stage-gate banner.
 */
export default function AssessmentTab({ application, findings, notices, rfis, user, onChanged }) {
  const [showFindingForm, setShowFindingForm] = useState(false)
  const [showRfiForm, setShowRfiForm] = useState(false)
  const [editingRfi, setEditingRfi] = useState(null)
  const [reviewNote, setReviewNote] = useState({})
  const [error, setError] = useState(null)

  const { byPillar } = rollupScore(findings)
  const gate = gateCheck(findings, rfis)
  const noticeByFinding = new Map(notices.map((n) => [n.finding_id, n]))
  // Document collection, including the extended-section templates, is
  // deferred to post-offer (Phase D) — RfiForm hides those options until
  // an offer is on the table.
  const documentsAllowed = hasReachedOffer(application.status)

  async function logEvent(eventType, payload) {
    const { error: eventError } = await supabase.from('application_events').insert({
      application_id: application.id,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: eventType,
      payload,
    })
    if (eventError) console.warn('[AssessmentTab] event insert failed:', eventError.message)
  }

  async function resolveFinding(finding) {
    setError(null)
    const { error: updateError } = await supabase
      .from('assessment_findings')
      .update({ status: 'resolved' })
      .eq('id', finding.id)
    if (updateError) { setError(updateError.message); return }
    onChanged()
  }

  async function saveRfi(values) {
    setError(null)
    if (editingRfi) {
      const { error: updateError } = await supabase
        .from('information_requests')
        .update(values)
        .eq('id', editingRfi.id)
      if (updateError) { setError(updateError.message); return }
      setEditingRfi(null)
    } else {
      const { error: insertError } = await supabase.from('information_requests').insert({
        application_id: application.id,
        ...values,
        created_by: user.id,
      })
      if (insertError) { setError(insertError.message); return }
      await logEvent('rfi', { action: 'requested', prompt: values.prompt })
      setShowRfiForm(false)
    }
    onChanged()
  }

  async function cancelRfi(rfi) {
    setError(null)
    const { error: deleteError } = await supabase
      .from('information_requests')
      .delete()
      .eq('id', rfi.id)
    if (deleteError) { setError(deleteError.message); return }
    await logEvent('rfi', { action: 'withdrawn', prompt: rfi.prompt })
    onChanged()
  }

  async function resolveRfi(rfi) {
    setError(null)
    const { error: updateError } = await supabase
      .from('information_requests')
      .update({ status: 'resolved', resolution_note: reviewNote[rfi.id]?.trim() || null })
      .eq('id', rfi.id)
    if (updateError) { setError(updateError.message); return }
    await logEvent('rfi', { action: 'resolved', prompt: rfi.prompt })
    onChanged()
  }

  async function rejectRfi(rfi) {
    const reason = reviewNote[rfi.id]?.trim()
    if (!reason) { setError('A reason is required to send a request back.'); return }
    setError(null)
    const { error: updateError } = await supabase
      .from('information_requests')
      .update({
        status: 'open',
        prompt: `${rfi.prompt}\n\nReviewer note: ${reason}`,
        responded_at: null,
      })
      .eq('id', rfi.id)
    if (updateError) { setError(updateError.message); return }
    await logEvent('rfi', { action: 'returned', prompt: rfi.prompt })
    onChanged()
  }

  return (
    <div>
      {!gate.clear && (
        <div className={styles.gateBanner} data-testid="gate-banner">
          Stage gate: {gate.criticalOpen} critical finding{gate.criticalOpen === 1 ? '' : 's'} and{' '}
          {gate.rfisOpen} open request{gate.rfisOpen === 1 ? '' : 's'} outstanding. Advancing the
          stage will be logged as an override.
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Findings by pillar</h2>
          {!showFindingForm && (
            <button className={styles.railBtn} onClick={() => setShowFindingForm(true)}>
              Add finding
            </button>
          )}
        </div>

        {showFindingForm && (
          <FindingForm
            applicationId={application.id}
            user={user}
            onSaved={() => { setShowFindingForm(false); onChanged() }}
            onCancel={() => setShowFindingForm(false)}
          />
        )}

        {ASSESSMENT_PILLARS.map((pillar) => {
          const pillarFindings = findings.filter((f) => f.pillar === pillar.key)
          const summary = byPillar[pillar.key]
          const expanded = pillarFindings.some(
            (f) => f.severity === 'critical' || f.severity === 'requires_improvement'
          )
          return (
            <details
              key={pillar.key}
              className={styles.pillarBlock}
              data-testid={`pillar-${pillar.key}`}
              open={expanded || undefined}
            >
              <summary className={styles.pillarSummary}>
                <span>{pillar.label}</span>
                <span className={styles.scoreChip}>
                  {summary.assessed
                    ? `${summary.score} / ${summary.max}`
                    : 'not yet assessed'}
                </span>
              </summary>

              {pillarFindings.length === 0 ? (
                <p className={styles.railEmpty}>No findings recorded for this pillar.</p>
              ) : (
                pillarFindings.map((finding) => {
                  const notice = noticeByFinding.get(finding.id)
                  return (
                    <div key={finding.id} className={styles.findingRow}>
                      <div className={styles.findingMeta}>
                        <span
                          className={styles.severityChip}
                          data-severity={finding.severity}
                        >
                          {SEVERITY_LABELS[finding.severity]}
                        </span>
                        <span className={styles.railItemMeta}>
                          Score {finding.score} · {shortDate(finding.created_at)}
                          {finding.status === 'resolved' ? ' · Resolved' : ''}
                        </span>
                        {finding.status === 'open' && (
                          <button
                            className={styles.ghostBtn}
                            onClick={() => resolveFinding(finding)}
                          >
                            Mark resolved
                          </button>
                        )}
                      </div>
                      {finding.internal_note && (
                        <div
                          className={styles.internalBlock}
                          data-testid={`internal-note-${finding.id}`}
                        >
                          <span className={styles.staffOnlyTag}>staff only</span>
                          <p>{finding.internal_note}</p>
                        </div>
                      )}
                      {notice && (
                        <div
                          className={styles.visibleBlock}
                          data-testid={`visible-statement-${finding.id}`}
                        >
                          <span className={styles.visibleTag}>visible to applicant</span>
                          <p>{notice.statement}</p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </details>
          )
        })}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Information requests</h2>
          {!showRfiForm && !editingRfi && (
            <button className={styles.railBtn} onClick={() => setShowRfiForm(true)}>
              New request
            </button>
          )}
        </div>

        {showRfiForm && (
          <RfiForm
            onSave={saveRfi}
            onCancel={() => setShowRfiForm(false)}
            documentsAllowed={documentsAllowed}
            sectionTemplates={EXTENDED_SECTIONS}
          />
        )}

        {rfis.length === 0 && !showRfiForm ? (
          <p className={styles.railEmpty}>Nothing has been requested from the applicant.</p>
        ) : (
          rfis.map((rfi) =>
            editingRfi?.id === rfi.id ? (
              <RfiForm
                key={rfi.id}
                initial={rfi}
                saveLabel="Save changes"
                onSave={saveRfi}
                onCancel={() => setEditingRfi(null)}
                documentsAllowed={documentsAllowed}
                sectionTemplates={EXTENDED_SECTIONS}
              />
            ) : (
              <div key={rfi.id} className={styles.rfiRow}>
                <div className={styles.findingMeta}>
                  <span className={styles.rfiStatusChip} data-status={rfi.status}>
                    {RFI_STATUS_LABELS[rfi.status] ?? rfi.status}
                  </span>
                  <span className={styles.railItemMeta}>
                    {rfi.response_type}
                    {rfi.due_date ? ` · due ${shortDate(rfi.due_date)}` : ''}
                  </span>
                </div>
                <p className={styles.rfiPrompt}>{rfi.prompt}</p>

                {rfi.status === 'open' && (
                  <div className={styles.formActions}>
                    <button className={styles.ghostBtn} onClick={() => setEditingRfi(rfi)}>
                      Edit
                    </button>
                    <button className={styles.ghostBtn} onClick={() => cancelRfi(rfi)}>
                      Cancel request
                    </button>
                  </div>
                )}

                {rfi.status === 'responded' && (
                  <div className={styles.rfiResponse}>
                    <div className={styles.fieldLabelSm}>
                      Response {rfi.responded_at ? `· ${shortDate(rfi.responded_at)}` : ''}
                    </div>
                    <p className={styles.rfiResponseBody}>{responseSummary(rfi)}</p>
                    <input
                      className={styles.stageSelect}
                      placeholder="Resolution note or reason to send back"
                      value={reviewNote[rfi.id] ?? ''}
                      onChange={(e) =>
                        setReviewNote((prev) => ({ ...prev, [rfi.id]: e.target.value }))
                      }
                    />
                    <div className={styles.formActions}>
                      <button className={styles.railBtn} onClick={() => resolveRfi(rfi)}>
                        Resolve
                      </button>
                      <button className={styles.ghostBtn} onClick={() => rejectRfi(rfi)}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {rfi.status === 'resolved' && rfi.resolution_note && (
                  <p className={styles.railItemMeta}>Resolution: {rfi.resolution_note}</p>
                )}
              </div>
            )
          )
        )}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  )
}
