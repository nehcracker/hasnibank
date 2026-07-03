import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from '@/components/dashboard/ErrorBoundary'

function Boom() {
  throw new Error('widget exploded')
}

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('dashboard ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    renderWithRouter(
      <ErrorBoundary>
        <p>healthy content</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('healthy content')).toBeInTheDocument()
  })

  it('shows a fallback instead of unmounting the tree when a child throws', () => {
    // React logs the caught error in dev; keep test output pristine
    vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithRouter(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to overview/i })).toHaveAttribute(
      'href',
      '/dashboard'
    )
  })

  it('recovers when Try again is clicked and the child no longer throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('transient')
      return <p>recovered content</p>
    }

    renderWithRouter(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )
    expect(
      screen.getByRole('heading', { name: /something went wrong/i })
    ).toBeInTheDocument()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.getByText('recovered content')).toBeInTheDocument()
  })
})
