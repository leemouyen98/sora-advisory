import { getAgent, json, cors } from '../_auth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  // Fetch live role & active status from DB (JWT role claim is informational only)
  const row = await env.DB.prepare(
    'SELECT role, is_active FROM agents WHERE code = ?'
  ).bind(agent.sub).first()

  if (!row || row.is_active === 0) return json({ error: 'Account inactive' }, 403)

  return json({ agent: { code: agent.sub, name: agent.name, role: row.role || 'agent' } })
}
