import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, X, ChevronRight, Info } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── Type constants ───────────────────────────────────────────────────────────
const ASSET_DYNAMIC_TYPES = ['Property', 'Automobile', 'Others']
const INVESTMENT_TYPES = ['ETFs', 'Stocks & Shares', 'Unit Trusts', 'Bonds', 'Other Investment']
const PAYMENT_MODES = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'Lump Sum']
const LIABILITY_TYPES = ['Home Loan', 'Car Loan', 'Study Loan', 'Personal Loan', 'Credit Card', 'Business Loan', 'Other']
const INCOME_DYNAMIC_TYPES = ['Rental', 'Business', 'Dividends', 'Insurance Payout', 'Other Income']
const EXPENSE_TYPES = [
  'All-Personal', 'All-Transport', 'All-Household', 'All-Dependants', 'All-Miscellaneous',
  'Vacation/Travel', 'Dependant Allowances', 'Parent Allowance', 'Medical Cost', 'Rental Expense',
]
const FREQUENCIES = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'One-Time']

const TABS = [
  { key: 'overview',     label: 'Overview'     },
  { key: 'assets',       label: 'Assets'       },
  { key: 'investments',  label: 'Investments'  },
  { key: 'liabilities',  label: 'Liabilities'  },
  { key: 'income',       label: 'Income'       },
  { key: 'expenses',     label: 'Expenses'     },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toMonthly(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1 / 12, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function calcMonthlyRepayment(principal, interestRate, loanPeriod) {
  const P = Number(principal) || 0
  const r = (Number(interestRate) || 0) / 100 / 12
  const n = Number(loanPeriod) || 1
  if (P === 0) return 0
  if (r === 0) return P / n
  return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
}

function getDefaultFixedAssets() {
  return [
    { id: 'savings-cash',   fixed: true, type: 'Savings Cash',   description: 'Savings / Cash',        growthRate: 0.25, amount: 0 },
    { id: 'epf-persaraan',  fixed: true, type: 'EPF Persaraan',  description: 'EPF Akaun Persaraan',   growthRate: 5.2,  amount: 0 },
    { id: 'epf-sejahtera',  fixed: true, type: 'EPF Sejahtera',  description: 'EPF Akaun Sejahtera',   growthRate: 5.2,  amount: 0 },
    { id: 'epf-fleksibel',  fixed: true, type: 'EPF Fleksibel',  description: 'EPF Akaun Fleksibel',   growthRate: 5.2,  amount: 0 },
  ]
}

function getDefaultFixedIncome() {
  return [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: 0 },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: 0 },
  ]
}

