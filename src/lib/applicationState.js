/**
 * applicationState.js
 *
 * Pure helpers shared by ActionCard, Overview, MyApplication's status pill,
 * and BusinessProfileForm. No React, no Supabase.
 */

import { getRequirements, deriveChecklist } from '@/data/docRequirements'
import { PHASES } from '@/data/stageMeta'

/** The four business-profile sections, in form order. */
export const PROFILE_SECTIONS = ['registration', 'trading', 'financials', 'purpose']

/**
 * 25 points per completed section flag in business_profile.progress.
 *
 * @param {object|null|undefined} businessProfile
 * @returns {number} 0..100
 */
export function profileCompletion(businessProfile) {
  const progress = businessProfile?.progress ?? {}
  const done = PROFILE_SECTIONS.filter((s) => progress[s] === true).length
  return done * 25
}

/**
 * KYC completion derived from the document checklist.
 *
 * @param {Array} requirements  - from getRequirements(track)
 * @param {Array} documents     - application_documents rows
 * @returns {{ received: number, total: number, pct: number }}
 */
export function kycCompletion(requirements, documents) {
  const checklist = deriveChecklist(requirements, documents ?? [])
  const received = checklist.filter(
    (item) => item.status === 'received' || item.status === 'verified'
  ).length
  const total = checklist.length
  const pct = total === 0 ? 0 : Math.round((received / total) * 100)
  return { received, total, pct }
}

/**
 * Weighted draft completion: 60% business profile, 40% required KYC.
 *
 * @param {object} app        - application row (track, business_profile)
 * @param {Array} documents   - application_documents rows
 * @returns {number} 0..100
 */
export function overallDraftCompletion(app, documents) {
  const profilePct = profileCompletion(app?.business_profile)
  const { pct: kycPct } = kycCompletion(getRequirements(app?.track), documents)
  return Math.round(profilePct * 0.6 + kycPct * 0.4)
}

/**
 * Submission gate: business profile fully complete AND every required
 * KYC item received.
 */
export function canSubmit(app, documents) {
  if (profileCompletion(app?.business_profile) !== 100) return false
  const { received, total } = kycCompletion(getRequirements(app?.track), documents)
  return total > 0 && received === total
}

/**
 * Resolves which ActionCard state applies.
 *
 * Open information requests outrank every post-draft state: the applicant
 * owes a response, so the card switches to action mode until staff resolve
 * or the applicant responds.
 *
 * @param {Array} rfis - information_requests rows for the application
 * @returns {'draft_profile'|'draft_kyc'|'rfi_open'|'in_review'|'offer_issued'|'fee_due'|'funded'}
 */
export function resolveActionState(app, documents, rfis = []) {
  const status = app?.status
  if (status === 'draft') {
    return profileCompletion(app?.business_profile) < 100
      ? 'draft_profile'
      : 'draft_kyc'
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
