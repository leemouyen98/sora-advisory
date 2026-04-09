import {
  Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { formatRMFull, recMonthlyFV } from '../../lib/calculations'

const getLogo = () => `${window.location.origin}/assets/sora-logo.png`

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:   '#060F1E',
  blue:   '#2E96FF',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
  yellow: '#FFB800',
  gray1:  '#1C1C1E',
  gray2:  '#636366',
  gray3:  '#AEAEB2',
  gray5:  '#E5E5EA',
  gray6:  '#F5F5F7',
  white:  '#FFFFFF',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Native Retirement Bar Chart ─────────────────────────────────────────────
// Stacked vertical bars: EPF (orange) | Provisions (green) | Recommendations (blue) | Shortfall (red)
// Bottom-aligned, flex-proportioned within each bar's height
function RetirementBarChart({ chartData, retirementAge, lifeExpectancy }) {
  if (!chartData || chartData.length === 0) return null

  const CHART_H   = 100
  const MAX_BARS  = 16
  const step      = Math.max(1, Math.floor(chartData.length / MAX_BARS))
  const sampled   = chartData.filter((_, i) => i % step === 0 || chartData[i].age === retirementAge)
  // Deduplicate by age
  const seen      = new Set()
  const bars      = sampled.filter(d => { if (seen.has(d.age)) return false; seen.add(d.age); return true })

  // Max total for scaling
  const maxTotal  = Math.max(...bars.map(d => (d.epf || 0) + (d.provisions || 0) + (d.recommendations || 0) + (d.shortfall || 0)), 1)

  const SEGMENTS = [
    { key: 'epf',             color: C.orange, label: 'EPF'             },
    { key: 'provisions',      color: C.green,  label: 'Provisions'      },
    { key: 'recommendations', color: C.blue,   label: 'Recommendations' },
    { key: 'shortfall',       color: '#FF453A22', label: 'Shortfall', borderColor: '#FF453A' },
  ]

  return (
    <View>
      {/* Chart area */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 2 }}>
        {bars.map((d) => {
          const total    = (d.epf || 0) + (d.provisions || 0) + (d.recommendations || 0) + (d.shortfall || 0)
          const barH     = Math.max(4, (total / maxTotal) * CHART_H)
          const isRetire = d.age === retirementAge

          return (
            <View key={d.age} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{
                height: barH,
                width: '100%',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                ...(isRetire ? { borderWidth: 1, borderColor: C.blue } : {}),
              }}>
                {/* Render segments bottom-to-top: shortfall on top (renders last = visually top) */}
                {(d.shortfall || 0) > 0 && (
                  <View style={{ flex: d.shortfall, backgroundColor: '#FFCCC9' }} />
                )}
                {(d.recommendations || 0) > 0 && (
                  <View style={{ flex: d.recommendations, backgroundColor: C.blue }} />
                )}
                {(d.provisions || 0) > 0 && (
                  <View style={{ flex: d.provisions, backgroundColor: C.green }} />
                )}
                {(d.epf || 0) > 0 && (
                  <View style={{ flex: d.epf, backgroundColor: C.orange }} />
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', marginTop: 4, gap: 2 }}>
        {bars.map((d) => {
          const isRetire = d.age === retirementAge
          return (
            <View key={d.age} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontSize: 5.5,
                color: isRetire ? C.blue : C.gray3,
                fontFamily: isRetire ? 'Helvetica-Bold' : 'Helvetica',
              }}>
                {d.age}
              </Text>
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: C.orange,  label: 'EPF'             },
          { color: C.green,   label: 'Provisions'      },
          { color: C.blue,    label: 'Recommendations' },
          { color: '#FFCCC9', label: 'Shortfall'       },
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
  logo:        { width: 90, height: 41, objectFit: 'contain' },
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
    borderWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: C.blue,
  },
  clientItem:  { flex: 1 },
  clientLabel: { fontSize: 6.5, color: C.gray3, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  clientValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Section heading
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10 },
  sectionBar:   { width: 3, height: 13, backgroundColor: C.blue, borderRadius: 2 },
  sectionTitle: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.gray1, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Summary cards
  summaryCards: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  summaryCard: {
    flex: 1, borderRadius: 8, padding: 12,
    alignItems: 'center', borderWidth: 0, borderTopWidth: 3,
  },
  summaryLabel: { fontSize: 7, color: C.gray2, marginBottom: 4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  summarySub:   { fontSize: 6.5, color: C.gray3, marginTop: 3, textAlign: 'center' },

  // Coverage bar
  coverageBarWrapper: {
    backgroundColor: C.gray6, borderRadius: 8, padding: 12, marginBottom: 18,
  },
  coverageBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  coverageBarBg:  { height: 9, backgroundColor: C.gray5, borderRadius: 5, overflow: 'hidden' },
  coverageBarFill:{ height: 9, borderRadius: 5 },
  coverageBarBot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },

  // Params grid
  paramsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 10 },
  paramItem:  { width: '25%', paddingRight: 8, marginBottom: 8 },
  paramLabel: { fontSize: 6.5, color: C.gray3, marginBottom: 1, textTransform: 'uppercase', letterSpacing: 0.3 },
  paramValue: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  // Situation comparison
  situationRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  situationCard: { flex: 1, borderRadius: 8, padding: 12, backgroundColor: C.gray6 },
  situationLabel:{ fontSize: 6.5, color: C.gray3, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  situationAge:  { fontSize: 20, fontFamily: 'Helvetica-Bold' },
  situationSub:  { fontSize: 7.5, color: C.gray2, marginTop: 3 },

  // Chart container
  chartWrapper: {
    backgroundColor: C.gray6, borderRadius: 8, padding: 12, marginBottom: 6,
  },

  // Table
  table:       { marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: C.navy,
    borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10,
  },
  tableHeaderCell: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tableRow: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 0, borderBottomWidth: 0.5, borderBottomColor: C.gray5,
  },
  tableRowAlt: { backgroundColor: C.gray6 },
  tableCell:   { fontSize: 8, color: C.gray1 },

  // Recommendations
  recCard: {
    backgroundColor: C.gray6, borderRadius: 8, padding: 11,
    marginBottom: 7, borderWidth: 0, borderLeftWidth: 3, borderLeftColor: C.blue,
  },
  recTitle:  { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  recDetail: { fontSize: 7.5, color: C.gray2, marginTop: 2 },

  // Footer
  footer: {
    position: 'absolute', bottom: 16, left: 36, right: 36,
    paddingTop: 7, borderWidth: 0, borderTopWidth: 0.5, borderTopColor: C.gray5,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  footerText: { fontSize: 6, color: C.gray3, lineHeight: 1.6, flex: 1 },
  pageNumber: { fontSize: 6.5, color: C.gray3, textAlign: 'right', marginLeft: 12 },
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
export function RetirementReportDocument({ plan, projection, contact, agentName }) {
  const pct    = projection.coveragePercent || 0
  const barPct = Math.min(pct, 100)
  const color  = coverageColor(pct)

  const provisions      = projection.provisionDetails || plan.provisions || []
  const recommendations = (plan.recommendations || []).filter((r) => r.isSelected)
  const currentAge      = contact?.currentAge || projection.currentAge || 30
  const retireAge       = plan.retirementAge  || 55
  const lifeExp         = plan.lifeExpectancy || 100
  const yearsToRetirement = Math.max(0, retireAge - currentAge)

  const today = new Date().toLocaleDateString('en-MY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Document
      title={`Retirement Plan — ${contact?.name || 'Client'}`}
      author="Sora by LLH Group"
      subject="Retirement Financial Planning Report"
    >
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoCard}>
            <Image src={getLogo()} style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Retirement Planning Report</Text>
            <Text style={styles.headerSub}>Prepared by {agentName || 'Henry Lee'} · {today}</Text>
            <Text style={[styles.headerSub, { marginTop: 1 }]}>PRIVATE &amp; CONFIDENTIAL</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* Client strip */}
          <View style={styles.clientStrip}>
            {[
              { label: 'Client',          value: contact?.name || '—'         },
              { label: 'Current Age',     value: `${currentAge}`              },
              { label: 'Retirement Age',  value: `${retireAge}`               },
              { label: 'Years to Retire', value: `${Math.max(0, retireAge - currentAge)}` },
              { label: 'Life Expectancy', value: `${lifeExp}`                 },
              { label: 'Status',          value: coverageLabel(pct), color    },
            ].map(({ label, value, color: c }) => (
              <View key={label} style={styles.clientItem}>
                <Text style={styles.clientLabel}>{label}</Text>
                <Text style={[styles.clientValue, c ? { color: c } : {}]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Plan Summary ── */}
          <SectionHead title="Plan Summary" />
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, { backgroundColor: '#EBF5FF', borderTopColor: C.blue }]}>
              <Text style={styles.summaryLabel}>Target Retirement Fund</Text>
              <Text style={[styles.summaryValue, { color: C.blue }]}>{fmtRM(projection.targetAmount)}</Text>
              <Text style={styles.summarySub}>{fmtRM(projection.monthlyAtRetirement)}/mth at age {retireAge}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#EDFAF2', borderTopColor: C.green }]}>
              <Text style={styles.summaryLabel}>Total Covered</Text>
              <Text style={[styles.summaryValue, { color: C.green }]}>{fmtRM(projection.totalCovered)}</Text>
              <Text style={styles.summarySub}>EPF + Provisions + Recommendation</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: color + '14', borderTopColor: color }]}>
              <Text style={styles.summaryLabel}>{projection.isFullyFunded ? 'Surplus' : 'Shortfall'}</Text>
              <Text style={[styles.summaryValue, { color }]}>
                {projection.isFullyFunded ? '+' : ''}{fmtRM(projection.isFullyFunded ? projection.surplus : projection.shortfall)}
              </Text>
              <Text style={[styles.summarySub, { color }]}>{pct}% · {coverageLabel(pct)}</Text>
            </View>
          </View>

          {/* ── Coverage Bar ── */}
          <View style={styles.coverageBarWrapper}>
            <View style={styles.coverageBarTop}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray1 }}>Coverage Progress</Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color }}>{pct}% {coverageLabel(pct)}</Text>
            </View>
            <View style={styles.coverageBarBg}>
              <View style={[styles.coverageBarFill, { width: `${barPct}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.coverageBarBot}>
              <Text style={{ fontSize: 7, color: C.gray2 }}>
                Existing (EPF + Provisions): {fmtRM((projection.epfAtRetirement || 0) + (projection.provisionsAtRetirement || 0))}
              </Text>
              <Text style={{ fontSize: 7, color: C.blue }}>
                With Recommendation: {fmtRM(projection.totalCovered)}
              </Text>
            </View>
          </View>

          {/* ── Fund Projection Chart ── */}
          {projection.chartData && projection.chartData.length > 0 && (
            <>
              <SectionHead title="Fund Projection" />
              <View style={styles.chartWrapper}>
                <Text style={{ fontSize: 7.5, color: C.gray2, marginBottom: 10 }}>
                  Projected fund value by age (retirement at {retireAge}, life expectancy {lifeExp}) — RM values
                </Text>
                <RetirementBarChart
                  chartData={projection.chartData}
                  retirementAge={retireAge}
                  lifeExpectancy={lifeExp}
                />
              </View>
            </>
          )}

          {/* ── Planning Parameters ── */}
          <SectionHead title="Planning Parameters" />
          <View style={styles.paramsGrid}>
            {[
              { label: 'Monthly Expenses (Today)', value: fmtRM(plan.monthlyExpenses) },
              { label: 'Inflation Rate',            value: `${plan.inflationRate ?? 4}%` },
              { label: 'Post-Retirement Return',    value: `${plan.postRetirementReturn ?? 3}%` },
              ...(plan.includeEPF ? [
                { label: 'EPF Balance (Today)',          value: fmtRM(plan.epfBalance) },
                { label: 'EPF Dividend Rate',            value: `${plan.epfGrowthRate ?? 6}%` },
                { label: `Projected EPF at ${retireAge}`, value: fmtRM(projection.epfAtRetirement), color: C.orange },
              ] : []),
            ].map(({ label, value, color: c }) => (
              <View key={label} style={styles.paramItem}>
                <Text style={styles.paramLabel}>{label}</Text>
                <Text style={[styles.paramValue, c ? { color: c } : {}]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Outcome Comparison ── */}
          <SectionHead title="Outcome Comparison" />
          <View style={styles.situationRow}>
            <View style={styles.situationCard}>
              <Text style={styles.situationLabel}>Without Recommendation</Text>
              <Text style={[styles.situationAge, {
                color: projection.fundsRunOutAge >= lifeExp ? C.green : C.red,
              }]}>
                {projection.fundsRunOutAge >= lifeExp ? `${lifeExp}+` : `${projection.fundsRunOutAge} yo`}
              </Text>
              <Text style={styles.situationSub}>
                {projection.fundsRunOutAge >= lifeExp
                  ? 'Fully funded to life expectancy'
                  : `Funds run out at age ${projection.fundsRunOutAge}`}
              </Text>
            </View>
            <View style={[styles.situationCard, { borderWidth: 1.5, borderColor: C.blue }]}>
              <Text style={styles.situationLabel}>With Recommendation</Text>
              <Text style={[styles.situationAge, {
                color: projection.fundsRunOutWithRec >= lifeExp ? C.green : C.orange,
              }]}>
                {projection.fundsRunOutWithRec >= lifeExp ? `${lifeExp}+` : `${projection.fundsRunOutWithRec} yo`}
              </Text>
              <Text style={styles.situationSub}>
                {projection.fundsRunOutWithRec >= lifeExp
                  ? `Fully funded · ${pct}% of goal covered`
                  : `Extends to age ${projection.fundsRunOutWithRec} · ${pct}% covered`}
              </Text>
            </View>
          </View>

          {/* ── Existing Provisions ── */}
          {provisions.length > 0 && (
            <>
              <SectionHead title="Existing Provisions" />
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Type</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Today's Value</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Monthly</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Projected at {retireAge}</Text>
                </View>
                {provisions.map((p, i) => (
                  <View key={p.id || i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{p.name || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{p.type || '—'}</Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>{fmtRM(p.currentBalance)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fmtRM(p.contributionAmount)}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right', color: C.green }]}>
                      {fmtRM(p.projectedValue)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Recommendations ── */}
          {recommendations.length > 0 && (
            <>
              <SectionHead title="Recommended Actions" />
              {recommendations.map((rec, i) => {
                const rate    = rec.growthRate || 5
                const monthly = rec.monthlyAmount || 0
                const lump    = rec.lumpSum || 0
                const years   = rec.periodYears || yearsToRetirement

                let fvResult = 0
                if (rec.type === 'custom') {
                  fvResult = rec.futureValue || 0
                } else if (monthly > 0) {
                  fvResult = recMonthlyFV(monthly, rate, years, yearsToRetirement)
                } else if (lump > 0) {
                  fvResult = Math.round(lump * Math.pow(1 + rate / 100, yearsToRetirement))
                }

                return (
                  <View key={rec.id || i} style={styles.recCard}>
                    <Text style={styles.recTitle}>
                      {rec.name || `Recommendation ${i + 1}`}
                    </Text>
                    {monthly > 0 && (
                      <Text style={styles.recDetail}>
                        Invest {fmtRM(monthly)}/month for {years} years at {rate}% p.a.
                        {'  →  '}Projected: {fmtRM(fvResult)}
                      </Text>
                    )}
                    {lump > 0 && monthly === 0 && (
                      <Text style={styles.recDetail}>
                        One-time investment of {fmtRM(lump)} at {rate}% p.a.
                        {'  →  '}Projected: {fmtRM(fvResult)}
                      </Text>
                    )}
                    {rec.type === 'custom' && monthly === 0 && lump === 0 && (
                      <Text style={styles.recDetail}>
                        Target value: {fmtRM(rec.futureValue)} at {rate}% p.a.
                      </Text>
                    )}
                  </View>
                )
              })}
            </>
          )}

        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            This report is prepared by {agentName || 'Henry Lee'} of Sora by LLH Group for planning purposes only.
            It does not constitute financial advice. Projections are estimates based on assumed rates of return and
            inflation and are not guaranteed. Past performance does not guarantee future results.
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

// ─── Export Button ─────────────────────────────────────────────────────────────
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
