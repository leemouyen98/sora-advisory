import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { getAge } from '../lib/formatters'
import { formatRMFull, protectionNeed, generateProtectionSummary } from '../lib/calculations'
import { ArrowLeft, X, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Settings, Info } from 'lucide-react'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const RISKS = ['death', 'tpd', 'aci', 'eci']
const RISK_LABELS = { death: 'Death', tpd: 'Total Permanent Disability (TPD)', aci: 'Advanced Stage Critical Illness', eci: 'Early Stage Critical Illness' }
const RISK_SHORT = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }

export default function ProtectionPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveProtectionPlan } = useContacts()
  const contact = contacts.find((c) => c.id === id)
  const currentAge = contact ? getAge(contact.dob) : 30

  const [step, setStep] = useState(1)

  const [plan, setPlan] = useState(
    contact?.protectionPlan || {
      needs: {
        death: { lumpSum: 0, monthly: 0, period: 0 },
        tpd: { lumpSum: 0, monthly: 0, period: 0 },
        aci: { lumpSum: 0, monthly: 0, period: 0 },
        eci: { lumpSum: 0, monthly: 0, period: 0 },
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
    return <div className="flex items-center justify-center h-64"><p className="text-hig-subhead text-hig-text-secondary">Contact not found</p></div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(`/contacts/${id}`)} className="hig-btn-ghost gap-1.5 -ml-3">
          <ArrowLeft size={16} /> {contact.name}
        </button>
        <span className="text-hig-text-secondary">/</span>
        <span className="text-hig-subhead font-medium">Wealth Protection</span>
      </div>

      {/* Step Indicator */}
      {step < 3 && (
        <div className="flex items-center gap-3 mb-6">
          {[{ n: 1, label: 'Basic Information' }, { n: 2, label: 'Existing Coverage' }].map((s) => (
            <button key={s.n} onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-hig-subhead font-medium transition-colors
                ${step === s.n ? 'bg-hig-blue text-white' : step > s.n ? 'bg-hig-green/10 text-hig-green' : 'bg-hig-gray-6 text-hig-text-secondary'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-hig-caption1 font-bold
                ${step === s.n ? 'bg-white/20 text-white' : step > s.n ? 'bg-hig-green text-white' : 'bg-hig-gray-4 text-hig-text-secondary'}`}>
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <ProtectionBasicInfo plan={plan} updatePlan={updatePlan} setNeed={setNeed} onContinue={() => setStep(2)} />
      )}
      {step === 2 && (
        <ProtectionExistingCoverage plan={plan} setExisting={setExisting} onBack={() => setStep(1)} onContinue={() => setStep(3)} />
      )}
      {step === 3 && (
        <ProtectionPlanner plan={plan} currentAge={currentAge} updatePlan={updatePlan} onEditAssumptions={() => setStep(1)} />
      )}
    </div>
  )
}

// ─── Step 1: Basic Information ───────────────────────────────────────────────

function ProtectionBasicInfo({ plan, updatePlan, setNeed, onContinue }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="hig-card p-5">
        <h3 className="text-hig-headline mb-1">Wealth Protection Needs Analysis</h3>
        <p className="text-hig-subhead text-hig-text-secondary mb-5">
          This helps you understand how much coverage you need if unexpected circumstances arise.
        </p>

        <div className="space-y-4">
          {RISKS.map((risk) => (
            <div key={risk} className="border border-hig-gray-5 rounded-hig-sm p-4">
              <h4 className="text-hig-subhead font-semibold mb-3">{RISK_LABELS[risk]}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="hig-label">Lump Sum (RM)</label>
                  <input type="number" value={plan.needs[risk].lumpSum || ''} onChange={(e) => setNeed(risk, 'lumpSum', e.target.value)} className="hig-input" placeholder="0" />
                </div>
                <div>
                  <label className="hig-label">Monthly Expenses (RM)</label>
                  <input type="number" value={plan.needs[risk].monthly || ''} onChange={(e) => setNeed(risk, 'monthly', e.target.value)} className="hig-input" placeholder="0" />
                </div>
                <div>
                  <label className="hig-label">Period (years)</label>
                  <input type="number" value={plan.needs[risk].period || ''} onChange={(e) => setNeed(risk, 'period', e.target.value)} className="hig-input" placeholder="0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hig-card p-5">
        <h3 className="text-hig-headline mb-1">Planning Parameters</h3>
        <p className="text-hig-subhead text-hig-text-secondary mb-4">
          Adjust these settings to match your protection plan.
        </p>
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-hig-sm mb-4 text-hig-caption1 text-hig-blue">
          <Info size={14} className="shrink-0 mt-0.5" />
          Inflation rate helps estimate how much your financial needs may increase over time, so your coverage remains sufficient when the need arises.
        </div>
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-hig-sm mb-4 text-hig-caption1 text-hig-blue">
          <Info size={14} className="shrink-0 mt-0.5" />
          Investment return rate represents the rate at which your insurance payout is assumed to grow after it is received, supporting future expenses.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="hig-label">Inflation Rate (%)</label>
            <input type="number" step="0.5" min={0} max={10} value={plan.inflationRate}
              onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })} className="hig-input" />
          </div>
          <div>
            <label className="hig-label">Investment Return Rate (%)</label>
            <input type="number" step="0.5" min={0} max={10} value={plan.returnRate}
              onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })} className="hig-input" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onContinue} className="hig-btn-primary">Continue</button>
      </div>
    </div>
  )
}

// ─── Step 2: Existing Coverage ───────────────────────────────────────────────

function ProtectionExistingCoverage({ plan, setExisting, onBack, onContinue }) {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="hig-card p-5">
        <h3 className="text-hig-headline mb-4">Existing Coverage</h3>
        <div className="space-y-4">
          {RISKS.map((risk) => (
            <div key={risk} className="flex items-center gap-4">
              <label className="text-hig-subhead font-medium w-60">{RISK_LABELS[risk]}</label>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input type="number" value={plan.existing[risk] || ''} onChange={(e) => setExisting(risk, e.target.value)} className="hig-input pl-10" placeholder="0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="hig-btn-ghost gap-1.5"><ArrowLeft size={16} /> Back</button>
        <button onClick={onContinue} className="hig-btn-primary">Continue</button>
      </div>
    </div>
  )
}

// ─── Step 3: Protection Planner ──────────────────────────────────────────────

function ProtectionPlanner({ plan, currentAge, updatePlan, onEditAssumptions }) {
  const [activeRisk, setActiveRisk] = useState('death')
  const [activeTab, setActiveTab] = useState('recommendations')
  const [showAssumptions, setShowAssumptions] = useState(false)

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
  const recs = (plan.recommendations || []).filter((r) => r.riskType === activeRisk)

  const addRecommendation = () => {
    const rec = {
      id: uid(),
      riskType: activeRisk,
      coverageAmount: 0,
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

  return (
    <div>
      {/* Risk tabs */}
      <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-4">
        {RISKS.map((risk) => {
          const s = summary.find((x) => x.risk === risk)
          return (
            <button key={risk} onClick={() => setActiveRisk(risk)}
              className={`flex-1 py-2.5 text-hig-subhead font-medium rounded-hig-sm transition-colors
                ${activeRisk === risk ? 'bg-white shadow-sm text-hig-text' : 'text-hig-text-secondary'}`}>
              {RISK_SHORT[risk]}
              {s && s.shortfall > 0 && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-hig-red inline-block" />
              )}
            </button>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="hig-card p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-8">
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
                {active.surplus > 0 ? '+' : '-'}{formatRMFull(active.surplus || active.shortfall)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-hig-subhead"
              style={{ backgroundColor: active.coveragePercent >= 100 ? '#34C759' : active.coveragePercent >= 50 ? '#FF9500' : '#FF3B30' }}>
              {active.coveragePercent}%
            </div>
            <button onClick={() => setShowAssumptions(true)} className="hig-btn-ghost gap-1.5 text-hig-blue">
              <Settings size={16} /> Planning Assumptions
            </button>
          </div>
        </div>
      </div>

      {/* Main: visual + recommendations */}
      <div className="flex gap-4">
        {/* Left: Coverage visual */}
        <div className="flex-1 min-w-0">
          <div className="hig-card p-6">
            <h3 className="text-hig-headline mb-4">{RISK_LABELS[activeRisk]} Coverage</h3>

            {/* Simple bar visualization */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-hig-caption1 mb-1">
                  <span className="text-hig-text-secondary">Target</span>
                  <span className="font-medium">{formatRMFull(active.targetCoverage)}</span>
                </div>
                <div className="h-8 bg-hig-gray-6 rounded-full overflow-hidden">
                  <div className="h-full bg-hig-gray-3 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-hig-caption1 mb-1">
                  <span className="text-hig-text-secondary">Existing Coverage</span>
                  <span className="font-medium text-hig-green">{formatRMFull(active.existingCoverage)}</span>
                </div>
                <div className="h-8 bg-hig-gray-6 rounded-full overflow-hidden">
                  <div className="h-full bg-hig-green rounded-full transition-all duration-500"
                    style={{ width: `${active.targetCoverage > 0 ? Math.min(100, (active.existingCoverage / active.targetCoverage) * 100) : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-hig-caption1 mb-1">
                  <span className="text-hig-text-secondary">With Recommendations</span>
                  <span className="font-medium text-hig-blue">{formatRMFull(active.totalCovered)}</span>
                </div>
                <div className="h-8 bg-hig-gray-6 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 flex">
                    <div className="h-full bg-hig-green"
                      style={{ width: `${active.targetCoverage > 0 ? Math.min(100, (active.existingCoverage / active.targetCoverage) * 100) : 0}%` }} />
                    <div className="h-full bg-hig-blue"
                      style={{ width: `${active.targetCoverage > 0 ? Math.min(100 - (active.existingCoverage / active.targetCoverage) * 100, (active.recommendedCoverage / active.targetCoverage) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              {active.shortfall > 0 && (
                <div className="bg-red-50 rounded-hig-sm p-3 flex items-center gap-2 text-hig-subhead text-hig-red">
                  <AlertTriangle size={16} /> Gap of {formatRMFull(active.shortfall)} remains
                </div>
              )}
              {active.surplus > 0 && (
                <div className="bg-green-50 rounded-hig-sm p-3 flex items-center gap-2 text-hig-subhead text-hig-green">
                  <CheckCircle2 size={16} /> Fully covered with {formatRMFull(active.surplus)} surplus
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Recommendations / Existing */}
        <div className="w-80 shrink-0">
          <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-3">
            <button onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors ${activeTab === 'recommendations' ? 'bg-white shadow-sm' : 'text-hig-text-secondary'}`}>
              Recommendations
            </button>
            <button onClick={() => setActiveTab('existing')}
              className={`flex-1 py-2 text-hig-subhead font-medium rounded-hig-sm transition-colors ${activeTab === 'existing' ? 'bg-white shadow-sm' : 'text-hig-text-secondary'}`}>
              Existing
            </button>
          </div>

          <div className="hig-card p-4 space-y-3">
            {activeTab === 'recommendations' && (
              <>
                <button onClick={addRecommendation} className="hig-btn-primary w-full gap-2">
                  <Plus size={16} /> Add Recommendation
                </button>
                {recs.length === 0 && (
                  <p className="text-hig-subhead text-hig-text-secondary text-center py-3">
                    No recommendations for {RISK_SHORT[activeRisk]} yet.
                  </p>
                )}
                {recs.map((rec, i) => (
                  <div key={rec.id} className="border border-hig-gray-4 rounded-hig-sm p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRec(rec.id)}
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors
                          ${rec.isSelected ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-3'}`}>
                        {rec.isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </button>
                      <span className="text-hig-subhead font-medium flex-1">{RISK_SHORT[activeRisk]} Coverage</span>
                      <button onClick={() => removeRec(rec.id)} className="text-hig-text-secondary hover:text-hig-red p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div>
                      <label className="text-hig-caption1 text-hig-text-secondary">Coverage Amount (RM)</label>
                      <input type="number" value={rec.coverageAmount || ''} onChange={(e) => updateRec(rec.id, { coverageAmount: parseFloat(e.target.value) || 0 })} className="hig-input mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-hig-caption1 text-hig-text-secondary">Premium (RM)</label>
                        <input type="number" value={rec.premiumAmount || ''} onChange={(e) => updateRec(rec.id, { premiumAmount: parseFloat(e.target.value) || 0 })} className="hig-input mt-1" />
                      </div>
                      <div>
                        <label className="text-hig-caption1 text-hig-text-secondary">Frequency</label>
                        <select value={rec.frequency} onChange={(e) => updateRec(rec.id, { frequency: e.target.value })} className="hig-input mt-1">
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Semi-annually</option>
                          <option>Yearly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'existing' && (
              <div className="space-y-3">
                {RISKS.map((risk) => (
                  <div key={risk} className="flex items-center justify-between text-hig-subhead">
                    <span className="text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                    <span className="font-medium">{formatRMFull(plan.existing[risk])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assumptions modal */}
      {showAssumptions && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowAssumptions(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6">
            <div className="flex justify-between mb-5">
              <h2 className="text-hig-title3">Planning Assumptions</h2>
              <button onClick={() => setShowAssumptions(false)} className="p-2 rounded-full hover:bg-hig-gray-6"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="hig-label">Inflation Rate (%)</label>
                <input type="number" step="0.5" value={plan.inflationRate}
                  onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Investment Return Rate (%)</label>
                <input type="number" step="0.5" value={plan.returnRate}
                  onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })} className="hig-input" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowAssumptions(false)} className="hig-btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
