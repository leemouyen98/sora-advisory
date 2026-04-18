import {
  Document, Page, Text, View, StyleSheet, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { formatRMFull } from '../../lib/calculations'

const getLogo = () => `${window.location.origin}/assets/sora-logo.png`

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:   '#060F1E',
  blue:   '#2E96FF',
  green:  '#34C759',
  orange: '#FF9500',
  red:    '#FF3B30',
  gray1:  '#1C1C1E',
  gray2:  '#636366',
  gray3:  '#AEAEB2',
  gray5:  '#E5E5EA',
  gray6:  '#F5F5F7',
  white:  '#FFFFFF',
  black:  '#000000',
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtRM(val) {
  if (!val && val !== 0) return 'RM 0'
  return formatRMFull(val)
}

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

// DD/MM/YYYY
function fmtDateShort(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '—'
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
  } catch { return '—' }
}

// Compact number for narrow table cells — no RM prefix, blank for zero
function fmtCompact(val) {
  const n = Number(val) || 0
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('en-MY', { maximumFractionDigits: 0 })
}

// Full RM for totals row
function fmtTotal(val) {
  const n = Number(val) || 0
  if (!n) return 'RM 0'
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcAge(dob) {
  if (!dob) return '—'
  try {
    const d = new Date(dob)
    if (isNaN(d.getTime())) return '—'
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() ||
        (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return age > 0 ? String(age) : '—'
  } catch { return '—' }
}

const STATUS_COLOR = {
  Active:     C.green,
  Lapsed:     C.red,
  Matured:    C.blue,
  Surrendered:C.orange,
}

// ─── Type → tick mapping ──────────────────────────────────────────────────────

function getTypeTicks(p) {
  const t = (p.type || '').toLowerCase()
  return {
    wholeLife: t.includes('whole'),
    endowment: t.includes('endowment'),
    term:      t.includes('term'),
    ci:        t.includes('critical'),
    accident:  t.includes('accident'),
    medical:   t.includes('medical') || t.includes('health'),
    pwv:       !!p.hasPremiumWaiver,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORIGINAL PORTFOLIO PDF (A4 Portrait)
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page:          { padding: 36, fontFamily: 'Helvetica', fontSize: 8, color: C.gray1, backgroundColor: C.white },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo:          { width: 70, height: 22, objectFit: 'contain' },
  headerRight:   { alignItems: 'flex-end' },
  title:         { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: -0.3 },
  subtitle:      { fontSize: 8, color: C.gray2, marginTop: 2 },
  clientStrip:   { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 6, padding: 10, marginBottom: 16, gap: 20 },
  clientLabel:   { fontSize: 6.5, color: C.gray3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  clientValue:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white },
  summaryRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard:   { flex: 1, backgroundColor: C.gray6, borderRadius: 5, padding: 8, alignItems: 'center' },
  summaryLabel:  { fontSize: 6.5, color: C.gray2, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  summaryValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.gray1 },
  tableHeader:   { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 4 },
  tableHeaderTx: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow:      { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray5 },
  tableRowAlt:   { backgroundColor: C.gray6 },
  tableCell:     { fontSize: 7.5, color: C.gray1 },
  tableCellBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.gray1 },
  sectionTitle:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.navy, marginTop: 16, marginBottom: 8 },
  coverageRow:   { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray5 },
  statusBadge:   { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 8, alignSelf: 'flex-start' },
  statusText:    { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  footer:        { position: 'absolute', bottom: 20, left: 36, right: 36 },
  footerLine:    { height: 0.5, backgroundColor: C.gray5, marginBottom: 6 },
  footerText:    { fontSize: 6, color: C.gray3, textAlign: 'center' },
  pageNumber:    { fontSize: 6, color: C.gray3, textAlign: 'right', marginTop: 2 },
  notesText:     { fontSize: 7, color: C.gray2, fontStyle: 'italic', marginTop: 2, paddingLeft: 6 },
})

const COL = { no: '8%', company: '14%', plan: '18%', type: '12%', sum: '14%', premium: '14%', status: '10%', dates: '10%' }

function InsurancePoliciesDocument({ policies, contact, agentName }) {
  const activePolicies   = policies.filter(p => p.status === 'Active')
  const totalAnnualPrem  = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const totalSumAssured  = policies.reduce((s, p) => s + (Number(p.sumAssured) || 0), 0)
  const totalDeath       = policies.reduce((s, p) => s + (Number(p.coverageDetails?.death) || 0), 0)
  const totalTPD         = policies.reduce((s, p) => s + (Number(p.coverageDetails?.tpd) || 0), 0)
  const totalCI          = policies.reduce((s, p) => s + (Number(p.coverageDetails?.ci) || 0), 0)
  const totalMedical     = policies.reduce((s, p) => s + (Number(p.coverageDetails?.medicalCard) || 0), 0)
  const totalPA          = policies.reduce((s, p) => s + (Number(p.coverageDetails?.paDb) || 0), 0)
  const hasCoverage      = totalDeath || totalTPD || totalCI || totalMedical || totalPA

  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <Image src={getLogo()} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.title}>Insurance Portfolio</Text>
            <Text style={s.subtitle}>
              Prepared by {agentName || 'Adviser'} · {new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={s.clientStrip}>
          {[
            { label: 'Client',         value: contact?.name || 'Client' },
            { label: 'Total Policies', value: String(policies.length) },
            { label: 'Active',         value: String(activePolicies.length) },
            { label: 'Annual Premium', value: fmtRM(totalAnnualPrem) },
            { label: 'Sum Assured',    value: fmtRM(totalSumAssured) },
          ].map(({ label, value }) => (
            <View key={label}>
              <Text style={s.clientLabel}>{label}</Text>
              <Text style={s.clientValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.summaryRow}>
          {[
            { label: 'Death', value: totalDeath },
            { label: 'TPD',   value: totalTPD   },
            { label: 'CI',    value: totalCI     },
            { label: 'Medical', value: totalMedical },
            { label: 'PA / DB', value: totalPA   },
          ].map(c => (
            <View key={c.label} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{c.label}</Text>
              <Text style={[s.summaryValue, { color: c.value > 0 ? C.blue : C.gray3 }]}>{fmtRM(c.value)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Policy Details</Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderTx, { width: COL.no }]}>No.</Text>
          <Text style={[s.tableHeaderTx, { width: COL.company }]}>Company</Text>
          <Text style={[s.tableHeaderTx, { width: COL.plan }]}>Plan Name</Text>
          <Text style={[s.tableHeaderTx, { width: COL.type }]}>Type</Text>
          <Text style={[s.tableHeaderTx, { width: COL.sum, textAlign: 'right' }]}>Sum Assured</Text>
          <Text style={[s.tableHeaderTx, { width: COL.premium, textAlign: 'right' }]}>Annual Prem.</Text>
          <Text style={[s.tableHeaderTx, { width: COL.status, textAlign: 'center' }]}>Status</Text>
          <Text style={[s.tableHeaderTx, { width: COL.dates, textAlign: 'right' }]}>Start</Text>
        </View>

        {policies.map((p, i) => (
          <View key={i} wrap={false}>
            <View style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCell,     { width: COL.no }]}>{p.policyNo || `#${i + 1}`}</Text>
              <Text style={[s.tableCell,     { width: COL.company }]}>{p.company || '—'}</Text>
              <Text style={[s.tableCellBold, { width: COL.plan }]}>{p.planName || '—'}</Text>
              <Text style={[s.tableCell,     { width: COL.type }]}>{p.type || '—'}</Text>
              <Text style={[s.tableCell,     { width: COL.sum, textAlign: 'right' }]}>{fmtRM(p.sumAssured)}</Text>
              <Text style={[s.tableCell,     { width: COL.premium, textAlign: 'right' }]}>{fmtRM(p.annualPremium)}</Text>
              <View style={{ width: COL.status, alignItems: 'center' }}>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[p.status] || C.gray3) + '22' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[p.status] || C.gray3 }]}>{p.status}</Text>
                </View>
              </View>
              <Text style={[s.tableCell, { width: COL.dates, textAlign: 'right' }]}>{fmtDate(p.commencementDate)}</Text>
            </View>
            {p.notes ? <Text style={s.notesText}>{p.notes}</Text> : null}
          </View>
        ))}

        {hasCoverage && (
          <>
            <Text style={s.sectionTitle}>Coverage Breakdown by Policy</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderTx, { width: '26%' }]}>Policy</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>Death</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>TPD</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>CI</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>Medical</Text>
              <Text style={[s.tableHeaderTx, { width: '14%', textAlign: 'right' }]}>PA / DB</Text>
            </View>
            {policies.map((p, i) => {
              const cd = p.coverageDetails || {}
              if (!cd.death && !cd.tpd && !cd.ci && !cd.medicalCard && !cd.paDb) return null
              return (
                <View key={i} style={[s.coverageRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: '26%' }]}>{p.planName || p.type || `Policy #${i + 1}`}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.death      ? fmtRM(cd.death)      : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.tpd        ? fmtRM(cd.tpd)        : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.ci         ? fmtRM(cd.ci)         : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.medicalCard ? fmtRM(cd.medicalCard): '—'}</Text>
                  <Text style={[s.tableCell, { width: '14%', textAlign: 'right' }]}>{cd.paDb       ? fmtRM(cd.paDb)       : '—'}</Text>
                </View>
              )
            })}
            <View style={[s.coverageRow, { backgroundColor: C.navy, borderRadius: 4, marginTop: 2 }]}>
              <Text style={[s.tableCellBold, { width: '26%', color: C.white }]}>TOTAL</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalDeath)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalTPD)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalCI)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalMedical)}</Text>
              <Text style={[s.tableCellBold, { width: '14%', textAlign: 'right', color: C.white }]}>{fmtRM(totalPA)}</Text>
            </View>
          </>
        )}

        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <Text style={s.footerText}>
            Prepared for {contact?.name || 'the client'} by {agentName || 'Adviser'} · For reference only. Verify all policy details with the respective insurers.
          </Text>
          <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

