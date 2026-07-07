import { useEffect, useMemo, useState } from 'react'
import { Edit, Settings, X } from 'lucide-react'
import { useLanguage } from '../../hooks/useLanguage'
import PlannerLayout from '../ui/PlannerLayout'
import SectionCard from '../ui/SectionCard'
import CashFlowChart from './cashflow/CashFlowChart'
import CashFlowSummary from './cashflow/CashFlowSummary'
import PlanningAssumptionsPanel from './cashflow/PlanningAssumptionsPanel'
import ScenarioList from './cashflow/ScenarioList'
import GoalsPanel from './cashflow/GoalsPanel'
import RecommendationsPanel from './cashflow/RecommendationsPanel'
import CashFlowEmptyState from './cashflow/CashFlowEmptyState'
import FinancialInfo from './FinancialInfo'
import {
  buildInsurancePlans,
  buildCashFlowRecommendations,
  getCashFlowMilestones,
  projectCashFlow,
  summarizeShortfall,
  toAnnual,
} from '../../lib/cashflow'
import { calcMonthlyRepayment, computeLinkedPlanPremiums } from '../../lib/calculations'

function getCurrentAge(dob) {
  if (!dob) return 30
  const date = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age -= 1
  return age
}

function formatDob(dob) {
  if (!dob) return ''
  return new Date(dob).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Slide-over drawer ──────────────────────────────────────────────────────────
function FinancialInfoDrawer({ financials, currentAge, onSave, onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-[540px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hig-gray-5 shrink-0">
          <div>
            <h2 className="text-hig-headline font-semibold">Financial Info</h2>
            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Chart updates as you edit</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-text transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FinancialInfo
            financials={financials}
            currentAge={currentAge}
            onSave={onSave}
          />
        </div>
      </div>
    </>
  )
}

// ── Main tab ───────────────────────────────────────────────────────────────────
export default function CashFlowTab({ financials, contact, onSaveFinancials, onDone }) {
  const { t } = useLanguage()
  const currentAge = useMemo(() => getCurrentAge(contact?.dob), [contact?.dob])

  // Local copy so chart reacts live to edits without waiting on a full store round-trip
  const [localFinancials, setLocalFinancials] = useState(financials)
  const [showEditor, setShowEditor] = useState(false)

  // Keep in sync if a parent update arrives (e.g. Quick Import from another tab)
  useEffect(() => {
    setLocalFinancials(financials)
  }, [financials])

  const [assumptions, setAssumptions] = useState({
    retirementAge: contact?.retirementAge ?? 55,
    expectedAge: 85,
    savingsRate: 5,
    inflationRate: 3,
    epfDividendRate: 5.5,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showCashSavings, setShowCashSavings] = useState(true)
  const [goals, setGoals] = useState([])
  const [scenarios, setScenarios] = useState([
    { id: 'ci', age: currentAge, duration: 3, active: false },
    { id: 'disability', age: currentAge, active: false },
    { id: 'death', age: currentAge, active: false },
  ])

  const summary = useMemo(() => {
    const income = Array.isArray(localFinancials?.income) ? localFinancials.income : []
    const expenses = Array.isArray(localFinancials?.expenses) ? localFinancials.expenses : []
    const assets = Array.isArray(localFinancials?.assets) ? localFinancials.assets : []
    const liabilities = Array.isArray(localFinancials?.liabilities) ? localFinancials.liabilities : []
    const investments = Array.isArray(localFinancials?.investments) ? localFinancials.investments : []

    const annualPassiveIncome = income
      .filter((row) => row.type !== 'Employment')
      .reduce((sum, row) => sum + toAnnual(row.amount, row.frequency), 0)
    const annualEmploymentIncome = income
      .filter((row) => row.type === 'Employment')
      .reduce((sum, row) => sum + toAnnual(row.amount, row.frequency), 0)

    const annualLivingExpenses = expenses.reduce((sum, row) => sum + toAnnual(row.amount, row.frequency), 0)
    const annualRepayments = liabilities.reduce(
      (sum, row) => sum + calcMonthlyRepayment(row.principal, row.interestRate, row.loanPeriod) * 12,
      0,
    )

    // Premiums/contributions already committed in the Protection and Retirement
    // planners. Shared helper so this matches the "surplus after plans" figure
    // the Planning Snapshot dashboard shows for the same contact — previously
    // this tab never subtracted them, so the two screens could disagree.
    const { totalMonthly: linkedPremiumsMonthly } = computeLinkedPlanPremiums(contact)
    const annualLinkedPremiums = linkedPremiumsMonthly * 12

    const initialInvestments = investments.reduce((sum, row) => sum + (Number(row.currentValue) || 0), 0)
    const investmentGrowthRate = initialInvestments > 0
      ? investments.reduce((sum, row) => sum + (Number(row.currentValue) || 0) * (Number(row.growthRate) || 0), 0) / initialInvestments
      : 0

    return {
      annualPassiveIncome,
      annualEmploymentIncome,
      annualIncome: annualPassiveIncome + annualEmploymentIncome,
      annualLivingExpenses,
      annualRepayments,
      annualLinkedPremiums,
      linkedPremiumsMonthly,
      // "Current year" total outflow — matches what afterPlans subtracts on the
      // dashboard, so the summary card and the dashboard agree on one number.
      annualExpenses: annualLivingExpenses + annualRepayments + annualLinkedPremiums,
      liabilities,
      initialSavings: Number(assets.find((row) => row.id === 'savings-cash')?.amount) || 0,
      initialEpf: Number(assets.find((row) => row.id === 'epf-all')?.amount) || 0,
      initialInvestments,
      investmentGrowthRate,
    }
  }, [localFinancials, contact])

  const chartData = useMemo(() => projectCashFlow({
    annualPassiveIncome: summary.annualPassiveIncome,
    annualEmploymentIncome: summary.annualEmploymentIncome,
    annualLivingExpenses: summary.annualLivingExpenses,
    liabilities: summary.liabilities,
    linkedPremiumsMonthly: summary.linkedPremiumsMonthly,
    initialSavings: summary.initialSavings,
    initialEpf: summary.initialEpf,
    initialInvestments: summary.initialInvestments,
    investmentGrowthRate: summary.investmentGrowthRate,
    currentAge,
    expectedAge: assumptions.expectedAge,
    retirementAge: assumptions.retirementAge,
    inflationRate: assumptions.inflationRate,
    savingsRate: assumptions.savingsRate,
    epfDividendRate: assumptions.epfDividendRate,
    goals,
    scenarios,
  }), [summary, currentAge, assumptions, goals, scenarios])

  const shortfallSummary = useMemo(() => summarizeShortfall(chartData), [chartData])
  const insurancePlans = useMemo(() => buildInsurancePlans(localFinancials), [localFinancials])
  const milestones = useMemo(() => getCashFlowMilestones(chartData, assumptions.retirementAge), [chartData, assumptions.retirementAge])
  const recommendations = useMemo(() => buildCashFlowRecommendations({
    financials: localFinancials, scenarios, shortfallSummary, t,
  }), [localFinancials, scenarios, shortfallSummary, t])

  const updateAssumption = (key, value) => {
    setAssumptions((current) => ({ ...current, [key]: value }))
  }

  const toggleScenario = (id) => {
    setScenarios((current) => current.map((scenario) => (
      scenario.id === id ? { ...scenario, active: !scenario.active } : scenario
    )))
  }

  const updateScenario = (id, patch) => {
    setScenarios((current) => current.map((scenario) => (
      scenario.id === id ? { ...scenario, ...patch } : scenario
    )))
  }

  const addGoal = (draft) => {
    setGoals((current) => ([
      ...current,
      {
        id: `g-${Date.now()}`,
        label: draft.label,
        age: Number(draft.age) || currentAge + 5,
        amount: Number(draft.amount) || 0,
        icon: draft.icon,
        active: true,
      },
    ]))
  }

  const toggleGoal = (id) => {
    setGoals((current) => current.map((goal) => (goal.id === id ? { ...goal, active: !goal.active } : goal)))
  }

  const removeGoal = (id) => {
    setGoals((current) => current.filter((goal) => goal.id !== id))
  }

  const handleEditorSave = (updated) => {
    setLocalFinancials(updated)
    onSaveFinancials?.(updated)
  }

  const openEditor = () => setShowEditor(true)
  const closeEditor = () => setShowEditor(false)

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!summary.annualIncome && !summary.annualExpenses) {
    return (
      <>
        <CashFlowEmptyState onEditFinancialInfo={openEditor} />
        {showEditor && (
          <FinancialInfoDrawer
            financials={localFinancials}
            currentAge={currentAge}
            onSave={handleEditorSave}
            onClose={closeEditor}
          />
        )}
      </>
    )
  }

  // ── Planner ──────────────────────────────────────────────────────────────────
  return (
    <>
      <PlannerLayout
        left={(
          <div className="space-y-4">
            <SectionCard
              bodyClassName="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              title={contact?.name}
              subtitle={`Age ${currentAge} • DOB ${formatDob(contact?.dob) || 'Not set'}`}
              action={(
                <div className="flex items-center gap-2">
                  <button onClick={openEditor} className="hig-btn-ghost gap-1.5">
                    <Edit size={14} /> {t('cashflow.editFinancialInfo')}
                  </button>
                  <button onClick={() => setShowSettings((value) => !value)} className={`hig-btn-ghost gap-1.5 ${showSettings ? 'bg-hig-gray-5 text-hig-blue' : ''}`}>
                    <Settings size={14} /> Assumptions
                  </button>
                </div>
              )}
            />

            {showSettings ? (
              <PlanningAssumptionsPanel
                assumptions={assumptions}
                currentAge={currentAge}
                onChange={updateAssumption}
              />
            ) : null}

            <CashFlowChart
              chartData={chartData}
              showCashSavings={showCashSavings}
              onToggleCashSavings={() => setShowCashSavings((value) => !value)}
              shortfallSummary={shortfallSummary}
              currentAge={currentAge}
            />

            <GoalsPanel
              goals={goals}
              onAddGoal={addGoal}
              onToggleGoal={toggleGoal}
              onRemoveGoal={removeGoal}
              currentAge={currentAge}
            />
          </div>
        )}
        right={(
          <>
            <CashFlowSummary
              annualIncome={summary.annualIncome}
              annualExpenses={summary.annualExpenses}
              annualRepayments={summary.annualRepayments}
              annualLinkedPremiums={summary.annualLinkedPremiums}
              shortfallSummary={shortfallSummary}
              milestones={milestones}
            />

            <ScenarioList
              scenarios={scenarios}
              onToggle={toggleScenario}
              onUpdate={updateScenario}
              currentAge={currentAge}
            />

            <RecommendationsPanel
              insurancePlans={insurancePlans}
              recommendations={recommendations}
            />
          </>
        )}
      />

      {showEditor && (
        <FinancialInfoDrawer
          financials={localFinancials}
          currentAge={currentAge}
          onSave={handleEditorSave}
          onClose={closeEditor}
        />
      )}
    </>
  )
}
