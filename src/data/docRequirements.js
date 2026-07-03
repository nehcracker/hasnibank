/**
 * docRequirements.js
 *
 * Pure data module — no side-effects, no React, no Supabase.
 * Consumed by DocChecklist.jsx and the test suite.
 */

// ── Feature flag ──────────────────────────────────────────────────────────────

/**
 * When false, "verified" is never returned by deriveChecklist.
 * Flip to true once staff-verification events are wired in Supabase.
 */
export const VERIFICATION_ENABLED = false

// ── Requirements data ─────────────────────────────────────────────────────────

export const COMMON_REQUIREMENTS = [
  {
    type: 'certificate_of_incorporation',
    label: 'Certificate of Incorporation',
    description:
      'Official company registration document confirming legal entity status in your jurisdiction.',
  },
  {
    type: 'director_id',
    label: 'Director / Owner ID',
    description:
      'Government-issued photo identification for all directors and beneficial owners holding 25% or more.',
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description:
      'Utility bill or official correspondence dated within the last three months confirming the registered business address.',
  },
  {
    type: 'bank_statements_12m',
    label: '12-Month Bank Statements',
    description:
      'Full 12 months of primary business account statements demonstrating trading activity and cash-flow patterns.',
  },
]

export const TRACK_REQUIREMENTS = {
  sme: [
    {
      type: 'management_accounts',
      label: 'Management Accounts',
      description:
        'Most recent interim management accounts, typically covering the past six to twelve months of trading.',
    },
    {
      type: 'tax_clearance',
      label: 'Tax Clearance Certificate',
      description:
        'Current tax compliance certificate issued by the relevant revenue authority confirming no outstanding liabilities.',
    },
  ],
  project: [
    {
      type: 'feasibility_study',
      label: 'Feasibility Study',
      description:
        'Independent or in-house study assessing technical, commercial, and financial viability of the project.',
    },
    {
      type: 'land_site_evidence',
      label: 'Land / Title or Site Evidence',
      description:
        'Title deed, site lease, or option agreement confirming the sponsor has secured or controls the project site.',
    },
    {
      type: 'sponsor_profile',
      label: 'Sponsor Profile',
      description:
        'Company profile and track record of the project sponsor, including prior developments of comparable scale.',
    },
  ],
  trade: [
    {
      type: 'counterparty_contract',
      label: 'Counterparty Contract or Purchase Order',
      description:
        'Signed trade agreement, supply contract, or purchase order evidencing the underlying commercial transaction.',
    },
    {
      type: 'trade_history',
      label: 'Trade History',
      description:
        'Summary of prior trading relationships and completed transactions with key counterparties.',
    },
  ],
  acquisition: [
    {
      type: 'target_financials',
      label: 'Target Financials',
      description:
        'Audited or management accounts for the acquisition target covering at least the last two full financial years.',
    },
    {
      type: 'heads_of_terms',
      label: 'Heads of Terms',
      description:
        'Signed or draft heads of terms / letter of intent outlining the key commercial and pricing parameters of the proposed acquisition.',
    },
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the full requirements list for a given financing track.
 * Unknown or null tracks fall back to the four common items.
 *
 * @param {string|null} track  - 'sme' | 'project' | 'trade' | 'acquisition' | null
 * @returns {Array<{ type: string, label: string, description: string }>}
 */
export function getRequirements(track) {
  const trackItems = (track && TRACK_REQUIREMENTS[track]) || []
  return [...COMMON_REQUIREMENTS, ...trackItems]
}

/**
 * Derives the status of each requirement against uploaded documents.
 *
 * Matching logic (first match wins):
 *  1. doc.document_type === requirement.type
 *  2. doc.label === requirement.label  (fallback)
 *
 * Status values:
 *  - 'outstanding' — no matching document found
 *  - 'received'    — matching document uploaded
 *  - 'verified'    — matching document AND verified (only when VERIFICATION_ENABLED is true)
 *
 * @param {Array<{ type: string, label: string, description: string }>} requirements
 * @param {Array<{ document_type?: string, label?: string, note?: string }>} documents
 * @returns {Array<{ type: string, label: string, description: string, status: string }>}
 */
export function deriveChecklist(requirements, documents) {
  return requirements.map((req) => {
    const match = documents.find(
      (doc) =>
        doc.document_type === req.type ||
        (doc.label && doc.label === req.label)
    )

    if (!match) {
      return { ...req, status: 'outstanding' }
    }

    if (VERIFICATION_ENABLED && match.note && /verif/i.test(match.note)) {
      return { ...req, status: 'verified' }
    }

    return { ...req, status: 'received' }
  })
}
