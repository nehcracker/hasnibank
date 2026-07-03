import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

      {/* Main content area — renders the matched child route */}
      <main className={styles.mainArea}>
        <Outlet />
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
