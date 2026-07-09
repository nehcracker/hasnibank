/**
 * initialFields.js
 *
 * Default `fields` jsonb shape per financing track. Previously lived inside
 * ApplicationWizard.jsx (Phase 1); moved here so ApplicationForm and
 * StartApplication share one source without importing a page component.
 *
 * SME field set reflects the Phase D grouped application form: the annual
 * revenue band is dropped in favor of `monthlySales`, and registration,
 * contact, and financials fields are added. Project, trade, and acquisition
 * keep their existing field sets — only SME is in scope for Phase D.
 */
export const INITIAL_FIELDS = {
  sme: {
    businessName: '', registrationNumber: '', businessType: '',
    countryOfRegistration: '', timeInOperation: '', sector: '', employees: '',
    email: '', confirmEmail: '', phone: '', confirmPhone: '', address: '',
    monthlySales: '', existingDebt: '',
    loanPurpose: '', amountSought: '', description: '',
  },
  project: {
    projectName: '', sector: '', fundingStructure: '',
    totalProjectValue: '', amountSought: '', projectTimeline: '',
    keySponsors: '', description: '',
  },
  trade: {
    companyName: '', tradeType: '', counterpartyCountry: '',
    transactionValue: '', amountSought: '', description: '',
  },
  acquisition: {
    acquiringCompanyName: '', targetDescription: '', dealStructure: '',
    totalAcquisitionValue: '', amountSought: '',
    expectedClosingTimeline: '', description: '',
  },
}
