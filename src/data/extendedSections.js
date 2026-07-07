/**
 * extendedSections.js
 *
 * Staff-toggleable extended intake sections. Staff switch a section on from
 * the application workspace (written to applications.required_sections);
 * the borrower's business profile form and Part 1 list then include it.
 * Pure data module — no React, no Supabase.
 */

export const EXTENDED_SECTIONS = [
  {
    key: 'shareholding',
    label: 'Shareholding and directors',
    description: 'Ownership structure, directors, and politically exposed person declaration.',
    fields: [
      { name: 'directors', label: 'Directors (names and roles)', type: 'textarea' },
      { name: 'ownership', label: 'Ownership breakdown (holders and percentages)', type: 'textarea' },
      {
        name: 'pepDeclaration',
        label: 'Are any owners or directors politically exposed persons?',
        type: 'radio',
        options: ['yes', 'no'],
      },
    ],
  },
  {
    key: 'collateral',
    label: 'Collateral and security',
    description: 'Assets offered as security and the evidence of ownership held.',
    fields: [
      { name: 'collateralType', label: 'Collateral type', type: 'text' },
      { name: 'ownershipEvidence', label: 'Ownership evidence held', type: 'text' },
      { name: 'estimatedValue', label: 'Estimated value', type: 'number' },
    ],
  },
  {
    key: 'banking',
    label: 'Banking and facilities',
    description: 'Revenue history and existing credit facilities.',
    fields: [
      { name: 'revenueHistory', label: 'Revenue for each of the last 3 years', type: 'textarea' },
      {
        name: 'facilities',
        label: 'Existing facilities (lender, outstanding balance, repayments)',
        type: 'textarea',
      },
    ],
  },
  {
    key: 'track_record',
    label: 'Management track record',
    description: 'Experience and past performance of the management team.',
    fields: [
      { name: 'experience', label: 'Management experience summary', type: 'textarea' },
    ],
  },
]

export const EXTENDED_SECTION_KEYS = EXTENDED_SECTIONS.map((s) => s.key)

export const EXTENDED_SECTION_LABELS = Object.fromEntries(
  EXTENDED_SECTIONS.map((s) => [s.key, s.label])
)

/**
 * The extended sections active for an application, in canonical order.
 *
 * @param {string[]|null|undefined} requiredSections - applications.required_sections
 */
export function getExtendedSections(requiredSections) {
  const active = requiredSections ?? []
  return EXTENDED_SECTIONS.filter((s) => active.includes(s.key))
}
