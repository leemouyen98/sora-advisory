import { useMemo } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { formatRMFull, retirementCorpusNeeded, projectEPF } from '../../lib/calculations'
import { ExternalLink } from 'lucide-react'
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



  const assumedMonthlyReplacement = useMemo(() => {
    if (!effectiveAnnualIncome) return 0
    return Math.round((effectiveAnnualIncome / 12) * 0.7)
  }, [effectiveAnnualIncome])

  const set = (key) => (e) => {
    const val = e.target.type === 'number' || e.target.type === 'range' || e.target.inputMode === 'numeric'
      ? parseFloat(e.target.value) || 0
      : e.target.value
    onChange({ [key]: val })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Form */}
      <div className="flex-1 space-y-6">
        {/* Planning Parameters */}
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-4">{t('retirement.planningParams')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="hig-label">{t('retirement.retirementAge')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={55} max={70}
                  value={plan.retirementAge}
                  onChange={set('retirementAge')}
                  className="flex-1 accent-hig-blue"
                />
                <span className="text-hig-headline text-hig-blue w-8 text-right">{plan.retirementAge}</span>
              </div>
            </div>
            <div>
              <label className="hig-label">{t('retirement.lifeExpectancy')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={56} max={120}
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
          <h3 className="text-hig-headline mb-4">{t('retirement.retirementExpense')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 md:col-span-1">
              <label className="hig-label">{t('retirement.monthlyExpensesToday')}</label>
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
              <label className="hig-label">{t('retirement.inflationRate')}</label>
              <div className="relative">
                <input type="number" step="0.5" min={0} max={10} value={plan.inflationRate} onChange={set('inflationRate')} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
            </div>
            <div>
              <label className="hig-label">{t('retirement.postReturnRate')}</label>
              <div className="relative">
                <input type="number" step="0.5" min={0} max={10} value={plan.postRetirementReturn} onChange={set('postRetirementReturn')} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">{t('retirement.postReturnRateDesc')}</p>
            </div>
          </div>
        </div>

        {/* EPF */}
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">{t('retirement.epfInfo')}</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-4">{t('retirement.epfInfoDesc')}</p>
          <div className="mb-4">
            <label className="hig-label">{t('retirement.includeEPF')} <span className="text-hig-text-secondary font-normal">{t('common.optional')}</span></label>
            <div className="flex rounded-hig-sm border border-hig-gray-4 overflow-hidden">
              <button
                type="button"
                onClick={() => onChange({ includeEPF: true })}
                className={`flex-1 py-2 text-hig-subhead font-medium transition-colors
                  ${plan.includeEPF ? 'bg-hig-blue text-white' : 'bg-white text-hig-text-secondary hover:bg-hig-gray-6'}`}
              >
                {t('common.yes')}
              </button>
              <button
                type="button"
                onClick={() => onChange({ includeEPF: false })}
                className={`flex-1 py-2 text-hig-subhead font-medium transition-colors border-l border-hig-gray-4
                  ${!plan.includeEPF ? 'bg-hig-blue text-white' : 'bg-white text-hig-text-secondary hover:bg-hig-gray-6'}`}
              >
                {t('common.no')}
              </button>
            </div>
          </div>

          {plan.includeEPF && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="hig-label">{t('retirement.epfBalance')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                  <NumberInput value={plan.epfBalance} onChange={(num) => onChange({ epfBalance: num })} className="hig-input pl-10" placeholder="50,000" />
                </div>
              </div>
              <div>
                <label className="hig-label">{t('retirement.epfGrowthRate')}</label>
                <div className="relative">
                  <input type="number" step="0.5" value={plan.epfGrowthRate} onChange={set('epfGrowthRate')} className="hig-input pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="hig-label mb-0">{t('retirement.annualIncome')}</label>
                  {isLinked ? (
                    <span className="text-hig-caption2 font-semibold px-2 py-0.5 bg-hig-blue/10 text-hig-blue rounded-full leading-none">
                      {t('retirement.linked')}
                    </span>
                  ) : (
                    <span className="text-hig-caption2 text-hig-text-secondary font-normal">{t('common.optional')}</span>
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
                        {t('retirement.editInFinancial')} <ExternalLink size={10} />
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
                    {t('retirement.epfContribNote', { total: 23, er: 12, suffix: '' })}
                  </p>
                ) : (
                  <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                    {isLinked
                      ? t('retirement.epfSetGrossIncome')
                      : t('retirement.epfSelfEmployed')}
                  </p>
                )}
              </div>
              <div>
                <label className="hig-label">{t('retirement.incomeGrowth')}</label>
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
      <div className="w-full shrink-0 space-y-4 lg:w-72">
        <div className="hig-card p-5 space-y-4 lg:sticky lg:top-4">
          <h3 className="text-hig-headline">{t('retirement.summaryHeader')}</h3>

          <div className="space-y-3 text-hig-subhead">
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.currentAge')}</span>
              <span className="font-semibold">{currentAge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.yearsToRetirement')}</span>
              <span className="font-semibold">{yearsToRetirement} {t('common.years')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.retirementDuration')}</span>
              <span className="font-semibold">{retirementDuration} {t('common.years')}</span>
            </div>
          </div>

          <hr className="border-hig-gray-5" />

          {/* Projected Monthly Expense */}
          <div className="bg-blue-50 rounded-hig-sm p-4">
            <p className="text-hig-caption1 text-hig-blue font-medium mb-1">
              {t('retirement.projectedMonthlyAt', { age: plan.retirementAge })}
            </p>
            <p className="text-hig-title3 text-hig-blue">
              {formatRMFull(monthlyAtRetirement)}
            </p>
            <p className="text-hig-caption2 text-hig-text-secondary mt-1">
              {t('retirement.adjustedForInflation', { rate: plan.inflationRate, years: yearsToRetirement })}
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
              <div className="bg-green-50 rounded-hig-sm p-4 space-y-1">
                <p className="text-hig-caption1 text-hig-green font-medium">
                  {t('retirement.epfEstimatedBalance')}
                </p>
                <p className="text-hig-title3 text-hig-green">
                  {formatRMFull(epfProjection.finalBalance)}
                </p>
                <p className="text-hig-caption2 text-hig-text-secondary">
                  {t('retirement.atGrowthRate', { rate: plan.epfGrowthRate })}
                </p>
              </div>
            )
          })()}

          {assumedMonthlyReplacement > 0 && (
            <div className="rounded-hig-sm bg-blue-50 p-4 space-y-1">
              <p className="text-hig-caption1 text-hig-blue font-medium">Income sense-check</p>
              <p className="text-hig-caption1 text-hig-text-secondary">
                70% of current gross monthly income is about <strong>{formatRMFull(assumedMonthlyReplacement)}</strong>.
                Use this as a reasonableness check against the retirement expense target.
              </p>
            </div>
          )}

          <button onClick={onContinue} className="hig-btn-primary w-full">
            {t('common.continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
