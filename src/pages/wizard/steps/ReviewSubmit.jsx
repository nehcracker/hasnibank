import styles from '../Wizard.module.css'

const TRACK_LABELS = {
  sme: 'SME Financing', project: 'Project Funding',
  trade: 'Trade Finance', acquisition: 'Acquisition Finance',
}
const BUSINESS_TYPE = {
  sole_trader: 'Sole Trader', partnership: 'Partnership',
  private_limited: 'Private Limited', public_company: 'Public Company',
}
const ANNUAL_REVENUE = {
  '<100k': 'Under $100k', '100k-500k': '$100k – $500k',
  '500k-2m': '$500k – $2M', '2m-10m': '$2M – $10M', '>10m': 'Over $10M',
}
const LOAN_PURPOSE = {
  working_capital: 'Working Capital', equipment_finance: 'Equipment Finance',
  business_expansion: 'Business Expansion', trade_finance: 'Trade Finance',
}
const SECTOR = {
  infrastructure: 'Infrastructure', energy: 'Energy', real_estate: 'Real Estate',
  agriculture: 'Agriculture', manufacturing: 'Manufacturing', mining: 'Mining & Resources',
}
const FUNDING_STRUCTURE = {
  debt: 'Debt Finance', equity: 'Equity Finance',
  joint_ventures: 'Joint Ventures', structured: 'Structured Finance',
}
const PROJECT_TIMELINE = {
  '<12m': 'Under 12 months', '1-3y': '1 – 3 years', '3-5y': '3 – 5 years', '5y+': '5+ years',
}
const TRADE_TYPE = {
  import_lc: 'Import Letter of Credit', export_lc: 'Export Letter of Credit',
  invoice_discounting: 'Invoice Discounting', supply_chain: 'Supply Chain Finance',
}
const DEAL_STRUCTURE = {
  lbo: 'Leveraged Buyout', mbo: 'Management Buyout',
  asset_acquisition: 'Asset Acquisition', share_acquisition: 'Share Acquisition',
}

function usd(n) {
  return `USD ${Number(n).toLocaleString('en-US')}`
}

export default function ReviewSubmit({ track, fields, onEditTrack, onBack, onSubmit, submitting, submitError }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Review &amp; Submit</h2>
      <p className={styles.sectionSub}>
        Please review your application carefully before submitting.
      </p>

      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionLabel}>Financing Track</div>
        <div className={styles.reviewGrid}>
          <Item label="Track" value={TRACK_LABELS[track]} />
        </div>
        <button type="button" className={styles.editLink} onClick={onEditTrack}>
          Edit track selection
        </button>
      </div>

      {track === 'sme' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>SME Financing Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Business name" value={fields.businessName} />
            <Item label="Business type" value={BUSINESS_TYPE[fields.businessType]} />
            <Item label="Country of registration" value={fields.countryOfRegistration} />
            <Item label="Annual revenue" value={ANNUAL_REVENUE[fields.annualRevenue]} />
            <Item label="Loan purpose" value={LOAN_PURPOSE[fields.loanPurpose]} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Collateral available" value={fields.collateralAvailable === 'yes' ? 'Yes' : 'No'} />
            {fields.collateralAvailable === 'yes' && (
              <Item label="Collateral description" value={fields.collateralDescription} />
            )}
            <Item label="Description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'project' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Project Funding Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Project name" value={fields.projectName} />
            <Item label="Sector" value={SECTOR[fields.sector]} />
            <Item label="Funding structure" value={FUNDING_STRUCTURE[fields.fundingStructure]} />
            <Item label="Total project value" value={usd(fields.totalProjectValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Project timeline" value={PROJECT_TIMELINE[fields.projectTimeline]} />
            <Item label="Key sponsors / parties" value={fields.keySponsors} />
            <Item label="Project description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'trade' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Trade Finance Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Company name" value={fields.companyName} />
            <Item label="Trade type" value={TRADE_TYPE[fields.tradeType]} />
            <Item label="Counterparty country" value={fields.counterpartyCountry} />
            <Item label="Transaction value" value={usd(fields.transactionValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Transaction description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      {track === 'acquisition' && (
        <div className={styles.reviewSection}>
          <div className={styles.reviewSectionLabel}>Acquisition Finance Details</div>
          <div className={styles.reviewGrid}>
            <Item label="Acquiring company" value={fields.acquiringCompanyName} />
            <Item label="Target description" value={fields.targetDescription} />
            <Item label="Deal structure" value={DEAL_STRUCTURE[fields.dealStructure]} />
            <Item label="Total acquisition value" value={usd(fields.totalAcquisitionValue)} />
            <Item label="Amount sought" value={usd(fields.amountSought)} />
            <Item label="Expected closing timeline" value={fields.expectedClosingTimeline} />
            <Item label="Deal description" value={fields.description} span2 />
          </div>
          <button type="button" className={styles.editLink} onClick={onBack}>Edit details</button>
        </div>
      )}

      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>Back</button>
        <button className={styles.submitBtn} onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </div>
      {submitError && <p className={styles.submitError}>{submitError}</p>}
    </div>
  )
}

function Item({ label, value, span2 }) {
  return (
    <div className={`${styles.reviewItem} ${span2 ? styles.span2 : ''}`}>
      <span className={styles.reviewItemLabel}>{label}</span>
      <span className={styles.reviewItemValue}>{value}</span>
    </div>
  )
}
