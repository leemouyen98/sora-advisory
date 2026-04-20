/**
 * ContactDetailPage — Account 360 view
 *
 * · Redesigned hero card with gradient banner, stats strip
 * · Date-grouped timeline (Today / Yesterday / This Week / Earlier)
 * · Edit button navigates to /contacts/:id/edit (full-page form)
 * · Quick Action Bar, Coverage Snapshot, Planning Snapshot preserved
 * · All existing functionality preserved
 */

import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'
import FinancesTab from '../components/finances/FinancesTab'
import CashFlowTab from '../components/finances/CashFlowTab'
import PlanningSnapshot from '../components/PlanningSnapshot'
import { STAGES, getEffectiveStage } from './ContactsPage'
import {
  ArrowLeft, Phone, Calendar, Briefcase, Target, Shield,
  Plus, Check, FileText, PhoneCall, Users, MessageSquare, Clock,
  Pencil, CheckCircle2, X, Tag, TrendingUp, ArrowRight, ChevronDown,
  DollarSign, BarChart2, MoreVertical, Trash2, RotateCcw, AlertTriangle,
  Zap, Activity, Heart, Mail, ChevronRight, Lightbulb, Bell,
  Filter as FilterIcon,
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

// Next-action suggestion engine
function getNextAction(contact) {
  const stage = getEffectiveStage(contact)
  const lastItems = [
    ...(contact.activities    || []).map(a => new Date(a.date)),
    ...(contact.interactions  || []).map(i => new Date(i.date)),
  ].filter(d => !isNaN(d))
  const daysSinceLast = lastItems.length
    ? Math.floor((Date.now() - Math.max(...lastItems)) / 86400000)
    : 999
  const reviewDays = daysUntilDate(contact.reviewDate)

  if (reviewDays !== null && reviewDays <= 0) {
    return { icon: Bell, color: '#AF52DE', text: `Review overdue by ${Math.abs(reviewDays)} day${Math.abs(reviewDays) === 1 ? '' : 's'} — schedule now` }
  }
  if (reviewDays !== null && reviewDays <= 14) {
    return { icon: Bell, color: '#FF9500', text: `Review due in ${reviewDays} day${reviewDays === 1 ? '' : 's'} — prep agenda` }
  }
  if (stage === 'Proposal' && daysSinceLast > 3) {
    return { icon: PhoneCall, color: '#2E96FF', text: 'Proposal pending — follow up with client' }
  }
  if (stage === 'Prospect' && daysSinceLast > 14) {
    return { icon: Lightbulb, color: '#FF9500', text: 'In discussion for ' + daysSinceLast + ' days — time to send proposal?' }
  }
  if (stage === 'Lead' && daysSinceLast > 7) {
    return { icon: PhoneCall, color: '#2E96FF', text: 'New lead — schedule first needs-analysis call' }
  }
  if (daysSinceLast > 90) {
    return { icon: AlertTriangle, color: '#FF3B30', text: `No activity in ${daysSinceLast} days — at risk of going dormant` }
  }
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Stage selector (shown in sidebar)
function StageSelector({ stage, onChange }) {
  const [open, setOpen] = useState(false)
  const s = STAGE_MAP[stage] || STAGE_MAP.Lead

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
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
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'white', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            border: '1px solid #F2F2F7', zIndex: 30, overflow: 'hidden',
            minWidth: 140,
          }}>
            {STAGES.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false) }}
                style={{
                  width: '100%', padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 9,
                  border: 'none', background: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.1s',
                  fontWeight: opt.key === stage ? 600 : 400,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9F9FB'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
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

// Coverage snapshot widget
function CoverageSnapshot({ contact, onNavigate }) {
  const cov = getCoverageStatus(contact)
  const items = Object.entries(POLICY_CATEGORIES).map(([key, cfg]) => ({
    key, ...cfg, covered: cov[key],
  }))
  const coveredCount = items.filter(i => i.covered).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8E8E93' }}>
          Coverage
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: coveredCount === 4 ? '#34C759' : coveredCount >= 2 ? '#FF9500' : '#FF3B30',
        }}>
          {coveredCount}/4
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate?.('insurance')}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 9px', borderRadius: 8,
              background: item.covered ? item.bg : '#FAFAFA',
              border: `1px solid ${item.covered ? item.color + '30' : '#E5E5EA'}`,
              cursor: onNavigate ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: item.covered ? `${item.color}18` : '#F2F2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800,
              color: item.covered ? item.color : '#C7C7CC',
            }}>
              {item.covered ? '✓' : '✗'}
            </span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: item.covered ? item.color : '#8E8E93', lineHeight: 1 }}>
                {item.label}
              </p>
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

