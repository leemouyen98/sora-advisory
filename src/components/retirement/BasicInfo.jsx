import { useMemo } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { formatRMFull, formatPercent, retirementCorpusNeeded, projectEPF, getEPFRate } from '../../lib/calculations'
import { Info, ExternalLink } from 'lucide-react'
import NumberInput from '../ui/NumberInput'

export default function BasicInfo({
  plan, currentAge, contactName, onChange, onContinue,
  linkedGrossMonthly = 0,   // pulled from Financial Info — gross-income row (monthly)
  onGoToFinancialInfo = null,
}) {
  const { t } = useLanguage()
  const yearsToRetirement = plan.retirementAge - currentAge
  const retirementDuration = plan.lifeExpectancy - plan.retirementAge

  // If Financial Info has a gross income value, use it — otherwise fall back to plan.annualIncome
  const isLinked = linkedGrossMonthly > 0
  const effectiveAnnualIncome = isLinked ? linkedGrossMonthly * 12 : (plan.annualIncome || 0)

  const { monthlyAtRetirement } = useMemo(() =>
    retirementCorpusNeeded({
      monthlyExpenses: plan.monthlyExpenses,
      inflationRate: plan.inflationRate,
      postRetirementReturn: plan.postRetirementReturn,
      yearsToRetirement,
      retirementDuration,
    }),
    [plan.monthlyExpenses, plan.inflationRate, plan.postRetirementReturn, yearsToRetirement, retirementDuration]
  )

  const epfProjection = useMemo(() => {
    if (!plan.includeEPF || !plan.epfBalance) return null
    return projectEPF({
      currentBalance: plan.epfBalance,
      growthRate: plan.epfGrowthRate,
      annualIncome: effectiveAnnualIncome,
      incomeGrowthRate: plan.incomeGrowthRate,
      currentAge,
      retirementAge: plan.retirementAge,
    })
  }, [plan.includeEPF, plan.epfBalance, plan.epfGrowthRate, effectiveAnnualIncome, plan.incomeGrowthRate, currentAge, plan.retirementAge])

  const set = (key) => (e) => {
    const val = e.target.type === 'number' || e.target.type === 'range' || e.target.inputMode === 'numeric'
      ? parseFloat(e.target.value) || 0
      : e.target.value
    onChange({ [key]: val })
  }

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-6">
        {/* Planning Parameters */}
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-4">Planning Parameters</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="hig-label">Retirement Age</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={currentAge + 1} max={75}
                  value={plan.retirementAge}
                  onChange={set('retirementAge')}
                  className="flex-1 accent-hig-blue"
                />
                <span className="text-hig-headline text-hig-blue w-8 text-right">{plan.retirementAge}</span>
              </div>
            </div>
            <div>
              <label className="hig-label">Life Expectancy</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={61} max={120}
                  value={plan.lifeExpectancy}
                  onChange={set('lifeExpectancy')}
                  className="flex-1 accent-hig-blue"
                />
                <span className="text-hig-headline text-hig-blue w-8 text-right">{plan.lifeExpectancy}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Retirement Expense */}
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-4">Retirement Expense</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="hig-label">Monthly Expenses (today's value)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <NumberInput
                  value={plan.monthlyExpenses}
                  onChange={(num) => onChange({ monthlyExpenses: num })}
                  className="hig-input pl-10"
                  placeholder="3,000"
                />
              </div>
            </div>
            <div>
              <label className="hig-label">Inflation Rate</label>
              <div className="relative">
                <input type="number" step="0.5" min={0} max={10} value={plan.inflationRate} onChange={set('inflationRate')} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="hig-label">Pre-Retirement Return</label>
              <div className="relative">
                <input type="number" step="0.5" min={0} max={20} value={plan.preRetirementReturn ?? 5} onChange={set('preRetirementReturn')} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">Expected portfolio return before retirement — higher return = lower corpus needed.</p>
            </div>
            <div>
              <label className="hig-label">Post-Retirement Return</label>
              <div className="relative">
                <input type="number" step="0.5" min={0} max={10} value={plan.postRetirementReturn} onChange={set('postRetirementReturn')} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">Return on the corpus after retirement — lower than pre-retirement (conservative allocation). Typical: 3–5%.</p>
            </div>
          </div>
        </div>

        {/* EPF */}
        <div className="hig-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-hig-headline">EPF Payout Information</h3>
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => onChange({ includeEPF: !plan.includeEPF })}
            >
              <span className={`text-hig-subhead transition-colors ${plan.includeEPF ? 'text-hig-text' : 'text-hig-text-secondary'}`}>
                Include EPF
              </span>
              <div className={`w-12 h-7 rounded-full transition-colors duration-hig relative
                ${plan.includeEPF ? 'bg-hig-green' : 'bg-hig-gray-3'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-hig
                  ${plan.includeEPF ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
              </div>
            </div>
          </div>

          {plan.includeEPF && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="hig-label">Current EPF Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                  <NumberInput value={plan.epfBalance} onChange={(num) => onChange({ epfBalance: num })} className="hig-input pl-10" placeholder="50,000" />
                </div>
              </div>
              <div>
                <label className="hig-label">EPF Growth Rate</label>
                <div className="relative">
                  <input type="number" step="0.5" value={plan.epfGrowthRate} onChange={set('epfGrowthRate')} className="hig-input pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="hig-label mb-0">Annual Income</label>
                  {isLinked ? (
                    <span className="text-hig-caption2 font-semibold px-2 py-0.5 bg-hig-blue/10 text-hig-blue rounded-full leading-none">
                      Linked
                    </span>
                  ) : (
                    <span className="text-hig-caption2 text-hig-text-secondary font-normal">optional</span>
                  )}
                </div>

                {isLinked ? (
                  /* ── Read-only linked value from Financial Info ── */
                  <div className="bg-hig-gray-6 border border-hig-gray-5 rounded-hig-sm px-3 py-2.5 flex items-center gap-2">
                    <span className="text-hig-text-secondary text-hig-subhead">RM</span>
                    <span className="text-hig-subhead font-semibold tabular-nums flex-1">
                      {effectiveAnnualIncome.toLocaleString('en-MY')}
                    </span>
                    {onGoToFinancialInfo && (
                      <button
                        type="button"
                        onClick={onGoToFinancialInfo}
                        className="flex items-center gap-1 text-hig-caption2 text-hig-blue hover:text-blue-700 transition-colors shrink-0 font-medium"
                      >
                        Edit in Financial Info <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                ) : (
                  /* ── Manual input — no Financial Info data ── */
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                    <NumberInput value={plan.annualIncome} onChange={(num) => onChange({ annualIncome: num })} className="hig-input pl-10" placeholder="60,000" />
                  </div>
                )}

                {effectiveAnnualIncome > 0 ? (
                  <p className="text-hig-caption1 text-hig-text-secondary mt-1">
                    {(() => {
                      const monthly = effectiveAnnualIncome / 12
                      const er = monthly > 5000 ? 12 : 13
                      return `${11 + er}% goes to EPF (11% employee + ${er}% employer${monthly > 5000 ? ', salary > RM5,000/mth' : ''})`
                    })()}
                  </p>
                ) : (
                  <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                    {isLinked
                      ? 'Set gross income in Financial Info to enable EPF contribution projection.'
                      : 'Leave blank for self-employed / voluntary contributors.'}
                  </p>
                )}
              </div>
              <div>
                <label className="hig-label">Income Growth Rate</label>
                <div className="relative">
                  <input type="number" step="0.5" value={plan.incomeGrowthRate} onChange={set('incomeGrowthRate')} className="hig-input pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Summary Panel */}
      <div className="w-72 shrink-0 space-y-4">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">Summary</h3>

          <div className="space-y-3 text-hig-subhead">
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">Current Age</span>
              <span className="font-semibold">{currentAge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">Years to Retirement</span>
              <span className="font-semibold">{yearsToRetirement} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">Retirement Duration</span>
              <span className="font-semibold">{retirementDuration} years</span>
            </div>
          </div>

          <hr className="border-hig-gray-5" />

          {/* Projected Monthly Expense */}
          <div className="bg-blue-50 rounded-hig-sm p-4">
            <p className="text-hig-caption1 text-hig-blue font-medium mb-1">
              Projected monthly expenses at age {plan.retirementAge}
            </p>
            <p className="text-hig-title3 text-hig-blue">
              {formatRMFull(monthlyAtRetirement)}
            </p>
            <p className="text-hig-caption2 text-hig-text-secondary mt-1">
              Adjusted for {formatPercent(plan.inflationRate)} inflation over {yearsToRetirement} years
            </p>
          </div>

          {/* EPF Balance */}
          {plan.includeEPF && epfProjection && (() => {
            const monthlyIncome = effectiveAnnualIncome / 12
            const isHighEarner = monthlyIncome > 5000
            const empRate = 11
            const erRate = isHighEarner ? 12 : 13
            const totalRate = empRate + erRate
            return (
              <div className="bg-green-50 rounded-hig-sm p-4 space-y-2">
                <p className="text-hig-caption1 text-hig-green font-medium">
                  Estimated EPF Balance at age {plan.retirementAge}
                </p>
                <p className="text-hig-title3 text-hig-green">
                  {formatRMFull(epfProjection.finalBalance)}
                </p>
                <p className="text-hig-caption2 text-hig-text-secondary">
                  At {formatPercent(plan.epfGrowthRate)} growth rate
                </p>
                <div className="border-t border-green-200 pt-2 flex items-start gap-1.5 text-hig-caption2 text-hig-text-secondary">
                  <Info size={11} className="mt-0.5 shrink-0 text-hig-green" />
                  <span>
                    EPF contribution: Employee {empRate}% + Employer {erRate}% = <strong>{totalRate}%</strong>
                    {isHighEarner
                      ? ' (salary > RM5,000/mth — employer rate is 12%)'
                      : ' (salary ≤ RM5,000/mth — employer rate is 13%)'}
                    . Rate adjusts dynamically as income grows.
                  </span>
                </div>
              </div>
            )
          })()}

          <button onClick={onContinue} className="hig-btn-primary w-full">
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
