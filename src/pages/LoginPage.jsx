import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [agentCode, setAgentCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(agentCode, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hig-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-hig-blue mx-auto mb-4
                          flex items-center justify-center shadow-hig-md">
            <span className="text-white text-2xl font-bold">GM</span>
          </div>
          <h1 className="text-hig-title2 text-hig-text">GoalsMapping</h1>
          <p className="text-hig-subhead text-hig-text-secondary mt-1">
            Financial Planning Suite
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="hig-card p-6 space-y-5">
          <div>
            <label className="hig-label">Agent Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit agent code"
              value={agentCode}
              onChange={(e) => setAgentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="hig-input tracking-widest text-center text-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="hig-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hig-input pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-hig-text-secondary hover:text-hig-text
                           transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-hig-red text-hig-subhead rounded-hig-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={agentCode.length !== 6 || !password || loading}
            className="hig-btn-primary w-full text-hig-body"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-hig-caption1 text-hig-text-secondary mt-6">
          Demo: Agent Code <strong>100001</strong> / Password <strong>demo123</strong>
        </p>
      </div>
    </div>
  )
}
