import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import {
  Plus, Search, Trash2, Tag, MoreHorizontal,
  ChevronRight, Phone, Calendar, AlertCircle,
} from 'lucide-react'

const TAG_COLORS = {
  Client: 'bg-green-50 text-green-700',
  Prospect: 'bg-blue-50 text-hig-blue',
}

export default function ContactsPage() {
  const { contacts, contactsLoading, contactsError, addContact, deleteContacts, addTag } = useContacts()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialise from URL ?q= param (set by TopBar global search or direct links)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [selected, setSelected] = useState(new Set())
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true')
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '', dob: '', mobile: '', employment: '', reviewDate: '',
    reviewFrequency: '', notes: '',
  })

  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [contacts, search])

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((c) => c.id)))
    }
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.name || !form.dob) return
    const c = addContact(form)
    setForm({ name: '', dob: '', mobile: '', employment: '', reviewDate: '', reviewFrequency: '', notes: '' })
    setShowForm(false)
    setSearchParams({})
    navigate(`/contacts/${c.id}`)
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    deleteContacts([...selected])
    setSelected(new Set())
    setShowBulkMenu(false)
  }

  const handleBulkTag = (tag) => {
    if (selected.size === 0) return
    addTag([...selected], tag)
    setShowBulkMenu(false)
  }

  const getAge = (dob) => {
    const d = new Date(dob)
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return age
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-hig-title2">Contacts</h1>
        <button onClick={() => setShowForm(true)} className="hig-btn-primary gap-2">
          <Plus size={18} />
          Add New Contact
        </button>
      </div>

      {/* Search + Bulk Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => {
              const val = e.target.value
              setSearch(val)
              setSearchParams(val ? { q: val } : {})
            }}
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white border border-hig-gray-4
                       text-hig-subhead outline-none focus:border-hig-blue focus:ring-2
                       focus:ring-hig-blue/20 transition-all duration-hig"
          />
        </div>
        {selected.size > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className="hig-btn-secondary gap-2"
            >
              <MoreHorizontal size={16} />
              {selected.size} selected
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 z-50">
                <button onClick={() => handleBulkTag('Client')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                  <Tag size={14} /> Tag as Client
                </button>
                <button onClick={() => handleBulkTag('Prospect')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                  <Tag size={14} /> Tag as Prospect
                </button>
                <hr className="my-1 border-hig-gray-5" />
                <button onClick={handleBulkDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead text-hig-red hover:bg-red-50">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="hig-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_140px_120px_100px_80px] items-center px-4 py-3 bg-hig-gray-6 border-b border-hig-gray-5 text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={filtered.length > 0 && selected.size === filtered.length}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-hig-blue"
            />
          </label>
          <span>Name</span>
          <span>Mobile</span>
          <span>Review Date</span>
          <span>Tags</span>
          <span></span>
        </div>

        {/* Rows */}
        {contactsError ? (
          <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} style={{ color: '#FF3B30' }} />
            </div>
            <p className="text-hig-subhead font-medium" style={{ color: '#FF3B30' }}>Failed to load contacts</p>
            <p className="text-hig-caption1 text-hig-text-secondary">{contactsError}</p>
          </div>
        ) : contactsLoading ? (
          <div className="px-4 py-12 text-center text-hig-subhead text-hig-text-secondary">
            Loading contacts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-hig-subhead text-hig-text-secondary">
            {search ? 'No contacts match your search.' : 'No contacts yet. Add your first client.'}
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[40px_1fr_140px_120px_100px_80px] items-center px-4 py-3
                         border-b border-hig-gray-5 last:border-b-0 hover:bg-hig-gray-6/50
                         transition-colors cursor-pointer"
              onClick={() => navigate(`/contacts/${c.id}`)}
            >
              <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="w-4 h-4 rounded accent-hig-blue"
                />
              </label>
              <div>
                <p className="text-hig-subhead font-medium text-hig-text">{c.name}</p>
                <p className="text-hig-caption1 text-hig-text-secondary">Age {getAge(c.dob)}</p>
              </div>
              <div className="flex items-center gap-1.5 text-hig-subhead text-hig-text-secondary">
                {c.mobile && <Phone size={13} />}
                {c.mobile || '—'}
              </div>
              <div className="flex items-center gap-1.5 text-hig-subhead text-hig-text-secondary">
                {c.reviewDate && <Calendar size={13} />}
                {c.reviewDate
                  ? new Date(c.reviewDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
              <div className="flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <span key={t} className={`text-hig-caption2 px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[t] || 'bg-hig-gray-6 text-hig-text-secondary'}`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex justify-end">
                <ChevronRight size={16} className="text-hig-text-secondary" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setSearchParams({}) }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
            className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-hig-title3">Add New Contact</h2>

            <div>
              <label className="hig-label">Name <span className="text-hig-red">*</span></label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="hig-input" placeholder="Full name" required />
            </div>
            <div>
              <label className="hig-label">Date of Birth <span className="text-hig-red">*</span></label>
              <input type="date" value={form.dob} onChange={(e) => setForm({...form, dob: e.target.value})} className="hig-input" required />
            </div>
            <div>
              <label className="hig-label">Mobile</label>
              <input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} className="hig-input" placeholder="012-3456789" />
            </div>
            <div>
              <label className="hig-label">Employment Status</label>
              <select value={form.employment} onChange={(e) => setForm({...form, employment: e.target.value})} className="hig-input">
                <option value="">Select...</option>
                <option>Employed</option>
                <option>Self-Employed</option>
                <option>Unemployed</option>
                <option>Retired</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="hig-label">Review Date</label>
                <input type="date" value={form.reviewDate} onChange={(e) => setForm({...form, reviewDate: e.target.value})} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Review Frequency</label>
                <select value={form.reviewFrequency} onChange={(e) => setForm({...form, reviewFrequency: e.target.value})} className="hig-input">
                  <option value="">Select...</option>
                  <option>Annually</option>
                  <option>Semi-annually</option>
                  <option>Quarterly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="hig-label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="hig-input min-h-[80px] resize-y" placeholder="Any notes..." />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setSearchParams({}) }} className="hig-btn-secondary">Cancel</button>
              <button type="submit" className="hig-btn-primary">Add Contact</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
