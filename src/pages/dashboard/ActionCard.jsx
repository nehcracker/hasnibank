import { useState } from 'react'
import { Link } from 'react-router-dom'
import stageMeta from '@/data/stageMeta'
import { getExtendedSections, EXTENDED_SECTION_LABELS } from '@/data/extendedSections'
import styles from './ActionCard.module.css'

export const SECTION_LABELS = {
  registration: 'Registration details',
  trading: 'Sector and trading history',
  financials: 'Revenue and obligations',
  purpose: 'Funding purpose',
  ...EXTENDED_SECTION_LABELS,
}

const SECTION_ORDER = ['registration', 'trading', 'financials', 'purpose']

/** Base sections plus any staff-required extended sections, in form order. */
function sectionOrderFor(application) {
  return [
    ...SECTION_ORDER,
    ...getExtendedSections(application?.required_sections).map((s) => s.key),
  ]
}

const WHILE_YOU_WAIT = [
  { label: 'Run the eligibility check', to: '/dashboard/eligibility' },
  { label: 'Model your repayments', to: '/dashboard/modelling' },
  { label: 'Review your document checklist', to: '/dashboard/checklist' },
]

function money(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function TickIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-gold)" strokeWidth="1.5" />
      <path
        d="M6.5 10l2.5 2.5 4.5-4.5"
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" stroke="var(--color-muted)" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * ActionCard — stage-aware "whose move is it" card.
 * Purely presentational; all data and mutations arrive via props.
 *
 * @param {object} props
 * @param {'draft_profile'|'draft_kyc'|'in_review'|'offer_issued'|'fee_due'|'funded'} props.state
 * @param {object} props.application
 * @param {Array}  props.checklist       derived doc checklist with status per item
 * @param {number} props.completionPct   overall draft completion 0..100
 * @param {boolean} props.canSubmitNow
 * @param {boolean} props.submitting
 * @param {boolean} props.accepting
 * @param {Array}  props.rfis            information_requests rows
 * @param {string|null} props.respondingRfiId  request currently being sent
 * @param {(section: string) => void} props.onResume
 * @param {() => void} props.onSubmit
 * @param {() => void} props.onAcceptOffer
 * @param {(rfi: object, response: { file?: File, value?: string }) => void} props.onRespondRfi
 */
export default function ActionCard({
  state,
  application,
  checklist = [],
  completionPct = 0,
  canSubmitNow = false,
  submitting = false,
  accepting = false,
  rfis = [],
  respondingRfiId = null,
  offer = null,
  onResume,
  onSubmit,
  onAcceptOffer,
  onRespondRfi,
}) {
  return (
    <section className={styles.card} aria-label="Next step">
      <CardBody
        state={state}
        application={application}
        checklist={checklist}
        completionPct={completionPct}
        canSubmitNow={canSubmitNow}
        submitting={submitting}
        accepting={accepting}
        rfis={rfis}
        respondingRfiId={respondingRfiId}
        offer={offer}
        onResume={onResume}
        onSubmit={onSubmit}
        onAcceptOffer={onAcceptOffer}
        onRespondRfi={onRespondRfi}
      />
    </section>
  )
}

function CardBody(props) {
  switch (props.state) {
    case 'draft_profile':
    case 'draft_kyc':
      return <DraftBlock {...props} />
    case 'rfi_open':
      return (
        <RfiBlock
          rfis={props.rfis}
          respondingRfiId={props.respondingRfiId}
          onRespondRfi={props.onRespondRfi}
        />
      )
    case 'in_review':
      return <InReviewBlock application={props.application} />
    case 'offer_issued':
      return <OfferBlock {...props} />
    case 'fee_due':
      return <FeeDueBlock />
    case 'funded':
    default:
      return <FundedBlock />
  }
}

/* ── Draft: profile + KYC two-column frame ─────────────────────────────────── */

