// SupplierPerformance i18n fragment (Batch 6). Namespace: supplierPerformance.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no i18next plural resolver).
//
// COMPOSED PHRASES (the mixed string+node sites StatusPill cannot localize):
//  · Improvement-action priority chip — `{priority} priority` — is rendered with
//    <Trans i18nKey="supplierPerformance.actions.priorityChip"
//           values={{ priority: el(item.priority) }}/> so the priority VALUE
//    localizes via useEnumLabel AND the surrounding word "priority" localizes as
//    one grammatical unit. ID reorders: EN "{{priority}} priority" → ID
//    "prioritas {{priority}}".
//  · Current/Target/Gap chips render `{label}: {data}` — the label localizes, the
//    KPI data value stays canonical (mono). Same for the KpiProgressTile "Target:"
//    and the meta "Purchase order performance — {{name}}" (supplier name = data).
//
// StatusPill children that ARE central-map tokens (none of the localized pills
// here — priority chips go through <Trans>) are left canonical. `Sample data` is
// a page annotation, NOT a status/enum/category/channel token, so it carries its
// own key. Priority/severity vocab → useEnumLabel; category → useCategoryLabel;
// channel → useChannelLabel (never re-keyed here). Mono DATA (KPI values/targets/
// gaps, scores, percentages, grade letters A–D, dates, radar/trend fixtures,
// GRADE_HISTORY sample) stays EN. KPI names + improvement-action prose are
// fixture-derived and left canonical (i18n-defer).
export const supplierPerformanceEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierPerformance.crumb.intelligence': 'INTELLIGENCE',
  'supplierPerformance.crumb.myPerformance': 'MY PERFORMANCE',
  // — Page header —
  'supplierPerformance.header.title': 'My Performance',
  'supplierPerformance.header.subtitle':
    'Paragon scorecard · Rolling 12-week KPIs · Improvement tracking',
  'supplierPerformance.action.exportReport': 'Export Report',
  // — Toasts —
  'supplierPerformance.toast.exportQueued.title': 'Performance report queued',
  'supplierPerformance.toast.exportQueued.desc':
    'Downloading performance report PDF...',
  'supplierPerformance.toast.actionSubmitted.title':
    'Action plan submitted — {{kpi}}',
  'supplierPerformance.toast.actionSubmitted.desc': 'Paragon team notified.',
  // — Empty state —
  'supplierPerformance.empty.title': 'No performance data yet',
  'supplierPerformance.empty.subtitle':
    'Your Paragon scorecard is not available.',
  'supplierPerformance.empty.message':
    'KPI scorecards, trends, and improvement actions appear here once Paragon publishes your performance data.',
  // — Supplier identity card —
  'supplierPerformance.card.tierChannel': 'Tier 1 — WhatsApp',
  'supplierPerformance.card.sapBp': 'SAP BP:',
  'supplierPerformance.card.channel': 'Channel:',
  'supplierPerformance.card.reportingPeriod': 'Reporting period:',
  'supplierPerformance.card.reportingValue': 'Rolling 12 weeks',
  'supplierPerformance.grade.paragonGrade': 'Paragon Grade',
  // — Tabs —
  'supplierPerformance.tab.overview': 'Overview',
  'supplierPerformance.tab.trends': 'Trends',
  'supplierPerformance.tab.actions': 'Improvement Actions',
  // — KPI progress tile —
  'supplierPerformance.kpi.targetLabel': 'Target',
  // — Overview section —
  'supplierPerformance.overview.scorecardTitle.one':
    'KPI Scorecard — {{count}} metric',
  'supplierPerformance.overview.scorecardTitle.other':
    'KPI Scorecard — {{count}} metrics',
  'supplierPerformance.overview.radarTitle':
    'Performance radar — vs Paragon targets',
  'supplierPerformance.overview.gradeHistoryTitle':
    'Grade history — monthly score',
  'supplierPerformance.overview.poPerfTitle':
    'Purchase order performance — {{name}}',
  'supplierPerformance.sampleData': 'Sample data',
  // — Chart series / legend names —
  'supplierPerformance.chart.benchmark': 'Benchmark',
  'supplierPerformance.chart.yourScore': 'Your score',
  'supplierPerformance.chart.score': 'Score',
  'supplierPerformance.chart.otifPct': 'OTIF %',
  'supplierPerformance.chart.asnAccuracyPct': 'ASN Accuracy %',
  'supplierPerformance.chart.ackTimeHrs': 'Ack Time (hrs)',
  // — PO performance metric labels —
  'supplierPerformance.poMetric.totalPos': 'Total POs',
  'supplierPerformance.poMetric.onTime': 'On Time',
  'supplierPerformance.poMetric.late': 'Late',
  'supplierPerformance.poMetric.avgOverdue': 'Avg Overdue',
  // — Trends section —
  'supplierPerformance.trends.otifTitle': 'OTIF rate — 12-week rolling (%)',
  'supplierPerformance.trends.asnTitle': 'ASN accuracy (%)',
  'supplierPerformance.trends.poaTitle': 'POA response time (hours)',
  // — Improvement actions —
  'supplierPerformance.actions.intro':
    'Below-target KPIs and recommended corrective actions to improve your Paragon supplier grade.',
  'supplierPerformance.actions.currentLabel': 'Current',
  'supplierPerformance.actions.targetLabel': 'Target',
  'supplierPerformance.actions.gapLabel': 'Gap',
  'supplierPerformance.actions.priorityChip': '{{priority}} priority',
  'supplierPerformance.actions.acknowledge': 'Acknowledge & plan',
  'supplierPerformance.actions.tierSystem.label':
    'Paragon Supplier Tier System:',
  'supplierPerformance.actions.tierSystem.body':
    'Achieve Grade A (≥ 90/100) for 3 consecutive months to qualify for Tier 1 status — faster payment terms (Net 30 → Net 15), priority capacity allocation, and inclusion in Paragon strategic supplier development program.',
};

