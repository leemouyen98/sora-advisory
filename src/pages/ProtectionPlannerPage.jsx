import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import { getAge } from '../lib/formatters'
import { formatRMFull, protectionNeed, generateProtectionSummary } from '../lib/calculations'
import { ArrowLeft, X, Plus, Trash2, Settings, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, TrendingDown, ShieldAlert, Presentation } from 'lucide-react'
import NumberInput from '../components/ui/NumberInput'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { ProtectionExportButton } from '../components/pdf/ProtectionReportPDF'

import { uid } from '../lib/formatters'
const RISKS = ['death', 'tpd', 'aci', 'eci']
const RISK_SHORT = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }
const RISK_COLOUR = { death: '#6366f1', tpd: '#0891b2', aci: '#dc2626', eci: '#f59e0b' }
const RISK_HEADER_BG = { death: 'rgba(99,102,241,0.10)', tpd: 'rgba(8,145,178,0.10)', aci: 'rgba(220,38,38,0.10)', eci: 'rgba(245,158,11,0.10)' }
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
  const [meetingMode, setMeetingMode] = useState(false)

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

  // Step indicator — GoalsMapper horizontal stepper style
  const stepIndicator = (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Centred stepper */}
      <div className="-mx-1 flex-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max items-center lg:justify-center">
          {[
            { n: 1, label: t('protection.stepNeeds') },
            { n: 2, label: t('protection.stepCoverage') },
            { n: 3, label: t('protection.stepPlanner') },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center">
              {idx > 0 && (
                <div className="w-12 h-px mx-1" style={{ backgroundColor: '#bdbdbd' }} />
              )}
              <button
                onClick={() => setStep(s.n)}
                className="shrink-0 flex items-center gap-2 transition-colors"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors"
                  style={
                    step === s.n
                      ? { backgroundColor: '#1976d2', color: '#fff' }
                      : step > s.n
                        ? { backgroundColor: '#1976d2', color: '#fff' }
                        : { backgroundColor: 'transparent', color: '#9e9e9e', border: '2px solid #9e9e9e' }
                  }
                >
                  {step > s.n ? '✓' : s.n}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: step === s.n ? '#1976d2' : step > s.n ? '#1976d2' : '#9e9e9e' }}
                >
                  {s.label}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {!meetingMode && (
          <button
            onClick={() => { setStep(3); setShowAssumptions(true) }}
            className="flex items-center gap-1.5 text-hig-caption1 font-medium text-hig-blue hover:text-blue-700 transition-colors"
          >
            <Settings size={14} /> {t('protection.planningAssumptions')}
          </button>
        )}
        {step === 3 && (
          <button
            onClick={() => setMeetingMode(m => !m)}
            className={`flex items-center gap-1.5 text-hig-caption1 font-medium transition-colors px-2.5 py-1 rounded-full
              ${meetingMode
                ? 'bg-hig-blue text-white'
                : 'text-hig-text-secondary hover:text-hig-blue border border-hig-gray-4 hover:border-hig-blue'
              }`}
          >
            <Presentation size={13} />
            {meetingMode ? 'Exit Presentation' : 'Presentation Mode'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full">
      {/* Meeting Mode: slim header only */}
      {meetingMode ? (
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-hig-blue animate-pulse" />
            <span className="text-hig-caption1 font-semibold text-hig-blue">Presentation Mode</span>
            <span className="text-hig-caption2 text-hig-text-secondary">· {contact.name} · {t('protection.wealthProtection')}</span>
          </div>
          <button
            onClick={() => setMeetingMode(false)}
            className="text-hig-caption1 text-hig-text-secondary hover:text-hig-text transition-colors"
          >
            Exit ×
          </button>
        </div>
      ) : (
        <>
          {breadcrumb}
          {stepIndicator}
        </>
      )}

      {step === 1 && !meetingMode && (
        <ProtectionBasicInfo
          plan={plan}
          updatePlan={updatePlan}
          setNeed={setNeed}
          monthlyIncome={monthlyIncomeFromFinancials}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && !meetingMode && (
        <ProtectionExistingCoverage
          plan={plan}
          setExisting={setExisting}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
          insuranceTotals={insuranceTotals}
          onSyncFromInsurance={onSyncFromInsurance}
        />
      )}
      {(step === 3 || meetingMode) && (
        <ProtectionPlanner
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          monthlyIncome={monthlyIncomeFromFinancials}
          updatePlan={updatePlan}
          showAssumptions={meetingMode ? false : showAssumptions}
          onToggleAssumptions={setShowAssumptions}
          onBack={() => { setMeetingMode(false); setStep(2) }}
          insuranceTotals={insuranceTotals}
          meetingMode={meetingMode}
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
    <>
    {/* pb-16 keeps content above the fixed footer */}
    <div className="flex flex-col gap-6 pb-24 lg:flex-row">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="bg-white rounded p-5" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
          {/* GoalsMapper-style page header with icon */}
          <div className="flex items-start gap-3 mb-5">
            <div
              className="w-9 h-9 rounded flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#6366f1)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-gray-900">{t('protection.needsAnalysisTitle')}</h3>
              <p className="text-[13px] text-gray-500 mt-0.5">{t('protection.needsAnalysisDesc')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {RISKS.map((risk) => (
              <div key={risk} className="rounded overflow-hidden bg-white" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
                {/* GoalsMapper-style coloured header band */}
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ backgroundColor: RISK_HEADER_BG[risk] }}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: RISK_COLOUR[risk], opacity: 0.85 }}
                  />
                  <h4 className="text-[15px] font-semibold text-gray-900">{riskLabels[risk]}</h4>
                </div>

                {/* Form body — GoalsMapper layout: Lump Sum full-width, then Monthly + Period side-by-side */}
                <div className="px-4 pt-3 pb-4 space-y-3">
                  {/* Row 1: Lump Sum — full width */}
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">
                      Lump Sum <span className="font-normal text-gray-400">Required</span>
                    </label>
                    <div className="flex items-center h-10 rounded px-3 bg-white" style={{ border: '1px solid #c4c4c4' }}>
                      <span className="text-gray-500 text-sm mr-1.5 shrink-0">RM</span>
                      <NumberInput
                        value={plan.needs[risk].lumpSum}
                        onChange={(num) => setNeed(risk, 'lumpSum', num)}
                        className="border-0 p-0 flex-1 text-[15px] text-gray-900 bg-transparent focus:outline-none w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Row 2: Monthly Expenses + Period side-by-side */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">
                        Monthly Expenses <span className="font-normal text-gray-400">Required</span>
                      </label>
                      <div className="flex items-center h-10 rounded px-3 bg-white" style={{ border: '1px solid #c4c4c4' }}>
                        <span className="text-gray-500 text-sm mr-1.5 shrink-0">RM</span>
                        <NumberInput
                          value={plan.needs[risk].monthly}
                          onChange={(num) => setNeed(risk, 'monthly', num)}
                          className="border-0 p-0 flex-1 text-[15px] text-gray-900 bg-transparent focus:outline-none w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">
                        Period <span className="font-normal text-gray-400">Required</span>
                      </label>
                      <div className="flex items-center h-10 rounded overflow-hidden bg-white" style={{ border: '1px solid #c4c4c4' }}>
                        <input
                          type="number"
                          value={plan.needs[risk].period || ''}
                          onChange={(e) => setNeed(risk, 'period', e.target.value)}
                          className="flex-1 border-0 px-3 h-full text-[15px] text-gray-900 bg-transparent focus:outline-none"
                          placeholder="0"
                        />
                        <span className="pr-3 text-gray-400 text-sm shrink-0">years</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Planning Parameters card — GoalsMapper style ── */}
        <div
          className="bg-white rounded-lg"
          style={{ border: '1px solid rgb(238,238,238)', padding: '16px 24px', boxShadow: 'rgba(0,0,0,0.15) 0px 0px 6px 0px' }}
        >
          {/* Header row: icon + title + subtitle */}
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgb(241,232,245)' }}
            >
              {/* Settings/gear icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="rgb(147,51,234)" aria-hidden="true">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900 leading-snug">Planning Parameters</p>
              <p className="text-[13px] text-gray-500 mt-0.5">Adjust these settings to match your protection plan.</p>
            </div>
          </div>

          {/* Info box — GoalsMapper light-blue alert */}
          <div
            className="flex gap-3 mb-5 rounded"
            style={{ backgroundColor: 'rgb(229,246,253)', padding: '6px 16px', borderRadius: '4px' }}
          >
            <svg className="shrink-0 mt-2.5" width="16" height="16" viewBox="0 0 24 24" fill="rgb(1,100,145)">
              <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
            </svg>
            <p className="text-[13px] py-1.5" style={{ color: 'rgb(1,67,97)' }}>
              <strong>Inflation rate</strong> helps estimate how much your financial needs may increase over time, so your coverage remains sufficient when the need arises.<br/>
              <strong>Investment return rate</strong> represents the rate at which your insurance payout is assumed to grow after it is received, supporting future expenses.
            </p>
          </div>

          {/* Two inputs side by side */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Inflation Rate */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-1.5">
                Inflation Rate <span className="font-normal text-gray-400">Required</span>
              </label>
              <div className="flex items-center h-10 rounded px-3 bg-white" style={{ border: '1px solid #c4c4c4' }}>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={plan.inflationRate ?? 4}
                  onChange={(e) => updatePlan({ inflationRate: parseFloat(e.target.value) || 0 })}
                  className="flex-1 border-0 p-0 text-[15px] text-gray-900 bg-transparent focus:outline-none w-full"
                />
                <span className="text-gray-400 text-sm shrink-0">%</span>
              </div>
              <p className="text-[12px] text-gray-400 mt-1">Min: 0%, Max: 10%</p>
            </div>

            {/* Investment Return Rate */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-900 mb-1.5">
                Investment Return Rate <span className="font-normal text-gray-400">Required</span>
              </label>
              <div className="flex items-center h-10 rounded px-3 bg-white" style={{ border: '1px solid #c4c4c4' }}>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={plan.returnRate ?? 1}
                  onChange={(e) => updatePlan({ returnRate: parseFloat(e.target.value) || 0 })}
                  className="flex-1 border-0 p-0 text-[15px] text-gray-900 bg-transparent focus:outline-none w-full"
                />
                <span className="text-gray-400 text-sm shrink-0">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>{/* /flex-1 left column */}

      {/* Right: GoalsMapper Protection Progress panel */}
      <div className="w-full lg:w-72 shrink-0">
        <div className="bg-white rounded p-5 lg:sticky lg:top-4" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
          <h3 className="text-[15px] font-semibold text-gray-900">Protection Progress</h3>
          <p className="text-[13px] text-gray-500 mt-0.5 mb-5">Compare your existing coverage against what you need</p>

          <div className="space-y-5">
            {needsSummary.map(({ risk, total }) => (
              <div key={risk}>
                <p className="text-[13px] font-bold text-gray-900 mb-2">{riskLabels[risk]}</p>
                {/* Full-width solid colour bar — GoalsMapper style */}
                <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: RISK_COLOUR[risk] }} />
                <p className="text-[13px] font-bold text-right mt-1" style={{ color: '#777' }}>
                  Total Required Coverage: {formatRMFull(total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* GoalsMapper fixed bottom footer — Step 1 */}
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-end px-4 py-2 z-50"
      style={{ backgroundColor: 'rgb(250,250,250)', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: 'calc(0.5rem + var(--safe-area-bottom))' }}
    >
      <button
        onClick={onContinue}
        className="font-semibold text-white rounded transition-colors hover:opacity-90"
        style={{ backgroundColor: 'rgb(58,141,222)', padding: '4px 16px', fontSize: '13px', borderRadius: '4px' }}
      >
        Continue
      </button>
    </div>
    </>
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
    <div className="flex flex-col gap-6 pb-24 lg:flex-row">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="bg-white rounded p-5" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
          <h3 className="text-[16px] font-bold text-gray-900 mb-1">Existing Coverage</h3>
          <p className="text-[13px] text-gray-500 mb-5">
            This allows you to factor in your existing coverage during the analysis
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
                <div key={risk} className="rounded overflow-hidden bg-white" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
                  {/* GoalsMapper-style coloured header band */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: RISK_HEADER_BG[risk] }}>
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: RISK_COLOUR[risk], opacity: 0.85 }} />
                    <h4 className="text-[15px] font-semibold text-gray-900">{riskLabels[risk]}</h4>
                    {target > 0 && (
                      <span className="ml-auto text-[13px] text-gray-500">
                        Target: {formatRMFull(target)}
                      </span>
                    )}
                  </div>

                  {/* Input */}
                  <div className="px-4 pt-3 pb-4">
                    <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">
                      Coverage Amount <span className="font-normal text-gray-400">Required</span>
                    </label>
                    <div className="flex items-center h-10 rounded px-3 bg-white" style={{ border: '1px solid #c4c4c4' }}>
                      <span className="text-gray-500 text-sm mr-1.5 shrink-0">RM</span>
                      <NumberInput
                        value={plan.existing[risk]}
                        onChange={(num) => setExisting(risk, num)}
                        className="border-0 p-0 flex-1 text-[15px] text-gray-900 bg-transparent focus:outline-none w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* GoalsMapper-style fixed footer — Step 2 */}
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 z-50"
          style={{ backgroundColor: 'rgb(250,250,250)', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: 'calc(0.5rem + var(--safe-area-bottom))' }}
        >
          <button
            onClick={onBack}
            style={{ color: 'rgba(0,0,0,0.26)', background: 'transparent', padding: '4px 5px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
          >Back</button>
          <button
            onClick={onContinue}
            style={{ backgroundColor: 'rgb(58,141,222)', color: 'white', padding: '4px 16px', fontSize: '13px', borderRadius: '4px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >Continue</button>
        </div>
      </div>

      {/* Right: GoalsMapper Protection Progress panel — Step 2 variant */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="bg-white rounded p-5 lg:sticky lg:top-4" style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
          <h3 className="text-[15px] font-semibold text-gray-900">Protection Progress</h3>
          <p className="text-[13px] text-gray-500 mt-0.5 mb-5">Compare your existing coverage against what you need</p>
          <div className="space-y-5">
            {RISKS.map((risk) => {
              const existing = plan.existing[risk] || 0
              const target = targets[risk] || 0
              const pct = target > 0 ? Math.min(100, Math.round((existing / target) * 100)) : 0
              const isGap = pct < 100

              return (
                <div key={risk}>
                  {/* Label row with warning + % */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-bold text-gray-900">{riskLabels[risk]}</span>
                    <div className="flex items-center gap-1.5">
                      {isGap && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2L1 21h22L12 2zm0 3.5L21 19H3L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
                      )}
                      <span className="text-[12px] font-bold" style={{ color: isGap ? '#777' : '#16a34a' }}>{pct}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2.5 rounded-full w-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: RISK_COLOUR[risk] }} />
                  </div>
                  {/* Existing / Total row */}
                  <div className="flex justify-between mt-1">
                    <span className="text-[12px] text-gray-500">Existing Coverage: {formatRMFull(existing)}</span>
                    <span className="text-[12px] font-bold text-gray-500">Total Required Coverage: {formatRMFull(target)}</span>
                  </div>
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

function ProtectionPlanner({ plan, currentAge, contactName, monthlyIncome, updatePlan, showAssumptions, onToggleAssumptions, onBack, insuranceTotals = {}, meetingMode = false }) {
  const { t } = useLanguage()
  const [activeRisk, setActiveRisk] = useState('death')
  const [activeTab, setActiveTab] = useState('recommendations')
  const [expandedRecId, setExpandedRecId] = useState(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showGapChart, setShowGapChart] = useState(false)
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left: Summary + Visualization */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Summary card */}
          <div className="hig-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

          {/* Coverage by Age chart — expenses bar chart */}
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

          {/* Needs breakdown */}
          {(plan.needs[activeRisk]?.lumpSum > 0 || plan.needs[activeRisk]?.monthly > 0) && (
            <div className="hig-card p-4">
              <h3 className="text-hig-subhead font-semibold mb-3 text-hig-text-secondary">{t('protection.needsBreakdown')}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-hig-caption1 text-hig-text-secondary">{t('protection.lumpSum')}</p>
                  <p className="text-hig-subhead font-semibold">{formatRMFull(plan.needs[activeRisk]?.lumpSum || 0)}</p>
                </div>
                <div className="py-3 text-center border-y border-hig-gray-5 sm:border-x sm:border-y-0 sm:py-0">
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

          {/* Coverage Gap Analysis — toggled via button */}
          <div>
            <button
              onClick={() => setShowGapChart((v) => !v)}
              className="hig-btn-ghost gap-1.5"
            >
              Coverage Gap Analysis
              {showGapChart ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showGapChart && <CoverageGapChart summary={summary} />}
          </div>

          {/* Back navigation */}
          <div className="flex">
            <button onClick={onBack} className="hig-btn-ghost gap-1.5">
              <ArrowLeft size={16} /> {t('protection.backToCoverage')}
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full shrink-0 lg:w-80">
          <div className="hig-card p-4 overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100dvh-160px)]">
            {/* Tab bar */}
            <div className="mb-3 flex flex-col rounded-hig-sm bg-hig-gray-6 p-1 sm:flex-row">
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
                {!meetingMode && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button onClick={addRecommendation} className="hig-btn-primary flex-1 gap-2">
                    <Plus size={15} /> {t('protection.addRecommendation')}
                  </button>
                  {savedFlash && (
                    <span className="text-hig-caption1 text-hig-green font-medium flex items-center gap-1 shrink-0">
                      <CheckCircle size={13} /> {t('retirement.savedFlash')}
                    </span>
                  )}
                </div>
                )}

                {!meetingMode && policyMix.length > 0 && (
                  <div className="rounded-hig-sm border border-hig-blue/20 bg-hig-blue/5 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  <div className="mt-2 flex flex-col gap-1 text-hig-caption1 sm:flex-row sm:items-center sm:justify-between">
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
                        style={{ backgroundColor: rec.isSelected ? '#2E96FF' : '#8E8E93' }}
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
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
    { key: 'recommended', label: 'Recommended Coverage',  color: recColour || '#2E96FF' },
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

// ─── Coverage Gap Analysis Bar Chart ─────────────────────────────────────────
//
// Always-visible stacked bar chart showing target vs existing vs recommended
// vs shortfall for ALL 4 risk categories in one view.
// Renders even before any data is entered — bars just show as all-shortfall or
// all-zero depending on whether needs have been defined in Step 1.

function CoverageGapTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const rows = [
    { key: 'existing',    label: 'Existing Coverage',    color: '#34C759' },
    { key: 'recommended', label: 'Recommended Coverage', color: '#2E96FF' },
    { key: 'shortfall',   label: 'Shortfall',            color: '#FF6B6B' },
  ].filter(({ key }) => (d[key] || 0) > 0)
  return (
    <div style={{
      background: 'white', borderRadius: 10,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      border: '1px solid #E5E5EA', padding: '10px 14px', minWidth: 200,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{label}</div>
      {d.target > 0 && (
        <div style={{ fontSize: 11, color: '#8E8E93', marginBottom: 6 }}>
          Target: {formatRMFull(d.target)}
        </div>
      )}
      {rows.length > 0 ? rows.map(({ key, label: lbl, color }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span style={{ color: '#8E8E93', flex: 1 }}>{lbl}</span>
          <span style={{ fontWeight: 500 }}>{formatRMFull(d[key])}</span>
        </div>
      )) : (
        <div style={{ fontSize: 12, color: '#8E8E93' }}>No needs entered — go to Step 1.</div>
      )}
    </div>
  )
}

function CoverageGapChart({ summary }) {
  const anyTarget = summary.some((s) => s.targetCoverage > 0)

  const data = summary.map((s) => ({
    name: RISK_SHORT[s.risk],
    existing:    s.existingCoverage,
    recommended: s.recommendedCoverage,
    shortfall:   s.shortfall,
    target:      s.targetCoverage,
  }))

  const hasExisting    = data.some((d) => d.existing > 0)
  const hasRecs        = data.some((d) => d.recommended > 0)
  const hasShortfall   = data.some((d) => d.shortfall > 0)

  const yFmt = (v) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
    : String(v)

  return (
    <div className="hig-card p-4">
      <h3 className="text-hig-subhead font-semibold mb-0.5">Coverage Gap Analysis</h3>
      <p className="text-hig-caption1 text-hig-text-secondary mb-3">
        {anyTarget
          ? 'Coverage status across all four risk categories.'
          : 'Enter needs in Step 1 to calculate targets.'}
      </p>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {hasExisting && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#34C759' }} />
            <span className="text-hig-caption1 text-hig-text-secondary">Existing</span>
          </div>
        )}
        {hasRecs && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#2E96FF' }} />
            <span className="text-hig-caption1 text-hig-text-secondary">Recommended</span>
          </div>
        )}
        {hasShortfall && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#FF6B6B' }} />
            <span className="text-hig-caption1 text-hig-text-secondary">Shortfall</span>
          </div>
        )}
        {!anyTarget && !hasExisting && !hasRecs && !hasShortfall && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block bg-hig-gray-4" />
            <span className="text-hig-caption1 text-hig-text-secondary">No needs defined</span>
          </div>
        )}
      </div>

      {/* Fixed-height wrapper — ResponsiveContainer MUST have a numeric parent height */}
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#1C1C1E', fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: '#E5E5EA' }}
            />
            <YAxis
              tickFormatter={yFmt}
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip content={<CoverageGapTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            {/* Bottom to top: existing → recommended → shortfall */}
            <Bar dataKey="existing"    stackId="a" fill="#34C759" name="Existing Coverage"    radius={[0, 0, 0, 0]} />
            <Bar dataKey="recommended" stackId="a" fill="#2E96FF" name="Recommended Coverage" radius={[0, 0, 0, 0]} />
            <Bar dataKey="shortfall"   stackId="a" fill="#FF6B6B" name="Shortfall"             radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Coverage Needs by Age Chart ─────────────────────────────────────────────

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
