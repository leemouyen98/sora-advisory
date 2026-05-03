/**
 * ContactDetailPage — Account 360 view
 *
 * · Redesigned hero card with gradient banner, stats strip
 * · Date-grouped timeline (Today / Yesterday / This Week / Earlier)
 * · Edit button navigates to /contacts/:id/edit (full-page form)
 * · Quick Action Bar, Coverage Snapshot, Planning Snapshot preserved
 * · All existing functionality preserved
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import FinancesTab from '../components/finances/FinancesTab'
import CashFlowTab from '../components/finances/CashFlowTab'
import PlanningSnapshot from '../components/PlanningSnapshot'
import { STAGES, getEffectiveStage } from './ContactsPage'
import DatePicker from '../components/ui/DatePicker'
import {
  ArrowLeft, Phone, Calendar, Briefcase, Target, Shield,
  Plus, Check, FileText, PhoneCall, Users, MessageSquare, Clock,
  Pencil, CheckCircle2, X, Tag, TrendingUp, ArrowRight, ChevronDown,
  DollarSign, BarChart2, MoreVertical, Trash2, RotateCcw, AlertTriangle,
  Zap, Activity, Heart, Mail, ChevronRight, Lightbulb, Bell,
  Filter as FilterIcon, MessageCircle, Gift, ExternalLink,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

const ACTIVITY_TYPE_CFG = {
  Call:    { Icon: PhoneCall,    color: '#2E96FF',  bg: '#EBF5FF'  },
  Meeting: { Icon: Users,        color: '#34C759',  bg: '#EDFAEF'  },
  Email:   { Icon: Mail,         color: '#AF52DE',  bg: '#F5EEFF'  },
}

const POLICY_CATEGORIES = {
  life:    { label: 'Life',    color: '#1C1C1E', bg: '#F2F2F7',  keywords: ['whole life','term','life','endowment','investment-linked'] },
  medical: { label: 'Medical', color: '#FF3B30', bg: '#FFF1F0',  keywords: ['medical','health'] },
  ci:      { label: 'CI',      color: '#FF9500', bg: '#FFF8EC',  keywords: ['critical'] },
  pa:      { label: 'PA',      color: '#AF52DE', bg: '#F5EEFF',  keywords: ['personal accident','personal'] },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRM(val) {
  if (val === undefined || val === null) return '—'
  const abs = Math.abs(val)
  const str = abs >= 1_000_000
    ? `RM ${(abs / 1_000_000).toFixed(1)}M`
    : `RM ${abs.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return val < 0 ? `−${str}` : str
}

function toMonthlyCF(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1/12, Quarterly: 1/3, 'Semi-annually': 1/6, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function getAge(dob) {
  const d = new Date(dob)
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() ||
     (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
  return a
}

function daysUntilDate(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  target.setHours(0,0,0,0)
  const now = new Date()
  now.setHours(0,0,0,0)
  return Math.round((target - now) / 86400000)
}

function getCoverageStatus(contact) {
  const policies = contact.financials?.insurance || []
  const active = policies.filter(p => !p.status || p.status === 'Active')
  const types  = active.map(p => (p.type || '').toLowerCase())
  return {
    life:    types.some(t => POLICY_CATEGORIES.life.keywords.some(k => t.includes(k.split(' ')[0]))),
    medical: types.some(t => POLICY_CATEGORIES.medical.keywords.some(k => t.includes(k))),
    ci:      types.some(t => POLICY_CATEGORIES.ci.keywords.some(k => t.includes(k))),
    pa:      types.some(t => POLICY_CATEGORIES.pa.keywords.some(k => t.includes(k.split(' ')[0]))),
  }
}

// Compute annual premium equivalents across all active policies
function getAPE(contact) {
  const policies = (contact.financials?.insurance || []).filter(p => !p.status || p.status === 'Active')
  return policies.reduce((sum, p) => {
    const amt = Number(p.annualPremium || p.premium || 0)
    const monthly = p.premiumFrequency === 'Monthly'
    return sum + (monthly ? amt * 12 : amt)
  }, 0)
}

// Days until next birthday (0 = today, negative = already passed this year)
function daysUntilBirthday(dob) {
  if (!dob) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const bd = new Date(dob)
  const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.round((next - today) / 86400000)
}

// Merge all timeline items into one sorted array
function buildTimeline(contact) {
  const items = []
  ;(contact.interactions || []).forEach(i =>
    items.push({ ...i, _kind: 'note', _sortDate: i.date || '0' })
  )
  ;(contact.activities || []).forEach(a =>
    items.push({ ...a, _kind: 'activity', _sortDate: a.date || '0' })
  )
  ;(contact.tasks || []).forEach(t =>
    items.push({ ...t, _kind: 'task', _sortDate: t.dueDate || t.date || '0' })
  )
  return items.sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate))
}

// Group timeline items by date bucket
function groupTimeline(items) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthAgo  = new Date(now); monthAgo.setDate(now.getDate() - 30)

  const buckets = [
    { key: 'today',     label: 'Today',      items: [] },
    { key: 'yesterday', label: 'Yesterday',  items: [] },
    { key: 'week',      label: 'This Week',  items: [] },
    { key: 'month',     label: 'This Month', items: [] },
    { key: 'older',     label: 'Earlier',    items: [] },
  ]

  items.forEach(item => {
    const d = new Date(item._sortDate)
    d.setHours(0, 0, 0, 0)
    if (d >= now)         buckets[0].items.push(item)
    else if (d >= yesterday) buckets[1].items.push(item)
    else if (d >= weekAgo)   buckets[2].items.push(item)
    else if (d >= monthAgo)  buckets[3].items.push(item)
    else                     buckets[4].items.push(item)
  })

  return buckets.filter(b => b.items.length > 0)
}

// Derive a deterministic hue from contact name for the avatar gradient
function nameHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

// Next-action suggestion engine — returns up to 3 ranked suggestions
function getNextActions(contact) {
  const stage = getEffectiveStage(contact)
  const lastItems = [
    ...(contact.activities    || []).map(a => new Date(a.date)),
    ...(contact.interactions  || []).map(i => new Date(i.date)),
  ].filter(d => !isNaN(d))
  const hasActivity    = lastItems.length > 0
  const daysSinceLast  = hasActivity
    ? Math.floor((Date.now() - Math.max(...lastItems)) / 86400000)
    : null
  const reviewDays     = daysUntilDate(contact.reviewDate)
  const cov            = getCoverageStatus(contact)
  const bdDays         = daysUntilBirthday(contact.dob)
  const suggestions    = []

  // Birthday within 7 days
  if (bdDays !== null && bdDays <= 7) {
    suggestions.push({ icon: Gift, color: '#AF52DE', text: bdDays === 0 ? `It's ${contact.name.split(' ')[0]}'s birthday today — send a message` : `Birthday in ${bdDays} day${bdDays===1?'':'s'} — great excuse to reach out` })
  }
  // Review overdue/due
  if (reviewDays !== null && reviewDays <= 0) {
    suggestions.push({ icon: Bell, color: '#FF3B30', text: `Annual review ${Math.abs(reviewDays)}d overdue — schedule now` })
  } else if (reviewDays !== null && reviewDays <= 14) {
    suggestions.push({ icon: Bell, color: '#FF9500', text: `Review in ${reviewDays}d — prep agenda` })
  }
  // Stage-specific
  if (stage === 'Proposal' && (!hasActivity || daysSinceLast > 3)) {
    suggestions.push({ icon: PhoneCall, color: '#2E96FF', text: 'Proposal sent — follow up, handle objections' })
  }
  if (stage === 'Prospect' && hasActivity && daysSinceLast > 14) {
    suggestions.push({ icon: Lightbulb, color: '#FF9500', text: `${daysSinceLast}d since last touch — time to send proposal?` })
  }
  if (stage === 'Lead' && (!hasActivity || daysSinceLast > 7)) {
    suggestions.push({ icon: PhoneCall, color: '#2E96FF', text: 'New lead — log a needs-analysis call' })
  }
  // Coverage gaps
  const gaps = Object.entries(cov).filter(([, v]) => !v).map(([k]) => POLICY_CATEGORIES[k].label)
  if (gaps.length > 0 && (stage === 'Client' || stage === 'Active')) {
    suggestions.push({ icon: Shield, color: '#FF3B30', text: `Coverage gap: ${gaps.join(', ')} not covered` })
  }
  // Dormant
  if (hasActivity && daysSinceLast > 90) {
    suggestions.push({ icon: AlertTriangle, color: '#FF3B30', text: `No contact in ${daysSinceLast}d — at risk of going dormant` })
  }
  // No activity at all (new contact)
  if (!hasActivity && stage !== 'Client' && stage !== 'Active') {
    suggestions.push({ icon: PhoneCall, color: '#2E96FF', text: 'No activity logged yet — log your first touchpoint' })
  }

  return suggestions.slice(0, 3)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Stage selector (shown in sidebar)
function StageSelector({ stage, onChange }) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const s = STAGE_MAP[stage] || STAGE_MAP.Lead

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(o => !o)
  }

  return (
    <div>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 20,
          background: s.bg, border: `1.5px solid ${s.color}30`,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.label}</span>
        <ChevronDown size={12} style={{ color: s.color, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', top: dropPos.top, left: dropPos.left,
            background: 'white', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #F2F2F7', zIndex: 51, overflow: 'hidden',
            minWidth: 140,
          }}>
            {STAGES.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3.5 py-2 border-none bg-transparent
                           cursor-pointer text-left transition-colors hover:bg-gray-50"
                style={{ fontWeight: opt.key === stage ? 600 : 400 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: opt.key === stage ? opt.color : '#1C1C1E' }}>{opt.label}</span>
                {opt.key === stage && <CheckCircle2 size={13} style={{ color: opt.color, marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Coverage — gap-aware, shows policy names when covered
function CoverageSection({ contact, onNavigate }) {
  const cov      = getCoverageStatus(contact)
  const policies = (contact.financials?.insurance || []).filter(p => !p.status || p.status === 'Active')

  const getPolicyName = (key) => {
    const cat = POLICY_CATEGORIES[key]
    const found = policies.find(p => {
      const t = (p.type || '').toLowerCase()
      return cat.keywords.some(k => t.includes(k.split(' ')[0]))
    })
    return found?.name || found?.insurer || null
  }

  const items = Object.entries(POLICY_CATEGORIES).map(([key, cfg]) => ({
    key, ...cfg, covered: cov[key], policyName: getPolicyName(key),
  }))
  const coveredCount = items.filter(i => i.covered).length
  const pct = (coveredCount / 4) * 100

  return (
    <div>
      {/* Header + bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8E8E93' }}>
          Coverage
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: coveredCount === 4 ? '#34C759' : coveredCount >= 2 ? '#FF9500' : '#FF3B30',
        }}>
          {coveredCount}/4
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 4, background: '#F2F2F7', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          background: coveredCount === 4 ? '#34C759' : coveredCount >= 2 ? '#FF9500' : '#FF3B30',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Gap rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate?.('insurance')}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 9,
              background: item.covered ? item.bg : '#FAFAFA',
              border: `1px solid ${item.covered ? item.color + '25' : '#EBEBEB'}`,
              cursor: 'pointer', transition: 'opacity 0.15s', textAlign: 'left', width: '100%',
            }}
            className="hover:opacity-80"
          >
            {/* Status dot */}
            <span style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: item.covered ? `${item.color}18` : '#F2F2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800,
              color: item.covered ? item.color : '#C7C7CC',
            }}>
              {item.covered ? '✓' : '!'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: item.covered ? item.color : '#8E8E93', lineHeight: 1 }}>
                {item.label}
              </p>
              {item.covered && item.policyName && (
                <p style={{ fontSize: 10, color: '#8E8E93', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.policyName}
                </p>
              )}
              {!item.covered && (
                <p style={{ fontSize: 10, color: '#FF3B30', marginTop: 1 }}>
                  Not covered — tap to add
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Review countdown widget
function ReviewCountdown({ reviewDate }) {
  if (!reviewDate) return null
  const days = daysUntilDate(reviewDate)
  const overdue = days < 0
  const soon    = days >= 0 && days <= 14

  const color = overdue ? '#FF3B30' : soon ? '#FF9500' : '#34C759'
  const bg    = overdue ? '#FFF1F0' : soon ? '#FFF8EC' : '#EDFAEF'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px', borderRadius: 8, background: bg, border: `1px solid ${color}20`,
    }}>
      <Clock size={13} style={{ color, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.2 }}>
          {overdue
            ? `Review ${Math.abs(days)}d overdue`
            : days === 0
            ? 'Review today'
            : `Review in ${days}d`}
        </p>
        <p style={{ fontSize: 10, color: '#8E8E93', marginTop: 1 }}>
          {fmtDate(reviewDate)}
        </p>
      </div>
    </div>
  )
}

