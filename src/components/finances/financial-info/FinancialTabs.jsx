import { ChevronRight, Info, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { formatRMFull } from '../../../lib/calculations'
import NumberInput from '../../ui/NumberInput'
import { toMonthly } from './helpers'

export function OverviewTab({ summary, onNavigate, onImport, data }) {
  const cats = [
    { key: 'assets',      label: 'Assets',          value: summary.totalAssets,      negative: false },
    { key: 'investments', label: 'Investments',      value: summary.totalInvestments, negative: false },
    { key: 'liabilities', label: 'Liabilities',      value: summary.totalLiabilities, negative: true  },
    { key: 'income',      label: 'Monthly Income',   value: summary.monthlyIncome,    negative: false },
    { key: 'expenses',    label: 'Monthly Expenses', value: summary.monthlyExpenses,  negative: true  },
  ]
  const prompts = [
    summary.totalAssets + summary.totalInvestments <= 0 && { key: 'assets', text: 'Add savings, EPF, or investment balances to avoid an empty net worth picture.' },
    summary.monthlyIncome <= 0 && { key: 'income', text: 'Add at least one income source before relying on cash flow outputs.' },
    summary.monthlyExpenses <= 0 && { key: 'expenses', text: 'Enter core monthly expenses. Otherwise cash flow will look artificially strong.' },
    !(data?.liabilities || []).some((row) => Number(row.principal) > 0) && { key: 'liabilities', text: 'No liabilities recorded. Confirm loans and cards are truly nil before moving on.' },
  ].filter(Boolean)
  return (
    <div className="space-y-4">
      {/* Import Data CTA */}
      <div className="flex justify-end">
        <button
          onClick={onImport}
          className="hig-btn-ghost gap-1.5 text-hig-subhead"
        >
          <Upload size={14} /> Import Financial Data
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="hig-card p-5">
          <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-1">Net Worth</p>
          <p className={`text-hig-title2 font-bold ${summary.netWorth >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
            {summary.netWorth < 0 && '−'}{formatRMFull(Math.abs(summary.netWorth))}
          </p>
          <p className="text-hig-caption1 text-hig-text-secondary mt-1">
            Assets {formatRMFull(summary.totalAssets + summary.totalInvestments)} − Liabilities {formatRMFull(summary.totalLiabilities)}
          </p>
        </div>
        <div className="hig-card p-5">
          <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-1">Monthly Cash Flow</p>
          <p className={`text-hig-title2 font-bold ${summary.monthlyCashFlow >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
            {summary.monthlyCashFlow < 0 && '−'}{formatRMFull(Math.abs(summary.monthlyCashFlow))}
          </p>
          <p className="text-hig-caption1 text-hig-text-secondary mt-1">
            Income {formatRMFull(summary.monthlyIncome)}/mth − Expenses {formatRMFull(summary.monthlyExpenses)}/mth
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cats.map(c => (
          <button key={c.key} onClick={() => onNavigate(c.key)}
            className="hig-card p-4 text-left hover:shadow-md transition-shadow flex items-center justify-between">
            <div>
              <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-0.5">{c.label}</p>
              <p className={`text-hig-headline font-bold ${c.negative && c.value > 0 ? 'text-hig-red' : 'text-hig-text'}`}>
                {formatRMFull(c.value)}
              </p>
            </div>
            <ChevronRight size={15} className="text-hig-text-secondary shrink-0" />
          </button>
        ))}
      </div>
      {prompts.length > 0 && (
        <div className="hig-card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-hig-subhead font-semibold">Planning checklist</p>
              <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Fill these before presenting outputs as client-ready.</p>
            </div>
          </div>
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.key}
                onClick={() => onNavigate(prompt.key)}
                className="w-full flex items-start justify-between gap-3 rounded-hig-sm border border-hig-gray-5 px-3 py-2.5 text-left hover:border-hig-blue/30 hover:bg-hig-blue/5 transition-colors"
              >
                <div>
                  <p className="text-hig-caption1 font-medium text-hig-text">Complete {prompt.key}</p>
                  <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">{prompt.text}</p>
                </div>
                <ChevronRight size={14} className="text-hig-text-secondary mt-0.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
      {summary.epfContribution > 0 && (
        <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3 flex items-start gap-2">
          <Info size={13} className="text-hig-blue mt-0.5 shrink-0" />
          <div>
            <p className="text-hig-subhead text-hig-blue font-medium">
              EPF Employee: {formatRMFull(summary.epfContribution)}/mth (11%)
            </p>
            <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
              Employer adds {summary.monthlyIncome > 5000 ? '12%' : '13%'} based on salary threshold.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assets Tab ───────────────────────────────────────────────────────────────
export function AssetsTab({ rows, onUpdateFixed, onEdit, onRemove, onAdd }) {
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const fixed   = rows.filter(r =>  r.fixed)
  const dynamic = rows.filter(r => !r.fixed)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Assets</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Total: {formatRMFull(total)}</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5"><Plus size={14} /> Add Asset</button>
      </div>

      {/* Fixed rows — inline editable */}
      <div className="hig-card overflow-hidden">
        <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
          <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Fixed Accounts</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-hig-gray-5">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Account</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-28">Growth %</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-44">Balance (RM)</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(r => (
              <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                <td className="px-4 py-2.5">
                  <p className="text-hig-subhead font-medium">{r.description}</p>
                  <p className="text-hig-caption2 text-hig-text-secondary">{r.type}</p>
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="number" step="0.1" min="0"
                    value={r.growthRate}
                    onChange={e => onUpdateFixed(r.id, { growthRate: parseFloat(e.target.value) || 0 })}
                    className="hig-input text-right py-1.5 tabular-nums w-full"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                    <input
                      type="number" min="0" step="100"
                      value={r.amount || ''}
                      onChange={e => onUpdateFixed(r.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1.5 pl-8 tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dynamic rows — card-style */}
      {dynamic.length > 0 && (
        <div className="hig-card overflow-hidden">
          <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
            <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Other Assets</p>
          </div>
          {dynamic.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i < dynamic.length - 1 ? 'border-b border-hig-gray-5' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-hig-caption2 px-2 py-0.5 bg-hig-gray-6 rounded-full text-hig-text-secondary">{r.type}</span>
                  <span className="text-hig-subhead font-medium">{r.description || '—'}</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
                  Growth: {r.growthRate}% p.a. · Value: <span className="tabular-nums font-medium text-hig-text">{formatRMFull(r.amount)}</span>
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(r)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onRemove(r.id)} className="p-2 rounded-hig-sm hover:bg-red-50 text-hig-text-secondary hover:text-hig-red transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-hig-gray-6 rounded-hig-sm">
        <span className="text-hig-subhead font-semibold">Total Assets</span>
        <span className="text-hig-subhead font-semibold tabular-nums">{formatRMFull(total)}</span>
      </div>
    </div>
  )
}

// ─── Investments Tab ──────────────────────────────────────────────────────────
export function InvTab({ rows, currentAge, onUpdateFixed, onEdit, onRemove, onAdd }) {
  const total   = rows.reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
  const fixed   = rows.filter(r =>  r.fixed)
  const dynamic = rows.filter(r => !r.fixed)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Investments</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Total Value: {formatRMFull(total)}</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5"><Plus size={14} /> Add Investment</button>
      </div>

      {/* Fixed rows — inline editable */}
      <div className="hig-card overflow-hidden">
        <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
          <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Core Holdings</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-hig-gray-5">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Type</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Description</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-24">Return %</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-44">Current Value (RM)</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(r => (
              <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                <td className="px-4 py-2.5">
                  <p className="text-hig-subhead font-medium whitespace-nowrap">{r.type}</p>
                  {r.description && (
                    <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">{r.description}</p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="text"
                    value={r.planName || ''}
                    onChange={e => onUpdateFixed(r.id, { planName: e.target.value })}
                    className="hig-input py-1.5 w-full"
                    placeholder={
                      r.type === 'Exchange Traded Funds (ETF)' ? 'e.g. Wahed, Stashaway, Maybank ETF' :
                      r.type === 'Stocks & Shares'             ? 'e.g. Top Glove, CIMB, Maybank' :
                      r.type === 'Unit Trusts'                  ? 'e.g. Public Mutual, Principal, Eastspring' :
                      r.type === 'Bonds'                        ? 'e.g. ASNB, Sukuk, PNB funds' :
                      'e.g. fund name, provider'
                    }
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="number" step="0.1" min="0"
                    value={r.growthRate}
                    onChange={e => onUpdateFixed(r.id, { growthRate: parseFloat(e.target.value) || 0 })}
                    className="hig-input text-right py-1.5 tabular-nums w-full"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                    <input
                      type="number" min="0" step="100"
                      value={r.currentValue || ''}
                      onChange={e => onUpdateFixed(r.id, { currentValue: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1.5 pl-8 tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dynamic rows */}
      {dynamic.length > 0 && (
        <div className="hig-card overflow-hidden">
          <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
            <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Other Investments</p>
          </div>
          {dynamic.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i < dynamic.length - 1 ? 'border-b border-hig-gray-5' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-hig-caption2 px-2 py-0.5 bg-hig-blue/10 text-hig-blue rounded-full">{r.type}</span>
                  <span className="text-hig-subhead font-medium">{r.planName || '—'}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-hig-caption1 text-hig-text-secondary">
                  <span>{r.paymentMode}</span>
                  <span>Age {r.ageFrom ?? currentAge} → {r.ageTo ?? 99}</span>
                  <span>Return: {r.growthRate}% p.a.</span>
                  <span>Value: <span className="tabular-nums font-medium text-hig-text">{formatRMFull(r.currentValue)}</span></span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(r)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onRemove(r.id)} className="p-2 rounded-hig-sm hover:bg-red-50 text-hig-text-secondary hover:text-hig-red transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      <div className="flex justify-between px-4 py-2.5 bg-hig-gray-6 rounded-hig-sm">
        <span className="text-hig-subhead font-semibold">Total Investment Value</span>
        <span className="text-hig-subhead font-semibold tabular-nums">{formatRMFull(total)}</span>
      </div>
    </div>
  )
}

// ─── Liabilities Tab ──────────────────────────────────────────────────────────
export function LiabTab({ rows, onUpdateFixed, onAdd, onEdit, onRemove }) {
  const totalPrincipal = rows.reduce((s, r) => s + (Number(r.principal) || 0), 0)
  const totalMonthly   = rows.reduce((s, r) => s + calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod), 0)
  const fixed   = rows.filter(r =>  r.fixed)
  const dynamic = rows.filter(r => !r.fixed)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Liabilities</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
            Outstanding: {formatRMFull(totalPrincipal)} · Repayment: {formatRMFull(totalMonthly)}/mth
          </p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5"><Plus size={14} /> Add Liability</button>
      </div>

      {/* Fixed rows — inline editable */}
      <div className="hig-card overflow-hidden">
        <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
          <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Common Loans</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-hig-gray-5">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Type</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Description</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-40">Outstanding (RM)</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-20">Rate %</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-24">Term (mths)</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Monthly</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(r => {
              const monthly = calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod)
              return (
                <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <p className="text-hig-subhead font-medium whitespace-nowrap">{r.type}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      value={r.description || ''}
                      onChange={e => onUpdateFixed(r.id, { description: e.target.value })}
                      className="hig-input py-1.5 w-full"
                      placeholder="e.g. Maybank Home Loan"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                      <input
                        type="number" min="0" step="1000"
                        value={r.principal || ''}
                        onChange={e => onUpdateFixed(r.id, { principal: parseFloat(e.target.value) || 0 })}
                        className="hig-input text-right py-1.5 pl-8 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number" step="0.1" min="0" max="30"
                      value={r.interestRate}
                      onChange={e => onUpdateFixed(r.id, { interestRate: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1.5 tabular-nums w-full"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number" step="12" min="1" max="600"
                      value={r.loanPeriod}
                      onChange={e => onUpdateFixed(r.id, { loanPeriod: parseInt(e.target.value) || 12 })}
                      className="hig-input text-right py-1.5 tabular-nums w-full"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-hig-subhead font-semibold tabular-nums ${monthly > 0 ? 'text-hig-red' : 'text-hig-text-secondary'}`}>
                      {monthly > 0 ? formatRMFull(monthly) : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dynamic rows */}
      {dynamic.length > 0 && (
        <div className="space-y-2">
          <div className="px-1">
            <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Other Liabilities</p>
          </div>
          {dynamic.map(r => {
            const monthly = calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod)
            return (
              <div key={r.id} className="hig-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-hig-caption2 px-2 py-0.5 bg-hig-gray-6 rounded-full text-hig-text-secondary">{r.type}</span>
                    <span className="text-hig-subhead font-medium">{r.description || r.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-hig-caption1 text-hig-text-secondary">
                    <span>Principal: <span className="text-hig-text font-medium tabular-nums">{formatRMFull(r.principal)}</span></span>
                    <span>Rate: <span className="text-hig-text font-medium">{r.interestRate}% p.a.</span></span>
                    <span>Term: <span className="text-hig-text font-medium">{r.loanPeriod} mths</span></span>
                    <span>Monthly: <span className="text-hig-red font-semibold tabular-nums">{formatRMFull(monthly)}</span></span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEdit(r)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => onRemove(r.id)} className="p-2 rounded-hig-sm hover:bg-red-50 text-hig-text-secondary hover:text-hig-red transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total footer */}
      <div className="flex justify-between px-4 py-2.5 bg-hig-gray-6 rounded-hig-sm">
        <span className="text-hig-subhead font-semibold">Total Monthly Repayment</span>
        <span className="text-hig-subhead font-semibold text-hig-red tabular-nums">{formatRMFull(totalMonthly)}/mth</span>
      </div>
    </div>
  )
}

// ─── Income Tab ───────────────────────────────────────────────────────────────
export function IncomeTab({ rows, onUpdateFixed, onEdit, onRemove, onAdd }) {
  const totalMonthly = rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const fixed   = rows.filter(r =>  r.fixed)
  const dynamic = rows.filter(r => !r.fixed)
  const grossRow = rows.find(r => r.id === 'gross-income')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Income</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Monthly equivalent: {formatRMFull(totalMonthly)}/mth</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5"><Plus size={14} /> Add Income</button>
      </div>

      {/* Fixed rows — inline */}
      <div className="hig-card overflow-hidden">
        <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
          <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Employment Income</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-hig-gray-5">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Source</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Frequency</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-44">Amount (RM)</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Monthly Eq.</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(r => {
              const epfOn = r.epfApplicable !== false
              return (
                <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <p className="text-hig-subhead font-medium">{r.description}</p>
                    <button
                      onClick={() => onUpdateFixed(r.id, { epfApplicable: !epfOn })}
                      style={{
                        marginTop: 4,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 20, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, lineHeight: '16px',
                        background: epfOn ? 'rgba(0,122,255,0.10)' : 'rgba(142,142,147,0.12)',
                        color: epfOn ? '#007AFF' : '#8E8E93',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: epfOn ? '#007AFF' : '#C7C7CC',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                      }} />
                      {epfOn ? 'EPF' : 'No EPF'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-hig-caption1 text-hig-text-secondary">{r.frequency}</td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                      <input
                        type="number" min="0" step="100"
                        value={r.amount || ''}
                        onChange={e => onUpdateFixed(r.id, { amount: parseFloat(e.target.value) || 0 })}
                        className="hig-input text-right py-1.5 pl-8 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-hig-caption1 text-hig-text-secondary tabular-nums">
                    {formatRMFull(toMonthly(r.amount, r.frequency))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dynamic rows */}
      {dynamic.length > 0 && (
        <div className="hig-card overflow-hidden">
          <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
            <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Other Income</p>
          </div>
          {dynamic.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i < dynamic.length - 1 ? 'border-b border-hig-gray-5' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-hig-caption2 px-2 py-0.5 bg-hig-green/10 text-hig-green rounded-full">{r.type}</span>
                  <span className="text-hig-subhead font-medium">{r.description || '—'}</span>
                </div>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {r.frequency} · <span className="tabular-nums font-medium text-hig-text">{formatRMFull(r.amount)}</span>
                  <span className="ml-2 text-hig-text-secondary">({formatRMFull(toMonthly(r.amount, r.frequency))}/mth)</span>
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(r)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onRemove(r.id)} className="p-2 rounded-hig-sm hover:bg-red-50 text-hig-text-secondary hover:text-hig-red transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total + EPF note */}
      <div className="flex justify-between px-4 py-2.5 bg-hig-gray-6 rounded-hig-sm">
        <span className="text-hig-subhead font-semibold">Monthly Total</span>
        <span className="text-hig-subhead font-semibold text-hig-green tabular-nums">{formatRMFull(totalMonthly)}/mth</span>
      </div>
      {(() => {
        const epfRows = rows.filter(r => r.fixed && r.epfApplicable !== false && Number(r.amount) > 0)
        if (!epfRows.length) return null
        const grossAmt  = epfRows.find(r => r.id === 'gross-income')?.amount || 0
        const bonusAmt  = epfRows.find(r => r.id === 'bonus')?.amount || 0
        const empRate   = grossAmt > 5000 ? 0.12 : 0.13
        const empEPF    = grossAmt * empRate + bonusAmt * empRate
        const eeEPF     = grossAmt * 0.11 + bonusAmt * 0.11
        const lines = []
        if (grossAmt > 0) lines.push(`Gross: employee ${formatRMFull(grossAmt * 0.11)}/mth · employer ${formatRMFull(grossAmt * empRate)}/mth (${empRate * 100}%)`)
        if (bonusAmt > 0) lines.push(`Bonus: employee ${formatRMFull(bonusAmt * 0.11)} · employer ${formatRMFull(bonusAmt * empRate)} (annual)`)
        return (
          <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3 flex items-start gap-2">
            <Info size={13} className="text-hig-blue mt-0.5 shrink-0" />
            <div>
              {lines.map((l, i) => (
                <p key={i} className="text-hig-caption1 text-hig-blue">{l}</p>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
export function ExpTab({ rows, currentAge, onUpdateFixed, onEdit, onRemove, onAdd }) {
  const totalMonthly = rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const fixed   = rows.filter(r =>  r.fixed)
  const dynamic = rows.filter(r => !r.fixed)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Expenses</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Monthly equivalent: {formatRMFull(totalMonthly)}/mth</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5"><Plus size={14} /> Add Expense</button>
      </div>

      {/* Fixed rows — inline editable */}
      <div className="hig-card overflow-hidden">
        <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
          <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Monthly Expenses</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-hig-gray-5">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Category</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-28">Frequency</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-44">Amount (RM)</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Monthly Eq.</th>
            </tr>
          </thead>
          <tbody>
            {fixed.map(r => {
              const monthly = toMonthly(r.amount, r.frequency)
              return (
                <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <p className="text-hig-subhead font-medium">{r.type}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={r.frequency}
                      onChange={e => onUpdateFixed(r.id, { frequency: e.target.value })}
                      className="hig-input py-1.5 w-full"
                    >
                      {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                      <input
                        type="number" min="0" step="100"
                        value={r.amount || ''}
                        onChange={e => onUpdateFixed(r.id, { amount: parseFloat(e.target.value) || 0 })}
                        className="hig-input text-right py-1.5 pl-8 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`text-hig-subhead font-semibold tabular-nums ${monthly > 0 ? 'text-hig-red' : 'text-hig-text-secondary'}`}>
                      {monthly > 0 ? formatRMFull(monthly) : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Dynamic rows */}
      {dynamic.length > 0 && (
        <div className="hig-card overflow-hidden">
          <div className="px-4 py-2 bg-hig-gray-6 border-b border-hig-gray-5">
            <p className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Other Expenses</p>
          </div>
          {dynamic.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i < dynamic.length - 1 ? 'border-b border-hig-gray-5' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-hig-caption2 px-2 py-0.5 bg-hig-gray-6 text-hig-text-secondary rounded-full">{r.type}</span>
                  <span className="text-hig-subhead font-medium">{r.description || '—'}</span>
                  {r.inflationLinked === false && (
                    <span className="text-hig-caption2 px-1.5 py-0.5 bg-hig-gray-5 text-hig-text-secondary rounded font-medium leading-none">Fixed</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-hig-caption1 text-hig-text-secondary">
                  <span>Age {r.ageFrom ?? currentAge} → {r.ageTo ?? 99}</span>
                  <span>{r.frequency}</span>
                  <span><span className="tabular-nums font-medium text-hig-text">{formatRMFull(r.amount)}</span></span>
                  <span>({formatRMFull(toMonthly(r.amount, r.frequency))}/mth)</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(r)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onRemove(r.id)} className="p-2 rounded-hig-sm hover:bg-red-50 text-hig-text-secondary hover:text-hig-red transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      <div className="flex justify-between px-4 py-2.5 bg-hig-gray-6 rounded-hig-sm">
        <span className="text-hig-subhead font-semibold">Total Monthly Expenses</span>
        <span className="text-hig-subhead font-semibold text-hig-red tabular-nums">{formatRMFull(totalMonthly)}/mth</span>
      </div>
    </div>
  )
}
