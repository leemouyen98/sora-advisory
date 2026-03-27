import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Plus, ChevronRight, Eye, EyeOff, Shield,
  UserCheck, UserX, RefreshCw, AlertTriangle, X,
  Check, ArrowLeft, Lock, Search,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// ─── API helpers ──────────────────────────────────────────────────────────────
function useAdminAPI() {
  const { token } = useAuth()

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const getAgents = useCallback(async () => {
    const res = await fetch('/api/admin/agents', { headers: headers() })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load agents')
    return (await res.json()).agents
  }, [headers])

  const createAgent = useCallback(async (data) => {
    const res = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to create agent')
    return json.agent
  }, [headers])

  const updateAgent = useCallback(async (code, data) => {
    const res = await fetch(`/api/admin/agents/${code}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to update agent')
    return json.agent
  }, [headers])

  const getAgentContacts = useCallback(async (code) => {
    const res = await fetch(`/api/admin/agents/${code}/contacts`, { headers: headers() })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load contacts')
    return (await res.json()).contacts
  }, [headers])

  return { getAgents, createAgent, updateAgent, getAgentContacts }
}

// ─── Sub-view: Agent contacts drawer ──────────────────────────────────────────
function AgentContactsDrawer({ agent, onClose }) {
  const { getAgentContacts } = useAdminAPI()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAgentContacts(agent.code)
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [agent.code, getAgentContacts])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search)
  )

  function calcAge(dob) {
    if (!dob) return '—'
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white shadow-hig-lg flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hig-gray-5">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hig-gray-6 transition-colors"
          >
            <ArrowLeft size={18} className="text-hig-text-secondary" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-hig-title3 font-semibold truncate">{agent.name}</h2>
            <p className="text-hig-caption text-hig-text-tertiary">
              Code {agent.code} · {contacts.length} clients
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-hig-gray-5">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-tertiary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="hig-input pl-8 w-full text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-hig-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-hig-text-tertiary">
              <Users size={24} className="mb-2 opacity-40" />
              <p className="text-hig-subhead">
                {search ? 'No matches' : 'No clients yet'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hig-gray-5">
              {filtered.map(c => {
                const tags = (() => { try { return JSON.parse(c.tags || '[]') } catch { return [] } })()
                return (
                  <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-hig-blue/10 text-hig-blue flex items-center justify-center shrink-0 font-semibold text-hig-subhead">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-hig-subhead font-medium truncate">{c.name}</p>
                      <p className="text-hig-caption text-hig-text-tertiary truncate">
                        {c.mobile || '—'} · Age {calcAge(c.dob)} · {c.employment}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.slice(0, 3).map(tag => (
                            <span key={tag} className="hig-tag text-[10px] px-1.5 py-0">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Create agent form modal ──────────────────────────────────────────────────
function CreateAgentModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ code: '', name: '', password: '', role: 'agent' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(form.code)) {
      setError('Agent code must be exactly 6 digits.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hig-gray-5">
          <h2 className="text-hig-title3 font-semibold">New Agent</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-hig-gray-6">
            <X size={16} className="text-hig-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-hig-sm text-red-600 text-hig-caption">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="hig-label">Agent Code <span className="text-hig-text-tertiary font-normal">(6 digits)</span></label>
            <input
              className="hig-input w-full mt-1 font-mono tracking-wider"
              maxLength={6}
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="e.g. 012345"
              value={form.code}
              onChange={e => set('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>

          <div>
            <label className="hig-label">Full Name</label>
            <input
              className="hig-input w-full mt-1"
              placeholder="e.g. Ahmad bin Yusof"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="hig-label">Initial Password</label>
            <div className="relative mt-1">
              <input
                className="hig-input w-full pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hig-text-tertiary"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="hig-label">Role</label>
            <div className="flex gap-2 mt-1">
              {['agent', 'admin'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={`flex-1 py-2 rounded-hig-sm border text-hig-subhead font-medium capitalize transition-colors ${
                    form.role === r
                      ? 'bg-hig-blue text-white border-hig-blue'
                      : 'bg-white text-hig-text-secondary border-hig-gray-4 hover:border-hig-blue/40'
                  }`}
                >
                  {r === 'admin' ? '🛡 Admin' : '👤 Agent'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="hig-btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="hig-btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Plus size={15} />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset password modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ agent, onClose, onSave }) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Min. 6 characters'); return }
    setLoading(true)
    try {
      await onSave(agent.code, { password })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-xs p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-hig-text-secondary" />
          <h2 className="text-hig-title3 font-semibold">Reset Password</h2>
        </div>
        <p className="text-hig-caption text-hig-text-secondary mb-4">
          Setting new password for <span className="font-medium text-hig-text">{agent.name}</span>
        </p>
        {error && (
          <p className="text-red-500 text-hig-caption mb-3 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              className="hig-input w-full pr-10"
              type={showPw ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hig-text-tertiary"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="hig-btn-secondary flex-1 text-sm">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="hig-btn-primary flex-1 text-sm flex items-center justify-center gap-1"
            >
              {loading
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check size={13} />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { getAgents, createAgent, updateAgent } = useAdminAPI()

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showCreate, setShowCreate] = useState(false)
  const [viewingAgent, setViewingAgent] = useState(null)   // contacts drawer
  const [resetAgent, setResetAgent] = useState(null)        // reset pw modal
  const [toastMsg, setToastMsg] = useState(null)

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) navigate('/dashboard', { replace: true })
  }, [isAdmin, navigate])

  const loadAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAgents(await getAgents())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [getAgents])

  useEffect(() => { loadAgents() }, [loadAgents])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  async function handleCreate(data) {
    const agent = await createAgent(data)
    setAgents(prev => [...prev, { ...agent, contact_count: 0 }])
    showToast(`Agent ${agent.name} created`)
  }

  async function handleToggleActive(agent) {
    const updated = await updateAgent(agent.code, { is_active: agent.is_active === 1 ? 0 : 1 })
    setAgents(prev => prev.map(a => a.code === agent.code ? { ...a, is_active: updated.is_active } : a))
    showToast(updated.is_active === 1 ? `${updated.name} reactivated` : `${updated.name} deactivated`)
  }

  async function handleResetPassword(code, data) {
    await updateAgent(code, data)
    showToast('Password updated')
  }

  if (!isAdmin) return null

  // Stats — count all members (agents + admins), not just role='agent'
  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.is_active === 1).length
  const totalClients = agents.reduce((s, a) => s + (a.contact_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-hig-title1 font-bold text-hig-text">Admin Dashboard</h1>
          <p className="text-hig-subhead text-hig-text-secondary mt-0.5">
            Manage agents, view client lists, control access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="hig-btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Agent
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Agents', value: totalAgents },
          { label: 'Active', value: activeAgents },
          { label: 'Total Clients', value: totalClients },
        ].map(stat => (
          <div key={stat.label} className="hig-card p-4 text-center">
            <p className="text-hig-title1 font-bold text-hig-text">{stat.value}</p>
            <p className="text-hig-caption text-hig-text-tertiary mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Agents table */}
      <div className="hig-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hig-gray-5">
          <h2 className="text-hig-subhead font-semibold text-hig-text">All Agents</h2>
          <button
            onClick={loadAgents}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-hig-gray-6 text-hig-text-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-2 border-hig-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 m-5 p-3 bg-red-50 border border-red-100 rounded-hig-sm text-red-600 text-hig-caption">
            <AlertTriangle size={14} />
            {error}
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-hig-text-tertiary">
            <Users size={28} className="mb-2 opacity-30" />
            <p className="text-hig-subhead">No agents yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-hig-gray-5 bg-hig-gray-6/50">
                  <th className="px-5 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide">Agent</th>
                  <th className="px-4 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide">Code</th>
                  <th className="px-4 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide">Role</th>
                  <th className="px-4 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide text-right">Clients</th>
                  <th className="px-4 py-2.5 text-hig-caption font-semibold text-hig-text-secondary uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hig-gray-5">
                {agents.map(agent => (
                  <tr key={agent.code} className="hover:bg-hig-gray-6/40 transition-colors group">
                    {/* Name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-hig-caption font-bold shrink-0 ${
                          agent.role === 'admin'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-hig-blue/10 text-hig-blue'
                        }`}>
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-hig-subhead font-medium text-hig-text">{agent.name}</span>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-hig-caption text-hig-text-secondary bg-hig-gray-6 px-2 py-0.5 rounded">
                        {agent.code}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {agent.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-hig-caption font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          <Shield size={11} /> Admin
                        </span>
                      ) : (
                        <span className="text-hig-caption text-hig-text-secondary">Agent</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {agent.is_active === 1 ? (
                        <span className="inline-flex items-center gap-1 text-hig-caption font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <UserCheck size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-hig-caption font-medium text-hig-text-tertiary bg-hig-gray-5 px-2 py-0.5 rounded-full">
                          <UserX size={11} /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Clients */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewingAgent(agent)}
                        className="inline-flex items-center gap-1 text-hig-subhead font-semibold text-hig-blue hover:underline"
                        title="View clients"
                      >
                        {agent.contact_count ?? 0}
                        <ChevronRight size={13} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset password */}
                        <button
                          onClick={() => setResetAgent(agent)}
                          title="Reset password"
                          className="text-hig-caption text-hig-text-secondary hover:text-hig-blue transition-colors px-2 py-1 rounded hover:bg-hig-blue/5"
                        >
                          Reset PW
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggleActive(agent)}
                          title={agent.is_active === 1 ? 'Deactivate' : 'Reactivate'}
                          className={`text-hig-caption font-medium px-2 py-1 rounded transition-colors ${
                            agent.is_active === 1
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {agent.is_active === 1 ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note on first admin — intentionally removed from UI (dev-only command, not for production display) */}

      {/* Modals */}
      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
      {viewingAgent && (
        <AgentContactsDrawer
          agent={viewingAgent}
          onClose={() => setViewingAgent(null)}
        />
      )}
      {resetAgent && (
        <ResetPasswordModal
          agent={resetAgent}
          onClose={() => setResetAgent(null)}
          onSave={handleResetPassword}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-hig-caption font-medium px-4 py-2.5 rounded-full shadow-hig-lg flex items-center gap-2 animate-fade-in">
          <Check size={13} className="text-green-400" />
          {toastMsg}
        </div>
      )}
    </div>
  )
}
