/**
 * PATCH  /api/library/folders/:id  — rename folder (admin only)
 * DELETE /api/library/folders/:id  — delete folder + all its files from R2 + D1 (admin only)
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
    'UPDATE knowledge_folders SET name = ? WHERE id = ?'
  ).bind(name.trim(), params.id).run()

  if (result.meta.changes === 0) return json({ error: 'Folder not found' }, 404)
  return json({ ok: true })
}

export async function onRequestDelete({ request, env, params }) {
  const { error } = await requireAdmin(request, env)
  if (error) return error

  // Collect all R2 keys before deleting from D1
  const files = await env.DB.prepare(
    'SELECT r2_key FROM knowledge_files WHERE folder_id = ?'
  ).bind(params.id).all()

  // Delete files from R2
  await Promise.all(files.results.map(f => env.KNOWLEDGE.delete(f.r2_key)))

  // D1 cascade deletes the files rows too
  const result = await env.DB.prepare(
    'DELETE FROM knowledge_folders WHERE id = ?'
  ).bind(params.id).run()

  if (result.meta.changes === 0) return json({ error: 'Folder not found' }, 404)
  return json({ ok: true })
}
