import { useEffect } from 'react'
import { X, Star, Waves, Palette, Repeat2, Wind, Shield, Sparkles } from 'lucide-react'
import ProtectedImg from '../ui/ProtectedImg'

const LOGO_ELEMENTS = [
  {
    icon: Repeat2,
    color: '#1A7FFF',
    bg: 'rgba(26,127,255,0.10)',
    title: 'The S Mark',
    desc: 'A flowing S — movement, continuity, a guided journey. Good advisory work evolves with the client.',
  },
  {
    icon: Star,
    color: '#FFB800',
    bg: 'rgba(255,184,0,0.10)',
    title: 'The Star',
    desc: 'A fixed point of reference. Helping clients choose with clarity even when the future is uncertain.',
  },
  {
    icon: Waves,
    color: '#30D158',
    bg: 'rgba(48,209,88,0.10)',
    title: 'The Horizon',
    desc: 'Vision beyond the immediate. Planning for long-term protection, not just the moment in front of us.',
  },
  {
    icon: Palette,
    color: '#BF8FFF',
    bg: 'rgba(191,143,255,0.10)',
    title: 'Blue & Gold',
    desc: 'Blue for trust and clarity. Gold for quality and confidence. Credible, measured, forward-looking.',
  },
]

const VALUES = [
  { label: 'Clarity before recommendation', accent: true },
  { label: 'Protection with purpose', accent: false },
  { label: 'Structured thinking', accent: false },
  { label: 'Long-term relationships', accent: false },
  { label: 'Guidance that evolves', accent: false },
]