// Smart suggestions panel — shows up to 3 ranked next actions
function SmartSuggestions({ contact }) {
  const actions = getNextActions(contact)
  if (actions.length === 0) return null

  return (
    <div className="bg-hig-card rounded-hig border border-hig-gray-5 shadow-hig mb-4 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-hig-gray-5 bg-hig-gray-6">
        <Zap size={12} className="text-hig-orange" />
        <span className="text-hig-caption1 font-bold uppercase tracking-wider text-hig-text-secondary">
          Suggested Actions
        </span>
      </div>
      {actions.map(({ icon: Icon, color, text }, i) => (
        <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i > 0 ? 'border-t border-hig-gray-6' : ''}`}>
          <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: `${color}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} style={{ color }} />
          </div>
          <p style={{ fontSize: 13, color: '#1C1C1E', flex: 1, lineHeight: 1.4 }}>{text}</p>
        </div>
      ))}
    </div>
  )
}

// Quick Action Bar
function QuickActionBar({ activeAction, onSelect }) {
  const actions = [
    { key: 'call',    label: 'Log Call',    Icon: PhoneCall,    color: '#2E96FF' },
    { key: 'meeting', label: 'Log Meeting', Icon: Users,        color: '#34C759' },
    { key: 'note',    label: 'Add Note',    Icon: FileText,     color: '#8E8E93' },
    { key: 'task',    label: 'Add Task',    Icon: Check,        color: '#FF9500' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {actions.map(({ key, label, Icon, color }) => {
        const isActive = activeAction === key
        return (
          <button
            key={key}
            onClick={() => onSelect(isActive ? null : key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 20,
              border: isActive ? `1.5px solid ${color}` : '1.5px solid #E5E5EA',
              background: isActive ? `${color}12` : 'white',
              cursor: 'pointer', transition: 'all 0.15s',
              fontSize: 13, fontWeight: 500,
              color: isActive ? color : '#1C1C1E',
            }}
          >
            <Icon size={13} style={{ color: isActive ? color : '#8E8E93' }} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

// Inline compose form
function ComposeForm({ actionKey, contactId, onSubmit, onCancel, addInteraction, addTask, addActivity }) {
  const [text, setText]       = useState('')
  const [actType, setActType] = useState(actionKey === 'meeting' ? 'Meeting' : 'Call')
  const [taskTitle, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (actionKey === 'note') {
      if (!text.trim()) return
      addInteraction(contactId, { type: 'note', content: text.trim() })
    } else if (actionKey === 'task') {
      if (!taskTitle.trim()) return
      addTask(contactId, { title: taskTitle.trim(), dueDate })
    } else {
      // call or meeting
      if (!text.trim()) return
      addActivity(contactId, { type: actType, description: text.trim() })
    }
    onSubmit()
  }

  const color = actionKey === 'call' ? '#2E96FF' : actionKey === 'meeting' ? '#34C759' : actionKey === 'task' ? '#FF9500' : '#8E8E93'

  return (
    <div style={{
      background: `${color}08`, border: `1.5px solid ${color}30`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 16,
    }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actionKey === 'task' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              autoFocus
              value={taskTitle}
              onChange={e => setTitle(e.target.value)}
              className="hig-input"
              style={{ flex: '1 1 200px' }}
              placeholder="Task title..."
            />
            <div style={{ width: 180, flexShrink: 0 }}>
              <DatePicker
                value={dueDate}
                onChange={v => setDueDate(v)}
                placeholder="Due date"
              />
            </div>
          </div>
        ) : (
          <>
            {(actionKey === 'call' || actionKey === 'meeting') && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                {['Call', 'Meeting', 'Email'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActType(t)}
                    style={{
                      padding: '3px 10px', borderRadius: 20, border: `1.5px solid ${actType === t ? color : '#E5E5EA'}`,
                      background: actType === t ? `${color}12` : 'white',
                      fontSize: 12, fontWeight: 500,
                      color: actType === t ? color : '#8E8E93',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              className="hig-input"
              style={{ minHeight: 72, resize: 'vertical' }}
              placeholder={actionKey === 'note' ? 'Add a note...' : `What happened in this ${actType.toLowerCase()}?`}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="hig-btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
            Cancel
          </button>
          <button type="submit" className="hig-btn-primary" style={{ padding: '6px 14px', fontSize: 13, background: color, border: `1px solid ${color}` }}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

// Single timeline item
function TimelineItem({ item, contactId, onToggleTask }) {
  if (item._kind === 'task') {
    const done = item.status === 'completed'
    return (
      <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid #F2F2F7' }}>
        <button
          onClick={() => onToggleTask(contactId, item.id)}
          style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${done ? '#34C759' : '#C7C7CC'}`,
            background: done ? '#34C759' : 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: 1, transition: 'all 0.15s',
          }}
        >
          {done && <Check size={11} style={{ color: 'white' }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 500,
            color: done ? '#8E8E93' : '#1C1C1E',
            textDecoration: done ? 'line-through' : 'none',
          }}>
            {item.title}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {item.dueDate && (
              <span style={{
                fontSize: 11, color: (() => {
                  if (done) return '#8E8E93'
                  const d = daysUntilDate(item.dueDate)
                  if (d < 0) return '#FF3B30'
                  if (d <= 3) return '#FF9500'
                  return '#8E8E93'
                })(),
              }}>
                Due {fmtDate(item.dueDate)}
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
              color: done ? '#34C759' : '#FF9500',
            }}>
              Task
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (item._kind === 'activity') {
    const cfg = ACTIVITY_TYPE_CFG[item.type] || ACTIVITY_TYPE_CFG.Call
    const Icon = cfg.Icon
    return (
      <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid #F2F2F7' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} style={{ color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#1C1C1E', lineHeight: 1.4 }}>{item.description}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#8E8E93' }}>{fmtDate(item.date)}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
              color: cfg.color, background: cfg.bg, padding: '1px 6px', borderRadius: 10,
            }}>
              {item.type}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // note
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid #F2F2F7' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: '#F2F2F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <FileText size={13} style={{ color: '#8E8E93' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: '#1C1C1E', lineHeight: 1.5 }}>{item.content}</p>
        <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{fmtDate(item.date)}</p>
      </div>
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, danger, onConfirm, onCancel }) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle size={16} className={danger ? 'text-red-500' : 'text-amber-500'} />
          </div>
          <div>
            <h2 className="text-hig-title3 font-semibold mb-1">{title}</h2>
            <p className="text-hig-subhead text-hig-text-secondary leading-snug">{body}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="hig-btn-secondary">{t('common.cancel')}</button>
          <button onClick={onConfirm} className={danger ? 'hig-btn-primary bg-red-500 hover:bg-red-600 border-red-500' : 'hig-btn-primary'}>
            {danger ? t('dialog.deleteBtn') : t('dialog.resetBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const {
    contacts, addInteraction, addTask, toggleTask, addActivity,
    updateContact, deleteContacts, saveFinancials, addTag, removeTag,
  } = useContacts()

  const contact = contacts.find(c => c.id === id)

  const [tab,           setTab]           = useState('timeline')
  const [activeAction,  setActiveAction]  = useState(null) // 'call'|'meeting'|'note'|'task'|null
  const [tlFilter,      setTlFilter]      = useState('all') // timeline filter
  const [showCashFlow,  setShowCashFlow]  = useState(false)
  const [showCFPrompt,  setShowCFPrompt]  = useState(false)
  const [showStartPlanning, setShowStartPlanning] = useState(false)
  const [showOptionsMenu,   setShowOptionsMenu]   = useState(false)
  const [confirmAction,     setConfirmAction]      = useState(null)
  const [autoOpenFinancialEdit, setAutoOpenFinancialEdit] = useState(false)

  const hasFinancialData = useMemo(() => {
    const fin = contact?.financials
    if (!fin) return false
    const hasIncome   = Array.isArray(fin.income)   && fin.income.some(r => Number(r.amount) > 0)
    const hasExpenses = Array.isArray(fin.expenses)  && fin.expenses.length > 0
    return hasIncome || hasExpenses
  }, [contact?.financials])

  const sidebarFinancial = useMemo(() => {
    const fin = contact?.financials
    if (!fin) return null
    const assets       = Array.isArray(fin.assets)      ? fin.assets      : []
    const investments  = Array.isArray(fin.investments) ? fin.investments  : []
    const liabilities  = Array.isArray(fin.liabilities) ? fin.liabilities  : []
    const income       = Array.isArray(fin.income)      ? fin.income       : []
    const expenses     = Array.isArray(fin.expenses)    ? fin.expenses     : []
    const totalAssets  = assets.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalInv     = investments.reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
    const totalLiab    = liabilities.reduce((s, r) => s + (Number(r.principal) || 0), 0)
    const monthlyIncome   = income.reduce((s, r) => s + toMonthlyCF(r.amount, r.frequency), 0)
    const monthlyExpenses = expenses.reduce((s, r) => s + toMonthlyCF(r.amount, r.frequency), 0)
    const monthlyLoanRepayments = liabilities.reduce((s, l) => {
      const P = Number(l.principal) || 0
      const r = (Number(l.interestRate) || 0) / 100 / 12
      const n = Number(l.loanPeriod) || 1
      if (P === 0) return s
      const pmt = r === 0 ? P / n : P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1)
      return s + pmt
    }, 0)
    const netWorth        = totalAssets + totalInv - totalLiab
    const monthlyCashFlow = monthlyIncome - monthlyExpenses - monthlyLoanRepayments
    const hasData         = monthlyIncome > 0 || monthlyExpenses > 0 || totalAssets > 0 || totalInv > 0
    return { netWorth, monthlyCashFlow, monthlyIncome, monthlyExpenses, hasData }
  }, [contact?.financials])

  // Build unified timeline
  const timeline = useMemo(() => {
    if (!contact) return []
    const all = buildTimeline(contact)
    if (tlFilter === 'all') return all
    if (tlFilter === 'notes')      return all.filter(i => i._kind === 'note')
    if (tlFilter === 'activities') return all.filter(i => i._kind === 'activity')
    if (tlFilter === 'tasks')      return all.filter(i => i._kind === 'task')
    return all
  }, [contact, tlFilter])

  const pendingTasks = useMemo(() =>
    (contact?.tasks || []).filter(t => t.status !== 'completed').length
  , [contact?.tasks])

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-hig-subhead text-hig-text-secondary">Contact not found.</p>
      </div>
    )
  }

  const age   = getAge(contact.dob)
  const stage = getEffectiveStage(contact)

  const launchCashFlow = () => {
    setShowStartPlanning(false)
    if (!hasFinancialData) setShowCFPrompt(true)
    else setShowCashFlow(true)
  }

  const askConfirm = action => { setShowOptionsMenu(false); setConfirmAction(action) }

  const confirmDelete = () => askConfirm({
    title: t('contactDetail.deleteContact'),
    body: t('contactDetail.deleteConfirm'),
    danger: true,
    onConfirm: () => { deleteContacts([id]); navigate('/contacts') },
  })

  const confirmResetRetirement = () => askConfirm({
    title: t('contactDetail.resetRetirement'),
    body: t('contactDetail.resetRetirementDesc'),
    danger: false,
    onConfirm: () => updateContact(id, { retirementPlan: null, retirementAge: 55 }),
  })

  const confirmResetInsurance = () => askConfirm({
    title: t('contactDetail.resetInsurance'),
    body: t('contactDetail.resetInsuranceDesc'),
    danger: false,
    onConfirm: () => {
      updateContact(id, { protectionPlan: null })
      if (contact.financials) saveFinancials(id, { ...contact.financials, insurance: [] })
    },
  })

  const confirmResetCashFlow = () => askConfirm({
    title: t('contactDetail.resetCashFlow'),
    body: t('contactDetail.resetCashFlowDesc'),
    danger: false,
    onConfirm: () => { saveFinancials(id, null); setShowCashFlow(false) },
  })

  // ── Cash Flow full-screen view ────────────────────────────────────────────
  if (showCashFlow) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setShowCashFlow(false)} className="hig-btn-ghost gap-1.5 -ml-3">
            <ArrowLeft size={16} /> {contact.name}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp size={17} className="text-hig-blue" />
            <span className="text-hig-headline font-semibold">{t('cashflow.title')}</span>
            <span className="text-hig-caption2 font-semibold px-2 py-0.5 rounded-full bg-hig-blue/10 text-hig-blue leading-none">
              {t('cashflow.fullSuite')}
            </span>
          </div>
          <div className="hidden w-32 sm:block" />
        </div>
        <CashFlowTab
          financials={contact.financials}
          contact={contact}
          onSaveFinancials={data => saveFinancials(id, data)}
          onDone={() => setShowCashFlow(false)}
        />
      </div>
    )
  }

  // ── Derived values for hero ────────────────────────────────────────────────
  const hue      = nameHue(contact.name)
  const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const ape      = getAPE(contact)
  const bdDays   = daysUntilBirthday(contact.dob)
  const activePolicies = (contact.financials?.insurance || []).filter(p => !p.status || p.status === 'Active')
  const covCount = Object.values(getCoverageStatus(contact)).filter(Boolean).length
  const allActivityDates = [
    ...(contact.activities   || []).map(a => new Date(a.date)),
    ...(contact.interactions || []).map(i => new Date(i.date)),
  ].filter(d => !isNaN(d))
  const lastSeenDays = allActivityDates.length
    ? Math.floor((Date.now() - Math.max(...allActivityDates)) / 86400000)
    : null
  const openTasksCount = (contact.tasks || []).filter(t => t.status !== 'completed').length

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title} body={confirmAction.body} danger={confirmAction.danger}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* ── Full-width Hero Bar ───────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16, overflow: 'hidden', marginBottom: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
      }}>
        {/* ── Gradient banner — contains identity + nav ─────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, hsl(${hue},68%,44%) 0%, hsl(${(hue+50)%360},62%,56%) 100%)`,
          padding: '14px 16px 16px',
          position: 'relative',
        }}>
          {/* Row 1: back button + top-right actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button
              onClick={() => navigate('/contacts')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              className="hover:!bg-black/30"
            >
              <ArrowLeft size={12} /> Contacts
            </button>

            {/* Top-right actions */}
            <div style={{ display: 'flex', gap: 6 }}>
            {/* Start Planning dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStartPlanning(s => !s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  background: 'white', border: 'none',
                  color: '#1C1C1E', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                }}
              >
                <Target size={12} style={{ color: '#2E96FF' }} />
                Plan
                <ChevronDown size={11} style={{ transition: 'transform 0.15s', transform: showStartPlanning ? 'rotate(180deg)' : 'none' }} />
              </button>
              {showStartPlanning && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowStartPlanning(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6,
                    background: 'white', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #F2F2F7',
                    zIndex: 30, overflow: 'hidden', minWidth: 210,
                  }}>
                    {isAdmin && (
                      <>
                        <button onClick={launchCashFlow}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent cursor-pointer text-left hover:bg-gray-50 transition-colors">
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <TrendingUp size={13} style={{ color: '#2E96FF' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', lineHeight: 1 }}>{t('contactDetail.cashFlowPlanner')}</p>
                            <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{t('cashflow.fullSuite')}</p>
                          </div>
                          {hasFinancialData && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#34C759', fontWeight: 600 }}>Ready</span>}
                        </button>
                        <div style={{ height: 1, background: '#F2F2F7' }} />
                      </>
                    )}
                    <button onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/retirement`) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent cursor-pointer text-left hover:bg-gray-50 transition-colors">
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Target size={13} style={{ color: '#2E96FF' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', lineHeight: 1 }}>{t('contactDetail.retirementPlanner')}</p>
                      </div>
                      {contact.retirementPlan && <CheckCircle2 size={13} style={{ color: '#34C759', marginLeft: 'auto' }} />}
                    </button>
                    <button onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/protection`) }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-none bg-transparent cursor-pointer text-left hover:bg-gray-50 transition-colors">
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EDFAEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Shield size={13} style={{ color: '#34C759' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', lineHeight: 1 }}>{t('contactDetail.insurancePlanner')}</p>
                      </div>
                      {contact.protectionPlan && <CheckCircle2 size={13} style={{ color: '#34C759', marginLeft: 'auto' }} />}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ⋮ Options */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowOptionsMenu(s => !s)}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.15s',
                }}
                className="hover:!bg-white/35"
              >
                <MoreVertical size={14} style={{ color: 'white' }} />
              </button>
              {showOptionsMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowOptionsMenu(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6,
                    background: 'white', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #F2F2F7',
                    zIndex: 30, overflow: 'hidden', minWidth: 220,
                  }}>
                    <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8E8E93' }}>
                      Reset Planner
                    </div>
                    {[
                      ...(isAdmin ? [{ label: t('contactDetail.cashFlowPlanner'), onClick: confirmResetCashFlow }] : []),
                      { label: t('contactDetail.retirementPlanner'), onClick: confirmResetRetirement },
                      { label: t('contactDetail.insurancePlanner'), onClick: confirmResetInsurance },
                    ].map(({ label, onClick }) => (
                      <button key={label} onClick={onClick}
                        className="w-full flex items-center gap-2 px-3.5 py-2 border-none bg-transparent cursor-pointer text-left text-hig-footnote hover:bg-gray-50 transition-colors">
                        <RotateCcw size={13} style={{ color: '#8E8E93' }} />
                        {label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: '#F2F2F7', margin: '4px 0' }} />
                    <button onClick={confirmDelete}
                      className="w-full flex items-center gap-2 px-3.5 py-2 border-none bg-transparent cursor-pointer text-left text-hig-footnote text-hig-red hover:bg-red-50 transition-colors">
                      <Trash2 size={13} className="text-hig-red" />
                      {t('contactDetail.deleteContact')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>

          {/* ── Row 2: identity — avatar + name inside gradient ─────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.22)',
              border: '2px solid rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'white',
              letterSpacing: '-0.02em',
            }}>
              {initials}
            </div>

            {/* Name + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 20, fontWeight: 800, color: 'white',
                  letterSpacing: '-0.02em', lineHeight: 1.1,
                  textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}>
                  {contact.name}
                </h1>
                {bdDays !== null && bdDays <= 7 && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: 'rgba(255,255,255,0.25)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}>
                    <Gift size={10} />
                    {bdDays === 0 ? 'Birthday today!' : `Birthday in ${bdDays}d`}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 }}>
                Age {age}{contact.employment ? ` · ${contact.employment}` : ''}
                {contact.reviewFrequency ? ` · ${contact.reviewFrequency} review` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── White content area — stats, actions, tags ──────────────────── */}
        <div style={{ background: 'white', padding: '14px 16px 14px' }}>

          {/* Stats strip */}
          <div style={{
            display: 'flex', gap: 1, background: '#F0F0F5', borderRadius: 10, overflow: 'hidden',
            marginBottom: 12,
          }}>
            {[
              {
                label: 'APE',
                value: ape > 0 ? fmtRM(ape) : 'No policies',
                color: ape > 0 ? '#1C1C1E' : '#8E8E93',
                small: ape === 0,
              },
              {
                label: 'Policies',
                value: activePolicies.length > 0 ? activePolicies.length : '—',
                color: activePolicies.length > 0 ? '#2E96FF' : '#8E8E93',
              },
              {
                label: 'Coverage',
                value: `${covCount}/4`,
                color: covCount===4?'#34C759':covCount>=2?'#FF9500':'#FF3B30',
              },
              lastSeenDays !== null
                ? { label: 'Last contact', value: lastSeenDays===0?'Today':`${lastSeenDays}d ago`, color: lastSeenDays>60?'#FF3B30':lastSeenDays>14?'#FF9500':'#34C759' }
                : { label: 'Last contact', value: 'Never', color: '#8E8E93' },
              ...(openTasksCount > 0 ? [{ label: 'Tasks', value: `${openTasksCount} open`, color: '#FF9500' }] : []),
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'white', padding: '9px 6px', textAlign: 'center', minWidth: 60,
              }}>
                <p style={{
                  fontSize: s.small ? 11 : 15, fontWeight: s.small ? 500 : 800,
                  color: s.color, lineHeight: 1.1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, color: '#8E8E93', marginTop: 3, fontWeight: 500 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions + stage */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            {/* WhatsApp — primary CTA */}
            {contact.mobile && (
              <a
                href={`https://wa.me/${contact.mobile.replace(/^0/, '60').replace(/[\s\-]/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 20, textDecoration: 'none',
                  background: '#25D366', color: 'white',
                  fontSize: 13, fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(37,211,102,0.4)',
                }}
                className="transition-opacity hover:opacity-90"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {contact.mobile && (
              <a href={`tel:${contact.mobile}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full no-underline
                           border border-hig-gray-4 bg-white text-hig-text
                           text-hig-footnote font-medium transition-all
                           hover:border-hig-blue hover:text-hig-blue"
              >
                <Phone size={13} /> {contact.mobile}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full no-underline
                           border border-hig-gray-4 bg-white text-hig-text
                           text-hig-footnote font-medium transition-all
                           hover:border-hig-blue hover:text-hig-blue
                           max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap"
              >
                <Mail size={13} style={{ flexShrink: 0 }} /> {contact.email}
              </a>
            )}
            {/* Edit */}
            <button
              onClick={() => navigate(`/contacts/${id}/edit`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                         border border-hig-gray-4 bg-white text-hig-caption1
                         font-semibold text-hig-text cursor-pointer transition-all
                         hover:border-hig-blue hover:text-hig-blue"
            >
              <Pencil size={12} /> Edit
            </button>
            {/* Stage — pushed to right */}
            <div style={{ marginLeft: 'auto' }}>
              <StageSelector stage={stage} onChange={newStage => updateContact(id, { stage: newStage })} />
            </div>
          </div>

          {/* Tags + notes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {contact.tags.map(tag => (
              <span key={tag} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                background: '#EBF5FF', color: '#2E96FF',
              }}>
                {tag}
                <button onClick={() => removeTag([contact.id], tag)} style={{ color: '#2E96FF60', border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}>
                  <X size={9} />
                </button>
              </span>
            ))}
            {contact.notes && (
              <p style={{ width: '100%', fontSize: 12, color: '#8E8E93', marginTop: 4, lineHeight: 1.5 }}>
                {contact.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Review countdown — below hero if set */}
      <ReviewCountdown reviewDate={contact.reviewDate} />
      {contact.reviewDate && <div style={{ marginBottom: 12 }} />}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-64 lg:shrink-0 space-y-4">

          {/* Coverage section */}
          <div className="hig-card p-4">
            <CoverageSection
              contact={contact}
              onNavigate={planner => {
                if (planner === 'insurance') navigate(`/contacts/${id}/protection`)
              }}
            />
          </div>

          {/* Financial Overview */}
          {sidebarFinancial?.hasData && (
            <div className="hig-card p-4 space-y-3">
              <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8E8E93', marginBottom: 8 }}>
                Financials
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setTab('finances')}
                  className="rounded-[10px] px-2 py-2.5 bg-hig-gray-6 border border-hig-gray-5
                             cursor-pointer text-left transition-colors hover:bg-hig-gray-5">
                  <p style={{ fontSize: 10, color: '#8E8E93', fontWeight: 600, marginBottom: 3 }}>{t('contactDetail.netWorth')}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: sidebarFinancial.netWorth >= 0 ? '#1C1C1E' : '#FF3B30', lineHeight: 1 }}>
                    {fmtRM(sidebarFinancial.netWorth)}
                  </p>
                </button>
                <button onClick={() => setTab('finances')}
                  className="rounded-[10px] px-2 py-2.5 bg-hig-gray-6 border border-hig-gray-5
                             cursor-pointer text-left transition-colors hover:bg-hig-gray-5">
                  <p style={{ fontSize: 10, color: '#8E8E93', fontWeight: 600, marginBottom: 3 }}>Monthly CF</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: sidebarFinancial.monthlyCashFlow >= 0 ? '#1C1C1E' : '#FF3B30', lineHeight: 1 }}>
                    {fmtRM(sidebarFinancial.monthlyCashFlow)}
                  </p>
                </button>
              </div>
              {isAdmin && (
                <button onClick={launchCashFlow}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2E96FF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                  <BarChart2 size={13} />
                  View projection →
                </button>
              )}
            </div>
          )}

          {/* Planning Snapshot */}
          <div className="hig-card p-4">
            <PlanningSnapshot
              contact={contact}
              onNavigate={planner => {
                if (planner === 'retirement') navigate(`/contacts/${id}/retirement`)
                else if (planner === 'insurance') navigate(`/contacts/${id}/protection`)
                else if (planner === 'cashflow') launchCashFlow()
              }}
            />
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-hidden">

          {/* Tab bar */}
          <div className="mb-4 flex overflow-x-auto border-b border-hig-gray-5">
            {[
              { key: 'timeline', label: `Timeline${pendingTasks > 0 ? ` · ${pendingTasks} open` : ''}` },
              { key: 'finances', label: 'Finances' },
            ].map(tabItem => (
              <button key={tabItem.key} onClick={() => setTab(tabItem.key)}
                className={`shrink-0 px-4 py-3 text-hig-subhead font-medium border-b-2 transition-colors sm:px-5
                  ${tab === tabItem.key
                    ? 'border-hig-blue text-hig-blue'
                    : 'border-transparent text-hig-text-secondary hover:text-hig-text'
                  }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          {/* ── Timeline Tab ────────────────────────────────────────────────── */}
          {tab === 'timeline' && (
            <div>
              {/* Smart suggestions */}
              <SmartSuggestions contact={contact} />

              {/* Quick Action Bar */}
              <QuickActionBar activeAction={activeAction} onSelect={setActiveAction} />

              {/* Inline compose form */}
              {activeAction && (
                <ComposeForm
                  actionKey={activeAction}
                  contactId={contact.id}
                  addInteraction={addInteraction}
                  addTask={addTask}
                  addActivity={addActivity}
                  onSubmit={() => setActiveAction(null)}
                  onCancel={() => setActiveAction(null)}
                />
              )}

              {/* Timeline filter */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {[
                  { key: 'all',        label: 'All'         },
                  { key: 'activities', label: 'Calls & Meetings' },
                  { key: 'notes',      label: 'Notes'       },
                  { key: 'tasks',      label: 'Tasks'       },
                ].map(f => (
                  <button key={f.key} onClick={() => setTlFilter(f.key)}
                    style={{
                      padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${tlFilter === f.key ? '#2E96FF' : '#E5E5EA'}`,
                      background: tlFilter === f.key ? '#EBF5FF' : 'white',
                      color: tlFilter === f.key ? '#2E96FF' : '#8E8E93',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Timeline feed — date-grouped */}
              <div className="hig-card p-4">
                {timeline.length === 0 ? (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <p className="text-hig-subhead text-hig-text-secondary">
                      {tlFilter === 'all'
                        ? 'No activity yet. Log a call or add a note above.'
                        : `No ${tlFilter} found.`}
                    </p>
                  </div>
                ) : (
                  groupTimeline(timeline).map(bucket => (
                    <div key={bucket.key}>
                      {/* Date bucket header */}
                      <div className="flex items-center gap-2 mt-2 mb-1">
                        <span className="text-hig-caption2 font-bold uppercase tracking-wider text-hig-text-secondary">
                          {bucket.label}
                        </span>
                        <div className="flex-1 h-px bg-hig-gray-5" />
                        <span className="text-hig-caption2 text-hig-gray-3 font-medium">
                          {bucket.items.length}
                        </span>
                      </div>
                      {bucket.items.map((item, idx) => (
                        <TimelineItem
                          key={item.id || idx}
                          item={item}
                          contactId={contact.id}
                          onToggleTask={toggleTask}
                        />
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Finances Tab ────────────────────────────────────────────────── */}
          {tab === 'finances' && (
            <FinancesTab
              contact={contact}
              onUpdateFinancials={(contactId, updates) => saveFinancials(contactId, updates.financials)}
              autoOpenEdit={autoOpenFinancialEdit}
              onAutoOpenConsumed={() => setAutoOpenFinancialEdit(false)}
            />
          )}
        </div>
      </div>

      {/* Cash Flow prompt */}
      {showCFPrompt && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowCFPrompt(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-hig-sm bg-orange-100 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-orange-500" />
              </div>
              <button onClick={() => setShowCFPrompt(false)} className="p-1.5 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary">
                <X size={16} />
              </button>
            </div>
            <h2 className="text-hig-title3 mb-1">Financial Info needed</h2>
            <p className="text-hig-subhead text-hig-text-secondary mb-5">
              The Cash Flow Projection needs at least one income or expense entry.
              Set up Financial Info in the Finances tab first.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button onClick={() => setShowCFPrompt(false)} className="hig-btn-secondary flex-1">Cancel</button>
              <button onClick={() => { setShowCFPrompt(false); setTab('finances'); setAutoOpenFinancialEdit(true) }}
                className="hig-btn-primary flex-1 gap-1.5">
                Set up Financial Info <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
