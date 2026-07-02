import { Link } from 'react-router-dom'
import styles from './ServiceCard.module.css'

/**
 * ServiceCard
 *
 * Reusable card for service offerings and self-service tools.
 * Pass `href` for navigation cards (renders a <Link>).
 * Pass `onAction` for action cards (renders a <button>).
 *
 * @param {{
 *   icon?: string,
 *   badge?: string,
 *   title: string,
 *   description?: string,
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   href?: string,
 * }} props
 */
export default function ServiceCard({ icon, badge, title, description, actionLabel, onAction, href }) {
  const inner = (
    <>
      {badge && <span className={styles.badge}>{badge}</span>}
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {(actionLabel || href) && (
        <span className={styles.cta}>{actionLabel ?? 'View'}</span>
      )}
    </>
  )

  if (href) {
    return (
      <Link to={href} className={styles.card}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" className={styles.card} onClick={onAction}>
      {inner}
    </button>
  )
}