function normalizeFinancials(fin, currentAge = 30) {
  if (!fin) {
    return { assets: getDefaultFixedAssets(), investments: [], liabilities: [], income: getDefaultFixedIncome(), expenses: [], insurance: [] }
  }

  // Already new array-based format
  if (Array.isArray(fin.assets)) {
    const ensureFixedAssets = (rows) => {
      if (rows.some(r => r.fixed)) return rows
      return [...getDefaultFixedAssets(), ...rows]
    }
    const ensureFixedIncome = (rows) => {
      if (!Array.isArray(rows)) return getDefaultFixedIncome()
      if (rows.some(r => r.fixed)) return rows
      return [...getDefaultFixedIncome(), ...rows]
    }
    return {
      assets:      ensureFixedAssets(fin.assets),
      investments: fin.investments || [],
      liabilities: fin.liabilities || [],
      income:      ensureFixedIncome(fin.income),
      expenses:    fin.expenses    || [],
      insurance:   fin.insurance   || [],
    }
  }

  // ── Migrate from old object format ──────────────────────────────────────────
  const oldA = fin.assets      || {}
  const oldL = fin.liabilities || {}
  const oldI = fin.income      || {}
  const oldE = fin.expenses    || {}

  const assets = [
    { id: 'savings-cash',  fixed: true, type: 'Savings Cash',  description: 'Savings / Cash',       growthRate: 0.25, amount: Number(oldA.savings)      || 0 },
    { id: 'epf-persaraan', fixed: true, type: 'EPF Persaraan', description: 'EPF Akaun Persaraan',  growthRate: 5.2,  amount: Number(oldA.epfPersaraan) || 0 },
    { id: 'epf-sejahtera', fixed: true, type: 'EPF Sejahtera', description: 'EPF Akaun Sejahtera',  growthRate: 5.2,  amount: Number(oldA.epfSejahtera) || 0 },
    { id: 'epf-fleksibel', fixed: true, type: 'EPF Fleksibel', description: 'EPF Akaun Fleksibel',  growthRate: 5.2,  amount: Number(oldA.epfFleksibel) || 0 },
    ...(Number(oldA.unitTrusts)      > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Unit Trusts',      growthRate: 6, amount: Number(oldA.unitTrusts)      }] : []),
    ...(Number(oldA.otherInvestment) > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Other Investment', growthRate: 5, amount: Number(oldA.otherInvestment) }] : []),
  ]

  const liabilities = [
    ...(Number(oldL.homeLoan)  > 0 ? [{ id: uid(), type: 'Home Loan',    description: 'Home Loan',    principal: Number(oldL.homeLoan),  startAge: currentAge - 5, interestRate: 4.5, loanPeriod: 360 }] : []),
    ...(Number(oldL.carLoan)   > 0 ? [{ id: uid(), type: 'Car Loan',     description: 'Car Loan',     principal: Number(oldL.carLoan),   startAge: currentAge - 2, interestRate: 3.0, loanPeriod: 84  }] : []),
    ...(Number(oldL.studyLoan) > 0 ? [{ id: uid(), type: 'Study Loan',   description: 'PTPTN',        principal: Number(oldL.studyLoan), startAge: currentAge - 5, interestRate: 1.0, loanPeriod: 120 }] : []),
    ...(Number(oldL.otherLoan) > 0 ? [{ id: uid(), type: 'Personal Loan',description: 'Other Loan',   principal: Number(oldL.otherLoan), startAge: currentAge,     interestRate: 5.0, loanPeriod: 60  }] : []),
  ]

  const income = [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: Number(oldI.grossIncome) || 0 },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: Number(oldI.bonus)       || 0 },
  ]

  const expMap = [
    { key: 'household',           type: 'All-Household',     desc: 'Household'            },
    { key: 'personal',            type: 'All-Personal',      desc: 'Personal'             },
    { key: 'petrol',              type: 'All-Transport',     desc: 'Petrol'               },
    { key: 'carLoanRepayment',    type: 'All-Transport',     desc: 'Car Loan Repayment'   },
    { key: 'loanRepayment',       type: 'All-Miscellaneous', desc: 'Loan Repayment'       },
    { key: 'carInsurance',        type: 'All-Transport',     desc: 'Car Insurance'        },
    { key: 'roadTax',             type: 'All-Transport',     desc: 'Road Tax'             },
    { key: 'incomeTax',           type: 'All-Miscellaneous', desc: 'Income Tax'           },
    { key: 'insuranceProtection', type: 'All-Miscellaneous', desc: 'Insurance Premium'    },
  ]
  const expenses = expMap
    .filter(m => Number(oldE[m.key]) > 0)
    .map(m => ({ id: uid(), type: m.type, description: m.desc, ageFrom: currentAge, ageTo: 55, frequency: 'Monthly', amount: Number(oldE[m.key]) }))

  return { assets, investments: fin.investments || [], liabilities, income, expenses, insurance: fin.insurance || [] }
}

