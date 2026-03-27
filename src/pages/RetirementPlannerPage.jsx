import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import { getAge } from '../lib/formatters'
import { ArrowLeft, Settings } from 'lucide-react'
import BasicInfo from '../components/retirement/BasicInfo'
import ExistingProvision from '../components/retirement/ExistingProvision'
import RetirementPlanner from '../components/retirement/RetirementPlanner'

export default function RetirementPlannerPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveRetirementPlan } = useContacts()
  const contact = contacts.find((c) => c.id === id)

  // Pull gross income from Financial Info so we don't ask twice
  const linkedGrossMonthly = useMemo(() => {
    const incomeRows = contact?.financials?.income
    if (!Array.isArray(incomeRows)) return 0
    const row = incomeRows.find((r) => r.id === 'gross-income')
    return Number(row?.amount) || 0
  }, [contact?.financials?.income])

  const [step, setStep] = useState(1) // 1: Basic Info, 2: Existing Provision, 3: Planner
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [activeTab, setActiveTab] = useState('recommendations') // recommendations | provisions

  const currentAge = contact ? getAge(contact.dob) : 30

  // Plan state
  const [plan, setPlan] = useState(
    contact?.retirementPlan || {
      retirementAge: 60,
      lifeExpectancy: 100,
      monthlyExpenses: 3000,
      inflationRate: 4,
      preRetirementReturn: 5,
      postRetirementReturn: 3,
      includeEPF: false,
      epfBalance: 0,
      epfGrowthRate: 6,
      annualIncome: 0,
      incomeGrowthRate: 3,
      provisions: [],
      recommendations: [],
    }
  )

  const updatePlan = (updates) => {
    setPlan((prev) => {
      const next = { ...prev, ...updates }
      // Auto-save to contact
      saveRetirementPlan(id, next)
      return next
    })
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-hig-subhead text-hig-text-secondary">Contact not found</p>
      </div>
    )
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 mb-4">
      <button onClick={() => navigate(`/contacts/${id}`)} className="hig-btn-ghost gap-1.5 -ml-3">
        <ArrowLeft size={16} /> {contact.name}
      </button>
      <span className="text-hig-text-secondary">/</span>
      <span className="text-hig-subhead font-medium">{t('contactDetail.retirementPlanner')}</span>
    </div>
  )

  // Step indicator — compact
  const stepIndicator = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-1.5">
        {[
          { n: 1, label: t('retirement.stepBasicInfo') },
          { n: 2, label: t('retirement.stepProvision') },
          { n: 3, label: t('retirement.stepPlanner') },
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center gap-1.5">
            {idx > 0 && (
              <span className="w-5 h-px bg-hig-gray-4" />
            )}
            <button
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-hig-caption1 font-medium transition-colors
                ${step === s.n
                  ? 'bg-hig-blue text-white'
                  : step > s.n
                    ? 'bg-hig-green/10 text-hig-green'
                    : 'bg-hig-gray-6 text-hig-text-secondary'
                }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                ${step === s.n ? 'bg-white/20 text-white' : step > s.n ? 'bg-hig-green text-white' : 'bg-hig-gray-4 text-hig-text-secondary'}`}>
                {step > s.n ? '✓' : s.n}
              </span>
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {/* Planning Assumptions — always visible */}
      <button
        onClick={() => { setStep(3); setShowAssumptions(true) }}
        className="flex items-center gap-1.5 text-hig-caption1 font-medium text-hig-blue hover:text-blue-700 transition-colors"
      >
        <Settings size={14} /> {t('retirement.planningAssumptions')}
      </button>
    </div>
  )

  return (
    <div className="w-full">
      {breadcrumb}

      {stepIndicator}

      {step === 1 && (
        <BasicInfo
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          onChange={updatePlan}
          onContinue={() => setStep(2)}
          linkedGrossMonthly={linkedGrossMonthly}
          onGoToFinancialInfo={() => navigate(`/contacts/${id}`)}
        />
      )}

      {step === 2 && (
        <ExistingProvision
          plan={plan}
          currentAge={currentAge}
          onChange={updatePlan}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <RetirementPlanner
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          linkedGrossMonthly={linkedGrossMonthly}
          onChange={updatePlan}
          onEditAssumptions={() => setStep(1)}
          showAssumptions={showAssumptions}
          onToggleAssumptions={setShowAssumptions}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
        />
      )}
    </div>
  )
}
