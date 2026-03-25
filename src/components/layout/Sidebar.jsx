import { useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Target,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '#retirement', label: 'Retirement', icon: Target, disabled: false },
  { path: '#protection', label: 'Protection', icon: Shield, disabled: false },
]

export default function Sidebar({ expanded, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const hoverTimer = useRef(null)

  // Effective open state: pinned by click OR temporarily hovered
  const isOpen = expanded || hovered

  const handleMouseEnter = useCallback(() => {
    if (expanded) return // already pinned, no need
    hoverTimer.current = setTimeout(() => setHovered(true), 100)
  }, [expanded])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHovered(false)
  }, [])

  const isActive = (path) => {
    if (path.startsWith('#')) return false
    return location.pathname.startsWith(path)
  }

  const handleClick = (item) => {
    if (item.path.startsWith('#')) return
    navigate(item.path)
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
          fixed lg:relative z-30 h-full bg-white border-r border-hig-gray-5
          flex flex-col transition-all duration-300 ease-in-out
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
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => handleClick(item)}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 min-h-touch rounded-hig-sm
                  px-3 py-2.5 transition-all duration-hig text-left
                  ${active
                    ? 'bg-hig-blue/10 text-hig-blue'
                    : 'text-hig-text-secondary hover:bg-hig-gray-6'
                  }
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
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
        </nav>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="h-12 flex items-center justify-center border-t border-hig-gray-5
                     text-hig-text-secondary hover:text-hig-text hover:bg-hig-gray-6
                     transition-colors duration-hig"
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </aside>
    </>
  )
}
