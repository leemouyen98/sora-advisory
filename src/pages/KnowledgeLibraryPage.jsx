/**
 * KnowledgeLibraryPage
 * ────────────────────
 * Two-panel layout:
 *   Left  — folder list (admin: create / rename / delete)
 *   Right — file grid for selected folder (admin: upload / rename / delete)
 *
 * File behaviour:
 *   PDF  → opens in SecurePDFViewerModal (canvas, no download)
 *   Other → authenticated download via /api/library/files/:id/view
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FolderOpen, Folder, Plus, Pencil, Trash2, Upload,
  FileText, FileImage, File, FileSpreadsheet, Loader, Library,
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

function ConfirmModal({ message, confirmLabel = 'Delete', danger = true, onConfirm, onClose }) {
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
            className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#2E96FF] hover:bg-[#1a7ee0]'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const NAVY = 'linear-gradient(180deg, #040E1C 0%, #081828 100%)'

export default function KnowledgeLibraryPage() {
  const { token, isAdmin } = useAuth()
  const fileInputRef = useRef(null)

  const [folders,        setFolders]        = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [files,          setFiles]          = useState([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles,   setLoadingFiles]   = useState(false)
  const [uploading,      setUploading]      = useState(false)

  // Modal state
  const [modal, setModal] = useState(null)
  // { type: 'createFolder'|'renameFolder'|'renameFile'|'deleteFolder'|'deleteFile', target?: obj }

  // PDF viewer
  const [pdfViewer, setPdfViewer] = useState(null)
  // { fileId, fileName }

  const headers = { Authorization: `Bearer ${token}` }

  // ── Data fetching ───────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    setLoadingFolders(true)
    try {
      const res = await fetch('/api/library/folders', { headers })
      const data = await res.json()
      setFolders(data.folders ?? [])
    } finally {
      setLoadingFolders(false)
    }
  }, [token])

  const loadFiles = useCallback(async (folderId) => {
    setLoadingFiles(true)
    setFiles([])
    try {
      const res = await fetch(`/api/library/folders/${folderId}/files`, { headers })
      const data = await res.json()
      setFiles(data.files ?? [])
    } finally {
      setLoadingFiles(false)
    }
  }, [token])

  useEffect(() => { loadFolders() }, [loadFolders])

  useEffect(() => {
    if (selectedFolder) loadFiles(selectedFolder.id)
    else setFiles([])
  }, [selectedFolder, loadFiles])

  // ── Folder actions ──────────────────────────────────────────────────────────
  async function createFolder(name) {
    const res = await fetch('/api/library/folders', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) { await loadFolders(); setModal(null) }
  }

  async function renameFolder(name) {
    const res = await fetch(`/api/library/folders/${modal.target.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      await loadFolders()
      if (selectedFolder?.id === modal.target.id) setSelectedFolder(f => ({ ...f, name }))
      setModal(null)
    }
  }

  async function deleteFolder() {
    const res = await fetch(`/api/library/folders/${modal.target.id}`, {
      method: 'DELETE', headers,
    })
    if (res.ok) {
      await loadFolders()
      if (selectedFolder?.id === modal.target.id) { setSelectedFolder(null); setFiles([]) }
      setModal(null)
    }
  }

  // ── File actions ────────────────────────────────────────────────────────────
  async function uploadFiles(fileList) {
    if (!selectedFolder || !fileList.length) return
    setUploading(true)
    for (const file of Array.from(fileList)) {
      const fd = new FormData()
      fd.append('folderId', selectedFolder.id)
      fd.append('file', file)
      await fetch('/api/library/files', { method: 'POST', headers, body: fd })
    }
    setUploading(false)
    loadFiles(selectedFolder.id)
  }

  async function renameFile(name) {
    const res = await fetch(`/api/library/files/${modal.target.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) { loadFiles(selectedFolder.id); setModal(null) }
  }

  async function deleteFile() {
    const res = await fetch(`/api/library/files/${modal.target.id}`, {
      method: 'DELETE', headers,
    })
    if (res.ok) { loadFiles(selectedFolder.id); setModal(null) }
  }

  function openFile(file) {
    if (file.mime_type === 'application/pdf') {
      setPdfViewer({ fileId: file.id, fileName: file.name })
    } else {
      // Authenticated download — open in new tab with auth header via a fetch+blob trick
      fetch(`/api/library/files/${file.id}/view`, { headers })
        .then(r => r.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href     = url
          a.download = file.name
          a.click()
          URL.revokeObjectURL(url)
        })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ background: '#F2F2F7' }}>

      {/* ── Left panel — folder list ─────────────────────────────────────── */}
      <div
        className="w-64 shrink-0 flex flex-col border-r border-black/8"
        style={{ background: 'white' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/8">
          <div className="flex items-center gap-2">
            <Library size={16} className="text-[#2E96FF]" />
            <span className="text-sm font-semibold text-[#040E1C]">Folders</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal({ type: 'createFolder' })}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#2E96FF] hover:bg-[#2E96FF]/10 transition-colors"
              title="New folder"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loadingFolders ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={20} className="animate-spin text-gray-400" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 px-4">
              {isAdmin ? 'Create your first folder →' : 'No folders yet'}
            </p>
          ) : (
            folders.map(folder => {
              const isSelected = selectedFolder?.id === folder.id
              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className="group flex items-center gap-2 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: isSelected ? 'rgba(46,150,255,0.10)' : 'transparent',
                    color:      isSelected ? '#2E96FF' : '#040E1C',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F2F2F7' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {isSelected
                    ? <FolderOpen size={16} className="shrink-0" />
                    : <Folder size={16} className="shrink-0 text-gray-400 group-hover:text-[#2E96FF]" />
                  }
                  <span className="text-sm truncate flex-1">{folder.name}</span>
                  {isAdmin && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); setModal({ type: 'renameFolder', target: folder }) }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-[#2E96FF] hover:bg-[#2E96FF]/10 transition-colors"
                      ><Pencil size={11} /></button>
                      <button
                        onClick={e => { e.stopPropagation(); setModal({ type: 'deleteFolder', target: folder }) }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      ><Trash2 size={11} /></button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right panel — file grid ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* File panel header */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-black/8">
          <div>
            <h1 className="text-sm font-semibold text-[#040E1C]">
              {selectedFolder ? selectedFolder.name : 'Knowledge Library'}
            </h1>
            {selectedFolder && !loadingFiles && (
              <p className="text-xs text-gray-400 mt-0.5">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </p>
            )}
          </div>
          {isAdmin && selectedFolder && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2E96FF] text-white text-sm font-medium hover:bg-[#1a7ee0] disabled:opacity-50 transition-colors"
              >
                {uploading
                  ? <Loader size={14} className="animate-spin" />
                  : <Upload size={14} />
                }
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { uploadFiles(e.target.files); e.target.value = '' }}
              />
            </>
          )}
        </div>

        {/* File grid / empty states */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFolder ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <Library size={40} strokeWidth={1.2} />
              <p className="text-sm">Select a folder to browse files</p>
            </div>
          ) : loadingFiles ? (
            <div className="flex items-center justify-center h-full">
              <Loader size={28} className="animate-spin text-gray-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
              <FolderOpen size={40} strokeWidth={1.2} />
              <p className="text-sm">{isAdmin ? 'Upload the first file →' : 'No files in this folder'}</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {files.map(file => {
                const Icon = fileIcon(file.mime_type)
                const isPDF = file.mime_type === 'application/pdf'
                return (
                  <div
                    key={file.id}
                    className="group relative bg-white rounded-xl border border-black/8 p-4 cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => openFile(file)}
                  >
                    {/* Admin actions */}
                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={e => { e.stopPropagation(); setModal({ type: 'renameFile', target: file }) }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-[#2E96FF] hover:border-[#2E96FF] transition-colors shadow-sm"
                        ><Pencil size={11} /></button>
                        <button
                          onClick={e => { e.stopPropagation(); setModal({ type: 'deleteFile', target: file }) }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm"
                        ><Trash2 size={11} /></button>
                      </div>
                    )}

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: isPDF ? 'rgba(255,59,48,0.10)' : 'rgba(46,150,255,0.10)' }}>
                      <Icon size={20} style={{ color: isPDF ? '#FF3B30' : '#2E96FF' }} />
                    </div>

                    {/* Name */}
                    <p className="text-xs font-medium text-[#040E1C] leading-tight line-clamp-2 mb-2">
                      {file.name}
                    </p>

                    {/* Meta */}
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
          title="New Folder"
          placeholder="Folder name"
          confirmLabel="Create"
          onConfirm={createFolder}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'renameFolder' && (
        <TextInputModal
          title="Rename Folder"
          placeholder="Folder name"
          initial={modal.target.name}
          onConfirm={renameFolder}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'deleteFolder' && (
        <ConfirmModal
          message={`Delete "${modal.target.name}" and all its files? This cannot be undone.`}
          onConfirm={deleteFolder}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'renameFile' && (
        <TextInputModal
          title="Rename File"
          placeholder="File name"
          initial={modal.target.name}
          onConfirm={renameFile}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'deleteFile' && (
        <ConfirmModal
          message={`Delete "${modal.target.name}"? This cannot be undone.`}
          onConfirm={deleteFile}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── PDF viewer ────────────────────────────────────────────────────── */}
      {pdfViewer && (
        <SecurePDFViewerModal
          title={pdfViewer.fileName}
          endpoint={`/api/library/files/${pdfViewer.fileId}/view`}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}
