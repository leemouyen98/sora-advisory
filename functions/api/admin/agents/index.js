/**
 * GET  /api/admin/agents          — list all agents with contact counts
 * POST /api/admin/agents          — create a new agent
 */
import { hashPassword, generateSalt, json, cors } from '../../_auth.js'
import { requireAdmin } from '../_adminAuth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestGet({ request, env }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  const rows = await env.DB.prepare(`
    SELECT
      a.code, a.name, a.role, a.is_active, a.created_at,
      COUNT(c.id) AS contact_count
    FROM agents a
    LEFT JOIN contacts c ON c.agent_code = a.code
    GROUP BY a.code
    ORDER BY a.created_at ASC
  `).all()

  return json({ agents: rows.results })
}

export async function onRequestPost({ request, env }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  try {
    const { code, name, password, role } = await request.json()

    if (!code || !name || !password) {
      return json({ error: 'code, name and password are required' }, 400)
    }
    if (!/^\d{6}$/.test(String(code))) {
      return json({ error: 'Agent code must be exactly 6 digits' }, 400)
    }

    // Check uniqueness
    const existing = await env.DB.prepare(
      'SELECT id FROM agents WHERE code = ?'
    ).bind(String(code)).first()
    if (existing) return json({ error: 'Agent code already exists' }, 409)

    const salt = generateSalt()
    const password_hash = await hashPassword(password, salt)
    const agentRole = role === 'admin' ? 'admin' : 'agent'

    await env.DB.prepare(`
      INSERT INTO agents (code, name, password_hash, salt, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(String(code), name, password_hash, salt, agentRole).run()

    return json({ agent: { code: String(code), name, role: agentRole, is_active: 1 } }, 201)
  } catch (err) {
    console.error('Create agent error:', err)
    return json({ error: 'Server error' }, 500)
  }
}
