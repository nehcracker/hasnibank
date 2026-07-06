import { render, screen } from '@testing-library/react'
import AssessmentTab from '../tabs/AssessmentTab'

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

const APPLICATION = { id: 'app-1', status: 'credit_assessment' }
const USER = { id: 'staff-1' }

function setup(props = {}) {
  const defaults = {
    application: APPLICATION,
    findings: [],
    notices: [],
    rfis: [],
    user: USER,
    onChanged: vi.fn(),
  }
  return render(<AssessmentTab {...defaults} {...props} />)
}

test('empty state renders all pillars as not yet assessed', () => {
  setup()
  expect(screen.getAllByText(/not yet assessed/i)).toHaveLength(5)
})

test('internal note and visible statement render in distinct blocks', () => {
  const findings = [{
    id: 'f-1', pillar: 'financial_records', severity: 'critical',
    score: 0.5, internal_note: 'Bank statements inconsistent with declared revenue.',
    status: 'open', created_at: '2026-07-06T10:00:00Z',
  }]
  const notices = [{
    id: 'n-1', finding_id: 'f-1', application_id: 'app-1',
    statement: 'Please clarify the variance between declared revenue and bank inflows.',
  }]
  setup({ findings, notices })

  const internal = screen.getByTestId('internal-note-f-1')
  const visible = screen.getByTestId('visible-statement-f-1')
  expect(internal).toHaveTextContent('Bank statements inconsistent')
  expect(visible).toHaveTextContent('Please clarify the variance')
  expect(internal).not.toBe(visible)
  expect(screen.getByText(/staff only/i)).toBeInTheDocument()
  expect(screen.getByText(/visible to applicant/i)).toBeInTheDocument()
})

test('pillar with only informational findings renders collapsed', () => {
  const findings = [{
    id: 'f-2', pillar: 'compliance', severity: 'informational',
    score: 1.5, internal_note: 'Registrations current.', status: 'open',
    created_at: '2026-07-06T10:00:00Z',
  }]
  setup({ findings })
  const pillarDetails = screen.getByTestId('pillar-compliance')
  expect(pillarDetails).not.toHaveAttribute('open')
})

test('pillar with a critical finding renders expanded', () => {
  const findings = [{
    id: 'f-3', pillar: 'collateral', severity: 'critical',
    score: 0, internal_note: 'No ownership evidence.', status: 'open',
    created_at: '2026-07-06T10:00:00Z',
  }]
  setup({ findings })
  expect(screen.getByTestId('pillar-collateral')).toHaveAttribute('open')
})

test('gate banner appears when critical findings or open RFIs exist', () => {
  const findings = [{
    id: 'f-4', pillar: 'capacity', severity: 'critical', score: 0,
    internal_note: 'x', status: 'open', created_at: '2026-07-06T10:00:00Z',
  }]
  const rfis = [{
    id: 'r-1', prompt: 'Provide the collateral valuation.', response_type: 'document',
    status: 'open', created_at: '2026-07-06T10:00:00Z',
  }]
  setup({ findings, rfis })
  expect(screen.getByTestId('gate-banner')).toHaveTextContent(/1 critical finding/i)
  expect(screen.getByTestId('gate-banner')).toHaveTextContent(/1 open request/i)
})

test('no gate banner when clear', () => {
  setup()
  expect(screen.queryByTestId('gate-banner')).not.toBeInTheDocument()
})

test('RFI rows render prompt, status, and lifecycle actions', () => {
  const rfis = [
    {
      id: 'r-open', prompt: 'Provide tax clearance.', response_type: 'document',
      status: 'open', created_at: '2026-07-06T10:00:00Z',
    },
    {
      id: 'r-resp', prompt: 'Confirm annual revenue figure.', response_type: 'figure',
      status: 'responded', response_payload: { value: '2400000' },
      responded_at: '2026-07-06T11:00:00Z', created_at: '2026-07-06T10:00:00Z',
    },
  ]
  setup({ rfis })
  expect(screen.getByText('Provide tax clearance.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /cancel request/i })).toBeInTheDocument()
  expect(screen.getByText('Confirm annual revenue figure.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  expect(screen.getByText('2400000')).toBeInTheDocument()
})
