/**
 * Case Priority Engine
 * Analyses a contact's retirement plan, protection plan, and financials
 * and returns sorted advisory flags — highest urgency first.
 *
 * Flags: { type, severity, message, detail, [shortfall], [coveragePercent], [surplus], [totalLinked] }
 * severity: 'critical' | 'warning' | 'info' | 'ok'
 */

import { generateRetirementProjection, generateProtectionSummary } from './calculations'
import { getAge } from './formatters'

// Minimal toMonthly — mirrors the one in financial-info/helpers.js
function toMonthly(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1 / 12, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function fmtK(n) {
  if (n >= 1_000_000) return `RM ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `RM ${Math.round(n / 1_000)}k`
  return `RM ${Math.round(n)}`
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, ok: 3 }

// ─── Severity rule tables ─────────────────────────────────────────────────────
// These bands encode advisory judgement, not just arithmetic. Keep them here,
// documented, so the next person doesn't reintroduce a flat "50% = critical"
// cutoff without thinking about what the risk actually means.

// Protection: coverage-% bands per risk. Death/TPD are irreversible loss of
// earning capacity — held to a high bar. Advanced-stage CI is severe but
// survivable. Early-stage CI is a bridge/buffer, not a catastrophic loss, so
// it gets the most tolerance. "Worst % across all 4 risks" alone would let a
// client at 60% ECI (fine) drag the whole block to the same severity as a
// client at 60% death cover (not fine) — this fixes that.
const PROTECTION_RISK_BANDS = {
  death: { critical: 50, warning: 80 },
  tpd:   { critical: 50, warning: 80 },
  aci:   { critical: 40, warning: 70 },
  eci:   { critical: 20, warning: 50 },
}

function riskSeverity(risk, pct) {
  const band = PROTECTION_RISK_BANDS[risk] ?? { critical: 30, warning: 70 }
  if (pct < band.critical) return 'critical'
  if (pct < band.warning) return 'warning'
  return 'info'
}

// Retirement: severity depends on time-to-retirement, not just coverage %.
// A 35-year-old at 40% funded has decades to fix it; a 58-year-old at 40%
// funded is a fire. Once retired (or at the line) there's no runway left to
// course-correct, so the bar tightens hard.
function retirementSeverity({ pct, yearsToRetirement, fundsRunOutWithRec, lifeExpectancy }) {
  const life = lifeExpectancy ?? 100
  const runoutGapYears = life - (fundsRunOutWithRec ?? life) // years short of life expectancy

  if (yearsToRetirement <= 0) {
    return pct < 90 ? 'critical' : 'warning'
  }
  if (yearsToRetirement <= 10) {
    return (pct < 70 || runoutGapYears > 5) ? 'critical' : 'warning'
  }
  return pct < 30 ? 'critical' : 'warning'
}

// Cash flow: a deficit is worse than a thin surplus, but a deficit *while
// premiums are already running* is worse still — it's a lapse risk on cover
// the client is relying on (breaks "medical must sustain to 100"). That
// distinction, not just the raw number, decides critical vs warning.
function cashFlowSeverity({ afterPlans, totalLinked, income }) {
  const ratio = afterPlans / Math.max(1, income)
  if (afterPlans < 0) {
    return totalLinked > 0 ? 'critical' : 'warning'
  }
  if (ratio < 0.1) return 'warning'
  return 'info'
}

// ─── Protection Priority ─────────────────────────────────────────────────────
function protectionFlag(contact) {
  const prot = contact?.protectionPlan
  if (!prot || !prot.needs) {
    return {
      type: 'protection', severity: 'critical',
      message: 'No protection plan',
      detail: 'Family is unprotected — run Insurance Planner',
    }
  }

  const summary = generateProtectionSummary({
    needs: prot.needs,
    existing: prot.existing ?? {},
    inflationRate: prot.inflationRate ?? 4,
    returnRate: prot.returnRate ?? 1,
    recommendations: prot.recommendations ?? [],
  })

  // Find the worst-covered risk that has a non-zero target
  const active = summary.filter(s => s.targetCoverage > 0)
  if (!active.length) {
    return { type: 'protection', severity: 'info', message: 'No protection needs entered', detail: 'Add needs in Step 1' }
  }

  const allFunded = active.every(s => s.coveragePercent >= 100)
  const totalGap = active.reduce((s, r) => s + r.shortfall, 0)

  // Monthly premium from selected recommendations
  const monthlyPremium = (prot.recommendations ?? [])
    .filter(r => r.isSelected)
    .reduce((s, r) => s + (Number(r.monthly || r.premium) || 0), 0)

  if (allFunded) {
    return {
      type: 'protection', severity: 'ok',
      message: 'All protection gaps closed',
      detail: monthlyPremium > 0 ? `Premium: RM ${Math.round(monthlyPremium).toLocaleString()}/mo` : '',
      monthlyPremium,
      summary,
    }
  }

  // "Worst" = most severe risk band (death/TPD > ACI > ECI at equal %), tie-broken
  // by lowest coverage % — not just whichever risk happens to have the lowest number.
  const scored = active.map(s => ({ ...s, sev: riskSeverity(s.risk, s.coveragePercent) }))
  const worst = scored.reduce((w, s) => {
    if (SEVERITY_ORDER[s.sev] < SEVERITY_ORDER[w.sev]) return s
    if (SEVERITY_ORDER[s.sev] === SEVERITY_ORDER[w.sev] && s.coveragePercent < w.coveragePercent) return s
    return w
  })

  return {
    type: 'protection',
    severity: worst.sev,
    message: `${worst.label} at ${worst.coveragePercent}% — ${active.filter(s => s.shortfall > 0).length} of ${active.length} risks with gaps`,
    detail: totalGap > 0 ? `Total gap ${fmtK(totalGap)}` : '',
    shortfall: totalGap,
    worst,
    monthlyPremium,
    summary,
  }
}

// ─── Retirement Priority ─────────────────────────────────────────────────────
function retirementFlag(contact) {
  const plan = contact?.retirementPlan
  const currentAge = getAge(contact?.dob) || 30

  if (!plan) {
    return {
      type: 'retirement', severity: 'warning',
      message: 'No retirement plan',
      detail: 'Run Retirement Planner',
    }
  }

  const proj = generateRetirementProjection({ ...plan, currentAge })
  const pct = Math.round(proj.coveragePercent)
  const yearsToRetirement = (plan.retirementAge ?? 55) - currentAge

  // Monthly from selected recommendations
  const monthlyRec = (plan.recommendations ?? [])
    .filter(r => r.isSelected !== false)
    .reduce((s, r) => s + (Number(r.monthly) || 0), 0)

  if (proj.isFullyFunded) {
    return {
      type: 'retirement', severity: 'ok',
      message: `Retirement ${pct}% funded`,
      detail: `Funds last to ${proj.fundsRunOutWithRec ?? plan.lifeExpectancy}`,
      coveragePercent: pct,
      yearsToRetirement,
      monthlyRec,
      projection: proj,
    }
  }

  const severity = retirementSeverity({
    pct,
    yearsToRetirement,
    fundsRunOutWithRec: proj.fundsRunOutWithRec,
    lifeExpectancy: plan.lifeExpectancy,
  })

  return {
    type: 'retirement',
    severity,
    message: `Retirement ${pct}% funded`,
    detail: proj.fundsRunOutAge < (plan.lifeExpectancy ?? 100)
      ? `Funds run out at ${proj.fundsRunOutAge} — shortfall ${fmtK(proj.shortfall)}`
      : `Shortfall ${fmtK(proj.shortfall)}`,
    shortfall: proj.shortfall,
    coveragePercent: pct,
    yearsToRetirement,
    monthlyRec,
    projection: proj,
  }
}

// ─── Cash Flow Priority ──────────────────────────────────────────────────────
function cashFlowFlag(contact) {
  const fin = contact?.financials
  const prot = contact?.protectionPlan
  const plan = contact?.retirementPlan

  if (!fin) return null

  const income = (fin.income || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  if (income === 0) return null

  const expenses = (fin.expenses || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const loanRepayments = (fin.liabilities || []).reduce((s, l) => {
    const P = Number(l.principal) || 0
    const r = (Number(l.interestRate) || 0) / 100 / 12
    const n = Number(l.loanPeriod) || 1
    if (P === 0) return s
    const pmt = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
    return s + pmt
  }, 0)
  const surplus = income - expenses - loanRepayments

  const protMonthly = (prot?.recommendations ?? [])
    .filter(r => r.isSelected)
    .reduce((s, r) => s + (Number(r.monthly || r.premium) || 0), 0)
  const retMonthly = (plan?.recommendations ?? [])
    .filter(r => r.isSelected !== false)
    .reduce((s, r) => s + (Number(r.monthly) || 0), 0)
  const totalLinked = protMonthly + retMonthly
  const afterPlans = surplus - totalLinked

  const severity = cashFlowSeverity({ afterPlans, totalLinked, income })

  return {
    type: 'cashflow',
    severity,
    message: afterPlans >= 0
      ? `RM ${Math.round(afterPlans).toLocaleString()}/mo surplus after all plans`
      : `RM ${Math.round(-afterPlans).toLocaleString()}/mo deficit`,
    detail: totalLinked > 0 ? `Linked plans: RM ${Math.round(totalLinked).toLocaleString()}/mo` : 'No linked plans yet',
    surplus: afterPlans,
    grossSurplus: surplus,
    totalLinked,
    income,
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all advisory flags for a contact, sorted by severity.
 */
export function computePriorities(contact) {
  const flags = [
    protectionFlag(contact),
    retirementFlag(contact),
    cashFlowFlag(contact),
  ].filter(Boolean)

  return flags.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
}

/**
 * Returns the single most urgent flag — use for dashboard callouts.
 */
export function getTopPriority(contact) {
  return computePriorities(contact)[0] ?? null
}
