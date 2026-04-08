/**
 * HLA — Financial Calculation Engine
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
 * Project EPF balance year by year until retirement.
 * Contribution rate is salary-dependent (Third Schedule, EPF Act 1991):
 *   Monthly salary ≤ RM5,000 : Employee 11% + Employer 13% = 24% of annual income
 *   Monthly salary > RM5,000  : Employee 11% + Employer 12% = 23% of annual income
 * Rate is evaluated each year as income grows past the threshold.
 */
export function getEPFRate(_annualIncome) {
  // GoalsMapper uses a flat 23% (11% employee + 12% employer) for all income levels.
  // The Third Schedule's higher 13% employer rate for wages ≤ RM 5,000 is NOT applied.
  return 0.23
}

export function projectEPF({ currentBalance, growthRate, annualIncome, incomeGrowthRate, currentAge, retirementAge }) {
  const years = Math.max(0, retirementAge - currentAge)
  const yearlyData = []
  let balance = currentBalance || 0
  let income = annualIncome || 0

  for (let y = 0; y <= years; y++) {
    const epfRate = getEPFRate(income)
    yearlyData.push({
      age: currentAge + y,
      year: y,
      balance: Math.round(balance),
      contribution: y === 0 ? 0 : Math.round(income * epfRate),
      epfRate,
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
    initialRate: getEPFRate(annualIncome),
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
 * Project a single provision's value at retirement.
 * Uses annuity DUE (beginning-of-period payments) — matches GoalsMapper's convention.
 * Any existing balance compounds as a lump sum (annual compounding) to retirement.
 */
export function projectProvision(provision, yearsToRetirement) {
  const { amount, frequency, preRetirementReturn: rate = 1, currentBalance = 0 } = provision
  // Compound any existing balance (annual compounding, matches GoalsMapper)
  const balanceFV = currentBalance > 0 ? fvLumpSum(currentBalance, rate, yearsToRetirement) : 0
  if (frequency === 'One-Time') {
    return balanceFV + fvLumpSum(amount, rate, yearsToRetirement)
  }
  const freq = getFrequencyMultiplier(frequency)
  // Annuity due: multiply ordinary FV by (1 + periodic rate) — matches GoalsMapper exactly
  const r = rate / 100 / freq
  return balanceFV + fvAnnuity(amount, rate, yearsToRetirement, freq) * (1 + r)
}

/**
 * Calculate total retirement corpus needed.
 *
 * Uses an annual growing-annuity-due formula (first withdrawal AT retirement age,
 * inclusive count) to match standard Malaysian financial-planning practice:
 *
 *   n  = retirementDuration + 1   (e.g. retire 60, live to 75 → 16 annual withdrawals)
 *   q  = (1 + inflationRate%) / (1 + postRetirementReturn%)
 *
 *   corpus = (monthlyAtRetirement × 12) × Σ_{t=0}^{n-1} q^t
 *          = (monthlyAtRetirement × 12) × (q^n − 1) / (q − 1)   [q ≠ 1]
 *          = (monthlyAtRetirement × 12) × n                       [q = 1]
 */
export function retirementCorpusNeeded({ monthlyExpenses, inflationRate, postRetirementReturn, yearsToRetirement, retirementDuration }) {
  // Monthly expenses at retirement (inflation-adjusted future value)
  const monthlyAtRetirement = monthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToRetirement)

  // Annual growing annuity due — inclusive retirement duration (+1 to include retirement year)
  const n = retirementDuration + 1
  const annualExpense = monthlyAtRetirement * 12
  const g = inflationRate / 100
  const r = postRetirementReturn / 100
  const q = (1 + g) / (1 + r)

  let corpus
  if (Math.abs(q - 1) < 0.0001) {
    corpus = annualExpense * n
  } else {
    corpus = annualExpense * (Math.pow(q, n) - 1) / (q - 1)
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
    } else if (r.monthlyAmount > 0) {
      // Preset monthly recommendation — two-phase: contribute then coast
      recommendationsAtRetirement += recMonthlyFV(
        r.monthlyAmount,
        r.growthRate || 5,
        r.periodYears || 10,
        yearsToRetirement,
      )
    } else if (r.lumpSum > 0) {
      // Preset lump sum — annual compounding to retirement
      const fv = r.lumpSum * Math.pow(1 + (r.growthRate || 5) / 100, yearsToRetirement)
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

  // Provisions: start with currentBalance (existing savings) + any one-time top-up amounts
  let provBal = (provisions || []).reduce(
    (sum, p) => sum + (p.currentBalance || 0) + (p.frequency === 'One-Time' ? (p.amount || 0) : 0), 0
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

      // EPF: contributions until retirement age, then grows at post-retirement return.
      // Rate: 23% if monthly salary > RM5,000 (11% employee + 12% employer),
      //       24% if monthly salary ≤ RM5,000 (11% employee + 13% employer).
      // EPF: annual contributions at salary-dependent rate, grows at EPF dividend rate.
      // (isPreRetirement guarantees age < retirementAge — no else branch needed.)
      if (includeEPF) {
        const epfRate = getEPFRate(epfIncome)
        const contribution = epfIncome * epfRate
        epfBal = (epfBal + contribution) * (1 + (epfGrowthRate || 6) / 100)
        epfIncome *= (1 + (incomeGrowthRate || 0) / 100)
        // Mirror for no-rec scenario
        const epfRateNoRec = getEPFRate(epfIncomeNoRec)
        const contribNoRec = epfIncomeNoRec * epfRateNoRec
        epfBalNoRec = (epfBalNoRec + contribNoRec) * (1 + (epfGrowthRate || 6) / 100)
        epfIncomeNoRec *= (1 + (incomeGrowthRate || 0) / 100)
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
      // ── Retirement Year (annuity-due: first withdrawal happens AT retirement age) ──
      // Step 1: Final accumulation growth tick
      const avgRecRate = selectedRecs.length > 0
        ? selectedRecs.reduce((s, r) => s + (r.growthRate || 5), 0) / selectedRecs.length
        : 5
      const avgProvReturn = (provisions || []).length > 0
        ? provisions.reduce((s, p) => s + (p.preRetirementReturn || 1), 0) / provisions.length
        : 1
      if (includeEPF) {
        epfBal *= (1 + (epfGrowthRate || 6) / 100)
        epfBalNoRec *= (1 + (epfGrowthRate || 6) / 100)
      }
      provBal *= (1 + avgProvReturn / 100)
      provBalNoRec *= (1 + avgProvReturn / 100)
      recBal *= (1 + avgRecRate / 100)

      // Step 2: First annual withdrawal at retirement age (yearsIntoRetirement = 0, no inflation yet)
      const annualExpenseRet = monthlyAtRetirement * 12

      let toDeductRet = Math.min(annualExpenseRet, epfBal + provBal + recBal)
      const epfDrawRet = Math.min(epfBal, toDeductRet)
      epfBal = Math.max(0, epfBal - epfDrawRet)
      toDeductRet -= epfDrawRet
      const provDrawRet = Math.min(provBal, toDeductRet)
      provBal = Math.max(0, provBal - provDrawRet)
      toDeductRet -= provDrawRet
      const recDrawRet = Math.min(recBal, toDeductRet)
      recBal = Math.max(0, recBal - recDrawRet)

      // No-rec scenario
      let toDeductRetNoRec = Math.min(annualExpenseRet, epfBalNoRec + provBalNoRec)
      const epfDrawRetNoRec = Math.min(epfBalNoRec, toDeductRetNoRec)
      epfBalNoRec = Math.max(0, epfBalNoRec - epfDrawRetNoRec)
      toDeductRetNoRec -= epfDrawRetNoRec
      const provDrawRetNoRec = Math.min(provBalNoRec, toDeductRetNoRec)
      provBalNoRec = Math.max(0, provBalNoRec - provDrawRetNoRec)

    } else {
      // ── Drawdown Phase (age > retirementAge) ──
      // Annual expense = year-0 expense inflated further each year into retirement
      const yearsIntoRetirement = age - retirementAge
      const annualExpense = monthlyAtRetirement * 12 *
        Math.pow(1 + inflationRate / 100, yearsIntoRetirement)

      // Step 1: All buckets grow at post-retirement return
      epfBal *= (1 + postRetirementReturn / 100)
      provBal *= (1 + postRetirementReturn / 100)
      recBal *= (1 + postRetirementReturn / 100)
      epfBalNoRec *= (1 + postRetirementReturn / 100)
      provBalNoRec *= (1 + postRetirementReturn / 100)

      // Step 2: Deduct expenses sequentially — EPF first, then provisions, then recommendations
      let toDeduct = Math.min(annualExpense, epfBal + provBal + recBal)

      const epfDraw = Math.min(epfBal, toDeduct)
      epfBal = Math.max(0, epfBal - epfDraw)
      toDeduct -= epfDraw

      const provDraw = Math.min(provBal, toDeduct)
      provBal = Math.max(0, provBal - provDraw)
      toDeduct -= provDraw

      const recDraw = Math.min(recBal, toDeduct)
      recBal = Math.max(0, recBal - recDraw)

      // No-rec scenario: EPF first, then provisions
      let toDeductNoRec = Math.min(annualExpense, epfBalNoRec + provBalNoRec)

      const epfDrawNoRec = Math.min(epfBalNoRec, toDeductNoRec)
      epfBalNoRec = Math.max(0, epfBalNoRec - epfDrawNoRec)
      toDeductNoRec -= epfDrawNoRec

      const provDrawNoRec = Math.min(provBalNoRec, toDeductNoRec)
      provBalNoRec = Math.max(0, provBalNoRec - provDrawNoRec)
    }

    const totalFund = epfBal + provBal + recBal
    const totalNoRecFund = epfBalNoRec + provBalNoRec

    // ── Required Corpus Curve ───────────────────────────────────────────────
    // Represents the amount you SHOULD have at each age to stay on track.
    //
    // Pre-retirement: discount targetAmount backward using a standard 5% accumulation rate.
    //   i.e. the PV of the required corpus, growing at 5% each year.
    //   At currentAge  → targetAmount / (1.05)^yearsToRetirement  (smallest)
    //   At retirementAge → targetAmount                            (peak)
    //
    // Post-retirement: PV of all remaining withdrawals from this age onward,
    //   discounted at real rate (postRetirementReturn − inflationRate).
    //   Depletes to zero at lifeExpectancy.
    let idealCorpus = 0
    if (age < retirementAge) {
      const yearsFromRetirement = retirementAge - age
      idealCorpus = targetAmount / Math.pow(1.05, yearsFromRetirement)
    } else if (age === retirementAge) {
      idealCorpus = targetAmount
    } else {
      // Post-retirement: annual growing annuity due — remaining withdrawals including current year
      // n = remaining years inclusive (lifeExpectancy - age + 1)
      const yearsIntoRet = age - retirementAge
      const annualNow = monthlyAtRetirement * 12 * Math.pow(1 + inflationRate / 100, yearsIntoRet)
      const nRem = lifeExpectancy - age + 1  // inclusive remaining years
      const gR = inflationRate / 100
      const rR = postRetirementReturn / 100
      const qR = (1 + gR) / (1 + rR)
      if (Math.abs(qR - 1) < 0.0001) {
        idealCorpus = annualNow * nRem
      } else {
        idealCorpus = annualNow * (Math.pow(qR, nRem) - 1) / (qR - 1)
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

  // Dynamic simulation is the source of truth.
  // If the year-by-year model shows existing funds (no recs) last to life expectancy,
  // the gap is genuinely zero — no recommendation needed.
  // If the year-by-year model WITH recommendations covers to life expectancy, plan is fully funded.
  const dynamicNoRecOk  = (fundsRunOutAge  || 0) >= lifeExpectancy
  const dynamicWithRecOk = (fundsRunOutWithRec || 0) >= lifeExpectancy

  const reconciledShortfall = dynamicNoRecOk ? 0 : Math.max(0, safeNum(shortfall))
  const reconciledFullyFunded = dynamicWithRecOk || totalCovered >= targetAmount
  // Surplus: prefer dynamic surplus (funds outlast life expectancy with headroom);
  // fall back to static surplus (totalCovered − targetAmount) whenever the plan is fully funded.
  const reconciledSurplus = dynamicNoRecOk && shortfall < 0
    ? Math.abs(safeNum(shortfall))
    : reconciledFullyFunded
      ? Math.max(0, safeNum(totalCovered - targetAmount))
      : 0

  return {
    targetAmount: safeNum(targetAmount),
    totalCovered: safeNum(totalCovered),
    shortfall: reconciledShortfall,
    surplus: reconciledSurplus,
    coveragePercent: safeNum(coveragePercent),
    monthlyAtRetirement: safeNum(monthlyAtRetirement),
    epfAtRetirement: safeNum(epfAtRetirement),
    provisionsAtRetirement: safeNum(provisionsAtRetirement),
    recommendationsAtRetirement: safeNum(recommendationsAtRetirement),
    provisionDetails,
    fundsRunOutAge: Math.min(safeNum(fundsRunOutAge) || lifeExpectancy, lifeExpectancy),
    fundsRunOutWithRec: Math.min(safeNum(fundsRunOutWithRec) || lifeExpectancy, lifeExpectancy),
    isFullyFunded: reconciledFullyFunded,
    chartData,
    yearsToRetirement: safeNum(yearsToRetirement),
    retirementDuration: safeNum(retirementDuration),
  }
}

// ─── Recommendation Solve Functions (GoalsMapper-verified) ───────────────────

/**
 * Solve for the monthly PMT needed to cover a retirement shortfall.
 *
 * GoalsMapper two-phase approach:
 *   Phase 1 — monthly contributions at annualRate for contribYears
 *   Phase 2 — the accumulated FV grows (no new contributions) for remainingYears
 *
 *   denom  = fvOrd_monthly(1, r, n_months) × (1 + R)^remainingYears
 *   PMT    = Math.round(shortfall / denom)
 *
 * Verified exact matches: 10yr → 9,590 | 20yr → 5,901
 */
export function recMonthlyPMT(shortfall, annualRate, contribYears, totalYears) {
  if (!shortfall || contribYears <= 0 || totalYears <= 0) return 0
  const r = annualRate / 100 / 12
  const n = contribYears * 12
  const fvOrd = r === 0 ? n : (Math.pow(1 + r, n) - 1) / r
  const remainingYears = Math.max(0, totalYears - contribYears)
  const growthFactor = Math.pow(1 + annualRate / 100, remainingYears)
  return Math.round(shortfall / (fvOrd * growthFactor))
}

/**
 * Compute the FV of a monthly-contribution plan at retirement age.
 *
 * GoalsMapper display formula:
 *   Phase 1 — annuity-DUE (contributions grow one extra period)
 *   Phase 2 — annual growth for remaining years
 *
 *   fvDue = fvOrd × (1 + r_monthly)
 *   FV    = fvDue × (1 + R)^remainingYears
 *
 * Verified exact match: pmt=9,590 → FV = 3,778,705
 */
export function recMonthlyFV(pmt, annualRate, contribYears, totalYears) {
  if (!pmt || contribYears <= 0 || totalYears <= 0) return 0
  const r = annualRate / 100 / 12
  const n = contribYears * 12
  const fvOrd = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
  const fvDue = fvOrd * (1 + r)                            // annuity-due adjustment
  const remainingYears = Math.max(0, totalYears - contribYears)
  return Math.round(fvDue * Math.pow(1 + annualRate / 100, remainingYears))
}

/**
 * Solve for the lump sum needed today to cover a retirement shortfall.
 *
 * GoalsMapper: annual discounting only (no monthly compounding).
 *   LS = Math.round(shortfall / (1 + R)^totalYears)
 *
 * Verified exact match: ls = 914,185
 */
export function recLumpSum(shortfall, annualRate, totalYears) {
  if (!shortfall || totalYears <= 0) return 0
  return Math.round(shortfall / Math.pow(1 + annualRate / 100, totalYears))
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
      .filter((r) => r.isSelected)
      .reduce((sum, r) => {
        // New multi-risk format: rec has per-risk amounts (death, tpd, aci, eci)
        if (!('riskType' in r)) return sum + (r[risk] || 0)
        // Legacy single-risk format: rec has riskType + coverageAmount
        return r.riskType === risk ? sum + (r.coverageAmount || 0) : sum
      }, 0)

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
