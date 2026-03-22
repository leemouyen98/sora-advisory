import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

// Demo agents for local dev — replace with Cloudflare Worker API in production
const DEMO_AGENTS = [
  {
    id: '1',
    agent_code: '100001',
    password: 'demo123',
    name: 'Henry Lee',
    email: 'henry@goalsmapping.com',
    role: 'admin',
    profile_pic: null,
  },
  {
    id: '2',
    agent_code: '100002',
    password: 'demo123',
    name: 'Sarah Tan',
    email: 'sarah@goalsmapping.com',
    role: 'agent',
    profile_pic: null,
  },
]

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(() => {
    const saved = sessionStorage.getItem('gm_agent')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (agentCode, password) => {
    // TODO: Replace with fetch('/api/auth/login', { ... }) for production
    const found = DEMO_AGENTS.find(
      (a) => a.agent_code === agentCode && a.password === password
    )
    if (!found) {
      throw new Error('Invalid agent code or password')
    }
    const { password: _, ...agentData } = found
    setAgent(agentData)
    sessionStorage.setItem('gm_agent', JSON.stringify(agentData))
    return agentData
  }, [])

  const logout = useCallback(() => {
    setAgent(null)
    sessionStorage.removeItem('gm_agent')
  }, [])

  return (
    <AuthContext.Provider value={{ agent, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
