/**
 * ContactDrawer — Option B
 * Right-side slide-in drawer triggered by review or birthday cards in the Dashboard feed.
 * Shows event detail + last 3–5 timeline items for the contact.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, CalendarClock, Cake, ExternalLink, PhoneCall, Mail,
  Users, MessageSquare, CheckSquare, Clock, ChevronRight,
} from 'lucide-react'

function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtShort(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getAge(dob) {
  const d = new Date(dob)
  const n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return a
}

function nameHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

const ACTIVITY_ICONS = {
  Call:    { Icon: PhoneCall,     color: '#2E96FF' },
  Meeting: { Icon: Users,         color: '#34C759' },
  Email:   { Icon: Mail,          color: '#AF52DE' },
}

function TimelineChip({ item }) {
  let Icon, color, label, dateStr

  if (item._kind === 'activity') {
    const cfg = ACTIVITY_ICONS[item.type] || { Icon: Clock, color: '#8E8E93' }
    Icon = cfg.Icon; color = cfg.color
    label = item.type || 'Activity'
    dateStr = item.date
  } else if (item._kind === 'task') {
    Icon = CheckSquare; color = item.status === 'completed' ? '#34C759' : '#2E96FF'
    label = item.title || 'Task'
    dateStr = item.dueDate || item.date
  } else {
    Icon = MessageSquare; color = '#8E8E93'
    label = item.notes ? item.notes.slice(0, 40) + (item.notes.length > 40 ? '…' : '') : 'Note'
    dateStr = item.date
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '9px 0',
      borderBottom: '1px solid #F5F5F7',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: '#1C1C1E',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </p>
        {dateStr && (
          <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>
            {fmtShort(dateStr)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ContactDrawer({ item, onClose }) {
  const navigate    = useNavigate()
  const drawerRef   = useRef(null)
  const [visible, setVisible] = useState(false)

  const contact = item.contact
  const type    = item.type   // 'review' | 'birthday'
  const hue     = nameHue(contact.name)
  const initials = contact.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  // Slide in animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  function handleOpenContact() {
    navigate(`/contacts/${contact.id}`)
    onClose()
  }

  // Build timeline: merge tasks + activities + interactions, sort by date, take last 5
  const recentTimeline = (() => {
    const all = []
    ;(contact.interactions || []).forEach(i => all.push({ ...i, _kind: 'note', _sortDate: i.date || '0' }))
    ;(contact.activities   || []).forEach(a => all.push({ ...a, _kind: 'activity', _sortDate: a.date || '0' }))
    ;(contact.tasks        || []).forEach(t => all.push({ ...t, _kind: 'task',     _sortDate: t.dueDate || t.date || '0' }))
    return all
      .sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate))
      .slice(0, 5)
  })()

  // Event-specific config
  const isReview   = type === 'review'
  const EventIcon  = isReview ? CalendarClock : Cake
  const accentColor = isReview ? '#AF52DE' : '#FF2D55'
  const eventLabel  = isReview ? 'Annual Review' : 'Birthday'

  const eventDetail = isReview
    ? contact.reviewDate
      ? `Scheduled ${fmtDate(contact.reviewDate)}${contact.reviewFrequency ? ' · ' + contact.reviewFrequency : ''}`
      : 'No date set'
    : contact.dob
      ? `${fmtDate(contact.dob)} · Turning ${getAge(contact.dob) + (item.days > 0 ? 1 : 0)}`
      : 'No DOB recorded'

  const urgencyText = item.days === 0 ? 'Today'
    : item.days === 1 ? 'Tomorrow'
    : `In ${item.days} days`

  return (
    <>
      <style>{`
        @keyframes drawerFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes drawerSlideOut{ from { transform: translateX(0); } to { transform: translateX(100%); } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
          animation: 'drawerFadeIn 0.15s ease',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 360, zIndex: 1000,
          background: '#FFFFFF',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18), -2px 0 8px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #040E1C 0%, #0a1f38 100%)',
          padding: '20px 18px 18px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            {/* Event type badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: `${accentColor}22`, borderRadius: 8, padding: '4px 10px',
            }}>
              <EventIcon size={12} style={{ color: accentColor }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {eventLabel}
              </span>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(255,255,255,0.10)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
            >
              <X size={14} style={{ color: 'rgba(255,255,255,0.70)' }} />
            </button>
          </div>

          {/* Contact avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, hsl(${hue},65%,55%) 0%, hsl(${(hue+40)%360},65%,45%) 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px hsla(${hue},65%,50%,0.40)`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                {initials}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: -0.3, lineHeight: 1.2 }}>
                {contact.name}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 2 }}>
                {contact.occupation || contact.stage || 'Client'}
              </p>
            </div>
          </div>
        </div>

        {/* Event detail card */}
        <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
          <div style={{
            background: `${accentColor}08`,
            border: `1.5px solid ${accentColor}20`,
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: `${accentColor}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <EventIcon size={15} style={{ color: accentColor }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', marginBottom: 2 }}>
                {eventDetail}
              </p>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: accentColor,
                background: `${accentColor}12`,
                padding: '2px 8px', borderRadius: 20,
                display: 'inline-block',
              }}>
                {urgencyText}
              </span>
            </div>
          </div>
        </div>

        {/* Recent timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#8E8E93',
            textTransform: 'uppercase', letterSpacing: 0.8,
            marginBottom: 8,
          }}>
            Recent Activity
          </p>

          {recentTimeline.length === 0 ? (
            <div style={{
              padding: '20px 0', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6, textAlign: 'center',
            }}>
              <Clock size={18} style={{ color: '#C7C7CC' }} />
              <p style={{ fontSize: 12, color: '#8E8E93' }}>No activity recorded yet</p>
            </div>
          ) : (
            <div>
              {recentTimeline.map((tItem, idx) => (
                <TimelineChip key={tItem.id || idx} item={tItem} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px 20px',
          borderTop: '1px solid #F2F2F7',
          flexShrink: 0,
        }}>
          <button
            onClick={handleOpenContact}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #040E1C 0%, #1a3a5c 100%)',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              padding: '13px 18px',
              boxShadow: '0 4px 16px rgba(4,14,28,0.28)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(4,14,28,0.35)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(4,14,28,0.28)' }}
          >
            Open Full Profile
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </>
  )
}
