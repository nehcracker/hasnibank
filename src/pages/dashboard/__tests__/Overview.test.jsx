import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// vi.hoisted ensures these mock fns exist before vi.mock factories run
const { mockUseAuth, mockUseApplication } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseApplication: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useApplication', () => ({ useApplication: mockUseApplication }))

import Overview from '../Overview'

const DEFAULT_AUTH = {
  user: { id: 'user-1' },
  profile: { full_name: 'Jane Smith', client_ref: 'HB-0042' },
  role: 'borrower',
  loading: false,
}

const SAMPLE_APPLICATION = {
  id: 'app-1',
  track: 'sme',
  amount_sought: 500000,
  currency: 'USD',
  status: 'submitted',
  created_at: '2026-06-01T00:00:00Z',
}

function setup(application = null) {
  mockUseAuth.mockReturnValue(DEFAULT_AUTH)
  mockUseApplication.mockReturnValue({
    application,
    loading: false,
    refresh: vi.fn(),
  })
  return render(
    <MemoryRouter>
      <Overview />
    </MemoryRouter>
  )
}

// Test 1: No application — 4 financing-track service cards visible
test('renders 4 financing-track service cards when no application', () => {
  setup(null)
  expect(screen.getByText('SME Financing')).toBeInTheDocument()
  expect(screen.getByText('Project Funding')).toBeInTheDocument()
  expect(screen.getByText('Trade Finance')).toBeInTheDocument()
  expect(screen.getByText('Acquisition Finance')).toBeInTheDocument()
})

// Test 1b: Service cards link into the start flow with track preselected
test('service cards link to /dashboard/start with track param', () => {
  setup(null)
  const links = screen.getAllByRole('link')
  const smeCard = links.find(
    (l) => l.getAttribute('href') === '/dashboard/start?track=sme'
  )
  expect(smeCard).toBeTruthy()
})

// Test 2: Application exists — summary card shows track label and stage
test('renders application summary card with track label and stage when application exists', () => {
  setup(SAMPLE_APPLICATION)
  expect(screen.getByText('SME Financing')).toBeInTheDocument()
  expect(screen.getByText('Submitted')).toBeInTheDocument()
  expect(screen.getByText('View full application')).toBeInTheDocument()
})

// Test 2b: Draft application — completion summary and Resume link
test('renders draft summary with completion percentage and resume link', () => {
  setup({
    ...SAMPLE_APPLICATION,
    status: 'draft',
    fields: {
      businessName: 'Acme', registrationNumber: 'RC-1',
      businessType: 'private_limited', countryOfRegistration: 'Kenya',
      timeInOperation: '4',
    },
  })
  // 5 of 10 required SME fields filled
  expect(screen.getByText(/draft · 50% complete/i)).toBeInTheDocument()
  expect(screen.getByText('Resume')).toBeInTheDocument()
})

// Test 3a: Self-service tool cards — no application state
test('renders self-service tool cards when no application', () => {
  setup(null)
  expect(screen.getByText('Repayment modelling')).toBeInTheDocument()
  expect(screen.getByText('Eligibility check')).toBeInTheDocument()
})

// Test 3b: Self-service tool cards — application exists state
test('renders self-service tool cards when application exists', () => {
  setup(SAMPLE_APPLICATION)
  expect(screen.getByText('Repayment modelling')).toBeInTheDocument()
  expect(screen.getByText('Eligibility check')).toBeInTheDocument()
})
