import {
  Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { formatRMFull } from '../../lib/calculations'

const getLogo = () => `${window.location.origin}/assets/sora-logo.png`

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:   '#060F1E',
  blue:   '#007AFF',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
  purple: '#AF52DE',
  gray1:  '#1C1C1E',
  gray2:  '#636366',
  gray3:  '#AEAEB2',
  gray5:  '#E5E5EA',
  gray6:  '#F5F5F7',
  white:  '#FFFFFF',
}

const RISK_COLOR = { death: C.blue, tpd: C.orange, aci: C.purple, eci: C.red }
const RISK_LABEL = { death: 'Death', tpd: 'Total Permanent Disability', aci: 'Advanced Stage CI', eci: 'Early Stage CI' }
const RISK_SHORT = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }

function fmtRM(val) {
  if (!val && val !== 0) return 'RM 0'
  return formatRMFull(val)
}
function coverageColor(pct) {
  if (pct >= 100) return C.green
  if (pct >= 75)  return C.orange
  return C.red
}
function coverageLabel(pct) {
  if (pct >= 100) return 'Gap Closed'
  if (pct >= 75)  return 'Partially Protected'
  return 'Underprotected'
}

// ─── Native Coverage Chart ───────────────────────────────────────────────────
// Horizontal stacked bars: Existing | Recommended | Gap — one row per risk
function CoverageOverviewChart({ summaryData }) {
  return (
    <View style={{ gap: 9 }}>
      {summaryData.map((r) => {
        if (!r.targetCoverage || r.targetCoverage === 0) return null
        const existPct  = Math.min(100, Math.round((r.existingCoverage    / r.targetCoverage) * 100))
        const recPct    = Math.min(100 - existPct, Math.round((r.recommendedCoverage / r.targetCoverage) * 100))
        const gapPct    = Math.max(0, 100 - existPct - recPct)
        const statusCol = coverageColor(r.coveragePercent)

        return (
          <View key={r.risk}>
            {/* Row label */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: RISK_COLOR[r.risk] }} />
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray1 }}>{RISK_LABEL[r.risk]}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 7, color: C.gray2 }}>
                  {fmtRM(r.totalCovered)} / {fmtRM(r.targetCoverage)}
                </Text>
                <View style={{ backgroundColor: statusCol + '22', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: statusCol }}>
                    {r.coveragePercent}% · {coverageLabel(r.coveragePercent)}
                  </Text>
                </View>
              </View>
            </View>
            {/* Bar */}
            <View style={{ height: 13, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: C.gray5 }}>
              {existPct > 0 && <View style={{ width: `${existPct}%`, height: 13, backgroundColor: C.green }} />}
              {recPct   > 0 && <View style={{ width: `${recPct}%`,  height: 13, backgroundColor: C.blue  }} />}
              {gapPct   > 0 && <View style={{ width: `${gapPct}%`, height: 13, backgroundColor: '#FFCCC9' }} />}
            </View>
          </View>
        )
      })}

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 3 }}>
        {[
          { color: C.green,   label: 'Existing Coverage' },
          { color: C.blue,    label: 'Recommended'       },
          { color: '#FFCCC9', label: 'Remaining Gap'     },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 7, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontSize: 7, color: C.gray2 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.gray1,
    backgroundColor: C.white,
  },

  // Header (full-bleed dark banner)
  header: {
    backgroundColor: C.navy,
    paddingVertical: 18,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoCard: {
    backgroundColor: C.white,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  logo: { width: 90, height: 41, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.white },
  headerSub:   { fontSize: 7.5, color: 'rgba(255,255,255,0.48)', marginTop: 3 },

  // Content wrapper
  content: { paddingHorizontal: 36, paddingTop: 18, paddingBottom: 54 },

  // Client strip
  clientStrip: {
    flexDirection: 'row',
    backgroundColor: C.gray6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  clientItem:  { flex: 1 },
  clientLabel: { fontSize: 6.5, color: C.gray3, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  clientValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Section heading
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10 },
  sectionBar:  { width: 3, height: 13, backgroundColor: C.blue, borderRadius: 2 },
  sectionTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.gray1, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Summary cards
  summaryCards: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  summaryCard:  {
    flex: 1, borderRadius: 8, padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  summaryLabel: { fontSize: 7, color: C.gray2, marginBottom: 4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  summarySub:   { fontSize: 6.5, color: C.gray3, marginTop: 3, textAlign: 'center' },

  // Risk grid
  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  riskCard: {
    width: '48.5%', borderRadius: 8, padding: 11,
    borderWidth: 1, borderColor: C.gray5, backgroundColor: C.white,
  },
  riskCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  riskDot:  { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  riskName: { fontSize: 8, fontFamily: 'Helvetica-Bold', flex: 1 },
  riskBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 10, fontSize: 6.5, fontFamily: 'Helvetica-Bold',
  },
  riskRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  riskRowLabel:  { fontSize: 7, color: C.gray2 },
  riskRowValue:  { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  riskBarBg:     { height: 5, backgroundColor: C.gray5, borderRadius: 3, marginTop: 7, overflow: 'hidden' },
  riskBarFill:   { height: 5, borderRadius: 3 },

  // Table
  table: { marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.navy,
    borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10,
  },
  tableHeaderCell: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: C.gray5,
  },
  tableRowAlt: { backgroundColor: C.gray6 },
  tableCell:   { fontSize: 8, color: C.gray1 },

  // Recommendations
  recCard: {
    backgroundColor: C.gray6, borderRadius: 8, padding: 11,
    marginBottom: 7, borderLeftWidth: 3, borderLeftColor: C.blue,
  },
  recTitle:   { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  recRiskRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 4 },
  recRiskTag: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  recDetail:  { fontSize: 7.5, color: C.gray2, marginTop: 2 },

  // Footer
  footer: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    paddingTop: 7, borderTopWidth: 0.5, borderTopColor: C.gray5,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  footerText:  { fontSize: 6, color: C.gray3, lineHeight: 1.6, flex: 1 },
  pageNumber:  { fontSize: 6.5, color: C.gray3, textAlign: 'right', marginLeft: 12 },
})

// ─── Section heading helper ───────────────────────────────────────────────────
function SectionHead({ title }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────
export function ProtectionReportDocument({ plan, summaryData, contact, agentName }) {
  const today = new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })

  const totalNeeded  = summaryData.reduce((s, r) => s + r.targetCoverage, 0)
  const totalCovered = summaryData.reduce((s, r) => s + r.totalCovered,   0)
  const totalGap     = summaryData.reduce((s, r) => s + r.shortfall,      0)
  const overallPct   = totalNeeded > 0 ? Math.min(100, Math.round((totalCovered / totalNeeded) * 100)) : 100
  const recommendations = (plan.recommendations || []).filter((r) => r.isSelected)

  return (
    <Document
      title={`Wealth Protection Plan — ${contact?.name || 'Client'}`}
      author="Sora by LLH Group"
      subject="Wealth Protection Financial Planning Report"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoCard}>
            <Image src={getLogo()} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Wealth Protection Report</Text>
            <Text style={styles.headerSub}>Prepared by {agentName || 'Henry Lee'} · {today}</Text>
            <Text style={[styles.headerSub, { marginTop: 1 }]}>PRIVATE &amp; CONFIDENTIAL</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Client strip */}
          <View style={styles.clientStrip}>
            {[
              { label: 'Client',         value: contact?.name || '—' },
              { label: 'Age',            value: contact?.currentAge || '—' },
              { label: 'Inflation Rate', value: `${plan.inflationRate ?? 4}%` },
              { label: 'Return Rate',    value: `${plan.returnRate ?? 1}%` },
              { label: 'Status',         value: coverageLabel(overallPct), color: coverageColor(overallPct) },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.clientItem}>
                <Text style={styles.clientLabel}>{label}</Text>
                <Text style={[styles.clientValue, color ? { color } : {}]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Summary metrics */}
          <SectionHead title="Coverage Summary" />
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, { backgroundColor: '#EBF5FF', borderTopColor: C.blue }]}>
              <Text style={styles.summaryLabel}>Coverage Needed</Text>
              <Text style={[styles.summaryValue, { color: C.blue }]}>{fmtRM(totalNeeded)}</Text>
              <Text style={styles.summarySub}>All 4 risk categories</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#EDFAF1', borderTopColor: C.green }]}>
              <Text style={styles.summaryLabel}>Total Covered</Text>
              <Text style={[styles.summaryValue, { color: C.green }]}>{fmtRM(totalCovered)}</Text>
              <Text style={styles.summarySub}>Existing + Recommended</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: coverageColor(overallPct) + '18', borderTopColor: coverageColor(overallPct) }]}>
              <Text style={styles.summaryLabel}>Unprotected Exposure</Text>
              <Text style={[styles.summaryValue, { color: coverageColor(overallPct) }]}>{fmtRM(totalGap)}</Text>
              <Text style={[styles.summarySub, { color: coverageColor(overallPct) }]}>{overallPct}% of needs covered</Text>
            </View>
          </View>

          {/* Coverage chart */}
          <SectionHead title="Coverage Overview" />
          <CoverageOverviewChart summaryData={summaryData} />

          {/* Risk cards 2×2 */}
          <SectionHead title="Coverage by Risk Category" />
          <View style={styles.riskGrid}>
            {summaryData.map((r) => {
              const color  = coverageColor(r.coveragePercent)
              const barPct = Math.min(r.coveragePercent, 100)
              return (
                <View key={r.risk} style={styles.riskCard}>
                  <View style={styles.riskCardHeader}>
                    <View style={[styles.riskDot, { backgroundColor: RISK_COLOR[r.risk] }]} />
                    <Text style={styles.riskName}>{RISK_LABEL[r.risk]}</Text>
                    <Text style={[styles.riskBadge, { backgroundColor: color + '22', color }]}>{r.coveragePercent}%</Text>
                  </View>
                  {[
                    { label: 'Target',      value: fmtRM(r.targetCoverage),      color: C.gray1 },
                    { label: 'Existing',    value: fmtRM(r.existingCoverage),    color: C.green },
                    { label: 'Recommended', value: `+${fmtRM(r.recommendedCoverage)}`, color: C.blue },
                    { label: r.shortfall > 0 ? 'Gap' : 'Surplus', value: r.shortfall > 0 ? `-${fmtRM(r.shortfall)}` : `+${fmtRM(r.surplus)}`, color },
                  ].map(({ label, value, color: c }) => (
                    <View key={label} style={styles.riskRow}>
                      <Text style={styles.riskRowLabel}>{label}</Text>
                      <Text style={[styles.riskRowValue, { color: c }]}>{value}</Text>
                    </View>
                  ))}
                  <View style={styles.riskBarBg}>
                    <View style={[styles.riskBarFill, { width: `${barPct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              )
            })}
          </View>

          {/* Needs breakdown table */}
          <SectionHead title="Needs Breakdown" />
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Risk Category</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Lump Sum</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monthly</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: 'right' }]}>Period</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Total Need</Text>
            </View>
            {(['death', 'tpd', 'aci', 'eci']).map((risk, i) => {
              const need    = plan.needs?.[risk] || {}
              const summary = summaryData.find((r) => r.risk === risk)
              return (
                <View key={risk} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: RISK_COLOR[risk] }} />
                    <Text style={styles.tableCell}>{RISK_LABEL[risk]}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fmtRM(need.lumpSum)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fmtRM(need.monthly)}/mth</Text>
                  <Text style={[styles.tableCell, { flex: 0.7, textAlign: 'right' }]}>{need.period || 0} yrs</Text>
                  <Text style={[styles.tableCell, { flex: 1.3, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: RISK_COLOR[risk] }]}>
                    {fmtRM(summary?.targetCoverage)}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <>
              <SectionHead title="Recommended Solutions" />
              {recommendations.map((rec, i) => {
                const coveredRisks = (['death', 'tpd', 'aci', 'eci']).filter(
                  (rk) => (!('riskType' in rec) && rec[rk] > 0) || (rec.riskType === rk && rec.coverageAmount > 0)
                )
                return (
                  <View key={rec.id || i} style={styles.recCard}>
                    <Text style={styles.recTitle}>{rec.label || `Solution ${i + 1}`}</Text>
                    {coveredRisks.length > 0 && (
                      <View style={styles.recRiskRow}>
                        {coveredRisks.map((rk) => (
                          <Text key={rk} style={[styles.recRiskTag, { backgroundColor: RISK_COLOR[rk] + '22', color: RISK_COLOR[rk] }]}>
                            {RISK_SHORT[rk]}: {fmtRM(rec[rk] || rec.coverageAmount)}
                          </Text>
                        ))}
                      </View>
                    )}
                    {rec.premium > 0 && (
                      <Text style={styles.recDetail}>
                        Premium: {fmtRM(rec.premium)}/month · Total: {fmtRM((rec.premium || 0) * 12 * (rec.term || 1))} over {rec.term || '—'} years
                      </Text>
                    )}
                  </View>
                )
              })}
            </>
          )}
        </View>

        {/* ── Footer (fixed) ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This report is prepared by {agentName || 'Henry Lee'} of LLH Group for planning purposes only and does not constitute financial advice.
            Coverage needs are estimates based on information provided and assumed rates. Actual policy terms and conditions apply.
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

// ─── Export Button ─────────────────────────────────────────────────────────────
export function ProtectionExportButton({ plan, summaryData, contact, agentName }) {
  const fileName = `Protection_Plan_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  return (
    <PDFDownloadLink
      document={<ProtectionReportDocument plan={plan} summaryData={summaryData} contact={contact} agentName={agentName} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-hig-blue text-hig-blue hover:bg-hig-blue hover:text-white transition-colors disabled:opacity-50"
          disabled={loading}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {loading ? 'Generating…' : 'Export PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
