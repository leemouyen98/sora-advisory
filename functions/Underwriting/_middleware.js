/**
 * Gates the static Underwriting content tree (manifest.json, condition markdown,
 * media images) behind login.
 *
 * This whole tree lives under /public/Underwriting and is served by Cloudflare
 * Pages as plain static files — without this middleware, anyone with the URL
 * could pull the entire curated underwriting knowledge base with no auth at
 * all, even though the app's /underwriting route requires a logged-in agent.
 *
 * <img>/<iframe> requests can't carry a custom Authorization header, so media
 * fetches fall back to a `?token=` query param; the manifest/markdown fetches
 * (JS-driven, in MedicalUnderwritingPage.jsx) use the standard Bearer header.
 */
import { getAgent, verifyJWT } from '../api/_auth.js'

export async function onRequest({ request, env, next }) {
  const agent = await getAgent(request, env)
  if (agent) return next()

  const url = new URL(request.url)
  const queryToken = url.searchParams.get('token')
  if (queryToken) {
    const secret = env.JWT_SECRET || 'dev-secret-change-in-production'
    const payload = await verifyJWT(queryToken, secret)
    if (payload) return next()
  }

  return new Response('Unauthorized', { status: 401 })
}
