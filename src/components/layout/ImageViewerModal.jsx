/**
 * ImageViewerModal — secure inline image viewer
 * ──────────────────────────────────────────────
 * Props:
 *   title    {string}   — shown in header
 *   endpoint {string}   — authenticated API route to fetch image from
 *   onClose  {Function}
 *
 * Mirrors SecurePDFViewerModal's look and security posture:
 *   • Right-click blocked (no "Save image as…")
 *   • Ctrl/Cmd+S suppressed while open
 *   • Image served behind JWT auth (fetched as blob, never a raw src URL)
 *   • Module-level blob URL cache — re-opens are instant
 *   • Drag-to-desktop blocked via user-select / pointer-events shield
 */
import { useEffect, useState } from 'react'
import { X, Loader } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// Module-level cache: endpoint → object URL (survives modal close/reopen)
const imageBlobCache = new Map()

export default function ImageViewerModal({ title, endpoint, onClose }) {
  const { token } = useAuth()
  const [status,   setStatus]   = useState('loading')
  const [blobUrl,  setBlobUrl]  = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Block Ctrl/Cmd+S and Escape while open
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        e.stopPropagation()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  // Fetch image (cached after first load)
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setBlobUrl(null)

    async function load() {
      try {
        if (imageBlobCache.has(endpoint)) {
          if (!cancelled) { setBlobUrl(imageBlobCache.get(endpoint)); setStatus('ready') }
          return
        }
        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        imageBlobCache.set(endpoint, url)
        setBlobUrl(url)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          console.error('[ImageViewerModal]', err)
          setErrorMsg(err.message || 'Failed to load image')
          setStatus('error')
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [token, endpoint])

  const blockCtxMenu = (e) => e.preventDefault()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col bg-[#1a1a2e] rounded-2xl shadow-2xl"
        style={{ width: 'min(92vw, 880px)', height: 'min(94vh, 960px)' }}
        onContextMenu={blockCtxMenu}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0 gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <p className="text-white font-semibold text-sm tracking-wide truncate min-w-0">
            {title}
          </p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Viewport ──────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-auto flex items-center justify-center py-4 px-4"
          style={{ background: '#2d2d2d', userSelect: 'none', WebkitUserSelect: 'none' }}
          onContextMenu={blockCtxMenu}
        >
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-white/50">
              <Loader size={32} className="animate-spin" />
              <p className="text-sm">Loading image…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 text-red-400">
              <p className="text-sm font-medium">Failed to load image</p>
              <p className="text-xs text-white/40">{errorMsg}</p>
            </div>
          )}

          {status === 'ready' && blobUrl && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {/* Transparent shield — blocks drag-to-desktop and right-click */}
              <div
                style={{
                  position:      'absolute',
                  inset:         0,
                  zIndex:        1,
                  pointerEvents: 'all',
                  userSelect:    'none',
                  WebkitUserSelect: 'none',
                  cursor:        'default',
                }}
                onContextMenu={blockCtxMenu}
                onDragStart={(e) => e.preventDefault()}
              />
              <img
                src={blobUrl}
                alt={title}
                draggable={false}
                onContextMenu={blockCtxMenu}
                style={{
                  display:      'block',
                  maxWidth:     '100%',
                  maxHeight:    'calc(min(94vh, 960px) - 120px)',
                  objectFit:    'contain',
                  borderRadius: 4,
                  boxShadow:    '0 4px 32px rgba(0,0,0,0.5)',
                  userSelect:   'none',
                  WebkitUserDrag: 'none',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
