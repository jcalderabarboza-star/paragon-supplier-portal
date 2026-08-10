// BuyerScorecard i18n fragment (Batch 6). Namespace: buyerScorecard.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention
// already shipped in i18n.ts).
//
// CHART STRINGS (honest split per Batch-6 rule 5):
//   • TRANSLATED as UI chrome — section titles (h2), the trend caption, the
//     ReferenceLine annotation ("OTIF target"), and the hardcoded series `name=`
//     legend labels ("Benchmark", "OTIF %", "Ack Speed (h)", "Defect Rate %").
//     Series names are pure display (Recharts binds via `dataKey`), so localizing
//     the label never desyncs the series.
//   • LEFT AS DATA (i18n-defer) — the radar axis labels (Delivery / Quality /
//     Commercial / Responsiveness / Sustainability come from `supp.radar`), the
//     supplier-name radar series (`supp.name.split(...)`), and the month axis
//     ticks — all fixture-bound, so canonical EN as data.
//
// NON-PILL localization via central maps: `supp.category` → useCategoryLabel,
// `supp.channel` + `log.channel` → useChannelLabel (kept canonical as stored
// data; only the visible label resolves). The comm-log / improvement-action
// StatusPill children (Completed / Resolved / Active / Open / In Progress /
// Pending) localize centrally via the StatusPill resolver chain — NOT re-keyed.
// Grade letters (A–D via GradeBadge) stay verbatim canonical grades.
//
// DEFERRED as fixture data (i18n-defer, kept canonical EN): the hero relationship
// STATUS (`supp.status`: "Preferred Supplier" / "Approved Supplier" / "Conditional
// — Improvement Plan Active" — no central map, the string IS the data), the
// composite `supp.tier` ("Tier 3 — API" …), every KPI `name`/`value`/`target`,
// the compliance-issue label, comm-log `type`/`message`, and improvement-action
// `item`/`owner`/`due` values. Mono DATA (score/100, %, hours, SAP BP, dates via
// <Data>/formatters) stays EN as data.
export const buyerScorecardEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerScorecard.crumb.intelligence': 'INTELLIGENCE',
  'buyerScorecard.crumb.scorecard': 'SUPPLIER SCORECARD',
  // — Page header —
  'buyerScorecard.header.title': 'Supplier Scorecard',
  'buyerScorecard.header.subtitle':
    'Performance scoring across all active suppliers.',
  'buyerScorecard.header.selectSupplier': 'Select supplier',
  // — Meta line —
  'buyerScorecard.meta.suppliers.one': '{{count}} supplier',
  'buyerScorecard.meta.suppliers.other': '{{count}} suppliers',
  'buyerScorecard.meta.lastActivity': 'last activity',
  // — Empty state —
  'buyerScorecard.empty.title': 'No scorecards yet',
  'buyerScorecard.empty.subtitle': 'Supplier scoring is a buyer-side view.',
  'buyerScorecard.empty.message':
    'Portfolio performance grading across active suppliers appears here for buyer accounts.',
  // — Identity hero —
  'buyerScorecard.hero.sapBp': 'SAP BP',
  'buyerScorecard.hero.channel': 'Channel',
  'buyerScorecard.hero.complianceAlert': 'Compliance alert',
  'buyerScorecard.hero.seeComplianceTracker': 'See Compliance Tracker →',
  // — KPI scorecard section —
  'buyerScorecard.kpi.title': 'KPI Scorecard — 12 metrics',
  'buyerScorecard.kpi.target': 'Target',
  // — Radar section —
  'buyerScorecard.radar.title': 'Score breakdown — radar',
  'buyerScorecard.radar.benchmark': 'Benchmark',
  // — Performance trends section —
  'buyerScorecard.trends.title': 'Performance trends — 12 months',
  'buyerScorecard.trends.caption':
    'OTIF % (left axis) · Ack Speed in hours · Defect Rate %',
  'buyerScorecard.trends.otifTarget': 'OTIF target',
  'buyerScorecard.series.otif': 'OTIF %',
  'buyerScorecard.series.ackSpeed': 'Ack Speed (h)',
  'buyerScorecard.series.defectRate': 'Defect Rate %',
  // — Improvement plan section —
  'buyerScorecard.imp.banner':
    'This supplier is on a Conditional rating — improvement plan active. 30-day review period.',
  'buyerScorecard.imp.title': 'Improvement plan — action items',
  'buyerScorecard.imp.owner': 'Owner',
  'buyerScorecard.imp.due': 'Due',
  'buyerScorecard.imp.send': 'Send improvement plan',
  'buyerScorecard.imp.toast.title': 'Improvement plan sent to {{name}}',
  'buyerScorecard.imp.toast.desc': 'Delivered via email.',
  // — Communication log section —
  'buyerScorecard.comm.title': 'Communication log — last 5 interactions',
  'buyerScorecard.comm.empty': 'No communication log entries.',
};

