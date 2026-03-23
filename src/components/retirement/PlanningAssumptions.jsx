import { X } from 'lucide-react'

export default function PlanningAssumptions({ plan, currentAge, onChange, onClose }) {
  const set = (key) => (e) => {
    const rawVal = e.target.value
    const isNumeric = e.target.type === 'number' || e.target.type === 'range'
    const val = isNumeric ? (rawVal === '' ? 0 : parseFloat(rawVal) || 0) : rawVal
    onChange({ [key]: val })
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-hig-title3">Planning Assumptions</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-hig-gray-6 transition-colors">
            <X size={20} className="text-hig-text-secondary" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Planning Parameters */}
          <div>
            <h3 className="text-hig-headline mb-3">Planning Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="hig-label">Retirement Age</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={55} max={70} value={plan.retirementAge} onChange={set('retirementAge')} className="flex-1 accent-hig-blue" />
                  <span className="text-hig-headline text-hig-blue w-8 text-right">{plan.retirementAge}</span>
                </div>
              </div>
              <div>
                <label className="hig-label">Life Expectancy</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={61} max={120} value={plan.lifeExpectancy} onChange={set('lifeExpectancy')} className="flex-1 accent-hig-blue" />
                  <span className="text-hig-headline text-hig-blue w-8 text-right">{plan.lifeExpectancy}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-hig-gray-5" />

          {/* Retirement Expense */}
          <div>
            <h3 className="text-hig-headline mb-3">Retirement Expense</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="hig-label">Monthly Expenses (RM)</label>
                <input type="number" value={plan.monthlyExpenses || ''} onChange={set('monthlyExpenses')} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Inflation Rate (%)</label>
                <input type="number" step="0.5" min={0} max={10} value={plan.inflationRate} onChange={set('inflationRate')} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Pre-Retirement Return (%)</label>
                <input type="number" step="0.5" min={0} max={20} value={plan.preRetirementReturn ?? 5} onChange={set('preRetirementReturn')} className="hig-input" />
                <p className="text-hig-caption2 text-hig-text-secondary mt-1">Required accumulation curve discount rate</p>
              </div>
              <div>
                <label className="hig-label">Post-Retirement Return (%)</label>
                <input type="number" step="0.5" min={0} max={10} value={plan.postRetirementReturn} onChange={set('postRetirementReturn')} className="hig-input" />
              </div>
            </div>
          </div>

          <hr className="border-hig-gray-5" />

          {/* EPF */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-hig-headline">EPF Payout Information</h3>
              <button
                type="button"
                onClick={() => onChange({ includeEPF: !plan.includeEPF })}
                className={`w-12 h-7 rounded-full transition-colors relative ${plan.includeEPF ? 'bg-hig-green' : 'bg-hig-gray-3'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${plan.includeEPF ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {plan.includeEPF && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="hig-label">EPF Balance (RM)</label>
                  <input type="number" value={plan.epfBalance || ''} onChange={set('epfBalance')} className="hig-input" />
                </div>
                <div>
                  <label className="hig-label">EPF Growth Rate (%)</label>
                  <input type="number" step="0.5" value={plan.epfGrowthRate} onChange={set('epfGrowthRate')} className="hig-input" />
                </div>
                <div>
                  <label className="hig-label">Annual Income (RM)</label>
                  <input type="number" value={plan.annualIncome || ''} onChange={set('annualIncome')} className="hig-input" />
                </div>
                <div>
                  <label className="hig-label">Income Growth Rate (%)</label>
                  <input type="number" step="0.5" value={plan.incomeGrowthRate} onChange={set('incomeGrowthRate')} className="hig-input" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="hig-btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}
