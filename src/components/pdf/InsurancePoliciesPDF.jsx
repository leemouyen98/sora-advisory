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

const STATUS_COLOR = {
  Active:      C.green,
  Lapsed:      C.red,
  Matured:     C.blue,
  Surrendered: C.orange,
}

// ─────────────────────────────────────────────────────────────────────────────
//  INSURANCE PORTFOLIO PDF (A4 Portrait)
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

const COL = { no: '8%', company: '15%', plan: '22%', sum: '15%', premium: '15%', status: '13%', dates: '12%' }

function InsurancePoliciesDocument({ policies, contact, agentName }) {
  const activePolicies   = policies.filter(p => p.status === 'Active')
  const totalAnnualPrem  = policies.reduce((s, p) => s + (Number(p.annualPremium) || 0), 0)
  // coverage.life is the base contract (company/policy no/dates/nominee + a
  // combined Death & TPD sum assured) — see PolicyFormWizard.jsx
  const totalLife         = policies.reduce((s, p) => s + (Number(p.coverage?.life?.sumAssured) || 0), 0)
  const totalPA            = policies.reduce((s, p) => s + (Number(p.coverage?.pa) || 0), 0)
  const totalACI           = policies.reduce((s, p) => s + (Number(p.coverage?.ci?.aci) || 0), 0)
  const totalECI           = policies.reduce((s, p) => s + (Number(p.coverage?.ci?.eci) || 0), 0)
  const totalMedicalLimit  = policies.reduce((s, p) => s + (Number(p.coverage?.medical?.annualLimit) || 0), 0)
  const hasCoverage        = totalLife || totalPA || totalACI || totalECI || totalMedicalLimit

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
            { label: 'Sum Assured',    value: fmtRM(totalLife) },
          ].map(({ label, value }) => (
            <View key={label}>
              <Text style={s.clientLabel}>{label}</Text>
              <Text style={s.clientValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={s.summaryRow}>
          {[
            { label: 'Life (Death & TPD)', value: totalLife         },
            { label: 'PA',                 value: totalPA           },
            { label: 'CI (Early)',         value: totalACI          },
            { label: 'CI (Advanced)',      value: totalECI          },
            { label: 'Medical (Annual)',   value: totalMedicalLimit },
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
          <Text style={[s.tableHeaderTx, { width: COL.sum, textAlign: 'right' }]}>Sum Assured</Text>
          <Text style={[s.tableHeaderTx, { width: COL.premium, textAlign: 'right' }]}>Annual Prem.</Text>
          <Text style={[s.tableHeaderTx, { width: COL.status, textAlign: 'center' }]}>Status</Text>
          <Text style={[s.tableHeaderTx, { width: COL.dates, textAlign: 'right' }]}>Start</Text>
        </View>

        {policies.map((p, i) => (
          <View key={i} wrap={false}>
            <View style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tableCell,     { width: COL.no }]}>{p.coverage?.life?.policyNo || `#${i + 1}`}</Text>
              <Text style={[s.tableCell,     { width: COL.company }]}>{p.coverage?.life?.company || '—'}</Text>
              <Text style={[s.tableCellBold, { width: COL.plan }]}>{p.planName || '—'}</Text>
              <Text style={[s.tableCell,     { width: COL.sum, textAlign: 'right' }]}>{fmtRM(p.coverage?.life?.sumAssured)}</Text>
              <Text style={[s.tableCell,     { width: COL.premium, textAlign: 'right' }]}>{fmtRM(p.annualPremium)}</Text>
              <View style={{ width: COL.status, alignItems: 'center' }}>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[p.status] || C.gray3) + '22' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[p.status] || C.gray3 }]}>{p.status}</Text>
                </View>
              </View>
              <Text style={[s.tableCell, { width: COL.dates, textAlign: 'right' }]}>{fmtDate(p.coverage?.life?.coverageStartDate)}</Text>
            </View>
            {p.notes ? <Text style={s.notesText}>{p.notes}</Text> : null}
          </View>
        ))}

        {hasCoverage && (
          <>
            <Text style={s.sectionTitle}>Coverage Breakdown by Policy</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderTx, { width: '22%' }]}>Policy</Text>
              <Text style={[s.tableHeaderTx, { width: '16%', textAlign: 'right' }]}>Life (Death & TPD)</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>PA</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>ACI</Text>
              <Text style={[s.tableHeaderTx, { width: '15%', textAlign: 'right' }]}>ECI</Text>
              <Text style={[s.tableHeaderTx, { width: '17%', textAlign: 'right' }]}>Medical (Annual)</Text>
            </View>
            {policies.map((p, i) => {
              const c = p.coverage || {}
              const hasAny = c.life?.sumAssured || c.pa || c.ci?.aci || c.ci?.eci || c.medical?.annualLimit
              if (!hasAny) return null
              return (
                <View key={i} style={[s.coverageRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, { width: '22%' }]}>{p.planName || `Policy #${i + 1}`}</Text>
                  <Text style={[s.tableCell, { width: '16%', textAlign: 'right' }]}>{c.life?.sumAssured ? fmtRM(c.life.sumAssured) : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{c.pa             ? fmtRM(c.pa)               : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{c.ci?.aci        ? fmtRM(c.ci.aci)          : '—'}</Text>
                  <Text style={[s.tableCell, { width: '15%', textAlign: 'right' }]}>{c.ci?.eci        ? fmtRM(c.ci.eci)          : '—'}</Text>
                  <Text style={[s.tableCell, { width: '17%', textAlign: 'right' }]}>{c.medical?.annualLimit ? fmtRM(c.medical.annualLimit) : '—'}</Text>
                </View>
              )
            })}
            <View style={[s.coverageRow, { backgroundColor: C.navy, borderRadius: 4, marginTop: 2 }]}>
              <Text style={[s.tableCellBold, { width: '22%', color: C.white }]}>TOTAL</Text>
              <Text style={[s.tableCellBold, { width: '16%', textAlign: 'right', color: C.white }]}>{fmtRM(totalLife)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalPA)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalACI)}</Text>
              <Text style={[s.tableCellBold, { width: '15%', textAlign: 'right', color: C.white }]}>{fmtRM(totalECI)}</Text>
              <Text style={[s.tableCellBold, { width: '17%', textAlign: 'right', color: C.white }]}>{fmtRM(totalMedicalLimit)}</Text>
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

// ─────────────────────────────────────────────────────────────────────────────
//  Export Button
// ─────────────────────────────────────────────────────────────────────────────

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
          <DownloadIcon />
          {loading ? 'Generating…' : 'Portfolio PDF'}
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
