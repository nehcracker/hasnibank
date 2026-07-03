import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import ErrorBoundary from '@/components/dashboard/ErrorBoundary'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const open  = () => setSidebarOpen(true)
  const close = () => setSidebarOpen(false)
  const toggle = () => setSidebarOpen(v => !v)

  return (
    <div className={styles.shell} data-print-shell>
      {/* Topbar — sticky, spans full width */}
      <div className={styles.topbarArea} data-print-hide>
        <Topbar onMenuToggle={toggle} />
      </div>

      {/* Sidebar — sticky column or off-canvas on mobile */}
      <div className={`${styles.sidebarArea}${sidebarOpen ? ' ' + styles.drawerOpen : ''}`} data-print-hide>
        <Sidebar onClose={close} />
      </div>

      {/* Main content area — renders the matched child route.
          Keyed by pathname so a tripped boundary resets on navigation. */}
      <main className={styles.mainArea}>
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Backdrop overlay — visible only on mobile when drawer is open */}
      {sidebarOpen && (
        <button
          className={styles.overlay}
          onClick={close}
          aria-label="Close navigation"
          tabIndex={-1}
        />
      )}
    </div>
  )
}
