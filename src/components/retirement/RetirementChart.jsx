import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { formatRMFull } from '../../lib/calculations'

const COLORS = {
  epf: '#F5A623',
  provisions: '#30D158',
  recommendations: '#0A84FF',
  shortfall: '#FF453A',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0] && payload[0].payload
  if (!d) return null

  // Spec order: Age, Shortfall, Recommendation, Existing Provision, EPF
  const rows = []
  if (d.shortfall > 0)       rows.push({ label: 'Shortfall',          value: d.shortfall,       color: COLORS.shortfall })
  if (d.recommendations > 0) rows.push({ label: 'Recommendation',     value: d.recommendations, color: COLORS.recommendations })
  if (d.provisions > 0)      rows.push({ label: 'Existing Provision', value: d.provisions,      color: COLORS.provisions })
  if (d.epf > 0)             rows.push({ label: 'EPF',                value: d.epf,             color: COLORS.epf })

  return (
    <div style={{
      background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid #E5E5EA', padding: 12, minWidth: 210,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#1C1C1E' }}>Age {label}</div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
          <span style={{ color: '#8E8E93', flex: 1 }}>{r.label}</span>
          <span style={{ fontWeight: 600 }}>{formatRMFull(r.value)}</span>
        </div>
      ))}
      {d.total > 0 && rows.length > 1 && (
        <div style={{ borderTop: '1px solid #F2F2F7', marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 10 }} />
            <span style={{ flex: 1, fontWeight: 600 }}>Total Fund</span>
            <span style={{ fontWeight: 700 }}>{formatRMFull(d.total)}</span>
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

export default function RetirementChart({ data, retirementAge, currentAge, lifeExpectancy, targetAmount, hasRecommendations }) {
  const rawData = data && data.length > 0 ? data : []

  const safeData = useMemo(() => rawData, [rawData])

  const maxVal = useMemo(() => {
    if (safeData.length === 0) return 100000
    let maxFund = 0
    for (const d of safeData) {
      const stacked = (d.epf || 0) + (d.provisions || 0) + (d.recommendations || 0) + (d.shortfall || 0)
      if (stacked > maxFund) maxFund = stacked
    }
    return Math.ceil(Math.max((targetAmount || 0) * 1.15, maxFund * 1.1, 100000) / 100000) * 100000
  }, [safeData, targetAmount])

  // Always show current age, retirement age, and life expectancy on X-axis
  const xTicks = useMemo(() => {
    const set = new Set([currentAge, retirementAge, lifeExpectancy].filter(Boolean))
    return Array.from(set).sort((a, b) => a - b)
  }, [currentAge, retirementAge, lifeExpectancy])

  if (safeData.length === 0) {
    return (
      <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93' }}>
        No data to display
      </div>
    )
  }

  const showEPF            = safeData.some((d) => d.epf > 0)
  const showProvisions     = safeData.some((d) => d.provisions > 0)
  const showRecommendations = hasRecommendations && safeData.some((d) => d.recommendations > 0)
  const showShortfall      = safeData.some((d) => d.shortfall > 0)

  const legendPayload = []
  if (showEPF)             legendPayload.push({ value: 'EPF',                type: 'rect',      color: COLORS.epf })
  if (showProvisions)      legendPayload.push({ value: 'Existing Provision', type: 'rect',      color: COLORS.provisions })
  if (showRecommendations) legendPayload.push({ value: 'Recommendation',     type: 'rect',      color: COLORS.recommendations })
  if (showShortfall)       legendPayload.push({ value: 'Shortfall',          type: 'rect',      color: COLORS.shortfall })
  legendPayload.push({     value: 'Amount Required',                          type: 'plainline', color: '#1C1C1E',
    payload: { strokeDasharray: '6 4', strokeWidth: 1.5 } })

  return (
    <div style={{ width: '100%', aspectRatio: '16/7', minHeight: 240, maxHeight: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradEPF" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5A623" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="gradProvisions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#30D158" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#34C759" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.35} />
            </linearGradient>
            <linearGradient id="gradShortfall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF453A" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#FF6B63" stopOpacity={0.25} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" vertical={false} />

          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={{ stroke: '#D1D1D6' }}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            ticks={xTicks}
            domain={['dataMin', 'dataMax']}
            type="number"
          />

          <YAxis
            tickFormatter={formatYAxis}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#8E8E93' }}
            width={72}
            domain={[0, maxVal]}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#0A84FF', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {/* Stacked areas — bottom to top: epf → provisions → recommendations → shortfall */}
          {showEPF && (
            <Area type="monotone" dataKey="epf" stackId="stack"
              fill="url(#gradEPF)" stroke={COLORS.epf} strokeWidth={1.5}
              animationDuration={500} name="EPF" />
          )}
          {showProvisions && (
            <Area type="monotone" dataKey="provisions" stackId="stack"
              fill="url(#gradProvisions)" stroke={COLORS.provisions} strokeWidth={1.5}
              animationDuration={500} name="Existing Provision" />
          )}
          {showRecommendations && (
            <Area type="monotone" dataKey="recommendations" stackId="stack"
              fill="url(#gradRec)" stroke={COLORS.recommendations} strokeWidth={1.5}
              animationDuration={500} name="Recommendation" />
          )}
          {showShortfall && (
            <Area type="monotone" dataKey="shortfall" stackId="stack"
              fill="url(#gradShortfall)" stroke={COLORS.shortfall} strokeWidth={1}
              animationDuration={500} name="Shortfall" />
          )}

          {/* Retirement age vertical dashed line with target amount label */}
          <ReferenceLine
            x={retirementAge}
            stroke="#1C1C1E"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Amount Required  ${formatRMFull(targetAmount)}`,
              position: 'insideTopRight',
              fontSize: 11,
              fontWeight: 600,
              fill: '#1C1C1E',
              offset: 10,
            }}
          />

          <Legend verticalAlign="bottom" height={36} payload={legendPayload} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
