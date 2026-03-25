/**
 * GET /api/admin/agents/:code/contacts — list contacts belonging to an agent
 */
import { json, cors } from '../../../_auth.js'
import { requireAdmin } from '../../_adminAuth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestGet({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  const rows = await env.DB.prepare(`
    SELECT id, name, dob, mobile, employment, review_date, tags, created_at, updated_at
    FROM contacts
    WHERE agent_code = ?
    ORDER BY name ASC
  `).bind(params.code).all()

  return json({ contacts: rows.results })
}
