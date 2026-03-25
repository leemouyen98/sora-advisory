import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Pencil, X, TrendingUp, TrendingDown, Wallet, Building2 } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

// ─── Category Config ────────────────────────────────────────────────────────

const ASSET_FIELDS = [
  { key: 'epfPersaraan', label: 'EPF Akaun Persaraan' },
  { key: 'epfSejahtera', label: 'EPF Akaun Sejahtera' },
  { key: 'epfFleksibel', label: 'EPF Akaun Fleksibel' },
  { key: 'savings', label: 'Savings' },
  { key: 'unitTrusts', label: 'Unit Trusts' },
  { key: 'otherInvestment', label: 'Other Investments' },
]

const LIABILITY_FIELDS = [
  { key: 'homeLoan', label: 'Home Loan' },
  { key: 'carLoan', label: 'Car Loan' },
  { key: 'studyLoan', label: 'Study Loan' },
  { key: 'otherLoan', label: 'Other Loan' },
]

const INCOME_FIELDS = [
  { key: 'grossIncome', label: 'Gross Monthly Income' },
  { key: 'bonus', label: 'Annual Bonus' },
]

const EXPENSE_FIELDS = [
  { key: 'household', label: 'Household' },
  { key: 'personal', label: 'Personal' },
  { key: 'insuranceProtection', label: 'Insurance (Protection)' },
  { key: 'carLoanRepayment', label: 'Car Loan Repayment' },
  { key: 'loanRepayment', label: 'Loan Repayment' },
  { key: 'petrol', label: 'Petrol' },
  { key: 'carInsurance', label: 'Car Insurance' },
  { key: 'incomeTax', label: 'Income Tax' },
  { key: 'roadTax', label: 'Road Tax' },
]

const ASSET_COLORS = ['#007AFF', '#5AC8FA', '#34C759', '#FF9500', '#AF52DE', '#FF2D55']
const LIABILITY_COLORS = ['#FF3B30', '#FF9500', '#AF52DE', '#8E8E93']
const INCOME_COLORS = ['#34C759', '#5AC8FA']
const EXPENSE_COLORS = ['#FF3B30', '#FF9500', '#AF52DE', '#007AFF', '#5AC8FA', '#FF2D55', '#8E8E93', '#34C759', '#AEAEB2']

// ─── Component ──────────────────────────────────────────────────────────────

