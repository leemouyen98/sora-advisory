import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SectionCard from '../../ui/SectionCard'
import { formatAxisLabel, formatRMCompact } from '../../../lib/cashflow'

export default function CashFlowChart({ chartData, showCashSavings, onToggleCashSavings }) {
  const tickInterval = chartData.length > 50 ? 3 : chartData.length > 30 ? 2 : 1

  return (
    <SectionCard
      title="GoalsMapper chart"
      subtitle="See where income ends, cash gets consumed, and shortfall begins."
      action={
        <label className="flex cursor-pointer items-center gap-2 select-none text-hig-footnote text-hig-text-secondary">
          <button
            type="button"
            onClick={onToggleCashSavings}
            className="relative h-[22px] w-10 rounded-full transition-colors"
            style={{ background: showCashSavings ? '#007AFF' : '#C7C7CC' }}
          >
            <span
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: showCashSavings ? 'translateX(19px)' : 'translateX(2px)' }}
            />
          </button>
          Cash savings line
        </label>
      }
    >
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />
            <XAxis dataKey="age" tick={{ fontSize: 11, fill: '#8E8E93' }} interval={tickInterval} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={formatAxisLabel} axisLine={false} tickLine={false} width={78} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="takeHomeIncomeUsed" name="Income used" stackId="cash" fill="#34C759" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cashUsed" name="Cash used" stackId="cash" fill="#FF9500" radius={[4, 4, 0, 0]} />
            <Bar dataKey="shortfall" name="Shortfall" stackId="cash" fill="#FF3B30" radius={[4, 4, 0, 0]} />
            {showCashSavings ? (
              <Line type="monotone" dataKey="cashSavingsEOY" name="Cash savings" stroke="#1C1C1E" strokeWidth={2} dot={false} />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const visibleBars = payload.filter((item) => Number(item.value) > 0 && item.dataKey !== 'cashSavingsEOY')
  const savings = payload.find((item) => item.dataKey === 'cashSavingsEOY')

  return (
    <div className="min-w-[190px] rounded-xl border border-hig-gray-5 bg-white p-3 text-hig-caption2 shadow-lg">
      <div className="mb-2 text-hig-subhead font-semibold">Age {label}</div>
      {visibleBars.map((item) => (
        <div key={item.dataKey} className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span className="text-hig-text-secondary">{item.name}</span>
          </div>
          <span className="font-medium">{formatRMCompact(item.value)}</span>
        </div>
      ))}
      {savings && Number(savings.value) > 0 ? (
        <div className="mt-2 border-t border-hig-gray-5 pt-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-hig-text-secondary">Cash savings</span>
            <span className="font-medium">{formatRMCompact(savings.value)}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
