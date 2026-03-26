import { Home, Plus, Star, Trash2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import NumberInput from '../../ui/NumberInput'
import SectionCard from '../../ui/SectionCard'
import FormField from '../../ui/FormField'
import { formatRMCompact } from '../../../lib/cashflow'

const ICONS = {
  home: Home,
  trending: TrendingUp,
  star: Star,
}

export default function GoalsPanel({ goals, onAddGoal, onToggleGoal, onRemoveGoal, currentAge }) {
  const [draft, setDraft] = useState({ label: '', age: currentAge + 5, amount: 0, icon: 'home' })
  const [open, setOpen] = useState(false)

  const submit = () => {
    if (!draft.label || !draft.amount) return
    onAddGoal(draft)
    setDraft({ label: '', age: currentAge + 5, amount: 0, icon: 'home' })
    setOpen(false)
  }

  return (
    <SectionCard
      title="Goals and lump sums"
      subtitle="Place major cash events into the timeline."
      action={
        <button className="hig-btn-ghost gap-1.5" onClick={() => setOpen((value) => !value)}>
          <Plus size={14} /> Add goal
        </button>
      }
    >
      <div className="space-y-2">
        {goals.length ? goals.map((goal) => <GoalRow key={goal.id} goal={goal} onToggleGoal={onToggleGoal} onRemoveGoal={onRemoveGoal} />) : (
          <div className="rounded-hig-sm bg-hig-gray-6 px-3 py-2 text-hig-caption1 text-hig-text-secondary">
            No future lump sums added yet.
          </div>
        )}
      </div>

      {open ? (
        <div className="mt-4 rounded-hig-sm border border-dashed border-hig-gray-4 p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Goal name">
              <input className="hig-input mt-1" value={draft.label} onChange={(event) => setDraft((value) => ({ ...value, label: event.target.value }))} />
            </FormField>
            <FormField label="Target age">
              <NumberInput className="hig-input mt-1" value={draft.age} onChange={(value) => setDraft((state) => ({ ...state, age: value || currentAge + 5 }))} />
            </FormField>
            <FormField label="Amount">
              <NumberInput className="hig-input mt-1" value={draft.amount} onChange={(value) => setDraft((state) => ({ ...state, amount: value || 0 }))} />
            </FormField>
            <FormField label="Type">
              <select className="hig-input mt-1" value={draft.icon} onChange={(event) => setDraft((value) => ({ ...value, icon: event.target.value }))}>
                <option value="home">Property</option>
                <option value="trending">Investment</option>
                <option value="star">Other</option>
              </select>
            </FormField>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button className="hig-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="hig-btn-primary" onClick={submit}>Save goal</button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}

function GoalRow({ goal, onToggleGoal, onRemoveGoal }) {
  const Icon = ICONS[goal.icon] || Star
  return (
    <div className="flex items-center gap-3 rounded-hig-sm border border-hig-gray-5 px-3 py-2">
      <button
        onClick={() => onToggleGoal(goal.id)}
        className={`h-5 w-5 rounded border ${goal.active ? 'border-hig-blue bg-hig-blue' : 'border-hig-gray-4 bg-white'}`}
      />
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-hig-gray-6">
        <Icon size={15} className="text-hig-blue" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-hig-footnote font-medium">{goal.label}</div>
        <div className="text-hig-caption2 text-hig-text-secondary">
          Age {goal.age} • {formatRMCompact(goal.amount)}
        </div>
      </div>
      <button onClick={() => onRemoveGoal(goal.id)} className="rounded-hig-sm p-2 text-hig-text-secondary transition-colors hover:bg-red-50 hover:text-hig-red">
        <Trash2 size={14} />
      </button>
    </div>
  )
}
