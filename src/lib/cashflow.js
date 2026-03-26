const ANNUAL_MULTIPLIER = {
  Monthly: 12,
  Yearly: 1,
  Quarterly: 4,
  'Semi-annually': 2,
  'One-Time': 0,
  'Lump Sum': 0,
}

export function toAnnual(amount, frequency) {
  return (Number(amount) || 0) * (ANNUAL_MULTIPLIER[frequency] ?? 12)
}

export function formatRMCompact(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '—'
  const numeric = Number(value)
  const abs = Math.abs(numeric)
  const text =
    abs >= 1_000_000
      ? `RM ${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
        ? `RM ${(abs / 1_000).toFixed(0)}K`
        : `RM ${abs.toFixed(0)}`
  return numeric < 0 ? `−${text}` : text
}

export function formatAxisLabel(value) {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`
  return `RM ${value}`
}

export function projectCashFlow({
  annualIncome,
  annualExpenses,
  initialSavings,
  initialEpf,
  currentAge,
  expectedAge,
  retirementAge,
  inflationRate,
  savingsRate,
  epfDividendRate,
  goals,
  scenarios,
}) {
  const rows = []
  let pool = Number(initialSavings) || 0
  let epfLocked = Number(initialEpf) || 0
  const inflation = (Number(inflationRate) || 0) / 100
  const savingsGrowth = (Number(savingsRate) || 0) / 100
  const epfGrowth = (Number(epfDividendRate) || 0) / 100

  const ciScenario = scenarios.find((item) => item.id === 'ci' && item.active)
  const disabilityScenario = scenarios.find((item) => item.id === 'disability' && item.active)
  const deathScenario = scenarios.find((item) => item.id === 'death' && item.active)

  for (let age = currentAge; age <= expectedAge; age += 1) {
    const yearIndex = age - currentAge
    const retired = age >= retirementAge
    const ciOff = ciScenario && age >= ciScenario.age && age < ciScenario.age + (ciScenario.duration ?? 3)
    const disabilityOff = disabilityScenario && age >= disabilityScenario.age
    const deathOff = deathScenario && age >= deathScenario.age
    const activeIncome = retired || ciOff || disabilityOff || deathOff ? 0 : annualIncome
    const goalLumpSum = goals
      .filter((goal) => goal.active && goal.age === age)
      .reduce((sum, goal) => sum + (Number(goal.amount) || 0), 0)
    const inflatedExpenses = annualExpenses * Math.pow(1 + inflation, yearIndex) + goalLumpSum

    let takeHomeIncomeUsed = 0
    let cashUsed = 0
    let shortfall = 0

    const surplus = activeIncome - inflatedExpenses
    if (surplus >= 0) {
      takeHomeIncomeUsed = inflatedExpenses
      pool = pool * (1 + savingsGrowth) + surplus
    } else {
      takeHomeIncomeUsed = activeIncome
      const deficit = inflatedExpenses - activeIncome
      if (pool >= deficit) {
        cashUsed = deficit
        pool = pool * (1 + savingsGrowth) - deficit
      } else {
        cashUsed = pool
        shortfall = deficit - pool
        pool = 0
      }
    }

    if (epfLocked > 0) epfLocked *= 1 + epfGrowth

    rows.push({
      age,
      takeHomeIncomeUsed: Math.round(takeHomeIncomeUsed),
      cashUsed: Math.round(cashUsed),
      shortfall: Math.round(shortfall),
      cashSavingsEOY: Math.round(pool),
    })
  }

  return rows
}

export function summarizeShortfall(chartData) {
  const shortfallYears = chartData.filter((row) => row.shortfall > 0)
  if (!shortfallYears.length) return null
  return {
    total: shortfallYears.reduce((sum, row) => sum + row.shortfall, 0),
    start: shortfallYears[0].age,
    end: shortfallYears[shortfallYears.length - 1].age,
  }
}

export function getCashFlowMilestones(chartData, ages = [55, 60, 65]) {
  return ages.map((age) => {
    const row = chartData.find((item) => item.age === age)
    return {
      age,
      cashSavingsEOY: row?.cashSavingsEOY ?? 0,
      shortfall: row?.shortfall ?? 0,
      status: row?.shortfall > 0 ? 'shortfall' : row?.cashSavingsEOY > 0 ? 'funded' : 'tight',
    }
  })
}

export function buildInsurancePlans(financials) {
  return (Array.isArray(financials?.insurance) ? financials.insurance : []).map((policy) => ({
    id: policy.id,
    name: policy.name || 'Policy',
    type: policy.type || '',
    insurer: policy.insurer || '',
    policyNo: policy.policyNumber || '',
  }))
}

export function buildCashFlowRecommendations({ financials, scenarios, shortfallSummary, t }) {
  const policies = Array.isArray(financials?.insurance) ? financials.insurance : []
  const hasPolicy = (...keywords) =>
    policies.some((policy) =>
      keywords.some((keyword) => {
        const target = keyword.toLowerCase()
        return (policy.type ?? '').toLowerCase().includes(target) || (policy.name ?? '').toLowerCase().includes(target)
      })
    )

  const ciActive = scenarios.find((item) => item.id === 'ci' && item.active)
  const disabilityActive = scenarios.find((item) => item.id === 'disability' && item.active)
  const deathActive = scenarios.find((item) => item.id === 'death' && item.active)
  const hasShortfall = Boolean(shortfallSummary)
  const recommendations = []

  if (!hasPolicy('critical', 'ci')) {
    const triggered = ciActive && hasShortfall
    recommendations.push({
      id: 'ci',
      label: t ? t('cashflow.recCi') : 'Critical Illness cover',
      desc: triggered
        ? `Scenario shows ${formatRMCompact(shortfallSummary?.total)} shortfall over ${ciActive?.duration ?? 3} years of recovery.`
        : (t ? t('cashflow.recCiDesc') : 'Use a CI payout to protect income during recovery.'),
      priority: Boolean(triggered),
    })
  }

  if (!hasPolicy('disability', 'tpd', 'income protection')) {
    const triggered = disabilityActive && hasShortfall
    recommendations.push({
      id: 'tpd',
      label: t ? t('cashflow.recTpd') : 'TPD or income protection',
      desc: triggered
        ? `Disability scenario creates ${formatRMCompact(shortfallSummary?.total)} cumulative shortfall.`
        : (t ? t('cashflow.recTpdDesc') : 'Use lump sum or income replacement for long-term disability.'),
      priority: Boolean(triggered),
    })
  }

  if (!hasPolicy('life', 'term', 'death', 'whole life', 'wholelife')) {
    const triggered = deathActive && hasShortfall
    recommendations.push({
      id: 'life',
      label: t ? t('cashflow.recLife') : 'Life cover',
      desc: triggered
        ? `Death scenario leaves ${formatRMCompact(shortfallSummary?.total)} family shortfall.`
        : (t ? t('cashflow.recLifeDesc') : 'Use life cover to protect dependants and liabilities.'),
      priority: Boolean(triggered),
    })
  }

  if (!hasPolicy('hospital', 'medical', 'h&s', 'surgical')) {
    recommendations.push({
      id: 'medical',
      label: t ? t('cashflow.recHospital') : 'Hospital and surgical cover',
      desc: t ? t('cashflow.recHospitalDesc') : 'Medical cover reduces cash drain from hospital bills.',
      priority: false,
    })
  }

  return recommendations.sort((a, b) => Number(b.priority) - Number(a.priority))
}
