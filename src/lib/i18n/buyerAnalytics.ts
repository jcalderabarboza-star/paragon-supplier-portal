// BuyerAnalytics i18n fragment (Batch 6). Namespace: buyerAnalytics.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention
// already shipped in i18n.ts — no reliance on the i18next plural resolver).
//
// CHART STRINGS (honest split per Batch-6 rule 5):
//   • TRANSLATED as UI chrome — section titles (h2), chart caption sub-labels,
//     axis TITLES (POs / Hours), the ReferenceLine annotation (Target 90%), and
//     every hardcoded series `name=` legend label. Series names are pure display
//     (Recharts binds data via `dataKey`, not `name`), so recolouring the label
//     never desyncs the series — acronyms/proper-nouns (OTIF, OTDR, WhatsApp,
//     Email, API/EDI) are keyed to identical EN/ID values by decision.
//   • LEFT AS DATA (i18n-defer) — every data-point label bound to FIXTURE data:
//     the pie category slices (nameKey="category"), the bar supplier names
//     (dataKey="supplier"), and the month axis ticks. These come from the fetched
//     rows, not the page, so they stay canonical EN as data.
//
// CHIPS: the performance-table category pill (`<StatusPill>{row.category}`) and
// the grade / OTIF% / OTDR% pills localize centrally via the StatusPill resolver
// chain (statusLabel → enum → category → channel) — NOT re-declared here. Grade
// letters (A–D) and OTIF/OTDR acronyms stay canonical. Mono DATA (Rp jT amounts,
// percentages, cycle-time hours, counts via formatters) stays EN as data.
export const buyerAnalyticsEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerAnalytics.crumb.intelligence': 'INTELLIGENCE',
  'buyerAnalytics.crumb.analytics': 'ANALYTICS',
  // — Page header —
  'buyerAnalytics.header.title': 'Analytics & Procurement Intelligence',
  'buyerAnalytics.header.subtitle':
    'YTD performance metrics and procurement insights.',
  // — Header action + toast —
  'buyerAnalytics.action.export': 'Export Report',
  'buyerAnalytics.toast.exportStarting': 'Report export not available yet — no file was generated.',
  // — Meta line —
  'buyerAnalytics.meta.suppliers.one': '{{count}} supplier',
  'buyerAnalytics.meta.suppliers.other': '{{count}} suppliers',
  'buyerAnalytics.meta.period': 'period',
  // — Period filter chips (id stays canonical; only the label localizes) —
  'buyerAnalytics.period.30d': 'Last 30 days',
  'buyerAnalytics.period.90d': 'Last 90 days',
  'buyerAnalytics.period.ytd': 'YTD',
  // — Summary KPI cards (keyed by AnalyticsSummary field) —
  'buyerAnalytics.summary.totalSpend': 'Total Spend YTD',
  'buyerAnalytics.summary.activeSuppliers': 'Active Suppliers',
  'buyerAnalytics.summary.portfolioOtif': 'Portfolio OTIF',
  'buyerAnalytics.summary.avgCycleTime': 'Avg PO Cycle Time',
  // — Empty state —
  'buyerAnalytics.empty.title': 'No analytics yet',
  'buyerAnalytics.empty.subtitle':
    'Procurement intelligence is a buyer-side view.',
  'buyerAnalytics.empty.message':
    'Spend, performance, and channel-adoption insights appear here for buyer accounts.',
  // — Spend analytics section —
  'buyerAnalytics.spend.title': 'Spend Analytics',
  'buyerAnalytics.spend.byCategory': 'Spend by category (Rp jT)',
  'buyerAnalytics.spend.topSuppliers': 'Top 5 suppliers by spend (Rp jT)',
  // — OTIF / OTDR trend section —
  'buyerAnalytics.otif.title': 'Monthly OTIF & OTDR trend (%)',
  'buyerAnalytics.otif.target': 'Target 90%',
  // — PO volume section —
  'buyerAnalytics.poVolume.title': 'PO volume & avg cycle time',
  'buyerAnalytics.poVolume.axisPos': 'POs',
  'buyerAnalytics.poVolume.axisHours': 'Hours',
  // — Supplier performance table —
  'buyerAnalytics.perf.title': 'Supplier performance summary — YTD',
  'buyerAnalytics.perf.col.supplier': 'Supplier',
  'buyerAnalytics.perf.col.category': 'Category',
  'buyerAnalytics.perf.col.otif': 'OTIF',
  'buyerAnalytics.perf.col.otdr': 'OTDR',
  'buyerAnalytics.perf.col.ackSpeed': 'Ack speed',
  'buyerAnalytics.perf.col.invoiceMatch': 'Invoice match',
  'buyerAnalytics.perf.col.grade': 'Grade',
  'buyerAnalytics.perf.col.trend': 'Trend',
  // — Channel adoption section —
  'buyerAnalytics.channel.title':
    'Digital channel adoption — PO confirmations (%)',
  // — Chart series legend names (hardcoded display labels) —
  'buyerAnalytics.series.otif': 'OTIF',
  'buyerAnalytics.series.otdr': 'OTDR',
  'buyerAnalytics.series.pos': 'POs',
  'buyerAnalytics.series.cycleTime': 'Cycle Time (h)',
  'buyerAnalytics.series.whatsapp': 'WhatsApp',
  'buyerAnalytics.series.webPortal': 'Web Portal',
  'buyerAnalytics.series.email': 'Email',
  'buyerAnalytics.series.apiEdi': 'API/EDI',
};

