import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Settings } from 'lucide-react'

const TABS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts',  label: 'Contacts',  icon: Users          },
  { path: '/settings',  label: 'Settings',  icon: Settings       },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                    bg-white border-t border-hig-gray-5
                    flex items-stretch"
         style={{ height: 56, paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ path, label, icon: Icon }) => {
        const active = path === '/contacts'
          ? location.pathname.startsWith('/contacts')
          : location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5
                       transition-colors duration-150"
            style={{ color: active ? '#007AFF' : '#8E8E93' }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, lineHeight: 1.2 }}>
              {label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2"
                    style={{ width: 28, height: 2, background: '#007AFF', borderRadius: 1 }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