function DraftBlock({
  state,
  application,
  checklist,
  completionPct,
  canSubmitNow,
  submitting,
  onResume,
  onSubmit,
}) {
  const sectionOrder = sectionOrderFor(application)
  const progress = application?.business_profile?.progress ?? {}
  const firstIncomplete = sectionOrder.find((s) => progress[s] !== true)
  const outstanding = checklist.filter((item) => item.status === 'outstanding')
  const topOutstanding = outstanding.slice(0, 3)
  const moreCount = outstanding.length - topOutstanding.length

  return (
    <>
      <h2 className={styles.title}>Complete your application</h2>

      <div className={styles.progressRow}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${completionPct}%` }} />
        </div>
        <span className={styles.progressLabel}>{completionPct}% complete</span>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Part 1: Business profile</h3>
          <ul className={styles.itemList}>
            {sectionOrder.map((key) => (
              <li key={key} className={styles.item}>
                {progress[key] === true ? <TickIcon /> : <CircleIcon />}
                <span
                  className={
                    progress[key] === true ? styles.itemDone : styles.itemPending
                  }
                >
                  {SECTION_LABELS[key]}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h3 className={styles.columnTitle}>Part 2: KYC documents</h3>
          {outstanding.length === 0 ? (
            <p className={styles.allReceived}>All required documents received.</p>
          ) : (
            <>
              <ul className={styles.itemList}>
                {topOutstanding.map((item) => (
                  <li key={item.type} className={styles.item}>
                    <CircleIcon />
                    <span className={styles.itemPending}>{item.label}</span>
                    <Link to="/dashboard/documents" className={styles.uploadLink}>
                      Upload
                    </Link>
                  </li>
                ))}
              </ul>
              {moreCount > 0 && (
                <Link to="/dashboard/checklist" className={styles.moreLink}>
                  +{moreCount} more in the checklist
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.actionRow}>
        {state === 'draft_profile' && firstIncomplete && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onResume?.(firstIncomplete)}
          >
            Resume: {SECTION_LABELS[firstIncomplete]}
          </button>
        )}
        {state === 'draft_kyc' &&
          (canSubmitNow ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onSubmit?.()}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit application'}
            </button>
          ) : (
            <Link to="/dashboard/documents" className={styles.primaryBtn}>
              Upload: {outstanding[0]?.label ?? 'documents'}
            </Link>
          ))}
      </div>

      <p className={styles.caption}>
        Your progress saves automatically. Submission unlocks when both parts are
        complete.
      </p>
    </>
  )
}

/* ── Open information requests ─────────────────────────────────────────────── */

function formatDue(date) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function RfiRow({ rfi, responding, onRespondRfi }) {
  const [value, setValue] = useState('')

  return (
    <li className={styles.rfiItem}>
      <p className={styles.rfiPrompt}>{rfi.prompt}</p>
      <p className={styles.rfiMeta}>
        Requested to progress your assessment
        {rfi.due_date ? ` · needed by ${formatDue(rfi.due_date)}` : ''}
      </p>

      {rfi.response_type === 'document' ? (
        <label className={styles.uploadControl}>
          <span className={styles.uploadControlLabel}>
            {responding ? 'Uploading...' : 'Upload response'}
          </span>
          <input
            type="file"
            className={styles.fileInput}
            aria-label="Upload response"
            disabled={responding}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onRespondRfi?.(rfi, { file })
            }}
          />
        </label>
      ) : (
        <div className={styles.rfiAnswerRow}>
          <input
            type={rfi.response_type === 'figure' ? 'number' : 'text'}
            className={styles.rfiAnswerInput}
            placeholder={
              rfi.response_type === 'figure' ? 'Enter the figure' : 'Type your answer'
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={responding}
          />
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={responding || !value.trim()}
            onClick={() => onRespondRfi?.(rfi, { value: value.trim() })}
          >
            {responding ? 'Sending...' : 'Send response'}
          </button>
        </div>
      )}
    </li>
  )
}

function RfiBlock({ rfis = [], respondingRfiId, onRespondRfi }) {
  const open = rfis.filter((r) => r.status === 'open')
  const responded = rfis.filter((r) => r.status === 'responded')

  return (
    <>
      <h2 className={styles.title}>
        The assessment team has requested {open.length} item{open.length === 1 ? '' : 's'}
      </h2>
      <p className={styles.body}>
        Responding promptly keeps your assessment moving. Each item below can be
        resolved right here.
      </p>
      <ul className={styles.rfiList}>
        {open.map((rfi) => (
          <RfiRow
            key={rfi.id}
            rfi={rfi}
            responding={respondingRfiId === rfi.id}
            onRespondRfi={onRespondRfi}
          />
        ))}
      </ul>
      {responded.length > 0 && (
        <ul className={styles.rfiList}>
          {responded.map((rfi) => (
            <li key={rfi.id} className={styles.rfiItemSent}>
              <p className={styles.rfiPrompt}>{rfi.prompt}</p>
              <p className={styles.rfiMeta}>Sent · awaiting review</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/* ── In review: monitoring mode ────────────────────────────────────────────── */

function InReviewBlock({ application }) {
  const stage = stageMeta.find((s) => s.key === application?.status)
  return (
    <>
      <h2 className={styles.title}>Nothing needed from you right now.</h2>
      <p className={styles.body}>
        Your application is with our team{stage ? ` for ${stage.label.toLowerCase()}` : ''}.
        {stage?.slaDays && (
          <span className={styles.slaInline}>
            {' '}
            This stage typically takes {stage.slaDays[0]} to {stage.slaDays[1]} business
            days.
          </span>
        )}
      </p>
      <h3 className={styles.columnTitle}>While you wait</h3>
      <ul className={styles.waitList}>
        {WHILE_YOU_WAIT.map(({ label, to }) => (
          <li key={to}>
            <Link to={to} className={styles.waitLink}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ── Offer issued ──────────────────────────────────────────────────────────── */

function OfferBlock({ application, offer, accepting, onAcceptOffer }) {
  const [declared, setDeclared] = useState(false)
  // Versioned offer wins; applications.offer_terms remains the fallback
  const terms = offer?.terms ?? application?.offer_terms
  const expired =
    offer?.status === 'issued' &&
    offer?.valid_until &&
    new Date(offer.valid_until) < new Date(new Date().toDateString())
  const companyName = application?.business_profile?.registration?.legalName

  if (expired) {
    return (
      <>
        <h2 className={styles.title}>Your financing offer has expired</h2>
        <p className={styles.body}>
          The validity period of this offer has passed. Contact the team through
          Messages to have terms reissued.
        </p>
        <div className={styles.actionRow}>
          <Link to="/dashboard/messages" className={styles.primaryBtn}>
            Go to messages
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 className={styles.title}>Your financing offer</h2>
      {terms ? (
        <dl className={styles.termsGrid}>
          <div className={styles.term}>
            <dt className={styles.termLabel}>Amount</dt>
            <dd className={styles.termValue}>
              {money(terms.principal, terms.currency ?? application.currency)}
            </dd>
          </div>
          <div className={styles.term}>
            <dt className={styles.termLabel}>Annual rate</dt>
            <dd className={styles.termValue}>{terms.annual_rate_pct}%</dd>
          </div>
          <div className={styles.term}>
            <dt className={styles.termLabel}>Term</dt>
            <dd className={styles.termValue}>{terms.term_months} months</dd>
          </div>
          {offer?.valid_until && (
            <div className={styles.term}>
              <dt className={styles.termLabel}>Valid until</dt>
              <dd className={styles.termValue}>{formatDue(offer.valid_until)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className={styles.body}>
          Your offer documents are being prepared. Review them under Documents when
          they arrive.
        </p>
      )}
      {application?.status === 'offer_issued' && terms && (
        <label className={styles.declarationRow}>
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
          />
          I have read and accept the terms of this offer
          {companyName ? ` on behalf of ${companyName}` : ''}.
        </label>
      )}
      <div className={styles.actionRow}>
        {application?.status === 'offer_issued' && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onAcceptOffer?.(declared)}
            disabled={accepting || (terms && !declared)}
          >
            {accepting ? 'Accepting...' : 'Accept offer'}
          </button>
        )}
        {offer && (
          <Link to="/dashboard/offer-letter" className={styles.secondaryLink}>
            View offer letter
          </Link>
        )}
        <Link to="/dashboard/modelling" className={styles.secondaryLink}>
          See your repayment schedule
        </Link>
      </div>
    </>
  )
}

/* ── Fee due ───────────────────────────────────────────────────────────────── */

function FeeDueBlock() {
  return (
    <>
      <h2 className={styles.title}>Fees are due to progress your financing</h2>
      <p className={styles.body}>
        Engagement and arrangement fees are settled at this stage to move your
        transaction to disbursement. The exact amount and settlement instructions
        are listed on your fees page.
      </p>
      <div className={styles.actionRow}>
        <Link to="/dashboard/fees" className={styles.primaryBtn}>
          Go to fees and payments
        </Link>
      </div>
    </>
  )
}

/* ── Funded ────────────────────────────────────────────────────────────────── */

function FundedBlock() {
  return (
    <>
      <h2 className={styles.title}>Congratulations, your financing is funded</h2>
      <p className={styles.body}>
        Capital has been disbursed to your designated account. Keep a copy of your
        application for your records.
      </p>
      <div className={styles.actionRow}>
        <Link to="/dashboard/export" className={styles.primaryBtn}>
          Export summary
        </Link>
      </div>
    </>
  )
}
