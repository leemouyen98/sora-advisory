/**
 * POST /api/library/files/:id/star — toggle star for the calling agent
 *
 * Returns { starred: true }  if the file is now starred
 *         { starred: false } if the file was unstarred
 */
import { getAgent, json, cors } from '../../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestPost({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const fileId    = params.id
  const agentCode = agent.sub

  // Check if the file even exists
  const file = await env.DB.prepare('SELECT id FROM knowledge_files WHERE id = ?').bind(fileId).first()
  if (!file) return json({ error: 'File not found' }, 404)

  // Toggle: check current state
  const existing = await env.DB.prepare(
    'SELECT 1 FROM knowledge_favorites WHERE agent_code = ? AND file_id = ?'
  ).bind(agentCode, fileId).first()

  if (existing) {
    await env.DB.prepare(
      'DELETE FROM knowledge_favorites WHERE agent_code = ? AND file_id = ?'
    ).bind(agentCode, fileId).run()
    return json({ starred: false })
  } else {
    await env.DB.prepare(
      'INSERT INTO knowledge_favorites (agent_code, file_id) VALUES (?, ?)'
    ).bind(agentCode, fileId).run()
    return json({ starred: true })
  }
}
