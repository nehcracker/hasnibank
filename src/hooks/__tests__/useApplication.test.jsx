import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Supabase mock that mirrors realtime-js channel semantics ────────────────
// - channel(topic) returns the EXISTING channel instance for a topic that is
//   already registered (this is what supabase-js does in production)
// - .on('postgres_changes', ...) THROWS if called after .subscribe()
// This is the exact behaviour that blanked the dashboard when two components
// used useApplication (or useRealtimeEvents) with the same channel topic.
const { mockSupabase, channels } = vi.hoisted(() => {
  const channels = new Map()

  function makeChannel(topic) {
    return {
      topic,
      subscribed: false,
      on(type) {
        if (this.subscribed && type === 'postgres_changes') {
          throw new Error(
            `cannot add \`postgres_changes\` callbacks for ${topic} after \`subscribe()\``
          )
        }
        return this
      },
      subscribe() {
        this.subscribed = true
        return this
      },
    }
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
    from() {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }
    },
  }

  return { mockSupabase, channels }
})

vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

import { useApplication } from '@/hooks/useApplication'

function Consumer({ label }) {
  useApplication()
  return <p>{label} rendered</p>
}

beforeEach(() => {
  channels.clear()
})

describe('useApplication realtime subscription', () => {
  it('two simultaneous consumers do not collide on the realtime channel', () => {
    // Topbar's NotificationsBell and a dashboard page (Overview, Modelling,
    // DocChecklist, ExportSummary) both call useApplication at the same time.
    expect(() =>
      render(
        <>
          <Consumer label="bell" />
          <Consumer label="page" />
        </>
      )
    ).not.toThrow()

    expect(screen.getByText('bell rendered')).toBeInTheDocument()
    expect(screen.getByText('page rendered')).toBeInTheDocument()
  })
})
