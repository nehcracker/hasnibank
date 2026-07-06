import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ActionCard from '../ActionCard'
import { getRequirements, deriveChecklist } from '@/data/docRequirements'

const SME_CHECKLIST_EMPTY = deriveChecklist(getRequirements('sme'), [])
const SME_CHECKLIST_FULL = deriveChecklist(
  getRequirements('sme'),
  getRequirements('sme').map((r) => ({ document_type: r.type }))
)

function makeApp(overrides = {}) {
  return {
    id: 'app-1',
    track: 'sme',
    status: 'draft',
    amount_sought: 500000,
    currency: 'USD',
    business_profile: {},
    ...overrides,
  }
}

function setup(props = {}) {
  const defaults = {
    state: 'draft_profile',
    application: makeApp(),
    checklist: SME_CHECKLIST_EMPTY,
    completionPct: 0,
    canSubmitNow: false,
    submitting: false,
    accepting: false,
    onResume: vi.fn(),
    onSubmit: vi.fn(),
    onAcceptOffer: vi.fn(),
  }
  return render(
    <MemoryRouter>
      <ActionCard {...defaults} {...props} />
    </MemoryRouter>
  )
}

test('draft_profile shows completion bar and resume button for first incomplete section', () => {
  setup({ state: 'draft_profile', completionPct: 10 })
  expect(screen.getByText('Complete your application')).toBeInTheDocument()
  expect(screen.getByText(/10% complete/i)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /resume: registration details/i })
  ).toBeInTheDocument()
  expect(
    screen.getByText(/your progress saves automatically/i)
  ).toBeInTheDocument()
})

test('draft_profile resume names the first incomplete section', () => {
  setup({
    state: 'draft_profile',
    application: makeApp({
      business_profile: { progress: { registration: true, trading: true } },
    }),
  })
  expect(
    screen.getByRole('button', { name: /resume: revenue and obligations/i })
  ).toBeInTheDocument()
})

test('draft_profile lists top 3 outstanding KYC items with a more link', () => {
  setup({ state: 'draft_profile' })
  // 6 outstanding for sme; top 3 shown, 3 more behind the checklist link
  expect(screen.getByText('Certificate of Incorporation')).toBeInTheDocument()
  expect(screen.getByText('Director / Owner ID')).toBeInTheDocument()
  expect(screen.getByText('Proof of Address')).toBeInTheDocument()
  expect(screen.queryByText('Management Accounts')).not.toBeInTheDocument()
  expect(screen.getByText(/\+3 more in the checklist/i)).toBeInTheDocument()
})

test('draft_kyc has no submit button while KYC outstanding', () => {
  setup({ state: 'draft_kyc', canSubmitNow: false })
  expect(
    screen.queryByRole('button', { name: /submit application/i })
  ).not.toBeInTheDocument()
})

test('draft_kyc shows submit button when canSubmitNow', () => {
  const onSubmit = vi.fn()
  setup({
    state: 'draft_kyc',
    checklist: SME_CHECKLIST_FULL,
    canSubmitNow: true,
    completionPct: 100,
    onSubmit,
  })
  const btn = screen.getByRole('button', { name: /submit application/i })
  expect(btn).toBeInTheDocument()
  btn.click()
  expect(onSubmit).toHaveBeenCalled()
})

test('in_review lists the three while-you-wait prompts', () => {
  setup({
    state: 'in_review',
    application: makeApp({ status: 'credit_assessment' }),
  })
  expect(
    screen.getByText(/nothing needed from you right now/i)
  ).toBeInTheDocument()
  expect(screen.getByText(/run the eligibility check/i)).toBeInTheDocument()
  expect(screen.getByText(/model your repayments/i)).toBeInTheDocument()
  expect(screen.getByText(/review your document checklist/i)).toBeInTheDocument()
})

test('offer_issued shows offer terms and accept action', () => {
  setup({
    state: 'offer_issued',
    application: makeApp({
      status: 'offer_issued',
      offer_terms: {
        principal: 400000,
        currency: 'USD',
        annual_rate_pct: 11.5,
        term_months: 36,
      },
    }),
  })
  expect(screen.getByText('$400,000.00')).toBeInTheDocument()
  expect(screen.getByText(/11.5%/)).toBeInTheDocument()
  expect(screen.getByText(/36 months/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /accept offer/i })).toBeInTheDocument()
})

test('fee_due shows pay action linking to fees', () => {
  setup({ state: 'fee_due', application: makeApp({ status: 'fee_payment' }) })
  expect(screen.getByRole('link', { name: /fees and payments/i })).toHaveAttribute(
    'href',
    '/dashboard/fees'
  )
})

test('funded shows close-out with export link', () => {
  setup({ state: 'funded', application: makeApp({ status: 'funded' }) })
  expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /export summary/i })).toHaveAttribute(
    'href',
    '/dashboard/export'
  )
})

// ── rfi_open (Phase C) ────────────────────────────────────────────────────────

const OPEN_RFIS = [
  {
    id: 'r-1', prompt: 'Provide your latest tax clearance certificate.',
    response_type: 'document', status: 'open', due_date: '2026-07-20',
  },
  {
    id: 'r-2', prompt: 'Confirm your audited annual revenue figure.',
    response_type: 'figure', status: 'open', due_date: null,
  },
]

test('rfi_open titles with the open item count and renders one row per open RFI', () => {
  setup({
    state: 'rfi_open',
    application: makeApp({ status: 'credit_assessment' }),
    rfis: OPEN_RFIS,
  })
  expect(
    screen.getByText(/the assessment team has requested 2 items/i)
  ).toBeInTheDocument()
  expect(screen.getByText(/latest tax clearance certificate/i)).toBeInTheDocument()
  expect(screen.getByText(/audited annual revenue figure/i)).toBeInTheDocument()
})

test('rfi_open renders the response control matching each request type', () => {
  setup({
    state: 'rfi_open',
    application: makeApp({ status: 'credit_assessment' }),
    rfis: OPEN_RFIS,
  })
  // document type gets an upload control; figure gets an inline field + send
  expect(screen.getByLabelText(/upload response/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /send response/i })).toBeInTheDocument()
})

test('rfi_open shows responded requests as sent and awaiting review', () => {
  setup({
    state: 'rfi_open',
    application: makeApp({ status: 'credit_assessment' }),
    rfis: [
      ...OPEN_RFIS,
      {
        id: 'r-3', prompt: 'Provide the shareholder register.',
        response_type: 'document', status: 'responded',
      },
    ],
  })
  expect(screen.getByText(/sent · awaiting review/i)).toBeInTheDocument()
})
