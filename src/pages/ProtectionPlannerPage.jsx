import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { getAge } from '../lib/formatters'
import { formatRMFull, protectionNeed, generateProtectionSummary } from '../lib/calculations'
import { ArrowLeft, X, Plus, Trash2, CheckCircle2, AlertTriangle, Settings } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const RISKS = ['death', 'tpd', 'aci', 'eci']
const RISK_LABELS = {
  death: 'Death',
  tpd: 'Total Permanent Disability (TPD)',
  aci: 'Advanced Stage Critical Illness',
  eci: 'Early Stage Critical Illness',
}
const RISK_SHORT = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }
const RISK_COLOUR = { death: '#007AFF', tpd: '#FF9500', aci: '#AF52DE', eci: '#FF3B30' }

export default function ProtectionPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveProtectionPlan } = useContacts()
  const contact = contacts.find((c) => c.id === id)
  const currentAge = contact ? getAge(contact.dob) : 30

  const [step, setStep] = useState(1)
  const [showAssumptions, setShowAssumptions] = useState(false)

  const [plan, setPlan] = useState(
    contact?.protectionPlan || {
      needs: {
        death: { lumpSum: 0, monthly: 0, period: 20 },
        tpd:   { lumpSum: 0, monthly: 0, period: 20 },
        aci:   { lumpSum: 0, monthly: 0, period: 5 },
        eci:   { lumpSum: 0, monthly: 0, period: 3 },
      },
      existing: { death: 0, tpd: 0, aci: 0, eci: 0 },
      inflationRate: 4,
      returnRate: 1,
      recommendations: [],
    }
  )

  const updatePlan = (updates) => {
    setPlan((prev) => {
      const next = { ...prev, ...updates }
      saveProtectionPlan(id, next)
      return next
    })
  }

  const setNeed = (risk, field, value) => {
    updatePlan({
      needs: { ...plan.needs, [risk]: { ...plan.needs[risk], [field]: parseFloat(value) || 0 } },
    })
  }

  const setExisting = (risk, value) => {
    updatePlan({ existing: { ...plan.existing, [risk]: parseFloat(value) || 0 } })
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-hig-subhead text-hig-text-secondary">Contact not found</p>
      </div>
    )
  }

  // Breadcrumb
  const breadcrumb = (
    <div className="flex items-center gap-2 mb-4">
      <button onClick={() => navigate(`/contacts/${id}`)} className="hig-btn-ghost gap-1.5 -ml-3">
        <ArrowLeft size={16} /> {contact.name}
      </button>
      <span className="text-hig-text-secondary">/</span>
      <span className="text-hig-subhead font-medium">Wealth Protection</span>
    </div>
  )

  // Step indicator — compact pill style (matches RetirementPlannerPage)
  const stepIndicator = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-1.5">
        {[
          { n: 1, label: 'Needs Analysis' },
          { n: 2, label: 'Existing Coverage' },
          { n: 3, label: 'Planner' },
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center gap-1.5">
            {idx > 0 && <span className="w-5 h-px bg-hig-gray-4" />}
            <button
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-hig-caption1 font-medium transition-colors
                ${step === s.n
                  ? 'bg-hig-blue text-white'
                  : step > s.n
                    ? 'bg-hig-green/10 text-hig-green'
                    : 'bg-hig-gray-6 text-hig-text-secondary'
                }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${step === s.n ? 'bg-white/20 text-white' : step > s.n ? 'bg-hig-green text-white' : 'bg-hig-gray-4 text-hig-text-secondary'}`}>
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {step === 3 && (
        <button
          onClick={() => setShowAssumptions(true)}
          className="flex items-center gap-1.5 text-hig-caption1 font-medium text-hig-blue hover:text-blue-700 transition-colors"
        >
          <Settings size={14} /> Planning Assumptions
        </button>
      )}
    </div>
  )

  return (
    <div className="w-full">
      {breadcrumb}
      {stepIndicator}

      {step === 1 && (
        <ProtectionBasicInfo
          plan={plan}
          updatePlan={updatePlan}
          setNeed={setNeed}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ProtectionExistingCoverage
          plan={plan}
          setExisting={setExisting}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <ProtectionPlanner
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          updatePlan={updatePlan}
          showAssumptions={showAssumptions}
          onToggleAssumptions={setShowAssumptions}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  )
}

// ─── Step 1: Needs Analysis ───────────────────────────────────────────────────

function ProtectionBasicInfo({ plan, updatePlan, setNeed, onContinue }) {
  // Calculate totals for right-side summary
  const needsSummary = useMemo(() =>
    RISKS.map((risk) => ({
      risk,
      total: protectionNeed({
        lumpSum: plan.needs[risk]?.lumpSum || 0,
        monthlyExpenses: plan.needs[risk]?.monthly || 0,
        period: plan.needs[risk]?.period || 0,
        inflationRate: plan.inflationRate,
        returnRate: plan.returnRate,
      }),
    })),
    [plan.needs, plan.inflationRate, plan.returnRate]
  )

  const grandTotal = needsSummary.reduce((s, x) => s + x.total, 0)
  const anyFilled = RISKS.some((r) => plan.needs[r].lumpSum > 0 || plan.needs[r].monthly > 0)

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">Wealth Protection Needs Analysis</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-5">
            Estimate the coverage required if an unexpected event occurs.
            Lump Sum covers immediate obligations; monthly expenses sustain the family for the defined period.
          </p>

          <div className="space-y-4">
            {RISKS.map((risk) => (
              <div key={risk} className="border border-hig-gray-5 rounded-hig-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLOUR[risk] }}
                  />
                  <h4 className="text-hig-subhead font-semibold">{RISK_LABELS[risk]}</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="hig-label">Lump Sum (RM)</label>
                    <input
                      type="number"
                      value={plan.needs[risk].lumpSum || ''}
                      onChange={(e) => setNeed(risk, 'lumpSum', e.target.value)}
                      className="hig-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="hig-label">Monthly Expenses (RM)</label>
                    <input
                      type="number"
                      value={plan.needs[risk].monthly || ''}
                      onChange={(e) => setNeed(risk, 'monthly', e.target.value)}
                      className="hig-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="hig-label">Period (years)</label>
                    <input
                      type="number"
                      value={plan.needs[risk].period || ''}
                      onChange={(e) => setNeed(risk, 'period', e.target.value)}
                      className="hig-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planning Parameters */}
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">Planning Parameters</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-4">
            These affect how monthly expenses are discounted to arrive at the total coverage needed.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="hig-label">Inflation Rate (%)</label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={plan.inflationRate}
                onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })}
                className="hig-input"
              />
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">Increases effective coverage requirement over time.</p>
            </div>
            <div>
              <label className="hig-label">Investment Return Rate (%)</label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={plan.returnRate}
                onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })}
                className="hig-input"
              />
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">Return on payout invested — reduces coverage needed.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onContinue} className="hig-btn-primary">Continue</button>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-72 shrink-0">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">Coverage Summary</h3>

          {!anyFilled ? (
            <p className="text-hig-subhead text-hig-text-secondary">
              Fill in your needs to see the estimated coverage required.
            </p>
          ) : (
            <>
              <div className="bg-blue-50 rounded-hig-sm p-4">
                <p className="text-hig-caption1 text-hig-blue font-medium mb-1">Total Coverage Needed</p>
                <p className="text-hig-title2 text-hig-blue">{formatRMFull(grandTotal)}</p>
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  Across all 4 risk categories
                </p>
              </div>

              <div className="space-y-2">
                {needsSummary.map(({ risk, total }) => (
                  <div key={risk} className="flex items-center justify-between py-2 border-b border-hig-gray-6 last:border-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: RISK_COLOUR[risk] }}
                      />
                      <span className="text-hig-subhead text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                    </div>
                    <span className="text-hig-subhead font-semibold">{formatRMFull(total)}</span>
                  </div>
                ))}
              </div>

              <hr className="border-hig-gray-5" />

              <div className="space-y-1.5 text-hig-caption1 text-hig-text-secondary">
                <p>Based on: Lump Sum + PV of inflation-adjusted monthly expenses</p>
                <p>Inflation: {plan.inflationRate}% · Return: {plan.returnRate}%</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Existing Coverage ────────────────────────────────────────────────

function ProtectionExistingCoverage({ plan, setExisting, onBack, onContinue }) {
  // Compute targets for reference
  const targets = useMemo(() =>
    Object.fromEntries(
      RISKS.map((risk) => [
        risk,
        protectionNeed({
          lumpSum: plan.needs[risk]?.lumpSum || 0,
          monthlyExpenses: plan.needs[risk]?.monthly || 0,
          period: plan.needs[risk]?.period || 0,
          inflationRate: plan.inflationRate,
          returnRate: plan.returnRate,
        }),
      ])
    ),
    [plan]
  )

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">Existing Coverage</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-5">
            Enter the total sum assured already in force for each risk category across all policies.
          </p>

          <div className="space-y-4">
            {RISKS.map((risk) => {
              const existing = plan.existing[risk] || 0
              const target = targets[risk] || 0
              const pct = target > 0 ? Math.min(100, Math.round((existing / target) * 100)) : 0
              const gap = Math.max(0, target - existing)

              return (
                <div key={risk} className="border border-hig-gray-5 rounded-hig-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                    <h4 className="text-hig-subhead font-semibold">{RISK_LABELS[risk]}</h4>
                    {target > 0 && (
                      <span className="ml-auto text-hig-caption1 text-hig-text-secondary">
                        Target: {formatRMFull(target)}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                    <input
                      type="number"
                      value={plan.existing[risk] || ''}
                      onChange={(e) => setExisting(risk, e.target.value)}
                      className="hig-input pl-10"
                      placeholder="0"
                    />
                  </div>

                  {target > 0 && (
                    <div className="mt-3">
                      <div className="h-2 bg-hig-gray-6 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pct >= 100 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-hig-caption2 text-hig-text-secondary">
                        <span>{pct}% covered</span>
                        {gap > 0 && <span className="text-hig-red">Gap: {formatRMFull(gap)}</span>}
                        {gap === 0 && existing > 0 && <span className="text-hig-green">Fully covered</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={onBack} className="hig-btn-ghost gap-1.5"><ArrowLeft size={16} /> Back</button>
          <button onClick={onContinue} className="hig-btn-primary">Continue</button>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-72 shrink-0">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">Coverage Gap</h3>
          <div className="space-y-3">
            {RISKS.map((risk) => {
              const existing = plan.existing[risk] || 0
              const target = targets[risk] || 0
              const gap = Math.max(0, target - existing)
              const pct = target > 0 ? Math.min(100, Math.round((existing / target) * 100)) : 0

              return (
                <div key={risk} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                      <span className="text-hig-caption1 text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                    </div>
                    <span className={`text-hig-caption1 font-semibold ${gap > 0 ? 'text-hig-red' : 'text-hig-green'}`}>
                      {gap > 0 ? `-${formatRMFull(gap)}` : 'OK'}
                    </span>
                  </div>
                  {target > 0 && (
                    <div className="h-1.5 bg-hig-gray-6 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 100 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Protection Planner ───────────────────────────────────────────────

function ProtectionPlanner({ plan, currentAge, contactName, updatePlan, showAssumptions, onToggleAssumptions, onBack }) {
  const [activeRisk, setActiveRisk] = useState('death')
  const [activeTab, setActiveTab] = useState('recommendations')

  const summary = useMemo(() =>
    generateProtectionSummary({
      needs: plan.needs,
      existing: plan.existing,
      inflationRate: plan.inflationRate,
      returnRate: plan.returnRate,
      recommendations: plan.recommendations,
    }),
    [plan]
  )

  const active = summary.find((s) => s.risk === activeRisk) || summary[0]
  // Active-risk recs always float to top, preserving insertion order within each group
  const allRecs = [...(plan.recommendations || [])].sort((a, b) => {
    const aMatch = a.riskType === activeRisk ? 0 : 1
    const bMatch = b.riskType === activeRisk ? 0 : 1
    return aMatch - bMatch
  })

  const addRecommendation = () => {
    const rec = {
      id: uid(),
      riskType: activeRisk,
      name: '',
      coverageAmount: active?.shortfall > 0 ? Math.round(active.shortfall) : 0,
      premiumAmount: 0,
      frequency: 'Monthly',
      periodYears: 20,
      isSelected: false,
    }
    updatePlan({ recommendations: [...(plan.recommendations || []), rec] })
  }

  const updateRec = (recId, updates) => {
    updatePlan({
      recommendations: (plan.recommendations || []).map((r) =>
        r.id === recId ? { ...r, ...updates } : r
      ),
    })
  }

  const toggleRec = (recId) => {
    updatePlan({
      recommendations: (plan.recommendations || []).map((r) =>
        r.id === recId ? { ...r, isSelected: !r.isSelected } : r
      ),
    })
  }

  const removeRec = (recId) => {
    updatePlan({ recommendations: (plan.recommendations || []).filter((r) => r.id !== recId) })
  }

  // Total premium of selected recs
  const totalMonthlyPremium = useMemo(() => {
    return (plan.recommendations || [])
      .filter((r) => r.isSelected)
      .reduce((sum, r) => {
        const freq = { Monthly: 1, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, Yearly: 1 / 12 }
        return sum + (r.premiumAmount || 0) * (freq[r.frequency] || 1)
      }, 0)
  }, [plan.recommendations])

  return (
    <>
      {/* Risk tabs */}
      <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-4">
        {RISKS.map((risk) => {
          const s = summary.find((x) => x.risk === risk)
          const isActive = activeRisk === risk
          // Dot colour: active = risk colour; inactive = coverage status
          const dotColour = isActive
            ? RISK_COLOUR[risk]
            : s?.coveragePercent >= 100 ? '#34C759'
            : s?.coveragePercent >= 50  ? '#FF9500'
            : '#FF3B30'
          return (
            <button
              key={risk}
              onClick={() => setActiveRisk(risk)}
              className={`flex-1 py-2.5 text-hig-subhead font-medium rounded-hig-sm transition-colors flex items-center justify-center gap-1.5
                ${isActive ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColour }} />
              {RISK_SHORT[risk]}
            </button>
          )
        })}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 items-start">
        {/* Left: Summary + Visualization */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Summary card */}
          <div className="hig-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-5 flex-wrap">
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">Target Coverage</p>
                  <p className="text-hig-title3">{formatRMFull(active.targetCoverage)}</p>
                </div>
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">Covered</p>
                  <p className="text-hig-title3 text-hig-green">{formatRMFull(active.totalCovered)}</p>
                </div>
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">
                    {active.surplus > 0 ? 'Surplus' : 'Shortfall'}
                  </p>
                  <p className={`text-hig-title3 ${active.surplus > 0 ? 'text-hig-green' : 'text-hig-red'}`}>
                    {active.surplus > 0 ? '+' : ''}{formatRMFull(active.surplus || active.shortfall)}
                  </p>
                </div>
              </div>

              {/* Progress badge */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-hig-caption1"
                  style={{
                    backgroundColor:
                      active.coveragePercent >= 100 ? '#34C759'
                      : active.coveragePercent >= 50  ? '#FF9500'
                      : '#FF3B30',
                  }}
                >
                  {active.coveragePercent}%
                </div>
              </div>
            </div>
          </div>

          {/* Coverage visualization */}
          <div className="hig-card p-5">
            <h3 className="text-hig-headline mb-4">{RISK_LABELS[activeRisk]} Coverage Breakdown</h3>

            <div className="space-y-5">
              {/* Target bar */}
              <CoverageBar
                label="Target Coverage"
                value={active.targetCoverage}
                max={active.targetCoverage}
                colour="#8E8E93"
                showFull
              />

              {/* Existing */}
              <CoverageBar
                label="Existing Coverage"
                value={active.existingCoverage}
                max={active.targetCoverage}
                colour="#34C759"
              />

              {/* Existing + Recommended */}
              <CoverageBar
                label="With Recommendations"
                value={active.totalCovered}
                max={active.targetCoverage}
                colour="#007AFF"
                segments={[
                  { value: active.existingCoverage, colour: '#34C759' },
                  { value: active.recommendedCoverage, colour: '#007AFF' },
                ]}
              />
            </div>

            {/* Status */}
            <div className="mt-4">
              {active.shortfall > 0 ? (
                <div className="bg-red-50 rounded-hig-sm p-3 flex items-center gap-2 text-hig-caption1 text-hig-red">
                  <AlertTriangle size={15} />
                  <span>
                    Gap of <strong>{formatRMFull(active.shortfall)}</strong> remains — add a recommendation to close it.
                  </span>
                </div>
              ) : active.targetCoverage > 0 ? (
                <div className="bg-green-50 rounded-hig-sm p-3 flex items-center gap-2 text-hig-caption1 text-hig-green">
                  <CheckCircle2 size={15} />
                  <span>Fully covered with <strong>{formatRMFull(active.surplus)}</strong> surplus.</span>
                </div>
              ) : (
                <div className="bg-hig-gray-6 rounded-hig-sm p-3 text-hig-caption1 text-hig-text-secondary">
                  No target set for {RISK_SHORT[activeRisk]}. Go to Step 1 to define your needs.
                </div>
              )}
            </div>
          </div>

          {/* Needs breakdown */}
          {(plan.needs[activeRisk]?.lumpSum > 0 || plan.needs[activeRisk]?.monthly > 0) && (
            <div className="hig-card p-4">
              <h3 className="text-hig-subhead font-semibold mb-3 text-hig-text-secondary">Needs Breakdown</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-hig-caption1 text-hig-text-secondary">Lump Sum</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(plan.needs[activeRisk]?.lumpSum || 0)}</p>
                </div>
                <div className="text-center border-x border-hig-gray-5">
                  <p className="text-hig-caption1 text-hig-text-secondary">Monthly × {plan.needs[activeRisk]?.period || 0} yrs</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(plan.needs[activeRisk]?.monthly || 0)}/mo</p>
                </div>
                <div className="text-center">
                  <p className="text-hig-caption1 text-hig-text-secondary">PV Total Need</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(active.targetCoverage)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Coverage by Age chart */}
          {plan.needs[activeRisk]?.period > 0 && (
            <CoverageAgeChart
              risk={activeRisk}
              currentAge={currentAge}
              lumpSum={plan.needs[activeRisk]?.lumpSum || 0}
              monthly={plan.needs[activeRisk]?.monthly || 0}
              period={plan.needs[activeRisk]?.period || 0}
              existing={plan.existing[activeRisk] || 0}
              withRecs={active.totalCovered || 0}
              inflationRate={plan.inflationRate}
              returnRate={plan.returnRate}
            />
          )}

          {/* Back navigation */}
          <div className="flex">
            <button onClick={onBack} className="hig-btn-ghost gap-1.5">
              <ArrowLeft size={16} /> Back to Existing Coverage
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 lg:w-80 shrink-0">
          <div className="hig-card p-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-0">
            {/* Tab bar */}
            <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-3">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors
                  ${activeTab === 'recommendations' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
              >
                Recommendations
              </button>
              <button
                onClick={() => setActiveTab('existing')}
                className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors
                  ${activeTab === 'existing' ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
              >
                Existing
              </button>
            </div>

            {activeTab === 'recommendations' && (
              <div className="space-y-3">
                <button onClick={addRecommendation} className="hig-btn-primary w-full gap-2">
                  <Plus size={15} /> Add Recommendation
                </button>

                {allRecs.length === 0 ? (
                  <p className="text-hig-subhead text-hig-text-secondary text-center py-3">
                    No recommendations yet. Add one to start filling gaps.
                  </p>
                ) : (
                  allRecs.map((rec) => (
                    <div key={rec.id} className="border border-hig-gray-4 rounded-hig-sm p-3 space-y-2.5">
                      {/* Header row: select toggle + delete */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRec(rec.id)}
                          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                            ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3'}`}
                        >
                          {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </button>
                        <span className={`text-hig-caption1 flex-1 font-medium ${rec.isSelected ? 'text-hig-blue' : 'text-hig-text-secondary'}`}>
                          {rec.isSelected ? 'Included in plan' : 'Include in plan'}
                        </span>
                        <button onClick={() => removeRec(rec.id)} className="text-hig-text-secondary hover:text-hig-red p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Risk type pills */}
                      <div>
                        <label className="text-hig-caption1 text-hig-text-secondary block mb-1.5">Risk Type</label>
                        <div className="flex gap-1 flex-wrap">
                          {RISKS.map((r) => (
                            <button
                              key={r}
                              onClick={() => updateRec(rec.id, { riskType: r })}
                              className={`px-2.5 py-1 rounded-full text-hig-caption2 font-medium transition-colors border
                                ${rec.riskType === r
                                  ? 'text-white border-transparent'
                                  : 'text-hig-text-secondary border-hig-gray-4 hover:border-hig-gray-3'
                                }`}
                              style={rec.riskType === r ? { backgroundColor: RISK_COLOUR[r] } : {}}
                            >
                              {RISK_SHORT[r]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Product name */}
                      <div>
                        <label className="text-hig-caption1 text-hig-text-secondary">Product / Plan Name</label>
                        <input
                          type="text"
                          value={rec.name || ''}
                          onChange={(e) => updateRec(rec.id, { name: e.target.value })}
                          className="hig-input mt-1 text-hig-subhead"
                          placeholder="Product / plan name"
                        />
                      </div>

                      {/* Coverage */}
                      <div>
                        <label className="text-hig-caption1 text-hig-text-secondary">Sum Assured (RM)</label>
                        <input
                          type="number"
                          value={rec.coverageAmount || ''}
                          onChange={(e) => updateRec(rec.id, { coverageAmount: parseFloat(e.target.value) || 0 })}
                          className="hig-input mt-1"
                        />
                      </div>

                      {/* Premium */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-hig-caption1 text-hig-text-secondary">Premium (RM)</label>
                          <input
                            type="number"
                            value={rec.premiumAmount || ''}
                            onChange={(e) => updateRec(rec.id, { premiumAmount: parseFloat(e.target.value) || 0 })}
                            className="hig-input mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-hig-caption1 text-hig-text-secondary">Frequency</label>
                          <select
                            value={rec.frequency}
                            onChange={(e) => updateRec(rec.id, { frequency: e.target.value })}
                            className="hig-input mt-1"
                          >
                            <option>Monthly</option>
                            <option>Quarterly</option>
                            <option>Semi-annually</option>
                            <option>Yearly</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Total monthly premium */}
                {allRecs.filter((r) => r.isSelected).length > 0 && (
                  <div className="border-t border-hig-gray-5 pt-3 flex justify-between text-hig-subhead">
                    <span className="text-hig-text-secondary">Total Monthly Premium</span>
                    <span className="font-semibold">{formatRMFull(totalMonthlyPremium)}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'existing' && (
              <div className="space-y-3">
                <p className="text-hig-caption1 text-hig-text-secondary mb-1">
                  Existing coverage from all policies combined.
                </p>
                {RISKS.map((risk) => {
                  const s = summary.find((x) => x.risk === risk)
                  return (
                    <div key={risk} className="space-y-1">
                      <div className="flex items-center justify-between text-hig-subhead">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                          <span className="text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                        </div>
                        <span className="font-medium">{formatRMFull(plan.existing[risk] || 0)}</span>
                      </div>
                      {s && s.targetCoverage > 0 && (
                        <div className="h-1 bg-hig-gray-6 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((s.existingCoverage / s.targetCoverage) * 100))}%`,
                              backgroundColor: s.existingCoverage >= s.targetCoverage ? '#34C759' : '#FF9500',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Planning Assumptions modal */}
      {showAssumptions && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => onToggleAssumptions(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6">
            <div className="flex justify-between mb-5">
              <h2 className="text-hig-title3">Planning Assumptions</h2>
              <button onClick={() => onToggleAssumptions(false)} className="p-2 rounded-full hover:bg-hig-gray-6">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="hig-label">Inflation Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={plan.inflationRate}
                  onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })}
                  className="hig-input"
                />
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  Increases effective coverage requirement over time.
                </p>
              </div>
              <div>
                <label className="hig-label">Investment Return Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={plan.returnRate}
                  onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })}
                  className="hig-input"
                />
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  Assumed return on payout — reduces total sum assured needed.
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => onToggleAssumptions(false)} className="hig-btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-component: Coverage Bar ──────────────────────────────────────────────

// ─── Coverage Needs by Age Chart ─────────────────────────────────────────────
//
// Logic (verified against GoalsMapper tooltips):
//   Each bar = annual living expense for that age (inflation-adjusted)
//   Year 1 bar also includes the lump sum (drawn immediately on insured event)
//   Coverage pool depletes year by year; remainder earns investment return
//   Green  = drawn from existing coverage pool
//   Blue   = drawn from recommended coverage pool (risk-colour per tab)
//   Red    = shortfall (not covered by any pool)

function buildCoverageChartData({ lumpSum, monthly, period, inflationRate, returnRate, existing, withRecs, currentAge }) {
  if (!period || period <= 0 || (!monthly && !lumpSum)) return []

  let existingPool = existing
  let recPool = Math.max(0, withRecs - existing)
  const annualInflation = (inflationRate || 0) / 100
  const annualReturn = (returnRate || 0) / 100

  return Array.from({ length: period }, (_, y) => {
    const age = currentAge + y

    // Bar height: year 1 adds lump sum on top of first year's annual expenses
    const annualExpense = y === 0
      ? (lumpSum || 0) + (monthly || 0) * 12
      : (monthly || 0) * 12 * Math.pow(1 + annualInflation, y)

    // Draw from existing pool first
    const fromExisting = Math.min(existingPool, annualExpense)
    existingPool = Math.max(0, existingPool - fromExisting) * (1 + annualReturn)

    // Then draw from recommended pool
    const stillNeeded = annualExpense - fromExisting
    const fromRec = Math.min(recPool, stillNeeded)
    recPool = Math.max(0, recPool - fromRec) * (1 + annualReturn)

    const shortfall = Math.max(0, stillNeeded - fromRec)

    return { age, existing: Math.round(fromExisting), recommended: Math.round(fromRec), shortfall: Math.round(shortfall) }
  })
}

function CoverageNeedsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const rows = [
    { key: 'existing',    label: 'Existing Coverage',     color: '#34C759' },
    { key: 'recommended', label: 'Recommended Coverage',  color: '#007AFF' },
    { key: 'shortfall',   label: 'Shortfall',             color: '#FF3B30' },
  ]
  return (
    <div style={{
      background: 'white', borderRadius: 10,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      border: '1px solid #E5E5EA', padding: '10px 14px', minWidth: 200,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>
        Client  Age {label}
      </div>
      {rows.map(({ key, label: lbl, color }) =>
        d[key] > 0 ? (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ color: '#8E8E93', flex: 1 }}>{lbl}</span>
            <span style={{ fontWeight: 500 }}>{formatRMFull(d[key])}</span>
          </div>
        ) : null
      )}
    </div>
  )
}

function CoverageAgeChart({ risk, currentAge, lumpSum, monthly, period, existing, withRecs, inflationRate, returnRate }) {
  const recColour = RISK_COLOUR[risk]

  const data = useMemo(
    () => buildCoverageChartData({ lumpSum, monthly, period, inflationRate, returnRate, existing, withRecs, currentAge }),
    [lumpSum, monthly, period, inflationRate, returnRate, existing, withRecs, currentAge]
  )

  if (data.length === 0) return null

  const hasRecs = data.some((d) => d.recommended > 0)

  const yTickFmt = (v) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
    : String(v)

  return (
    <div className="hig-card p-5">
      <h3 className="text-hig-headline mb-1">Coverage Needs by Age</h3>
      <p className="text-hig-caption1 text-hig-text-secondary mb-3">
        Annual living expenses vs. how far your coverage pool reaches.
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        {existing > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#34C759' }} />
            <span className="text-hig-caption1 text-hig-text-secondary">Existing Coverage</span>
          </div>
        )}
        {hasRecs && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: recColour }} />
            <span className="text-hig-caption1 text-hig-text-secondary">Recommended Coverage</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#FF6B6B' }} />
          <span className="text-hig-caption1 text-hig-text-secondary">Shortfall</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="15%">
          <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E5EA' }}
            label={{ value: 'Age', position: 'insideBottom', offset: -1, fontSize: 11, fill: '#8E8E93' }}
          />
          <YAxis
            tickFormatter={yTickFmt}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip content={<CoverageNeedsTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {/* Stacked bars: existing → recommended → shortfall */}
          <Bar dataKey="existing"    stackId="a" fill="#34C759" name="Existing Coverage"    radius={[0,0,0,0]} />
          <Bar dataKey="recommended" stackId="a" fill={recColour} name="Recommended Coverage" radius={[0,0,0,0]} />
          <Bar dataKey="shortfall"   stackId="a" fill="#FF6B6B" name="Shortfall"             radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Coverage Bar ─────────────────────────────────────────────────────────────

function CoverageBar({ label, value, max, colour, segments, showFull }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0

  return (
    <div>
      <div className="flex justify-between text-hig-caption1 mb-1.5">
        <span className="text-hig-text-secondary">{label}</span>
        <span className="font-medium">{formatRMFull(value)}</span>
      </div>
      <div className="h-7 bg-hig-gray-6 rounded-lg overflow-hidden relative">
        {/* Ghost stripe so empty bars don't disappear entirely */}
        {!showFull && pct === 0 && !segments && (
          <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg opacity-30" style={{ backgroundColor: colour }} />
        )}
        {segments ? (
          <div className="h-full flex">
            {segments.map((seg, i) => {
              const segPct = max > 0 ? Math.min(100, Math.round((seg.value / max) * 100)) : 0
              return segPct > 0 ? (
                <div
                  key={i}
                  className="h-full transition-all duration-500"
                  style={{ width: `${segPct}%`, backgroundColor: seg.colour }}
                />
              ) : (
                // Ghost stripe for zero-value segment
                <div key={i} className="h-full w-1 opacity-20 transition-all duration-500" style={{ backgroundColor: seg.colour }} />
              )
            })}
          </div>
        ) : (
          <div
            className="h-full rounded-lg transition-all duration-500"
            style={{
              width: showFull ? '100%' : `${Math.max(pct, 0)}%`,
              backgroundColor: colour,
            }}
          />
        )}
      </div>
    </div>
  )
}
