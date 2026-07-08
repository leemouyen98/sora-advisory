/**
 * GET  /api/library/folders?parentId=<id>  — list folders at a given level
 *      omit parentId (or parentId=root)    → returns root-level folders
 * POST /api/library/folders                — create folder (admin only)
 *      body: { name, parentId? }
 */
import { getAgent, json, cors } from '../../_auth.js'
import { requireAdmin } from '../../admin/_adminAuth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const url      = new URL(request.url)
  const parentId = url.searchParams.get('parentId') || null

  const rows = parentId
    ? await env.DB.prepare(
        'SELECT id, name, parent_id, created_at FROM knowledge_folders WHERE parent_id = ? ORDER BY name COLLATE NOCASE'
      ).bind(parentId).all()
    : await env.DB.prepare(
        'SELECT id, name, parent_id, created_at FROM knowledge_folders WHERE parent_id IS NULL ORDER BY name COLLATE NOCASE'
      ).all()

  return json({ folders: rows.results })
}

export async function onRequestPost({ request, env }) {
  const { error, agent } = await requireAdmin(request, env)
  if (error) return error

  const { name, parentId = null } = await request.json()
  if (!name?.trim()) return json({ error: 'name is required' }, 400)

  // Validate parentId if provided
  if (parentId) {
    const parent = await env.DB.prepare('SELECT id FROM knowledge_folders WHERE id = ?').bind(parentId).first()
    if (!parent) return json({ error: 'Parent folder not found' }, 404)
  }

  // Reject a duplicate name within the same parent (case-insensitive)
  const existing = parentId
    ? await env.DB.prepare(
        'SELECT id FROM knowledge_folders WHERE parent_id = ? AND name = ? COLLATE NOCASE'
      ).bind(parentId, name.trim()).first()
    : await env.DB.prepare(
        'SELECT id FROM knowledge_folders WHERE parent_id IS NULL AND name = ? COLLATE NOCASE'
      ).bind(name.trim()).first()
  if (existing) return json({ error: `A folder named "${name.trim()}" already exists here` }, 409)

  const id = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO knowledge_folders (id, name, parent_id, created_by) VALUES (?, ?, ?, ?)'
  ).bind(id, name.trim(), parentId, agent.sub).run()

  return json({ folder: { id, name: name.trim(), parent_id: parentId, created_by: agent.sub } }, 201)
}
