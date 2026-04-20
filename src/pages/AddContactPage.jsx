/**
 * AddContactPage — Full-page intake form for new contacts
 *
 * Route: /contacts/new
 *
 * Design principles:
 * · Speed — advisors add contacts on the go; minimum required fields, smart defaults
 * · Visual selectors — employment cards, stage pills, income brackets (not dropdowns)
 * · Live preview — right sidebar updates as you type (desktop only)
 * · Progressive disclosure — essential above fold, optional below
 * · Instant DOB → age calculation
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContacts } from '../hooks/useContacts'
import {
  ArrowLeft, User, Phone, Mail, Briefcase, Calendar,
  ChevronRight, Shield, Target, Check, AlertCircle,
  Users, Building2, GraduationCap, Umbrella, HelpCircle,
  UserCheck, MessageSquare, TrendingUp, Clock,
} from 'lucide-react'
import { STAGES } from './ContactsPage'

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYMENT_OPTIONS = [
  { key: 'Employed',      label: 'Employed',      Icon: Briefcase,    color: '#2E96FF' },
  { key: 'Self-Employed', label: 'Self-Employed',  Icon: UserCheck,    color: '#34C759' },
  { key: 'Business Owner',label: 'Business Owner', Icon: Building2,    color: '#FF9500' },
  { key: 'Retired',       label: 'Retired',        Icon: Umbrella,     color: '#AF52DE' },
  { key: 'Student',       label: 'Student',        Icon: GraduationCap,color: '#30B0C7' },
  { key: 'Other',         label: 'Other',          Icon: HelpCircle,   color: '#8E8E93' },
]

const INCOME_BRACKETS = [
  { key: 'below-3k',  label: '< RM 3k',    sub: 'per month' },
  { key: '3k-6k',     label: 'RM 3–6k',    sub: 'per month' },
  { key: '6k-15k',    label: 'RM 6–15k',   sub: 'per month' },
  { key: '15k-30k',   label: 'RM 15–30k',  sub: 'per month' },
  { key: 'above-30k', label: 'RM 30k+',    sub: 'per month' },
]

const REVIEW_FREQ = ['Annually', 'Semi-annually', 'Quarterly']

const PIPELINE_STAGES = STAGES.filter(s => s.key !== 'Dormant')

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

function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(n => n[0]?.toUpperCase()).slice(0, 2).join('') || '?'
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, hint }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#8E8E93', margin: 0,
        }}>{title}</h3>
        {hint && <p style={{ fontSize: 12, color: '#C7C7CC', marginTop: 2 }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Live Preview Card ────────────────────────────────────────────────────────

function PreviewCard({ form, age }) {
  const stage = PIPELINE_STAGES.find(s => s.key === form.stage) || PIPELINE_STAGES[0]
  const income = INCOME_BRACKETS.find(b => b.key === form.incomeBracket)
  const employment = EMPLOYMENT_OPTIONS.find(e => e.key === form.employment)
  const hasName = form.name.trim().length > 0

  return (
    <div style={{
      position: 'sticky', top: 24,
    }}>
      {/* Preview label */}
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: '#C7C7CC', marginBottom: 12,
      }}>
        Live Preview
      </p>

      {/* Contact card preview */}
      <div style={{
        background: 'white', borderRadius: 16,
        border: '1px solid #F2F2F7',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {/* Header strip */}
        <div style={{
          height: 4,
          background: hasName
            ? `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`
            : '#F2F2F7',
          transition: 'background 0.3s',
        }} />

        <div style={{ padding: '20px 20px 20px' }}>
          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: hasName ? '#2E96FF18' : '#F2F2F7',
              color: '#2E96FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800,
              transition: 'background 0.2s',
            }}>
              {hasName ? getInitials(form.name) : <User size={20} style={{ color: '#C7C7CC' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 16, fontWeight: 700,
                color: hasName ? '#1C1C1E' : '#C7C7CC',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}>
                {hasName ? form.name : 'Contact Name'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                {age !== null && (
                  <span style={{ fontSize: 12, color: '#8E8E93' }}>Age {age}</span>
                )}
                {/* Stage pill */}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                  background: stage.bg, color: stage.color,
                  transition: 'all 0.2s',
                }}>
                  {stage.label}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {form.mobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#636366' }}>{form.mobile}</span>
              </div>
            )}
            {form.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#636366', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.email}</span>
              </div>
            )}
            {employment && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <employment.Icon size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#636366' }}>{employment.label}</span>
                {income && <span style={{ fontSize: 12, color: '#8E8E93' }}>· {income.label}/mo</span>}
              </div>
            )}
            {form.referredBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={13} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#636366' }}>Referred by {form.referredBy}</span>
              </div>
            )}
          </div>

          {/* Coverage placeholder */}
          <div style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid #F2F2F7',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, color: '#C7C7CC', fontWeight: 500 }}>Coverage</span>
            {['L','M','CI','PA'].map(label => (
              <span key={label} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: '#F2F2F7', color: '#C7C7CC',
                fontSize: 8, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #E5E5EA',
              }}>{label}</span>
            ))}
            <span style={{ fontSize: 11, color: '#C7C7CC', marginLeft: 4 }}>— not yet assessed</span>
          </div>
        </div>
      </div>

      {/* Guidance notes */}
      <div style={{
        background: '#F9F9FB', borderRadius: 12,
        border: '1px solid #F2F2F7', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          What happens next
        </p>
        {[
          { Icon: Target,     color: '#2E96FF', text: 'Run retirement planning from the contact page' },
          { Icon: Shield,     color: '#34C759', text: 'Assess protection needs and send a proposal' },
          { Icon: TrendingUp, color: '#AF52DE', text: 'Build a cash flow projection (admin)' },
          { Icon: Clock,      color: '#FF9500', text: 'Set a review schedule to stay top-of-mind' },
        ].map(({ Icon, color, text }) => (
          <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, flexShrink: 0,
              background: `${color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={12} style={{ color }} />
            </div>
            <p style={{ fontSize: 12, color: '#636366', lineHeight: 1.4, margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  dob: '',
  mobile: '',
  email: '',
  employment: '',
  incomeBracket: '',
  stage: 'Lead',
  referredBy: '',
  retirementAge: 55,
  reviewDate: '',
  reviewFrequency: 'Annually',
  notes: '',
}

export default function AddContactPage() {
  const navigate   = useNavigate()
  const { addContact } = useContacts()
  const nameRef    = useRef(null)

  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  // Focus name on mount
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const age = useMemo(() => calcAge(form.dob), [form.dob])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = {...e}; delete n[key]; return n })
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())  errs.name = 'Full name is required'
    if (!form.dob)          errs.dob  = 'Date of birth is required'
    else if (age === null || age < 0 || age > 100) errs.dob = 'Enter a valid date of birth'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    const contact = addContact({ ...form, name: form.name.trim() })
    navigate(`/contacts/${contact.id}`)
  }

  const inputStyle = (hasError) => ({
    width: '100%', padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${hasError ? '#FF3B30' : '#E5E5EA'}`,
    fontSize: 15, color: '#1C1C1E',
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    background: 'white', boxSizing: 'border-box',
  })

  const handleInputFocus = e => {
    e.target.style.borderColor = '#2E96FF'
    e.target.style.boxShadow   = '0 0 0 3px rgba(46,150,255,0.12)'
  }
  const handleInputBlur = e => {
    e.target.style.borderColor = e.target.closest('[data-error]') ? '#FF3B30' : '#E5E5EA'
    e.target.style.boxShadow   = 'none'
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/contacts')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            border: '1.5px solid #E5E5EA', background: 'white',
            fontSize: 14, fontWeight: 500, color: '#636366',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E96FF'; e.currentTarget.style.color = '#2E96FF' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5EA'; e.currentTarget.style.color = '#636366' }}
        >
          <ArrowLeft size={14} /> Contacts
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', margin: 0, lineHeight: 1.2 }}>
            Add New Contact
          </h1>
          <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 3 }}>
            Create a contact profile to start planning
          </p>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* ── Form column ──────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{ flex: '1 1 0', minWidth: 0 }}
          noValidate
        >

          {/* ─ Section: Identity ──────────────────────────────────────── */}
          <Section title="Identity" hint="Required to create the contact">
            {/* Name */}
            <div style={{ marginBottom: 12 }} data-error={errors.name || undefined}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                Full Name <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Ahmad Bin Ali"
                style={{
                  ...inputStyle(!!errors.name),
                  fontSize: 17, fontWeight: 500,
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              {errors.name && (
                <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            {/* DOB + age preview */}
            <div style={{ marginBottom: 4 }} data-error={errors.dob || undefined}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                Date of Birth <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={e => set('dob', e.target.value)}
                    style={inputStyle(!!errors.dob)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
                {/* Live age badge */}
                <div style={{
                  minWidth: 80, height: 46,
                  borderRadius: 10,
                  background: age !== null ? '#2E96FF12' : '#F2F2F7',
                  border: `1.5px solid ${age !== null ? '#2E96FF30' : '#E5E5EA'}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  {age !== null ? (
                    <>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#2E96FF', lineHeight: 1 }}>
                        {age}
                      </span>
                      <span style={{ fontSize: 10, color: '#2E96FF', fontWeight: 500, marginTop: 1 }}>
                        years old
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: '#C7C7CC', fontWeight: 500 }}>Age</span>
                  )}
                </div>
              </div>
              {errors.dob && (
                <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={12} /> {errors.dob}
                </p>
              )}
            </div>
          </Section>

          {/* ─ Section: Contact ───────────────────────────────────────── */}
          <Section title="Contact Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Mobile */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                  Mobile
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#C7C7CC', pointerEvents: 'none',
                  }} />
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => set('mobile', e.target.value)}
                    placeholder="012-3456789"
                    style={{ ...inputStyle(false), paddingLeft: 36 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#C7C7CC', pointerEvents: 'none',
                  }} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="email@example.com"
                    style={{ ...inputStyle(false), paddingLeft: 36 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ─ Section: Pipeline ──────────────────────────────────────── */}
          <Section title="Pipeline" hint="Where is this contact in your sales process?">
            {/* Stage pills */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 10 }}>
                Stage
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PIPELINE_STAGES.map(s => {
                  const active = form.stage === s.key
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => set('stage', s.key)}
                      style={{
                        padding: '8px 18px', borderRadius: 24,
                        border: `2px solid ${active ? s.color : '#E5E5EA'}`,
                        background: active ? s.bg : 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 7,
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: active ? s.color : '#C7C7CC',
                        transition: 'background 0.15s',
                      }} />
                      <span style={{
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        color: active ? s.color : '#636366',
                        transition: 'all 0.15s',
                      }}>{s.label}</span>
                      {active && <Check size={13} style={{ color: s.color }} />}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: '#C7C7CC', marginTop: 8 }}>
                {form.stage === 'Lead' && 'Initial contact — needs assessment not started'}
                {form.stage === 'Prospect' && 'Needs identified — in active discussion'}
                {form.stage === 'Proposal' && 'Quotation sent — awaiting decision'}
                {form.stage === 'Client' && 'Active policyholder'}
              </p>
            </div>

            {/* Referred by */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                Referred By
              </label>
              <div style={{ position: 'relative' }}>
                <Users size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#C7C7CC', pointerEvents: 'none',
                }} />
                <input
                  type="text"
                  value={form.referredBy}
                  onChange={e => set('referredBy', e.target.value)}
                  placeholder="Who made the introduction?"
                  style={{ ...inputStyle(false), paddingLeft: 36 }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>
          </Section>

          {/* ─ Section: Employment ────────────────────────────────────── */}
          <Section title="Background" hint="Helps with planning assumptions">
            {/* Employment cards */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 10 }}>
                Employment Status
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {EMPLOYMENT_OPTIONS.map(opt => {
                  const active = form.employment === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => set('employment', active ? '' : opt.key)}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 12,
                        border: `2px solid ${active ? opt.color : '#E5E5EA'}`,
                        background: active ? `${opt.color}10` : 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 6,
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#D1D1D6'; e.currentTarget.style.background = '#FAFAFA' }}}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#E5E5EA'; e.currentTarget.style.background = 'white' }}}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: active ? `${opt.color}18` : '#F2F2F7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}>
                        <opt.Icon size={15} style={{ color: active ? opt.color : '#8E8E93', transition: 'color 0.15s' }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: active ? 700 : 500,
                        color: active ? opt.color : '#636366',
                        textAlign: 'center', lineHeight: 1.2,
                        transition: 'all 0.15s',
                      }}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Income bracket */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 10 }}>
                Monthly Income
              </label>
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                paddingBottom: 4,
              }}>
                {INCOME_BRACKETS.map(b => {
                  const active = form.incomeBracket === b.key
                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => set('incomeBracket', active ? '' : b.key)}
                      style={{
                        flexShrink: 0, padding: '9px 14px',
                        borderRadius: 10,
                        border: `2px solid ${active ? '#2E96FF' : '#E5E5EA'}`,
                        background: active ? '#EBF5FF' : 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{
                        fontSize: 12, fontWeight: active ? 700 : 600,
                        color: active ? '#2E96FF' : '#1C1C1E',
                        margin: 0, transition: 'color 0.15s',
                      }}>
                        {b.label}
                      </p>
                      <p style={{ fontSize: 10, color: active ? '#2E96FF99' : '#C7C7CC', margin: 0, marginTop: 1 }}>
                        {b.sub}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* ─ Section: Notes ─────────────────────────────────────────── */}
          <Section title="Notes" hint="Context for your first meeting, key observations">
            <div style={{ position: 'relative' }}>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Referral context, goals mentioned, key objections, urgency..."
                maxLength={500}
                style={{
                  ...inputStyle(false),
                  minHeight: 96, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.5,
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <span style={{
                position: 'absolute', bottom: 10, right: 12,
                fontSize: 11, color: form.notes.length > 450 ? '#FF9500' : '#C7C7CC',
              }}>
                {form.notes.length}/500
              </span>
            </div>
          </Section>

          {/* ─ Optional fields toggle ─────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 0', background: 'none', border: 'none',
                fontSize: 13, fontWeight: 600, color: '#2E96FF',
                cursor: 'pointer',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: '50%',
                background: '#EBF5FF', color: '#2E96FF', fontSize: 12,
                transition: 'transform 0.2s',
                transform: showOptional ? 'rotate(45deg)' : 'none',
              }}>+</span>
              {showOptional ? 'Hide' : 'Show'} planning defaults
            </button>

            {showOptional && (
              <div style={{
                marginTop: 12, padding: '20px',
                borderRadius: 12, background: '#FAFAFA',
                border: '1.5px solid #F2F2F7',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <p style={{ fontSize: 11, color: '#8E8E93', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                  Planning Defaults
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                      Retirement Age
                    </label>
                    <input
                      type="number" min={40} max={80}
                      value={form.retirementAge}
                      onChange={e => set('retirementAge', parseInt(e.target.value) || 55)}
                      style={inputStyle(false)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 6 }}>
                      First Review Date
                    </label>
                    <input
                      type="date"
                      value={form.reviewDate}
                      onChange={e => set('reviewDate', e.target.value)}
                      style={inputStyle(false)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 8 }}>
                    Review Frequency
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {REVIEW_FREQ.map(f => {
                      const active = form.reviewFrequency === f
                      return (
                        <button
                          key={f} type="button"
                          onClick={() => set('reviewFrequency', f)}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            border: `1.5px solid ${active ? '#2E96FF' : '#E5E5EA'}`,
                            background: active ? '#EBF5FF' : 'white',
                            fontSize: 12, fontWeight: active ? 700 : 500,
                            color: active ? '#2E96FF' : '#636366',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {f}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─ Submit actions ─────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            paddingTop: 8,
          }}>
            <button
              type="button"
              onClick={() => navigate('/contacts')}
              style={{
                padding: '12px 20px', borderRadius: 12,
                border: '1.5px solid #E5E5EA', background: 'white',
                fontSize: 14, fontWeight: 500, color: '#636366',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#C7C7CC' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5EA' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1, padding: '13px 24px', borderRadius: 12,
                border: 'none',
                background: submitting ? '#C7C7CC' : 'linear-gradient(135deg, #2E96FF, #007AFF)',
                fontSize: 14, fontWeight: 700, color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: submitting ? 'none' : '0 2px 8px rgba(46,150,255,0.30)',
              }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {submitting ? 'Creating…' : 'Create Contact'}
              {!submitting && <ChevronRight size={15} />}
            </button>
          </div>

          {/* Required fields notice */}
          <p style={{ fontSize: 12, color: '#C7C7CC', marginTop: 10, textAlign: 'center' }}>
            <span style={{ color: '#FF3B30' }}>*</span> Name and date of birth are required
          </p>

        </form>

        {/* ── Preview column (desktop only) ─────────────────────────── */}
        <div style={{ width: 300, flexShrink: 0 }} className="hidden lg:block">
          <PreviewCard form={form} age={age} />
        </div>

      </div>
    </div>
  )
}
