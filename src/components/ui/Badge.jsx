import styles from './Badge.module.css'

export default function Badge({ children, className = '' }) {
  return <span className={`${styles.badge} ${className}`}>{children}</span>
}
