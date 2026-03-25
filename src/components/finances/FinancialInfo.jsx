import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Pencil, X, TrendingUp, Wallet, Building2, ChevronRight } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

// ─── Field / colour config ───────────────────────────────────────────────────

const ASSET_FIELDS = [
  { key: 'epfPersaraan',    label: 'EPF Akaun Persaraan' },
  { key: 'epfSejahtera',    label: 'EPF Akaun Sejahtera' },
  { key: 'epfFleksibel',    label: 'EPF Akaun Fleksibel' },
  { key: 'savings',         label: 'Savings' },
  { key: 'unitTrusts',      label: 'Unit Trusts' },
  { key: 'otherInvestment', label: 'Other Investments' },
]
const LIABILITY_FIELDS = [
  { key: 'homeLoan',  label: 'Home Loan' },
  { key: 'carLoan',   label: 'Car Loan' },
  { key: 'studyLoan', label: 'Study Loan' },
  { key: 'otherLoan', label: 'Other Loan' },
]
const INCOME_FIELDS = [
  { key: 'grossIncome', label: 'Gross Monthly Income' },
  { key: 'bonus',       label: 'Annual Bonus' },
]
const EXPENSE_FIELDS = [
  { key: 'household',          label: 'Household' },
  { key: 'personal',           label: 'Personal' },
  { key: 'insuranceProtection',label: 'Insurance (Protection)' },
  { key: 'carLoanRepayment',   label: 'Car Loan Repayment' },
  { key: 'loanRepayment',      label: 'Loan Repayment' },
  { key: 'petrol',             label: 'Petrol' },
  { key: 'carInsurance',       label: 'Car Insurance' },
  { key: 'incomeTax',          label: 'Income Tax' },
  { key: 'roadTax',            label: 'Road Tax' },
]

