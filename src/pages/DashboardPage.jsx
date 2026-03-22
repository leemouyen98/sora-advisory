import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Plus,
  ExternalLink,
  Globe,
  FileText,
  Shield,
  Building2,
  Landmark,
} from 'lucide-react'

const QUICK_LINKS = [
  { label: 'Agency Portal', icon: Building2, url: '#' },
  { label: 'Sales Illustration', icon: FileText, url: '#' },
  { label: 'T-Marine Pro', icon: Shield, url: '#' },
  { label: 'Insurance Portals', icon: Globe, url: '#' },
  { label: 'Tokio Marine Life', icon: Landmark, url: '#' },
]

export default function DashboardPage() {
  const { agent } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-hig-title2">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {agent?.name?.split(' ')[0]}
        </h1>
        <p className="text-hig-subhead text-hig-text-secondary mt-1">
          Here's your overview for today
        </p>
      </div>

      {/* Add New Contact */}
      <button
        onClick={() => navigate('/contacts?new=true')}
        className="hig-card w-full p-5 flex items-center gap-4
                   hover:shadow-hig-md transition-shadow duration-hig group cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-hig-blue/10 flex items-center justify-center
                        group-hover:bg-hig-blue/15 transition-colors">
          <Plus size={24} className="text-hig-blue" />
        </div>
        <div className="text-left">
          <p className="text-hig-headline text-hig-text">Add New Contact</p>
          <p className="text-hig-subhead text-hig-text-secondary">
            Start a new client profile
          </p>
        </div>
      </button>

      {/* Quick Links */}
      <div>
        <h2 className="text-hig-headline text-hig-text mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hig-card p-4 flex flex-col items-center gap-2 text-center
                           hover:shadow-hig-md transition-shadow duration-hig group"
              >
                <Icon
                  size={28}
                  className="text-hig-blue group-hover:scale-110 transition-transform"
                  strokeWidth={1.5}
                />
                <span className="text-hig-caption1 text-hig-text font-medium leading-tight">
                  {link.label}
                </span>
                <ExternalLink size={12} className="text-hig-text-secondary" />
              </a>
            )
          })}
        </div>
      </div>

      {/* Placeholder widgets */}
      <div>
        <h2 className="text-hig-headline text-hig-text mb-3">Widgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Calendar', 'Birthdays This Month', 'Upcoming Reviews'].map(
            (w) => (
              <div
                key={w}
                className="hig-card p-6 flex items-center justify-center min-h-[160px]"
              >
                <p className="text-hig-subhead text-hig-text-secondary">
                  {w} — Coming in V3.0
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
