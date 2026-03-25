import { hashPassword, generateSalt, getAgent, json, cors } from '../_auth.js'

export async function onRequestOptions() {
  return cors()
}

export async function onRequestPut({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return json({ error: 'Current and new passwords are required.' }, 400)
    }
    if (newPassword.length < 6) {
      return json({ error: 'New password must be at least 6 characters.' }, 400)
    }

    // Fetch the agent record
    const record = await env.DB.prepare(
      'SELECT * FROM agents WHERE code = ?'
    ).bind(agent.sub).first()

    if (!record) return json({ error: 'Agent not found.' }, 404)

    // Verify current password
    const currentHash = await hashPassword(currentPassword, record.salt)
    if (currentHash !== record.password_hash) {
      return json({ error: 'Current password is incorrect.' }, 400)
    }

    // Hash new password with fresh salt
    const newSalt = generateSalt()
    const newHash = await hashPassword(newPassword, newSalt)

    await env.DB.prepare(
      'UPDATE agents SET password_hash = ?, salt = ? WHERE code = ?'
    ).bind(newHash, newSalt, agent.sub).run()

    return json({ success: true })
  } catch (err) {
    console.error('Password change error:', err)
    return json({ error: 'Server error.' }, 500)
  }
}
