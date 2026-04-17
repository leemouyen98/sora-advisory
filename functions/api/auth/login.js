import { hashPassword, signJWT, json, cors } from '../_auth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestPost({ request, env }) {
  try {
    const { code, password } = await request.json()

    if (!code || !password) {
      return json({ error: 'Agent code and password are required' }, 400)
    }

    // Look up agent by code
    const agent = await env.DB.prepare(
      'SELECT * FROM agents WHERE code = ?'
    ).bind(String(code)).first()

    if (!agent) {
      return json({ error: 'Invalid agent code or password' }, 401)
    }

    // Reject deactivated accounts
    if (agent.is_active === 0) {
      return json({ error: 'Account has been deactivated. Please contact your administrator.' }, 403)
    }

    // Verify password
    const hash = await hashPassword(password, agent.salt)
    if (hash !== agent.password_hash) {
      return json({ error: 'Invalid agent code or password' }, 401)
    }

    // Sign JWT — 8 hour expiry (includes role for client-side UI gating)
    const secret = env.JWT_SECRET || 'dev-secret-change-in-production'
    const token = await signJWT(
      {
        sub: agent.code,
        name: agent.name,
        role: agent.role || 'agent',
        exp: Math.floor(Date.now() / 1000) + 28800,
      },
      secret
    )

    return json({
      token,
      agent: {
        code:   agent.code,
        name:   agent.name,
        role:   agent.role   || 'agent',
        email:  agent.email  || '',
        mobile: agent.mobile || '',
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return json({ error: 'Server error' }, 500)
  }
}
