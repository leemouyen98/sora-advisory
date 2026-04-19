/**
 * GET /api/library/folders/:id/files — list files in a folder (any agent)
 * Each file includes is_starred (1/0) for the calling agent.
 */
import { getAgent, json, cors } from '../../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const files = await env.DB.prepare(`
    SELECT
      f.id, f.name, f.mime_type, f.size, f.uploaded_at, f.uploaded_by,
      CASE WHEN kf.file_id IS NOT NULL THEN 1 ELSE 0 END AS is_starred
    FROM knowledge_files f
    LEFT JOIN knowledge_favorites kf
      ON kf.file_id = f.id AND kf.agent_code = ?
    WHERE f.folder_id = ?
    ORDER BY f.name COLLATE NOCASE
  `).bind(agent.sub, params.id).all()

  return json({ files: files.results })
}
