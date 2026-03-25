import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 24,
    }}>
      {/* Large 404 */}
      <p style={{
        fontSize: 96, fontWeight: 800, color: 'rgba(0,122,255,0.08)',
        lineHeight: 1, letterSpacing: -4, marginBottom: 8, userSelect: 'none',
      }}>
        404
      </p>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 8 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 14, color: '#8E8E93', maxWidth: 300, lineHeight: 1.6, marginBottom: 28 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(-1)}
          className="hig-btn-secondary"
          style={{ gap: 7 }}
        >
          <ArrowLeft size={15} /> Go Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="hig-btn-primary"
          style={{ gap: 7 }}
        >
          <Home size={15} /> Dashboard
        </button>
      </div>
    </div>
  )
}
