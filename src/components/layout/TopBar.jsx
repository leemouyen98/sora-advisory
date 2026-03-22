import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Search, ChevronDown, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function TopBar({ onMenuToggle }) {
  const { agent, logout } = useAuth()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)

  const showSearch =
    location.pathname === '/dashboard' ||
    location.pathname === '/contacts'

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = agent?.name
    ? agent.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '??'

  return (
    <header className="h-14 bg-white border-b border-hig-gray-5 flex items-center px-4 gap-4 shrink-0">
      {/* Menu toggle (mobile/tablet) */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden min-w-touch min-h-touch flex items-center justify-center
                   text-hig-text-secondary hover:text-hig-text rounded-hig-sm
                   hover:bg-hig-gray-6 transition-colors duration-hig"
      >
        <Menu size={22} />
      </button>

      {/* Agency Logo */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-md bg-hig-blue flex items-center justify-center">
          <span className="text-white text-xs font-bold">HL</span>
        </div>
        <span className="text-hig-subhead font-semibold text-hig-text hidden xl:inline">
          Henry Lee Advisory
        </span>
      </div>

      {/* Search */}
      {showSearch ? (
        <div className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary"
            />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-hig-gray-6 border-none
                         text-hig-subhead placeholder-hig-text-secondary
                         outline-none focus:bg-white focus:ring-2 focus:ring-hig-blue/20
                         transition-all duration-hig"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Profile */}
      <div className="relative shrink-0" ref={profileRef}>
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 min-h-touch px-2 rounded-hig-sm
                     hover:bg-hig-gray-6 transition-colors duration-hig"
        >
          <div className="w-8 h-8 rounded-full bg-hig-blue/10 text-hig-blue
                          flex items-center justify-center text-hig-caption1 font-semibold">
            {initials}
          </div>
          <ChevronDown size={14} className="text-hig-text-secondary" />
        </button>

        {showProfile && (
          <div className="absolute right-0 top-12 w-56 bg-white rounded-hig shadow-hig-lg
                          border border-hig-gray-5 py-1 z-50">
            <div className="px-4 py-3 border-b border-hig-gray-5">
              <p className="text-hig-subhead font-semibold">{agent?.name}</p>
              <p className="text-hig-caption1 text-hig-text-secondary">{agent?.email}</p>
            </div>
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead
                         text-hig-text hover:bg-hig-gray-6 transition-colors"
            >
              <Settings size={16} />
              Settings
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead
                         text-hig-red hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
