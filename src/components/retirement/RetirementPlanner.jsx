import { useState, useMemo, useCallback, useRef } from 'react'
import { formatRMFull, generateRetirementProjection, tvmSolve, generateBreakdown, projectProvision } from '../../lib/calculations'
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, AlertTriangle, XCircle, Maximize2, Info } from 'lucide-react'
import RetirementChart from './RetirementChart'
import PlanningAssumptions from './PlanningAssumptions'
import { useLanguage } from '../../hooks/useLanguage'
import { RetirementExportButton } from '../pdf/RetirementReportPDF'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

const PROVISION_FREQUENCIES = ['One-Time', 'Monthly', 'Quarterly', 'Semi-annually', 'Yearly']

export default function RetirementPlanner({ plan, currentAge, contactName, linkedGrossMonthly = 0, onChange, onEditAssumptions, showAssumptions, onToggleAssumptions, activeTab, onActiveTabChange }) {
  const { t } = useLanguage()
  const setActiveTab = onActiveTabChange
  const [expandedRec, setExpandedRec] = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customCalcFor, setCustomCalcFor] = useState('fv') // fv | pmt | pv | rate
  const [savedFlash, setSavedFlash] = useState(false)
  const saveTimer = useRef(null)

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }, [])

  // TVM form state
  const [customForm, setCustomForm] = useState({
    fv: 0, rate: 5, pv: 0, pmt: 0, n: 10,
  })

  const projection = useMemo(() => {
    try {
      return generateRetirementProjection({
        currentAge,
        retirementAge: plan.retirementAge || 55,
        lifeExpectancy: plan.lifeExpectancy || 80,
        monthlyExpenses: plan.monthlyExpenses || 0,
        inflationRate: plan.inflationRate ?? 4,
        preRetirementReturn: plan.preRetirementReturn ?? 5,
        postRetirementReturn: plan.postRetirementReturn ?? 1,
        includeEPF: plan.includeEPF || false,
        epfBalance: plan.epfBalance || 0,
        epfGrowthRate: plan.epfGrowthRate ?? 6,
        annualIncome: Math.max(plan.annualIncome || 0, linkedGrossMonthly * 12),
        incomeGrowthRate: plan.incomeGrowthRate ?? 3,
        provisions: plan.provisions || [],
        recommendations: plan.recommendations || [],
      })
    } catch (err) {
      console.error('Projection calculation error:', err)
      return {
        targetAmount: 0, totalCovered: 0, shortfall: 0, surplus: 0,
        coveragePercent: 0, monthlyAtRetirement: 0, epfAtRetirement: 0,
        provisionsAtRetirement: 0, recommendationsAtRetirement: 0,
        provisionDetails: [], fundsRunOutAge: 0, fundsRunOutWithRec: 0,
        isFullyFunded: false, chartData: [], yearsToRetirement: 0, retirementDuration: 0,
      }
    }
  }, [plan, currentAge])

  // Baseline coverage % without any recommendations (for "Current Situation" card)
  const baseCoveragePercent = projection.targetAmount > 0
    ? Math.min(100, Math.round(
        ((projection.epfAtRetirement + projection.provisionsAtRetirement) / projection.targetAmount) * 100
      ))
    : 0

  const statusColor = projection.isFullyFunded
    ? 'hig-green'
    : projection.coveragePercent >= 75
      ? 'hig-orange'
      : 'hig-red'

  const statusLabel = projection.isFullyFunded
    ? t('retirement.onTrack')
    : projection.coveragePercent >= 75
      ? t('retirement.progressing')
      : t('retirement.atRisk')

  // Recommendation presets — auto-selected so the chart updates immediately
  const addPresetRecommendation = (monthlyAmount, years, lumpSum = 0) => {
    const rec = {
      id: uid(),
      type: 'preset',
      monthlyAmount,
      periodYears: years,
      lumpSum,
      growthRate: 5,
      isSelected: true,
    }
    onChange({ recommendations: [...(plan.recommendations || []), rec] })
    flashSaved()
  }

  const addCustomRecommendation = () => {
    const solved = tvmSolve({
      fv: customCalcFor === 'fv' ? undefined : customForm.fv,
      pv: customForm.pv,
      pmt: customForm.pmt,
      rate: customCalcFor === 'rate' ? undefined : customForm.rate,
      n: customForm.n,
      frequency: 12,
    }, customCalcFor)

    const rec = {
      id: uid(),
      type: 'custom',
      monthlyAmount: customCalcFor === 'pmt' ? Math.round(solved) : customForm.pmt,
      periodYears: customForm.n,
      lumpSum: customCalcFor === 'pv' ? Math.round(solved) : customForm.pv,
      growthRate: customCalcFor === 'rate' ? Math.round(solved * 10) / 10 : customForm.rate,
      futureValue: customCalcFor === 'fv' ? Math.round(solved) : customForm.fv,
      isSelected: false,
    }
    onChange({ recommendations: [...(plan.recommendations || []), rec] })
    setShowCustomForm(false)
    flashSaved()
  }

  const toggleRecommendation = (recId) => {
    const recs = (plan.recommendations || []).map((r) =>
      r.id === recId ? { ...r, isSelected: !r.isSelected } : r
    )
    onChange({ recommendations: recs })
    flashSaved()
  }

  const removeRecommendation = (recId) => {
    if (!window.confirm(t('retirement.removeRecConfirm'))) return
    onChange({ recommendations: (plan.recommendations || []).filter((r) => r.id !== recId) })
    flashSaved()
  }

  const selectedRecs = (plan.recommendations || []).filter((r) => r.isSelected)

  const recommendationTiers = useMemo(() => {
    const yearsToRet = Math.max(1, (plan.retirementAge || 55) - currentAge)
    const moderateYears = Math.min(12, yearsToRet)
    const comfortYears = Math.min(20, yearsToRet)
    const accumulationRate = Number(plan.preRetirementReturn ?? 5)

    const buildMonthly = (targetShortfall, years) => {
      if (!targetShortfall || years <= 0) return 0
      return Math.max(0, Math.round(tvmSolve({ fv: targetShortfall, pv: 0, rate: accumulationRate, n: years, frequency: 12 }, 'pmt')) || 0)
    }

    const buildLumpSum = (targetShortfall) => {
      if (!targetShortfall) return 0
      return Math.max(0, Math.round(tvmSolve({ fv: targetShortfall, pmt: 0, rate: accumulationRate, n: yearsToRet, frequency: 12 }, 'pv')) || 0)
    }

    return [
      {
        key: 'minimum',
        label: 'Minimum path',
        description: 'Close about 70% of the current shortfall with a more behaviourally realistic contribution.',
        monthlyAmount: buildMonthly(shortfallAmount * 0.7, yearsToRet),
        periodYears: yearsToRet,
        lumpSum: 0,
      },
      {
        key: 'target',
        label: 'Target path',
        description: 'Aim to fully close the shortfall across a moderate accumulation period.',
        monthlyAmount: buildMonthly(shortfallAmount, moderateYears),
        periodYears: moderateYears,
        lumpSum: 0,
      },
      {
        key: 'stronger',
        label: 'Stronger path',
        description: 'Blend a one-off lump sum with a longer monthly plan to reduce pressure on monthly cash flow.',
        monthlyAmount: buildMonthly(shortfallAmount * 0.65, comfortYears),
        periodYears: comfortYears,
        lumpSum: buildLumpSum(shortfallAmount * 0.35),
      },
    ]
  }, [shortfallAmount, plan.preRetirementReturn, plan.retirementAge, currentAge])

  const sensitivityCards = useMemo(() => {
    const scenarios = [
      { label: 'Retire 2 years later', overrides: { retirementAge: Math.min((plan.retirementAge || 55) + 2, plan.lifeExpectancy - 1) } },
      { label: 'Inflation +1%', overrides: { inflationRate: Number(plan.inflationRate || 0) + 1 } },
      { label: 'Return -1%', overrides: { preRetirementReturn: Math.max(0, Number(plan.preRetirementReturn || 0) - 1), postRetirementReturn: Math.max(0, Number(plan.postRetirementReturn || 0) - 1) } },
    ]

    return scenarios.map((scenario) => {
      const variant = generateRetirementProjection({
        currentAge,
        retirementAge: (scenario.overrides.retirementAge ?? plan.retirementAge) || 55,
        lifeExpectancy: plan.lifeExpectancy || 80,
        monthlyExpenses: plan.monthlyExpenses || 0,
        inflationRate: scenario.overrides.inflationRate ?? (plan.inflationRate ?? 4),
        preRetirementReturn: scenario.overrides.preRetirementReturn ?? (plan.preRetirementReturn ?? 5),
        postRetirementReturn: scenario.overrides.postRetirementReturn ?? (plan.postRetirementReturn ?? 1),
        includeEPF: plan.includeEPF || false,
        epfBalance: plan.epfBalance || 0,
        epfGrowthRate: plan.epfGrowthRate ?? 6,
        annualIncome: Math.max(plan.annualIncome || 0, linkedGrossMonthly * 12),
        incomeGrowthRate: plan.incomeGrowthRate ?? 3,
        provisions: plan.provisions || [],
        recommendations: plan.recommendations || [],
      })

      return {
        label: scenario.label,
        shortfall: variant.shortfall || 0,
        coveragePercent: variant.coveragePercent || 0,
      }
    })
  }, [plan, currentAge, linkedGrossMonthly])

  return (
    <>
    <div className="flex gap-4 items-start">
      {/* Left: Summary + Chart + Situation */}
      <div className="flex-1 min-w-0 space-y-3">

        {/* Summary card — same width as chart */}
        <div className="hig-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-5 flex-wrap">
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">{t('retirement.targetAmount')}</p>
                <p className="text-hig-title3">{formatRMFull(projection.targetAmount)}</p>
              </div>
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">{t('retirement.covered')}</p>
                <p className="text-hig-title3 text-hig-green">{formatRMFull(projection.totalCovered)}</p>
              </div>
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">
                  {projection.isFullyFunded ? t('retirement.surplus') : t('retirement.shortfall')}
                </p>
                <p className={`text-hig-title3 ${projection.isFullyFunded ? 'text-hig-green' : 'text-hig-red'}`}>
                  {projection.isFullyFunded ? '+' : ''}{formatRMFull(projection.isFullyFunded ? projection.surplus : projection.shortfall)}
                </p>
              </div>
            </div>
            {/* Progress badge + Export */}
            <div className="flex items-center gap-2 shrink-0">
              <RetirementExportButton
                plan={plan}
                projection={projection}
                contact={{ name: contactName, currentAge }}
              />
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-hig-subhead"
                style={{ backgroundColor: projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30' }}
              >
                {projection.coveragePercent}%
              </div>
              <span className="text-hig-subhead font-medium" style={{ color: projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30' }}>
                {statusLabel}
              </span>
            </div>
          </div>

          <p className="text-hig-caption1 text-hig-text-secondary mt-2">
            {t('retirement.expenseDesc', { amount: formatRMFull(projection.monthlyAtRetirement), age: plan.retirementAge, rate: plan.inflationRate, years: projection.retirementDuration })}
          </p>

          <div className="flex items-center gap-4 mt-1.5 text-hig-caption1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hig-green inline-block" />
              {t('retirement.existing')} {formatRMFull(projection.epfAtRetirement + projection.provisionsAtRetirement)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hig-blue inline-block" />
              {t('retirement.recommended')} {formatRMFull(projection.recommendationsAtRetirement)}
            </span>
          </div>

          <div className={`mt-2.5 px-3 py-2 rounded-hig-sm flex items-center gap-2 text-hig-caption1
            ${projection.isFullyFunded ? 'bg-green-50 text-hig-green' : projection.coveragePercent >= 75 ? 'bg-orange-50 text-hig-orange' : 'bg-red-50 text-hig-red'}`}>
            {projection.isFullyFunded ? (
              <><CheckCircle2 size={14} /> {t('retirement.msgOnTrack')}</>
            ) : projection.coveragePercent >= 75 ? (
              <><AlertTriangle size={14} /> {t('retirement.msgProgressing')}</>
            ) : (
              <><XCircle size={14} /> {t('retirement.msgAtRisk')}</>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="hig-card p-4">
          <RetirementChart
            data={projection.chartData}
            retirementAge={plan.retirementAge}
            targetAmount={projection.targetAmount}
            hasRecommendations={selectedRecs.length > 0}
          />
        </div>

        {/* Current Situation / With Recommendation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">{t('retirement.currentSituation')}</h4>
            <div className="flex items-center gap-2 mb-1.5">
              {projection.fundsRunOutAge >= plan.lifeExpectancy
                ? <CheckCircle2 size={18} className="text-hig-green" />
                : <AlertTriangle size={18} className="text-hig-red" />}
              <span className={`text-hig-title3 ${projection.fundsRunOutAge >= plan.lifeExpectancy ? 'text-hig-green' : ''}`}>
                {projection.fundsRunOutAge >= plan.lifeExpectancy ? `${plan.lifeExpectancy}+` : projection.fundsRunOutAge} yo
              </span>
            </div>
            <p className="text-hig-caption1 text-hig-text-secondary">
              {projection.fundsRunOutAge >= plan.lifeExpectancy
                ? t('retirement.fundsLastThrough')
                : t('retirement.fundsRunOutMsg', { age: projection.fundsRunOutAge, pct: baseCoveragePercent })}
            </p>
          </div>

          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">{t('retirement.withRecommendation')}</h4>
            {selectedRecs.length === 0 ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={18} className="text-hig-orange" />
                  <p className="text-hig-subhead text-hig-text-secondary">{t('retirement.noneSelected')}</p>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">{t('retirement.addRecToSeeImpact')}</p>
              </>
            ) : projection.isFullyFunded ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={18} className="text-hig-green" />
                  <span className="text-hig-subhead font-semibold text-hig-green">{t('retirement.fullyFundedLabel')}</span>
                </div>
                <p className="text-hig-caption1 text-hig-green bg-green-50 rounded-hig-sm p-2">
                  {t('retirement.sufficientFunds')}
                </p>
              </>
            ) : projection.fundsRunOutWithRec >= plan.lifeExpectancy ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={18} className="text-hig-green" />
                  <span className="text-hig-title3 text-hig-green">{plan.lifeExpectancy}+ yo</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {t('retirement.fundsLast100Pct')}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={18} className="text-hig-orange" />
                  <span className="text-hig-title3">{projection.fundsRunOutWithRec} yo</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {t('retirement.extendsToAge', { age: projection.fundsRunOutWithRec, pct: projection.coveragePercent })}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Recommendations / Provisions Panel */}
      <div className="w-72 lg:w-80 shrink-0">
        <div className="hig-card p-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-0">

          {/* Tab bar — top of right panel, above Add button */}
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-3">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-colors
                ${activeTab === 'recommendations' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              {t('retirement.recommendations')}
              {(plan.recommendations || []).length > 0 && (
                <span className="ml-1 text-hig-caption2 bg-hig-blue text-white px-1.5 py-0.5 rounded-full">
                  {(plan.recommendations || []).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={`flex-1 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-colors
                ${activeTab === 'provisions' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              {t('retirement.provisions')}
            </button>
          </div>

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="hig-btn-primary flex-1 gap-2"
                >
                  <Plus size={16} /> {t('retirement.addNewRecommendation')}
                </button>
                {savedFlash && (
                  <span className="text-hig-caption1 text-hig-green font-medium flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={13} /> {t('retirement.savedFlash')}
                  </span>
                )}
              </div>
              {shortfallAmount > 0 && (plan.recommendations || []).length === 0 && (
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {t('retirement.toAchieveObjective')}
                </p>
              )}

              <div className="rounded-hig-sm bg-hig-gray-6 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info size={14} className="mt-0.5 text-hig-blue shrink-0" />
                  <div className="text-hig-caption1 text-hig-text-secondary">
                    <p className="font-medium text-hig-text mb-1">Assumptions driving this plan</p>
                    <p>Inflation {plan.inflationRate}% · Accumulation return {plan.preRetirementReturn}% · Retirement return {plan.postRetirementReturn}% · Retire at age {plan.retirementAge}</p>
                  </div>
                </div>
              </div>

              {shortfallAmount > 0 && (
                <div className="space-y-2">
                  <p className="text-hig-caption1 text-hig-text-secondary">Use a tiered recommendation instead of a single harsh number. That makes the plan easier to explain and easier for a client to accept.</p>
                  {recommendationTiers.map((tier) => (
                    <button
                      key={tier.key}
                      onClick={() => addPresetRecommendation(tier.monthlyAmount, tier.periodYears, tier.lumpSum)}
                      className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-hig-subhead font-medium">{tier.label}</p>
                          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">{tier.description}</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-hig-gray-6 text-hig-text-secondary">Add</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-hig-caption1 text-hig-text">Monthly: <strong>{formatRMFull(tier.monthlyAmount)}</strong> for {tier.periodYears} years</p>
                        {tier.lumpSum > 0 && (
                          <p className="text-hig-caption1 text-hig-text">One-off today: <strong>{formatRMFull(tier.lumpSum)}</strong></p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border border-hig-gray-5 rounded-hig-sm p-3 space-y-2">
                <p className="text-hig-subhead font-medium">Sensitivity check</p>
                <p className="text-hig-caption1 text-hig-text-secondary">Stress-test the result before you present it. Small assumption changes should be visible.</p>
                <div className="space-y-2">
                  {sensitivityCards.map((card) => (
                    <div key={card.label} className="rounded-hig-sm bg-hig-gray-6 p-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-hig-caption1 font-medium text-hig-text">{card.label}</p>
                        <p className="text-hig-caption2 text-hig-text-secondary">Coverage {card.coveragePercent}%</p>
                      </div>
                      <p className={`text-hig-caption1 font-medium ${card.shortfall > shortfallAmount ? 'text-hig-red' : 'text-hig-green'}`}>{formatRMFull(card.shortfall)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Added recommendations */}
              {(plan.recommendations || []).map((rec, idx) => (
                <div key={rec.id} className="border border-hig-gray-4 rounded-hig-sm overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggleRecommendation(rec.id)}
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                        ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3'}`}
                    >
                      {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-hig-subhead font-medium">{t('retirement.recommendationN', { n: idx + 1 })}</p>
                      <p className="text-hig-caption1 text-hig-text-secondary truncate">
                        {rec.lumpSum && !rec.monthlyAmount
                          ? t('retirement.lumpSumDesc', { amount: formatRMFull(rec.lumpSum), rate: rec.growthRate, years: rec.periodYears })
                          : t('retirement.monthlyDesc', { amount: formatRMFull(rec.monthlyAmount), years: rec.periodYears, rate: rec.growthRate })}
                      </p>
                    </div>
                    <button onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)} className="p-1 text-hig-text-secondary hover:text-hig-text">
                      <Maximize2 size={14} />
                    </button>
                    <button onClick={() => removeRecommendation(rec.id)} className="p-1 text-hig-text-secondary hover:text-hig-red">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {expandedRec === rec.id && (
                    <div className="border-t border-hig-gray-5 p-3 bg-hig-gray-6">
                      <button
                        onClick={() => setShowBreakdown(showBreakdown === rec.id ? null : rec.id)}
                        className="hig-btn-ghost text-hig-caption1 w-full"
                      >
                        {showBreakdown === rec.id ? t('retirement.hideCalc') : t('retirement.showCalc')} {t('retirement.calcBreakdown')}
                        {showBreakdown === rec.id ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                      </button>
                      {showBreakdown === rec.id && (
                        <div className="mt-3 overflow-x-auto">
                          <BreakdownTable rec={rec} startAge={currentAge} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'provisions' && (
            <ProvisionPanel
              plan={plan}
              currentAge={currentAge}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </div>

    {/* Custom Recommendation Modal (TVM Calculator) */}
    {showCustomForm && (
      <CustomRecommendationModal
        form={customForm}
        setForm={setCustomForm}
        calcFor={customCalcFor}
        setCalcFor={setCustomCalcFor}
        shortfallAmount={shortfallAmount}
        currentAge={currentAge}
        retirementAge={plan.retirementAge}
        onAdd={addCustomRecommendation}
        onClose={() => setShowCustomForm(false)}
      />
    )}

    {/* Planning Assumptions Modal */}
    {showAssumptions && (
      <PlanningAssumptions
        plan={plan}
        currentAge={currentAge}
        onChange={onChange}
        onClose={() => onToggleAssumptions(false)}
      />
    )}
  </>
  )
}

// ─── Inline Provision Panel ─────────────────────────────────────────────────

function ProvisionPanel({ plan, currentAge, onChange }) {
  const { t } = useLanguage()
  const provisions = plan.provisions || []
  const yearsToRetirement = (plan.retirementAge || 55) - currentAge
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: 0, frequency: 'Monthly', preRetirementReturn: 5 })

  const addProvision = () => {
    if (!form.name && !form.amount) return
    onChange({ provisions: [...provisions, { ...form, id: uid(), amount: parseFloat(form.amount) || 0 }] })
    setForm({ name: '', amount: 0, frequency: 'Monthly', preRetirementReturn: 5 })
    setShowForm(false)
  }

  const removeProvision = (idx) => {
    onChange({ provisions: provisions.filter((_, i) => i !== idx) })
  }

  const totalProjected = useMemo(() =>
    provisions.reduce((sum, p) => {
      try { return sum + Math.round(projectProvision(p, yearsToRetirement)) }
      catch { return sum }
    }, 0),
    [provisions, yearsToRetirement]
  )

  return (
    <div className="space-y-3">
      {/* + Entry button */}
      <button
        onClick={() => setShowForm((v) => !v)}
        className="hig-btn-secondary w-full gap-2 text-hig-caption1"
      >
        <Plus size={14} /> {t('retirement.addEntry')}
      </button>

      {/* Inline add form */}
      {showForm && (
        <div className="border border-hig-blue/30 rounded-hig-sm p-3 bg-blue-50/20 space-y-2">
          <div>
            <label className="hig-label">{t('common.name')}</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="hig-input text-hig-caption1 py-1.5"
              placeholder="e.g. Unit Trust, ASNB"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="hig-label">{t('retirement.amountRM')}</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="hig-input text-hig-caption1 py-1.5"
                placeholder="500"
              />
            </div>
            <div>
              <label className="hig-label">{t('common.period')}</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="hig-input text-hig-caption1 py-1.5"
              >
                {PROVISION_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="hig-label">{t('retirement.preRetirementReturnPct')}</label>
            <input
              type="number"
              step="0.5"
              value={form.preRetirementReturn}
              onChange={(e) => setForm({ ...form, preRetirementReturn: parseFloat(e.target.value) || 0 })}
              className="hig-input text-hig-caption1 py-1.5"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="hig-btn-secondary text-hig-caption1 flex-1">{t('common.cancel')}</button>
            <button onClick={addProvision} className="hig-btn-primary text-hig-caption1 flex-1">{t('common.add')}</button>
          </div>
        </div>
      )}

      {/* Existing provisions list */}
      {provisions.length === 0 && !showForm ? (
        <p className="text-hig-caption1 text-hig-text-secondary text-center py-4">
          {t('retirement.noExistingProvisions')}
        </p>
      ) : (
        <>
          {provisions.map((p, i) => (
            <div key={p.id} className="p-3 border border-hig-gray-4 rounded-hig-sm flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-hig-subhead font-medium truncate">{p.name || t('retirement.provisionN', { n: i + 1 })}</p>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {formatRMFull(p.amount)} {p.frequency} @ {p.preRetirementReturn}%
                </p>
              </div>
              <button onClick={() => removeProvision(i)} className="p-1 text-hig-text-secondary hover:text-hig-red shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {provisions.length > 0 && (
            <div className="pt-1 border-t border-hig-gray-5 flex justify-between text-hig-caption1">
              <span className="text-hig-text-secondary">{t('retirement.projectedAtAge', { age: plan.retirementAge })}</span>
              <span className="font-semibold text-hig-green">{formatRMFull(totalProjected)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── TVM Calculator Modal ───────────────────────────────────────────────────

function CustomRecommendationModal({ form, setForm, calcFor, setCalcFor, shortfallAmount, currentAge, retirementAge, onAdd, onClose }) {
  const { t } = useLanguage()
  const maxYears = retirementAge - currentAge

  const solved = useMemo(() => {
    try {
      return tvmSolve({
        fv: calcFor === 'fv' ? undefined : form.fv,
        pv: form.pv,
        pmt: form.pmt,
        rate: calcFor === 'rate' ? undefined : form.rate,
        n: form.n,
        frequency: 12,
      }, calcFor)
    } catch {
      return 0
    }
  }, [form, calcFor])

  const labels = {
    fv: { title: t('retirement.tvmFvLabel', { age: retirementAge }), color: 'bg-green-50 text-hig-green' },
    pmt: { title: t('retirement.tvmPmtLabel'), color: 'bg-teal-50 text-teal-700' },
    pv: { title: t('retirement.tvmPvLabel'), color: 'bg-teal-50 text-teal-700' },
    rate: { title: t('retirement.tvmRateLabel'), color: 'bg-teal-50 text-teal-700' },
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-hig-title3 mb-4">{t('retirement.simulateCustomRec')}</h2>

        {/* Calculate For tabs */}
        <div className="mb-4">
          <p className="text-hig-caption1 text-hig-text-secondary mb-2">{t('retirement.calculateFor')}</p>
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-1">
            {[
              { key: 'fv', label: t('retirement.tvmEstValue') },
              { key: 'pmt', label: t('retirement.tvmMonthly') },
              { key: 'pv', label: t('retirement.tvmLumpSum') },
              { key: 'rate', label: t('retirement.tvmInterest') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCalcFor(tab.key)}
                className={`flex-1 py-2 text-hig-caption1 font-medium rounded-hig-sm transition-colors
                  ${calcFor === tab.key ? 'bg-hig-blue text-white' : 'text-hig-text-secondary'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solved value display */}
        <div className={`rounded-hig-sm p-4 mb-4 ${labels[calcFor].color}`}>
          <p className="text-hig-caption2 font-semibold tracking-wide">{labels[calcFor].title}</p>
          <p className="text-hig-title2 mt-1">
            {calcFor === 'rate' ? `${Number.isFinite(solved) ? solved.toFixed(2) : '0.00'}%` : formatRMFull(solved)}
          </p>
        </div>

        {/* Shortfall shortcut */}
        {calcFor !== 'fv' && shortfallAmount > 0 && (
          <button
            onClick={() => setForm({ ...form, fv: shortfallAmount })}
            className="text-hig-caption1 text-hig-blue font-medium mb-3 hover:underline"
          >
            {t('retirement.useShortfall', { amount: formatRMFull(shortfallAmount) })}
          </button>
        )}

        {/* Input fields — hide the one being solved */}
        <div className="space-y-3">
          {calcFor !== 'fv' && (
            <div>
              <label className="hig-label">{t('retirement.targetValueFV')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.fv || ''} onChange={(e) => setForm({...form, fv: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
              </div>
            </div>
          )}

          {calcFor !== 'rate' && (
            <div>
              <label className="hig-label">{t('retirement.growthRatePerYear')}</label>
              <div className="relative">
                <input type="number" step="0.5" value={form.rate} onChange={(e) => setForm({...form, rate: parseFloat(e.target.value) || 0})} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
            </div>
          )}

          {calcFor !== 'pv' && (
            <div>
              <label className="hig-label">{t('retirement.lumpSumContrib')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.pv || ''} onChange={(e) => setForm({...form, pv: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
              </div>
              <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">{t('retirement.oneTimeToday')}</p>
            </div>
          )}

          {calcFor !== 'pmt' && (
            <div>
              <label className="hig-label">{t('retirement.monthlyContrib')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.pmt || ''} onChange={(e) => setForm({...form, pmt: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">/mth</span>
              </div>
            </div>
          )}

          <div>
            <label className="hig-label">{t('retirement.investPeriod')}</label>
            <div className="relative">
              <input type="number" min={1} max={maxYears} value={form.n} onChange={(e) => setForm({...form, n: parseInt(e.target.value) || 1})} className="hig-input pr-16" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">{t('common.years')}</span>
            </div>
            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
              {t('retirement.investPeriodDesc', { from: currentAge, to: retirementAge, max: maxYears })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="hig-btn-secondary">{t('common.cancel')}</button>
          <button onClick={onAdd} className="hig-btn-primary">{t('retirement.addRecommendationBtn')}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Calculation Breakdown Table ────────────────────────────────────────────

function BreakdownTable({ rec, startAge }) {
  const { t } = useLanguage()
  const breakdown = useMemo(() =>
    generateBreakdown({
      lumpSum: rec.lumpSum || 0,
      monthly: rec.monthlyAmount || 0,
      rate: rec.growthRate || 5,
      years: rec.periodYears || 10,
      startAge,
    }),
    [rec, startAge]
  )

  return (
    <div className="text-hig-caption1">
      <h4 className="text-hig-subhead font-semibold mb-2">{t('retirement.investGrowthProjection')}</h4>
      <table className="w-full">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-hig-gray-4 text-left text-hig-text-secondary">
            <th className="py-1.5 pr-2">{t('common.age')}</th>
            <th className="py-1.5 pr-2">{t('retirement.colPayment')}</th>
            <th className="py-1.5 pr-2">{t('retirement.colAccumCapital')}</th>
            <th className="py-1.5">{t('retirement.colProjectedValue')}</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.rows.map((row) => (
            <tr key={row.age} className="border-b border-hig-gray-5">
              <td className="py-1.5 pr-2 font-medium">{row.age}</td>
              <td className="py-1.5 pr-2">{formatRMFull(row.payment)}</td>
              <td className="py-1.5 pr-2">{formatRMFull(row.accumulatedCapital)}</td>
              <td className="py-1.5 font-medium">{formatRMFull(row.projectedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
