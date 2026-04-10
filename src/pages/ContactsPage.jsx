import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import { useLanguage } from '../hooks/useLanguage'
import {
  Plus, Search, Trash2, Tag, MoreHorizontal,
  ChevronRight, Phone, Calendar, AlertCircle,
  Target, Shield, CheckCircle2,
} from 'lucide-react'

const TAG_COLORS = {
  Client: 'bg-green-50 text-green-700',
  Prospect: 'bg-blue-50 text-hig-blue',
}

const getLastActivity = (contact) => {
  const dates = [
    ...(contact.activities || []).map((a) => a.date),
    ...(contact.interactions || []).map((i) => i.date),
  ].filter(Boolean).map((d) => new Date(d)).filter((d) => !isNaN(d))
  if (!dates.length) return null
  return new Date(Math.max(...dates))
}

export default function ContactsPage() {
  const { contacts, contactsLoading, contactsError, addContact, deleteContacts, addTag } = useContacts()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()

  // Initialise from URL ?q= param (set by TopBar global search or direct links)
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [selected, setSelected] = useState(new Set())
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true')
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  // keep bulk selection internal only — checkboxes removed from UI

  // Form state
  const [form, setForm] = useState({
    name: '', dob: '', mobile: '', employment: '', retirementAge: 55,
    reviewDate: '', reviewFrequency: '', notes: '',
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
    setForm({ name: '', dob: '', mobile: '', employment: '', retirementAge: 55, reviewDate: '', reviewFrequency: '', notes: '' })
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-hig-title2">{t('contacts.title')}</h1>
        <button onClick={() => setShowForm(true)} className="hig-btn-primary w-full justify-center gap-2 sm:w-auto">
          <Plus size={18} />
          {t('contacts.addNew')}
        </button>
      </div>

      {/* Search + Bulk Actions */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary" />
          <input
            type="text"
            placeholder={t('contacts.searchPlaceholder')}
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
              {selected.size} {t('contacts.selected')}
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-hig shadow-hig-lg border border-hig-gray-5 py-1 z-50">
                <button onClick={() => handleBulkTag('Client')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                  <Tag size={14} /> {t('contacts.tagAsClient')}
                </button>
                <button onClick={() => handleBulkTag('Prospect')} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead hover:bg-hig-gray-6">
                  <Tag size={14} /> {t('contacts.tagAsProspect')}
                </button>
                <hr className="my-1 border-hig-gray-5" />
                <button onClick={handleBulkDelete} className="w-full flex items-center gap-2 px-4 py-2.5 text-hig-subhead text-hig-red hover:bg-red-50">
                  <Trash2 size={14} /> {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="hig-card overflow-hidden">

        {/* ── Table header (tablet+) ── */}
        <div className="hidden md:grid grid-cols-[1fr_130px_60px_120px_48px] items-center
                        px-4 py-3 bg-hig-gray-6 border-b border-hig-gray-5
                        text-hig-caption1 font-semibold text-hig-text-secondary uppercase tracking-wide">
          <span>{t('contacts.colName')}</span>
          <span>{t('contacts.colLastActivity')}</span>
          <span className="text-center">{t('contacts.colPlans')}</span>
          <span>{t('contacts.colTags')}</span>
          <span></span>
        </div>

        {/* State: error / loading / empty */}
        {contactsError ? (
          <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} style={{ color: '#FF3B30' }} />
            </div>
            <p className="text-hig-subhead font-medium" style={{ color: '#FF3B30' }}>{t('contacts.loadFailed')}</p>
            <p className="text-hig-caption1 text-hig-text-secondary">{contactsError}</p>
          </div>
        ) : contactsLoading ? (
          <div className="px-4 py-12 text-center text-hig-subhead text-hig-text-secondary">
            {t('contacts.loadingMsg')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-hig-subhead text-hig-text-secondary">
            {search ? t('contacts.noMatch') : t('contacts.noContacts')}
          </div>
        ) : filtered.map((c) => {
          const lastActivity = getLastActivity(c)
          return (
            <div
              key={c.id}
              className="border-b border-hig-gray-5 last:border-b-0 hover:bg-hig-gray-6/50
                         transition-colors cursor-pointer"
              onClick={() => navigate(`/contacts/${c.id}`)}
            >
              {/* ── Mobile card view ── */}
              <div className="md:hidden flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-hig-blue/10 text-hig-blue
                                flex items-center justify-center text-hig-caption1 font-bold shrink-0">
                  {c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-hig-subhead font-semibold text-hig-text truncate">{c.name}</p>
                    {c.tags.map((t) => (
                      <span key={t} className={`text-hig-caption2 px-1.5 py-0 rounded-full font-medium shrink-0 ${TAG_COLORS[t] || 'bg-hig-gray-6 text-hig-text-secondary'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-hig-caption1 text-hig-text-secondary">
                    <span>{t('common.age')} {getAge(c.dob)}</span>
                    {c.mobile && <><span>·</span><span className="flex items-center gap-0.5"><Phone size={10} /> {c.mobile}</span></>}
                    {lastActivity && <><span>·</span><span>{lastActivity.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.retirementPlan
                    ? <CheckCircle2 size={13} className="text-hig-blue" />
                    : <Target size={13} className="text-hig-gray-3" />
                  }
                  {c.protectionPlan
                    ? <CheckCircle2 size={13} className="text-hig-green" />
                    : <Shield size={13} className="text-hig-gray-3" />
                  }
                  <ChevronRight size={15} className="text-hig-text-secondary ml-1" />
                </div>
              </div>

              {/* ── Tablet+ table row ── */}
              <div className="hidden md:grid grid-cols-[1fr_130px_60px_120px_48px] items-center px-4 py-3">
                <div>
                  <p className="text-hig-subhead font-medium text-hig-text">{c.name}</p>
                  <p className="text-hig-caption1 text-hig-text-secondary">
                    {t('common.age')} {getAge(c.dob)}
                    {c.mobile && <span className="ml-2 inline-flex items-center gap-1"><Phone size={11} /> {c.mobile}</span>}
                  </p>
                </div>
                <div className="text-hig-caption1 text-hig-text-secondary">
                  {lastActivity
                    ? lastActivity.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  {c.retirementPlan
                    ? <CheckCircle2 size={14} className="text-hig-blue" title="Retirement plan active" />
                    : <Target size={14} className="text-hig-gray-3" title="No retirement plan" />
                  }
                  {c.protectionPlan
                    ? <CheckCircle2 size={14} className="text-hig-green" title="Protection plan active" />
                    : <Shield size={14} className="text-hig-gray-3" title="No protection plan" />
                  }
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
            </div>
          )
        })}
      </div>

      {/* Add Contact Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setSearchParams({}) }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
            className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-hig-title3">{t('contacts.modalTitle')}</h2>

            <div>
              <label className="hig-label">{t('contacts.fieldName')} <span className="text-hig-red">*</span></label>
              <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="hig-input" placeholder={t('contacts.placeholderName')} required />
            </div>
            <div>
              <label className="hig-label">{t('contacts.fieldDob')} <span className="text-hig-red">*</span></label>
              <input type="date" value={form.dob} onChange={(e) => setForm({...form, dob: e.target.value})} className="hig-input" required />
            </div>
            <div>
              <label className="hig-label">{t('contacts.fieldMobile')}</label>
              <input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} className="hig-input" placeholder="012-3456789" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="hig-label">{t('contacts.fieldEmployment')}</label>
                <select value={form.employment} onChange={(e) => setForm({...form, employment: e.target.value})} className="hig-input">
                  <option value="">Select...</option>
                  <option>{t('contacts.empEmployed')}</option>
                  <option>{t('contacts.empSelfEmployed')}</option>
                  <option>{t('contacts.empUnemployed')}</option>
                  <option>{t('contacts.empRetired')}</option>
                </select>
              </div>
              <div>
                <label className="hig-label">{t('contacts.fieldRetAge')}</label>
                <input
                  type="number" min={40} max={80}
                  value={form.retirementAge ?? 55}
                  onChange={(e) => setForm({...form, retirementAge: parseInt(e.target.value) || 55})}
                  className="hig-input"
                  placeholder="55"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="hig-label">{t('contacts.fieldReviewDate')}</label>
                <input type="date" value={form.reviewDate} onChange={(e) => setForm({...form, reviewDate: e.target.value})} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">{t('contacts.fieldReviewFreq')}</label>
                <select value={form.reviewFrequency} onChange={(e) => setForm({...form, reviewFrequency: e.target.value})} className="hig-input">
                  <option value="">Select...</option>
                  <option>{t('contacts.freqAnnually')}</option>
                  <option>{t('contacts.freqSemiAnnual')}</option>
                  <option>{t('contacts.freqQuarterly')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="hig-label">{t('contacts.fieldNotes')}</label>
              <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="hig-input min-h-[80px] resize-y" placeholder={t('contacts.placeholderNotes')} />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setShowForm(false); setSearchParams({}) }} className="hig-btn-secondary">{t('common.cancel')}</button>
              <button type="submit" className="hig-btn-primary">{t('contacts.btnAdd')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
