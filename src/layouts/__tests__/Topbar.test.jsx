import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { full_name: 'Aminata Koroma', company_name: 'Solari AgroExports Ltd', client_ref: 'HB-2026-00100' },
  }),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }))
vi.mock('@/components/dashboard/ClientIdBadge', () => ({ default: () => null }))
vi.mock('@/components/dashboard/NotificationsBell', () => ({ default: () => null }))

import Topbar from '../Topbar'

test('renders the marketing site logo asset alongside the existing icon mark', () => {
  render(
    <MemoryRouter>
      <Topbar onMenuToggle={() => {}} />
    </MemoryRouter>
  )
  // The full lockup: shown at wide widths, hidden below 1024px by CSS.
  expect(screen.getByAltText('Hasni Bank')).toBeInTheDocument()
  // The icon-only mark: kept in the DOM as the sub-1024px fallback.
  expect(screen.getByText('HASNI')).toBeInTheDocument()
  expect(screen.getByText('BANK')).toBeInTheDocument()
})
