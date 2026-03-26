import { useEffect } from 'react'
import { X, Star, Waves, Palette, Repeat2, Wind, Shield, Sparkles } from 'lucide-react'
import ProtectedImg from '../ui/ProtectedImg'

const LOGO_ELEMENTS = [
  {
    icon: Repeat2,
    color: '#1A7FFF',
    bg: 'rgba(26,127,255,0.10)',
    title: 'The S Mark',
    desc: 'A flowing S — movement, continuity, a guided journey. Good advisory work is never a one-time transaction. It evolves with the client.',
  },
  {
    icon: Star,
    color: '#FFB800',
    bg: 'rgba(255,184,0,0.10)',
    title: 'The Star',
    desc: 'A fixed point of reference. Something that orients decisions even when the future is uncertain — helping clients choose with clarity.',
  },
  {
    icon: Waves,
    color: '#30D158',
    bg: 'rgba(48,209,88,0.10)',
    title: 'The Horizon',
    desc: 'Vision beyond the immediate. The discipline to look toward long-term protection and planning, not just the moment in front of us.',
  },
  {
    icon: Palette,
    color: '#BF8FFF',
    bg: 'rgba(191,143,255,0.10)',
    title: 'Blue & Gold',
    desc: 'Blue for trust, calm, and clarity. Gold for quality, confidence, and warmth. Measured, credible, and forward-looking — together.',
  },
]

const VALUES = [
  'Clarity before recommendation',
  'Protection with purpose',
  'Structured thinking',
  'Long-term relationships',
  'Guidance that evolves',
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
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(4,14,28,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'abtBackdrop 0.2s ease both',
      }}
    >
      <style>{`
        @keyframes abtBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes abtSlide {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes abtUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .abt-card  { animation: abtSlide 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .abt-s1    { animation: abtUp 0.4s 0.10s ease both; }
        .abt-s2    { animation: abtUp 0.4s 0.18s ease both; }
        .abt-s3    { animation: abtUp 0.4s 0.26s ease both; }
        .abt-s4    { animation: abtUp 0.4s 0.34s ease both; }
        .abt-el {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          cursor: default;
        }
        .abt-el:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.09) !important;
        }
        .abt-close {
          transition: background 0.15s, transform 0.15s;
        }
        .abt-close:hover {
          background: rgba(0,0,0,0.55) !important;
          transform: scale(1.08);
        }
        .abt-scroll::-webkit-scrollbar { width: 4px; }
        .abt-scroll::-webkit-scrollbar-track { background: transparent; }
        .abt-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 4px;
        }
      `}</style>

      <div
        className="abt-card"
        style={{
          background: 'white',
          borderRadius: 24,
          width: '100%', maxWidth: 620,
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.12)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
        }}
      >

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: 270, flexShrink: 0, overflow: 'hidden' }}>
          <ProtectedImg
            src="/assets/sora-og.jpg"
            alt="Sora — sky, clarity, perspective"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }}
          />

          {/* Bottom gradient for text legibility */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(170deg, rgba(4,14,28,0.15) 0%, rgba(4,14,28,0.72) 100%)',
          }} />

          {/* Top label */}
          <div style={{
            position: 'absolute', top: 18, left: 20,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 20, padding: '5px 12px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Sparkles size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.5} />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '1.2px',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)',
              }}>
                About Sora
              </span>
            </div>
          </div>

          {/* Bottom hero text */}
          <div style={{ position: 'absolute', bottom: 22, left: 24, right: 60 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
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

          {/* Close */}
          <button
            className="abt-close"
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.38)', border: 'none',
              color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div
          className="abt-scroll"
          style={{ overflowY: 'auto', padding: '30px 32px 40px' }}
        >

          {/* Sora logo + tagline */}
          <div className="abt-s1" style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #040E1C 0%, #0C2244 100%)',
            borderRadius: 16, marginBottom: 28,
          }}>
            <ProtectedImg
              src="/assets/sora-logo.png"
              alt="Sora Advisory"
              style={{ width: 130, height: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }}
            />
            <div style={{ width: '1px', height: 44, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.58)',
              lineHeight: 1.65, fontStyle: 'italic',
            }}>
              "Good advisory work should bring clarity, confidence, and direction."
            </p>
          </div>

          {/* ── The Name ── */}
          <div className="abt-s1" style={{ marginBottom: 30 }}>
            <SectionHeader icon={Wind} color="#1A7FFF" label="What the Name Means" />
            <p style={{ fontSize: 14.5, color: '#3A3A3C', lineHeight: 1.78, marginBottom: 12 }}>
              <strong>Sora</strong> comes from the Japanese <strong>空 (そら)</strong> — meaning <em>sky</em>.
              Expansive. Calm. Full of perspective. The sky creates space to think beyond the immediate moment.
            </p>
            <p style={{ fontSize: 14.5, color: '#636366', lineHeight: 1.78, marginBottom: 18 }}>
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
          <div className="abt-s2" style={{ marginBottom: 30 }}>
            <SectionHeader icon={Sparkles} color="#FFB800" label="What the Logo Means" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {LOGO_ELEMENTS.map(({ icon: Icon, color, bg, title, desc }) => (
                <div
                  key={title}
                  className="abt-el"
                  style={{
                    background: '#FAFAFA',
                    border: '1.5px solid #F0F0F5',
                    borderRadius: 14,
                    padding: '15px 16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
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
          <div className="abt-s3" style={{ marginBottom: 30 }}>
            <div style={{
              background: 'linear-gradient(135deg, #040E1C 0%, #0D2450 100%)',
              borderRadius: 16, padding: '20px 22px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Glow */}
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
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.74, position: 'relative' }}>
                Sora is the advisory identity. LLH Group is the foundation behind it.
                Together, they bring modern clarity and established trust — refined and contemporary,
                grounded in continuity, experience, and responsibility.
              </p>
            </div>
          </div>

          {/* ── What Sora Stands For ── */}
          <div className="abt-s4">
            <SectionHeader icon={Star} color="#30D158" label="What Sora Stands For" />
            <p style={{ fontSize: 14.5, color: '#636366', lineHeight: 1.78, marginBottom: 18 }}>
              Not noise. Not pressure. Not one-size-fits-all. A more thoughtful way to advise —
              built on five commitments:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {VALUES.map((v, i) => (
                <span key={v} style={{
                  padding: '7px 14px', borderRadius: 22,
                  background: i === 0 ? 'rgba(26,127,255,0.07)' : '#F5F5FA',
                  border: `1px solid ${i === 0 ? 'rgba(26,127,255,0.18)' : '#EAEAF0'}`,
                  fontSize: 13, fontWeight: 600,
                  color: i === 0 ? '#1A60CC' : '#3A3A3C',
                }}>{v}</span>
              ))}
            </div>

            {/* Final tagline */}
            <div style={{
              paddingTop: 22, borderTop: '1px solid #F2F2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <span style={{ width: 20, height: 1, background: '#E5E5EA', display: 'block' }} />
              <p style={{
                fontSize: 11.5, fontWeight: 700,
                color: '#AEAEB2', letterSpacing: '1px',
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