export function InsuranceExportButton({ policies, contact, agentName }) {
  const fileName = `Insurance_Portfolio_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  return (
    <PDFDownloadLink document={<InsurancePoliciesDocument policies={policies} contact={contact} agentName={agentName} />} fileName={fileName}>
      {({ loading }) => (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-hig-blue text-hig-blue hover:bg-hig-blue hover:text-white transition-colors disabled:opacity-50"
          disabled={loading}
        >
          <DownloadIcon />
          {loading ? 'Generating…' : 'Portfolio PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  POLICY SUMMARY — LLH-style (A4 Landscape)
// ─────────────────────────────────────────────────────────────────────────────
//
//  Column widths are PERCENTAGES that sum to exactly 100% so the table always
//  fills the full printable width regardless of page margins or screen DPI.
//
//  Layout:
//    No | Start Date | Company + Plan | Policy No | WL | End | Term | CI |
//    Acc | Med | PWV | Nominee | Maturity | Age | Premium /yr
//
// ─────────────────────────────────────────────────────────────────────────────

const PC = {
  no:      '2.5%',   // row number
  date:    '8%',     // policy start date
  company: '13%',    // company + plan name (2 lines)
  polNo:   '11%',    // policy number
  wl:      '4.5%',   // whole life  ✓
  end:     '4.5%',   // endowment   ✓
  term:    '4.5%',   // term        ✓
  ci:      '4.5%',   // CI          ✓
  acc:     '4.5%',   // accident    ✓
  med:     '4.5%',   // medical     ✓
  pwv:     '5.5%',   // prem waiver ✓
  nom:     '13%',    // nominee
  mat:     '8%',     // maturity date
  age:     '3%',     // age
  prem:    '9%',     // annual premium
  // total: 2.5+8+13+11+4.5×6+5.5+13+8+3+9 = 100% ✓
}

const ps = StyleSheet.create({
  page: {
    padding: '5% 3.5%',          // relative padding — fits both landscape edges
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#1C1C1E',
    backgroundColor: '#fff',
  },

  // ── Page header ─────────────────────────────────────────────────────────────
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },

  docTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  docSubtitle: {
    fontSize: 8,
    color: '#636366',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Client / Agent info ──────────────────────────────────────────────────────
  infoBlock: { flexDirection: 'column' },
  infoLine:  { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  infoLbl:   { fontSize: 7, color: '#636366', width: 36, flexShrink: 0 },
  infoColon: { fontSize: 7, color: '#636366', width: 8, flexShrink: 0 },
  infoVal:   {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1C1E',
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
    paddingBottom: 1,
    minWidth: 100,
  },
  infoValRight: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1C1E',
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
    paddingBottom: 1,
    minWidth: 100,
    textAlign: 'right',
  },

  // ── Table ────────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 0.75,
    borderColor: '#1C1C1E',
    marginTop: 10,
  },

  // Header row
  thead: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
  },
  th: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#636366',
  },
  thLast: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Data rows
  tr: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
    minHeight: 24,
  },
  trAlt: { backgroundColor: '#F8F8F8' },

  // Cells
  td: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    fontSize: 6.5,
    color: '#1C1C1E',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tdLeft: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 6.5,
    color: '#1C1C1E',
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#C7C7CC',
    justifyContent: 'center',
  },
  tdRight: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 6.5,
    color: '#1C1C1E',
    textAlign: 'right',
    justifyContent: 'center',
  },

  // Tick box — filled square (more reliable than Unicode in PDF)
  tick: {
    width: 7,
    height: 7,
    backgroundColor: '#1C1C1E',
    borderRadius: 1,
  },

  // Total / footer row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderTopWidth: 0.75,
    borderTopColor: '#1C1C1E',
    minHeight: 18,
  },
  totalLbl: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1C1E',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#1C1C1E',
  },
  totalVal: {
    width: PC.prem,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1C1C1E',
    textAlign: 'right',
    justifyContent: 'center',
  },

  // ── Page footer ──────────────────────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 14, left: '3.5%', right: '3.5%' },
  footerLine: { height: 0.5, backgroundColor: '#E5E5EA', marginBottom: 4 },
  footerTx: { fontSize: 5.5, color: '#AEAEB2', textAlign: 'center' },
  pageNum:  { fontSize: 5.5, color: '#AEAEB2', textAlign: 'right', marginTop: 2 },
})

// ─── Primitives ───────────────────────────────────────────────────────────────

function TH({ width, children, last }) {
  return (
    <View style={[last ? ps.thLast : ps.th, { width }]}>
      <Text>{children}</Text>
    </View>
  )
}

function TD({ width, children, left, right, bold, sub }) {
  const base = right ? ps.tdRight : left ? ps.tdLeft : ps.td
  return (
    <View style={[base, { width }]}>
      {typeof children === 'string' || typeof children === 'number'
        ? <Text style={bold ? { fontFamily: 'Helvetica-Bold' } : {}}>{children}</Text>
        : children
      }
      {sub ? <Text style={{ fontSize: 5.5, color: '#8E8E93', marginTop: 1 }}>{sub}</Text> : null}
    </View>
  )
}

function TickBox() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <View style={ps.tick} />
    </View>
  )
}

function InfoLine({ label, value, rightAlign }) {
  return (
    <View style={ps.infoLine}>
      <Text style={ps.infoLbl}>{label}</Text>
      <Text style={ps.infoColon}>:</Text>
      <Text style={rightAlign ? ps.infoValRight : ps.infoVal}>{value || ''}</Text>
    </View>
  )
}

// ─── Policy Summary Document ──────────────────────────────────────────────────

function PolicySummaryDocument({ policies, contact, agentName, agentMobile, agentEmail }) {
  const today        = new Date().toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const totalPremium = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const contactAge   = calcAge(contact?.dob)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={ps.page}>

        {/* ── Page header: client left · title centre · agent right ── */}
        <View style={ps.pageHeader}>

          {/* Client info */}
          <View style={ps.headerLeft}>
            <InfoLine label="Name"  value={contact?.name || ''} />
            <InfoLine label="I/C No" value={contact?.nric || contact?.ic || ''} />
            <InfoLine label="Date"  value={today} />
          </View>

          {/* Title */}
          <View style={ps.headerCenter}>
            <Text style={ps.docTitle}>保单分析 POLICY SUMMARY</Text>
            <Text style={ps.docSubtitle}>LLH Group · Prepared by {agentName || '—'}</Text>
          </View>

          {/* Agent info */}
          <View style={ps.headerRight}>
            <InfoLine label="分析者"  value={agentName  || ''} rightAlign />
            <InfoLine label="H/P No" value={agentMobile || ''} rightAlign />
            <InfoLine label="Email"  value={agentEmail  || ''} rightAlign />
          </View>

        </View>

        {/* ── Table ── */}
        <View style={ps.table}>

          {/* Header */}
          <View style={ps.thead}>
            <TH width={PC.no}>{'编号\nNo.'}</TH>
            <TH width={PC.date}>{'日期\nStart\nDate'}</TH>
            <TH width={PC.company}>{'公司 / 计划\nCompany / Plan'}</TH>
            <TH width={PC.polNo}>{'保单号码\nPolicy No.'}</TH>
            <TH width={PC.wl}>{'终生\nWhole\nLife'}</TH>
            <TH width={PC.end}>{'储蓄\nEndo-\nwment'}</TH>
            <TH width={PC.term}>{'定期\nTerm'}</TH>
            <TH width={PC.ci}>{'疾病\nCritical\nIllness'}</TH>
            <TH width={PC.acc}>{'意外\nAcci-\ndent'}</TH>
            <TH width={PC.med}>{'医药\nMedical\nCard'}</TH>
            <TH width={PC.pwv}>{'免缴保费\nPremium\nWaiver'}</TH>
            <TH width={PC.nom}>{'受益人\nNominee'}</TH>
            <TH width={PC.mat}>{'满期\nMaturity'}</TH>
            <TH width={PC.age}>{'年龄\nAge'}</TH>
            <TH width={PC.prem} last>{'保费\nPremium\n/ yr'}</TH>
          </View>

          {/* Data rows */}
          {policies.map((p, i) => {
            const ticks = getTypeTicks(p)
            return (
              <View key={i} style={[ps.tr, i % 2 === 1 ? ps.trAlt : {}]} wrap={false}>
                <TD width={PC.no}>{i + 1}</TD>
                <TD width={PC.date}>{fmtDateShort(p.commencementDate)}</TD>
                <TD width={PC.company} left bold sub={p.planName || undefined}>{p.company || '—'}</TD>
                <TD width={PC.polNo} left>{p.policyNo || '—'}</TD>
                <TD width={PC.wl}>{ticks.wholeLife ? <TickBox /> : null}</TD>
                <TD width={PC.end}>{ticks.endowment ? <TickBox /> : null}</TD>
                <TD width={PC.term}>{ticks.term      ? <TickBox /> : null}</TD>
                <TD width={PC.ci}>{ticks.ci         ? <TickBox /> : null}</TD>
                <TD width={PC.acc}>{ticks.accident   ? <TickBox /> : null}</TD>
                <TD width={PC.med}>{ticks.medical    ? <TickBox /> : null}</TD>
                <TD width={PC.pwv}>{ticks.pwv        ? <TickBox /> : null}</TD>
                <TD width={PC.nom} left>{p.nominee || ''}</TD>
                <TD width={PC.mat}>{fmtDateShort(p.maturityDate)}</TD>
                <TD width={PC.age}>{contactAge}</TD>
                <TD width={PC.prem} right>{fmtCompact(p.annualPremium)}</TD>
              </View>
            )
          })}

          {/* Total row */}
          <View style={ps.totalRow}>
            <View style={ps.totalLbl}>
              <Text>总保费 / 保障　Total Annual Premium / Coverage</Text>
            </View>
            <View style={ps.totalVal}>
              <Text>{fmtTotal(totalPremium)}</Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={ps.footer} fixed>
          <View style={ps.footerLine} />
          <Text style={ps.footerTx}>
            Prepared for {contact?.name || 'the client'} by {agentName || 'Adviser'} · For reference only. Verify all policy details with the respective insurance companies.
          </Text>
          <Text style={ps.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

// ─── Policy Summary Export Button ─────────────────────────────────────────────

export function PolicySummaryExportButton({ policies, contact, agentName, agentMobile, agentEmail }) {
  const fileName = `Policy_Summary_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  return (
    <PDFDownloadLink
      document={
        <PolicySummaryDocument
          policies={policies}
          contact={contact}
          agentName={agentName}
          agentMobile={agentMobile}
          agentEmail={agentEmail}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-hig-navy text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          disabled={loading}
        >
          <DownloadIcon />
          {loading ? 'Generating…' : '保单分析 Export'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─── Shared icon ──────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
