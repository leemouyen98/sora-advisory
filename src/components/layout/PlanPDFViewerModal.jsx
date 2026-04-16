/**
 * PlanPDFViewerModal
 * ──────────────────
 * Renders the 5-in-1 protection plan PDF on <canvas> via PDF.js.
 * Protective measures:
 *   • No browser PDF toolbar (not using <embed> / <object>)
 *   • Right-click context menu disabled on canvas area
 *   • Ctrl+S / Ctrl+P / Ctrl+Shift+S keyboard shortcuts suppressed while open
 *   • PDF fetched via authenticated endpoint (not direct asset URL)
 *   • Blob URL is revoked on modal close — no lingering handle
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

// PDF.js from cdnjs — pinned version for stability
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return }
    const script = document.createElement('script')
    script.src = PDFJS_CDN
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    document.head.appendChild(script)
  })
}

const LANGS = {
  zh: { label: '中', endpoint: '/api/documents/plan?lang=zh', title: '5-in-1 完整保障计划' },
  en: { label: 'Eng', endpoint: '/api/documents/plan?lang=en', title: '5-in-1 Complete Protection' },
}

export default function PlanPDFViewerModal({ onClose }) {
  const { token } = useAuth()
  const canvasRef   = useRef(null)
  const pdfRef      = useRef(null)
  const renderTask  = useRef(null)

  const [lang,        setLang]        = useState('zh')         // 'zh' | 'en'
  const [status,      setStatus]      = useState('loading')   // 'loading' | 'ready' | 'error'
  const [totalPages,  setTotalPages]  = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const scale = 1.4
  const [errorMsg,    setErrorMsg]    = useState('')

  // ── Block Ctrl+S / Ctrl+P while modal is open ─────────────────────────────
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

  // ── Fetch & load PDF (re-runs when lang changes) ──────────────────────────
  useEffect(() => {
    let blobUrl = null
    let cancelled = false

    // Reset to loading state when switching language
    setStatus('loading')
    setCurrentPage(1)
    setTotalPages(0)
    if (pdfRef.current) { pdfRef.current.destroy(); pdfRef.current = null }

    async function fetchAndLoad() {
      try {
        const pdfjs = await loadPDFJS()

        const res = await fetch(LANGS[lang].endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)

        const buffer = await res.arrayBuffer()

        if (cancelled) return

        const pdf = await pdfjs.getDocument({ data: buffer }).promise
        if (cancelled) { pdf.destroy(); return }

        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          console.error('[PlanPDFViewer]', err)
          setErrorMsg(err.message || 'Failed to load document')
          setStatus('error')
        }
      }
    }

    fetchAndLoad()
    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      if (pdfRef.current) { pdfRef.current.destroy(); pdfRef.current = null }
    }
  }, [token, lang])

  // ── Render page to canvas ─────────────────────────────────────────────────
  const renderPage = useCallback(async (pageNum, s) => {
    if (!pdfRef.current || !canvasRef.current) return
    try {
      if (renderTask.current) {
        renderTask.current.cancel()
        renderTask.current = null
      }
      const page = await pdfRef.current.getPage(pageNum)
      const viewport = page.getViewport({ scale: s })
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width  = viewport.width
      canvas.height = viewport.height

      const task = page.render({ canvasContext: ctx, viewport })
      renderTask.current = task
      await task.promise
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PlanPDFViewer] render error', err)
      }
    }
  }, [])

  useEffect(() => {
    if (status === 'ready') renderPage(currentPage, scale)
  }, [status, currentPage, scale, renderPage])

  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1))
  const goToNext = () => setCurrentPage(p => Math.min(totalPages, p + 1))

  // ── Block right-click on the canvas / viewer ──────────────────────────────
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
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div>
            <p className="text-white font-semibold text-sm tracking-wide">{LANGS[lang].title}</p>
            {status === 'ready' && (
              <p className="text-white/40 text-xs mt-0.5">
                Page {currentPage} of {totalPages}
              </p>
            )}
          </div>

          {/* ── Language toggle pill ── */}
          <div
            className="flex items-center rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {['zh', 'en'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: lang === l ? 'rgba(46,150,255,0.85)' : 'transparent',
                  color: lang === l ? '#fff' : 'rgba(255,255,255,0.45)',
                  cursor: lang === l ? 'default' : 'pointer',
                }}
              >
                {LANGS[l].label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Canvas viewport ─────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center py-4 px-4"
          style={{
            background: '#2d2d2d',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
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

          {status === 'ready' && (
            <canvas
              ref={canvasRef}
              onContextMenu={blockCtxMenu}
              style={{
                display: 'block',
                boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
                borderRadius: 4,
                maxWidth: '100%',
              }}
            />
          )}
        </div>

        {/* ── Page navigation ─────────────────────────────────────────────── */}
        {status === 'ready' && totalPages > 1 && (
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