// Next action suggestion banner
function NextActionBanner({ contact, onLogCall, onLogNote }) {
  const action = getNextAction(contact)
  if (!action) return null
  const { icon: Icon, color, text } = action

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: `${color}0D`, border: `1px solid ${color}25`,
      marginBottom: 16,
    }}>
      <Icon size={15} style={{ color, marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>{text}</p>
      </div>
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
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="hig-input"
              style={{ width: 150 }}
            />
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

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">

      {/* Top header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => navigate('/contacts')} className="hig-btn-ghost gap-1.5 -ml-3">
          <ArrowLeft size={16} /> Contacts
        </button>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {/* ⋮ Options */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(s => !s)}
              className={`hig-btn-ghost p-2 ${showOptionsMenu ? 'bg-hig-gray-5' : ''}`}
            >
              <MoreVertical size={16} />
            </button>
            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowOptionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 min-w-[230px] z-30">
                  <div className="px-3 py-1.5">
                    <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Reset Planner</p>
                  </div>
                  {[
                    ...(isAdmin ? [{ label: t('contactDetail.cashFlowPlanner'), icon: BarChart2, onClick: confirmResetCashFlow }] : []),
                    { label: t('contactDetail.retirementPlanner'), icon: Target, onClick: confirmResetRetirement },
                    { label: t('contactDetail.insurancePlanner'),  icon: Shield, onClick: confirmResetInsurance },
                  ].map(({ label, icon: Icon, onClick }) => (
                    <button key={label} onClick={onClick}
                      className="w-full flex items-center gap-3 px-3 py-2 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left">
                      <RotateCcw size={14} className="text-hig-text-secondary shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                  <div className="border-t border-hig-gray-5 my-1" />
                  <button onClick={confirmDelete}
                    className="w-full flex items-center gap-3 px-3 py-2 text-hig-subhead hover:bg-red-50 text-red-500 transition-colors text-left">
                    <Trash2 size={14} className="shrink-0" />
                    <span>{t('contactDetail.deleteContact')}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Start Planning */}
          <div className="relative">
            <button onClick={() => setShowStartPlanning(s => !s)} className="hig-btn-primary gap-2">
              {t('contactDetail.startPlanning')}
              <ChevronDown size={14} className={`transition-transform ${showStartPlanning ? 'rotate-180' : ''}`} />
            </button>
            {showStartPlanning && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowStartPlanning(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 min-w-[210px] z-30">
                  {isAdmin && (
                    <>
                      <button onClick={launchCashFlow}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left">
                        <div className="w-7 h-7 rounded-hig-sm bg-hig-blue/10 flex items-center justify-center shrink-0">
                          <TrendingUp size={14} className="text-hig-blue" />
                        </div>
                        <div>
                          <p className="font-medium leading-none mb-0.5">{t('contactDetail.cashFlowPlanner')}</p>
                          <p className="text-hig-caption2 text-hig-text-secondary leading-none">{t('cashflow.fullSuite')}</p>
                        </div>
                        {hasFinancialData && <span className="ml-auto text-hig-caption2 text-hig-green font-semibold">Ready</span>}
                      </button>
                      <div className="border-t border-hig-gray-5 my-1" />
                    </>
                  )}
                  <button onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/retirement`) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left">
                    <div className="w-7 h-7 rounded-hig-sm bg-hig-blue/10 flex items-center justify-center shrink-0">
                      <Target size={14} className="text-hig-blue" />
                    </div>
                    <div>
                      <p className="font-medium leading-none mb-0.5">{t('contactDetail.retirementPlanner')}</p>
                      <p className="text-hig-caption2 text-hig-text-secondary leading-none">{t('contactDetail.startPlanning')}</p>
                    </div>
                    {contact.retirementPlan && <CheckCircle2 size={14} className="ml-auto text-hig-green shrink-0" />}
                  </button>
                  <button onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/protection`) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left">
                    <div className="w-7 h-7 rounded-hig-sm bg-hig-green/10 flex items-center justify-center shrink-0">
                      <Shield size={14} className="text-hig-green" />
                    </div>
                    <div>
                      <p className="font-medium leading-none mb-0.5">{t('contactDetail.insurancePlanner')}</p>
                      <p className="text-hig-caption2 text-hig-text-secondary leading-none">{t('contactDetail.startPlanning')}</p>
                    </div>
                    {contact.protectionPlan && <CheckCircle2 size={14} className="ml-auto text-hig-green shrink-0" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title} body={confirmAction.body} danger={confirmAction.danger}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null) }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="w-full lg:w-72 lg:shrink-0 space-y-4">

          {/* ── Hero Card ─────────────────────────────────────────────────── */}
          <div className="hig-card overflow-hidden">
            {/* Gradient banner */}
            {(() => {
              const hue = nameHue(contact.name)
              const initials = contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
              return (
                <>
                  <div style={{
                    height: 64,
                    background: `linear-gradient(135deg, hsl(${hue},70%,55%) 0%, hsl(${(hue+40)%360},65%,65%) 100%)`,
                    position: 'relative',
                  }}>
                    {/* Edit button top-right */}
                    <button
                      onClick={() => navigate(`/contacts/${id}/edit`)}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(255,255,255,0.25)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(4px)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                      title="Edit contact"
                    >
                      <Pencil size={13} style={{ color: 'white' }} />
                    </button>
                  </div>

                  {/* Avatar overlapping banner */}
                  <div style={{ padding: '0 16px 16px', marginTop: -28 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: `hsl(${hue},70%,55%)`,
                        border: '3px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700, color: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      {/* Stage pill */}
                      <StageSelector
                        stage={stage}
                        onChange={newStage => updateContact(id, { stage: newStage })}
                      />
                    </div>

                    {/* Name + age */}
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.2, marginBottom: 2 }}>
                      {contact.name}
                    </h2>
                    <p style={{ fontSize: 12, color: '#8E8E93', marginBottom: 10 }}>
                      Age {age}{contact.employment ? ` · ${contact.employment}` : ''}
                    </p>

                    {/* Stats strip */}
                    {(() => {
                      const policies    = (contact.financials?.insurance || []).filter(p => !p.status || p.status === 'Active')
                      const covCount    = Object.values(getCoverageStatus(contact)).filter(Boolean).length
                      const allActivity = [
                        ...(contact.activities   || []).map(a => new Date(a.date)),
                        ...(contact.interactions || []).map(i => new Date(i.date)),
                      ].filter(d => !isNaN(d))
                      const lastSeen = allActivity.length
                        ? Math.floor((Date.now() - Math.max(...allActivity)) / 86400000)
                        : null
                      const openTasks   = (contact.tasks || []).filter(t => t.status !== 'completed').length
                      const totalAnnPremium = policies.reduce((s, p) => {
                        const amt = Number(p.annualPremium || p.premium || 0)
                        return s + (p.premiumFrequency === 'Monthly' ? amt * 12 : amt)
                      }, 0)

                      const stats = [
                        { label: 'Coverage', value: `${covCount}/4`, color: covCount===4?'#34C759':covCount>=2?'#FF9500':'#FF3B30' },
                        { label: 'Policies', value: policies.length, color: '#2E96FF' },
                        ...(lastSeen !== null ? [{ label: 'Last seen', value: lastSeen===0?'Today':`${lastSeen}d`, color: lastSeen>60?'#FF3B30':lastSeen>14?'#FF9500':'#34C759' }] : []),
                        ...(openTasks > 0 ? [{ label: 'Open tasks', value: openTasks, color: '#FF9500' }] : []),
                      ]

                      return (
                        <div style={{
                          display: 'grid', gridTemplateColumns: `repeat(${Math.min(stats.length,4)}, 1fr)`,
                          gap: 1, background: '#F2F2F7', borderRadius: 10, overflow: 'hidden',
                          marginBottom: 12,
                        }}>
                          {stats.map(s => (
                            <div key={s.label} style={{
                              background: 'white', padding: '8px 6px', textAlign: 'center',
                            }}>
                              <p style={{ fontSize: 15, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</p>
                              <p style={{ fontSize: 10, color: '#8E8E93', marginTop: 2, fontWeight: 500 }}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* Review countdown */}
                    <ReviewCountdown reviewDate={contact.reviewDate} />

                    {/* Contact info */}
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {contact.mobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <Phone size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
                          <a href={`tel:${contact.mobile}`} style={{ color: '#1C1C1E', textDecoration: 'none' }}
                            onMouseEnter={e => e.target.style.color='#2E96FF'}
                            onMouseLeave={e => e.target.style.color='#1C1C1E'}>
                            {contact.mobile}
                          </a>
                        </div>
                      )}
                      {contact.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <Mail size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
                          <a href={`mailto:${contact.email}`} style={{ color: '#1C1C1E', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.target.style.color='#2E96FF'}
                            onMouseLeave={e => e.target.style.color='#1C1C1E'}>
                            {contact.email}
                          </a>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <Calendar size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
                        <span style={{ color: '#1C1C1E' }}>
                          {new Date(contact.dob).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {contact.reviewDate && contact.reviewFrequency && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <Clock size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
                          <span style={{ color: '#1C1C1E' }}>{contact.reviewFrequency} review</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {contact.tags.map(tag => (
                        <span key={tag} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, fontWeight: 600,
                          padding: '3px 8px', borderRadius: 20,
                          background: '#EBF5FF', color: '#2E96FF',
                        }}>
                          {tag}
                          <button onClick={() => removeTag([contact.id], tag)} style={{ color: '#2E96FF80', border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}>
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                      {['Client','Prospect'].filter(t => !contact.tags.includes(t)).map(t => (
                        <button key={t} onClick={() => addTag([contact.id], t)}
                          style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 20,
                            border: '1.5px dashed #C7C7CC', background: 'none',
                            color: '#8E8E93', cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='#2E96FF'; e.currentTarget.style.color='#2E96FF' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='#C7C7CC'; e.currentTarget.style.color='#8E8E93' }}>
                          + {t}
                        </button>
                      ))}
                    </div>

                    {contact.notes && (
                      <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F2F2F7', lineHeight: 1.5 }}>
                        {contact.notes}
                      </p>
                    )}
                  </div>
                </>
              )
            })()}
          </div>

          {/* Coverage Snapshot */}
          <div className="hig-card p-4">
            <CoverageSnapshot
              contact={contact}
              onNavigate={planner => {
                if (planner === 'insurance') navigate(`/contacts/${id}/protection`)
              }}
            />
          </div>

          {/* Financial Overview */}
          {sidebarFinancial?.hasData && (
            <div className="hig-card p-4 space-y-3">
              <h3 className="text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
                Financial Overview
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTab('finances')}
                  className="rounded-hig-sm p-2.5 bg-hig-gray-6 hover:bg-hig-gray-5 transition-colors text-left">
                  <p className="text-hig-caption2 text-hig-text-secondary font-medium mb-0.5">{t('contactDetail.netWorth')}</p>
                  <p className={`text-hig-subhead font-bold leading-tight ${sidebarFinancial.netWorth >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
                    {fmtRM(sidebarFinancial.netWorth)}
                  </p>
                </button>
                <button onClick={() => setTab('finances')}
                  className="rounded-hig-sm p-2.5 bg-hig-gray-6 hover:bg-hig-gray-5 transition-colors text-left">
                  <p className="text-hig-caption2 text-hig-text-secondary font-medium mb-0.5">{t('contactDetail.monthlyCashFlow')}</p>
                  <p className={`text-hig-subhead font-bold leading-tight ${sidebarFinancial.monthlyCashFlow >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
                    {fmtRM(sidebarFinancial.monthlyCashFlow)}
                  </p>
                </button>
              </div>
              {isAdmin && (
                <button onClick={launchCashFlow}
                  className="w-full flex items-center gap-2 text-hig-caption1 text-hig-blue hover:text-hig-blue/80 transition-colors">
                  <BarChart2 size={13} />
                  <span>View full projection →</span>
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
              {/* Next-action suggestion */}
              <NextActionBanner contact={contact} />

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
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        margin: '8px 0 4px',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                          textTransform: 'uppercase', color: '#8E8E93',
                        }}>
                          {bucket.label}
                        </span>
                        <div style={{ flex: 1, height: 1, background: '#F2F2F7' }} />
                        <span style={{ fontSize: 10, color: '#C7C7CC', fontWeight: 500 }}>
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
