import { useMemo } from 'react'
import { AlertTriangle, CheckCircle, MinusCircle, Info } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

/**
 * Financial Ratios — standard advisory benchmarks
 *
 * 1. Emergency Fund Ratio: Liquid assets / Monthly expenses → target ≥ 6 months
 * 2. Savings Ratio: (Income − Expenses) / Income → target ≥ 20%
 * 3. Debt Service Ratio: Total loan repayments / Gross income → target ≤ 33%
 * 4. Net Worth to Asset Ratio: Net Worth / Total Assets → higher = better
 * 5. Insurance Coverage Ratio: Total sum assured / Annual income → target ≥ 10×
 * 6. Liquidity Ratio: Liquid assets / Total liabilities → target ≥ 1
 */

const RATIOS = [
  {
    key: 'emergencyFund',
    title: 'Emergency Fund',
    description: 'Liquid savings ÷ Monthly expenses',
    benchmark: '≥ 6 months',
    unit: 'months',
    evaluate: (val) => val >= 6 ? 'good' : val >= 3 ? 'fair' : 'poor',
  },
  {
    key: 'savingsRate',
    title: 'Savings Rate',
    description: '(Income − Expenses) ÷ Income',
    benchmark: '≥ 20%',
    unit: '%',
    evaluate: (val) => val >= 20 ? 'good' : val >= 10 ? 'fair' : 'poor',
  },
  {
    key: 'debtService',
    title: 'Debt Service Ratio',
    description: 'Total loan repayments ÷ Gross income',
    benchmark: '≤ 33%',
    unit: '%',
    evaluate: (val) => val <= 33 ? 'good' : val <= 50 ? 'fair' : 'poor',
  },
  {
    key: 'netWorthToAsset',
    title: 'Solvency Ratio',
    description: 'Net worth ÷ Total assets',
    benchmark: '≥ 50%',
    unit: '%',
    evaluate: (val) => val >= 50 ? 'good' : val >= 25 ? 'fair' : 'poor',
  },
  {
    key: 'insuranceCoverage',
    title: 'Insurance Coverage',
    description: 'Total sum assured ÷ Annual income',
    benchmark: '≥ 10× annual income',
    unit: '×',
    evaluate: (val) => val >= 10 ? 'good' : val >= 5 ? 'fair' : 'poor',
  },
  {
    key: 'liquidityRatio',
    title: 'Liquidity Ratio',
    description: 'Liquid assets ÷ Total liabilities',
    benchmark: '≥ 1.0',
    unit: '×',
    evaluate: (val) => val >= 1 ? 'good' : val >= 0.5 ? 'fair' : 'poor',
  },
]

const STATUS_CONFIG = {
  good: { icon: CheckCircle, color: 'text-hig-green', bg: 'bg-hig-green/10', label: 'Healthy' },
  fair: { icon: MinusCircle, color: 'text-hig-orange', bg: 'bg-hig-orange/10', label: 'Needs Attention' },
  poor: { icon: AlertTriangle, color: 'text-hig-red', bg: 'bg-hig-red/10', label: 'Action Required' },
  na: { icon: Info, color: 'text-hig-gray-1', bg: 'bg-hig-gray-6', label: 'No Data' },
}

