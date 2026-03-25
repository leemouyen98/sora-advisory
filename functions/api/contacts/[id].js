import { getAgent, json, cors } from '../_auth.js'

function parseContact(row) {
  return {
    id: row.id,
    name: row.name,
    dob: row.dob || '',
    mobile: row.mobile || '',
    employment: row.employment || 'Employed',
    retirementAge: Number(row.retirement_age) || 55,
    reviewDate: row.review_date || '',
    reviewFrequency: row.review_frequency || 'Annually',
    notes: row.notes || '',
    tags: JSON.parse(row.tags || '[]'),
    interactions: JSON.parse(row.interactions || '[]'),
    tasks: JSON.parse(row.tasks || '[]'),
    activities: JSON.parse(row.activities || '[]'),
    retirementPlan: row.retirement_plan ? JSON.parse(row.retirement_plan) : null,
    protectionPlan: row.protection_plan ? JSON.parse(row.protection_plan) : null,
    financials: row.financials ? JSON.parse(row.financials) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function onRequestOptions() {
  return cors()
}

// GET /api/contacts/:id
export async function onRequestGet({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  const row = await env.DB.prepare(
    'SELECT * FROM contacts WHERE id = ? AND agent_code = ?'
  ).bind(params.id, agent.sub).first()

  if (!row) return json({ error: 'Contact not found' }, 404)
  return json({ contact: parseContact(row) })
}

// PUT /api/contacts/:id — full contact update
export async function onRequestPut({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const data = await request.json()

    await env.DB.prepare(`
      UPDATE contacts SET
        name = ?, dob = ?, mobile = ?, employment = ?,
        retirement_age = ?,
        review_date = ?, review_frequency = ?, notes = ?,
        tags = ?, interactions = ?, tasks = ?, activities = ?,
        retirement_plan = ?, protection_plan = ?,
        financials = ?,
        updated_at = datetime('now')
      WHERE id = ? AND agent_code = ?
    `).bind(
      data.name || '',
      data.dob || '',
      data.mobile || '',
      data.employment || 'Employed',
      Number(data.retirementAge) || 55,
      data.reviewDate || '',
      data.reviewFrequency || 'Annually',
      data.notes || '',
      JSON.stringify(data.tags || []),
      JSON.stringify(data.interactions || []),
      JSON.stringify(data.tasks || []),
      JSON.stringify(data.activities || []),
      data.retirementPlan ? JSON.stringify(data.retirementPlan) : null,
      data.protectionPlan ? JSON.stringify(data.protectionPlan) : null,
      data.financials ? JSON.stringify(data.financials) : null,
      params.id,
      agent.sub,
    ).run()

    const row = await env.DB.prepare('SELECT * FROM contacts WHERE id = ?').bind(params.id).first()
    if (!row) return json({ error: 'Contact not found' }, 404)
    return json({ contact: parseContact(row) })
  } catch (err) {
    console.error('PUT contact error:', err)
    return json({ error: 'Server error' }, 500)
  }
}

// DELETE /api/contacts/:id
export async function onRequestDelete({ request, env, params }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  await env.DB.prepare(
    'DELETE FROM contacts WHERE id = ? AND agent_code = ?'
  ).bind(params.id, agent.sub).run()

  return json({ success: true })
}
