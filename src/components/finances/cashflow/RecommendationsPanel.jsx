import SectionCard from '../../ui/SectionCard'

export default function RecommendationsPanel({ insurancePlans, recommendations = [] }) {
  return (
    <>
      <SectionCard title="Recommendations" subtitle="Gaps found against existing policies and scenario stress-tests.">
        <div className="space-y-2">
          {recommendations.length ? recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`rounded-hig-sm border px-3 py-2 ${rec.priority ? 'border-hig-red/40 bg-red-50/60' : 'border-hig-gray-5'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-hig-footnote font-medium">{rec.label}</div>
                {rec.priority ? (
                  <span className="shrink-0 rounded-full bg-hig-red/10 px-2 py-0.5 text-hig-caption2 font-medium text-hig-red">
                    Priority
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 text-hig-caption2 text-hig-text-secondary">{rec.desc}</div>
            </div>
          )) : (
            <div className="rounded-hig-sm bg-hig-gray-6 px-3 py-2 text-hig-caption1 text-hig-text-secondary">
              No gaps found against the current policy set.
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Existing insurance" subtitle="Current active plans used in the gap scan.">
        <div className="space-y-2">
          {insurancePlans.length ? insurancePlans.map((plan) => (
            <div key={plan.id} className="rounded-hig-sm border border-hig-gray-5 px-3 py-2">
              <div className="text-hig-footnote font-medium">{plan.name}</div>
              <div className="mt-0.5 text-hig-caption2 text-hig-text-secondary">
                {[plan.type, plan.insurer, plan.policyNo].filter(Boolean).join(' • ') || 'Policy details not fully captured'}
              </div>
            </div>
          )) : (
            <div className="rounded-hig-sm bg-hig-gray-6 px-3 py-2 text-hig-caption1 text-hig-text-secondary">
              No insurance plans captured yet.
            </div>
          )}
        </div>
      </SectionCard>
    </>
  )
}
