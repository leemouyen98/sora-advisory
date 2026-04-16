/**
 * GET /api/documents/plan?lang=zh  (default)
 * GET /api/documents/plan?lang=en
 * Serves the 5-in-1 protection plan PDF behind JWT auth.
 */
import { getAgent } from '../_auth.js'

const ASSETS = {
  zh: '/assets/5-in-1%20%E5%AE%8C%E6%95%B4%E4%BF%9D%E9%9A%9C%E8%AE%A1%E5%88%92.pdf',
  en: '/assets/5-in-1%20Complete%20Protection%20(Eng).pdf',
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
    },
  })
}

export async function onRequestGet({ request, env }) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const agent = await getAgent(request, env)
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Pick asset by lang param ──────────────────────────────────────────────
  const url = new URL(request.url)
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'zh'
  const assetPath = ASSETS[lang]

  // ── Fetch the static asset via the Pages ASSETS binding ───────────────────
  const origin = url.origin
  const assetRequest = new Request(`${origin}${assetPath}`, {
    method: 'GET',
    headers: { Accept: 'application/pdf' },
  })

  let assetResponse
  try {
    assetResponse = await env.ASSETS.fetch(assetRequest)
  } catch {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!assetResponse.ok) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Return PDF with protective headers ────────────────────────────────────
  // Content-Disposition: inline  → browser renders, does not prompt save-as
  // Cache-Control: no-store      → no cached copy left on device
  // X-Robots-Tag: noindex        → search engines won't index if accidentally crawled
  return new Response(assetResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="plan.pdf"',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
