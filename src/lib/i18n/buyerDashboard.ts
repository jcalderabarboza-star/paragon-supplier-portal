// BuyerDashboard i18n fragment. Namespace: buyerDashboard.*
// Flat dot-keys, mirrors src/lib/i18n.ts.
//
// SCOPE: every reader-visible string on /buyer/dashboard. The page renders NO
// figure of its own — every number, ratio, amount, date and month label is
// interpolated from `dashboard/buyerDashboardDerivations.ts` or from the shared
// formatters (`formatIDR` / `formatDate` / `formatMonth`), which is why the
// values below are all `{{placeholders}}` and never digits.
//
// ⚠️ **NO "LIVE" WORDING.** The subtitle used to read "Live operational view"
// above a Sample-data marker — two claims about the same page, one of them
// false. The header now states the reading instant and the provenance instead,
// and the provenance comes from `ProvenanceMarker`, which no caller can talk
// into saying something it is not.
//
// Lane names are NOT re-keyed here: they localize centrally via
// `roles.owner.<lane>`, which is the vocabulary the handoff notices and the
// roles catalogue already speak. A second set of lane words is a second thing
// to keep in step.
export const buyerDashboardEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerDashboard.crumb.dashboards': 'DASHBOARDS',
  'buyerDashboard.crumb.commandCenter': 'PROCUREMENT COMMAND CENTER',
  // — Page header —
  'buyerDashboard.header.eyebrow': 'Buyer · Procurement Command Center',
  'buyerDashboard.header.title': 'Good morning — here is what needs you today',
  'buyerDashboard.header.asOf': 'As of {{date}} · declared present',
  'buyerDashboard.header.derived': 'Every figure derived',
  // — Lane view chips —
  'buyerDashboard.lane.all': 'All lanes',
  'buyerDashboard.lane.legend': 'Filters the action queue',
  // — Alerts strip —
  'buyerDashboard.alerts.title': 'Alerts · {{count}} exception groups',
  'buyerDashboard.alerts.severity.critical': 'Critical',
  'buyerDashboard.alerts.severity.warning': 'Warning',
  'buyerDashboard.alerts.severity.info': 'Info',
  'buyerDashboard.alerts.overdueInvoices.label': 'Overdue invoices',
  'buyerDashboard.alerts.overdueInvoices.detail': 'Worst is {{days}} days past due',
  'buyerDashboard.alerts.halal.label': 'Halal certificates expired or expiring',
  'buyerDashboard.alerts.halal.detail': '{{missing}} more have no certificate on file',
  'buyerDashboard.alerts.obligations.label': 'Contract obligations overdue',
  'buyerDashboard.alerts.obligations.detail': '{{upcoming}} more still upcoming',
  'buyerDashboard.alerts.receipts.label': 'Receipts to review',
  'buyerDashboard.alerts.receipts.detail': '{{variance}} carry a variance',
  'buyerDashboard.alerts.disputes.label': 'Open disputes',
  // ⚠️ LABEL-THEN-FIGURE, not figure-then-plural-noun. "1 forecast responses"
  // was what the first draft rendered: two counts in one sentence cannot both
  // drive an i18next plural, so the phrasing is the fix rather than the
  // machinery. It also matches the AP basis line's grammar one card away.
  'buyerDashboard.alerts.disputes.detail':
    'Invoices {{invoices}} · forecast responses {{responses}}',
  'buyerDashboard.alerts.contracts.label': 'Contracts expiring',
  'buyerDashboard.alerts.contracts.detail': '{{horizon}} in the renewal horizon',
  // — KPI row —
  'buyerDashboard.kpi.matchRate.label': 'Three-way match rate',
  'buyerDashboard.kpi.matchRate.basis': '{{matched}} of {{total}} invoices matched',
  'buyerDashboard.kpi.rfqResponse.label': 'RFQ response rate',
  'buyerDashboard.kpi.rfqResponse.basis':
    '{{responded}} of {{invited}} invited suppliers answered',
  'buyerDashboard.kpi.poAcknowledged.label': 'Purchase orders acknowledged',
  'buyerDashboard.kpi.poAcknowledged.basis': '{{acknowledged}} of {{total}} orders',
  'buyerDashboard.kpi.grVariance.label': 'Receipt variance rate',
  'buyerDashboard.kpi.grVariance.basis': '{{variance}} of {{total}} receipts',
  'buyerDashboard.kpi.onTimePayment.label': 'On-time payment',
  'buyerDashboard.kpi.onTimePayment.basis': '{{onTime}} of {{paid}} settled invoices',
  'buyerDashboard.kpi.onTimePayment.lowVolume': 'Low volume — shown as a count',
  'buyerDashboard.kpi.onTimePayment.count': '{{onTime}} / {{paid}}',
  'buyerDashboard.kpi.apOpen.label': 'Accounts payable open',
  'buyerDashboard.kpi.apOpen.basis':
    'Submitted {{submitted}} · approved {{approved}} · disputed {{disputed}}',
  // — Chart cards —
  'buyerDashboard.chart.ap.title': 'Accounts payable by stage',
  'buyerDashboard.chart.ap.stage.submitted': 'Submitted',
  'buyerDashboard.chart.ap.stage.approved': 'Approved awaiting release',
  'buyerDashboard.chart.ap.stage.disputed': 'Disputed',
  'buyerDashboard.chart.ap.footer':
    'Payment and posting remain SAP acts; the portal shows the pipeline only.',
  'buyerDashboard.chart.halal.title': 'Halal certificate status',
  'buyerDashboard.chart.halal.valid': 'Valid',
  'buyerDashboard.chart.halal.expiring': 'Expiring',
  'buyerDashboard.chart.halal.missing': 'Missing',
  'buyerDashboard.chart.halal.expired': 'Expired',
  'buyerDashboard.chart.halal.footer':
    '{{total}} certificates on file — status only, never a claim of validity.',
  'buyerDashboard.chart.obligations.title': 'Contract obligations due, by month',
  'buyerDashboard.chart.obligations.footer': '{{total}} obligations across {{months}} months',
  'buyerDashboard.chart.viewAll': 'View all',
  // — Phase B placeholders —
  'buyerDashboard.phaseB.badge': 'PHASE B',
  'buyerDashboard.phaseB.spend.title': 'Monthly spend and PO volume',
  'buyerDashboard.phaseB.spend.body':
    'Appears once purchase orders are anchored to the declared present and carry at least six months of linked history. Today they span {{months}} months.',
  'buyerDashboard.phaseB.trend.title': 'Match rate and payment timing over time',
  'buyerDashboard.phaseB.trend.body':
    'Invoice history is too thin for a trend: {{months}} months, {{min}}–{{max}} invoices each.',
  // — Action queue —
  'buyerDashboard.queue.title': 'Action queue by lane',
  'buyerDashboard.queue.col.lane': 'Lane',
  'buyerDashboard.queue.col.work': 'Work waiting',
  'buyerDashboard.queue.col.count': 'Count',
  'buyerDashboard.queue.col.open': 'Open',
  'buyerDashboard.queue.open': 'Open',
  'buyerDashboard.queue.handoff': 'Another lane holds this',
  // ⚠️ NOT "no work waiting". The requisitioner lane has no ROW on this page —
  // which is a fact about the dashboard, not about that lane's workload. A
  // dashboard that said "nothing waiting" would be making a claim it has no
  // read to back.
  'buyerDashboard.queue.noRow': 'This lane has no queue on this page.',
  'buyerDashboard.queue.finance.work': 'Overdue invoices · disputed invoices',
  'buyerDashboard.queue.receiving.work': 'Receipts to review · ASNs with a discrepancy',
  'buyerDashboard.queue.compliance.work':
    'Halal certificates expired or expiring · documents under review',
  'buyerDashboard.queue.planning.work': 'Forecast responses submitted · disputed · draft',
  'buyerDashboard.queue.procurement.work':
    'RFQs awaiting award · unacknowledged POs — held until RFQ and PO dates are anchored',
  // — Phase C strip —
  'buyerDashboard.phaseC.badge': 'PHASE C',
  'buyerDashboard.phaseC.body':
    'Not shown until the data can prove them: OTIF · award lead time · PR → PO cycle time · acknowledgement time · supplier risk distribution · spend by material category.',
  // — Empty state —
  'buyerDashboard.empty.title': 'No command-center data',
  'buyerDashboard.empty.subtitle':
    'Procurement, finance and compliance data is available to buyer accounts.',
};

