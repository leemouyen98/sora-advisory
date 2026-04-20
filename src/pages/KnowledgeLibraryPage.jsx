/**
 * KnowledgeLibraryPage — full redesign
 * ──────────────────────────────────────
 * Layout:
 *   Left panel  — folder navigation (breadcrumb + folder list)
 *   Right panel — root: visual folder gallery | folder open: file browser
 *
 * New in this redesign:
 *   • Root level shows a folder gallery (coloured cards) instead of empty state
 *   • Subfolder pill strip inside folders for inline navigation
 *   • Breadcrumb path shown in right-panel toolbar (not just left sidebar)
 *   • Left panel uses #FAFAFA bg, left-accent hover on folder items
 *   • Sort controls — Name / Date / Size with direction, clickable list headers
 *   • Date column in list view (uploaded_at)
 *   • Drag & drop upload with overlay
 *   • Starred files pinned at top in "Pinned" section
 *   • File-type badge chip on grid card thumbnails
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FolderOpen, Folder, Plus, Pencil, Trash2, Upload,
  FileText, FileImage, File, FileSpreadsheet, Loader, Library,
  ChevronRight, ChevronUp, ChevronDown, Star,
  LayoutGrid, List, Search, X, Download,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'
import PDFThumbnail from '../components/library/PDFThumbnail'

// ── Design tokens ──────────────────────────────────────────────────────────────
const BRAND = '#2E96FF'

// Colour palette for folder cards — cycles by index
const FOLDER_PALETTE = [
  '#2E96FF', '#34C759', '#FF9500', '#AF52DE',
  '#FF2D55', '#30B0C7', '#5856D6', '#FF6B35',
]

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

// ── Modals ─────────────────────────────────────────────────────────────────────
function TextInputModal({ title, placeholder, initial = '', confirmLabel = 'Save', onConfirm, onClose }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <p className="font-semibold text-[#040E1C] mb-4">{title}</p>
        <input ref={ref} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()) }}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2E96FF] mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} disabled={!value.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-[#2E96FF] text-white font-medium hover:bg-[#1a7ee0] disabled:opacity-40 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <p className="text-[#040E1C] text-sm mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm rounded-lg text-white font-medium bg-red-500 hover:bg-red-600 transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── Sort icon ──────────────────────────────────────────────────────────────────
function SortArrow({ field, sortBy, sortDir }) {
  const active = sortBy === field
  if (!active) return <ChevronDown size={10} style={{ color: '#D1D5DB', marginLeft: 2, flexShrink: 0 }} />
  return sortDir === 'asc'
    ? <ChevronUp size={10} style={{ color: BRAND, marginLeft: 2, flexShrink: 0 }} />
    : <ChevronDown size={10} style={{ color: BRAND, marginLeft: 2, flexShrink: 0 }} />
}

// ── Folder Card (gallery view) ─────────────────────────────────────────────────
function FolderCard({ folder, color, isAdmin, onOpen, onRename, onDelete }) {
  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
      onClick={onOpen}
    >
      {/* Gradient thumbnail */}
      <div style={{
        height: 90,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 15,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Folder size={24} style={{ color }} />
        </div>

        {/* Admin actions — top-right on hover */}
        {isAdmin && (
          <div
            className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onRename}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-[#2E96FF] transition-colors"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Pencil size={10} />
            </button>
            <button onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{ padding: '11px 14px 13px' }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: '#111827',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {folder.name}
        </p>
        <p className="flex items-center gap-1" style={{ fontSize: 11, color: '#9CA3AF' }}>
          Open folder <ChevronRight size={10} />
        </p>
      </div>
    </div>
  )
}

// ── File Grid Card ─────────────────────────────────────────────────────────────
function GridCard({ file, token, isAdmin, isStarred, onOpen, onStar, onRename, onDelete }) {
  const isPDF  = file.mime_type === 'application/pdf'
  const Icon   = fileIcon(file.mime_type)
  const color  = fileColor(file.mime_type)
  const label  = fileTypeLabel(file.mime_type)

  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', height: 148, overflow: 'hidden' }}>
        {isPDF ? (
          <PDFThumbnail fileId={file.id} token={token} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `${color}0D`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={38} style={{ color, opacity: 0.75 }} />
          </div>
        )}

        {/* Type badge — bottom-left */}
        <div style={{
          position: 'absolute', bottom: 7, left: 8,
          fontSize: 9.5, fontWeight: 700, color,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(4px)',
          padding: '2px 7px', borderRadius: 20,
          border: `1px solid ${color}28`,
          letterSpacing: '0.03em',
          pointerEvents: 'none',
        }}>
          {label}
        </div>

        {/* Admin actions — top-right on hover */}
        {isAdmin && (
          <div
            className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onRename}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2E96FF] transition-colors"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Pencil size={10} />
            </button>
            <button onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-500 transition-colors"
              style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{ padding: '9px 12px 11px' }}>
        <div className="flex items-start gap-1.5">
          <button
            onClick={onStar}
            title={isStarred ? 'Unpin' : 'Pin'}
            className="shrink-0 mt-0.5"
            style={{ opacity: isStarred ? 1 : 0.25, transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.25' }}
          >
            <Star size={12} fill={isStarred ? '#FF9500' : 'none'} stroke={isStarred ? '#FF9500' : '#C7C7CC'} strokeWidth={2} />
          </button>
          <p style={{
            fontSize: 12, fontWeight: 500, color: '#111827',
            lineHeight: 1.35, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {file.name}
          </p>
        </div>
        <div className="flex items-center justify-between" style={{ marginTop: 5 }}>
          <p style={{ fontSize: 10.5, color: '#9CA3AF' }}>{fmtBytes(file.size)}</p>
          <p style={{ fontSize: 10.5, color: '#C4C4C4' }}>{fmtDate(file.uploaded_at)}</p>
        </div>
      </div>
    </div>
  )
}

// ── File List Row ──────────────────────────────────────────────────────────────
function ListRow({ file, isLast, isAdmin, isStarred, onOpen, onStar, onRename, onDelete }) {
  const Icon  = fileIcon(file.mime_type)
  const color = fileColor(file.mime_type)
  const label = fileTypeLabel(file.mime_type)
  const isPDF = file.mime_type === 'application/pdf'

  return (
    <div
      className="group flex items-center px-4 py-2.5 cursor-pointer transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      onClick={onOpen}
    >
      {/* Icon + name */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${color}12`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </span>
      </div>

      {/* Type */}
      <div style={{ width: 58, flexShrink: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color, background: `${color}12`, padding: '2px 7px', borderRadius: 20 }}>
          {label}
        </span>
      </div>

      {/* Size */}
      <div style={{ width: 70, fontSize: 12, color: '#6B7280', flexShrink: 0 }}>
        {fmtBytes(file.size)}
      </div>

      {/* Uploaded */}
      <div style={{ width: 112, fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>
        {fmtDate(file.uploaded_at)}
      </div>

      {/* Actions */}
      <div
        style={{ width: isAdmin ? 88 : 34, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onStar}
          className="w-6 h-6 flex items-center justify-center rounded-md"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: isStarred ? 1 : 0.25, transition: 'opacity 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.25' }}>
          <Star size={13} fill={isStarred ? '#FF9500' : 'none'} stroke={isStarred ? '#FF9500' : '#C7C7CC'} strokeWidth={2} />
        </button>

        {!isPDF && (
          <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#C7C7CC' }}>
            <Download size={11} />
          </span>
        )}

        {isAdmin && (
          <>
            <button onClick={onRename}
              className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:text-[#2E96FF] transition-all"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
              <Pencil size={12} />
            </button>
            <button onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Section divider label ──────────────────────────────────────────────────────
function SectionDivider({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
      {icon}
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      {count != null && (
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: 20 }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function KnowledgeLibraryPage() {
  const { token, isAdmin } = useAuth()
  const fileInputRef = useRef(null)

  // Navigation
  const [folderStack,    setFolderStack]    = useState([])
  const [subfolders,     setSubfolders]     = useState([])
  const [files,          setFiles]          = useState([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [modal,          setModal]          = useState(null)
  const [pdfViewer,      setPdfViewer]      = useState(null)
  const [starredIds,     setStarredIds]     = useState(new Set())

  // View / filter / sort
  const [viewMode,    setViewMode]    = useState(() => { try { return localStorage.getItem('lib-view') || 'grid' } catch { return 'grid' } })
  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState('all')
  const [sortBy,      setSortBy]      = useState('name')
  const [sortDir,     setSortDir]     = useState('asc')
  const [isDragOver,  setIsDragOver]  = useState(false)

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Reset filters on folder change
  useEffect(() => { setSearch(''); setTypeFilter('all'); setSortBy('name'); setSortDir('asc') }, [currentFolderId])

  // Navigation helpers
  function drillInto(folder) { setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]) }
  function navigateTo(idx)   { setFolderStack(prev => idx < 0 ? [] : prev.slice(0, idx + 1)) }

  // Data fetching
  const loadSubfolders = useCallback(async (parentId) => {
    setLoadingFolders(true)
    try {
      const url = parentId ? `/api/library/folders?parentId=${parentId}` : '/api/library/folders'
      const res  = await fetch(url, { headers })
      const data = await res.json()
      setSubfolders(data.folders ?? [])
    } finally { setLoadingFolders(false) }
  }, [headers])

  const loadFiles = useCallback(async (folderId) => {
    setLoadingFiles(true)
    setFiles([])
    try {
      const res  = await fetch(`/api/library/folders/${folderId}/files`, { headers })
      const data = await res.json()
      const list = data.files ?? []
      setFiles(list)
      setStarredIds(new Set(list.filter(f => f.is_starred).map(f => f.id)))
    } finally { setLoadingFiles(false) }
  }, [headers])

  useEffect(() => {
    loadSubfolders(currentFolderId)
    if (currentFolderId) loadFiles(currentFolderId)
    else setFiles([])
  }, [currentFolderId, loadSubfolders, loadFiles])

  // Folder CRUD
  async function createFolder(name) {
    const res = await fetch('/api/library/folders', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: currentFolderId }),
    })
    if (res.ok) { loadSubfolders(currentFolderId); setModal(null) }
  }

  async function renameFolder(name) {
    const res = await fetch(`/api/library/folders/${modal.target.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setFolderStack(prev => prev.map(f => f.id === modal.target.id ? { ...f, name } : f))
      loadSubfolders(currentFolderId)
      setModal(null)
    }
  }

  async function deleteFolder() {
    const tid = modal.target.id
    const res = await fetch(`/api/library/folders/${tid}`, { method: 'DELETE', headers })
    if (res.ok) {
      const idx = folderStack.findIndex(f => f.id === tid)
      if (idx >= 0) setFolderStack(prev => prev.slice(0, idx))
      else loadSubfolders(currentFolderId)
      setModal(null)
    }
  }

  // File CRUD
  async function uploadFiles(fileList) {
    if (!currentFolderId || !fileList.length) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('folderId', currentFolderId)
      fd.append('file', file)
      await fetch('/api/library/files', { method: 'POST', headers, body: fd })
    }
    setUploading(false)
    loadFiles(currentFolderId)
  }

  async function renameFile(name) {
    const res = await fetch(`/api/library/files/${modal.target.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) { loadFiles(currentFolderId); setModal(null) }
  }

  async function deleteFile() {
    const res = await fetch(`/api/library/files/${modal.target.id}`, { method: 'DELETE', headers })
    if (res.ok) { loadFiles(currentFolderId); setModal(null) }
  }

  async function toggleStar(e, fileId) {
    e.stopPropagation()
    setStarredIds(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n })
    try {
      await fetch(`/api/library/files/${fileId}/star`, { method: 'POST', headers })
    } catch {
      setStarredIds(prev => { const n = new Set(prev); n.has(fileId) ? n.delete(fileId) : n.add(fileId); return n })
    }
  }

  function openFile(file) {
    if (file.mime_type === 'application/pdf') {
      setPdfViewer({ fileId: file.id, fileName: file.name })
    } else {
      fetch(`/api/library/files/${file.id}/view`, { headers })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = file.name; a.click()
          URL.revokeObjectURL(url)
        })
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

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#F2F2F7' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          LEFT PANEL — folder navigation
          ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-60 shrink-0 flex flex-col"
        style={{ background: '#FAFAFA', borderRight: '1px solid rgba(0,0,0,0.07)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(46,150,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Library size={15} style={{ color: BRAND }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#040E1C' }}>Knowledge Library</span>
        </div>

        {/* Breadcrumb — when drilled in */}
        {folderStack.length > 0 && (
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.018)' }}>
            <div className="flex items-center flex-wrap gap-0.5">
              <button onClick={() => navigateTo(-1)}
                className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors hover:text-[#2E96FF]"
                style={{ color: '#6B7280' }}>
                Library
              </button>
              {folderStack.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-0.5">
                  <ChevronRight size={10} style={{ color: '#D1D5DB' }} />
                  <button onClick={() => navigateTo(i)}
                    className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors truncate max-w-[80px]"
                    style={{ color: i === folderStack.length - 1 ? BRAND : '#6B7280' }}
                    title={crumb.name}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {folderStack.length === 0 ? 'Folders' : 'Subfolders'}
          </span>
          {isAdmin && (
            <button onClick={() => setModal({ type: 'createFolder' })}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#2E96FF]/10"
              style={{ color: BRAND }}
              title={`New ${folderStack.length > 0 ? 'subfolder' : 'folder'}`}>
              <Plus size={13} />
            </button>
          )}
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto py-1.5">
          {loadingFolders ? (
            <div className="flex items-center justify-center py-10">
              <Loader size={15} className="animate-spin" style={{ color: '#D1D5DB' }} />
            </div>
          ) : subfolders.length === 0 ? (
            <div className="flex flex-col items-center py-10 px-4 gap-2">
              <FolderOpen size={24} strokeWidth={1.4} style={{ color: '#D1D5DB' }} />
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                {isAdmin ? `No ${folderStack.length > 0 ? 'subfolders' : 'folders'} yet` : 'No folders available'}
              </p>
            </div>
          ) : (
            subfolders.map((folder, idx) => {
              const accent = FOLDER_PALETTE[idx % FOLDER_PALETTE.length]
              return (
                <div
                  key={folder.id}
                  className="group relative flex items-center mx-1.5 rounded-lg cursor-pointer transition-colors"
                  onClick={() => drillInto(folder)}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Hover accent bar */}
                  <div
                    className="absolute left-0 top-1 bottom-1 rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ width: 3, background: accent }}
                  />

                  <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2 pl-4">
                    <Folder size={14} style={{ color: accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folder.name}
                    </span>

                    {isAdmin ? (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setModal({ type: 'renameFolder', target: folder })}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#2E96FF] transition-colors">
                          <Pencil size={10} />
                        </button>
                        <button onClick={() => setModal({ type: 'deleteFolder', target: folder })}
                          className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <ChevronRight size={12} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          RIGHT PANEL
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Toolbar (only when inside a folder) ────────────────────────── */}
        {currentFolderId && (
          <div
            className="flex items-center gap-2.5 px-5 bg-white flex-wrap"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', minHeight: 52, paddingTop: 9, paddingBottom: 9 }}
          >
            {/* Breadcrumb path */}
            <div style={{ minWidth: 0, marginRight: 6 }}>
              <div className="flex items-center gap-1 flex-wrap">
                <button onClick={() => navigateTo(-1)}
                  style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  className="hover:text-[#2E96FF] transition-colors">
                  Library
                </button>
                {folderStack.map((crumb, i) => (
                  <span key={crumb.id} className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: '#D1D5DB' }}>/</span>
                    <button
                      onClick={() => navigateTo(i)}
                      style={{
                        fontSize: 11, fontWeight: i === folderStack.length - 1 ? 600 : 400,
                        color: i === folderStack.length - 1 ? '#111827' : '#9CA3AF',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}
                      className="hover:text-[#2E96FF] transition-colors truncate max-w-[120px]"
                      title={crumb.name}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
              {!loadingFiles && (
                <p style={{ fontSize: 10.5, color: '#C4C4C4', marginTop: 1 }}>
                  {files.length} {files.length === 1 ? 'file' : 'files'}
                  {filteredFiles.length !== files.length && ` · ${filteredFiles.length} shown`}
                  {starredIds.size > 0 && ` · ${starredIds.size} pinned`}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 ml-auto flex-wrap">

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search files…"
                  style={{
                    paddingLeft: 26, paddingRight: search ? 26 : 10, paddingTop: 5, paddingBottom: 5,
                    fontSize: 12, color: '#040E1C', width: 148,
                    border: '1px solid rgba(0,0,0,0.11)', borderRadius: 8,
                    outline: 'none', background: 'white', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = BRAND }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.11)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Thin divider */}
              <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

              {/* Type filter */}
              <div className="flex items-center" style={{ gap: 3 }}>
                {[{ k: 'all', l: 'All' }, { k: 'pdf', l: 'PDF' }, { k: 'image', l: 'Image' }, { k: 'other', l: 'Other' }].map(({ k, l }) => {
                  const on = typeFilter === k
                  return (
                    <button key={k} onClick={() => setTypeFilter(k)} style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20,
                      border: `1px solid ${on ? BRAND : 'rgba(0,0,0,0.1)'}`,
                      background: on ? 'rgba(46,150,255,0.08)' : 'transparent',
                      color: on ? BRAND : '#6B7280', cursor: 'pointer', transition: 'all 0.12s',
                    }}>
                      {l}
                    </button>
                  )
                })}
              </div>

              {/* Thin divider */}
              <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />

              {/* Sort */}
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                {[{ k: 'name', l: 'Name' }, { k: 'date', l: 'Date' }, { k: 'size', l: 'Size' }].map(({ k, l }, i, arr) => {
                  const on = sortBy === k
                  return (
                    <button key={k} onClick={() => toggleSort(k)}
                      style={{
                        padding: '4px 9px', fontSize: 11, fontWeight: on ? 600 : 500,
                        background: on ? 'rgba(46,150,255,0.1)' : 'transparent',
                        color: on ? BRAND : '#6B7280',
                        border: 'none',
                        borderRight: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.12s',
                      }}>
                      {l}
                      {on
                        ? (sortDir === 'asc' ? <ChevronUp size={10} style={{ marginLeft: 1 }} /> : <ChevronDown size={10} style={{ marginLeft: 1 }} />)
                        : <ChevronDown size={10} style={{ marginLeft: 1, opacity: 0.3 }} />
                      }
                    </button>
                  )
                })}
              </div>

              {/* View toggle */}
              <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                {[{ mode: 'grid', Icon: LayoutGrid, title: 'Grid' }, { mode: 'list', Icon: List, title: 'List' }].map(({ mode, Icon, title }) => {
                  const on = viewMode === mode
                  return (
                    <button key={mode} onClick={() => changeView(mode)} title={title}
                      style={{
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: on ? 'rgba(46,150,255,0.1)' : 'transparent',
                        color: on ? BRAND : '#9CA3AF',
                        border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                      }}>
                      <Icon size={13} />
                    </button>
                  )
                })}
              </div>

              {/* Upload */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 transition-colors"
                    style={{ background: BRAND, fontSize: 12 }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = '#1a7ee0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = BRAND }}>
                    {uploading ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden"
                    onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Content area ───────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ position: 'relative' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag-and-drop overlay */}
          {isDragOver && currentFolderId && isAdmin && (
            <div style={{
              position: 'absolute', inset: 10, zIndex: 40,
              background: 'rgba(46,150,255,0.06)', border: '2px dashed #2E96FF', borderRadius: 14,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 10, pointerEvents: 'none',
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(46,150,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={22} style={{ color: BRAND }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: BRAND }}>Drop to upload</p>
              <p style={{ fontSize: 12, color: '#60A5FA' }}>into {folderStack[folderStack.length - 1]?.name}</p>
            </div>
          )}

          {/* ─── ROOT: Folder Gallery ─────────────────────────────────── */}
          {!currentFolderId && (
            <div style={{ padding: '28px 24px' }}>

              {/* Loading */}
              {loadingFolders && (
                <div className="flex items-center justify-center" style={{ paddingTop: 60 }}>
                  <Loader size={22} className="animate-spin" style={{ color: '#D1D5DB' }} />
                </div>
              )}

              {/* Gallery header */}
              {!loadingFolders && (
                <>
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#040E1C', marginBottom: 4 }}>
                        Knowledge Library
                      </h1>
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                        {subfolders.length === 0
                          ? 'No folders yet'
                          : `${subfolders.length} ${subfolders.length === 1 ? 'folder' : 'folders'}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setModal({ type: 'createFolder' })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors text-white"
                        style={{ background: BRAND, fontSize: 13 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1a7ee0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = BRAND }}>
                        <Plus size={14} />
                        New Folder
                      </button>
                    )}
                  </div>

                  {/* Folder cards */}
                  {subfolders.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                      {subfolders.map((folder, i) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          color={FOLDER_PALETTE[i % FOLDER_PALETTE.length]}
                          isAdmin={isAdmin}
                          onOpen={() => drillInto(folder)}
                          onRename={() => setModal({ type: 'renameFolder', target: folder })}
                          onDelete={() => setModal({ type: 'deleteFolder', target: folder })}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center" style={{ paddingTop: 60, gap: 16 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(46,150,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Library size={28} strokeWidth={1.3} style={{ color: BRAND, opacity: 0.6 }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Library is empty</p>
                        <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                          {isAdmin ? 'Create your first folder to get started' : 'No folders have been created yet'}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── FOLDER OPEN: File Browser ────────────────────────────── */}
          {currentFolderId && (
            <div style={{ padding: '0 0 20px' }}>

              {/* Subfolder pills — horizontal strip if subfolders exist */}
              {!loadingFolders && subfolders.length > 0 && (
                <div style={{ padding: '12px 20px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#C4C4C4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Subfolders
                  </p>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
                    {subfolders.map((sf, i) => (
                      <button
                        key={sf.id}
                        onClick={() => drillInto(sf)}
                        className="flex items-center gap-1.5 transition-all"
                        style={{
                          flexShrink: 0, padding: '5px 12px 5px 9px',
                          borderRadius: 20, border: '1px solid rgba(0,0,0,0.1)',
                          background: 'white', cursor: 'pointer',
                          fontSize: 12, color: '#374151',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = FOLDER_PALETTE[i % FOLDER_PALETTE.length]
                          e.currentTarget.style.color = FOLDER_PALETTE[i % FOLDER_PALETTE.length]
                          e.currentTarget.style.background = `${FOLDER_PALETTE[i % FOLDER_PALETTE.length]}08`
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
                          e.currentTarget.style.color = '#374151'
                          e.currentTarget.style.background = 'white'
                        }}
                      >
                        <Folder size={12} style={{ color: FOLDER_PALETTE[i % FOLDER_PALETTE.length], flexShrink: 0 }} />
                        {sf.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading files */}
              {loadingFiles && (
                <div className="flex items-center justify-center" style={{ paddingTop: 80 }}>
                  <Loader size={20} className="animate-spin" style={{ color: '#D1D5DB' }} />
                </div>
              )}

              {/* Empty folder */}
              {!loadingFiles && files.length === 0 && (
                <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80, gap: 14 }}>
                  {isAdmin ? (
                    <>
                      <div style={{ width: 64, height: 64, borderRadius: 20, border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Upload size={22} strokeWidth={1.4} style={{ color: '#D1D5DB' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#9CA3AF', marginBottom: 4 }}>No files yet</p>
                        <p style={{ fontSize: 12, color: '#C4C4C4' }}>Drag & drop or click Upload to add files</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FolderOpen size={36} strokeWidth={1.2} style={{ color: '#D1D5DB' }} />
                      <p style={{ fontSize: 14, color: '#9CA3AF' }}>No files in this folder</p>
                    </>
                  )}
                </div>
              )}

              {/* No search results */}
              {!loadingFiles && files.length > 0 && filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center" style={{ paddingTop: 80, gap: 12 }}>
                  <Search size={28} strokeWidth={1.3} style={{ color: '#D1D5DB' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>No files match &ldquo;{search}&rdquo;</p>
                  <button onClick={() => { setSearch(''); setTypeFilter('all') }}
                    style={{ fontSize: 13, color: BRAND, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Clear filters
                  </button>
                </div>
              )}

              {/* ══ GRID VIEW ══════════════════════════════════════════════ */}
              {!loadingFiles && filteredFiles.length > 0 && viewMode === 'grid' && (
                <div style={{ padding: '20px 20px 0' }}>

                  {/* Pinned section */}
                  {pinnedFiles.length > 0 && (
                    <div style={{ marginBottom: hasSections ? 24 : 0 }}>
                      {hasSections && (
                        <SectionDivider
                          icon={<Star size={11} fill="#FF9500" stroke="#FF9500" />}
                          label="Pinned"
                          count={pinnedFiles.length}
                        />
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                        {pinnedFiles.map(f => (
                          <GridCard key={f.id} file={f} token={token} isAdmin={isAdmin} isStarred
                            onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                            onRename={() => setModal({ type: 'renameFile', target: f })}
                            onDelete={() => setModal({ type: 'deleteFile', target: f })} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rest section */}
                  {restFiles.length > 0 && (
                    <div>
                      {hasSections && <SectionDivider label="All Files" count={restFiles.length} />}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                        {restFiles.map(f => (
                          <GridCard key={f.id} file={f} token={token} isAdmin={isAdmin} isStarred={false}
                            onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                            onRename={() => setModal({ type: 'renameFile', target: f })}
                            onDelete={() => setModal({ type: 'deleteFile', target: f })} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ LIST VIEW ══════════════════════════════════════════════ */}
              {!loadingFiles && filteredFiles.length > 0 && viewMode === 'list' && (
                <div style={{ padding: '20px 20px 0' }}>
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

                    {/* Sortable header */}
                    <div className="flex items-center px-4 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#FAFAFA' }}>
                      <button onClick={() => toggleSort('name')} className="flex items-center flex-1" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sortBy === 'name' ? BRAND : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</span>
                        <SortArrow field="name" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                      <div style={{ width: 58, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</div>
                      <button onClick={() => toggleSort('size')} className="flex items-center" style={{ width: 70, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sortBy === 'size' ? BRAND : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</span>
                        <SortArrow field="size" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                      <button onClick={() => toggleSort('date')} className="flex items-center" style={{ width: 112, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sortBy === 'date' ? BRAND : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Uploaded</span>
                        <SortArrow field="date" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                      <div style={{ width: isAdmin ? 88 : 34 }} />
                    </div>

                    {/* Pinned rows */}
                    {pinnedFiles.length > 0 && (
                      <>
                        {hasSections && (
                          <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: 'rgba(255,149,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <Star size={10} fill="#FF9500" stroke="#FF9500" />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#FF9500', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Pinned</span>
                          </div>
                        )}
                        {pinnedFiles.map((f, i) => (
                          <ListRow key={f.id} file={f} isLast={!hasSections && i === pinnedFiles.length - 1}
                            isAdmin={isAdmin} isStarred
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
                          <div className="flex items-center gap-2 px-4 py-1.5" style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>All Files</span>
                          </div>
                        )}
                        {restFiles.map((f, i) => (
                          <ListRow key={f.id} file={f} isLast={i === restFiles.length - 1}
                            isAdmin={isAdmin} isStarred={false}
                            onOpen={() => openFile(f)} onStar={e => toggleStar(e, f.id)}
                            onRename={() => setModal({ type: 'renameFile', target: f })}
                            onDelete={() => setModal({ type: 'deleteFile', target: f })} />
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}
