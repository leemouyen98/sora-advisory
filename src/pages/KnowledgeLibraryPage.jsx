/**
 * KnowledgeLibraryPage — Responsive redesign v2
 * ──────────────────────────────────────────────
 * iPhone  : single-panel iOS-style nav (no left sidebar)
 *           • Back chevron + page title + search + filter icons
 *           • Bottom sheet for sort / type filter
 *           • 2-column grid / compact list rows
 *           • Admin FAB for upload
 * iPad    : narrow collapsible left panel (200 px) + right content
 *           • 3-column grid
 * Desktop : persistent 2-column (240 px left + content)
 *           • Full inline toolbar
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FolderOpen, Folder, Plus, Pencil, Trash2, Upload,
  FileText, FileImage, File, FileSpreadsheet, Loader, Library,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Star,
  LayoutGrid, List, Search, X, Download, SlidersHorizontal,
  Check, ArrowLeft, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'
import ImageViewerModal from '../components/layout/ImageViewerModal'
import PDFThumbnail from '../components/library/PDFThumbnail'

// ── Design tokens ──────────────────────────────────────────────────────────────
// FOLDER_PALETTE: dynamic per-folder accent colors — must stay as runtime values
const FOLDER_PALETTE = [
  '#2E96FF', '#34C759', '#FF9500', '#AF52DE',
  '#FF2D55', '#30B0C7', '#5856D6', '#FF6B35',
]

// Fast client-side feedback only — the server (functions/api/library/files/index.js)
// is the enforced source of truth for these limits, keep both in sync.
const UPLOAD_LIMITS = {
  maxSize: 25 * 1024 * 1024, // 25 MB
  allowedMimeTypes: new Set([
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
  ]),
}

// ── Responsive hook ────────────────────────────────────────────────────────────
function useResponsive() {
  const getBreakpoint = () => {
    const w = window.innerWidth
    return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 }
  }
  const [bp, setBp] = useState(getBreakpoint)
  useEffect(() => {
    const handler = () => setBp(getBreakpoint())
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [])
  return bp
}

// ── File helpers ───────────────────────────────────────────────────────────────
function fileIcon(mime) {
  if (!mime) return File
  if (mime === 'application/pdf') return FileText
  if (mime.startsWith('image/')) return FileImage
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  return File
}

function fileTypeLabel(mime) {
  if (!mime) return 'File'
  if (mime === 'application/pdf') return 'PDF'
  if (mime.startsWith('image/')) return 'Image'
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'Excel'
  if (mime.includes('csv')) return 'CSV'
  if (mime.includes('word') || mime.includes('document')) return 'Word'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT'
  const sub = mime.split('/')[1]
  return sub ? sub.slice(0, 6).toUpperCase() : 'File'
}

// fileColor: returns dynamic hex color per mime type — kept as runtime value
function fileColor(mime) {
  if (mime === 'application/pdf') return '#FF3B30'
  if (mime?.startsWith('image/')) return '#34C759'
  if (mime?.includes('spreadsheet') || mime?.includes('excel') || mime?.includes('csv')) return '#34C759'
  if (mime?.includes('word') || mime?.includes('document')) return '#2E96FF'
  if (mime?.includes('presentation') || mime?.includes('powerpoint')) return '#FF9500'
  return '#AF52DE'
}

function fmtBytes(b) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

// ── Modals ─────────────────────────────────────────────────────────────────────
function TextInputModal({ title, placeholder, initial = '', confirmLabel = 'Save', onConfirm, onClose }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-hig-card rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full sm:w-80">
        <p className="font-semibold text-hig-navy mb-4">{title}</p>
        <input
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()) }}
          placeholder={placeholder}
          className="w-full border border-hig-gray-4 rounded-xl px-3 py-3 text-hig-subhead text-hig-text outline-none focus:border-hig-blue mb-4"
          style={{ fontSize: 16 /* prevents iOS zoom */ }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-hig-subhead rounded-xl text-hig-text-secondary font-medium bg-hig-bg">
            Cancel
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
            className="flex-1 py-3 text-hig-subhead rounded-xl text-white font-medium bg-hig-blue hover:bg-blue-600 transition-colors disabled:opacity-40">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-hig-card rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full sm:w-80">
        <p className="text-hig-text text-hig-subhead mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-hig-subhead rounded-xl text-hig-text-secondary font-medium bg-hig-bg">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-hig-subhead rounded-xl text-white font-medium bg-hig-red hover:bg-red-600 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Filter Bottom Sheet (mobile) ───────────────────────────────────────────────
