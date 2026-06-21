import { render, screen } from '@testing-library/react'
import ProgressTracker from '../ProgressTracker'

test('renders all 9 stage labels', () => {
  render(<ProgressTracker status="submitted" />)
  expect(screen.getByText('Submitted')).toBeInTheDocument()
  expect(screen.getByText('KYC Verification')).toBeInTheDocument()
  expect(screen.getByText('Credit Assessment')).toBeInTheDocument()
  expect(screen.getByText('Funder Matching')).toBeInTheDocument()
  expect(screen.getByText('Term Sheet')).toBeInTheDocument()
  expect(screen.getByText('Offer Issued')).toBeInTheDocument()
  expect(screen.getByText('Offer Accepted')).toBeInTheDocument()
  expect(screen.getByText('Fee Payment')).toBeInTheDocument()
  expect(screen.getByText('Funded')).toBeInTheDocument()
})

test('marks current stage with aria-current="step"', () => {
  render(<ProgressTracker status="credit_assessment" />)
  const cell = screen.getByText('Credit Assessment').closest('[data-state]')
  expect(cell).toHaveAttribute('aria-current', 'step')
  expect(cell).toHaveAttribute('data-state', 'active')
})

test('marks prior stages as done', () => {
  render(<ProgressTracker status="credit_assessment" />)
  const cell = screen.getByText('Submitted').closest('[data-state]')
  expect(cell).toHaveAttribute('data-state', 'done')
})

test('marks future stages as future', () => {
  render(<ProgressTracker status="submitted" />)
  const cell = screen.getByText('Funded').closest('[data-state]')
  expect(cell).toHaveAttribute('data-state', 'future')
  expect(cell).not.toHaveAttribute('aria-current')
})
