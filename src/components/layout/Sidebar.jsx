import { useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts',  label: 'Contacts',  icon: Users },
]

const BOTTOM_NAV = [
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ expanded, onToggle }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { isAdmin } = useAuth()
  const [hovered, setHovered] = useState(false)
  const hoverTimer = useRef(null)

  // Effective open state: pinned by click OR temporarily hovered
  const isOpen = expanded || hovered

  const handleMouseEnter = useCallback(() => {
    if (expanded) return
    hoverTimer.current = setTimeout(() => setHovered(true), 100)
  }, [expanded])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHovered(false)
  }, [])

  const isActive = (item) => {
    if (item.path === '/contacts') {
      return location.pathname.startsWith('/contacts')
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <>
      {/* Overlay for mobile/tablet when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          hidden md:flex flex-col
          fixed lg:relative z-30 h-full bg-white border-r border-hig-gray-5
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-60' : 'w-[60px]'}
        `}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-center border-b border-hig-gray-5 px-3">
          {isOpen ? (
            <img
              src="/assets/colourful-llh-logo.jpg"
              alt="LLH Group"
              className="h-10 w-auto max-w-full object-contain shrink-0"
            />
          ) : (
            <img
              src="/assets/colourful-llh-favicon.png"
              alt="LLH"
              className="w-8 h-8 object-contain rounded-lg shrink-0"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 min-h-touch rounded-hig-sm
                  px-3 py-2.5 transition-all duration-hig text-left cursor-pointer
                  ${active
                    ? 'bg-hig-blue/10 text-hig-blue'
                    : 'text-hig-text-secondary hover:bg-hig-gray-6'
                  }
                `}
                title={item.label}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}

          {/* Admin-only nav item */}
          {isAdmin && (() => {
            const active = location.pathname.startsWith('/admin')
            return (
              <button
                onClick={() => navigate('/admin')}
                className={`
                  w-full flex items-center gap-3 min-h-touch rounded-hig-sm
                  px-3 py-2.5 transition-all duration-hig text-left cursor-pointer
                  ${active
                    ? 'bg-purple-100 text-purple-600'
                    : 'text-hig-text-secondary hover:bg-hig-gray-6'
                  }
                `}
                title="Admin"
              >
                <Shield size={22} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    Admin
                  </span>
                )}
              </button>
            )
          })()}
        </nav>

        {/* Bottom: Settings + Toggle */}
        <div className="border-t border-hig-gray-5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 min-h-touch
                  px-5 py-2.5 transition-all duration-hig text-left cursor-pointer
                  ${active
                    ? 'text-hig-blue bg-hig-blue/5'
                    : 'text-hig-text-secondary hover:bg-hig-gray-6'
                  }
                `}
                title={item.label}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
          <button
            onClick={onToggle}
            className="w-full h-10 flex items-center justify-center
                       text-hig-text-secondary hover:text-hig-text hover:bg-hig-gray-6
                       transition-colors duration-hig border-t border-hig-gray-5"
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>
    </>
  )
}
