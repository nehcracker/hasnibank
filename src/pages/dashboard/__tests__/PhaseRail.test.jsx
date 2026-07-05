import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhaseRail from '../PhaseRail'

test('renders 4 phase segments', () => {
  render(<PhaseRail status="draft" />)
  expect(screen.getByText('Apply')).toBeInTheDocument()
  expect(screen.getByText('Assessment')).toBeInTheDocument()
  expect(screen.getByText('Offer')).toBeInTheDocument()
  expect(screen.getByText('Funding')).toBeInTheDocument()
})

test('active phase expands with internal step labels and SLA line', () => {
  render(<PhaseRail status="credit_assessment" />)

  const segments = screen.getAllByTestId('phase-segment')
  expect(segments).toHaveLength(4)
  expect(segments[1]).toHaveAttribute('data-state', 'active')

  // Internal steps of the Assessment phase
  expect(screen.getByText('Credit Assessment')).toBeInTheDocument()
  expect(screen.getByText('Funder Matching')).toBeInTheDocument()

  // SLA for the current stage (credit_assessment: 5-10)
  expect(screen.getByText(/typically 5 to 10 business days/i)).toBeInTheDocument()
})

test('phases before the active one are marked done, later ones future', () => {
  render(<PhaseRail status="term_sheet" />)
  const segments = screen.getAllByTestId('phase-segment')
  expect(segments[0]).toHaveAttribute('data-state', 'done')
  expect(segments[1]).toHaveAttribute('data-state', 'done')
  expect(segments[2]).toHaveAttribute('data-state', 'active')
  expect(segments[3]).toHaveAttribute('data-state', 'future')
})

test('draft status shows Apply phase active without an SLA line', () => {
  render(<PhaseRail status="draft" />)
  const segments = screen.getAllByTestId('phase-segment')
  expect(segments[0]).toHaveAttribute('data-state', 'active')
  expect(screen.queryByText(/business days/i)).not.toBeInTheDocument()
})

test('view all 9 stages toggle reveals the detailed tracker', async () => {
  const user = userEvent.setup()
  render(<PhaseRail status="credit_assessment" />)

  expect(screen.queryByText('Funded')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /view all 9 stages/i }))
  expect(screen.getByText('Funded')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /hide detailed stages/i }))
  expect(screen.queryByText('Funded')).not.toBeInTheDocument()
})
