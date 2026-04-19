/**
 * GET /api/library/folders/:id/files — list files in a folder (any agent)
 */
import { getAgent, json, cors } from '../../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const files = await env.DB.prepare(
    `SELECT id, name, mime_type, size, uploaded_at, uploaded_by
     FROM knowledge_files WHERE folder_id = ? ORDER BY name COLLATE NOCASE`
  ).bind(params.id).all()

  return json({ files: files.results })
}