export const buyerDashboardId: Record<string, string> = {
  // — Breadcrumb —
  'buyerDashboard.crumb.dashboards': 'DASBOR',
  'buyerDashboard.crumb.commandCenter': 'PUSAT KOMANDO PENGADAAN',
  // — Page header —
  'buyerDashboard.header.eyebrow': 'Pembeli · Pusat Komando Pengadaan',
  'buyerDashboard.header.title': 'Selamat pagi — ini yang memerlukan Anda hari ini',
  'buyerDashboard.header.asOf': 'Per {{date}} · masa kini yang dinyatakan',
  'buyerDashboard.header.derived': 'Setiap angka diturunkan',
  // — Lane view chips —
  'buyerDashboard.lane.all': 'Semua jalur',
  'buyerDashboard.lane.legend': 'Menyaring antrean tindakan',
  // — Alerts strip —
  'buyerDashboard.alerts.title': 'Peringatan · {{count}} kelompok pengecualian',
  'buyerDashboard.alerts.severity.critical': 'Kritis',
  'buyerDashboard.alerts.severity.warning': 'Peringatan',
  'buyerDashboard.alerts.severity.info': 'Informasi',
  'buyerDashboard.alerts.overdueInvoices.label': 'Faktur jatuh tempo',
  'buyerDashboard.alerts.overdueInvoices.detail': 'Terlama {{days}} hari lewat jatuh tempo',
  'buyerDashboard.alerts.halal.label': 'Sertifikat halal kedaluwarsa atau akan berakhir',
  'buyerDashboard.alerts.halal.detail': '{{missing}} lainnya belum memiliki sertifikat',
  'buyerDashboard.alerts.obligations.label': 'Kewajiban kontrak lewat tenggat',
  'buyerDashboard.alerts.obligations.detail': '{{upcoming}} lainnya masih akan datang',
  'buyerDashboard.alerts.receipts.label': 'Penerimaan menunggu peninjauan',
  'buyerDashboard.alerts.receipts.detail': '{{variance}} memiliki selisih',
  'buyerDashboard.alerts.disputes.label': 'Sengketa terbuka',
  'buyerDashboard.alerts.disputes.detail':
    'Faktur {{invoices}} · tanggapan perkiraan {{responses}}',
  'buyerDashboard.alerts.contracts.label': 'Kontrak akan berakhir',
  'buyerDashboard.alerts.contracts.detail': '{{horizon}} dalam cakrawala perpanjangan',
  // — KPI row —
  'buyerDashboard.kpi.matchRate.label': 'Tingkat pencocokan tiga arah',
  'buyerDashboard.kpi.matchRate.basis': '{{matched}} dari {{total}} faktur cocok',
  'buyerDashboard.kpi.rfqResponse.label': 'Tingkat tanggapan RFQ',
  'buyerDashboard.kpi.rfqResponse.basis':
    '{{responded}} dari {{invited}} pemasok yang diundang menjawab',
  'buyerDashboard.kpi.poAcknowledged.label': 'Pesanan pembelian diakui',
  'buyerDashboard.kpi.poAcknowledged.basis': '{{acknowledged}} dari {{total}} pesanan',
  'buyerDashboard.kpi.grVariance.label': 'Tingkat selisih penerimaan',
  'buyerDashboard.kpi.grVariance.basis': '{{variance}} dari {{total}} penerimaan',
  'buyerDashboard.kpi.onTimePayment.label': 'Pembayaran tepat waktu',
  'buyerDashboard.kpi.onTimePayment.basis': '{{onTime}} dari {{paid}} faktur yang diselesaikan',
  'buyerDashboard.kpi.onTimePayment.lowVolume': 'Volume rendah — ditampilkan sebagai jumlah',
  'buyerDashboard.kpi.onTimePayment.count': '{{onTime}} / {{paid}}',
  'buyerDashboard.kpi.apOpen.label': 'Utang usaha terbuka',
  'buyerDashboard.kpi.apOpen.basis':
    'Diajukan {{submitted}} · disetujui {{approved}} · disengketakan {{disputed}}',
  // — Chart cards —
  'buyerDashboard.chart.ap.title': 'Utang usaha per tahap',
  'buyerDashboard.chart.ap.stage.submitted': 'Diajukan',
  'buyerDashboard.chart.ap.stage.approved': 'Disetujui menunggu pelepasan',
  'buyerDashboard.chart.ap.stage.disputed': 'Disengketakan',
  'buyerDashboard.chart.ap.footer':
    'Pembayaran dan posting tetap tindakan SAP; portal hanya menampilkan alurnya.',
  'buyerDashboard.chart.halal.title': 'Status sertifikat halal',
  'buyerDashboard.chart.halal.valid': 'Berlaku',
  'buyerDashboard.chart.halal.expiring': 'Akan berakhir',
  'buyerDashboard.chart.halal.missing': 'Belum ada',
  'buyerDashboard.chart.halal.expired': 'Kedaluwarsa',
  'buyerDashboard.chart.halal.footer':
    '{{total}} sertifikat terdaftar — hanya status, bukan pernyataan keabsahan.',
  'buyerDashboard.chart.obligations.title': 'Kewajiban kontrak jatuh tempo, per bulan',
  'buyerDashboard.chart.obligations.footer':
    '{{total}} kewajiban sepanjang {{months}} bulan',
  'buyerDashboard.chart.viewAll': 'Lihat semua',
  // — Phase B placeholders —
  'buyerDashboard.phaseB.badge': 'FASE B',
  'buyerDashboard.phaseB.spend.title': 'Belanja bulanan dan volume PO',
  'buyerDashboard.phaseB.spend.body':
    'Muncul setelah pesanan pembelian ditambatkan ke masa kini yang dinyatakan dan memuat riwayat tertaut minimal enam bulan. Saat ini rentangnya {{months}} bulan.',
  'buyerDashboard.phaseB.trend.title': 'Tingkat pencocokan dan waktu pembayaran dari waktu ke waktu',
  'buyerDashboard.phaseB.trend.body':
    'Riwayat faktur terlalu tipis untuk sebuah tren: {{months}} bulan, {{min}}–{{max}} faktur per bulan.',
  // — Action queue —
  'buyerDashboard.queue.title': 'Antrean tindakan per jalur',
  'buyerDashboard.queue.col.lane': 'Jalur',
  'buyerDashboard.queue.col.work': 'Pekerjaan menunggu',
  'buyerDashboard.queue.col.count': 'Jumlah',
  'buyerDashboard.queue.col.open': 'Buka',
  'buyerDashboard.queue.open': 'Buka',
  'buyerDashboard.queue.handoff': 'Jalur lain yang memegang ini',
  'buyerDashboard.queue.noRow': 'Jalur ini tidak memiliki antrean di halaman ini.',
  'buyerDashboard.queue.finance.work': 'Faktur jatuh tempo · faktur disengketakan',
  'buyerDashboard.queue.receiving.work': 'Penerimaan menunggu peninjauan · ASN dengan selisih',
  'buyerDashboard.queue.compliance.work':
    'Sertifikat halal kedaluwarsa atau akan berakhir · dokumen dalam peninjauan',
  'buyerDashboard.queue.planning.work': 'Tanggapan perkiraan diajukan · disengketakan · draf',
  'buyerDashboard.queue.procurement.work':
    'RFQ menunggu penetapan · PO belum diakui — ditahan sampai tanggal RFQ dan PO ditambatkan',
  // — Phase C strip —
  'buyerDashboard.phaseC.badge': 'FASE C',
  'buyerDashboard.phaseC.body':
    'Belum ditampilkan sampai datanya dapat membuktikan: OTIF · waktu tempuh penetapan · waktu siklus PR → PO · waktu pengakuan · sebaran risiko pemasok · belanja per kategori material.',
  // — Empty state —
  'buyerDashboard.empty.title': 'Tidak ada data pusat komando',
  'buyerDashboard.empty.subtitle':
    'Data pengadaan, keuangan dan kepatuhan tersedia untuk akun pembeli.',
};
