import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext(null)

const CONFIGS = {
  success: { icon: CheckCircle2, color: '#34C759', bg: 'rgba(52,199,89,0.1)' },
  error:   { icon: XCircle,      color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' },
  info:    { icon: Info,         color: '#007AFF', bg: 'rgba(0,122,255,0.1)' },
  warning: { icon: AlertTriangle,color: '#FF9500', bg: 'rgba(255,149,0,0.1)' },
}

function ToastItem({ toast, onRemove }) {
  const cfg = CONFIGS[toast.type] || CONFIGS.info
  const Icon = cfg.icon
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'white', borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
        padding: '12px 14px',
        maxWidth: 360, minWidth: 240,
        borderLeft: `4px solid ${cfg.color}`,
        pointerEvents: 'all',
        animation: 'toast-slide-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: cfg.bg, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <p style={{ fontSize: 13, color: '#1C1C1E', flex: 1, lineHeight: 1.5, paddingTop: 2 }}>
        {toast.message}
      </p>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#C7C7CC', padding: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#8E8E93'}
        onMouseLeave={e => e.currentTarget.style.color = '#C7C7CC'}
      >
        <X size={13} />
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column-reverse', gap: 10,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
