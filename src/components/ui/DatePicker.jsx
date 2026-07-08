/**
 * DatePicker — custom calendar picker matching the HIG design system
 *
 * Props:
 *   value       string  YYYY-MM-DD or ''
 *   onChange    fn(YYYY-MM-DD | '')
 *   placeholder string
 *   min         string  YYYY-MM-DD
 *   max         string  YYYY-MM-DD
 *   error       bool
 *   disabled    bool
 *   className   string  extra classes on the trigger
 *
 * UX improvements over native <input type="date">:
 *   · Consistent cross-browser calendar UI
 *   · Month/year quick-jump (click the header → month grid, click again → year grid)
 *   · "Today" shortcut
 *   · Clear button
 *   · Keyboard: arrow keys navigate days, Enter selects, Escape closes
 *   · Date displayed in en-MY locale (1 Jan 2025) — not browser-locale-dependent
 *   · Respects min / max constraints
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { parseYMD } from '../../lib/formatters'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

// parseYMD now lives in lib/formatters.js (single source of truth) — re-export
// here so existing `import { parseYMD } from '.../DatePicker'` call sites
// elsewhere in the app keep working without a churny find-replace.
export { parseYMD }

function toYMD(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(str) {
  const d = parseYMD(str)
  if (!d) return ''
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function clamp(date, min, max) {
  const minD = parseYMD(min)
  const maxD = parseYMD(max)
  if (minD && date < minD) return minD
  if (maxD && date > maxD) return maxD
  return date
}

function isDisabled(date, min, max) {
  const minD = parseYMD(min)
  const maxD = parseYMD(max)
  if (minD) { const m = new Date(minD); m.setHours(0,0,0,0); if (date < m) return true }
  if (maxD) { const m = new Date(maxD); m.setHours(0,0,0,0); if (date > m) return true }
  return false
}

// Build the 6-row day grid for a given year/month
function buildDayGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay() // 0=Su
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  // chunk into rows
  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DatePicker({
  value = '',
  onChange,
  placeholder = 'Select date',
  min,
  max,
  error = false,
  disabled = false,
  className = '',
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selected = parseYMD(value)

  // View state: 'days' | 'months' | 'years'
  const [mode, setMode] = useState('days')
  const [viewYear, setViewYear] = useState(() => (selected || today).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (selected || today).getMonth())
  const [open, setOpen] = useState(false)
  // For year grid paging
  const [yearPage, setYearPage] = useState(() => Math.floor((selected || today).getFullYear() / 12))

  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const focusedDateRef = useRef(selected || today)

  // ── Sync view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
      setYearPage(Math.floor(selected.getFullYear() / 12))
    }
  }, [value])

  // ── Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setMode('days')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'Escape') { setOpen(false); setMode('days'); return }
    if (mode !== 'days') return

    const cur = focusedDateRef.current || selected || today
    let next = new Date(cur)

    if (e.key === 'ArrowRight') { e.preventDefault(); next.setDate(cur.getDate() + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); next.setDate(cur.getDate() - 1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); next.setDate(cur.getDate() + 7) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); next.setDate(cur.getDate() - 7) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const d = focusedDateRef.current
      if (d && !isDisabled(d, min, max)) {
        onChange(toYMD(d))
        setOpen(false)
        setMode('days')
      }
      return
    } else return

    if (isDisabled(next, min, max)) return
    focusedDateRef.current = next
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }, [open, mode, selected, min, max, onChange])

  function openPicker() {
    if (disabled) return
    const base = selected || today
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setYearPage(Math.floor(base.getFullYear() / 12))
    setMode('days')
    focusedDateRef.current = selected || today
    setOpen(true)
  }

  function selectDay(date) {
    if (!date || isDisabled(date, min, max)) return
    onChange(toYMD(date))
    setOpen(false)
    setMode('days')
  }

  function selectToday() {
    if (isDisabled(today, min, max)) return
    onChange(toYMD(today))
    setOpen(false)
    setMode('days')
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const rows = mode === 'days' ? buildDayGrid(viewYear, viewMonth) : []

  // ── Trigger appearance
  const displayValue = formatDisplay(value)
  const isEmpty = !displayValue

  const triggerBorder = error
    ? '#FF3B30'
    : open
    ? '#2E96FF'
    : '#D1D1D6'

  const triggerShadow = open ? '0 0 0 3px rgba(46,150,255,0.20)' : 'none'

  // ─── Year grid helpers
  const yearStart = yearPage * 12
  const yearList = Array.from({ length: 12 }, (_, i) => yearStart + i)

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%' }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          borderRadius: 8,
          border: `1.5px solid ${triggerBorder}`,
          background: disabled ? '#F2F2F7' : '#FFFFFF',
          boxShadow: triggerShadow,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          outline: 'none',
          textAlign: 'left',
          userSelect: 'none',
        }}
        aria-label={displayValue || placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={className}
      >
        <Calendar
          size={16}
          style={{ color: isEmpty ? '#AEAEB2' : '#2E96FF', flexShrink: 0 }}
        />
        <span style={{
          flex: 1,
          fontSize: 17,
          lineHeight: '22px',
          color: isEmpty ? '#AEAEB2' : '#1C1C1E',
        }}>
          {isEmpty ? placeholder : displayValue}
        </span>
        {!isEmpty && !disabled && (
          <button
            type="button"
            onClick={clear}
            tabIndex={-1}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%',
              background: '#AEAEB2', border: 'none', cursor: 'pointer',
              flexShrink: 0, padding: 0,
            }}
            aria-label="Clear date"
          >
            <X size={11} color="white" strokeWidth={3} />
          </button>
        )}
      </button>

      {/* ── Popup ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Date picker"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            background: '#FFFFFF',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)',
            border: '1px solid #E5E5EA',
            padding: '12px 12px 10px',
            width: 280,
            userSelect: 'none',
          }}
        >
          {/* ─── DAYS MODE ───────────────────────────────────────────── */}
          {mode === 'days' && (
            <>
              {/* Month navigation header */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <NavArrow onClick={prevMonth} icon={ChevronLeft} />
                <button
                  type="button"
                  onClick={() => setMode('months')}
                  style={{
                    flex: 1,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 600, color: '#1C1C1E',
                    textAlign: 'center', padding: '2px 4px', borderRadius: 6,
                  }}
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>
                <NavArrow onClick={nextMonth} icon={ChevronRight} />
              </div>

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 600,
                    color: '#AEAEB2', padding: '2px 0',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {row.map((date, ci) => {
                    if (!date) return <div key={ci} />
                    const isToday = isSameDay(date, today)
                    const isSel = selected && isSameDay(date, selected)
                    const dis = isDisabled(date, min, max)
                    const isFocused = focusedDateRef.current && isSameDay(date, focusedDateRef.current)

                    return (
                      <DayCell
                        key={ci}
                        date={date}
                        isToday={isToday}
                        isSelected={isSel}
                        isDisabled={dis}
                        isFocused={isFocused && !isSel}
                        onClick={() => selectDay(date)}
                        onMouseEnter={() => { focusedDateRef.current = date }}
                      />
                    )
                  })}
                </div>
              ))}

              {/* Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 8, paddingTop: 8,
                borderTop: '1px solid #F2F2F7',
              }}>
                <FooterBtn
                  label="Today"
                  disabled={isDisabled(today, min, max)}
                  onClick={selectToday}
                  primary
                />
                {selected && (
                  <FooterBtn label="Clear" onClick={() => { onChange(''); setOpen(false) }} />
                )}
              </div>
            </>
          )}

          {/* ─── MONTHS MODE ──────────────────────────────────────────── */}
          {mode === 'months' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <NavArrow onClick={() => setViewYear(y => y - 1)} icon={ChevronLeft} />
                <button
                  type="button"
                  onClick={() => setMode('years')}
                  style={{
                    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 600, color: '#1C1C1E',
                    textAlign: 'center', padding: '2px 4px', borderRadius: 6,
                  }}
                >
                  {viewYear}
                </button>
                <NavArrow onClick={() => setViewYear(y => y + 1)} icon={ChevronRight} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {MONTHS.map((m, idx) => {
                  const isCur = idx === (selected ? selected.getMonth() : -1) && viewYear === (selected ? selected.getFullYear() : -1)
                  const isNow = idx === today.getMonth() && viewYear === today.getFullYear()
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setViewMonth(idx); setMode('days') }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: isNow && !isCur ? '1.5px solid #2E96FF' : '1.5px solid transparent',
                        background: isCur ? '#2E96FF' : 'transparent',
                        color: isCur ? '#fff' : '#1C1C1E',
                        fontSize: 13,
                        fontWeight: isCur || isNow ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F2F2F7' }}>
                <FooterBtn label="← Back" onClick={() => setMode('days')} />
              </div>
            </>
          )}

          {/* ─── YEARS MODE ───────────────────────────────────────────── */}
          {mode === 'years' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <NavArrow onClick={() => setYearPage(p => p - 1)} icon={ChevronLeft} />
                <span style={{
                  flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#1C1C1E',
                }}>
                  {yearStart} – {yearStart + 11}
                </span>
                <NavArrow onClick={() => setYearPage(p => p + 1)} icon={ChevronRight} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {yearList.map(yr => {
                  const isCur = selected && yr === selected.getFullYear()
                  const isNow = yr === today.getFullYear()
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => { setViewYear(yr); setMode('months') }}
                      style={{
                        padding: '8px 4px',
                        borderRadius: 8,
                        border: isNow && !isCur ? '1.5px solid #2E96FF' : '1.5px solid transparent',
                        background: isCur ? '#2E96FF' : 'transparent',
                        color: isCur ? '#fff' : '#1C1C1E',
                        fontSize: 13,
                        fontWeight: isCur || isNow ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {yr}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F2F2F7' }}>
                <FooterBtn label="← Back" onClick={() => setMode('months')} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavArrow({ onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 7, border: 'none', background: 'transparent',
        cursor: 'pointer', color: '#8E8E93', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F7' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <Icon size={16} />
    </button>
  )
}

function DayCell({ date, isToday, isSelected, isDisabled, isFocused, onClick, onMouseEnter }) {
  const base = {
    width: '100%', aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    fontSize: 13,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    border: isToday && !isSelected ? '1.5px solid #2E96FF' : '1.5px solid transparent',
    background: isSelected ? '#2E96FF' : isFocused ? '#F0F7FF' : 'transparent',
    color: isSelected ? '#fff' : isDisabled ? '#C7C7CC' : '#1C1C1E',
    fontWeight: isToday || isSelected ? 600 : 400,
    transition: 'all 0.12s',
  }
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={base}
      onMouseDown={e => e.preventDefault()} // prevent trigger blur
    >
      {date.getDate()}
    </button>
  )
}

function FooterBtn({ label, onClick, disabled = false, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px',
        borderRadius: 7,
        border: 'none',
        background: primary ? '#2E96FF12' : 'transparent',
        color: primary ? '#2E96FF' : '#8E8E93',
        fontSize: 13,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
