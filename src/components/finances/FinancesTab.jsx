import { useState, useMemo } from 'react'
import {
  Pencil, TrendingUp, TrendingDown, Wallet, X,
  ChevronRight, PiggyBank, BarChart2, ShieldCheck,
  AlertCircle, Plus,
} from 'lucide-react'
import FinancialInfo from './FinancialInfo'
import InsuranceTab from './InsuranceTab'
import FinancialRatios from './FinancialRatios'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toMonthly(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1 / 12, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, 'One-Time': 0, 'Lump Sum': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function fmtRM(val) {
  if (!val && val !== 0) return '—'
  const abs = Math.abs(val)
  let str
  if (abs >= 1_000_000) str = `RM ${(abs / 1_000_000).toFixed(2)}M`
  else if (abs >= 1_000)  str = `RM ${(abs / 1_000).toFixed(1)}k`
  else                    str = `RM ${abs.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return val < 0 ? `−${str}` : str
}

function fmtRMFull(val) {
  if (!val && val !== 0) return '—'
  return `RM ${Math.abs(val).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── Default structure ────────────────────────────────────────────────────────
export function getDefaultFinancials() {
  return {
    assets: [
      { id: 'savings-cash', fixed: true, type: 'Savings Cash',       description: 'Savings (Cash)',       growthRate: 0.25, amount: 0 },
      { id: 'epf-all',      fixed: true, type: 'EPF (All Accounts)', description: 'EPF Combined Balance', growthRate: 5.2,  amount: 0 },
      { id: 'property',     fixed: true, type: 'Property',           description: 'Property',             growthRate: 3.0,  amount: 0 },
      { id: 'automobile',   fixed: true, type: 'Automobile',         description: 'Automobile',           growthRate: -5.0, amount: 0 },
    ],
    investments: [
      { id: 'inv-etf',    fixed: true, type: 'Exchange Traded Funds (ETF)', planName: '', paymentMode: 'Monthly', ageFrom: 30, ageTo: 99, growthRate: 7.5, currentValue: 0 },
      { id: 'inv-stocks', fixed: true, type: 'Stocks & Shares',             planName: '', paymentMode: 'Monthly', ageFrom: 30, ageTo: 99, growthRate: 8.0, currentValue: 0 },
      { id: 'inv-ut',     fixed: true, type: 'Unit Trusts',                  planName: '', paymentMode: 'Monthly', ageFrom: 30, ageTo: 99, growthRate: 6.5, currentValue: 0 },
      { id: 'inv-bonds',  fixed: true, type: 'Bonds',                        planName: '', paymentMode: 'Monthly', ageFrom: 30, ageTo: 99, growthRate: 4.0, currentValue: 0 },
    ],
    liabilities: [
      { id: 'liab-home', fixed: true, type: 'Home Loan', description: 'Home Loan', principal: 0, startAge: 30, interestRate: 4.5, loanPeriod: 360 },
      { id: 'liab-car',  fixed: true, type: 'Car Loan',  description: 'Car Loan',  principal: 0, startAge: 30, interestRate: 3.0, loanPeriod: 84  },
    ],
    income: [
      { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: 0 },
      { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: 0 },
    ],
    expenses: [
      { id: 'exp-personal',      fixed: true, type: 'All - Personal',      description: '', ageFrom: 30, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
      { id: 'exp-transport',     fixed: true, type: 'All - Transport',     description: '', ageFrom: 30, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
      { id: 'exp-household',     fixed: true, type: 'All - Household',     description: '', ageFrom: 30, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
      { id: 'exp-dependents',    fixed: true, type: 'All - Dependents',    description: '', ageFrom: 30, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
      { id: 'exp-miscellaneous', fixed: true, type: 'All - Miscellaneous', description: '', ageFrom: 30, ageTo: 99, frequency: 'Monthly', amount: 0, inflationLinked: true },
      { id: 'exp-vacation',      fixed: true, type: 'Vacation/Travel',     description: '', ageFrom: 30, ageTo: 99, frequency: 'Yearly',  amount: 0, inflationLinked: true },
    ],
    insurance: [],
  }
}

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────
const SUB_TABS = [
  { key: 'info',      label: 'Financial Info',   icon: Wallet      },
  { key: 'insurance', label: 'Insurance',         icon: ShieldCheck },
  { key: 'ratios',    label: 'Financial Ratios',  icon: BarChart2   },
]

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon, trend }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
      flex: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          {label}
        </p>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color: trend === 'negative' ? '#FF3B30' : '#1C1C1E', letterSpacing: -0.3 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 3 }}>{sub}</p>
      )}
    </div>
  )
}

