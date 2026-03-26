import { CheckCircle2, ShieldCheck } from 'lucide-react'
import SectionCard from '../../ui/SectionCard'

export default function RecommendationsPanel({ recommendations, insurancePlans }) {
  return (
    <>
      <SectionCard title="Advisory prompts" subtitle="Use these to guide the next recommendation, not to overwhelm the client.">
        <div className="space-y-2">
          {recommendations.length ? recommendations.map((item) => (
            <div key={item.id} className={`rounded-hig-sm border px-3 py-2 ${item.priority ? 'border-hig-blue bg-blue-50/50' : 'border-hig-gray-5'}`}>
              <div className="flex items-start gap-2">
                <ShieldCheck size={15} className={item.priority ? 'mt-0.5 text-hig-blue' : 'mt-0.5 text-hig-text-secondary'} />
                <div>
                  <div className="text-hig-footnote font-medium">{item.label}</div>
                  <div className="mt-0.5 text-hig-caption2 text-hig-text-secondary">{item.desc}</div>
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-hig-sm bg-hig-green/10 px-3 py-2 text-hig-caption1 text-hig-green">
              Existing policies already cover the main scenario gaps.
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
