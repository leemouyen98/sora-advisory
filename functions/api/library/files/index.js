/**
 * POST /api/library/files — upload a file to a folder (admin only)
 * Body: multipart/form-data  { folderId, file, name? }
 */
import { json, cors } from '../../_auth.js'
import { requireAdmin } from '../../admin/_adminAuth.js'

export const onRequestOptions = () => cors()

// Keep in sync with the client-side copy in KnowledgeLibraryPage.jsx (UPLOAD_LIMITS) —
// this is the enforced limit; the frontend copy only exists for fast user feedback.
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
])

export async function onRequestPost({ request, env }) {
  const { error, agent } = await requireAdmin(request, env)
  if (error) return error

  const formData = await request.formData()
  const folderId = formData.get('folderId')
  const file     = formData.get('file')
  const name     = (formData.get('name') || file?.name || 'untitled').trim()

  if (!folderId) return json({ error: 'folderId is required' }, 400)
  if (!file)     return json({ error: 'file is required' }, 400)

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` }, 413)
  }
  const uploadMime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(uploadMime)) {
    return json({ error: `File type "${uploadMime || 'unknown'}" is not allowed` }, 415)
  }

  // Verify folder exists
  const folder = await env.DB.prepare(
    'SELECT id FROM knowledge_folders WHERE id = ?'
  ).bind(folderId).first()
  if (!folder) return json({ error: 'Folder not found' }, 404)

  // Reject a duplicate name within the same folder (case-insensitive)
  const existing = await env.DB.prepare(
    'SELECT id FROM knowledge_files WHERE folder_id = ? AND name = ? COLLATE NOCASE'
  ).bind(folderId, name).first()
  if (existing) return json({ error: `A file named "${name}" already exists in this folder` }, 409)

  const fileId  = crypto.randomUUID()
  const r2Key   = `${folderId}/${fileId}`
  const mimeType = uploadMime

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