// ─── Helpers (duplicated to avoid cross-file import) ─────────────────────────
function toMonthly(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1 / 12, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function calcMonthlyRepayment(principal, interestRate, loanPeriod) {
  const P = Number(principal) || 0
  const r = (Number(interestRate) || 0) / 100 / 12
  const n = Number(loanPeriod) || 1
  if (P === 0) return 0
  if (r === 0) return P / n
  return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
}

export default function FinancialRatios({ financials, contact }) {
  const ratioValues = useMemo(() => {
    const policies = financials.insurance || []

    // ── Support both old object format and new array format ──────────────────
    let totalAssets, totalLiabilities, liquidAssets, grossMonthly, annualBonus,
        totalMonthlyExpenses, monthlyDebt

    if (Array.isArray(financials.assets)) {
      // New array format
      const assets      = financials.assets      || []
      const liabilities = financials.liabilities || []
      const income      = financials.income       || []
      const expenses    = financials.expenses     || []

      totalAssets      = assets.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        + (financials.investments || []).reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
      totalLiabilities = liabilities.reduce((s, r) => s + (Number(r.principal) || 0), 0)

      const savingsRow  = assets.find(r => r.id === 'savings-cash')
      const fleksiRow   = assets.find(r => r.id === 'epf-fleksibel')
      liquidAssets      = (Number(savingsRow?.amount) || 0) + (Number(fleksiRow?.amount) || 0)

      const grossRow    = income.find(r => r.id === 'gross-income')
      const bonusRow    = income.find(r => r.id === 'bonus')
      grossMonthly      = Number(grossRow?.amount)  || 0
      annualBonus       = Number(bonusRow?.amount)  || 0

      totalMonthlyExpenses = expenses.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
      // Add monthly loan repayments to expense total
      monthlyDebt = liabilities.reduce((s, r) => s + calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod), 0)
      totalMonthlyExpenses += monthlyDebt

    } else {
      // Legacy object format (migration path)
      const a = financials.assets      || {}
      const l = financials.liabilities || {}
      const i = financials.income      || {}
      const e = financials.expenses    || {}

      totalAssets      = Object.values(a).reduce((s, v) => s + (Number(v) || 0), 0)
      totalLiabilities = Object.values(l).reduce((s, v) => s + (Number(v) || 0), 0)
      liquidAssets     = (Number(a.savings) || 0) + (Number(a.epfFleksibel) || 0)
      grossMonthly     = Number(i.grossIncome) || 0
      annualBonus      = Number(i.bonus) || 0
      totalMonthlyExpenses = Object.values(e).reduce((s, v) => s + (Number(v) || 0), 0)
      monthlyDebt      = (Number(e.carLoanRepayment) || 0) + (Number(e.loanRepayment) || 0)
    }

    const netWorth     = totalAssets - totalLiabilities
    const annualIncome = grossMonthly * 12 + annualBonus
    const monthlyIncome = grossMonthly + (annualBonus / 12)
    const monthlyCashFlow = monthlyIncome - totalMonthlyExpenses

    // Insurance total sum assured
    const totalSumAssured = policies.reduce((s, p) => s + (Number(p.coverageDetails?.death) || Number(p.sumAssured) || 0), 0)

    return {
      emergencyFund:    totalMonthlyExpenses > 0 ? liquidAssets / totalMonthlyExpenses : null,
      savingsRate:      monthlyIncome > 0 ? (monthlyCashFlow / monthlyIncome) * 100 : null,
      debtService:      grossMonthly > 0 ? (monthlyDebt / grossMonthly) * 100 : null,
      netWorthToAsset:  totalAssets > 0 ? (netWorth / totalAssets) * 100 : null,
      insuranceCoverage:annualIncome > 0 ? totalSumAssured / annualIncome : null,
      liquidityRatio:   totalLiabilities > 0 ? liquidAssets / totalLiabilities : null,
      _raw: {
        liquidAssets, totalMonthlyExpenses, monthlyIncome, monthlyCashFlow,
        monthlyDebt, grossMonthly, totalAssets, totalLiabilities, netWorth,
        totalSumAssured, annualIncome,
      },
    }
  }, [financials])

  const hasAnyData = Object.entries(ratioValues).some(([k, v]) => k !== '_raw' && v !== null)

  if (!hasAnyData) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-gray-6 flex items-center justify-center mb-4">
          <Info size={26} className="text-hig-gray-1" />
        </div>
        <p className="text-hig-headline text-hig-text font-semibold mb-1">Financial Ratios</p>
        <p className="text-hig-subhead text-hig-text-secondary">
          Add financial data in the Financial Info tab to see ratios and benchmarks.
        </p>
      </div>
    )
  }

  // ─── Scorecard ──────────────────────────────────────────────────────────

  const scores = RATIOS.map((r) => {
    const val = ratioValues[r.key]
    const status = val === null ? 'na' : r.evaluate(val)
    return { ...r, value: val, status }
  })

  const goodCount = scores.filter((s) => s.status === 'good').length
  const totalScored = scores.filter((s) => s.status !== 'na').length
  const overallHealth = totalScored === 0 ? 'na'
    : goodCount >= totalScored * 0.7 ? 'good'
    : goodCount >= totalScored * 0.4 ? 'fair'
    : 'poor'

  const overallConfig = STATUS_CONFIG[overallHealth]
  const OverallIcon = overallConfig.icon

  return (
    <div className="space-y-5">
      {/* Overall Health */}
      <div className={`hig-card p-5 flex items-center gap-4 ${overallConfig.bg}`}>
        <OverallIcon size={28} className={overallConfig.color} />
        <div>
          <p className="text-hig-headline font-semibold">
            Financial Health: <span className={overallConfig.color}>{overallConfig.label}</span>
          </p>
          <p className="text-hig-subhead text-hig-text-secondary">
            {goodCount} of {totalScored} ratios meet benchmark targets
          </p>
        </div>
      </div>

      {/* Ratio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {scores.map((s) => {
          const config = STATUS_CONFIG[s.status]
          const Icon = config.icon
          const formatValue = () => {
            if (s.value === null) return '—'
            if (s.unit === 'months') return `${s.value.toFixed(1)} months`
            if (s.unit === '%') return `${s.value.toFixed(1)}%`
            if (s.unit === '×') return `${s.value.toFixed(1)}×`
            return s.value.toFixed(1)
          }

          return (
            <div key={s.key} className="hig-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-hig-subhead font-medium text-hig-text">{s.title}</p>
                  <p className="text-hig-caption1 text-hig-text-secondary">{s.description}</p>
                </div>
                <div className={`p-1.5 rounded-full ${config.bg}`}>
                  <Icon size={16} className={config.color} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-hig-title3 font-bold ${s.status !== 'na' ? config.color : 'text-hig-gray-1'}`}>
                  {formatValue()}
                </span>
                <span className="text-hig-caption1 text-hig-text-secondary">
                  Benchmark: {s.benchmark}
                </span>
              </div>
              {/* Progress bar */}
              {s.value !== null && (
                <div className="mt-2 h-1.5 bg-hig-gray-5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.status === 'good' ? 'bg-hig-green'
                        : s.status === 'fair' ? 'bg-hig-orange'
                        : 'bg-hig-red'
                    }`}
                    style={{
                      width: `${Math.min(100, s.key === 'debtService'
                        ? Math.max(0, 100 - s.value * 1.5) // inverse for debt
                        : s.key === 'savingsRate' ? Math.min(100, s.value * 3)
                        : s.key === 'emergencyFund' ? Math.min(100, (s.value / 6) * 100)
                        : s.key === 'insuranceCoverage' ? Math.min(100, (s.value / 10) * 100)
                        : s.key === 'netWorthToAsset' ? s.value
                        : Math.min(100, s.value * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
