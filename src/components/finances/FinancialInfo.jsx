import { useEffect, useMemo, useState } from 'react'
import { TABS, INVESTMENT_DEFAULT_RETURN } from './financial-info/constants'
import { computeSummary, normalizeFinancials, uid } from './financial-info/helpers'
import { AssetModal, ExpenseModal, IncomeModal, InvModal, LiabilityModal, QuickImportModal } from './financial-info/FinancialModals'
import { AssetsTab, ExpTab, IncomeTab, InvTab, LiabTab, OverviewTab } from './financial-info/FinancialTabs'

export default function FinancialInfo({ financials, onSave, currentAge = 30 }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [modal, setModal] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [data, setData] = useState(() => normalizeFinancials(financials, currentAge))

  useEffect(() => {
    setData(normalizeFinancials(financials, currentAge))
  }, [financials, currentAge])

  const summary = useMemo(() => computeSummary(data), [data])

  const persist = (updated) => {
    setData(updated)
    onSave(updated)
  }

  const saveSection = (section, newRows) => persist({ ...data, [section]: newRows })

  const updateRow = (section, id, updates) =>
    saveSection(section, data[section].map((row) => (row.id === id ? { ...row, ...updates } : row)))

  const removeRow = (section, id) =>
    saveSection(section, data[section].filter((row) => row.id !== id))

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
      <div className="flex flex-wrap gap-1 p-1 bg-hig-gray-6 rounded-hig-sm w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-hig-caption1 font-medium rounded-hig-sm transition-all ${
              activeTab === tab.key ? 'bg-white text-hig-text shadow-hig' : 'text-hig-text-secondary hover:text-hig-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          summary={summary}
          data={data}
          onNavigate={setActiveTab}
          onImport={() => setShowImport(true)}
        />
      )}

      {activeTab === 'assets' && (
        <AssetsTab
          rows={data.assets}
          onUpdateFixed={(id, updates) => updateRow('assets', id, updates)}
          onEdit={(row) => openEdit('assets', row)}
          onRemove={(id) => removeRow('assets', id)}
          onAdd={() => openAdd('assets', { type: 'Property', description: '', growthRate: 5, amount: 0 })}
        />
      )}

      {activeTab === 'investments' && (
        <InvTab
          rows={data.investments}
          currentAge={currentAge}
          onUpdateFixed={(id, updates) => updateRow('investments', id, updates)}
          onEdit={(row) => openEdit('investments', row)}
          onRemove={(id) => removeRow('investments', id)}
          onAdd={() =>
            openAdd('investments', {
              type: 'Exchange Traded Funds (ETF)',
              planName: '',
              paymentMode: 'Monthly',
              ageFrom: currentAge,
              ageTo: 99,
              growthRate: INVESTMENT_DEFAULT_RETURN['Exchange Traded Funds (ETF)'],
              currentValue: 0,
            })
          }
        />
      )}

      {activeTab === 'liabilities' && (
        <LiabTab
          rows={data.liabilities}
          onUpdateFixed={(id, updates) => updateRow('liabilities', id, updates)}
          onAdd={() =>
            setModal({
              section: 'liabilities',
              row: { type: 'Home Loan', description: '', principal: 0, startAge: currentAge, interestRate: 4.5, loanPeriod: 360 },
            })
          }
          onEdit={(row) => setModal({ section: 'liabilities', row: { ...row } })}
          onRemove={(id) => removeRow('liabilities', id)}
        />
      )}

      {activeTab === 'income' && (
        <IncomeTab
          rows={data.income}
          onUpdateFixed={(id, updates) => updateRow('income', id, updates)}
          onEdit={(row) => openEdit('income', row)}
          onRemove={(id) => removeRow('income', id)}
          onAdd={() => openAdd('income', { type: 'Rental', description: '', frequency: 'Monthly', amount: 0 })}
        />
      )}

      {activeTab === 'expenses' && (
        <ExpTab
          rows={data.expenses}
          currentAge={currentAge}
          onUpdateFixed={(id, updates) => updateRow('expenses', id, updates)}
          onEdit={(row) => openEdit('expenses', row)}
          onRemove={(id) => removeRow('expenses', id)}
          onAdd={() =>
            openAdd('expenses', {
              type: 'All - Personal',
              description: '',
              ageFrom: currentAge,
              ageTo: 99,
              frequency: 'Monthly',
              amount: 0,
              inflationLinked: true,
            })
          }
        />
      )}

      {modal?.section === 'assets' && (
        <AssetModal row={modal.row} onSave={(form) => handleModalSave('assets', form)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'investments' && (
        <InvModal
          row={modal.row}
          currentAge={currentAge}
          onSave={(form) => handleModalSave('investments', form)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.section === 'income' && (
        <IncomeModal row={modal.row} onSave={(form) => handleModalSave('income', form)} onClose={() => setModal(null)} />
      )}
      {modal?.section === 'expenses' && (
        <ExpenseModal
          row={modal.row}
          currentAge={currentAge}
          onSave={(form) => handleModalSave('expenses', form)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.section === 'liabilities' && (
        <LiabilityModal
          initial={modal.row}
          currentAge={currentAge}
          onSave={(form) => handleModalSave('liabilities', form)}
          onClose={() => setModal(null)}
        />
      )}

      {showImport && (
        <QuickImportModal
          data={data}
          onSave={(updated) => persist(updated)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
