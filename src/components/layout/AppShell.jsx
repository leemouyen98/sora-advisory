import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const SIDEBAR_KEY = 'sora-sidebar-expanded'

export default function AppShell({ children }) {
  const location = useLocation()
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    return stored !== null ? stored === 'true' : true   // default expanded
  })

  // Auto-close drawer on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarExpanded(false)
    }
  }, [location.pathname])

  const handleToggle = () => {
    setSidebarExpanded(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-hig-bg"
      style={{ height: 'var(--app-height)' }}
    >
      {/* Sidebar — hidden on mobile, mini strip on tablet, collapsible on desktop */}
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={handleToggle}
      />

      {/* Main content — offset on tablet to clear mini sidebar */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-[60px] lg:pl-0">
        <TopBar onMenuToggle={handleToggle} />
        <main className="flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4 lg:px-6 lg:py-6
                         pb-[calc(72px+var(--safe-area-bottom))] md:pb-4 lg:pb-6">
          <div className="max-w-[1280px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