export const buyerScorecardId: Record<string, string> = {
  // — Breadcrumb —
  'buyerScorecard.crumb.intelligence': 'INTELIJEN',
  'buyerScorecard.crumb.scorecard': 'KARTU SKOR PEMASOK',
  // — Page header —
  'buyerScorecard.header.title': 'Kartu Skor Pemasok',
  'buyerScorecard.header.subtitle':
    'Penilaian kinerja di seluruh pemasok aktif.',
  'buyerScorecard.header.selectSupplier': 'Pilih pemasok',
  // — Meta line —
  'buyerScorecard.meta.suppliers.one': '{{count}} pemasok',
  'buyerScorecard.meta.suppliers.other': '{{count}} pemasok',
  'buyerScorecard.meta.lastActivity': 'aktivitas terakhir',
  // — Empty state —
  'buyerScorecard.empty.title': 'Belum ada kartu skor',
  'buyerScorecard.empty.subtitle':
    'Penilaian pemasok adalah tampilan sisi pembeli.',
  'buyerScorecard.empty.message':
    'Penilaian kinerja portofolio di seluruh pemasok aktif muncul di sini untuk akun pembeli.',
  // — Identity hero —
  'buyerScorecard.hero.sapBp': 'SAP BP',
  'buyerScorecard.hero.channel': 'Kanal',
  'buyerScorecard.hero.complianceAlert': 'Peringatan kepatuhan',
  'buyerScorecard.hero.seeComplianceTracker': 'Lihat Pelacak Kepatuhan →',
  // — KPI scorecard section —
  'buyerScorecard.kpi.title': 'Kartu Skor KPI — 12 metrik',
  'buyerScorecard.kpi.target': 'Target',
  // — Radar section —
  'buyerScorecard.radar.title': 'Rincian skor — radar',
  'buyerScorecard.radar.benchmark': 'Tolok Ukur',
  // — Performance trends section —
  'buyerScorecard.trends.title': 'Tren kinerja — 12 bulan',
  'buyerScorecard.trends.caption':
    'OTIF % (sumbu kiri) · Kecepatan Konfirmasi dalam jam · Tingkat Cacat %',
  'buyerScorecard.trends.otifTarget': 'Target OTIF',
  'buyerScorecard.series.otif': 'OTIF %',
  'buyerScorecard.series.ackSpeed': 'Kecepatan Konfirmasi (j)',
  'buyerScorecard.series.defectRate': 'Tingkat Cacat %',
  // — Improvement plan section —
  'buyerScorecard.imp.banner':
    'Pemasok ini berada pada peringkat Bersyarat — rencana perbaikan aktif. Periode tinjauan 30 hari.',
  'buyerScorecard.imp.title': 'Rencana perbaikan — item tindakan',
  'buyerScorecard.imp.owner': 'Penanggung jawab',
  'buyerScorecard.imp.due': 'Tenggat',
  'buyerScorecard.imp.send': 'Kirim rencana perbaikan',
  'buyerScorecard.imp.toast.title': 'Rencana perbaikan dikirim ke {{name}}',
  'buyerScorecard.imp.toast.desc': 'Dikirim melalui email.',
  // — Communication log section —
  'buyerScorecard.comm.title': 'Log komunikasi — 5 interaksi terakhir',
  'buyerScorecard.comm.empty': 'Tidak ada entri log komunikasi.',
};
