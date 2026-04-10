import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { formatRMFull, generateRetirementProjection, tvmSolve, projectProvision, recMonthlyPMT, recLumpSum, recMonthlyFV } from '../../lib/calculations'
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, ArrowLeft, MoreVertical, X } from 'lucide-react'
import RetirementChart from './RetirementChart'
import PlanningAssumptions from './PlanningAssumptions'
import { useLanguage } from '../../hooks/useLanguage'
import { RetirementExportButton } from '../pdf/RetirementReportPDF'
import { uid } from '../../lib/formatters'

const PROVISION_FREQUENCIES = ['One-Time', 'Monthly', 'Quarterly', 'Semi-annually', 'Yearly']

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RetirementPlanner({
  plan, currentAge, contactName, linkedGrossMonthly = 0,
  onChange, showAssumptions, onToggleAssumptions,
  activeTab, onActiveTabChange, meetingMode = false,
  agentName,
}) {
  const { t } = useLanguage()
  const setActiveTab = onActiveTabChange

  const [showCustom,       setShowCustom]       = useState(false)
  const [customCalcFor,    setCustomCalcFor]    = useState('fv')
  const [customForm,       setCustomForm]       = useState({ fv: 0, rate: 5, pv: 0, pmt: 0, n: 10 })
  const [deleteConfirmRec, setDeleteConfirmRec] = useState(null)   // { id, name }
  const [showBreakdownRec, setShowBreakdownRec] = useState(null)   // rec id
  const [savedFlash,       setSavedFlash]       = useState(false)
  const saveTimer = useRef(null)

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }, [])

  // ── Projection ──────────────────────────────────────────────────────────────
  const projection = useMemo(() => {
    try {
      return generateRetirementProjection({
        currentAge,
        retirementAge:      plan.retirementAge || 55,
        lifeExpectancy:     plan.lifeExpectancy || 100,
        monthlyExpenses:    plan.monthlyExpenses || 0,
        inflationRate:      plan.inflationRate ?? 4,
        postRetirementReturn: plan.postRetirementReturn ?? 3,
        includeEPF:         plan.includeEPF || false,
        epfBalance:         plan.epfBalance || 0,
        epfGrowthRate:      plan.epfGrowthRate ?? 6,
        annualIncome:       Math.max(plan.annualIncome || 0, linkedGrossMonthly * 12),
        incomeGrowthRate:   plan.incomeGrowthRate ?? 3,
        provisions:         plan.provisions || [],
        recommendations:    plan.recommendations || [],
      })
    } catch (err) {
      console.error('Projection error:', err)
      return {
        targetAmount: 0, totalCovered: 0, shortfall: 0, surplus: 0,
        coveragePercent: 0, monthlyAtRetirement: 0, epfAtRetirement: 0,
        provisionsAtRetirement: 0, recommendationsAtRetirement: 0,
        provisionDetails: [], fundsRunOutAge: 0, fundsRunOutWithRec: 0,
        isFullyFunded: false, chartData: [], yearsToRetirement: 0, retirementDuration: 0,
      }
    }
  }, [plan, currentAge, linkedGrossMonthly])

  const shortfallAmount = projection.shortfall || 0
  const selectedRecs    = (plan.recommendations || []).filter((r) => r.isSelected)

  // Status colour / label
  const statusColor = projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30'
  const statusLabel = projection.isFullyFunded ? t('retirement.onTrack') : projection.coveragePercent >= 75 ? t('retirement.progressing') : t('retirement.atRisk')

  // ── Recommendation tiers (GoalsMapper-verified formulas) ──────────────────
  // Default investment rate matches GoalsMapper hardcoded default: 5% p.a.
  // Option 1: contribute for min(10, yearsToRet) years, FV grows for remaining years
  // Option 2: contribute for min(20, yearsToRet) years, FV grows for remaining years
  // Option 3: lump sum today, annual discounting only (no monthly compounding)
  const tiers = useMemo(() => {
    const DEFAULT_RATE = 5
    const yearsToRet = Math.max(1, (plan.retirementAge || 55) - currentAge)
    const y10 = Math.min(10, yearsToRet)
    const y20 = Math.min(20, yearsToRet)

    return {
      tenYear:        { monthly: recMonthlyPMT(shortfallAmount, DEFAULT_RATE, y10, yearsToRet), years: y10,  lumpSum: 0 },
      twentyYear:     { monthly: recMonthlyPMT(shortfallAmount, DEFAULT_RATE, y20, yearsToRet), years: y20,  lumpSum: 0 },
      oneTime:        { monthly: 0, years: yearsToRet, lumpSum: recLumpSum(shortfallAmount, DEFAULT_RATE, yearsToRet) },
      yearsToRet,
    }
  }, [shortfallAmount, plan.retirementAge, currentAge])

  // ── Recommendation actions ─────────────────────────────────────────────────
  const addPreset = (monthly, years, lumpSum = 0) => {
    onChange({ recommendations: [...(plan.recommendations || []), {
      id: uid(), type: 'preset', monthlyAmount: monthly, periodYears: years,
      lumpSum, growthRate: 5, isSelected: true,
    }]})
    flashSaved()
  }

  const addCustom = () => {
    const solved = tvmSolve({
      fv:        customCalcFor === 'fv'   ? undefined : customForm.fv,
      pv:        customForm.pv,
      pmt:       customForm.pmt,
      rate:      customCalcFor === 'rate' ? undefined : customForm.rate,
      n:         customForm.n,
      frequency: 12,
    }, customCalcFor)

    onChange({ recommendations: [...(plan.recommendations || []), {
      id: uid(), type: 'custom',
      monthlyAmount: customCalcFor === 'pmt'  ? Math.round(solved) : customForm.pmt,
      periodYears:   customForm.n,
      lumpSum:       customCalcFor === 'pv'   ? Math.abs(Math.round(solved)) : customForm.pv,
      growthRate:    customCalcFor === 'rate' ? Math.round(solved * 10) / 10 : customForm.rate,
      futureValue:   customCalcFor === 'fv'   ? Math.round(solved) : customForm.fv,
      isSelected: true,
    }]})
    setShowCustom(false)
    flashSaved()
  }

  const toggleRec = (id) => {
    onChange({ recommendations: (plan.recommendations || []).map((r) => r.id === id ? { ...r, isSelected: !r.isSelected } : r) })
    flashSaved()
  }

  const updateRec = (id, changes) => {
    onChange({ recommendations: (plan.recommendations || []).map((r) => r.id === id ? { ...r, ...changes } : r) })
  }

  const removeRec = (id) => {
    onChange({ recommendations: (plan.recommendations || []).filter((r) => r.id !== id) })
    setDeleteConfirmRec(null)
    flashSaved()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

      {/* ── Left: Summary + Chart + Situation ────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">

        {/* Summary bar */}
        <div className="hig-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-5 flex-wrap">
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">Target Amount</p>
                <p className="text-hig-title3">{formatRMFull(projection.targetAmount)}</p>
              </div>
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">Covered</p>
                <p className="text-hig-title3 text-hig-green">{formatRMFull(projection.totalCovered)}</p>
              </div>
              <div>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium">
                  {projection.isFullyFunded ? 'Surplus' : 'Shortfall'}
                </p>
                <p className={`text-hig-title3 ${projection.isFullyFunded ? 'text-hig-green' : 'text-hig-red'}`}>
                  {projection.isFullyFunded ? '+' : ''}{formatRMFull(projection.isFullyFunded ? projection.surplus : projection.shortfall)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RetirementExportButton plan={plan} projection={projection} contact={{ name: contactName, currentAge }} agentName={agentName} />
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-hig-subhead"
                style={{ backgroundColor: statusColor }}>
                {projection.coveragePercent}%
              </div>
              <span className="text-hig-subhead font-medium" style={{ color: statusColor }}>{statusLabel}</span>
            </div>
          </div>

          <p className="text-hig-caption1 text-hig-text-secondary mt-2">
            Retirement Income: <strong>{formatRMFull(projection.monthlyAtRetirement)}</strong> per month from age {plan.retirementAge} @ {plan.inflationRate}% for {projection.retirementDuration} years
          </p>

          <div className="flex items-center gap-4 mt-1.5 text-hig-caption1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hig-orange inline-block" />
              Existing {formatRMFull(projection.epfAtRetirement + projection.provisionsAtRetirement)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hig-blue inline-block" />
              Recommended {formatRMFull(projection.recommendationsAtRetirement)}
            </span>
          </div>

          <p className={`mt-2.5 text-hig-caption1 ${
            projection.isFullyFunded ? 'text-hig-blue' : projection.coveragePercent >= 75 ? 'text-hig-orange' : 'text-hig-red'
          }`}>
            {projection.isFullyFunded
              ? 'You have more than enough to meet your goal. Consider reallocating the surplus to other financial objectives.'
              : projection.coveragePercent >= 75
                ? 'You are making progress, but there is still a gap to address. Consider increasing your contributions.'
                : 'Your current funding is below target. We recommend reviewing your plan to bridge the gap.'}
          </p>
        </div>

        {/* Chart */}
        <div className="hig-card p-4">
          <RetirementChart
            data={projection.chartData}
            retirementAge={plan.retirementAge}
            currentAge={currentAge}
            lifeExpectancy={plan.lifeExpectancy}
            targetAmount={projection.targetAmount}
            hasRecommendations={selectedRecs.length > 0}
          />
        </div>

        {/* Current Situation / With Recommendation */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Current Situation */}
          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">Current Situation</h4>
            {projection.fundsRunOutAge >= plan.lifeExpectancy ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={18} className="text-hig-green" />
                  <span className="text-hig-title3 text-hig-green">{plan.lifeExpectancy}+ yo</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">Funds will last through to your life expectancy.</p>
              </>
            ) : (
              <>
                <p className="text-hig-caption1 text-hig-text-secondary mb-1">Funds will run out at</p>
                <p className="text-hig-title3 text-hig-red mb-1.5">{projection.fundsRunOutAge} yo</p>
                <p className="text-hig-caption1 text-hig-red">At current levels, your funds will run out at age {projection.fundsRunOutAge}. You are at 0% of your retirement goal.</p>
              </>
            )}
          </div>

          {/* With Recommendation */}
          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">With Recommendation</h4>
            {selectedRecs.length === 0 ? (
              <>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-1">No Recommendation Selected</p>
                <p className="text-hig-caption1 text-hig-text-secondary">Add a recommendation to see how it improves your situation.</p>
              </>
            ) : projection.isFullyFunded || projection.fundsRunOutWithRec >= plan.lifeExpectancy ? (
              <>
                <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-1.5">Fully Funded</p>
                <p className="text-hig-caption1 text-hig-green">
                  Your retirement is fully funded. You will have sufficient funds throughout your retirement years.
                </p>
              </>
            ) : (
              <>
                <p className="text-hig-caption1 text-hig-text-secondary mb-1">Funds will run out at</p>
                <p className="text-hig-title3 text-hig-red mb-1.5">{projection.fundsRunOutWithRec} yo</p>
                <p className="text-hig-caption1 text-hig-red">
                  At current levels, your funds will run out at age {projection.fundsRunOutWithRec}. You are at {projection.coveragePercent}% of your retirement goal.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Recommendations / Provisions ──────────────────────────── */}
      <div className="w-full shrink-0 lg:w-72 xl:w-80">
        <div className="hig-card p-4 overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100dvh-160px)]">

          {/* Tab bar */}
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

          {/* ── Recommendations tab ── */}
          {activeTab === 'recommendations' && (
            <div className="space-y-3">

              {showCustom ? (
                /* ── Inline TVM Calculator ── */
                <InlineTVM
                  form={customForm}
                  setForm={setCustomForm}
                  calcFor={customCalcFor}
                  setCalcFor={setCustomCalcFor}
                  shortfallAmount={shortfallAmount}
                  currentAge={currentAge}
                  retirementAge={plan.retirementAge}
                  onAdd={addCustom}
                  onBack={() => setShowCustom(false)}
                />
              ) : (
                <>
                  {/* Preset recommendation options */}
                  {shortfallAmount > 0 && (
                    <>
                      <p className="text-hig-caption1 text-hig-text-secondary">
                        To achieve your objective, you could get on track by creating a plan with one of the following:
                      </p>

                      {/* 10-year monthly */}
                      <button
                        onClick={() => addPreset(tiers.tenYear.monthly, tiers.tenYear.years)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-hig-title3 text-hig-blue">Invest {formatRMFull(tiers.tenYear.monthly)}/mth</p>
                            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">for {tiers.tenYear.years} years</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-hig-blue/10 text-hig-blue font-medium shrink-0">Add</span>
                        </div>
                      </button>

                      {/* 20-year monthly */}
                      <button
                        onClick={() => addPreset(tiers.twentyYear.monthly, tiers.twentyYear.years)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-hig-title3 text-hig-blue">Invest {formatRMFull(tiers.twentyYear.monthly)}/mth</p>
                            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">for {tiers.twentyYear.years} years</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-hig-blue/10 text-hig-blue font-medium shrink-0">Add</span>
                        </div>
                      </button>

                      {/* One-time lump sum */}
                      <button
                        onClick={() => addPreset(0, tiers.oneTime.years, tiers.oneTime.lumpSum)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-hig-title3 text-hig-blue">Invest {formatRMFull(tiers.oneTime.lumpSum)} one-time</p>
                            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Today</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-hig-blue/10 text-hig-blue font-medium shrink-0">Add</span>
                        </div>
                      </button>

                      {/* Simulate Custom */}
                      <button
                        onClick={() => setShowCustom(true)}
                        className="w-full text-left p-3 rounded-hig-sm border border-dashed border-hig-gray-3 hover:border-hig-blue hover:bg-blue-50/20 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-hig-subhead font-medium">Simulate Custom Recommendation</p>
                            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Calculate for estimated value, monthly, lump sum, or interest rate.</p>
                          </div>
                          <span className="text-[10px] px-2 py-1 rounded-full bg-hig-gray-6 text-hig-text-secondary font-medium shrink-0">Build</span>
                        </div>
                      </button>
                    </>
                  )}

                  {/* Fully funded — still allow custom addition */}
                  {shortfallAmount === 0 && (
                    <button
                      onClick={() => setShowCustom(true)}
                      className="hig-btn-primary w-full gap-2"
                    >
                      <Plus size={16} /> Add New Recommendation
                    </button>
                  )}

                  {/* Flash */}
                  {savedFlash && (
                    <span className="text-hig-caption1 text-hig-green font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} /> Saved
                    </span>
                  )}
                </>
              )}

              {/* Added recommendations list — always visible below the form/presets */}
              {!showCustom && (plan.recommendations || []).map((rec, idx) => (
                <RecCard
                  key={rec.id}
                  rec={rec}
                  idx={idx}
                  showBreakdown={showBreakdownRec === rec.id}
                  currentAge={currentAge}
                  retirementAge={plan.retirementAge || 55}
                  onToggle={() => toggleRec(rec.id)}
                  onUpdate={(changes) => updateRec(rec.id, changes)}
                  onDeleteRequest={() => setDeleteConfirmRec({ id: rec.id, name: rec.name || `Recommendation ${idx + 1}` })}
                  onBreakdown={() => setShowBreakdownRec(showBreakdownRec === rec.id ? null : rec.id)}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* ── Provisions tab ── */}
          {activeTab === 'provisions' && (
            <ProvisionPanel plan={plan} currentAge={currentAge} onChange={onChange} />
          )}
        </div>
      </div>
    </div>

    {/* Planning Assumptions Modal */}
    {showAssumptions && !meetingMode && (
      <PlanningAssumptions
        plan={plan}
        currentAge={currentAge}
        onChange={onChange}
        onClose={() => onToggleAssumptions(false)}
      />
    )}

    {/* Delete Recommendation Confirmation Modal */}
    {deleteConfirmRec && (
      <DeleteConfirmModal
        name={deleteConfirmRec.name}
        onConfirm={() => removeRec(deleteConfirmRec.id)}
        onCancel={() => setDeleteConfirmRec(null)}
      />
    )}
    </>
  )
}

// ─── Inline TVM Calculator ────────────────────────────────────────────────────

function InlineTVM({ form, setForm, calcFor, setCalcFor, shortfallAmount, currentAge, retirementAge, onAdd, onBack }) {
  const { t } = useLanguage()
  const maxYears = Math.max(1, retirementAge - currentAge)

  const solved = useMemo(() => {
    try {
      return tvmSolve({
        fv:        calcFor === 'fv'   ? undefined : form.fv,
        pv:        form.pv,
        pmt:       form.pmt,
        rate:      calcFor === 'rate' ? undefined : form.rate,
        n:         form.n,
        frequency: 12,
      }, calcFor)
    } catch { return 0 }
  }, [form, calcFor])

  const TABS = [
    { key: 'fv',   label: 'Est. Value' },
    { key: 'pmt',  label: 'Monthly' },
    { key: 'pv',   label: 'Lump Sum' },
    { key: 'rate', label: 'Interest' },
  ]

  const solvedDisplay = calcFor === 'rate'
    ? `${Number.isFinite(solved) ? solved.toFixed(2) : '0.00'}%`
    : formatRMFull(Math.abs(solved || 0))

  const solvedLabel = {
    fv:   `Estimated Value at Age ${retirementAge}`,
    pmt:  'Monthly Contribution',
    pv:   'Lump Sum Today',
    rate: 'Growth Rate (p.a.)',
  }[calcFor]

  return (
    <div className="space-y-3">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-hig-caption1 text-hig-blue font-medium hover:underline">
        <ArrowLeft size={13} /> Back
      </button>
      <p className="text-hig-subhead font-semibold">Simulate Custom Recommendation</p>

      {/* Calculate for tabs */}
      <div>
        <p className="text-hig-caption2 text-hig-text-secondary mb-1">Calculate for</p>
        <div className="flex bg-hig-gray-6 rounded-hig-sm p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCalcFor(tab.key)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-hig-sm transition-colors
                ${calcFor === tab.key ? 'bg-hig-blue text-white' : 'text-hig-text-secondary'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Solved result */}
      <div className="rounded-hig-sm bg-blue-50 p-3">
        <p className="text-hig-caption2 text-hig-text-secondary font-medium">{solvedLabel}</p>
        <p className="text-hig-title3 text-hig-blue mt-0.5">{solvedDisplay}</p>
      </div>

      {/* Shortfall shortcut */}
      {calcFor !== 'fv' && shortfallAmount > 0 && (
        <button
          onClick={() => setForm({ ...form, fv: shortfallAmount })}
          className="text-hig-caption1 text-hig-blue font-medium hover:underline"
        >
          Use shortfall {formatRMFull(shortfallAmount)}
        </button>
      )}

      {/* Fields */}
      <div className="space-y-2">
        {calcFor !== 'fv' && (
          <div>
            <label className="hig-label">Estimated Value at Age {retirementAge}: RM</label>
            <input type="number" value={form.fv || ''} onChange={(e) => setForm({...form, fv: parseFloat(e.target.value) || 0})} className="hig-input" placeholder="0" />
          </div>
        )}
        {calcFor !== 'rate' && (
          <div>
            <label className="hig-label">Growth Rate (per year): %</label>
            <input type="number" step="0.5" value={form.rate} onChange={(e) => setForm({...form, rate: parseFloat(e.target.value) || 0})} className="hig-input" />
          </div>
        )}
        {calcFor !== 'pv' && (
          <div>
            <label className="hig-label">Lump Sum Contribution: RM</label>
            <input type="number" value={form.pv || ''} onChange={(e) => setForm({...form, pv: parseFloat(e.target.value) || 0})} className="hig-input" placeholder="0" />
            <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">One-time investment today</p>
          </div>
        )}
        {calcFor !== 'pmt' && (
          <div>
            <label className="hig-label">Monthly Contribution: RM/mth</label>
            <input type="number" value={form.pmt || ''} onChange={(e) => setForm({...form, pmt: parseFloat(e.target.value) || 0})} className="hig-input" placeholder="0" />
            <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">Monthly investment amount</p>
          </div>
        )}
        <div>
          <label className="hig-label">Investment Period: years</label>
          <input type="number" min={1} max={maxYears} value={form.n} onChange={(e) => setForm({...form, n: parseFloat(e.target.value) || 1})} className="hig-input" />
          <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
            Years of contributions from age {currentAge} to target age {Math.min(currentAge + (form.n || 1), retirementAge)}
          </p>
        </div>
      </div>

      <button onClick={onAdd} className="hig-btn-primary w-full">
        + Add to Plan
      </button>
    </div>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteConfirmModal({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm overflow-hidden rounded-hig-md bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-hig-gray-5">
          <p className="text-hig-subhead font-semibold">Delete Recommendation</p>
          <button onClick={onCancel} className="p-1 text-hig-text-secondary hover:text-hig-text rounded">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-4 py-4">
          <p className="text-hig-subhead text-hig-text">
            Are you sure you want to delete <strong>"{name}"</strong>?
          </p>
        </div>
        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 px-4 pb-4 sm:flex-row">
          <button onClick={onCancel} className="hig-btn-secondary flex-1">No</button>
          <button onClick={onConfirm} className="hig-btn-primary flex-1 bg-red-500 border-red-500 hover:bg-red-600">
            Yes, I am sure.
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Individual Recommendation Card ──────────────────────────────────────────

const CALC_FOR_TABS = [
  { key: 'fv',   label: 'Est. Value' },
  { key: 'pmt',  label: 'Monthly'    },
  { key: 'pv',   label: 'Lump Sum'   },
  { key: 'rate', label: 'Interest'   },
]

function RecCard({ rec, idx, showBreakdown, currentAge, retirementAge, onToggle, onUpdate, onDeleteRequest, onBreakdown, t }) {
  const [calcFor,    setCalcFor]    = useState('fv')
  const [optionOpen, setOptionOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameInput,  setNameInput]  = useState(rec.name || '')
  const optionRef = useRef(null)

  const recName = rec.name || `Recommendation ${idx + 1}`
  const yearsToRet = Math.max(1, retirementAge - currentAge)
  const contribYears = Math.min(rec.periodYears || 10, yearsToRet)
  const remainingYears = yearsToRet - contribYears
  const R = (rec.growthRate ?? 5) / 100
  const r = R / 12

  // Close option menu on outside click
  useEffect(() => {
    if (!optionOpen) return
    const handle = (e) => { if (optionRef.current && !optionRef.current.contains(e.target)) setOptionOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [optionOpen])

  // ── Solved value for the "Calculate For" display box ─────────────────────
  const solvedValue = useMemo(() => {
    const pmt  = rec.monthlyAmount || 0
    const ls   = rec.lumpSum || 0
    const rate = rec.growthRate ?? 5
    try {
      switch (calcFor) {
        case 'fv': {
          // Two-phase FV: annuity-due × annual growth for remaining
          let fv = 0
          if (pmt > 0) fv += recMonthlyFV(pmt, rate, contribYears, yearsToRet)
          if (ls  > 0) fv += Math.round(ls * Math.pow(1 + R, yearsToRet))
          return fv
        }
        case 'pmt': return recMonthlyPMT(rec.futureValue || 0, rate, contribYears, yearsToRet)
        case 'pv':  return recLumpSum(rec.futureValue || 0, rate, yearsToRet)
        case 'rate':
          return tvmSolve({ fv: rec.futureValue || 0, pmt, pv: ls, n: contribYears, frequency: 12 }, 'rate')
        default:    return 0
      }
    } catch { return 0 }
  }, [rec, calcFor, contribYears, yearsToRet, R])

  const solvedLabel = {
    fv:   `Estimated value at Age ${retirementAge}`,
    pmt:  'Monthly Contribution',
    pv:   'Lump Sum Today',
    rate: 'Growth Rate (p.a.)',
  }[calcFor]

  const solvedDisplay = calcFor === 'rate'
    ? `${Number.isFinite(solvedValue) ? solvedValue.toFixed(2) : '0.00'}%`
    : formatRMFull(Math.abs(solvedValue || 0))

  // ── Two-phase breakdown ───────────────────────────────────────────────────
  const breakdown = useMemo(() => {
    const pmt = rec.monthlyAmount || 0
    const ls  = rec.lumpSum || 0
    const rate = rec.growthRate ?? 5
    const n = contribYears * 12

    if (pmt > 0) {
      const fvOrd   = r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r)
      const fvPhase1 = fvOrd * (1 + r)                                   // annuity-due
      const fvPhase2 = fvPhase1 * Math.pow(1 + rate / 100, remainingYears)
      return {
        type: 'monthly',
        pmt, contribYears,
        fromAge: currentAge, toAge: currentAge + contribYears,
        fvPhase1, remainingYears, retirementAge, fvPhase2,
      }
    }
    if (ls > 0) {
      return {
        type: 'lumpSum',
        ls, years: yearsToRet,
        fv: ls * Math.pow(1 + rate / 100, yearsToRet),
      }
    }
    return null
  }, [rec, contribYears, remainingYears, yearsToRet, currentAge, retirementAge, r])

  // ── Rename save ───────────────────────────────────────────────────────────
  const saveRename = () => {
    const trimmed = nameInput.trim()
    onUpdate({ name: trimmed || undefined })
    setIsRenaming(false)
  }

  return (
    <div className={`border rounded-hig-sm overflow-hidden transition-colors ${rec.isSelected ? 'border-hig-blue' : 'border-hig-gray-4'}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
            ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3 hover:border-hig-blue'}`}
        >
          {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
        </button>

        {/* Name / Rename input */}
        {isRenaming ? (
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setIsRenaming(false) }}
            className="flex-1 text-hig-subhead font-medium border-b border-hig-blue outline-none bg-transparent"
          />
        ) : (
          <p className="flex-1 text-hig-subhead font-medium truncate">{recName}</p>
        )}

        {/* Option dropdown */}
        <div className="relative shrink-0" ref={optionRef}>
          <button
            onClick={() => setOptionOpen((v) => !v)}
            className="p-1 rounded hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-text transition-colors"
          >
            <MoreVertical size={15} />
          </button>
          {optionOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-hig-gray-4 rounded-hig-sm shadow-lg z-20 w-28 overflow-hidden">
              <button
                onClick={() => { setIsRenaming(true); setNameInput(rec.name || `Recommendation ${idx + 1}`); setOptionOpen(false) }}
                className="w-full text-left px-3 py-2 text-hig-caption1 hover:bg-hig-gray-6 transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => { setOptionOpen(false); onDeleteRequest() }}
                className="w-full text-left px-3 py-2 text-hig-caption1 text-hig-red hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="border-t border-hig-gray-5 p-3 space-y-3 bg-hig-gray-6/30">

        {/* Calculate For tabs */}
        <div>
          <p className="text-hig-caption2 text-hig-text-secondary mb-1 font-medium uppercase tracking-wide">Calculate For</p>
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-0.5">
            {CALC_FOR_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCalcFor(tab.key)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-hig-sm transition-colors
                  ${calcFor === tab.key ? 'bg-hig-blue text-white shadow-sm' : 'text-hig-text-secondary hover:text-hig-text'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Solved result box */}
        <div className="rounded-hig-sm bg-blue-50 border border-hig-blue/20 p-3">
          <p className="text-[10px] font-semibold text-hig-blue uppercase tracking-wide mb-0.5">{solvedLabel}</p>
          <p className="text-hig-title3 text-hig-blue">{solvedDisplay}</p>
        </div>

        {/* Editable fields */}
        <div className="space-y-2">
          {calcFor !== 'rate' && (
            <div className="flex items-center gap-2">
              <label className="hig-label mb-0 w-28 shrink-0">Growth Rate</label>
              <div className="flex-1 relative">
                <input
                  type="number" step="0.5" min={0} max={20}
                  value={rec.growthRate ?? 5}
                  onChange={(e) => onUpdate({ growthRate: parseFloat(e.target.value) || 0 })}
                  className="hig-input pr-6 py-1.5 text-hig-caption1"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">%</span>
              </div>
            </div>
          )}
          {calcFor !== 'pv' && (
            <div className="flex items-center gap-2">
              <label className="hig-label mb-0 w-28 shrink-0">Lump Sum</label>
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">RM</span>
                <input
                  type="number" min={0}
                  value={rec.lumpSum || ''}
                  onChange={(e) => onUpdate({ lumpSum: parseFloat(e.target.value) || 0 })}
                  className="hig-input pl-7 py-1.5 text-hig-caption1"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          {calcFor !== 'pmt' && (
            <div className="flex items-center gap-2">
              <label className="hig-label mb-0 w-28 shrink-0">Monthly</label>
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">RM</span>
                <input
                  type="number" min={0}
                  value={rec.monthlyAmount || ''}
                  onChange={(e) => onUpdate({ monthlyAmount: parseFloat(e.target.value) || 0 })}
                  className="hig-input pl-7 pr-10 py-1.5 text-hig-caption1"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">/mth</span>
              </div>
            </div>
          )}
          {calcFor !== 'fv' && (
            <div className="flex items-center gap-2">
              <label className="hig-label mb-0 w-28 shrink-0">Target Value</label>
              <div className="flex-1 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">RM</span>
                <input
                  type="number" min={0}
                  value={rec.futureValue || ''}
                  onChange={(e) => onUpdate({ futureValue: parseFloat(e.target.value) || 0 })}
                  className="hig-input pl-7 py-1.5 text-hig-caption1"
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="hig-label mb-0 w-28 shrink-0">Period</label>
            <div className="flex-1 relative">
              <input
                type="number" min={1} max={yearsToRet}
                value={rec.periodYears || 10}
                onChange={(e) => onUpdate({ periodYears: Math.max(1, Math.min(yearsToRet, parseInt(e.target.value) || 1)) })}
                className="hig-input pr-10 py-1.5 text-hig-caption1"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption2">yrs</span>
            </div>
          </div>
        </div>

        {/* Breakdown toggle */}
        <button
          onClick={onBreakdown}
          className="w-full flex items-center justify-between text-hig-caption1 text-hig-blue font-medium py-1 hover:underline"
        >
          <span>{showBreakdown ? 'Hide' : 'Show'} Calculation Breakdown</span>
          {showBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Breakdown content */}
        {showBreakdown && breakdown && (
          <div className="rounded-hig-sm bg-white border border-hig-gray-5 p-3 space-y-2 text-hig-caption1">
            {breakdown.type === 'monthly' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-hig-text-secondary">Monthly Contribution</span>
                  <span className="font-semibold">{formatRMFull(breakdown.pmt)}/mth</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hig-text-secondary">Contribution Period</span>
                  <span className="font-semibold">{breakdown.contribYears} yrs (age {breakdown.fromAge} to {breakdown.toAge})</span>
                </div>
                <div className="border-t border-hig-gray-6 pt-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-hig-text-secondary">FV at End of Period (Age {breakdown.toAge})</p>
                      <p className="text-hig-caption2 text-hig-text-secondary italic">compounded monthly</p>
                    </div>
                    <span className="font-semibold text-right">{formatRMFull(Math.round(breakdown.fvPhase1))}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-hig-text-secondary">Holding Period</span>
                  <span className="font-semibold">{breakdown.remainingYears} yrs (age {breakdown.toAge} to {breakdown.retirementAge})</span>
                </div>
                <div className="border-t border-hig-gray-6 pt-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-hig-text-secondary">FV after Holding (Age {breakdown.retirementAge})</p>
                      <p className="text-hig-caption2 text-hig-text-secondary italic">compounded annually</p>
                    </div>
                    <span className="font-semibold text-right text-hig-green">{formatRMFull(Math.round(breakdown.fvPhase2))}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-hig-text-secondary">Lump Sum Today</span>
                  <span className="font-semibold">{formatRMFull(breakdown.ls)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hig-text-secondary">Growth Period</span>
                  <span className="font-semibold">{breakdown.years} years</span>
                </div>
                <div className="border-t border-hig-gray-6 pt-2 flex justify-between">
                  <div>
                    <p className="text-hig-text-secondary">FV at Age {retirementAge}</p>
                    <p className="text-hig-caption2 text-hig-text-secondary italic">compounded annually</p>
                  </div>
                  <span className="font-semibold text-hig-green">{formatRMFull(Math.round(breakdown.fv))}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Provision Panel ───────────────────────────────────────────────────

function ProvisionPanel({ plan, currentAge, onChange }) {
  const { t } = useLanguage()
  const provisions     = plan.provisions || []
  const yearsToRetirement = Math.max(0, (plan.retirementAge || 55) - currentAge)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: 0, currentBalance: 0, frequency: 'Monthly', preRetirementReturn: 5 })

  const addProvision = () => {
    if (!form.name && !form.amount) return
    onChange({ provisions: [...provisions, { ...form, id: uid(), amount: parseFloat(form.amount) || 0, currentBalance: parseFloat(form.currentBalance) || 0 }] })
    setForm({ name: '', amount: 0, currentBalance: 0, frequency: 'Monthly', preRetirementReturn: 5 })
    setShowForm(false)
  }

  const removeProvision = (idx) => onChange({ provisions: provisions.filter((_, i) => i !== idx) })

  const totalProjected = useMemo(() =>
    provisions.reduce((sum, p) => {
      try { return sum + Math.round(projectProvision(p, yearsToRetirement)) } catch { return sum }
    }, 0),
    [provisions, yearsToRetirement]
  )

  const todayValue = provisions.reduce((s, p) =>
    s + (p.currentBalance || 0) + (p.frequency === 'One-Time' ? (p.amount || 0) : 0), 0)

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm((v) => !v)} className="hig-btn-secondary w-full gap-2 text-hig-caption1">
        <Plus size={14} /> {t('retirement.addEntry')}
      </button>

      {showForm && (
        <div className="border border-hig-blue/30 rounded-hig-sm p-3 bg-blue-50/20 space-y-2">
          <div>
            <label className="hig-label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="hig-input text-hig-caption1 py-1.5" placeholder="e.g. Unit Trust, ASNB" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="hig-label">Current Balance (RM)</label>
              <input type="number" value={form.currentBalance || ''} onChange={(e) => setForm({ ...form, currentBalance: parseFloat(e.target.value) || 0 })} className="hig-input text-hig-caption1 py-1.5" placeholder="0" />
            </div>
            <div>
              <label className="hig-label">Contribution (RM)</label>
              <input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="hig-input text-hig-caption1 py-1.5" placeholder="500" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="hig-label">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="hig-input text-hig-caption1 py-1.5">
                {PROVISION_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="hig-label">Expected Return %</label>
              <input type="number" step="0.5" value={form.preRetirementReturn} onChange={(e) => setForm({ ...form, preRetirementReturn: parseFloat(e.target.value) || 0 })} className="hig-input text-hig-caption1 py-1.5" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <button onClick={() => setShowForm(false)} className="hig-btn-secondary text-hig-caption1 flex-1">Cancel</button>
            <button onClick={addProvision}             className="hig-btn-primary text-hig-caption1 flex-1">Add</button>
          </div>
        </div>
      )}

      {provisions.length === 0 && !showForm ? (
        <p className="text-hig-caption1 text-hig-text-secondary text-center py-4">No provisions added yet.</p>
      ) : (
        <>
          {provisions.map((p, i) => (
            <div key={p.id} className="p-3 border border-hig-gray-4 rounded-hig-sm flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-hig-subhead font-medium truncate">{p.name || `Provision ${i + 1}`}</p>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {formatRMFull(p.amount)} {p.frequency} @ {p.preRetirementReturn}%
                </p>
                {(p.currentBalance || 0) > 0 && (
                  <p className="text-hig-caption2 text-hig-text-secondary">Balance: {formatRMFull(p.currentBalance)}</p>
                )}
              </div>
              <button onClick={() => removeProvision(i)} className="p-1 text-hig-text-secondary hover:text-hig-red shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}

          {provisions.length > 0 && (
            <div className="rounded-hig-sm bg-hig-gray-6 p-3 space-y-1.5 text-hig-caption1">
              <div className="flex justify-between">
                <span className="text-hig-text-secondary">Today's Value</span>
                <span className="font-semibold">{formatRMFull(todayValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hig-text-secondary">Projected at Age {plan.retirementAge}</span>
                <span className="font-semibold text-hig-green">{formatRMFull(totalProjected)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
