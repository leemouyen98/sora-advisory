import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

const INVESTMENT_TYPES = [
  'Unit Trust',
  'Investment-Linked Policy',
  'Stocks',
  'Fixed Deposit',
  'ASB / ASM',
  'Property',
  'REIT',
  'Gold',
  'Private Retirement Scheme',
  'Other',
]

const RISK_PROFILES = ['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive']

const EMPTY_INVESTMENT = {
  name: '',
  type: '',
  provider: '',
  currentValue: 0,
  totalInvested: 0,
  monthlyContribution: 0,
  annualReturn: 0,
  riskProfile: 'Balanced',
  startDate: '',
  notes: '',
}

export default function InvestmentsTab({ financials, onSave }) {
  const investments = financials.investments || []
  const [editingIdx, setEditingIdx] = useState(null)
  const [form, setForm] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalValue = investments.reduce((s, inv) => s + (Number(inv.currentValue) || 0), 0)
  const totalInvested = investments.reduce((s, inv) => s + (Number(inv.totalInvested) || 0), 0)
  const totalMonthly = investments.reduce((s, inv) => s + (Number(inv.monthlyContribution) || 0), 0)
  const totalGain = totalValue - totalInvested
  const gainPercent = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm({ ...EMPTY_INVESTMENT })
    setEditingIdx('new')
  }

  const openEdit = (idx) => {
    setForm({ ...investments[idx] })
    setEditingIdx(idx)
  }

  const handleDelete = (idx) => {
    const updated = investments.filter((_, i) => i !== idx)
    onSave({ ...financials, investments: updated })
  }

  const handleSave = () => {
    const coerced = {
      ...form,
      currentValue: Number(form.currentValue) || 0,
      totalInvested: Number(form.totalInvested) || 0,
      monthlyContribution: Number(form.monthlyContribution) || 0,
      annualReturn: Number(form.annualReturn) || 0,
    }

    let updated
    if (editingIdx === 'new') {
      updated = [...investments, coerced]
    } else {
      updated = investments.map((inv, i) => i === editingIdx ? coerced : inv)
    }
    onSave({ ...financials, investments: updated })
    setEditingIdx(null)
    setForm(null)
  }

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  // ─── Edit Modal ─────────────────────────────────────────────────────────

  if (editingIdx !== null) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setEditingIdx(null); setForm(null) }}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-hig-title3">{editingIdx === 'new' ? 'Add Investment' : 'Edit Investment'}</h2>
            <button onClick={() => { setEditingIdx(null); setForm(null) }} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="hig-label">Investment Name</label>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} className="hig-input" placeholder="e.g. Public Mutual Growth Fund" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hig-label">Type</label>
                <select value={form.type} onChange={(e) => updateForm('type', e.target.value)} className="hig-input">
                  <option value="">Select...</option>
                  {INVESTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="hig-label">Provider / Platform</label>
                <input value={form.provider} onChange={(e) => updateForm('provider', e.target.value)} className="hig-input" placeholder="e.g. Public Mutual" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RMInput label="Current Value" value={form.currentValue} onChange={(v) => updateForm('currentValue', v)} />
              <RMInput label="Total Invested" value={form.totalInvested} onChange={(v) => updateForm('totalInvested', v)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RMInput label="Monthly Contribution" value={form.monthlyContribution} onChange={(v) => updateForm('monthlyContribution', v)} />
              <div>
                <label className="hig-label">Annual Return %</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.annualReturn || ''}
                    onChange={(e) => updateForm('annualReturn', e.target.value)}
                    className="hig-input pr-8 tabular-nums"
                    placeholder="0"
                    step="0.1"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hig-label">Risk Profile</label>
                <select value={form.riskProfile} onChange={(e) => updateForm('riskProfile', e.target.value)} className="hig-input">
                  {RISK_PROFILES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="hig-label">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => updateForm('startDate', e.target.value)} className="hig-input" />
              </div>
            </div>

            <div>
              <label className="hig-label">Notes</label>
              <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} className="hig-input min-h-[60px] resize-y" placeholder="Fund details, allocation, etc." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-hig-gray-5">
            <button onClick={() => { setEditingIdx(null); setForm(null) }} className="hig-btn-secondary">Cancel</button>
            <button onClick={handleSave} className="hig-btn-primary">
              {editingIdx === 'new' ? 'Add Investment' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (investments.length === 0) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-orange/10 flex items-center justify-center mb-4">
          <TrendingUp size={26} className="text-hig-orange" />
        </div>
        <p className="text-hig-headline text-hig-text font-semibold mb-1">No Investments</p>
        <p className="text-hig-subhead text-hig-text-secondary mb-4">
          Track unit trusts, ILPs, and other investments to see the full portfolio.
        </p>
        <button onClick={openAdd} className="hig-btn-primary gap-1.5"><Plus size={16} /> Add Investment</button>
      </div>
    )
  }

  // ─── Investments List ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="hig-card p-3 text-center">
          <p className="text-hig-caption1 text-hig-text-secondary mb-1">Total Value</p>
          <p className="text-hig-subhead font-semibold text-hig-blue">{formatRMFull(totalValue)}</p>
        </div>
        <div className="hig-card p-3 text-center">
          <p className="text-hig-caption1 text-hig-text-secondary mb-1">Total Invested</p>
          <p className="text-hig-subhead font-semibold">{formatRMFull(totalInvested)}</p>
        </div>
        <div className="hig-card p-3 text-center">
          <p className="text-hig-caption1 text-hig-text-secondary mb-1">Gain / Loss</p>
          <p className={`text-hig-subhead font-semibold ${totalGain >= 0 ? 'text-hig-green' : 'text-hig-red'}`}>
            {totalGain >= 0 ? '+' : '−'}{formatRMFull(Math.abs(totalGain))} ({gainPercent}%)
          </p>
        </div>
        <div className="hig-card p-3 text-center">
          <p className="text-hig-caption1 text-hig-text-secondary mb-1">Monthly Contrib.</p>
          <p className="text-hig-subhead font-semibold">{formatRMFull(totalMonthly)}</p>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button onClick={openAdd} className="hig-btn-ghost gap-1.5"><Plus size={14} /> Add Investment</button>
      </div>

      {/* Investment Cards */}
      {investments.map((inv, idx) => {
        const gain = (Number(inv.currentValue) || 0) - (Number(inv.totalInvested) || 0)
        const pct = (Number(inv.totalInvested) || 0) > 0 ? ((gain / inv.totalInvested) * 100).toFixed(1) : 0

        return (
          <div key={idx} className="hig-card">
            <div
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-hig-gray-6/50 transition-colors rounded-hig"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <div className="w-10 h-10 rounded-hig-sm bg-hig-orange/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-hig-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-hig-subhead font-medium text-hig-text truncate">{inv.name || inv.type || 'Unnamed Investment'}</p>
                <p className="text-hig-caption1 text-hig-text-secondary">{inv.type} · {inv.provider || 'No provider'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-hig-subhead font-medium">{formatRMFull(inv.currentValue)}</p>
                <p className={`text-hig-caption1 ${gain >= 0 ? 'text-hig-green' : 'text-hig-red'}`}>
                  {gain >= 0 ? '+' : '−'}{formatRMFull(Math.abs(gain))} ({pct}%)
                </p>
              </div>
              {expandedIdx === idx ? <ChevronUp size={16} className="text-hig-gray-1" /> : <ChevronDown size={16} className="text-hig-gray-1" />}
            </div>

            {expandedIdx === idx && (
              <div className="px-4 pb-4 pt-0 border-t border-hig-gray-5 mt-0">
                <div className="grid grid-cols-3 gap-3 mt-3 text-hig-subhead">
                  <div>
                    <p className="text-hig-caption1 text-hig-text-secondary">Monthly Contrib.</p>
                    <p className="font-medium">{formatRMFull(inv.monthlyContribution)}</p>
                  </div>
                  <div>
                    <p className="text-hig-caption1 text-hig-text-secondary">Annual Return</p>
                    <p className="font-medium">{Number(inv.annualReturn || 0).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-hig-caption1 text-hig-text-secondary">Risk Profile</p>
                    <p className="font-medium">{inv.riskProfile}</p>
                  </div>
                </div>
                {inv.notes && <p className="text-hig-caption1 text-hig-text-secondary mt-2 pt-2 border-t border-hig-gray-5">{inv.notes}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(idx) }} className="hig-btn-ghost gap-1 text-hig-caption1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(idx) }} className="hig-btn-ghost gap-1 text-hig-caption1 text-hig-red hover:bg-red-50">
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function RMInput({ label, value, onChange }) {
  return (
    <div>
      <label className="hig-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="hig-input pl-10 tabular-nums"
          placeholder="0"
          min="0"
        />
      </div>
    </div>
  )
}
