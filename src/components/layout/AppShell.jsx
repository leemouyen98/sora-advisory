import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-hig-bg">
      {/* Sidebar — hidden on mobile, mini strip on tablet, collapsible on desktop */}
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      {/* Main content — offset on tablet to clear mini sidebar */}
      <div className="flex flex-1 flex-col min-w-0 md:pl-[60px] lg:pl-0">
        <TopBar onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6
                         pb-[72px] md:pb-4 lg:pb-6">
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
