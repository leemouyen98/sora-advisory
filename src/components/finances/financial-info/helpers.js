export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

import { INVESTMENT_DEFAULT_RETURN } from './constants'
// toMonthly/calcMonthlyRepayment now live in lib/calculations.js — re-exported
// here so existing imports (`from './helpers'`) keep working unchanged.
export { toMonthly, calcMonthlyRepayment } from '../../../lib/calculations'

// NOTE on 'epf-all'.growthRate (5.2%): this is an informational figure shown
// on the Financial Info asset row only — it is NOT read by the Cash Flow
// projection. The Cash Flow module has its own, separately editable
// "EPF dividend" planning assumption (CashFlowTab.jsx, default 5.5%) that
// actually drives projectCashFlow(). The two numbers are intentionally
// independent (see project convention: planning modules don't cross-couple),
// but an advisor comparing this screen to the Cash Flow tab may notice they
// differ — that's expected, not a bug, just worth knowing if asked about it.
function getDefaultFixedAssets() {
  return [
    { id: 'savings-cash', fixed: true, type: 'Savings Cash',       description: 'Savings (Cash)',        growthRate: 0.25, amount: 0 },
    { id: 'epf-all',      fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance',  growthRate: 5.2,  amount: 0 },
    { id: 'property',     fixed: true, type: 'Property',           description: 'Property',              growthRate: 3.0,  amount: 0 },
    { id: 'automobile',   fixed: true, type: 'Automobile',         description: 'Automobile',            growthRate: -5.0, amount: 0 },
  ]
}

// Migrate existing data that still has 3 separate EPF rows → single epf-all row
function migrateEpfRows(assets) {
  const OLD_EPF = ['epf-persaraan', 'epf-sejahtera', 'epf-fleksibel']
  const hasOld = assets.some(a => OLD_EPF.includes(a.id))
  const hasNew = assets.some(a => a.id === 'epf-all')
  if (!hasOld || hasNew) return assets
  const epfTotal = assets.filter(a => OLD_EPF.includes(a.id)).reduce((s, a) => s + (Number(a.amount) || 0), 0)
  const rest = assets.filter(a => !OLD_EPF.includes(a.id))
  const insertAt = rest.findIndex(a => a.id === 'savings-cash')
  const newRow = { id: 'epf-all', fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance', growthRate: 5.2, amount: epfTotal }
  if (insertAt >= 0) { rest.splice(insertAt + 1, 0, newRow); return rest }
  return [newRow, ...rest]
}

function getDefaultFixedIncome() {
  return [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: 0, epfApplicable: true },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: 0, epfApplicable: true },
  ]
}

function getDefaultFixedInvestments(currentAge = 30) {
  return [
    { id: 'inv-etf',    fixed: true, type: 'Exchange Traded Funds (ETF)', description: 'Wahed, Stashaway, Maybank ETF, Bursa ETFs', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 7.5, currentValue: 0 },
    { id: 'inv-stocks', fixed: true, type: 'Stocks & Shares',             description: 'Bursa-listed equities, blue chips, growth stocks', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 8.0, currentValue: 0 },
    { id: 'inv-ut',     fixed: true, type: 'Unit Trusts',                  description: 'Public Mutual, Principal, Eastspring, KAF',        planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 6.5, currentValue: 0 },
    { id: 'inv-bonds',  fixed: true, type: 'Bonds',                        description: 'ASNB, Sukuk, fixed income instruments',             planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 4.0, currentValue: 0 },
  ]
}

function getDefaultFixedLiabilities(currentAge = 30) {
  return [
    { id: 'liab-home', fixed: true, type: 'Home Loan', description: 'Home Loan', principal: 0, startAge: currentAge, interestRate: 4.5, loanPeriod: 360 },
    { id: 'liab-car',  fixed: true, type: 'Car Loan',  description: 'Car Loan',  principal: 0, startAge: currentAge, interestRate: 3.0, loanPeriod: 84  },
  ]
}

function getDefaultFixedExpenses(currentAge = 30) {
  return [
    { id: 'exp-personal',      fixed: true, type: 'All - Personal',      description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-transport',     fixed: true, type: 'All - Transport',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-household',     fixed: true, type: 'All - Household',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-dependents',    fixed: true, type: 'All - Dependents',    description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-miscellaneous', fixed: true, type: 'All - Miscellaneous', description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-vacation',      fixed: true, type: 'Vacation/Travel',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Yearly',  amount: 0, inflationLinked: true },
  ]
}

