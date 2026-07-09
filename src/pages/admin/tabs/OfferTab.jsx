import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildSchedule, totals } from '@/lib/amortisation'
import styles from '../Admin.module.css'

const TERM_OPTIONS = [6, 12, 24, 36, 48, 60, 84, 120]

const FREQUENCIES = [
  { value: 'monthly',    label: 'Monthly' },
  { value: 'quarterly',  label: 'Quarterly' },
  { value: 'semiannual', label: 'Semi-annual' },
  { value: 'annual',     label: 'Annual' },
]

const STRUCTURES = [
  { value: 'amortising', label: 'Amortising' },
  { value: 'bullet',     label: 'Bullet' },
  { value: 'balloon',    label: 'Balloon' },
]

const FEE_TIMINGS = [
  { value: 'on_signing',      label: 'On signing' },
  { value: 'on_delivery',     label: 'On delivery' },
  { value: 'on_disbursement', label: 'On disbursement' },
  { value: 'success_pct',     label: 'Success (% of amount)' },
]

const OFFER_STATUS_LABELS = {
  draft: 'Draft', issued: 'Issued', superseded: 'Superseded',
  accepted: 'Accepted', declined: 'Declined', expired: 'Expired',
}

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function shortDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** Builder form state from stored offer terms (or application defaults). */
export function formFromTerms(application, terms) {
  return {
    principal: String(terms?.principal ?? application.amount_sought ?? ''),
    currency: terms?.currency ?? application.currency ?? 'USD',
    annualRatePct: String(terms?.annual_rate_pct ?? 12),
    termMonths: String(terms?.term_months ?? 36),
    frequency: terms?.repayment_frequency ?? 'monthly',
    graceMonths: String(terms?.grace_months ?? 0),
    structure: terms?.structure ?? 'amortising',
    balloonPct: String(terms?.balloon_pct ?? 30),
    fees: terms?.fees ?? [],
    conditions: terms?.conditions_precedent ?? [],
    covenants: terms?.covenants ?? [],
    lateFeeType: terms?.default_charges?.late_fee?.type ?? 'flat',
    lateFeeValue: String(terms?.default_charges?.late_fee?.value ?? ''),
    penaltyRatePct: String(terms?.default_charges?.penalty_rate_pct ?? ''),
    graceDays: String(terms?.default_charges?.grace_days ?? 10),
    prepaymentAllowed: terms?.prepayment?.allowed ?? true,
    prepaymentPenaltyPct: String(terms?.prepayment?.penalty_pct_of_remaining_principal ?? 0),
    securityDescription: terms?.security_description ?? '',
    insuranceRequirements: terms?.insurance_requirements ?? '',
  }
}

/** Stored offer_terms shape from builder form state. */
export function termsFromForm(form) {
  return {
    principal: Number(form.principal),
    currency: form.currency,
    annual_rate_pct: Number(form.annualRatePct),
    term_months: Number(form.termMonths),
    repayment_frequency: form.frequency,
    grace_months: Number(form.graceMonths) || 0,
    structure: form.structure,
    balloon_pct: form.structure === 'balloon' ? Number(form.balloonPct) || 0 : 0,
    fees: form.fees.filter((f) => f.label.trim()),
    conditions_precedent: form.conditions.filter((c) => c.trim()),
    covenants: form.covenants.filter((c) => c.trim()),
    default_charges: {
      late_fee: { type: form.lateFeeType, value: Number(form.lateFeeValue) || 0 },
      penalty_rate_pct: Number(form.penaltyRatePct) || 0,
      grace_days: Number(form.graceDays) || 0,
    },
    prepayment: {
      allowed: form.prepaymentAllowed,
      penalty_pct_of_remaining_principal: form.prepaymentAllowed
        ? Number(form.prepaymentPenaltyPct) || 0
        : 0,
    },
    security_description: form.securityDescription.trim(),
    insurance_requirements: form.insuranceRequirements.trim(),
  }
}

function ListEditor({ label, items, onChange, placeholder }) {
  return (
    <div>
      <div className={styles.fieldLabelSm}>{label}</div>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          <input
            className={styles.stageSelect}
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items]
              next[i] = e.target.value
              onChange(next)
            }}
          />
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.ghostBtn}
        onClick={() => onChange([...items, ''])}
      >
        Add item
      </button>
    </div>
  )
}

/**
 * Versioned offer builder. Save keeps a draft the borrower cannot see;
 * Issue publishes it, supersedes any prior issued version, and mirrors the
 * core terms onto applications.offer_terms so the borrower's actual
 * schedule keeps working unchanged.
 */
