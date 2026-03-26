import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, X, ChevronRight, Info, Pencil, Upload } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── Type constants ───────────────────────────────────────────────────────────
const ASSET_DYNAMIC_TYPES = ['Property', 'Automobile', 'Others']

// Core investment types (always shown first)
const INVESTMENT_TYPES_CORE     = ['Exchange Traded Funds (ETF)', 'Stocks & Shares', 'Unit Trusts', 'Bonds']
// Optional investment types
const INVESTMENT_TYPES_OPTIONAL = ['Fixed Deposits', 'Foreign Exchange', 'Money Market', 'Cryptocurrency', 'Others']
const INVESTMENT_TYPES          = [...INVESTMENT_TYPES_CORE, ...INVESTMENT_TYPES_OPTIONAL]

// Realistic annual return defaults per investment type
const INVESTMENT_DEFAULT_RETURN = {
  'Exchange Traded Funds (ETF)': 7.5,
  'Stocks & Shares':             8.0,
  'Unit Trusts':                 6.5,
  'Bonds':                       4.0,
  'Fixed Deposits':              3.7,
  'Foreign Exchange':            3.0,
  'Money Market':                3.5,
  'Cryptocurrency':             15.0,
  'Others':                      5.0,
}
const PAYMENT_MODES       = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'Lump Sum']
const LIABILITY_TYPES     = ['Home Loan', 'Car Loan', 'Study Loan', 'Personal Loan', 'Credit Card', 'Business Loan', 'Other']
const INCOME_DYNAMIC_TYPES= ['Rental', 'Business', 'Dividends', 'Insurance Payout', 'Other Income']

// Core expense types (default grouping)
const EXPENSE_TYPES_CORE     = ['All - Personal', 'All - Transport', 'All - Household', 'All - Dependents', 'All - Miscellaneous', 'Vacation/Travel']
// Optional / specific expense types
const EXPENSE_TYPES_OPTIONAL = ['Dependent Allowances', 'Parent Allowance', 'Medical Cost', 'Rental Expenses', 'Others']
const EXPENSE_TYPES          = [...EXPENSE_TYPES_CORE, ...EXPENSE_TYPES_OPTIONAL]
const FREQUENCIES = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'One-Time']

