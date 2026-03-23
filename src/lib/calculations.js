/**
 * GoalsMapping — Financial Calculation Engine
 * All calculations are pure functions. No side effects. Fully testable.
 */

// ─── Currency & Format Helpers ───────────────────────────────────────────────

export function formatRM(amount) {
  if (amount == null || isNaN(amount)) return 'RM 0'
  const abs = Math.abs(amount)
  const formatted = abs >= 1_000_000
    ? `RM ${(abs / 1_000_000).toFixed(2)}M`
    : abs.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return `${amount < 0 ? '-' : ''}RM ${abs >= 1_000_000 ? formatted.replace('RM ', '') : formatted}`
}

export function formatRMFull(amount) {
  if (amount == null || isNaN(amount)) return 'RM 0'
  return `RM ${Math.round(amount).toLocaleString('en-MY')}`
}

export function formatPercent(val) {
  return `${Number(val).toFixed(1)}%`
}

// ─── Core TVM (Time Value of Money) ──────────────────────────────────────────

/**
 * Future Value of a lump sum
 */
export function fvLumpSum(pv, rate, years) {
  return pv * Math.pow(1 + rate / 100, years)
}

/**
 * Future Value of regular contributions (annuity)
 * frequency: 1=yearly, 2=semi-annually, 4=quarterly, 12=monthly
 */
export function fvAnnuity(pmt, rate, years, frequency = 12) {
  const r = rate / 100 / frequency
  const n = years * frequency
  if (r === 0) return pmt * n
  return pmt * ((Math.pow(1 + r, n) - 1) / r)
}

/**
 * Present Value of a future sum
 */
export function pvLumpSum(fv, rate, years) {
  return fv / Math.pow(1 + rate / 100, years)
}

/**
 * TVM Solver — solve for any variable
 * Inputs: { fv, pv, pmt, rate (annual %), n (years), frequency }
 * Solve for: 'fv' | 'pmt' | 'rate' | 'pv'
 */
export function tvmSolve(params, solveFor) {
  const freq = params.frequency || 12
  const r = (params.rate || 0) / 100 / freq
  const n = (params.n || 0) * freq
  const pv = params.pv || 0
  const pmt = params.pmt || 0
  const fv = params.fv || 0

  switch (solveFor) {
    case 'fv': {
      const fvPv = pv * Math.pow(1 + r, n)
      const fvPmt = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
      return fvPv + fvPmt
    }
    case 'pmt': {
      const target = fv - pv * Math.pow(1 + r, n)
      if (r === 0) return n === 0 ? 0 : target / n
      return target / ((Math.pow(1 + r, n) - 1) / r)
    }
    case 'pv': {
      const fvPmt = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
      const target = fv - fvPmt
      return target / Math.pow(1 + r, n)
    }
    case 'rate': {
      // Newton-Raphson for rate
      let guess = 5 // 5% annual
      for (let i = 0; i < 100; i++) {
        const rg = guess / 100 / freq
        const ng = n
        const fvCalc = pv * Math.pow(1 + rg, ng) + (rg === 0 ? pmt * ng : pmt * ((Math.pow(1 + rg, ng) - 1) / rg))
        const diff = fvCalc - fv
        if (Math.abs(diff) < 0.01) break
        // Numerical derivative
        const rg2 = (guess + 0.01) / 100 / freq
        const fvCalc2 = pv * Math.pow(1 + rg2, ng) + (rg2 === 0 ? pmt * ng : pmt * ((Math.pow(1 + rg2, ng) - 1) / rg2))
        const deriv = (fvCalc2 - fvCalc) / 0.01
        if (deriv === 0) break
        guess = guess - diff / deriv
      }
      return Math.max(0, guess)
    }
    default:
      return 0
  }
}

// ─── EPF Projection ──────────────────────────────────────────────────────────

/**
 * Project EPF balance year by year until retirement
 * Assumes 24% of annual income (11% employee + 13% employer)
 */
export function projectEPF({ currentBalance, growthRate, annualIncome, incomeGrowthRate, currentAge, retirementAge }) {
  const epfRate = 0.24
  const years = Math.max(0, retirementAge - currentAge)
  const yearlyData = []
  let balance = currentBalance || 0
  let income = annualIncome || 0

  for (let y = 0; y <= years; y++) {
    yearlyData.push({
      age: currentAge + y,
      year: y,
      balance: Math.round(balance),
      contribution: y === 0 ? 0 : Math.round(income * epfRate),
    })
    if (y < years) {
      const contribution = income * epfRate
      balance = (balance + contribution) * (1 + (growthRate || 6) / 100)
      income = income * (1 + (incomeGrowthRate || 0) / 100)
    }
  }

  return {
    finalBalance: Math.round(balance),
    yearlyData,
  }
}