export const buyerAnalyticsId: Record<string, string> = {
  // — Breadcrumb —
  'buyerAnalytics.crumb.intelligence': 'INTELIJEN',
  'buyerAnalytics.crumb.analytics': 'ANALITIK',
  // — Page header —
  'buyerAnalytics.header.title': 'Analitik & Intelijen Pengadaan',
  'buyerAnalytics.header.subtitle':
    'Metrik kinerja YTD dan wawasan pengadaan.',
  // — Header action + toast —
  'buyerAnalytics.action.export': 'Ekspor Laporan',
  'buyerAnalytics.toast.exportStarting': 'Ekspor laporan belum tersedia — tidak ada berkas yang dibuat.',
  // — Meta line —
  'buyerAnalytics.meta.suppliers.one': '{{count}} pemasok',
  'buyerAnalytics.meta.suppliers.other': '{{count}} pemasok',
  'buyerAnalytics.meta.period': 'periode',
  // — Period filter chips (id stays canonical; only the label localizes) —
  'buyerAnalytics.period.30d': '30 hari terakhir',
  'buyerAnalytics.period.90d': '90 hari terakhir',
  'buyerAnalytics.period.ytd': 'YTD',
  // — Summary KPI cards (keyed by AnalyticsSummary field) —
  'buyerAnalytics.summary.totalSpend': 'Total Belanja YTD',
  'buyerAnalytics.summary.activeSuppliers': 'Pemasok Aktif',
  'buyerAnalytics.summary.portfolioOtif': 'OTIF Portofolio',
  'buyerAnalytics.summary.avgCycleTime': 'Rata-rata Waktu Siklus PO',
  // — Empty state —
  'buyerAnalytics.empty.title': 'Belum ada analitik',
  'buyerAnalytics.empty.subtitle':
    'Intelijen pengadaan adalah tampilan sisi pembeli.',
  'buyerAnalytics.empty.message':
    'Wawasan belanja, kinerja, dan adopsi kanal muncul di sini untuk akun pembeli.',
  // — Spend analytics section —
  'buyerAnalytics.spend.title': 'Analitik Belanja',
  'buyerAnalytics.spend.byCategory': 'Belanja per kategori (Rp jT)',
  'buyerAnalytics.spend.topSuppliers': '5 pemasok teratas menurut belanja (Rp jT)',
  // — OTIF / OTDR trend section —
  'buyerAnalytics.otif.title': 'Tren OTIF & OTDR bulanan (%)',
  'buyerAnalytics.otif.target': 'Target 90%',
  // — PO volume section —
  'buyerAnalytics.poVolume.title': 'Volume PO & rata-rata waktu siklus',
  'buyerAnalytics.poVolume.axisPos': 'PO',
  'buyerAnalytics.poVolume.axisHours': 'Jam',
  // — Supplier performance table —
  'buyerAnalytics.perf.title': 'Ringkasan kinerja pemasok — YTD',
  'buyerAnalytics.perf.col.supplier': 'Pemasok',
  'buyerAnalytics.perf.col.category': 'Kategori',
  'buyerAnalytics.perf.col.otif': 'OTIF',
  'buyerAnalytics.perf.col.otdr': 'OTDR',
  'buyerAnalytics.perf.col.ackSpeed': 'Kecepatan konfirmasi',
  'buyerAnalytics.perf.col.invoiceMatch': 'Kecocokan faktur',
  'buyerAnalytics.perf.col.grade': 'Grade',
  'buyerAnalytics.perf.col.trend': 'Tren',
  // — Channel adoption section —
  'buyerAnalytics.channel.title':
    'Adopsi kanal digital — konfirmasi PO (%)',
  // — Chart series legend names (hardcoded display labels) —
  'buyerAnalytics.series.otif': 'OTIF',
  'buyerAnalytics.series.otdr': 'OTDR',
  'buyerAnalytics.series.pos': 'PO',
  'buyerAnalytics.series.cycleTime': 'Waktu Siklus (j)',
  'buyerAnalytics.series.whatsapp': 'WhatsApp',
  'buyerAnalytics.series.webPortal': 'Portal Web',
  'buyerAnalytics.series.email': 'Email',
  'buyerAnalytics.series.apiEdi': 'API/EDI',
};