// ─── Section row ──────────────────────────────────────────────────────────────
function SectionRow({ label, amount, count, color, dot }) {
  if (amount === 0 && count === 0) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #F2F2F7',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color, flexShrink: 0, marginRight: 10,
      }} />
      <span style={{ flex: 1, fontSize: 14, color: '#3C3C43' }}>{label}</span>
      {count > 0 && (
        <span style={{
          fontSize: 11, color: '#AEAEB2',
          background: '#F2F2F7', borderRadius: 6,
          padding: '2px 7px', marginRight: 10,
          fontWeight: 600,
        }}>
          {count} item{count !== 1 ? 's' : ''}
        </span>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>
        {fmtRMFull(amount)}
      </span>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyFinancials({ onEdit }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px',
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(0,122,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Wallet size={22} style={{ color: '#007AFF' }} />
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E', marginBottom: 6 }}>
        No financial info yet
      </p>
      <p style={{ fontSize: 14, color: '#8E8E93', maxWidth: 260, lineHeight: 1.6, marginBottom: 20 }}>
        Add income, assets, liabilities and expenses to unlock projections and ratios.
      </p>
      <button
        onClick={onEdit}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#007AFF', color: 'white',
          border: 'none', borderRadius: 10,
          padding: '10px 20px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        <Plus size={15} />
        Add Financial Info
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FinancesTab({ contact, onUpdateFinancials }) {
  const [subTab, setSubTab]   = useState('info')
  const [editOpen, setEditOpen] = useState(false)

  const financials = contact.financials || getDefaultFinancials()

  const currentAge = useMemo(() => {
    if (!contact.dob) return 30
    const d = new Date(contact.dob)
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() ||
        (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return Math.max(18, age)
  }, [contact.dob])

  const handleSave = (updated) => {
    onUpdateFinancials(contact.id, { financials: updated })
  }

  // ── Compute summary numbers ──────────────────────────────────────────────
  const summary = useMemo(() => {
    const f = financials

    // Monthly income
    const monthlyIncome = (f.income || []).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0)

    // Monthly expenses
    const monthlyExpenses = (f.expenses || []).reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0)

    // Monthly loan repayments (rough monthly from principal, interest, term)
    const monthlyLoanRepayments = (f.liabilities || []).reduce((s, l) => {
      const P = Number(l.principal) || 0
      const r = (Number(l.interestRate) || 0) / 100 / 12
      const n = Number(l.loanPeriod) || 1
      if (P === 0) return s
      const pmt = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
      return s + pmt
    }, 0)

    // Total assets
    const totalAssets = (f.assets || []).reduce((s, a) => s + (Number(a.amount) || 0), 0)
    // Investments use .currentValue (market value); assets use .amount — do not swap these
    const totalInvestments = (f.investments || []).reduce((s, i) => s + (Number(i.currentValue) || 0), 0)

    // Total liabilities (outstanding principal)
    const totalLiabilities = (f.liabilities || []).reduce((s, l) => s + (Number(l.principal) || 0), 0)

    const netWorth = totalAssets + totalInvestments - totalLiabilities
    const cashFlow = monthlyIncome - monthlyExpenses - monthlyLoanRepayments

    // Income breakdown by type
    const incomeByType = {}
    ;(f.income || []).forEach(i => {
      const key = i.description || i.type
      incomeByType[key] = (incomeByType[key] || 0) + toMonthly(i.amount, i.frequency)
    })

    // Asset breakdown
    const epfTotal = (f.assets || [])
      .filter(a => a.type?.startsWith('EPF'))
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const savings = (f.assets || [])
      .filter(a => a.id === 'savings-cash')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const propertyTotal = (f.assets || [])
      .filter(a => a.id === 'property')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)
    const automobileTotal = (f.assets || [])
      .filter(a => a.id === 'automobile')
      .reduce((s, a) => s + (Number(a.amount) || 0), 0)

    const hasData = monthlyIncome > 0 || totalAssets > 0 || totalLiabilities > 0 || monthlyExpenses > 0

    return {
      monthlyIncome, monthlyExpenses, monthlyLoanRepayments,
      totalAssets, totalInvestments, totalLiabilities,
      netWorth, cashFlow,
      epfTotal, savings, propertyTotal, automobileTotal,
      hasData,
      incomeCount:     (f.income || []).filter(i => i.amount > 0).length,
      expenseCount:    (f.expenses || []).filter(e => e.amount > 0).length,
      liabilityCount:  (f.liabilities || []).length,
      investmentCount: (f.investments || []).filter(i => i.amount > 0).length,
    }
  }, [financials])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Sub-tab row ── */}
      <div style={{
        display: 'flex', gap: 6,
        padding: 4, background: '#F2F2F7', borderRadius: 10, width: 'fit-content',
      }}>
        {SUB_TABS.map(t => {
          const Icon = t.icon
          const active = subTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 500,
                background: active ? 'white' : 'transparent',
                color: active ? '#1C1C1E' : '#8E8E93',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Financial Info tab ── */}
      {subTab === 'info' && (
        <>
          {!summary.hasData ? (
            <EmptyFinancials onEdit={() => setEditOpen(true)} />
          ) : (
            <>
              {/* Top stat cards — Net Worth & Cash Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 10 }}>
                <StatCard
                  label="Net Worth"
                  value={fmtRM(summary.netWorth)}
                  sub="Assets + Investments − Liabilities"
                  color="#AF52DE"
                  icon={PiggyBank}
                  trend={summary.netWorth < 0 ? 'negative' : 'positive'}
                />
                <StatCard
                  label="Monthly Cash Flow"
                  value={fmtRM(summary.cashFlow)}
                  sub={summary.cashFlow >= 0 ? 'Income − Expenses (surplus)' : 'Income − Expenses (deficit)'}
                  color={summary.cashFlow >= 0 ? '#34C759' : '#FF3B30'}
                  icon={summary.cashFlow >= 0 ? TrendingUp : TrendingDown}
                  trend={summary.cashFlow < 0 ? 'negative' : 'positive'}
                />
              </div>

              {/* Breakdown sections */}
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>

                {/* Assets & Investments */}
                <div style={{
                  flex: 1, background: 'white', borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#AEAEB2', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                    Assets &amp; Investments
                  </p>
                  <SectionRow label="Savings (Cash)"       amount={summary.savings}           color="#34C759" count={0} />
                  <SectionRow label="EPF (All Accounts)"   amount={summary.epfTotal}          color="#30B0C7" count={0} />
                  <SectionRow label="Property"             amount={summary.propertyTotal}     color="#FF9500" count={0} />
                  <SectionRow label="Automobile"           amount={summary.automobileTotal}   color="#FF6B35" count={0} />
                  <SectionRow label="Investments"          amount={summary.totalInvestments}  color="#AF52DE" count={summary.investmentCount} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93' }}>Total</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E' }}>
                      {fmtRMFull(summary.totalAssets + summary.totalInvestments)}
                    </span>
                  </div>
                </div>

                {/* Income & Liabilities */}
                <div style={{
                  flex: 1, background: 'white', borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#AEAEB2', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                    Income &amp; Liabilities
                  </p>
                  <SectionRow label="Employment Income" amount={summary.monthlyIncome}         color="#34C759" count={0} />
                  <SectionRow label="Expenses"          amount={summary.monthlyExpenses}        color="#FF9500" count={summary.expenseCount} />
                  <SectionRow label="Loan Repayments"   amount={summary.monthlyLoanRepayments}  color="#FF3B30" count={summary.liabilityCount} />
                  <div style={{ borderTop: '1px solid #F2F2F7', marginTop: 6, paddingTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93' }}>Outstanding Debt</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: summary.totalLiabilities > 0 ? '#FF3B30' : '#1C1C1E' }}>
                        {fmtRMFull(summary.totalLiabilities)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash flow alert */}
              {summary.cashFlow < 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,59,48,0.06)',
                  border: '1px solid rgba(255,59,48,0.18)',
                  borderRadius: 12, padding: '12px 16px',
                }}>
                  <AlertCircle size={16} style={{ color: '#FF3B30', flexShrink: 0 }} />
                  <p style={{ fontSize: 13, color: '#FF3B30', lineHeight: 1.4 }}>
                    Monthly outflow exceeds income by <strong>{fmtRM(Math.abs(summary.cashFlow))}</strong>. Review expenses and liabilities.
                  </p>
                </div>
              )}

              {/* Edit button */}
              <button
                onClick={() => setEditOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'white', border: 'none',
                  borderRadius: 14, padding: '14px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.10)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: 'rgba(0,122,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Pencil size={14} style={{ color: '#007AFF' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', marginBottom: 1 }}>
                      Edit Financial Info
                    </p>
                    <p style={{ fontSize: 12, color: '#8E8E93' }}>
                      Income, assets, EPF, liabilities &amp; expenses
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#C7C7CC' }} />
              </button>
            </>
          )}
        </>
      )}

      {/* ── Insurance tab ── */}
      {subTab === 'insurance' && (
        <InsuranceTab financials={financials} onSave={handleSave} />
      )}

      {/* ── Ratios tab ── */}
      {subTab === 'ratios' && (
        <FinancialRatios financials={financials} contact={contact} />
      )}

      {/* ── Edit modal (centred card) ── */}
      {editOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setEditOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#F2F2F7',
              borderRadius: 18,
              width: '100%', maxWidth: 880,
              maxHeight: '92vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.20)',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'white',
              borderBottom: '1px solid #E5E5EA',
              borderRadius: '18px 18px 0 0',
              flexShrink: 0,
            }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>Financial Info</p>
                <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>{contact.name}</p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#F2F2F7', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} style={{ color: '#8E8E93' }} />
              </button>
            </div>

            {/* Modal content — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <FinancialInfo
                financials={financials}
                onSave={(updated) => { handleSave(updated) }}
                currentAge={currentAge}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
