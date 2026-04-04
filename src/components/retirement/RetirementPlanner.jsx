import { useState, useMemo, useCallback, useRef } from 'react'
import { formatRMFull, generateRetirementProjection, tvmSolve, generateBreakdown, projectProvision } from '../../lib/calculations'
import { Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, AlertTriangle, XCircle, Maximize2, ArrowLeft } from 'lucide-react'
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
}) {
  const { t } = useLanguage()
  const setActiveTab = onActiveTabChange

  const [expandedRec,   setExpandedRec]   = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(null)
  const [showCustom,    setShowCustom]    = useState(false)   // inline TVM form
  const [customCalcFor, setCustomCalcFor] = useState('fv')
  const [savedFlash,    setSavedFlash]    = useState(false)
  const saveTimer = useRef(null)

  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }, [])

  const [customForm, setCustomForm] = useState({ fv: 0, rate: 5, pv: 0, pmt: 0, n: 10 })

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
  const statusBg    = projection.isFullyFunded ? 'bg-green-50 text-hig-green' : projection.coveragePercent >= 75 ? 'bg-orange-50 text-hig-orange' : 'bg-red-50 text-hig-red'
  const statusColor = projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30'
  const statusLabel = projection.isFullyFunded ? t('retirement.onTrack') : projection.coveragePercent >= 75 ? t('retirement.progressing') : t('retirement.atRisk')

  // ── Recommendation tiers ───────────────────────────────────────────────────
  const tiers = useMemo(() => {
    const yearsToRet = Math.max(1, (plan.retirementAge || 55) - currentAge)
    const y10 = Math.min(10, yearsToRet)

    const pmt = (shortfall, years) => {
      if (!shortfall || years <= 0) return 0
      return Math.max(0, Math.round(tvmSolve({ fv: shortfall, pv: 0, rate: 5, n: years, frequency: 12 }, 'pmt')) || 0)
    }
    const lump = (shortfall, years) => {
      if (!shortfall || years <= 0) return 0
      return Math.abs(Math.round(tvmSolve({ fv: shortfall, pmt: 0, rate: 5, n: years, frequency: 12 }, 'pv')) || 0)
    }

    return {
      tenYear:        { monthly: pmt(shortfallAmount, y10),       years: y10,       lumpSum: 0 },
      untilRetirement:{ monthly: pmt(shortfallAmount, yearsToRet), years: yearsToRet, lumpSum: 0 },
      oneTime:        { monthly: 0,                               years: yearsToRet, lumpSum: lump(shortfallAmount, yearsToRet) },
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

  const removeRec = (id) => {
    if (!window.confirm(t('retirement.removeRecConfirm'))) return
    onChange({ recommendations: (plan.recommendations || []).filter((r) => r.id !== id) })
    flashSaved()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex gap-4 items-start">

      {/* ── Left: Summary + Chart + Situation ────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">

        {/* Summary bar */}
        <div className="hig-card p-4">
          <div className="flex items-start justify-between gap-4">
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
              <RetirementExportButton plan={plan} projection={projection} contact={{ name: contactName, currentAge }} />
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

          <div className={`mt-2.5 px-3 py-2 rounded-hig-sm flex items-center gap-2 text-hig-caption1 ${statusBg}`}>
            {projection.isFullyFunded
              ? <><CheckCircle2 size={14} /> {projection.coveragePercent}% Achieved · {statusLabel}</>
              : projection.coveragePercent >= 75
                ? <><AlertTriangle size={14} /> {projection.coveragePercent}% Achieved · {statusLabel}</>
                : <><XCircle size={14} /> {projection.coveragePercent}% Achieved · {statusLabel}</>}
          </div>
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
        <div className="grid grid-cols-2 gap-3">
          {/* Current Situation */}
          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">Current Situation</h4>
            <div className="flex items-center gap-2 mb-1.5">
              {projection.fundsRunOutAge >= plan.lifeExpectancy
                ? <CheckCircle2 size={18} className="text-hig-green" />
                : <AlertTriangle size={18} className="text-hig-red" />}
              <span className={`text-hig-title3 ${projection.fundsRunOutAge >= plan.lifeExpectancy ? 'text-hig-green' : 'text-hig-red'}`}>
                {projection.fundsRunOutAge >= plan.lifeExpectancy ? `${plan.lifeExpectancy}+ yo` : `${projection.fundsRunOutAge} yo`}
              </span>
            </div>
            <p className="text-hig-caption1 text-hig-text-secondary">
              {projection.fundsRunOutAge >= plan.lifeExpectancy
                ? 'Funds will last through to your life expectancy.'
                : `Funds will run out at age ${projection.fundsRunOutAge}.`}
            </p>
          </div>

          {/* With Recommendation */}
          <div className="hig-card p-4">
            <h4 className="text-hig-subhead font-semibold mb-2">With Recommendation</h4>
            {selectedRecs.length === 0 ? (
              <>
                <p className="text-hig-subhead text-hig-text-secondary font-medium mb-1">No Recommendation Selected</p>
                <p className="text-hig-caption1 text-hig-text-secondary">Add a recommendation to see how it improves your situation.</p>
              </>
            ) : projection.isFullyFunded || projection.fundsRunOutWithRec >= plan.lifeExpectancy ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={18} className="text-hig-green" />
                  <span className="text-hig-subhead font-semibold text-hig-green">Fully Funded</span>
                </div>
                <p className="text-hig-caption1 text-hig-green bg-green-50 rounded-hig-sm p-2">
                  Your retirement is fully funded. You will have sufficient funds for retirement.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={18} className="text-hig-orange" />
                  <span className="text-hig-title3">{projection.fundsRunOutWithRec} yo</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  At current levels, your funds will run out at age {projection.fundsRunOutWithRec}. You are at {projection.coveragePercent}% of your retirement goal.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Recommendations / Provisions ──────────────────────────── */}
      <div className="w-72 lg:w-80 shrink-0">
        <div className="hig-card p-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-0">

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

                      {/* Monthly until retirement */}
                      <button
                        onClick={() => addPreset(tiers.untilRetirement.monthly, tiers.untilRetirement.years)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-hig-title3 text-hig-blue">Invest {formatRMFull(tiers.untilRetirement.monthly)}/mth</p>
                            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">for {tiers.untilRetirement.years} years</p>
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
                  expanded={expandedRec === rec.id}
                  showBreakdown={showBreakdown === rec.id}
                  currentAge={currentAge}
                  onToggle={() => toggleRec(rec.id)}
                  onRemove={() => removeRec(rec.id)}
                  onExpand={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                  onBreakdown={() => setShowBreakdown(showBreakdown === rec.id ? null : rec.id)}
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

// ─── Individual Recommendation Card ──────────────────────────────────────────

function RecCard({ rec, idx, expanded, showBreakdown, currentAge, onToggle, onRemove, onExpand, onBreakdown, t }) {
  return (
    <div className="border border-hig-gray-4 rounded-hig-sm overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
            ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3'}`}
        >
          {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-hig-subhead font-medium">Recommendation {idx + 1}</p>
          <p className="text-hig-caption1 text-hig-text-secondary truncate">
            {rec.lumpSum > 0 && !rec.monthlyAmount
              ? `${formatRMFull(rec.lumpSum)} one-time @ ${rec.growthRate}% for ${rec.periodYears}y`
              : `${formatRMFull(rec.monthlyAmount)}/mth @ ${rec.growthRate}% for ${rec.periodYears}y`}
          </p>
        </div>
        <button onClick={onExpand} className="p-1 text-hig-text-secondary hover:text-hig-text"><Maximize2 size={14} /></button>
        <button onClick={onRemove} className="p-1 text-hig-text-secondary hover:text-hig-red"><Trash2 size={14} /></button>
      </div>
      {expanded && (
        <div className="border-t border-hig-gray-5 p-3 bg-hig-gray-6">
          <button
            onClick={onBreakdown}
            className="hig-btn-ghost text-hig-caption1 w-full flex items-center justify-center gap-1"
          >
            {showBreakdown ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Show</>} calculation breakdown
          </button>
          {showBreakdown && (
            <div className="mt-3 overflow-x-auto">
              <BreakdownTable rec={rec} startAge={currentAge} />
            </div>
          )}
        </div>
      )}
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="hig-label">Current Balance (RM)</label>
              <input type="number" value={form.currentBalance || ''} onChange={(e) => setForm({ ...form, currentBalance: parseFloat(e.target.value) || 0 })} className="hig-input text-hig-caption1 py-1.5" placeholder="0" />
            </div>
            <div>
              <label className="hig-label">Contribution (RM)</label>
              <input type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="hig-input text-hig-caption1 py-1.5" placeholder="500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
          <div className="flex gap-2 pt-1">
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

// ─── Breakdown Table ──────────────────────────────────────────────────────────

function BreakdownTable({ rec, startAge }) {
  const rows = useMemo(() => {
    try { return generateBreakdown(rec, startAge) || [] } catch { return [] }
  }, [rec, startAge])

  if (!rows.length) return null

  return (
    <table className="w-full text-hig-caption2 border-collapse">
      <thead>
        <tr className="text-hig-text-secondary border-b border-hig-gray-5">
          <th className="text-left py-1 pr-2">Age</th>
          <th className="text-right py-1 pr-2">Contribution</th>
          <th className="text-right py-1">Balance</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.age} className="border-b border-hig-gray-6">
            <td className="py-1 pr-2">{r.age}</td>
            <td className="text-right py-1 pr-2">{formatRMFull(r.contribution)}</td>
            <td className="text-right py-1 font-medium">{formatRMFull(r.balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
