/**
 * GET /api/library/favorites — list starred files for the calling agent
 *
 * Returns:
 * {
 *   favorites: [
 *     { id, name, mime_type, size, folder_id, folder_name, starred_at },
 *     ...
 *   ]
 * }
 */
import { getAgent, json, cors } from '../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const rows = await env.DB.prepare(`
    SELECT
      f.id,
      f.name,
      f.mime_type,
      f.size,
      f.folder_id,
      fo.name  AS folder_name,
      kf.starred_at
    FROM knowledge_favorites kf
    JOIN knowledge_files   f  ON f.id        = kf.file_id
    JOIN knowledge_folders fo ON fo.id       = f.folder_id
    WHERE kf.agent_code = ?
    ORDER BY kf.starred_at DESC
  `).bind(agent.sub).all()

  return json({ favorites: rows.results })
}
