/**
 * TaskModal — Option A
 * Quick overlay modal triggered when clicking a task card in the Dashboard feed.
 * Shows task detail, lets you mark complete, add a quick note, and jump to the contact.
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, CheckCircle2, Circle, Calendar, User, ExternalLink,
  FileText, CheckSquare, Clock,
} from 'lucide-react'

function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d)) return str
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysLabel(days) {
  if (days === 0) return { text: 'Due today', color: '#FF3B30' }
  if (days === 1) return { text: 'Due tomorrow', color: '#FF9500' }
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, color: '#FF3B30' }
  if (days <= 3) return { text: `${days}d left`, color: '#FF9500' }
  return { text: `${days}d left`, color: '#34C759' }
}

export default function TaskModal({ item, onClose, onToggleTask, onAddInteraction }) {
  const navigate = useNavigate()
  const [done, setDone]     = useState(item.task?.status === 'completed')
  const [note, setNote]     = useState('')
  const [saved, setSaved]   = useState(false)
  const overlayRef          = useRef(null)
  const textareaRef         = useRef(null)

  const contact = item.contact
  const task    = item.task   // full task object, includes id
  const days    = item.days
  const dl      = daysLabel(days)

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Trap focus inside modal
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function handleToggle() {
    if (!task?.id) return
    onToggleTask(contact.id, task.id)
    setDone(d => !d)
  }

  function handleSaveNote() {
    if (!note.trim()) return
    onAddInteraction(contact.id, {
      id: Date.now().toString(),
      type: 'Note',
      date: new Date().toISOString().split('T')[0],
      notes: note.trim(),
      source: 'dashboard-task',
    })
    setNote('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  function handleOpenContact() {
    navigate(`/contacts/${contact.id}`)
    onClose()
  }

  // Click outside to close
  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.40)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
          width: '100%', maxWidth: 440,
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #040E1C 0%, #0a1f38 100%)',
          padding: '18px 20px 16px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(46,150,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckSquare size={16} style={{ color: '#2E96FF' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>Task</p>
              <p style={{
                fontSize: 16, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3,
                textDecoration: done ? 'line-through' : 'none',
                opacity: done ? 0.55 : 1,
                transition: 'all 0.2s',
              }}>
                {task?.title || item.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
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

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Contact */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F2F2F7', borderRadius: 10, padding: '7px 12px',
              flex: 1, minWidth: 0,
            }}>
              <User size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#1C1C1E',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {contact.name}
              </span>
            </div>

            {/* Due date */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#F2F2F7', borderRadius: 10, padding: '7px 12px',
              flexShrink: 0,
            }}>
              <Calendar size={13} style={{ color: '#8E8E93', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>
                {fmtDate(task?.dueDate)}
              </span>
            </div>
          </div>

          {/* Urgency + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${dl.color}12`, borderRadius: 8, padding: '5px 10px',
            }}>
              <Clock size={12} style={{ color: dl.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: dl.color }}>{dl.text}</span>
            </div>

            {done && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(52,199,89,0.10)', borderRadius: 8, padding: '5px 10px',
              }}>
                <CheckCircle2 size={12} style={{ color: '#34C759' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#34C759' }}>Completed</span>
              </div>
            )}
          </div>

          {/* Mark complete toggle */}
          <button
            onClick={handleToggle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: done ? 'rgba(52,199,89,0.06)' : 'rgba(46,150,255,0.06)',
              border: done ? '1.5px solid rgba(52,199,89,0.20)' : '1.5px solid rgba(46,150,255,0.20)',
              cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.80'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {done
              ? <CheckCircle2 size={18} style={{ color: '#34C759', flexShrink: 0 }} />
              : <Circle size={18} style={{ color: '#2E96FF', flexShrink: 0 }} />
            }
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: done ? '#34C759' : '#2E96FF',
            }}>
              {done ? 'Mark as Incomplete' : 'Mark as Complete'}
            </span>
          </button>

          {/* Quick note */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <FileText size={13} style={{ color: '#8E8E93' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#8E8E93', letterSpacing: 0.2 }}>Quick Note</span>
            </div>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this task…"
              rows={3}
              style={{
                width: '100%', resize: 'vertical',
                fontSize: 13, color: '#1C1C1E',
                background: '#F9F9FB',
                border: '1.5px solid #E5E5EA',
                borderRadius: 10, padding: '10px 12px',
                outline: 'none', fontFamily: 'inherit',
                lineHeight: 1.5, boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#2E96FF'}
              onBlur={e => e.target.style.borderColor = '#E5E5EA'}
            />
            {note.trim() && (
              <button
                onClick={handleSaveNote}
                style={{
                  marginTop: 8, fontSize: 12, fontWeight: 700,
                  color: '#fff', background: '#2E96FF',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  padding: '7px 14px', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a83f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#2E96FF'}
              >
                Save Note
              </button>
            )}
            {saved && (
              <span style={{ fontSize: 12, color: '#34C759', fontWeight: 600, marginLeft: 8 }}>
                ✓ Saved
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px 18px',
          borderTop: '1px solid #F2F2F7',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleOpenContact}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg, #040E1C 0%, #1a3a5c 100%)',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              padding: '10px 18px',
              boxShadow: '0 4px 14px rgba(4,14,28,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(4,14,28,0.30)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(4,14,28,0.25)' }}
          >
            <ExternalLink size={13} />
            Open Contact
          </button>
        </div>
      </div>
    </div>
  )
}
