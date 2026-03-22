import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import {
  ArrowLeft, Phone, Calendar, Briefcase, Target, Shield,
  Plus, Check, FileText, PhoneCall, Users, MessageSquare, Clock,
} from 'lucide-react'

const ACTIVITY_ICONS = { Call: PhoneCall, Meeting: Users, Email: MessageSquare }

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, addInteraction, addTask, toggleTask, addActivity } = useContacts()
  const contact = contacts.find((c) => c.id === id)

  const [tab, setTab] = useState('interaction') // interaction | finances
  const [noteText, setNoteText] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', dueDate: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityForm, setActivityForm] = useState({ type: 'Call', description: '' })

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-hig-subhead text-hig-text-secondary">Contact not found</p>
      </div>
    )
  }

  const age = (() => {
    const d = new Date(contact.dob)
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--
    return a
  })()

  const handleAddNote = () => {
    if (!noteText.trim()) return
    addInteraction(contact.id, { type: 'note', content: noteText.trim() })
    setNoteText('')
  }

  const handleAddTask = (e) => {
    e.preventDefault()
    if (!taskForm.title) return
    addTask(contact.id, taskForm)
    setTaskForm({ title: '', dueDate: '' })
    setShowTaskForm(false)
  }

  const handleAddActivity = (e) => {
    e.preventDefault()
    if (!activityForm.description) return
    addActivity(contact.id, activityForm)
    setActivityForm({ type: 'Call', description: '' })
    setShowActivityForm(false)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/contacts')} className="hig-btn-ghost gap-1.5 mb-4 -ml-3">
        <ArrowLeft size={16} /> Contacts
      </button>

      <div className="flex gap-6">
        {/* Left: Contact Summary */}
        <div className="w-72 shrink-0 space-y-4">
          <div className="hig-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-hig-blue/10 text-hig-blue flex items-center justify-center text-hig-headline font-bold">
                {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <h2 className="text-hig-headline">{contact.name}</h2>
                <p className="text-hig-caption1 text-hig-text-secondary">Age {age}</p>
              </div>
            </div>
            <div className="space-y-2.5 text-hig-subhead">
              {contact.mobile && (
                <div className="flex items-center gap-2.5 text-hig-text-secondary">
                  <Phone size={15} /> <span className="text-hig-text">{contact.mobile}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-hig-text-secondary">
                <Calendar size={15} />
                <span className="text-hig-text">
                  {new Date(contact.dob).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              {contact.employment && (
                <div className="flex items-center gap-2.5 text-hig-text-secondary">
                  <Briefcase size={15} /> <span className="text-hig-text">{contact.employment}</span>
                </div>
              )}
              {contact.reviewDate && (
                <div className="flex items-center gap-2.5 text-hig-text-secondary">
                  <Clock size={15} />
                  <span className="text-hig-text">
                    Review: {new Date(contact.reviewDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {contact.reviewFrequency && ` (${contact.reviewFrequency})`}
                  </span>
                </div>
              )}
            </div>
            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {contact.tags.map((t) => (
                  <span key={t} className="text-hig-caption1 px-2.5 py-1 rounded-full bg-hig-blue/10 text-hig-blue font-medium">{t}</span>
                ))}
              </div>
            )}
            {contact.notes && (
              <p className="text-hig-caption1 text-hig-text-secondary pt-1 border-t border-hig-gray-5">
                {contact.notes}
              </p>
            )}
          </div>

          {/* Quick Planner Links */}
          <div className="hig-card p-4 space-y-2">
            <h3 className="text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
              Quick Planner
            </h3>
            <button
              onClick={() => navigate(`/contacts/${id}/retirement`)}
              className="w-full flex items-center gap-3 p-3 rounded-hig-sm
                         hover:bg-hig-gray-6 transition-colors text-left"
            >
              <Target size={20} className="text-hig-blue" />
              <div>
                <p className="text-hig-subhead font-medium">Retirement Planner</p>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {contact.retirementPlan ? 'View plan' : 'Start planning'}
                </p>
              </div>
            </button>
            <button
              onClick={() => navigate(`/contacts/${id}/protection`)}
              className="w-full flex items-center gap-3 p-3 rounded-hig-sm
                         hover:bg-hig-gray-6 transition-colors text-left"
            >
              <Shield size={20} className="text-hig-green" />
              <div>
                <p className="text-hig-subhead font-medium">Wealth Protection</p>
                <p className="text-hig-caption1 text-hig-text-secondary">
                  {contact.protectionPlan ? 'View plan' : 'Start planning'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex border-b border-hig-gray-5 mb-4">
            {[
              { key: 'interaction', label: 'Interaction' },
              { key: 'finances', label: 'Finances' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 text-hig-subhead font-medium border-b-2 transition-colors
                  ${tab === t.key
                    ? 'border-hig-blue text-hig-blue'
                    : 'border-transparent text-hig-text-secondary hover:text-hig-text'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'interaction' && (
            <div className="space-y-5">
              {/* Add Note */}
              <div className="hig-card p-4">
                <h3 className="text-hig-headline mb-3">Notes</h3>
                <div className="flex gap-3">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="hig-input flex-1 min-h-[60px] resize-y"
                  />
                  <button onClick={handleAddNote} disabled={!noteText.trim()} className="hig-btn-primary self-end">
                    Add
                  </button>
                </div>
                {/* Notes list */}
                <div className="mt-3 space-y-2">
                  {contact.interactions
                    .filter((i) => i.type === 'note')
                    .map((n) => (
                      <div key={n.id} className="flex gap-3 py-2 border-t border-hig-gray-5">
                        <FileText size={15} className="text-hig-text-secondary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-hig-subhead">{n.content}</p>
                          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">{n.date}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Tasks */}
              <div className="hig-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-hig-headline">Tasks</h3>
                  <button onClick={() => setShowTaskForm(!showTaskForm)} className="hig-btn-ghost gap-1">
                    <Plus size={14} /> Add Task
                  </button>
                </div>
                {showTaskForm && (
                  <form onSubmit={handleAddTask} className="flex gap-3 mb-3">
                    <input value={taskForm.title} onChange={(e) => setTaskForm({...taskForm, title: e.target.value})} className="hig-input flex-1" placeholder="Task title" />
                    <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})} className="hig-input w-40" />
                    <button type="submit" className="hig-btn-primary">Add</button>
                  </form>
                )}
                <div className="space-y-1">
                  {contact.tasks.length === 0 && (
                    <p className="text-hig-subhead text-hig-text-secondary py-2">No tasks yet.</p>
                  )}
                  {contact.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-t border-hig-gray-5">
                      <button onClick={() => toggleTask(contact.id, t.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${t.status === 'completed' ? 'bg-hig-green border-hig-green' : 'border-hig-gray-3'}`}
                      >
                        {t.status === 'completed' && <Check size={12} className="text-white" />}
                      </button>
                      <span className={`text-hig-subhead flex-1 ${t.status === 'completed' ? 'line-through text-hig-text-secondary' : ''}`}>
                        {t.title}
                      </span>
                      {t.dueDate && (
                        <span className="text-hig-caption1 text-hig-text-secondary">{t.dueDate}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Activities */}
              <div className="hig-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-hig-headline">Activities</h3>
                  <button onClick={() => setShowActivityForm(!showActivityForm)} className="hig-btn-ghost gap-1">
                    <Plus size={14} /> Add Activity
                  </button>
                </div>
                {showActivityForm && (
                  <form onSubmit={handleAddActivity} className="flex gap-3 mb-3">
                    <select value={activityForm.type} onChange={(e) => setActivityForm({...activityForm, type: e.target.value})} className="hig-input w-32">
                      <option>Call</option>
                      <option>Meeting</option>
                      <option>Email</option>
                    </select>
                    <input value={activityForm.description} onChange={(e) => setActivityForm({...activityForm, description: e.target.value})} className="hig-input flex-1" placeholder="Description" />
                    <button type="submit" className="hig-btn-primary">Add</button>
                  </form>
                )}
                <div className="space-y-1">
                  {contact.activities.length === 0 && (
                    <p className="text-hig-subhead text-hig-text-secondary py-2">No activities yet.</p>
                  )}
                  {contact.activities.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] || MessageSquare
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-2 border-t border-hig-gray-5">
                        <Icon size={15} className="text-hig-blue shrink-0" />
                        <span className="text-hig-subhead flex-1">{a.description}</span>
                        <span className="text-hig-caption1 text-hig-text-secondary">{a.date}</span>
                        <span className="text-hig-caption2 px-2 py-0.5 rounded-full bg-hig-gray-6 text-hig-text-secondary">{a.type}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'finances' && (
            <div className="hig-card p-8 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="text-hig-headline text-hig-text-secondary">Financial Summary</p>
                <p className="text-hig-subhead text-hig-text-secondary mt-1">
                  Coming in V4.0 — Assets, Investments, Liabilities, Income, Insurances, Expenses
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
