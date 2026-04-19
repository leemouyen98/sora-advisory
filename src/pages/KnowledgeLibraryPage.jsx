/**
 * KnowledgeLibraryPage
 * ────────────────────
 * Two-panel layout with drill-down folder navigation:
 *   Left  — breadcrumb + folders at current level (admin: create / rename / delete)
 *   Right — files in the current folder         (admin: upload / rename / delete)
 *
 * File behaviour:
 *   PDF   → SecurePDFViewerModal (canvas, scroll, no download)
 *   Other → authenticated download via /api/library/files/:id/view
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Folder, FolderPlus, Plus, Pencil, Trash2, Upload,
  FileText, FileImage, File, FileSpreadsheet, Loader, Library,
  ChevronRight, Star,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import SecurePDFViewerModal from '../components/layout/SecurePDFViewerModal'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileIcon(mimeType) {
  if (!mimeType) return File
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return FileSpreadsheet
  return File
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Inline modals ─────────────────────────────────────────────────────────────
function TextInputModal({ title, placeholder, initial = '', confirmLabel = 'Save', onConfirm, onClose }) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef(null)
  useEffect(() => inputRef.current?.focus(), [])
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

  // folderStack = breadcrumb path, e.g. [{id, name}, {id, name}]
  // currentFolderId = last item's id, or null = root
  const [folderStack,  setFolderStack]  = useState([])
  const [subfolders,   setSubfolders]   = useState([])
  const [files,        setFiles]        = useState([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [uploading,      setUploading]      = useState(false)
  const [modal,          setModal]          = useState(null)
  const [pdfViewer,      setPdfViewer]      = useState(null)
  // starredFileIds: Set of file IDs the current agent has starred
  const [starredFileIds, setStarredFileIds] = useState(new Set())

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null
  const headers = { Authorization: `Bearer ${token}` }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function drillInto(folder) {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  function navigateTo(index) {
    // index = -1 → root, 0..n → that crumb
    setFolderStack(prev => index < 0 ? [] : prev.slice(0, index + 1))
  }

  // ── Data fetching ───────────────────────────────────────────────────────────
  const loadSubfolders = useCallback(async (parentId) => {
    setLoadingFolders(true)
    try {
      const url = parentId
        ? `/api/library/folders?parentId=${parentId}`
        : '/api/library/folders'
      const res  = await fetch(url, { headers })
      const data = await res.json()
      setSubfolders(data.folders ?? [])
    } finally {
      setLoadingFolders(false)
    }
  }, [token])

  const loadFiles = useCallback(async (folderId) => {
    setLoadingFiles(true)
    setFiles([])
    try {
      const res  = await fetch(`/api/library/folders/${folderId}/files`, { headers })
      const data = await res.json()
      const fileList = data.files ?? []
      setFiles(fileList)
      // Sync starred state from server response
      setStarredFileIds(new Set(fileList.filter(f => f.is_starred).map(f => f.id)))
    } finally {
      setLoadingFiles(false)
    }
  }, [token])

  useEffect(() => {
    loadSubfolders(currentFolderId)
    if (currentFolderId) loadFiles(currentFolderId)
    else setFiles([])
  }, [currentFolderId, loadSubfolders, loadFiles])

  // ── Folder actions ──────────────────────────────────────────────────────────
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
      // Update name in stack if it's in the breadcrumb path
      setFolderStack(prev => prev.map(f => f.id === modal.target.id ? { ...f, name } : f))
      loadSubfolders(currentFolderId)
      setModal(null)
    }
  }

  async function deleteFolder() {
    const targetId = modal.target.id
    const res = await fetch(`/api/library/folders/${targetId}`, { method: 'DELETE', headers })
    if (res.ok) {
      // If the deleted folder is in the breadcrumb, pop back to its parent
      const idx = folderStack.findIndex(f => f.id === targetId)
      if (idx >= 0) setFolderStack(prev => prev.slice(0, idx))
      else loadSubfolders(currentFolderId)
      setModal(null)
    }
  }

  // ── File actions ────────────────────────────────────────────────────────────
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
    // Optimistic UI
    setStarredFileIds(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })
    try {
      await fetch(`/api/library/files/${fileId}/star`, { method: 'POST', headers })
    } catch {
      // Roll back on failure
      setStarredFileIds(prev => {
        const next = new Set(prev)
        if (next.has(fileId)) next.delete(fileId)
        else next.add(fileId)
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
          const a   = document.createElement('a')
          a.href = url; a.download = file.name; a.click()
          URL.revokeObjectURL(url)
        })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#F2F2F7' }}>

      {/* ── Left panel — folder navigation ──────────────────────────────── */}
      <div className="w-64 shrink-0 flex flex-col border-r border-black/8 bg-white">

        {/* Breadcrumb */}
        <div className="px-3 py-2.5 border-b border-black/8">
          <div className="flex items-center flex-wrap gap-0.5 min-h-[28px]">
            {/* Root crumb */}
            <button
              onClick={() => navigateTo(-1)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{ color: folderStack.length === 0 ? '#2E96FF' : '#6B7280' }}
              onMouseEnter={e => { if (folderStack.length > 0) e.currentTarget.style.color = '#2E96FF' }}
              onMouseLeave={e => { if (folderStack.length > 0) e.currentTarget.style.color = '#6B7280' }}
            >
              <Library size={12} />
              <span className="font-medium">Library</span>
            </button>

            {/* Path crumbs */}
            {folderStack.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-0.5">
                <ChevronRight size={11} className="text-gray-300" />
                <button
                  onClick={() => navigateTo(i)}
                  className="px-1.5 py-0.5 rounded text-xs transition-colors truncate max-w-[100px]"
                  style={{ color: i === folderStack.length - 1 ? '#2E96FF' : '#6B7280' }}
                  onMouseEnter={e => { if (i < folderStack.length - 1) e.currentTarget.style.color = '#2E96FF' }}
                  onMouseLeave={e => { if (i < folderStack.length - 1) e.currentTarget.style.color = '#6B7280' }}
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Subfolder list header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/8">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            {folderStack.length === 0 ? 'Folders' : 'Subfolders'}
          </span>
          {isAdmin && (
            <button
              onClick={() => setModal({ type: 'createFolder' })}
              className="w-6 h-6 flex items-center justify-center rounded text-[#2E96FF] hover:bg-[#2E96FF]/10 transition-colors"
              title={`New ${folderStack.length > 0 ? 'subfolder' : 'folder'}`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Subfolder items */}
        <div className="flex-1 overflow-y-auto py-1">
          {loadingFolders ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={18} className="animate-spin text-gray-300" />
            </div>
          ) : subfolders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6 px-4">
              {isAdmin
                ? `No ${folderStack.length > 0 ? 'subfolders' : 'folders'} yet`
                : 'Empty'}
            </p>
          ) : (
            subfolders.map(folder => (
              <div
                key={folder.id}
                onClick={() => drillInto(folder)}
                className="group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors"
                style={{ color: '#040E1C' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F7' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Folder size={15} className="shrink-0 text-[#2E96FF]" />
                <span className="text-sm truncate flex-1">{folder.name}</span>
                <ChevronRight size={13} className="text-gray-300 shrink-0" />
                {isAdmin && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setModal({ type: 'renameFolder', target: folder })}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-[#2E96FF] hover:bg-[#2E96FF]/10 transition-colors"
                    ><Pencil size={11} /></button>
                    <button
                      onClick={() => setModal({ type: 'deleteFolder', target: folder })}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    ><Trash2 size={11} /></button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel — file grid ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* File panel header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-black/8">
          <div>
            <h1 className="text-sm font-semibold text-[#040E1C]">
              {folderStack.length > 0
                ? folderStack[folderStack.length - 1].name
                : 'Knowledge Library'}
            </h1>
            {currentFolderId && !loadingFiles && (
              <p className="text-xs text-gray-400 mt-0.5">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </p>
            )}
          </div>
          {isAdmin && currentFolderId && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2E96FF] text-white text-sm font-medium hover:bg-[#1a7ee0] disabled:opacity-50 transition-colors"
              >
                {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                onChange={e => { uploadFiles(e.target.files); e.target.value = '' }} />
            </>
          )}
        </div>

        {/* File content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentFolderId ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Library size={40} strokeWidth={1.2} />
              <p className="text-sm">Open a folder to browse its files</p>
            </div>
          ) : loadingFiles ? (
            <div className="flex items-center justify-center h-full">
              <Loader size={28} className="animate-spin text-gray-300" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <FolderOpen size={40} strokeWidth={1.2} />
              <p className="text-sm">{isAdmin ? 'Upload the first file →' : 'No files here'}</p>
            </div>
          ) : (
            <div className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {files.map(file => {
                const Icon     = fileIcon(file.mime_type)
                const isPDF    = file.mime_type === 'application/pdf'
                const isStarred = starredFileIds.has(file.id)
                return (
                  <div key={file.id}
                    className="group relative bg-white rounded-xl border border-black/8 p-4 cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => openFile(file)}
                  >
                    {/* Star button — always visible when starred, hover-visible otherwise */}
                    <button
                      onClick={e => toggleStar(e, file.id)}
                      title={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                      className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded z-10"
                      style={{ opacity: isStarred ? 1 : 0, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => { if (!isStarred) e.currentTarget.style.opacity = '0' }}
                    >
                      <Star
                        size={13}
                        fill={isStarred ? '#FF9500' : 'none'}
                        stroke={isStarred ? '#FF9500' : '#C7C7CC'}
                        strokeWidth={2}
                        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
                      />
                    </button>

                    {/* Admin actions */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setModal({ type: 'renameFile', target: file })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-[#2E96FF] hover:border-[#2E96FF] transition-colors shadow-sm"
                        ><Pencil size={11} /></button>
                        <button
                          onClick={() => setModal({ type: 'deleteFile', target: file })}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm"
                        ><Trash2 size={11} /></button>
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: isPDF ? 'rgba(255,59,48,0.10)' : 'rgba(46,150,255,0.10)' }}>
                      <Icon size={20} style={{ color: isPDF ? '#FF3B30' : '#2E96FF' }} />
                    </div>
                    <p className="text-xs font-medium text-[#040E1C] leading-tight line-clamp-2 mb-2">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {formatBytes(file.size)} · {formatDate(file.uploaded_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {modal?.type === 'createFolder' && (
        <TextInputModal
          title={folderStack.length > 0 ? `New Subfolder in "${folderStack[folderStack.length-1].name}"` : 'New Folder'}
          placeholder="Folder name"
          confirmLabel="Create"
          onConfirm={createFolder}
          onClose={() => setModal(null)}
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

      {/* ── PDF viewer ────────────────────────────────────────────────────── */}
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
