import { useMemo } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { formatRMFull } from '../../lib/calculations'
import { projectProvision } from '../../lib/calculations'
import { Plus, Trash2, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react'
import NumberInput from '../ui/NumberInput'
import { useState } from 'react'

import { uid } from '../../lib/formatters'

const FREQUENCIES = ['One-Time', 'Monthly', 'Quarterly', 'Semi-annually', 'Yearly']

export default function ExistingProvision({ plan, currentAge, onChange, onBack, onContinue }) {
  const { t } = useLanguage()
  const provisions = plan.provisions || []
  const yearsToRetirement = plan.retirementAge - currentAge
  const [collapsed, setCollapsed] = useState({})

  const addProvision = () => {
    const newId = uid()
    onChange({
      provisions: [
        ...provisions,
        { id: newId, name: '', amount: 0, frequency: 'Monthly', preRetirementReturn: 5, currentBalance: 0 },
      ],
    })
    // Expand the new entry
    setCollapsed(prev => ({ ...prev, [newId]: false }))
  }

  const updateProvision = (idx, updates) => {
    const next = [...provisions]
    next[idx] = { ...next[idx], ...updates }
    onChange({ provisions: next })
  }

  const removeProvision = (idx) => {
    onChange({ provisions: provisions.filter((_, i) => i !== idx) })
  }

  const toggleCollapse = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Calculate projected values
  const projections = useMemo(() => {
    return provisions.map((p) => ({
      ...p,
      projectedValue: Math.round(projectProvision(p, yearsToRetirement)),
    }))
  }, [provisions, yearsToRetirement])

  const totalProjected = projections.reduce((sum, p) => sum + p.projectedValue, 0)

  // Total capital = current balances + all future contributions over the period
  const totalCapital = provisions.reduce((sum, p) => {
    const balance = p.currentBalance || 0
    if (p.frequency === 'One-Time') return sum + balance + (p.amount || 0)
    const freqMap = { Monthly: 12, Quarterly: 4, 'Semi-annually': 2, Yearly: 1 }
    return sum + balance + (p.amount || 0) * (freqMap[p.frequency] || 12) * yearsToRetirement
  }, 0)

  const todayValue = provisions.reduce((s, p) => s + (p.currentBalance || 0) + (p.frequency === 'One-Time' ? (p.amount || 0) : 0), 0)
  const increase = totalProjected - totalCapital

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 space-y-4">
        <div className="hig-card p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-hig-blue/10 flex items-center justify-center shrink-0">
              <span className="text-hig-blue text-hig-caption1 font-bold">EP</span>
            </div>
            <div>
              <h3 className="text-hig-headline">{t('retirement.existingProvision')}</h3>
              <p className="text-hig-caption1 text-hig-text-secondary">{t('retirement.existingProvisionDesc')}</p>
            </div>
          </div>
        </div>

        {provisions.length === 0 ? (
          <div className="hig-card p-8 text-center">
            <p className="text-hig-subhead text-hig-text-secondary mb-2">{t('retirement.noProvisions')}</p>
            <p className="text-hig-caption1 text-hig-text-secondary mb-6">{t('retirement.noProvisionsHint')}</p>
            <button
              onClick={addProvision}
              className="hig-btn-primary gap-2 mx-auto"
            >
              <Plus size={16} /> {t('retirement.addEntry')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {provisions.map((p, idx) => {
              const isCollapsed = collapsed[p.id]
              return (
                <div key={p.id} className="hig-card overflow-hidden">
                  {/* Accordion header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-blue-50 cursor-pointer select-none"
                    onClick={() => toggleCollapse(p.id)}
                  >
                    <span className="text-hig-subhead font-semibold text-hig-blue">
                      {p.name || t('retirement.entryN', { n: idx + 1 })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeProvision(idx) }}
                        className="text-hig-red hover:text-red-700 transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                      {isCollapsed ? <ChevronDown size={16} className="text-hig-blue" /> : <ChevronUp size={16} className="text-hig-blue" />}
                    </div>
                  </div>

                  {/* Fields */}
                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="hig-label">{t('retirement.provisionName')} <span className="text-hig-red">*</span></label>
                        <input
                          value={p.name}
                          onChange={(e) => updateProvision(idx, { name: e.target.value })}
                          className="hig-input"
                          placeholder="e.g. PRS, ASNB, Unit Trust"
                        />
                      </div>
                      <div>
                        <label className="hig-label">{t('retirement.currentBalanceRM')} <span className="text-hig-red">*</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                          <NumberInput
                            value={p.currentBalance}
                            onChange={(num) => updateProvision(idx, { currentBalance: num })}
                            className="hig-input pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="hig-label">{t('retirement.contributionAmountRM')} <span className="text-hig-red">*</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
                          <NumberInput
                            value={p.amount}
                            onChange={(num) => updateProvision(idx, { amount: num })}
                            className="hig-input pl-10"
                            placeholder="500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="hig-label">{t('common.period')} <span className="text-hig-red">*</span></label>
                        <select
                          value={p.frequency}
                          onChange={(e) => updateProvision(idx, { frequency: e.target.value })}
                          className="hig-input"
                        >
                          {FREQUENCIES.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="hig-label">{t('retirement.preReturnRate')} <span className="text-hig-red">*</span></label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            value={p.preRetirementReturn}
                            onChange={(e) => updateProvision(idx, { preRetirementReturn: parseFloat(e.target.value) || 0 })}
                            className="hig-input pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hig-text-secondary">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Entry button — dashed border style */}
            <button
              onClick={addProvision}
              className="w-full py-3 border-2 border-dashed border-hig-gray-4 rounded-hig-sm text-hig-subhead text-hig-blue hover:border-hig-blue hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> {t('retirement.addEntry')}
            </button>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={onBack} className="hig-btn-ghost gap-1.5">
            <ArrowLeft size={16} /> {t('common.back')}
          </button>
          <button onClick={onContinue} className="hig-btn-primary">
            {t('common.continue')}
          </button>
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-72 shrink-0">
        <div className="hig-card p-5 space-y-4 sticky top-4">
          <h3 className="text-hig-headline">{t('retirement.provisionSummary')}</h3>

          {/* Green projected value box */}
          <div className="bg-green-50 rounded-hig-sm p-4">
            <p className="text-hig-caption1 text-hig-green font-medium mb-1">
              {t('retirement.atAge', { age: plan.retirementAge })}
            </p>
            <p className="text-hig-title2 text-hig-green">
              {formatRMFull(totalProjected)}
            </p>
            <p className="text-hig-caption2 text-hig-text-secondary mt-1">
              {provisions.length === 0
                ? t('retirement.noChangeOverYears', { years: yearsToRetirement })
                : increase >= 0
                  ? t('retirement.increaseOverYears', { amount: formatRMFull(increase), years: yearsToRetirement })
                  : t('retirement.noChangeOverYears', { years: yearsToRetirement })
              }
            </p>
          </div>

          {/* Stats */}
          <div className="space-y-2.5 text-hig-subhead">
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.provisions')}</span>
              <span className="font-semibold">{provisions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.totalCapital')}</span>
              <span className="font-semibold">{formatRMFull(totalCapital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.todayValue')}</span>
              <span className="font-semibold">{formatRMFull(todayValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-hig-text-secondary">{t('retirement.yearsToTarget')}</span>
              <span className="font-semibold">{yearsToRetirement}</span>
            </div>
          </div>

          {/* Individual projections */}
          {projections.length > 0 && (
            <>
              <hr className="border-hig-gray-5" />
              <div className="space-y-2">
                {projections.map((p, i) => (
                  <div key={p.id} className="flex justify-between text-hig-caption1">
                    <span className="text-hig-text-secondary truncate max-w-[60%]">{p.name || t('retirement.entryN', { n: i + 1 })}</span>
                    <span className="font-medium">{formatRMFull(p.projectedValue)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
