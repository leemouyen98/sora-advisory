import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import { getAge } from '../lib/formatters'
import { formatRMFull, protectionNeed, generateProtectionSummary } from '../lib/calculations'
import { ArrowLeft, X, Plus, Trash2, Settings, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, TrendingDown, ShieldAlert } from 'lucide-react'
import NumberInput from '../components/ui/NumberInput'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { ProtectionExportButton } from '../components/pdf/ProtectionReportPDF'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const RISKS = ['death', 'tpd', 'aci', 'eci']
const RISK_SHORT = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }
const RISK_COLOUR = { death: '#007AFF', tpd: '#FF9500', aci: '#AF52DE', eci: '#FF3B30' }
const roundUp50K = (val) => Math.ceil(Math.max(val, 1) / 50000) * 50000

const ASSUMPTION_PRESETS = [
  { key: 'balanced', label: 'Balanced', inflationRate: 4, returnRate: 1, helper: 'Base case for most client conversations.' },
  { key: 'protective', label: 'Protective', inflationRate: 5, returnRate: 1, helper: 'Use when medical inflation and family dependency are a concern.' },
  { key: 'lean', label: 'Lean', inflationRate: 3, returnRate: 2, helper: 'Use only when you want a tighter, more budget-aware estimate.' },
]

const PREMIUM_RATIO_GUIDE = { green: 10, amber: 15 }

function getPremiumAffordability(monthlyPremium, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome <= 0) {
    return { ratio: null, status: 'unknown', label: 'No income data', helper: 'Add gross monthly income in Financial Info to judge premium affordability properly.' }
  }

  const ratio = (monthlyPremium / monthlyIncome) * 100
  if (ratio <= PREMIUM_RATIO_GUIDE.green) {
    return { ratio, status: 'good', label: 'Comfortable', helper: 'Premium load is within a generally manageable range of monthly income.' }
  }
  if (ratio <= PREMIUM_RATIO_GUIDE.amber) {
    return { ratio, status: 'watch', label: 'Watch affordability', helper: 'This can still work, but it needs client buy-in and cash flow discipline.' }
  }
  return { ratio, status: 'high', label: 'Heavy premium load', helper: 'Premiums are likely too aggressive unless the client is intentionally prioritising protection.' }
}

function getSuggestedPolicyMix(summary) {
  const gaps = [...summary].filter((item) => item.shortfall > 0).sort((a, b) => b.shortfall - a.shortfall)
  return gaps.slice(0, 2).map((item, index) => ({
    risk: item.risk,
    amount: roundUp50K(item.shortfall),
    priority: index === 0 ? 'Primary priority' : 'Next priority',
  }))
}

export default function ProtectionPlannerPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveProtectionPlan } = useContacts()
  const contact = contacts.find((c) => c.id === id)
  const currentAge = contact ? getAge(contact.dob) : 30

  // Derive gross monthly income from Financial Info (same source as Retirement Planner)
  const monthlyIncomeFromFinancials = useMemo(() => {
    const rows = contact?.financials?.income
    if (!Array.isArray(rows)) return 0
    const row = rows.find((r) => r.id === 'gross-income')
    return Number(row?.amount) || 0
  }, [contact?.financials?.income])

  // Auto-compute existing coverage totals from the Insurance Tab
  // ci field in insurance covers critical illness broadly — used for both ACI and ECI
  const insuranceTotals = useMemo(() => {
    const policies = (contact?.financials?.insurance || []).filter(
      (p) => p.status !== 'Lapsed' && p.status !== 'Surrendered' && p.status !== 'Matured'
    )
    return {
      death: policies.reduce((s, p) => s + (Number(p.coverageDetails?.death) || 0), 0),
      tpd:   policies.reduce((s, p) => s + (Number(p.coverageDetails?.tpd)   || 0), 0),
      aci:   policies.reduce((s, p) => s + (Number(p.coverageDetails?.ci)    || 0), 0),
      eci:   policies.reduce((s, p) => s + (Number(p.coverageDetails?.ci)    || 0), 0),
      count: policies.length,
      totalPolicies: (contact?.financials?.insurance || []).length,
    }
  }, [contact?.financials?.insurance])

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

  // One-shot sync of all existing values from the Insurance Tab
  const onSyncFromInsurance = () => {
    updatePlan({
      existing: {
        death: insuranceTotals.death,
        tpd:   insuranceTotals.tpd,
        aci:   insuranceTotals.aci,
        eci:   insuranceTotals.eci,
      },
    })
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
      <span className="text-hig-subhead font-medium">{t('protection.wealthProtection')}</span>
    </div>
  )

  // Step indicator — compact pill style (matches RetirementPlannerPage)
  const stepIndicator = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-1.5">
        {[
          { n: 1, label: t('protection.stepNeeds') },
          { n: 2, label: t('protection.stepCoverage') },
          { n: 3, label: t('protection.stepPlanner') },
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

      {/* Planning Assumptions — always visible */}
      <button
        onClick={() => { setStep(3); setShowAssumptions(true) }}
        className="flex items-center gap-1.5 text-hig-caption1 font-medium text-hig-blue hover:text-blue-700 transition-colors"
      >
        <Settings size={14} /> {t('protection.planningAssumptions')}
      </button>
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
          monthlyIncome={monthlyIncomeFromFinancials}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ProtectionExistingCoverage
          plan={plan}
          setExisting={setExisting}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
          insuranceTotals={insuranceTotals}
          onSyncFromInsurance={onSyncFromInsurance}
        />
      )}
      {step === 3 && (
        <ProtectionPlanner
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          monthlyIncome={monthlyIncomeFromFinancials}
          updatePlan={updatePlan}
          showAssumptions={showAssumptions}
          onToggleAssumptions={setShowAssumptions}
          onBack={() => setStep(2)}
          insuranceTotals={insuranceTotals}
        />
      )}
    </div>
  )
}

