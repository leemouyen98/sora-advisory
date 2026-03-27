import { useMemo, useState } from 'react'
import { X, Info, Upload, AlertTriangle } from 'lucide-react'
import { formatRMFull } from '../../../lib/calculations'
import NumberInput from '../../ui/NumberInput'
import {
  ASSET_DYNAMIC_TYPES,
  INVESTMENT_DEFAULT_RETURN,
  INVESTMENT_TYPES_CORE,
  INVESTMENT_TYPES_OPTIONAL,
  PAYMENT_MODES,
  INCOME_DYNAMIC_TYPES,
  EXPENSE_TYPES_CORE,
  EXPENSE_TYPES_OPTIONAL,
  FREQUENCIES,
  LIABILITY_TYPES,
} from './constants'
import { calcMonthlyRepayment } from './helpers'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clampMinZero(value) {
  return Math.max(0, toNumber(value))
}

function cleanText(value) {
  return String(value || '').trim()
}

function Field({ label, hint, error, children, required = false }) {
  return (
    <div>
      <label className="hig-label">
        {label}
        {required && <span className="text-hig-red ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-hig-caption2 text-hig-red mt-1">{error}</p>
      ) : hint ? (
        <p className="text-hig-caption2 text-hig-text-secondary mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

function ValidationBanner({ errors }) {
  if (!errors.length) return null
  return (
    <div className="flex items-start gap-2 rounded-hig-sm border border-hig-red/20 bg-hig-red/5 px-3 py-2.5">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-hig-red" />
      <div>
        <p className="text-hig-caption1 font-medium text-hig-red">Please fix the highlighted fields.</p>
        <ul className="mt-1 space-y-0.5 text-hig-caption2 text-hig-text-secondary list-disc list-inside">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      </div>
    </div>
  )
}

function ModalShell({ title, onClose, onSave, saveLabel = 'Save', children, errors = [], saveDisabled = false }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-2xl p-6 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-hig-title3">{title}</h2>
            <p className="text-hig-caption1 text-hig-text-secondary mt-1">Enter realistic values. These feed directly into planning outputs.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <ValidationBanner errors={errors} />
          {children}
        </div>
        <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-hig-gray-5 sticky bottom-0 bg-white">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={saveDisabled} className={`hig-btn-primary ${saveDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

function RMField({ label, value, onChange, placeholder = '0', hint, error, required = false }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
        <NumberInput
          value={value}
          onChange={onChange}
          className={`hig-input pl-10 tabular-nums ${error ? 'border-hig-red focus:border-hig-red' : ''}`}
          placeholder={placeholder}
        />
      </div>
    </Field>
  )
}

function saveIfValid(errors, onSave, payload) {
  if (Object.keys(errors).length) return
  onSave(payload)
}

export function AssetModal({ row, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'Property', description: '', growthRate: 5, amount: 0,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const next = {}
    if (!cleanText(form.description)) next.description = 'Add a short label so this asset is identifiable later.'
    if (clampMinZero(form.amount) <= 0) next.amount = 'Current value must be more than RM 0.'
    if (toNumber(form.growthRate) < -20 || toNumber(form.growthRate) > 30) next.growthRate = 'Use a realistic annual growth rate between -20% and 30%.'
    return next
  }, [form])

  return (
    <ModalShell
      title={isNew ? 'Add Asset' : 'Edit Asset'}
      onClose={onClose}
      onSave={() => saveIfValid(errors, onSave, { ...form, description: cleanText(form.description), amount: clampMinZero(form.amount), growthRate: toNumber(form.growthRate) })}
      saveLabel={isNew ? 'Add Asset' : 'Save Changes'}
      errors={Object.values(errors)}
      saveDisabled={Object.keys(errors).length > 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            {ASSET_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Description" error={errors.description} hint="Use the bank, property, or account name.">
          <input value={form.description} onChange={e => set('description', e.target.value)} className={`hig-input ${errors.description ? 'border-hig-red focus:border-hig-red' : ''}`} placeholder="e.g. Taman Desa House" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Growth Rate (% p.a.)" error={errors.growthRate} hint="Use a reasonable long-term estimate, not a best-case guess.">
          <input type="number" step="0.5" min="-20" max="30" value={form.growthRate} onChange={e => set('growthRate', parseFloat(e.target.value) || 0)} className={`hig-input ${errors.growthRate ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <RMField label="Current Value" value={form.amount} onChange={v => set('amount', v)} error={errors.amount} required hint="Enter the amount you can reasonably liquidate or transfer today." />
      </div>
    </ModalShell>
  )
}

export function InvModal({ row, currentAge, onSave, onClose }) {
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
    const currentRateIsDefault = Object.values(INVESTMENT_DEFAULT_RETURN).includes(form.growthRate)
    setForm(f => ({
      ...f,
      type: newType,
      growthRate: (isNew || currentRateIsDefault) ? defaultRate : f.growthRate,
    }))
  }

  const errors = useMemo(() => {
    const next = {}
    if (!cleanText(form.planName)) next.planName = 'Add the fund, platform, or account name.'
    if (clampMinZero(form.currentValue) <= 0) next.currentValue = 'Current value must be more than RM 0.'
    if (toNumber(form.ageFrom) < 18 || toNumber(form.ageFrom) > 100) next.ageFrom = 'Age From must be between 18 and 100.'
    if (toNumber(form.ageTo) < 18 || toNumber(form.ageTo) > 120) next.ageTo = 'Age To must be between 18 and 120.'
    if (toNumber(form.ageTo) < toNumber(form.ageFrom)) next.ageTo = 'Age To must be the same as or later than Age From.'
    if (toNumber(form.growthRate) < -20 || toNumber(form.growthRate) > 25) next.growthRate = 'Use a realistic expected return between -20% and 25%.'
    return next
  }, [form])

  return (
    <ModalShell
      title={isNew ? 'Add Investment' : 'Edit Investment'}
      onClose={onClose}
      onSave={() => saveIfValid(errors, onSave, { ...form, planName: cleanText(form.planName), currentValue: clampMinZero(form.currentValue), growthRate: toNumber(form.growthRate), ageFrom: toNumber(form.ageFrom), ageTo: toNumber(form.ageTo) })}
      saveLabel={isNew ? 'Add Investment' : 'Save Changes'}
      errors={Object.values(errors)}
      saveDisabled={Object.keys(errors).length > 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className="hig-input">
            <optgroup label="Core">
              {INVESTMENT_TYPES_CORE.map(t => <option key={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Others">
              {INVESTMENT_TYPES_OPTIONAL.map(t => <option key={t}>{t}</option>)}
            </optgroup>
          </select>
        </Field>
        <Field label="Description" error={errors.planName} hint="State the provider, fund, or product name." required>
          <input value={form.planName || ''} onChange={e => set('planName', e.target.value)} className={`hig-input ${errors.planName ? 'border-hig-red focus:border-hig-red' : ''}`} placeholder="e.g. fund name, provider" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Payment Mode" hint="Used for planning context and future contribution logic.">
          <select value={form.paymentMode || 'Monthly'} onChange={e => set('paymentMode', e.target.value)} className="hig-input">
            {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Age From" error={errors.ageFrom}>
          <input type="number" min={18} max={100} value={form.ageFrom ?? currentAge} onChange={e => set('ageFrom', parseInt(e.target.value) || currentAge)} className={`hig-input ${errors.ageFrom ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <Field label="Age To" error={errors.ageTo}>
          <input type="number" min={18} max={120} value={form.ageTo ?? 99} onChange={e => set('ageTo', parseInt(e.target.value) || 99)} className={`hig-input ${errors.ageTo ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Expected Return (% p.a.)" error={errors.growthRate} hint="Use a base-case assumption, not a sales illustration number.">
          <input type="number" step="0.1" min="-20" max="25" value={form.growthRate ?? 0} onChange={e => set('growthRate', parseFloat(e.target.value) || 0)} className={`hig-input ${errors.growthRate ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <RMField label="Current Value" value={form.currentValue} onChange={v => set('currentValue', v)} error={errors.currentValue} required />
      </div>
    </ModalShell>
  )
}

export function IncomeModal({ row, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'Rental', description: '', frequency: 'Monthly', amount: 0,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const next = {}
    if (!cleanText(form.description)) next.description = 'Add the payer or source of this income.'
    if (clampMinZero(form.amount) <= 0) next.amount = 'Amount must be more than RM 0.'
    return next
  }, [form])

  return (
    <ModalShell
      title={isNew ? 'Add Income' : 'Edit Income'}
      onClose={onClose}
      onSave={() => saveIfValid(errors, onSave, { ...form, description: cleanText(form.description), amount: clampMinZero(form.amount) })}
      saveLabel={isNew ? 'Add Income' : 'Save Changes'}
      errors={Object.values(errors)}
      saveDisabled={Object.keys(errors).length > 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            {INCOME_DYNAMIC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Description" error={errors.description} hint="For example: tenant name, dividend source, or side income stream." required>
          <input value={form.description} onChange={e => set('description', e.target.value)} className={`hig-input ${errors.description ? 'border-hig-red focus:border-hig-red' : ''}`} placeholder="e.g. Taman Desa Rental" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Frequency">
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="hig-input">
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <RMField label="Amount" value={form.amount} onChange={v => set('amount', v)} error={errors.amount} required />
      </div>
    </ModalShell>
  )
}

export function ExpenseModal({ row, currentAge, onSave, onClose }) {
  const isNew = !row.id
  const [form, setForm] = useState({
    type: 'All - Personal', description: '', ageFrom: currentAge, ageTo: 99, frequency: 'Monthly', amount: 0,
    inflationLinked: true,
    ...row,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const next = {}
    if (!cleanText(form.description)) next.description = 'Add a clear expense label so clients can recognise it.'
    if (clampMinZero(form.amount) <= 0) next.amount = 'Amount must be more than RM 0.'
    if (toNumber(form.ageFrom) < 18 || toNumber(form.ageFrom) > 100) next.ageFrom = 'Age From must be between 18 and 100.'
    if (toNumber(form.ageTo) < 18 || toNumber(form.ageTo) > 120) next.ageTo = 'Age To must be between 18 and 120.'
    if (toNumber(form.ageTo) < toNumber(form.ageFrom)) next.ageTo = 'Age To must be the same as or later than Age From.'
    return next
  }, [form])

  return (
    <ModalShell
      title={isNew ? 'Add Expense' : 'Edit Expense'}
      onClose={onClose}
      onSave={() => saveIfValid(errors, onSave, { ...form, description: cleanText(form.description), amount: clampMinZero(form.amount), ageFrom: toNumber(form.ageFrom), ageTo: toNumber(form.ageTo) })}
      saveLabel={isNew ? 'Add Expense' : 'Save Changes'}
      errors={Object.values(errors)}
      saveDisabled={Object.keys(errors).length > 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={e => set('type', e.target.value)} className="hig-input">
            <optgroup label="Default">
              {EXPENSE_TYPES_CORE.map(t => <option key={t}>{t}</option>)}
            </optgroup>
            <optgroup label="Others">
              {EXPENSE_TYPES_OPTIONAL.map(t => <option key={t}>{t}</option>)}
            </optgroup>
          </select>
        </Field>
        <Field label="Description" error={errors.description} hint="For example: groceries, petrol, tuition, helper salary." required>
          <input value={form.description} onChange={e => set('description', e.target.value)} className={`hig-input ${errors.description ? 'border-hig-red focus:border-hig-red' : ''}`} placeholder="e.g. Grocery, Petrol" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Age From" error={errors.ageFrom}>
          <input type="number" min={18} max={100} value={form.ageFrom ?? currentAge} onChange={e => set('ageFrom', parseInt(e.target.value) || currentAge)} className={`hig-input ${errors.ageFrom ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <Field label="Age To" error={errors.ageTo}>
          <input type="number" min={18} max={120} value={form.ageTo ?? 99} onChange={e => set('ageTo', parseInt(e.target.value) || 99)} className={`hig-input ${errors.ageTo ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Frequency">
          <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="hig-input">
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <RMField label="Amount" value={form.amount} onChange={v => set('amount', v)} error={errors.amount} required />
      </div>

      <div
        className={`flex items-center justify-between rounded-hig-sm px-3 py-2.5 cursor-pointer select-none border transition-colors
          ${form.inflationLinked ? 'bg-orange-50 border-orange-200' : 'bg-hig-gray-6 border-hig-gray-5'}`}
        onClick={() => set('inflationLinked', !form.inflationLinked)}
      >
        <div>
          <p className={`text-hig-caption1 font-semibold ${form.inflationLinked ? 'text-orange-700' : 'text-hig-text-secondary'}`}>
            {form.inflationLinked ? 'Inflation-linked' : 'Fixed nominal (no inflation)'}
          </p>
          <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
            {form.inflationLinked
              ? 'Amount grows each year with the inflation rate.'
              : 'Amount stays fixed. Use this for loan repayments or fixed contracts.'}
          </p>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 relative ml-3 shrink-0 ${form.inflationLinked ? 'bg-orange-400' : 'bg-hig-gray-3'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.inflationLinked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
        </div>
      </div>
    </ModalShell>
  )
}

export function LiabilityModal({ initial, currentAge, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial })
  const monthly = calcMonthlyRepayment(form.principal, form.interestRate, form.loanPeriod)
  const errors = useMemo(() => {
    const next = {}
    if (!cleanText(form.description)) next.description = 'Add the lender or liability name.'
    if (clampMinZero(form.principal) <= 0) next.principal = 'Outstanding principal must be more than RM 0.'
    if (toNumber(form.startAge) < 18 || toNumber(form.startAge) > 90) next.startAge = 'Start age must be between 18 and 90.'
    if (toNumber(form.interestRate) < 0 || toNumber(form.interestRate) > 30) next.interestRate = 'Interest rate must be between 0% and 30%.'
    if (toNumber(form.loanPeriod) < 1 || toNumber(form.loanPeriod) > 600) next.loanPeriod = 'Loan period must be between 1 and 600 months.'
    return next
  }, [form])

  return (
    <ModalShell
      title={form.id ? 'Edit Liability' : 'New Liability'}
      onClose={onClose}
      onSave={() => saveIfValid(errors, onSave, { ...form, description: cleanText(form.description), principal: clampMinZero(form.principal), startAge: toNumber(form.startAge), interestRate: toNumber(form.interestRate), loanPeriod: toNumber(form.loanPeriod) })}
      saveLabel={form.id ? 'Save Changes' : 'Add Liability'}
      errors={Object.values(errors)}
      saveDisabled={Object.keys(errors).length > 0}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="hig-input">
            {LIABILITY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Description" error={errors.description} hint="For example: Maybank Home Loan, CIMB Auto Loan." required>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`hig-input ${errors.description ? 'border-hig-red focus:border-hig-red' : ''}`} placeholder="e.g. Maybank Home Loan" />
        </Field>
      </div>
      <RMField label="Outstanding Principal" value={form.principal} onChange={(num) => setForm(f => ({ ...f, principal: num }))} error={errors.principal} required hint="Use the current outstanding balance, not the original loan size." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Start Age" error={errors.startAge}>
          <input type="number" min={18} max={90} value={form.startAge || currentAge} onChange={e => setForm(f => ({ ...f, startAge: parseFloat(e.target.value) || 0 }))} className={`hig-input ${errors.startAge ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <Field label="Interest (% p.a.)" error={errors.interestRate}>
          <input type="number" step="0.1" min="0" max="30" value={form.interestRate || 0} onChange={e => setForm(f => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))} className={`hig-input ${errors.interestRate ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
        <Field label="Period (months)" error={errors.loanPeriod} hint="Use the remaining term, not necessarily the original tenure.">
          <input type="number" min="1" max="600" step="12" value={form.loanPeriod || 360} onChange={e => setForm(f => ({ ...f, loanPeriod: parseFloat(e.target.value) || 0 }))} className={`hig-input ${errors.loanPeriod ? 'border-hig-red focus:border-hig-red' : ''}`} />
        </Field>
      </div>
      {Number(form.principal) > 0 && (
        <div className="bg-hig-red/5 border border-hig-red/20 rounded-hig-sm p-3">
          <p className="text-hig-caption1 text-hig-red font-medium">
            Est. Monthly Repayment: {formatRMFull(monthly)}
          </p>
          <p className="text-hig-caption2 text-hig-text-secondary mt-0.5">
            This rolls into Cash Flow analysis automatically.
          </p>
        </div>
      )}
    </ModalShell>
  )
}

export function QuickImportModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({
    grossIncome: (data.income || []).find(r => r.id === 'gross-income')?.amount || 0,
    bonus: (data.income || []).find(r => r.id === 'bonus')?.amount || 0,
    savingsCash: (data.assets || []).find(r => r.id === 'savings-cash')?.amount || 0,
    epfAll: (data.assets || []).find(r => r.id === 'epf-all')?.amount || 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const errors = useMemo(() => {
    const next = {}
    if (toNumber(form.grossIncome) < 0) next.grossIncome = 'Gross income cannot be negative.'
    if (toNumber(form.bonus) < 0) next.bonus = 'Bonus cannot be negative.'
    if (toNumber(form.savingsCash) < 0) next.savingsCash = 'Savings cannot be negative.'
    if (toNumber(form.epfAll) < 0) next.epfAll = 'EPF cannot be negative.'
    return next
  }, [form])

  const handleSave = () => {
    if (Object.keys(errors).length) return
    const updatedIncome = (data.income || []).map(r => {
      if (r.id === 'gross-income') return { ...r, amount: clampMinZero(form.grossIncome) }
      if (r.id === 'bonus') return { ...r, amount: clampMinZero(form.bonus) }
      return r
    })
    const updatedAssets = (data.assets || []).map(r => {
      if (r.id === 'savings-cash') return { ...r, amount: clampMinZero(form.savingsCash) }
      if (r.id === 'epf-all') return { ...r, amount: clampMinZero(form.epfAll) }
      return r
    })
    onSave({ ...data, income: updatedIncome, assets: updatedAssets })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-hig-title3">Import Financial Data</h2>
            <p className="text-hig-caption1 text-hig-text-secondary mt-1">Use this for the fastest first-pass setup. You can refine details afterwards.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
        </div>

        <ValidationBanner errors={Object.values(errors)} />

        <div className="mb-5 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Employment Income</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RMField label="Gross Monthly Income" value={form.grossIncome} onChange={v => set('grossIncome', v)} error={errors.grossIncome} />
            <RMField label="Annual Bonus" value={form.bonus} onChange={v => set('bonus', v)} error={errors.bonus} />
          </div>
          {Number(form.grossIncome) > 0 && (
            <p className="text-hig-caption1 text-hig-text-secondary mt-2 flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0 text-hig-blue" />
              EPF: Employee {formatRMFull(Number(form.grossIncome) * 0.11)}/mth (11%) · Employer {Number(form.grossIncome) > 5000 ? '12%' : '13%'}
            </p>
          )}
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-hig-caption2 font-semibold text-hig-text-secondary uppercase tracking-wide">Savings & EPF Balances</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RMField label="Savings / Cash" value={form.savingsCash} onChange={v => set('savingsCash', v)} error={errors.savingsCash} />
            <RMField label="EPF (All Accounts)" value={form.epfAll} onChange={v => set('epfAll', v)} error={errors.epfAll} />
          </div>
        </div>

        <p className="text-hig-caption1 text-hig-text-secondary mb-5 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Investments, liabilities, and extra income or expenses can be added in their respective tabs after this quick setup.
        </p>

        <div className="flex justify-end gap-3 pt-4 border-t border-hig-gray-5 sticky bottom-0 bg-white">
          <button onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={Object.keys(errors).length > 0} className={`hig-btn-primary gap-1.5 ${Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={14} /> Save Financial Data
          </button>
        </div>
      </div>
    </div>
  )
}
