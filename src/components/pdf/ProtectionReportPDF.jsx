import {
  Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { formatRMFull } from '../../lib/calculations'

const getLogo = () => `${window.location.origin}/assets/colourful-llh-logo.jpg`

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  blue:   '#007AFF',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
  purple: '#AF52DE',
  gray1:  '#1C1C1E',
  gray2:  '#636366',
  gray3:  '#AEAEB2',
  gray5:  '#E5E5EA',
  gray6:  '#F2F2F7',
  white:  '#FFFFFF',
}

const RISK_COLOR  = { death: C.blue, tpd: C.orange, aci: C.purple, eci: C.red }
const RISK_LABEL  = { death: 'Death', tpd: 'Total Permanent Disability', aci: 'Advanced Stage CI', eci: 'Early Stage CI' }
const RISK_SHORT  = { death: 'Death', tpd: 'TPD', aci: 'ACI', eci: 'ECI' }
const RISK_DESC   = {
  death: 'Lump-sum payout upon death of the life assured',
  tpd:   'Income replacement if permanently disabled and unable to work',
  aci:   'Covers treatment and living costs at advanced stage diagnosis',
  eci:   'Early cash payout at first diagnosis for immediate financial relief',
}

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

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.gray1,
    backgroundColor: C.white,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: C.blue,
  },
  logo: { width: 80, height: 28, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.blue },
  headerSub:   { fontSize: 8, color: C.gray2, marginTop: 2 },

  // ── Client strip ─────────────────────────────────────────────────────────────
  clientStrip: {
    flexDirection: 'row',
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  clientItem:  { flex: 1 },
  clientLabel: { fontSize: 7, color: C.gray2, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  clientValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // ── Section heading ──────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray5,
  },

  // ── Overall summary ──────────────────────────────────────────────────────────
  summaryCards: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard:  {
    flex: 1,
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 7.5, color: C.gray2, marginBottom: 3, textAlign: 'center' },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  summarySub:   { fontSize: 7, color: C.gray2, marginTop: 2, textAlign: 'center' },

  // ── Risk grid (2 × 2) ────────────────────────────────────────────────────────
  riskGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  riskCard: {
    width: '48.5%',
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
  },
  riskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  riskName: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  riskBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },

  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  riskRowLabel: { fontSize: 7.5, color: C.gray2 },
  riskRowValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold' },

  riskBarBg: { height: 5, backgroundColor: C.gray5, borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  riskBarFill: { height: 5, borderRadius: 3 },

  // ── Detail table ─────────────────────────────────────────────────────────────
  table: { marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.blue,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray5,
  },
  tableRowAlt: { backgroundColor: C.gray6 },
  tableCell: { fontSize: 8.5, color: C.gray1 },

  // ── Recommendations ──────────────────────────────────────────────────────────
  recCard: {
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  recTitle:   { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  recRiskRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  recRiskTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  recDetail: { fontSize: 7.5, color: C.gray2, marginTop: 3 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: C.gray5,
  },
  footerText: { fontSize: 6.5, color: C.gray3, textAlign: 'center', lineHeight: 1.5 },
  pageNumber: { fontSize: 7, color: C.gray2, textAlign: 'right', marginTop: 2 },
})

// ─── Report Document ─────────────────────────────────────────────────────────

export function ProtectionReportDocument({ plan, summaryData, contact, agentName }) {
  const today = new Date().toLocaleDateString('en-MY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const totalNeeded  = summaryData.reduce((s, r) => s + r.targetCoverage, 0)
  const totalCovered = summaryData.reduce((s, r) => s + r.totalCovered, 0)
  const totalGap     = summaryData.reduce((s, r) => s + r.shortfall, 0)
  const overallPct   = totalNeeded > 0 ? Math.min(100, Math.round((totalCovered / totalNeeded) * 100)) : 100

  const recommendations = (plan.recommendations || []).filter((r) => r.isSelected)

  return (
    <Document
      title={`Wealth Protection Plan — ${contact?.name || 'Client'}`}
      author="LLH Group"
      subject="Wealth Protection Financial Planning Report"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Image src={getLogo()} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Wealth Protection Report</Text>
            <Text style={styles.headerSub}>Prepared by {agentName || 'Henry Lee'} · {today}</Text>
          </View>
        </View>

        {/* ── Client Strip ── */}
        <View style={styles.clientStrip}>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Client</Text>
            <Text style={styles.clientValue}>{contact?.name || '—'}</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Age</Text>
            <Text style={styles.clientValue}>{contact?.currentAge || '—'}</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Inflation Rate</Text>
            <Text style={styles.clientValue}>{plan.inflationRate ?? 4}%</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Inv. Return Rate</Text>
            <Text style={styles.clientValue}>{plan.returnRate ?? 1}%</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Status</Text>
            <Text style={[styles.clientValue, { color: coverageColor(overallPct) }]}>
              {coverageLabel(overallPct)}
            </Text>
          </View>
        </View>

        {/* ── Overall Summary ── */}
        <Text style={styles.sectionTitle}>Coverage Summary</Text>
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Coverage Needed</Text>
            <Text style={[styles.summaryValue, { color: C.blue }]}>{fmtRM(totalNeeded)}</Text>
            <Text style={styles.summarySub}>Across all 4 risk categories</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Covered</Text>
            <Text style={[styles.summaryValue, { color: C.green }]}>{fmtRM(totalCovered)}</Text>
            <Text style={styles.summarySub}>Existing + Recommended</Text>
          </View>
          <View style={[styles.summaryCard, { borderWidth: 1, borderColor: coverageColor(overallPct) }]}>
            <Text style={styles.summaryLabel}>Unprotected Exposure</Text>
            <Text style={[styles.summaryValue, { color: coverageColor(overallPct) }]}>{fmtRM(totalGap)}</Text>
            <Text style={[styles.summarySub, { color: coverageColor(overallPct) }]}>{overallPct}% of needs covered</Text>
          </View>
        </View>

        {/* ── Risk Cards (2×2) ── */}
        <Text style={styles.sectionTitle}>Coverage by Risk Category</Text>
        <View style={styles.riskGrid}>
          {summaryData.map((r) => {
            const color = coverageColor(r.coveragePercent)
            const barPct = Math.min(r.coveragePercent, 100)
            return (
              <View key={r.risk} style={styles.riskCard}>
                <View style={styles.riskCardHeader}>
                  <View style={[styles.riskDot, { backgroundColor: RISK_COLOR[r.risk] }]} />
                  <Text style={styles.riskName}>{RISK_SHORT[r.risk]}</Text>
                  <Text style={[styles.riskBadge, { backgroundColor: color + '20', color }]}>
                    {r.coveragePercent}%
                  </Text>
                </View>

                <View style={styles.riskRow}>
                  <Text style={styles.riskRowLabel}>Target</Text>
                  <Text style={styles.riskRowValue}>{fmtRM(r.targetCoverage)}</Text>
                </View>
                <View style={styles.riskRow}>
                  <Text style={styles.riskRowLabel}>Existing</Text>
                  <Text style={[styles.riskRowValue, { color: C.green }]}>{fmtRM(r.existingCoverage)}</Text>
                </View>
                <View style={styles.riskRow}>
                  <Text style={styles.riskRowLabel}>Recommended</Text>
                  <Text style={[styles.riskRowValue, { color: C.blue }]}>+{fmtRM(r.recommendedCoverage)}</Text>
                </View>
                <View style={styles.riskRow}>
                  <Text style={styles.riskRowLabel}>{r.shortfall > 0 ? 'Gap' : 'Surplus'}</Text>
                  <Text style={[styles.riskRowValue, { color }]}>
                    {r.shortfall > 0 ? `-${fmtRM(r.shortfall)}` : `+${fmtRM(r.surplus)}`}
                  </Text>
                </View>

                <View style={styles.riskBarBg}>
                  <View style={[styles.riskBarFill, { width: `${barPct}%`, backgroundColor: color }]} />
                </View>
              </View>
            )
          })}
        </View>

        {/* ── Detail Table ── */}
        <Text style={styles.sectionTitle}>Needs Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2.5 }]}>Risk Category</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Lump Sum</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monthly</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.7, textAlign: 'right' }]}>Period</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Total Need</Text>
          </View>
          {(['death', 'tpd', 'aci', 'eci']).map((risk, i) => {
            const need = plan.needs?.[risk] || {}
            const summary = summaryData.find((r) => r.risk === risk)
            return (
              <View key={risk} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: RISK_COLOR[risk] }} />
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

        {/* ── Recommendations ── */}
        {recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommended Solutions</Text>
            {recommendations.map((rec, i) => {
              // Determine which risks this recommendation covers
              const coveredRisks = (['death', 'tpd', 'aci', 'eci']).filter(
                (rk) => (!('riskType' in rec) && rec[rk] > 0) || (rec.riskType === rk && rec.coverageAmount > 0)
              )
              return (
                <View key={rec.id || i} style={styles.recCard}>
                  <Text style={styles.recTitle}>{rec.label || `Solution ${i + 1}`}</Text>
                  {coveredRisks.length > 0 && (
                    <View style={styles.recRiskRow}>
                      {coveredRisks.map((rk) => (
                        <Text key={rk} style={[styles.recRiskTag, { backgroundColor: RISK_COLOR[rk] + '20', color: RISK_COLOR[rk] }]}>
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

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This report is prepared by {agentName || 'Henry Lee'} of LLH Group for planning purposes only. It does not constitute financial advice.
            Coverage needs are estimates based on the information provided and assumed rates. Actual policy terms and conditions apply.
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}

// ─── Export Button ────────────────────────────────────────────────────────────

export function ProtectionExportButton({ plan, summaryData, contact, agentName }) {
  const fileName = `Protection_Plan_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`

  return (
    <PDFDownloadLink
      document={
        <ProtectionReportDocument
          plan={plan}
          summaryData={summaryData}
          contact={contact}
          agentName={agentName}
        />
      }
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
