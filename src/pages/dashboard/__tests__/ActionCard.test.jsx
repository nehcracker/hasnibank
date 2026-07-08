import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ActionCard from '../ActionCard'

function makeApp(overrides = {}) {
  return {
    id: 'app-1',
    track: 'sme',
    status: 'draft',
    amount_sought: 500000,
    currency: 'USD',
    fields: {},
    ...overrides,
  }
}

function setup(props = {}) {
  const defaults = {
    state: 'draft',
    application: makeApp(),
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

// ── draft: single state, no Part 1 / Part 2 split ────────────────────────────

test('draft shows completion bar and a Resume button while incomplete', () => {
  setup({ state: 'draft', completionPct: 30, canSubmitNow: false })
  expect(screen.getByText('Complete your application')).toBeInTheDocument()
  expect(screen.getByText(/30% complete/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^resume$/i })).toBeInTheDocument()
  expect(screen.queryByText(/part 1/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/part 2/i)).not.toBeInTheDocument()
})

test('draft Resume button calls onResume', () => {
  const onResume = vi.fn()
  setup({ state: 'draft', completionPct: 30, canSubmitNow: false, onResume })
  screen.getByRole('button', { name: /^resume$/i }).click()
  expect(onResume).toHaveBeenCalled()
})

test('draft shows Submit application once canSubmitNow is true, no Resume button', () => {
  const onSubmit = vi.fn()
  setup({ state: 'draft', completionPct: 100, canSubmitNow: true, onSubmit })
  expect(screen.queryByRole('button', { name: /^resume$/i })).not.toBeInTheDocument()
  const btn = screen.getByRole('button', { name: /submit application/i })
  btn.click()
  expect(onSubmit).toHaveBeenCalled()
})

test('draft submit button is disabled while submitting', () => {
  setup({ state: 'draft', completionPct: 100, canSubmitNow: true, submitting: true })
  expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
})

test('draft does not mention the self-check as a required step', () => {
  setup({ state: 'draft', completionPct: 30, canSubmitNow: false })
  expect(screen.queryByText(/self-check/i)).not.toBeInTheDocument()
})

// ── in_review: while-you-wait keeps the optional self-check link ─────────────

test('in_review lists the three while-you-wait prompts including the self-check', () => {
  setup({
    state: 'in_review',
    application: makeApp({ status: 'credit_assessment' }),
  })
  expect(
    screen.getByText(/nothing needed from you right now/i)
  ).toBeInTheDocument()
  expect(screen.getByText(/run the eligibility check/i)).toBeInTheDocument()
  expect(screen.getByText(/model your repayments/i)).toBeInTheDocument()
  expect(screen.getByText(/review your documents/i)).toBeInTheDocument()
})

// ── offer_issued ──────────────────────────────────────────────────────────────

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

// ── fee_due ───────────────────────────────────────────────────────────────────

test('fee_due shows pay action linking to fees', () => {
  setup({ state: 'fee_due', application: makeApp({ status: 'fee_payment' }) })
  expect(screen.getByRole('link', { name: /fees and payments/i })).toHaveAttribute(
    'href',
    '/dashboard/fees'
  )
})

// ── funded ────────────────────────────────────────────────────────────────────

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
