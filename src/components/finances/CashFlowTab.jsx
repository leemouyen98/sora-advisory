import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { Settings, Info, TrendingUp, Pencil, ChevronDown } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

// ─── Surplus dot label — renders on top of the surplusDot marker bar ─────────
function SurplusDotLabel({ x, y, width, value }) {
  if (!value) return null
  return (
    <g>
      <circle
        cx={x + width / 2}
        cy={y - 6}
        r={4}
        fill="#34C759"
        stroke="white"
        strokeWidth={1.5}
      />
    </g>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toAnnual(amount, frequency) {
  const map = { Monthly: 12, Yearly: 1, Quarterly: 4, 'Semi-annually': 2, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 12)
}

function calcMonthlyRepayment(principal, interestRate, loanPeriod) {
  const P = Number(principal) || 0
  const r = (Number(interestRate) || 0) / 100 / 12
  const n = Number(loanPeriod) || 1
  if (P === 0) return 0
  if (r === 0) return P / n
  return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
}

function fmtK(val) {
  if (val === 0) return '0'
  const abs = Math.abs(val)
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${(val / 1_000).toFixed(0)}K`
  return String(Math.round(val))
}

// ─── Projection engine ────────────────────────────────────────────────────────
function projectCashFlow(financials, currentAge, retirementAge, expectedAge, growthRate, inflationRate) {
  const assets      = financials.assets      || []
  const liabilities = financials.liabilities || []
  const income      = Array.isArray(financials.income)  ? financials.income  : []
  const expenses    = Array.isArray(financials.expenses) ? financials.expenses : []

  let savingsPool = assets.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const activeIncomeRows  = income.filter(r => r.id === 'gross-income' || r.id === 'bonus')
  const passiveIncomeRows = income.filter(r => !r.fixed)

  const baseActiveAnnual  = activeIncomeRows.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0)
  const basePassiveAnnual = passiveIncomeRows.reduce((s, r) => s + toAnnual(r.amount, r.frequency), 0)

  const rows = []

  for (let age = currentAge; age <= expectedAge; age++) {
    const yearsFromNow = age - currentAge
    const inflMult = Math.pow(1 + inflationRate / 100, yearsFromNow)

    let annualExp = expenses
      .filter(e => (e.ageFrom ?? currentAge) <= age && age <= (e.ageTo ?? expectedAge))
      .reduce((s, e) => {
        const factor = e.inflationLinked === false ? 1 : inflMult
        return s + toAnnual(e.amount, e.frequency) * factor
      }, 0)

    liabilities.forEach(l => {
      const loanEndAge = (Number(l.startAge) || currentAge) + (Number(l.loanPeriod) || 360) / 12
      if ((Number(l.startAge) || currentAge) <= age && age < loanEndAge) {
        annualExp += calcMonthlyRepayment(l.principal, l.interestRate, l.loanPeriod) * 12
      }
    })

    const activeIncome  = age < retirementAge ? baseActiveAnnual : 0
    const passiveIncome = basePassiveAnnual * inflMult
    const totalIncome   = activeIncome + passiveIncome

    let remaining = annualExp
    const passiveCovered = Math.min(remaining, passiveIncome)
    remaining -= passiveCovered
    const activeCovered  = Math.min(remaining, activeIncome)
    remaining -= activeCovered

    savingsPool *= (1 + growthRate / 100)

    let savingsDraw = 0
    let shortfall   = 0
    let surplusAmt  = 0

    if (remaining <= 0) {
      surplusAmt  = Math.round(totalIncome - annualExp)
      savingsPool += surplusAmt
    } else {
      const draw  = Math.min(remaining, Math.max(0, savingsPool))
      savingsDraw = draw
      shortfall   = remaining - draw
      savingsPool = Math.max(0, savingsPool - draw)
    }

    rows.push({
      age,
      passive:    Math.round(passiveCovered),
      active:     Math.round(activeCovered),
      savings:    Math.round(savingsDraw),
      shortfall:  Math.round(shortfall),
      total:      Math.round(annualExp),
      pool:       Math.round(savingsPool),
      income:     Math.round(totalIncome),
      surplusAmt,
      surplusDot: surplusAmt > 0 ? 1 : 0,
    })
  }

  return rows
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CFTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const isSurplus = (d.surplusAmt || 0) > 0
  return (
    <div className="bg-white border border-hig-gray-5 rounded-hig shadow-hig p-3 text-hig-caption1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-hig-subhead font-semibold">Age {label}</p>
        {isSurplus && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-hig-green/15 text-hig-green rounded-full leading-none">
            SURPLUS ✓
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-hig-text-secondary">Total Expenses</span>
          <span className="font-medium tabular-nums">{formatRMFull(d.total)}</span>
        </div>
        {d.passive > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#30D158' }}>Passive Income</span>
            <span className="font-medium tabular-nums">{formatRMFull(d.passive)}</span>
          </div>
        )}
        {d.active > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#007AFF' }}>Active Income</span>
            <span className="font-medium tabular-nums">{formatRMFull(d.active)}</span>
          </div>
        )}
        {d.savings > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#FF9F0A' }}>Savings Draw</span>
            <span className="font-medium tabular-nums">{formatRMFull(d.savings)}</span>
          </div>
        )}
        {d.shortfall > 0 && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#FF3B30' }}>Shortfall</span>
            <span className="font-semibold tabular-nums text-hig-red">{formatRMFull(d.shortfall)}</span>
          </div>
        )}
        {isSurplus && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#32ADE6' }}>Saved to pool</span>
            <span className="font-semibold tabular-nums" style={{ color: '#32ADE6' }}>+{formatRMFull(d.surplusAmt)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-1 border-t border-hig-gray-5 mt-1">
          <span className="text-hig-text-secondary">Savings Balance</span>
          <span className={`font-medium tabular-nums ${d.pool > 0 ? '' : 'text-hig-red'}`}>{formatRMFull(d.pool)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CashFlowTab({ financials, contact, onEditFinancialInfo = null }) {
  const currentAge = useMemo(() => {
    if (!contact?.dob) return 30
    const d = new Date(contact.dob)
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
    return Math.max(18, a)
  }, [contact?.dob])

  const [expectedAge,        setExpectedAge]        = useState(80)
  const [growthRate,         setGrowthRate]         = useState(3.5)
  const [inflationRate,      setInflationRate]      = useState(3.0)
  const [showSettings,       setShowSettings]       = useState(false)
  const [showCashSavings,    setShowCashSavings]    = useState(false)
  const [showSavingsLine,    setShowSavingsLine]    = useState(true)
  const [localRetirementAge, setLocalRetirementAge] = useState(() => contact?.retirementAge ?? 55)

  const retirementAge = localRetirementAge

  const data = useMemo(() => {
    if (!financials || !Array.isArray(financials.assets)) return []
    return projectCashFlow(financials, currentAge, retirementAge, expectedAge, growthRate, inflationRate)
  }, [financials, currentAge, retirementAge, expectedAge, growthRate, inflationRate])

  const summary = useMemo(() => {
    if (!data.length) return null
    const shortfallYears    = data.filter(d => d.shortfall > 0)
    const firstShortfall    = shortfallYears[0]
    const totalShortfall    = shortfallYears.reduce((s, d) => s + d.shortfall, 0)
    const savingsDepletedAt = data.find(d => d.pool === 0 && data[data.indexOf(d) - 1]?.pool > 0)
    const surplusYears      = data.filter(d => (d.surplusAmt || 0) > 0)
    const totalSurplus      = surplusYears.reduce((s, d) => s + (d.surplusAmt || 0), 0)
    return { firstShortfall, totalShortfall, savingsDepletedAt, shortfallYears: shortfallYears.length, surplusYears: surplusYears.length, totalSurplus }
  }, [data])

  const hasData = data.length > 0 && data.some(d => d.total > 0)

  if (!hasData) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-blue/10 flex items-center justify-center mb-4">
          <Info size={26} className="text-hig-blue" />
        </div>
        <p className="text-hig-headline font-semibold mb-1">Cash Flow Projection</p>
        <p className="text-hig-subhead text-hig-text-secondary text-center max-w-xs mb-4">
          Add income and expenses in Financial Info to generate a projection.
        </p>
        {onEditFinancialInfo && (
          <button onClick={onEditFinancialInfo} className="hig-btn-primary gap-1.5">
            <Pencil size={14} /> Set up Financial Info
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + Assumptions toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Cash Flow Projection</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
            Age {currentAge} → {expectedAge} · Retirement at {retirementAge} · Growth {growthRate}% · Inflation {inflationRate}%
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className={`hig-btn-ghost gap-1.5 ${showSettings ? 'text-hig-blue' : ''}`}
        >
          <Settings size={14} /> Assumptions
          <ChevronDown size={12} className={`transition-transform duration-hig ${showSettings ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Assumptions panel */}
      {showSettings && (
        <div className="hig-card p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="hig-label">Retirement Age</label>
              <input
                type="number" min={currentAge + 1} max={80}
                value={localRetirementAge}
                onChange={e => setLocalRetirementAge(parseInt(e.target.value) || 55)}
                className="hig-input"
              />
            </div>
            <div>
              <label className="hig-label">Expected Age</label>
              <input
                type="number" min={currentAge + 1} max={120}
                value={expectedAge}
                onChange={e => setExpectedAge(parseInt(e.target.value) || 80)}
                className="hig-input"
              />
            </div>
            <div>
              <label className="hig-label">Savings Growth Rate (%)</label>
              <input
                type="number" step="0.5" min="0" max="15"
                value={growthRate}
                onChange={e => setGrowthRate(parseFloat(e.target.value) || 0)}
                className="hig-input"
              />
            </div>
            <div>
              <label className="hig-label">Inflation Rate (%)</label>
              <input
                type="number" step="0.5" min="0" max="15"
                value={inflationRate}
                onChange={e => setInflationRate(parseFloat(e.target.value) || 0)}
                className="hig-input"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-hig-caption1 text-hig-text-secondary flex items-center gap-1.5">
              <Info size={12} />
              Retirement age is session-only. Investments excluded from savings pool.
            </p>
            {onEditFinancialInfo && (
              <button
                onClick={onEditFinancialInfo}
                className="flex items-center gap-1.5 text-hig-caption1 text-hig-blue hover:text-hig-blue/80 transition-colors"
              >
                <Pencil size={12} /> Edit Financial Info
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary chips */}
      {summary && (
        <div className="flex gap-3 flex-wrap">
          {summary.firstShortfall ? (
            <div className="px-3 py-2 rounded-hig-sm bg-hig-red/10 border border-hig-red/20">
              <p className="text-hig-caption2 text-hig-red font-semibold">FIRST SHORTFALL</p>
              <p className="text-hig-subhead font-bold text-hig-red">Age {summary.firstShortfall.age}</p>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-hig-sm bg-hig-green/10 border border-hig-green/20">
              <p className="text-hig-caption2 text-hig-green font-semibold">NO SHORTFALL</p>
              <p className="text-hig-subhead font-bold text-hig-green">Funded to age {expectedAge}</p>
            </div>
          )}
          {summary.totalShortfall > 0 && (
            <div className="px-3 py-2 rounded-hig-sm bg-hig-red/10 border border-hig-red/20">
              <p className="text-hig-caption2 text-hig-red font-semibold">TOTAL SHORTFALL</p>
              <p className="text-hig-subhead font-bold text-hig-red">{formatRMFull(summary.totalShortfall)}</p>
            </div>
          )}
          {summary.savingsDepletedAt && (
            <div className="px-3 py-2 rounded-hig-sm bg-orange-50 border border-orange-200">
              <p className="text-hig-caption2 text-orange-600 font-semibold">SAVINGS DEPLETED</p>
              <p className="text-hig-subhead font-bold text-orange-600">Age {summary.savingsDepletedAt.age}</p>
            </div>
          )}
          {summary.surplusYears > 0 && (
            <div className="px-3 py-2 rounded-hig-sm bg-hig-green/10 border border-hig-green/20 flex items-start gap-2">
              <TrendingUp size={14} className="text-hig-green mt-0.5 shrink-0" />
              <div>
                <p className="text-hig-caption2 text-hig-green font-semibold">SURPLUS YEARS</p>
                <p className="text-hig-subhead font-bold text-hig-green">{summary.surplusYears} yrs</p>
                <p className="text-hig-caption2 text-hig-green/70">{formatRMFull(summary.totalSurplus)} added</p>
              </div>
            </div>
          )}
          <div className="px-3 py-2 rounded-hig-sm bg-hig-gray-6 border border-hig-gray-5">
            <p className="text-hig-caption2 text-hig-text-secondary font-semibold">FINAL SAVINGS</p>
            <p className={`text-hig-subhead font-bold ${data[data.length - 1]?.pool > 0 ? 'text-hig-text' : 'text-hig-red'}`}>
              {formatRMFull(data[data.length - 1]?.pool ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* ── Main bar chart ── */}
      <div className="hig-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
            Annual Expenses Coverage
          </p>
          <div className="flex items-center gap-2">
            {/* Cash Savings stacked bar toggle */}
            <button
              onClick={() => setShowCashSavings(s => !s)}
              className={`flex items-center gap-1.5 text-hig-caption2 px-2.5 py-1 rounded-hig-sm border transition-colors
                ${showCashSavings
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                  : 'bg-hig-gray-6 border-hig-gray-5 text-hig-text-secondary hover:border-hig-gray-3'
                }`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8">
                <rect width="8" height="8" rx="1.5" fill={showCashSavings ? '#32ADE6' : '#8E8E93'} />
              </svg>
              Cash Savings
            </button>
            {/* Surplus dot legend (shown when Cash Savings bar is off) */}
            {!showCashSavings && (
              <div className="flex items-center gap-1.5 text-hig-caption2 text-hig-text-secondary">
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4" fill="#34C759" stroke="white" strokeWidth="1.5" />
                </svg>
                <span>Surplus year</span>
              </div>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 14, right: 16, left: 8, bottom: 4 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip content={<CFTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(val) => <span style={{ color: '#3C3C43' }}>{val}</span>}
            />
            {retirementAge <= expectedAge && (
              <ReferenceLine
                x={retirementAge}
                stroke="#8E8E93"
                strokeDasharray="4 3"
                label={{ value: `Retire ${retirementAge}`, position: 'top', fontSize: 10, fill: '#8E8E93' }}
              />
            )}

            {/* Expense coverage stack */}
            <Bar dataKey="passive"   name="Passive Income"  stackId="a" fill="#30D158" radius={[0,0,0,0]} />
            <Bar dataKey="active"    name="Active Income"   stackId="a" fill="#007AFF" radius={[0,0,0,0]} />
            <Bar dataKey="savings"   name="Savings Draw"    stackId="a" fill="#FF9F0A" radius={[0,0,0,0]} />
            <Bar dataKey="shortfall" name="Shortfall"       stackId="a" fill="#FF3B30" radius={[2,2,0,0]} />

            {/* Cash Savings: either visible teal bar OR invisible dot marker */}
            {showCashSavings ? (
              <Bar
                dataKey="surplusAmt"
                name="Cash Savings"
                stackId="a"
                fill="#32ADE6"
                radius={[2,2,0,0]}
                isAnimationActive={false}
              />
            ) : (
              <Bar
                dataKey="surplusDot"
                stackId="a"
                fill="transparent"
                legendType="none"
                isAnimationActive={false}
                label={<SurplusDotLabel />}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Savings pool balance line ── */}
      <div className="hig-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
            Savings Pool Balance
          </p>
          <button
            onClick={() => setShowSavingsLine(s => !s)}
            className={`flex items-center gap-1.5 text-hig-caption2 px-2.5 py-1 rounded-hig-sm border transition-colors
              ${showSavingsLine
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-hig-gray-6 border-hig-gray-5 text-hig-text-secondary hover:border-hig-gray-3'
              }`}
          >
            <svg width="8" height="3" viewBox="0 0 8 3">
              <line x1="0" y1="1.5" x2="8" y2="1.5" stroke={showSavingsLine ? '#5856D6' : '#8E8E93'} strokeWidth="2.5" />
            </svg>
            {showSavingsLine ? 'Hide Line' : 'Show Line'}
          </button>
        </div>
        {showSavingsLine && (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11, fill: '#8E8E93' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fontSize: 11, fill: '#8E8E93' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                formatter={(val) => [formatRMFull(val), 'Savings Balance']}
                labelFormatter={(l) => `Age ${l}`}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E5EA' }}
              />
              <ReferenceLine y={0} stroke="#FF3B30" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="pool"
                stroke="#5856D6"
                strokeWidth={2}
                dot={false}
                name="Savings Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
