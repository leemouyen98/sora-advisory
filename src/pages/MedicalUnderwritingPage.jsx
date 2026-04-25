/**
 * MedicalUnderwritingPage v4 — 10× UX/UI overhaul
 * ─────────────────────────────────────────────────────────────────────
 * Layout (unchanged structure, dramatically improved execution):
 *
 * Mobile  (< 768px)  : iOS-style glassmorphism header + 3-panel slide nav
 *                      Panel 0: Category grid + horizontal recent chips
 *                      Panel 1: Conditions list + keyboard nav
 *                      Panel 2: Detail with sticky hero + back-to-top
 * Tablet  (768–1023) : Collapsible drawer + 2-column content
 * Desktop (≥ 1024px) : Persistent 3-column layout
 *
 * v4 improvements:
 *   ✦ Skeleton shimmer loaders (manifest + conditions + content)
 *   ✦ Glassmorphism sticky headers on mobile (blur + translucency)
 *   ✦ Premium category cards — color-tinted header strip + icon
 *   ✦ Horizontal scroll recent chips (compact, iOS-pill style)
 *   ✦ Color-gradient hero section in desktop/tablet detail header
 *   ✦ Keyboard navigation (↑ ↓ Enter) in conditions list
 *   ✦ Debounced search (250 ms)
 *   ✦ Auto scroll-to-top on condition change
 *   ✦ Floating back-to-top button in detail panel
 *   ✦ Thin progress bar while markdown loads
 *   ✦ Better blockquote/heading/image typography
 *   ✦ Always-visible tap affordances on condition rows
 *   ✦ Better empty & error states
 *   ✦ Safe-area insets applied consistently
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Stethoscope, Search, X, ChevronRight, ChevronLeft, ArrowLeft,
  PanelLeftClose, PanelLeftOpen, ArrowUp,
  Heart, Brain, Activity, Droplets, Wind, Utensils, Bone, Eye,
  Users, Flame, FlaskConical, ShieldAlert, Dna, Clock,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../hooks/useLanguage'

// ── Design tokens ──────────────────────────────────────────────────────────────
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

// ── Global CSS (injected once) ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes uw-spin     { to { transform: rotate(360deg) } }
  @keyframes uw-shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes uw-slide-in-right { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes uw-slide-in-left  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes uw-fade-in        { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes uw-progress       { from{width:0%} to{width:85%} }
  @keyframes uw-pop-in         { 0%{opacity:0;transform:scale(0.8) translateY(8px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  .uw-no-scrollbar::-webkit-scrollbar { display:none }
  .uw-no-scrollbar { -ms-overflow-style:none; scrollbar-width:none }
  .uw-press { transition: transform 0.12s, opacity 0.12s }
  .uw-press:active { transform: scale(0.95); opacity: 0.75 }
`

// ── Responsive hook ────────────────────────────────────────────────────────────
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

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Scroll-to-top on change ────────────────────────────────────────────────────
function useScrollTopOnChange(ref, dep) {
  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [dep]) // eslint-disable-line
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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
function hexAlpha(hex, a) {
  // Convert 6-digit hex + alpha 0-1 to rgba
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

// ── Markdown parser — bilingual pair-aware ─────────────────────────────────────
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

// ── SkeletonLine — shimmer loading placeholder ─────────────────────────────────
function SkeletonLine({ w = '100%', h = 13, br = 7, mb = 0, opacity = 1 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: br, marginBottom: mb, opacity,
      background: 'linear-gradient(90deg, #F2F2F7 25%, #E8E8ED 50%, #F2F2F7 75%)',
      backgroundSize: '200% 100%',
      animation: 'uw-shimmer 1.6s ease-in-out infinite',
    }} />
  )
}

function ContentSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}>
      {/* Section heading skeleton */}
      <div>
        <SkeletonLine w="35%" h={10} br={5} mb={12} />
        <div style={{ height: 1, background: '#F2F2F7', marginBottom: 16 }} />
      </div>
      {/* Text paragraph skeletons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonLine w="100%" h={13} />
        <SkeletonLine w="92%" h={13} />
        <SkeletonLine w="97%" h={13} />
        <SkeletonLine w="78%" h={13} />
      </div>
      {/* Image skeleton */}
      <SkeletonLine w="100%" h={180} br={14} />
      {/* Another section */}
      <div>
        <SkeletonLine w="28%" h={10} br={5} mb={12} />
        <div style={{ height: 1, background: '#F2F2F7', marginBottom: 16 }} />
      </div>
      {/* Blockquote skeleton */}
      <div style={{ borderLeft: '3px solid #E8E8ED', paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonLine w="100%" h={12} />
        <SkeletonLine w="88%" h={12} />
        <SkeletonLine w="94%" h={12} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonLine w="100%" h={13} />
        <SkeletonLine w="85%" h={13} />
      </div>
    </div>
  )
}

function CategoryCardSkeleton() {
  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)' }}>
      <SkeletonLine w="100%" h={72} br={0} />
      <div style={{ padding: '10px 12px 12px' }}>
        <SkeletonLine w="75%" h={12} br={5} mb={6} />
        <SkeletonLine w="35%" h={10} br={5} />
      </div>
    </div>
  )
}

function ConditionRowSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <SkeletonLine w={`${60 + (i % 3) * 12}%`} h={12} br={5} mb={5} />
            <SkeletonLine w="28%" h={10} br={4} />
          </div>
        </div>
      ))}
    </>
  )
}