// ─── Retirement Projection ───────────────────────────────────────────────────

function getFrequencyMultiplier(freq) {
  switch (freq) {
    case 'Monthly': return 12
    case 'Quarterly': return 4
    case 'Semi-annually': return 2
    case 'Yearly': return 1
    case 'One-Time': return 0
    default: return 12
  }
}

/**
 * Project a single provision's value at retirement
 */
export function projectProvision(provision, yearsToRetirement) {
  const { amount, frequency, preRetirementReturn: rate = 1 } = provision
  if (frequency === 'One-Time') {
    return fvLumpSum(amount, rate, yearsToRetirement)
  }
  const freq = getFrequencyMultiplier(frequency)
  return fvAnnuity(amount, rate, yearsToRetirement, freq)
}

/**
 * Calculate total retirement corpus needed
 * Monthly expenses at retirement (inflation-adjusted), sustained for retirement duration
 * Using PV of annuity at post-retirement return rate
 */
export function retirementCorpusNeeded({ monthlyExpenses, inflationRate, postRetirementReturn, yearsToRetirement, retirementDuration }) {
  // Monthly expenses at retirement (future value)
  const monthlyAtRetirement = monthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement)

  // Corpus needed: PV of inflation-adjusted annuity during retirement
  // Using real rate = post-retirement return - inflation
  const realRate = (postRetirementReturn - inflationRate) / 100 / 12
  const months = retirementDuration * 12

  let corpus
  if (Math.abs(realRate) < 0.0001) {
    corpus = monthlyAtRetirement * months
  } else {
    corpus = monthlyAtRetirement * (1 - Math.pow(1 + realRate, -months)) / realRate
  }

  return {
    corpus: Math.round(corpus),
    monthlyAtRetirement: Math.round(monthlyAtRetirement),
  }
}

/**
 * Generate full year-by-year retirement projection
 * Returns data for the interactive chart
 */