export function normalizeFinancials(fin, currentAge = 30) {
  if (!fin) {
    return {
      assets:      getDefaultFixedAssets(),
      investments: getDefaultFixedInvestments(currentAge),
      liabilities: getDefaultFixedLiabilities(currentAge),
      income:      getDefaultFixedIncome(),
      expenses:    getDefaultFixedExpenses(currentAge),
      insurance:   [],
    }
  }
  if (Array.isArray(fin.assets)) {
    const ensureFixed = (rows, defaults) =>
      rows.some(r => r.fixed) ? rows : [...defaults, ...rows]
    const income = Array.isArray(fin.income) ? fin.income : getDefaultFixedIncome()
    const migratedAssets = migrateEpfRows(fin.assets)
    return {
      assets:      ensureFixed(migratedAssets, getDefaultFixedAssets()),
      investments: ensureFixed(fin.investments || [], getDefaultFixedInvestments(currentAge)),
      liabilities: ensureFixed(fin.liabilities || [], getDefaultFixedLiabilities(currentAge)),
      income:      ensureFixed(income, getDefaultFixedIncome()),
      expenses:    ensureFixed(fin.expenses || [], getDefaultFixedExpenses(currentAge)),
      insurance:   fin.insurance || [],
    }
  }
  // Migrate legacy object format
  const oldA = fin.assets || {}, oldL = fin.liabilities || {}, oldI = fin.income || {}, oldE = fin.expenses || {}
  const assets = [
    { id: 'savings-cash', fixed: true, type: 'Savings Cash',       description: 'Savings (Cash)',       growthRate: 0.25, amount: Number(oldA.savings) || 0 },
    { id: 'epf-all',      fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance', growthRate: 5.2,  amount: (Number(oldA.epfPersaraan) || 0) + (Number(oldA.epfSejahtera) || 0) + (Number(oldA.epfFleksibel) || 0) },
    { id: 'property',     fixed: true, type: 'Property',           description: 'Property',             growthRate: 3.0,  amount: 0 },
    { id: 'automobile',   fixed: true, type: 'Automobile',         description: 'Automobile',           growthRate: -5.0, amount: 0 },
    ...(Number(oldA.unitTrusts)      > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Unit Trusts',      growthRate: 6, amount: Number(oldA.unitTrusts)      }] : []),
    ...(Number(oldA.otherInvestment) > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Other Investment', growthRate: 5, amount: Number(oldA.otherInvestment) }] : []),
  ]
  const liabilities = [
    { id: 'liab-home', fixed: true, type: 'Home Loan', description: 'Home Loan', principal: Number(oldL.homeLoan)  || 0, startAge: currentAge - 5, interestRate: 4.5, loanPeriod: 360 },
    { id: 'liab-car',  fixed: true, type: 'Car Loan',  description: 'Car Loan',  principal: Number(oldL.carLoan)   || 0, startAge: currentAge - 2, interestRate: 3.0, loanPeriod: 84  },
    ...(Number(oldL.studyLoan) > 0 ? [{ id: uid(), type: 'Study Loan',    description: 'PTPTN',     principal: Number(oldL.studyLoan), startAge: currentAge - 5, interestRate: 1.0, loanPeriod: 120 }] : []),
    ...(Number(oldL.otherLoan) > 0 ? [{ id: uid(), type: 'Personal Loan', description: 'Other',     principal: Number(oldL.otherLoan), startAge: currentAge,     interestRate: 5.0, loanPeriod: 60  }] : []),
  ]
  const income = [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: Number(oldI.grossIncome) || 0, epfApplicable: true },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: Number(oldI.bonus)       || 0, epfApplicable: true },
  ]
  const expMap = [
    { key: 'household',           type: 'All - Household',     desc: 'Household'          },
    { key: 'personal',            type: 'All - Personal',      desc: 'Personal'           },
    { key: 'petrol',              type: 'All - Transport',     desc: 'Petrol'             },
    { key: 'carLoanRepayment',    type: 'All - Transport',     desc: 'Car Loan Repayment' },
    { key: 'loanRepayment',       type: 'All - Miscellaneous', desc: 'Loan Repayment'     },
    { key: 'carInsurance',        type: 'All - Transport',     desc: 'Car Insurance'      },
    { key: 'roadTax',             type: 'All - Transport',     desc: 'Road Tax'           },
    { key: 'incomeTax',           type: 'All - Miscellaneous', desc: 'Income Tax'         },
    { key: 'insuranceProtection', type: 'All - Miscellaneous', desc: 'Insurance Premium'  },
  ]
  // Seed fixed expense rows; overlay old legacy amounts where type matches
  const legacyAmounts = {}
  expMap.filter(m => Number(oldE[m.key]) > 0).forEach(m => {
    legacyAmounts[m.type] = (legacyAmounts[m.type] || 0) + Number(oldE[m.key])
  })
  const fixedExpenses = getDefaultFixedExpenses(currentAge).map(r => ({
    ...r,
    amount: legacyAmounts[r.type] || 0,
  }))
  // Any legacy types not covered by fixed rows become dynamic rows
  const coveredTypes = new Set(fixedExpenses.map(r => r.type))
  const extraExpenses = expMap
    .filter(m => Number(oldE[m.key]) > 0 && !coveredTypes.has(m.type))
    .map(m => ({ id: uid(), type: m.type, description: m.desc, ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: Number(oldE[m.key]) }))
  const expenses = [...fixedExpenses, ...extraExpenses]
  return { assets, investments: fin.investments || [], liabilities, income, expenses, insurance: fin.insurance || [] }
}

export function computeSummary(data) {
  const totalAssets      = (data.assets      || []).reduce((s, r) => s + (Number(r.amount)       || 0), 0)
  const totalInvestments = (data.investments || []).reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
  const totalLiabilities = (data.liabilities || []).reduce((s, r) => s + (Number(r.principal)    || 0), 0)
  const monthlyIncome    = (data.income      || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const monthlyExpenses  = (data.expenses    || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const grossRow         = (data.income      || []).find(r => r.id === 'gross-income')
  const grossEpfOn       = grossRow?.epfApplicable !== false
  const epfContribution  = grossEpfOn ? (Number(grossRow?.amount) || 0) * 0.11 : 0
  return {
    totalAssets, totalInvestments, totalLiabilities,
    netWorth:        totalAssets + totalInvestments - totalLiabilities,
    monthlyIncome, monthlyExpenses,
    monthlyCashFlow: monthlyIncome - monthlyExpenses,
    epfContribution,
  }
}

