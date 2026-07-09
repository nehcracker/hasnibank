import { render, screen, fireEvent } from '@testing-library/react'

const { mockUpdate, mockEq, mockSingle, mockSelect } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockEq = vi.fn(() => ({ select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  return { mockUpdate, mockEq, mockSingle, mockSelect }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ update: mockUpdate }) },
}))

import ApplicationForm from '../ApplicationForm'

function makeApp(overrides = {}) {
  return {
    id: 'app-1',
    track: 'sme',
    amount_sought: 250000,
    currency: 'USD',
    fields: {},
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  mockUpdate.mockClear()
  mockEq.mockClear()
  mockSingle.mockResolvedValue({
    data: { ...makeApp(), fields: { businessName: 'Acme' } },
    error: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

test('renders the four grouped headings from the approved mockup', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)
  expect(screen.getByRole('heading', { name: /^business$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^contact$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^financials$/i })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /financing request/i })).toBeInTheDocument()
})

test('prefills email from the profile when the draft has none yet', () => {
  render(
    <ApplicationForm
      application={makeApp()}
      profile={{ email: 'founder@acme.test' }}
    />
  )
  expect(screen.getByLabelText('Email')).toHaveValue('founder@acme.test')
})

test('an existing draft email overrides the profile email', () => {
  render(
    <ApplicationForm
      application={makeApp({ fields: { email: 'draft@acme.test' } })}
      profile={{ email: 'founder@acme.test' }}
    />
  )
  expect(screen.getByLabelText('Email')).toHaveValue('draft@acme.test')
})

test('prefills amount sought from the application row when the draft has none yet', () => {
  render(<ApplicationForm application={makeApp({ amount_sought: 250000 })} profile={{}} />)
  expect(screen.getByLabelText(/amount sought/i)).toHaveValue(250000)
})

test('typing autosaves the merged fields jsonb after the debounce window', async () => {
  const onSaved = vi.fn()
  render(<ApplicationForm application={makeApp()} profile={{}} onSaved={onSaved} />)

  fireEvent.change(screen.getByLabelText(/business name/i), {
    target: { value: 'Acme Traders' },
  })

  // No save yet — debounced
  expect(mockUpdate).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(800)

  expect(mockUpdate).toHaveBeenCalledTimes(1)
  const payload = mockUpdate.mock.calls[0][0]
  expect(payload.fields.businessName).toBe('Acme Traders')
  expect(onSaved).toHaveBeenCalled()
})

test('no per-section mark-complete control is present; the form is continuous', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)
  expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument()
})

test('shows a mismatch message when confirm email diverges from email', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'founder@acme.test' },
  })
  fireEvent.change(screen.getByLabelText('Confirm email'), {
    target: { value: 'typo@acme.test' },
  })

  expect(screen.getByText('Emails do not match')).toBeInTheDocument()
})

test('clears the email mismatch message once the values match', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'founder@acme.test' },
  })
  fireEvent.change(screen.getByLabelText('Confirm email'), {
    target: { value: 'founder@acme.test' },
  })

  expect(screen.queryByText('Emails do not match')).not.toBeInTheDocument()
})

test('shows a mismatch message when confirm phone diverges from phone', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Phone'), {
    target: { value: '+254700000000' },
  })
  fireEvent.change(screen.getByLabelText('Confirm phone'), {
    target: { value: '+254700000001' },
  })

  expect(screen.getByText('Phone numbers do not match')).toBeInTheDocument()
})

test('does not show a phone mismatch when phone is still blank', () => {
  render(<ApplicationForm application={makeApp()} profile={{}} />)

  fireEvent.change(screen.getByLabelText('Confirm phone'), {
    target: { value: '+254700000001' },
  })

  expect(screen.queryByText('Phone numbers do not match')).not.toBeInTheDocument()
})
