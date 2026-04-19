/**
 * POST /api/library/files — upload a file to a folder (admin only)
 * Body: multipart/form-data  { folderId, file, name? }
 */
import { getAgent, json, cors } from '../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestPost({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare('SELECT role FROM agents WHERE code = ?').bind(agent.sub).first()
  if (!row || row.role !== 'admin') return json({ error: 'Forbidden' }, 403)

  const formData = await request.formData()
  const folderId = formData.get('folderId')
  const file     = formData.get('file')
  const name     = (formData.get('name') || file?.name || 'untitled').trim()

  if (!folderId) return json({ error: 'folderId is required' }, 400)
  if (!file)     return json({ error: 'file is required' }, 400)

  // Verify folder exists
  const folder = await env.DB.prepare(
    'SELECT id FROM knowledge_folders WHERE id = ?'
  ).bind(folderId).first()
  if (!folder) return json({ error: 'Folder not found' }, 404)

  const fileId  = crypto.randomUUID()
  const r2Key   = `${folderId}/${fileId}`
  const mimeType = file.type || 'application/octet-stream'

  // Upload to R2
  await env.KNOWLEDGE.put(r2Key, file.stream(), {
    httpMetadata: { contentType: mimeType },
  })

  // Record in D1
  await env.DB.prepare(
    `INSERT INTO knowledge_files (id, folder_id, name, r2_key, mime_type, size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(fileId, folderId, name, r2Key, mimeType, file.size, agent.sub).run()

  return json({
    file: { id: fileId, folder_id: folderId, name, mime_type: mimeType, size: file.size },
  }, 201)
}
