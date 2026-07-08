import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Hoisted fixtures + mocks (must be hoisted: referenced inside vi.mock factories) ─
const { mockUseAuth, channels, DRAFT_APPLICATION, mockSupabase } = vi.hoisted(() => {
  const channels = new Map()

  function makeChannel(topic) {
    return {
      topic,
      subscribed: false,
      on() {
        return this
      },
      subscribe() {
        this.subscribed = true
        return this
      },
    }
  }

  const DRAFT_APPLICATION = {
    id: 'app-1',
    track: 'sme',
    status: 'draft',
    amount_sought: 500000,
    currency: 'USD',
    fields: {},
    created_at: '2026-07-01T00:00:00Z',
  }

  const mockSupabase = {
    channel(topic) {
      if (!channels.has(topic)) channels.set(topic, makeChannel(topic))
      return channels.get(topic)
    },
    removeChannel(channel) {
      channels.delete(channel.topic)
      return Promise.resolve('ok')
    },
    from(table) {
      if (table === 'applications') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: DRAFT_APPLICATION, error: null }),
            }),
          }),
        }
      }
      if (table === 'application_events') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'offers' || table === 'information_requests') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'application_documents') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }
      throw new Error(`Unexpected table in MyApplication test: ${table}`)
    },
  }

  return { mockUseAuth: vi.fn(), channels, DRAFT_APPLICATION, mockSupabase }
})

vi.mock('@/hooks/useAuth', () => ({ useAuth: mockUseAuth }))
vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))

// ApplicationForm's own internals (fields, debounced autosave) are covered
// elsewhere. Here we only need control over its onSaved callback, which is
// the seam this regression targets.
vi.mock('@/pages/dashboard/ApplicationForm', () => ({
  default: ({ onSaved }) => (
    <button
      onClick={() =>
        onSaved({
          ...DRAFT_APPLICATION,
          fields: { businessName: 'Acme Traders' },
        })
      }
    >
      Trigger autosave
    </button>
  ),
}))

import MyApplication from '../MyApplication'

beforeEach(() => {
  channels.clear()
  mockUseAuth.mockReturnValue({
    user: { id: 'user-1' },
    profile: { full_name: 'Jane Smith', client_ref: 'HB-0001', email: 'jane@acme.test' },
  })
})

test('autosave inside the application form does not blank the page to a loading state', async () => {
  render(
    <MemoryRouter>
      <MyApplication />
    </MemoryRouter>
  )

  // Reach the application form the way a real user does: draft with nothing
  // filled in yet shows ActionCard's "Resume" button.
  const resumeBtn = await screen.findByRole('button', { name: /^resume$/i })
  fireEvent.click(resumeBtn)

  const saveBtn = await screen.findByRole('button', { name: /trigger autosave/i })
  fireEvent.click(saveBtn)

  // The bug: MyApplication swaps its entire tree to a loading placeholder
  // whenever `loading` flips true, unmounting the form the user is actively
  // editing. Autosave must update application state without ever doing that.
  expect(screen.queryByText(/loading your application/i)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /trigger autosave/i })).toBeInTheDocument()
})
