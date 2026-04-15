import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import SectionCard from '../../ui/SectionCard'
import { formatAxisLabel, formatRMCompact } from '../../../lib/cashflow'

// GoalsMapper colour palette
const COLOURS = {
  takeHomeIncomeUsed: '#3D8EF5', // blue  — active income
  cashUsed:           '#FF9F00', // amber — cash savings drawdown
  passiveIncomeUsed:  '#34C759', // green — EPF / passive income
  shortfall:          '#FF3B30', // red   — funding gap
  savingsLine:        '#1A1A2E', // near-black dashed line
}

export default function CashFlowChart({
  chartData,
  showCashSavings,
  onToggleCashSavings,
  shortfallSummary,
  currentAge,
}) {
  const [selectedAge, setSelectedAge] = useState(null)

  const tickInterval = chartData.length > 50 ? 3 : chartData.length > 30 ? 2 : 1
  const selectedRow = selectedAge != null
    ? chartData.find((r) => r.age === selectedAge)
    : chartData.find((r) => r.age === currentAge) ?? chartData[0]

  const maxSavings = Math.max(...chartData.map((r) => r.cashSavingsEOY ?? 0), 1)

  function handleBarClick(data) {
    if (data?.activePayload?.[0]) {
      setSelectedAge(data.activeLabel)
    }
  }

  const hasShortfall = Boolean(shortfallSummary)

  return (
    <SectionCard
      title="Cash Flow Planner"
      subtitle="Expenses by age — passive income, take-home, cash, and shortfall."
      action={
        <div className="flex items-center gap-3">
          {/* Cash savings toggle */}
          <label className="flex cursor-pointer items-center gap-2 select-none text-hig-footnote text-hig-text-secondary">
            <button
              type="button"
              onClick={onToggleCashSavings}
              className="relative h-[22px] w-10 rounded-full transition-colors"
              style={{ background: showCashSavings ? '#2E96FF' : '#C7C7CC' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: showCashSavings ? 'translateX(19px)' : 'translateX(2px)' }}
              />
            </button>
            Cash savings
          </label>
        </div>
      }
    >
      {/* ── Shortfall / Affordability banner ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        {/* View Details */}
        <div className="flex items-center gap-2 text-hig-footnote text-hig-text-secondary">
          <span className="font-medium text-hig-text">
            VIEW DETAILS @ AGE {selectedRow?.age ?? currentAge}
          </span>
          <span className="text-hig-gray-3">·</span>
          <span className={hasShortfall ? 'font-semibold text-hig-red' : 'font-semibold text-hig-green'}>
            {hasShortfall ? 'NOT AFFORDABLE' : 'AFFORDABLE'}
          </span>
        </div>

        {/* Shortfall badge */}
        {hasShortfall ? (
          <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-hig-caption1 font-semibold text-hig-red ring-1 ring-inset ring-red-200">
            <span className="uppercase tracking-wide text-hig-caption2 text-red-400">Shortfall</span>
            <span>{shortfallSummary.start} to {shortfallSummary.end}</span>
            <span className="ml-1 text-hig-subhead font-bold">{formatRMCompact(shortfallSummary.total)}</span>
          </div>
        ) : (
          <div className="rounded-full bg-green-50 px-3 py-1 text-hig-caption1 font-semibold text-hig-green ring-1 ring-inset ring-green-200">
            Fully funded
          </div>
        )}
      </div>

      {/* ── Selected age detail strip ── */}
      {selectedRow && (
        <AgeDetailStrip row={selectedRow} showCashSavings={showCashSavings} />
      )}

      {/* ── Chart ── */}
      <div className="mt-3 h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: showCashSavings ? 72 : 8, left: 0, bottom: 0 }}
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              interval={tickInterval}
              axisLine={false}
              tickLine={false}
            />
            {/* Left axis — expenses */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              tickFormatter={formatAxisLabel}
              axisLine={false}
              tickLine={false}
              width={78}
              label={{ value: 'Expenses', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 10, fill: '#8E8E93' } }}
            />
            {/* Right axis — cash savings (only when toggle on) */}
            {showCashSavings && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#2E96FF' }}
                tickFormatter={formatAxisLabel}
                axisLine={false}
                tickLine={false}
                width={72}
                label={{ value: 'Cash Savings', angle: 90, position: 'insideRight', offset: 16, style: { fontSize: 10, fill: '#2E96FF' } }}
              />
            )}
            <Tooltip content={<ChartTooltip />} />

            {/* Stacked bars — order: Passive → Income → Cash → Shortfall */}
            <Bar
              yAxisId="left"
              dataKey="passiveIncomeUsed"
              name="Passive income"
              stackId="flow"
              fill={COLOURS.passiveIncomeUsed}
              radius={[0, 0, 0, 0]}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`pass-${entry.age}`}
                  fill={COLOURS.passiveIncomeUsed}
                  opacity={selectedAge != null && entry.age !== selectedAge ? 0.55 : 1}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="takeHomeIncomeUsed"
              name="Income used"
              stackId="flow"
              fill={COLOURS.takeHomeIncomeUsed}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`inc-${entry.age}`}
                  fill={COLOURS.takeHomeIncomeUsed}
                  opacity={selectedAge != null && entry.age !== selectedAge ? 0.55 : 1}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="cashUsed"
              name="Cash used"
              stackId="flow"
              fill={COLOURS.cashUsed}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cash-${entry.age}`}
                  fill={COLOURS.cashUsed}
                  opacity={selectedAge != null && entry.age !== selectedAge ? 0.55 : 1}
                />
              ))}
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="shortfall"
              name="Shortfall"
              stackId="flow"
              fill={COLOURS.shortfall}
              radius={[2, 2, 0, 0]}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`sf-${entry.age}`}
                  fill={COLOURS.shortfall}
                  opacity={selectedAge != null && entry.age !== selectedAge ? 0.55 : 1}
                />
              ))}
            </Bar>

            {/* Cash savings dashed line */}
            {showCashSavings && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cashSavingsEOY"
                name="Cash savings"
                stroke={COLOURS.savingsLine}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: COLOURS.savingsLine }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-hig-caption2 text-hig-text-secondary">
        {[
          { colour: COLOURS.passiveIncomeUsed,  label: 'Passive income' },
          { colour: COLOURS.takeHomeIncomeUsed, label: 'Take-home income' },
          { colour: COLOURS.cashUsed,           label: 'Cash savings' },
          { colour: COLOURS.shortfall,          label: 'Shortfall' },
        ].map(({ colour, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
            {label}
          </span>
        ))}
        {showCashSavings && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-5 rounded"
              style={{ borderTop: `2px dashed ${COLOURS.savingsLine}` }}
            />
            Cash savings
          </span>
        )}
      </div>
    </SectionCard>
  )
}

// ── Selected age detail strip ────────────────────────────────────────────────
function AgeDetailStrip({ row, showCashSavings }) {
  const totalExpenses = (row.takeHomeIncomeUsed ?? 0) + (row.cashUsed ?? 0) + (row.passiveIncomeUsed ?? 0) + (row.shortfall ?? 0)
  return (
    <div className="mt-1 rounded-hig-sm border border-hig-gray-5 bg-hig-gray-6/60 px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-hig-footnote font-semibold text-hig-text">Age {row.age} snapshot</span>
        <span className="text-hig-caption1 text-hig-text-secondary">
          Total expenses: <span className="font-medium text-hig-text">{formatRMCompact(totalExpenses)}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-hig-caption2 sm:grid-cols-4">
        <DetailItem colour={COLOURS.passiveIncomeUsed}  label="Passive income"  value={row.passiveIncomeUsed} />
        <DetailItem colour={COLOURS.takeHomeIncomeUsed} label="Take-home income" value={row.takeHomeIncomeUsed} />
        <DetailItem colour={COLOURS.cashUsed}           label="Cash savings"    value={row.cashUsed} />
        <DetailItem colour={COLOURS.shortfall}          label="Shortfall"       value={row.shortfall} />
      </div>
      {showCashSavings && (
        <div className="mt-1.5 border-t border-hig-gray-5 pt-1.5 text-hig-caption2">
          <span className="text-hig-text-secondary">Cash savings: </span>
          <span className="font-medium text-hig-text">{formatRMCompact(row.cashSavingsEOY)}</span>
          {row.epfEOY > 0 && (
            <>
              <span className="mx-2 text-hig-gray-3">·</span>
              <span className="text-hig-text-secondary">EPF balance: </span>
              <span className="font-medium text-hig-text">{formatRMCompact(row.epfEOY)}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function DetailItem({ colour, label, value }) {
  if (!value || value === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: colour }} />
      <span className="text-hig-text-secondary">{label}:</span>
      <span className="font-medium text-hig-text">{formatRMCompact(value)}</span>
    </div>
  )
}

// ── Hover tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p]))
  const income   = byKey.takeHomeIncomeUsed?.value ?? 0
  const cash     = byKey.cashUsed?.value ?? 0
  const passive  = byKey.passiveIncomeUsed?.value ?? 0
  const shortfall = byKey.shortfall?.value ?? 0
  const savings  = byKey.cashSavingsEOY?.value

  const total = income + cash + passive + shortfall

  return (
    <div className="min-w-[210px] rounded-xl border border-hig-gray-5 bg-white p-3 text-hig-caption2 shadow-lg">
      <div className="mb-2 text-hig-subhead font-semibold">Age {label}</div>
      <div className="mb-1.5 flex justify-between text-hig-caption1">
        <span className="text-hig-text-secondary">Total expenses</span>
        <span className="font-semibold">{formatRMCompact(total)}</span>
      </div>
      <div className="space-y-1 border-t border-hig-gray-5 pt-1.5">
        <TooltipRow colour={COLOURS.passiveIncomeUsed}  label="Passive income"  value={passive} />
        <TooltipRow colour={COLOURS.takeHomeIncomeUsed} label="Take-home income" value={income} />
        <TooltipRow colour={COLOURS.cashUsed}           label="Cash savings"    value={cash} />
        <TooltipRow colour={COLOURS.shortfall}          label="Shortfall"       value={shortfall} />
      </div>
      {savings != null && savings > 0 && (
        <div className="mt-2 border-t border-hig-gray-5 pt-2 flex justify-between">
          <span className="text-hig-text-secondary">Cash savings</span>
          <span className="font-medium">{formatRMCompact(savings)}</span>
        </div>
      )}
    </div>
  )
}

function TooltipRow({ colour, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full" style={{ background: colour }} />
        <span className="text-hig-text-secondary">{label}</span>
      </div>
      <span className="font-medium">{formatRMCompact(value)}</span>
    </div>
  )
}
