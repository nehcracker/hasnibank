import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseAuth, mockUseApplication, mockUpdate, mockInsert } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseApplication: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(() => Promise.resolve({ error: null })),
}))

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useApplication', () => ({ useApplication: mockUseApplication }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table) => {
      if (table === 'applications') {
        return { update: mockUpdate }
      }
      return { insert: mockInsert }
    },
  },
}))

import Eligibility from '../Eligibility'

beforeEach(() => {
  mockUpdate.mockClear()
  mockInsert.mockClear()
})

function setup(application) {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } })
  mockUseApplication.mockReturnValue({
    application,
    loading: false,
    refresh: vi.fn(),
  })
  mockUpdate.mockReturnValue({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  })
  return render(
    <MemoryRouter>
      <Eligibility />
    </MemoryRouter>
  )
}

/** Answer all 10 questions with the best option and advance to results. */
function completeQuestionnaire() {
  for (let i = 0; i < 10; i++) {
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[radios.length - 1])
    fireEvent.click(screen.getByRole('button', { name: /next|see results/i }))
  }
}

test('completing the check on a draft application saves the result', async () => {
  setup({ id: 'app-1', status: 'draft' })
  completeQuestionnaire()
  await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
  const payload = mockUpdate.mock.calls[0][0]
  expect(payload.eligibility.score).toBeCloseTo(10)
  expect(payload.eligibility.band).toBe('Application-ready')
  expect(payload.eligibility.completed_at).toBeTruthy()
  expect(Object.keys(payload.eligibility.answers)).toHaveLength(10)
})

test('no application means no save', async () => {
  setup(null)
  completeQuestionnaire()
  expect(screen.getByText(/your fundability score/i)).toBeInTheDocument()
  expect(mockUpdate).not.toHaveBeenCalled()
})

test('submitted application means no save', async () => {
  setup({ id: 'app-1', status: 'submitted' })
  completeQuestionnaire()
  expect(mockUpdate).not.toHaveBeenCalled()
})
