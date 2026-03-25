import { useState } from 'react'
import FinancialInfo from './FinancialInfo'
import InsuranceTab from './InsuranceTab'
import InvestmentsTab from './InvestmentsTab'
import FinancialRatios from './FinancialRatios'

const SUB_TABS = [
  { key: 'financialInfo', label: 'Financial Info' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'investments', label: 'Investments' },
  { key: 'ratios', label: 'Financial Ratios' },
]

export default function FinancesTab({ contact, onUpdateFinancials }) {
  const [subTab, setSubTab] = useState('financialInfo')
  const financials = contact.financials || getDefaultFinancials()

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
        <FinancialInfo financials={financials} onSave={handleSave} />
      )}
      {subTab === 'insurance' && (
        <InsuranceTab financials={financials} onSave={handleSave} />
      )}
      {subTab === 'investments' && (
        <InvestmentsTab financials={financials} onSave={handleSave} />
      )}
      {subTab === 'ratios' && (
        <FinancialRatios financials={financials} contact={contact} />
      )}
    </div>
  )
}

// ─── Default Data Structure ─────────────────────────────────────────────────

export function getDefaultFinancials() {
  return {
    // Assets
    assets: {
      epfPersaraan: 0,
      epfSejahtera: 0,
      epfFleksibel: 0,
      savings: 0,
      unitTrusts: 0,
      otherInvestment: 0,
    },
    // Liabilities
    liabilities: {
      homeLoan: 0,
      carLoan: 0,
      studyLoan: 0,
      otherLoan: 0,
    },
    // Income
    income: {
      grossIncome: 0,    // monthly
      bonus: 0,          // annual
    },
    // Expenses (monthly)
    expenses: {
      household: 0,
      personal: 0,
      insuranceProtection: 0,
      carLoanRepayment: 0,
      loanRepayment: 0,
      petrol: 0,
      carInsurance: 0,    // monthly equivalent
      incomeTax: 0,       // monthly equivalent
      roadTax: 0,         // monthly equivalent
    },
    // Insurance policies
    insurance: [],
    // Investments
    investments: [],
  }
}
