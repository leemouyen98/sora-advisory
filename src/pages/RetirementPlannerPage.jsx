import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import { useAuth } from '../hooks/useAuth'
import { getAge } from '../lib/formatters'
import { ArrowLeft, Settings, Presentation } from 'lucide-react'
import BasicInfo from '../components/retirement/BasicInfo'
import ExistingProvision from '../components/retirement/ExistingProvision'
import RetirementPlanner from '../components/retirement/RetirementPlanner'

export default function RetirementPlannerPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, saveRetirementPlan } = useContacts()
  const { agent } = useAuth()
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
  const [meetingMode, setMeetingMode] = useState(false)

  const currentAge = contact ? getAge(contact.dob) : 30

  // Plan state
  const [plan, setPlan] = useState(
    contact?.retirementPlan || {
      retirementAge: contact?.retirementAge ?? 55,
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
      <span className="text-hig-subhead font-medium">{t('contactDetail.retirementPlanner')}</span>
    </div>
  )

  // Step indicator — GoalsMapper horizontal stepper style
  const stepIndicator = (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Centred stepper */}
      <div className="-mx-1 flex-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max items-center lg:justify-center">
          {[
            { n: 1, label: t('retirement.stepBasicInfo') },
            { n: 2, label: t('retirement.stepProvision') },
            { n: 3, label: t('retirement.stepPlanner') },
          ].map((s, idx) => (
            <div key={s.n} className="flex items-center">
              {idx > 0 && (
                <div className="w-12 h-px mx-1" style={{ backgroundColor: '#bdbdbd' }} />
              )}
              <button
                onClick={() => setStep(s.n)}
                className="shrink-0 flex items-center gap-2 transition-colors"
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors"
                  style={
                    step === s.n
                      ? { backgroundColor: '#1976d2', color: '#fff' }
                      : step > s.n
                        ? { backgroundColor: '#1976d2', color: '#fff' }
                        : { backgroundColor: 'transparent', color: '#9e9e9e', border: '2px solid #9e9e9e' }
                  }
                >
                  {step > s.n ? '✓' : s.n}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: step === s.n ? '#1976d2' : step > s.n ? '#1976d2' : '#9e9e9e' }}
                >
                  {s.label}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* Planning Assumptions — visible when not in meeting mode */}
        {!meetingMode && (
          <button
            onClick={() => { setStep(3); setShowAssumptions(true) }}
            className="flex items-center gap-1.5 text-hig-caption1 font-medium text-hig-blue hover:text-blue-700 transition-colors"
          >
            <Settings size={14} /> {t('retirement.planningAssumptions')}
          </button>
        )}
        {/* Meeting Mode toggle — only show once on step 3 */}
        {step === 3 && (
          <button
            onClick={() => setMeetingMode(m => !m)}
            className={`flex items-center gap-1.5 text-hig-caption1 font-medium transition-colors px-2.5 py-1 rounded-full
              ${meetingMode
                ? 'bg-hig-blue text-white'
                : 'text-hig-text-secondary hover:text-hig-blue border border-hig-gray-4 hover:border-hig-blue'
              }`}
          >
            <Presentation size={13} />
            {meetingMode ? 'Exit Presentation' : 'Presentation Mode'}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full">
      {/* Meeting Mode: slim header only */}
      {meetingMode ? (
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-hig-blue animate-pulse" />
            <span className="text-hig-caption1 font-semibold text-hig-blue">Presentation Mode</span>
            <span className="text-hig-caption2 text-hig-text-secondary">· {contact.name} · {t('contactDetail.retirementPlanner')}</span>
          </div>
          <button
            onClick={() => setMeetingMode(false)}
            className="text-hig-caption1 text-hig-text-secondary hover:text-hig-text transition-colors"
          >
            Exit ×
          </button>
        </div>
      ) : (
        <>
          {breadcrumb}
          {stepIndicator}
        </>
      )}

      {step === 1 && !meetingMode && (
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

      {step === 2 && !meetingMode && (
        <ExistingProvision
          plan={plan}
          currentAge={currentAge}
          onChange={updatePlan}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {(step === 3 || meetingMode) && (
        <RetirementPlanner
          plan={plan}
          currentAge={currentAge}
          contactName={contact.name}
          linkedGrossMonthly={linkedGrossMonthly}
          onChange={updatePlan}
          onEditAssumptions={() => { setMeetingMode(false); setStep(1) }}
          showAssumptions={showAssumptions}
          onToggleAssumptions={setShowAssumptions}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          meetingMode={meetingMode}
          agentName={agent?.name}
        />
      )}
    </div>
  )
}
