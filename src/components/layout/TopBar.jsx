import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Search, ChevronDown, LogOut, Settings, Globe, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { useContacts } from '../../hooks/useContacts'

export default function TopBar({ onMenuToggle }) {
  const { agent, logout } = useAuth()
  const { lang, toggle: toggleLang, t } = useLanguage()
  const { contacts } = useContacts()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const isOnContacts = location.pathname === '/contacts'
  const isOnDashboard = location.pathname === '/dashboard'
  const showSearch = isOnDashboard || isOnContacts
  const pathParts = location.pathname.split('/').filter(Boolean)
  const activeContact = pathParts[0] === 'contacts' && pathParts[1]
    ? contacts.find((contact) => contact.id === pathParts[1])
    : null

  // Search query: mirrors URL ?q= param on contacts page
  const searchQuery = isOnContacts ? (searchParams.get('q') || '') : ''
  const [dashSearch, setDashSearch] = useState('')

  const displayQuery = isOnContacts ? searchQuery : dashSearch

  // Filtered contacts for dropdown (max 6, name/mobile/employment match)
  const dropdownResults = displayQuery.trim().length > 0
    ? (contacts || [])
        .filter(c => {
          const q = displayQuery.toLowerCase()
          return (
            c.name?.toLowerCase().includes(q) ||
            c.mobile?.toLowerCase().includes(q) ||
            c.employment?.toLowerCase().includes(q) ||
            (c.tags || []).some(tag => tag.toLowerCase().includes(q))
          )
        })
        .slice(0, 6)
    : []

  // Close profile menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearchChange = (e) => {
    const val = e.target.value
    if (isOnContacts) {
      setSearchParams(val ? { q: val } : {})
    } else {
      setDashSearch(val)
    }
    setShowDropdown(true)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
    if (e.key === 'Enter') {
      setShowDropdown(false)
      if (isOnDashboard) {
        navigate(dashSearch.trim() ? `/contacts?q=${encodeURIComponent(dashSearch.trim())}` : '/contacts')
        setDashSearch('')
      }
    }
  }

  const handleSelectContact = (contact) => {
    setShowDropdown(false)
    setDashSearch('')
    if (isOnContacts) setSearchParams({})
    navigate(`/contacts/${contact.id}`)
  }

  const handleClear = () => {
    setDashSearch('')
    if (isOnContacts) setSearchParams({})
    setShowDropdown(false)
  }

  const initials = agent?.name
    ? agent.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const pageTitle = (() => {
    if (isOnDashboard) return t('nav.dashboard')
    if (isOnContacts) return t('nav.contacts')
    if (location.pathname.startsWith('/contacts/') && location.pathname.endsWith('/retirement')) {
      return t('contactDetail.retirementPlanner')
    }
    if (location.pathname.startsWith('/contacts/') && location.pathname.endsWith('/protection')) {
      return t('contactDetail.insurancePlanner')
    }
    if (location.pathname.startsWith('/contacts/') && activeContact) {
      return activeContact.name
    }
    if (location.pathname.startsWith('/settings')) return t('nav.settings')
    if (location.pathname.startsWith('/admin')) return t('nav.admin')
    return 'Sora Advisory'
  })()

  const getAge = (dob) => {
    if (!dob) return null
    const d = new Date(dob)
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
    return a
  }

  return (
    <header
      className="shrink-0 border-b border-hig-gray-5 bg-white"
      style={{ paddingTop: 'var(--safe-area-top)' }}
    >
      <div className="relative flex min-h-14 items-center gap-3 px-3 sm:px-4">
        {/* Menu toggle — tablet only */}
        <button
          onClick={onMenuToggle}
          className="hidden md:flex lg:hidden min-w-touch min-h-touch items-center justify-center
                     text-hig-text-secondary hover:text-hig-text rounded-hig-sm
                     hover:bg-hig-gray-6 transition-colors duration-hig"
        >
          <Menu size={22} />
        </button>

        {/* Search with autocomplete */}
        {showSearch ? (
          <div className="min-w-0 w-full max-w-[260px] sm:max-w-sm md:max-w-lg lg:max-w-xl" ref={searchRef}>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search contacts…"
                value={displayQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => displayQuery.trim().length > 0 && setShowDropdown(true)}
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-hig-gray-6 border-none
                           text-hig-subhead placeholder-hig-text-secondary
                           outline-none focus:bg-white focus:ring-2 focus:ring-hig-blue/20
                           transition-all duration-hig"
              />
              {displayQuery.length > 0 && (
                <button
                  onClick={handleClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hig-text-secondary hover:text-hig-text"
                >
                  <X size={14} />
                </button>
              )}

              {/* Autocomplete dropdown */}
              {showDropdown && dropdownResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 z-50 overflow-hidden">
                  {dropdownResults.map((c) => {
                    const age = getAge(c.dob)
                    const highlight = (text) => {
                      if (!text) return null
                      const q = displayQuery.toLowerCase()
                      const idx = text.toLowerCase().indexOf(q)
                      if (idx === -1) return text
                      return (
                        <>
                          {text.slice(0, idx)}
                          <mark className="bg-hig-blue/15 text-hig-blue font-semibold rounded px-0.5">
                            {text.slice(idx, idx + q.length)}
                          </mark>
                          {text.slice(idx + q.length)}
                        </>
                      )
                    }
                    return (
                      <button
                        key={c.id}
                        onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                        onClick={() => handleSelectContact(c)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-hig-gray-6 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-hig-blue/10 text-hig-blue flex items-center justify-center text-hig-caption2 font-bold shrink-0">
                          {c.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-hig-subhead font-medium text-hig-text leading-none mb-0.5">
                            {highlight(c.name)}
                          </p>
                          <p className="text-hig-caption2 text-hig-text-secondary leading-none">
                            {age ? `Age ${age}` : ''}
                            {age && c.employment ? ' · ' : ''}
                            {c.employment ? highlight(c.employment) : ''}
                            {!age && !c.employment && c.mobile ? highlight(c.mobile) : ''}
                          </p>
                        </div>
                        {(c.tags || []).length > 0 && (
                          <div className="ml-auto flex gap-1 shrink-0">
                            {c.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-hig-caption2 px-1.5 py-0.5 rounded-full bg-hig-blue/10 text-hig-blue font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                  {/* "See all results" footer if query matches more than 6 */}
                  {(contacts || []).filter(c => {
                    const q = displayQuery.toLowerCase()
                    return c.name?.toLowerCase().includes(q) || c.mobile?.toLowerCase().includes(q) || c.employment?.toLowerCase().includes(q)
                  }).length > 6 && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowDropdown(false)
                        if (isOnContacts) {
                          setSearchParams({ q: displayQuery })
                        } else {
                          navigate(`/contacts?q=${encodeURIComponent(displayQuery.trim())}`)
                          setDashSearch('')
                        }
                      }}
                      className="w-full px-3 py-2 text-hig-caption1 text-hig-blue hover:bg-hig-blue/5 transition-colors text-center border-t border-hig-gray-5 font-medium"
                    >
                      See all results →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Flex spacer — always pushes profile to top-right */}
        <div className="flex-1" />

        {/* Mobile page title (shown when not on search pages) */}
        {!showSearch && (
          <span className="md:hidden absolute left-1/2 max-w-[55vw] -translate-x-1/2 truncate px-3 text-center
                           text-hig-subhead font-semibold text-hig-text pointer-events-none">
            {pageTitle}
          </span>
        )}

        {/* Profile */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-1.5 sm:gap-2 min-h-touch px-1.5 sm:px-2 rounded-hig-sm
                       hover:bg-hig-gray-6 transition-colors duration-hig"
          >
            <div className="w-8 h-8 rounded-full bg-hig-blue/10 text-hig-blue
                            flex items-center justify-center text-hig-caption1 font-semibold">
              {initials}
            </div>
            <ChevronDown size={14} className="hidden sm:block text-hig-text-secondary" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-hig shadow-hig-lg
                            border border-hig-gray-5 py-1 z-50">
              <div className="px-4 py-3 border-b border-hig-gray-5">
                <p className="text-hig-subhead font-semibold">{agent?.name}</p>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {t('topbar.agentCode')}: {agent?.code || '—'}
                </p>
              </div>
              {/* Language toggle */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Globe size={16} className="text-hig-text-secondary shrink-0" />
                <div className="flex items-center bg-hig-gray-6 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => toggleLang('en')}
                    className={`px-2.5 py-1 rounded-md text-hig-caption1 font-semibold transition-all duration-150
                      ${lang === 'en'
                        ? 'bg-white text-hig-blue shadow-sm'
                        : 'text-hig-text-secondary hover:text-hig-text'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => toggleLang('zh')}
                    className={`px-2.5 py-1 rounded-md text-hig-caption1 font-semibold transition-all duration-150
                      ${lang === 'zh'
                        ? 'bg-white text-hig-blue shadow-sm'
                        : 'text-hig-text-secondary hover:text-hig-text'}`}
                  >
                    中
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setShowProfile(false); navigate('/settings') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead
                           text-hig-text hover:bg-hig-gray-6 transition-colors"
              >
                <Settings size={16} />
                {t('topbar.settings')}
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead
                           text-hig-red hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                {t('topbar.logOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
