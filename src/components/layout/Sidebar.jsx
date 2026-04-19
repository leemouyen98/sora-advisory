import { useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Library,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import ProtectedImg from '../ui/ProtectedImg'
import AboutSoraModal from './AboutSoraModal'

// Sora brand navy — matches login left panel and manifest theme-color
const NAVY  = 'linear-gradient(180deg, #040E1C 0%, #081828 100%)'
const BRAND = '#2E96FF'

export default function Sidebar({ expanded, onToggle }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { isAdmin } = useAuth()
  const { t } = useLanguage()
  const [hovered, setHovered]     = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const hoverTimer = useRef(null)

  const isOpen = expanded || hovered

  const NAV_ITEMS = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/contacts',  label: t('nav.contacts'),  icon: Users },
    { path: '/library',   label: t('nav.library'),   icon: Library },
  ]

  const BOTTOM_NAV = [
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  const handleMouseEnter = useCallback(() => {
    if (expanded) return
    hoverTimer.current = setTimeout(() => setHovered(true), 100)
  }, [expanded])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setHovered(false)
  }, [])

  const isActive = (item) => {
    if (item.path === '/contacts') return location.pathname.startsWith('/contacts')
    return location.pathname.startsWith(item.path)
  }

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ background: NAVY }}
        className={`
          hidden md:flex flex-col
          fixed lg:relative z-30 h-full
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-60' : 'w-[60px]'}
        `}
      >
        {/* ── Logo area ── */}
        <div
          className="h-16 flex items-center justify-center px-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {isOpen ? (
            /* White pill card — same treatment as login left panel */
            <div style={{
              background: 'white',
              borderRadius: 10,
              padding: '7px 14px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>
              <ProtectedImg
                src="/assets/sora-logo.png"
                alt="Sora Advisory"
                style={{ height: 32, width: 'auto', display: 'block' }}
                wrapperClassName="shrink-0"
              />
            </div>
          ) : (
            /* App icon — already has its own sky-blue gradient */
            <ProtectedImg
              src="/assets/sora-favicon.png"
              alt="Sora"
              className="w-9 h-9 object-contain rounded-xl"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
              wrapperClassName="shrink-0"
            />
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 min-h-touch rounded-hig-sm ${isOpen ? 'px-3' : 'justify-center'} py-2.5 transition-all duration-hig text-left cursor-pointer relative`}
                style={{
                  background: active ? 'rgba(46,150,255,0.18)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.52)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={item.label}
              >
                {/* Active left accent bar */}
                {active && (
                  <span style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 22, borderRadius: '0 3px 3px 0',
                    background: BRAND,
                  }} />
                )}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}

          {isAdmin && (() => {
            const active = location.pathname.startsWith('/admin')
            return (
              <button
                onClick={() => navigate('/admin')}
                className={`w-full flex items-center gap-3 min-h-touch rounded-hig-sm ${isOpen ? 'px-3' : 'justify-center'} py-2.5 transition-all duration-hig text-left cursor-pointer relative`}
                style={{
                  background: active ? 'rgba(175,82,222,0.20)' : 'transparent',
                  color: active ? 'rgba(218,170,255,1)' : 'rgba(255,255,255,0.52)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={t('nav.admin')}
              >
                {active && (
                  <span style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 22, borderRadius: '0 3px 3px 0',
                    background: '#AF52DE',
                  }} />
                )}
                <Shield size={22} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    {t('nav.admin')}
                  </span>
                )}
              </button>
            )
          })()}
        </nav>

        {/* ── Bottom: Settings + About + Toggle ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 min-h-touch rounded-hig-sm ${isOpen ? 'px-5' : 'justify-center'} py-2.5 transition-all duration-hig text-left cursor-pointer relative`}
                style={{
                  background: active ? 'rgba(46,150,255,0.18)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.45)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                title={item.label}
              >
                {active && (
                  <span style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 22, borderRadius: '0 3px 3px 0',
                    background: BRAND,
                  }} />
                )}
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {isOpen && (
                  <span className={`text-hig-subhead ${active ? 'font-semibold' : ''} truncate`}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}

          {/* About Sora */}
          <button
            onClick={() => setShowAbout(true)}
            className={`w-full flex items-center gap-3 min-h-touch rounded-hig-sm ${isOpen ? 'px-5' : 'justify-center'} py-2.5 transition-all duration-hig text-left cursor-pointer`}
            style={{ color: 'rgba(255,255,255,0.38)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}
            title="About Sora"
          >
            <Sparkles size={18} strokeWidth={1.8} />
            {isOpen && <span className="text-hig-subhead truncate">About Sora</span>}
          </button>

          {/* Expand/collapse toggle */}
          <button
            onClick={onToggle}
            className="w-full h-10 flex items-center justify-center transition-colors duration-hig"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </aside>

      {showAbout       && <AboutSoraModal onClose={() => setShowAbout(false)} />}
    </>
  )
}
