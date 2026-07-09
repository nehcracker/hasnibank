import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: {
      client_ref: 'HB-2026-00100',
      full_name: 'Aminata Koroma',
      company_name: 'Solari AgroExports Ltd',
      country: 'Kenya',
    },
  }),
}))

const APPLICATION = {
  id: 'app-1',
  track: 'sme',
  status: 'submitted',
  amount_sought: 250000,
  currency: 'USD',
  created_at: '2026-07-01T00:00:00Z',
  fields: {},
}

vi.mock('@/hooks/useApplication', () => ({
  useApplication: () => ({ application: APPLICATION, loading: false }),
}))

import ExportSummary from '../ExportSummary'

test('renders the marketing logo as a watermark behind the document content', () => {
  render(
    <MemoryRouter>
      <ExportSummary />
    </MemoryRouter>
  )
  const watermark = screen.getByTestId('document-watermark')
  expect(watermark.tagName).toBe('IMG')
  expect(watermark).toHaveAttribute('alt', '')
  expect(watermark).toHaveAttribute('aria-hidden', 'true')
})