export const supplierPerformanceId: Record<string, string> = {
  // — Breadcrumb —
  'supplierPerformance.crumb.intelligence': 'INTELIJEN',
  'supplierPerformance.crumb.myPerformance': 'KINERJA SAYA',
  // — Page header —
  'supplierPerformance.header.title': 'Kinerja Saya',
  'supplierPerformance.header.subtitle':
    'Kartu skor Paragon · KPI bergulir 12 minggu · Pelacakan peningkatan',
  'supplierPerformance.action.exportReport': 'Ekspor Laporan',
  // — Toasts —
  'supplierPerformance.toast.exportQueued.title':
    'Laporan kinerja dalam antrean',
  'supplierPerformance.toast.exportQueued.desc':
    'Mengunduh PDF laporan kinerja...',
  'supplierPerformance.toast.actionSubmitted.title':
    'Rencana tindakan dikirim — {{kpi}}',
  'supplierPerformance.toast.actionSubmitted.desc': 'Tim Paragon diberi tahu.',
  // — Empty state —
  'supplierPerformance.empty.title': 'Belum ada data kinerja',
  'supplierPerformance.empty.subtitle':
    'Kartu skor Paragon Anda tidak tersedia.',
  'supplierPerformance.empty.message':
    'Kartu skor KPI, tren, dan tindakan peningkatan muncul di sini setelah Paragon memublikasikan data kinerja Anda.',
  // — Supplier identity card —
  'supplierPerformance.card.tierChannel': 'Tier 1 — WhatsApp',
  'supplierPerformance.card.sapBp': 'SAP BP:',
  'supplierPerformance.card.channel': 'Kanal:',
  'supplierPerformance.card.reportingPeriod': 'Periode pelaporan:',
  'supplierPerformance.card.reportingValue': '12 minggu berjalan',
  'supplierPerformance.grade.paragonGrade': 'Grade Paragon',
  // — Tabs —
  'supplierPerformance.tab.overview': 'Ikhtisar',
  'supplierPerformance.tab.trends': 'Tren',
  'supplierPerformance.tab.actions': 'Tindakan Peningkatan',
  // — KPI progress tile —
  'supplierPerformance.kpi.targetLabel': 'Target',
  // — Overview section —
  'supplierPerformance.overview.scorecardTitle.one':
    'Kartu Skor KPI — {{count}} metrik',
  'supplierPerformance.overview.scorecardTitle.other':
    'Kartu Skor KPI — {{count}} metrik',
  'supplierPerformance.overview.radarTitle':
    'Radar kinerja — vs target Paragon',
  'supplierPerformance.overview.gradeHistoryTitle':
    'Riwayat grade — skor bulanan',
  'supplierPerformance.overview.poPerfTitle':
    'Kinerja pesanan pembelian — {{name}}',
  'supplierPerformance.sampleData': 'Data sampel',
  // — Chart series / legend names —
  'supplierPerformance.chart.benchmark': 'Tolok ukur',
  'supplierPerformance.chart.yourScore': 'Skor Anda',
  'supplierPerformance.chart.score': 'Skor',
  'supplierPerformance.chart.otifPct': 'OTIF %',
  'supplierPerformance.chart.asnAccuracyPct': 'Akurasi ASN %',
  'supplierPerformance.chart.ackTimeHrs': 'Waktu Ack (jam)',
  // — PO performance metric labels —
  'supplierPerformance.poMetric.totalPos': 'Total PO',
  'supplierPerformance.poMetric.onTime': 'Tepat Waktu',
  'supplierPerformance.poMetric.late': 'Terlambat',
  'supplierPerformance.poMetric.avgOverdue': 'Rata-rata Terlambat',
  // — Trends section —
  'supplierPerformance.trends.otifTitle':
    'Tingkat OTIF — bergulir 12 minggu (%)',
  'supplierPerformance.trends.asnTitle': 'Akurasi ASN (%)',
  'supplierPerformance.trends.poaTitle': 'Waktu respons POA (jam)',
  // — Improvement actions —
  'supplierPerformance.actions.intro':
    'KPI di bawah target dan tindakan korektif yang direkomendasikan untuk meningkatkan grade pemasok Paragon Anda.',
  'supplierPerformance.actions.currentLabel': 'Saat ini',
  'supplierPerformance.actions.targetLabel': 'Target',
  'supplierPerformance.actions.gapLabel': 'Selisih',
  'supplierPerformance.actions.priorityChip': 'prioritas {{priority}}',
  'supplierPerformance.actions.acknowledge': 'Akui & rencanakan',
  'supplierPerformance.actions.tierSystem.label':
    'Sistem Tingkat Pemasok Paragon:',
  'supplierPerformance.actions.tierSystem.body':
    'Capai Grade A (≥ 90/100) selama 3 bulan berturut-turut untuk memenuhi syarat status Tier 1 — syarat pembayaran lebih cepat (Net 30 → Net 15), alokasi kapasitas prioritas, dan keikutsertaan dalam program pengembangan pemasok strategis Paragon.',
};
