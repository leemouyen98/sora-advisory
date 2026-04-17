import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'gm_token'
const AGENT_KEY = 'gm_agent'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))
  const [agent, setAgent] = useState(() => {
    const stored = sessionStorage.getItem(AGENT_KEY)
    try { return stored ? JSON.parse(stored) : null } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (code, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: String(code), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return false
      }
      sessionStorage.setItem(TOKEN_KEY, data.token)
      sessionStorage.setItem(AGENT_KEY, JSON.stringify(data.agent))
      setToken(data.token)
      setAgent(data.agent)
      return true
    } catch {
      setError('Network error — check your connection and try again.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(AGENT_KEY)
    setToken(null)
    setAgent(null)
  }, [])

  // Update the locally stored agent profile (email / mobile) after a successful PUT
  const updateAgentProfile = useCallback((updates) => {
    setAgent((prev) => {
      const next = { ...prev, ...updates }
      sessionStorage.setItem(AGENT_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Convenience: role from agent object, defaults to 'agent'
  const role = agent?.role ?? 'agent'
  const isAdmin = role === 'admin'

  return (
    <AuthContext.Provider value={{ agent, token, loading, error, login, logout, role, isAdmin, updateAgentProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
