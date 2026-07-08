/**
 * PATCH  /api/library/folders/:id — rename folder (admin only)
 * DELETE /api/library/folders/:id — recursively delete folder tree + all R2 files (admin only)
 */
import { json, cors } from '../../_auth.js'
import { requireAdmin } from '../../admin/_adminAuth.js'

export const onRequestOptions = () => cors()

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

  // Collect all descendant folder IDs (including the target) via recursive CTE
  const descendants = await env.DB.prepare(`
    WITH RECURSIVE tree(id) AS (
      SELECT id FROM knowledge_folders WHERE id = ?
      UNION ALL
      SELECT f.id FROM knowledge_folders f INNER JOIN tree t ON f.parent_id = t.id
    )
    SELECT id FROM tree
  `).bind(params.id).all()

  if (descendants.results.length === 0) return json({ error: 'Folder not found' }, 404)

  const folderIds = descendants.results.map(r => r.id)

  // Collect all R2 keys for files across the entire subtree
  const placeholders = folderIds.map(() => '?').join(',')
  const files = await env.DB.prepare(
    `SELECT r2_key FROM knowledge_files WHERE folder_id IN (${placeholders})`
  ).bind(...folderIds).all()

  // Delete from R2 (parallel)
  await Promise.all(files.results.map(f => env.KNOWLEDGE.delete(f.r2_key)))

  // Delete the root folder — ON DELETE CASCADE removes all descendants + their files in D1
  await env.DB.prepare('DELETE FROM knowledge_folders WHERE id = ?').bind(params.id).run()

  return json({ ok: true })
}
