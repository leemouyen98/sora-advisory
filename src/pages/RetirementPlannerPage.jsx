import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { getAge } from '../lib/formatters'
import { ArrowLeft } from 'lucide-react'
import BasicInfo from '../components/retirement/BasicInfo'
import ExistingProvision from '../components/retirement/ExistingProvision'
import RetirementPlanner from '../components/retirement/RetirementPlanner'

export default function RetirementPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveRetirementPlan } = useContacts()
  const contact = contacts.find((c) => c.id === id)

  const [step, setStep] = useState(1) // 1: Basic Info, 2: Existing Provision, 3: Planner

  const currentAge = contact ? getAge(contact.dob) : 30

  // Plan state
  const [plan, setPlan] = useState(
    contact?.retirementPlan || {
      retirementAge: 55,
      lifeExpectancy: 80,
      monthlyExpenses: 3000,
      inflationRate: 4,
      postRetirementReturn: 1,
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
      <span className="text-hig-subhead font-medium">Retirement Planner</span>
    </div>
  )

  // Step indicator
  const stepIndicator = step < 3 && (
    <div className="flex items-center gap-3 mb-6">
      {[
        { n: 1, label: 'Basic Information' },
        { n: 2, label: 'Existing Provision' },
      ].map((s) => (
        <button
          key={s.n}
          onClick={() => setStep(s.n)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-hig-subhead font-medium transition-colors
            ${step === s.n
              ? 'bg-hig-blue text-white'
              : step > s.n
                ? 'bg-hig-green/10 text-hig-green'
                : 'bg-hig-gray-6 text-hig-text-secondary'
            }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-hig-caption1 font-bold
            ${step === s.n ? 'bg-white/20 text-white' : step > s.n ? 'bg-hig-green text-white' : 'bg-hig-gray-4 text-hig-text-secondary'}`}>
            {step > s.n ? '✓' : s.n}
          </span>
          {s.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      {breadcrumb}

      {step < 3 && stepIndicator}

      {step === 1 && (
        <BasicInfo
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          onChange={updatePlan}
          onContinue={() => setStep(2)}
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
          onChange={updatePlan}
          onEditAssumptions={() => setStep(1)}
        />
      )}
    </div>
  )
}