export default function AboutSoraModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="abt-backdrop"
    >
      <style>{`
        /* ── Reset & tokens ────────────────────────── */
        .abt-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(4,14,28,0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          animation: abtBackdrop 0.22s ease both;
        }

        /* ── Modal shell ───────────────────────────── */
        .abt-card {
          background: #fff;
          border-radius: 24px;
          width: 100%;
          max-width: 660px;
          max-height: 92vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.12);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
          animation: abtSlide 0.38s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ── Hero ──────────────────────────────────── */
        .abt-hero {
          position: relative;
          height: 280px;
          flex-shrink: 0;
          overflow: hidden;
        }

        /* ── Scrollable body ───────────────────────── */
        .abt-body {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          padding: 28px 30px 40px;
        }
        .abt-body::-webkit-scrollbar { width: 4px; }
        .abt-body::-webkit-scrollbar-track { background: transparent; }
        .abt-body::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }

        /* ── Logo-element grid ─────────────────────── */
        .abt-logo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .abt-el {
          background: #FAFAFA;
          border: 1.5px solid #F0F0F5;
          border-radius: 14px;
          padding: 15px 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          cursor: default;
        }
        .abt-el:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.08) !important;
        }

        /* ── Values chips ──────────────────────────── */
        .abt-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 28px;
        }

        /* ── Close button ──────────────────────────── */
        .abt-close {
          position: absolute; top: 14px; right: 14px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(0,0,0,0.38); border: none;
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, transform 0.15s;
          /* Expand tap area without growing the visual */
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .abt-close::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
        }
        .abt-close:hover {
          background: rgba(0,0,0,0.58) !important;
          transform: scale(1.08);
        }
        .abt-close:active { transform: scale(0.94); }

        /* ── Stagger animations ────────────────────── */
        @keyframes abtBackdrop { from { opacity:0; } to { opacity:1; } }
        @keyframes abtSlide {
          from { opacity:0; transform:translateY(36px) scale(0.96); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes abtUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .abt-s1 { animation: abtUp 0.42s 0.08s ease both; }
        .abt-s2 { animation: abtUp 0.42s 0.16s ease both; }
        .abt-s3 { animation: abtUp 0.42s 0.24s ease both; }
        .abt-s4 { animation: abtUp 0.42s 0.32s ease both; }
        .abt-s5 { animation: abtUp 0.42s 0.40s ease both; }

        /* ════════════════════════════════════════════
           RESPONSIVE — iPhone (≤ 430px)
           ════════════════════════════════════════════ */
        @media (max-width: 430px) {
          .abt-backdrop { padding: 0; align-items: flex-end; }
          .abt-card {
            border-radius: 24px 24px 0 0;
            max-height: 94vh;
            max-width: 100%;
            box-shadow: 0 -20px 60px rgba(0,0,0,0.35);
          }
          .abt-hero { height: 240px; }
          .abt-body { padding: 22px 20px 36px; }
          /* Single column on small phones */
          .abt-logo-grid { grid-template-columns: 1fr; }
          .abt-el { padding: 14px 15px; border-radius: 12px; }
          /* Larger close tap zone on mobile */
          .abt-close { width: 38px; height: 38px; top: 12px; right: 12px; }
        }

        /* Slightly larger phones (iPhone Plus / Pro Max) */
        @media (min-width: 390px) and (max-width: 430px) {
          .abt-logo-grid { grid-template-columns: 1fr 1fr; }
        }

        /* ════════════════════════════════════════════
           RESPONSIVE — iPad (431px – 1024px)
           ════════════════════════════════════════════ */
        @media (min-width: 431px) and (max-width: 1024px) {
          .abt-card { max-width: 600px; }
          .abt-hero { height: 265px; }
          .abt-body { padding: 26px 28px 38px; }
        }
      `}</style>

      <div className="abt-card">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="abt-hero">
          <ProtectedImg
            src="/assets/sora-og.jpg"
            alt="Sora — sky, clarity, perspective"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 50%' }}
          />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(165deg, rgba(4,14,28,0.12) 0%, rgba(4,14,28,0.74) 100%)',
          }} />

          {/* Top badge */}
          <div style={{ position: 'absolute', top: 16, left: 18 }}>
            <div style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 20, padding: '5px 13px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Sparkles size={11} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
              <span style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '1.3px',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
              }}>
                About Sora
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ position: 'absolute', bottom: 20, left: 22, right: 58 }}>
            <p style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.48)',
              marginBottom: 6,
            }}>
              空 · Sora · Sky
            </p>
            <p style={{
              fontSize: 18, fontWeight: 700, color: 'white',
              lineHeight: 1.35, letterSpacing: -0.3,
            }}>
              Trusted guidance.<br />Clear protection. Lasting value.
            </p>
          </div>

          {/* Close button */}
          <button className="abt-close" onClick={onClose} aria-label="Close">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────── */}
        <div className="abt-body">

          {/* Logo + tagline banner */}
          <div className="abt-s1" style={{ marginBottom: 26 }}>
            <div style={{
              background: 'linear-gradient(135deg, #040E1C 0%, #0C2244 100%)',
              borderRadius: 16,
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Subtle glow */}
              <div style={{
                position: 'absolute', top: -50, right: -30, pointerEvents: 'none',
                width: 180, height: 180, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(26,127,255,0.16) 0%, transparent 70%)',
              }} />
              <ProtectedImg
                src="/assets/sora-logo.png"
                alt="Sora Advisory"
                style={{ width: 110, height: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }}
              />
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
              <p style={{
                fontSize: 13, color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.65, fontStyle: 'italic',
              }}>
                "Good advisory work should bring clarity, confidence, and direction."
              </p>
            </div>
          </div>

          {/* ── The Name ── */}
          <div className="abt-s2" style={{ marginBottom: 28 }}>
            <SectionHeader icon={Wind} color="#1A7FFF" label="What the Name Means" />
            <p style={{ fontSize: 14.5, color: '#3A3A3C', lineHeight: 1.8, marginBottom: 10 }}>
              <strong>Sora</strong> comes from the Japanese <strong>空 (そら)</strong> — meaning <em>sky</em>.
              Expansive. Calm. Full of perspective. The sky creates space to think beyond the immediate moment.
            </p>
            <p style={{ fontSize: 14, color: '#636366', lineHeight: 1.78, marginBottom: 16 }}>
              In a field often dominated by products and pressure, Sora was built to feel different —
              helping clients step back, see the bigger picture, and move forward with confidence.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Clarity over confusion', 'Perspective over pressure', 'Long-term thinking'].map(v => (
                <span key={v} style={{
                  padding: '5px 13px', borderRadius: 20,
                  background: 'rgba(26,127,255,0.07)',
                  border: '1px solid rgba(26,127,255,0.16)',
                  fontSize: 12.5, fontWeight: 600, color: '#1A60CC', letterSpacing: 0.1,
                }}>{v}</span>
              ))}
            </div>
          </div>

          {/* ── Logo elements ── */}
          <div className="abt-s3" style={{ marginBottom: 28 }}>
            <SectionHeader icon={Sparkles} color="#FFB800" label="What the Logo Means" />
            <div className="abt-logo-grid">
              {LOGO_ELEMENTS.map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className="abt-el">
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <Icon size={16} color={color} strokeWidth={2.2} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', marginBottom: 5 }}>
                    {title}
                  </p>
                  <p style={{ fontSize: 12.5, color: '#8E8E93', lineHeight: 1.65 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── LLH Group ── */}
          <div className="abt-s4" style={{ marginBottom: 28 }}>
            <div style={{
              background: 'linear-gradient(135deg, #040E1C 0%, #0D2450 100%)',
              borderRadius: 16, padding: '20px 22px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -40, right: -40, pointerEvents: 'none',
                width: 180, height: 180, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(26,127,255,0.18) 0%, transparent 70%)',
              }} />
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              }}>
                <Shield size={14} color="rgba(255,255,255,0.45)" strokeWidth={2} />
                <p style={{
                  fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '1.4px', textTransform: 'uppercase',
                }}>
                  Why "By LLH Group"
                </p>
              </div>
              <p style={{
                fontSize: 14.5, color: 'rgba(255,255,255,0.82)',
                lineHeight: 1.74, position: 'relative',
              }}>
                Sora is the advisory identity. LLH Group is the foundation behind it.
                Together, they bring modern clarity and established trust — refined and contemporary,
                grounded in continuity, experience, and responsibility.
              </p>
            </div>
          </div>

          {/* ── What Sora Stands For ── */}
          <div className="abt-s5">
            <SectionHeader icon={Star} color="#30D158" label="What Sora Stands For" />
            <p style={{ fontSize: 14, color: '#636366', lineHeight: 1.78, marginBottom: 18 }}>
              Not noise. Not pressure. Not one-size-fits-all. A more thoughtful way to advise —
              built on five commitments:
            </p>
            <div className="abt-chips">
              {VALUES.map(({ label, accent }) => (
                <span key={label} style={{
                  padding: '7px 14px', borderRadius: 22,
                  background: accent ? 'rgba(26,127,255,0.07)' : '#F5F5FA',
                  border: `1px solid ${accent ? 'rgba(26,127,255,0.18)' : '#EAEAF0'}`,
                  fontSize: 13, fontWeight: 600,
                  color: accent ? '#1A60CC' : '#3A3A3C',
                }}>{label}</span>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              paddingTop: 20, borderTop: '1px solid #F2F2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ width: 20, height: 1, background: '#E5E5EA', display: 'block' }} />
              <p style={{
                fontSize: 11, fontWeight: 700,
                color: '#AEAEB2', letterSpacing: '1.1px',
                textTransform: 'uppercase', textAlign: 'center',
              }}>
                trusted guidance · clear protection · lasting value
              </p>
              <span style={{ width: 20, height: 1, background: '#E5E5EA', display: 'block' }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Shared section header ──────────────────────────────────────────────────
function SectionHeader({ icon: Icon, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={15} color={color} strokeWidth={2.2} />
      </div>
      <h2 style={{
        fontSize: 16, fontWeight: 700,
        color: '#1C1C1E', letterSpacing: -0.3,
        margin: 0,
      }}>
        {label}
      </h2>
    </div>
  )
}
