import { Activity, Check, Heart, Shield } from 'lucide-react'
import NumberInput from '../../ui/NumberInput'
import SectionCard from '../../ui/SectionCard'
import FormField from '../../ui/FormField'

const ICONS = {
  ci: Heart,
  disability: Activity,
  death: Shield,
}

const LABELS = {
  ci: 'Critical illness scenario',
  disability: 'Disability scenario',
  death: 'Death scenario',
}

export default function ScenarioList({ scenarios, onToggle, onUpdate, currentAge }) {
  return (
    <SectionCard title="Stress scenarios" subtitle="Stress test the plan before making product recommendations.">
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <ScenarioRow
            key={scenario.id}
            scenario={scenario}
            currentAge={currentAge}
            onToggle={() => onToggle(scenario.id)}
            onUpdate={(patch) => onUpdate(scenario.id, patch)}
          />
        ))}
      </div>
    </SectionCard>
  )
}

function ScenarioRow({ scenario, currentAge, onToggle, onUpdate }) {
  const Icon = ICONS[scenario.id]

  return (
    <div className="rounded-hig-sm border border-hig-gray-5 p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`flex h-5 w-5 items-center justify-center rounded border ${scenario.active ? 'border-hig-blue bg-hig-blue text-white' : 'border-hig-gray-4 bg-white text-transparent'}`}
        >
          <Check size={11} strokeWidth={3} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-hig-gray-6">
          <Icon size={15} className="text-hig-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-hig-footnote font-medium">{LABELS[scenario.id]}</div>
          <div className="text-hig-caption2 text-hig-text-secondary">
            {scenario.active ? 'Included in projection' : 'Ignored in projection'}
          </div>
        </div>
      </div>

      {scenario.active ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <FormField label="Trigger age">
            <NumberInput
              value={scenario.age}
              onChange={(value) => onUpdate({ age: value || currentAge })}
              className="hig-input mt-1"
            />
          </FormField>
          {scenario.id === 'ci' ? (
            <FormField label="Recovery years">
              <NumberInput
                value={scenario.duration ?? 3}
                onChange={(value) => onUpdate({ duration: value || 3 })}
                className="hig-input mt-1"
              />
            </FormField>
          ) : (
            <div className="rounded-hig-sm bg-hig-gray-6 px-3 py-2 text-hig-caption1 text-hig-text-secondary">
              Assumes income stops permanently from trigger age.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
