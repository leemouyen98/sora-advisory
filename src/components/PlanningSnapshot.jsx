/**
 * PlanningSnapshot
 * Contact-level advisory dashboard card — shown on Contact Detail below the profile.
 * Shows retirement readiness, protection status, cash flow load, and top priority.
 */

import { useMemo } from 'react'
import { Shield, TrendingUp, DollarSign, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { computePriorities } from '../lib/priorityEngine'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtRM(n) {
  if (!n && n !== 0) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}RM ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}RM ${Math.round(abs / 1_000)}k`
  return `${sign}RM ${Math.round(abs).toLocaleString()}`
}

// Months between an ISO date string and now — used for the staleness badge.
function monthsSince(iso) {
  if (!iso) return null
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  const months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
  return Math.max(0, months)
}

// ─── Severity colours ─────────────────────────────────────────────────────────
const SEVERITY = {
  critical: { bg: '#FFF1F0', border: '#FFCCC7', text: '#FF3B30', icon: XCircle },
  warning:  { bg: '#FFFBE6', border: '#FFE58F', text: '#FF9500', icon: AlertTriangle },
  info:     { bg: '#F0F5FF', border: '#ADC6FF', text: '#2E96FF', icon: AlertTriangle },
  ok:       { bg: '#F6FFED', border: '#B7EB8F', text: '#34C759', icon: CheckCircle2 },
}

function SeverityBadge({ severity, label }) {
  const s = SEVERITY[severity] ?? SEVERITY.info
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: 5, background: s.bg, color: s.text,
    }}>{label}</span>
  )
}

// ─── Block: one of the three plan areas ───────────────────────────────────────
function PlanBlock({ icon: Icon, iconColor, title, flag, onNavigate, updatedAt, children }) {
  const s = flag ? (SEVERITY[flag.severity] ?? SEVERITY.info) : SEVERITY.ok
  const staleMonths = monthsSince(updatedAt)
  const isStale = staleMonths !== null && staleMonths > 12
  return (
    <button
      onClick={onNavigate}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px', borderRadius: 12, background: '#FAFAFA',
        border: '1px solid #F2F2F7', textAlign: 'left', width: '100%',
        cursor: onNavigate ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => onNavigate && (e.currentTarget.style.background = '#F5F5F7')}
      onMouseLeave={e => (e.currentTarget.style.background = '#FAFAFA')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={14} style={{ color: iconColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1C1C1E' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {staleMonths !== null && (
            <span style={{
              fontSize: 10, fontWeight: isStale ? 700 : 500,
              color: isStale ? '#FF9500' : '#C7C7CC',
            }}>
              {staleMonths === 0 ? 'Reviewed this month' : `Reviewed ${staleMonths}mo ago`}
            </span>
          )}
          {flag && <SeverityBadge severity={flag.severity} label={
            flag.severity === 'ok' ? 'Covered' :
            flag.severity === 'critical' ? 'Action' :
            flag.severity === 'warning' ? 'Review' : 'Info'
          } />}
          {onNavigate && <ChevronRight size={13} style={{ color: '#C7C7CC', marginLeft: 2 }} />}
        </div>
      </div>
      {children}
    </button>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, color: '#8E8E93' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color ?? '#1C1C1E' }}>{value}</span>
    </div>
  )
}

// ─── Priority callouts ─────────────────────────────────────────────────────────
// Renders one flag as a callout card.
function PriorityCallout({ flag }) {
  const s = SEVERITY[flag.severity] ?? SEVERITY.info
  const Icon = s.icon
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`,
    }}>
      <Icon size={15} style={{ color: s.text, marginTop: 1, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: s.text, marginBottom: 1 }}>
          Priority: {flag.message}
        </div>
        {flag.detail && (
          <div style={{ fontSize: 11, color: '#636366' }}>{flag.detail}</div>
        )}
      </div>
    </div>
  )
}

