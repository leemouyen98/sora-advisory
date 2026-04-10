import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div
      className="flex min-h-screen overflow-hidden bg-hig-bg"
      style={{ minHeight: 'var(--app-height)' }}
    >
      {/* Sidebar — hidden on mobile, mini strip on tablet, collapsible on desktop */}
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      {/* Main content — offset on tablet to clear mini sidebar */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-[60px] lg:pl-0">
        <TopBar onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)} />
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
