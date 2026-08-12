// SupplierDashboard i18n fragment (Batch 3). Namespace: supplierDashboard.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Supplier-persona surface: ID-first tone is welcome.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children — the OTIF status chip (On Track / Needs
// Attention / At Risk), PO status, and document status — are localized centrally
// via statusLabel.ts and are NOT re-declared here. The "Today's briefing" action
// rows are fixture/sample narratives (the panel is badged "Sample data"): they
// stay EN in the page (i18n-defer) because they are mock content, not chrome.
// Mono data (doc numbers, currency, dates, quantities, percentages) is rendered
// via <Data>/formatters and is never translated.
export const supplierDashboardEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierDashboard.crumb.acquire': 'ACQUIRE',
  'supplierDashboard.crumb.dashboard': 'DASHBOARD',
  // — Page header —
  'supplierDashboard.header.title': 'Welcome back, {{name}}',
  'supplierDashboard.header.subtitle':
    'Paragon Corp Supplier Portal · Last login: {{date}} · Channel: {{channel}}',
  // — Meta line —
  'supplierDashboard.meta.identity': 'Supplier identity · {{country}} · {{category}}',
  // — Identity card —
  'supplierDashboard.identity.sapBp': 'SAP BP: {{bp}} · Channel: {{channel}}',
  'supplierDashboard.identity.grade': 'Paragon Grade',
  'supplierDashboard.identity.otif': 'OTIF: {{value}}%',
  'supplierDashboard.identity.target': 'Target: ≥ 95%',
  // — Preferred-channel labels —
  'supplierDashboard.channel.whatsapp': 'WhatsApp',
  'supplierDashboard.channel.web': 'Web Portal',
  'supplierDashboard.channel.email': 'Email',
  'supplierDashboard.channel.api': 'API/EDI',
  // — KPI cards —
  'supplierDashboard.kpi.openOrders.eyebrow': 'Open Orders',
  'supplierDashboard.kpi.openOrders.subtitle': 'Awaiting action',
  'supplierDashboard.kpi.pendingAsns.eyebrow': 'Pending ASNs',
  'supplierDashboard.kpi.pendingAsns.subtitle': 'Need shipment notice',
  'supplierDashboard.kpi.unpaidInvoices.eyebrow': 'Unpaid Invoices',
  'supplierDashboard.kpi.unpaidInvoices.pending': 'Pending payment',
  'supplierDashboard.kpi.unpaidInvoices.settled': 'All settled',
  'supplierDashboard.kpi.otif.eyebrow': 'My OTIF Score',
  'supplierDashboard.kpi.otif.subtitle': 'Last 6 months',
  // — Today's briefing —
  'supplierDashboard.briefing.title': "Today's briefing",
  'supplierDashboard.briefing.sampleData': 'Sample data',
  'supplierDashboard.briefing.actions.one': '{{count}} action',
  'supplierDashboard.briefing.actions.other': '{{count}} actions',
  'supplierDashboard.briefing.allClear': 'All clear',
  'supplierDashboard.briefing.done.title': 'All done for today',
  'supplierDashboard.briefing.done.body': 'No pending actions. Check back tomorrow.',
  // — Recent purchase orders —
  'supplierDashboard.orders.title': 'My recent purchase orders',
  'supplierDashboard.orders.col.po': 'PO #',
  'supplierDashboard.orders.col.orderDate': 'Order date',
  'supplierDashboard.orders.col.items': 'Items',
  'supplierDashboard.orders.col.value': 'Value',
  'supplierDashboard.orders.col.status': 'Status',
  'supplierDashboard.orders.col.action': 'Action',
  'supplierDashboard.orders.action.confirm': 'Confirm',
  'supplierDashboard.orders.action.createAsn': 'Create ASN',
  'supplierDashboard.orders.action.view': 'View',
  'supplierDashboard.orders.toast.opening': 'PO confirmation not available from this card — nothing was opened. Use My Orders.',
  'supplierDashboard.orders.toast.creatingAsn': 'ASN creation not available from this card — nothing was created. Use Shipments & ASN.',
  'supplierDashboard.orders.toast.viewing': 'PO detail not available from this card — nothing was opened. Use My Orders.',
  // — Performance score —
  'supplierDashboard.perf.title': 'My performance score',
  'supplierDashboard.perf.otif': 'OTIF',
  'supplierDashboard.perf.leadTime': 'Lead Time Adherence',
  'supplierDashboard.perf.invoiceAccuracy': 'Invoice Accuracy',
  'supplierDashboard.perf.footnote': 'Performance reviewed monthly by Paragon procurement team',
  // — Documents —
  'supplierDashboard.docs.title': 'My documents',
  'supplierDashboard.docs.exp': 'Exp: {{date}}',
  'supplierDashboard.docs.noExpiry': 'No expiry',
  'supplierDashboard.docs.action.view': 'View',
  'supplierDashboard.docs.action.renew': 'Renew',
  'supplierDashboard.docs.action.upload': 'Upload',
  'supplierDashboard.docs.toast.title': '{{action}} — {{name}}',
  'supplierDashboard.docs.toast.desc': 'Document management workflow coming in Phase 2.',
  // R1 — was a hardcoded template literal in the component (EN only, both
  // locales bypassed) that read "<label> workflow initiated." The handler only
  // dismisses the briefing card; no workflow is initiated by it.
  'supplierDashboard.brief.toast.desc': 'Nothing was initiated — this card only dismisses the briefing.',
  // — Empty state (no supplier profile) —
  'supplierDashboard.empty.title': 'No supplier profile yet',
  'supplierDashboard.empty.subtitle': 'Your Paragon supplier record is not available.',
  'supplierDashboard.empty.message':
    'Your dashboard appears here once Paragon links your supplier profile.',
};

