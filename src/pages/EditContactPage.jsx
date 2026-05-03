/**
 * EditContactPage — Full-page edit form for existing contacts
 *
 * Route: /contacts/:id/edit
 *
 * Design:
 * · Mirrors AddContactPage aesthetics — visual selectors, live preview
 * · Pre-populated from existing contact data
 * · Grouped sections: Identity, Contact, Employment, Planning, Notes
 * · Unsaved changes guard — prompts before navigating away
 * · Danger zone at bottom (delete contact)
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import {
  ArrowLeft, User, Phone, Mail, Briefcase, Calendar,
  Check, AlertCircle, Clock, Shield, Target,
  Users, Building2, GraduationCap, Umbrella, HelpCircle,
  UserCheck, Trash2, AlertTriangle, Save, X,
} from 'lucide-react'
import { STAGES } from './ContactsPage'
import DatePicker from '../components/ui/DatePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYMENT_OPTIONS = [
  { key: 'Employed',      label: 'Employed',      Icon: Briefcase,    color: '#2E96FF' },
  { key: 'Self-Employed', label: 'Self-Employed',  Icon: UserCheck,    color: '#34C759' },
  { key: 'Business Owner',label: 'Business Owner', Icon: Building2,    color: '#FF9500' },
  { key: 'Retired',       label: 'Retired',        Icon: Umbrella,     color: '#AF52DE' },
  { key: 'Student',       label: 'Student',        Icon: GraduationCap,color: '#30B0C7' },
  { key: 'Other',         label: 'Other',          Icon: HelpCircle,   color: '#8E8E93' },
]

const REVIEW_FREQ = ['Annually', 'Semi-annually', 'Quarterly']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d)) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  if (now.getMonth() < d.getMonth() ||
     (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

function nameHue(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h) % 360
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color = '#2E96FF' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={14} style={{ color }} />
      </div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', letterSpacing: '0.01em' }}>
        {label}
      </h3>
      <div style={{ flex: 1, height: 1, background: '#F2F2F7' }} />
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{
        fontSize: 12, fontWeight: 600, color: error ? '#FF3B30' : '#3C3C43',
        letterSpacing: '0.01em',
      }}>
        {label}{required && <span style={{ color: '#FF3B30', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={11} style={{ color: '#FF3B30' }} />
          <span style={{ fontSize: 11, color: '#FF3B30' }}>{error}</span>
        </div>
      )}
      {hint && !error && (
        <span style={{ fontSize: 11, color: '#8E8E93' }}>{hint}</span>
      )}
    </div>
  )
}

// ─── Employment Selector ──────────────────────────────────────────────────────

function EmploymentSelector({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {EMPLOYMENT_OPTIONS.map(({ key, label, Icon, color }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? '' : key)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '10px 8px', borderRadius: 10,
              border: active ? `2px solid ${color}` : '1.5px solid #E5E5EA',
              background: active ? `${color}0D` : 'white',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: active ? `${color}20` : '#F2F2F7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              <Icon size={15} style={{ color: active ? color : '#8E8E93' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? color : '#3C3C43', textAlign: 'center', lineHeight: 1.2 }}>
              {label}
            </span>
            {active && <Check size={10} style={{ color, marginTop: -2 }} />}
          </button>
        )
      })}
    </div>
  )
}

// ─── Stage Selector ───────────────────────────────────────────────────────────

function StagePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {STAGES.map(s => {
        const active = value === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20,
              border: active ? `2px solid ${s.color}` : '1.5px solid #E5E5EA',
              background: active ? s.bg : 'white',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? s.color : '#3C3C43' }}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-sm p-6">
        <div className="flex gap-3 items-start mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-hig-red" />
          </div>
          <div>
            <h3 className="text-hig-callout font-bold text-hig-text mb-1">Delete Contact</h3>
            <p className="text-hig-footnote text-hig-text-secondary leading-relaxed">
              This will permanently delete <strong>{name}</strong> and all their data including financials, timeline, and plans. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="hig-btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className="hig-btn-primary bg-hig-red hover:bg-red-600"
          >
            Delete Contact
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EditContactPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contacts, updateContact, deleteContacts } = useContacts()

  const contact = contacts.find(c => c.id === id)

  // Initialise form from contact
  const [form, setForm] = useState(() => contact ? {
    name:             contact.name || '',
    dob:              contact.dob || '',
    mobile:           contact.mobile || '',
    email:            contact.email || '',
    employment:       contact.employment || '',
    incomeBracket:    contact.incomeBracket || '',
    retirementAge:    contact.retirementAge ?? 55,
    stage:            contact.stage || 'Lead',
    reviewDate:       contact.reviewDate || '',
    reviewFrequency:  contact.reviewFrequency || '',
    notes:            contact.notes || '',
    tags:             contact.tags || [],
  } : {})

  const [errors,       setErrors]       = useState({})
  const [dirty,        setDirty]        = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saved,        setSaved]        = useState(false)

  const age = useMemo(() => calcAge(form.dob), [form.dob])
  const hue = useMemo(() => nameHue(form.name), [form.name])
  const initials = form.name
    ? form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Redirect if contact not found
  useEffect(() => {
    if (!contact) navigate('/contacts', { replace: true })
  }, [contact, navigate])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setDirty(true)
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name = 'Name is required'
    if (!form.dob)          e.dob  = 'Date of birth is required'
    if (form.dob && age === null) e.dob = 'Invalid date'
    if (form.mobile && !/^[0-9\-\+\s()]{7,15}$/.test(form.mobile.replace(/\s/g, '')))
      e.mobile = 'Enter a valid Malaysian mobile number'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    updateContact(id, {
      name:            form.name.trim(),
      dob:             form.dob,
      mobile:          form.mobile.trim(),
      email:           form.email.trim(),
      employment:      form.employment,
      incomeBracket:   form.incomeBracket,
      retirementAge:   Number(form.retirementAge) || 55,
      stage:           form.stage,
      reviewDate:      form.reviewDate,
      reviewFrequency: form.reviewFrequency,
      notes:           form.notes.trim(),
      tags:            form.tags,
    })
    setDirty(false)
    setSaved(true)
    setTimeout(() => {
      navigate(`/contacts/${id}`)
    }, 600)
  }

  function handleDelete() {
    deleteContacts([id])
    navigate('/contacts')
  }

  if (!contact) return null

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 48px' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, gap: 12,
      }}>
        <button
          type="button"
          onClick={() => navigate(`/contacts/${id}`)}
          className="hig-btn-ghost gap-1.5"
          style={{ marginLeft: -8 }}
        >
          <ArrowLeft size={16} />
          {contact.name}
        </button>

        {saved && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: '#34C759', fontWeight: 600,
          }}>
            <Check size={14} />
            Saved
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(`/contacts/${id}`)}
            className="hig-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="hig-btn-primary gap-2"
            style={{ opacity: dirty ? 1 : 0.6 }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Hero preview strip ──────────────────────────────────────────── */}
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            height: 72,
            background: `linear-gradient(135deg, hsl(${hue},70%,55%) 0%, hsl(${(hue+40)%360},65%,65%) 100%)`,
          }} />
          <div style={{ background: 'white', padding: '0 20px 20px', marginTop: -28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `hsl(${hue},70%,55%)`,
                border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ paddingBottom: 4 }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: form.name ? '#1C1C1E' : '#C7C7CC' }}>
                  {form.name || 'Contact Name'}
                </p>
                <p style={{ fontSize: 12, color: '#8E8E93' }}>
                  {age !== null ? `Age ${age}` : 'Age —'}
                  {form.employment ? ` · ${form.employment}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 1: Identity ─────────────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={User} label="Identity" color="#2E96FF" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Full Name" required error={errors.name}>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="hig-input"
                  placeholder="e.g. Ahmad bin Ali"
                  style={{ borderColor: errors.name ? '#FF3B30' : undefined }}
                />
              </Field>
            </div>
            <Field label="Date of Birth" required error={errors.dob}
              hint={age !== null ? `${age} years old` : undefined}>
              <DatePicker
                value={form.dob}
                onChange={v => set('dob', v)}
                placeholder="Date of birth"
                max={new Date().toISOString().slice(0, 10)}
                error={!!errors.dob}
              />
            </Field>
            <Field label="Retirement Age" hint="Used in retirement projections">
              <input
                type="number"
                min={40} max={80}
                value={form.retirementAge}
                onChange={e => set('retirementAge', parseInt(e.target.value) || 55)}
                className="hig-input"
              />
            </Field>
          </div>
        </div>

        {/* ── Section 2: Contact Details ───────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={Phone} label="Contact Details" color="#34C759" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Mobile Number" error={errors.mobile} hint="e.g. 012-3456789">
              <input
                type="tel"
                value={form.mobile}
                onChange={e => set('mobile', e.target.value)}
                className="hig-input"
                placeholder="012-3456789"
                style={{ borderColor: errors.mobile ? '#FF3B30' : undefined }}
              />
            </Field>
            <Field label="Email Address" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="hig-input"
                placeholder="email@example.com"
                style={{ borderColor: errors.email ? '#FF3B30' : undefined }}
              />
            </Field>
          </div>
        </div>

        {/* ── Section 3: Employment ───────────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={Briefcase} label="Employment" color="#FF9500" />
          <EmploymentSelector value={form.employment} onChange={v => set('employment', v)} />
        </div>

        {/* ── Section 4: Pipeline Stage ────────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={Target} label="Pipeline Stage" color="#AF52DE" />
          <StagePicker value={form.stage} onChange={v => set('stage', v)} />
        </div>

        {/* ── Section 5: Review Schedule ───────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={Clock} label="Review Schedule" color="#30B0C7" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Next Review Date">
              <DatePicker
                value={form.reviewDate}
                onChange={v => set('reviewDate', v)}
                placeholder="Select review date"
              />
            </Field>
            <Field label="Review Frequency">
              <select
                value={form.reviewFrequency}
                onChange={e => set('reviewFrequency', e.target.value)}
                className="hig-input"
              >
                <option value="">Select...</option>
                {REVIEW_FREQ.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── Section 6: Notes ────────────────────────────────────────────── */}
        <div className="hig-card p-5">
          <SectionHeader icon={Users} label="Notes" color="#8E8E93" />
          <Field label="Internal Notes" hint="Referral source, key context, family situation — not visible to client">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="hig-input"
              rows={3}
              style={{ resize: 'vertical', minHeight: 80 }}
              placeholder="e.g. Referred by David Lim. Wife is pregnant, expecting May 2025. Owns a F&B outlet in PJ."
            />
          </Field>
        </div>

        {/* ── Save button (bottom) ──────────────────────────────────────────── */}
        <button
          type="submit"
          className="hig-btn-primary"
          style={{ padding: '12px', fontSize: 15, borderRadius: 12 }}
        >
          Save Changes
        </button>

        {/* ── Danger zone ─────────────────────────────────────────────────── */}
        <div className="rounded-hig-lg p-5 bg-red-50 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-hig-subhead font-semibold text-hig-text mb-0.5">Delete Contact</p>
              <p className="text-hig-footnote text-hig-text-secondary leading-relaxed">
                Permanently removes {contact.name} and all associated data — financials, timeline, plans. Irreversible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-hig-sm
                         border border-hig-red bg-white text-hig-red
                         text-hig-footnote font-semibold cursor-pointer shrink-0
                         transition-colors hover:bg-red-50"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </form>

      {showDeleteModal && (
        <ConfirmDeleteModal
          name={contact.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
