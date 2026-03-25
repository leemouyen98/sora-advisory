import { useState, useMemo } from 'react'
import FinancialInfo from './FinancialInfo'
import InsuranceTab from './InsuranceTab'
import CashFlowTab from './CashFlowTab'
import FinancialRatios from './FinancialRatios'

const SUB_TABS = [
  { key: 'financialInfo', label: 'Financial Info'  },
  { key: 'insurance',     label: 'Insurance'       },
  { key: 'cashflow',      label: 'Cash Flow'       },
  { key: 'ratios',        label: 'Financial Ratios'},
]

export default function FinancesTab({ contact, onUpdateFinancials }) {
  const [subTab, setSubTab] = useState('financialInfo')
  const financials = contact.financials || getDefaultFinancials()

  // Compute current age from DOB
  const currentAge = useMemo(() => {
    if (!contact.dob) return 30
    const d = new Date(contact.dob)
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return Math.max(18, age)
  }, [contact.dob])

  const handleSave = (updated) => {
    onUpdateFinancials(contact.id, { financials: updated })
  }

  return (
    <div>
      {/* Sub-tab pills */}
      <div className="flex gap-1.5 mb-5 p-1 bg-hig-gray-6 rounded-hig-sm w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 text-hig-subhead font-medium rounded-hig-sm transition-all duration-hig
              ${subTab === t.key
                ? 'bg-white text-hig-text shadow-hig'
                : 'text-hig-text-secondary hover:text-hig-text'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'financialInfo' && (
        <FinancialInfo financials={financials} onSave={handleSave} currentAge={currentAge} />
      )}
      {subTab === 'insurance' && (
        <InsuranceTab financials={financials} onSave={handleSave} />
      )}
      {subTab === 'cashflow' && (
        <CashFlowTab financials={financials} contact={contact} />
      )}
      {subTab === 'ratios' && (
        <FinancialRatios financials={financials} contact={contact} />
      )}
    </div>
  )
}

// ─── Default Data Structure (new array-based format) ─────────────────────────

export function getDefaultFinancials() {
  return {
    assets: [
      { id: 'savings-cash',  fixed: true, type: 'Savings Cash',  description: 'Savings / Cash',       growthRate: 0.25, amount: 0 },
      { id: 'epf-persaraan', fixed: true, type: 'EPF Persaraan', description: 'EPF Akaun Persaraan',  growthRate: 5.2,  amount: 0 },
      { id: 'epf-sejahtera', fixed: true, type: 'EPF Sejahtera', description: 'EPF Akaun Sejahtera',  growthRate: 5.2,  amount: 0 },
      { id: 'epf-fleksibel', fixed: true, type: 'EPF Fleksibel', description: 'EPF Akaun Fleksibel',  growthRate: 5.2,  amount: 0 },
    ],
    investments: [],
    liabilities: [],
    income: [
      { id: 'gross-income', fixed: true, type: 'Employment', description: 'Gross Income', frequency: 'Monthly', amount: 0 },
      { id: 'bonus',        fixed: true, type: 'Employment', description: 'Bonus',        frequency: 'Yearly',  amount: 0 },
    ],
    expenses:  [],
    insurance: [],
  }
}
