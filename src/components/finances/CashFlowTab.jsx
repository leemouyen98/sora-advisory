import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Plus, Settings, ChevronDown, MoreVertical, Check, X,
  Home, Activity, Heart, Shield, Lightbulb, BarChart2,
  RefreshCw, Edit, TrendingUp, Zap, Star,
} from 'lucide-react'

// ── Formatting ─────────────────────────────────────────────────────────────

function fmtAxis(v) {
  if (v >= 1_000_000) return `RM ${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `RM ${(v / 1_000).toFixed(0)}K`
  return `RM ${v}`
}

function fmtRM(v) {
  if (v === undefined || v === null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  const s =
    abs >= 1_000_000
      ? `RM ${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
      ? `RM ${(abs / 1_000).toFixed(0)}K`
      : `RM ${abs.toFixed(0)}`
  return v < 0 ? `−${s}` : s
}

function toAnnual(amount, frequency) {
  const map = { Monthly: 12, Yearly: 1, Quarterly: 4, 'Semi-annually': 2, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 12)
}

// ── Custom tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const bars = payload.filter((p) => Number(p.value) > 0 && p.dataKey !== 'cashSavingsEOY')
  const savings = payload.find((p) => p.dataKey === 'cashSavingsEOY')
  return (
    <div className="rounded-xl border border-hig-gray-5 bg-white shadow-lg p-3 text-hig-caption2" style={{ minWidth: 185 }}>
      <div className="font-semibold text-hig-subhead mb-2">Age {label}</div>
      {bars.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-hig-text-secondary">{p.name}</span>
          </div>
          <span className="font-medium">{fmtRM(p.value)}</span>
        </div>
      ))}
      {savings && Number(savings.value) > 0 && (
        <div className="flex items-center justify-between gap-3 mt-1.5 pt-1.5 border-t border-hig-gray-5">
          <div className="flex items-center gap-1.5">
            <div className="flex-shrink-0 bg-gray-800 rounded-full" style={{ width: 18, height: 2 }} />
            <span className="text-hig-text-secondary">Cash Savings (EOY)</span>
          </div>
          <span className="font-medium">{fmtRM(savings.value)}</span>
        </div>
      )}
    </div>
  )
}

// ── Small icon components ──────────────────────────────────────────────────

function ScenarioIcon({ type, size = 14 }) {
  const p = { size, strokeWidth: 1.5 }
  if (type === 'heart') return <Heart {...p} className="text-pink-500" />
  if (type === 'activity') return <Activity {...p} className="text-purple-500" />
  if (type === 'shield') return <Shield {...p} className="text-indigo-500" />
  return <Zap {...p} className="text-hig-text-secondary" />
}

function GoalIcon({ type, size = 14 }) {
  const p = { size, strokeWidth: 1.5 }
  if (type === 'home') return <Home {...p} className="text-green-600" />
  if (type === 'trending') return <TrendingUp {...p} className="text-blue-500" />
  if (type === 'star') return <Star {...p} className="text-amber-500" />
  return <Zap {...p} className="text-hig-text-secondary" />
}

// ── Reusable panel header ──────────────────────────────────────────────────

