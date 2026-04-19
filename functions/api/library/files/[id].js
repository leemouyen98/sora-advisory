/**
 * PATCH  /api/library/files/:id — rename file (admin only)
 * DELETE /api/library/files/:id — delete file from R2 + D1 (admin only)
 */
import { getAgent, json, cors } from '../../_auth.js'

export const onRequestOptions = () => cors()

async function requireAdmin(request, env) {
  const agent = await getAgent(request, env)
  if (!agent) return { error: json({ error: 'Unauthorized' }, 401) }
  const row = await env.DB.prepare('SELECT role FROM agents WHERE code = ?').bind(agent.sub).first()
  if (!row || row.role !== 'admin') return { error: json({ error: 'Forbidden' }, 403) }
  return { agent }
}

export async function onRequestPatch({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  const { name } = await request.json()
  if (!name?.trim()) return json({ error: 'name is required' }, 400)

  const result = await env.DB.prepare(
    'UPDATE knowledge_files SET name = ? WHERE id = ?'
  ).bind(name.trim(), params.id).run()

  if (result.meta.changes === 0) return json({ error: 'File not found' }, 404)
  return json({ ok: true })
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  const file = await env.DB.prepare(
    'SELECT r2_key FROM knowledge_files WHERE id = ?'
  ).bind(params.id).first()
  if (!file) return json({ error: 'File not found' }, 404)

  // Remove from R2 first, then D1
  await env.KNOWLEDGE.delete(file.r2_key)
  await env.DB.prepare('DELETE FROM knowledge_files WHERE id = ?').bind(params.id).run()

  return json({ ok: true })
}