const TABS = [
  { key: 'assets',      label: 'Assets'      },
  { key: 'investments', label: 'Investments' },
  { key: 'liabilities', label: 'Liabilities' },
  { key: 'income',      label: 'Income'      },
  { key: 'expenses',    label: 'Expenses'    },
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

// ─── Default data helpers ─────────────────────────────────────────────────────
function getDefaultFixedAssets() {
  return [
    { id: 'savings-cash', fixed: true, type: 'Savings Cash',       description: 'Savings (Cash)',        growthRate: 0.25, amount: 0 },
    { id: 'epf-all',      fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance',  growthRate: 5.2,  amount: 0 },
    { id: 'property',     fixed: true, type: 'Property',           description: 'Property',              growthRate: 3.0,  amount: 0 },
    { id: 'automobile',   fixed: true, type: 'Automobile',         description: 'Automobile',            growthRate: -5.0, amount: 0 },
  ]
}

// Migrate existing data that still has 3 separate EPF rows → single epf-all row
function migrateEpfRows(assets) {
  const OLD_EPF = ['epf-persaraan', 'epf-sejahtera', 'epf-fleksibel']
  const hasOld = assets.some(a => OLD_EPF.includes(a.id))
  const hasNew = assets.some(a => a.id === 'epf-all')
  if (!hasOld || hasNew) return assets
  const epfTotal = assets.filter(a => OLD_EPF.includes(a.id)).reduce((s, a) => s + (Number(a.amount) || 0), 0)
  const rest = assets.filter(a => !OLD_EPF.includes(a.id))
  const insertAt = rest.findIndex(a => a.id === 'savings-cash')
  const newRow = { id: 'epf-all', fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance', growthRate: 5.2, amount: epfTotal }
  if (insertAt >= 0) { rest.splice(insertAt + 1, 0, newRow); return rest }
  return [newRow, ...rest]
}

function getDefaultFixedIncome() {
  return [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: 0, epfApplicable: true },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: 0, epfApplicable: true },
  ]
}

function getDefaultFixedInvestments(currentAge = 30) {
  return [
    { id: 'inv-etf',    fixed: true, type: 'Exchange Traded Funds (ETF)', description: 'Wahed, Stashaway, Maybank ETF, Bursa ETFs', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 7.5, currentValue: 0 },
    { id: 'inv-stocks', fixed: true, type: 'Stocks & Shares',             description: 'Bursa-listed equities, blue chips, growth stocks', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 8.0, currentValue: 0 },
    { id: 'inv-ut',     fixed: true, type: 'Unit Trusts',                  description: 'Public Mutual, Principal, Eastspring, KAF',        planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 6.5, currentValue: 0 },
    { id: 'inv-bonds',  fixed: true, type: 'Bonds',                        description: 'ASNB, Sukuk, fixed income instruments',             planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: 4.0, currentValue: 0 },
  ]
}

function getDefaultFixedLiabilities(currentAge = 30) {
  return [
    { id: 'liab-home', fixed: true, type: 'Home Loan', description: 'Home Loan', principal: 0, startAge: currentAge, interestRate: 4.5, loanPeriod: 360 },
    { id: 'liab-car',  fixed: true, type: 'Car Loan',  description: 'Car Loan',  principal: 0, startAge: currentAge, interestRate: 3.0, loanPeriod: 84  },
  ]
}

function getDefaultFixedExpenses(currentAge = 30) {
  return [
    { id: 'exp-personal',      fixed: true, type: 'All - Personal',      description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-transport',     fixed: true, type: 'All - Transport',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-household',     fixed: true, type: 'All - Household',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-dependents',    fixed: true, type: 'All - Dependents',    description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-miscellaneous', fixed: true, type: 'All - Miscellaneous', description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
    { id: 'exp-vacation',      fixed: true, type: 'Vacation/Travel',     description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Yearly',  amount: 0, inflationLinked: true },
  ]
}

function normalizeFinancials(fin, currentAge = 30) {
  if (!fin) {
    return {
      assets:      getDefaultFixedAssets(),
      investments: getDefaultFixedInvestments(currentAge),
      liabilities: getDefaultFixedLiabilities(currentAge),
      income:      getDefaultFixedIncome(),
      expenses:    getDefaultFixedExpenses(currentAge),
      insurance:   [],
    }
  }
  if (Array.isArray(fin.assets)) {
    const ensureFixed = (rows, defaults) =>
      rows.some(r => r.fixed) ? rows : [...defaults, ...rows]
    const income = Array.isArray(fin.income) ? fin.income : getDefaultFixedIncome()
    const migratedAssets = migrateEpfRows(fin.assets)
    return {
      assets:      ensureFixed(migratedAssets, getDefaultFixedAssets()),
      investments: ensureFixed(fin.investments || [], getDefaultFixedInvestments(currentAge)),
      liabilities: ensureFixed(fin.liabilities || [], getDefaultFixedLiabilities(currentAge)),
      income:      ensureFixed(income, getDefaultFixedIncome()),
      expenses:    ensureFixed(fin.expenses || [], getDefaultFixedExpenses(currentAge)),
      insurance:   fin.insurance || [],
    }
  }
  // Migrate legacy object format
  const oldA = fin.assets || {}, oldL = fin.liabilities || {}, oldI = fin.income || {}, oldE = fin.expenses || {}
  const assets = [
    { id: 'savings-cash', fixed: true, type: 'Savings Cash',       description: 'Savings (Cash)',       growthRate: 0.25, amount: Number(oldA.savings) || 0 },
    { id: 'epf-all',      fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance', growthRate: 5.2,  amount: (Number(oldA.epfPersaraan) || 0) + (Number(oldA.epfSejahtera) || 0) + (Number(oldA.epfFleksibel) || 0) },
    { id: 'property',     fixed: true, type: 'Property',           description: 'Property',             growthRate: 3.0,  amount: 0 },
    { id: 'automobile',   fixed: true, type: 'Automobile',         description: 'Automobile',           growthRate: -5.0, amount: 0 },
    ...(Number(oldA.unitTrusts)      > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Unit Trusts',      growthRate: 6, amount: Number(oldA.unitTrusts)      }] : []),
    ...(Number(oldA.otherInvestment) > 0 ? [{ id: uid(), fixed: false, type: 'Others', description: 'Other Investment', growthRate: 5, amount: Number(oldA.otherInvestment) }] : []),
  ]
  const liabilities = [
    { id: 'liab-home', fixed: true, type: 'Home Loan', description: 'Home Loan', principal: Number(oldL.homeLoan)  || 0, startAge: currentAge - 5, interestRate: 4.5, loanPeriod: 360 },
    { id: 'liab-car',  fixed: true, type: 'Car Loan',  description: 'Car Loan',  principal: Number(oldL.carLoan)   || 0, startAge: currentAge - 2, interestRate: 3.0, loanPeriod: 84  },
    ...(Number(oldL.studyLoan) > 0 ? [{ id: uid(), type: 'Study Loan',    description: 'PTPTN',     principal: Number(oldL.studyLoan), startAge: currentAge - 5, interestRate: 1.0, loanPeriod: 120 }] : []),
    ...(Number(oldL.otherLoan) > 0 ? [{ id: uid(), type: 'Personal Loan', description: 'Other',     principal: Number(oldL.otherLoan), startAge: currentAge,     interestRate: 5.0, loanPeriod: 60  }] : []),
  ]
  const income = [
    { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: Number(oldI.grossIncome) || 0, epfApplicable: true },
    { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: Number(oldI.bonus)       || 0, epfApplicable: true },
  ]
  const expMap = [
    { key: 'household',           type: 'All - Household',     desc: 'Household'          },
    { key: 'personal',            type: 'All - Personal',      desc: 'Personal'           },
    { key: 'petrol',              type: 'All - Transport',     desc: 'Petrol'             },
    { key: 'carLoanRepayment',    type: 'All - Transport',     desc: 'Car Loan Repayment' },
    { key: 'loanRepayment',       type: 'All - Miscellaneous', desc: 'Loan Repayment'     },
    { key: 'carInsurance',        type: 'All - Transport',     desc: 'Car Insurance'      },
    { key: 'roadTax',             type: 'All - Transport',     desc: 'Road Tax'           },
    { key: 'incomeTax',           type: 'All - Miscellaneous', desc: 'Income Tax'         },
    { key: 'insuranceProtection', type: 'All - Miscellaneous', desc: 'Insurance Premium'  },
  ]
  // Seed fixed expense rows; overlay old legacy amounts where type matches
  const legacyAmounts = {}
  expMap.filter(m => Number(oldE[m.key]) > 0).forEach(m => {
    legacyAmounts[m.type] = (legacyAmounts[m.type] || 0) + Number(oldE[m.key])
  })
  const fixedExpenses = getDefaultFixedExpenses(currentAge).map(r => ({
    ...r,
    amount: legacyAmounts[r.type] || 0,
  }))
  // Any legacy types not covered by fixed rows become dynamic rows
  const coveredTypes = new Set(fixedExpenses.map(r => r.type))
  const extraExpenses = expMap
    .filter(m => Number(oldE[m.key]) > 0 && !coveredTypes.has(m.type))
    .map(m => ({ id: uid(), type: m.type, description: m.desc, ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: Number(oldE[m.key]) }))
  const expenses = [...fixedExpenses, ...extraExpenses]
  return { assets, investments: fin.investments || [], liabilities, income, expenses, insurance: fin.insurance || [] }
}

function computeSummary(data) {
  const totalAssets      = (data.assets      || []).reduce((s, r) => s + (Number(r.amount)       || 0), 0)
  const totalInvestments = (data.investments || []).reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
  const totalLiabilities = (data.liabilities || []).reduce((s, r) => s + (Number(r.principal)    || 0), 0)
  const monthlyIncome    = (data.income      || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const monthlyExpenses  = (data.expenses    || []).reduce((s, r) => s + toMonthly(r.amount, r.frequency), 0)
  const grossRow         = (data.income      || []).find(r => r.id === 'gross-income')
  const grossEpfOn       = grossRow?.epfApplicable !== false
  const epfContribution  = grossEpfOn ? (Number(grossRow?.amount) || 0) * 0.11 : 0
  return {
    totalAssets, totalInvestments, totalLiabilities,
    netWorth:        totalAssets + totalInvestments - totalLiabilities,
    monthlyIncome, monthlyExpenses,
    monthlyCashFlow: monthlyIncome - monthlyExpenses,
    epfContribution,
  }
}

// ─── Shared Modal Shell ───────────────────────────────────────────────────────
function ModalShell({ title, onClose, onSave, saveLabel = 'Save', children }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-hig-title3">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-hig-gray-5">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={onSave} className="hig-btn-primary">{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

function RMField({ label, value, onChange, placeholder = '0' }) {
  return (
    <div>
      <label className="hig-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
        <input
          type="number" min="0" step="100"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="hig-input pl-10 tabular-nums"
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

// ─── Section Modal Forms ──────────────────────────────────────────────────────

function AssetModal({ row, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'Property', description: '', growthRate: 5, amount: 0,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <ModalShell
      title={isNew ? 'Add Asset' : 'Edit Asset'}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={isNew ? 'Add Asset' : 'Save Changes'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            {ASSET_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="hig-label">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} className="hig-input" placeholder="e.g. Taman Desa House" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Growth Rate (% p.a.)</label>
          <input type="number" step="0.5" min="0" value={form.growthRate} onChange={e => set('growthRate', parseFloat(e.target.value) || 0)} className="hig-input" />
        </div>
        <RMField label="Current Value (RM)" value={form.amount} onChange={v => set('amount', v)} />
      </div>
    </ModalShell>
  )
}

function InvModal({ row, currentAge, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'Exchange Traded Funds (ETF)', planName: '', paymentMode: 'Monthly',
    ageFrom: currentAge, ageTo: 99,
    growthRate: INVESTMENT_DEFAULT_RETURN['Exchange Traded Funds (ETF)'],
    currentValue: 0,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeChange = (newType) => {
    const defaultRate = INVESTMENT_DEFAULT_RETURN[newType] ?? 5.0
    // Only auto-fill rate if this is a new entry, or if the current rate matches a known default (user hasn't customised it)
    const currentRateIsDefault = Object.values(INVESTMENT_DEFAULT_RETURN).includes(form.growthRate)
    setForm(f => ({
      ...f,
      type: newType,
      growthRate: (isNew || currentRateIsDefault) ? defaultRate : f.growthRate,
    }))
  }

  return (
    <ModalShell
      title={isNew ? 'Add Investment' : 'Edit Investment'}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={isNew ? 'Add Investment' : 'Save Changes'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Type</label>
          <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className="hig-input">
            <optgroup label="Core">
              {INVESTMENT_TYPES_CORE.map(t => <option key={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Others">
              {INVESTMENT_TYPES_OPTIONAL.map(t => <option key={t}>{t}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="hig-label">Description</label>
          <input value={form.planName || ''} onChange={e => set('planName', e.target.value)} className="hig-input" placeholder="e.g. fund name, provider" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="hig-label">Payment Mode</label>
          <select value={form.paymentMode || 'Monthly'} onChange={e => set('paymentMode', e.target.value)} className="hig-input">
            {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="hig-label">Age From</label>
          <input type="number" min={18} max={100} value={form.ageFrom ?? currentAge} onChange={e => set('ageFrom', parseInt(e.target.value) || currentAge)} className="hig-input" />
        </div>
        <div>
          <label className="hig-label">Age To</label>
          <input type="number" min={18} max={120} value={form.ageTo ?? 99} onChange={e => set('ageTo', parseInt(e.target.value) || 99)} className="hig-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Expected Return (% p.a.)</label>
          <input type="number" step="0.1" min="0" value={form.growthRate ?? 0} onChange={e => set('growthRate', parseFloat(e.target.value) || 0)} className="hig-input" />
        </div>
        <RMField label="Current Value (RM)" value={form.currentValue} onChange={v => set('currentValue', v)} />
      </div>
    </ModalShell>
  )
}

function IncomeModal({ row, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'Rental', description: '', frequency: 'Monthly', amount: 0,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <ModalShell
      title={isNew ? 'Add Income' : 'Edit Income'}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={isNew ? 'Add Income' : 'Save Changes'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            {INCOME_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="hig-label">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} className="hig-input" placeholder="e.g. Taman Desa Rental" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Frequency</label>
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="hig-input">
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <RMField label="Amount (RM)" value={form.amount} onChange={v => set('amount', v)} />
      </div>
    </ModalShell>
  )
}

function ExpenseModal({ row, currentAge, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'All - Personal', description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0,
    inflationLinked: true,   // default: expenses rise with inflation
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <ModalShell
      title={isNew ? 'Add Expense' : 'Edit Expense'}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={isNew ? 'Add Expense' : 'Save Changes'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            <optgroup label="Default">
              {EXPENSE_TYPES_CORE.map(t => <option key={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Others">
              {EXPENSE_TYPES_OPTIONAL.map(t => <option key={t}>{t}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <label className="hig-label">Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} className="hig-input" placeholder="e.g. Grocery, Petrol" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Age From</label>
          <input type="number" min={18} max={100} value={form.ageFrom ?? currentAge} onChange={e => set('ageFrom', parseInt(e.target.value) || currentAge)} className="hig-input" />
        </div>
        <div>
          <label className="hig-label">Age To</label>
          <input type="number" min={18} max={120} value={form.ageTo ?? 99} onChange={e => set('ageTo', parseInt(e.target.value) || 99)} className="hig-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="hig-label">Frequency</label>
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="hig-input">
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <RMField label="Amount (RM)" value={form.amount} onChange={v => set('amount', v)} />
      </div>

      {/* ── Inflation toggle ── */}
      <div
        className={`flex items-center justify-between rounded-hig-sm px-3 py-2.5 cursor-pointer select-none border transition-colors
          ${form.inflationLinked
            ? 'bg-orange-50 border-orange-200'
            : 'bg-hig-gray-6 border-hig-gray-5'
          }`}
        onClick={() => set('inflationLinked', !form.inflationLinked)}
      >
        <div>
          <p className={`text-hig-caption1 font-semibold ${form.inflationLinked ? 'text-orange-700' : 'text-hig-text-secondary'}`}>
            {form.inflationLinked ? 'Inflation-linked' : 'Fixed nominal (no inflation)'}
          </p>
          <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
            {form.inflationLinked
              ? 'Amount grows each year with the inflation rate.'
              : 'Amount stays fixed — suitable for loan repayments, fixed contracts.'}
          </p>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 relative ml-3 shrink-0
          ${form.inflationLinked ? 'bg-orange-400' : 'bg-hig-gray-3'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${form.inflationLinked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
        </div>
      </div>
    </ModalShell>
  )
}

function LiabilityModal({ initial, currentAge, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial })
  const monthly = calcMonthlyRepayment(form.principal, form.interestRate, form.loanPeriod)
  const set = (key) => (e) => {
    const val = (key === 'type' || key === 'description') ? e.target.value : (parseFloat(e.target.value) || 0)
    setForm(f => ({ ...f, [key]: val }))
  }
  return (
    <ModalShell
      title={form.id ? 'Edit Liability' : 'New Liability'}
      onClose={onClose}
      onSave={() => onSave(form)}
      saveLabel={form.id ? 'Save Changes' : 'Add Liability'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
    </ModalShell>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FinancialInfo({ financials, onSave, currentAge = 30 }) {
  const [activeTab, setActiveTab] = useState('assets')
  const [modal, setModal] = useState(null) // { section, row } | null
  const [showImport, setShowImport] = useState(false)
  const [data, setData] = useState(() => normalizeFinancials(financials, currentAge))

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

  const removeRow = (section, id) =>
    saveSection(section, data[section].filter(r => r.id !== id))

  const handleModalSave = (section, form) => {
    if (form.id) {
      updateRow(section, form.id, form)
    } else {
      saveSection(section, [...(data[section] || []), { ...form, id: uid() }])
    }
    setModal(null)
  }

  const openAdd = (section, defaults) => setModal({ section, row: defaults })
  const openEdit = (section, row) => setModal({ section, row: { ...row } })

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-hig-gray-6 rounded-hig-sm w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-all
              ${activeTab === t.key ? 'bg-white text-hig-text shadow-hig' : 'text-hig-text-secondary hover:text-hig-text'}`}
          >{t.label}</button>
        ))}
      </div>

      {activeTab === 'assets' && (
        <AssetsTab
          rows={data.assets}
          onUpdateFixed={(id, u) => updateRow('assets', id, u)}
          onEdit={(row) => openEdit('assets', row)}
          onRemove={(id) => removeRow('assets', id)}
          onAdd={() => openAdd('assets', { type: 'Property', description: '', growthRate: 5, amount: 0 })}
        />
      )}

      {activeTab === 'investments' && (
        <InvTab
          rows={data.investments}
          currentAge={currentAge}
          onUpdateFixed={(id, u) => updateRow('investments', id, u)}
          onEdit={(row) => openEdit('investments', row)}
          onRemove={(id) => removeRow('investments', id)}
          onAdd={() => openAdd('investments', { type: 'Exchange Traded Funds (ETF)', planName: '', paymentMode: 'Monthly', ageFrom: currentAge, ageTo: 99, growthRate: INVESTMENT_DEFAULT_RETURN['Exchange Traded Funds (ETF)'], currentValue: 0 })}
        />
      )}

      {activeTab === 'liabilities' && (
        <LiabTab
          rows={data.liabilities}
          onUpdateFixed={(id, u) => updateRow('liabilities', id, u)}
          onAdd={() => setModal({ section: 'liabilities', row: { type: 'Home Loan', description: '', principal: 0, startAge: currentAge, interestRate: 4.5, loanPeriod: 360 } })}
          onEdit={(row) => setModal({ section: 'liabilities', row: { ...row } })}
          onRemove={(id) => removeRow('liabilities', id)}
        />
      )}

      {activeTab === 'income' && (
        <IncomeTab
          rows={data.income}
          onUpdateFixed={(id, u) => updateRow('income', id, u)}
          onEdit={(row) => openEdit('income', row)}
          onRemove={(id) => removeRow('income', id)}
          onAdd={() => openAdd('income', { type: 'Rental', description: '', frequency: 'Monthly', amount: 0 })}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpTab
          rows={data.expenses}
          currentAge={currentAge}
          onUpdateFixed={(id, u) => updateRow('expenses', id, u)}
          onEdit={(row) => openEdit('expenses', row)}
          onRemove={(id) => removeRow('expenses', id)}
          onAdd={() => openAdd('expenses', { type: 'All - Personal', description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true })}
        />
      )}

      {/* Section modals */}
      {modal?.section === 'assets' && (
        <AssetModal row={modal.row} onSave={(f) => handleModalSave('assets', f)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'investments' && (
        <InvModal row={modal.row} currentAge={currentAge} onSave={(f) => handleModalSave('investments', f)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'income' && (
        <IncomeModal row={modal.row} onSave={(f) => handleModalSave('income', f)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'expenses' && (
        <ExpenseModal row={modal.row} currentAge={currentAge} onSave={(f) => handleModalSave('expenses', f)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'liabilities' && (
        <LiabilityModal
          initial={modal.row}
          currentAge={currentAge}
          onSave={(liab) => handleModalSave('liabilities', liab)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Quick Import modal */}
      {showImport && (
        <QuickImportModal
          data={data}
          onSave={(updated) => { setData(updated); onSave(updated) }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}

// ─── Quick Import Modal ───────────────────────────────────────────────────────
// Mirrors the InsuranceTab "Add Policy" pattern — fixed overlay form for bulk entry
function QuickImportModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({
    grossIncome:   (data.income || []).find(r => r.id === 'gross-income')?.amount || 0,
    bonus:         (data.income || []).find(r => r.id === 'bonus')?.amount || 0,
    savingsCash:   (data.assets || []).find(r => r.id === 'savings-cash')?.amount || 0,
    epfAll:        (data.assets || []).find(r => r.id === 'epf-all')?.amount || 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    const updatedIncome = (data.income || []).map(r => {
      if (r.id === 'gross-income') return { ...r, amount: Number(form.grossIncome) || 0 }
      if (r.id === 'bonus')        return { ...r, amount: Number(form.bonus)       || 0 }
      return r
    })
    const updatedAssets = (data.assets || []).map(r => {
      if (r.id === 'savings-cash') return { ...r, amount: Number(form.savingsCash) || 0 }
      if (r.id === 'epf-all')      return { ...r, amount: Number(form.epfAll)      || 0 }
      return r
    })
    onSave({ ...data, income: updatedIncome, assets: updatedAssets })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-hig-title3">Import Financial Data</h2>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
        </div>

        {/* Income */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Employment Income</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RMField label="Gross Monthly Income" value={form.grossIncome} onChange={v => set('grossIncome', v)} />
            <RMField label="Annual Bonus" value={form.bonus} onChange={v => set('bonus', v)} />
          </div>
          {Number(form.grossIncome) > 0 && (
            <p className="text-hig-caption1 text-hig-text-secondary mt-2 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0 text-hig-blue" />
              EPF: Employee {formatRMFull(Number(form.grossIncome) * 0.11)}/mth (11%) ·
              Employer {Number(form.grossIncome) > 5000 ? '12%' : '13%'}
            </p>
          )}
        </div>

        {/* Assets */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Savings & EPF Balances</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RMField label="Savings / Cash"       value={form.savingsCash} onChange={v => set('savingsCash', v)} />
            <RMField label="EPF (All Accounts)"   value={form.epfAll}      onChange={v => set('epfAll', v)} />
          </div>
        </div>

        <p className="text-hig-caption1 text-hig-text-secondary mb-5 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Investments, liabilities, and additional income / expense items can be added in the respective tabs.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-hig-gray-5">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={handleSave} className="hig-btn-primary gap-1.5">
            <Upload size={14} /> Save Financial Data
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ summary, onNavigate, onImport }) {
  const cats = [
    { key: 'assets',      label: 'Assets',          value: summary.totalAssets,      negative: false },
    { key: 'investments', label: 'Investments',      value: summary.totalInvestments, negative: false },
    { key: 'liabilities', label: 'Liabilities',      value: summary.totalLiabilities, negative: true  },
    { key: 'income',      label: 'Monthly Income',   value: summary.monthlyIncome,    negative: false },
    { key: 'expenses',    label: 'Monthly Expenses', value: summary.monthlyExpenses,  negative: true  },
  ]
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
function AssetsTab({ rows, onUpdateFixed, onEdit, onRemove, onAdd }) {
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
function InvTab({ rows, currentAge, onUpdateFixed, onEdit, onRemove, onAdd }) {
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
function LiabTab({ rows, onUpdateFixed, onAdd, onEdit, onRemove }) {
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
function IncomeTab({ rows, onUpdateFixed, onEdit, onRemove, onAdd }) {
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
function ExpTab({ rows, currentAge, onUpdateFixed, onEdit, onRemove, onAdd }) {
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
