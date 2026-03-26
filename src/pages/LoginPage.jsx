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
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px);  }
          60%       { transform: translateX(-5px); }
          80%       { transform: translateX(5px);  }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-f1 { animation: fadeUp 0.5s ease both; }
        .lp-f2 { animation: fadeUp 0.5s 0.07s ease both; }
        .lp-f3 { animation: fadeUp 0.5s 0.14s ease both; }
        .lp-f4 { animation: fadeUp 0.5s 0.21s ease both; }
        .lp-f5 { animation: fadeUp 0.5s 0.28s ease both; }

        .lp-field {
          border: 1.5px solid #E5E5EA;
          border-radius: 13px;
          background: #FAFAFA;
          padding: 13px 16px;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .lp-field:focus-within {
          border-color: #007AFF;
          background: white;
          box-shadow: 0 0 0 3.5px rgba(0,122,255,0.11);
        }
        .lp-input {
          border: none; outline: none; background: transparent;
          width: 100%; color: #1C1C1E; font-family: inherit;
        }
        .lp-input::placeholder { color: #C7C7CC; }

        .lp-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lp-btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 38px rgba(0,100,255,0.42) !important;
        }
        .lp-btn:not(:disabled):active {
          transform: translateY(0px);
          box-shadow: 0 4px 14px rgba(0,100,255,0.28) !important;
        }

        .lp-pill {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 16px;
          border-radius: 11px;
          background: rgba(255,255,255,0.048);
          border: 1px solid rgba(255,255,255,0.082);
        }
      `}</style>

      {/* ═══ LEFT — Branding ══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '46%',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(158deg, #040E1C 0%, #081828 52%, #0C2244 100%)',
        }}
      >
        {/* Subtle dot-grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }} />

        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: '-12%', right: '-14%', pointerEvents: 'none',
          width: 580, height: 580, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,122,255,0.14) 0%, transparent 68%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', pointerEvents: 'none',
          width: 460, height: 460, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(10,90,220,0.08) 0%, transparent 68%)',
        }} />

        {/* ── Inner layout ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column',
          height: '100%', padding: '48px 52px',
        }}>

          {/* Logo — alignSelf keeps it from stretching full-width */}
          <div style={{ alignSelf: 'flex-start', marginBottom: 60 }}>
            <div style={{
              background: 'white',
              borderRadius: 14,
              padding: '12px 18px',
              boxShadow: '0 8px 36px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.12)',
            }}>
              <ProtectedImg
                src="/assets/sora-logo.png"
                alt="Sora Advisory"
                style={{ width: 234, height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          {/* Hero copy — centred vertically */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            <p style={{
              color: 'rgba(255,255,255,0.36)',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '2px', textTransform: 'uppercase',
              marginBottom: 18,
            }}>
              Financial Advisory Platform
            </p>

            <h1 style={{
              color: 'white',
              fontSize: 42, fontWeight: 700,
              lineHeight: 1.15, letterSpacing: -1.2,
              marginBottom: 20, maxWidth: 340,
            }}>
              Every client's<br />future, mapped.
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.37)',
              fontSize: 15, lineHeight: 1.82,
              maxWidth: 300, marginBottom: 50,
            }}>
              Retirement projections, protection analysis, and client management — built for Malaysian advisors.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { color: '#0A84FF', label: 'Client CRM',          sub: 'Contacts, tasks & activity tracking' },
                { color: '#30D158', label: 'Retirement Planner',  sub: 'Goal-based projections with EPF' },
                { color: '#FF9F0A', label: 'Wealth Protection',   sub: 'Death, TPD & CI needs analysis' },
              ].map(({ color, label, sub }) => (
                <div key={label} className="lp-pill">
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: color, boxShadow: `0 0 10px ${color}bb`,
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13.5, fontWeight: 600 }}>
                    {label}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.27)', fontSize: 13 }}>
                    · {sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p style={{ color: 'rgba(255,255,255,0.13)', fontSize: 12, marginTop: 36 }}>
            © {new Date().getFullYear()} Henry Lee Advisory · Private &amp; Confidential
          </p>
        </div>
      </div>

      {/* ═══ RIGHT — Form ═════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'white',
        padding: '48px 24px',
      }}>

        {/* Mobile-only logo */}
        <div className="lg:hidden lp-f1" style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            display: 'inline-block',
            border: '1px solid #EBEBF0',
            borderRadius: 16,
            padding: '14px 24px',
            boxShadow: '0 2px 20px rgba(0,0,0,0.07)',
            marginBottom: 14,
          }}>
            <ProtectedImg
              src="/assets/sora-logo.png"
              alt="Sora Advisory"
              style={{ width: 190, height: 'auto', display: 'block' }}
            />
          </div>
        </div>

        {/* Form area */}
        <div style={{ width: '100%', maxWidth: 364 }}>

          {/* Heading */}
          <div className="lp-f1" style={{ marginBottom: 34 }}>
            <h2 style={{
              fontSize: 28, fontWeight: 700,
              color: '#1C1C1E', letterSpacing: -0.7,
              marginBottom: 8,
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 15, color: '#8E8E93', lineHeight: 1.55 }}>
              Sign in to your agent account
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ animation: shake ? 'shake 0.45s ease' : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── Agent Code ── */}
              <div className="lp-f2">
                <label style={{
                  display: 'block', marginBottom: 9,
                  fontSize: 11, fontWeight: 700,
                  color: '#8E8E93', letterSpacing: '0.9px',
                  textTransform: 'uppercase',
                }}>
                  Agent Code
                </label>
                <div className="lp-field">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
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
                        flex: 1,
                        fontSize: 26, fontWeight: 600,
                        letterSpacing: '0.52em',
                        fontFamily: 'ui-monospace, "SF Mono", monospace',
                        caretColor: '#007AFF',
                      }}
                    />
                    {/* Live fill indicator */}
                    <div style={{ display: 'flex', gap: 4, paddingLeft: 12, flexShrink: 0 }}>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: i < agentCode.length
                            ? (agentCode.length === 6 ? '#30D158' : '#007AFF')
                            : '#E5E5EA',
                          transition: 'background 0.18s ease',
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Password ── */}
              <div className="lp-f3">
                <label style={{
                  display: 'block', marginBottom: 9,
                  fontSize: 11, fontWeight: 700,
                  color: '#8E8E93', letterSpacing: '0.9px',
                  textTransform: 'uppercase',
                }}>
                  Password
                </label>
                <div className="lp-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                      padding: 4, cursor: 'pointer', flexShrink: 0,
                      color: '#AEAEB2', display: 'flex',
                      transition: 'color 0.15s',
                    }}
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* ── Error ── */}
              {authError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: '#FFF1F0',
                  border: '1.5px solid rgba(255,59,48,0.22)',
                  borderRadius: 12, padding: '12px 15px',
                }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                  <span style={{ fontSize: 13.5, color: '#C0000A', lineHeight: 1.5 }}>{authError}</span>
                </div>
              )}

              {/* ── Sign In ── */}
              <div className="lp-f4">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="lp-btn"
                  style={{
                    marginTop: 4,
                    width: '100%', height: 52,
                    borderRadius: 13, border: 'none',
                    background: canSubmit
                      ? 'linear-gradient(135deg, #1A80FF 0%, #0050CC 100%)'
                      : '#F2F2F7',
                    color: canSubmit ? 'white' : '#AEAEB2',
                    fontSize: 16, fontWeight: 600,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: canSubmit ? '0 4px 22px rgba(0,100,255,0.32)' : 'none',
                    letterSpacing: -0.2,
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
            </div>
          </form>

          {/* ── Footer ── */}
          <div className="lp-f5" style={{ marginTop: 36 }}>
            <p style={{ fontSize: 13, color: '#C7C7CC', textAlign: 'center', marginBottom: 24 }}>
              Forgotten your credentials?{' '}
              <span style={{ color: '#8E8E93' }}>Contact your administrator.</span>
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingTop: 20, borderTop: '1px solid #F2F2F7',
            }}>
              <span style={{ fontSize: 12, color: '#D1D1D6' }}>Powered by</span>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: '#F5F5FA', border: '1px solid #EAEAF0',
                borderRadius: 8, padding: '4px 10px',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#3A3A3C', letterSpacing: 0.2 }}>
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
