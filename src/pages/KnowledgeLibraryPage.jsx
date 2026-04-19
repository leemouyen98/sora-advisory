/**
 * KnowledgeLibraryPage
 * ────────────────────
 * Two-panel layout: folder navigation (left) + file browser (right).
 *
 * Right-panel features:
 *   • Grid view — PDF cards with first-page thumbnail; other files with icon
 *   • List view — compact table with type badge, size, date
 *   • Search bar — real-time name filter
 *   • Type filter chips — All / PDF / Image / Other
 *   • View mode persisted to localStorage
 *   • Star toggle on every file (amber ★, optimistic UI)
 *
 * File actions:
 *   PDF   → SecurePDFViewerModal (canvas, scroll, no download)
 *   Other → authenticated download
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FolderOpen, Folder, Plus, Pencil, Trash2, Upload,
  FileText, FileImage, File, FileSpreadsheet, Loader, Library,
  ChevronRight, Star, LayoutGrid, List, Search, X, Download,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'
import PDFThumbnail from '../components/library/PDFThumbnail'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileIcon(mimeType) {
  if (!mimeType) return File
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  return File
}

function fileTypeLabel(mimeType) {
  if (!mimeType) return 'File'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Excel'
  if (mimeType.includes('csv')) return 'CSV'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Word'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPT'
  const sub = mimeType.split('/')[1]
  return sub ? sub.slice(0, 6).toUpperCase() : 'File'
}

function fileAccentColor(mimeType) {
  if (mimeType === 'application/pdf') return '#FF3B30'
  if (mimeType?.startsWith('image/')) return '#34C759'
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) return '#34C759'
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '#2E96FF'
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '#FF9500'
  return '#AF52DE'
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Inline modals ─────────────────────────────────────────────────────────────
function TextInputModal({ title, placeholder, initial = '', confirmLabel = 'Save', onConfirm, onClose }) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <p className="font-semibold text-[#040E1C] mb-4">{title}</p>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onConfirm(value.trim()) }}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2E96FF] mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={() => value.trim() && onConfirm(value.trim())}
            disabled={!value.trim()}
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
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium bg-red-500 hover:bg-red-600 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KnowledgeLibraryPage() {
  const { token, isAdmin } = useAuth()
  const fileInputRef = useRef(null)

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [folderStack,    setFolderStack]    = useState([])
  const [subfolders,     setSubfolders]     = useState([])
  const [files,          setFiles]          = useState([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [modal,          setModal]          = useState(null)
  const [pdfViewer,      setPdfViewer]      = useState(null)
  const [starredFileIds, setStarredFileIds] = useState(new Set())

  // ── View / filter ───────────────────────────────────────────────────────────
  const [viewMode,    setViewMode]    = useState(() => {
    try { return localStorage.getItem('lib-view') || 'grid' } catch { return 'grid' }
  })
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Reset search/filter on folder change
  useEffect(() => { setSearch(''); setTypeFilter('all') }, [currentFolderId])

  // ── Navigation ──────────────────────────────────────────────────────────────
  function drillInto(folder) {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }])
  }
  function navigateTo(index) {
    setFolderStack(prev => index < 0 ? [] : prev.slice(0, index + 1))
  }

  // ── Data fetching ───────────────────────────────────────────────────────────
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
      setStarredFileIds(new Set(list.filter(f => f.is_starred).map(f => f.id)))
    } finally { setLoadingFiles(false) }
  }, [headers])

  useEffect(() => {
    loadSubfolders(currentFolderId)
    if (currentFolderId) loadFiles(currentFolderId)
    else setFiles([])
  }, [currentFolderId, loadSubfolders, loadFiles])

  // ── Folder CRUD ─────────────────────────────────────────────────────────────
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
    const targetId = modal.target.id
    const res = await fetch(`/api/library/folders/${targetId}`, { method: 'DELETE', headers })
    if (res.ok) {
      const idx = folderStack.findIndex(f => f.id === targetId)
      if (idx >= 0) setFolderStack(prev => prev.slice(0, idx))
      else loadSubfolders(currentFolderId)
      setModal(null)
    }
  }

  // ── File CRUD ────────────────────────────────────────────────────────────────
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
    setStarredFileIds(prev => {
      const next = new Set(prev)
      next.has(fileId) ? next.delete(fileId) : next.add(fileId)
      return next
    })
    try {
      await fetch(`/api/library/files/${fileId}/star`, { method: 'POST', headers })
    } catch {
      // Roll back
      setStarredFileIds(prev => {
        const next = new Set(prev)
        next.has(fileId) ? next.delete(fileId) : next.add(fileId)
        return next
      })
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

  function changeView(mode) {
    setViewMode(mode)
    try { localStorage.setItem('lib-view', mode) } catch {}
  }

  // ── Filtered files ───────────────────────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    let result = files
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      result = result.filter(f => {
        if (typeFilter === 'pdf')   return f.mime_type === 'application/pdf'
        if (typeFilter === 'image') return !!f.mime_type?.startsWith('image/')
        if (typeFilter === 'other') return f.mime_type !== 'application/pdf' && !f.mime_type?.startsWith('image/')
        return true
      })
    }
    return result
  }, [files, search, typeFilter])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#F2F2F7' }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL — folder navigation
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-64 shrink-0 flex flex-col bg-white" style={{ borderRight: '1px solid rgba(0,0,0,0.07)' }}>

        {/* Library header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(46,150,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Library size={15} style={{ color: '#2E96FF' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#040E1C' }}>Knowledge Library</span>
        </div>

        {/* Breadcrumb — only when drilled in */}
        {folderStack.length > 0 && (
          <div className="px-3 py-2" style={{
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            background: 'rgba(0,0,0,0.018)',
          }}>
            <div className="flex items-center flex-wrap gap-0.5">
              <button
                onClick={() => navigateTo(-1)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors hover:text-[#2E96FF]"
                style={{ color: '#6B7280' }}
              >
                Library
              </button>
              {folderStack.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-0.5">
                  <ChevronRight size={10} style={{ color: '#D1D5DB' }} />
                  <button
                    onClick={() => navigateTo(i)}
                    className="px-1.5 py-0.5 rounded text-xs font-medium transition-colors truncate max-w-[88px]"
                    style={{ color: i === folderStack.length - 1 ? '#2E96FF' : '#6B7280' }}
                    title={crumb.name}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Folder section label + add button */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {folderStack.length === 0 ? 'Folders' : 'Subfolders'}
          </span>
          {isAdmin && (
            <button
              onClick={() => setModal({ type: 'createFolder' })}
              className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:bg-[#2E96FF]/10"
              style={{ color: '#2E96FF' }}
              title={`New ${folderStack.length > 0 ? 'subfolder' : 'folder'}`}
            >
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
              <FolderOpen size={26} strokeWidth={1.4} style={{ color: '#D1D5DB' }} />
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                {isAdmin
                  ? `No ${folderStack.length > 0 ? 'subfolders' : 'folders'} yet`
                  : 'No folders available'}
              </p>
            </div>
          ) : (
            subfolders.map(folder => (
              <div
                key={folder.id}
                className="group flex items-center gap-2 mx-1.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                onClick={() => drillInto(folder)}
                onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Folder size={14} style={{ color: '#2E96FF', flexShrink: 0 }} />
                <span style={{
                  fontSize: 13, color: '#111827', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {folder.name}
                </span>

                {/* Admin: rename / delete on hover */}
                {isAdmin ? (
                  <div
                    className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setModal({ type: 'renameFolder', target: folder })}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-[#2E96FF] transition-colors"
                    ><Pencil size={10} /></button>
                    <button
                      onClick={() => setModal({ type: 'deleteFolder', target: folder })}
                      className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 transition-colors"
                    ><Trash2 size={10} /></button>
                  </div>
                ) : (
                  <ChevronRight size={12} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — file browser
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-2.5 bg-white flex-wrap"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', minHeight: 52 }}
        >
          {/* Title + count */}
          <div style={{ minWidth: 0, marginRight: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#040E1C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {folderStack.length > 0 ? folderStack[folderStack.length - 1].name : 'Knowledge Library'}
            </p>
            {currentFolderId && !loadingFiles && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap' }}>
                {files.length} {files.length === 1 ? 'file' : 'files'}
                {filteredFiles.length !== files.length && ` · ${filteredFiles.length} shown`}
              </p>
            )}
          </div>

          {/* Right-side controls — only when a folder is open */}
          {currentFolderId && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={12}
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search files…"
                  style={{
                    paddingLeft: 26, paddingRight: search ? 26 : 10,
                    paddingTop: 5, paddingBottom: 5,
                    fontSize: 12, color: '#040E1C', width: 152,
                    border: '1px solid rgba(0,0,0,0.11)', borderRadius: 8,
                    outline: 'none', background: 'white', transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = '#2E96FF' }}
                  onBlur={e   => { e.target.style.borderColor = 'rgba(0,0,0,0.11)' }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Type filter chips */}
              <div className="flex items-center" style={{ gap: 3 }}>
                {[
                  { key: 'all',   label: 'All' },
                  { key: 'pdf',   label: 'PDF' },
                  { key: 'image', label: 'Image' },
                  { key: 'other', label: 'Other' },
                ].map(({ key, label }) => {
                  const active = typeFilter === key
                  return (
                    <button
                      key={key}
                      onClick={() => setTypeFilter(key)}
                      style={{
                        fontSize: 11, fontWeight: 500,
                        padding: '3px 9px', borderRadius: 20,
                        border: `1px solid ${active ? '#2E96FF' : 'rgba(0,0,0,0.1)'}`,
                        background: active ? 'rgba(46,150,255,0.08)' : 'transparent',
                        color: active ? '#2E96FF' : '#6B7280',
                        cursor: 'pointer', transition: 'all 0.13s',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* View toggle */}
              <div
                className="flex items-center rounded-lg overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.1)' }}
              >
                {[
                  { mode: 'grid', Icon: LayoutGrid, title: 'Grid view' },
                  { mode: 'list', Icon: List,       title: 'List view' },
                ].map(({ mode, Icon, title }) => {
                  const active = viewMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => changeView(mode)}
                      title={title}
                      style={{
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? 'rgba(46,150,255,0.1)' : 'transparent',
                        color: active ? '#2E96FF' : '#9CA3AF',
                        border: 'none', cursor: 'pointer', transition: 'all 0.13s',
                      }}
                    >
                      <Icon size={13} />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 transition-colors"
                    style={{ background: '#2E96FF', fontSize: 12 }}
                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = '#1a7ee0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#2E96FF' }}
                  >
                    {uploading ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden"
                    onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Content area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* No folder selected */}
          {!currentFolderId && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(46,150,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Library size={28} strokeWidth={1.3} style={{ color: '#2E96FF', opacity: 0.7 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>
                  {subfolders.length === 0 && !loadingFolders ? 'Library is empty' : 'Select a folder'}
                </p>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                  {subfolders.length === 0 && !loadingFolders && isAdmin
                    ? 'Create your first folder on the left'
                    : 'Open a folder on the left to browse files'}
                </p>
              </div>
            </div>
          )}

          {/* Loading files */}
          {currentFolderId && loadingFiles && (
            <div className="flex items-center justify-center h-full">
              <Loader size={22} className="animate-spin" style={{ color: '#D1D5DB' }} />
            </div>
          )}

          {/* Empty folder */}
          {currentFolderId && !loadingFiles && files.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <FolderOpen size={38} strokeWidth={1.2} style={{ color: '#D1D5DB' }} />
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                {isAdmin ? 'No files yet — upload to get started' : 'No files in this folder'}
              </p>
            </div>
          )}

          {/* No search results */}
          {currentFolderId && !loadingFiles && files.length > 0 && filteredFiles.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Search size={30} strokeWidth={1.3} style={{ color: '#D1D5DB' }} />
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                No files match &ldquo;{search}&rdquo;
              </p>
              <button
                onClick={() => { setSearch(''); setTypeFilter('all') }}
                style={{ fontSize: 13, color: '#2E96FF', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              GRID VIEW
              ════════════════════════════════════════════════════════════════ */}
          {currentFolderId && !loadingFiles && filteredFiles.length > 0 && viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 14 }}>
              {filteredFiles.map(file => {
                const isPDF     = file.mime_type === 'application/pdf'
                const Icon      = fileIcon(file.mime_type)
                const color     = fileAccentColor(file.mime_type)
                const isStarred = starredFileIds.has(file.id)

                return (
                  <div
                    key={file.id}
                    className="group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all"
                    style={{
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    onClick={() => openFile(file)}
                  >
                    {/* Thumbnail area — fixed height */}
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

                      {/* Admin action buttons — top-right, appear on card hover */}
                      {isAdmin && (
                        <div
                          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setModal({ type: 'renameFile', target: file })}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#2E96FF] transition-colors"
                            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}
                          ><Pencil size={10} /></button>
                          <button
                            onClick={() => setModal({ type: 'deleteFile', target: file })}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)' }}
                          ><Trash2 size={10} /></button>
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div style={{ padding: '9px 11px 11px' }}>
                      <div className="flex items-start gap-1.5">
                        {/* Star */}
                        <button
                          onClick={e => toggleStar(e, file.id)}
                          title={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                          className="shrink-0 mt-0.5"
                          style={{ opacity: isStarred ? 1 : 0.28, transition: 'opacity 0.15s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                          onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.28' }}
                        >
                          <Star
                            size={12}
                            fill={isStarred ? '#FF9500' : 'none'}
                            stroke={isStarred ? '#FF9500' : '#C7C7CC'}
                            strokeWidth={2}
                          />
                        </button>
                        {/* File name */}
                        <p style={{
                          fontSize: 12, fontWeight: 500, color: '#111827',
                          lineHeight: 1.35, overflow: 'hidden',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {file.name}
                        </p>
                      </div>
                      <p style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 5 }}>
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LIST VIEW
              ════════════════════════════════════════════════════════════════ */}
          {currentFolderId && !loadingFiles && filteredFiles.length > 0 && viewMode === 'list' && (
            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              {/* Header row */}
              <div
                className="flex items-center px-4 py-2"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', background: '#FAFAFA' }}
              >
                <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</div>
                <div style={{ width: 58, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</div>
                <div style={{ width: 78, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Size</div>
                <div style={{ width: isAdmin ? 84 : 34 }} />
              </div>

              {/* File rows */}
              {filteredFiles.map((file, idx) => {
                const Icon      = fileIcon(file.mime_type)
                const color     = fileAccentColor(file.mime_type)
                const typeLabel = fileTypeLabel(file.mime_type)
                const isStarred = starredFileIds.has(file.id)
                const isPDF     = file.mime_type === 'application/pdf'

                return (
                  <div
                    key={file.id}
                    className="group flex items-center px-4 py-2.5 cursor-pointer transition-colors"
                    style={{ borderBottom: idx < filteredFiles.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    onClick={() => openFile(file)}
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
                      <span style={{
                        fontSize: 13, fontWeight: 500, color: '#111827',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {file.name}
                      </span>
                    </div>

                    {/* Type badge */}
                    <div style={{ width: 58, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, color,
                        background: `${color}12`,
                        padding: '2px 7px', borderRadius: 20,
                      }}>
                        {typeLabel}
                      </span>
                    </div>

                    {/* Size */}
                    <div style={{ width: 78, fontSize: 12, color: '#6B7280', flexShrink: 0 }}>
                      {formatBytes(file.size)}
                    </div>

                    {/* Actions */}
                    <div
                      style={{ width: isAdmin ? 84 : 34, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Star */}
                      <button
                        onClick={e => toggleStar(e, file.id)}
                        title={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                        className="w-6 h-6 flex items-center justify-center rounded-md"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: isStarred ? 1 : 0.28, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                        onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0.28' }}
                      >
                        <Star
                          size={13}
                          fill={isStarred ? '#FF9500' : 'none'}
                          stroke={isStarred ? '#FF9500' : '#C7C7CC'}
                          strokeWidth={2}
                        />
                      </button>

                      {/* Non-PDF download indicator */}
                      {!isPDF && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#C7C7CC' }}>
                          <Download size={11} />
                        </span>
                      )}

                      {/* Admin */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setModal({ type: 'renameFile', target: file })}
                            className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all hover:text-[#2E96FF] transition-colors"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                          ><Pencil size={12} /></button>
                          <button
                            onClick={() => setModal({ type: 'deleteFile', target: file })}
                            className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 transition-colors"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                          ><Trash2 size={12} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {modal?.type === 'createFolder' && (
        <TextInputModal
          title={folderStack.length > 0 ? `New Subfolder in "${folderStack[folderStack.length-1].name}"` : 'New Folder'}
          placeholder="Folder name" confirmLabel="Create"
          onConfirm={createFolder} onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'renameFolder' && (
        <TextInputModal title="Rename Folder" placeholder="Folder name"
          initial={modal.target.name} onConfirm={renameFolder} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteFolder' && (
        <ConfirmModal
          message={`Delete "${modal.target.name}" and everything inside it? This cannot be undone.`}
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

      {/* ── PDF viewer ────────────────────────────────────────────────────────── */}
      {pdfViewer && (
        <SecurePDFViewerModal
          title={pdfViewer.fileName}
          endpoint={`/api/library/files/${pdfViewer.fileId}/view`}
          scrollMode
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}