// ─── Step 1: Needs Analysis ───────────────────────────────────────────────────

function ProtectionBasicInfo({ plan, updatePlan, setNeed, onContinue, monthlyIncome = 0 }) {
  const { t } = useLanguage()
  const riskLabels = {
    death: t('protection.deathFull'),
    tpd:   t('protection.tpdFull'),
    aci:   t('protection.aciFull'),
    eci:   t('protection.eciFull'),
  }
  const riskDesc = {
    death: t('protection.deathDesc'),
    tpd:   t('protection.tpdDesc'),
    aci:   t('protection.aciDesc'),
    eci:   t('protection.eciDesc'),
  }
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
  const expenseRatio = monthlyIncome > 0 ? Math.round(((plan.needs.death?.monthly || 0) / monthlyIncome) * 100) : null

  const applyPreset = (preset) => {
    updatePlan({ inflationRate: preset.inflationRate, returnRate: preset.returnRate })
  }

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">{t('protection.needsAnalysisTitle')}</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-5">
            {t('protection.needsAnalysisDesc')}
          </p>

          <div className="space-y-4">
            {RISKS.map((risk) => (
              <div key={risk} className="border border-hig-gray-5 rounded-hig-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLOUR[risk] }}
                  />
                  <h4 className="text-hig-subhead font-semibold">{riskLabels[risk]}</h4>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary mb-3">{riskDesc[risk]}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="hig-label">{t('protection.lumpSumRM')}</label>
                    <NumberInput
                      value={plan.needs[risk].lumpSum}
                      onChange={(num) => setNeed(risk, 'lumpSum', num)}
                      className="hig-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="hig-label">{t('protection.monthlyExpensesRM')}</label>
                    <NumberInput
                      value={plan.needs[risk].monthly}
                      onChange={(num) => setNeed(risk, 'monthly', num)}
                      className="hig-input"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="hig-label">{t('protection.periodYears')}</label>
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
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h3 className="text-hig-headline mb-1">{t('protection.planningParamsTitle')}</h3>
              <p className="text-hig-subhead text-hig-text-secondary">
                {t('protection.planningParamsDesc')}
              </p>
            </div>
            <div className="text-right min-w-[220px]">
              <p className="text-hig-caption1 text-hig-text-secondary font-medium">Income replacement sense-check</p>
              {expenseRatio !== null ? (
                <>
                  <p className="text-hig-title3">{expenseRatio}%</p>
                  <p className="text-hig-caption2 text-hig-text-secondary">Death monthly need vs gross monthly income</p>
                </>
              ) : (
                <p className="text-hig-caption2 text-hig-text-secondary">Add gross monthly income in Financial Info for a cleaner protection benchmark.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {ASSUMPTION_PRESETS.map((preset) => {
              const isActive = plan.inflationRate === preset.inflationRate && plan.returnRate === preset.returnRate
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`text-left rounded-hig-sm border p-3 transition-colors ${isActive ? 'border-hig-blue bg-hig-blue/5' : 'border-hig-gray-5 hover:border-hig-gray-4'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-hig-subhead font-semibold">{preset.label}</span>
                    {isActive && <span className="text-[10px] font-bold uppercase tracking-wide text-hig-blue">Active</span>}
                  </div>
                  <p className="text-hig-caption2 text-hig-text-secondary mt-1">{preset.helper}</p>
                  <p className="text-hig-caption2 text-hig-text-secondary mt-2">Inflation {preset.inflationRate}% · Return {preset.returnRate}%</p>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="hig-label">{t('protection.inflationRatePct')}</label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={plan.inflationRate}
                onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })}
                className="hig-input"
              />
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">{t('protection.inflationRateDesc')}</p>
            </div>
            <div>
              <label className="hig-label">{t('protection.returnRatePct')}</label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={plan.returnRate}
                onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })}
                className="hig-input"
              />
              <p className="text-hig-caption2 text-hig-text-secondary mt-1">{t('protection.returnRateDesc')}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onContinue} className="hig-btn-primary">{t('common.continue')}</button>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-72 shrink-0">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">{t('protection.coverageSummary')}</h3>

          {!anyFilled ? (
            <p className="text-hig-subhead text-hig-text-secondary">
              {t('protection.fillNeedsPrompt')}
            </p>
          ) : (
            <>
              <div className="bg-blue-50 rounded-hig-sm p-4">
                <p className="text-hig-caption1 text-hig-blue font-medium mb-1">{t('protection.totalCoverageNeeded')}</p>
                <p className="text-hig-title2 text-hig-blue">{formatRMFull(grandTotal)}</p>
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  {t('protection.acrossAllCategories')}
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
                <p>{t('protection.calcBasis')}</p>
                <p>{t('protection.coverageRates', { inflation: plan.inflationRate, ret: plan.returnRate })}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Existing Coverage ────────────────────────────────────────────────

function ProtectionExistingCoverage({ plan, setExisting, onBack, onContinue, insuranceTotals = {}, onSyncFromInsurance }) {
  const { t } = useLanguage()
  const riskLabels = {
    death: t('protection.deathFull'),
    tpd:   t('protection.tpdFull'),
    aci:   t('protection.aciFull'),
    eci:   t('protection.eciFull'),
  }
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

  const hasInsuranceData = (insuranceTotals.count || 0) > 0

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="hig-card p-5">
          <h3 className="text-hig-headline mb-1">{t('protection.existingCoverageHeader')}</h3>
          <p className="text-hig-subhead text-hig-text-secondary mb-4">
            {t('protection.existingCoverageDesc')}
          </p>

          {/* ── Insurance Tab sync banner ── */}
          {hasInsuranceData && (
            <div className="mb-5 bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-hig-blue/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-hig-blue text-[10px] font-bold">i</span>
                </div>
                <div className="min-w-0">
                  <p className="text-hig-caption1 text-hig-blue font-semibold">
                    {insuranceTotals.count === 1
                      ? t('protection.activePoliciesSingular', { n: insuranceTotals.count })
                      : t('protection.activePoliciesPlural', { n: insuranceTotals.count })}
                  </p>
                  <p className="text-hig-caption2 text-hig-text-secondary mt-0.5 flex flex-wrap gap-2">
                    <span>Death: {formatRMFull(insuranceTotals.death || 0)}</span>
                    <span>TPD: {formatRMFull(insuranceTotals.tpd || 0)}</span>
                    <span>CI: {formatRMFull(insuranceTotals.aci || 0)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onSyncFromInsurance}
                className="hig-btn-ghost text-hig-caption1 text-hig-blue whitespace-nowrap shrink-0 border border-hig-blue/30 hover:bg-hig-blue/10"
              >
                {t('protection.syncInsurance')}
              </button>
            </div>
          )}

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
                    <h4 className="text-hig-subhead font-semibold">{riskLabels[risk]}</h4>
                    {target > 0 && (
                      <span className="ml-auto text-hig-caption1 text-hig-text-secondary">
                        {t('protection.targetLabel', { amount: formatRMFull(target) })}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                    <NumberInput
                      value={plan.existing[risk]}
                      onChange={(num) => setExisting(risk, num)}
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
                        <span>{t('protection.coveredPct', { pct })}</span>
                        {gap > 0 && <span className="text-hig-red">{t('protection.gapLabel', { amount: formatRMFull(gap) })}</span>}
                        {gap === 0 && existing > 0 && <span className="text-hig-green">{t('protection.fullyCovered')}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={onBack} className="hig-btn-ghost gap-1.5"><ArrowLeft size={16} /> {t('common.back')}</button>
          <button onClick={onContinue} className="hig-btn-primary">{t('common.continue')}</button>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-72 shrink-0">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">{t('protection.coverageGap')}</h3>
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

// ─── Urgency Narrative Builder ────────────────────────────────────────────────
//
// Produces a context-aware, income-referenced sentence per risk category.
// Used in the summary card NLP line on Step 3.
// Logic priority: (1) gap closed → reassure, (2) income known → anchor to income,
// (3) no income → anchor to sum at risk, (4) no needs entered → prompt.

function buildUrgencyNarrative({ risk, active, plan, monthlyIncome, contactName }) {
  const firstName = (contactName || 'the client').split(' ')[0]
  const { targetCoverage, shortfall, surplus, coveragePercent } = active
  const need = plan.needs[risk] || {}
  const period = need.period || 0

  // ── No needs entered yet ──
  if (!targetCoverage || targetCoverage === 0) {
    const prompts = {
      death:  `Enter ${firstName}'s lump sum obligations and monthly family expenses in Step 1 to calculate the death coverage needed.`,
      tpd:    `TPD coverage replaces lost income if ${firstName} can no longer work. Enter the monthly amount and period in Step 1.`,
      aci:    `Advanced stage CI typically sidelines someone for 2–5 years. Define the coverage need in Step 1 to see the gap.`,
      eci:    `Early diagnosis coverage funds treatment at the most critical — and most treatable — stage. Set the need in Step 1.`,
    }
    return prompts[risk] || `Enter needs in Step 1 to calculate the ${RISK_SHORT[risk]} coverage target.`
  }

  // ── Gap fully closed ──
  if (coveragePercent >= 100) {
    const surplusText = surplus > 0 ? ` — ${formatRMFull(surplus)} buffer above target` : ''
    return `${RISK_SHORT[risk]} gap is closed${surplusText}. No action needed here.`
  }

  // ── Gap exists — income available ──
  if (monthlyIncome > 0) {
    const monthsUnprotected = Math.round(shortfall / monthlyIncome)
    const pctIncome = ((need.monthly || 0) / monthlyIncome * 100).toFixed(0)

    switch (risk) {
      case 'death':
        return `If ${firstName} passes away today, the family needs ${formatRMFull(targetCoverage)} to cover obligations and sustain income over ${period} years. Only ${coveragePercent}% is in place — the ${formatRMFull(shortfall)} gap represents roughly ${monthsUnprotected} months of ${firstName}'s income left unprotected.`

      case 'tpd':
        return `Total permanent disability ends ${firstName}'s income immediately and permanently. At ${formatRMFull(monthlyIncome)}/month, the ${formatRMFull(shortfall)} shortfall means ${monthsUnprotected} months of income has no coverage. Only ${coveragePercent}% of the need is met.`

      case 'aci':
        return `Advanced stage CI typically forces 2–5 years out of the workforce. ${firstName} earns ${formatRMFull(monthlyIncome)}/month — the ${formatRMFull(shortfall)} gap, on top of treatment costs, leaves significant financial exposure. ${coveragePercent}% covered.`

      case 'eci':
        return `Early stage diagnosis is the window to act fast and afford the best treatment — it's also when financial pressure is highest. ${firstName}'s ${formatRMFull(shortfall)} shortfall means those costs land directly on the family. ${coveragePercent}% covered.`

      default:
        return `${formatRMFull(shortfall)} of ${RISK_SHORT[risk]} coverage is unprotected — ${coveragePercent}% met, ${monthsUnprotected} months of income at risk.`
    }
  }

  // ── Gap exists — no income data ──
  switch (risk) {
    case 'death':
      return `Only ${coveragePercent}% of death coverage is in force. The ${formatRMFull(shortfall)} gap leaves ${firstName}'s dependants exposed — obligations that cannot be met if the worst happens.`

    case 'tpd':
      return `Total disability means zero income, permanently. Only ${coveragePercent}% of the required cover is in place — ${formatRMFull(shortfall)} is unprotected.`

    case 'aci':
      return `Advanced CI at ${coveragePercent}% coverage leaves a ${formatRMFull(shortfall)} gap. Treatment costs plus lost income over ${period} years is the real exposure — not just the medical bill.`

    case 'eci':
      return `Early stage CI coverage is only ${coveragePercent}% funded. The ${formatRMFull(shortfall)} shortfall means ${firstName} absorbs early treatment costs with no financial cushion.`

    default:
      return `${coveragePercent}% of ${RISK_SHORT[risk]} coverage is in place. ${formatRMFull(shortfall)} remains unprotected.`
  }
}

// ─── Step 3: Protection Planner ───────────────────────────────────────────────

function ProtectionPlanner({ plan, currentAge, contactName, monthlyIncome, updatePlan, showAssumptions, onToggleAssumptions, onBack, insuranceTotals = {} }) {
  const { t } = useLanguage()
  const [activeRisk, setActiveRisk] = useState('death')
  const [activeTab, setActiveTab] = useState('recommendations')
  const [expandedRecId, setExpandedRecId] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const saveTimer = useRef(null)
  const flashSaved = useCallback(() => {
    setSavedFlash(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSavedFlash(false), 2000)
  }, [])

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
  const policyMix = useMemo(() => getSuggestedPolicyMix(summary), [summary])

  const addRecommendation = () => {
    const rec = {
      id: uid(),
      name: '',
      policyType: '',
      termYears: '',
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
    flashSaved()
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
    flashSaved()
  }

  const removeRec = (recId) => {
    if (!window.confirm(t('retirement.removeRecConfirm'))) return
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

  const affordability = getPremiumAffordability(totalMonthlyPremium, monthlyIncome)

  const addSuggestedGapRecommendation = () => {
    const template = { death: 0, tpd: 0, aci: 0, eci: 0 }
    policyMix.forEach((item) => {
      template[item.risk] = item.amount
    })
    const rec = {
      id: uid(),
      name: 'Suggested protection mix',
      policyType: 'Term Life',
      termYears: '',
      death: template.death,
      tpd: template.tpd,
      aci: template.aci,
      eci: template.eci,
      premiumAmount: 0,
      frequency: 'Monthly',
      periodYears: 20,
      isSelected: true,
    }
    updatePlan({ recommendations: [...(plan.recommendations || []), rec] })
    setExpandedRecId(rec.id)
    flashSaved()
  }

  return (
    <>
      {/* ── Overview Panel ── */}
      <OverviewPanel summary={summary} activeRisk={activeRisk} onSelect={setActiveRisk} contactName={contactName} />

      {/* Main layout */}
      <div className="flex gap-4 items-start">
        {/* Left: Summary + Visualization */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Summary card */}
          <div className="hig-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-5 flex-wrap">
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">{t('protection.targetCoverage')}</p>
                  <p className="text-hig-title3">{formatRMFull(active.targetCoverage)}</p>
                </div>
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">{t('protection.covered')}</p>
                  <p className="text-hig-title3 text-hig-green">{formatRMFull(active.totalCovered)}</p>
                </div>
                <div>
                  <p className="text-hig-caption1 text-hig-text-secondary font-medium">
                    {active.surplus > 0 ? t('protection.surplus') : t('protection.shortfall')}
                  </p>
                  <p className={`text-hig-title3 ${active.surplus > 0 ? 'text-hig-green' : 'text-hig-red'}`}>
                    {active.surplus > 0 ? '+' : ''}{formatRMFull(active.surplus || active.shortfall)}
                  </p>
                </div>
              </div>

              {/* Progress badge + Export */}
              <div className="flex items-center gap-2 shrink-0">
                <ProtectionExportButton
                  plan={plan}
                  summaryData={summary}
                  contact={{ name: contactName, currentAge }}
                />
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
            {/* Urgency narrative — income-referenced where available */}
            <div className={`mt-3 pt-3 border-t border-hig-gray-6 rounded-hig-sm transition-colors
              ${active.coveragePercent >= 100 && active.targetCoverage > 0 ? 'text-hig-green' : 'text-hig-text-secondary'}`}
            >
              <p className="text-hig-caption1 leading-relaxed">
                {buildUrgencyNarrative({
                  risk: activeRisk,
                  active,
                  plan,
                  monthlyIncome,
                  contactName,
                })}
              </p>
            </div>
          </div>

          {/* Needs breakdown */}
          {(plan.needs[activeRisk]?.lumpSum > 0 || plan.needs[activeRisk]?.monthly > 0) && (
            <div className="hig-card p-4">
              <h3 className="text-hig-subhead font-semibold mb-3 text-hig-text-secondary">{t('protection.needsBreakdown')}</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.lumpSum')}</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(plan.needs[activeRisk]?.lumpSum || 0)}</p>
                </div>
                <div className="text-center border-x border-hig-gray-5">
                  <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.monthlyXYrs', { n: plan.needs[activeRisk]?.period || 0 })}</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(plan.needs[activeRisk]?.monthly || 0)}/mo</p>
                </div>
                <div className="text-center">
                  <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.pvTotalNeed')}</p>
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
              <ArrowLeft size={16} /> {t('protection.backToCoverage')}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 lg:w-80 shrink-0">
          <div className="hig-card p-4 max-h-[calc(100vh-160px)] overflow-y-auto sticky top-0">
            {/* Tab bar */}
            <div className="flex bg-hig-gray-6 rounded-hig-sm p-1 mb-3">
              {[
                { key: 'recommendations', label: t('protection.recommendations'), count: allRecs.length },
                { key: 'existing', label: t('protection.stepCoverage'), count: RISKS.filter((r) => (plan.existing[r] || 0) > 0).length },
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
                <div className="flex items-center gap-2">
                  <button onClick={addRecommendation} className="hig-btn-primary flex-1 gap-2">
                    <Plus size={15} /> {t('protection.addRecommendation')}
                  </button>
                  {savedFlash && (
                    <span className="text-hig-caption1 text-hig-green font-medium flex items-center gap-1 shrink-0">
                      <CheckCircle size={13} /> {t('retirement.savedFlash')}
                    </span>
                  )}
                </div>

                {policyMix.length > 0 && (
                  <div className="rounded-hig-sm border border-hig-blue/20 bg-hig-blue/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-hig-caption1 text-hig-blue font-semibold">Suggested protection focus</p>
                        <div className="mt-1 space-y-1">
                          {policyMix.map((item) => (
                            <p key={item.risk} className="text-hig-caption2 text-hig-text-secondary">
                              <span className="font-medium text-hig-text">{item.priority}:</span> {RISK_SHORT[item.risk]} {formatRMFull(item.amount)}
                            </p>
                          ))}
                        </div>
                      </div>
                      <button onClick={addSuggestedGapRecommendation} className="hig-btn-ghost border border-hig-blue/30 text-hig-blue text-hig-caption1 whitespace-nowrap">
                        Add suggested mix
                      </button>
                    </div>
                  </div>
                )}

                <div className={`rounded-hig-sm border p-3 ${affordability.status === 'good' ? 'border-hig-green/30 bg-hig-green/5' : affordability.status === 'watch' ? 'border-amber-200 bg-amber-50' : affordability.status === 'high' ? 'border-hig-red/25 bg-red-50' : 'border-hig-gray-5 bg-hig-gray-6/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-hig-caption1 font-semibold">Premium affordability</p>
                      <p className="text-hig-caption2 text-hig-text-secondary mt-1">{affordability.helper}</p>
                    </div>
                    {affordability.ratio !== null ? (
                      <div className="text-right">
                        <p className="text-hig-title3">{affordability.ratio.toFixed(1)}%</p>
                        <p className="text-hig-caption2 text-hig-text-secondary">of monthly income</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-hig-caption1">
                    <span className="font-medium">{affordability.label}</span>
                    <span className="text-hig-text-secondary">Selected premiums: {formatRMFull(totalMonthlyPremium)}/mo</span>
                  </div>
                </div>

                {allRecs.length === 0 && (
                  <p className="text-hig-subhead text-hig-text-secondary text-center py-4">
                    {t('protection.noRecs')}
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
                          {rec.name || t('retirement.recommendationN', { n: idx + 1 })}
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
                            <p className="text-hig-caption1 text-hig-text-secondary italic">{t('protection.noCoverageAmounts')}</p>
                          )}
                          {rec.premiumAmount > 0 && (
                            <p className="text-hig-caption2 text-hig-text-secondary">
                              {formatRMFull(rec.premiumAmount)}/{(rec.frequency || 'Monthly').toLowerCase()} · {rec.periodYears || 0} yrs
                              {totalPremiumPaid > 0 && ` · ${t('common.total')} ${formatRMFull(totalPremiumPaid)}`}
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
                            placeholder={t('protection.productPlaceholder')}
                          />

                          {/* Policy Type + Coverage Term */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium block mb-1">{t('protection.policyType')}</label>
                              <select
                                value={rec.policyType || ''}
                                onChange={(e) => updateRec(rec.id, { policyType: e.target.value })}
                                className="hig-input"
                              >
                                <option value="">{t('common.select')}</option>
                                <option>Term Life</option>
                                <option>Whole Life</option>
                                <option>Investment-Linked</option>
                                <option>CI Rider</option>
                                <option>Standalone CI</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium block mb-1">{t('protection.coverageTerm')}</label>
                              <select
                                value={rec.termYears || ''}
                                onChange={(e) => updateRec(rec.id, { termYears: e.target.value })}
                                className="hig-input"
                              >
                                <option value="">{t('common.select')}</option>
                                <option>10 years</option>
                                <option>15 years</option>
                                <option>20 years</option>
                                <option>25 years</option>
                                <option>30 years</option>
                                <option>To Age 70</option>
                                <option>To Age 100</option>
                                <option>Whole of Life</option>
                              </select>
                            </div>
                          </div>

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
                                    {t('protection.riskCoverage', { risk: RISK_SHORT[risk] })}
                                  </label>
                                  {suggested > 0 && (
                                    <button
                                      onClick={() => updateRec(rec.id, { [risk]: suggested })}
                                      className="text-[10px] text-hig-blue hover:underline font-medium"
                                    >
                                      {t('protection.suggested', { amount: formatRMFull(suggested) })} ↗
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
                                    {t('protection.shortfallRounded', { amount: formatRMFull(shortfall) })}
                                  </p>
                                )}
                              </div>
                            )
                          })}

                          {/* Premium Amount */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">{t('protection.premiumAmount')}</label>
                              <span className="text-[10px] text-hig-text-secondary">{t('common.required')}</span>
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
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">{t('common.frequency')}</label>
                              <span className="text-[10px] text-hig-text-secondary">{t('common.optional')}</span>
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
                              <label className="text-hig-caption1 text-hig-text-secondary font-medium">{t('common.period')}</label>
                              <span className="text-[10px] text-hig-text-secondary">{t('common.required')}</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                value={rec.periodYears || ''}
                                onChange={(e) => updateRec(rec.id, { periodYears: parseFloat(e.target.value) || 0 })}
                                className="hig-input pr-12"
                                placeholder="0"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-caption1 select-none">{t('common.years')}</span>
                            </div>
                          </div>

                          {/* Total premium paid */}
                          {totalPremiumPaid > 0 && (
                            <div className="rounded-md p-3 bg-amber-50 border border-amber-200">
                              <p className="text-[10px] text-amber-700 font-bold tracking-wide mb-0.5">{t('protection.totalPremiumPaid')}</p>
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
                    <span className="text-hig-text-secondary">{t('protection.totalMonthlyPremium')}</span>
                    <span className="font-semibold">{formatRMFull(totalMonthlyPremium)}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'existing' && (
              <div className="space-y-4">
                {/* ── Gap vs Insurance Tab ── */}
                {(insuranceTotals.count || 0) > 0 && (
                  <div>
                    <p className="text-hig-caption2 text-hig-text-secondary font-semibold uppercase tracking-wide mb-2">
                      {t('protection.fromInsuranceTab', {
                        n: insuranceTotals.count,
                        policy: insuranceTotals.count === 1 ? t('protection.policyWord') : t('protection.policiesWord'),
                      })}
                    </p>
                    {RISKS.map((risk) => {
                      const s = summary.find((x) => x.risk === risk)
                      const insVal = insuranceTotals[risk] || 0
                      const target = s?.targetCoverage || 0
                      const gapFromIns = target > 0 ? Math.max(0, target - insVal) : 0
                      const pct = target > 0 ? Math.min(100, Math.round((insVal / target) * 100)) : 0
                      return (
                        <div key={risk} className="mb-3 last:mb-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                              <span className="text-hig-caption1 text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-hig-caption1 font-semibold">{insVal > 0 ? formatRMFull(insVal) : '—'}</span>
                            </div>
                          </div>
                          {target > 0 && (
                            <>
                              <div className="h-1 bg-hig-gray-6 rounded-full overflow-hidden mb-1">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: pct >= 100 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30',
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-hig-caption2">
                                <span className="text-hig-text-secondary">{t('protection.pctOfTarget', { pct, target: formatRMFull(target) })}</span>
                                {gapFromIns > 0 ? (
                                  <span className="text-hig-red font-medium">{t('protection.gapLabel', { amount: formatRMFull(gapFromIns) })}</span>
                                ) : target > 0 ? (
                                  <span className="text-hig-green font-medium">✓ {t('protection.fullyCovered')}</span>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                    <p className="text-hig-caption2 text-hig-text-secondary mt-1 pt-2 border-t border-hig-gray-5">
                      {t('protection.ciCoverageNote')}
                    </p>
                  </div>
                )}

                {/* ── Manually entered (Step 2) ── */}
                <div>
                  <p className="text-hig-caption2 text-hig-text-secondary font-semibold uppercase tracking-wide mb-2">
                    {t('protection.enteredInStep2')}
                  </p>
                  {RISKS.map((risk) => {
                    const s = summary.find((x) => x.risk === risk)
                    const val = plan.existing[risk] || 0
                    return (
                      <div key={risk} className="mb-2 last:mb-0">
                        <div className="flex items-center justify-between text-hig-subhead">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                            <span className="text-hig-text-secondary">{RISK_SHORT[risk]}</span>
                          </div>
                          <span className="font-medium">{val > 0 ? formatRMFull(val) : '—'}</span>
                        </div>
                        {s && s.targetCoverage > 0 && (
                          <div className="h-1 bg-hig-gray-6 rounded-full overflow-hidden mt-1">
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
              <h2 className="text-hig-title3">{t('protection.planningAssumptions')}</h2>
              <button onClick={() => onToggleAssumptions(false)} className="p-2 rounded-full hover:bg-hig-gray-6">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="hig-label">{t('protection.inflationRatePct')}</label>
                <input
                  type="number"
                  step="0.5"
                  value={plan.inflationRate}
                  onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })}
                  className="hig-input"
                />
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  {t('protection.inflationRateDesc')}
                </p>
              </div>
              <div>
                <label className="hig-label">{t('protection.returnRatePct')}</label>
                <input
                  type="number"
                  step="0.5"
                  value={plan.returnRate}
                  onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })}
                  className="hig-input"
                />
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">
                  {t('protection.returnRateDesc')}
                </p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => onToggleAssumptions(false)} className="hig-btn-primary">{t('common.done')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Overview Panel ───────────────────────────────────────────────────────────
//
// Entry frame for Step 3. Shows the full picture across all 4 risks before
// the client drills into individual tabs. Designed to open the closing
// conversation: "Here's where you stand today."

function OverviewPanel({ summary, activeRisk, onSelect, contactName }) {
  const { t } = useLanguage()
  // Aggregate totals
  const totalTarget   = summary.reduce((s, r) => s + r.targetCoverage, 0)
  const totalCovered  = summary.reduce((s, r) => s + r.totalCovered, 0)
  const totalShortfall= summary.reduce((s, r) => s + r.shortfall, 0)
  const overallPct    = totalTarget > 0 ? Math.min(100, Math.round((totalCovered / totalTarget) * 100)) : 0

  // Sort by severity (biggest uncovered gap first) — used for priority badges
  const sortedByGap = [...summary].sort((a, b) => b.shortfall - a.shortfall)
  const priorityMap  = Object.fromEntries(sortedByGap.map((r, i) => [r.risk, i]))

  const allCovered   = totalShortfall === 0 && totalTarget > 0
  const noData       = totalTarget === 0

  // Conversation starter narrative
  const narrative = noData
    ? `No coverage needs entered yet — go back to Step 1 to define what ${contactName?.split(' ')[0] || 'the client'} needs protected.`
    : allCovered
    ? `All four risk categories are fully covered. ${contactName?.split(' ')[0] || 'The client'} is well-protected.`
    : totalShortfall > 0
    ? `Total unprotected exposure: ${formatRMFull(totalShortfall)}. Without additional coverage, ${contactName?.split(' ')[0] || 'the client'} carries ${overallPct < 50 ? 'significant' : 'partial'} risk across ${summary.filter(r => r.shortfall > 0).length} of 4 categories.`
    : ''

  const overallStatus = noData ? 'na' : allCovered ? 'good' : overallPct >= 50 ? 'fair' : 'poor'
  const statusConfig = {
    good: { bg: 'bg-hig-green/10', border: 'border-hig-green/30', text: 'text-hig-green', label: t('protection.fullyProtected'), Icon: CheckCircle },
    fair: { bg: 'bg-amber-50',     border: 'border-amber-200',     text: 'text-amber-600', label: t('protection.partiallyProtected'), Icon: AlertTriangle },
    poor: { bg: 'bg-red-50',       border: 'border-red-200',       text: 'text-hig-red',   label: t('protection.underProtected'), Icon: ShieldAlert },
    na:   { bg: 'bg-hig-gray-6',   border: 'border-hig-gray-5',    text: 'text-hig-gray-1', label: t('protection.noDataStatus'), Icon: TrendingDown },
  }
  const sc = statusConfig[overallStatus]
  const StatusIcon = sc.Icon

  return (
    <div className="mb-5 space-y-3">
      {/* ── Header: Total Exposure ── */}
      <div className={`rounded-hig border px-5 py-4 flex items-center gap-5 ${sc.bg} ${sc.border}`}>
        <StatusIcon size={28} className={sc.text} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-hig-subhead font-semibold ${sc.text}`}>{sc.label}</span>
            <span className="text-hig-caption1 text-hig-text-secondary">·</span>
            <span className="text-hig-caption1 text-hig-text-secondary">{t('protection.overallPctMet', { pct: overallPct })}</span>
          </div>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">{narrative}</p>
        </div>
        {/* ── Aggregate numbers ── */}
        {!noData && (
          <div className="flex gap-5 shrink-0">
            <div className="text-right">
              <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.totalNeeded')}</p>
              <p className="text-hig-headline font-semibold">{formatRMFull(totalTarget)}</p>
            </div>
            <div className="text-right">
              <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.covered')}</p>
              <p className="text-hig-headline font-semibold text-hig-green">{formatRMFull(totalCovered)}</p>
            </div>
            {totalShortfall > 0 && (
              <div className="text-right">
                <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.unprotected')}</p>
                <p className="text-hig-headline font-semibold text-hig-red">{formatRMFull(totalShortfall)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4 Risk Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {RISKS.map((risk) => {
          const s = summary.find((x) => x.risk === risk)
          const pct = s?.coveragePercent ?? 0
          const gap = s?.shortfall ?? 0
          const isActive = activeRisk === risk
          const priorityIdx = priorityMap[risk]
          const isMostCritical = priorityIdx === 0 && gap > 0
          const isCritical     = priorityIdx === 1 && gap > 0

          const cardStatus = pct >= 100 ? 'good' : pct >= 50 ? 'fair' : s?.targetCoverage > 0 ? 'poor' : 'na'
          const cs = statusConfig[cardStatus]
          const CardIcon = cs.Icon

          return (
            <button
              key={risk}
              onClick={() => onSelect(risk)}
              className={`text-left rounded-hig border-2 p-4 transition-all duration-hig focus:outline-none
                ${isActive
                  ? 'border-hig-blue shadow-md scale-[1.01]'
                  : `border-transparent ${cs.bg} hover:border-hig-gray-4 hover:shadow-sm`
                }`}
            >
              {/* Risk header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLOUR[risk] }}
                  />
                  <span className="text-hig-subhead font-semibold text-hig-text">{RISK_SHORT[risk]}</span>
                </div>
                {isMostCritical && (
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-hig-red/10 text-hig-red">
                    {t('protection.priorityBadge')}
                  </span>
                )}
                {isCritical && (
                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    {t('protection.criticalBadge')}
                  </span>
                )}
              </div>

              {/* Coverage % */}
              {s?.targetCoverage > 0 ? (
                <>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-hig-title3 font-bold ${cs.text}`}>{pct}%</span>
                    <span className="text-hig-caption1 text-hig-text-secondary">{t('protection.coveredLabel')}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-hig-gray-5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 100 ? '#34C759' : pct >= 50 ? '#FF9500' : '#FF3B30',
                      }}
                    />
                  </div>

                  {/* Gap or covered state */}
                  {gap > 0 ? (
                    <p className="text-hig-caption1 text-hig-red font-medium">
                      {t('protection.gapLabel', { amount: formatRMFull(gap) })}
                    </p>
                  ) : (
                    <p className="text-hig-caption1 text-hig-green font-medium flex items-center gap-1">
                      <CheckCircle size={11} /> {t('protection.gapClosed')}
                    </p>
                  )}

                  <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
                    {t('protection.targetLabel', { amount: formatRMFull(s.targetCoverage) })}
                  </p>
                </>
              ) : (
                <p className="text-hig-caption1 text-hig-text-secondary mt-1">{t('protection.noNeedsEntered')}</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
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

