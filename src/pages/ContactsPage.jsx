/**
 * ContactsPage — Salesforce-inspired CRM list view
 *
 * Features:
 * · Stats bar: Total | Clients | Prospects | Overdue Reviews
 * · Filter chips: All / Clients / Prospects / Review Due / Stale
 * · Sort: Last Activity | Review Date | Name | Stage
 * · View toggle: List (table) | Pipeline (Kanban)
 * · Enhanced rows: stage pill, coverage dots, last-activity, overdue badge
 * · Add contact modal: name, dob, mobile, email, employment, stage, notes
 */

import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import {
  Plus, Search, Trash2, Tag, MoreHorizontal,
  ChevronRight, Phone, AlertCircle,
  Target, Shield, CheckCircle2,
  LayoutList, Columns, AlertTriangle,
  SortAsc,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAGES = [
  { key: 'Lead',     label: 'Lead',     color: '#8E8E93', bg: '#F2F2F7' },
  { key: 'Prospect', label: 'Prospect', color: '#2E96FF', bg: '#EBF5FF' },
  { key: 'Proposal', label: 'Proposal', color: '#FF9500', bg: '#FFF8EC' },
  { key: 'Client',   label: 'Client',   color: '#34C759', bg: '#EDFAEF' },
  { key: 'Dormant',  label: 'Dormant',  color: '#FF3B30', bg: '#FFF1F0' },
]

const STAGE_PIPELINE = ['Lead', 'Prospect', 'Proposal', 'Client'] // Kanban columns (Dormant separate)
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

// Infer stage from existing tags if no explicit stage set
export function getEffectiveStage(contact) {
  if (contact.stage) return contact.stage
  if (contact.tags?.includes('Client'))   return 'Client'
  if (contact.tags?.includes('Prospect')) return 'Prospect'
  return 'Lead'
}

// Coverage check — derived from financials.insurance array
function getCoverage(contact) {
  const policies = contact.financials?.insurance || []
  const active = policies.filter(p => !p.status || p.status === 'Active')
  const types  = active.map(p => (p.type || '').toLowerCase())
  return {
    life:    types.some(t => ['whole life','term','life','endowment','investment-linked'].some(k => t.includes(k.split(' ')[0]))),
    medical: types.some(t => t.includes('medical') || t.includes('health')),
    ci:      types.some(t => t.includes('critical')),
    pa:      types.some(t => t.includes('personal')),
  }
}

function getLastActivity(contact) {
  const dates = [
    ...(contact.activities    || []).map(a => a.date),
    ...(contact.interactions  || []).map(i => i.date),
  ].filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d))
  return dates.length ? new Date(Math.max(...dates)) : null
}

