import { useState } from 'react'
import styles from './ClientIdBadge.module.css'

function CopyIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="8" height="9" rx="1" />
      <path d="M2 10V3a1 1 0 011-1h7" />
    </svg>
  )
}

function TickIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7l3.5 3.5L12 3" />
    </svg>
  )
}

/**
 * ClientIdBadge
 * Renders the client's reference ID. Click copies it to clipboard;
 * the copy icon swaps to a tick for 1.5 seconds.
 *
 * @param {{ profile: { client_ref?: string } }} props
 */
export default function ClientIdBadge({ profile }) {
  const [copied, setCopied] = useState(false)

  const ref = profile?.client_ref ?? null

  async function handleCopy() {
    if (!ref) return
    try {
      await navigator.clipboard.writeText(ref)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }

  return (
    <button
      className={styles.badge}
      onClick={handleCopy}
      title={ref ? `Copy client ID: ${ref}` : 'Client ID not yet assigned'}
      aria-label={copied ? 'Copied!' : `Copy client ID ${ref ?? ''}`}
      disabled={!ref}
    >
      <span className={styles.label}>Client ID</span>
      <span className={styles.ref}>{ref ?? '—'}</span>
      <span className={`${styles.iconBtn}${copied ? ' ' + styles.tick : ''}`}>
        {copied ? <TickIcon /> : <CopyIcon />}
      </span>
    </button>
  )
}