// Decides which flags earn a callout. A single "top priority" hides a second
// critical issue behind an identical-looking block card below — if protection
// AND retirement are both critical, the advisor needs to see both, not just
// whichever sorts first. Only fall back to a single callout when there's
// exactly one non-ok flag (so a lone warning still gets surfaced as before).
function PriorityCallouts({ flags }) {
  const nonOk = flags.filter(f => f && f.severity !== 'ok')
  const criticals = nonOk.filter(f => f.severity === 'critical')
  const toShow = criticals.length > 0 ? criticals : nonOk.slice(0, 1)
  if (!toShow.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {toShow.map(flag => <PriorityCallout key={flag.type} flag={flag} />)}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlanningSnapshot({ contact, onNavigate }) {
  const [protFlag, retFlag, cfFlag] = useMemo(() => {
    const flags = computePriorities(contact)
    const byType = Object.fromEntries(flags.map(f => [f.type, f]))
    return [byType.protection, byType.retirement, byType.cashflow]
  }, [contact])

  const allFlags = [protFlag, retFlag, cfFlag].filter(Boolean)

  const hasAnyPlan = contact?.retirementPlan || contact?.protectionPlan

  if (!hasAnyPlan) {
    // Compact CTA if nothing has been started
    return (
      <div style={{
        padding: '12px 14px', borderRadius: 12,
        background: '#F0F5FF', border: '1px solid #ADC6FF',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#2E96FF', marginBottom: 3 }}>
          Planning Snapshot
        </div>
        <div style={{ fontSize: 11, color: '#636366' }}>
          No plans started yet. Use Start Planning to run retirement or insurance analysis.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8E8E93', margin: 0 }}>
          Planning Snapshot
        </h3>
      </div>

      {/* Priority callouts — every critical flag, not just one */}
      <PriorityCallouts flags={allFlags} />

      {/* Protection block */}
      <PlanBlock
        icon={Shield}
        iconColor="#FF9500"
        title="Protection"
        flag={protFlag}
        updatedAt={contact?.protectionPlan?.updatedAt}
        onNavigate={onNavigate ? () => onNavigate('insurance') : undefined}
      >
        {protFlag ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
            {protFlag.severity !== 'ok' && protFlag.worst && (
              <StatRow
                label={`${protFlag.worst.label} covered`}
                value={`${protFlag.worst.coveragePercent}%`}
                color={protFlag.worst.coveragePercent < 50 ? '#FF3B30' : '#FF9500'}
              />
            )}
            {protFlag.severity !== 'ok' && protFlag.shortfall > 0 && (
              <StatRow label="Total gap" value={fmtRM(protFlag.shortfall)} color="#FF3B30" />
            )}
            {protFlag.monthlyPremium > 0 && (
              <StatRow label="Monthly premium" value={`RM ${Math.round(protFlag.monthlyPremium).toLocaleString()}/mo`} />
            )}
            {protFlag.severity === 'ok' && (
              <div style={{ fontSize: 11, color: '#34C759', fontWeight: 500 }}>All 4 risks covered ✓</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>Not started</div>
        )}
      </PlanBlock>

      {/* Retirement block */}
      <PlanBlock
        icon={TrendingUp}
        iconColor="#2E96FF"
        title="Retirement"
        flag={retFlag}
        updatedAt={contact?.retirementPlan?.updatedAt}
        onNavigate={onNavigate ? () => onNavigate('retirement') : undefined}
      >
        {retFlag ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
            {retFlag.projection && (
              <>
                <StatRow
                  label="Coverage"
                  value={`${retFlag.coveragePercent}%`}
                  color={retFlag.coveragePercent < 50 ? '#FF3B30' : retFlag.coveragePercent < 80 ? '#FF9500' : '#34C759'}
                />
                {retFlag.shortfall > 0 && (
                  <StatRow label="Shortfall" value={fmtRM(retFlag.shortfall)} color="#FF3B30" />
                )}
                {retFlag.projection.fundsRunOutWithRec && retFlag.projection.fundsRunOutWithRec < (contact.retirementPlan?.lifeExpectancy ?? 100) && (
                  <StatRow
                    label="Funds last to"
                    value={`Age ${retFlag.projection.fundsRunOutWithRec}`}
                    color={retFlag.projection.fundsRunOutWithRec < 75 ? '#FF3B30' : '#FF9500'}
                  />
                )}
                {retFlag.monthlyRec > 0 && (
                  <StatRow label="Monthly funding" value={`RM ${Math.round(retFlag.monthlyRec).toLocaleString()}/mo`} />
                )}
              </>
            )}
            {!retFlag.projection && (
              <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{retFlag.detail}</div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>Not started</div>
        )}
      </PlanBlock>

      {/* Cash Flow block */}
      {cfFlag && (
        <PlanBlock
          icon={DollarSign}
          iconColor="#34C759"
          title="Cash Flow"
          flag={cfFlag}
          onNavigate={onNavigate ? () => onNavigate('cashflow') : undefined}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
            {cfFlag.totalLinked > 0 && (
              <StatRow label="Linked plans" value={`RM ${Math.round(cfFlag.totalLinked).toLocaleString()}/mo`} />
            )}
            <StatRow
              label="After plans"
              value={`${cfFlag.surplus >= 0 ? '+' : ''}RM ${Math.round(cfFlag.surplus).toLocaleString()}/mo`}
              color={cfFlag.surplus < 0 ? '#FF3B30' : cfFlag.surplus / Math.max(1, cfFlag.income) < 0.1 ? '#FF9500' : '#34C759'}
            />
          </div>
        </PlanBlock>
      )}
    </div>
  )
}