export default function OfferTab({ application, offers, user, onChanged }) {
  const sorted = [...offers].sort((a, b) => b.version - a.version)
  const latest = sorted[0] ?? null
  const draft = sorted.find((o) => o.status === 'draft') ?? null

  const [form, setForm] = useState(() => formFromTerms(application, (draft ?? latest)?.terms))
  const [validUntil, setValidUntil] = useState((draft ?? latest)?.valid_until ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const preview = useMemo(() => {
    try {
      const terms = termsFromForm(form)
      if (!terms.principal || !terms.annual_rate_pct || !terms.term_months) return null
      const schedule = buildSchedule({
        principal: terms.principal,
        annualRatePct: terms.annual_rate_pct,
        termMonths: terms.term_months,
        frequency: terms.repayment_frequency,
        graceMonths: terms.grace_months,
        structure: terms.structure,
        balloonPct: terms.balloon_pct,
      })
      const t = totals(schedule)
      const firstRepayment = schedule.find((row) => row.principal > 0) ?? schedule[0]
      return { payment: firstRepayment.payment, ...t }
    } catch {
      return null
    }
  }, [form])

  async function logOfferEvent(detail) {
    const { error: eventError } = await supabase.from('application_events').insert({
      application_id: application.id,
      actor_id: user.id,
      actor_role: 'staff',
      event_type: 'offer',
      payload: { detail },
    })
    if (eventError) console.warn('[OfferTab] event insert failed:', eventError.message)
  }

  async function saveDraft() {
    setBusy(true)
    setError(null)
    const terms = termsFromForm(form)
    const payload = { terms, valid_until: validUntil || null }

    const { error: saveError } = draft
      ? await supabase.from('offers').update(payload).eq('id', draft.id)
      : await supabase.from('offers').insert({
          application_id: application.id,
          version: (latest?.version ?? 0) + 1,
          status: 'draft',
          created_by: user.id,
          ...payload,
        })

    if (saveError) setError(saveError.message)
    else onChanged()
    setBusy(false)
    return !saveError
  }

  async function issue() {
    setBusy(true)
    setError(null)
    const terms = termsFromForm(form)

    // Persist the draft first so what is issued is exactly what is on screen
    let offerId = draft?.id
    let version = draft?.version
    if (draft) {
      const { error: saveError } = await supabase
        .from('offers')
        .update({ terms, valid_until: validUntil || null })
        .eq('id', draft.id)
      if (saveError) { setError(saveError.message); setBusy(false); return }
    } else {
      version = (latest?.version ?? 0) + 1
      const { data, error: insertError } = await supabase
        .from('offers')
        .insert({
          application_id: application.id,
          version,
          status: 'draft',
          terms,
          valid_until: validUntil || null,
          created_by: user.id,
        })
        .select()
        .single()
      if (insertError) { setError(insertError.message); setBusy(false); return }
      offerId = data.id
    }

    const { error: supersedeError } = await supabase
      .from('offers')
      .update({ status: 'superseded' })
      .eq('application_id', application.id)
      .eq('status', 'issued')
    if (supersedeError) { setError(supersedeError.message); setBusy(false); return }

    const { error: issueError } = await supabase
      .from('offers')
      .update({ status: 'issued' })
      .eq('id', offerId)
    if (issueError) { setError(issueError.message); setBusy(false); return }

    // Keep Phase A consumers (ActualSchedule, OfferBlock fallback) working
    const { error: syncError } = await supabase
      .from('applications')
      .update({ offer_terms: terms })
      .eq('id', application.id)
    if (syncError) console.warn('[OfferTab] offer_terms sync failed:', syncError.message)

    await logOfferEvent(`Offer version ${version} issued`)
    onChanged()
    setBusy(false)
  }

  async function newVersion() {
    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('offers').insert({
      application_id: application.id,
      version: (latest?.version ?? 0) + 1,
      status: 'draft',
      terms: latest?.terms ?? termsFromForm(form),
      valid_until: latest?.valid_until ?? null,
      created_by: user.id,
    })
    if (insertError) setError(insertError.message)
    else onChanged()
    setBusy(false)
  }

  return (
    <div>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Offer builder {draft ? `· editing version ${draft.version} (draft)` : latest ? `· next version ${latest.version + 1}` : '· version 1'}
          </h2>
          {latest && !draft && (
            <button className={styles.ghostBtn} onClick={newVersion} disabled={busy}>
              New version from latest
            </button>
          )}
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.fieldLabelSm}>Principal</div>
            <input type="number" className={styles.stageSelect} value={form.principal} onChange={set('principal')} />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Currency</div>
            <input className={styles.stageSelect} value={form.currency} onChange={set('currency')} />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Annual rate %</div>
            <input type="number" step="0.1" className={styles.stageSelect} value={form.annualRatePct} onChange={set('annualRatePct')} />
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Term (months)</div>
            <select className={styles.stageSelect} value={form.termMonths} onChange={set('termMonths')}>
              {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div>
            <div className={styles.fieldLabelSm}>Repayment frequency</div>
            <select className={styles.stageSelect} value={form.frequency} onChange={set('frequency')}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Structure</div>
            <select className={styles.stageSelect} value={form.structure} onChange={set('structure')}>
              {STRUCTURES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <div className={styles.fieldLabelSm}>Grace (months)</div>
            <input type="number" min="0" max="24" className={styles.stageSelect} value={form.graceMonths} onChange={set('graceMonths')} />
          </div>
          {form.structure === 'balloon' && (
            <div>
              <div className={styles.fieldLabelSm}>Balloon %</div>
              <input type="number" min="10" max="50" className={styles.stageSelect} value={form.balloonPct} onChange={set('balloonPct')} />
            </div>
          )}
          <div>
            <div className={styles.fieldLabelSm}>Valid until</div>
            <input type="date" className={styles.stageSelect} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        {/* Fees */}
        <div className={styles.fieldLabelSm}>Fees</div>
        {form.fees.map((fee, i) => (
          <div key={i} className={styles.listRow}>
            <input
              className={styles.stageSelect}
              placeholder="Fee label"
              value={fee.label}
              onChange={(e) => {
                const fees = [...form.fees]
                fees[i] = { ...fees[i], label: e.target.value }
                setForm((prev) => ({ ...prev, fees }))
              }}
            />
            <input
              type="number"
              className={styles.stageSelect}
              placeholder="Amount"
              value={fee.amount}
              onChange={(e) => {
                const fees = [...form.fees]
                fees[i] = { ...fees[i], amount: e.target.value }
                setForm((prev) => ({ ...prev, fees }))
              }}
            />
            <select
              className={styles.stageSelect}
              value={fee.timing}
              onChange={(e) => {
                const fees = [...form.fees]
                fees[i] = { ...fees[i], timing: e.target.value }
                setForm((prev) => ({ ...prev, fees }))
              }}
            >
              {FEE_TIMINGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() =>
                setForm((prev) => ({ ...prev, fees: prev.fees.filter((_, j) => j !== i) }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              fees: [...prev.fees, { label: '', amount: '', timing: 'on_signing' }],
            }))
          }
        >
          Add fee
        </button>

        <div className={styles.formRow} style={{ marginTop: 'var(--space-4)' }}>
          <ListEditor
            label="Conditions precedent"
            items={form.conditions}
            onChange={(conditions) => setForm((prev) => ({ ...prev, conditions }))}
            placeholder="e.g. Executed facility agreement"
          />
          <ListEditor
            label="Covenants"
            items={form.covenants}
            onChange={(covenants) => setForm((prev) => ({ ...prev, covenants }))}
            placeholder="e.g. Quarterly management accounts"
          />
        </div>

        {preview && (
          <div className={styles.offerPreview}>
            <span>Periodic payment: <strong>{money(preview.payment, form.currency)}</strong></span>
            <span>Total interest: <strong>{money(preview.totalInterest, form.currency)}</strong></span>
            <span>Total cost: <strong>{money(preview.totalPaid, form.currency)}</strong></span>
          </div>
        )}

        <div className={styles.formActions} style={{ marginTop: 'var(--space-4)' }}>
          <button className={styles.ghostBtn} onClick={saveDraft} disabled={busy}>
            {busy ? 'Working…' : 'Save draft'}
          </button>
          <button className={styles.updateBtn} onClick={issue} disabled={busy}>
            {busy ? 'Working…' : 'Issue offer'}
          </button>
        </div>
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Version history</h2>
        {sorted.length === 0 ? (
          <p className={styles.muted}>No offers yet. Issuing publishes the terms to the applicant.</p>
        ) : (
          sorted.map((offer) => (
            <div key={offer.id} className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Version {offer.version}</span>
              <span className={styles.fieldValue}>
                <span className={styles.rfiStatusChip} data-status={offer.status}>
                  {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
                </span>
                {' '}
                {money(Number(offer.terms?.principal ?? 0), offer.terms?.currency)} ·{' '}
                {offer.terms?.annual_rate_pct}% · {offer.terms?.term_months} months
                {offer.valid_until ? ` · valid until ${shortDate(offer.valid_until)}` : ''}
                {offer.accepted_at ? ` · accepted ${shortDate(offer.accepted_at)}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
