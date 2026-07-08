import { useState } from 'react'
import { Plus, Pencil, Trash2, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { formatRMFull } from '../../lib/calculations'
import { InsuranceExportButton } from '../pdf/InsurancePoliciesPDF'
import { useAuth } from '../../hooks/useAuth'
import PolicyFormWizard from './PolicyFormWizard'

// Coverage schema (see PolicyFormWizard.jsx):
//   coverage.life            — the base contract: company, policy no, coverage
//                               start/end date, premium start/end date, nominee,
//                               sumAssured (Death & TPD combined)
//   coverage.pa               — Personal Accident sum assured (rider)
//   coverage.ci.aci / .eci    — Critical Illness, early-stage / advanced-stage (rider)
//   coverage.medical.*        — roomBoard / annualLimit / lifetimeLimit / notes (rider)
const EMPTY_LIFE = {
  company: '', policyNo: '',
  coverageStartDate: '', coverageEndDate: '',
  premiumStartDate: '', premiumEndDate: '',
  nominee: '', sumAssured: 0,
}
const EMPTY_POLICY = {
  planName: '',
  annualPremium: 0,
  monthlyPremium: 0,
  status: 'Active',
  hasPremiumWaiver: false,
  notes: '',
  coverage: {
    life: { ...EMPTY_LIFE },
    pa: 0,
    ci: { aci: 0, eci: 0 },
    medical: { roomBoard: 0, annualLimit: 0, lifetimeLimit: 0, notes: '' },
  },
}

function newPolicyId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `pol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export default function InsuranceTab({ financials, onSave, contact }) {
  const { agent } = useAuth()
  const policies = financials.insurance || []
  const [wizardState, setWizardState] = useState(null) // null | { form, idx }
  const [expandedIdx, setExpandedIdx] = useState(null)

  // ─── Summary ────────────────────────────────────────────────────────────

  const totalAnnualPremium = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const totalLife = policies.reduce((s, p) => s + (Number(p.coverage?.life?.sumAssured) || 0), 0)
  const totalPA = policies.reduce((s, p) => s + (Number(p.coverage?.pa) || 0), 0)
  const totalACI = policies.reduce((s, p) => s + (Number(p.coverage?.ci?.aci) || 0), 0)
  const totalECI = policies.reduce((s, p) => s + (Number(p.coverage?.ci?.eci) || 0), 0)
  const totalMedicalAnnualLimit = policies.reduce((s, p) => s + (Number(p.coverage?.medical?.annualLimit) || 0), 0)

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openAdd = () =>
    setWizardState({
      form: {
        ...EMPTY_POLICY,
        id: newPolicyId(),
        coverage: {
          life: { ...EMPTY_LIFE },
          pa: 0,
          ci: { ...EMPTY_POLICY.coverage.ci },
          medical: { ...EMPTY_POLICY.coverage.medical },
        },
      },
      idx: 'new',
    })

  const openEdit = (idx) => {
    const p = policies[idx]
    setWizardState({
      form: {
        ...EMPTY_POLICY,
        ...p,
        id: p.id || newPolicyId(),
        coverage: {
          life: { ...EMPTY_LIFE, ...p.coverage?.life },
          pa: p.coverage?.pa || 0,
          ci: { ...EMPTY_POLICY.coverage.ci, ...p.coverage?.ci },
          medical: { ...EMPTY_POLICY.coverage.medical, ...p.coverage?.medical },
        },
      },
      idx,
    })
  }

  const handleDelete = (idx) => {
    onSave({ ...financials, insurance: policies.filter((_, i) => i !== idx) })
  }

  const handleWizardSave = (coerced) => {
    const updated = wizardState.idx === 'new'
      ? [...policies, coerced]
      : policies.map((p, i) => i === wizardState.idx ? coerced : p)
    onSave({ ...financials, insurance: updated })
    setWizardState(null)
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (policies.length === 0) {
    return (
      <>
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
        {wizardState && (
          <PolicyFormWizard
            initialForm={wizardState.form}
            isEdit={false}
            onSave={handleWizardSave}
            onClose={() => setWizardState(null)}
          />
        )}
      </>
    )
  }

  // ─── Policy List ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Annual Premium', value: totalAnnualPremium, color: 'text-hig-blue' },
          { label: 'Life (Death & TPD)', value: totalLife, color: 'text-hig-text' },
          { label: 'PA', value: totalPA, color: 'text-hig-text' },
          { label: 'CI (Early)', value: totalACI, color: 'text-hig-text' },
          { label: 'CI (Advanced)', value: totalECI, color: 'text-hig-text' },
          { label: 'Medical (Annual Limit)', value: totalMedicalAnnualLimit, color: 'text-hig-text' },
        ].map((s) => (
          <div key={s.label} className="hig-card p-3 text-center">
            <p className="text-hig-caption1 text-hig-text-secondary mb-1">{s.label}</p>
            <p className={`text-hig-subhead font-semibold ${s.color}`}>{formatRMFull(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <InsuranceExportButton
          policies={policies}
          contact={contact}
          agentName={agent?.name}
        />
        <button onClick={openAdd} className="hig-btn-ghost gap-1.5"><Plus size={14} /> Add Policy</button>
      </div>

      {/* Policy Cards */}
      {policies.map((p, idx) => (
        <div key={p.id || idx} className="hig-card">
          <div
            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-hig-gray-6/50 transition-colors rounded-hig"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className={`w-10 h-10 rounded-hig-sm flex items-center justify-center shrink-0 ${p.status === 'Active' ? 'bg-hig-green/10' : 'bg-hig-gray-6'}`}>
              <Shield size={18} className={p.status === 'Active' ? 'text-hig-green' : 'text-hig-gray-1'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-hig-subhead font-medium text-hig-text truncate">{p.planName || 'Unnamed Policy'}</p>
                <span className={`text-hig-caption2 px-2 py-0.5 rounded-full ${p.status === 'Active' ? 'bg-hig-green/10 text-hig-green' : 'bg-hig-gray-6 text-hig-gray-1'}`}>
                  {p.status}
                </span>
                {p.hasPremiumWaiver && (
                  <span className="text-hig-caption2 px-2 py-0.5 rounded-full bg-hig-blue/10 text-hig-blue">PWV</span>
                )}
              </div>
              <p className="text-hig-caption1 text-hig-text-secondary">{p.coverage?.life?.company || 'No insurer set'} · {p.coverage?.life?.policyNo || 'No policy no.'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-hig-subhead font-medium">{formatRMFull(p.coverage?.life?.sumAssured)}</p>
              <p className="text-hig-caption1 text-hig-text-secondary">{formatRMFull(p.annualPremium)}/yr</p>
            </div>
            {expandedIdx === idx ? <ChevronUp size={16} className="text-hig-gray-1" /> : <ChevronDown size={16} className="text-hig-gray-1" />}
          </div>

          {expandedIdx === idx && (
            <div className="px-4 pb-4 pt-0 border-t border-hig-gray-5 mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {[
                  { label: 'Life (Death & TPD)', value: p.coverage?.life?.sumAssured },
                  { label: 'Personal Accident', value: p.coverage?.pa },
                  { label: 'CI — Early Stage', value: p.coverage?.ci?.aci },
                  { label: 'CI — Advanced Stage', value: p.coverage?.ci?.eci },
                  { label: 'Medical — Annual Limit', value: p.coverage?.medical?.annualLimit },
                  { label: 'Medical — Lifetime Limit', value: p.coverage?.medical?.lifetimeLimit },
                  { label: 'Medical — Room & Board', value: p.coverage?.medical?.roomBoard },
                ].filter(c => c.value > 0).map((c) => (
                  <div key={c.label} className="py-1">
                    <p className="text-hig-caption1 text-hig-text-secondary">{c.label}</p>
                    <p className="text-hig-subhead font-medium">{formatRMFull(c.value)}</p>
                  </div>
                ))}
              </div>
              {p.coverage?.life?.nominee && (
                <div className="py-1 mt-1">
                  <p className="text-hig-caption1 text-hig-text-secondary">Nominee</p>
                  <p className="text-hig-subhead font-medium">{p.coverage.life.nominee}</p>
                </div>
              )}
              {p.coverage?.medical?.notes && (
                <div className="py-1 mt-1">
                  <p className="text-hig-caption1 text-hig-text-secondary">Medical Card Notes</p>
                  <p className="text-hig-subhead font-medium">{p.coverage.medical.notes}</p>
                </div>
              )}
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

      {/* Wizard modal */}
      {wizardState && (
        <PolicyFormWizard
          initialForm={wizardState.form}
          isEdit={wizardState.idx !== 'new'}
          onSave={handleWizardSave}
          onClose={() => setWizardState(null)}
        />
      )}
    </div>
  )
}
