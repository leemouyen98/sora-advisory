/**
 * ContactsPage — Salesforce-inspired CRM list view
 *
 * Features:
 * · Stats bar: Total | Clients | Prospects | Overdue Reviews
 * · Filter chips: All / Clients / Prospects / Review Due / Stale
 * · Sort: Last Activity | Review Date | Name | Stage
 * · View toggle: List (table) | Pipeline (Kanban)
 * · Enhanced rows: stage pill, coverage dots, last-activity, overdue badge
 * · Add contact: full-page form at /contacts/new (AddContactPage) — name,
 *   dob, mobile, email, employment, stage, notes
 */

import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import { getAge, daysUntil } from '../lib/formatters'
import {
  Plus, Search, Trash2, Tag, MoreHorizontal,
  ChevronRight, Phone, AlertCircle,
  Target, Shield, CheckCircle2,
  LayoutList, Columns, AlertTriangle,
  SortAsc, Briefcase, UserCheck, Building2, Umbrella, GraduationCap, HelpCircle,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAGES = [
  { key: 'Lead',     label: 'Lead',     color: '#8E8E93', bg: '#F2F2F7' },
  { key: 'Prospect', label: 'Prospect', color: '#2E96FF', bg: '#EBF5FF' },
  { key: 'Proposal', label: 'Proposal', color: '#FF9500', bg: '#FFF8EC' },
  { key: 'Client',   label: 'Client',   color: '#34C759', bg: '#EDFAEF' },
  { key: 'Dormant',  label: 'Dormant',  color: '#FF3B30', bg: '#FFF1F0' },
]

// Shared by AddContactPage and EditContactPage — was previously defined
// verbatim in both files. Icon/color are language-independent; `label` is an
// English fallback for the one caller (EditContactPage) that doesn't wire up
// translations for this selector yet.
export const EMPLOYMENT_OPTIONS = [
  { key: 'Employed',       label: 'Employed',       Icon: Briefcase,     color: '#2E96FF' },
  { key: 'Self-Employed',  label: 'Self-Employed',  Icon: UserCheck,     color: '#34C759' },
  { key: 'Business Owner', label: 'Business Owner', Icon: Building2,     color: '#FF9500' },
  { key: 'Retired',        label: 'Retired',        Icon: Umbrella,      color: '#AF52DE' },
  { key: 'Student',        label: 'Student',        Icon: GraduationCap, color: '#30B0C7' },
  { key: 'Other',          label: 'Other',          Icon: HelpCircle,    color: '#8E8E93' },
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

// Real Malaysian mobile format: 01[0-9] prefix + 7-8 digit subscriber number
// (7 digits → 10 total, e.g. 012-3456789; 8 digits → 11 total, e.g. 011-12345678),
// optionally prefixed with a +60/60 country code. Input is stripped of spaces/
// dashes/parens before testing (see validateContactForm below).
const MOBILE_RE = /^(?:\+?60|0)1[0-9]\d{7,8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Shared Add/Edit contact validation. Previously Add only required name+dob
 * (no format checks), while Edit additionally validated mobile/email format
 * — so a contact could be created with garbage contact info and only get
 * flagged the first time someone edited it. Returns error CODES, not
 * translated strings, so each caller (Add uses t(), Edit doesn't yet) maps
 * them to its own message.
 */
export function validateContactForm(form, age) {
  const errs = {}
  if (!form.name.trim()) errs.name = 'required'
  if (!form.dob) errs.dob = 'required'
  // age === null is calcAge()'s own signal for "empty or out of 0-129 range" —
  // deliberately NOT re-adding Add's old age>100 cap here. An advisor's book
  // can legitimately include clients past 100 (or family members added for
  // estate/legacy planning); a hard cutoff would block editing THEIR EXISTING
  // record forever, not just prevent creating a new one. Under this rule the
  // one behavior change is Add becoming slightly more permissive (up to 129
  // instead of 100) — not Edit becoming more restrictive.
  else if (age === null) errs.dob = 'invalid'
  if (form.mobile && !MOBILE_RE.test(form.mobile.replace(/[\s\-()]/g, ''))) errs.mobile = 'invalid'
  if (form.email && !EMAIL_RE.test(form.email)) errs.email = 'invalid'
  return errs
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

// Thin alias — real implementation (timezone-safe local-date parsing) lives
// in lib/formatters.js, shared with ContactDetailPage's equivalent daysUntilDate().
const daysUntilReview = daysUntil

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
function ContactRow({ contact, onClick, selected, onToggleSelect }) {
  const { t } = useLanguage()
  const stage       = getEffectiveStage(contact)
  const lastAct     = getLastActivity(contact)
  const age         = getAge(contact.dob)
  const pendingTasks = (contact.tasks || []).filter(task => task.status !== 'completed').length
  const isSelected  = selected?.has(contact.id)

  return (
    <div
      onClick={onClick}
      className="border-b border-hig-gray-5 last:border-b-0 hover:bg-hig-gray-6/50 transition-colors cursor-pointer"
      style={isSelected ? { background: 'rgba(46,150,255,0.06)' } : undefined}
    >
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={!!isSelected}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleSelect?.(contact.id)}
          className="shrink-0"
          style={{ width: 16, height: 16 }}
        />
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
        style={{ gridTemplateColumns: '28px 1fr 110px 90px 110px 90px 32px' }}>
        {/* Select */}
        <input
          type="checkbox"
          checked={!!isSelected}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleSelect?.(contact.id)}
          style={{ width: 16, height: 16 }}
        />
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
function KanbanCard({ contact, onNavigate, onStageChange, selected, onToggleSelect }) {
  const { t } = useLanguage()
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const stage    = getEffectiveStage(contact)
  const lastAct  = getLastActivity(contact)
  const age      = getAge(contact.dob)
  const reviewD  = daysUntilReview(contact.reviewDate)
  const isOverdue = reviewD !== null && reviewD < 0
  const isSelected = selected?.has(contact.id)

  const nextStages = STAGES.filter(s => s.key !== stage && s.key !== 'Dormant')

  return (
    <div
      className="hig-card"
      style={{
        padding: '10px 12px', cursor: 'pointer', marginBottom: 8, position: 'relative',
        ...(isSelected ? { outline: '2px solid #2E96FF', outlineOffset: -1 } : {}),
      }}
    >
      <div onClick={onNavigate}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!isSelected}
            onClick={e => e.stopPropagation()}
            onChange={() => onToggleSelect?.(contact.id)}
            style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}
          />
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
function PipelineView({ contacts, onNavigate, onStageChange, selected, onToggleSelect }) {
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
                  selected={selected}
                  onToggleSelect={onToggleSelect}
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

// ─── Confirm Bulk Delete Modal ─────────────────────────────────────────────────
// Single-contact delete (EditContactPage.jsx) already confirms before deleting;
// bulk delete previously didn't — one click hard-deleted N contacts, no undo.
function ConfirmBulkDeleteModal({ count, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-sm p-6">
        <div className="flex gap-3 items-start mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-hig-red" />
          </div>
          <div>
            <h3 className="text-hig-callout font-bold text-hig-text mb-1">Delete {count} contact{count === 1 ? '' : 's'}?</h3>
            <p className="text-hig-footnote text-hig-text-secondary leading-relaxed">
              This will permanently delete {count === 1 ? 'this contact' : `these ${count} contacts`} and all associated data — financials, timeline, and plans. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="hig-btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className="hig-btn-primary bg-hig-red hover:bg-red-600"
          >
            Delete {count === 1 ? 'Contact' : `${count} Contacts`}
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

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

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkDelete = () => {
    if (!selected.size) return
    setShowBulkMenu(false)
    setConfirmBulkDelete(true)
  }

  const confirmBulkDeleteNow = () => {
    deleteContacts([...selected])
    setSelected(new Set())
    setConfirmBulkDelete(false)
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
          selected={selected}
          onToggleSelect={toggleSelect}
        />
      ) : (
        <div className="hig-card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid items-center px-4 py-2.5 bg-hig-gray-6 border-b border-hig-gray-5
                          text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide"
            style={{ gridTemplateColumns: '28px 1fr 110px 90px 110px 90px 32px' }}>
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(c => selected.has(c.id))}
              onChange={() => {
                const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
                setSelected(allSelected ? new Set() : new Set(filtered.map(c => c.id)))
              }}
              style={{ width: 16, height: 16 }}
            />
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
                selected={selected}
                onToggleSelect={toggleSelect}
                onClick={() => navigate(`/contacts/${c.id}`)}
              />
            ))
          )}
        </div>
      )}

      {confirmBulkDelete && (
        <ConfirmBulkDeleteModal
          count={selected.size}
          onConfirm={confirmBulkDeleteNow}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

    </div>
  )
}
