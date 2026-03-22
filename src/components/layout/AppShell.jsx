import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppShell({ children }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-hig-bg">
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
