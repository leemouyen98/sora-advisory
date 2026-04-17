import { useState } from 'react'
import { User, Lock, Shield, AlertCircle, Eye, EyeOff, Phone, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useLanguage } from '../hooks/useLanguage'

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
  const { agent, token, updateAgentProfile } = useAuth()
  const { addToast } = useToast()
  const { t } = useLanguage()

  // ── Password state ──────────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  // ── Contact info state ──────────────────────────────────────────────────────
  const [contactInfo, setContactInfo] = useState({
    email:  agent?.email  || '',
    mobile: agent?.mobile || '',
  })
  const [contactLoading, setContactLoading] = useState(false)
  const [contactError, setContactError]   = useState('')

  const toggleShowPw = (field) => setShowPw((s) => ({ ...s, [field]: !s[field] }))

  // ── Password change ─────────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')

    if (pw.next !== pw.confirm) {
      setPwError(t('settings.errMismatch'))
      return
    }
    if (pw.next.length < 6) {
      setPwError(t('settings.errTooShort'))
      return
    }
    if (pw.next === pw.current) {
      setPwError(t('settings.errSamePassword'))
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
        addToast(t('settings.pwSuccess'), 'success')
      }
    } catch {
      setPwError(t('settings.errNetwork'))
    } finally {
      setPwLoading(false)
    }
  }

  // ── Contact info save ───────────────────────────────────────────────────────
  const handleContactSave = async (e) => {
    e.preventDefault()
    setContactError('')
    setContactLoading(true)
    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: contactInfo.email, mobile: contactInfo.mobile }),
      })
      const data = await res.json()
      if (!res.ok) {
        setContactError(data.error || 'Failed to save contact info.')
      } else {
        updateAgentProfile({ email: data.email, mobile: data.mobile })
        addToast('Contact info saved.', 'success')
      }
    } catch {
      setContactError('Network error — check your connection and try again.')
    } finally {
      setContactLoading(false)
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
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.2 }}>{t('settings.title')}</h1>
        <p style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>{t('settings.subtitle')}</p>
      </div>

      {/* ── Profile ───────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={User}
        iconColor="#2E96FF"
        iconBg="rgba(46,150,255,0.1)"
        title={t('settings.profile')}
      >
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(46,150,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#2E96FF', flexShrink: 0,
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
            <label className="hig-label">{t('settings.agentCode')}</label>
            <input
              value={agent?.code || '—'}
              readOnly
              className="hig-input"
              style={{ background: '#F2F2F7', color: '#8E8E93', cursor: 'default' }}
            />
          </div>
          <div>
            <label className="hig-label">{t('settings.fullName')}</label>
            <input
              value={agent?.name || '—'}
              readOnly
              className="hig-input"
              style={{ background: '#F2F2F7', color: '#8E8E93', cursor: 'default' }}
            />
          </div>
        </div>
        <p style={{ fontSize: 12, color: '#C7C7CC', marginTop: 10 }}>
          {t('settings.adminNote')}
        </p>
      </SectionCard>

      {/* ── Contact Info ──────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Phone}
        iconColor="#FF9500"
        iconBg="rgba(255,149,0,0.1)"
        title="Contact Info"
      >
        <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 16, lineHeight: 1.5 }}>
          Your mobile number and email will be auto-populated into policy export PDFs.
        </p>
        <form onSubmit={handleContactSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="hig-label">Mobile Number (H/P)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">
                  <Phone size={14} />
                </div>
                <input
                  type="tel"
                  value={contactInfo.mobile}
                  onChange={e => setContactInfo(f => ({ ...f, mobile: e.target.value }))}
                  className="hig-input pl-9"
                  placeholder="e.g. 012-3456789"
                />
              </div>
            </div>
            <div>
              <label className="hig-label">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={e => setContactInfo(f => ({ ...f, email: e.target.value }))}
                  className="hig-input pl-9"
                  placeholder="e.g. henry@llhgroup.com"
                />
              </div>
            </div>
          </div>

          {contactError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,59,48,0.06)',
              border: '1px solid rgba(255,59,48,0.18)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              <AlertCircle size={14} style={{ color: '#FF3B30', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#FF3B30' }}>{contactError}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="submit"
              className="hig-btn-primary"
              disabled={contactLoading}
              style={{ opacity: contactLoading ? 0.65 : 1, minWidth: 140 }}
            >
              {contactLoading ? 'Saving…' : 'Save Contact Info'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ── Security ──────────────────────────────────────────────────────────── */}
      <SectionCard
        icon={Lock}
        iconColor="#34C759"
        iconBg="rgba(52,199,89,0.1)"
        title={t('settings.changePassword')}
      >
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="hig-label">{t('settings.currentPassword')}</label>
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pw.current}
                onChange={e => setPw(f => ({ ...f, current: e.target.value }))}
                className="hig-input pr-10"
                placeholder={t('settings.phCurrentPw')}
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
              <label className="hig-label">{t('settings.newPassword')}</label>
              <div className="relative">
                <input
                  type={showPw.next ? 'text' : 'password'}
                  value={pw.next}
                  onChange={e => setPw(f => ({ ...f, next: e.target.value }))}
                  className="hig-input pr-10"
                  placeholder={t('settings.phNewPw')}
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
              <label className="hig-label">{t('settings.confirmPassword')}</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pw.confirm}
                  onChange={e => setPw(f => ({ ...f, confirm: e.target.value }))}
                  className="hig-input pr-10"
                  placeholder={t('settings.phConfirmPw')}
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
              {pwLoading ? t('settings.updating') : t('settings.updatePassword')}
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
          <p style={{ fontSize: 12, fontWeight: 500, color: '#8E8E93' }}>{t('settings.appLabel')}</p>
        </div>
        <p style={{ fontSize: 11, color: '#C7C7CC' }}>V1.0 · LLH Group</p>
      </div>

    </div>
  )
}
