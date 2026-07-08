/**
 * applicationState.js
 *
 * Pure helpers shared by ActionCard, Overview, MyApplication's status pill,
 * and BusinessProfileForm. No React, no Supabase.
 */

import { getExtendedSections } from '@/data/extendedSections'
import { PHASES } from '@/data/stageMeta'

/** The four base business-profile sections, in form order. */
export const PROFILE_SECTIONS = ['registration', 'trading', 'financials', 'purpose']

/**
 * Completion across the base sections plus any staff-required extended
 * sections, from the flags in business_profile.progress. With no extended
 * sections this is the original 25 points per section.
 *
 * @param {object|null|undefined} businessProfile
 * @param {string[]} [requiredSections] - applications.required_sections
 * @returns {number} 0..100
 */
export function profileCompletion(businessProfile, requiredSections = []) {
  const progress = businessProfile?.progress ?? {}
  const sections = [
    ...PROFILE_SECTIONS,
    ...getExtendedSections(requiredSections).map((s) => s.key),
  ]
  const done = sections.filter((s) => progress[s] === true).length
  return Math.round((done / sections.length) * 100)
}

/** True once the borrower has completed the fundability self-check. */
export function selfCheckComplete(app) {
  return Boolean(app?.eligibility?.completed_at)
}

/**
 * Weighted draft completion: 80% business profile, 20% self-check.
 * Documents no longer count; they are provided on request after submission.
 *
 * @param {object} app - application row (business_profile, required_sections, eligibility)
 * @returns {number} 0..100
 */
export function overallDraftCompletion(app) {
  const profilePct = profileCompletion(app?.business_profile, app?.required_sections)
  return Math.round(profilePct * 0.8) + (selfCheckComplete(app) ? 20 : 0)
}

/**
 * Submission gate: business profile fully complete AND the fundability
 * self-check completed (any score).
 */
export function canSubmit(app) {
  return (
    profileCompletion(app?.business_profile, app?.required_sections) === 100 &&
    selfCheckComplete(app)
  )
}

/**
 * Resolves which ActionCard state applies.
 *
 * Open information requests outrank every post-draft state: the applicant
 * owes a response, so the card switches to action mode until staff resolve
 * or the applicant responds.
 *
 * @param {Array} rfis - information_requests rows for the application
 * @returns {'draft_profile'|'draft_selfcheck'|'rfi_open'|'in_review'|'offer_issued'|'fee_due'|'funded'}
 */
export function resolveActionState(app, rfis = []) {
  const status = app?.status
  if (status === 'draft') {
    return profileCompletion(app?.business_profile, app?.required_sections) < 100
      ? 'draft_profile'
      : 'draft_selfcheck'
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