function PanelHeader({ title, actionLabel, onAction, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-hig-subhead font-semibold">{title}</span>
      <div className="flex items-center gap-2">
        {actionLabel && (
          <button onClick={onAction} className="text-hig-caption2 text-hig-blue font-medium hover:opacity-70">
            {actionLabel}
          </button>
        )}
        <button
          onClick={onAdd}
          className="w-6 h-6 rounded-full bg-hig-blue text-white flex items-center justify-center hover:opacity-80"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
        <button className="text-hig-text-secondary hover:opacity-70">
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Checkbox row ───────────────────────────────────────────────────────────

function CheckRow({ active, onToggle, iconBg, icon, title, subtitle, onRemove }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          active ? 'bg-hig-blue border-hig-blue' : 'border-hig-gray-4 bg-transparent'
        }`}
      >
        {active && <Check size={10} strokeWidth={3} className="text-white" />}
      </button>
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-hig-footnote font-medium truncate">{title}</div>
        {subtitle && (
          <div className="text-hig-caption2 text-hig-text-secondary truncate">{subtitle}</div>
        )}
      </div>
      {onRemove ? (
        <button onClick={onRemove} className="text-hig-text-secondary hover:text-red-500 transition-colors">
          <X size={13} />
        </button>
      ) : (
        <button className="text-hig-text-secondary hover:opacity-70">
          <MoreVertical size={13} />
        </button>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function CashFlowTab({ financials, contact, onEditFinancialInfo = null }) {

  // ── Planning assumptions ────────────────────────────────────────────────
  const [localRetirementAge, setLocalRetirementAge] = useState(contact?.retirementAge ?? 55)
  const [expectedAge, setExpectedAge] = useState(85)
  const [savingsRate, setSavingsRate] = useState(5.0)
  const [inflationRate, setInflationRate] = useState(3.0)
  const [showSettings, setShowSettings] = useState(false)

  // ── Chart display toggles ───────────────────────────────────────────────
  const [showCashSavings, setShowCashSavings] = useState(true)

  // ── Current age + DOB display ───────────────────────────────────────────
  const currentAge = useMemo(() => {
    if (!contact?.dob) return 30
    const d = new Date(contact.dob)
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
    return a
  }, [contact?.dob])

  const dobStr = useMemo(() => {
    if (!contact?.dob) return ''
    return new Date(contact.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }, [contact?.dob])

  // ── Goals ───────────────────────────────────────────────────────────────
  const [goals, setGoals] = useState([])
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({ label: '', age: '', amount: '', icon: 'home' })

  const toggleGoal = (id) => setGoals((g) => g.map((x) => (x.id === id ? { ...x, active: !x.active } : x)))
  const removeGoal = (id) => setGoals((g) => g.filter((x) => x.id !== id))

  const addGoal = () => {
    if (!newGoal.label || !newGoal.amount) return
    setGoals((g) => [...g, { ...newGoal, id: `g-${Date.now()}`, age: Number(newGoal.age) || currentAge + 5, amount: Number(newGoal.amount), active: true }])
    setShowAddGoal(false)
    setNewGoal({ label: '', age: '', amount: '', icon: 'home' })
  }

  // ── Scenarios ───────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState([
    { id: 'ci',         label: 'Critical Illness',  icon: 'heart',    age: currentAge, duration: 3, active: false },
    { id: 'disability', label: 'Disability (TPD)',  icon: 'activity', age: currentAge,              active: false },
    { id: 'death',      label: 'Death',             icon: 'shield',   age: currentAge,              active: false },
  ])
  // which scenario row is open for editing
  const [editingSc, setEditingSc] = useState(null)

  const toggleScenario  = (id) => setScenarios((s) => s.map((x) => (x.id === id ? { ...x, active: !x.active } : x)))
  const updateScenario  = (id, patch) => setScenarios((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  // ── Plan toggles ────────────────────────────────────────────────────────
  const [planStates, setPlanStates] = useState({})
  const isPlanActive = (id) => planStates[id] !== false
  const togglePlan = (id) => setPlanStates((s) => ({ ...s, [id]: !isPlanActive(id) }))
  const deactivateAllPlans = () => {
    const all = {}
    ;(Array.isArray(financials?.insurance) ? financials.insurance : []).forEach((p) => { all[p.id] = false })
    setPlanStates(all)
  }

  // ── Financial extraction ────────────────────────────────────────────────
  const { annualIncome, annualExpenses, initialSavings } = useMemo(() => {
    const fin = financials
    if (!fin) return { annualIncome: 0, annualExpenses: 0, initialSavings: 0 }
    const income   = Array.isArray(fin.income)   ? fin.income   : []
    const expenses = Array.isArray(fin.expenses) ? fin.expenses : []
    const assets   = Array.isArray(fin.assets)   ? fin.assets   : []
    return {
      annualIncome:   income.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0),
      annualExpenses: expenses.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0),
      initialSavings: Number(assets.find((a) => a.id === 'savings-cash')?.amount) || 0,
    }
  }, [financials])

  // ── Chart data projection ───────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!annualIncome && !annualExpenses) return []
    const ir = inflationRate / 100
    const sr = savingsRate / 100
    let pool = initialSavings

    const ciSc   = scenarios.find((s) => s.id === 'ci'         && s.active)
    const disSc  = scenarios.find((s) => s.id === 'disability' && s.active)
    const deadSc = scenarios.find((s) => s.id === 'death'      && s.active)

    const rows = []
    for (let i = 0; i <= expectedAge - currentAge; i++) {
      const age = currentAge + i
      const retired = age >= localRetirementAge

      // Income — off at retirement, or during CI recovery window, or permanently from disability/death
      const ciOff  = ciSc  && age >= ciSc.age  && age < ciSc.age + (ciSc.duration ?? 3)
      const disOff = disSc && age >= disSc.age
      const dedOff = deadSc && age >= deadSc.age
      const income = (retired || ciOff || disOff || dedOff) ? 0 : annualIncome

      // Expenses — base (inflation-adjusted) + Dreams lump sums at their target age
      const goalLump = goals.filter((g) => g.active && g.age === age).reduce((s, g) => s + g.amount, 0)
      const expenses = annualExpenses * Math.pow(1 + ir, i) + goalLump

      let takeHomeIncomeUsed = 0
      let cashUsed  = 0
      let shortfall = 0

      const surplus = income - expenses
      if (surplus >= 0) {
        takeHomeIncomeUsed = expenses
        pool = pool * (1 + sr) + surplus
      } else {
        takeHomeIncomeUsed = income
        const deficit = expenses - income
        if (pool >= deficit) {
          cashUsed = deficit
          pool = pool * (1 + sr) - deficit
        } else {
          cashUsed  = pool
          shortfall = deficit - pool
          pool = 0
        }
      }

      rows.push({
        age,
        takeHomeIncomeUsed: Math.round(takeHomeIncomeUsed),
        cashUsed:           Math.round(cashUsed),
        shortfall:          Math.round(shortfall),
        cashSavingsEOY:     Math.round(pool),
      })
    }
    return rows
  }, [annualIncome, annualExpenses, initialSavings, currentAge, expectedAge, localRetirementAge, inflationRate, savingsRate, goals, scenarios])

  // ── Shortfall summary ───────────────────────────────────────────────────
  const shortfallSummary = useMemo(() => {
    const sy = chartData.filter((d) => d.shortfall > 0)
    if (!sy.length) return null
    return { total: sy.reduce((s, d) => s + d.shortfall, 0), start: sy[0].age, end: sy[sy.length - 1].age }
  }, [chartData])

  // ── Recommendations — gap analysis + scenario-boosted priority ────────
  const recommendations = useMemo(() => {
    const ins = Array.isArray(financials?.insurance) ? financials.insurance : []
    const has = (...kws) => ins.some((p) => kws.some((kw) => (p.type ?? '').toLowerCase().includes(kw) || (p.name ?? '').toLowerCase().includes(kw)))

    const ciActive  = scenarios.find((s) => s.id === 'ci'         && s.active)
    const disActive = scenarios.find((s) => s.id === 'disability' && s.active)
    const dedActive = scenarios.find((s) => s.id === 'death'      && s.active)
    const hasShortfall = !!shortfallSummary

    const recs = []

    // CI — surfaced first when CI scenario is active and produces shortfall
    if (!has('critical', 'ci')) {
      const triggered = ciActive && hasShortfall
      recs.push({
        label:     'Critical Illness',
        desc:      triggered
          ? `Scenario shows ${fmtRM(shortfallSummary?.total)} shortfall over ${(ciActive?.duration ?? 3)}yr CI recovery — CI payout covers income gap`
          : 'Replaces income during CI recovery period',
        priority:  triggered,
      })
    }

    // TPD — surfaced when disability scenario active
    if (!has('disability', 'tpd', 'income protection')) {
      const triggered = disActive && hasShortfall
      recs.push({
        label:    'Total & Permanent Disability',
        desc:     triggered
          ? `Disability scenario shows ${fmtRM(shortfallSummary?.total)} shortfall — TPD lump sum bridges income loss`
          : 'Replaces income on permanent disability',
        priority: triggered,
      })
    }

    // Life — surfaced when death scenario active
    if (!has('life', 'term', 'death', 'wholelife', 'whole life')) {
      const triggered = dedActive && hasShortfall
      recs.push({
        label:    'Life Coverage',
        desc:     triggered
          ? `Death scenario shows ${fmtRM(shortfallSummary?.total)} shortfall — life sum assured covers dependants`
          : 'Income replacement for dependants',
        priority: triggered,
      })
    }

    // Always-on gaps
    if (!has('hospital', 'medical', 'h&s', 'surgical'))
      recs.push({ label: 'Hospital & Surgical', desc: 'Medical cost protection', priority: false })

    // Sort: scenario-triggered (priority) first
    return recs.sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0))
  }, [financials?.insurance, scenarios, shortfallSummary])

  // ── Insurance plans list ────────────────────────────────────────────────
  const insurancePlans = useMemo(() => {
    return (Array.isArray(financials?.insurance) ? financials.insurance : []).map((p) => ({
      id:       p.id,
      name:     p.name     || 'Policy',
      type:     p.type     || '',
      insurer:  p.insurer  || '',
      policyNo: p.policyNumber || '',
    }))
  }, [financials?.insurance])

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!annualIncome && !annualExpenses) {
    return (
      <div className="hig-card p-16 text-center">
        <div className="w-14 h-14 rounded-full bg-hig-gray-6 flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={22} className="text-hig-text-secondary" />
        </div>
        <div className="text-hig-title3 font-semibold mb-2">No Financial Data</div>
        <div className="text-hig-footnote text-hig-text-secondary mb-5">
          Enter income and expenses to generate a cash flow projection.
        </div>
        {onEditFinancialInfo && (
          <button onClick={onEditFinancialInfo} className="hig-btn-primary">
            Set up Financial Info
          </button>
        )}
      </div>
    )
  }

  const tickInterval = chartData.length > 50 ? 3 : chartData.length > 30 ? 2 : 1

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 items-start">

      {/* ══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 space-y-3.5">

        {/* Contact strip */}
        <div className="hig-card px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-hig-blue flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {contact?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="text-hig-body font-semibold truncate">{contact?.name}</div>
              <div className="text-hig-caption1 text-hig-text-secondary tracking-wide whitespace-nowrap">
                AGE: {currentAge}&nbsp;&nbsp;·&nbsp;&nbsp;DOB: {dobStr}
              </div>
            </div>
            <ChevronDown size={14} className="text-hig-text-secondary flex-shrink-0" />
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-hig-footnote text-hig-text-secondary hover:bg-hig-gray-6 transition-colors whitespace-nowrap">
              <BarChart2 size={13} />
              Compare Charts
            </button>
            {onEditFinancialInfo && (
              <button
                onClick={onEditFinancialInfo}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-hig-footnote text-hig-blue hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <Edit size={13} />
                Add/Edit
              </button>
            )}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-hig-gray-5 text-hig-blue' : 'text-hig-text-secondary hover:bg-hig-gray-6'}`}
            >
              <Settings size={15} />
            </button>
            <button className="p-2 rounded-lg text-hig-text-secondary hover:bg-hig-gray-6 transition-colors">
              <Lightbulb size={15} />
            </button>
          </div>
        </div>

        {/* Settings/assumptions panel */}
        {showSettings && (
          <div className="hig-card p-4">
            <div className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide mb-3">
              Planning Assumptions
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Retirement Age', value: localRetirementAge, set: setLocalRetirementAge, min: currentAge + 1, max: 80,  step: 1,   suffix: '' },
                { label: 'Expected Age',   value: expectedAge,        set: setExpectedAge,        min: 60,            max: 100, step: 1,   suffix: '' },
                { label: 'Savings Growth', value: savingsRate,        set: setSavingsRate,        min: 0,             max: 20,  step: 0.5, suffix: '%' },
                { label: 'Inflation Rate', value: inflationRate,      set: setInflationRate,      min: 0,             max: 15,  step: 0.5, suffix: '%' },
              ].map(({ label, value, set, min, max, step, suffix }) => (
                <div key={label}>
                  <label className="hig-label">{label}</label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      className="hig-input w-full"
                      value={value}
                      min={min} max={max} step={step}
                      onChange={(e) => set(Number(e.target.value))}
                    />
                    {suffix && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-footnote text-hig-text-secondary pointer-events-none">
                        {suffix}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart card */}
        <div className="hig-card p-4">

          {/* Breadcrumb + chart controls */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-hig-subhead">
              <span className="text-hig-text-secondary font-normal">Planner</span>
              <span className="text-hig-text-secondary mx-0.5">/</span>
              <button className="flex items-center gap-1.5 font-semibold hover:opacity-70">
                <BarChart2 size={14} className="text-hig-blue" />
                GoalsMapper Chart
                <ChevronDown size={13} className="text-hig-text-secondary" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {/* Cash Savings toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setShowCashSavings((s) => !s)}
                  className="relative rounded-full transition-colors cursor-pointer"
                  style={{
                    width: 40, height: 22,
                    background: showCashSavings ? '#007AFF' : '#C7C7CC',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: showCashSavings ? 'translateX(19px)' : 'translateX(2px)' }}
                  />
                </div>
                <span className="text-hig-footnote text-hig-text-secondary whitespace-nowrap">Cash Savings</span>
              </label>
              <div className="flex items-center gap-0.5">
                <button className="p-1.5 rounded-lg hover:bg-hig-gray-6 text-hig-text-secondary transition-colors"><BarChart2 size={14} /></button>
                <button className="p-1.5 rounded-lg hover:bg-hig-gray-6 text-hig-text-secondary transition-colors"><RefreshCw size={14} /></button>
                <button
                  onClick={() => setShowSettings((s) => !s)}
                  className={`p-1.5 rounded-lg text-hig-text-secondary transition-colors ${showSettings ? 'bg-hig-gray-5 text-hig-blue' : 'hover:bg-hig-gray-6'}`}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Shortfall / surplus pill */}
          <div className="flex justify-end mb-2">
            {shortfallSummary ? (
              <div className="flex items-stretch rounded-xl overflow-hidden border border-red-200">
                <div className="bg-red-50 px-3 py-1.5 flex flex-col justify-center">
                  <div className="text-hig-caption2 text-red-400 leading-none mb-0.5">Shortfall</div>
                  <div className="text-hig-caption1 text-red-600 font-semibold leading-none">
                    {shortfallSummary.start} to {shortfallSummary.end}
                  </div>
                </div>
                <button className="flex items-center gap-1 bg-red-500 text-white px-3 text-hig-caption1 font-semibold whitespace-nowrap hover:bg-red-600 transition-colors">
                  {fmtRM(shortfallSummary.total)} <ChevronDown size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5">
                <Check size={13} className="text-green-600" strokeWidth={2.5} />
                <span className="text-hig-caption2 text-green-700 font-semibold">No Shortfall</span>
              </div>
            )}
          </div>

          {/* Recharts ComposedChart */}
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: showCashSavings ? 76 : 8, bottom: 0, left: 8 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11, fill: '#8E8E93' }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#8E8E93' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtAxis}
                label={{ value: 'Expenses', angle: -90, position: 'insideLeft', offset: 16, style: { fontSize: 10, fill: '#8E8E93' } }}
                width={74}
              />
              {showCashSavings && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#8E8E93' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={fmtAxis}
                  label={{ value: 'Cash Savings (End of year)', angle: 90, position: 'insideRight', offset: 20, style: { fontSize: 10, fill: '#8E8E93' } }}
                  width={76}
                />
              )}
              <Tooltip content={<ChartTooltip />} />

              <Bar yAxisId="left" dataKey="takeHomeIncomeUsed" name="Take-home Income Used" stackId="a" fill="#5AC8FA" isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="cashUsed"           name="Cash Used"             stackId="a" fill="#FF9F0A" isAnimationActive={false} />
              <Bar yAxisId="left" dataKey="shortfall"          name="Shortfall"             stackId="a" fill="#FF3B30" radius={[2, 2, 0, 0]} isAnimationActive={false} />

              {showCashSavings && (
                <Line
                  yAxisId="right"
                  dataKey="cashSavingsEOY"
                  name="Cash Savings (End of year)"
                  stroke="#1C1C1E"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 justify-center">
            {[
              { color: '#FF3B30', label: 'Shortfall' },
              { color: '#FF9F0A', label: 'Cash Used' },
              { color: '#5AC8FA', label: 'Take-home Income Used' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-hig-caption2 text-hig-text-secondary">{item.label}</span>
              </div>
            ))}
            {showCashSavings && (
              <div className="flex items-center gap-1.5">
                <div style={{ width: 18, height: 2, background: '#1C1C1E', borderRadius: 1 }} />
                <span className="text-hig-caption2 text-hig-text-secondary">Cash Savings (End of year)</span>
              </div>
            )}
          </div>
        </div>

        {/* Dreams + Scenarios grid */}
        <div className="grid grid-cols-2 gap-4">

          {/* Dreams card */}
          <div className="hig-card p-4">
            <PanelHeader
              title="Dreams"
              actionLabel={goals.length ? 'Activate all' : null}
              onAction={() => setGoals((g) => g.map((x) => ({ ...x, active: true })))}
              onAdd={() => setShowAddGoal(true)}
            />

            {/* Add Dream form */}
            {showAddGoal && (
              <div className="bg-hig-gray-6 rounded-xl p-3 mb-3 space-y-2">
                <input
                  autoFocus
                  className="hig-input w-full text-hig-footnote"
                  placeholder="Dream (e.g. Buy Property)"
                  value={newGoal.label}
                  onChange={(e) => setNewGoal((g) => ({ ...g, label: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="hig-label">Age</label>
                    <input type="number" className="hig-input w-full mt-1 text-hig-footnote"
                      placeholder="e.g. 40" value={newGoal.age}
                      onChange={(e) => setNewGoal((g) => ({ ...g, age: e.target.value }))}
                      min={currentAge} max={expectedAge}
                    />
                  </div>
                  <div>
                    <label className="hig-label">Lump Sum (RM)</label>
                    <input type="number" className="hig-input w-full mt-1 text-hig-footnote"
                      placeholder="e.g. 60000" value={newGoal.amount}
                      onChange={(e) => setNewGoal((g) => ({ ...g, amount: e.target.value }))}
                    />
                  </div>
                </div>
                <select
                  className="hig-input w-full text-hig-caption2"
                  value={newGoal.icon}
                  onChange={(e) => setNewGoal((g) => ({ ...g, icon: e.target.value }))}
                >
                  <option value="home">🏠 Property (Down Payment)</option>
                  <option value="trending">📈 Investment / Business</option>
                  <option value="star">⭐ Other</option>
                </select>
                <div className="flex gap-2 pt-0.5">
                  <button onClick={addGoal} className="hig-btn-primary flex-1 py-1.5 text-hig-footnote">Add Dream</button>
                  <button onClick={() => setShowAddGoal(false)} className="hig-btn-ghost flex-1 py-1.5 text-hig-footnote">Cancel</button>
                </div>
              </div>
            )}

            {goals.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-hig-caption1 text-hig-text-secondary mb-2">No dreams added</div>
                <div className="text-hig-caption2 text-hig-text-secondary mb-3 leading-snug">
                  Dreams add a lump-sum expense to the chart at the target age
                </div>
                <button onClick={() => setShowAddGoal(true)} className="text-hig-caption2 text-hig-blue hover:opacity-70">
                  + Add your first dream
                </button>
              </div>
            ) : (
              <div className="space-y-0">
                {goals.map((goal) => (
                  <CheckRow
                    key={goal.id}
                    active={goal.active}
                    onToggle={() => toggleGoal(goal.id)}
                    iconBg="bg-green-100"
                    icon={<GoalIcon type={goal.icon} size={13} />}
                    title={goal.label}
                    subtitle={`@ ${goal.age} yo. · ${fmtRM(goal.amount)} lump sum`}
                    onRemove={() => removeGoal(goal.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Scenarios card */}
          <div className="hig-card p-4">
            <PanelHeader
              title="Scenarios"
              actionLabel="Activate all"
              onAction={() => setScenarios((s) => s.map((x) => ({ ...x, active: true })))}
              onAdd={() => {}}
            />
            <div className="space-y-0">
              {scenarios.map((sc) => (
                <div key={sc.id}>
                  {/* Row */}
                  <div className="flex items-center gap-2.5 py-1.5">
                    <button
                      onClick={() => toggleScenario(sc.id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        sc.active ? 'bg-hig-blue border-hig-blue' : 'border-hig-gray-4 bg-transparent'
                      }`}
                    >
                      {sc.active && <Check size={10} strokeWidth={3} className="text-white" />}
                    </button>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      sc.icon === 'heart' ? 'bg-pink-100' : sc.icon === 'activity' ? 'bg-purple-100' : 'bg-indigo-100'
                    }`}>
                      <ScenarioIcon type={sc.icon} size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-hig-footnote font-medium">{sc.label}</div>
                      <div className="text-hig-caption2 text-hig-text-secondary">
                        @ {sc.age} yo.
                        {sc.id === 'ci' && ` · ${sc.duration ?? 3} yr income loss`}
                        {sc.id === 'disability' && ' · income stops permanently'}
                        {sc.id === 'death' && ' · income stops permanently'}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingSc(editingSc === sc.id ? null : sc.id)}
                      className={`text-hig-text-secondary hover:opacity-70 transition-colors ${editingSc === sc.id ? 'text-hig-blue' : ''}`}
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>

                  {/* Inline edit panel */}
                  {editingSc === sc.id && (
                    <div className="ml-9 mb-2 p-2.5 bg-hig-gray-6 rounded-xl space-y-2">
                      <div className={`grid gap-2 ${sc.id === 'ci' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                          <label className="hig-label">Age when it happens</label>
                          <input
                            type="number"
                            className="hig-input w-full mt-1 text-hig-caption2"
                            value={sc.age}
                            min={currentAge} max={expectedAge}
                            onChange={(e) => updateScenario(sc.id, { age: Number(e.target.value) })}
                          />
                        </div>
                        {sc.id === 'ci' && (
                          <div>
                            <label className="hig-label">Income loss (years)</label>
                            <input
                              type="number"
                              className="hig-input w-full mt-1 text-hig-caption2"
                              value={sc.duration ?? 3}
                              min={1} max={10}
                              onChange={(e) => updateScenario(sc.id, { duration: Number(e.target.value) })}
                            />
                          </div>
                        )}
                      </div>
                      {sc.id === 'ci' && (
                        <div className="text-hig-caption2 text-hig-text-secondary leading-snug">
                          Income drops to RM 0 from age {sc.age} to {sc.age + (sc.duration ?? 3) - 1}. Expenses continue at inflation rate — cash savings drawn down, then shortfall.
                        </div>
                      )}
                      {sc.id !== 'ci' && (
                        <div className="text-hig-caption2 text-hig-text-secondary leading-snug">
                          Income permanently stops from age {sc.age}. Savings drawn down, then shortfall.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ══ RIGHT COLUMN ═════════════════════════════════════════════════════ */}
      <div className="w-72 flex-shrink-0 space-y-3.5">

        {/* Recommendations */}
        <div className="hig-card p-4">
          <PanelHeader title="Recommendations" actionLabel="Activate all" onAdd={() => {}} />
          {recommendations.length === 0 ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Check size={15} className="text-green-600" strokeWidth={2.5} />
              </div>
              <div className="text-hig-footnote text-hig-text-secondary">All key coverages in place</div>
            </div>
          ) : (
            <>
              <button className="flex items-center gap-1.5 text-hig-footnote text-hig-blue mb-3 hover:opacity-70">
                <Plus size={13} />
                Add New Recommendations
              </button>
              <div className="space-y-1">
                {recommendations.map((rec) => (
                  <div
                    key={rec.label}
                    className={`flex items-start gap-2.5 py-1.5 px-2 rounded-xl transition-colors ${
                      rec.priority ? 'bg-red-50 border border-red-100' : ''
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${rec.priority ? 'bg-red-100' : 'bg-amber-100'}`}>
                      <Lightbulb size={13} className={rec.priority ? 'text-red-500' : 'text-amber-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-hig-footnote font-semibold ${rec.priority ? 'text-red-600' : ''}`}>
                        {rec.label}
                        {rec.priority && <span className="ml-1.5 text-hig-caption2 font-normal bg-red-500 text-white px-1.5 py-0.5 rounded-md">Triggered</span>}
                      </div>
                      <div className="text-hig-caption2 text-hig-text-secondary leading-snug mt-0.5">{rec.desc}</div>
                    </div>
                    <button className="text-hig-text-secondary hover:opacity-70 flex-shrink-0 mt-0.5">
                      <MoreVertical size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Existing Plans */}
        <div className="hig-card p-4">
          <PanelHeader
            title="Existing Plans"
            actionLabel={insurancePlans.length ? 'Deactivate All' : null}
            onAction={deactivateAllPlans}
            onAdd={() => onEditFinancialInfo?.()}
          />
          {insurancePlans.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-hig-footnote text-hig-text-secondary mb-2">No insurance plans added</div>
              {onEditFinancialInfo && (
                <button onClick={onEditFinancialInfo} className="text-hig-caption2 text-hig-blue hover:opacity-70">
                  + Add plans
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {insurancePlans.map((plan) => (
                <CheckRow
                  key={plan.id}
                  active={isPlanActive(plan.id)}
                  onToggle={() => togglePlan(plan.id)}
                  iconBg="bg-green-100"
                  icon={<Shield size={13} className="text-green-600" strokeWidth={1.5} />}
                  title={plan.name}
                  subtitle={[plan.type, plan.insurer, plan.policyNo].filter(Boolean).join(' | ')}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