export default function FinancialInfo({ financials, onSave }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)

  // ─── Computed Summaries ─────────────────────────────────────────────────

  const summary = useMemo(() => {
    const a = financials.assets || {}
    const l = financials.liabilities || {}
    const i = financials.income || {}
    const e = financials.expenses || {}

    const totalAssets = Object.values(a).reduce((s, v) => s + (Number(v) || 0), 0)
    const totalLiabilities = Object.values(l).reduce((s, v) => s + (Number(v) || 0), 0)
    const netWorth = totalAssets - totalLiabilities

    const monthlyIncome = (Number(i.grossIncome) || 0) + ((Number(i.bonus) || 0) / 12)
    const monthlyExpenses = Object.values(e).reduce((s, v) => s + (Number(v) || 0), 0)
    const monthlyCashFlow = monthlyIncome - monthlyExpenses

    // EPF contribution auto-calc (employee 11% of gross)
    const epfContribution = (Number(i.grossIncome) || 0) * 0.11

    return {
      totalAssets, totalLiabilities, netWorth,
      monthlyIncome, monthlyExpenses, monthlyCashFlow,
      epfContribution,
    }
  }, [financials])

  // ─── Chart Data ─────────────────────────────────────────────────────────

  const assetChartData = useMemo(() => {
    const a = financials.assets || {}
    return ASSET_FIELDS
      .map((f) => ({ name: f.label, value: Number(a[f.key]) || 0 }))
      .filter((d) => d.value > 0)
  }, [financials])

  const liabilityChartData = useMemo(() => {
    const l = financials.liabilities || {}
    return LIABILITY_FIELDS
      .map((f) => ({ name: f.label, value: Number(l[f.key]) || 0 }))
      .filter((d) => d.value > 0)
  }, [financials])

  const incomeChartData = useMemo(() => {
    const i = financials.income || {}
    const data = []
    if (Number(i.grossIncome) > 0) data.push({ name: 'Gross Income', value: Number(i.grossIncome) })
    if (Number(i.bonus) > 0) data.push({ name: 'Bonus (Monthly)', value: Math.round(Number(i.bonus) / 12) })
    return data
  }, [financials])

  const expenseChartData = useMemo(() => {
    const e = financials.expenses || {}
    return EXPENSE_FIELDS
      .map((f) => ({ name: f.label, value: Number(e[f.key]) || 0 }))
      .filter((d) => d.value > 0)
  }, [financials])

  // ─── Edit Handlers ──────────────────────────────────────────────────────

  const openEdit = () => {
    setForm({
      assets: { ...financials.assets },
      liabilities: { ...financials.liabilities },
      income: { ...financials.income },
      expenses: { ...financials.expenses },
    })
    setEditing(true)
  }

  const handleSave = () => {
    // Coerce all values to numbers
    const coerce = (obj) => {
      const out = {}
      for (const k in obj) out[k] = Number(obj[k]) || 0
      return out
    }
    onSave({
      ...financials,
      assets: coerce(form.assets),
      liabilities: coerce(form.liabilities),
      income: coerce(form.income),
      expenses: coerce(form.expenses),
    })
    setEditing(false)
  }

  const updateField = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  const hasData = summary.totalAssets > 0 || summary.totalLiabilities > 0 ||
                  summary.monthlyIncome > 0 || summary.monthlyExpenses > 0

  // ─── Edit Modal ─────────────────────────────────────────────────────────

  if (editing) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-hig-title3">Edit Financial Information</h2>
            <button onClick={() => setEditing(false)} className="p-2 rounded-hig-sm hover:bg-hig-gray-6">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Assets */}
            <FormSection title="Assets" fields={ASSET_FIELDS} section="assets" form={form} onChange={updateField} />
            {/* Liabilities */}
            <FormSection title="Liabilities" fields={LIABILITY_FIELDS} section="liabilities" form={form} onChange={updateField} />
            {/* Income */}
            <FormSection title="Income" fields={INCOME_FIELDS} section="income" form={form} onChange={updateField} />
            {/* EPF auto-calc note */}
            <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3">
              <p className="text-hig-caption1 text-hig-blue">
                EPF employee contribution (11% of gross income): {formatRMFull((Number(form.income?.grossIncome) || 0) * 0.11)}/month
              </p>
            </div>
            {/* Expenses */}
            <FormSection title="Monthly Expenses" fields={EXPENSE_FIELDS} section="expenses" form={form} onChange={updateField} />
          </div>

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-hig-gray-5">
            <button onClick={() => setEditing(false)} className="hig-btn-secondary">Cancel</button>
            <button onClick={handleSave} className="hig-btn-primary">Save Financial Info</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-blue/10 flex items-center justify-center mb-4">
          <Wallet size={26} className="text-hig-blue" />
        </div>
        <p className="text-hig-headline text-hig-text font-semibold mb-1">No Financial Data</p>
        <p className="text-hig-subhead text-hig-text-secondary mb-4">
          Add assets, liabilities, income and expenses to see the full picture.
        </p>
        <button onClick={openEdit} className="hig-btn-primary">Add Financial Info</button>
      </div>
    )
  }

  // ─── Dashboard View ─────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header + Edit Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-hig-title3">Financial Summary</h3>
        <button onClick={openEdit} className="hig-btn-ghost gap-1.5">
          <Pencil size={14} /> Edit
        </button>
      </div>

      {/* Net Worth + Cash Flow summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          title="Net Worth"
          value={summary.netWorth}
          subtitle={`Assets ${formatRMFull(summary.totalAssets)} − Liabilities ${formatRMFull(summary.totalLiabilities)}`}
          positive={summary.netWorth >= 0}
          icon={<Building2 size={18} />}
        />
        <SummaryCard
          title="Monthly Cash Flow"
          value={summary.monthlyCashFlow}
          subtitle={`Income ${formatRMFull(summary.monthlyIncome)} − Expenses ${formatRMFull(summary.monthlyExpenses)}`}
          positive={summary.monthlyCashFlow >= 0}
          icon={<TrendingUp size={18} />}
        />
      </div>

      {/* Donut Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {assetChartData.length > 0 && (
          <DonutCard title="Assets" data={assetChartData} colors={ASSET_COLORS} total={summary.totalAssets} />
        )}
        {liabilityChartData.length > 0 && (
          <DonutCard title="Liabilities" data={liabilityChartData} colors={LIABILITY_COLORS} total={summary.totalLiabilities} />
        )}
        {incomeChartData.length > 0 && (
          <DonutCard title="Monthly Income" data={incomeChartData} colors={INCOME_COLORS} total={summary.monthlyIncome} />
        )}
        {expenseChartData.length > 0 && (
          <DonutCard title="Monthly Expenses" data={expenseChartData} colors={EXPENSE_COLORS} total={summary.monthlyExpenses} />
        )}
      </div>

      {/* Detailed Breakdown Tables */}
      <div className="grid grid-cols-2 gap-4">
        <BreakdownTable title="Assets" fields={ASSET_FIELDS} data={financials.assets} />
        <BreakdownTable title="Liabilities" fields={LIABILITY_FIELDS} data={financials.liabilities} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <BreakdownTable title="Income" fields={INCOME_FIELDS} data={financials.income} />
        <BreakdownTable title="Expenses" fields={EXPENSE_FIELDS} data={financials.expenses} />
      </div>

      {/* EPF Auto-calc Info */}
      {summary.epfContribution > 0 && (
        <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig p-4">
          <p className="text-hig-subhead text-hig-blue font-medium">
            EPF Employee Contribution: {formatRMFull(summary.epfContribution)}/month (11% of gross income)
          </p>
          <p className="text-hig-caption1 text-hig-text-secondary mt-1">
            Employer contributes an additional {(Number(financials.income?.grossIncome) || 0) / 12 > 5000 ? '12%' : '13%'} based on salary threshold.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ title, value, subtitle, positive, icon }) {
  return (
    <div className="hig-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-hig-sm ${positive ? 'bg-hig-green/10 text-hig-green' : 'bg-hig-red/10 text-hig-red'}`}>
          {icon}
        </div>
        <span className="text-hig-subhead text-hig-text-secondary">{title}</span>
      </div>
      <p className={`text-hig-title2 font-bold ${positive ? 'text-hig-text' : 'text-hig-red'}`}>
        {value < 0 && '−'}{formatRMFull(Math.abs(value))}
      </p>
      <p className="text-hig-caption1 text-hig-text-secondary mt-1">{subtitle}</p>
    </div>
  )
}

