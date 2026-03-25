import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Loader2, Target, Shield, Users } from 'lucide-react'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const navigate = useNavigate()
  const [agentCode, setAgentCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [shake, setShake] = useState(false)

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

  return (
    <div className="min-h-screen flex" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>

      {/* ── Left Panel: Branding ────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0A1628 0%, #0D2247 40%, #0A3D7A 75%, #007AFF 100%)',
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 480, height: 480, borderRadius: '50%',
          background: 'rgba(0,122,255,0.15)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'rgba(0,122,255,0.10)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
        }} />

        {/* Logo + wordmark */}
        <div className="relative z-10">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'white', borderRadius: 16, padding: '12px 20px',
          }}>
            <img
              src="/assets/colourful-llh-logo.jpg"
              alt="LLH Group"
              style={{ height: 56, width: 'auto', maxWidth: 260, objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Financial Planning Suite
          </p>
          <h1 style={{ color: 'white', fontSize: 36, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.5, marginBottom: 20 }}>
            Plan smarter.<br />Retire confident.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.6, maxWidth: 340 }}>
            A complete suite for financial advisors to manage clients, run retirement projections, and build wealth protection strategies.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { icon: Users, label: 'Client CRM', desc: 'Contacts, notes, tasks & activity tracking' },
              { icon: Target, label: 'Retirement Planner', desc: 'Goal-based projections with EPF integration' },
              { icon: Shield, label: 'Wealth Protection', desc: 'Death, TPD, CI needs analysis & recommendations' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0, marginTop: 1,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color="rgba(255,255,255,0.8)" />
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            © {new Date().getFullYear()} Henry Lee Advisory · Private &amp; Confidential
          </p>
        </div>
      </div>

      {/* ── Right Panel: Login Form ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-hig-bg px-6 py-12">

        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-10">
          <img
            src="/assets/colourful-llh-logo.jpg"
            alt="LLH Group"
            className="h-14 w-auto max-w-[280px] object-contain mx-auto mb-2"
          />
          <p className="text-hig-subhead text-hig-text-secondary mt-1">Financial Planning Suite</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-hig-title2 text-hig-text">Welcome back</h2>
            <p className="text-hig-subhead text-hig-text-secondary mt-1">Sign in to your agent account</p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit}
            style={{
              animation: shake ? 'shake 0.45s ease' : undefined,
            }}
          >
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                15% { transform: translateX(-6px); }
                30% { transform: translateX(6px); }
                45% { transform: translateX(-5px); }
                60% { transform: translateX(5px); }
                75% { transform: translateX(-3px); }
                90% { transform: translateX(3px); }
              }
            `}</style>

            <div className="hig-card p-6 space-y-5">
              {/* Agent Code */}
              <div>
                <label className="hig-label">Agent Code</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="· · · · · ·"
                    value={agentCode}
                    onChange={(e) => setAgentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="hig-input text-center font-mono"
                    style={{ fontSize: 22, letterSpacing: '0.35em', paddingRight: agentCode ? '2.5rem' : undefined }}
                    autoFocus
                    autoComplete="username"
                  />
                  {/* Code length indicator dots */}
                  {agentCode.length > 0 && agentCode.length < 6 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: i < agentCode.length ? '#007AFF' : '#D1D1D6',
                            transition: 'background 0.15s',
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {agentCode.length === 6 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span style={{ fontSize: 18 }}>✓</span>
                    </div>
                  )}
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary mt-1.5">Your 6-digit agent code</p>
              </div>

              {/* Password */}
              <div>
                <label className="hig-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hig-input pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary hover:text-hig-text transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {authError && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,59,48,0.06)',
                  border: '1px solid rgba(255,59,48,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ fontSize: 14, color: '#FF3B30', lineHeight: 1.4 }}>{authError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={agentCode.length !== 6 || !password || loading}
                className="hig-btn-primary w-full text-hig-body"
                style={{ height: 50, fontSize: 16, fontWeight: 600, borderRadius: 10 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Footer help text */}
          <p className="text-center text-hig-caption1 text-hig-text-secondary mt-6">
            Forgotten your credentials? Contact your agency administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