function FilterSheet({ sortBy, sortDir, typeFilter, onSort, onTypeFilter, onClose }) {
  const sortOptions = [
    { k: 'name', l: 'Name' },
    { k: 'date', l: 'Date uploaded' },
    { k: 'size', l: 'File size' },
  ]
  const typeOptions = [
    { k: 'all',   l: 'All files' },
    { k: 'pdf',   l: 'PDF' },
    { k: 'image', l: 'Image' },
    { k: 'other', l: 'Other' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-hig-card rounded-t-3xl shadow-2xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-sm bg-hig-gray-4" />
        </div>
        <div className="px-5 pb-2 pt-2 flex items-center justify-between">
          <span className="text-hig-headline font-semibold text-hig-navy">Sort &amp; Filter</span>
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-full bg-hig-bg flex items-center justify-center border-none cursor-pointer">
            <X size={14} className="text-hig-text-secondary" />
          </button>
        </div>

        {/* Sort section */}
        <div className="px-5 pt-3 pb-2">
          <p className="text-hig-caption1 font-bold text-hig-text-secondary uppercase tracking-wider mb-2.5">Sort by</p>
          <div className="flex flex-col gap-1">
            {sortOptions.map(({ k, l }) => {
              const active = sortBy === k
              const dir = active ? sortDir : null
              return (
                <button key={k} onClick={() => onSort(k)}
                  className="flex items-center justify-between rounded-xl px-4 transition-colors"
                  style={{
                    height: 48,
                    background: active ? 'rgba(46,150,255,0.08)' : 'transparent',
                    border: `1px solid ${active ? '#2E96FF' : 'transparent'}`,
                    cursor: 'pointer',
                  }}>
                  <span style={{ fontSize: 15, color: active ? '#2E96FF' : undefined, fontWeight: active ? 600 : 400 }}
                    className={active ? '' : 'text-hig-text'}>{l}</span>
                  {active && (
                    <span className="text-hig-caption1 text-hig-blue">{dir === 'asc' ? '↑ A–Z' : '↓ Z–A'}</span>
                  )}
                  {!active && <ChevronRight size={16} className="text-hig-gray-4" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-hig-bg mx-5 my-2" />

        {/* Type section */}
        <div className="px-5 pt-2 pb-4">
          <p className="text-hig-caption1 font-bold text-hig-text-secondary uppercase tracking-wider mb-2.5">File type</p>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(({ k, l }) => {
              const active = typeFilter === k
              return (
                <button key={k} onClick={() => onTypeFilter(k)}
                  className="flex items-center gap-1.5 transition-all"
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 18,
                    border: `1px solid ${active ? '#2E96FF' : 'rgba(0,0,0,0.1)'}`,
                    background: active ? 'rgba(46,150,255,0.08)' : 'transparent',
                    color: active ? '#2E96FF' : undefined,
                    fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer',
                  }}>
                  {active && <Check size={13} style={{ flexShrink: 0 }} />}
                  {l}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sort Arrow (desktop) ───────────────────────────────────────────────────────
function SortArrow({ field, sortBy, sortDir }) {
  const active = sortBy === field
  if (!active) return <ChevronDown size={10} className="ml-0.5 shrink-0 text-hig-gray-4" />
  return sortDir === 'asc'
    ? <ChevronUp   size={10} className="ml-0.5 shrink-0 text-hig-blue" />
    : <ChevronDown size={10} className="ml-0.5 shrink-0 text-hig-blue" />
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-hig-card rounded-2xl overflow-hidden animate-pulse border border-black/[0.06]">
      <div className="h-[120px] bg-hig-bg" />
      <div className="px-3 pt-2.5 pb-3">
        <div className="h-3 bg-hig-bg rounded-md mb-1.5 w-[70%]" />
        <div className="h-2.5 bg-hig-bg rounded-md w-[45%]" />
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="bg-hig-card rounded-2xl overflow-hidden animate-pulse border border-black/[0.07]">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: i < 5 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
          <div className="w-8 h-8 rounded-lg bg-hig-bg shrink-0" />
          <div className="flex-1">
            <div className="h-2.5 bg-hig-bg rounded-md" style={{ width: `${50 + i * 10}%` }} />
          </div>
          <div className="w-9 h-5 rounded-full bg-hig-bg" />
        </div>
      ))}
    </div>
  )
}

// ── Folder Card ────────────────────────────────────────────────────────────────
function FolderCard({ folder, color, isAdmin, onOpen, onRename, onDelete, compact }) {
  return (
    <div
      className="group bg-hig-card rounded-2xl overflow-hidden cursor-pointer border border-black/[0.07]"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
      onClick={onOpen}
    >
      {/* Gradient thumbnail — color is dynamic per folder */}
      <div style={{
        height: compact ? 72 : 88,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: compact ? 40 : 48, height: compact ? 40 : 48,
          borderRadius: 13, background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Folder size={compact ? 20 : 22} style={{ color }} />
        </div>

        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={onRename}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-hig-text-secondary hover:text-hig-blue transition-colors"
              style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(6px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Pencil size={11} />
            </button>
            <button onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-hig-text-secondary hover:text-hig-red transition-colors"
              style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(6px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: compact ? '9px 12px 11px' : '11px 14px 13px' }}>
        <p className="text-hig-text font-semibold truncate mb-0.5"
          style={{ fontSize: compact ? 12 : 13 }}>
          {folder.name}
        </p>
        <p className="flex items-center gap-1 text-hig-text-secondary" style={{ fontSize: 10.5 }}>
          Open <ChevronRight size={9} />
        </p>
      </div>
    </div>
  )
}

// ── File Grid Card ─────────────────────────────────────────────────────────────
function GridCard({ file, token, isAdmin, isStarred, onOpen, onStar, onRename, onDelete, compact }) {
  const isPDF  = file.mime_type === 'application/pdf'
  const Icon   = fileIcon(file.mime_type)
  const color  = fileColor(file.mime_type)  // dynamic per mime type
  const label  = fileTypeLabel(file.mime_type)

  return (
    <div
      className="group bg-hig-card rounded-2xl overflow-hidden cursor-pointer border border-black/[0.07]"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: compact ? 120 : 148 }}>
        {isPDF ? (
          <PDFThumbnail fileId={file.id} token={token} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `${color}0D` }}>
            <Icon size={compact ? 32 : 38} style={{ color, opacity: 0.75 }} />
          </div>
        )}

        {/* Type badge — color is dynamic per mime type */}
        <div style={{
          position: 'absolute', bottom: 7, left: 8,
          fontSize: 9.5, fontWeight: 700, color,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
          padding: '2px 7px', borderRadius: 20, border: `1px solid ${color}28`,
          letterSpacing: '0.03em', pointerEvents: 'none',
        }}>
          {label}
        </div>

        {/* Star badge */}
        {isStarred && (
          <div className="absolute top-[7px] left-2 pointer-events-none">
            <Star size={12} fill="#FF9500" stroke="#FF9500" />
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={onRename}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-hig-text-secondary hover:text-hig-blue transition-colors"
              style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(6px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Pencil size={11} />
            </button>
            <button onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-hig-text-secondary hover:text-hig-red transition-colors"
              style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(6px)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-start gap-1.5">
          <button
            onClick={onStar}
            title={isStarred ? 'Unpin' : 'Pin'}
            className="shrink-0 mt-0.5 p-0.5 -m-0.5"
            style={{
              opacity: isStarred ? 1 : 0.2,
              transition: 'opacity 0.15s',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.2' }}>
            <Star size={12} fill={isStarred ? '#FF9500' : 'none'} stroke={isStarred ? '#FF9500' : '#C7C7CC'} strokeWidth={2} />
          </button>
          <p className="text-hig-text font-medium leading-tight"
            style={{
              fontSize: compact ? 11.5 : 12.5,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
            {file.name}
          </p>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-hig-text-secondary" style={{ fontSize: 10 }}>{fmtBytes(file.size)}</p>
          <p className="text-hig-gray-3" style={{ fontSize: 10 }}>{fmtDateShort(file.uploaded_at)}</p>
        </div>
      </div>
    </div>
  )
}

// ── File List Row ──────────────────────────────────────────────────────────────
function ListRow({ file, isLast, isAdmin, isStarred, onOpen, onStar, onRename, onDelete, isMobile }) {
  const Icon  = fileIcon(file.mime_type)
  const color = fileColor(file.mime_type)  // dynamic per mime type
  const label = fileTypeLabel(file.mime_type)

  return (
    <div
      className="group flex items-center cursor-pointer transition-colors hover:bg-gray-50"
      style={{
        padding: isMobile ? '12px 16px' : '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)',
        minHeight: isMobile ? 56 : 44,
      }}
      onClick={onOpen}
    >
      {/* Icon — color is dynamic */}
      <div style={{
        width: isMobile ? 36 : 30, height: isMobile ? 36 : 30,
        borderRadius: isMobile ? 9 : 7, flexShrink: 0,
        background: `${color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: isMobile ? 12 : 10,
      }}>
        <Icon size={isMobile ? 17 : 14} style={{ color }} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0 mr-2">
        <span className="text-hig-text font-medium overflow-hidden text-ellipsis whitespace-nowrap block"
          style={{ fontSize: isMobile ? 14 : 13 }}>
          {file.name}
        </span>
        {isMobile && (
          <span className="text-hig-text-secondary" style={{ fontSize: 11.5 }}>
            {fmtBytes(file.size)} · {fmtDateShort(file.uploaded_at)}
          </span>
        )}
      </div>

      {/* Type badge — color is dynamic */}
      <div className="shrink-0" style={{ marginRight: isMobile ? 8 : 0 }}>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color,
          background: `${color}12`, padding: '2px 8px', borderRadius: 20,
        }}>
          {label}
        </span>
      </div>

      {/* Desktop: Size */}
      {!isMobile && (
        <div className="text-hig-text-secondary shrink-0" style={{ width: 70, fontSize: 12 }}>
          {fmtBytes(file.size)}
        </div>
      )}

      {/* Desktop: Date */}
      {!isMobile && (
        <div className="text-hig-text-secondary shrink-0" style={{ width: 112, fontSize: 12 }}>
          {fmtDate(file.uploaded_at)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 ml-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onStar}
          className="flex items-center justify-center rounded-lg w-8 h-8"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            opacity: isStarred ? 1 : 0.25, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.25' }}>
          <Star size={14} fill={isStarred ? '#FF9500' : 'none'} stroke={isStarred ? '#FF9500' : '#C7C7CC'} strokeWidth={2} />
        </button>

        {isAdmin && (
          <>
            <button onClick={onRename}
              className="flex items-center justify-center rounded-lg w-8 h-8 opacity-0 group-hover:opacity-100 text-hig-text-secondary hover:text-hig-blue transition-all"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <Pencil size={13} />
            </button>
            <button onClick={onDelete}
              className="flex items-center justify-center rounded-lg w-8 h-8 opacity-0 group-hover:opacity-100 text-hig-text-secondary hover:text-hig-red transition-all"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Section divider ────────────────────────────────────────────────────────────
function SectionDivider({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      {icon}
      <span className="text-hig-caption2 font-bold text-hig-text-secondary uppercase tracking-widest">{label}</span>
      {count != null && (
        <span className="text-hig-caption2 font-semibold text-hig-text-secondary bg-black/[0.06] px-1.5 py-px rounded-full">{count}</span>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function KnowledgeLibraryPage() {
  const { token, isAdmin } = useAuth()
  const { addToast } = useToast()
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const fileInputRef = useRef(null)

  // Navigation state
  const [folderStack,    setFolderStack]    = useState([])
  const [subfolders,     setSubfolders]     = useState([])
  const [files,          setFiles]          = useState([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [modal,          setModal]          = useState(null)
  const [pdfViewer,      setPdfViewer]      = useState(null)
  const [imageViewer,    setImageViewer]    = useState(null)
  const [starredIds,     setStarredIds]     = useState(new Set())

  // Left panel drawer (tablet)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // View / filter / sort
  const [viewMode,       setViewMode]       = useState(() => { try { return localStorage.getItem('lib-view') || 'grid' } catch { return 'grid' } })
  const [search,         setSearch]         = useState('')
  const [mobileSearch,   setMobileSearch]   = useState(false)
  const [filterSheet,    setFilterSheet]    = useState(false)
  const [typeFilter,     setTypeFilter]     = useState('all')
  const [sortBy,         setSortBy]         = useState('name')
  const [sortDir,        setSortDir]        = useState('asc')
  const [isDragOver,     setIsDragOver]     = useState(false)

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const currentFolderName = folderStack.length > 0 ? folderStack[folderStack.length - 1].name : null
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Close drawer when going to desktop
  useEffect(() => { if (isDesktop) setDrawerOpen(false) }, [isDesktop])

  // Reset filters on folder change
  useEffect(() => {
    setSearch('')
    setTypeFilter('all')
    setSortBy('name')
    setSortDir('asc')
    setMobileSearch(false)
  }, [currentFolderId])

  // Navigation helpers
  function drillInto(folder) {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }])
    if (isMobile) setDrawerOpen(false)
  }
  function navigateTo(idx) { setFolderStack(prev => idx < 0 ? [] : prev.slice(0, idx + 1)) }
  function goBack() { setFolderStack(prev => prev.slice(0, -1)) }

  // Data fetching
  const loadSubfolders = useCallback(async (parentId) => {
    setLoadingFolders(true)
    try {
      const url = parentId ? `/api/library/folders?parentId=${parentId}` : '/api/library/folders'
      const res  = await fetch(url, { headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load folders')
      setSubfolders(data.folders ?? [])
    } catch (err) {
      addToast(err.message, 'error')
      setSubfolders([])
    } finally { setLoadingFolders(false) }
  }, [headers, addToast])

  const loadFiles = useCallback(async (folderId) => {
    setLoadingFiles(true)
    setFiles([])
    try {
      const res  = await fetch(`/api/library/folders/${folderId}/files`, { headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load files')
      const list = data.files ?? []
      setFiles(list)
      setStarredIds(new Set(list.filter(f => f.is_starred).map(f => f.id)))
    } catch (err) {
      addToast(err.message, 'error')
      setFiles([])
    } finally { setLoadingFiles(false) }
  }, [headers, addToast])

  useEffect(() => {
    loadSubfolders(currentFolderId)
    if (currentFolderId) loadFiles(currentFolderId)
    else setFiles([])
  }, [currentFolderId, loadSubfolders, loadFiles])

  // Shared response helper — reads the JSON body and throws with the server's
  // error message on non-2xx, so every caller can just try/catch.
  async function parseOrThrow(res, fallback) {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || fallback)
    return data
  }

  // Folder CRUD
  async function createFolder(name) {
    try {
      const res = await fetch('/api/library/folders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      })
      await parseOrThrow(res, 'Could not create folder')
      loadSubfolders(currentFolderId)
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function renameFolder(name) {
    try {
      const res = await fetch(`/api/library/folders/${modal.target.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      await parseOrThrow(res, 'Could not rename folder')
      setFolderStack(prev => prev.map(f => f.id === modal.target.id ? { ...f, name } : f))
      loadSubfolders(currentFolderId)
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function deleteFolder() {
    const tid = modal.target.id
    try {
      const res = await fetch(`/api/library/folders/${tid}`, { method: 'DELETE', headers })
      await parseOrThrow(res, 'Could not delete folder')
      const idx = folderStack.findIndex(f => f.id === tid)
      if (idx >= 0) setFolderStack(prev => prev.slice(0, idx))
      else loadSubfolders(currentFolderId)
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  // File CRUD
  async function uploadFiles(fileList) {
    if (!currentFolderId || !fileList.length) return
    setUploading(true)
    const files = Array.from(fileList)
    let succeeded = 0
    const failures = []

    for (const file of files) {
      if (file.size > UPLOAD_LIMITS.maxSize) {
        failures.push(`${file.name}: exceeds ${UPLOAD_LIMITS.maxSize / (1024 * 1024)}MB limit`)
        continue
      }
      if (file.type && !UPLOAD_LIMITS.allowedMimeTypes.has(file.type)) {
        failures.push(`${file.name}: file type not allowed`)
        continue
      }
      try {
        const fd = new FormData()
        fd.append('folderId', currentFolderId)
        fd.append('file', file)
        const res = await fetch('/api/library/files', { method: 'POST', headers, body: fd })
        await parseOrThrow(res, 'Upload failed')
        succeeded++
      } catch (err) {
        failures.push(`${file.name}: ${err.message}`)
      }
    }

    setUploading(false)
    if (succeeded) loadFiles(currentFolderId)

    if (failures.length === 0) {
      addToast(`${succeeded} file${succeeded === 1 ? '' : 's'} uploaded`, 'success')
    } else if (succeeded > 0) {
      addToast(`${succeeded} uploaded, ${failures.length} failed — ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1} more)` : ''}`, 'warning')
    } else {
      addToast(failures.length === 1 ? failures[0] : `${failures.length} files failed to upload`, 'error')
    }
  }

  async function renameFile(name) {
    try {
      const res = await fetch(`/api/library/files/${modal.target.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      await parseOrThrow(res, 'Could not rename file')
      loadFiles(currentFolderId)
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function deleteFile() {
    try {
      const res = await fetch(`/api/library/files/${modal.target.id}`, { method: 'DELETE', headers })
      await parseOrThrow(res, 'Could not delete file')
      loadFiles(currentFolderId)
      setModal(null)
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function toggleStar(e, fileId) {
    e.stopPropagation()
    setStarredIds(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n })
    try {
      const res = await fetch(`/api/library/files/${fileId}/star`, { method: 'POST', headers })
      if (!res.ok) throw new Error('Could not update star')
    } catch (err) {
      setStarredIds(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n })
      addToast(err.message, 'error')
    }
  }

  function openFile(file) {
    if (file.mime_type === 'application/pdf') {
      setPdfViewer({ fileId: file.id, fileName: file.name })
    } else if (file.mime_type?.startsWith('image/')) {
      setImageViewer({ fileId: file.id, fileName: file.name })
    } else {
      fetch(`/api/library/files/${file.id}/view`, { headers })
        .then(res => {
          if (!res.ok) throw new Error('Could not open file')
          return res.blob()
        })
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = file.name; a.click()
          URL.revokeObjectURL(url)
        })
        .catch(err => addToast(err.message, 'error'))
    }
  }

  function changeView(mode) { setViewMode(mode); try { localStorage.setItem('lib-view', mode) } catch {} }

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  // Drag & drop
  function handleDragOver(e) { if (!currentFolderId || !isAdmin) return; e.preventDefault(); setIsDragOver(true) }
  function handleDragLeave(e) { if (e.currentTarget.contains(e.relatedTarget)) return; setIsDragOver(false) }
  function handleDrop(e) {
    e.preventDefault(); setIsDragOver(false)
    if (!currentFolderId || !isAdmin) return
    const dropped = e.dataTransfer?.files
    if (dropped?.length) uploadFiles(dropped)
  }

  // Filtered + sorted files
  const filteredFiles = useMemo(() => {
    let r = [...files]
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(f => f.name.toLowerCase().includes(q)) }
    if (typeFilter !== 'all') r = r.filter(f => {
      if (typeFilter === 'pdf')   return f.mime_type === 'application/pdf'
      if (typeFilter === 'image') return !!f.mime_type?.startsWith('image/')
      if (typeFilter === 'other') return f.mime_type !== 'application/pdf' && !f.mime_type?.startsWith('image/')
      return true
    })
    r.sort((a, b) => {
      let va, vb
      if (sortBy === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase() }
      else if (sortBy === 'date') { va = new Date(a.uploaded_at || 0).getTime(); vb = new Date(b.uploaded_at || 0).getTime() }
      else { va = a.size || 0; vb = b.size || 0 }
      return (va < vb ? -1 : va > vb ? 1 : 0) * (sortDir === 'asc' ? 1 : -1)
    })
    return r
  }, [files, search, typeFilter, sortBy, sortDir])

  const pinnedFiles = useMemo(() => filteredFiles.filter(f =>  starredIds.has(f.id)), [filteredFiles, starredIds])
  const restFiles   = useMemo(() => filteredFiles.filter(f => !starredIds.has(f.id)), [filteredFiles, starredIds])
  const hasSections = pinnedFiles.length > 0 && restFiles.length > 0

  // Active filter count for mobile badge
  const activeFilterCount = [typeFilter !== 'all', sortBy !== 'name' || sortDir !== 'asc'].filter(Boolean).length

  // Grid column style — responsive (inline: grid-template-columns cannot be expressed as static Tailwind)
  function gridStyle() {
    if (isMobile) return { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }
    if (isTablet) return { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }
    return { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 14 }
  }

  // ── Folder Navigation Panel (shared between left sidebar and drawer) ──────────
  const FolderPanel = ({ inDrawer }) => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-hig-blue/10 flex items-center justify-center shrink-0">
            <Library size={15} className="text-hig-blue" />
          </div>
          <span className="text-hig-subhead font-semibold text-hig-navy">Knowledge Library</span>
        </div>
        {inDrawer && (
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-7 h-7 rounded-full bg-hig-bg flex items-center justify-center border-none cursor-pointer">
            <X size={13} className="text-hig-text-secondary" />
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      {folderStack.length > 0 && (
        <div className="px-3 py-2 border-b border-black/[0.05] bg-black/[0.018]">
          <div className="flex items-center flex-wrap gap-0.5">
            <button
              onClick={() => { navigateTo(-1); if (inDrawer) setDrawerOpen(false) }}
              className="px-1.5 py-0.5 rounded text-xs font-medium text-hig-text-secondary hover:text-hig-blue transition-colors">
              Library
            </button>
            {folderStack.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-0.5">
                <ChevronRight size={10} className="text-hig-gray-4" />
                <button
                  onClick={() => { navigateTo(i); if (inDrawer) setDrawerOpen(false) }}
                  className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors truncate max-w-[80px] hover:text-hig-blue"
                  style={{ color: i === folderStack.length - 1 ? '#2E96FF' : undefined }}
                  title={crumb.name}>
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.05]">
        <span className="text-hig-caption2 font-bold text-hig-text-secondary uppercase tracking-wider">
          {folderStack.length === 0 ? 'Folders' : 'Subfolders'}
        </span>
        {isAdmin && (
          <button
            onClick={() => setModal({ type: 'createFolder' })}
            className="w-6 h-6 rounded-md bg-hig-blue/10 flex items-center justify-center border-none cursor-pointer text-hig-blue">
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {loadingFolders ? (
          <div className="flex items-center justify-center py-10">
            <Loader size={15} className="animate-spin text-hig-gray-4" />
          </div>
        ) : subfolders.length === 0 ? (
          <div className="flex flex-col items-center py-10 px-4 gap-2">
            <FolderOpen size={24} strokeWidth={1.4} className="text-hig-gray-4" />
            <p className="text-hig-caption1 text-hig-text-secondary text-center">
              {isAdmin ? `No ${folderStack.length > 0 ? 'subfolders' : 'folders'} yet` : 'No folders available'}
            </p>
          </div>
        ) : (
          subfolders.map((folder, idx) => {
            const accent = FOLDER_PALETTE[idx % FOLDER_PALETTE.length]
            return (
              <div
                key={folder.id}
                className="group relative flex items-center mx-1.5 rounded-xl cursor-pointer transition-colors hover:bg-black/[0.04]"
                onClick={() => { drillInto(folder); if (inDrawer) setDrawerOpen(false) }}
              >
                {/* Accent bar — dynamic per folder */}
                <div className="absolute left-0 top-1 bottom-1 rounded-r w-[3px] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: accent }} />
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2.5 pl-4">
                  <Folder size={14} style={{ color: accent, flexShrink: 0 }} />
                  <span className="text-hig-subhead text-hig-text flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {folder.name}
                  </span>
                  {isAdmin ? (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setModal({ type: 'renameFolder', target: folder })}
                        className="w-6 h-6 flex items-center justify-center rounded text-hig-text-secondary hover:text-hig-blue transition-colors">
                        <Pencil size={10} />
                      </button>
                      <button onClick={() => setModal({ type: 'deleteFolder', target: folder })}
                        className="w-6 h-6 flex items-center justify-center rounded text-hig-text-secondary hover:text-hig-red transition-colors">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ) : (
                    <ChevronRight size={12} className="text-hig-gray-4 shrink-0" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )

  // ── Mobile Header Strip ────────────────────────────────────────────────────
  const MobileHeader = () => (
    <div className="bg-hig-card border-b border-black/[0.06]">
      <div className="flex items-center gap-2 px-4 h-[52px]">
        {/* Back or Library icon */}
        {folderStack.length > 0 ? (
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-[10px] bg-hig-blue/[0.08] flex items-center justify-center border-none cursor-pointer shrink-0">
            <ArrowLeft size={18} className="text-hig-blue" />
          </button>
        ) : (
          <div className="w-9 h-9 rounded-[10px] bg-hig-blue/10 flex items-center justify-center shrink-0">
            <Library size={17} className="text-hig-blue" />
          </div>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-hig-navy font-bold overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 16 }}>
            {currentFolderName || 'Knowledge Library'}
          </p>
          {folderStack.length > 1 && (
            <p className="text-hig-text-secondary overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 11 }}>
              {folderStack.slice(0, -1).map(f => f.name).join(' › ')}
            </p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search toggle — color depends on mobileSearch state */}
          {currentFolderId && (
            <button
              onClick={() => setMobileSearch(v => !v)}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center border-none cursor-pointer"
              style={{
                background: mobileSearch ? 'rgba(46,150,255,0.10)' : 'transparent',
                color: mobileSearch ? '#2E96FF' : undefined,
              }}>
              <Search size={18} className={mobileSearch ? '' : 'text-hig-text-secondary'} />
            </button>
          )}

          {/* Filter / sort — badge + color depend on activeFilterCount */}
          {currentFolderId && (
            <div className="relative">
              <button
                onClick={() => setFilterSheet(true)}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center border-none cursor-pointer"
                style={{
                  background: activeFilterCount > 0 ? 'rgba(46,150,255,0.10)' : 'transparent',
                  color: activeFilterCount > 0 ? '#2E96FF' : undefined,
                }}>
                <SlidersHorizontal size={18} className={activeFilterCount > 0 ? '' : 'text-hig-text-secondary'} />
              </button>
              {activeFilterCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-hig-blue border-2 border-white" />
              )}
            </div>
          )}

          {/* View toggle */}
          {currentFolderId && (
            <button
              onClick={() => changeView(viewMode === 'grid' ? 'list' : 'grid')}
              className="w-9 h-9 rounded-[10px] bg-transparent flex items-center justify-center border-none cursor-pointer text-hig-text-secondary">
              {viewMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
          )}

          {/* Folder panel toggle (tablet only) */}
          {isTablet && (
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="w-9 h-9 rounded-[10px] bg-transparent flex items-center justify-center border-none cursor-pointer text-hig-text-secondary">
              {drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable search bar */}
      {mobileSearch && currentFolderId && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary pointer-events-none" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search in this folder…"
              className="w-full pl-9 pr-9 py-2.5 text-hig-callout text-hig-navy rounded-xl outline-none"
              style={{
                border: '1.5px solid rgba(46,150,255,0.3)',
                background: 'rgba(46,150,255,0.04)',
                fontSize: 15,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hig-text-secondary bg-none border-none cursor-pointer p-1">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ── Desktop Toolbar ────────────────────────────────────────────────────────
  const DesktopToolbar = () => {
    if (!currentFolderId) return null
    return (
      <div
        className="flex items-center gap-2 px-5 bg-hig-card flex-wrap border-b border-black/[0.06]"
        style={{ minHeight: 52, paddingTop: 9, paddingBottom: 9 }}
      >
        {/* Breadcrumb */}
        <div className="min-w-0 mr-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => navigateTo(-1)}
              className="text-hig-text-secondary hover:text-hig-blue transition-colors"
              style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Library
            </button>
            {folderStack.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1 shrink-0">
                <span className="text-hig-gray-4" style={{ fontSize: 11 }}>/</span>
                <button
                  onClick={() => navigateTo(i)}
                  className="hover:text-hig-blue transition-colors truncate max-w-[120px]"
                  style={{
                    fontSize: 11,
                    fontWeight: i === folderStack.length - 1 ? 600 : 400,
                    color: i === folderStack.length - 1 ? '#1C1C1E' : undefined,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                  title={crumb.name}>
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
          {!loadingFiles && (
            <p className="text-hig-gray-3 mt-px" style={{ fontSize: 10.5 }}>
              {files.length} {files.length === 1 ? 'file' : 'files'}
              {filteredFiles.length !== files.length && ` · ${filteredFiles.length} shown`}
              {starredIds.size > 0 && ` · ${starredIds.size} pinned`}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-text-secondary pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files…"
              style={{
                paddingLeft: 26, paddingRight: search ? 26 : 10,
                paddingTop: 5, paddingBottom: 5,
                fontSize: 12, color: '#040E1C', width: 148,
                border: '1px solid rgba(0,0,0,0.11)', borderRadius: 8,
                outline: 'none', background: 'white', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#2E96FF' }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.11)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-hig-text-secondary bg-none border-none cursor-pointer p-0">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="w-px h-[18px] bg-black/[0.08] shrink-0" />

          {/* Type filter — active state drives inline color/bg */}
          <div className="flex items-center gap-[3px]">
            {[{ k: 'all', l: 'All' }, { k: 'pdf', l: 'PDF' }, { k: 'image', l: 'Image' }, { k: 'other', l: 'Other' }].map(({ k, l }) => {
              const on = typeFilter === k
              return (
                <button key={k} onClick={() => setTypeFilter(k)} style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                  border: `1px solid ${on ? '#2E96FF' : 'rgba(0,0,0,0.1)'}`,
                  background: on ? 'rgba(46,150,255,0.08)' : 'transparent',
                  color: on ? '#2E96FF' : undefined,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                className={on ? '' : 'text-hig-text-secondary'}>
                  {l}
                </button>
              )
            })}
          </div>

          <div className="w-px h-[18px] bg-black/[0.08] shrink-0" />

          {/* Sort — active state drives inline color/bg */}
          <div className="flex items-center rounded-lg overflow-hidden border border-black/[0.1]">
            {[{ k: 'name', l: 'Name' }, { k: 'date', l: 'Date' }, { k: 'size', l: 'Size' }].map(({ k, l }, i, arr) => {
              const on = sortBy === k
              return (
                <button key={k} onClick={() => toggleSort(k)}
                  style={{
                    padding: '4px 9px', fontSize: 11, fontWeight: on ? 600 : 500,
                    background: on ? 'rgba(46,150,255,0.1)' : 'transparent',
                    color: on ? '#2E96FF' : undefined,
                    border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s',
                  }}
                  className={on ? '' : 'text-hig-text-secondary'}>
                  {l}
                  {on
                    ? (sortDir === 'asc' ? <ChevronUp size={10} className="ml-px" /> : <ChevronDown size={10} className="ml-px" />)
                    : <ChevronDown size={10} className="ml-px opacity-30" />}
                </button>
              )
            })}
          </div>

          {/* View toggle — active state drives inline color/bg */}
          <div className="flex items-center rounded-lg overflow-hidden border border-black/[0.1]">
            {[{ mode: 'grid', Icon: LayoutGrid }, { mode: 'list', Icon: List }].map(({ mode, Icon }) => {
              const on = viewMode === mode
              return (
                <button key={mode} onClick={() => changeView(mode)}
                  className="w-7 h-7 flex items-center justify-center border-none cursor-pointer transition-all"
                  style={{
                    background: on ? 'rgba(46,150,255,0.1)' : 'transparent',
                    color: on ? '#2E96FF' : undefined,
                  }}>
                  <Icon size={13} className={on ? '' : 'text-hig-text-secondary'} />
                </button>
              )
            })}
          </div>

          {/* Upload */}
          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-medium text-hig-footnote bg-hig-blue hover:bg-blue-600 disabled:opacity-50 transition-colors">
                {uploading ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
            </>
          )}
        </div>
      </div>
    )
  }

  // ── File Content Renderer ──────────────────────────────────────────────────
  const FileContent = () => {
    if (loadingFiles) {
      return (
        <div style={{ padding: isMobile ? '14px 14px 0' : '20px 20px 0' }}>
          {viewMode === 'grid'
            ? <div style={gridStyle()}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            : <SkeletonList />
          }
        </div>
      )
    }

    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3.5" style={{ paddingTop: 80 }}>
          {isAdmin ? (
            <>
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-hig-gray-4 flex items-center justify-center">
                <Upload size={22} strokeWidth={1.4} className="text-hig-gray-4" />
              </div>
              <div className="text-center">
                <p className="text-hig-subhead font-medium text-hig-text-secondary mb-1">No files yet</p>
                <p className="text-hig-footnote text-hig-gray-3">
                  {isMobile ? 'Tap the + button to upload' : 'Drag & drop or click Upload to add files'}
                </p>
              </div>
            </>
          ) : (
            <>
              <FolderOpen size={36} strokeWidth={1.2} className="text-hig-gray-4" />
              <p className="text-hig-subhead text-hig-text-secondary">No files in this folder</p>
            </>
          )}
        </div>
      )
    }

    if (filteredFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3" style={{ paddingTop: 80 }}>
          <Search size={28} strokeWidth={1.3} className="text-hig-gray-4" />
          <p className="text-hig-subhead text-hig-text-secondary">No files match "{search}"</p>
          <button
            onClick={() => { setSearch(''); setTypeFilter('all') }}
            className="text-hig-subhead text-hig-blue bg-hig-blue/[0.08] border-none cursor-pointer px-4 py-2 rounded-lg">
            Clear filters
          </button>
        </div>
      )
    }

    const pad = isMobile ? '14px 14px 80px' : '20px 20px 20px'

    if (viewMode === 'grid') {
      return (
        <div style={{ padding: pad }}>
          {pinnedFiles.length > 0 && (
            <div style={{ marginBottom: hasSections ? 20 : 0 }}>
              {hasSections && <SectionDivider icon={<Star size={11} fill="#FF9500" stroke="#FF9500" />} label="Pinned" count={pinnedFiles.length} />}
              <div style={gridStyle()}>
                {pinnedFiles.map(f => (
                  <GridCard key={f.id} file={f} token={token} isAdmin={isAdmin} isStarred compact={isMobile}
                    onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                    onRename={() => setModal({ type: 'renameFile', target: f })}
                    onDelete={() => setModal({ type: 'deleteFile', target: f })} />
                ))}
              </div>
            </div>
          )}
          {restFiles.length > 0 && (
            <div>
              {hasSections && <SectionDivider label="All Files" count={restFiles.length} />}
              <div style={gridStyle()}>
                {restFiles.map(f => (
                  <GridCard key={f.id} file={f} token={token} isAdmin={isAdmin} isStarred={false} compact={isMobile}
                    onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                    onRename={() => setModal({ type: 'renameFile', target: f })}
                    onDelete={() => setModal({ type: 'deleteFile', target: f })} />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // List view
    return (
      <div style={{ padding: isMobile ? '14px 14px 80px' : '20px 20px 20px' }}>
        <div className="bg-hig-card rounded-2xl overflow-hidden border border-black/[0.07]"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Sortable header — desktop only */}
          {!isMobile && (
            <div className="flex items-center px-4 py-2 border-b border-black/[0.05] bg-gray-50">
              <button onClick={() => toggleSort('name')} className="flex items-center flex-1 bg-none border-none cursor-pointer p-0">
                <span className="uppercase tracking-wider font-bold"
                  style={{ fontSize: 10, color: sortBy === 'name' ? '#2E96FF' : undefined }}
                  {...(sortBy !== 'name' && { className: 'text-hig-text-secondary uppercase tracking-wider font-bold' })}>
                  Name
                </span>
                <SortArrow field="name" sortBy={sortBy} sortDir={sortDir} />
              </button>
              <div className="text-hig-text-secondary uppercase tracking-wider font-bold" style={{ width: 58, fontSize: 10 }}>Type</div>
              <button onClick={() => toggleSort('size')} className="flex items-center bg-none border-none cursor-pointer p-0" style={{ width: 70 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: sortBy === 'size' ? '#2E96FF' : undefined }}
                  className={sortBy !== 'size' ? 'text-hig-text-secondary uppercase tracking-wider' : 'uppercase tracking-wider'}>
                  Size
                </span>
                <SortArrow field="size" sortBy={sortBy} sortDir={sortDir} />
              </button>
              <button onClick={() => toggleSort('date')} className="flex items-center bg-none border-none cursor-pointer p-0" style={{ width: 112 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: sortBy === 'date' ? '#2E96FF' : undefined }}
                  className={sortBy !== 'date' ? 'text-hig-text-secondary uppercase tracking-wider' : 'uppercase tracking-wider'}>
                  Uploaded
                </span>
                <SortArrow field="date" sortBy={sortBy} sortDir={sortDir} />
              </button>
              <div style={{ width: isAdmin ? 104 : 36 }} />
            </div>
          )}

          {/* Pinned rows */}
          {pinnedFiles.length > 0 && (
            <>
              {hasSections && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-black/[0.04]"
                  style={{ background: 'rgba(255,149,0,0.04)' }}>
                  <Star size={10} fill="#FF9500" stroke="#FF9500" />
                  <span className="text-hig-caption2 font-bold uppercase tracking-widest" style={{ color: '#FF9500' }}>Pinned</span>
                </div>
              )}
              {pinnedFiles.map((f, i) => (
                <ListRow key={f.id} file={f} isLast={!hasSections && i === pinnedFiles.length - 1}
                  isAdmin={isAdmin} isStarred isMobile={isMobile}
                  onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                  onRename={() => setModal({ type: 'renameFile', target: f })}
                  onDelete={() => setModal({ type: 'deleteFile', target: f })} />
              ))}
            </>
          )}

          {/* Rest rows */}
          {restFiles.length > 0 && (
            <>
              {hasSections && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-black/[0.04]">
                  <span className="text-hig-caption2 font-bold text-hig-text-secondary uppercase tracking-widest">All Files</span>
                </div>
              )}
              {restFiles.map((f, i) => (
                <ListRow key={f.id} file={f} isLast={i === restFiles.length - 1}
                  isAdmin={isAdmin} isStarred={false} isMobile={isMobile}
                  onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                  onRename={() => setModal({ type: 'renameFile', target: f })}
                  onDelete={() => setModal({ type: 'deleteFile', target: f })} />
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Root Folder Gallery ────────────────────────────────────────────────────
  const RootGallery = () => (
    <div style={{ padding: isMobile ? '20px 14px 80px' : '28px 24px' }}>
      {loadingFolders ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? 10 : 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Gallery header — desktop */}
          {isDesktop && (
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-hig-title3 text-hig-navy mb-1">Knowledge Library</h1>
                <p className="text-hig-footnote text-hig-text-secondary">
                  {subfolders.length === 0 ? 'No folders yet' : `${subfolders.length} ${subfolders.length === 1 ? 'folder' : 'folders'}`}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: 'createFolder' })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white bg-hig-blue hover:bg-blue-600 transition-colors text-hig-footnote">
                  <Plus size={14} /> New Folder
                </button>
              )}
            </div>
          )}

          {/* Mobile section label */}
          {isMobile && subfolders.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-hig-caption1 font-bold text-hig-text-secondary uppercase tracking-wider">
                {subfolders.length} {subfolders.length === 1 ? 'Folder' : 'Folders'}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: 'createFolder' })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border-none bg-hig-blue/10 text-hig-blue text-hig-caption1 font-semibold cursor-pointer">
                  <Plus size={12} /> New Folder
                </button>
              )}
            </div>
          )}

          {subfolders.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: isMobile ? 10 : 14,
            }}>
              {subfolders.map((folder, i) => (
                <FolderCard
                  key={folder.id} folder={folder}
                  color={FOLDER_PALETTE[i % FOLDER_PALETTE.length]}
                  isAdmin={isAdmin} compact={isMobile}
                  onOpen={() => drillInto(folder)}
                  onRename={() => setModal({ type: 'renameFolder', target: folder })}
                  onDelete={() => setModal({ type: 'deleteFolder', target: folder })}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4" style={{ paddingTop: 60 }}>
              <div className="w-16 h-16 rounded-2xl bg-hig-blue/[0.08] flex items-center justify-center">
                <Library size={28} strokeWidth={1.3} className="text-hig-blue opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-hig-callout font-semibold text-hig-text-secondary mb-1">Library is empty</p>
                <p className="text-hig-footnote text-hig-text-secondary">
                  {isAdmin ? 'Create your first folder to get started' : 'No folders have been created yet'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setModal({ type: 'createFolder' })}
                  className="px-6 py-2.5 rounded-xl bg-hig-blue text-white text-hig-subhead font-semibold border-none cursor-pointer hover:bg-blue-600 transition-colors">
                  Create Folder
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── Subfolder Pills Strip ──────────────────────────────────────────────────
  const SubfolderPills = () => {
    if (loadingFolders || subfolders.length === 0) return null
    return (
      <div className="border-b border-black/[0.05] bg-hig-card"
        style={{ padding: isMobile ? '10px 14px 0' : '12px 20px 0' }}>
        <p className="text-hig-caption2 font-bold text-hig-gray-3 uppercase tracking-wider mb-2">Subfolders</p>
        <div className="flex gap-1.5 overflow-x-auto pb-2.5 uw-no-scrollbar">
          {subfolders.map((sf, i) => (
            <button
              key={sf.id}
              onClick={() => drillInto(sf)}
              className="flex items-center gap-1.5 transition-all shrink-0 min-h-[34px]"
              style={{
                padding: '6px 12px 6px 9px', borderRadius: 20,
                border: '1px solid rgba(0,0,0,0.1)', background: 'white',
                cursor: 'pointer', fontSize: isMobile ? 13 : 12, color: '#374151',
              }}
              onMouseEnter={e => {
                const c = FOLDER_PALETTE[i % FOLDER_PALETTE.length]
                e.currentTarget.style.borderColor = c
                e.currentTarget.style.color = c
                e.currentTarget.style.background = `${c}08`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
                e.currentTarget.style.color = '#374151'
                e.currentTarget.style.background = 'white'
              }}>
              <Folder size={12} style={{ color: FOLDER_PALETTE[i % FOLDER_PALETTE.length], flexShrink: 0 }} />
              {sf.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-hig-bg relative overflow-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT PANEL — desktop: persistent | tablet: drawer | mobile: hidden
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Tablet drawer backdrop */}
      {isTablet && drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Persistent sidebar (desktop) */}
      {isDesktop && (
        <div className="shrink-0 flex flex-col z-10 border-r border-black/[0.07]"
          style={{ width: 240, background: '#FAFAFA' }}>
          <FolderPanel inDrawer={false} />
        </div>
      )}

      {/* Drawer (tablet) — transform is dynamic based on drawerOpen state */}
      {isTablet && (
        <div
          className="fixed left-0 top-0 bottom-0 flex flex-col z-50 border-r border-black/[0.07]"
          style={{
            width: 260,
            background: '#FAFAFA',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: drawerOpen ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          <FolderPanel inDrawer={true} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT PANEL
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile / Tablet header (< desktop) */}
        {!isDesktop && <MobileHeader />}

        {/* Desktop toolbar */}
        {isDesktop && <DesktopToolbar />}

        {/* Content area */}
        <div
          className="flex-1 overflow-y-auto relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag-and-drop overlay */}
          {isDragOver && currentFolderId && isAdmin && (
            <div className="absolute z-40 flex flex-col items-center justify-center gap-2.5 pointer-events-none"
              style={{
                inset: 10,
                background: 'rgba(46,150,255,0.06)',
                border: '2px dashed #2E96FF',
                borderRadius: 14,
              }}>
              <div className="w-[52px] h-[52px] rounded-2xl bg-hig-blue/[0.12] flex items-center justify-center">
                <Upload size={22} className="text-hig-blue" />
              </div>
              <p className="text-hig-subhead font-semibold text-hig-blue">Drop to upload</p>
              <p className="text-hig-footnote text-blue-400">into {folderStack[folderStack.length - 1]?.name}</p>
            </div>
          )}

          {/* Root view */}
          {!currentFolderId && <RootGallery />}

          {/* Inside a folder */}
          {currentFolderId && (
            <div>
              <SubfolderPills />
              <FileContent />
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Admin FAB (upload) ──────────────────────────────────────── */}
      {isAdmin && currentFolderId && !isDesktop && (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="fixed z-30 flex items-center justify-center text-white border-none cursor-pointer hover:scale-105 transition-transform"
            style={{
              bottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)',
              right: 16,
              width: 52, height: 52, borderRadius: 26,
              background: uploading ? '#9CA3AF' : '#2E96FF',
              boxShadow: '0 4px 16px rgba(46,150,255,0.40)',
            }}>
            {uploading
              ? <Loader size={20} className="animate-spin" />
              : <Upload size={20} />}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
        </>
      )}

      {/* Desktop file input (FAB not shown, it's in toolbar) */}
      {isAdmin && isDesktop && (
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
      )}

      {/* ── Filter Bottom Sheet (mobile/tablet) ────────────────────────────── */}
      {filterSheet && (
        <FilterSheet
          sortBy={sortBy} sortDir={sortDir} typeFilter={typeFilter}
          onSort={field => toggleSort(field)}
          onTypeFilter={k => setTypeFilter(k)}
          onClose={() => setFilterSheet(false)}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal?.type === 'createFolder' && (
        <TextInputModal
          title={currentFolderId ? `New Subfolder in "${folderStack[folderStack.length - 1].name}"` : 'New Folder'}
          placeholder="Folder name" confirmLabel="Create"
          onConfirm={createFolder} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'renameFolder' && (
        <TextInputModal title="Rename Folder" placeholder="Folder name"
          initial={modal.target.name} onConfirm={renameFolder} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteFolder' && (
        <ConfirmModal message={`Delete "${modal.target.name}" and all its contents? This cannot be undone.`}
          onConfirm={deleteFolder} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'renameFile' && (
        <TextInputModal title="Rename File" placeholder="File name"
          initial={modal.target.name} onConfirm={renameFile} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteFile' && (
        <ConfirmModal message={`Delete "${modal.target.name}"? This cannot be undone.`}
          onConfirm={deleteFile} onClose={() => setModal(null)} />
      )}

      {/* ── PDF Viewer ──────────────────────────────────────────────────────── */}
      {pdfViewer && (
        <SecurePDFViewerModal
          title={pdfViewer.fileName}
          endpoint={`/api/library/files/${pdfViewer.fileId}/view`}
          scrollMode
          onClose={() => setPdfViewer(null)} />
      )}

      {/* ── Image Viewer ────────────────────────────────────────────────────── */}
      {imageViewer && (
        <ImageViewerModal
          title={imageViewer.fileName}
          endpoint={`/api/library/files/${imageViewer.fileId}/view`}
          onClose={() => setImageViewer(null)} />
      )}
    </div>
  )
}
