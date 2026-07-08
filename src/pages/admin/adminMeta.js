/**
 * adminMeta.js
 *
 * Shared display metadata for the staff workspace. Pure data, no React.
 */

export const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}

export const FIELD_LABELS = {
  businessName: 'Business Name', businessType: 'Business Type',
  countryOfRegistration: 'Country of Registration', annualRevenue: 'Annual Revenue',
  loanPurpose: 'Financing Purpose', amountSought: 'Amount Sought',
  collateralAvailable: 'Collateral Available', collateralDescription: 'Collateral Description',
  description: 'Description',
  // Phase D SME grouped-form keys
  registrationNumber: 'Registration Number', timeInOperation: 'Time in Operation (years)',
  employees: 'Number of Employees', email: 'Email', phone: 'Phone',
  address: 'Business Address', monthlySales: 'Average Monthly Sales (USD)',
  existingDebt: 'Existing Debt Obligations',
  projectName: 'Project Name', sector: 'Sector', fundingStructure: 'Funding Structure',
  totalProjectValue: 'Total Project Value', projectTimeline: 'Project Timeline',
  keySponsors: 'Key Sponsors',
  companyName: 'Company Name', tradeType: 'Trade Type',
  counterpartyCountry: 'Counterparty Country', transactionValue: 'Transaction Value',
  acquiringCompanyName: 'Acquiring Company', targetDescription: 'Target Description',
  dealStructure: 'Deal Structure', totalAcquisitionValue: 'Total Acquisition Value',
  expectedClosingTimeline: 'Expected Closing',
}

/**
 * Field grouping for the SME track's Phase D grouped application form,
 * mirroring ApplicationForm.jsx's four groups. Used by ApplicationTab to
 * present the applicant's submitted values in the same shape staff already
 * see them in the mockup, rather than one flat list.
 */
export const SME_FIELD_GROUPS = [
  {
    label: 'Business',
    keys: ['businessName', 'registrationNumber', 'businessType', 'countryOfRegistration', 'timeInOperation', 'sector', 'employees'],
  },
  {
    label: 'Contact',
    keys: ['email', 'phone', 'address'],
  },
  {
    label: 'Financials',
    keys: ['monthlySales', 'existingDebt'],
  },
  {
    label: 'Financing request',
    keys: ['loanPurpose', 'amountSought', 'description'],
  },
]

export const EVENT_LABELS = {
  status_change:  'Status change',
  note:           'Note',
  document:       'Document',
  message:        'Message',
  fee:            'Fee',
  payment:        'Payment',
  stage_override: 'Stage override',
  rfi:            'Information request',
  offer:          'Offer',
  disbursement:   'Disbursement',
}

/** One-line detail for an application_events row. */
export function eventDetail(event) {
  const p = event.payload ?? {}
  if (p.note) return p.note
  if (p.detail) return p.detail
  if (event.event_type === 'status_change' && p.new_status) {
    return `Advanced to ${p.new_status.replace(/_/g, ' ')}`
  }
  if (event.event_type === 'stage_override' && p.to) {
    return `Advanced to ${String(p.to).replace(/_/g, ' ')} with open items`
  }
  if (p.action) return String(p.action).replace(/_/g, ' ')
  return ''
}
