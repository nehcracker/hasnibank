import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildSchedule } from '@/lib/amortisation'
import ScheduleTable from '@/pages/dashboard/modelling/ScheduleTable'
import styles from '../Admin.module.css'

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const TRANCHE_STATUS_LABELS = {
  planned: 'Planned',
  conditions_pending: 'Conditions pending',
  disbursed: 'Disbursed',
}

/** offer_terms (snake_case) → amortisation engine params. */
function mapTerms(terms) {
  return {
    principal: Number(terms.principal),
    annualRatePct: Number(terms.annual_rate_pct),
    termMonths: Number(terms.term_months),
    frequency: terms.repayment_frequency ?? 'monthly',
    graceMonths: Number(terms.grace_months ?? 0),
    structure: terms.structure ?? 'amortising',
    balloonPct: Number(terms.balloon_pct ?? 0),
  }
}

/**
 * Disbursement tranches and the dated repayment schedule. All copy uses
 * facilitation language: funds move from the matched funder through the
 * arrangement Hasni Bank facilitates, never from Hasni Bank directly.
 */
export default function FundingTab({ application, offers, disbursements, user, onChanged }) {
  const acceptedOffer =
    offers.find((o) => o.status === 'accepted') ??
    offers.find((o) => o.status === 'issued') ??
    null
  const terms = acceptedOffer?.terms ?? application.offer_terms ?? null
  const conditions = terms?.conditions_precedent ?? []
  const currency = terms?.currency ?? application.currency

  const sorted = [...disbursements].sort((a, b) => a.tranche_no - b.tranche_no)
  const totalPlanned = sorted.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const principal = Number(terms?.principal ?? 0)
  const shortfall = principal - totalPlanned
  const firstDisbursed = sorted.find((t) => t.status === 'disbursed' && t.actual_date)

  const [form, setForm] = useState({ amount: '', plannedDate: '', conditions: [] })
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const schedule =
    terms && firstDisbursed
      ? buildSchedule({ ...mapTerms(terms), startDate: firstDisbursed.actual_date })
      : null

  async function addTranche() {
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('disbursements').insert({
      application_id: application.id,
      tranche_no: (sorted[sorted.length - 1]?.tranche_no ?? 0) + 1,
      amount: Number(form.amount),
      planned_date: form.plannedDate || null,
      conditions: form.conditions,
      status: form.conditions.length > 0 ? 'conditions_pending' : 'planned',
    })
    if (insertError) {
      setError(insertError.message)
    } else {
      setForm({ amount: '', plannedDate: '', conditions: [] })
      setShowForm(false)
      onChanged()
    }
    setBusy(false)
  }

  async function markDisbursed(tranche) {
    setBusy(true)
    setError(null)
    const actualDate = new Date().toISOString().slice(0, 10)
    const { error: updateError } = await supabase
      .from('disbursements')
      .update({ status: 'disbursed', actual_date: actualDate })
      .eq('id', tranche.id)
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }
    const { error: eventError } = await supabase.from('application_events').insert({
      application_id: application.id,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: 'disbursement',
      payload: {
        detail: `Tranche ${tranche.tranche_no} disbursed by the funder`,
        tranche_no: tranche.tranche_no,
      },
    })
    if (eventError) console.warn('[FundingTab] event insert failed:', eventError.message)
    onChanged()
    setBusy(false)
  }

  if (!terms) {
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Funding</h2>
        <p className={styles.muted}>
          Disbursement scheduling opens once an offer has been issued and accepted.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Disbursement tranches</h2>
          {!showForm && (
            <button className={styles.railBtn} onClick={() => setShowForm(true)}>
              Add tranche
            </button>
          )}
        </div>
        <p className={styles.muted}>
          Disbursements are scheduled by the funder and facilitated through
          Hasni Bank once the linked conditions are satisfied.
        </p>

        {showForm && (
          <div className={styles.inlineForm}>
            <div className={styles.formRow}>
              <div>
                <div className={styles.fieldLabelSm}>Amount</div>
                <input
                  type="number"
                  className={styles.stageSelect}
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <div className={styles.fieldLabelSm}>Planned date</div>
                <input
                  type="date"
                  className={styles.stageSelect}
                  value={form.plannedDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, plannedDate: e.target.value }))}
                />
              </div>
            </div>
            {conditions.length > 0 && (
              <div>
                <div className={styles.fieldLabelSm}>Linked conditions precedent</div>
                {conditions.map((c) => (
                  <label key={c} className={styles.toggleRow}>
                    <input
                      type="checkbox"
                      checked={form.conditions.includes(c)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          conditions: e.target.checked
                            ? [...prev.conditions, c]
                            : prev.conditions.filter((x) => x !== c),
                        }))
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
            <div className={styles.formActions}>
              <button
                className={styles.railBtn}
                onClick={addTranche}
                disabled={busy || !Number(form.amount)}
              >
                {busy ? 'Saving…' : 'Save tranche'}
              </button>
              <button className={styles.ghostBtn} onClick={() => setShowForm(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <p className={styles.railEmpty}>No tranches scheduled yet.</p>
        ) : (
          <>
            {sorted.map((tranche) => (
              <div key={tranche.id} className={styles.rfiRow}>
                <div className={styles.findingMeta}>
                  <span
                    className={styles.rfiStatusChip}
                    data-status={tranche.status === 'disbursed' ? 'responded' : 'open'}
                  >
                    {TRANCHE_STATUS_LABELS[tranche.status] ?? tranche.status}
                  </span>
                  <span className={styles.railItemMeta}>
                    Tranche {tranche.tranche_no} · {money(Number(tranche.amount), currency)}
                    {tranche.planned_date ? ` · planned ${shortDate(tranche.planned_date)}` : ''}
                    {tranche.actual_date ? ` · disbursed ${shortDate(tranche.actual_date)}` : ''}
                  </span>
                  {tranche.status !== 'disbursed' && (
                    <button
                      className={styles.ghostBtn}
                      onClick={() => markDisbursed(tranche)}
                      disabled={busy}
                    >
                      Mark disbursed
                    </button>
                  )}
                </div>
                {(tranche.conditions ?? []).length > 0 && (
                  <p className={styles.railItemMeta}>
                    Conditions: {(tranche.conditions ?? []).join('; ')}
                  </p>
                )}
              </div>
            ))}
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Total scheduled</span>
              <span className={styles.fieldValue}>
                {money(totalPlanned, currency)} of {money(principal, currency)}
              </span>
            </div>
            {shortfall > 0.005 && (
              <p className={styles.errorMsg}>
                Scheduled tranches fall {money(shortfall, currency)} short of the
                offer principal.
              </p>
            )}
          </>
        )}
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Repayment schedule</h2>
        {schedule ? (
          <>
            <p className={styles.muted}>
              Dates are anchored to the first disbursement on{' '}
              {shortDate(firstDisbursed.actual_date)}.
            </p>
            <ScheduleTable schedule={schedule} currency={currency} />
          </>
        ) : (
          <p className={styles.muted}>
            The dated schedule appears once the first tranche is disbursed by
            the funder.
          </p>
        )}
      </div>
    </div>
  )
}