// ── MarkdownContent — v4: richer typography ────────────────────────────────────
function MarkdownContent({ blocks, lang, catColor }) {
  const showEn = lang !== 'zh'
  const showZh = lang !== 'en'
  const accent = catColor || BRAND

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {blocks.map((block, i) => {

        if (block.type === 'text') {
          if (!block.en && !block.zh) return null
          return (
            <div key={i}>
              {showEn && block.en && (
                <p style={{ fontSize: 15, color: '#1C1C1E', lineHeight: 1.78, margin: 0, letterSpacing: '-0.01em' }}>{block.en}</p>
              )}
              {showZh && block.zh && (
                <p style={{
                  fontSize: 14, color: '#3C3C43', lineHeight: 1.8,
                  margin: showEn && block.en ? '4px 0 0' : 0,
                  fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
                }}>{block.zh}</p>
              )}
            </div>
          )
        }

        if (block.type === 'heading') {
          return (
            <div key={i} style={{ paddingTop: i > 0 ? 8 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: accent, flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
                  {showEn && (
                    <h3 style={{
                      fontSize: 11, fontWeight: 700, color: '#6B7280',
                      textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
                    }}>
                      {block.en}
                    </h3>
                  )}
                  {showZh && block.zh && (
                    <span style={{ fontSize: showEn ? 11 : 12.5, color: '#9CA3AF', fontWeight: showEn ? 500 : 600 }}>
                      {block.zh}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, ${hexAlpha(accent, 0.15)}, transparent)` }} />
            </div>
          )
        }

        if (block.type === 'image') {
          return (
            <div key={i} style={{
              borderRadius: 14, overflow: 'hidden',
              background: '#F2F2F7', lineHeight: 0,
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            }}>
              <img
                src={mediaUrl(block.name)}
                alt={block.name.replace(/\s*\d+\.(png|jpg|jpeg)$/i, '')}
                style={{ display: 'block', width: '100%', height: 'auto' }}
                loading="lazy"
                onError={e => { e.target.parentElement.style.display = 'none' }}
              />
            </div>
          )
        }

        if (block.type === 'youtube') {
          return (
            <div key={i} style={{
              borderRadius: 14, overflow: 'hidden', aspectRatio: '16/9',
              background: '#000',
              boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
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
        }

        if (block.type === 'blockquote') {
          return (
            <div key={i} style={{
              background: hexAlpha(accent, 0.04),
              border: `1px solid ${hexAlpha(accent, 0.12)}`,
              borderLeft: `3px solid ${hexAlpha(accent, 0.5)}`,
              borderRadius: '0 12px 12px 0',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {block.pairs.map((pair, j) => {
                if (!pair) return (
                  <div key={j} style={{ height: 1, background: hexAlpha(accent, 0.08), margin: '0 -2px' }} />
                )
                if (!pair.en && !pair.zh) return null
                return (
                  <div key={j}>
                    {showEn && pair.en && (
                      <p style={{ fontSize: 13.5, color: '#1C1C1E', lineHeight: 1.65, margin: 0 }}>{pair.en}</p>
                    )}
                    {showZh && pair.zh && (
                      <p style={{
                        fontSize: 13, color: '#3C3C43', lineHeight: 1.7,
                        margin: showEn && pair.en ? '4px 0 0' : 0,
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

// ── LangToggle ─────────────────────────────────────────────────────────────────
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

// ── ConditionRow — v4: always-visible chevron, richer active state ─────────────
function ConditionRow({ cond, active, color, onClick, focused }) {
  const en = engName(cond)
  const cn = cnName(cond)
  return (
    <button
      onClick={onClick}
      className="uw-press"
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', minHeight: 44,
        background: active ? hexAlpha(color, 0.07) : focused ? 'rgba(0,0,0,0.035)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.045)',
        outline: active ? `none` : focused ? `2px solid ${hexAlpha(color, 0.3)}` : 'none',
        outlineOffset: -2,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.12s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.035)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Left accent bar */}
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 3, borderRadius: '0 3px 3px 0',
          background: color,
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, fontWeight: active ? 600 : 400,
          color: active ? color : '#1C1C1E',
          margin: 0, lineHeight: 1.3,
        }}>{en}</p>
        {cn && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '2px 0 0', lineHeight: 1.3 }}>{cn}</p>}
      </div>
      <ChevronRight
        size={13}
        style={{
          color: active ? color : '#D1D1D6',
          flexShrink: 0,
          transition: 'color 0.12s, transform 0.12s',
          transform: active ? 'translateX(1px)' : 'none',
        }}
      />
    </button>
  )
}

// ── BackToTopButton ────────────────────────────────────────────────────────────
function BackToTopButton({ scrollRef, color = BRAND, visible }) {
  if (!visible) return null
  return (
    <button
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'absolute', bottom: 24, right: 20, zIndex: 20,
        width: 38, height: 38, borderRadius: '50%',
        background: color,
        boxShadow: `0 4px 16px ${hexAlpha(color, 0.4)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer',
        animation: 'uw-pop-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <ArrowUp size={16} style={{ color: 'white' }} />
    </button>
  )
}

// ── ProgressBar ────────────────────────────────────────────────────────────────
function ProgressBar({ active, color }) {
  if (!active) return null
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 30, overflow: 'hidden' }}>
      <div style={{
        height: '100%', background: color,
        animation: 'uw-progress 2.5s cubic-bezier(0.4, 0, 0.6, 1) forwards',
      }} />
    </div>
  )
}

// ── SearchBar ─────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder = 'Search… (⌘K)', compact = false, inputRef, autoFocus = false }) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8E8E93', pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width: '100%', boxSizing: 'border-box',
          paddingLeft: 32, paddingRight: value ? 32 : 10,
          paddingTop: compact ? 6 : 8, paddingBottom: compact ? 6 : 8,
          fontSize: 13.5, color: '#1C1C1E',
          background: 'rgba(142,142,147,0.11)',
          border: '1.5px solid transparent',
          borderRadius: 10, outline: 'none',
          transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          e.target.style.background = 'white'
          e.target.style.borderColor = BRAND
          e.target.style.boxShadow = `0 0 0 3px ${hexAlpha(BRAND, 0.12)}`
        }}
        onBlur={e => {
          e.target.style.background = 'rgba(142,142,147,0.11)'
          e.target.style.borderColor = 'transparent'
          e.target.style.boxShadow = 'none'
        }}
      />
      {value && (
        <button onClick={() => onChange('')} style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: '50%',
          background: '#AEAEB2', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          <X size={10} style={{ color: 'white' }} />
        </button>
      )}
    </div>
  )
}

// ── SearchDropdown ─────────────────────────────────────────────────────────────
function SearchDropdown({ query, results, manifest, onSelect }) {
  if (!query) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
      background: 'white', borderRadius: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.08)',
      overflow: 'hidden', maxHeight: 380, overflowY: 'auto',
      animation: 'uw-fade-in 0.15s ease',
    }}>
      {results.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <Search size={24} style={{ color: '#D1D1D6', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ fontSize: 13.5, color: '#8E8E93', margin: 0 }}>No results for &ldquo;{query}&rdquo;</p>
        </div>
      ) : results.map((r, i) => {
        const cidx  = manifest.findIndex(c => c.category === r.category)
        const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
        const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
        return (
          <button key={i} onClick={() => onSelect(r.category, r.condition, true)}
            className="uw-press"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', borderBottom: i < results.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F2F2F7' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: hexAlpha(color, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1C1E', margin: 0, lineHeight: 1.3 }}>{engName(r.condition)}</p>
              {cnName(r.condition) && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '1px 0 0' }}>{cnName(r.condition)}</p>}
            </div>
            <span style={{
              fontSize: 10.5, color, background: hexAlpha(color, 0.1),
              padding: '2px 8px', borderRadius: 20, flexShrink: 0,
              fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {r.category.replace(/^\d+\.\s*/, '')}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── CategoryPanelContent (sidebar + drawer) ────────────────────────────────────
function CategoryPanelContent({ manifest, loadingManifest, selectedCat, globalSearch, setGlobalSearch, setSelectedCat, recent, setDrawerOpen, openCondition, searchRef, inDrawer = false }) {
  const debouncedGlobal = useDebounced(globalSearch)

  const searchResults = useMemo(() => {
    if (!debouncedGlobal.trim()) return []
    const q = debouncedGlobal.toLowerCase()
    return manifest.flatMap(cat =>
      cat.conditions.filter(c => c.toLowerCase().includes(q)).map(c => ({ category: cat.category, condition: c }))
    ).slice(0, 30)
  }, [debouncedGlobal, manifest])

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: hexAlpha(BRAND, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope size={14} style={{ color: BRAND }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#040E1C', margin: 0, lineHeight: 1.2 }}>UW Guide</p>
              {loadingManifest ? (
                <SkeletonLine w={60} h={9} br={4} />
              ) : (
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
          <SearchBar value={globalSearch} onChange={setGlobalSearch} inputRef={searchRef} compact={true} />
          <SearchDropdown
            query={debouncedGlobal}
            results={searchResults}
            manifest={manifest}
            onSelect={(cat, cond, fromSearch) => {
              openCondition(cat, cond, fromSearch)
              if (inDrawer) setDrawerOpen(false)
            }}
          />
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
          <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0' }}>
                <SkeletonLine w={26} h={26} br={8} />
                <SkeletonLine w={`${55 + (i % 3) * 12}%`} h={11} br={5} />
              </div>
            ))}
          </div>
        ) : manifest.map((cat, idx) => {
          const color  = CAT_COLORS[idx % CAT_COLORS.length]
          const Icon   = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
          const active = selectedCat?.category === cat.category && !globalSearch
          return (
            <button key={cat.category}
              onClick={() => {
                setGlobalSearch('')
                setSelectedCat(active ? null : cat)
                if (inDrawer) setDrawerOpen(false)
              }}
              className="uw-press"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px 8px 14px',
                background: active ? hexAlpha(color, 0.08) : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                position: 'relative', transition: 'background 0.12s', minHeight: 40,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              {active && <span style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 3, borderRadius: '0 3px 3px 0', background: color }} />}
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: active ? hexAlpha(color, 0.18) : hexAlpha(color, 0.1),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s',
              }}>
                <Icon size={12} style={{ color }} />
              </div>
              <span style={{
                fontSize: 12, lineHeight: 1.35, flex: 1,
                color: active ? '#1C1C1E' : '#374151',
                fontWeight: active ? 600 : 400,
              }}>
                {cat.category.replace(/^\d+\.\s*/, '')}
              </span>
              <span style={{
                fontSize: 10, color: active ? color : '#C7C7CC',
                background: active ? hexAlpha(color, 0.1) : 'transparent',
                padding: active ? '1px 6px' : '0',
                borderRadius: 10, flexShrink: 0,
                fontWeight: active ? 600 : 400,
                transition: 'all 0.12s',
              }}>
                {cat.conditions.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Recent */}
      {recent.length > 0 && !globalSearch && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 0 4px', flexShrink: 0 }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, color: '#C7C7CC', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '0 14px 4px', margin: 0 }}>Recent</p>
          {recent.slice(0, 4).map((r, i) => {
            const cidx  = manifest.findIndex(c => c.category === r.category)
            const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
            return (
              <button key={i}
                onClick={() => { openCondition(r.category, r.condition); if (inDrawer) setDrawerOpen(false) }}
                className="uw-press"
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
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function MedicalUnderwritingPage() {
  useAuth()
  const { lang: globalLang } = useLanguage()   // 'en' | 'zh' from Settings toggle
  const { isMobile, isTablet, isDesktop } = useResponsive()

  // ── State ──────────────────────────────────────────────────────────────────
  const [manifest,         setManifest]         = useState([])
  const [loadingManifest,  setLoadingManifest]  = useState(true)
  const [selectedCat,      setSelectedCat]      = useState(null)
  const [selectedCond,     setSelectedCond]     = useState(null)
  const [condSearch,       setCondSearch]       = useState('')
  const [globalSearch,     setGlobalSearch]     = useState('')
  const [mdBlocks,         setMdBlocks]         = useState(null)
  const [loadingMd,        setLoadingMd]        = useState(false)
  const [mobilePanel,      setMobilePanel]      = useState(0)   // 0=home 1=conditions 2=detail
  const [drawerOpen,       setDrawerOpen]       = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileCondSearch, setMobileCondSearch] = useState(false)
  // Seed from global lang (Eng/中 in Settings); fall back to saved or bilingual
  const [lang,             setLang]             = useState(() => {
    const saved = localStorage.getItem('uw-lang')
    // If user previously chose bilingual on this page, respect that;
    // otherwise mirror the global app language setting.
    if (saved === 'bilingual') return 'bilingual'
    return globalLang || saved || 'en'
  })
  const [recent,           setRecent]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('uw-recent') || '[]') } catch { return [] }
  })
  const [focusedCondIdx,   setFocusedCondIdx]   = useState(-1)
  const [detailScrolled,   setDetailScrolled]   = useState(false)

  const searchRef    = useRef(null)
  const condListRef  = useRef(null)
  const detailRef    = useRef(null)
  const mobileDetailRef = useRef(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const catIndex = selectedCat ? manifest.findIndex(c => c.category === selectedCat.category) : -1
  const catColor = catIndex >= 0 ? CAT_COLORS[catIndex % CAT_COLORS.length] : BRAND
  const CatIcon  = catIndex >= 0 ? (CAT_ICONS[catIndex % CAT_ICONS.length] || Stethoscope) : Stethoscope

  const debouncedCondSearch = useDebounced(condSearch)

  const filteredConditions = useMemo(() => {
    if (!selectedCat) return []
    if (!debouncedCondSearch.trim()) return selectedCat.conditions
    const q = debouncedCondSearch.toLowerCase()
    return selectedCat.conditions.filter(c => c.toLowerCase().includes(q))
  }, [selectedCat, debouncedCondSearch])

  const debouncedGlobal = useDebounced(globalSearch)
  const searchResults = useMemo(() => {
    if (!debouncedGlobal.trim()) return []
    const q = debouncedGlobal.toLowerCase()
    return manifest.flatMap(cat =>
      cat.conditions.filter(c => c.toLowerCase().includes(q)).map(c => ({ category: cat.category, condition: c }))
    ).slice(0, 30)
  }, [debouncedGlobal, manifest])

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/Underwriting/manifest.json', { cache: 'no-store' })
      .then(r => r.json()).then(setManifest).catch(() => setManifest([]))
      .finally(() => setLoadingManifest(false))
  }, [])

  useEffect(() => {
    setSelectedCond(null)
    setCondSearch('')
    setMdBlocks(null)
    setFocusedCondIdx(-1)
    if (condListRef.current) condListRef.current.scrollTop = 0
  }, [selectedCat])

  useEffect(() => {
    if (!selectedCat || !selectedCond) { setMdBlocks(null); return }
    setLoadingMd(true); setMdBlocks(null)
    // Scroll detail to top
    detailRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    mobileDetailRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    setDetailScrolled(false)
    fetch(conditionUrl(selectedCat.category, selectedCond), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => setMdBlocks(parseMarkdown(text)))
      .catch(() => setMdBlocks([{ type: 'text', en: 'Content could not be loaded. Please check your connection and try again.', zh: null }]))
      .finally(() => setLoadingMd(false))
  }, [selectedCat, selectedCond])

  useEffect(() => { localStorage.setItem('uw-lang', lang) }, [lang])

  // Sync with global Eng/中 toggle in Settings — preserves bilingual if user chose it locally
  useEffect(() => {
    setLang(prev => prev === 'bilingual' ? 'bilingual' : globalLang)
  }, [globalLang])

  useEffect(() => { if (isDesktop) setDrawerOpen(false) }, [isDesktop])
  useEffect(() => { setMobileSearchOpen(false); setMobileCondSearch(false) }, [mobilePanel])

  // ⌘K shortcut
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        if (isMobile) setMobileSearchOpen(true)
      }
      if (e.key === 'Escape') { setGlobalSearch(''); setMobileSearchOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile])

  // Keyboard nav in conditions list (desktop/tablet)
  useEffect(() => {
    if (isMobile) return
    const handler = e => {
      if (!selectedCat || globalSearch) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedCondIdx(i => {
          const next = Math.min(i + 1, filteredConditions.length - 1)
          // Scroll into view
          const rows = condListRef.current?.querySelectorAll('[data-cond-row]')
          rows?.[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedCondIdx(i => {
          const next = Math.max(i - 1, 0)
          const rows = condListRef.current?.querySelectorAll('[data-cond-row]')
          rows?.[next]?.scrollIntoView({ block: 'nearest' })
          return next
        })
      } else if (e.key === 'Enter' && focusedCondIdx >= 0) {
        const cond = filteredConditions[focusedCondIdx]
        if (cond) openCondition(selectedCat, cond)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, selectedCat, filteredConditions, focusedCondIdx, globalSearch])

  // Reset focused index when conditions list changes
  useEffect(() => { setFocusedCondIdx(-1) }, [filteredConditions])

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  // ── Detail scroll tracking ─────────────────────────────────────────────────
  const handleDetailScroll = useCallback(e => {
    setDetailScrolled(e.target.scrollTop > 280)
  }, [])

  // ── Detail content renderer ────────────────────────────────────────────────
  function renderDetailContent() {
    if (loadingMd) return <ContentSkeleton />
    if (!mdBlocks) return null
    if (mdBlocks.length === 0) return (
      <div style={{ textAlign: 'center', padding: '48px 16px', color: '#8E8E93' }}>
        <BookOpen size={36} style={{ color: '#D1D1D6', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontSize: 14, margin: 0 }}>No content available for this condition.</p>
      </div>
    )
    return <MarkdownContent blocks={mdBlocks} lang={lang} catColor={catColor} />
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOBILE RENDER
  // ════════════════════════════════════════════════════════════════════════════
  function renderMobile() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F2F2F7' }}>

        {/* ── Glassmorphism iOS-style header ── */}
        <div style={{
          background: 'rgba(249,249,249,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '0.5px solid rgba(0,0,0,0.1)',
          flexShrink: 0, zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 52 }}>

            {/* Back / Home icon */}
            {mobilePanel > 0 ? (
              <button
                onClick={() => setMobilePanel(p => p - 1)}
                className="uw-press"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: hexAlpha(BRAND, 0.08),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}>
                <ArrowLeft size={18} style={{ color: BRAND }} />
              </button>
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: hexAlpha(BRAND, 0.1),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Stethoscope size={17} style={{ color: BRAND }} />
              </div>
            )}

            {/* Title + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 16, fontWeight: 700, color: '#040E1C',
                margin: 0, lineHeight: 1.25,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
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
                  {filteredConditions.length !== selectedCat.conditions.length
                    ? `${filteredConditions.length} of ${selectedCat.conditions.length}`
                    : `${selectedCat.conditions.length} conditions`}
                </p>
              )}
              {mobilePanel === 2 && selectedCond && cnName(selectedCond) && (
                <p style={{ fontSize: 11, color: catColor, margin: 0, fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif', fontWeight: 500 }}>
                  {cnName(selectedCond)}
                </p>
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {mobilePanel === 0 && (
                <button
                  onClick={() => { setMobileSearchOpen(v => !v); if (mobileSearchOpen) setGlobalSearch('') }}
                  className="uw-press"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: mobileSearchOpen ? hexAlpha(BRAND, 0.1) : 'transparent',
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
                  className="uw-press"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: mobileCondSearch ? hexAlpha(BRAND, 0.1) : condSearch ? hexAlpha(BRAND, 0.06) : 'transparent',
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

          {/* Expandable global search — Panel 0 */}
          {mobilePanel === 0 && mobileSearchOpen && (
            <div style={{ padding: '0 14px 12px', animation: 'uw-fade-in 0.15s ease' }}>
              <div style={{ position: 'relative' }}>
                <SearchBar value={globalSearch} onChange={setGlobalSearch} placeholder="Search all conditions…" inputRef={searchRef} autoFocus={true} />
                <SearchDropdown query={debouncedGlobal} results={searchResults} manifest={manifest} onSelect={(cat, cond, f) => { openCondition(cat, cond, f); setMobileSearchOpen(false) }} />
              </div>
            </div>
          )}

          {/* Expandable filter bar — Panel 1 */}
          {mobilePanel === 1 && mobileCondSearch && (
            <div style={{ padding: '0 14px 12px', animation: 'uw-fade-in 0.15s ease' }}>
              <SearchBar value={condSearch} onChange={setCondSearch} placeholder="Filter conditions…" compact={true} autoFocus={true} />
            </div>
          )}

          {/* Category badge — Panel 2 */}
          {mobilePanel === 2 && selectedCat && (
            <div style={{ padding: '0 14px 10px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10.5, fontWeight: 600, color: catColor,
                background: hexAlpha(catColor, 0.1), padding: '3px 10px 3px 8px', borderRadius: 20,
              }}>
                <CatIcon size={10} style={{ color: catColor }} />
                {selectedCat.category.replace(/^\d+\.\s*/, '')}
              </span>
            </div>
          )}
        </div>

        {/* ── Content panels ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Panel 0: Home — category grid + recent chips */}
          {mobilePanel === 0 && (
            <div key="home" style={{
              position: 'absolute', inset: 0,
              overflowY: 'auto', background: '#F2F2F7',
              animation: 'uw-slide-in-left 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
              WebkitOverflowScrolling: 'touch',
            }}>
              <div style={{ padding: '14px 0 32px' }}>

                {/* Recent — horizontal scroll chips */}
                {recent.length > 0 && !globalSearch && !mobileSearchOpen && (
                  <div style={{ marginBottom: 22 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 16px 8px' }}>Recent</p>
                    <div className="uw-no-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: 8, padding: '2px 16px 4px' }}>
                      {recent.slice(0, 8).map((r, i) => {
                        const cidx  = manifest.findIndex(c => c.category === r.category)
                        const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
                        const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
                        return (
                          <button key={i} onClick={() => openCondition(r.category, r.condition)}
                            className="uw-press"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 7,
                              padding: '7px 12px 7px 9px',
                              background: 'white',
                              border: `1px solid ${hexAlpha(color, 0.2)}`,
                              borderRadius: 22,
                              cursor: 'pointer', flexShrink: 0,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}
                          >
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: hexAlpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={10} style={{ color }} />
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1C1C1E', whiteSpace: 'nowrap' }}>{engName(r.condition)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Category 2-column grid */}
                {!loadingManifest && !mobileSearchOpen && (
                  <div style={{ padding: '0 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 2px 10px' }}>Categories</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {manifest.map((cat, idx) => {
                        const color = CAT_COLORS[idx % CAT_COLORS.length]
                        const Icon  = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
                        return (
                          <button key={cat.category} onClick={() => openCategory(cat)}
                            className="uw-press"
                            style={{
                              background: 'white', borderRadius: 16, overflow: 'hidden',
                              textAlign: 'left', border: `1px solid ${hexAlpha(color, 0.15)}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                              cursor: 'pointer', display: 'flex', flexDirection: 'column',
                              minHeight: 120,
                            }}
                          >
                            {/* Colored header strip */}
                            <div style={{
                              height: 64, background: `linear-gradient(135deg, ${hexAlpha(color, 0.15)} 0%, ${hexAlpha(color, 0.06)} 100%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative', overflow: 'hidden',
                            }}>
                              {/* Decorative circle */}
                              <div style={{
                                position: 'absolute', right: -12, top: -12,
                                width: 60, height: 60, borderRadius: '50%',
                                background: hexAlpha(color, 0.1),
                              }} />
                              <div style={{ width: 38, height: 38, borderRadius: 11, background: hexAlpha(color, 0.18), display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                                <Icon size={18} style={{ color }} />
                              </div>
                            </div>
                            {/* Text */}
                            <div style={{ padding: '9px 11px 11px' }}>
                              <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3, margin: 0 }}>
                                {cat.category.replace(/^\d+\.\s*/, '')}
                              </p>
                              <p style={{ fontSize: 11, color: color, fontWeight: 600, margin: '3px 0 0' }}>{cat.conditions.length}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Loading skeleton grid */}
                {loadingManifest && (
                  <div style={{ padding: '0 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {Array.from({ length: 8 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel 1: Conditions list */}
          {mobilePanel === 1 && (
            <div key="conds" style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              background: 'white',
              animation: 'uw-slide-in-right 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              <div ref={condListRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {filteredConditions.length === 0 ? (
                  <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                    <Search size={28} style={{ color: '#D1D1D6', margin: '0 auto 10px', display: 'block' }} />
                    <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>No conditions match &ldquo;{condSearch}&rdquo;</p>
                    <button onClick={() => setCondSearch('')} style={{ marginTop: 10, fontSize: 13.5, color: BRAND, background: 'none', border: 'none', cursor: 'pointer' }}>
                      Clear filter
                    </button>
                  </div>
                ) : filteredConditions.map(cond => (
                  <div key={cond} data-cond-row>
                    <ConditionRow
                      cond={cond}
                      active={selectedCond === cond && mobilePanel === 2}
                      color={catColor}
                      onClick={() => openCondition(selectedCat, cond)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel 2: Detail */}
          {mobilePanel === 2 && (
            <div key="detail" style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              background: '#FAFAFA',
              animation: 'uw-slide-in-right 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              {/* Progress bar */}
              <ProgressBar active={loadingMd} color={catColor} />
              {/* Scroll container — needs position:relative so BackToTopButton anchors to it */}
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <div
                  ref={mobileDetailRef}
                  onScroll={handleDetailScroll}
                  style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '16px 16px 48px', WebkitOverflowScrolling: 'touch' }}
                >
                  {renderDetailContent()}
                </div>
                <BackToTopButton scrollRef={mobileDetailRef} color={catColor} visible={detailScrolled} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DESKTOP + TABLET RENDER
  // ════════════════════════════════════════════════════════════════════════════
  function renderDesktop() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F2F2F7', position: 'relative', overflow: 'hidden' }}>

        {/* Tablet drawer backdrop */}
        {isTablet && drawerOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)', zIndex: 40 }}
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Tablet category drawer */}
        {isTablet && (
          <div style={{
            position: 'fixed', left: 0, top: 0, bottom: 0,
            width: 270, background: '#FAFAFA',
            borderRight: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', flexDirection: 'column',
            zIndex: 50,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: drawerOpen ? '6px 0 32px rgba(0,0,0,0.14)' : 'none',
          }}>
            <CategoryPanelContent
              manifest={manifest} loadingManifest={loadingManifest}
              selectedCat={selectedCat} globalSearch={globalSearch}
              setGlobalSearch={setGlobalSearch} setSelectedCat={setSelectedCat}
              recent={recent} setDrawerOpen={setDrawerOpen}
              openCondition={openCondition} searchRef={searchRef}
              inDrawer={true}
            />
          </div>
        )}

        {/* Tablet header strip */}
        {isTablet && (
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '0.5px solid rgba(0,0,0,0.09)',
            flexShrink: 0, height: 52,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, zIndex: 10,
          }}>
            <button
              onClick={() => setDrawerOpen(v => !v)}
              className="uw-press"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: drawerOpen ? hexAlpha(BRAND, 0.08) : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                color: drawerOpen ? BRAND : '#6B7280', flexShrink: 0,
              }}>
              {drawerOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#040E1C', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.25 }}>
                {selectedCond ? engName(selectedCond) : selectedCat ? selectedCat.category.replace(/^\d+\.\s*/, '') : 'UW Guide'}
              </p>
              {selectedCat && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                  {selectedCond ? selectedCat.category.replace(/^\d+\.\s*/, '') : `${selectedCat.conditions.length} conditions`}
                </p>
              )}
            </div>

            {selectedCond && !globalSearch && (
              <LangToggle value={lang} onChange={handleLang} />
            )}
          </div>
        )}

        {/* Main content row */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

          {/* Desktop: persistent category sidebar */}
          {isDesktop && (
            <div style={{ width: 240, flexShrink: 0, background: '#FAFAFA', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
              <CategoryPanelContent
                manifest={manifest} loadingManifest={loadingManifest}
                selectedCat={selectedCat} globalSearch={globalSearch}
                setGlobalSearch={setGlobalSearch} setSelectedCat={setSelectedCat}
                recent={recent} setDrawerOpen={setDrawerOpen}
                openCondition={openCondition} searchRef={searchRef}
                inDrawer={false}
              />
            </div>
          )}

          {/* Conditions list panel */}
          {selectedCat && !globalSearch && (
            <div style={{ width: 272, flexShrink: 0, background: 'white', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
              {/* Conditions header */}
              <div style={{
                padding: '12px 14px 10px',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                background: `linear-gradient(180deg, ${hexAlpha(catColor, 0.04)} 0%, transparent 100%)`,
                display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: hexAlpha(catColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CatIcon size={14} style={{ color: catColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: catColor, margin: 0, lineHeight: 1.2 }}>
                    {selectedCat.category.replace(/^\d+\.\s*/, '')}
                  </p>
                  <p style={{ fontSize: 10.5, color: '#8E8E93', margin: 0 }}>
                    {filteredConditions.length !== selectedCat.conditions.length
                      ? `${filteredConditions.length} of ${selectedCat.conditions.length}`
                      : `${selectedCat.conditions.length} conditions`}
                  </p>
                </div>
              </div>
              {/* Condition search */}
              <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
                <SearchBar value={condSearch} onChange={setCondSearch} placeholder="Filter… (type to narrow)" compact={true} />
              </div>
              {/* Keyboard hint */}
              <div style={{ padding: '0 14px 6px', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#C7C7CC' }}>↑ ↓ to navigate · Enter to open</span>
              </div>
              {/* Conditions list */}
              <div ref={condListRef} style={{ flex: 1, overflowY: 'auto' }}>
                {filteredConditions.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                    <Search size={22} style={{ color: '#D1D1D6', margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontSize: 12.5, color: '#8E8E93', margin: 0 }}>No match</p>
                  </div>
                ) : filteredConditions.map((cond, i) => (
                  <div key={cond} data-cond-row>
                    <ConditionRow
                      cond={cond}
                      active={selectedCond === cond}
                      color={catColor}
                      onClick={() => openCondition(selectedCat, cond)}
                      focused={i === focusedCondIdx}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detail / Welcome / Search results panel */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

            {/* Welcome screen */}
            {!selectedCat && !globalSearch && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '40px 32px 56px' }}>
                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 22,
                    background: `linear-gradient(135deg, ${hexAlpha(BRAND, 0.12)} 0%, ${hexAlpha(BRAND, 0.06)} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: `0 4px 20px ${hexAlpha(BRAND, 0.15)}`,
                  }}>
                    <Stethoscope size={30} strokeWidth={1.4} style={{ color: BRAND }} />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1C1C1E', margin: '0 0 6px' }}>Medical UW Guide</h2>
                  {loadingManifest ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}><SkeletonLine w={200} h={14} br={7} /></div>
                  ) : (
                    <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>
                      {manifest.reduce((s, c) => s + c.conditions.length, 0)} conditions across {manifest.length} categories
                    </p>
                  )}
                </div>

                {/* Category cards grid */}
                {!loadingManifest ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, maxWidth: 860, margin: '0 auto' }}>
                    {manifest.map((cat, idx) => {
                      const color = CAT_COLORS[idx % CAT_COLORS.length]
                      const Icon  = CAT_ICONS[idx % CAT_ICONS.length] || Stethoscope
                      return (
                        <button key={cat.category} onClick={() => setSelectedCat(cat)}
                          className="uw-press"
                          style={{
                            background: 'white', borderRadius: 16, overflow: 'hidden',
                            textAlign: 'left', border: `1px solid ${hexAlpha(color, 0.15)}`,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                            cursor: 'pointer', transition: 'all 0.18s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${hexAlpha(color, 0.18)}` }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)' }}
                        >
                          {/* Color header strip */}
                          <div style={{
                            height: 60,
                            background: `linear-gradient(135deg, ${hexAlpha(color, 0.15)} 0%, ${hexAlpha(color, 0.06)} 100%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', overflow: 'hidden',
                          }}>
                            <div style={{ position: 'absolute', right: -10, top: -10, width: 55, height: 55, borderRadius: '50%', background: hexAlpha(color, 0.1) }} />
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: hexAlpha(color, 0.18), display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                              <Icon size={15} style={{ color }} />
                            </div>
                          </div>
                          <div style={{ padding: '9px 12px 11px' }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.35, margin: 0 }}>
                              {cat.category.replace(/^\d+\.\s*/, '')}
                            </p>
                            <p style={{ fontSize: 11, color, fontWeight: 600, margin: '3px 0 0' }}>{cat.conditions.length} conditions</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10, maxWidth: 860, margin: '0 auto' }}>
                    {Array.from({ length: 10 }).map((_, i) => <CategoryCardSkeleton key={i} />)}
                  </div>
                )}
              </div>
            )}

            {/* No condition selected yet */}
            {selectedCat && !selectedCond && !globalSearch && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: hexAlpha(catColor, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CatIcon size={24} style={{ color: hexAlpha(catColor, 0.45) }} />
                </div>
                <p style={{ fontSize: 15, margin: 0, color: '#AEAEB2', fontWeight: 500 }}>Select a condition</p>
                <p style={{ fontSize: 12.5, margin: 0, color: '#C7C7CC' }}>Use ↑ ↓ keys or click from the list</p>
              </div>
            )}

            {/* Search results (inline) */}
            {globalSearch && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 52px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{debouncedGlobal}&rdquo;
                </p>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <Search size={32} style={{ color: '#D1D1D6', margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: 14, color: '#8E8E93', margin: 0 }}>No conditions found. Try a shorter search.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 640 }}>
                    {searchResults.map((r, i) => {
                      const cidx  = manifest.findIndex(c => c.category === r.category)
                      const color = cidx >= 0 ? CAT_COLORS[cidx] : BRAND
                      const Icon  = cidx >= 0 ? (CAT_ICONS[cidx] || Stethoscope) : Stethoscope
                      return (
                        <button key={i} onClick={() => openCondition(r.category, r.condition, true)}
                          className="uw-press"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                            background: 'white', border: `1px solid ${hexAlpha(color, 0.12)}`,
                            transition: 'all 0.12s', textAlign: 'left',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 14px ${hexAlpha(color, 0.12)}` }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: hexAlpha(color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={15} style={{ color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1C1E', margin: 0 }}>{engName(r.condition)}</p>
                            {cnName(r.condition) && <p style={{ fontSize: 11.5, color: '#8E8E93', margin: '1px 0 0' }}>{cnName(r.condition)}</p>}
                          </div>
                          <span style={{ fontSize: 10.5, color, background: hexAlpha(color, 0.1), padding: '2px 8px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>
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

            {/* Condition detail panel */}
            {selectedCond && !globalSearch && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* Progress bar */}
                <ProgressBar active={loadingMd} color={catColor} />

                {/* Desktop: gradient hero detail header */}
                {isDesktop && (
                  <div style={{
                    background: `linear-gradient(180deg, ${hexAlpha(catColor, 0.08)} 0%, white 100%)`,
                    borderBottom: `1px solid ${hexAlpha(catColor, 0.12)}`,
                    flexShrink: 0,
                  }}>
                    <div style={{ padding: '16px 28px 14px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {/* Category icon */}
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: hexAlpha(catColor, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <CatIcon size={18} style={{ color: catColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: 'inline-block', fontSize: 10.5, fontWeight: 600,
                          color: catColor, background: hexAlpha(catColor, 0.1),
                          padding: '2px 8px', borderRadius: 20, marginBottom: 5,
                        }}>
                          {selectedCat?.category?.replace(/^\d+\.\s*/, '')}
                        </span>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C1C1E', margin: '0 0 3px', lineHeight: 1.22 }}>
                          {engName(selectedCond)}
                        </h2>
                        {cnName(selectedCond) && (
                          <p style={{ fontSize: 14.5, color: '#636366', margin: 0, fontFamily: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif' }}>
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

                {/* Scrollable content */}
                <div
                  ref={detailRef}
                  onScroll={handleDetailScroll}
                  style={{ flex: 1, overflowY: 'auto', padding: '22px 28px 52px' }}
                >
                  <div style={{ maxWidth: 800 }}>
                    {renderDetailContent()}
                  </div>
                </div>

                {/* Back to top */}
                <BackToTopButton scrollRef={detailRef} color={catColor} visible={detailScrolled} />
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <style>{GLOBAL_CSS}</style>
      {isMobile ? (
        <div style={{ flex: 1, minHeight: 0 }}>{renderMobile()}</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{renderDesktop()}</div>
      )}
    </div>
  )
}
