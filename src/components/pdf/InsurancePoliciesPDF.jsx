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

function fmtDateShort(d) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`
  } catch { return d }
}

function calcAge(dob) {
  if (!dob) return '—'
  try {
    const d = new Date(dob)
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--
    return age > 0 ? String(age) : '—'
  } catch { return '—' }
}

const STATUS_COLOR = {
  Active: C.green,
  Lapsed: C.red,
  Matured: C.blue,
  Surrendered: C.orange,
}

// ─── Styles — original portfolio ─────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 8, color: C.gray1, backgroundColor: C.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 70, height: 22, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: -0.3 },
  subtitle: { fontSize: 8, color: C.gray2, marginTop: 2 },
  clientStrip: { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 6, padding: 10, marginBottom: 16, gap: 20 },
  clientLabel: { fontSize: 6.5, color: C.gray3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  clientValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.white },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: C.gray6, borderRadius: 5, padding: 8, alignItems: 'center' },
  summaryLabel: { fontSize: 6.5, color: C.gray2, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.gray1 },
  tableHeader: { flexDirection: 'row', backgroundColor: C.navy, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 6, marginBottom: 4 },
  tableHeaderText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: C.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray5 },
  tableRowAlt: { backgroundColor: C.gray6 },
  tableCell: { fontSize: 7.5, color: C.gray1 },
  tableCellBold: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.gray1 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.navy, marginTop: 16, marginBottom: 8 },
  coverageRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.gray5 },
  statusBadge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36 },
  footerLine: { height: 0.5, backgroundColor: C.gray5, marginBottom: 6 },
  footerText: { fontSize: 6, color: C.gray3, textAlign: 'center' },
  pageNumber: { fontSize: 6, color: C.gray3, textAlign: 'right', marginTop: 2 },
  notesText: { fontSize: 7, color: C.gray2, fontStyle: 'italic', marginTop: 2, paddingLeft: 6 },
})

const COL = { no: '8%', company: '14%', plan: '18%', type: '12%', sum: '14%', premium: '14%', status: '10%', dates: '10%' }

// ─── Original Portfolio Document ──────────────────────────────────────────────
function InsurancePoliciesDocument({ policies, contact, agentName }) {
  const activePolicies = policies.filter(p => p.status === 'Active')
  const totalAnnualPremium = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const totalSumAssured = policies.reduce((s, p) => s + (Number(p.sumAssured) || 0), 0)
  const totalDeath = policies.reduce((s, p) => s + (Number(p.coverageDetails?.death) || 0), 0)
  const totalTPD = policies.reduce((s, p) => s + (Number(p.coverageDetails?.tpd) || 0), 0)
  const totalCI = policies.reduce((s, p) => s + (Number(p.coverageDetails?.ci) || 0), 0)
  const totalMedical = policies.reduce((s, p) => s + (Number(p.coverageDetails?.medicalCard) || 0), 0)
  const totalPA = policies.reduce((s, p) => s + (Number(p.coverageDetails?.paDb) || 0), 0)

  const hasCoverage = totalDeath || totalTPD || totalCI || totalMedical || totalPA

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
          <View>
            <Text style={s.clientLabel}>Client</Text>
            <Text style={s.clientValue}>{contact?.name || 'Client'}</Text>
          </View>
          <View>
            <Text style={s.clientLabel}>Total Policies</Text>
            <Text style={s.clientValue}>{policies.length}</Text>
          </View>
          <View>
            <Text style={s.clientLabel}>Active</Text>
            <Text style={s.clientValue}>{activePolicies.length}</Text>
          </View>
          <View>
            <Text style={s.clientLabel}>Annual Premium</Text>
            <Text style={s.clientValue}>{fmtRM(totalAnnualPremium)}</Text>
          </View>
          <View>
            <Text style={s.clientLabel}>Total Sum Assured</Text>
            <Text style={s.clientValue}>{fmtRM(totalSumAssured)}</Text>
          </View>
        </View>

        <View style={s.summaryRow}>
          {[
            { label: 'Death', value: totalDeath },
            { label: 'TPD', value: totalTPD },
            { label: 'Critical Illness', value: totalCI },
            { label: 'Medical', value: totalMedical },
            { label: 'PA / DB', value: totalPA },
          ].map(c => (
            <View key={c.label} style={s.summaryCard}>
              <Text style={s.summaryLabel}>{c.label}</Text>
              <Text style={[s.summaryValue, c.value > 0 ? { color: C.blue } : { color: C.gray3 }]}>{fmtRM(c.value)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Policy Details</Text>

        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { width: COL.no }]}>No.</Text>
          <Text style={[s.tableHeaderText, { width: COL.company }]}>Company</Text>
          <Text style={[s.tableHeaderText, { width: COL.plan }]}>Plan Name</Text>
          <Text style={[s.tableHeaderText, { width: COL.type }]}>Type</Text>
          <Text style={[s.tableHeaderText, { width: COL.sum, textAlign: 'right' }]}>Sum Assured</Text>
          <Text style={[s.tableHeaderText, { width: COL.premium, textAlign: 'right' }]}>Annual Prem.</Text>
          <Text style={[s.tableHeaderText, { width: COL.status, textAlign: 'center' }]}>Status</Text>
          <Text style={[s.tableHeaderText, { width: COL.dates, textAlign: 'right' }]}>Start</Text>
        </View>

        {policies.map((p, i) => (
          <View key={i} wrap={false}>
            <View style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCell, { width: COL.no }]}>{p.policyNo || `#${i + 1}`}</Text>
              <Text style={[s.tableCell, { width: COL.company }]}>{p.company || '—'}</Text>
              <Text style={[s.tableCellBold, { width: COL.plan }]}>{p.planName || '—'}</Text>
              <Text style={[s.tableCell, { width: COL.type }]}>{p.type || '—'}</Text>
              <Text style={[s.tableCell, { width: COL.sum, textAlign: 'right' }]}>{fmtRM(p.sumAssured)}</Text>
              <Text style={[s.tableCell, { width: COL.premium, textAlign: 'right' }]}>{fmtRM(p.annualPremium)}</Text>
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

        {hasCoverage ? (
          <>
            <Text style={s.sectionTitle}>Coverage Breakdown by Policy</Text>

            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: '26%' }]}>Policy</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Death</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>TPD</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>CI</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Medical</Text>
              <Text style={[s.tableHeaderText, { width: '14%', textAlign: 'right' }]}>PA / DB</Text>
            </View>

            {policies.map((p, i) => {
              const cd = p.coverageDetails || {}
              const hasAny = (cd.death || cd.tpd || cd.ci || cd.medicalCard || cd.paDb)
              if (!hasAny) return null
              return (
                <View key={i} style={[s.coverageRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: '26%' }]}>{p.planName || p.type || `Policy #${i + 1}`}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.death ? fmtRM(cd.death) : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.tpd ? fmtRM(cd.tpd) : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.ci ? fmtRM(cd.ci) : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{cd.medicalCard ? fmtRM(cd.medicalCard) : '—'}</Text>
                  <Text style={[s.tableCell, { width: '14%', textAlign: 'right' }]}>{cd.paDb ? fmtRM(cd.paDb) : '—'}</Text>
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
        ) : null}

        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <Text style={s.footerText}>
            This document is prepared for {contact?.name || 'the client'} by {agentName || 'Adviser'} and is for reference only. Please verify all policy details with the respective insurance companies.
          </Text>
          <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

// ─── Export Button — original ─────────────────────────────────────────────────
export function InsuranceExportButton({ policies, contact, agentName }) {
  const fileName = `Insurance_Portfolio_${(contact?.name || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  return (
    <PDFDownloadLink
      document={<InsurancePoliciesDocument policies={policies} contact={contact} agentName={agentName} />}
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
          {loading ? 'Generating...' : 'Portfolio PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  LLH-style Policy Summary (A4 Landscape)
// ─────────────────────────────────────────────────────────────────────────────

// Map policy type string → which LLH columns get a tick
function getTypeTicks(p) {
  const t = (p.type || '').toLowerCase()
  return {
    wholeLife:  t.includes('whole life'),
    endowment:  t.includes('endowment'),
    term:       t.includes('term'),
    ci:         t.includes('critical'),
    accident:   t.includes('accident'),
    medical:    t.includes('medical') || t.includes('health'),
    pwv:        !!p.hasPremiumWaiver,
  }
}

// Landscape A4: 841.89 x 595.28 pts — padding 28 each side → ~785 usable
const PW = {
  no:      22,   // No.
  date:    54,   // Policy Start Date
  company: 66,   // Company
  polNo:   74,   // Policy No.
  wl:      28,   // Whole Life
  end:     28,   // Endowment
  term:    28,   // Term
  ci:      28,   // CI
  acc:     28,   // Accident
  med:     32,   // Medical Card
  pwv:     36,   // Premium Waiver
  nom:     70,   // Nominee
  mat:     50,   // Maturity
  age:     24,   // Age
  prem:    62,   // Premium
}

const ps = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: C.black,
    backgroundColor: C.white,
  },

  // ── Header block ────────────────────────────────────────────────────────────
  headerBlock: {
    marginBottom: 12,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Client / Agent info row ──────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.black,
  },
  infoBlock: {
    flexDirection: 'column',
    gap: 4,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 7.5,
    color: C.black,
    width: 42,
  },
  infoColon: {
    fontSize: 7.5,
    color: C.black,
    width: 8,
  },
  infoValue: {
    fontSize: 7.5,
    color: C.black,
    borderBottomWidth: 0.5,
    borderBottomColor: C.black,
    minWidth: 120,
    paddingBottom: 1,
  },

  // ── Table ───────────────────────────────────────────────────────────────────
  tableWrap: {
    borderWidth: 0.5,
    borderColor: C.black,
  },
  thead: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.black,
    backgroundColor: '#F5F5F5',
  },
  theadCell: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: C.black,
  },
  theadCellLast: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
  },
  trow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.black,
    minHeight: 28,
  },
  trowAlt: {
    backgroundColor: '#FAFAFA',
  },
  trowLast: {
    borderBottomWidth: 0,
  },
  tcell: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    fontSize: 6.5,
    color: C.black,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: C.black,
    justifyContent: 'center',
  },
  tcellLeft: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 6.5,
    color: C.black,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: C.black,
    justifyContent: 'center',
  },
  tcellLast: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 6.5,
    color: C.black,
    textAlign: 'right',
    justifyContent: 'center',
  },
  tick: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'center',
  },

  // ── Total row ───────────────────────────────────────────────────────────────
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    minHeight: 20,
  },
  totalLabel: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    borderRightWidth: 0.5,
    borderRightColor: C.black,
    justifyContent: 'center',
  },
  totalValue: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.black,
    textAlign: 'right',
    justifyContent: 'center',
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28 },
  footerText: { fontSize: 5.5, color: C.gray3, textAlign: 'center' },
  pageNum: { fontSize: 5.5, color: C.gray3, textAlign: 'right', marginTop: 2 },
})

function HeaderCell({ width, children, style }) {
  return (
    <View style={[ps.theadCell, { width }]}>
      <Text>{children}</Text>
    </View>
  )
}

function HeaderCellLast({ width, children }) {
  return (
    <View style={[ps.theadCellLast, { width }]}>
      <Text>{children}</Text>
    </View>
  )
}

function TCell({ width, children, left, last }) {
  const base = last ? ps.tcellLast : left ? ps.tcellLeft : ps.tcell
  return (
    <View style={[base, { width }]}>
      {typeof children === 'string' || typeof children === 'number'
        ? <Text>{children}</Text>
        : children}
    </View>
  )
}

// ── LLH-style Document ────────────────────────────────────────────────────────
function PolicySummaryDocument({ policies, contact, agentName, agentMobile, agentEmail }) {
  const today = new Date().toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const totalPremium = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  const contactAge = calcAge(contact?.dob)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={ps.page}>

        {/* ── Company / Group header ── */}
        <View style={ps.headerBlock}>
          <Text style={ps.companyName}>INSURANCE POLICY SUMMARY · 保单分析</Text>
          <Text style={ps.groupName}>LLH GROUP</Text>
        </View>

        {/* ── Client left / Agent right info block ── */}
        <View style={ps.infoRow}>
          {/* Left — client */}
          <View style={ps.infoBlock}>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>Name</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{contact?.name || ''}</Text>
            </View>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>I/C No</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{contact?.nric || contact?.ic || ''}</Text>
            </View>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>Date</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{today}</Text>
            </View>
          </View>

          {/* Right — agent (分析者) */}
          <View style={ps.infoBlock}>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>分析者</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{agentName || ''}</Text>
            </View>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>H/P No</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{agentMobile || ''}</Text>
            </View>
            <View style={ps.infoLine}>
              <Text style={ps.infoLabel}>Email</Text>
              <Text style={ps.infoColon}>:</Text>
              <Text style={ps.infoValue}>{agentEmail || ''}</Text>
            </View>
          </View>
        </View>

        {/* ── Main table ── */}
        <View style={ps.tableWrap}>

          {/* Table header — bilingual */}
          <View style={ps.thead}>
            <HeaderCell width={PW.no}>编号{'\n'}No.</HeaderCell>
            <HeaderCell width={PW.date}>日期{'\n'}Policy{'\n'}Start Date</HeaderCell>
            <HeaderCell width={PW.company}>公司{'\n'}Company</HeaderCell>
            <HeaderCell width={PW.polNo}>保单号码{'\n'}Policy No.</HeaderCell>
            <HeaderCell width={PW.wl}>终生{'\n'}Whole{'\n'}Life</HeaderCell>
            <HeaderCell width={PW.end}>储蓄{'\n'}End</HeaderCell>
            <HeaderCell width={PW.term}>定期{'\n'}Term</HeaderCell>
            <HeaderCell width={PW.ci}>疾病{'\n'}Critical{'\n'}Illness</HeaderCell>
            <HeaderCell width={PW.acc}>意外{'\n'}Accident</HeaderCell>
            <HeaderCell width={PW.med}>医药{'\n'}Medical{'\n'}Card</HeaderCell>
            <HeaderCell width={PW.pwv}>免缴保费{'\n'}Premium{'\n'}Waiver</HeaderCell>
            <HeaderCell width={PW.nom}>受益人{'\n'}Nominee</HeaderCell>
            <HeaderCell width={PW.mat}>满期{'\n'}Maturity</HeaderCell>
            <HeaderCell width={PW.age}>年龄{'\n'}Age</HeaderCell>
            <HeaderCellLast width={PW.prem}>保费{'\n'}Premium</HeaderCellLast>
          </View>

          {/* Data rows */}
          {policies.map((p, i) => {
            const ticks = getTypeTicks(p)
            const isLast = i === policies.length - 1
            return (
              <View key={i} style={[ps.trow, i % 2 === 1 ? ps.trowAlt : {}, isLast ? ps.trowLast : {}]} wrap={false}>
                <TCell width={PW.no}>{i + 1}</TCell>
                <TCell width={PW.date}>{fmtDateShort(p.commencementDate)}</TCell>
                <TCell width={PW.company} left>{p.company || '—'}</TCell>
                <TCell width={PW.polNo} left>{p.policyNo || '—'}</TCell>
                <TCell width={PW.wl}>{ticks.wholeLife ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.end}>{ticks.endowment ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.term}>{ticks.term ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.ci}>{ticks.ci ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.acc}>{ticks.accident ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.med}>{ticks.medical ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.pwv}>{ticks.pwv ? <Text style={ps.tick}>✓</Text> : null}</TCell>
                <TCell width={PW.nom} left>{p.nominee || ''}</TCell>
                <TCell width={PW.mat}>{fmtDateShort(p.maturityDate)}</TCell>
                <TCell width={PW.age}>{contactAge}</TCell>
                <TCell width={PW.prem} last>{p.annualPremium ? fmtRM(p.annualPremium) : '—'}</TCell>
              </View>
            )
          })}

          {/* Total row */}
          <View style={ps.totalRow}>
            <View style={[ps.totalLabel, {
              width: PW.no + PW.date + PW.company + PW.polNo +
                     PW.wl + PW.end + PW.term + PW.ci + PW.acc + PW.med + PW.pwv + PW.nom + PW.mat + PW.age,
            }]}>
              <Text>总保费 / 保障 Total Premium / Coverage</Text>
            </View>
            <View style={[ps.totalValue, { width: PW.prem }]}>
              <Text>{fmtRM(totalPremium)}</Text>
            </View>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={ps.footer} fixed>
          <Text style={ps.footerText}>
            This document is prepared for {contact?.name || 'the client'} by {agentName || 'Adviser'} and is for reference only. Please verify all policy details with the respective insurance companies.
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {loading ? 'Generating...' : '保单分析 Export'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
