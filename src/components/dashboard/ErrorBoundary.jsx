import { Component } from 'react'
import { Link } from 'react-router-dom'
import styles from './ErrorBoundary.module.css'

/**
 * Dashboard error boundary.
 *
 * Wraps the routed dashboard content so a crash in one page or widget shows
 * a recoverable fallback instead of unmounting the entire portal (the
 * blank-screen failure mode). Error boundaries must be class components —
 * React has no hook equivalent of getDerivedStateFromError.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[dashboard] render error:', error, info?.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.fallback} role="alert">
        <h1 className={styles.heading}>Something went wrong</h1>
        <p className={styles.body}>
          This section could not be displayed. Your application and account
          data are unaffected — try again, or return to your overview.
        </p>
        <div className={styles.actions}>
          <button className={styles.retryBtn} onClick={this.handleRetry}>
            Try again
          </button>
          <Link className={styles.overviewLink} to="/dashboard">
            Back to overview
          </Link>
        </div>
      </div>
    )
  }
}
