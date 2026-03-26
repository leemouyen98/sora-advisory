import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import ProtectedImg from '../components/ui/ProtectedImg'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const navigate = useNavigate()
  const [agentCode, setAgentCode] = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [shake, setShake]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(agentCode, password)
    if (ok) {
      navigate('/dashboard')
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  const canSubmit = agentCode.length === 6 && password.length > 0 && !loading

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-7px); }
          40%      { transform: translateX(7px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lp-f1 { animation: fadeUp 0.5s ease both; }
        .lp-f2 { animation: fadeUp 0.5s 0.08s ease both; }
        .lp-f3 { animation: fadeUp 0.5s 0.16s ease both; }
        .lp-input { border: none; background: transparent; outline: none; width: 100%; color: #1C1C1E; }
        .lp-input::placeholder { color: #C7C7CC; }
        .lp-btn { transition: all 0.15s ease; }
        .lp-btn:not(:disabled):hover  { opacity: 0.91; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,122,255,0.32); }
        .lp-btn:not(:disabled):active { transform: translateY(0); }
        .lp-card:focus-within { box-shadow: 0 0 0 2px rgba(0,122,255,0.25), 0 1px 4px rgba(0,0,0,0.06) !important; }
      `}</style>

      {/* ── Left: Branding ──────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '46%',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(155deg, #05101F 0%, #0A1C35 45%, #0D2450 100%)',
        }}
      >
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize: '52px 52px',
        }} />

        {/* Blue glow */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 560, height: 560, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,122,255,0.13) 0%, transparent 65%)',
        }} />
        {/* Warm glow — echoes logo colours */}
        <div style={{
          position: 'absolute', bottom: '0%', left: '-8%',
          width: 420, height: 420, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,90,0,0.07) 0%, transparent 65%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          height: '100%', padding: '48px 52px',
        }}>

          <div />

          {/* Centre content */}
          <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
          }}>

            {/* HLA Logo — hero element */}
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: '22px 30px',
              display: 'inline-block',
              marginBottom: 40,
              boxShadow: '0 12px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              <ProtectedImg
                src="/assets/sora-logo.png"
                alt="Sora Advisory"
                style={{
                  height: 68, width: 'auto',
                  maxWidth: 300, objectFit: 'contain',
                }}
              />
            </div>

            {/* App identity */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 12, fontWeight: 600,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                marginBottom: 2,
              }}>
                Sora by LLH Group
              </p>
              <p style={{
                color: 'rgba(255,255,255,0.28)',
                fontSize: 11, letterSpacing: '0.4px',
              }}>
                Insurance, Risk &amp; Benefits Advisory
              </p>
            </div>

            {/* Tagline */}
            <h1 style={{
              color: 'white',
              fontSize: 32, fontWeight: 700,
              lineHeight: 1.22, letterSpacing: -0.5,
              marginBottom: 16, maxWidth: 320,
            }}>
              Every client's<br />future, mapped.
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 15, lineHeight: 1.7,
              maxWidth: 310,
            }}>
              A private planning suite for financial advisors — retirement projections, protection analysis, and client management in one place.
            </p>

            {/* Accent rule */}
            <div style={{
              width: 36, height: 2, borderRadius: 2,
              background: 'linear-gradient(90deg, #007AFF, transparent)',
              margin: '32px 0',
            }} />

            {/* Three pillars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { dot: '#007AFF', label: 'Client CRM',           desc: 'Contacts, tasks & activity tracking' },
                { dot: '#34C759', label: 'Retirement Planner',   desc: 'Goal-based projections with EPF' },
                { dot: '#FF9500', label: 'Wealth Protection',    desc: 'Death, TPD & CI needs analysis' },
              ].map(({ dot, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: dot, flexShrink: 0,
                    boxShadow: `0 0 8px ${dot}`,
                  }} />
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
                      {label}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      {' '}— {desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>
            © {new Date().getFullYear()} Henry Lee Advisory · Private &amp; Confidential
          </p>
        </div>
      </div>

      {/* ── Right: Form ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#F2F2F7',
        padding: '48px 24px',
      }}>

        {/* Mobile logo */}
        <div className="lg:hidden lp-f1" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            background: 'white', borderRadius: 16,
            padding: '14px 22px', display: 'inline-block',
            boxShadow: '0 2px 14px rgba(0,0,0,0.09)',
            marginBottom: 10,
          }}>
            <ProtectedImg
              src="/assets/sora-logo.png"
              alt="Sora Advisory"
              style={{ height: 50, width: 'auto', maxWidth: 220, objectFit: 'contain' }}
            />
          </div>
          <p style={{ color: '#AEAEB2', fontSize: 13 }}>Insurance, Risk &amp; Benefits Advisory</p>
        </div>

        <div style={{ width: '100%', maxWidth: 364, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>

          {/* Heading */}
          <div className="lp-f1" style={{ marginBottom: 26 }}>
            <h2 style={{
              fontSize: 24, fontWeight: 700,
              color: '#1C1C1E', letterSpacing: -0.3, marginBottom: 4,
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 15, color: '#8E8E93' }}>
              Sign in to your agent account
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ animation: shake ? 'shake 0.45s ease' : undefined }}>
            <div className="lp-f2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Agent Code */}
              <div
                className="lp-card"
                style={{
                  background: 'white', borderRadius: 16,
                  padding: '15px 20px 13px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <label style={{
                  display: 'block',
                  fontSize: 10, fontWeight: 700,
                  color: '#AEAEB2', letterSpacing: '1px',
                  textTransform: 'uppercase', marginBottom: 9,
                }}>
                  Agent Code
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="lp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={agentCode}
                    onChange={e => setAgentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    autoComplete="username"
                    placeholder="· · · · · ·"
                    style={{
                      fontSize: 26, fontWeight: 600,
                      letterSpacing: '0.5em',
                      fontFamily: 'ui-monospace, monospace',
                      caretColor: '#007AFF',
                      paddingRight: 52,
                    }}
                  />
                  <div style={{ position: 'absolute', right: 0, display: 'flex', gap: 3.5 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span key={i} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        transition: 'background 0.2s',
                        background: i < agentCode.length
                          ? (agentCode.length === 6 ? '#34C759' : '#007AFF')
                          : '#E5E5EA',
                      }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Password */}
              <div
                className="lp-card"
                style={{
                  background: 'white', borderRadius: 16,
                  padding: '15px 20px 13px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.15s',
                }}
              >
                <label style={{
                  display: 'block',
                  fontSize: 10, fontWeight: 700,
                  color: '#AEAEB2', letterSpacing: '1px',
                  textTransform: 'uppercase', marginBottom: 9,
                }}>
                  Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="lp-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ fontSize: 16 }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(s => !s)}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', padding: 4, flexShrink: 0,
                      color: '#C7C7CC', display: 'flex',
                    }}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {authError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'rgba(255,59,48,0.06)',
                  border: '1px solid rgba(255,59,48,0.18)',
                  borderRadius: 12, padding: '12px 16px',
                }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                  <span style={{ fontSize: 14, color: '#FF3B30', lineHeight: 1.45 }}>{authError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="lp-btn"
                style={{
                  marginTop: 4,
                  width: '100%', height: 54,
                  borderRadius: 16, border: 'none',
                  background: canSubmit
                    ? 'linear-gradient(135deg, #007AFF 0%, #005FCC 100%)'
                    : '#D1D1D6',
                  color: 'white',
                  fontSize: 16, fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: canSubmit ? '0 4px 18px rgba(0,122,255,0.22)' : 'none',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Help + Powered by */}
          <div className="lp-f3" style={{ marginTop: 28 }}>
            <p style={{ fontSize: 13, color: '#C7C7CC', textAlign: 'center', marginBottom: 20 }}>
              Forgotten your credentials?{' '}
              <span style={{ color: '#AEAEB2' }}>Contact your administrator.</span>
            </p>

            {/* Powered by LLH Group */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingTop: 20,
              borderTop: '1px solid #E5E5EA',
            }}>
              <span style={{ fontSize: 12, color: '#C7C7CC' }}>Powered by</span>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'white',
                border: '1px solid #E5E5EA',
                borderRadius: 8, padding: '5px 10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', letterSpacing: 0.2 }}>
                  LLH Group
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
