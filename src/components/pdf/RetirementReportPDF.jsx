import {
  Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { formatRMFull } from '../../lib/calculations'

const getLogo = () => `${window.location.origin}/assets/colourful-llh-logo.jpg`

// ─── Colour palette (mirrors Apple HIG) ─────────────────────────────────────
const C = {
  blue:    '#007AFF',
  green:   '#34C759',
  orange:  '#FF9500',
  red:     '#FF3B30',
  gray1:   '#1C1C1E',
  gray2:   '#636366',
  gray3:   '#AEAEB2',
  gray5:   '#E5E5EA',
  gray6:   '#F2F2F7',
  white:   '#FFFFFF',
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

  // ── Client info strip ────────────────────────────────────────────────────────
  clientStrip: {
    flexDirection: 'row',
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    gap: 0,
  },
  clientItem: { flex: 1 },
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

  // ── Summary metric cards ─────────────────────────────────────────────────────
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 7.5, color: C.gray2, marginBottom: 3, textAlign: 'center' },
  metricValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  metricSub:   { fontSize: 7, color: C.gray2, marginTop: 2, textAlign: 'center' },

  // ── Coverage bar ─────────────────────────────────────────────────────────────
  coverageBarWrapper: {
    marginBottom: 12,
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
  },
  coverageBarLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  coverageBarBg: {
    height: 8,
    backgroundColor: C.gray5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  coverageBarFill: { height: 8, borderRadius: 4 },
  coverageStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  // ── Params grid ──────────────────────────────────────────────────────────────
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 10 },
  paramItem: { width: '25%', paddingRight: 8, marginBottom: 8 },
  paramLabel: { fontSize: 7, color: C.gray2, marginBottom: 1 },
  paramValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // ── Table ────────────────────────────────────────────────────────────────────
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

  // ── Projection table ─────────────────────────────────────────────────────────
  projRow: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.gray5 },
  projRowAlt: { backgroundColor: C.gray6 },
  projRowHighlight: { backgroundColor: '#EBF5FF' },

  // ── Recommendations ──────────────────────────────────────────────────────────
  recCard: {
    backgroundColor: C.gray6,
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  recTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  recDetail: { fontSize: 8, color: C.gray2 },

  // ── Situation comparison ─────────────────────────────────────────────────────
  situationRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  situationCard: { flex: 1, borderRadius: 6, padding: 10, backgroundColor: C.gray6 },
  situationLabel: { fontSize: 7.5, color: C.gray2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  situationAge: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  situationSub: { fontSize: 7.5, color: C.gray2, marginTop: 2 },

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

// ─── Helper ──────────────────────────────────────────────────────────────────

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
  if (pct >= 100) return 'Fully Funded'
  if (pct >= 75)  return 'Progressing'
  return 'At Risk'
}

// ─── Report Document ─────────────────────────────────────────────────────────

export function RetirementReportDocument({ plan, projection, contact, agentName }) {
  const pct    = projection.coveragePercent || 0
  const barPct = Math.min(pct, 100)
  const color  = coverageColor(pct)

  const provisions    = plan.provisions    || []
  const recommendations = (plan.recommendations || []).filter((r) => r.isSelected)

  const today = new Date().toLocaleDateString('en-MY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Milestones for projection mini-table
  const milestones = []
  if (projection.chartData && projection.chartData.length > 0) {
    const ages = [
      plan.retirementAge || 55,
      Math.round(((plan.retirementAge || 55) + (plan.lifeExpectancy || 85)) / 2),
      plan.lifeExpectancy || 85,
    ]
    for (const age of ages) {
      const row = projection.chartData.find((d) => d.age === age)
      if (row) milestones.push(row)
    }
  }

  return (
    <Document
      title={`Retirement Plan — ${contact?.name || 'Client'}`}
      author="LLH Group"
      subject="Retirement Financial Planning Report"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Image src={getLogo()} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Retirement Planning Report</Text>
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
            <Text style={styles.clientValue}>{contact?.currentAge || projection.currentAge || '—'}</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Retirement Age</Text>
            <Text style={styles.clientValue}>{plan.retirementAge || 55}</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Years to Retire</Text>
            <Text style={styles.clientValue}>{Math.max(0, (plan.retirementAge || 55) - (contact?.currentAge || 30))}</Text>
          </View>
          <View style={styles.clientItem}>
            <Text style={styles.clientLabel}>Life Expectancy</Text>
            <Text style={styles.clientValue}>{plan.lifeExpectancy || 85}</Text>
          </View>
        </View>

        {/* ── Summary Metrics ── */}
        <Text style={styles.sectionTitle}>Plan Summary</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Target Retirement Fund</Text>
            <Text style={[styles.metricValue, { color: C.blue }]}>{fmtRM(projection.targetAmount)}</Text>
            <Text style={styles.metricSub}>Expense: {fmtRM(projection.monthlyAtRetirement)}/mth at {plan.retirementAge}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Covered</Text>
            <Text style={[styles.metricValue, { color: C.green }]}>{fmtRM(projection.totalCovered)}</Text>
            <Text style={styles.metricSub}>EPF + Provisions + Recommendation</Text>
          </View>
          <View style={[styles.metricCard, { borderWidth: 1, borderColor: color }]}>
            <Text style={styles.metricLabel}>{projection.isFullyFunded ? 'Surplus' : 'Shortfall'}</Text>
            <Text style={[styles.metricValue, { color }]}>
              {projection.isFullyFunded ? '+' : ''}{fmtRM(projection.isFullyFunded ? projection.surplus : projection.shortfall)}
            </Text>
            <Text style={[styles.metricSub, { color }]}>{pct}% · {coverageLabel(pct)}</Text>
          </View>
        </View>

        {/* ── Coverage Bar ── */}
        <View style={styles.coverageBarWrapper}>
          <View style={styles.coverageBarLabel}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>Coverage Progress</Text>
            <Text style={{ fontSize: 8, color, fontFamily: 'Helvetica-Bold' }}>{pct}%</Text>
          </View>
          <View style={styles.coverageBarBg}>
            <View style={[styles.coverageBarFill, { width: `${barPct}%`, backgroundColor: color }]} />
          </View>
          <View style={styles.coverageStatus}>
            <Text style={{ fontSize: 7.5, color: C.gray2 }}>
              Existing (EPF + Provisions): {fmtRM(projection.epfAtRetirement + projection.provisionsAtRetirement)}
            </Text>
            <Text style={{ fontSize: 7.5, color: C.blue }}>
              Recommendation: +{fmtRM(projection.recommendationsAtRetirement)}
            </Text>
          </View>
        </View>

        {/* ── Planning Parameters ── */}
        <Text style={styles.sectionTitle}>Planning Parameters</Text>
        <View style={styles.paramsGrid}>
          <View style={styles.paramItem}>
            <Text style={styles.paramLabel}>Monthly Expenses (Today)</Text>
            <Text style={styles.paramValue}>{fmtRM(plan.monthlyExpenses)}</Text>
          </View>
          <View style={styles.paramItem}>
            <Text style={styles.paramLabel}>Inflation Rate</Text>
            <Text style={styles.paramValue}>{plan.inflationRate ?? 4}%</Text>
          </View>
          <View style={styles.paramItem}>
            <Text style={styles.paramLabel}>Pre-Retirement Return</Text>
            <Text style={styles.paramValue}>{plan.preRetirementReturn ?? 5}%</Text>
          </View>
          <View style={styles.paramItem}>
            <Text style={styles.paramLabel}>Post-Retirement Return</Text>
            <Text style={styles.paramValue}>{plan.postRetirementReturn ?? 3}%</Text>
          </View>
          {plan.includeEPF && (
            <>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>EPF Balance (Today)</Text>
                <Text style={styles.paramValue}>{fmtRM(plan.epfBalance)}</Text>
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>EPF Dividend Rate</Text>
                <Text style={styles.paramValue}>{plan.epfGrowthRate ?? 6}%</Text>
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>Projected EPF at {plan.retirementAge}</Text>
                <Text style={[styles.paramValue, { color: C.orange }]}>{fmtRM(projection.epfAtRetirement)}</Text>
              </View>
            </>
          )}
        </View>

        {/* ── Situation Comparison ── */}
        <Text style={styles.sectionTitle}>Outcome Comparison</Text>
        <View style={styles.situationRow}>
          <View style={styles.situationCard}>
            <Text style={styles.situationLabel}>Without Recommendation</Text>
            <Text style={[styles.situationAge, { color: projection.fundsRunOutAge >= plan.lifeExpectancy ? C.green : C.red }]}>
              {projection.fundsRunOutAge >= plan.lifeExpectancy ? `${plan.lifeExpectancy}+` : `${projection.fundsRunOutAge} yo`}
            </Text>
            <Text style={styles.situationSub}>
              {projection.fundsRunOutAge >= plan.lifeExpectancy
                ? 'Fully funded to life expectancy'
                : `Funds run out at age ${projection.fundsRunOutAge}`}
            </Text>
          </View>
          <View style={[styles.situationCard, { borderWidth: 1, borderColor: C.blue }]}>
            <Text style={styles.situationLabel}>With Recommendation</Text>
            <Text style={[styles.situationAge, { color: projection.fundsRunOutWithRec >= plan.lifeExpectancy ? C.green : C.orange }]}>
              {projection.fundsRunOutWithRec >= plan.lifeExpectancy ? `${plan.lifeExpectancy}+` : `${projection.fundsRunOutWithRec} yo`}
            </Text>
            <Text style={styles.situationSub}>
              {projection.fundsRunOutWithRec >= plan.lifeExpectancy
                ? `Fully funded · ${pct}% of goal covered`
                : `Extends to age ${projection.fundsRunOutWithRec} · ${pct}% covered`}
            </Text>
          </View>
        </View>

        {/* ── Existing Provisions ── */}
        {provisions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Existing Provisions</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Today's Value</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monthly</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Projected at {plan.retirementAge}</Text>
              </View>
              {provisions.map((p, i) => (
                <View key={p.id || i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{p.name || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>{p.type || '—'}</Text>
                  <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>{fmtRM(p.currentBalance)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fmtRM(p.contributionAmount)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', color: C.green }]}>
                    {fmtRM(p._projectedValue)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Recommendations ── */}
        {recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommended Actions</Text>
            {recommendations.map((rec, i) => (
              <View key={rec.id || i} style={styles.recCard}>
                <Text style={styles.recTitle}>
                  {rec.label || `Recommendation ${i + 1}`}
                </Text>
                {rec.pmt > 0 && (
                  <Text style={styles.recDetail}>
                    Invest {fmtRM(rec.pmt)}/month for {rec.n} years at {rec.rate}% p.a.
                    → Projected: {fmtRM(rec.fvResult)}
                  </Text>
                )}
                {rec.pv > 0 && rec.pmt === 0 && (
                  <Text style={styles.recDetail}>
                    One-time investment of {fmtRM(rec.pv)} at {rec.rate}% p.a.
                    → Projected: {fmtRM(rec.fvResult)}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This report is prepared by {agentName || 'Henry Lee'} of LLH Group for planning purposes only. It does not constitute financial advice.
            Projections are estimates based on assumed rates of return and inflation and are not guaranteed. Past performance does not guarantee future results.
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

export function RetirementExportButton({ plan, projection, contact, agentName }) {
  const fileName = `Retirement_Plan_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`

  return (
    <PDFDownloadLink
      document={
        <RetirementReportDocument
          plan={plan}
          projection={projection}
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
