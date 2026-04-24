/**
 * MedicalUnderwritingPage v3
 * ─────────────────────────────────────────────────────────────────────
 * Layout aligned with Knowledge Library Hub:
 *
 * Mobile  (< 768px)  : iOS-style header strip (back arrow + title + actions)
 *                      3-panel slide navigation (Home → Conditions → Detail)
 *                      ⌘K / search icon toggles expandable search bar
 * Tablet  (768–1023) : Collapsible category drawer (same as KL folder drawer)
 *                      Header strip with drawer toggle + lang toggle
 *                      Main area: conditions column + detail panel
 * Desktop (≥ 1024px) : Persistent 3-column (categories | conditions | detail)
 *
 * Features (unchanged):
 *   • Bilingual content toggle (双 / EN / 中)
 *   • EN+ZH pairs parsed and rendered together
 *   • Category icons (lucide-react) + colours
 *   • Recent conditions (localStorage, last 8)
 *   • Global search with ⌘K shortcut
 *   • Smooth 250 ms slide animation on mobile
 *   • 44 px min touch targets (Apple HIG)
 *   • Safe-area & bottom-nav aware
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Stethoscope, Search, X, ChevronRight, ChevronLeft, ArrowLeft,
  PanelLeftClose, PanelLeftOpen,
  Heart, Brain, Activity, Droplets, Wind, Utensils, Bone, Eye,
  Users, Flame, FlaskConical, ShieldAlert, Dna, Clock,
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

const CAT_ICONS = [
  Dna, Heart, Brain, Activity, Droplets, Wind,
  Utensils, Bone, Eye, Brain, Flame, Users, FlaskConical, ShieldAlert,
]

// ── Responsive hook (matches Knowledge Library Hub) ───────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function conditionUrl(category, condition) {
  return (
    '/Underwriting/' +
    encodeURIComponent('Medical Underwriting') + '/' +
    encodeURIComponent('00. Medical Underwriting') + '/' +
    encodeURIComponent(category) + '/' +
    encodeURIComponent(condition) + '.md'
  )
}
function mediaUrl(f) {
  return '/Underwriting/' + encodeURIComponent('Media Folder') + '/' + encodeURIComponent(f)
}
function youTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}
const hasCJK = s => /[\u4e00-\u9fff]/.test(s)
function engName(str) {
  return str.replace(/\s*[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef].*$/, '').trim() || str
}
function cnName(str) {
  const m = str.match(/[\u4e00-\u9fff].+$/)
  return m ? m[0].trim() : ''
}

// ── Markdown parser — bilingual pair-aware ────────────────────────────────────
function parseMarkdown(raw) {
  const lines = raw.split('\n').map(l => l.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, ''))
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^#[A-Za-z_/]/.test(line)) { i++; continue }

    if (line.startsWith('## ')) {
      const en = line.slice(3).trim()
      const nxt = lines[i + 1] || ''
      if (nxt.startsWith('## ') && hasCJK(nxt.slice(3))) {
        blocks.push({ type: 'heading', en, zh: nxt.slice(3).trim() })
        i += 2
      } else {
        blocks.push({ type: 'heading', en, zh: null })
        i++
      }
      continue
    }

    const wikiImg = line.match(/!\[\[(.+?)\]\]/)
    if (wikiImg) { blocks.push({ type: 'image', name: wikiImg[1].trim() }); i++; continue }

    const mdLink = line.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (mdLink) {
      const ytId = youTubeId(mdLink[2])
      if (ytId) blocks.push({ type: 'youtube', id: ytId, title: mdLink[1] })
      i++; continue
    }

    if (line.startsWith('>')) {
      const bqLines = []
      while (i < lines.length && lines[i].startsWith('>')) {
        bqLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      while (bqLines.length && !bqLines[0].trim()) bqLines.shift()
      while (bqLines.length && !bqLines[bqLines.length - 1].trim()) bqLines.pop()
      if (bqLines.length) {
        const pairs = []
        let j = 0
        while (j < bqLines.length) {
          const bl = bqLines[j]
          if (!bl.trim()) { pairs.push(null); j++; continue }
          if (hasCJK(bl)) { pairs.push({ en: null, zh: bl }); j++; continue }
          const nxt = bqLines[j + 1] || ''
          if (nxt.trim() && hasCJK(nxt)) { pairs.push({ en: bl, zh: nxt }); j += 2 }
          else { pairs.push({ en: bl, zh: null }); j++ }
        }
        blocks.push({ type: 'blockquote', pairs })
      }
      continue
    }

    if (line.trim()) {
      if (!hasCJK(line)) {
        const nxt = lines[i + 1] || ''
        if (nxt.trim() && hasCJK(nxt)) {
          blocks.push({ type: 'text', en: line.trim(), zh: nxt.trim() })
          i += 2; continue
        }
        blocks.push({ type: 'text', en: line.trim(), zh: null })
      } else {
        blocks.push({ type: 'text', en: null, zh: line.trim() })
      }
    }
    i++
  }
  return blocks
}

// ── MarkdownContent ───────────────────────────────────────────────────────────
function MarkdownContent({ blocks, lang, catColor }) {
  const showEn = lang !== 'zh'
  const showZh = lang !== 'en'
  const accent = catColor || BRAND

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {blocks.map((block, i) => {

        if (block.type === 'text') {
          if (!block.en && !block.zh) return null
          return (
            <div key={i}>
              {showEn && block.en && (
                <p style={{ fontSize: 15, color: '#1C1C1E', lineHeight: 1.72, margin: 0 }}>{block.en}</p>
              )}
              {showZh && block.zh && (
                <p style={{
                  fontSize: 14, color: '#636366', lineHeight: 1.75,
                  margin: showEn && block.en ? '3px 0 0' : 0,
                  fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
                }}>{block.zh}</p>
              )}
            </div>
          )
        }

        if (block.type === 'heading') {
          return (
            <div key={i} style={{ paddingTop: i > 0 ? 10 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                {showEn && (
                  <h3 style={{ fontSize: 10.5, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.09em', margin: 0 }}>
                    {block.en}
                  </h3>
                )}
                {showZh && block.zh && (
                  <span style={{ fontSize: showEn ? 10.5 : 12, color: '#C7C7CC', fontWeight: showEn ? 500 : 600 }}>
                    {block.zh}
                  </span>
                )}
              </div>
            </div>
          )
        }

        if (block.type === 'image') {
          return (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: '#F2F2F7', lineHeight: 0 }}>
              <img
                src={mediaUrl(block.name)}
                alt={block.name.replace(/\s*\d+\.(png|jpg|jpeg)$/i, '')}
                style={{ display: 'block', width: '100%', height: 'auto' }}
                onError={e => { e.target.parentElement.style.display = 'none' }}
              />
            </div>
          )
        }

        if (block.type === 'youtube') {
          return (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9', background: '#000', boxShadow: '0 4px 18px rgba(0,0,0,0.15)' }}>
              <iframe
                src={`https://www.youtube.com/embed/${block.id}`}
                title={block.title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            </div>
          )
        }

        if (block.type === 'blockquote') {
          return (
            <div key={i} style={{
              background: `${accent}06`,
              border: `1px solid ${accent}18`,
              borderLeft: `3px solid ${accent}55`,
              borderRadius: '0 12px 12px 0',
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {block.pairs.map((pair, j) => {
                if (!pair) return <div key={j} style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '0 -2px' }} />
                if (!pair.en && !pair.zh) return null
                return (
                  <div key={j}>
                    {showEn && pair.en && (
                      <p style={{ fontSize: 13.5, color: '#1C1C1E', lineHeight: 1.6, margin: 0 }}>{pair.en}</p>
                    )}
                    {showZh && pair.zh && (
                      <p style={{
                        fontSize: 13, color: '#636366', lineHeight: 1.65,
                        margin: showEn && pair.en ? '3px 0 0' : 0,
                        fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
                      }}>{pair.zh}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// ── LangToggle ────────────────────────────────────────────────────────────────
function LangToggle({ value, onChange }) {
  const opts = [{ id: 'bilingual', label: '双' }, { id: 'en', label: 'EN' }, { id: 'zh', label: '中' }]
  return (
    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.07)', borderRadius: 9, padding: 2, gap: 1 }}>
      {opts.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)} style={{
          minWidth: 32, height: 28, padding: '0 9px',
          fontSize: 12, fontWeight: value === opt.id ? 700 : 400,
          color: value === opt.id ? '#1C1C1E' : '#8E8E93',
          background: value === opt.id ? 'white' : 'transparent',
          borderRadius: 7, border: 'none', cursor: 'pointer',
          boxShadow: value === opt.id ? '0 1px 4px rgba(0,0,0,0.14)' : 'none',
          transition: 'all 0.15s',
        }}>{opt.label}</button>
      ))}
    </div>
  )
}

// ── ConditionRow ──────────────────────────────────────────────────────────────
function ConditionRow({ cond, active, color, onClick }) {
  const en = engName(cond)
  const cn = cnName(cond)
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', minHeight: 44,
        borderLeft: `3px solid ${active ? color : 'transparent'}`,
        background: active ? `${color}09` : 'transparent',
        border: 'none',
        outline: `0px solid transparent`,
        cursor: 'pointer', textAlign: 'left',
        borderBottom: '1px solid rgba(0,0,0,0.045)',
        transition: 'background 0.12s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.03)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {active && <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, borderRadius: '0 3px 3px 0', background: color }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? color : '#1C1C1E', margin: 0, lineHeight: 1.3 }}>{en}</p>
        {cn && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '2px 0 0', lineHeight: 1.3 }}>{cn}</p>}
      </div>
      {active && <ChevronRight size={13} style={{ color, flexShrink: 0 }} />}
    </button>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = '#E5E5EA', accentColor = BRAND, size = 22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2.5px solid ${color}`,
      borderTopColor: accentColor,
      animation: 'uw-spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MedicalUnderwritingPage() {
  useAuth()

  const { isMobile, isTablet, isDesktop } = useResponsive()

  // ── State ─────────────────────────────────────────────────────────────────
  const [manifest,           setManifest]           = useState([])
  const [loadingManifest,    setLoadingManifest]    = useState(true)
  const [selectedCat,        setSelectedCat]        = useState(null)
  const [selectedCond,       setSelectedCond]       = useState(null)
  const [condSearch,         setCondSearch]         = useState('')
  const [globalSearch,       setGlobalSearch]       = useState('')
  const [mdBlocks,           setMdBlocks]           = useState(null)
  const [loadingMd,          setLoadingMd]          = useState(false)
  const [mobilePanel,        setMobilePanel]        = useState(0)   // 0=home 1=conditions 2=detail
  const [drawerOpen,         setDrawerOpen]         = useState(false) // tablet category drawer
  const [mobileSearchOpen,   setMobileSearchOpen]   = useState(false) // mobile panel 0 search
  const [mobileCondSearch,   setMobileCondSearch]   = useState(false) // mobile panel 1 filter
  const [lang,               setLang]               = useState(() => localStorage.getItem('uw-lang') || 'bilingual')
  const [recent,             setRecent]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('uw-recent') || '[]') } catch { return [] }
  })
  const searchRef   = useRef(null)
  const condListRef = useRef(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const catIndex = selectedCat ? manifest.findIndex(c => c.category === selectedCat.category) : -1
  const catColor = catIndex >= 0 ? CAT_COLORS[catIndex % CAT_COLORS.length] : BRAND
  const CatIcon  = catIndex >= 0 ? (CAT_ICONS[catIndex % CAT_ICONS.length] || Stethoscope) : Stethoscope

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/Underwriting/manifest.json', { cache: 'no-store' })
      .then(r => r.json()).then(setManifest).catch(() => setManifest([]))
      .finally(() => setLoadingManifest(false))
  }, [])

  useEffect(() => {
    setSelectedCond(null); setCondSearch(''); setMdBlocks(null)
    if (condListRef.current) condListRef.current.scrollTop = 0
  }, [selectedCat])

  useEffect(() => {
    if (!selectedCat || !selectedCond) { setMdBlocks(null); return }
    setLoadingMd(true); setMdBlocks(null)
    fetch(conditionUrl(selectedCat.category, selectedCond), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => setMdBlocks(parseMarkdown(text)))
      .catch(() => setMdBlocks([{ type: 'text', en: 'Content could not be loaded.', zh: null }]))
      .finally(() => setLoadingMd(false))
  }, [selectedCat, selectedCond])

  useEffect(() => { localStorage.setItem('uw-lang', lang) }, [lang])

  // Close drawer when going to desktop
  useEffect(() => { if (isDesktop) setDrawerOpen(false) }, [isDesktop])

  // Reset expandable search bars on mobile panel change
  useEffect(() => {
    setMobileSearchOpen(false)
    setMobileCondSearch(false)
  }, [mobilePanel])

  // ⌘K shortcut
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        if (isMobile) setMobileSearchOpen(true)
      }
      if (e.key === 'Escape') { setGlobalSearch('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLang = useCallback(v => setLang(v), [])

  const openCondition = useCallback((cat, cond, fromSearch = false) => {
    const catObj = typeof cat === 'string' ? manifest.find(c => c.category === cat) : cat
    if (!catObj) return
    setSelectedCat(catObj)
    setSelectedCond(cond)
    if (fromSearch) setGlobalSearch('')
    setMobilePanel(2)
    setDrawerOpen(false)
    setRecent(prev => {
      const entry = { category: catObj.category, condition: cond }
      const next  = [entry, ...prev.filter(r => r.condition !== cond)].slice(0, 8)
      localStorage.setItem('uw-recent', JSON.stringify(next))
      return next
    })
  }, [manifest])

  const openCategory = useCallback(cat => {
    setSelectedCat(cat); setMobilePanel(1)
  }, [])

  // ── Filtered lists ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return []
    const q = globalSearch.toLowerCase()
    return manifest.flatMap(cat =>
      cat.conditions
        .filter(c => c.toLowerCase().includes(q))
        .map(c => ({ category: cat.category, condition: c }))
    ).slice(0, 30)
  }, [globalSearch, manifest])

  const filteredConditions = useMemo(() => {
    if (!selectedCat) return []
    if (!condSearch.trim()) return selectedCat.conditions
    const q = condSearch.toLowerCase()
    return selectedCat.conditions.filter(c => c.toLowerCase().includes(q))
  }, [selectedCat, condSearch])

  // ── Shared UI helpers ─────────────────────────────────────────────────────

  function renderSearchBar({ value, onChange, placeholder = 'Search… (⌘K)', compact = false, inputRef }) {
    return (
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 30, paddingRight: value ? 30 : 10,
            paddingTop: compact ? 5 : 7, paddingBottom: compact ? 5 : 7,
            fontSize: 13.5, color: '#1C1C1E',
            background: 'rgba(142,142,147,0.12)',
            border: '1.5px solid transparent',
            borderRadius: 10, outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onFocus={e => { e.target.style.background = 'white'; e.target.style.borderColor = BRAND }}
          onBlur={e  => { e.target.style.background = 'rgba(142,142,147,0.12)'; e.target.style.borderColor = 'transparent' }}
        />
        {value && (
          <button onClick={() => onChange('')} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#AEAEB2', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          }}>
            <X size={10} style={{ color: 'white' }} />
          </button>
        )}
      </div>
    )
  }

  function renderSearchDropdown() {
    if (!globalSearch) return null
    return (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100 }}>
        <div style={{
          background: 'white', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.08)',
          overflow: 'hidden', maxHeight: 380, overflowY: 'auto',
        }}>
          {searchResults.length === 0 ? (
            <p style={{ padding: '14px 16px', fontSize: 13.5, color: '#8E8E93', margin: 0 }}>
              No results for &ldquo;{globalSearch}&rdquo;
            </p>
          ) : searchResults.map((r, i) => {
            const cidx  = manifest.findIndex(c => c.category === r.category)
            const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
            const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
            return (
              <button key={i} onClick={() => openCondition(r.category, r.condition, true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', borderBottom: i < searchResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F7' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1C1E', margin: 0, lineHeight: 1.3 }}>{engName(r.condition)}</p>
                  {cnName(r.condition) && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '1px 0 0' }}>{cnName(r.condition)}</p>}
                </div>
                <span style={{ fontSize: 10.5, color, background: `${color}12`, padding: '2px 8px', borderRadius: 20, flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {r.category.replace(/^\d+\.\s*/, '')}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderDetailContent() {
    if (loadingMd) return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <Spinner accentColor={catColor} />
      </div>
    )
    if (!mdBlocks) return null
    return <MarkdownContent blocks={mdBlocks} lang={lang} catColor={catColor} />
  }

  // ── Category Panel Content (used in desktop sidebar + tablet drawer) ───────
  const CategoryPanelContent = ({ inDrawer = false }) => (
    <>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${BRAND}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope size={14} style={{ color: BRAND }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#040E1C', margin: 0, lineHeight: 1.2 }}>UW Guide</p>
              {!loadingManifest && (
                <p style={{ fontSize: 10.5, color: '#8E8E93', margin: 0 }}>
                  {manifest.reduce((s, c) => s + c.conditions.length, 0)} conditions
                </p>
              )}
            </div>
          </div>
          {inDrawer && (
            <button onClick={() => setDrawerOpen(false)}
              style={{ width: 28, height: 28, borderRadius: 14, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
              <X size={13} style={{ color: '#6B7280' }} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          {renderSearchBar({ value: globalSearch, onChange: setGlobalSearch, inputRef: searchRef, compact: true })}
          {renderSearchDropdown()}
        </div>
      </div>

      {/* Categories label */}
      {!globalSearch && (
        <div style={{ padding: '8px 14px 4px', flexShrink: 0 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#C7C7CC', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Categories</span>
        </div>
      )}

      {/* Category list */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {loadingManifest ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
            <Spinner size={20} />
          </div>
        ) : manifest.map((cat, idx) => {
          const color  = CAT_COLORS[idx % CAT_COLORS.length]
          const Icon   = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
          const active = selectedCat?.category === cat.category && !globalSearch
          return (
            <button key={cat.category}
              onClick={() => { setGlobalSearch(''); setSelectedCat(active ? null : cat); if (inDrawer) setDrawerOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px 8px 14px',
                background: active ? `${color}10` : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                position: 'relative', transition: 'background 0.12s', minHeight: 40,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {active && <span style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: '0 3px 3px 0', background: color }} />}
              <div style={{ width: 26, height: 26, borderRadius: 8, background: active ? `${color}22` : `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={12} style={{ color }} />
              </div>
              <span style={{ fontSize: 12, lineHeight: 1.35, flex: 1, color: active ? '#1C1C1E' : '#374151', fontWeight: active ? 600 : 400 }}>
                {cat.category.replace(/^\d+\.\s*/, '')}
              </span>
              <span style={{ fontSize: 10, color: '#C7C7CC', flexShrink: 0 }}>{cat.conditions.length}</span>
            </button>
          )
        })}
      </div>

      {/* Recent conditions */}
      {recent.length > 0 && !globalSearch && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 0 4px', flexShrink: 0 }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, color: '#C7C7CC', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 14px 4px', margin: 0 }}>Recent</p>
          {recent.slice(0, 4).map((r, i) => {
            const cidx  = manifest.findIndex(c => c.category === r.category)
            const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
            return (
              <button key={i}
                onClick={() => { openCondition(r.category, r.condition); if (inDrawer) setDrawerOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', minHeight: 34, transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              >
                <Clock size={11} style={{ color: '#AEAEB2', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: '#6B7280', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {engName(r.condition)}
                </span>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}
    </>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE — iOS-style header strip + 3-panel slide navigation
  // ═══════════════════════════════════════════════════════════════════════════

  // Mobile header (KL-aligned: icon/back + title + action icons)
  const MobileHeader = () => (
    <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52 }}>
        {/* Left: back or page icon */}
        {mobilePanel > 0 ? (
          <button
            onClick={() => setMobilePanel(p => p - 1)}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(46,150,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <ArrowLeft size={18} style={{ color: BRAND }} />
          </button>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(46,150,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Stethoscope size={17} style={{ color: BRAND }} />
          </div>
        )}

        {/* Title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#040E1C', margin: 0, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mobilePanel === 0 ? 'UW Guide'
             : mobilePanel === 1 ? (selectedCat?.category?.replace(/^\d+\.\s*/, '') || 'Conditions')
             : engName(selectedCond || '')}
          </p>
          {mobilePanel === 0 && !loadingManifest && manifest.length > 0 && (
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              {manifest.reduce((s, c) => s + c.conditions.length, 0)} conditions · {manifest.length} categories
            </p>
          )}
          {mobilePanel === 1 && selectedCat && (
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
              {selectedCat.conditions.length} conditions
            </p>
          )}
          {mobilePanel === 2 && selectedCond && cnName(selectedCond) && (
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' }}>
              {cnName(selectedCond)}
            </p>
          )}
        </div>

        {/* Right: context-sensitive actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {mobilePanel === 0 && (
            <button
              onClick={() => { setMobileSearchOpen(v => !v); if (mobileSearchOpen) setGlobalSearch('') }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: mobileSearchOpen ? 'rgba(46,150,255,0.10)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                color: mobileSearchOpen ? BRAND : '#6B7280',
              }}>
              <Search size={18} />
            </button>
          )}
          {mobilePanel === 1 && (
            <button
              onClick={() => setMobileCondSearch(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: mobileCondSearch ? 'rgba(46,150,255,0.10)' : (condSearch ? 'rgba(46,150,255,0.06)' : 'transparent'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                color: (mobileCondSearch || condSearch) ? BRAND : '#6B7280',
              }}>
              <Search size={18} />
            </button>
          )}
          {mobilePanel === 2 && selectedCond && (
            <LangToggle value={lang} onChange={handleLang} />
          )}
        </div>
      </div>

      {/* Expandable search bar — Panel 0 (global search) */}
      {mobilePanel === 0 && mobileSearchOpen && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ position: 'relative' }}>
            {renderSearchBar({ value: globalSearch, onChange: setGlobalSearch, placeholder: 'Search all conditions…', inputRef: searchRef })}
            {renderSearchDropdown()}
          </div>
        </div>
      )}

      {/* Expandable filter bar — Panel 1 (condition filter) */}
      {mobilePanel === 1 && mobileCondSearch && (
        <div style={{ padding: '0 16px 12px' }}>
          {renderSearchBar({ value: condSearch, onChange: setCondSearch, placeholder: 'Filter conditions…', compact: true })}
        </div>
      )}

      {/* Category badge strip — Panel 2 */}
      {mobilePanel === 2 && selectedCat && (
        <div style={{ padding: '0 16px 10px' }}>
          <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: catColor, background: `${catColor}12`, padding: '2px 10px', borderRadius: 20 }}>
            {selectedCat.category.replace(/^\d+\.\s*/, '')}
          </span>
        </div>
      )}
    </div>
  )

  function renderMobile() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F2F2F7' }}>
        <style>{`
          @keyframes uw-slide-in-right { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: translateX(0) } }
          @keyframes uw-slide-in-left  { from { opacity: 0; transform: translateX(-24px) } to { opacity: 1; transform: translateX(0) } }
          @keyframes uw-spin           { to { transform: rotate(360deg) } }
        `}</style>

        {/* Unified iOS-style header */}
        <MobileHeader />

        {/* Sliding content panels */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* ── Panel 0: Category grid (home) ── */}
          {mobilePanel === 0 && (
            <div key="home" style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', background: '#F2F2F7',
              animation: 'uw-slide-in-left 0.22s ease',
              WebkitOverflowScrolling: 'touch',
            }}>
              <div style={{ padding: '14px 14px 24px' }}>

                {/* Recent conditions */}
                {recent.length > 0 && !globalSearch && !mobileSearchOpen && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 4px 8px' }}>Recent</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {recent.slice(0, 5).map((r, i) => {
                        const cidx  = manifest.findIndex(c => c.category === r.category)
                        const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
                        const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
                        return (
                          <button key={i} onClick={() => openCondition(r.category, r.condition)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', background: 'white', borderRadius: 13,
                              border: '1px solid rgba(0,0,0,0.07)', cursor: 'pointer',
                              textAlign: 'left', minHeight: 52,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                          >
                            <Clock size={14} style={{ color: '#AEAEB2', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 500, color: '#1C1C1E', margin: 0, lineHeight: 1.25 }}>{engName(r.condition)}</p>
                              {cnName(r.condition) && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '1px 0 0' }}>{cnName(r.condition)}</p>}
                            </div>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Category 2-column grid */}
                {!loadingManifest && !mobileSearchOpen && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 4px 8px' }}>Categories</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {manifest.map((cat, idx) => {
                        const color = CAT_COLORS[idx % CAT_COLORS.length]
                        const Icon  = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
                        return (
                          <button key={cat.category} onClick={() => openCategory(cat)}
                            style={{
                              background: 'white', borderRadius: 16, padding: '14px 13px 12px',
                              textAlign: 'left', border: '1px solid rgba(0,0,0,0.07)',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
                              minHeight: 96, transition: 'transform 0.12s',
                            }}
                            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)'; e.currentTarget.style.opacity = '0.85' }}
                            onTouchEnd={e   => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1' }}
                            onTouchCancel={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1' }}
                          >
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={16} style={{ color }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3, margin: 0 }}>
                                {cat.category.replace(/^\d+\.\s*/, '')}
                              </p>
                              <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '2px 0 0' }}>{cat.conditions.length}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {loadingManifest && (
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
                    <Spinner />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Panel 1: Conditions list ── */}
          {mobilePanel === 1 && (
            <div key="conds" style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              background: 'white',
              animation: 'uw-slide-in-right 0.22s ease',
            }}>
              <div ref={condListRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {filteredConditions.length === 0
                  ? <p style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', padding: '28px 16px' }}>No match</p>
                  : filteredConditions.map(cond => (
                    <ConditionRow key={cond} cond={cond}
                      active={selectedCond === cond && mobilePanel === 2}
                      color={catColor}
                      onClick={() => openCondition(selectedCat, cond)}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── Panel 2: Detail ── */}
          {mobilePanel === 2 && (
            <div key="detail" style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              background: '#FAFAFA',
              animation: 'uw-slide-in-right 0.22s ease',
            }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px', WebkitOverflowScrolling: 'touch' }}>
                {renderDetailContent()}
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP + TABLET — persistent sidebar (desktop) or drawer (tablet)
  // ═══════════════════════════════════════════════════════════════════════════
  function renderDesktop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F2F2F7', position: 'relative', overflow: 'hidden' }}>
        <style>{`@keyframes uw-spin { to { transform: rotate(360deg) } }`}</style>

        {/* ── Tablet: drawer backdrop ── */}
        {isTablet && drawerOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(2px)', zIndex: 40 }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ── Tablet: category drawer (slides in from left) ── */}
        {isTablet && (
          <div style={{
            position: 'fixed', left: 0, top: 0, bottom: 0,
            width: 260, background: '#FAFAFA',
            borderRight: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            zIndex: 50,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: drawerOpen ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
          }}>
            <CategoryPanelContent inDrawer={true} />
          </div>
        )}

        {/* ── Tablet: header strip (drawer toggle + breadcrumb + lang) ── */}
        {isTablet && (
          <div style={{
            background: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)',
            flexShrink: 0, height: 52,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, zIndex: 10,
          }}>
            {/* Drawer toggle */}
            <button
              onClick={() => setDrawerOpen(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: drawerOpen ? 'rgba(46,150,255,0.08)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                color: drawerOpen ? BRAND : '#6B7280', flexShrink: 0,
              }}>
              {drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            {/* Title / breadcrumb */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#040E1C', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.25 }}>
                {selectedCond
                  ? engName(selectedCond)
                  : selectedCat
                    ? selectedCat.category.replace(/^\d+\.\s*/, '')
                    : 'UW Guide'}
              </p>
              {selectedCat && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                  {selectedCond
                    ? selectedCat.category.replace(/^\d+\.\s*/, '')
                    : `${selectedCat.conditions.length} conditions`}
                </p>
              )}
            </div>

            {/* Language toggle (when condition is open) */}
            {selectedCond && !globalSearch && (
              <LangToggle value={lang} onChange={handleLang} />
            )}
          </div>
        )}

        {/* ── Main content row ── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* ── Desktop only: persistent category sidebar ── */}
          {isDesktop && (
            <div style={{ width: 220, flexShrink: 0, background: '#FAFAFA', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
              <CategoryPanelContent inDrawer={false} />
            </div>
          )}

          {/* ── Condition list panel (desktop + tablet when category selected) ── */}
          {selectedCat && !globalSearch && (
            <div style={{ width: 252, flexShrink: 0, background: 'white', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${catColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CatIcon size={14} style={{ color: catColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: catColor, margin: 0, lineHeight: 1.2 }}>
                    {selectedCat.category.replace(/^\d+\.\s*/, '')}
                  </p>
                  <p style={{ fontSize: 10.5, color: '#8E8E93', margin: 0 }}>{selectedCat.conditions.length} conditions</p>
                </div>
              </div>
              <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
                {renderSearchBar({ value: condSearch, onChange: setCondSearch, placeholder: 'Filter…', compact: true })}
              </div>
              <div ref={condListRef} style={{ flex: 1, overflowY: 'auto' }}>
                {filteredConditions.length === 0
                  ? <p style={{ fontSize: 12.5, color: '#8E8E93', textAlign: 'center', padding: '22px 16px' }}>No match</p>
                  : filteredConditions.map(cond => (
                    <ConditionRow key={cond} cond={cond}
                      active={selectedCond === cond}
                      color={catColor}
                      onClick={() => openCondition(selectedCat, cond)}
                    />
                  ))
                }
              </div>
            </div>
          )}

          {/* ── Detail / Welcome / Search results panel ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Welcome screen */}
            {!selectedCat && !globalSearch && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '36px 28px 48px' }}>
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                  <div style={{ width: 66, height: 66, borderRadius: 20, background: `${BRAND}0E`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Stethoscope size={28} strokeWidth={1.4} style={{ color: BRAND, opacity: 0.8 }} />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: '0 0 6px' }}>Medical UW Guide</h2>
                  <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>
                    {loadingManifest ? 'Loading…' : `${manifest.reduce((s, c) => s + c.conditions.length, 0)} conditions across ${manifest.length} categories`}
                  </p>
                </div>
                {!loadingManifest && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 10, maxWidth: 780, margin: '0 auto' }}>
                    {manifest.map((cat, idx) => {
                      const color = CAT_COLORS[idx % CAT_COLORS.length]
                      const Icon  = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
                      return (
                        <button key={cat.category} onClick={() => setSelectedCat(cat)}
                          style={{
                            background: 'white', borderRadius: 15, padding: '14px 13px 12px',
                            textAlign: 'left', border: '1px solid rgba(0,0,0,0.07)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer',
                            transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 8,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} style={{ color }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.35, margin: 0 }}>
                              {cat.category.replace(/^\d+\.\s*/, '')}
                            </p>
                            <p style={{ fontSize: 11, color: '#8E8E93', margin: '2px 0 0' }}>{cat.conditions.length} conditions</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No condition selected yet */}
            {selectedCat && !selectedCond && !globalSearch && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: `${catColor}0D`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CatIcon size={22} style={{ color: `${catColor}55` }} />
                </div>
                <p style={{ fontSize: 14, margin: 0, color: '#AEAEB2' }}>Select a condition from the list</p>
              </div>
            )}

            {/* Inline search results */}
            {globalSearch && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 48px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{globalSearch}&rdquo;
                </p>
                {searchResults.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#8E8E93' }}>No conditions found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 640 }}>
                    {searchResults.map((r, i) => {
                      const cidx  = manifest.findIndex(c => c.category === r.category)
                      const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
                      const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
                      return (
                        <button key={i} onClick={() => openCondition(r.category, r.condition, true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                            background: 'white', border: '1px solid rgba(0,0,0,0.07)',
                            transition: 'all 0.12s', textAlign: 'left',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={14} style={{ color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1C1E', margin: 0 }}>{engName(r.condition)}</p>
                            {cnName(r.condition) && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '1px 0 0' }}>{cnName(r.condition)}</p>}
                          </div>
                          <span style={{ fontSize: 10.5, color, background: `${color}12`, padding: '2px 8px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>
                            {r.category.replace(/^\d+\.\s*/, '')}
                          </span>
                          <ChevronRight size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Condition detail */}
            {selectedCond && !globalSearch && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Desktop: detail header bar with condition title + lang toggle */}
                {isDesktop && (
                  <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
                    <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 600, color: catColor, background: `${catColor}12`, padding: '2px 8px', borderRadius: 20, marginBottom: 5 }}>
                          {selectedCat?.category?.replace(/^\d+\.\s*/, '')}
                        </span>
                        <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1C1C1E', margin: '0 0 2px', lineHeight: 1.25 }}>
                          {engName(selectedCond)}
                        </h2>
                        {cnName(selectedCond) && (
                          <p style={{ fontSize: 14, color: '#636366', margin: 0, fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' }}>
                            {cnName(selectedCond)}
                          </p>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, paddingTop: 4 }}>
                        <LangToggle value={lang} onChange={handleLang} />
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 48px' }}>
                  <div style={{ maxWidth: 800 }}>
                    {renderDetailContent()}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isMobile && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {renderMobile()}
        </div>
      )}
      {!isMobile && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {renderDesktop()}
        </div>
      )}
    </div>
  )
}
