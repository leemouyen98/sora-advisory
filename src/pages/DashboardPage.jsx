import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContacts } from '../hooks/useContacts'
import { useToast } from '../hooks/useToast'
import { useLanguage } from '../hooks/useLanguage'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'
import {
  Plus, Users, CheckSquare, CalendarClock, Cake,
  Building2, FileText, Shield, Globe, Landmark,
  ChevronRight, CheckCircle2, FileCheck, ClipboardList, TrendingUp,
  Star, File, FileImage, FileSpreadsheet, Download, ArrowUpRight,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Agency Portal',      icon: Building2,     url: 'https://portal.tokiomarinelife.com.my',                                            color: '#2E96FF' },
  { label: 'Sales Illustration', icon: FileText,       url: 'https://tmarinepro.tokiomarinelife.com.my/standalone/',                            color: '#34C759' },
  { label: 'T-Marine Pro',       icon: Shield,         url: 'https://tmarinepro.tokiomarinelife.com.my/',                                       color: '#FF9500' },
  { label: 'Insurance Portals',  icon: Globe,          url: 'https://portals.llhgroup.co',                                                      color: '#AF52DE' },
  { label: 'Tokio Marine Life',  icon: Landmark,       url: 'https://www.tokiomarine.com/my/en/life.html',                                      color: '#FF2D55' },
  { label: 'Claim Guide',        icon: FileCheck,      url: 'https://www.tokiomarine.com/my/en/life/claim/step-by-step-claim-guide.html',        color: '#FF6B35' },
  { label: 'Service Form',       icon: ClipboardList,  url: 'https://www.tokiomarine.com/my/en/life/resources/forms.html',                      color: '#5856D6' },
  { label: 'Funds Centre',       icon: TrendingUp,     url: 'https://www.tokiomarine.com/my/en/life/resources/fund-centre.html',                color: '#30B0C7' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greetingKey() {
  const h = new Date().getHours()
  return h < 12 ? 'dashboard.greetMorning' : h < 18 ? 'dashboard.greetAfternoon' : 'dashboard.greetEvening'
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

function daysUntilBirthday(dob) {
  const target = new Date(dob)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setFullYear(now.getFullYear())
  if (target < now) target.setFullYear(now.getFullYear() + 1)
  return Math.round((target - now) / 86400000)
}

function daysUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

// ─── Day-group label ──────────────────────────────────────────────────────────
function dayGroupLabel(days) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return 'This Week'
  if (days <= 14) return 'Next Week'
  return 'Coming Up'
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
function UrgencyBadge({ days, type }) {
  const cfg = (() => {
    if (days === 0) return { bg: 'rgba(255,59,48,0.10)', color: '#FF3B30', label: 'Today' }
    if (days === 1) return { bg: 'rgba(255,149,0,0.12)', color: '#FF9500', label: 'Tomorrow' }
    if (days <= 3) return { bg: 'rgba(255,149,0,0.10)', color: '#FF9500', label: `${days}d` }
    if (type === 'birthday') return { bg: 'rgba(255,45,85,0.08)', color: '#FF2D55', label: `${days}d` }
    if (type === 'review') return { bg: 'rgba(175,82,222,0.08)', color: '#AF52DE', label: `${days}d` }
    return { bg: 'rgba(46,150,255,0.08)', color: '#2E96FF', label: `${days}d` }
  })()
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700,
      padding: '3px 9px', borderRadius: 20,
      whiteSpace: 'nowrap', flexShrink: 0,
      letterSpacing: 0.2,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, #F2F2F7 25%, #E8E8ED 50%, #F2F2F7 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, loading, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      className="text-left w-full group"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: hovered ? `1.5px solid ${color}30` : '1.5px solid rgba(0,0,0,0.04)',
        boxShadow: hovered
          ? `0 8px 24px ${color}18, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        padding: '20px 20px 18px',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Subtle gradient blob */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'opacity 0.2s',
        opacity: hovered ? 1 : 0.6,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 8px ${color}20`,
        }}>
          <Icon size={19} style={{ color }} />
        </div>
        <ChevronRight
          size={15}
          style={{
            color: hovered ? color : '#C7C7CC',
            transition: 'color 0.2s, transform 0.2s',
            transform: hovered ? 'translateX(2px)' : 'none',
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton h={30} w="45%" />
          <Skeleton h={12} w="65%" />
        </div>
      ) : (
        <>
          <p style={{
            fontSize: 30, fontWeight: 700, color: '#1C1C1E', lineHeight: 1,
            letterSpacing: -1,
          }}>
            {value}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3C3C43', marginTop: 5, letterSpacing: 0.1 }}>
            {label}
          </p>
          {sub && (
            <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 3, letterSpacing: 0.1 }}>
              {sub}
            </p>
          )}
        </>
      )}
    </button>
  )
}