export function generateRetirementProjection({
  currentAge,
  retirementAge,
  lifeExpectancy,
  monthlyExpenses,
  inflationRate,
  postRetirementReturn,
  includeEPF,
  epfBalance,
  epfGrowthRate,
  annualIncome,
  incomeGrowthRate,
  provisions,
  recommendations,
}) {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const retirementDuration = Math.max(0, lifeExpectancy - retirementAge)

  // 1. Target corpus
  const { corpus: targetAmount, monthlyAtRetirement } = retirementCorpusNeeded({
    monthlyExpenses: monthlyExpenses || 0,
    inflationRate: inflationRate ?? 4,
    postRetirementReturn: postRetirementReturn ?? 1,
    yearsToRetirement,
    retirementDuration,
  })

  // 2. EPF projection
  let epfProjection = null
  let epfAtRetirement = 0
  if (includeEPF && epfBalance > 0) {
    epfProjection = projectEPF({
      currentBalance: epfBalance,
      growthRate: epfGrowthRate,
      annualIncome,
      incomeGrowthRate,
      currentAge,
      retirementAge, // use user-defined retirement age for EPF projection
    })
    epfAtRetirement = epfProjection.finalBalance
  }

  // 3. Provisions at retirement
  let provisionsAtRetirement = 0
  const provisionDetails = (provisions || []).map((p) => {
    const val = Math.round(projectProvision(p, yearsToRetirement))
    provisionsAtRetirement += val
    return { ...p, projectedValue: val }
  })

  // 4. Recommendations at retirement
  let recommendationsAtRetirement = 0
  const selectedRecs = (recommendations || []).filter((r) => r.isSelected)
  selectedRecs.forEach((r) => {
    if (r.type === 'custom') {
      recommendationsAtRetirement += r.futureValue || 0
    } else {
      // Preset recommendation
      const fv = tvmSolve({
        pv: r.lumpSum || 0,
        pmt: r.monthlyAmount || 0,
        rate: r.growthRate || 5,
        n: r.periodYears || 10,
        frequency: 12,
      }, 'fv')
      recommendationsAtRetirement += Math.round(fv)
    }
  })

  // 5. Total covered
  const totalCovered = epfAtRetirement + provisionsAtRetirement + recommendationsAtRetirement
  const shortfall = targetAmount - totalCovered
  const coveragePercent = targetAmount > 0 ? Math.min(100, Math.round((totalCovered / targetAmount) * 100)) : 0

  // 6. Year-by-year projection for chart
  // We track each bucket separately through accumulation AND drawdown.
  // During drawdown: each bucket grows at postRetirementReturn, then
  // expenses are deducted proportionally across all buckets.
  const chartData = []
  let epfBal = epfBalance || 0
  let epfIncome = annualIncome || 0

  // Provisions: start with lump-sum amounts only; recurring contributions added each year
  let provBal = (provisions || []).reduce(
    (sum, p) => sum + (p.frequency === 'One-Time' ? p.amount : 0), 0
  )

  let recBal = 0

  // Also compute a "without recommendations" version to find fundsRunOutAge baseline
  let epfBalNoRec = epfBal
  let epfIncomeNoRec = annualIncome || 0
  let provBalNoRec = provBal

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yearIdx = age - currentAge
    const isPreRetirement = age < retirementAge
    const isRetirementYear = age === retirementAge

    if (isPreRetirement) {
      // ── Accumulation Phase ──

      // EPF: contributions until retirement age, then grows at EPF rate until retirement
      if (includeEPF) {
        if (age < retirementAge) {
          const contribution = epfIncome * 0.24
          epfBal = (epfBal + contribution) * (1 + (epfGrowthRate || 6) / 100)
          epfIncome *= (1 + (incomeGrowthRate || 0) / 100)
          // Mirror for no-rec scenario
          const contribNoRec = epfIncomeNoRec * 0.24
          epfBalNoRec = (epfBalNoRec + contribNoRec) * (1 + (epfGrowthRate || 6) / 100)
          epfIncomeNoRec *= (1 + (incomeGrowthRate || 0) / 100)
        } else {
          // After retirement age, parked at post-retirement return
          epfBal *= (1 + postRetirementReturn / 100)
          epfBalNoRec *= (1 + postRetirementReturn / 100)
        }
      }

      // Provisions: add recurring contributions, then grow
      let provContrib = 0
      ;(provisions || []).forEach((p) => {
        if (p.frequency !== 'One-Time') {
          provContrib += p.amount * getFrequencyMultiplier(p.frequency)
        }
      })
      // Use weighted average return across provisions, fallback to 1%
      const avgProvReturn = (provisions || []).length > 0
        ? provisions.reduce((s, p) => s + (p.preRetirementReturn || 1), 0) / provisions.length
        : 1
      provBal = (provBal + provContrib) * (1 + avgProvReturn / 100)
      provBalNoRec = (provBalNoRec + provContrib) * (1 + avgProvReturn / 100)

      // Recommendations: contributions during their respective periods
      let recContrib = 0
      selectedRecs.forEach((r) => {
        const period = r.periodYears || 10
        if (yearIdx < period) {
          recContrib += (r.monthlyAmount || 0) * 12
        }
        if (yearIdx === 0) {
          recContrib += r.lumpSum || 0
        }
      })
      // Use weighted average growth rate, fallback to 5%
      const avgRecRate = selectedRecs.length > 0
        ? selectedRecs.reduce((s, r) => s + (r.growthRate || 5), 0) / selectedRecs.length
        : 5
      recBal = (recBal + recContrib) * (1 + avgRecRate / 100)

    } else if (isRetirementYear) {
      // ── Retirement Year Snapshot ──
      // The person just retired. Balances are at their peak — no new contributions,
      // no deductions yet. Just a final growth tick so the peak lands exactly at retirementAge.
      const avgRecRate = selectedRecs.length > 0
        ? selectedRecs.reduce((s, r) => s + (r.growthRate || 5), 0) / selectedRecs.length
        : 5
      const avgProvReturn = (provisions || []).length > 0
        ? provisions.reduce((s, p) => s + (p.preRetirementReturn || 1), 0) / provisions.length
        : 1
      if (includeEPF) {
        epfBal *= (1 + postRetirementReturn / 100)
        epfBalNoRec *= (1 + postRetirementReturn / 100)
      }
      provBal *= (1 + avgProvReturn / 100)
      provBalNoRec *= (1 + avgProvReturn / 100)
      recBal *= (1 + avgRecRate / 100)

    } else {
      // ── Drawdown Phase (age > retirementAge) ──
      // Annual expense = monthly expense at retirement, inflated further each year into retirement
      const yearsIntoRetirement = age - retirementAge
      const annualExpense = monthlyAtRetirement * 12 *
        Math.pow(1 + inflationRate / 100, yearsIntoRetirement)

      // Step 1: All buckets grow at post-retirement return
      epfBal *= (1 + postRetirementReturn / 100)
      provBal *= (1 + postRetirementReturn / 100)
      recBal *= (1 + postRetirementReturn / 100)
      epfBalNoRec *= (1 + postRetirementReturn / 100)
      provBalNoRec *= (1 + postRetirementReturn / 100)

      // Step 2: Deduct expenses proportionally across buckets
      const totalBeforeExpense = epfBal + provBal + recBal
      if (totalBeforeExpense > 0) {
        const expenseRatio = Math.min(1, annualExpense / totalBeforeExpense)
        epfBal -= epfBal * expenseRatio
        provBal -= provBal * expenseRatio
        recBal -= recBal * expenseRatio
      } else {
        // Fund exhausted
        epfBal = 0
        provBal = 0
        recBal = 0
      }

      // No-rec scenario drawdown
      const totalNoRec = epfBalNoRec + provBalNoRec
      if (totalNoRec > 0) {
        const ratioNoRec = Math.min(1, annualExpense / totalNoRec)
        epfBalNoRec -= epfBalNoRec * ratioNoRec
        provBalNoRec -= provBalNoRec * ratioNoRec
      } else {
        epfBalNoRec = 0
        provBalNoRec = 0
      }

      // Floor at zero
      epfBal = Math.max(0, epfBal)
      provBal = Math.max(0, provBal)
      recBal = Math.max(0, recBal)
      epfBalNoRec = Math.max(0, epfBalNoRec)
      provBalNoRec = Math.max(0, provBalNoRec)
    }

    const totalFund = epfBal + provBal + recBal
    const totalNoRecFund = epfBalNoRec + provBalNoRec

    // Compute the "ideal corpus curve": at retirement it equals targetAmount,
    // then it depletes at the same rate as expenses (the drawdown schedule).
    // This gives us a reference to calculate shortfall area visually.
    let idealCorpus = 0
    if (age < retirementAge) {
      // Pre-retirement: scale linearly up to target (simplified growth curve)
      idealCorpus = targetAmount * (yearIdx / Math.max(1, yearsToRetirement))
    } else if (age === retirementAge) {
      idealCorpus = targetAmount
    } else {
      // Post-retirement: corpus that would sustain expenses from this age onward
      const remainingYears = lifeExpectancy - age
      const remainingMonths = remainingYears * 12
      const realRate = (postRetirementReturn - inflationRate) / 100 / 12
      const yearsIntoRet = age - retirementAge
      const monthlyNow = monthlyAtRetirement * Math.pow(1 + inflationRate / 100, yearsIntoRet)
      if (Math.abs(realRate) < 0.0001) {
        idealCorpus = monthlyNow * remainingMonths
      } else {
        idealCorpus = monthlyNow * (1 - Math.pow(1 + realRate, -remainingMonths)) / realRate
      }
    }

    // Shortfall = how much of the ideal corpus is NOT covered by the fund
    const shortfallVal = Math.max(0, idealCorpus - totalFund)

    // Guard against NaN/Infinity — Recharts crashes on non-finite SVG values
    const safe = (v) => (Number.isFinite(v) ? Math.round(v) : 0)

    chartData.push({
      age,
      epf: safe(epfBal),
      provisions: safe(provBal),
      recommendations: safe(recBal),
      shortfall: safe(shortfallVal),
      total: safe(totalFund),
      totalNoRec: safe(totalNoRecFund),
      idealCorpus: safe(idealCorpus),
    })
  }

  // Find when funds run out (without recommendations)
  const fundsRunOutAge = chartData.find(
    (d) => d.age > retirementAge && d.totalNoRec <= 0
  )?.age || lifeExpectancy

  // Find when funds run out WITH recommendations
  const fundsRunOutWithRec = chartData.find(
    (d) => d.age > retirementAge && d.total <= 0
  )?.age || lifeExpectancy

  // Guard all numeric outputs
  const safeNum = (v) => (Number.isFinite(v) ? v : 0)

  return {
    targetAmount: safeNum(targetAmount),
    totalCovered: safeNum(totalCovered),
    shortfall: Math.max(0, safeNum(shortfall)),
    surplus: shortfall < 0 ? Math.abs(safeNum(shortfall)) : 0,
    coveragePercent: safeNum(coveragePercent),
    monthlyAtRetirement: safeNum(monthlyAtRetirement),
    epfAtRetirement: safeNum(epfAtRetirement),
    provisionsAtRetirement: safeNum(provisionsAtRetirement),
    recommendationsAtRetirement: safeNum(recommendationsAtRetirement),
    provisionDetails,
    fundsRunOutAge: Math.min(safeNum(fundsRunOutAge) || lifeExpectancy, lifeExpectancy),
    fundsRunOutWithRec: Math.min(safeNum(fundsRunOutWithRec) || lifeExpectancy, lifeExpectancy),
    isFullyFunded: totalCovered >= targetAmount,
    chartData,
    yearsToRetirement: safeNum(yearsToRetirement),
    retirementDuration: safeNum(retirementDuration),
  }
}

