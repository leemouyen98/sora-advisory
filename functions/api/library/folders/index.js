/**
 * GET  /api/library/folders  — list all folders (any authenticated agent)
 * POST /api/library/folders  — create folder (admin only)
 */
import { getAgent, json, cors } from '../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const rows = await env.DB.prepare(
    'SELECT id, name, created_at, created_by FROM knowledge_folders ORDER BY name COLLATE NOCASE'
  ).all()

  return json({ folders: rows.results })
}

export async function onRequestPost({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare('SELECT role FROM agents WHERE code = ?').bind(agent.sub).first()
  if (!row || row.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const { name } = await request.json()
  if (!name?.trim()) return json({ error: 'name is required' }, 400)

  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO knowledge_folders (id, name, created_by) VALUES (?, ?, ?)'
  ).bind(id, name.trim(), agent.sub).run()

  return json({ folder: { id, name: name.trim(), created_by: agent.sub } }, 201)
}
