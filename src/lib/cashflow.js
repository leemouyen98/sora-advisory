// toAnnual/toMonthly/calcMonthlyRepayment now live in lib/calculations.js —
// this used to be one of six independent copies of the same frequency table.
// Re-exported here so existing imports (`from '../../lib/cashflow'`) keep working.
export { toAnnual, toMonthly, calcMonthlyRepayment } from './calculations'
import { calcMonthlyRepayment } from './calculations'

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
  annualPassiveIncome,
  annualEmploymentIncome,
  annualLivingExpenses,          // base lifestyle costs only — inflates every year
  liabilities = [],              // [{ principal, interestRate, loanPeriod (months), startAge }] — fixed installments, do NOT inflate, and drop off once the term ends
  linkedPremiumsMonthly = 0,     // protection + retirement premiums already selected — fixed, non-inflating (see computeLinkedPlanPremiums in lib/calculations.js)
  initialSavings,
  initialEpf,
  initialInvestments = 0,        // sum of investments[].currentValue — no recurring contribution field exists in the data model, so this compounds as a lump sum only
  investmentGrowthRate = 0,      // value-weighted average of investments[].growthRate
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
  let epfBalance = Number(initialEpf) || 0
  let invPool = Number(initialInvestments) || 0
  const inflation = (Number(inflationRate) || 0) / 100
  const savingsGrowth = (Number(savingsRate) || 0) / 100
  const epfGrowth = (Number(epfDividendRate) || 0) / 100
  const investmentGrowth = (Number(investmentGrowthRate) || 0) / 100
  const annualLinkedPremiums = (Number(linkedPremiumsMonthly) || 0) * 12

  const ciScenario = scenarios.find((item) => item.id === 'ci' && item.active)
  const disabilityScenario = scenarios.find((item) => item.id === 'disability' && item.active)
  const deathScenario = scenarios.find((item) => item.id === 'death' && item.active)

  for (let age = currentAge; age <= expectedAge; age += 1) {
    const yearIndex = age - currentAge
    const retired = age >= retirementAge
    const ciOff = ciScenario && age >= ciScenario.age && age < ciScenario.age + (ciScenario.duration ?? 3)
    const disabilityOff = disabilityScenario && age >= disabilityScenario.age
    const deathOff = deathScenario && age >= deathScenario.age
    const employmentStopped = retired || ciOff || disabilityOff || deathOff

    // Passive income (rental, dividends, business, etc.) flows in regardless of scenarios
    const activePassiveIncome = annualPassiveIncome
    // Employment income stops when retired or a scenario is triggered
    const activeEmploymentIncome = employmentStopped ? 0 : annualEmploymentIncome

    const goalLumpSum = goals
      .filter((goal) => goal.active && goal.age === age)
      .reduce((sum, goal) => sum + (Number(goal.amount) || 0), 0)

    // Loan repayments: fixed installment amounts, only charged while the loan
    // is actually active (startAge <= age < startAge + term). Unlike lifestyle
    // expenses, a fixed-rate installment does not inflate — and it must drop
    // out of the projection once the loan matures, not run through to expectedAge.
    const activeLoanRepayments = liabilities.reduce((sum, l) => {
      const start = Number(l.startAge) ?? currentAge
      const termYears = Math.ceil((Number(l.loanPeriod) || 0) / 12)
      if (termYears <= 0 || age < start || age >= start + termYears) return sum
      return sum + calcMonthlyRepayment(l.principal, l.interestRate, l.loanPeriod) * 12
    }, 0)

    const inflatedLivingExpenses = annualLivingExpenses * Math.pow(1 + inflation, yearIndex)
    const inflatedExpenses = inflatedLivingExpenses + activeLoanRepayments + annualLinkedPremiums + goalLumpSum

    let passiveIncomeUsed = 0
    let takeHomeIncomeUsed = 0
    let cashUsed = 0
    let investmentsUsed = 0
    let shortfall = 0
    let remaining = inflatedExpenses

    // Step 1: passive income (rental, business, dividends, etc.)
    const fromPassive = Math.min(activePassiveIncome, remaining)
    passiveIncomeUsed = fromPassive
    remaining -= fromPassive

    // Step 2: take-home / employment income
    const fromEmployment = Math.min(activeEmploymentIncome, remaining)
    takeHomeIncomeUsed = fromEmployment
    remaining -= fromEmployment

    // Surplus income goes to cash savings
    const incomeSurplus = (activePassiveIncome - fromPassive) + (activeEmploymentIncome - fromEmployment)
    pool = pool * (1 + savingsGrowth) + incomeSurplus

    // Investments compound as a lump sum (no recurring contribution field exists yet)
    if (invPool > 0) invPool *= (1 + investmentGrowth)

    // Step 3: cash savings drawdown
    if (remaining > 0) {
      const fromCash = Math.min(pool, remaining)
      cashUsed = fromCash
      pool -= fromCash
      remaining -= fromCash
    }

    // Step 3b: investment drawdown — after cash, before declaring a shortfall
    if (remaining > 0) {
      const fromInv = Math.min(invPool, remaining)
      investmentsUsed = fromInv
      invPool -= fromInv
      remaining -= fromInv
    }

    // Step 4: shortfall (EPF not drawn — managed in the Retirement Planner)
    shortfall = remaining

    // EPF compounds as an investment
    if (epfBalance > 0) epfBalance *= (1 + epfGrowth)

    rows.push({
      age,
      takeHomeIncomeUsed: Math.round(takeHomeIncomeUsed),
      cashUsed: Math.round(cashUsed),
      investmentsUsed: Math.round(investmentsUsed),
      passiveIncomeUsed: Math.round(passiveIncomeUsed),
      shortfall: Math.round(shortfall),
      cashSavingsEOY: Math.round(pool),
      investmentsEOY: Math.round(invPool),
      epfEOY: Math.round(epfBalance),
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

// Milestone ages default to the plan's own retirementAge (+5/+10) instead of a
// hardcoded [55, 60, 65] that ignored whatever retirement age the advisor set.
export function getCashFlowMilestones(chartData, retirementAge = 55, ages = null) {
  const milestoneAges = ages ?? [retirementAge, retirementAge + 5, retirementAge + 10]
  return milestoneAges.map((age) => {
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
