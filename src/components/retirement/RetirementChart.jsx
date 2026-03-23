import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { formatRMFull } from '../../lib/calculations'

const COLORS = {
  epf: '#FF9500',
  epfFill: 'rgba(255,149,0,0.55)',
  provisions: '#34C759',
  provisionsFill: 'rgba(52,199,89,0.55)',
  recommendations: '#007AFF',
  recommendationsFill: 'rgba(0,122,255,0.55)',
  shortfall: 'rgba(255,59,48,0.45)',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const dataPoint = payload[0] && payload[0].payload
  if (!dataPoint) return null

  const items = []
  if (dataPoint.shortfall > 0) items.push({ label: 'Shortfall', value: dataPoint.shortfall, color: '#FF3B30' })
  if (dataPoint.provisions > 0) items.push({ label: 'Existing Provision', value: dataPoint.provisions, color: COLORS.provisions })
  if (dataPoint.epf > 0) items.push({ label: 'EPF', value: dataPoint.epf, color: COLORS.epf })
  if (dataPoint.recommendations > 0) items.push({ label: 'Recommendation', value: dataPoint.recommendations, color: COLORS.recommendations })

  if (items.length === 0) return null

  return (
    <div style={{
      background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid #E5E5EA', padding: 12, minWidth: 200,
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Client Age {label}</div>
      {items.map(function(item) {
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: item.color, flexShrink: 0 }} />
            <span style={{ color: '#8E8E93' }}>{item.label}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{formatRMFull(item.value)}</span>
          </div>
        )
      })}
      {dataPoint.total > 0 && items.length > 1 && (
        <div style={{ borderTop: '1px solid #E5E5EA', marginTop: 4, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10 }} />
            <span style={{ fontWeight: 600 }}>Total Fund</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{formatRMFull(dataPoint.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function formatYAxis(value) {
  if (value >= 1000000) return 'RM ' + (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return 'RM ' + (value / 1000).toFixed(0) + 'K'
  return 'RM ' + value
}

export default function RetirementChart({ data, retirementAge, targetAmount, hasRecommendations }) {
  // ALL hooks MUST run before any early return — React Rules of Hooks
  const rawData = data && data.length > 0 ? data : []

  // Pad chart: one silent point before the first age and after the last age
  const safeData = useMemo(() => {
    if (rawData.length === 0) return []
    const first = rawData[0]
    const last = rawData[rawData.length - 1]
    const pre = { ...first, age: first.age - 1 }
    const post = { ...last, age: last.age + 1 }
    return [pre, ...rawData, post]
  }, [rawData])

  const maxVal = useMemo(function() {
    if (safeData.length === 0) return 100000
    var maxFund = 0
    for (var i = 0; i < safeData.length; i++) {
      var d = safeData[i]
      var stacked = (d.epf || 0) + (d.provisions || 0) + (d.recommendations || 0) + (d.shortfall || 0)
      if (stacked > maxFund) maxFund = stacked
    }
    var ceiling = Math.max((targetAmount || 0) * 1.15, maxFund * 1.1, 100000)
    return Math.ceil(ceiling / 100000) * 100000
  }, [safeData, targetAmount])

  // Early return AFTER all hooks
  if (safeData.length === 0) {
    return (
      <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93' }}>
        No data to display
      </div>
    )
  }

  const legendPayload = [
    { value: 'Existing Provision', type: 'rect', color: '#34C759' },
    { value: 'EPF', type: 'rect', color: '#FF9500' },
  ]
  if (hasRecommendations) {
    legendPayload.push({ value: 'Recommendation', type: 'rect', color: '#007AFF' })
  }
  legendPayload.push({ value: 'Shortfall', type: 'rect', color: '#FF3B30' })
  legendPayload.push({ value: 'Required Amount', type: 'plainline', color: '#1C1C1E', payload: { strokeDasharray: '6 4', strokeWidth: 1.5 } })

  return (
    <div style={{ width: '100%', height: 380 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />

          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={{ stroke: '#D1D1D6' }}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            interval="preserveStartEnd"
            domain={['dataMin', 'dataMax']}
            type="number"
          />

          <YAxis
            tickFormatter={formatYAxis}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            width={70}
            domain={[0, maxVal]}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#007AFF', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {/* Stacked areas — bottom to top: provisions → epf → recommendations → shortfall
               Total height = idealCorpus. Shortfall fills the gap at the top. */}
          <Area
            type="monotone"
            dataKey="provisions"
            stackId="stack"
            fill={COLORS.provisionsFill}
            stroke={COLORS.provisions}
            strokeWidth={1.5}
            animationDuration={500}
            name="Existing Provision"
          />

          <Area
            type="monotone"
            dataKey="epf"
            stackId="stack"
            fill={COLORS.epfFill}
            stroke={COLORS.epf}
            strokeWidth={1.5}
            animationDuration={500}
            name="EPF"
          />

          <Area
            type="monotone"
            dataKey="recommendations"
            stackId="stack"
            fill={hasRecommendations ? COLORS.recommendationsFill : 'transparent'}
            stroke={hasRecommendations ? COLORS.recommendations : 'none'}
            strokeWidth={hasRecommendations ? 1.5 : 0}
            animationDuration={500}
            name="Recommendation"
          />

          <Area
            type="monotone"
            dataKey="shortfall"
            stackId="stack"
            fill={COLORS.shortfall}
            stroke="rgba(255,59,48,0.6)"
            strokeWidth={1}
            animationDuration={500}
            name="Shortfall"
          />

          {/* Vertical dashed line at retirement age */}
          <ReferenceLine
            x={retirementAge}
            stroke="#1C1C1E"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: 'Amount Required ' + formatRMFull(targetAmount),
              position: 'insideTopRight',
              fontSize: 11,
              fontWeight: 600,
              fill: '#1C1C1E',
              offset: 10,
            }}
          />

          <Legend
            verticalAlign="bottom"
            height={36}
            payload={legendPayload}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
