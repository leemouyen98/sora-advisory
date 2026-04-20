/**
 * MedicalUnderwritingPage — Medical Underwriting Quick Reference Guide
 * ─────────────────────────────────────────────────────────────────────
 * Three-panel layout:
 *   Left   (200px) — Category list + global search
 *   Middle (240px) — Condition list (visible when category selected)
 *   Right  (flex)  — Markdown detail viewer
 *
 * Content served from /public/Underwriting/ (static files, no backend).
 * Admin-only while in development.
 */
import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Stethoscope, Search, X, Loader, ChevronRight, HelpCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// ── Design tokens ─────────────────────────────────────────────────────────────
const BRAND = '#2E96FF'

const CAT_COLORS = [
  '#FF3B30', // 1  Cancer, Tumour & Blood Diseases
  '#FF2D55', // 2  Cardiovascular Diseases
  '#AF52DE', // 3  Brain & Nervous Diseases
  '#5856D6', // 4  Endocrine Diseases
  '#30B0C7', // 5  Urinary Diseases
  '#34C759', // 6  Respiratory Diseases
  '#FF9500', // 7  Digestive Diseases
  '#8B5CF6', // 8  Skeleton Diseases
  '#007AFF', // 9  Specific Sense Diseases
  '#6366F1', // 10 Mental Diseases
  '#F97316', // 11 Biliary Diseases
  '#10B981', // 12 Family History
  '#2E96FF', // 13 Diagnostic & Tests
  '#EC4899', // 14 STD & AIDS
]

// ── URL helpers ───────────────────────────────────────────────────────────────
function conditionUrl(category, condition) {
  return (
    '/Underwriting/' +
    encodeURIComponent('Medical Underwriting') + '/' +
    encodeURIComponent('00. Medical Underwriting') + '/' +
    encodeURIComponent(category) + '/' +
    encodeURIComponent(condition) + '.md'
  )
}

function mediaUrl(filename) {
  return '/Underwriting/' + encodeURIComponent('Media Folder') + '/' + encodeURIComponent(filename)
}

function youTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// ── Markdown parser ───────────────────────────────────────────────────────────
// Handles: Obsidian wikilinks, YouTube embeds, ## headings, > blockquotes
function parseMarkdown(raw) {
  const lines = raw.split('\n').map(l =>
    // Strip zero-width non-breaking spaces and other invisible chars from copy-paste
    l.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
  )
  const blocks = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip Obsidian tag lines like #Medical_Underwriting/Category
    if (/^#[A-Za-z_/]/.test(line)) { i++; continue }

    // Section heading — ## HEADING
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', text: line.slice(3).trim() })
      i++; continue
    }

    // Obsidian image wikilink — ![[filename.ext]]
    const wikiImg = line.match(/!\[\[(.+?)\]\]/)
    if (wikiImg) {
      blocks.push({ type: 'image', name: wikiImg[1].trim() })
      i++; continue
    }

    // Standard markdown link — could be YouTube or image
    const mdLink = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (mdLink) {
      const ytId = youTubeId(mdLink[2])
      if (ytId) blocks.push({ type: 'youtube', id: ytId, title: mdLink[1] })
      // Non-YouTube image links are ignored (shouldn't exist in this dataset)
      i++; continue
    }

    // Blockquote — collect consecutive > lines (blank > lines are kept as spacers)
    if (line.startsWith('>')) {
      const bqLines = []
      while (i < lines.length && lines[i].startsWith('>')) {
        bqLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      // Trim leading/trailing blanks from the block
      while (bqLines.length && !bqLines[0].trim()) bqLines.shift()
      while (bqLines.length && !bqLines[bqLines.length - 1].trim()) bqLines.pop()
      if (bqLines.length) blocks.push({ type: 'blockquote', lines: bqLines })
      continue
    }

    // Regular paragraph text
    if (line.trim()) blocks.push({ type: 'text', text: line.trim() })
    i++
  }

  return blocks
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownContent({ blocks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {blocks.map((block, i) => {

        if (block.type === 'text') return (
          <p key={i} style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>
            {block.text}
          </p>
        )

        if (block.type === 'heading') return (
          <div key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>
            <h3 style={{
              fontSize: 10.5, fontWeight: 700, color: '#9CA3AF',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: 0, paddingBottom: 8,
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              {block.text}
            </h3>
          </div>
        )

        if (block.type === 'image') return (
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#F2F2F7' }}>
            <img
              src={mediaUrl(block.name)}
              alt={block.name.replace(/\s*\d+\.(png|jpg|jpeg)$/i, '')}
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
              onError={e => {
                e.target.style.display = 'none'
                e.target.parentElement.style.display = 'none'
              }}
            />
          </div>
        )

        if (block.type === 'youtube') return (
          <div key={i} style={{
            borderRadius: 12, overflow: 'hidden',
            aspectRatio: '16/9', background: '#000',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
            <iframe
              src={`https://www.youtube.com/embed/${block.id}`}
              title={block.title || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        )

        if (block.type === 'blockquote') return (
          <div key={i} style={{
            borderLeft: '3px solid rgba(46,150,255,0.25)',
            background: 'rgba(46,150,255,0.03)',
            borderRadius: '0 10px 10px 0',
            padding: '10px 14px',
          }}>
            {block.lines.map((line, j) => (
              line.trim()
                ? <p key={j} style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: '2px 0' }}>{line}</p>
                : <div key={j} style={{ height: 6 }} />
            ))}
          </div>
        )

        return null
      })}
    </div>
  )
}

// ── Name helpers ──────────────────────────────────────────────────────────────
const CJK_RE = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/

function engName(str) {
  return str.replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]+.*$/g, '').trim() || str
}

function cnName(str) {
  const match = str.match(/[\u4e00-\u9fff].*$/)
  return match ? match[0].trim() : ''
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MedicalUnderwritingPage() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  const [manifest,        setManifest]        = useState([])
  const [loadingManifest, setLoadingManifest] = useState(true)
  const [selectedCat,     setSelectedCat]     = useState(null)
  const [selectedCond,    setSelectedCond]    = useState(null)
  const [condSearch,      setCondSearch]      = useState('')
  const [globalSearch,    setGlobalSearch]    = useState('')
  const [mdBlocks,        setMdBlocks]        = useState(null)
  const [loadingMd,       setLoadingMd]       = useState(false)

  // Load manifest
  useEffect(() => {
    fetch('/Underwriting/manifest.json')
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest([]))
      .finally(() => setLoadingManifest(false))
  }, [])

  // Reset condition list when category changes
  useEffect(() => {
    setSelectedCond(null)
    setCondSearch('')
    setMdBlocks(null)
  }, [selectedCat])

  // Fetch markdown when condition selected
  useEffect(() => {
    if (!selectedCat || !selectedCond) { setMdBlocks(null); return }
    setLoadingMd(true)
    setMdBlocks(null)
    fetch(conditionUrl(selectedCat.category, selectedCond))
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.text()
      })
      .then(text => setMdBlocks(parseMarkdown(text)))
      .catch(() => setMdBlocks([{ type: 'text', text: 'Content could not be loaded.' }]))
      .finally(() => setLoadingMd(false))
  }, [selectedCat, selectedCond])

  // Global search across all conditions
  const globalResults = useMemo(() => {
    if (!globalSearch.trim()) return []
    const q = globalSearch.toLowerCase()
    const out = []
    for (const cat of manifest) {
      for (const cond of cat.conditions) {
        if (cond.toLowerCase().includes(q)) out.push({ category: cat.category, condition: cond })
      }
    }
    return out.slice(0, 40)
  }, [globalSearch, manifest])

  const filteredConditions = useMemo(() => {
    if (!selectedCat) return []
    if (!condSearch.trim()) return selectedCat.conditions
    const q = condSearch.toLowerCase()
    return selectedCat.conditions.filter(c => c.toLowerCase().includes(q))
  }, [selectedCat, condSearch])

  const catIndex = selectedCat ? manifest.findIndex(c => c.category === selectedCat.category) : -1
  const catColor = catIndex >= 0 ? CAT_COLORS[catIndex % CAT_COLORS.length] : BRAND

  const showGlobal   = !!globalSearch
  const showWelcome  = !showGlobal && !selectedCat
  const showCondList = !showGlobal && !!selectedCat
  const showDetail   = showCondList && !!selectedCond

  return (
    <div className="flex h-full" style={{ background: '#F2F2F7' }}>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — Categories
          ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: 210, flexShrink: 0,
        background: '#FAFAFA',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(46,150,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stethoscope size={14} style={{ color: BRAND }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#040E1C' }}>UW Guide</span>
        </div>

        {/* Global search */}
        <div style={{ padding: '10px 10px 6px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              color: '#9CA3AF', pointerEvents: 'none',
            }} />
            <input
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search all conditions…"
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 24, paddingRight: globalSearch ? 24 : 8,
                paddingTop: 5, paddingBottom: 5,
                fontSize: 11.5, color: '#040E1C',
                border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7,
                outline: 'none', background: 'white',
              }}
              onFocus={e => { e.target.style.borderColor = BRAND }}
              onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.1)' }}
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch('')} style={{
                position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        {!globalSearch && (
          <div style={{ padding: '2px 14px 4px' }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#C4C4C4', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Categories
            </span>
          </div>
        )}

        {/* Category list */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {loadingManifest ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
              <Loader size={16} className="animate-spin" style={{ color: '#D1D5DB' }} />
            </div>
          ) : manifest.map((cat, idx) => {
            const color  = CAT_COLORS[idx % CAT_COLORS.length]
            const active = selectedCat?.category === cat.category && !globalSearch
            return (
              <div
                key={cat.category}
                onClick={() => { setGlobalSearch(''); setSelectedCat(active ? null : cat) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px 7px 14px',
                  cursor: 'pointer',
                  background: active ? `${color}12` : 'transparent',
                  position: 'relative', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', left: 0, top: 4, bottom: 4,
                    width: 3, borderRadius: '0 3px 3px 0', background: color,
                  }} />
                )}
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{
                  fontSize: 11.5, lineHeight: 1.4, flex: 1,
                  color: active ? '#040E1C' : '#374151',
                  fontWeight: active ? 600 : 400,
                }}>
                  {cat.category.replace(/^\d+\.\s*/, '')}
                </span>
                <span style={{ fontSize: 9.5, color: '#C4C4C4', flexShrink: 0 }}>
                  {cat.conditions.length}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MIDDLE PANEL — Condition list
          ════════════════════════════════════════════════════════════════════ */}
      {showCondList && (
        <div style={{
          width: 240, flexShrink: 0,
          background: 'white',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Category header */}
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: catColor, lineHeight: 1.3, marginBottom: 2 }}>
              {selectedCat.category.replace(/^\d+\.\s*/, '')}
            </p>
            <p style={{ fontSize: 10.5, color: '#9CA3AF' }}>
              {selectedCat.conditions.length} conditions
            </p>
          </div>

          {/* Filter within category */}
          <div style={{ padding: '8px 10px 6px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                color: '#9CA3AF', pointerEvents: 'none',
              }} />
              <input
                value={condSearch}
                onChange={e => setCondSearch(e.target.value)}
                placeholder="Filter conditions…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  paddingLeft: 24, paddingRight: condSearch ? 24 : 8,
                  paddingTop: 4, paddingBottom: 4,
                  fontSize: 11.5, color: '#040E1C',
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7,
                  outline: 'none', background: '#FAFAFA',
                }}
                onFocus={e => { e.target.style.borderColor = catColor }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(0,0,0,0.1)' }}
              />
              {condSearch && (
                <button onClick={() => setCondSearch('')} style={{
                  position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                  color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Condition rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConditions.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingTop: 24 }}>No match</p>
            ) : filteredConditions.map(cond => {
              const active = selectedCond === cond
              const en = engName(cond)
              const cn = cnName(cond)
              return (
                <div
                  key={cond}
                  onClick={() => setSelectedCond(cond)}
                  style={{
                    padding: '8px 12px 8px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(0,0,0,0.03)',
                    borderLeft: `3px solid ${active ? catColor : 'transparent'}`,
                    background: active ? `${catColor}08` : 'transparent',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F9FAFB' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <p style={{
                    fontSize: 12.5, lineHeight: 1.3, margin: 0,
                    fontWeight: active ? 600 : 400,
                    color: active ? catColor : '#111827',
                  }}>
                    {en}
                  </p>
                  {cn && (
                    <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '2px 0 0' }}>{cn}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Detail / Welcome / Global search results
          ════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Global search results ── */}
        {showGlobal && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <p style={{
              fontSize: 10.5, fontWeight: 700, color: '#9CA3AF',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14,
            }}>
              {globalResults.length} result{globalResults.length !== 1 ? 's' : ''} for &ldquo;{globalSearch}&rdquo;
            </p>
            {globalResults.length === 0 ? (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>No conditions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 640 }}>
                {globalResults.map((r, i) => {
                  const cidx  = manifest.findIndex(c => c.category === r.category)
                  const color = cidx >= 0 ? CAT_COLORS[cidx % CAT_COLORS.length] : BRAND
                  const en    = engName(r.condition)
                  const cn    = cnName(r.condition)
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        const cat = manifest.find(c => c.category === r.category)
                        setSelectedCat(cat)
                        setSelectedCond(r.condition)
                        setGlobalSearch('')
                      }}
                      style={{
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                        background: 'white', border: '1px solid rgba(0,0,0,0.07)',
                        display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{en}</p>
                        {cn && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{cn}</p>}
                      </div>
                      <span style={{
                        fontSize: 10.5, color, background: `${color}12`,
                        padding: '2px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap',
                      }}>
                        {r.category.replace(/^\d+\.\s*/, '')}
                      </span>
                      <ChevronRight size={13} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Welcome state ── */}
        {showWelcome && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                width: 68, height: 68, borderRadius: 20,
                background: 'rgba(46,150,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Stethoscope size={30} strokeWidth={1.4} style={{ color: BRAND, opacity: 0.75 }} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: '#040E1C', margin: '0 0 6px' }}>
                Medical Underwriting Guide
              </h2>
              <p style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 320, margin: '0 auto' }}>
                {loadingManifest
                  ? 'Loading…'
                  : `${manifest.reduce((s, c) => s + c.conditions.length, 0)} conditions across ${manifest.length} categories`
                }
              </p>
            </div>

            {/* Category cards */}
            {!loadingManifest && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                gap: 10, maxWidth: 780, margin: '0 auto',
              }}>
                {manifest.map((cat, idx) => {
                  const color = CAT_COLORS[idx % CAT_COLORS.length]
                  return (
                    <div
                      key={cat.category}
                      onClick={() => setSelectedCat(cat)}
                      style={{
                        background: 'white', borderRadius: 12,
                        padding: '14px 12px 12px', textAlign: 'center',
                        border: '1px solid rgba(0,0,0,0.07)',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        transition: 'all 0.14s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none' }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 11,
                        background: `${color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 9px',
                      }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#111827', lineHeight: 1.35, margin: '0 0 3px' }}>
                        {cat.category.replace(/^\d+\.\s*/, '')}
                      </p>
                      <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>
                        {cat.conditions.length} conditions
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── No condition selected yet ── */}
        {showCondList && !showDetail && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 40,
          }}>
            <HelpCircle size={36} strokeWidth={1.3} style={{ color: '#D1D5DB', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>
              Select a condition from the list
            </p>
          </div>
        )}

        {/* ── Condition detail ── */}
        {showDetail && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Detail header */}
            <div style={{
              background: 'white', padding: '14px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}>
              <span style={{
                display: 'inline-block',
                fontSize: 10, fontWeight: 700, color: catColor,
                background: `${catColor}12`, padding: '2px 8px', borderRadius: 20,
                marginBottom: 6,
              }}>
                {selectedCat.category.replace(/^\d+\.\s*/, '')}
              </span>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#040E1C', margin: 0, lineHeight: 1.3 }}>
                {engName(selectedCond)}
              </h2>
              {CJK_RE.test(selectedCond) && (
                <p style={{ fontSize: 12.5, color: '#6B7280', margin: '3px 0 0' }}>
                  {cnName(selectedCond)}
                </p>
              )}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 40px' }}>
              {loadingMd && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                  <Loader size={22} className="animate-spin" style={{ color: '#D1D5DB' }} />
                </div>
              )}
              {!loadingMd && mdBlocks && (
                <div style={{ maxWidth: 760 }}>
                  <MarkdownContent blocks={mdBlocks} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
