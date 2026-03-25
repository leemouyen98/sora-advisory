/**
 * Admin auth guard — returns the verified JWT payload if caller is an active admin,
 * otherwise returns a 401/403 Response ready to return.
 */
import { getAgent, json } from '../_auth.js'

export async function requireAdmin(request, env) {
  const agent = await getAgent(request, env)
  if (!agent) return { error: json({ error: 'Unauthorized' }, 401) }

  // Re-fetch from DB to get current role & is_active (JWT might be stale)
  const row = await env.DB.prepare(
    'SELECT role, is_active FROM agents WHERE code = ?'
  ).bind(agent.sub).first()

  if (!row || row.is_active === 0) return { error: json({ error: 'Account inactive' }, 403) }
  if (row.role !== 'admin') return { error: json({ error: 'Forbidden — admin only' }, 403) }

  return { agent }
}
