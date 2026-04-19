/**
 * PDFThumbnail
 * ─────────────
 * Lazy-renders the first page of a JWT-authenticated PDF as a canvas thumbnail.
 *   • IntersectionObserver — only renders when the card enters the viewport
 *   • Module-level ArrayBuffer cache — revisiting a folder skips the network
 *   • Cancellation-safe — won't setState after unmount
 *   • Right-click blocked on the canvas
 */
import { useEffect, useRef, useState } from 'react'
import { Loader, FileText } from 'lucide-react'

// ── Module-level cache & pdfjs singleton ─────────────────────────────────────
const _bufferCache = new Map()   // endpoint → ArrayBuffer
let   _pdfjs       = null

async function getPDFJS() {
  if (_pdfjs) return _pdfjs
  _pdfjs = await import('pdfjs-dist')
  _pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).href
  return _pdfjs
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PDFThumbnail({ fileId, token }) {
  const containerRef = useRef(null)
  const canvasRef    = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false

    async function load() {
      setStatus('loading')
      try {
        const endpoint = `/api/library/files/${fileId}/view`
        let buffer = _bufferCache.get(endpoint)
        if (!buffer) {
          const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          buffer = await res.arrayBuffer()
          _bufferCache.set(endpoint, buffer)
        }
        if (cancelled) return

        const pdfjs = await getPDFJS()
        if (cancelled) return

        const pdf   = await pdfjs.getDocument({ data: buffer.slice(0) }).promise
        if (cancelled) { pdf.destroy(); return }

        const page  = await pdf.getPage(1)
        const dpr   = window.devicePixelRatio || 1
        // Scale so the rendered canvas fills ~240 CSS-px width
        const vp0   = page.getViewport({ scale: 1 })
        const scale = (240 * dpr) / vp0.width
        const vp    = page.getViewport({ scale })

        const canvas = canvasRef.current
        if (!canvas || cancelled) { pdf.destroy(); return }

        canvas.width        = vp.width
        canvas.height       = vp.height
        canvas.style.width  = '100%'
        canvas.style.height = 'auto'
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        pdf.destroy()
        if (!cancelled) setStatus('done')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { io.disconnect(); load() } },
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [fileId, token])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#EBEBF0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {status === 'idle'    && <FileText size={22} style={{ color: '#FF3B30', opacity: 0.3 }} />}
      {status === 'loading' && <Loader   size={15} className="animate-spin" style={{ color: '#C7C7CC' }} />}
      {status === 'error'   && <FileText size={22} style={{ color: '#FF3B30', opacity: 0.35 }} />}
      <canvas
        ref={canvasRef}
        onContextMenu={e => e.preventDefault()}
        style={{ display: status === 'done' ? 'block' : 'none', width: '100%', height: 'auto' }}
      />
    </div>
  )
}