export const supplierDashboardId: Record<string, string> = {
  // — Breadcrumb —
  'supplierDashboard.crumb.acquire': 'PENGADAAN',
  'supplierDashboard.crumb.dashboard': 'DASBOR',
  // — Page header —
  'supplierDashboard.header.title': 'Selamat datang kembali, {{name}}',
  'supplierDashboard.header.subtitle':
    'Portal Pemasok Paragon Corp · Login terakhir: {{date}} · Kanal: {{channel}}',
  // — Meta line —
  'supplierDashboard.meta.identity': 'Identitas pemasok · {{country}} · {{category}}',
  // — Identity card —
  'supplierDashboard.identity.sapBp': 'SAP BP: {{bp}} · Kanal: {{channel}}',
  'supplierDashboard.identity.grade': 'Grade Paragon',
  'supplierDashboard.identity.otif': 'OTIF: {{value}}%',
  'supplierDashboard.identity.target': 'Target: ≥ 95%',
  // — Preferred-channel labels —
  'supplierDashboard.channel.whatsapp': 'WhatsApp',
  'supplierDashboard.channel.web': 'Portal Web',
  'supplierDashboard.channel.email': 'Email',
  'supplierDashboard.channel.api': 'API/EDI',
  // — KPI cards —
  'supplierDashboard.kpi.openOrders.eyebrow': 'Pesanan Terbuka',
  'supplierDashboard.kpi.openOrders.subtitle': 'Menunggu tindakan',
  'supplierDashboard.kpi.pendingAsns.eyebrow': 'ASN Tertunda',
  'supplierDashboard.kpi.pendingAsns.subtitle': 'Perlu pemberitahuan pengiriman',
  'supplierDashboard.kpi.unpaidInvoices.eyebrow': 'Faktur Belum Dibayar',
  'supplierDashboard.kpi.unpaidInvoices.pending': 'Menunggu pembayaran',
  'supplierDashboard.kpi.unpaidInvoices.settled': 'Semua lunas',
  'supplierDashboard.kpi.otif.eyebrow': 'Skor OTIF Saya',
  'supplierDashboard.kpi.otif.subtitle': '6 bulan terakhir',
  // — Today's briefing —
  'supplierDashboard.briefing.title': 'Ringkasan hari ini',
  'supplierDashboard.briefing.sampleData': 'Data sampel',
  'supplierDashboard.briefing.actions.one': '{{count}} tindakan',
  'supplierDashboard.briefing.actions.other': '{{count}} tindakan',
  'supplierDashboard.briefing.allClear': 'Semua beres',
  'supplierDashboard.briefing.done.title': 'Semua selesai untuk hari ini',
  'supplierDashboard.briefing.done.body': 'Tidak ada tindakan tertunda. Periksa kembali besok.',
  // — Recent purchase orders —
  'supplierDashboard.orders.title': 'Pesanan pembelian terbaru saya',
  'supplierDashboard.orders.col.po': 'No. PO',
  'supplierDashboard.orders.col.orderDate': 'Tanggal pesanan',
  'supplierDashboard.orders.col.items': 'Item',
  'supplierDashboard.orders.col.value': 'Nilai',
  'supplierDashboard.orders.col.status': 'Status',
  'supplierDashboard.orders.col.action': 'Tindakan',
  'supplierDashboard.orders.action.confirm': 'Konfirmasi',
  'supplierDashboard.orders.action.createAsn': 'Buat ASN',
  'supplierDashboard.orders.action.view': 'Lihat',
  'supplierDashboard.orders.toast.opening': 'Konfirmasi PO tidak tersedia dari kartu ini — tidak ada yang dibuka. Gunakan Pesanan Saya.',
  'supplierDashboard.orders.toast.creatingAsn': 'Pembuatan ASN tidak tersedia dari kartu ini — tidak ada yang dibuat. Gunakan Pengiriman & ASN.',
  'supplierDashboard.orders.toast.viewing': 'Detail PO tidak tersedia dari kartu ini — tidak ada yang dibuka. Gunakan Pesanan Saya.',
  // — Performance score —
  'supplierDashboard.perf.title': 'Skor kinerja saya',
  'supplierDashboard.perf.otif': 'OTIF',
  'supplierDashboard.perf.leadTime': 'Kepatuhan Waktu Tunggu',
  'supplierDashboard.perf.invoiceAccuracy': 'Akurasi Faktur',
  'supplierDashboard.perf.footnote': 'Kinerja ditinjau bulanan oleh tim pengadaan Paragon',
  // — Documents —
  'supplierDashboard.docs.title': 'Dokumen saya',
  'supplierDashboard.docs.exp': 'Kedaluwarsa: {{date}}',
  'supplierDashboard.docs.noExpiry': 'Tanpa kedaluwarsa',
  'supplierDashboard.docs.action.view': 'Lihat',
  'supplierDashboard.docs.action.renew': 'Perbarui',
  'supplierDashboard.docs.action.upload': 'Unggah',
  'supplierDashboard.docs.toast.title': '{{action}} — {{name}}',
  'supplierDashboard.docs.toast.desc': 'Alur manajemen dokumen akan hadir di Fase 2.',
  'supplierDashboard.brief.toast.desc': 'Tidak ada yang dimulai — kartu ini hanya menutup ringkasan.',
  // — Empty state (no supplier profile) —
  'supplierDashboard.empty.title': 'Belum ada profil pemasok',
  'supplierDashboard.empty.subtitle': 'Catatan pemasok Paragon Anda tidak tersedia.',
  'supplierDashboard.empty.message':
    'Dasbor Anda muncul di sini setelah Paragon menautkan profil pemasok Anda.',
};
