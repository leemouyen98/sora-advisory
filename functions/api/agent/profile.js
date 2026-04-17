import { getAgent, json, cors } from '../_auth.js'

export async function onRequestOptions() {
  return cors()
}

// GET /api/agent/profile — return current agent's email + mobile
export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const record = await env.DB.prepare(
      'SELECT code, name, role, email, mobile FROM agents WHERE code = ?'
    ).bind(agent.sub).first()

    if (!record) return json({ error: 'Agent not found.' }, 404)

    return json({
      code:   record.code,
      name:   record.name,
      role:   record.role,
      email:  record.email  || '',
      mobile: record.mobile || '',
    })
  } catch (err) {
    console.error('Profile GET error:', err)
    return json({ error: 'Server error.' }, 500)
  }
}

// PUT /api/agent/profile — update email + mobile
export async function onRequestPut({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const { email, mobile } = await request.json()

    if (email === undefined || mobile === undefined) {
      return json({ error: 'email and mobile are required.' }, 400)
    }

    await env.DB.prepare(
      'UPDATE agents SET email = ?, mobile = ? WHERE code = ?'
    ).bind(String(email).trim(), String(mobile).trim(), agent.sub).run()

    return json({ success: true, email: String(email).trim(), mobile: String(mobile).trim() })
  } catch (err) {
    console.error('Profile PUT error:', err)
    return json({ error: 'Server error.' }, 500)
  }
}
