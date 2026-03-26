import { useMemo, useState } from 'react'
import { Edit, Lightbulb, Settings, TrendingUp } from 'lucide-react'
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
import {
  buildCashFlowRecommendations,
  buildInsurancePlans,
  getCashFlowMilestones,
  projectCashFlow,
  summarizeShortfall,
  toAnnual,
} from '../../lib/cashflow'

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

export default function CashFlowTab({ financials, contact, onEditFinancialInfo = null }) {
  const { t } = useLanguage()
  const currentAge = useMemo(() => getCurrentAge(contact?.dob), [contact?.dob])
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
    const income = Array.isArray(financials?.income) ? financials.income : []
    const expenses = Array.isArray(financials?.expenses) ? financials.expenses : []
    const assets = Array.isArray(financials?.assets) ? financials.assets : []

    return {
      annualIncome: income.reduce((sum, row) => sum + toAnnual(row.amount, row.frequency), 0),
      annualExpenses: expenses.reduce((sum, row) => sum + toAnnual(row.amount, row.frequency), 0),
      initialSavings: Number(assets.find((row) => row.id === 'savings-cash')?.amount) || 0,
      initialEpf: Number(assets.find((row) => row.id === 'epf-all')?.amount) || 0,
    }
  }, [financials])

  const chartData = useMemo(() => projectCashFlow({
    ...summary,
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
  const recommendations = useMemo(() => buildCashFlowRecommendations({
    financials,
    scenarios,
    shortfallSummary,
    t,
  }), [financials, scenarios, shortfallSummary, t])
  const insurancePlans = useMemo(() => buildInsurancePlans(financials), [financials])
  const milestones = useMemo(() => getCashFlowMilestones(chartData), [chartData])

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

  if (!summary.annualIncome && !summary.annualExpenses) {
    return <CashFlowEmptyState onEditFinancialInfo={onEditFinancialInfo} />
  }

  return (
    <PlannerLayout
      left={(
        <div className="space-y-4">
          <SectionCard
            bodyClassName="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            title={contact?.name}
            subtitle={`Age ${currentAge} • DOB ${formatDob(contact?.dob) || 'Not set'}`}
            action={(
              <div className="flex items-center gap-2">
                {onEditFinancialInfo ? (
                  <button onClick={onEditFinancialInfo} className="hig-btn-ghost gap-1.5">
                    <Edit size={14} /> {t('cashflow.editFinancialInfo')}
                  </button>
                ) : null}
                <button onClick={() => setShowSettings((value) => !value)} className={`hig-btn-ghost gap-1.5 ${showSettings ? 'bg-hig-gray-5 text-hig-blue' : ''}`}>
                  <Settings size={14} /> Assumptions
                </button>
                <button className="hig-btn-ghost gap-1.5">
                  <Lightbulb size={14} /> Advice view
                </button>
              </div>
            )}
          >
            <div className="hidden" />
          </SectionCard>

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
          <SectionCard title="Quick lens" subtitle="The planner should tell the story before the adviser does.">
            <div className="flex items-center gap-2 rounded-hig-sm bg-hig-blue/10 px-3 py-2 text-hig-footnote text-hig-blue">
              <TrendingUp size={15} />
              Full-suite cash flow projection is active.
            </div>
          </SectionCard>

          <CashFlowSummary
            annualIncome={summary.annualIncome}
            annualExpenses={summary.annualExpenses}
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
            recommendations={recommendations}
            insurancePlans={insurancePlans}
          />
        </>
      )}
    />
  )
}
