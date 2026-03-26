import FormField from '../../ui/FormField'
import SectionCard from '../../ui/SectionCard'

export default function PlanningAssumptionsPanel({ assumptions, currentAge, onChange }) {
  const fields = [
    { key: 'retirementAge', label: 'Retirement age', min: currentAge + 1, max: 80, step: 1, suffix: '' },
    { key: 'expectedAge', label: 'Projection to age', min: 60, max: 100, step: 1, suffix: '' },
    { key: 'savingsRate', label: 'Savings growth', min: 0, max: 20, step: 0.5, suffix: '%' },
    { key: 'epfDividendRate', label: 'EPF dividend', min: 0, max: 10, step: 0.5, suffix: '%' },
    { key: 'inflationRate', label: 'Inflation', min: 0, max: 15, step: 0.5, suffix: '%' },
  ]

  return (
    <SectionCard title="Planning assumptions" subtitle="Make the model visible. Hidden assumptions weaken trust.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {fields.map((field) => (
          <FormField key={field.key} label={field.label}>
            <div className="relative mt-1">
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                className="hig-input w-full"
                value={assumptions[field.key]}
                onChange={(event) => onChange(field.key, Number(event.target.value))}
              />
              {field.suffix ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-hig-footnote text-hig-text-secondary">
                  {field.suffix}
                </span>
              ) : null}
            </div>
          </FormField>
        ))}
      </div>
    </SectionCard>
  )
}