// ─── Protection Calculations ─────────────────────────────────────────────────

/**
 * Calculate protection need for a single risk
 * Need = Lump Sum + PV of monthly expenses for the period (inflation + return adjusted)
 */
export function protectionNeed({ lumpSum, monthlyExpenses, period, inflationRate, returnRate }) {
  if (!monthlyExpenses || !period) return lumpSum || 0

  // PV of inflation-adjusted annuity
  const realRate = (returnRate - inflationRate) / 100 / 12
  const months = period * 12
  let pvExpenses

  if (Math.abs(realRate) < 0.0001) {
    pvExpenses = monthlyExpenses * months
  } else {
    pvExpenses = monthlyExpenses * (1 - Math.pow(1 + realRate, -months)) / realRate
  }

  return Math.round((lumpSum || 0) + pvExpenses)
}

/**
 * Generate protection summary for all 4 risks
 */
export function generateProtectionSummary({
  needs, // { death, tpd, aci, eci } each with { lumpSum, monthly, period }
  existing, // { death, tpd, aci, eci } amounts
  inflationRate,
  returnRate,
  recommendations, // array of { riskType, coverageAmount, isSelected }
}) {
  const risks = ['death', 'tpd', 'aci', 'eci']
  const labels = { death: 'Death', tpd: 'TPD', aci: 'Advanced Stage CI', eci: 'Early Stage CI' }

  return risks.map((risk) => {
    const need = protectionNeed({
      lumpSum: needs[risk]?.lumpSum || 0,
      monthlyExpenses: needs[risk]?.monthly || 0,
      period: needs[risk]?.period || 0,
      inflationRate,
      returnRate,
    })

    const existingCoverage = existing[risk] || 0
    const recCoverage = (recommendations || [])
      .filter((r) => r.riskType === risk && r.isSelected)
      .reduce((sum, r) => sum + (r.coverageAmount || 0), 0)

    const totalCovered = existingCoverage + recCoverage
    const gap = need - totalCovered

    return {
      risk,
      label: labels[risk],
      targetCoverage: need,
      existingCoverage,
      recommendedCoverage: recCoverage,
      totalCovered,
      shortfall: Math.max(0, gap),
      surplus: gap < 0 ? Math.abs(gap) : 0,
      coveragePercent: need > 0 ? Math.min(100, Math.round((totalCovered / need) * 100)) : 100,
    }
  })
}

// ─── Calculation Breakdown (the "hidden Excel") ──────────────────────────────

/**
 * Generate year-by-year investment growth breakdown
 * This is what shows when user clicks "Show Calculation Breakdown"
 */
export function generateBreakdown({ lumpSum = 0, monthly = 0, rate = 5, years = 10, startAge = 28 }) {
  const rows = []
  let accumulated = lumpSum
  let totalInvested = lumpSum

  for (let y = 0; y < years; y++) {
    const annualContribution = monthly * 12
    const yearStart = accumulated
    accumulated = (accumulated + annualContribution) * (1 + rate / 100)
    totalInvested += annualContribution

    rows.push({
      age: startAge + y,
      year: y + 1,
      payment: Math.round(annualContribution),
      accumulatedCapital: Math.round(totalInvested),
      projectedValue: Math.round(accumulated),
      growth: Math.round(accumulated - totalInvested),
    })
  }

  return {
    rows,
    totalPayment: Math.round(totalInvested),
    finalValue: Math.round(accumulated),
    totalGrowth: Math.round(accumulated - totalInvested),
  }
}
