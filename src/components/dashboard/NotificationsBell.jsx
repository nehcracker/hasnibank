import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApplication } from '@/hooks/useApplication'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'
import styles from './NotificationsBell.module.css'

// ── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const EVENT_LABELS = {
  status_change: 'Application stage updated',
  document:      'Document update',
  message:       'New message from your financing team',
  note:          'Update from your financing team',
  fee:           'Fees and payments update',
  payment:       'Fees and payments update',
}

function eventLabel(type) {
  if (EVENT_LABELS[type]) return EVENT_LABELS[type]
  // Humanise unknown types: underscores → spaces, capitalise first letter
  return type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

const EVENT_ROUTES = {
  status_change: '/dashboard/application',
  document:      '/dashboard/documents',
  message:       '/dashboard/messages',
  fee:           '/dashboard/fees',
  payment:       '/dashboard/fees',
}

function eventRoute(type) {
  return EVENT_ROUTES[type] ?? '/dashboard/application'
}

// ── Bell SVG icon ────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      className={styles.bellIcon}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 8A5 5 0 005 8c0 4-2 5-2 5h14s-2-1-2-5" />
      <path d="M11.73 17a2 2 0 01-3.46 0" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NotificationsBell() {
  const { application } = useApplication()
  const applicationId = application?.id ?? null
  const { events, unreadCount, markAllSeen } = useRealtimeEvents(applicationId)

  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) markAllSeen()
  }

  return (
    <div className={styles.bell} ref={containerRef}>
      <button
        className={styles.bellBtn}
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'Notifications'
        }
        aria-haspopup="true"
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Notifications">
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownTitle}>Notifications</p>
          </div>

          {events.length === 0 ? (
            <p className={styles.empty}>No notifications yet.</p>
          ) : (
            <ul className={styles.eventList}>
              {events.map(ev => (
                <li key={ev.id} className={styles.eventItem}>
                  <Link
                    to={eventRoute(ev.event_type)}
                    className={styles.eventLink}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.eventLabel}>
                      {eventLabel(ev.event_type)}
                    </span>
                    <span className={styles.eventTime}>
                      {relativeTime(ev.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
