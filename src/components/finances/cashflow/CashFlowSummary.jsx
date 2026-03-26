import SectionCard from '../../ui/SectionCard'
import { formatRMCompact } from '../../../lib/cashflow'

const STATUS_STYLES = {
  funded: 'bg-hig-green/10 text-hig-green',
  shortfall: 'bg-red-50 text-hig-red',
  tight: 'bg-amber-50 text-amber-700',
}

export default function CashFlowSummary({ annualIncome, annualExpenses, shortfallSummary, milestones }) {
  const annualSurplus = annualIncome - annualExpenses

  return (
    <SectionCard title="Planner summary" subtitle="Key decision points, not just a chart.">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Income" value={formatRMCompact(annualIncome)} tone="text-hig-blue" />
        <Stat label="Expenses" value={formatRMCompact(annualExpenses)} tone="text-hig-red" />
        <Stat label="Surplus" value={formatRMCompact(annualSurplus)} tone={annualSurplus >= 0 ? 'text-hig-green' : 'text-hig-red'} />
      </div>

      <div className="mt-4 rounded-hig-sm border border-hig-gray-5 bg-hig-gray-6/60 p-3">
        {shortfallSummary ? (
          <>
            <div className="text-hig-caption1 font-semibold text-hig-red">Funding gap detected</div>
            <p className="mt-1 text-hig-caption1 text-hig-text-secondary">
              Total shortfall {formatRMCompact(shortfallSummary.total)} from age {shortfallSummary.start} to {shortfallSummary.end}.
            </p>
          </>
        ) : (
          <>
            <div className="text-hig-caption1 font-semibold text-hig-green">No projected shortfall</div>
            <p className="mt-1 text-hig-caption1 text-hig-text-secondary">
              Current assumptions stay funded through the projection horizon.
            </p>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {milestones.map((milestone) => (
          <div key={milestone.age} className="flex items-center justify-between rounded-hig-sm border border-hig-gray-5 px-3 py-2">
            <div>
              <div className="text-hig-footnote font-medium">Age {milestone.age}</div>
              <div className="text-hig-caption2 text-hig-text-secondary">
                Cash savings {formatRMCompact(milestone.cashSavingsEOY)}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-hig-caption2 font-medium ${STATUS_STYLES[milestone.status]}`}>
                {milestone.status === 'shortfall' ? 'Shortfall' : milestone.status === 'funded' ? 'Funded' : 'Tight'}
              </span>
              {milestone.shortfall > 0 ? (
                <div className="mt-1 text-hig-caption2 text-hig-red">Gap {formatRMCompact(milestone.shortfall)}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-hig-sm border border-hig-gray-5 p-3">
      <div className="text-hig-caption2 uppercase tracking-wide text-hig-text-secondary">{label}</div>
      <div className={`mt-1 text-hig-subhead font-semibold ${tone}`}>{value}</div>
    </div>
  )
}
