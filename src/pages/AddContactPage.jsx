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
import { useLanguage } from '../hooks/useLanguage'
import {
  ArrowLeft, User, Phone, Mail, Briefcase, Calendar,
  ChevronRight, Shield, Target, Check, AlertCircle,
  Users, Building2, GraduationCap, Umbrella, HelpCircle,
  UserCheck, MessageSquare, TrendingUp, Clock,
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
    <div className="mb-8">
      <div className="mb-3.5">
        <h3 className="text-hig-caption1 font-bold uppercase tracking-wider text-hig-text-secondary m-0">
          {title}
        </h3>
        {hint && <p className="text-hig-caption1 text-hig-gray-3 mt-0.5">{hint}</p>}
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
  const { t } = useLanguage()
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

  // Translated options (inside component so t() is available)
  const EMPLOYMENT_OPTS = [
    { key: 'Employed',      label: t('contacts.empEmployed'),      Icon: Briefcase,    color: '#2E96FF' },
    { key: 'Self-Employed', label: t('contacts.empSelfEmployed'),   Icon: UserCheck,    color: '#34C759' },
    { key: 'Business Owner',label: t('contacts.empBusinessOwner'),  Icon: Building2,    color: '#FF9500' },
    { key: 'Retired',       label: t('contacts.empRetired'),        Icon: Umbrella,     color: '#AF52DE' },
    { key: 'Student',       label: t('contacts.empStudent'),        Icon: GraduationCap,color: '#30B0C7' },
    { key: 'Other',         label: t('contacts.empOther'),          Icon: HelpCircle,   color: '#8E8E93' },
  ]

  const REVIEW_FREQ_OPTS = [
    { key: 'Annually',      label: t('contacts.freqAnnually')    },
    { key: 'Semi-annually', label: t('contacts.freqSemiAnnual')  },
    { key: 'Quarterly',     label: t('contacts.freqQuarterly')   },
  ]

  const STAGE_DESCS = {
    Lead:     t('contacts.stageLeadDesc'),
    Prospect: t('contacts.stageProspectDesc'),
    Proposal: t('contacts.stageProposalDesc'),
    Client:   t('contacts.stageClientDesc'),
  }

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = {...e}; delete n[key]; return n })
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())  errs.name = t('contacts.errNameRequired')
    if (!form.dob)          errs.dob  = t('contacts.errDobRequired')
    else if (age === null || age < 0 || age > 100) errs.dob = t('contacts.errDobInvalid')
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

  // inputCls: base hig-input with optional error border override
  const inputCls = (hasError) =>
    `hig-input${hasError ? ' border-hig-red focus:border-hig-red focus:ring-hig-red/20' : ''}`

  return (
    <div className="max-w-[1000px] mx-auto pb-16">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          className="hig-btn-ghost gap-1.5 text-hig-text-secondary
                     border border-hig-gray-4 hover:border-hig-blue hover:text-hig-blue"
        >
          <ArrowLeft size={14} /> {t('contacts.title')}
        </button>
        <div>
          <h1 className="text-hig-title2 text-hig-text m-0 leading-tight">
            {t('contacts.modalTitle')}
          </h1>
          <p className="text-hig-footnote text-hig-text-secondary mt-0.5">
            {t('contacts.addSubtitle')}
          </p>
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div className="flex gap-7 items-start">

        {/* ── Form column ──────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-w-0"
          noValidate
        >

          {/* ─ Section: Identity ──────────────────────────────────────── */}
          <Section title={t('contacts.sectionIdentity')} hint={t('contacts.sectionIdentityHint')}>
            {/* Name */}
            <div style={{ marginBottom: 12 }} data-error={errors.name || undefined}>
              <label className="hig-label">
                {t('contacts.fieldName')} <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Ahmad Bin Ali"
                className={`${inputCls(!!errors.name)} text-hig-headline font-medium`}
              />
              {errors.name && (
                <p className="flex items-center gap-1 text-hig-caption1 text-hig-red mt-1">
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            {/* DOB + age preview */}
            <div style={{ marginBottom: 4 }} data-error={errors.dob || undefined}>
              <label className="hig-label">
                {t('contacts.fieldDob')} <span style={{ color: '#FF3B30' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <DatePicker
                    value={form.dob}
                    onChange={v => set('dob', v)}
                    placeholder="Date of birth"
                    max={new Date().toISOString().slice(0, 10)}
                    error={!!errors.dob}
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
                        {t('contacts.yearsOld')}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: '#C7C7CC', fontWeight: 500 }}>Age</span>
                  )}
                </div>
              </div>
              {errors.dob && (
                <p className="flex items-center gap-1 text-hig-caption1 text-hig-red mt-1">
                  <AlertCircle size={12} /> {errors.dob}
                </p>
              )}
            </div>
          </Section>

          {/* ─ Section: Contact ───────────────────────────────────────── */}
          <Section title={t('contacts.sectionContactDet')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Mobile */}
              <div>
                <label className="hig-label">
                  {t('contacts.fieldMobile')}
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
                    className={`${inputCls(false)} pl-9`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="hig-label">
                  {t('contacts.email')}
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
                    className={`${inputCls(false)} pl-9`}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ─ Section: Pipeline ──────────────────────────────────────── */}
          <Section title={t('contacts.sectionPipeline')} hint={t('contacts.pipelineHint')}>
            {/* Stage pills */}
            <div style={{ marginBottom: 16 }}>
              <label className="hig-label mb-2.5">
                {t('contacts.fieldStage')}
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
                      }}>{t(`contacts.stage${s.key}`)}</span>
                      {active && <Check size={13} style={{ color: s.color }} />}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: '#C7C7CC', marginTop: 8 }}>
                {STAGE_DESCS[form.stage]}
              </p>
            </div>

            {/* Referred by */}
            <div>
              <label className="hig-label">
                {t('contacts.referredBy')}
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
                  placeholder={t('contacts.referredByPh')}
                  className={`${inputCls(false)} pl-9`}
                />
              </div>
            </div>
          </Section>

          {/* ─ Section: Employment ────────────────────────────────────── */}
          <Section title={t('contacts.sectionBackground')} hint={t('contacts.backgroundHint')}>
            {/* Employment cards */}
            <div style={{ marginBottom: 16 }}>
              <label className="hig-label mb-2.5">
                {t('contacts.fieldEmployment')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {EMPLOYMENT_OPTS.map(opt => {
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
              <label className="hig-label mb-2.5">
                {t('contacts.monthlyIncome')}
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
          <Section title={t('contacts.fieldNotes')} hint={t('contacts.placeholderNotes')}>
            <div style={{ position: 'relative' }}>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Referral context, goals mentioned, key objections, urgency..."
                maxLength={500}
                className={inputCls(false)}
                style={{ minHeight: 96, resize: 'vertical' }}
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
              {showOptional ? t('contacts.hideDefaults') : t('contacts.showDefaults')}
            </button>

            {showOptional && (
              <div className="mt-3 p-5 rounded-hig-sm bg-hig-bg border border-hig-gray-5
                              flex flex-col gap-3.5">
                <p className="text-hig-caption1 font-bold uppercase tracking-wider text-hig-text-secondary m-0">
                  {t('contacts.planningDefaults')}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="hig-label">
                      {t('contacts.fieldRetAge')}
                    </label>
                    <input
                      type="number" min={40} max={80}
                      value={form.retirementAge}
                      onChange={e => set('retirementAge', parseInt(e.target.value) || 55)}
                      className={inputCls(false)}
                    />
                  </div>
                  <div>
                    <label className="hig-label">
                      {t('contacts.firstReviewDate')}
                    </label>
                    <DatePicker
                      value={form.reviewDate}
                      onChange={v => set('reviewDate', v)}
                      placeholder="Select review date"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E', display: 'block', marginBottom: 8 }}>
                    {t('contacts.fieldReviewFreq')}
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {REVIEW_FREQ_OPTS.map(f => {
                      const active = form.reviewFrequency === f.key
                      return (
                        <button
                          key={f.key} type="button"
                          onClick={() => set('reviewFrequency', f.key)}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            border: `1.5px solid ${active ? '#2E96FF' : '#E5E5EA'}`,
                            background: active ? '#EBF5FF' : 'white',
                            fontSize: 12, fontWeight: active ? 700 : 500,
                            color: active ? '#2E96FF' : '#636366',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {f.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─ Submit actions ─────────────────────────────────────────── */}
          <div className="flex gap-2.5 items-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/contacts')}
              className="hig-btn-secondary"
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="hig-btn-primary flex-1 gap-2"
              style={{
                background: submitting ? undefined : 'linear-gradient(135deg, #2E96FF, #007AFF)',
                boxShadow: submitting ? 'none' : '0 2px 8px rgba(46,150,255,0.30)',
              }}
            >
              {submitting ? t('contacts.creating') : t('contacts.createContact')}
              {!submitting && <ChevronRight size={15} />}
            </button>
          </div>

          {/* Required fields notice */}
          <p className="text-hig-caption1 text-hig-gray-3 mt-2.5 text-center">
            {t('contacts.nameAndDobNote')}
          </p>

        </form>

        {/* ── Preview column (desktop only) ─────────────────────────── */}
        <div className="hidden lg:block w-[300px] shrink-0">
          <PreviewCard form={form} age={age} />
        </div>

      </div>
    </div>
  )
}
