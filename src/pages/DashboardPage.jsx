import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useContacts } from '../hooks/useContacts'
import { useToast } from '../hooks/useToast'
import { useLanguage } from '../hooks/useLanguage'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'
import TaskModal from '../components/dashboard/TaskModal'
import ContactDrawer from '../components/dashboard/ContactDrawer'
import {
  Plus, Users, CheckSquare, CalendarClock, Cake,
  Building2, FileText, Shield, Globe, Landmark,
  ChevronRight, CheckCircle2, FileCheck, ClipboardList, TrendingUp,
  Star, File, FileImage, FileSpreadsheet, Download, ArrowUpRight,
} from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const QUICK_LINKS = [
  { label: 'Agency Portal',      icon: Building2,     url: 'https://portal.tokiomarinelife.com.my',                                         color: '#2E96FF' },
  { label: 'Sales Illustration', icon: FileText,       url: 'https://tmarinepro.tokiomarinelife.com.my/standalone/',                         color: '#34C759' },
  { label: 'T-Marine Pro',       icon: Shield,         url: 'https://tmarinepro.tokiomarinelife.com.my/',                                    color: '#FF9500' },
  { label: 'Insurance Portals',  icon: Globe,          url: 'https://portals.llhgroup.co',                                                   color: '#AF52DE' },
  { label: 'Tokio Marine Life',  icon: Landmark,       url: 'https://www.tokiomarine.com/my/en/life.html',                                   color: '#FF2D55' },
  { label: 'Claim Guide',        icon: FileCheck,      url: 'https://www.tokiomarine.com/my/en/life/claim/step-by-step-claim-guide.html',    color: '#FF6B35' },
  { label: 'Service Form',       icon: ClipboardList,  url: 'https://www.tokiomarine.com/my/en/life/resources/forms.html',                  color: '#5856D6' },
  { label: 'Funds Centre',       icon: TrendingUp,     url: 'https://www.tokiomarine.com/my/en/life/resources/fund-centre.html',            color: '#30B0C7' },
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
// Fully dynamic runtime colors — inline styles kept intentionally
function UrgencyBadge({ days, type }) {
  const cfg = (() => {
    if (days === 0) return { bg: 'rgba(255,59,48,0.10)',  color: '#FF3B30', label: 'Today'    }
    if (days === 1) return { bg: 'rgba(255,149,0,0.12)',  color: '#FF9500', label: 'Tomorrow' }
    if (days <= 3)  return { bg: 'rgba(255,149,0,0.10)',  color: '#FF9500', label: `${days}d` }
    if (type === 'birthday') return { bg: 'rgba(255,45,85,0.08)',  color: '#FF2D55', label: `${days}d` }
    if (type === 'review')   return { bg: 'rgba(175,82,222,0.08)', color: '#AF52DE', label: `${days}d` }
    return { bg: 'rgba(46,150,255,0.08)', color: '#2E96FF', label: `${days}d` }
  })()
  return (
    <span
      className="shrink-0 text-[11px] font-bold tracking-[0.2px] rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, padding: '3px 9px' }}
    >
      {cfg.label}
    </span>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
// Gradient kept inline — backgroundSize/backgroundPosition can't be Tailwind classes
function Skeleton({ h = 16, w = '100%', r = 6 }) {
  return (
    <div
      className="animate-shimmer"
      style={{
        height: h, width: w, borderRadius: r,
        background: 'linear-gradient(90deg, #F2F2F7 25%, #E8E8ED 50%, #F2F2F7 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
// Dynamic `color` prop drives hover effects — those stay inline. Everything else: Tailwind.
function StatCard({ icon: Icon, label, value, sub, color, loading, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      className="relative w-full text-left overflow-hidden bg-hig-card rounded-hig-lg border
                 shadow-hig transition-all duration-hig cursor-pointer"
      style={{
        padding: '20px 20px 18px',
        borderColor: hovered ? `${color}30` : 'rgba(0,0,0,0.04)',
        boxShadow: hovered ? `0 8px 24px ${color}18, 0 2px 8px rgba(0,0,0,0.06)` : undefined,
        transform: hovered ? 'translateY(-1px)' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Subtle colour blob */}
      <div
        className="pointer-events-none absolute -top-5 -right-5 w-20 h-20 rounded-full transition-opacity duration-hig"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, opacity: hovered ? 1 : 0.6 }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}10 100%)`, boxShadow: `0 2px 8px ${color}20` }}
        >
          <Icon size={19} style={{ color }} />
        </div>
        <ChevronRight
          size={15}
          style={{
            color: hovered ? color : '#C7C7CC',
            transform: hovered ? 'translateX(2px)' : 'none',
            transition: 'color 0.2s, transform 0.2s',
          }}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton h={30} w="45%" />
          <Skeleton h={12} w="65%" />
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-hig-text leading-none tracking-[-1px]">{value}</p>
          <p className="text-hig-footnote font-semibold text-hig-text mt-[5px] tracking-[0.1px]">{label}</p>
          {sub && <p className="text-[11px] text-hig-gray-1 mt-[3px] tracking-[0.1px]">{sub}</p>}
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
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-6 h-6 rounded-[7px] bg-hig-orange/10 flex items-center justify-center">
            <Star size={12} fill="#FF9500" stroke="#FF9500" />
          </div>
          <h2 className="text-sm font-bold text-hig-text tracking-[0.1px]">Favourites</h2>
        </div>

        <div className="bg-hig-card rounded-[14px] border border-black/[0.04] shadow-hig overflow-hidden">
          {loading ? (
            <div className="p-3.5 flex flex-col gap-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2.5">
                  <Skeleton h={28} w={28} r={8} />
                  <div className="flex-1 flex flex-col gap-[5px]">
                    <Skeleton h={12} w="75%" />
                    <Skeleton h={10} w="50%" />
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div className="py-6 px-4 flex flex-col items-center gap-2 text-center">
              <Star size={20} stroke="#C7C7CC" fill="none" />
              <p className="text-hig-caption1 text-hig-gray-1 max-w-[160px] leading-relaxed">
                Star files in the Library to pin them here
              </p>
            </div>
          ) : (
            favorites.map((fav, idx) => {
              const Icon    = fileIcon(fav.mime_type)
              const isPDF   = fav.mime_type === 'application/pdf'
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
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left
                  hover:bg-hig-gray-6 transition-colors
                  ${!isLast ? 'border-b border-hig-gray-6' : ''}`}
    >
      <div
        className="w-[30px] h-[30px] rounded-hig-sm shrink-0 flex items-center justify-center"
        style={{ background: `${iconColor}12` }}
      >
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-hig-caption1 font-semibold text-hig-text truncate mb-[1px]">{fav.name}</p>
        <p className="text-[11px] text-hig-gray-1 truncate">{fav.folder_name}</p>
      </div>
      {!isPDF && (
        <Download size={12} className="text-hig-gray-3 shrink-0" />
      )}
    </button>
  )
}

// ─── Type config ──────────────────────────────────────────────────────────────
// All class strings written out in full — Tailwind JIT requires static strings to detect them
const TYPE_CFG = {
  task: {
    iconBg:        'bg-hig-blue/10',
    iconBgHover:   'group-hover:bg-hig-blue',
    iconColor:     'text-hig-blue',
    iconColorHover:'group-hover:text-white',
    pillBg:        'bg-hig-blue/10',
    pillText:      'text-hig-blue',
    label:         'Task',
    Icon:          CheckSquare,
  },
  review: {
    iconBg:        'bg-hig-purple/10',
    iconBgHover:   'group-hover:bg-hig-purple',
    iconColor:     'text-hig-purple',
    iconColorHover:'group-hover:text-white',
    pillBg:        'bg-hig-purple/10',
    pillText:      'text-hig-purple',
    label:         'Review',
    Icon:          CalendarClock,
  },
  birthday: {
    iconBg:        'bg-hig-pink/10',
    iconBgHover:   'group-hover:bg-hig-pink',
    iconColor:     'text-hig-pink',
    iconColorHover:'group-hover:text-white',
    pillBg:        'bg-hig-pink/10',
    pillText:      'text-hig-pink',
    label:         'Birthday',
    Icon:          Cake,
  },
}

// ─── Feed row ─────────────────────────────────────────────────────────────────
function FeedRow({ item, isLast, onClick, TYPE_LABELS }) {
  const cfg     = TYPE_CFG[item.type]
  const TypeIcon = cfg.Icon

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-3.5 px-[18px] py-[13px] text-left
                  hover:bg-hig-gray-6 transition-colors
                  ${!isLast ? 'border-b border-[#F5F5F7]' : ''}`}
    >
      {/* Type icon */}
      <div className={`w-9 h-9 rounded-[11px] shrink-0 flex items-center justify-center transition-all
                       ${cfg.iconBg} ${cfg.iconBgHover}`}>
        <TypeIcon size={15} className={`transition-colors ${cfg.iconColor} ${cfg.iconColorHover}`} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-hig-text mb-[2px] truncate">{item.title}</p>
        <p className="text-hig-caption1 text-hig-gray-1 truncate">
          {item.type === 'task'
            ? `${item.contact.name}  ·  Due ${item.sub}`
            : item.sub}
        </p>
      </div>

      {/* Right: type pill + urgency */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-[10px] font-bold tracking-[0.5px] uppercase
                          px-[7px] py-[2px] rounded-full opacity-90
                          ${cfg.pillBg} ${cfg.pillText}`}>
          {TYPE_LABELS[item.type]}
        </span>
        <UrgencyBadge days={item.days} type={item.type} />
      </div>
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-hig-subhead font-bold text-hig-text tracking-[0.1px]">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-hig-caption1 text-hig-blue font-semibold
                     px-2 py-1 rounded-hig-sm hover:bg-hig-blue/5 transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { agent, token }                                            = useAuth()
  const { contacts, contactsLoading, contactsError, toggleTask, addInteraction } = useContacts()
  const navigate    = useNavigate()
  const { addToast } = useToast()
  const { t }       = useLanguage()

  const [activeItem, setActiveItem] = useState(null)
  function handleFeedClick(item)  { setActiveItem(item) }
  function handleCloseOverlay()   { setActiveItem(null) }

  const TYPE_LABELS = {
    task:     t('dashboard.typeTask'),
    review:   t('dashboard.typeReview'),
    birthday: t('dashboard.typeBirthday'),
  }

  useEffect(() => {
    if (contactsError) addToast(contactsError, 'error')
  }, [contactsError, addToast])

  const now       = new Date()
  const thisMonth = now.getMonth()
  const thisYear  = now.getFullYear()

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
      ;(c.tasks || []).forEach(task => {
        if (task.status === 'completed' || !task.dueDate) return
        const d = daysUntil(task.dueDate)
        if (d >= 0 && d <= 60)
          items.push({ type: 'task', days: d, contact: c, task, title: task.title, sub: fmtShort(task.dueDate) })
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
      {/* ── Task modal ──────────────────────────────────────────────────────── */}
      {activeItem?.type === 'task' && (
        <TaskModal
          item={activeItem}
          onClose={handleCloseOverlay}
          onToggleTask={toggleTask}
          onAddInteraction={addInteraction}
        />
      )}

      {/* ── Contact drawer — reviews & birthdays ────────────────────────────── */}
      {(activeItem?.type === 'review' || activeItem?.type === 'birthday') && (
        <ContactDrawer item={activeItem} onClose={handleCloseOverlay} />
      )}

      <div className="max-w-[1120px] mx-auto animate-fade-up">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="mb-7 rounded-[20px] overflow-hidden relative flex flex-col gap-3"
          style={{
            padding: '22px 24px',
            background: 'linear-gradient(135deg, #040E1C 0%, #0a1f38 50%, #102845 100%)',
          }}
        >
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(46,150,255,0.25) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute -bottom-5 left-[100px] w-[100px] h-[100px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(175,82,222,0.15) 0%, transparent 70%)' }} />

          <div className="relative flex justify-between items-end flex-wrap gap-3">
            <div>
              <p className="text-[12px] text-white/45 font-medium tracking-[0.5px] uppercase mb-1">
                {todayStr()}
              </p>
              <h1 className="text-2xl font-bold text-white leading-tight tracking-[-0.5px]">
                {t(greetingKey())}{agent?.name ? `, ${agent.name.split(' ')[0]}` : ''} 👋
              </h1>
              {!contactsLoading && (
                <p className="text-[13px] text-white/50 mt-[5px]">
                  {stats.total > 0
                    ? `${stats.total} client${stats.total !== 1 ? 's' : ''} · ${stats.pending > 0 ? `${stats.pending} task${stats.pending !== 1 ? 's' : ''} pending` : 'all tasks clear'}`
                    : 'No clients yet — add your first one below'}
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/contacts/new')}
              className="inline-flex items-center gap-1.5 bg-hig-blue text-white font-bold
                         text-[13px] px-[18px] py-2.5 rounded-[10px] tracking-[0.1px]
                         transition-all hover:bg-blue-500 hover:-translate-y-px"
              style={{ boxShadow: '0 4px 14px rgba(46,150,255,0.40)' }}
            >
              <Plus size={14} />
              {t('dashboard.newContact')}
            </button>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
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
            onClick={() => navigate('/contacts?filter=tasks')}
          />
          <StatCard
            icon={CalendarClock} label={t('dashboard.statReviewsMonth')} color="#AF52DE" loading={contactsLoading}
            value={stats.reviewsMonth}
            sub={stats.reviewsMonth === 0 ? t('dashboard.statNoneScheduled') : t('dashboard.statScheduled')}
            onClick={() => navigate('/contacts?filter=review')}
          />
          <StatCard
            icon={Cake} label={t('dashboard.statBirthdaysMonth')} color="#FF2D55" loading={contactsLoading}
            value={stats.bdays}
            sub={stats.bdays === 0 ? t('dashboard.statNoneBirthday') : t('dashboard.statThisMonth')}
            onClick={() => navigate('/contacts?filter=birthdays')}
          />
        </div>

        {/* ── Body: Feed + Sidebar ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Left: Upcoming feed */}
          <div className="flex-1 min-w-0">
            <SectionHeader
              title={t('dashboard.upcoming')}
              action={feed.length > 0 ? t('dashboard.viewAllContacts') : null}
              onAction={() => navigate('/contacts')}
            />

            {/* Loading skeleton */}
            {contactsLoading && (
              <div className="bg-hig-card rounded-hig-lg border border-black/[0.04] shadow-hig overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`flex items-center gap-3.5 px-[18px] py-3.5
                                           ${i < 4 ? 'border-b border-[#F5F5F7]' : ''}`}>
                    <Skeleton h={36} w={36} r={11} />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Skeleton h={14} w="60%" />
                      <Skeleton h={11} w="40%" />
                    </div>
                    <Skeleton h={22} w={52} r={11} />
                  </div>
                ))}
              </div>
            )}

            {/* Grouped feed */}
            {!contactsLoading && feed.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {feedGroups.map(group => (
                  <div key={group.label}>
                    {/* Group label */}
                    <div className="flex items-center gap-2 mb-1.5 pl-0.5">
                      <span className="text-[11px] font-bold text-hig-gray-1 uppercase tracking-[0.8px]">
                        {group.label}
                      </span>
                      <div className="flex-1 h-px bg-hig-gray-6" />
                      <span className="text-[10px] text-hig-gray-3 font-semibold tracking-[0.2px]">
                        {group.items.length}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="bg-hig-card rounded-[14px] border border-black/[0.04] shadow-hig overflow-hidden">
                      {group.items.map((item, idx) => (
                        <FeedRow
                          key={`${item.type}-${item.contact.id}-${idx}`}
                          item={item}
                          isLast={idx === group.items.length - 1}
                          TYPE_LABELS={TYPE_LABELS}
                          onClick={() => handleFeedClick(item)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!contactsLoading && feed.length === 0 && (
              <div className="bg-hig-card rounded-hig-lg border border-black/[0.04] shadow-hig
                              px-6 py-12 flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(52,199,89,0.15) 0%, rgba(52,199,89,0.05) 100%)',
                    boxShadow: '0 4px 16px rgba(52,199,89,0.15)',
                  }}
                >
                  <CheckCircle2 size={26} className="text-hig-green" />
                </div>
                <div>
                  <p className="text-hig-headline font-bold text-hig-text mb-1.5">
                    {t('dashboard.allClear')}
                  </p>
                  <p className="text-hig-footnote text-hig-gray-1 max-w-[260px] leading-relaxed">
                    {t('dashboard.allClearDesc')}
                  </p>
                </div>
                {contacts.length === 0 && (
                  <button
                    onClick={() => navigate('/contacts/new')}
                    className="inline-flex items-center gap-1.5 bg-hig-blue text-white font-bold
                               text-[13px] px-[18px] py-2.5 rounded-[10px] mt-1"
                  >
                    <Plus size={14} /> {t('dashboard.addFirstContact')}
                  </button>
                )}
              </div>
            )}

            {/* Favourites */}
            <div className="mt-5">
              <FavoritesWidget token={token} />
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:w-64 lg:shrink-0 w-full flex flex-col gap-5">
            <div>
              <SectionHeader title={t('dashboard.quickLinks')} />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                {QUICK_LINKS.map(({ label, icon: Icon, url, color }) => (
                  <QuickLinkCard key={label} label={label} Icon={Icon} url={url} color={color} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Quick link card ──────────────────────────────────────────────────────────
// Dynamic `color` prop — hover effects stay inline. Everything else: Tailwind.
function QuickLinkCard({ label, Icon, url, color }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center gap-2 py-3.5 px-2 text-center
                 no-underline rounded-[14px] border transition-all duration-hig relative"
      style={{
        background:   hovered ? `${color}08` : '#FFFFFF',
        borderColor:  hovered ? `${color}30` : 'rgba(0,0,0,0.04)',
        boxShadow:    hovered ? `0 4px 14px ${color}20` : '0 1px 4px rgba(0,0,0,0.05)',
        transform:    hovered ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-9 h-9 rounded-[11px] flex items-center justify-center transition-all duration-hig"
        style={{
          background: hovered
            ? `linear-gradient(135deg, ${color}30 0%, ${color}18 100%)`
            : `linear-gradient(135deg, ${color}18 0%, ${color}0c 100%)`,
          boxShadow: hovered ? `0 2px 8px ${color}25` : 'none',
        }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <span
        className="text-[11px] font-semibold leading-[1.3] tracking-[0.1px] transition-colors duration-hig"
        style={{ color: hovered ? '#1C1C1E' : '#3C3C43' }}
      >
        {label}
      </span>
      {hovered && (
        <ArrowUpRight size={9} className="absolute top-2 right-2" style={{ color: `${color}80` }} />
      )}
    </a>
  )
}