const COLORS = {
  assets:      ['#007AFF', '#5AC8FA', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'],
  liabilities: ['#FF3B30', '#FF9500', '#AF52DE', '#8E8E93'],
  income:      ['#34C759', '#5AC8FA'],
  expenses:    ['#FF3B30', '#FF9500', '#AF52DE', '#007AFF', '#5AC8FA', '#FF2D55', '#8E8E93', '#34C759', '#AEAEB2'],
}

const SECTION_CFG = [
  { key: 'overview',     label: 'Overview' },
  { key: 'assets',       label: 'Assets',       fields: ASSET_FIELDS,     section: 'assets',      dataKey: 'assets' },
  { key: 'liabilities',  label: 'Liabilities',  fields: LIABILITY_FIELDS, section: 'liabilities', dataKey: 'liabilities' },
  { key: 'income',       label: 'Income',       fields: INCOME_FIELDS,    section: 'income',      dataKey: 'income' },
  { key: 'expenses',     label: 'Expenses',     fields: EXPENSE_FIELDS,   section: 'expenses',    dataKey: 'expenses' },
]

// ─── Main ────────────────────────────────────────────────────────────────────

export default function FinancialInfo({ financials, onSave }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [editSection, setEditSection] = useState(null) // null | 'assets' | 'liabilities' | 'income' | 'expenses'
  const [form, setForm] = useState(null)

  // ── Computed ──────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const a = financials.assets || {}
    const l = financials.liabilities || {}
    const i = financials.income || {}
    const e = financials.expenses || {}

    const totalAssets      = Object.values(a).reduce((s, v) => s + (Number(v) || 0), 0)
    const totalLiabilities = Object.values(l).reduce((s, v) => s + (Number(v) || 0), 0)
    const netWorth         = totalAssets - totalLiabilities

    const monthlyIncome    = (Number(i.grossIncome) || 0) + ((Number(i.bonus) || 0) / 12)
    const monthlyExpenses  = Object.values(e).reduce((s, v) => s + (Number(v) || 0), 0)
    const monthlyCashFlow  = monthlyIncome - monthlyExpenses
    const epfContribution  = (Number(i.grossIncome) || 0) * 0.11

    return { totalAssets, totalLiabilities, netWorth, monthlyIncome, monthlyExpenses, monthlyCashFlow, epfContribution }
  }, [financials])

  const hasData = summary.totalAssets > 0 || summary.totalLiabilities > 0 ||
                  summary.monthlyIncome > 0 || summary.monthlyExpenses > 0

  // ── Edit handlers ─────────────────────────────────────────────────────────

  const openEdit = (section) => {
    setForm({
      assets:      { ...financials.assets },
      liabilities: { ...financials.liabilities },
      income:      { ...financials.income },
      expenses:    { ...financials.expenses },
    })
    setEditSection(section)
  }

  const handleSave = () => {
    const coerce = (obj) => {
      const out = {}
      for (const k in obj) out[k] = Number(obj[k]) || 0
      return out
    }
    onSave({
      ...financials,
      assets:      coerce(form.assets),
      liabilities: coerce(form.liabilities),
      income:      coerce(form.income),
      expenses:    coerce(form.expenses),
    })
    setEditSection(null)
  }

  const updateField = (section, key, value) =>
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }))

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-blue/10 flex items-center justify-center mb-4">
          <Wallet size={26} className="text-hig-blue" />
        </div>
        <p className="text-hig-headline font-semibold mb-1">No Financial Data</p>
        <p className="text-hig-subhead text-hig-text-secondary mb-4">
          Add assets, liabilities, income and expenses to get started.
        </p>
        <button onClick={() => openEdit('assets')} className="hig-btn-primary">Add Financial Info</button>

        {editSection && (
          <EditModal
            editSection={editSection}
            form={form}
            financials={financials}
            onClose={() => setEditSection(null)}
            onSave={handleSave}
            onChange={updateField}
          />
        )}
      </div>
    )
  }

  // ── Tab content helpers ───────────────────────────────────────────────────

  const cfg = SECTION_CFG.find((s) => s.key === activeTab)

  return (
    <div className="space-y-4">

      {/* Category tab bar */}
      <div className="flex gap-1 p-1 bg-hig-gray-6 rounded-hig-sm w-fit">
        {SECTION_CFG.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveTab(s.key)}
            className={`px-3 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-all
              ${activeTab === s.key
                ? 'bg-white text-hig-text shadow-hig'
                : 'text-hig-text-secondary hover:text-hig-text'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              title="Net Worth"
              value={summary.netWorth}
              subtitle={`Assets ${formatRMFull(summary.totalAssets)} − Liabilities ${formatRMFull(summary.totalLiabilities)}`}
              positive={summary.netWorth >= 0}
              icon={<Building2 size={18} />}
              onEdit={() => openEdit('assets')}
            />
            <SummaryCard
              title="Monthly Cash Flow"
              value={summary.monthlyCashFlow}
              subtitle={`Income ${formatRMFull(summary.monthlyIncome)} − Expenses ${formatRMFull(summary.monthlyExpenses)}`}
              positive={summary.monthlyCashFlow >= 0}
              icon={<TrendingUp size={18} />}
              onEdit={() => openEdit('income')}
            />
          </div>

          {/* Quick-jump tiles */}
          <div className="grid grid-cols-2 gap-3">
            {SECTION_CFG.slice(1).map((s) => {
              const data = financials[s.dataKey] || {}
              const total = s.fields.reduce((sum, f) => sum + (Number(data[f.key]) || 0), 0)
              const isNeg = s.key === 'liabilities'
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveTab(s.key)}
                  className="hig-card p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-hig-caption1 text-hig-text-secondary font-medium mb-0.5">{s.label}</p>
                    <p className={`text-hig-headline font-bold ${isNeg && total > 0 ? 'text-hig-red' : 'text-hig-text'}`}>
                      {formatRMFull(total)}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-hig-text-secondary shrink-0" />
                </button>
              )
            })}
          </div>

          {summary.epfContribution > 0 && (
            <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig p-4">
              <p className="text-hig-subhead text-hig-blue font-medium">
                EPF Employee Contribution: {formatRMFull(summary.epfContribution)}/month (11% of gross income)
              </p>
              <p className="text-hig-caption1 text-hig-text-secondary mt-1">
                Employer contributes {(Number(financials.income?.grossIncome) || 0) > 5000 ? '12%' : '13%'} based on salary threshold.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Category tabs (Assets / Liabilities / Income / Expenses) ──────── */}
      {activeTab !== 'overview' && cfg && (
        <CategoryTab
          cfg={cfg}
          financials={financials}
          colors={COLORS[cfg.key]}
          onEdit={() => openEdit(cfg.section)}
        />
      )}

      {/* Edit Modal */}
      {editSection && (
        <EditModal
          editSection={editSection}
          form={form}
          financials={financials}
          onClose={() => setEditSection(null)}
          onSave={handleSave}
          onChange={updateField}
        />
      )}
    </div>
  )
}

// ─── Category tab panel ───────────────────────────────────────────────────────

function CategoryTab({ cfg, financials, colors, onEdit }) {
  const data = financials[cfg.dataKey] || {}
  const chartData = cfg.fields
    .map((f) => ({ name: f.label, value: Number(data[f.key]) || 0 }))
    .filter((d) => d.value > 0)

  const total = cfg.fields.reduce((s, f) => s + (Number(data[f.key]) || 0), 0)
  const isNeg = cfg.key === 'liabilities'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-title3">{cfg.label}</h3>
          <p className={`text-hig-headline font-bold mt-0.5 ${isNeg && total > 0 ? 'text-hig-red' : 'text-hig-blue'}`}>
            {formatRMFull(total)}
          </p>
        </div>
        <button onClick={onEdit} className="hig-btn-ghost gap-1.5">
          <Pencil size={14} /> Edit
        </button>
      </div>

      {total === 0 ? (
        <div className="hig-card p-6 text-center">
          <p className="text-hig-subhead text-hig-text-secondary mb-3">No {cfg.label.toLowerCase()} recorded.</p>
          <button onClick={onEdit} className="hig-btn-primary">Add {cfg.label}</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Donut chart */}
          <div className="hig-card p-4">
            <h4 className="text-hig-headline mb-3">Breakdown</h4>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%" cy="50%"
                      innerRadius={30} outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatRMFull(val)}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {chartData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-hig-caption1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-hig-text-secondary flex-1 truncate">{d.name}</span>
                    <span className="text-hig-text font-medium tabular-nums">{formatRMFull(d.value)}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-hig-gray-5 flex justify-between text-hig-caption1 font-semibold">
                  <span className="text-hig-text-secondary">Total</span>
                  <span className="text-hig-text">{formatRMFull(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line-item table */}
          <div className="hig-card p-4">
            <h4 className="text-hig-headline mb-3">Detail</h4>
            <div className="space-y-1">
              {cfg.fields.map((f) => {
                const val = Number(data[f.key]) || 0
                if (val === 0) return null
                const pct = total > 0 ? Math.round((val / total) * 100) : 0
                return (
                  <div key={f.key} className="space-y-0.5 py-1.5 border-b border-hig-gray-5 last:border-b-0">
                    <div className="flex justify-between text-hig-subhead">
                      <span className="text-hig-text-secondary">{f.label}</span>
                      <span className="font-medium tabular-nums">{formatRMFull(val)}</span>
                    </div>
                    <div className="w-full h-1 bg-hig-gray-5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: colors[cfg.fields.indexOf(f) % colors.length] }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between pt-2 text-hig-subhead font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatRMFull(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Edit Modal (scoped to one section) ──────────────────────────────────────

const SECTION_META = {
  assets:      { label: 'Assets',          fields: ASSET_FIELDS },
  liabilities: { label: 'Liabilities',     fields: LIABILITY_FIELDS },
  income:      { label: 'Income',          fields: INCOME_FIELDS },
  expenses:    { label: 'Monthly Expenses',fields: EXPENSE_FIELDS },
}

function EditModal({ editSection, form, financials, onClose, onSave, onChange }) {
  const [activeEdit, setActiveEdit] = useState(editSection)
  const meta = SECTION_META[activeEdit]

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-hig-title3">Edit Financial Info</h2>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6">
            <X size={18} />
          </button>
        </div>

        {/* Section tabs inside modal */}
        <div className="flex gap-1 p-1 bg-hig-gray-6 rounded-hig-sm mb-5">
          {Object.entries(SECTION_META).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setActiveEdit(key)}
              className={`flex-1 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-all
                ${activeEdit === key ? 'bg-white text-hig-text shadow-hig' : 'text-hig-text-secondary hover:text-hig-text'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          {meta.fields.map((f) => (
            <div key={f.key}>
              <label className="hig-label">{f.label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                <input
                  type="number"
                  value={form[activeEdit]?.[f.key] || ''}
                  onChange={(e) => onChange(activeEdit, f.key, e.target.value)}
                  className="hig-input pl-10 tabular-nums"
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>
            </div>
          ))}
        </div>

        {/* EPF note on income tab */}
        {activeEdit === 'income' && (
          <div className="mt-4 bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3">
            <p className="text-hig-caption1 text-hig-blue">
              EPF employee contribution (11% of gross): {formatRMFull((Number(form.income?.grossIncome) || 0) * 0.11)}/month
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-hig-gray-5">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={onSave} className="hig-btn-primary">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ title, value, subtitle, positive, icon, onEdit }) {
  return (
    <div className="hig-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-hig-sm ${positive ? 'bg-hig-green/10 text-hig-green' : 'bg-hig-red/10 text-hig-red'}`}>
            {icon}
          </div>
          <span className="text-hig-subhead text-hig-text-secondary">{title}</span>
        </div>
        <button onClick={onEdit} className="text-hig-text-secondary hover:text-hig-blue transition-colors p-1">
          <Pencil size={13} />
        </button>
      </div>
      <p className={`text-hig-title2 font-bold ${positive ? 'text-hig-text' : 'text-hig-red'}`}>
        {value < 0 && '−'}{formatRMFull(Math.abs(value))}
      </p>
      <p className="text-hig-caption1 text-hig-text-secondary mt-1">{subtitle}</p>
    </div>
  )
}
