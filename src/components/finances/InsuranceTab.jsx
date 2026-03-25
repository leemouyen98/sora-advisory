import { useState } from 'react'
import { Plus, Pencil, Trash2, Shield, X, ChevronDown, ChevronUp } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'

const POLICY_TYPES = [
  'Life',
  'Medical & Health',
  'Critical Illness',
  'Personal Accident',
  'Investment-Linked',
  'Endowment',
  'Term',
  'Whole Life',
]

const COMPANIES = [
  'Tokio Marine',
  'AIA',
  'Prudential',
  'Great Eastern',
  'Manulife',
  'Allianz',
  'Zurich',
  'AXA Affin',
  'Sun Life',
  'Other',
]

const EMPTY_POLICY = {
  policyNo: '',
  company: '',
  type: '',
  planName: '',
  sumAssured: 0,
  annualPremium: 0,
  monthlyPremium: 0,
  commencementDate: '',
  maturityDate: '',
  status: 'Active',
  notes: '',
  coverageDetails: {
    death: 0,
    tpd: 0,
    ci: 0,
    medicalCard: 0,
    paDb: 0,
  },
}

export default function InsuranceTab({ financials, onSave }) {
  const policies = financials.insurance || []
  const [editingIdx, setEditingIdx] = useState(null) // null | 'new' | index
  const [form, setForm] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState(null)

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalAnnualPremium = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const totalDeath = policies.reduce((s, p) => s + (Number(p.coverageDetails?.death) || 0), 0)
  const totalTPD = policies.reduce((s, p) => s + (Number(p.coverageDetails?.tpd) || 0), 0)
  const totalCI = policies.reduce((s, p) => s + (Number(p.coverageDetails?.ci) || 0), 0)
  const totalMedical = policies.reduce((s, p) => s + (Number(p.coverageDetails?.medicalCard) || 0), 0)

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openAdd = () => {
    setForm({ ...EMPTY_POLICY, coverageDetails: { ...EMPTY_POLICY.coverageDetails } })
    setEditingIdx('new')
  }

  const openEdit = (idx) => {
    const p = policies[idx]
    setForm({
      ...p,
      coverageDetails: { ...EMPTY_POLICY.coverageDetails, ...p.coverageDetails },
    })
    setEditingIdx(idx)
  }

  const handleDelete = (idx) => {
    const updated = policies.filter((_, i) => i !== idx)
    onSave({ ...financials, insurance: updated })
  }

  const handleSave = () => {
    const coerced = {
      ...form,
      sumAssured: Number(form.sumAssured) || 0,
      annualPremium: Number(form.annualPremium) || 0,
      monthlyPremium: Number(form.monthlyPremium) || 0,
      coverageDetails: {
        death: Number(form.coverageDetails?.death) || 0,
        tpd: Number(form.coverageDetails?.tpd) || 0,
        ci: Number(form.coverageDetails?.ci) || 0,
        medicalCard: Number(form.coverageDetails?.medicalCard) || 0,
        paDb: Number(form.coverageDetails?.paDb) || 0,
      },
    }

    let updated
    if (editingIdx === 'new') {
      updated = [...policies, coerced]
    } else {
      updated = policies.map((p, i) => i === editingIdx ? coerced : p)
    }
    onSave({ ...financials, insurance: updated })
    setEditingIdx(null)
    setForm(null)
  }

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const updateCoverage = (key, value) => setForm((prev) => ({
    ...prev,
    coverageDetails: { ...prev.coverageDetails, [key]: value },
  }))

  // ─── Edit Modal ─────────────────────────────────────────────────────────

  if (editingIdx !== null) {
    return (
      <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setEditingIdx(null); setForm(null) }}>
        <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-hig-lg shadow-hig-lg w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-hig-title3">{editingIdx === 'new' ? 'Add Policy' : 'Edit Policy'}</h2>
            <button onClick={() => { setEditingIdx(null); setForm(null) }} className="p-2 rounded-hig-sm hover:bg-hig-gray-6"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hig-label">Policy No.</label>
                <input value={form.policyNo} onChange={(e) => updateForm('policyNo', e.target.value)} className="hig-input" placeholder="e.g. TML-123456" />
              </div>
              <div>
                <label className="hig-label">Insurance Company</label>
                <select value={form.company} onChange={(e) => updateForm('company', e.target.value)} className="hig-input">
                  <option value="">Select...</option>
                  {COMPANIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hig-label">Policy Type</label>
                <select value={form.type} onChange={(e) => updateForm('type', e.target.value)} className="hig-input">
                  <option value="">Select...</option>
                  {POLICY_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="hig-label">Plan Name</label>
                <input value={form.planName} onChange={(e) => updateForm('planName', e.target.value)} className="hig-input" placeholder="e.g. TM Shield Plus" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <RMInput label="Sum Assured" value={form.sumAssured} onChange={(v) => updateForm('sumAssured', v)} />
              <RMInput label="Annual Premium" value={form.annualPremium} onChange={(v) => updateForm('annualPremium', v)} />
              <RMInput label="Monthly Premium" value={form.monthlyPremium} onChange={(v) => updateForm('monthlyPremium', v)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="hig-label">Commencement</label>
                <input type="date" value={form.commencementDate} onChange={(e) => updateForm('commencementDate', e.target.value)} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Maturity</label>
                <input type="date" value={form.maturityDate} onChange={(e) => updateForm('maturityDate', e.target.value)} className="hig-input" />
              </div>
              <div>
                <label className="hig-label">Status</label>
                <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} className="hig-input">
                  <option>Active</option>
                  <option>Lapsed</option>
                  <option>Matured</option>
                  <option>Surrendered</option>
                </select>
              </div>
            </div>

            {/* Coverage Breakdown */}
            <div>
              <h4 className="text-hig-headline mb-2">Coverage Breakdown</h4>
              <div className="grid grid-cols-3 gap-3">
                <RMInput label="Death" value={form.coverageDetails?.death} onChange={(v) => updateCoverage('death', v)} />
                <RMInput label="TPD" value={form.coverageDetails?.tpd} onChange={(v) => updateCoverage('tpd', v)} />
                <RMInput label="Critical Illness" value={form.coverageDetails?.ci} onChange={(v) => updateCoverage('ci', v)} />
                <RMInput label="Medical Card" value={form.coverageDetails?.medicalCard} onChange={(v) => updateCoverage('medicalCard', v)} />
                <RMInput label="PA / DB" value={form.coverageDetails?.paDb} onChange={(v) => updateCoverage('paDb', v)} />
              </div>
            </div>

            <div>
              <label className="hig-label">Notes</label>
              <textarea value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} className="hig-input min-h-[60px] resize-y" placeholder="Rider details, exclusions, etc." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-hig-gray-5">
            <button onClick={() => { setEditingIdx(null); setForm(null) }} className="hig-btn-secondary">Cancel</button>
            <button onClick={handleSave} className="hig-btn-primary">
              {editingIdx === 'new' ? 'Add Policy' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (policies.length === 0) {
    return (
      <div className="hig-card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-hig-green/10 flex items-center justify-center mb-4">
          <Shield size={26} className="text-hig-green" />
        </div>
        <p className="text-hig-headline text-hig-text font-semibold mb-1">No Insurance Policies</p>
        <p className="text-hig-subhead text-hig-text-secondary mb-4">
          Add existing insurance policies to track coverage and identify gaps.
        </p>
        <button onClick={openAdd} className="hig-btn-primary gap-1.5"><Plus size={16} /> Add Policy</button>
      </div>
    )
  }

  // ─── Policy List ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Annual Premium', value: totalAnnualPremium, color: 'text-hig-blue' },
          { label: 'Death', value: totalDeath, color: 'text-hig-text' },
          { label: 'TPD', value: totalTPD, color: 'text-hig-text' },
          { label: 'CI', value: totalCI, color: 'text-hig-text' },
          { label: 'Medical', value: totalMedical, color: 'text-hig-text' },
        ].map((s) => (
          <div key={s.label} className="hig-card p-3 text-center">
            <p className="text-hig-caption1 text-hig-text-secondary mb-1">{s.label}</p>
            <p className={`text-hig-subhead font-semibold ${s.color}`}>{formatRMFull(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button onClick={openAdd} className="hig-btn-ghost gap-1.5"><Plus size={14} /> Add Policy</button>
      </div>

      {/* Policy Cards */}
      {policies.map((p, idx) => (
        <div key={idx} className="hig-card">
          <div
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-hig-gray-6/50 transition-colors rounded-hig"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className={`w-10 h-10 rounded-hig-sm flex items-center justify-center shrink-0 ${p.status === 'Active' ? 'bg-hig-green/10' : 'bg-hig-gray-6'}`}>
              <Shield size={18} className={p.status === 'Active' ? 'text-hig-green' : 'text-hig-gray-1'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-hig-subhead font-medium text-hig-text truncate">{p.planName || p.type || 'Unnamed Policy'}</p>
                <span className={`text-hig-caption2 px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-hig-green/10 text-hig-green' : 'bg-hig-gray-6 text-hig-gray-1'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-hig-caption1 text-hig-text-secondary">{p.company} · {p.policyNo || 'No policy no.'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-hig-subhead font-medium">{formatRMFull(p.sumAssured)}</p>
              <p className="text-hig-caption1 text-hig-text-secondary">{formatRMFull(p.annualPremium)}/yr</p>
            </div>
            {expandedIdx === idx ? <ChevronUp size={16} className="text-hig-gray-1" /> : <ChevronDown size={16} className="text-hig-gray-1" />}
          </div>

          {expandedIdx === idx && (
            <div className="px-4 pb-4 pt-0 border-t border-hig-gray-5 mt-0">
              <div className="grid grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Death', value: p.coverageDetails?.death },
                  { label: 'TPD', value: p.coverageDetails?.tpd },
                  { label: 'Critical Illness', value: p.coverageDetails?.ci },
                  { label: 'Medical Card', value: p.coverageDetails?.medicalCard },
                  { label: 'PA / DB', value: p.coverageDetails?.paDb },
                ].filter(c => c.value > 0).map((c) => (
                  <div key={c.label} className="py-1">
                    <p className="text-hig-caption1 text-hig-text-secondary">{c.label}</p>
                    <p className="text-hig-subhead font-medium">{formatRMFull(c.value)}</p>
                  </div>
                ))}
              </div>
              {p.notes && <p className="text-hig-caption1 text-hig-text-secondary mt-2 pt-2 border-t border-hig-gray-5">{p.notes}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={(e) => { e.stopPropagation(); openEdit(idx) }} className="hig-btn-ghost gap-1 text-hig-caption1">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(idx) }} className="hig-btn-ghost gap-1 text-hig-caption1 text-hig-red hover:bg-red-50">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RMInput({ label, value, onChange }) {
  return (
    <div>
      <label className="hig-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-hig-text-secondary text-hig-subhead">RM</span>
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="hig-input pl-10 tabular-nums"
          placeholder="0"
          min="0"
        />
      </div>
    </div>
  )
}
