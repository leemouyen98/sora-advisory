/**
 * GET  /api/admin/agents/:code              — get single agent details
 * PUT  /api/admin/agents/:code              — update name / role / is_active / password
 */
import { hashPassword, generateSalt, json, cors } from '../../_auth.js'
import { requireAdmin } from '../_adminAuth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestGet({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  const row = await env.DB.prepare(`
    SELECT a.code, a.name, a.role, a.is_active, a.created_at,
           COUNT(c.id) AS contact_count
    FROM agents a
    LEFT JOIN contacts c ON c.agent_code = a.code
    WHERE a.code = ?
    GROUP BY a.code
  `).bind(params.code).first()

  if (!row) return json({ error: 'Agent not found' }, 404)
  return json({ agent: row })
}

export async function onRequestPut({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  try {
    const body = await request.json()
    const { name, role, is_active, password } = body

    const existing = await env.DB.prepare(
      'SELECT * FROM agents WHERE code = ?'
    ).bind(params.code).first()
    if (!existing) return json({ error: 'Agent not found' }, 404)

    const updates = []
    const binds = []

    if (name !== undefined) { updates.push('name = ?'); binds.push(name) }
    if (role !== undefined) { updates.push('role = ?'); binds.push(role === 'admin' ? 'admin' : 'agent') }
    if (is_active !== undefined) { updates.push('is_active = ?'); binds.push(is_active ? 1 : 0) }

    if (password) {
      const salt = generateSalt()
      const password_hash = await hashPassword(password, salt)
      updates.push('password_hash = ?', 'salt = ?')
      binds.push(password_hash, salt)
    }

    if (updates.length === 0) return json({ error: 'Nothing to update' }, 400)

    binds.push(params.code)
    await env.DB.prepare(
      `UPDATE agents SET ${updates.join(', ')} WHERE code = ?`
    ).bind(...binds).run()

    const updated = await env.DB.prepare(
      'SELECT code, name, role, is_active FROM agents WHERE code = ?'
    ).bind(params.code).first()

    return json({ agent: updated })
  } catch (err) {
    console.error('Update agent error:', err)
    return json({ error: 'Server error' }, 500)
  }
}
