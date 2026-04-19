/**
 * GET /api/library/files/:id/view
 * Streams file from R2 behind JWT auth.
 * PDFs served inline; all other types as attachment (download).
 */
import { getAgent, json, cors } from '../../../_auth.js'

export const onRequestOptions = () => cors()

export async function onRequestGet({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const file = await env.DB.prepare(
    'SELECT name, r2_key, mime_type FROM knowledge_files WHERE id = ?'
  ).bind(params.id).first()
  if (!file) return json({ error: 'File not found' }, 404)

  const object = await env.KNOWLEDGE.get(file.r2_key)
  if (!object) return json({ error: 'File data not found in storage' }, 404)

  const isPDF        = file.mime_type === 'application/pdf'
  const disposition  = isPDF
    ? `inline; filename="${encodeURIComponent(file.name)}"`
    : `attachment; filename="${encodeURIComponent(file.name)}"`

  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type':        file.mime_type,
      'Content-Disposition': disposition,
      'Cache-Control':       'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag':        'noindex, nofollow',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
