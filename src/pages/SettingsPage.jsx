import { useState } from 'react'
import { User, Lock, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

// ─── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, iconColor, iconBg, title, children }) {
  return (
    <div className="hig-card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1C1E' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { agent, token } = useAuth()
  const { addToast } = useToast()

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  const toggleShowPw = (field) => setShowPw((s) => ({ ...s, [field]: !s[field] }))

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')

    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match.')
      return
    }
    if (pw.next.length < 6) {
      setPwError('New password must be at least 6 characters.')
      return
    }
    if (pw.next === pw.current) {
      setPwError('New password must differ from your current password.')
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/agent/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPwError(data.error || 'Failed to update password.')
      } else {
        setPw({ current: '', next: '', confirm: '' })
        addToast('Password updated successfully.', 'success')
      }
    } catch {
      setPwError('Network error. Check your connection and try again.')
    } finally {
      setPwLoading(false)
    }
  }

  // Initials avatar
  const initials = agent?.name
    ? agent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.2 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>Manage your account and security preferences.</p>
      </div>

      {/* ── Profile ───────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={User}
        iconColor="#007AFF"
        iconBg="rgba(0,122,255,0.1)"
        title="Profile"
      >
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,122,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#007AFF', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>{agent?.name || '—'}</p>
            <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>Agent Code: {agent?.code || '—'}</p>
          </div>
        </div>

        {/* Read-only fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="hig-label">Agent Code</label>
            <input
              value={agent?.code || '—'}
              readOnly
              className="hig-input"
              style={{ background: '#F2F2F7', color: '#8E8E93', cursor: 'default' }}
            />
          </div>
          <div>
            <label className="hig-label">Full Name</label>
            <input
              value={agent?.name || '—'}
              readOnly
              className="hig-input"
              style={{ background: '#F2F2F7', color: '#8E8E93', cursor: 'default' }}
            />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#C7C7CC', marginTop: 10 }}>
          Contact your admin to update your name or agent code.
        </p>
      </SectionCard>

      {/* ── Security ──────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Lock}
        iconColor="#34C759"
        iconBg="rgba(52,199,89,0.1)"
        title="Change Password"
      >
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="hig-label">Current Password</label>
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pw.current}
                onChange={e => setPw(f => ({ ...f, current: e.target.value }))}
                className="hig-input pr-10"
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => toggleShowPw('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary hover:text-hig-text transition-colors"
                tabIndex={-1}
              >
                {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="hig-label">New Password</label>
              <div className="relative">
                <input
                  type={showPw.next ? 'text' : 'password'}
                  value={pw.next}
                  onChange={e => setPw(f => ({ ...f, next: e.target.value }))}
                  className="hig-input pr-10"
                  placeholder="Min 6 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => toggleShowPw('next')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary hover:text-hig-text transition-colors"
                  tabIndex={-1}
                >
                  {showPw.next ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="hig-label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pw.confirm}
                  onChange={e => setPw(f => ({ ...f, confirm: e.target.value }))}
                  className="hig-input pr-10"
                  placeholder="Repeat new password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => toggleShowPw('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary hover:text-hig-text transition-colors"
                  tabIndex={-1}
                >
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {pwError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,59,48,0.06)',
              border: '1px solid rgba(255,59,48,0.18)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <AlertCircle size={14} style={{ color: '#FF3B30', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#FF3B30' }}>{pwError}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="submit"
              className="hig-btn-primary"
              disabled={pwLoading}
              style={{ opacity: pwLoading ? 0.65 : 1, minWidth: 140 }}
            >
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── App info ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'rgba(0,0,0,0.03)', borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={13} style={{ color: '#C7C7CC' }} />
          <p style={{ fontSize: 12, fontWeight: 500, color: '#8E8E93' }}>GoalsMapping · Financial Planning Suite</p>
        </div>
        <p style={{ fontSize: 11, color: '#C7C7CC' }}>V1.0 · LLH Group</p>
      </div>

    </div>
  )
}
