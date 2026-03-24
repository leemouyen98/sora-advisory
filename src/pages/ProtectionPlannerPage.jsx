import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { getAge } from '../lib/formatters'
import { formatRMFull, protectionNeed, generateProtectionSummary } from '../lib/calculations'
import { ArrowLeft, X, Plus, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react'
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
const RISK_DESC = {
  death: 'Pays a lump sum and/or monthly income to your dependants if you pass away.',
  tpd:   'Replaces your income if you become totally and permanently disabled.',
  aci:   'Covers treatment and living costs when a critical illness reaches an advanced stage.',
  eci:   'Provides early cash the moment a critical illness is first diagnosed, before it progresses.',
}
const roundUp50K = (val) => Math.ceil(Math.max(val, 1) / 50000) * 50000

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
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLOUR[risk] }}
                  />
                  <h4 className="text-hig-subhead font-semibold">{RISK_LABELS[risk]}</h4>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary mb-3">{RISK_DESC[risk]}</p>
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
  const [expandedRecId, setExpandedRecId] = useState(null)

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
  const allRecs = plan.recommendations || []

  const addRecommendation = () => {
    const rec = {
      id: uid(),
      name: '',
      death: 0,
      tpd: 0,
      aci: 0,
      eci: 0,
      premiumAmount: 0,
      frequency: 'Monthly',
      periodYears: 20,
      isSelected: true,
    }
    updatePlan({ recommendations: [...(plan.recommendations || []), rec] })
    setExpandedRecId(rec.id)
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
      {/* Risk tabs — coverage % embedded so there's no separate duplicate row */}
      <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-4">
        {RISKS.map((risk) => {
          const s = summary.find((x) => x.risk === risk)
          const isActive = activeRisk === risk
          const pct = s?.coveragePercent ?? 0
          const pctColour = pct >= 100 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30'
          return (
            <button
              key={risk}
              onClick={() => setActiveRisk(risk)}
              className={`flex-1 py-2 rounded-hig-sm transition-colors flex flex-col items-center gap-0.5
                ${isActive ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
            >
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isActive ? RISK_COLOUR[risk] : pctColour }} />
                <span className="text-hig-subhead font-medium">{RISK_SHORT[risk]}</span>
              </div>
              <span className="text-[10px] font-bold leading-none" style={{ color: pctColour }}>{pct}%</span>
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
            {/* NLP interpretation */}
            <p className="text-hig-caption1 text-hig-text-secondary mt-3 pt-3 border-t border-hig-gray-6">
              {active.coveragePercent >= 100
                ? `${RISK_SHORT[activeRisk]} is fully covered — ${formatRMFull(active.surplus)} buffer above target.`
                : active.coveragePercent >= 50
                ? `Good start — ${active.coveragePercent}% covered. Adding ${formatRMFull(active.shortfall)} more in sum assured closes the gap.`
                : active.targetCoverage > 0
                ? `Significant exposure — only ${active.coveragePercent}% covered. ${formatRMFull(active.shortfall)} is unprotected.`
                : `Enter needs in Step 1 to see the coverage target for ${RISK_SHORT[activeRisk]}.`}
            </p>
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
              {[
                { key: 'recommendations', label: 'Recommendations', count: allRecs.length },
                { key: 'existing', label: 'Existing Coverage', count: RISKS.filter((r) => (plan.existing[r] || 0) > 0).length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2 text-hig-caption1 font-medium rounded-hig-sm transition-colors flex items-center justify-center gap-1.5
                    ${activeTab === key ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}
                >
                  {label}
                  <span
                    className={`text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center
                      ${activeTab === key ? 'bg-hig-blue text-white' : 'bg-hig-gray-4 text-hig-text-secondary'}`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'recommendations' && (
              <div className="space-y-3">
                <button onClick={addRecommendation} className="hig-btn-primary w-full gap-2">
                  <Plus size={15} /> Add Recommendation
                </button>

                {allRecs.length === 0 && (
                  <p className="text-hig-subhead text-hig-text-secondary text-center py-4">
                    No recommendations yet. Add one to get started.
                  </p>
                )}

                {allRecs.map((rec, idx) => {
                  const freqMap = { Monthly: 12, Quarterly: 4, 'Semi-annually': 2, Yearly: 1 }
                  const paymentsPerYear = freqMap[rec.frequency] || 12
                  const totalPremiumPaid = (rec.premiumAmount || 0) * paymentsPerYear * (rec.periodYears || 0)
                  const isExpanded = expandedRecId === rec.id
                  const coveredRisks = RISKS.filter((r) => (rec[r] || 0) > 0)
                  return (
                    <div key={rec.id} className="border border-hig-gray-4 rounded-hig-sm overflow-hidden">
                      {/* Header — click to expand/collapse */}
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
                        style={{ backgroundColor: rec.isSelected ? '#007AFF' : '#8E8E93' }}
                        onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRec(rec.id) }}
                          className="w-5 h-5 rounded-full border-2 border-white/70 shrink-0 flex items-center justify-center transition-colors"
                          style={{ backgroundColor: rec.isSelected ? 'rgba(255,255,255,0.25)' : 'transparent' }}
                        >
                          {rec.isSelected && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                        </button>
                        <span className="text-hig-subhead font-semibold text-white flex-1">
                          {rec.name || `Recommendation ${idx + 1}`}
                        </span>
                        {isExpanded ? <ChevronUp size={14} className="text-white/70 shrink-0" /> : <ChevronDown size={14} className="text-white/70 shrink-0" />}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeRec(rec.id) }}
                          className="text-white/60 hover:text-white p-0.5 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Collapsed summary */}
                      {!isExpanded && (
                        <div className="px-3 py-2 bg-white space-y-0.5">
                          {coveredRisks.length > 0 ? (
                            <p className="text-hig-caption1 text-hig-text-secondary">
                              {coveredRisks.map((r) => `${RISK_SHORT[r]} ${formatRMFull(rec[r])}`).join(' · ')}
                            </p>
                          ) : (
                            <p className="text-hig-caption1 text-hig-text-secondary italic">No coverage amounts entered yet.</p>
                          )}
                          {rec.premiumAmount > 0 && (
                            <p className="text-hig-caption2 text-hig-text-secondary">
                              {formatRMFull(rec.premiumAmount)}/{(rec.frequency || 'Monthly').toLowerCase()} · {rec.periodYears || 0} yrs
                              {totalPremiumPaid > 0 && ` · Total ${formatRMFull(totalPremiumPaid)}`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Expanded form body */}
                      {isExpanded && (
                        <div className="p-3 space-y-2.5 bg-white">
                          {/* Product name */}
                          <input
                            type="text"
                            value={rec.name || ''}
                            onChange={(e) => updateRec(rec.id, { name: e.target.value })}
                            className="hig-input text-hig-subhead w-full"
                            placeholder="Product / plan name (optional)"
                          />

                          {/* Per-risk coverage amounts */}
                          {RISKS.map((risk) => {
                            const s = summary.find((x) => x.risk === risk)
                            const shortfall = s?.shortfall || 0
                            const suggested = shortfall > 0 ? roundUp50K(shortfall) : 0
                            return (
                              <div
                                key={risk}
                                className="rounded-md p-2.5"
                                style={{
                                  border: `1.5px solid ${RISK_COLOUR[risk]}50`,
                                  backgroundColor: RISK_COLOUR[risk] + '0A',
                                }}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-hig-caption1 font-semibold" style={{ color: RISK_COLOUR[risk] }}>
                                    {RISK_SHORT[risk]} Coverage
                                  </label>
                                  {suggested > 0 && (
                                    <button
                                      onClick={() => updateRec(rec.id, { [risk]: suggested })}
                                      className="text-[10px] text-hig-blue hover:underline font-medium"
                                    >
                                      Suggested: {formatRMFull(suggested)} ↗
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption1 font-medium select-none">RM</span>
                                  <input
                                    type="number"
                                    value={rec[risk] || ''}
                                    onChange={(e) => updateRec(rec.id, { [risk]: parseFloat(e.target.value) || 0 })}
                                    className="hig-input pl-9 text-hig-subhead"
                                    placeholder="0"
                                  />
                                </div>
                                {suggested > 0 && (
                                  <p className="text-[10px] text-hig-text-secondary mt-1">
                                    Shortfall is {formatRMFull(shortfall)} — rounded up to nearest RM 50,000.
                                  </p>
                                )}
                              </div>
                            )
                          })}

                          {/* Premium Amount */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">Premium Amount</label>
                              <span className="text-[10px] text-hig-text-secondary">Required</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption1 select-none">RM</span>
                              <input
                                type="number"
                                value={rec.premiumAmount || ''}
                                onChange={(e) => updateRec(rec.id, { premiumAmount: parseFloat(e.target.value) || 0 })}
                                className="hig-input pl-9"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Frequency */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">Frequency</label>
                              <span className="text-[10px] text-hig-text-secondary">Optional</span>
                            </div>
                            <select
                              value={rec.frequency || 'Monthly'}
                              onChange={(e) => updateRec(rec.id, { frequency: e.target.value })}
                              className="hig-input"
                            >
                              <option>Monthly</option>
                              <option>Quarterly</option>
                              <option>Semi-annually</option>
                              <option>Yearly</option>
                            </select>
                          </div>

                          {/* Period */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">Period</label>
                              <span className="text-[10px] text-hig-text-secondary">Required</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                value={rec.periodYears || ''}
                                onChange={(e) => updateRec(rec.id, { periodYears: parseFloat(e.target.value) || 0 })}
                                className="hig-input pr-12"
                                placeholder="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption1 select-none">years</span>
                            </div>
                          </div>

                          {/* Total premium paid */}
                          {totalPremiumPaid > 0 && (
                            <div className="rounded-md p-3 bg-amber-50 border border-amber-200">
                              <p className="text-[10px] text-amber-700 font-bold tracking-wide mb-0.5">TOTAL PREMIUM PAID</p>
                              <p className="text-hig-subhead font-bold text-amber-900">{formatRMFull(totalPremiumPaid)}</p>
                              <p className="text-[10px] text-amber-700 mt-0.5">
                                {formatRMFull(rec.premiumAmount)}/{(rec.frequency || 'Monthly').toLowerCase()} × {rec.periodYears} years
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Total monthly premium across all selected recs */}
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

function CoverageNeedsTooltip({ active, payload, label, recColour }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const rows = [
    { key: 'existing',    label: 'Existing Coverage',     color: '#34C759' },
    { key: 'recommended', label: 'Recommended Coverage',  color: recColour || '#007AFF' },
    { key: 'shortfall',   label: 'Shortfall',             color: '#FF3B30' },
  ]
  return (
    <div style={{
      background: 'white', borderRadius: 10,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      border: '1px solid #E5E5EA', padding: '10px 14px', minWidth: 200,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>
        Client Age {label}
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

  // Detect year-1 lump sum spike: if the first bar is > 3× the second bar,
  // cap the Y-axis so the income-replacement bars remain readable.
  const firstBarTotal = data[0] ? data[0].existing + data[0].recommended + data[0].shortfall : 0
  const secondBarTotal = data[1] ? data[1].existing + data[1].recommended + data[1].shortfall : firstBarTotal
  const hasLumpSumSpike = lumpSum > 0 && data.length > 1 && firstBarTotal > secondBarTotal * 3
  const lastBarTotal = data[data.length - 1]
    ? data[data.length - 1].existing + data[data.length - 1].recommended + data[data.length - 1].shortfall
    : secondBarTotal
  // Cap at 2× the maximum non-first-year bar so they fill the chart nicely
  const yDomainMax = hasLumpSumSpike
    ? Math.ceil((Math.max(lastBarTotal, secondBarTotal) * 2.2) / 10000) * 10000
    : undefined

  const yTickFmt = (v) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
    : String(v)

  return (
    <div className="hig-card p-5">
      <h3 className="text-hig-headline mb-1">Coverage Needs by Age</h3>
      <p className="text-hig-caption1 text-hig-text-secondary mb-1">
        Annual living expenses vs. how far your coverage pool reaches.
      </p>
      {hasLumpSumSpike && (
        <p className="text-hig-caption2 text-hig-orange mb-3">
          ⚑ Age {data[0].age} includes one-off lump sum of {formatRMFull(lumpSum)} — bar is clipped. See Needs Breakdown for full value.
        </p>
      )}

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
            domain={yDomainMax ? [0, yDomainMax] : undefined}
          />
          <Tooltip content={<CoverageNeedsTooltip recColour={recColour} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {/* Stacked bars: existing → recommended → shortfall */}
          <Bar dataKey="existing"    stackId="a" fill="#34C759" name="Existing Coverage"    radius={[0,0,0,0]} />
          <Bar dataKey="recommended" stackId="a" fill={recColour} name="Recommended Coverage" radius={[0,0,0,0]} />
          <Bar dataKey="shortfall"   stackId="a" fill="#FF6B6B" name="Shortfall"             radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

