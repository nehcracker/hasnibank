import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActionZone from '../ActionZone'

test('shows review message for submitted status', () => {
  render(<ActionZone status="submitted" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/being reviewed/i)).toBeInTheDocument()
})

test('shows review message for funder_matching status', () => {
  render(<ActionZone status="funder_matching" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/being reviewed/i)).toBeInTheDocument()
})

test('shows Accept Offer button for offer_issued status', () => {
  render(<ActionZone status="offer_issued" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByRole('button', { name: /accept offer/i })).toBeInTheDocument()
})

test('calls onAcceptOffer when Accept Offer clicked', async () => {
  const user = userEvent.setup()
  const fn = vi.fn()
  render(<ActionZone status="offer_issued" onAcceptOffer={fn} accepting={false} />)
  await user.click(screen.getByRole('button', { name: /accept offer/i }))
  expect(fn).toHaveBeenCalledOnce()
})

test('disables button and shows Accepting… while accepting', () => {
  render(<ActionZone status="offer_issued" onAcceptOffer={() => {}} accepting={true} />)
  const btn = screen.getByRole('button', { name: /accepting/i })
  expect(btn).toBeDisabled()
})

test('shows funded congratulations message', () => {
  render(<ActionZone status="funded" onAcceptOffer={() => {}} accepting={false} />)
  expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
})
