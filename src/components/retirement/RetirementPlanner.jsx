import { useState, useMemo } from 'react'
import { formatRMFull, generateRetirementProjection, tvmSolve, generateBreakdown } from '../../lib/calculations'
import { Settings, Plus, ChevronDown, ChevronUp, Trash2, CheckCircle2, AlertTriangle, XCircle, Maximize2, MoreVertical } from 'lucide-react'
import RetirementChart from './RetirementChart'
import PlanningAssumptions from './PlanningAssumptions'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

export default function RetirementPlanner({ plan, currentAge, contactName, onChange, onEditAssumptions }) {
  const [activeTab, setActiveTab] = useState('recommendations') // recommendations | provisions
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [expandedRec, setExpandedRec] = useState(null)
  const [showBreakdown, setShowBreakdown] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customCalcFor, setCustomCalcFor] = useState('fv') // fv | pmt | pv | rate

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
        postRetirementReturn: plan.postRetirementReturn ?? 1,
        includeEPF: plan.includeEPF || false,
        epfBalance: plan.epfBalance || 0,
        epfGrowthRate: plan.epfGrowthRate ?? 6,
        annualIncome: plan.annualIncome || 0,
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

  const statusColor = projection.isFullyFunded
    ? 'hig-green'
    : projection.coveragePercent >= 75
      ? 'hig-orange'
      : 'hig-red'

  const statusLabel = projection.isFullyFunded
    ? 'On Track'
    : projection.coveragePercent >= 75
      ? 'Progressing'
      : 'At Risk'

  // Recommendation presets
  const addPresetRecommendation = (monthlyAmount, years, lumpSum = 0) => {
    const rec = {
      id: uid(),
      type: 'preset',
      monthlyAmount,
      periodYears: years,
      lumpSum,
      growthRate: 5,
      isSelected: false,
    }
    onChange({ recommendations: [...(plan.recommendations || []), rec] })
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
  }

  const toggleRecommendation = (recId) => {
    const recs = (plan.recommendations || []).map((r) =>
      r.id === recId ? { ...r, isSelected: !r.isSelected } : r
    )
    onChange({ recommendations: recs })
  }

  const removeRecommendation = (recId) => {
    onChange({ recommendations: (plan.recommendations || []).filter((r) => r.id !== recId) })
  }

  // Preset suggestions — wrapped in try/catch since TVM can produce NaN with edge inputs
  const shortfallAmount = projection.shortfall || 0
  let suggestedMonthly10 = 0, suggestedMonthly20 = 0, suggestedLumpSum = 0
  try {
    const yearsToRet = Math.max(1, (plan.retirementAge || 55) - currentAge)
    if (shortfallAmount > 0) {
      suggestedMonthly10 = Math.round(tvmSolve({ fv: shortfallAmount, pv: 0, rate: 5, n: Math.min(10, yearsToRet), frequency: 12 }, 'pmt')) || 0
      suggestedMonthly20 = Math.round(tvmSolve({ fv: shortfallAmount, pv: 0, rate: 5, n: Math.min(20, yearsToRet), frequency: 12 }, 'pmt')) || 0
      suggestedLumpSum = Math.round(tvmSolve({ fv: shortfallAmount, pmt: 0, rate: 5, n: yearsToRet, frequency: 12 }, 'pv')) || 0
    }
  } catch (e) {
    console.error('TVM suggestion error:', e)
  }

  const selectedRecs = (plan.recommendations || []).filter((r) => r.isSelected)

  return (
    <div>
      {/* Top Summary Bar */}
      <div className="hig-card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-8">
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
                {projection.isFullyFunded ? '+' : '-'}{formatRMFull(projection.isFullyFunded ? projection.surplus : projection.shortfall)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress badge */}
            <div className="flex items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-hig-subhead
                bg-${statusColor}`}
                style={{ backgroundColor: projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30' }}
              >
                {projection.coveragePercent}%
              </div>
              <span className="text-hig-subhead font-medium" style={{ color: projection.isFullyFunded ? '#34C759' : projection.coveragePercent >= 75 ? '#FF9500' : '#FF3B30' }}>
                {statusLabel}
              </span>
            </div>

            {/* Planning Assumptions button */}
            <button
              onClick={() => setShowAssumptions(true)}
              className="hig-btn-ghost gap-1.5 text-hig-blue"
            >
              <Settings size={16} /> Planning Assumptions
            </button>
          </div>
        </div>

        <p className="text-hig-caption1 text-hig-text-secondary mt-2">
          Retirement Expense: {formatRMFull(projection.monthlyAtRetirement)} per month from age {plan.retirementAge} at {plan.inflationRate}% for {projection.retirementDuration} years
        </p>

        <div className="flex items-center gap-4 mt-2 text-hig-caption1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-hig-green inline-block"></span>
            Existing {formatRMFull(projection.epfAtRetirement + projection.provisionsAtRetirement)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-hig-blue inline-block"></span>
            Recommended {formatRMFull(projection.recommendationsAtRetirement)}
          </span>
        </div>

        {/* Status message */}
        <div className={`mt-3 p-3 rounded-hig-sm flex items-center gap-2 text-hig-subhead
          ${projection.isFullyFunded ? 'bg-green-50 text-hig-green' : projection.coveragePercent >= 75 ? 'bg-orange-50 text-hig-orange' : 'bg-red-50 text-hig-red'}`}>
          {projection.isFullyFunded ? (
            <><CheckCircle2 size={18} /> You have more than enough to meet your goal. Consider reallocating the surplus to other financial objectives.</>
          ) : projection.coveragePercent >= 75 ? (
            <><AlertTriangle size={18} /> You're almost there! A small adjustment could help you reach your goal completely.</>
          ) : (
            <><XCircle size={18} /> There's a significant gap in your retirement plan. Let's explore options to bridge it.</>
          )}
        </div>
      </div>

      {/* Main Content: Chart + Panel */}
      <div className="flex gap-4">
        {/* Left: Chart + Situation */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Chart */}
          <div className="hig-card p-5">
            <RetirementChart
              data={projection.chartData}
              retirementAge={plan.retirementAge}
              targetAmount={projection.targetAmount}
              hasRecommendations={selectedRecs.length > 0}
            />
          </div>

          {/* Current Situation / With Recommendation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="hig-card p-4">
              <h4 className="text-hig-subhead font-semibold mb-2">Current Situation</h4>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={20} className="text-hig-red" />
                <span className="text-hig-title3">
                  {projection.fundsRunOutAge >= plan.lifeExpectancy ? `${plan.lifeExpectancy}+` : projection.fundsRunOutAge} yo
                </span>
              </div>
              <p className="text-hig-caption1 text-hig-text-secondary">
                {projection.fundsRunOutAge >= plan.lifeExpectancy
                  ? 'Your funds should last through your retirement years.'
                  : `At current levels, your funds will run out at age ${projection.fundsRunOutAge}. You are at ${projection.coveragePercent}% of your retirement goal.`}
              </p>
            </div>

            <div className="hig-card p-4">
              <h4 className="text-hig-subhead font-semibold mb-2">With Recommendation</h4>
              {selectedRecs.length === 0 ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-hig-orange" />
                  <p className="text-hig-subhead text-hig-text-secondary">
                    No Recommendation Selected
                  </p>
                </div>
              ) : projection.isFullyFunded ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={20} className="text-hig-green" />
                    <span className="text-hig-subhead font-semibold text-hig-green">Fully Funded</span>
                  </div>
                  <p className="text-hig-caption1 text-hig-green bg-green-50 rounded-hig-sm p-2">
                    Your retirement is fully funded. You will have sufficient funds throughout your retirement years.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={20} className="text-hig-orange" />
                    <span className="text-hig-title3">{projection.fundsRunOutWithRec} yo</span>
                  </div>
                  <p className="text-hig-caption1 text-hig-text-secondary">
                    At current levels, your funds will run out at age {projection.fundsRunOutWithRec}. You are at {projection.coveragePercent}% of your retirement goal.
                  </p>
                </>
              )}
              {selectedRecs.length === 0 && (
                <p className="text-hig-caption1 text-hig-text-secondary mt-2">
                  Add a recommendation to see how it improves your situation.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Recommendations / Provisions Panel */}
        <div className="w-80 shrink-0">
          {/* Tab toggle */}
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-3">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors
                ${activeTab === 'recommendations' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              Recommendations {(plan.recommendations || []).length > 0 && (
                <span className="ml-1 text-hig-caption2 bg-hig-blue text-white px-1.5 py-0.5 rounded-full">
                  {(plan.recommendations || []).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('provisions')}
              className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors
                ${activeTab === 'provisions' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              Provisions
            </button>
          </div>

          <div className="hig-card p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {activeTab === 'recommendations' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="hig-btn-primary w-full gap-2"
                >
                  <Plus size={16} /> Add New Recommendation
                </button>

                {shortfallAmount > 0 && (plan.recommendations || []).length === 0 && (
                  <p className="text-hig-caption1 text-hig-text-secondary">
                    To achieve your objective, you could get on track by creating a plan with one of the following:
                  </p>
                )}

                {/* Preset suggestions */}
                {shortfallAmount > 0 && (
                  <div className="space-y-2">
                    {suggestedMonthly10 > 0 && (
                      <button
                        onClick={() => addPresetRecommendation(suggestedMonthly10, 10)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <p className="text-hig-subhead font-medium">Invest {formatRMFull(suggestedMonthly10)}/mth</p>
                        <p className="text-hig-caption1 text-hig-text-secondary">for 10 years</p>
                      </button>
                    )}
                    {suggestedMonthly20 > 0 && (
                      <button
                        onClick={() => addPresetRecommendation(suggestedMonthly20, 20)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <p className="text-hig-subhead font-medium">Invest {formatRMFull(suggestedMonthly20)}/mth</p>
                        <p className="text-hig-caption1 text-hig-text-secondary">for 20 years</p>
                      </button>
                    )}
                    {suggestedLumpSum > 0 && (
                      <button
                        onClick={() => addPresetRecommendation(0, plan.retirementAge - currentAge, suggestedLumpSum)}
                        className="w-full text-left p-3 rounded-hig-sm border border-hig-gray-4 hover:border-hig-blue hover:bg-blue-50/30 transition-colors"
                      >
                        <p className="text-hig-subhead font-medium">Invest {formatRMFull(suggestedLumpSum)} one-time</p>
                        <p className="text-hig-caption1 text-hig-text-secondary">today</p>
                      </button>
                    )}
                  </div>
                )}

                {/* Added recommendations */}
                {(plan.recommendations || []).map((rec, idx) => (
                  <div key={rec.id} className="border border-hig-gray-4 rounded-hig-sm overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {/* Selection radio */}
                      <button
                        onClick={() => toggleRecommendation(rec.id)}
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                          ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3'}`}
                      >
                        {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-hig-subhead font-medium">Recommendation {idx + 1}</p>
                        <p className="text-hig-caption1 text-hig-text-secondary truncate">
                          {rec.lumpSum && !rec.monthlyAmount
                            ? `Lumpsum ${formatRMFull(rec.lumpSum)} @ ${rec.growthRate}%`
                            : `${formatRMFull(rec.monthlyAmount)}/mth for ${rec.periodYears} years @ ${rec.growthRate}%`}
                        </p>
                      </div>

                      <button
                        onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                        className="p-1 text-hig-text-secondary hover:text-hig-text"
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        onClick={() => removeRecommendation(rec.id)}
                        className="p-1 text-hig-text-secondary hover:text-hig-red"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Expanded: show breakdown */}
                    {expandedRec === rec.id && (
                      <div className="border-t border-hig-gray-5 p-3 bg-hig-gray-6">
                        <button
                          onClick={() => setShowBreakdown(showBreakdown === rec.id ? null : rec.id)}
                          className="hig-btn-ghost text-hig-caption1 w-full"
                        >
                          {showBreakdown === rec.id ? 'Hide' : 'Show'} Calculation Breakdown
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
              <div className="space-y-3">
                {(plan.provisions || []).length === 0 ? (
                  <p className="text-hig-subhead text-hig-text-secondary text-center py-4">
                    No existing provisions.
                  </p>
                ) : (
                  plan.provisions.map((p, i) => (
                    <div key={p.id} className="p-3 border border-hig-gray-4 rounded-hig-sm">
                      <p className="text-hig-subhead font-medium">{p.name || `Provision ${i + 1}`}</p>
                      <p className="text-hig-caption1 text-hig-text-secondary">
                        {formatRMFull(p.amount)} {p.frequency} @ {p.preRetirementReturn}%
                      </p>
                    </div>
                  ))
                )}
              </div>
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
          onClose={() => setShowAssumptions(false)}
        />
      )}
    </div>
  )
}