function getAge(dob) {
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() ||
     (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
  return age
}

function daysUntilReview(reviewDate) {
  if (!reviewDate) return null
  const target = new Date(reviewDate)
  target.setHours(0,0,0,0)
  const now = new Date()
  now.setHours(0,0,0,0)
  return Math.round((target - now) / 86400000)
}

function fmtRelativeDate(date) {
  if (!date) return null
  const diff = Math.floor((Date.now() - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff/7)}w ago`
  if (diff < 365) return `${Math.floor(diff/30)}mo ago`
  return `${Math.floor(diff/365)}y ago`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StagePill({ stageKey, size = 'sm' }) {
  const { t } = useLanguage()
  const s = STAGE_MAP[stageKey] || STAGE_MAP.Lead
  const stageKeyMap = { Lead: 'stageLead', Prospect: 'stageProspect', Proposal: 'stageProposal', Client: 'stageClient', Dormant: 'stageDormant' }
  const label = t(`contacts.${stageKeyMap[stageKey] || 'stageLead'}`)
  return (
    <span style={{
      fontSize: size === 'xs' ? 10 : 11,
      fontWeight: 600,
      padding: size === 'xs' ? '1px 6px' : '2px 8px',
      borderRadius: 20,
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  )
}

function CoverageDots({ contact }) {
  const cov = getCoverage(contact)
  const items = [
    { key: 'life',    label: 'Life',    color: '#1C1C1E' },
    { key: 'medical', label: 'Med',     color: '#FF3B30' },
    { key: 'ci',      label: 'CI',      color: '#FF9500' },
    { key: 'pa',      label: 'PA',      color: '#AF52DE' },
  ]
  return (
    <div className="flex items-center gap-1">
      {items.map(({ key, label, color }) => (
        <span
          key={key}
          title={`${label}: ${cov[key] ? 'Covered' : 'Missing'}`}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700,
            background: cov[key] ? `${color}18` : '#F2F2F7',
            color: cov[key] ? color : '#C7C7CC',
            border: cov[key] ? `1px solid ${color}30` : '1px solid #E5E5EA',
          }}
        >
          {label[0]}
        </span>
      ))}
    </div>
  )
}

function ReviewBadge({ reviewDate }) {
  const { t } = useLanguage()
  const days = daysUntilReview(reviewDate)
  if (days === null) return null
  if (days > 30) return null
  const overdue = days < 0
  const today   = days === 0
  const label = overdue
    ? t('contacts.reviewOverdue', { days: Math.abs(days) })
    : today
      ? t('contacts.reviewToday')
      : t('contacts.reviewDays', { days })
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '2px 6px', borderRadius: 10,
      background: overdue ? '#FFF1F0' : today ? '#FFF8EC' : '#F0F5FF',
      color:      overdue ? '#FF3B30' : today ? '#FF9500' : '#2E96FF',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

// Stats bar
function StatsBar({ contacts, activeFilter, onFilter }) {
  const { t } = useLanguage()
  const stats = useMemo(() => {
    const now = new Date()
    now.setHours(0,0,0,0)
    let clients = 0, prospects = 0, overdue = 0, stale = 0
    contacts.forEach(c => {
      const stage = getEffectiveStage(c)
      if (stage === 'Client') clients++
      else if (['Lead','Prospect','Proposal'].includes(stage)) prospects++
      // Overdue review
      if (c.reviewDate) {
        const d = new Date(c.reviewDate)
        d.setHours(0,0,0,0)
        if (d < now) overdue++
      }
      // Stale: no activity in 90+ days
      const last = getLastActivity(c)
      if (!last || (Date.now() - last) / 86400000 > 90) stale++
    })
    return { total: contacts.length, clients, prospects, overdue, stale }
  }, [contacts])

  const pills = [
    { key: 'all',       label: t('contacts.filterAll'),       value: stats.total,     color: '#2E96FF' },
    { key: 'clients',   label: t('contacts.filterClients'),   value: stats.clients,   color: '#34C759' },
    { key: 'prospects', label: t('contacts.filterPipeline'),  value: stats.prospects, color: '#FF9500' },
    { key: 'overdue',   label: t('contacts.filterReviewDue'), value: stats.overdue,   color: '#AF52DE' },
    { key: 'stale',     label: t('contacts.filterNoActivity'),value: stats.stale,     color: '#FF3B30' },
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {pills.map(p => {
        const active = activeFilter === p.key
        return (
          <button
            key={p.key}
            onClick={() => onFilter(active ? 'all' : p.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20,
              border: active ? `1.5px solid ${p.color}` : '1.5px solid #E5E5EA',
              background: active ? `${p.color}12` : 'white',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{
              fontSize: 15, fontWeight: 700,
              color: active ? p.color : '#1C1C1E',
            }}>{p.value}</span>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: active ? p.color : '#8E8E93',
            }}>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// List row
function ContactRow({ contact, onClick }) {
  const { t } = useLanguage()
  const stage       = getEffectiveStage(contact)
  const lastAct     = getLastActivity(contact)
  const age         = getAge(contact.dob)
  const pendingTasks = (contact.tasks || []).filter(task => task.status !== 'completed').length

  return (
    <div
      onClick={onClick}
      className="border-b border-hig-gray-5 last:border-b-0 hover:bg-hig-gray-6/50 transition-colors cursor-pointer"
    >
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3">
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: '#2E96FF18', color: '#2E96FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
        }}>
          {contact.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-hig-subhead font-semibold text-hig-text truncate">{contact.name}</p>
            <StagePill stageKey={stage} size="xs" />
            <ReviewBadge reviewDate={contact.reviewDate} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-hig-caption1 text-hig-text-secondary flex-wrap">
            <span>{t('contacts.ageLabel')} {age}</span>
            {contact.mobile && <><span>·</span><span>{contact.mobile}</span></>}
            {lastAct && <><span>·</span><span>{fmtRelativeDate(lastAct)}</span></>}
            {pendingTasks > 0 && <><span>·</span><span style={{ color: '#FF9500' }}>{pendingTasks} task{pendingTasks > 1 ? 's' : ''}</span></>}
          </div>
        </div>
        <ChevronRight size={15} className="text-hig-text-secondary shrink-0" />
      </div>

      {/* Desktop */}
      <div className="hidden md:grid items-center px-4 py-3"
        style={{ gridTemplateColumns: '1fr 110px 90px 110px 90px 32px' }}>
        {/* Name + age */}
        <div>
          <div className="flex items-center gap-2">
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: '#2E96FF18', color: '#2E96FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {contact.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="text-hig-subhead font-medium text-hig-text leading-tight">{contact.name}</p>
              <div className="flex items-center gap-1.5 text-hig-caption1 text-hig-text-secondary">
                <span>{t('contacts.ageLabel')} {age}</span>
                {contact.mobile && <><span>·</span><span className="flex items-center gap-0.5"><Phone size={10} />{contact.mobile}</span></>}
              </div>
            </div>
          </div>
        </div>
        {/* Stage */}
        <div className="flex items-center gap-1.5">
          <StagePill stageKey={stage} />
          <ReviewBadge reviewDate={contact.reviewDate} />
        </div>
        {/* Last Activity */}
        <div className="text-hig-caption1 text-hig-text-secondary">
          {lastAct ? fmtRelativeDate(lastAct) : <span className="text-hig-gray-3">—</span>}
        </div>
        {/* Coverage */}
        <div>
          <CoverageDots contact={contact} />
        </div>
        {/* Plans */}
        <div className="flex items-center gap-2">
          {contact.retirementPlan
            ? <CheckCircle2 size={14} className="text-hig-blue" title="Retirement plan" />
            : <Target size={14} className="text-hig-gray-3" title="No retirement plan" />}
          {contact.protectionPlan
            ? <CheckCircle2 size={14} className="text-hig-green" title="Protection plan" />
            : <Shield size={14} className="text-hig-gray-3" title="No protection plan" />}
          {pendingTasks > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              background: '#FF9500', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} title={`${pendingTasks} pending task(s)`}>
              {pendingTasks}
            </span>
          )}
        </div>
        <ChevronRight size={15} className="text-hig-text-secondary" />
      </div>
    </div>
  )
}

// Kanban card
function KanbanCard({ contact, onNavigate, onStageChange }) {
  const { t } = useLanguage()
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const stage    = getEffectiveStage(contact)
  const lastAct  = getLastActivity(contact)
  const age      = getAge(contact.dob)
  const reviewD  = daysUntilReview(contact.reviewDate)
  const isOverdue = reviewD !== null && reviewD < 0

  const nextStages = STAGES.filter(s => s.key !== stage && s.key !== 'Dormant')

  return (
    <div
      className="hig-card"
      style={{ padding: '10px 12px', cursor: 'pointer', marginBottom: 8, position: 'relative' }}
    >
      <div onClick={onNavigate}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: '#2E96FF18', color: '#2E96FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
          }}>
            {contact.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3 }}>{contact.name}</p>
            <p style={{ fontSize: 11, color: '#8E8E93' }}>{t('contacts.ageLabel')} {age}{contact.employment ? ` · ${contact.employment}` : ''}</p>
          </div>
          {isOverdue && <AlertTriangle size={13} style={{ color: '#FF9500', flexShrink: 0 }} title="Review overdue" />}
        </div>

        <div className="flex items-center justify-between mt-1">
          <CoverageDots contact={contact} />
          <span style={{ fontSize: 10, color: '#8E8E93' }}>
            {lastAct ? fmtRelativeDate(lastAct) : t('contacts.noActivity')}
          </span>
        </div>
      </div>

      {/* Move stage button */}
      {nextStages.length > 0 && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); setShowMoveMenu(s => !s) }}
            className="w-full py-1 px-2 rounded-md border border-dashed border-hig-gray-4
                       bg-transparent text-hig-caption1 text-hig-text-secondary
                       cursor-pointer transition-all hover:border-hig-blue hover:text-hig-blue"
          >
            {t('contacts.moveStage')}
          </button>
          {showMoveMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMoveMenu(false)} />
              <div style={{
                position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
                background: 'white', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                border: '1px solid #F2F2F7', zIndex: 20, overflow: 'hidden',
              }}>
                {nextStages.map(s => (
                  <button
                    key={s.key}
                    onClick={e => { e.stopPropagation(); onStageChange(contact.id, s.key); setShowMoveMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 border-none
                               bg-transparent cursor-pointer text-hig-caption1
                               text-hig-text text-left hover:bg-gray-50 transition-colors"
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Kanban pipeline view
function PipelineView({ contacts, onNavigate, onStageChange }) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {STAGE_PIPELINE.map(stageKey => {
        const s = STAGE_MAP[stageKey]
        const stageContacts = contacts.filter(c => getEffectiveStage(c) === stageKey)
        return (
          <div key={stageKey} style={{ minWidth: 220, maxWidth: 260, flex: '1 1 220px' }}>
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 4px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', letterSpacing: '0.03em' }}>
                  {t(`contacts.stage${stageKey}`).toUpperCase()}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: s.color,
                background: s.bg, padding: '2px 7px', borderRadius: 10,
              }}>
                {stageContacts.length}
              </span>
            </div>

            {/* Cards */}
            <div>
              {stageContacts.length === 0 ? (
                <div style={{
                  padding: '24px 12px', textAlign: 'center',
                  border: '1.5px dashed #E5E5EA', borderRadius: 10,
                  color: '#C7C7CC', fontSize: 12,
                }}>
                  {t('contacts.noneInStage')}
                </div>
              ) : stageContacts.map(c => (
                <KanbanCard
                  key={c.id}
                  contact={c}
                  onNavigate={() => onNavigate(c.id)}
                  onStageChange={onStageChange}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Dormant column (collapsed by default) */}
      {(() => {
        const dormant = contacts.filter(c => getEffectiveStage(c) === 'Dormant')
        if (dormant.length === 0) return null
        const s = STAGE_MAP.Dormant
        return (
          <div style={{ minWidth: 220, maxWidth: 260, flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#636366', letterSpacing: '0.03em' }}>DORMANT</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: '2px 7px', borderRadius: 10 }}>{dormant.length}</span>
            </div>
            {dormant.map(c => (
              <KanbanCard key={c.id} contact={c} onNavigate={() => onNavigate(c.id)} onStageChange={onStageChange} />
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SORT_KEYS = [
  { key: 'activity', tKey: 'contacts.sortActivity' },
  { key: 'review',   tKey: 'contacts.sortReview'   },
  { key: 'name',     tKey: 'contacts.sortName'     },
  { key: 'stage',    tKey: 'contacts.sortStage'    },
]

const STAGE_ORDER = { Lead: 0, Prospect: 1, Proposal: 2, Client: 3, Dormant: 4 }

export default function ContactsPage() {
  const { contacts, contactsLoading, contactsError, deleteContacts, addTag, updateContact } = useContacts()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search,      setSearch]      = useState(() => searchParams.get('q') || '')
  const [filter,      setFilter]      = useState(() => searchParams.get('filter') || 'all')
  const [sortBy,      setSortBy]      = useState('activity')
  const [viewMode,    setViewMode]    = useState('list') // 'list' | 'pipeline'
  const [selected,    setSelected]    = useState(new Set())
  const [showBulkMenu,setShowBulkMenu]= useState(false)
  const [showSort,    setShowSort]    = useState(false)

  const now = new Date()
  now.setHours(0,0,0,0)

  // Apply filter
  const filtered = useMemo(() => {
    let list = contacts

    // Text search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // Quick filter
    if (filter === 'clients') {
      list = list.filter(c => getEffectiveStage(c) === 'Client')
    } else if (filter === 'prospects') {
      list = list.filter(c => ['Lead','Prospect','Proposal'].includes(getEffectiveStage(c)))
    } else if (filter === 'overdue') {
      list = list.filter(c => {
        if (!c.reviewDate) return false
        const d = new Date(c.reviewDate)
        d.setHours(0,0,0,0)
        return d < now
      })
    } else if (filter === 'stale') {
      list = list.filter(c => {
        const last = getLastActivity(c)
        return !last || (Date.now() - last) / 86400000 > 90
      })
    }

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stage') return (STAGE_ORDER[getEffectiveStage(a)] ?? 9) - (STAGE_ORDER[getEffectiveStage(b)] ?? 9)
      if (sortBy === 'review') {
        const da = a.reviewDate ? new Date(a.reviewDate) : new Date(9999,0,1)
        const db = b.reviewDate ? new Date(b.reviewDate) : new Date(9999,0,1)
        return da - db
      }
      // Default: last activity (newest first), nulls at bottom
      const la = getLastActivity(a)
      const lb = getLastActivity(b)
      if (!la && !lb) return 0
      if (!la) return 1
      if (!lb) return -1
      return lb - la
    })

    return list
  }, [contacts, search, filter, sortBy, now])

  const handleBulkDelete = () => {
    if (!selected.size) return
    deleteContacts([...selected])
    setSelected(new Set())
    setShowBulkMenu(false)
  }

  const handleBulkTag = (tag) => {
    if (!selected.size) return
    addTag([...selected], tag)
    setShowBulkMenu(false)
  }

  const handleStageChange = (contactId, newStage) => {
    updateContact(contactId, { stage: newStage })
  }

  const SORT_OPTIONS = SORT_KEYS.map(o => ({ key: o.key, label: t(o.tKey) }))
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-hig-title2">{t('contacts.title')}</h1>
        <button onClick={() => navigate('/contacts/new')} className="hig-btn-primary w-full justify-center gap-2 sm:w-auto">
          <Plus size={16} /> {t('contacts.addNew')}
        </button>
      </div>

      {/* Stats bar */}
      {!contactsLoading && !contactsError && (
        <StatsBar contacts={contacts} activeFilter={filter} onFilter={setFilter} />
      )}

      {/* Controls row */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary" />
          <input
            type="text"
            placeholder={t('contacts.searchPlaceholder')}
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setSearchParams(e.target.value ? { q: e.target.value } : {})
            }}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-hig-gray-4
                       text-hig-subhead outline-none focus:border-hig-blue focus:ring-2
                       focus:ring-hig-blue/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="relative">
              <button onClick={() => setShowBulkMenu(s => !s)} className="hig-btn-secondary gap-2 text-hig-caption1">
                <MoreHorizontal size={14} /> {selected.size} {t('contacts.selected')}
              </button>
              {showBulkMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 z-50">
                  <button onClick={() => handleBulkTag('Client')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                    <Tag size={13} /> {t('contacts.tagAsClient')}
                  </button>
                  <button onClick={() => handleBulkTag('Prospect')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                    <Tag size={13} /> {t('contacts.tagAsProspect')}
                  </button>
                  <hr className="my-1 border-hig-gray-5" />
                  <button onClick={handleBulkDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead text-hig-red hover:bg-red-50">
                    <Trash2 size={13} /> {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSort(s => !s)}
              className="hig-btn-secondary gap-1.5 text-hig-caption1 text-hig-text-secondary"
              style={{ height: 36 }}
            >
              <SortAsc size={14} />
              <span className="hidden sm:inline">{currentSortLabel}</span>
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 z-30 w-40">
                  {SORT_OPTIONS.map(o => (
                    <button
                      key={o.key}
                      onClick={() => { setSortBy(o.key); setShowSort(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-hig-subhead hover:bg-hig-gray-6 text-left"
                      style={{ fontWeight: sortBy === o.key ? 600 : 400, color: sortBy === o.key ? '#2E96FF' : undefined }}
                    >
                      {sortBy === o.key && <span style={{ color: '#2E96FF' }}>✓</span>}
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', borderRadius: 8, border: '1px solid #E5E5EA',
            overflow: 'hidden', height: 36,
          }}>
            {[
              { key: 'list',     Icon: LayoutList },
              { key: 'pipeline', Icon: Columns    },
            ].map(({ key, Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                style={{
                  padding: '0 10px', border: 'none', cursor: 'pointer',
                  background: viewMode === key ? '#2E96FF' : 'white',
                  color: viewMode === key ? 'white' : '#8E8E93',
                  transition: 'all 0.15s',
                }}
                title={key === 'list' ? 'List view' : 'Pipeline view'}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {contactsError ? (
        <div className="hig-card px-4 py-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle size={22} style={{ color: '#FF3B30' }} />
          <p className="text-hig-subhead font-medium" style={{ color: '#FF3B30' }}>{t('contacts.loadFailed')}</p>
          <p className="text-hig-caption1 text-hig-text-secondary">{contactsError}</p>
        </div>
      ) : contactsLoading ? (
        <div className="hig-card px-4 py-12 text-center text-hig-subhead text-hig-text-secondary">
          {t('contacts.loadingMsg')}
        </div>
      ) : viewMode === 'pipeline' ? (
        <PipelineView
          contacts={filtered}
          onNavigate={id => navigate(`/contacts/${id}`)}
          onStageChange={handleStageChange}
        />
      ) : (
        <div className="hig-card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid items-center px-4 py-2.5 bg-hig-gray-6 border-b border-hig-gray-5
                          text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide"
            style={{ gridTemplateColumns: '1fr 110px 90px 110px 90px 32px' }}>
            <span>{t('contacts.colContact')}</span>
            <span>{t('contacts.colStage')}</span>
            <span>{t('contacts.colLastActivity')}</span>
            <span>{t('contacts.colCoverage')}</span>
            <span>{t('contacts.colPlans')}</span>
            <span></span>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-hig-subhead text-hig-text-secondary">
                {search ? t('contacts.noMatch') : t('contacts.noContacts')}
              </p>
            </div>
          ) : (
            filtered.map(c => (
              <ContactRow
                key={c.id}
                contact={c}
                onClick={() => navigate(`/contacts/${c.id}`)}
              />
            ))
          )}
        </div>
      )}

    </div>
  )
}
