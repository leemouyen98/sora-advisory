import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import FinancesTab from '../components/finances/FinancesTab'
import CashFlowTab from '../components/finances/CashFlowTab'
import {
  ArrowLeft, Phone, Calendar, Briefcase, Target, Shield,
  Plus, Check, FileText, PhoneCall, Users, MessageSquare, Clock, Pencil,
  CheckCircle2, X, Tag, TrendingUp, ArrowRight, ChevronDown,
  DollarSign, BarChart2,
} from 'lucide-react'

const ACTIVITY_ICONS = { Call: PhoneCall, Meeting: Users, Email: MessageSquare }

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toMonthlyCF(amount, frequency) {
  const map = { Monthly: 1, Yearly: 1 / 12, Quarterly: 1 / 3, 'Semi-annually': 1 / 6, 'One-Time': 0 }
  return (Number(amount) || 0) * (map[frequency] ?? 1)
}

function fmtRM(val) {
  if (val === undefined || val === null) return '—'
  const abs = Math.abs(val)
  const str = abs >= 1_000_000
    ? `RM ${(Math.abs(val) / 1_000_000).toFixed(1)}M`
    : `RM ${Math.abs(val).toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return val < 0 ? `−${str}` : str
}

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, addInteraction, addTask, toggleTask, addActivity, updateContact, saveFinancials, addTag, removeTag } = useContacts()
  const contact = contacts.find((c) => c.id === id)

  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({})

  const [tab, setTab] = useState('interaction')
  const [showCashFlow, setShowCashFlow] = useState(false)
  const [showCFPrompt, setShowCFPrompt] = useState(false)
  const [showStartPlanning, setShowStartPlanning] = useState(false)

  const [noteText, setNoteText] = useState('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', dueDate: '' })
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityForm, setActivityForm] = useState({ type: 'Call', description: '' })

  // Check if Financial Info has usable data (any income or expense entered)
  const hasFinancialData = useMemo(() => {
    const fin = contact?.financials
    if (!fin) return false
    const hasIncome = Array.isArray(fin.income) && fin.income.some((r) => Number(r.amount) > 0)
    const hasExpenses = Array.isArray(fin.expenses) && fin.expenses.length > 0
    return hasIncome || hasExpenses
  }, [contact?.financials])

  // Sidebar financial summary — Net Worth + Monthly Cash Flow
  const sidebarFinancial = useMemo(() => {
    const fin = contact?.financials
    if (!fin) return null
    const assets = Array.isArray(fin.assets) ? fin.assets : []
    const investments = Array.isArray(fin.investments) ? fin.investments : []
    const liabilities = Array.isArray(fin.liabilities) ? fin.liabilities : []
    const income = Array.isArray(fin.income) ? fin.income : []
    const expenses = Array.isArray(fin.expenses) ? fin.expenses : []
    const totalAssets = assets.reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalInv = investments.reduce((s, r) => s + (Number(r.currentValue) || 0), 0)
    const totalLiab = liabilities.reduce((s, r) => s + (Number(r.principal) || 0), 0)
    const monthlyIncome = income.reduce((s, r) => s + toMonthlyCF(r.amount, r.frequency), 0)
    const monthlyExpenses = expenses.reduce((s, r) => s + toMonthlyCF(r.amount, r.frequency), 0)
    const netWorth = totalAssets + totalInv - totalLiab
    const monthlyCashFlow = monthlyIncome - monthlyExpenses
    const hasData = monthlyIncome > 0 || monthlyExpenses > 0 || totalAssets > 0 || totalInv > 0
    return { netWorth, monthlyCashFlow, monthlyIncome, monthlyExpenses, hasData }
  }, [contact?.financials])

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

  const openEdit = () => {
    setEditForm({
      name: contact.name,
      dob: contact.dob,
      mobile: contact.mobile || '',
      employment: contact.employment || '',
      retirementAge: contact.retirementAge ?? 55,
      reviewDate: contact.reviewDate || '',
      reviewFrequency: contact.reviewFrequency || '',
      notes: contact.notes || '',
    })
    setShowEditForm(true)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!editForm.name || !editForm.dob) return
    updateContact(id, editForm)
    setShowEditForm(false)
  }

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

  const launchCashFlow = () => {
    setShowStartPlanning(false)
    if (!hasFinancialData) {
      setShowCFPrompt(true)
    } else {
      setShowCashFlow(true)
    }
  }

  // ── Full-width Cash Flow view (early return) ──────────────────────────────
  if (showCashFlow) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setShowCashFlow(false)}
            className="hig-btn-ghost gap-1.5 -ml-3"
          >
            <ArrowLeft size={16} /> {contact.name}
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-hig-blue" />
            <span className="text-hig-headline font-semibold">Cash Flow Projection</span>
            <span className="text-hig-caption2 font-semibold px-2 py-0.5 rounded-full bg-hig-blue/10 text-hig-blue leading-none">
              Full Suite
            </span>
          </div>
          <div className="w-32" />
        </div>
        <CashFlowTab financials={contact.financials} contact={contact} />

        {/* Edit modal still accessible */}
        {showEditForm && <EditContactModal
          editForm={editForm} setEditForm={setEditForm}
          onClose={() => setShowEditForm(false)} onSubmit={handleEditSubmit}
        />}
      </div>
    )
  }

  // ── Normal two-column view ────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto">
      {/* Top header: Back + Start Planning */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/contacts')} className="hig-btn-ghost gap-1.5 -ml-3">
          <ArrowLeft size={16} /> Contacts
        </button>

        {/* Start Planning dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStartPlanning((s) => !s)}
            className="hig-btn-primary gap-2"
          >
            Start Planning
            <ChevronDown size={14} className={`transition-transform duration-hig ${showStartPlanning ? 'rotate-180' : ''}`} />
          </button>
          {showStartPlanning && (
            <>
              {/* Overlay to close on click-away */}
              <div className="fixed inset-0 z-20" onClick={() => setShowStartPlanning(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 min-w-[210px] z-30">
                <button
                  onClick={launchCashFlow}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-hig-sm bg-hig-blue/10 flex items-center justify-center shrink-0">
                    <TrendingUp size={14} className="text-hig-blue" />
                  </div>
                  <div>
                    <p className="font-medium leading-none mb-0.5">Cash Flow Planner</p>
                    <p className="text-hig-caption2 text-hig-text-secondary leading-none">Full suite</p>
                  </div>
                  {hasFinancialData && (
                    <span className="ml-auto text-hig-caption2 text-hig-green font-semibold">Ready</span>
                  )}
                </button>
                <div className="border-t border-hig-gray-5 my-1" />
                <button
                  onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/retirement`) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-hig-sm bg-hig-blue/10 flex items-center justify-center shrink-0">
                    <Target size={14} className="text-hig-blue" />
                  </div>
                  <div>
                    <p className="font-medium leading-none mb-0.5">Retirement Planner</p>
                    <p className="text-hig-caption2 text-hig-text-secondary leading-none">Quick planner</p>
                  </div>
                  {contact.retirementPlan && (
                    <CheckCircle2 size={14} className="ml-auto text-hig-green shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => { setShowStartPlanning(false); navigate(`/contacts/${id}/protection`) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-hig-sm bg-hig-green/10 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-hig-green" />
                  </div>
                  <div>
                    <p className="font-medium leading-none mb-0.5">Insurance Planner</p>
                    <p className="text-hig-caption2 text-hig-text-secondary leading-none">Quick planner</p>
                  </div>
                  {contact.protectionPlan && (
                    <CheckCircle2 size={14} className="ml-auto text-hig-green shrink-0" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Contact Summary */}
        <div className="w-72 shrink-0 space-y-4">
          <div className="hig-card p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-hig-blue/10 text-hig-blue flex items-center justify-center text-hig-headline font-bold">
                  {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-hig-headline">{contact.name}</h2>
                  <p className="text-hig-caption1 text-hig-text-secondary">Age {age}</p>
                </div>
              </div>
              <button onClick={openEdit} className="p-1.5 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary hover:text-hig-blue transition-colors">
                <Pencil size={15} />
              </button>
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
            <div className="pt-1">
              <div className="flex items-center gap-1 mb-1.5">
                <Tag size={12} className="text-hig-text-secondary" />
                <span className="text-hig-caption2 text-hig-text-secondary font-semibold uppercase tracking-wide">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-hig-caption1 px-2 py-0.5 rounded-full bg-hig-blue/10 text-hig-blue font-medium">
                    {t}
                    <button
                      onClick={() => removeTag([contact.id], t)}
                      className="text-hig-blue/60 hover:text-hig-blue transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {['Client', 'Prospect'].filter((t) => !contact.tags.includes(t)).map((t) => (
                  <button
                    key={t}
                    onClick={() => addTag([contact.id], t)}
                    className="text-hig-caption1 px-2 py-0.5 rounded-full border border-dashed border-hig-gray-3 text-hig-text-secondary hover:border-hig-blue hover:text-hig-blue transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
            {contact.notes && (
              <p className="text-hig-caption1 text-hig-text-secondary pt-1 border-t border-hig-gray-5">
                {contact.notes}
              </p>
            )}
          </div>

          {/* Financial Overview — Cash Flow + Net Worth */}
          {sidebarFinancial?.hasData && (
            <div className="hig-card p-4 space-y-3">
              <h3 className="text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
                Financial Overview
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTab('finances')}
                  className="rounded-hig-sm p-2.5 bg-hig-gray-6 hover:bg-hig-gray-5 transition-colors text-left"
                >
                  <p className="text-hig-caption2 text-hig-text-secondary font-medium mb-0.5">Net Worth</p>
                  <p className={`text-hig-subhead font-bold leading-tight ${sidebarFinancial.netWorth >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
                    {fmtRM(sidebarFinancial.netWorth)}
                  </p>
                </button>
                <button
                  onClick={() => setTab('finances')}
                  className="rounded-hig-sm p-2.5 bg-hig-gray-6 hover:bg-hig-gray-5 transition-colors text-left"
                >
                  <p className="text-hig-caption2 text-hig-text-secondary font-medium mb-0.5">Monthly CF</p>
                  <p className={`text-hig-subhead font-bold leading-tight ${sidebarFinancial.monthlyCashFlow >= 0 ? 'text-hig-text' : 'text-hig-red'}`}>
                    {fmtRM(sidebarFinancial.monthlyCashFlow)}
                  </p>
                </button>
              </div>
              <button
                onClick={launchCashFlow}
                className="w-full flex items-center gap-2 text-hig-caption1 text-hig-blue hover:text-hig-blue/80 transition-colors"
              >
                <BarChart2 size={13} />
                <span>View full projection →</span>
              </button>
            </div>
          )}
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
                <div className="mt-3 space-y-2">
                  {contact.interactions
                    .filter((i) => i.type === 'note')
                    .map((n) => (
                      <div key={n.id} className="flex gap-3 py-2 border-t border-hig-gray-5">
                        <FileText size={15} className="text-hig-text-secondary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-hig-subhead">{n.content}</p>
                          <p className="text-hig-caption1 text-hig-text-secondary mt-0.5">{fmtDate(n.date)}</p>
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
                        <span className="text-hig-caption1 text-hig-text-secondary">{fmtDate(t.dueDate)}</span>
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
                        <span className="text-hig-caption1 text-hig-text-secondary">{fmtDate(a.date)}</span>
                        <span className="text-hig-caption2 px-2 py-0.5 rounded-full bg-hig-gray-6 text-hig-text-secondary">{a.type}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'finances' && (
            <FinancesTab
              contact={contact}
              onUpdateFinancials={(contactId, updates) => {
                saveFinancials(contactId, updates.financials)
              }}
            />
          )}
        </div>
      </div>

      {/* Cash Flow — Financial Info gate prompt */}
      {showCFPrompt && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCFPrompt(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-md p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-hig-sm bg-orange-100 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-orange-500" />
              </div>
              <button onClick={() => setShowCFPrompt(false)} className="p-1.5 rounded-hig-sm hover:bg-hig-gray-6 text-hig-text-secondary">
                <X size={16} />
              </button>
            </div>
            <h2 className="text-hig-title3 mb-1">Financial Info needed</h2>
            <p className="text-hig-subhead text-hig-text-secondary mb-5">
              The Cash Flow Projection needs at least one income or expense entry to run.
              Head to the Finances tab and fill in the Financial Info section first.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCFPrompt(false)} className="hig-btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => { setShowCFPrompt(false); setTab('finances') }}
                className="hig-btn-primary flex-1 gap-1.5"
              >
                Set up Financial Info <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditForm && (
        <EditContactModal
          editForm={editForm} setEditForm={setEditForm}
          onClose={() => setShowEditForm(false)} onSubmit={handleEditSubmit}
        />
      )}
    </div>
  )
}

// ── Edit Contact Modal ────────────────────────────────────────────────────────
function EditContactModal({ editForm, setEditForm, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-hig-title3">Edit Contact</h2>

        <div>
          <label className="hig-label">Name <span className="text-hig-red">*</span></label>
          <input value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="hig-input" placeholder="Full name" required />
        </div>
        <div>
          <label className="hig-label">Date of Birth <span className="text-hig-red">*</span></label>
          <input type="date" value={editForm.dob || ''} onChange={(e) => setEditForm({...editForm, dob: e.target.value})} className="hig-input" required />
        </div>
        <div>
          <label className="hig-label">Mobile</label>
          <input value={editForm.mobile || ''} onChange={(e) => setEditForm({...editForm, mobile: e.target.value})} className="hig-input" placeholder="012-3456789" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="hig-label">Employment Status</label>
            <select value={editForm.employment || ''} onChange={(e) => setEditForm({...editForm, employment: e.target.value})} className="hig-input">
              <option value="">Select...</option>
              <option>Employed</option>
              <option>Self-Employed</option>
              <option>Unemployed</option>
              <option>Retired</option>
            </select>
          </div>
          <div>
            <label className="hig-label">Retirement Age</label>
            <input
              type="number" min={40} max={80}
              value={editForm.retirementAge ?? 55}
              onChange={(e) => setEditForm({...editForm, retirementAge: parseInt(e.target.value) || 55})}
              className="hig-input"
              placeholder="55"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="hig-label">Review Date</label>
            <input type="date" value={editForm.reviewDate || ''} onChange={(e) => setEditForm({...editForm, reviewDate: e.target.value})} className="hig-input" />
          </div>
          <div>
            <label className="hig-label">Review Frequency</label>
            <select value={editForm.reviewFrequency || ''} onChange={(e) => setEditForm({...editForm, reviewFrequency: e.target.value})} className="hig-input">
              <option value="">Select...</option>
              <option>Annually</option>
              <option>Semi-annually</option>
              <option>Quarterly</option>
            </select>
          </div>
        </div>
        <div>
          <label className="hig-label">Notes</label>
          <textarea value={editForm.notes || ''} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} className="hig-input min-h-[80px] resize-y" placeholder="Any notes..." />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="hig-btn-secondary">Cancel</button>
          <button type="submit" className="hig-btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  )
}
