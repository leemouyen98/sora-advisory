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

// GET /api/contacts — list all contacts for this agent
export async function onRequestGet({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM contacts WHERE agent_code = ? ORDER BY name ASC'
    ).bind(agent.sub).all()

    return json({ contacts: results.map(parseContact) })
  } catch (err) {
    console.error('GET contacts error:', err)
    return json({ error: 'Server error' }, 500)
  }
}

// POST /api/contacts — create a new contact
export async function onRequestPost({ request, env }) {
  const agent = await getAgent(request, env)
  if (!agent) return json({ error: 'Unauthorized' }, 401)

  try {
    const data = await request.json()

    if (!data.name || !data.id) {
      return json({ error: 'Name and id are required' }, 400)
    }

    await env.DB.prepare(`
      INSERT INTO contacts
        (id, agent_code, name, dob, mobile, employment, retirement_age,
         review_date, review_frequency,
         notes, tags, interactions, tasks, activities,
         retirement_plan, protection_plan, financials)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      agent.sub,
      data.name,
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
    ).run()

    const row = await env.DB.prepare('SELECT * FROM contacts WHERE id = ?').bind(data.id).first()
    return json({ contact: parseContact(row) }, 201)
  } catch (err) {
    console.error('POST contact error:', err)
    return json({ error: 'Server error' }, 500)
  }
}