// ─── File icon helper ─────────────────────────────────────────────────────────
function fileIcon(mimeType) {
  if (!mimeType) return File
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  return File
}

// ─── Favourites widget ────────────────────────────────────────────────────────
function FavoritesWidget({ token }) {
  const [favorites, setFavorites] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [pdfViewer, setPdfViewer] = useState(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch('/api/library/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setFavorites(d.favorites ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  function openFavorite(fav) {
    if (fav.mime_type === 'application/pdf') {
      setPdfViewer({ fileId: fav.id, fileName: fav.name })
    } else {
      fetch(`/api/library/files/${fav.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href = url; a.download = fav.name; a.click()
          URL.revokeObjectURL(url)
        })
    }
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: 'rgba(255,149,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={12} fill="#FF9500" stroke="#FF9500" />
          </div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', letterSpacing: 0.1 }}>
            Favourites
          </h2>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1.5px solid rgba(0,0,0,0.04)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Skeleton h={28} w={28} r={8} />
                  <div style={{ flex: 1 }}>
                    <Skeleton h={12} w="75%" />
                    <div style={{ marginTop: 5 }}><Skeleton h={10} w="50%" /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div style={{
              padding: '24px 16px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, textAlign: 'center',
            }}>
              <Star size={20} stroke="#C7C7CC" fill="none" />
              <p style={{ fontSize: 12, color: '#8E8E93', lineHeight: 1.5, maxWidth: 160 }}>
                Star files in the Library to pin them here
              </p>
            </div>
          ) : (
            favorites.map((fav, idx) => {
              const Icon  = fileIcon(fav.mime_type)
              const isPDF = fav.mime_type === 'application/pdf'
              const iconColor = isPDF ? '#FF3B30' : '#2E96FF'
              return (
                <FavRow
                  key={fav.id}
                  fav={fav}
                  Icon={Icon}
                  iconColor={iconColor}
                  isPDF={isPDF}
                  isLast={idx === favorites.length - 1}
                  onClick={() => openFavorite(fav)}
                />
              )
            })
          )}
        </div>
      </div>

      {pdfViewer && (
        <SecurePDFViewerModal
          title={pdfViewer.fileName}
          endpoint={`/api/library/files/${pdfViewer.fileId}/view`}
          scrollMode
          onClose={() => setPdfViewer(null)}
        />
      )}
    </>
  )
}

function FavRow({ fav, Icon, iconColor, isPDF, isLast, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', textAlign: 'left',
        background: hovered ? '#F9F9FB' : 'none',
        border: 'none', cursor: 'pointer',
        transition: 'background 0.15s',
        borderBottom: isLast ? 'none' : '1px solid #F2F2F7',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `${iconColor}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: '#1C1C1E',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 1,
        }}>
          {fav.name}
        </p>
        <p style={{
          fontSize: 11, color: '#8E8E93',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {fav.folder_name}
        </p>
      </div>
      {!isPDF && (
        <Download size={12} style={{ color: hovered ? '#2E96FF' : '#C7C7CC', flexShrink: 0, transition: 'color 0.15s' }} />
      )}
    </button>
  )
}

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG = {
  task:    { color: '#2E96FF', bg: 'rgba(46,150,255,0.10)',  label: 'Task',     Icon: CheckSquare  },
  review:  { color: '#AF52DE', bg: 'rgba(175,82,222,0.10)',  label: 'Review',   Icon: CalendarClock },
  birthday:{ color: '#FF2D55', bg: 'rgba(255,45,85,0.10)',   label: 'Birthday', Icon: Cake          },
}

// ─── Feed row ─────────────────────────────────────────────────────────────────
function FeedRow({ item, isLast, onClick, TYPE_LABELS }) {
  const [hovered, setHovered] = useState(false)
  const cfg = TYPE_CFG[item.type]
  const TypeIcon = cfg.Icon

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 18px', textAlign: 'left',
        background: hovered ? '#F9F9FB' : 'transparent',
        border: 'none', cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid #F5F5F7',
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
        background: hovered ? cfg.color : cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
        boxShadow: hovered ? `0 3px 10px ${cfg.color}30` : 'none',
      }}>
        <TypeIcon size={15} style={{ color: hovered ? '#fff' : cfg.color, transition: 'color 0.2s' }} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: '#1C1C1E', marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </p>
        <p style={{
          fontSize: 12, color: '#8E8E93',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.type === 'task'
            ? `${item.contact.name}  ·  Due ${item.sub}`
            : item.sub}
        </p>
      </div>

      {/* Right: type pill + urgency */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          color: cfg.color, background: cfg.bg,
          padding: '2px 7px', borderRadius: 20,
          opacity: 0.9,
        }}>
          {TYPE_LABELS[item.type]}
        </span>
        <UrgencyBadge days={item.days} type={item.type} />
      </div>
    </button>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', letterSpacing: 0.1 }}>{title}</h2>
      {action && (
        <button
          onClick={onAction}
          style={{
            fontSize: 12, color: '#2E96FF', fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,150,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { agent, token } = useAuth()
  const { contacts, contactsLoading, contactsError } = useContacts()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { t } = useLanguage()

  const TYPE_LABELS = {
    task: t('dashboard.typeTask'),
    review: t('dashboard.typeReview'),
    birthday: t('dashboard.typeBirthday'),
  }

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

  // ── Unified upcoming feed (grouped) ───────────────────────────────────────
  const feed = useMemo(() => {
    const items = []
    contacts.forEach(c => {
      ;(c.tasks || []).forEach(task => {
        if (task.status === 'completed' || !task.dueDate) return
        const d = daysUntil(task.dueDate)
        if (d >= 0 && d <= 60)
          items.push({ type: 'task', days: d, contact: c, title: task.title, sub: fmtShort(task.dueDate) })
      })
      if (c.reviewDate) {
        const d = daysUntil(c.reviewDate)
        if (d >= 0 && d <= 60)
          items.push({
            type: 'review', days: d, contact: c,
            title: c.name,
            sub: `Review on ${fmtShort(c.reviewDate)}${c.reviewFrequency ? ' · ' + c.reviewFrequency : ''}`,
          })
      }
      if (c.dob) {
        const d = daysUntilBirthday(c.dob)
        if (d >= 0 && d <= 60)
          items.push({
            type: 'birthday', days: d, contact: c,
            title: c.name,
            sub: t('dashboard.turnAge') + ' ' + (getAge(c.dob) + (d > 0 ? 1 : 0)) + ' · ' + fmtShort(c.dob),
          })
      }
    })
    return items.sort((a, b) => a.days - b.days).slice(0, 12)
  }, [contacts])

  // Group feed by day label
  const feedGroups = useMemo(() => {
    const groups = []
    let lastLabel = null
    feed.forEach(item => {
      const label = dayGroupLabel(item.days)
      if (label !== lastLabel) {
        groups.push({ label, items: [] })
        lastLabel = label
      }
      groups[groups.length - 1].items.push(item)
    })
    return groups
  }, [feed])

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            marginBottom: 28,
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #040E1C 0%, #0a1f38 50%, #102845 100%)',
            borderRadius: 20,
            display: 'flex', flexDirection: 'column', gap: 12,
            position: 'relative', overflow: 'hidden',
            animation: 'fadeUp 0.4s ease',
          }}
        >
          {/* Decorative orbs */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(46,150,255,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: 100,
            width: 100, height: 100, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(175,82,222,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {todayStr()}
                </p>
              </div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.25,
                letterSpacing: -0.5,
              }}>
                {t(greetingKey())}{agent?.name ? `, ${agent.name.split(' ')[0]}` : ''} 👋
              </h1>
              {!contactsLoading && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 5, fontWeight: 400 }}>
                  {stats.total > 0
                    ? `${stats.total} client${stats.total !== 1 ? 's' : ''} · ${stats.pending > 0 ? `${stats.pending} task${stats.pending !== 1 ? 's' : ''} pending` : 'all tasks clear'}`
                    : 'No clients yet — add your first one below'}
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/contacts?new=true')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: '#2E96FF', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, padding: '10px 18px',
                boxShadow: '0 4px 14px rgba(46,150,255,0.40)',
                transition: 'all 0.2s',
                letterSpacing: 0.1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1a83f0'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2E96FF'; e.currentTarget.style.transform = 'none' }}
            >
              <Plus size={14} />
              {t('dashboard.newContact')}
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4"
          style={{ gap: 12, marginBottom: 24 }}
        >
          <StatCard
            icon={Users} label={t('dashboard.statContacts')} color="#2E96FF" loading={contactsLoading}
            value={stats.total}
            sub={stats.total === 1 ? t('dashboard.statClientProfile') : t('dashboard.statClientProfiles')}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={CheckSquare} label={t('dashboard.statPendingTasks')}
            color={stats.pending > 0 ? '#FF9500' : '#34C759'} loading={contactsLoading}
            value={stats.pending}
            sub={stats.pending === 0 ? t('dashboard.statAllClear') : t('dashboard.statAcrossContacts')}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={CalendarClock} label={t('dashboard.statReviewsMonth')} color="#AF52DE" loading={contactsLoading}
            value={stats.reviewsMonth}
            sub={stats.reviewsMonth === 0 ? t('dashboard.statNoneScheduled') : t('dashboard.statScheduled')}
            onClick={() => navigate('/contacts')}
          />
          <StatCard
            icon={Cake} label={t('dashboard.statBirthdaysMonth')} color="#FF2D55" loading={contactsLoading}
            value={stats.bdays}
            sub={stats.bdays === 0 ? t('dashboard.statNoneBirthday') : t('dashboard.statThisMonth')}
            onClick={() => navigate('/contacts')}
          />
        </div>

        {/* ── Body: Feed + Sidebar ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row" style={{ gap: 16, alignItems: 'flex-start' }}>

          {/* Left: Upcoming feed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionHeader
              title={t('dashboard.upcoming')}
              action={feed.length > 0 ? t('dashboard.viewAllContacts') : null}
              onAction={() => navigate('/contacts')}
            />

            {/* Loading skeleton */}
            {contactsLoading && (
              <div style={{
                background: '#FFF', borderRadius: 16,
                border: '1.5px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px',
                    borderBottom: i < 4 ? '1px solid #F5F5F7' : 'none',
                  }}>
                    <Skeleton h={36} w={36} r={11} />
                    <div style={{ flex: 1 }}>
                      <Skeleton h={14} w="60%" />
                      <div style={{ marginTop: 6 }}><Skeleton h={11} w="40%" /></div>
                    </div>
                    <Skeleton h={22} w={52} r={11} />
                  </div>
                ))}
              </div>
            )}

            {/* Grouped feed */}
            {!contactsLoading && feed.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feedGroups.map(group => {
                  const allItems = group.items
                  return (
                    <div key={group.label}>
                      {/* Group label */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 6, paddingLeft: 2,
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#8E8E93',
                          textTransform: 'uppercase', letterSpacing: 0.8,
                        }}>
                          {group.label}
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#F2F2F7' }} />
                        <span style={{
                          fontSize: 10, color: '#C7C7CC', fontWeight: 600,
                          letterSpacing: 0.2,
                        }}>
                          {allItems.length}
                        </span>
                      </div>

                      {/* Items */}
                      <div style={{
                        background: '#FFF', borderRadius: 14,
                        border: '1.5px solid rgba(0,0,0,0.04)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}>
                        {allItems.map((item, idx) => (
                          <FeedRow
                            key={`${item.type}-${item.contact.id}-${idx}`}
                            item={item}
                            isLast={idx === allItems.length - 1}
                            TYPE_LABELS={TYPE_LABELS}
                            onClick={() => navigate(`/contacts/${item.contact.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {!contactsLoading && feed.length === 0 && (
              <div style={{
                background: '#FFF',
                borderRadius: 16,
                border: '1.5px solid rgba(0,0,0,0.04)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                padding: '48px 24px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', gap: 12,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(52,199,89,0.15) 0%, rgba(52,199,89,0.05) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(52,199,89,0.15)',
                }}>
                  <CheckCircle2 size={26} style={{ color: '#34C759' }} />
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', marginBottom: 6 }}>
                    {t('dashboard.allClear')}
                  </p>
                  <p style={{ fontSize: 13, color: '#8E8E93', maxWidth: 260, lineHeight: 1.6 }}>
                    {t('dashboard.allClearDesc')}
                  </p>
                </div>
                {contacts.length === 0 && (
                  <button
                    onClick={() => navigate('/contacts?new=true')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      background: '#2E96FF', color: '#fff',
                      border: 'none', borderRadius: 10, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, padding: '10px 18px',
                      marginTop: 4,
                    }}
                  >
                    <Plus size={14} /> {t('dashboard.addFirstContact')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="lg:w-64 lg:shrink-0 w-full" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Quick Links */}
            <div>
              <SectionHeader title={t('dashboard.quickLinks')} />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2" style={{ gap: 8 }}>
                {QUICK_LINKS.map(({ label, icon: Icon, url, color }) => (
                  <QuickLinkCard key={label} label={label} Icon={Icon} url={url} color={color} />
                ))}
              </div>
            </div>

            {/* Favourites */}
            <FavoritesWidget token={token} />

          </div>
        </div>
      </div>
    </>
  )
}

// ─── Quick link card ──────────────────────────────────────────────────────────
function QuickLinkCard({ label, Icon, url, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '14px 8px', textDecoration: 'none',
        textAlign: 'center',
        background: hovered ? `${color}08` : '#FFFFFF',
        borderRadius: 14,
        border: hovered ? `1.5px solid ${color}30` : '1.5px solid rgba(0,0,0,0.04)',
        boxShadow: hovered ? `0 4px 14px ${color}20` : '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 11,
        background: hovered
          ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
          : `linear-gradient(135deg, ${color}18 0%, ${color}0c 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
        boxShadow: hovered ? `0 2px 8px ${color}25` : 'none',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <span style={{
        fontSize: 11, color: hovered ? '#1C1C1E' : '#3C3C43',
        fontWeight: 600, lineHeight: 1.3, letterSpacing: 0.1,
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      {hovered && (
        <ArrowUpRight
          size={9}
          style={{
            position: 'absolute', top: 8, right: 8,
            color: `${color}80`,
          }}
        />
      )}
    </a>
  )
}
