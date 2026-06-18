import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from '../ProtectedRoute'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
  }
})

import { useAuth } from '@/hooks/useAuth'

beforeEach(() => vi.clearAllMocks())

describe('ProtectedRoute', () => {
  it('renders nothing interactive while loading', () => {
    useAuth.mockReturnValue({ loading: true, session: null, role: null })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.queryByText('content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    useAuth.mockReturnValue({ loading: false, session: null, role: null })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login')
  })

  it('redirects borrower away from staff route to /dashboard', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute requiredRole="staff"><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard')
  })

  it('redirects staff away from borrower route to /admin', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'staff' })
    render(<ProtectedRoute requiredRole="borrower"><div>content</div></ProtectedRoute>)
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/admin')
  })

  it('renders children when authenticated with the correct role', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute requiredRole="borrower"><div>content</div></ProtectedRoute>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders children when authenticated with no role requirement', () => {
    useAuth.mockReturnValue({ loading: false, session: {}, role: 'borrower' })
    render(<ProtectedRoute><div>content</div></ProtectedRoute>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