// ─── TVM Calculator Modal ───────────────────────────────────────────────────

function CustomRecommendationModal({ form, setForm, calcFor, setCalcFor, shortfallAmount, currentAge, retirementAge, onAdd, onClose }) {
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
    fv: { title: 'ESTIMATED VALUE AT AGE ' + retirementAge, color: 'bg-green-50 text-hig-green' },
    pmt: { title: 'REQUIRED MONTHLY CONTRIBUTION', color: 'bg-teal-50 text-teal-700' },
    pv: { title: 'REQUIRED LUMP SUM', color: 'bg-teal-50 text-teal-700' },
    rate: { title: 'REQUIRED INVESTMENT RETURN RATE', color: 'bg-teal-50 text-teal-700' },
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-hig-title3 mb-4">Simulate Custom Recommendation</h2>

        {/* Calculate For tabs */}
        <div className="mb-4">
          <p className="text-hig-caption1 text-hig-text-secondary mb-2">Calculate For</p>
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-1">
            {[
              { key: 'fv', label: 'Est. Value' },
              { key: 'pmt', label: 'Monthly' },
              { key: 'pv', label: 'Lump Sum' },
              { key: 'rate', label: 'Interest' },
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
            {calcFor === 'rate' ? `${solved.toFixed(2)}%` : formatRMFull(solved)}
          </p>
        </div>

        {/* Shortfall shortcut */}
        {calcFor !== 'fv' && shortfallAmount > 0 && (
          <button
            onClick={() => setForm({ ...form, fv: shortfallAmount })}
            className="text-hig-caption1 text-hig-blue font-medium mb-3 hover:underline"
          >
            Use Shortfall Amount ({formatRMFull(shortfallAmount)})
          </button>
        )}

        {/* Input fields — hide the one being solved */}
        <div className="space-y-3">
          {calcFor !== 'fv' && (
            <div>
              <label className="hig-label">Target Value (FV)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.fv || ''} onChange={(e) => setForm({...form, fv: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
              </div>
            </div>
          )}

          {calcFor !== 'rate' && (
            <div>
              <label className="hig-label">Growth Rate (per year)</label>
              <div className="relative">
                <input type="number" step="0.5" value={form.rate} onChange={(e) => setForm({...form, rate: parseFloat(e.target.value) || 0})} className="hig-input pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
              </div>
            </div>
          )}

          {calcFor !== 'pv' && (
            <div>
              <label className="hig-label">Lump Sum Contribution</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.pv || ''} onChange={(e) => setForm({...form, pv: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
              </div>
              <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">One-time investment today</p>
            </div>
          )}

          {calcFor !== 'pmt' && (
            <div>
              <label className="hig-label">Monthly Contribution</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={form.pmt || ''} onChange={(e) => setForm({...form, pmt: parseFloat(e.target.value) || 0})} className="hig-input pl-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">/mth</span>
              </div>
            </div>
          )}

          <div>
            <label className="hig-label">Investment Contribution Period</label>
            <div className="relative">
              <input type="number" min={1} max={maxYears} value={form.n} onChange={(e) => setForm({...form, n: parseInt(e.target.value) || 1})} className="hig-input pr-16" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">years</span>
            </div>
            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
              Years of monthly contributions from age {currentAge} to target age at {retirementAge} (max {maxYears} years)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={onAdd} className="hig-btn-primary">Add Recommendation</button>
        </div>
      </div>
    </div>
  )
}

// ─── Calculation Breakdown Table ────────────────────────────────────────────

function BreakdownTable({ rec, startAge }) {
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
      <h4 className="text-hig-subhead font-semibold mb-2">Investment Growth Projection</h4>
      <table className="w-full">
        <thead>
          <tr className="border-b border-hig-gray-4 text-left text-hig-text-secondary">
            <th className="py-1.5 pr-2">Age</th>
            <th className="py-1.5 pr-2">Payment</th>
            <th className="py-1.5 pr-2">Accumulated Capital</th>
            <th className="py-1.5">Projected Value</th>
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
