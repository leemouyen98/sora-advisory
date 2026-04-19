/**
 * SecurePDFViewerModal — generic reusable secure PDF viewer
 * ──────────────────────────────────────────────────────────
 * Props:
 *   title       {string}   — shown in header
 *   endpoint    {string}   — authenticated API route to fetch the PDF from
 *   langOptions {Array?}   — optional language toggle
 *                            [{ key, label, endpoint, title }, ...]
 *   scrollMode  {boolean?} — all pages stacked vertically. Default: false.
 *   onClose     {Function}
 *
 * Performance:
 *   • pdfjs-dist bundled as npm dep — no CDN round-trip on first open
 *   • Module-level ArrayBuffer cache — re-opens are instant (no re-fetch)
 *   • Scroll mode renders pages in parallel batches of RENDER_CONCURRENCY
 *
 * Security:
 *   • Canvas rendering — no native browser PDF toolbar
 *   • Right-click blocked on viewer
 *   • Ctrl/Cmd+S / Ctrl/Cmd+P suppressed while open
 *   • PDF served behind JWT auth
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// ── PDF.js — lazy-loaded on first use so it doesn't hit the main bundle ───────
let _pdfjsLib = null
async function getPDFJS() {
  if (_pdfjsLib) return _pdfjsLib
  _pdfjsLib = await import('pdfjs-dist')
  _pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).href
  return _pdfjsLib
}

// ── Module-level ArrayBuffer cache (survives modal close/reopen) ─────────────
// Key: endpoint string → Value: ArrayBuffer
const pdfBufferCache = new Map()

const SCALE              = 1.4
const RENDER_CONCURRENCY = 5   // pages rendered in parallel in scroll mode

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchPDF(endpoint, token) {
  if (pdfBufferCache.has(endpoint)) return pdfBufferCache.get(endpoint)
  const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Server returned ${res.status}`)
  const buffer = await res.arrayBuffer()
  pdfBufferCache.set(endpoint, buffer)
  return buffer
}

async function loadPDFFromBuffer(buffer) {
  const pdfjs = await getPDFJS()
  return pdfjs.getDocument({ data: buffer.slice(0) }).promise
}

async function renderPageToCanvas(pdf, pageNum, canvas) {
  const dpr      = window.devicePixelRatio || 1
  const page     = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale: SCALE * dpr })
  // Physical pixel dimensions — sharp on HiDPI / Retina screens
  canvas.width        = viewport.width
  canvas.height       = viewport.height
  // CSS dimensions — keep the canvas the same visual size
  canvas.style.width  = `${viewport.width  / dpr}px`
  canvas.style.height = `${viewport.height / dpr}px`
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SecurePDFViewerModal({ title, endpoint, langOptions, scrollMode = false, onClose }) {
  const { token } = useAuth()

  const canvasRef          = useRef(null)   // paged mode
  const renderTask         = useRef(null)   // paged mode cancel handle
  const scrollContainerRef = useRef(null)   // scroll mode
  const pdfRef             = useRef(null)

  // ── Language ────────────────────────────────────────────────────────────────
  const hasLangs     = Array.isArray(langOptions) && langOptions.length > 1
  const [activeLang, setActiveLang] = useState(hasLangs ? langOptions[0].key : null)
  const activeOption   = hasLangs ? (langOptions.find(l => l.key === activeLang) ?? langOptions[0]) : null
  const activeEndpoint = activeOption ? activeOption.endpoint : endpoint
  const activeTitle    = activeOption ? activeOption.title    : title

  // ── State ───────────────────────────────────────────────────────────────────
  const [status,       setStatus]       = useState('loading')
  const [totalPages,   setTotalPages]   = useState(0)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [renderingAll, setRenderingAll] = useState(false)
  const [errorMsg,     setErrorMsg]     = useState('')

  // ── Block Ctrl/Cmd + S / P while open ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  // ── Fetch & load PDF ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setCurrentPage(1)
    setTotalPages(0)
    setRenderingAll(false)
    if (pdfRef.current) { pdfRef.current.destroy(); pdfRef.current = null }

    async function load() {
      try {
        // fetchPDF returns from cache if available — no re-download
        const buffer = await fetchPDF(activeEndpoint, token)
        if (cancelled) return
        const pdf = await loadPDFFromBuffer(buffer)
        if (cancelled) { pdf.destroy(); return }
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          console.error('[SecurePDFViewer]', err)
          setErrorMsg(err.message || 'Failed to load document')
          setStatus('error')
        }
      }
    }

    load()
    return () => {
      cancelled = true
      if (pdfRef.current) { pdfRef.current.destroy(); pdfRef.current = null }
    }
  }, [token, activeEndpoint])

  // ── PAGED MODE: render single page ─────────────────────────────────────────
  const renderPage = useCallback(async (pageNum) => {
    if (!pdfRef.current || !canvasRef.current) return
    try {
      if (renderTask.current) { renderTask.current.cancel(); renderTask.current = null }
      const dpr      = window.devicePixelRatio || 1
      const page     = await pdfRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: SCALE * dpr })
      const canvas   = canvasRef.current
      canvas.width        = viewport.width
      canvas.height       = viewport.height
      canvas.style.width  = `${viewport.width  / dpr}px`
      canvas.style.height = `${viewport.height / dpr}px`
      const task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      renderTask.current = task
      await task.promise
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[SecurePDFViewer] render error', err)
      }
    }
  }, [])

  useEffect(() => {
    if (status === 'ready' && !scrollMode) renderPage(currentPage)
  }, [status, currentPage, renderPage, scrollMode])

  // ── SCROLL MODE: render all pages in parallel batches ──────────────────────
  useEffect(() => {
    if (status !== 'ready' || !scrollMode) return
    let cancelled = false

    async function renderAll() {
      if (!pdfRef.current || !scrollContainerRef.current) return
      setRenderingAll(true)
      const container = scrollContainerRef.current
      const numPages  = pdfRef.current.numPages

      // Pre-create all canvas elements so they appear in order immediately
      const canvases = Array.from({ length: numPages }, (_, i) => {
        const canvas = document.createElement('canvas')
        Object.assign(canvas.style, {
          display:      'block',
          maxWidth:     '100%',
          borderRadius: '3px',
          marginBottom: '6px',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.45)',
        })
        canvas.oncontextmenu = (e) => e.preventDefault()
        container.appendChild(canvas)
        return canvas
      })

      // Render in batches of RENDER_CONCURRENCY
      for (let i = 0; i < numPages; i += RENDER_CONCURRENCY) {
        if (cancelled) break
        const batch = canvases.slice(i, i + RENDER_CONCURRENCY)
        await Promise.all(
          batch.map((canvas, j) => renderPageToCanvas(pdfRef.current, i + j + 1, canvas))
        )
      }

      if (!cancelled) setRenderingAll(false)
    }

    // Clear previous canvases then render
    if (scrollContainerRef.current) {
      while (scrollContainerRef.current.firstChild) {
        scrollContainerRef.current.removeChild(scrollContainerRef.current.firstChild)
      }
    }
    renderAll()
    return () => { cancelled = true }
  }, [status, scrollMode])

  const goToPrev     = () => setCurrentPage(p => Math.max(1, p - 1))
  const goToNext     = () => setCurrentPage(p => Math.min(totalPages, p + 1))
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
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0 gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm tracking-wide truncate">{activeTitle}</p>
            {status === 'ready' && (
              <p className="text-white/40 text-xs mt-0.5">
                {scrollMode
                  ? renderingAll ? 'Rendering pages…' : `${totalPages} pages`
                  : `Page ${currentPage} of ${totalPages}`}
              </p>
            )}
          </div>

          {hasLangs && (
            <div
              className="flex items-center rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {langOptions.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setActiveLang(l.key)}
                  className="px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: activeLang === l.key ? 'rgba(46,150,255,0.85)' : 'transparent',
                    color:      activeLang === l.key ? '#fff' : 'rgba(255,255,255,0.45)',
                    cursor:     activeLang === l.key ? 'default' : 'pointer',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Viewport ────────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center py-4 px-4"
          style={{ background: '#2d2d2d', userSelect: 'none', WebkitUserSelect: 'none' }}
          onContextMenu={blockCtxMenu}
        >
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/50">
              <Loader size={32} className="animate-spin" />
              <p className="text-sm">Loading document…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400">
              <p className="text-sm font-medium">Failed to load document</p>
              <p className="text-xs text-white/40">{errorMsg}</p>
            </div>
          )}

          {/* Paged mode */}
          {status === 'ready' && !scrollMode && (
            <canvas
              ref={canvasRef}
              onContextMenu={blockCtxMenu}
              style={{ display: 'block', boxShadow: '0 4px 32px rgba(0,0,0,0.5)', borderRadius: 4, maxWidth: '100%' }}
            />
          )}

          {/* Scroll mode */}
          {status === 'ready' && scrollMode && (
            <div
              ref={scrollContainerRef}
              style={{ width: '100%' }}
              onContextMenu={blockCtxMenu}
            />
          )}
        </div>

        {/* ── Paged navigation ────────────────────────────────────────────── */}
        {status === 'ready' && !scrollMode && totalPages > 1 && (
          <div
            className="flex items-center justify-center gap-4 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              onClick={goToPrev}
              disabled={currentPage <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-white/60 text-sm tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={goToNext}
              disabled={currentPage >= totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