function DonutCard({ title, data, colors, total }) {
  return (
    <div className="hig-card p-4">
      <h4 className="text-hig-headline mb-3">{title}</h4>
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => formatRMFull(val)}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
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
  )
}

function BreakdownTable({ title, fields, data }) {
  const d = data || {}
  const total = fields.reduce((s, f) => s + (Number(d[f.key]) || 0), 0)

  return (
    <div className="hig-card p-4">
      <h4 className="text-hig-headline mb-3">{title}</h4>
      <div className="space-y-1">
        {fields.map((f) => {
          const val = Number(d[f.key]) || 0
          if (val === 0) return null
          return (
            <div key={f.key} className="flex justify-between py-1.5 text-hig-subhead">
              <span className="text-hig-text-secondary">{f.label}</span>
              <span className="text-hig-text font-medium tabular-nums">{formatRMFull(val)}</span>
            </div>
          )
        })}
        {total > 0 && (
          <div className="flex justify-between py-2 border-t border-hig-gray-5 text-hig-subhead font-semibold">
            <span className="text-hig-text">Total</span>
            <span className="text-hig-text">{formatRMFull(total)}</span>
          </div>
        )}
        {total === 0 && (
          <p className="text-hig-caption1 text-hig-text-secondary py-2">No data entered.</p>
        )}
      </div>
    </div>
  )
}

function FormSection({ title, fields, section, form, onChange }) {
  return (
    <div>
      <h3 className="text-hig-headline mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="hig-label">{f.label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
              <input
                type="number"
                value={form[section]?.[f.key] || ''}
                onChange={(e) => onChange(section, f.key, e.target.value)}
                className="hig-input pl-10 tabular-nums"
                placeholder="0"
                min="0"
                step="100"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
