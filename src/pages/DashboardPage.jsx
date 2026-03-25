import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContacts } from '../hooks/useContacts'
import { useToast } from '../hooks/useToast'
import {
  Plus, Users, CheckSquare, CalendarClock, Cake,
  ExternalLink, Building2, FileText, Shield, Globe, Landmark,
  Target, ChevronRight, CheckCircle2, FileCheck, ClipboardList, TrendingUp,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Agency Portal',      icon: Building2,     url: 'https://portal.tokiomarinelife.com.my',                                            color: '#007AFF' },
  { label: 'Sales Illustration', icon: FileText,       url: 'https://tmarinepro.tokiomarinelife.com.my/standalone/',                            color: '#34C759' },
  { label: 'T-Marine Pro',       icon: Shield,         url: 'https://tmarinepro.tokiomarinelife.com.my/',                                       color: '#FF9500' },
  { label: 'Insurance Portals',  icon: Globe,          url: 'https://portals.llhgroup.co',                                                      color: '#AF52DE' },
  { label: 'Tokio Marine Life',  icon: Landmark,       url: 'https://www.tokiomarine.com/my/en/life.html',                                      color: '#FF2D55' },
  { label: 'Claim Guide',        icon: FileCheck,      url: 'https://www.tokiomarine.com/my/en/life/claim/step-by-step-claim-guide.html',        color: '#FF6B35' },
  { label: 'Service Form',       icon: ClipboardList,  url: 'https://www.tokiomarine.com/my/en/life/resources/forms.html',                      color: '#5856D6' },
  { label: 'Funds Centre',       icon: TrendingUp,     url: 'https://www.tokiomarine.com/my/en/life/resources/fund-centre.html',                color: '#30B0C7' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function todayStr() {
  return new Date().toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getAge(dob) {
  const d = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return a
}

function fmtShort(str) {
  if (!str) return ''
  const d = new Date(str)
  return isNaN(d) ? str : d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

// Days until a date this year (birthday-style rolling calc)
function daysUntilBirthday(dob) {
  const target = new Date(dob)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setFullYear(now.getFullYear())
  if (target < now) target.setFullYear(now.getFullYear() + 1)
  return Math.round((target - now) / 86400000)
}

// Days until an absolute date
function daysUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// Urgency badge
function UrgencyBadge({ days, type }) {
  const cfg = (() => {
    if (days === 0) return { bg: 'rgba(255,59,48,0.1)', color: '#FF3B30', label: 'Today' }
    if (days === 1) return { bg: 'rgba(255,149,0,0.12)', color: '#FF9500', label: 'Tomorrow' }
    if (days <= 3) return { bg: 'rgba(255,149,0,0.1)', color: '#FF9500', label: `${days}d` }
    if (type === 'birthday') return { bg: 'rgba(255,45,85,0.08)', color: '#FF2D55', label: `${days}d` }
    if (type === 'review') return { bg: 'rgba(175,82,222,0.08)', color: '#AF52DE', label: `${days}d` }
    return { bg: 'rgba(0,122,255,0.08)', color: '#007AFF', label: `${days}d` }
  })()
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

// Avatar initials
function Avatar({ name, color }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: `${color}18`, color, fontWeight: 700, fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initials}
    </div>
  )
}

// Type pill for unified feed
const TYPE_CFG = {
  task:    { color: '#007AFF', label: 'Task',    Icon: CheckSquare },
  review:  { color: '#AF52DE', label: 'Review',  Icon: CalendarClock },
  birthday:{ color: '#FF2D55', label: 'Birthday',Icon: Cake },
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, #F2F2F7 25%, #E5E5EA 50%, #F2F2F7 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      className="hig-card text-left w-full overflow-hidden group"
      style={{ transition: 'box-shadow 0.2s', padding: 0 }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      {/* Colored top accent */}
      <div style={{ height: 3, background: color, borderRadius: '12px 12px 0 0' }} />
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} style={{ color }} />
          </div>
          <ChevronRight size={15} style={{ color: '#C7C7CC', transition: 'color 0.15s' }}
            className="group-hover:text-hig-blue" />
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton h={28} w="50%" />
            <Skeleton h={13} w="70%" />
          </div>
        ) : (
          <>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.1 }}>{value}</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E', marginTop: 3 }}>{label}</p>
            {sub && <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{sub}</p>}
          </>
        )}
      </div>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { agent } = useAuth()
  const { contacts, contactsLoading, contactsError } = useContacts()
  const navigate = useNavigate()
  const { addToast } = useToast()

  useEffect(() => {
    if (contactsError) addToast(contactsError, 'error')
  }, [contactsError, addToast])

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let pending = 0, reviewsMonth = 0, bdays = 0
    contacts.forEach(c => {
      pending += (c.tasks || []).filter(t => t.status !== 'completed').length
      if (c.reviewDate) {
        const r = new Date(c.reviewDate)
        if (r.getMonth() === thisMonth && r.getFullYear() === thisYear) reviewsMonth++
      }
      if (c.dob && new Date(c.dob).getMonth() === thisMonth) bdays++
    })
    return { total: contacts.length, pending, reviewsMonth, bdays }
  }, [contacts, thisMonth, thisYear])

  // ── Unified upcoming feed ──────────────────────────────────────────────────
  const feed = useMemo(() => {
    const items = []

    contacts.forEach(c => {
      // Tasks due in next 60 days
      ;(c.tasks || []).forEach(t => {
        if (t.status === 'completed' || !t.dueDate) return
        const d = daysUntil(t.dueDate)
        if (d >= 0 && d <= 60)
          items.push({ type: 'task', days: d, contact: c, title: t.title, sub: fmtShort(t.dueDate) })
      })
      // Reviews in next 60 days
      if (c.reviewDate) {
        const d = daysUntil(c.reviewDate)
        if (d >= 0 && d <= 60)
          items.push({
            type: 'review', days: d, contact: c,
            title: c.name,
            sub: `Review on ${fmtShort(c.reviewDate)}${c.reviewFrequency ? ' · ' + c.reviewFrequency : ''}`,
          })
      }
      // Birthdays in next 60 days
      if (c.dob) {
        const d = daysUntilBirthday(c.dob)
        if (d >= 0 && d <= 60)
          items.push({
            type: 'birthday', days: d, contact: c,
            title: c.name,
            sub: `Turns ${getAge(c.dob) + (d > 0 ? 1 : 0)} · ${fmtShort(c.dob)}`,
          })
      }
    })

    return items.sort((a, b) => a.days - b.days).slice(0, 12)
  }, [contacts])

  const totalUpcoming = feed.length

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.2 }}>
              {greeting()}{agent?.name ? `, ${agent.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>{todayStr()}</p>
          </div>

          <button
            onClick={() => navigate('/contacts?new=true')}
            className="hig-btn-primary"
            style={{ gap: 7, fontSize: 14 }}
          >
            <Plus size={15} /> New Contact
          </button>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard
            icon={Users} label="Contacts" color="#007AFF" loading={contactsLoading}
            value={stats.total}
            sub={stats.total === 1 ? 'Client Profile' : 'Client Profiles'}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={CheckSquare} label="Pending Tasks"
            color={stats.pending > 0 ? '#FF9500' : '#34C759'} loading={contactsLoading}
            value={stats.pending}
            sub={stats.pending === 0 ? 'All clear ✓' : 'across all contacts'}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={CalendarClock} label="Reviews This Month" color="#AF52DE" loading={contactsLoading}
            value={stats.reviewsMonth}
            sub={stats.reviewsMonth === 0 ? 'None scheduled' : 'scheduled'}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={Cake} label="Birthdays This Month" color="#FF2D55" loading={contactsLoading}
            value={stats.bdays}
            sub={stats.bdays === 0 ? 'None this month' : 'this month'}
            onClick={() => navigate('/contacts')}
          />
        </div>

        {/* ── Body: Feed + Sidebar ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Left: Unified feed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>Upcoming</h2>
              {feed.length > 0 && (
                <button
                  onClick={() => navigate('/contacts')}
                  style={{ fontSize: 13, color: '#007AFF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  View all contacts →
                </button>
              )}
            </div>

            {/* Loading skeleton */}
            {contactsLoading && (
              <div className="hig-card" style={{ overflow: 'hidden' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: i < 4 ? '1px solid #F2F2F7' : 'none',
                  }}>
                    <Skeleton h={34} w={34} r={17} />
                    <div style={{ flex: 1 }}>
                      <Skeleton h={14} w="60%" />
                      <div style={{ marginTop: 6 }}><Skeleton h={11} w="40%" /></div>
                    </div>
                    <Skeleton h={24} w={44} r={12} />
                  </div>
                ))}
              </div>
            )}

            {/* Feed items */}
            {!contactsLoading && feed.length > 0 && (
              <div className="hig-card" style={{ overflow: 'hidden' }}>
                {feed.map((item, idx) => {
                  const cfg = TYPE_CFG[item.type]
                  const TypeIcon = cfg.Icon
                  return (
                    <button
                      key={`${item.type}-${item.contact.id}-${idx}`}
                      onClick={() => navigate(`/contacts/${item.contact.id}`)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: idx < feed.length - 1 ? '1px solid #F2F2F7' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {/* Colored type icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: `${cfg.color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <TypeIcon size={15} style={{ color: cfg.color }} />
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </p>
                        <p style={{ fontSize: 12, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.type === 'task' ? item.contact.name + '  ·  Due ' + item.sub : item.sub}
                        </p>
                      </div>

                      {/* Type label + urgency badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
                          color: cfg.color, opacity: 0.7,
                        }}>
                          {cfg.label}
                        </span>
                        <UrgencyBadge days={item.days} type={item.type} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {!contactsLoading && feed.length === 0 && (
              <div className="hig-card" style={{
                padding: '48px 24px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: 12,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(52,199,89,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={26} style={{ color: '#34C759' }} />
                </div>
                <p style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>All clear</p>
                <p style={{ fontSize: 14, color: '#8E8E93', maxWidth: 280, lineHeight: 1.5 }}>
                  No tasks, reviews, or birthdays coming up in the next 60 days.
                </p>
                {contacts.length === 0 && (
                  <button
                    onClick={() => navigate('/contacts?new=true')}
                    className="hig-btn-primary"
                    style={{ marginTop: 4, gap: 7, fontSize: 14 }}
                  >
                    <Plus size={15} /> Add your first contact
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick Links */}
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', marginBottom: 12 }}>Quick Links</h2>
              <div className="hig-card" style={{ overflow: 'hidden' }}>
                {QUICK_LINKS.map(({ label, icon: Icon, url, color }, idx) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 16px', textDecoration: 'none',
                      borderBottom: idx < QUICK_LINKS.length - 1 ? '1px solid #F2F2F7' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1, fontWeight: 400 }}>{label}</span>
                    <ExternalLink size={11} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Planners */}
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E', marginBottom: 4 }}>Planners</h2>
              <p style={{ fontSize: 12, color: '#8E8E93', marginBottom: 12 }}>Select a contact to begin</p>
              <div className="hig-card" style={{ overflow: 'hidden' }}>
                {[
                  { label: 'Retirement Planner', icon: Target, color: '#007AFF', path: '/contacts' },
                  { label: 'Wealth Protection',  icon: Shield, color: '#34C759', path: '/contacts' },
                ].map(({ label, icon: Icon, color, path }, idx) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: idx === 0 ? '1px solid #F2F2F7' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#1C1C1E', flex: 1 }}>{label}</span>
                    <ChevronRight size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