function computeSummary(data) {
  const totalAssets      = (data.assets      || []).reduce((s, r) => s + (Number(r.amount)       || 0), 0)
  const totalInvestments = (data.investments || []).reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
  const totalLiabilities = (data.liabilities || []).reduce((s, r) => s + (Number(r.principal)    || 0), 0)
  const monthlyIncome    = (data.income      || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const monthlyExpenses  = (data.expenses    || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const grossRow         = (data.income      || []).find(r => r.id === 'gross-income')
  const epfContribution  = (Number(grossRow?.amount) || 0) * 0.11
  return {
    totalAssets, totalInvestments, totalLiabilities,
    netWorth:        totalAssets + totalInvestments - totalLiabilities,
    monthlyIncome, monthlyExpenses,
    monthlyCashFlow: monthlyIncome - monthlyExpenses,
    epfContribution,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FinancialInfo({ financials, onSave, currentAge = 30 }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [liabilityModal, setLiabilityModal] = useState(null)
  const [data, setData] = useState(() => normalizeFinancials(financials, currentAge))

  // Sync when financials prop changes (contact switch)
  useEffect(() => {
    setData(normalizeFinancials(financials, currentAge))
  }, [financials]) // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => computeSummary(data), [data])

  const saveSection = (section, newRows) => {
    const updated = { ...data, [section]: newRows }
    setData(updated)
    onSave(updated)
  }

  const updateRow = (section, id, updates) =>
    saveSection(section, data[section].map(r => r.id === id ? { ...r, ...updates } : r))

  const addRow = (section, newRow) =>
    saveSection(section, [...(data[section] || []), newRow])

  const removeRow = (section, id) =>
    saveSection(section, data[section].filter(r => r.id !== id))

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-hig-gray-6 rounded-hig-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-all
              ${activeTab === t.key
                ? 'bg-white text-hig-text shadow-hig'
                : 'text-hig-text-secondary hover:text-hig-text'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab summary={summary} onNavigate={setActiveTab} />
      )}

      {activeTab === 'assets' && (
        <AssetsTab
          rows={data.assets}
          onUpdate={(id, u) => updateRow('assets', id, u)}
          onAdd={() => addRow('assets', { id: uid(), fixed: false, type: 'Property', description: '', growthRate: 5, amount: 0 })}
          onRemove={(id) => removeRow('assets', id)}
        />
      )}

      {activeTab === 'investments' && (
        <InvTab
          rows={data.investments}
          currentAge={currentAge}
          onUpdate={(id, u) => updateRow('investments', id, u)}
          onAdd={() => addRow('investments', { id: uid(), type: 'Unit Trusts', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 55, growthRate: 6, currentValue: 0 })}
          onRemove={(id) => removeRow('investments', id)}
        />
      )}

      {activeTab === 'liabilities' && (
        <LiabTab
          rows={data.liabilities}
          onAdd={() => setLiabilityModal({ type: 'Home Loan', description: '', principal: 0, startAge: currentAge, interestRate: 4.5, loanPeriod: 360 })}
          onEdit={(row) => setLiabilityModal({ ...row })}
          onRemove={(id) => removeRow('liabilities', id)}
        />
      )}

      {activeTab === 'income' && (
        <IncomeTab
          rows={data.income}
          onUpdate={(id, u) => updateRow('income', id, u)}
          onAdd={() => addRow('income', { id: uid(), fixed: false, type: 'Rental', description: '', frequency: 'Monthly', amount: 0 })}
          onRemove={(id) => removeRow('income', id)}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpTab
          rows={data.expenses}
          currentAge={currentAge}
          onUpdate={(id, u) => updateRow('expenses', id, u)}
          onAdd={() => addRow('expenses', { id: uid(), type: 'All-Personal', description: '', ageFrom: currentAge, ageTo: 55, frequency: 'Monthly', amount: 0 })}
          onRemove={(id) => removeRow('expenses', id)}
        />
      )}

      {liabilityModal !== null && (
        <LiabilityModal
          initial={liabilityModal}
          currentAge={currentAge}
          onSave={(liab) => {
            if (liab.id) updateRow('liabilities', liab.id, liab)
            else addRow('liabilities', { ...liab, id: uid() })
            setLiabilityModal(null)
          }}
          onClose={() => setLiabilityModal(null)}
        />
      )}
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ summary, onNavigate }) {
  const cats = [
    { key: 'assets',      label: 'Assets',           value: summary.totalAssets,      negative: false },
    { key: 'investments', label: 'Investments',       value: summary.totalInvestments, negative: false },
    { key: 'liabilities', label: 'Liabilities',       value: summary.totalLiabilities, negative: true  },
    { key: 'income',      label: 'Monthly Income',    value: summary.monthlyIncome,    negative: false },
    { key: 'expenses',    label: 'Monthly Expenses',  value: summary.monthlyExpenses,  negative: true  },
  ]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-3 gap-3">
        {cats.map(c => (
          <button
            key={c.key}
            onClick={() => onNavigate(c.key)}
            className="hig-card p-4 text-left hover:shadow-md transition-shadow flex items-center justify-between"
          >
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

      {summary.epfContribution > 0 && (
        <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3 flex items-start gap-2">
          <Info size={13} className="text-hig-blue mt-0.5 shrink-0" />
          <div>
            <p className="text-hig-subhead text-hig-blue font-medium">
              EPF Employee: {formatRMFull(summary.epfContribution)}/mth (11% of gross income)
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
function AssetsTab({ rows, onUpdate, onAdd, onRemove }) {
  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Assets</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Total: {formatRMFull(total)}</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5">
          <Plus size={14} /> Add Asset
        </button>
      </div>
      <div className="hig-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hig-gray-5 bg-hig-gray-6">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Type</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Description</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-28">Growth Rate %</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-40">Amount (RM)</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                <td className="px-4 py-2">
                  {r.fixed
                    ? <span className="text-hig-caption1 text-hig-text-secondary font-medium">{r.type}</span>
                    : (
                      <select value={r.type} onChange={e => onUpdate(r.id, { type: e.target.value })} className="hig-input text-hig-caption1 py-1">
                        {ASSET_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    )
                  }
                </td>
                <td className="px-3 py-2">
                  {r.fixed
                    ? <span className="text-hig-subhead">{r.description}</span>
                    : <input value={r.description} onChange={e => onUpdate(r.id, { description: e.target.value })} className="hig-input py-1" placeholder="Description" />
                  }
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number" step="0.1" min="0"
                    value={r.growthRate}
                    onChange={e => onUpdate(r.id, { growthRate: parseFloat(e.target.value) || 0 })}
                    className="hig-input text-right py-1 tabular-nums w-full"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                    <input
                      type="number" min="0" step="100"
                      value={r.amount || ''}
                      onChange={e => onUpdate(r.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1 pl-8 tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  {!r.fixed && (
                    <button onClick={() => onRemove(r.id)} className="text-hig-text-secondary hover:text-hig-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-hig-gray-5 bg-hig-gray-6">
              <td colSpan={3} className="px-4 py-2.5 text-hig-subhead font-semibold">Total</td>
              <td className="px-4 py-2.5 text-right text-hig-subhead font-semibold tabular-nums">{formatRMFull(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Investments Tab ──────────────────────────────────────────────────────────
function InvTab({ rows, currentAge, onUpdate, onAdd, onRemove }) {
  const total = rows.reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Investments</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Total Value: {formatRMFull(total)}</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5">
          <Plus size={14} /> Add Investment
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="hig-card p-8 text-center">
          <p className="text-hig-subhead text-hig-text-secondary mb-3">No investments recorded.</p>
          <button onClick={onAdd} className="hig-btn-primary">Add Investment</button>
        </div>
      ) : (
        <div className="hig-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hig-gray-5 bg-hig-gray-6">
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Type</th>
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Plan Name</th>
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-28">Payment Mode</th>
                <th className="text-center px-2 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-20">Age From</th>
                <th className="text-center px-2 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-20">Age To</th>
                <th className="text-right px-2 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-24">Return %</th>
                <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Current Value (RM)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                  <td className="px-3 py-2">
                    <select value={r.type} onChange={e => onUpdate(r.id, { type: e.target.value })} className="hig-input text-hig-caption1 py-1">
                      {INVESTMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={r.planName || ''} onChange={e => onUpdate(r.id, { planName: e.target.value })} className="hig-input py-1" placeholder="Plan name" />
                  </td>
                  <td className="px-3 py-2">
                    <select value={r.paymentMode || 'Monthly'} onChange={e => onUpdate(r.id, { paymentMode: e.target.value })} className="hig-input text-hig-caption1 py-1">
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={18} max={100}
                      value={r.ageFrom ?? currentAge}
                      onChange={e => onUpdate(r.id, { ageFrom: parseInt(e.target.value) || currentAge })}
                      className="hig-input text-center py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={18} max={120}
                      value={r.ageTo ?? 55}
                      onChange={e => onUpdate(r.id, { ageTo: parseInt(e.target.value) || 55 })}
                      className="hig-input text-center py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" step="0.5" min="0"
                      value={r.growthRate || 0}
                      onChange={e => onUpdate(r.id, { growthRate: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                      <input
                        type="number" min="0" step="100"
                        value={r.currentValue || ''}
                        onChange={e => onUpdate(r.id, { currentValue: parseFloat(e.target.value) || 0 })}
                        className="hig-input text-right py-1 pl-8 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => onRemove(r.id)} className="text-hig-text-secondary hover:text-hig-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-hig-gray-5 bg-hig-gray-6">
                <td colSpan={6} className="px-3 py-2.5 text-hig-subhead font-semibold">Total Value</td>
                <td className="px-3 py-2.5 text-right text-hig-subhead font-semibold tabular-nums">{formatRMFull(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Liabilities Tab ──────────────────────────────────────────────────────────
function LiabTab({ rows, onAdd, onEdit, onRemove }) {
  const totalPrincipal = rows.reduce((s, r) => s + (Number(r.principal) || 0), 0)
  const totalMonthly   = rows.reduce((s, r) => s + calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Liabilities</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">
            Outstanding: {formatRMFull(totalPrincipal)} · Repayment: {formatRMFull(totalMonthly)}/mth
          </p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5">
          <Plus size={14} /> New Liability
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="hig-card p-8 text-center">
          <p className="text-hig-subhead text-hig-text-secondary mb-3">No liabilities recorded.</p>
          <button onClick={onAdd} className="hig-btn-primary">Add Liability</button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(r => {
            const monthly = calcMonthlyRepayment(r.principal, r.interestRate, r.loanPeriod)
            return (
              <div key={r.id} className="hig-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-hig-caption2 text-hig-text-secondary px-2 py-0.5 bg-hig-gray-6 rounded-full">{r.type}</span>
                    <span className="text-hig-subhead font-medium">{r.description || r.type}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-hig-caption1 text-hig-text-secondary">
                    <span>Principal: <span className="text-hig-text font-medium tabular-nums">{formatRMFull(r.principal)}</span></span>
                    <span>Rate: <span className="text-hig-text font-medium">{r.interestRate}% p.a.</span></span>
                    <span>Term: <span className="text-hig-text font-medium">{r.loanPeriod} mths</span></span>
                    <span>Monthly: <span className="text-hig-red font-medium tabular-nums">{formatRMFull(monthly)}</span></span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => onEdit(r)} className="hig-btn-ghost py-1 px-2 text-hig-caption1">Edit</button>
                  <button onClick={() => onRemove(r.id)} className="text-hig-text-secondary hover:text-hig-red transition-colors p-2">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="hig-card p-3 flex justify-between text-hig-subhead font-semibold bg-hig-gray-6">
            <span>Total Monthly Repayment</span>
            <span className="text-hig-red tabular-nums">{formatRMFull(totalMonthly)}/mth</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Income Tab ───────────────────────────────────────────────────────────────
function IncomeTab({ rows, onUpdate, onAdd, onRemove }) {
  const totalMonthly = rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const grossRow = rows.find(r => r.id === 'gross-income')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Income</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Monthly equivalent: {formatRMFull(totalMonthly)}/mth</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5">
          <Plus size={14} /> Add Income
        </button>
      </div>
      <div className="hig-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hig-gray-5 bg-hig-gray-6">
              <th className="text-left px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Type</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Description</th>
              <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Frequency</th>
              <th className="text-right px-4 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-40">Amount (RM)</th>
              <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Monthly Eq.</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                <td className="px-4 py-2">
                  {r.fixed
                    ? <span className="text-hig-caption1 text-hig-text-secondary font-medium">{r.type}</span>
                    : (
                      <select value={r.type} onChange={e => onUpdate(r.id, { type: e.target.value })} className="hig-input text-hig-caption1 py-1">
                        {INCOME_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    )
                  }
                </td>
                <td className="px-3 py-2">
                  {r.fixed
                    ? <span className="text-hig-subhead">{r.description}</span>
                    : <input value={r.description} onChange={e => onUpdate(r.id, { description: e.target.value })} className="hig-input py-1" placeholder="Description" />
                  }
                </td>
                <td className="px-3 py-2">
                  {r.fixed
                    ? <span className="text-hig-caption1 text-hig-text-secondary">{r.frequency}</span>
                    : (
                      <select value={r.frequency} onChange={e => onUpdate(r.id, { frequency: e.target.value })} className="hig-input text-hig-caption1 py-1">
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    )
                  }
                </td>
                <td className="px-4 py-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                    <input
                      type="number" min="0" step="100"
                      value={r.amount || ''}
                      onChange={e => onUpdate(r.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="hig-input text-right py-1 pl-8 tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-hig-caption1 text-hig-text-secondary tabular-nums">
                  {formatRMFull(toMonthly(r.amount, r.frequency))}
                </td>
                <td className="px-2 py-2 text-center">
                  {!r.fixed && (
                    <button onClick={() => onRemove(r.id)} className="text-hig-text-secondary hover:text-hig-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-hig-gray-5 bg-hig-gray-6">
              <td colSpan={4} className="px-4 py-2.5 text-hig-subhead font-semibold">Monthly Total</td>
              <td className="px-3 py-2.5 text-right text-hig-subhead font-semibold text-hig-green tabular-nums">{formatRMFull(totalMonthly)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {grossRow && Number(grossRow.amount) > 0 && (
        <div className="bg-hig-blue/5 border border-hig-blue/20 rounded-hig-sm p-3 flex items-start gap-2">
          <Info size={13} className="text-hig-blue mt-0.5 shrink-0" />
          <p className="text-hig-caption1 text-hig-blue">
            EPF employee (11%): {formatRMFull(Number(grossRow.amount) * 0.11)}/mth
            · Employer: {Number(grossRow.amount) > 5000 ? '12%' : '13%'} based on salary threshold
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
function ExpTab({ rows, currentAge, onUpdate, onAdd, onRemove }) {
  const totalMonthly = rows.reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-hig-headline">Expenses</h3>
          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">Monthly equivalent: {formatRMFull(totalMonthly)}/mth</p>
        </div>
        <button onClick={onAdd} className="hig-btn-primary gap-1.5">
          <Plus size={14} /> Add Expense
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="hig-card p-8 text-center">
          <p className="text-hig-subhead text-hig-text-secondary mb-3">No expenses recorded.</p>
          <button onClick={onAdd} className="hig-btn-primary">Add Expense</button>
        </div>
      ) : (
        <div className="hig-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hig-gray-5 bg-hig-gray-6">
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-40">Type</th>
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold">Description</th>
                <th className="text-center px-2 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-20">Age From</th>
                <th className="text-center px-2 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-20">Age To</th>
                <th className="text-left px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-32">Frequency</th>
                <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-36">Amount (RM)</th>
                <th className="text-right px-3 py-2.5 text-hig-caption1 text-hig-text-secondary font-semibold w-28">Monthly Eq.</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-hig-gray-5 last:border-b-0">
                  <td className="px-3 py-2">
                    <select value={r.type} onChange={e => onUpdate(r.id, { type: e.target.value })} className="hig-input text-hig-caption1 py-1">
                      {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={r.description} onChange={e => onUpdate(r.id, { description: e.target.value })} className="hig-input py-1" placeholder="Description" />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={18} max={100}
                      value={r.ageFrom ?? currentAge}
                      onChange={e => onUpdate(r.id, { ageFrom: parseInt(e.target.value) || currentAge })}
                      className="hig-input text-center py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min={18} max={120}
                      value={r.ageTo ?? 55}
                      onChange={e => onUpdate(r.id, { ageTo: parseInt(e.target.value) || 55 })}
                      className="hig-input text-center py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select value={r.frequency} onChange={e => onUpdate(r.id, { frequency: e.target.value })} className="hig-input text-hig-caption1 py-1">
                      {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-hig-caption1 text-hig-text-secondary">RM</span>
                      <input
                        type="number" min="0" step="100"
                        value={r.amount || ''}
                        onChange={e => onUpdate(r.id, { amount: parseFloat(e.target.value) || 0 })}
                        className="hig-input text-right py-1 pl-8 tabular-nums"
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-hig-caption1 text-hig-text-secondary tabular-nums">
                    {formatRMFull(toMonthly(r.amount, r.frequency))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => onRemove(r.id)} className="text-hig-text-secondary hover:text-hig-red transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-hig-gray-5 bg-hig-gray-6">
                <td colSpan={6} className="px-3 py-2.5 text-hig-subhead font-semibold">Monthly Total</td>
                <td className="px-3 py-2.5 text-right text-hig-subhead font-semibold text-hig-red tabular-nums">{formatRMFull(totalMonthly)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Liability Modal ──────────────────────────────────────────────────────────
function LiabilityModal({ initial, currentAge, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial })
  const monthly = calcMonthlyRepayment(form.principal, form.interestRate, form.loanPeriod)

  const set = (key) => (e) => {
    const val = key === 'type' || key === 'description'
      ? e.target.value
      : parseFloat(e.target.value) || 0
    setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-hig-title3">{form.id ? 'Edit Liability' : 'New Liability'}</h2>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hig-label">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="hig-input">
                {LIABILITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="hig-label">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="hig-input" placeholder="e.g. Maybank Home Loan" />
            </div>
          </div>
          <div>
            <label className="hig-label">Outstanding Principal (RM)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
              <input type="number" min="0" step="1000" value={form.principal || ''} onChange={set('principal')} className="hig-input pl-10" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="hig-label">Start Age</label>
              <input type="number" min={18} max={90} value={form.startAge || currentAge} onChange={set('startAge')} className="hig-input" />
            </div>
            <div>
              <label className="hig-label">Interest (% p.a.)</label>
              <input type="number" step="0.1" min="0" max="30" value={form.interestRate || 0} onChange={set('interestRate')} className="hig-input" />
            </div>
            <div>
              <label className="hig-label">Period (months)</label>
              <input type="number" min="1" max="600" step="12" value={form.loanPeriod || 360} onChange={set('loanPeriod')} className="hig-input" />
            </div>
          </div>
          {Number(form.principal) > 0 && (
            <div className="bg-hig-red/5 border border-hig-red/20 rounded-hig-sm p-3">
              <p className="text-hig-caption1 text-hig-red font-medium">
                Est. Monthly Repayment: {formatRMFull(monthly)}
              </p>
              <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
                This will be reflected in Cash Flow analysis.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-hig-gray-5">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={() => onSave(form)} className="hig-btn-primary">
            {form.id ? 'Save Changes' : 'Add Liability'}
          </button>
        </div>
      </div>
    </div>
  )
}
