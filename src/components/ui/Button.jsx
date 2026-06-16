import { Link } from 'react-router-dom'
import styles from './Button.module.css'

export default function Button({ children, variant = 'primary', href, onClick, type = 'button', className = '' }) {
  const cls = `${styles.btn} ${styles[variant]} ${className}`
  if (href) return <Link to={href} className={cls}>{children}</Link>
  return <button type={type} onClick={onClick} className={cls}>{children}</button>
}
