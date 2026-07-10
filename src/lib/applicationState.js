/**
 * applicationState.js
 *
 * Pure helpers shared by ActionCard, Overview, MyApplication's status pill,
 * and BusinessProfileForm. No React, no Supabase.
 *
 * Phase D collapses the borrower intake into one grouped application form
 * for the SME track: the submission gate is the presence of a required set
 * of `fields` jsonb keys, with no self-check or document dependency. The
 * fundability self-check is an optional tool the borrower can run any time;
 * it never blocks Submit. Project, trade, and acquisition are out of scope
 * for this phase and keep the existing business-profile-section gate (also
 * self-check-free, since that requirement is dropped for every track).
 */

import { PHASES } from '@/data/stageMeta'

/** The four base business-profile sections, in form order. */
export const PROFILE_SECTIONS = ['registration', 'trading', 'financials', 'purpose']

/**
 * Required `fields` jsonb keys for the SME grouped application form.
 * Business, financing-request, and contact-email (plus its confirmation)
 * fields are required; sector, employees, phone, and address are optional.
 * Phone confirmation is conditionally required — see canSubmit().
 */
export const REQUIRED_FIELDS_SME = [
  'businessName', 'registrationNumber', 'businessType', 'countryOfRegistration',
  'timeInOperation', 'monthlySales', 'loanPurpose', 'amountSought',
  'description', 'email', 'confirmEmail',
]

function filled(value) {
  return String(value ?? '').trim() !== ''
}

/**
 * Completion across the four base business-profile sections, from the flags
 * in business_profile.progress. 25 points per section. Extended sections no
 * longer count toward this score (Phase D): they are staff-raised post-offer
 * requests, not part of the borrower's pre-submission intake.
 *
 * @param {object|null|undefined} businessProfile
 * @param {string[]} [_requiredSections] - unused; kept for call-site compatibility
 * @returns {number} 0..100
 */
export function profileCompletion(businessProfile, _requiredSections = []) {
  const progress = businessProfile?.progress ?? {}
  const done = PROFILE_SECTIONS.filter((s) => progress[s] === true).length
  return Math.round((done / PROFILE_SECTIONS.length) * 100)
}

/** True once the borrower has completed the fundability self-check. */
export function selfCheckComplete(app) {
  return Boolean(app?.eligibility?.completed_at)
}

/**
 * Draft completion, as a percentage. SME: share of REQUIRED_FIELDS_SME
 * present (non-blank) in the draft's `fields` jsonb. Other tracks: the
 * existing business-profile section completion. The self-check never
 * contributes to this score.
 *
 * @param {object} app - application row (track, fields, business_profile)
 * @returns {number} 0..100
 */
export function overallDraftCompletion(app) {
  if (app?.track === 'sme') {
    const fields = app?.fields ?? {}
    const done = REQUIRED_FIELDS_SME.filter((key) => filled(fields[key])).length
    return Math.round((done / REQUIRED_FIELDS_SME.length) * 100)
  }
  return profileCompletion(app?.business_profile, app?.required_sections)
}

/**
 * Submission gate. SME: every REQUIRED_FIELDS_SME key present (non-blank) in
 * `fields`, confirmEmail matching email, and — if phone is filled —
 * confirmPhone matching phone. No self-check dependency, no document
 * dependency. Other tracks: the business profile fully complete, also with
 * no self-check requirement.
 */
export function canSubmit(app) {
  if (app?.track === 'sme') {
    const fields = app?.fields ?? {}
    const requiredOk = REQUIRED_FIELDS_SME.every((key) => filled(fields[key]))
    const emailMatches = String(fields.confirmEmail ?? '').trim().toLowerCase() === String(fields.email ?? '').trim().toLowerCase()
    const phoneMatches = !filled(fields.phone) || String(fields.confirmPhone ?? '').trim() === String(fields.phone ?? '').trim()
    return requiredOk && emailMatches && phoneMatches
  }
  return profileCompletion(app?.business_profile, app?.required_sections) === 100
}

/**
 * Resolves which ActionCard state applies.
 *
 * Open information requests outrank every post-draft state: the applicant
 * owes a response, so the card switches to action mode until staff resolve
 * or the applicant responds. Every draft row — regardless of how much of
 * the intake is complete — resolves to the single 'draft' state; ActionCard
 * itself renders the completion bar and swaps the primary action between
 * Resume and Submit application based on canSubmit.
 *
 * @param {Array} rfis - information_requests rows for the application
 * @returns {'draft'|'rfi_open'|'in_review'|'offer_issued'|'fee_due'|'funded'}
 */
export function resolveActionState(app, rfis = []) {
  const status = app?.status
  if (status === 'draft') {
    return 'draft'
  }
  if (rfis.some((r) => r.status === 'open')) {
    return 'rfi_open'
  }
  if (['submitted', 'kyc_verification', 'credit_assessment', 'funder_matching'].includes(status)) {
    return 'in_review'
  }
  if (status === 'term_sheet' || status === 'offer_issued') return 'offer_issued'
  if (status === 'offer_accepted' || status === 'fee_payment') return 'fee_due'
  return 'funded'
}

/**
 * Maps a status to its borrower phase (1..4). Unknown statuses fall back
 * to phase 1 so the rail never renders out of range.
 */
export function phaseFor(status) {
  const match = PHASES.find((p) => p.statuses.includes(status))
  return match ? match.phase : 1
}

/** Statuses at or beyond a formal offer being on the table. */
const OFFER_STAGE_STATUSES = ['offer_issued', 'offer_accepted', 'fee_payment', 'funded']

/**
 * True once the application has reached offer_issued or later. Document-type
 * information requests, and the extended-section RFI templates, are gated
 * on this: documents are collected only once an offer is on the table
 * (Phase D), not during the pre-submission intake or initial assessment.
 *
 * @param {string|undefined} status - applications.status
 */
export function hasReachedOffer(status) {
  return OFFER_STAGE_STATUSES.includes(status)
}
