// BuyerSupplierProfile i18n fragment (Batch 6). Namespace: buyerSupplierProfile.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// CENTRAL MAPS (not re-keyed here):
//  • StatusPill string children localize centrally: supp.status, the derived
//    OTIF chip ('On Time' → statusLabel), the PO status chip, and the Message-Log
//    direction chip ('Inbound'/'Outbound' → statusLabel).
//  • supp.category (header subtitle) → useCategoryLabel(); preferredChannel and
//    the Message-Log channel cell → useChannelLabel(). Never a page key.
//  • Tier labels are page-local display strings (WhatsApp/Web Portal/API are
//    proper nouns/protocols); 'Web Portal' → 'Portal Web' matches channelLabel.
//
// KNOWN GAP (flagged, NOT fixed here — would require re-keying, which is barred):
// the Compliance-tab cert-status chip renders COMPLIANCE_LABEL inside a <span>
// (icon + text). StatusPill only localizes STRING children, so those tokens
// (Valid/Expiring/Expired/Missing/Pending — all present in statusLabel) render
// VERBATIM EN even though the central map could translate them. Left canonical.
//
// DEFERRED as data / fixture (EN kept): MSG_LOG rows (docType, preview, 'read'/
// 'delivered' status, timestamps) are sample data (badged "Sample data"); the
// 'Halal Certified'/'BPOM Registered' identity chips and the 'Sample data' chip
// are unmapped StatusPill children and render verbatim. Mono DATA (SAP BP, tax/
// reg/founded/employees/revenue, PO numbers, currency, quantities, dates via
// <Data>/formatters), payment-term & incoterm codes, and proper nouns (name,
// city, country, email, phone, website, intelligenceNote) stay EN as data.
export const buyerSupplierProfileEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerSupplierProfile.crumb.acquire': 'ACQUIRE',
  'buyerSupplierProfile.crumb.directory': 'SUPPLIER DIRECTORY',
  // — Back link / not-found —
  'buyerSupplierProfile.back.directory': 'Supplier Directory',
  'buyerSupplierProfile.notFound.title': 'Supplier not found',
  'buyerSupplierProfile.notFound.back': 'Back to Directory',
  // — Header actions —
  'buyerSupplierProfile.actions.message': 'Message',
  'buyerSupplierProfile.actions.createRfq': 'Create RFQ',
  // — Connectivity-tier labels —
  'buyerSupplierProfile.tier.whatsapp': 'Tier 1 · WhatsApp',
  'buyerSupplierProfile.tier.web': 'Tier 2 · Web Portal',
  'buyerSupplierProfile.tier.api': 'Tier 3 · API/EDI',
  // — KPI strip —
  'buyerSupplierProfile.kpi.otif.eyebrow': 'OTIF',
  'buyerSupplierProfile.kpi.otif.subtitle': 'On-time, in-full',
  'buyerSupplierProfile.kpi.leadTime.eyebrow': 'Lead Time Adherence',
  'buyerSupplierProfile.kpi.leadTime.subtitle': 'Last 12 months',
  'buyerSupplierProfile.kpi.invoiceAccuracy.eyebrow': 'Invoice Accuracy',
  'buyerSupplierProfile.kpi.invoiceAccuracy.subtitle': 'Match rate',
  'buyerSupplierProfile.kpi.scorecard.eyebrow': 'Scorecard Grade',
  'buyerSupplierProfile.kpi.scorecard.subtitle': 'Rating {{rating}} / 5',
  // — Tabs —
  'buyerSupplierProfile.tab.overview': 'Overview',
  'buyerSupplierProfile.tab.comm': 'Communication Setup',
  'buyerSupplierProfile.tab.compliance': 'Compliance',
  'buyerSupplierProfile.tab.catalog': 'Catalog',
  'buyerSupplierProfile.tab.performance': 'Performance',
  'buyerSupplierProfile.tab.msglog': 'Message Log',
  // — Overview tab —
  'buyerSupplierProfile.overview.heading': 'Company overview',
  'buyerSupplierProfile.overview.legalName': 'Legal name',
  'buyerSupplierProfile.overview.taxId': 'Tax ID',
  'buyerSupplierProfile.overview.businessReg': 'Business reg.',
  'buyerSupplierProfile.overview.founded': 'Founded',
  'buyerSupplierProfile.overview.employees': 'Employees',
  'buyerSupplierProfile.overview.annualRevenue': 'Annual revenue',
  'buyerSupplierProfile.overview.paymentTerms': 'Payment terms',
  'buyerSupplierProfile.overview.incoterms': 'Incoterms',
  'buyerSupplierProfile.overview.onboarded': 'Onboarded',
  'buyerSupplierProfile.overview.lastActivity': 'Last activity',
  'buyerSupplierProfile.overview.intelNote': 'Intelligence note:',
  // — Communication Setup tab —
  'buyerSupplierProfile.comm.heading': 'Communication setup',
  'buyerSupplierProfile.comm.preferredChannel': 'Preferred channel',
  'buyerSupplierProfile.comm.connectivityTier': 'Connectivity tier',
  'buyerSupplierProfile.comm.primaryContact': 'Primary contact',
  'buyerSupplierProfile.comm.phone': 'Phone',
  'buyerSupplierProfile.comm.email': 'Email',
  'buyerSupplierProfile.comm.businessHours': 'Business-hours only',
  'buyerSupplierProfile.comm.yes': 'Yes',
  'buyerSupplierProfile.comm.reset': 'Reset to defaults',
  'buyerSupplierProfile.comm.save': 'Save profile',
  // — Compliance tab —
  'buyerSupplierProfile.compliance.heading': 'Compliance documents',
  'buyerSupplierProfile.compliance.col.document': 'Document',
  'buyerSupplierProfile.compliance.col.status': 'Status',
  'buyerSupplierProfile.compliance.col.uploaded': 'Uploaded',
  'buyerSupplierProfile.compliance.col.expires': 'Expires',
  'buyerSupplierProfile.compliance.empty': 'No compliance documents on file.',
  // — Catalog tab —
  'buyerSupplierProfile.catalog.heading': 'Catalog',
  'buyerSupplierProfile.catalog.col.material': 'Material',
  'buyerSupplierProfile.catalog.col.sapCode': 'SAP Code',
  'buyerSupplierProfile.catalog.col.moq': 'MOQ',
  'buyerSupplierProfile.catalog.col.leadTime': 'Lead time',
  'buyerSupplierProfile.catalog.col.unitPrice': 'Unit price',
  'buyerSupplierProfile.catalog.col.capacity': 'Capacity',
  'buyerSupplierProfile.catalog.empty': 'No catalog items published.',
  // — Performance tab —
  'buyerSupplierProfile.performance.heading': 'Recent purchase orders',
  'buyerSupplierProfile.performance.subtitle':
    "This supplier's most recent purchase orders with derived OTIF.",
  'buyerSupplierProfile.performance.col.po': 'PO #',
  'buyerSupplierProfile.performance.col.material': 'Material',
  'buyerSupplierProfile.performance.col.qty': 'Qty',
  'buyerSupplierProfile.performance.col.value': 'Value',
  'buyerSupplierProfile.performance.col.ordered': 'Ordered',
  'buyerSupplierProfile.performance.col.delivery': 'Delivery',
  'buyerSupplierProfile.performance.col.otif': 'OTIF',
  'buyerSupplierProfile.performance.col.status': 'Status',
  'buyerSupplierProfile.performance.empty':
    'No purchase orders for this supplier.',
  // — Message Log tab —
  'buyerSupplierProfile.msglog.heading': 'Message log',
  'buyerSupplierProfile.msglog.col.timestamp': 'Timestamp',
  'buyerSupplierProfile.msglog.col.direction': 'Direction',
  'buyerSupplierProfile.msglog.col.channel': 'Channel',
  'buyerSupplierProfile.msglog.col.type': 'Type',
  'buyerSupplierProfile.msglog.col.preview': 'Preview',
  'buyerSupplierProfile.msglog.col.status': 'Status',
};

export const buyerSupplierProfileId: Record<string, string> = {
  // — Breadcrumb —
  'buyerSupplierProfile.crumb.acquire': 'PENGADAAN',
  'buyerSupplierProfile.crumb.directory': 'DIREKTORI PEMASOK',
  // — Back link / not-found —
  'buyerSupplierProfile.back.directory': 'Direktori Pemasok',
  'buyerSupplierProfile.notFound.title': 'Pemasok tidak ditemukan',
  'buyerSupplierProfile.notFound.back': 'Kembali ke Direktori',
  // — Header actions —
  'buyerSupplierProfile.actions.message': 'Pesan',
  'buyerSupplierProfile.actions.createRfq': 'Buat RFQ',
  // — Connectivity-tier labels —
  'buyerSupplierProfile.tier.whatsapp': 'Tingkat 1 · WhatsApp',
  'buyerSupplierProfile.tier.web': 'Tingkat 2 · Portal Web',
  'buyerSupplierProfile.tier.api': 'Tingkat 3 · API/EDI',
  // — KPI strip —
  'buyerSupplierProfile.kpi.otif.eyebrow': 'OTIF',
  'buyerSupplierProfile.kpi.otif.subtitle': 'Tepat waktu, jumlah penuh',
  'buyerSupplierProfile.kpi.leadTime.eyebrow': 'Kepatuhan Waktu Tunggu',
  'buyerSupplierProfile.kpi.leadTime.subtitle': '12 bulan terakhir',
  'buyerSupplierProfile.kpi.invoiceAccuracy.eyebrow': 'Akurasi Faktur',
  'buyerSupplierProfile.kpi.invoiceAccuracy.subtitle': 'Tingkat kecocokan',
  'buyerSupplierProfile.kpi.scorecard.eyebrow': 'Grade Kartu Skor',
  'buyerSupplierProfile.kpi.scorecard.subtitle': 'Rating {{rating}} / 5',
  // — Tabs —
  'buyerSupplierProfile.tab.overview': 'Ikhtisar',
  'buyerSupplierProfile.tab.comm': 'Pengaturan Komunikasi',
  'buyerSupplierProfile.tab.compliance': 'Kepatuhan',
  'buyerSupplierProfile.tab.catalog': 'Katalog',
  'buyerSupplierProfile.tab.performance': 'Kinerja',
  'buyerSupplierProfile.tab.msglog': 'Log Pesan',
  // — Overview tab —
  'buyerSupplierProfile.overview.heading': 'Ikhtisar perusahaan',
  'buyerSupplierProfile.overview.legalName': 'Nama resmi',
  'buyerSupplierProfile.overview.taxId': 'ID Pajak',
  'buyerSupplierProfile.overview.businessReg': 'Reg. bisnis',
  'buyerSupplierProfile.overview.founded': 'Didirikan',
  'buyerSupplierProfile.overview.employees': 'Karyawan',
  'buyerSupplierProfile.overview.annualRevenue': 'Pendapatan tahunan',
  'buyerSupplierProfile.overview.paymentTerms': 'Syarat pembayaran',
  'buyerSupplierProfile.overview.incoterms': 'Incoterms',
  'buyerSupplierProfile.overview.onboarded': 'Bergabung',
  'buyerSupplierProfile.overview.lastActivity': 'Aktivitas terakhir',
  'buyerSupplierProfile.overview.intelNote': 'Catatan intelijen:',
  // — Communication Setup tab —
  'buyerSupplierProfile.comm.heading': 'Pengaturan komunikasi',
  'buyerSupplierProfile.comm.preferredChannel': 'Kanal pilihan',
  'buyerSupplierProfile.comm.connectivityTier': 'Tingkat konektivitas',
  'buyerSupplierProfile.comm.primaryContact': 'Narahubung utama',
  'buyerSupplierProfile.comm.phone': 'Telepon',
  'buyerSupplierProfile.comm.email': 'Email',
  'buyerSupplierProfile.comm.businessHours': 'Hanya jam kerja',
  'buyerSupplierProfile.comm.yes': 'Ya',
  'buyerSupplierProfile.comm.reset': 'Setel ulang ke bawaan',
  'buyerSupplierProfile.comm.save': 'Simpan profil',
  // — Compliance tab —
  'buyerSupplierProfile.compliance.heading': 'Dokumen kepatuhan',
  'buyerSupplierProfile.compliance.col.document': 'Dokumen',
  'buyerSupplierProfile.compliance.col.status': 'Status',
  'buyerSupplierProfile.compliance.col.uploaded': 'Diunggah',
  'buyerSupplierProfile.compliance.col.expires': 'Kedaluwarsa',
  'buyerSupplierProfile.compliance.empty':
    'Tidak ada dokumen kepatuhan tersimpan.',
  // — Catalog tab —
  'buyerSupplierProfile.catalog.heading': 'Katalog',
  'buyerSupplierProfile.catalog.col.material': 'Material',
  'buyerSupplierProfile.catalog.col.sapCode': 'Kode SAP',
  'buyerSupplierProfile.catalog.col.moq': 'MOQ',
  'buyerSupplierProfile.catalog.col.leadTime': 'Waktu tunggu',
  'buyerSupplierProfile.catalog.col.unitPrice': 'Harga satuan',
  'buyerSupplierProfile.catalog.col.capacity': 'Kapasitas',
  'buyerSupplierProfile.catalog.empty': 'Tidak ada item katalog dipublikasikan.',
  // — Performance tab —
  'buyerSupplierProfile.performance.heading': 'Pesanan pembelian terbaru',
  'buyerSupplierProfile.performance.subtitle':
    'Pesanan pembelian terbaru pemasok ini dengan OTIF turunan.',
  'buyerSupplierProfile.performance.col.po': 'PO #',
  'buyerSupplierProfile.performance.col.material': 'Material',
  'buyerSupplierProfile.performance.col.qty': 'Kuantitas',
  'buyerSupplierProfile.performance.col.value': 'Nilai',
  'buyerSupplierProfile.performance.col.ordered': 'Dipesan',
  'buyerSupplierProfile.performance.col.delivery': 'Pengiriman',
  'buyerSupplierProfile.performance.col.otif': 'OTIF',
  'buyerSupplierProfile.performance.col.status': 'Status',
  'buyerSupplierProfile.performance.empty':
    'Tidak ada pesanan pembelian untuk pemasok ini.',
  // — Message Log tab —
  'buyerSupplierProfile.msglog.heading': 'Log pesan',
  'buyerSupplierProfile.msglog.col.timestamp': 'Stempel waktu',
  'buyerSupplierProfile.msglog.col.direction': 'Arah',
  'buyerSupplierProfile.msglog.col.channel': 'Kanal',
  'buyerSupplierProfile.msglog.col.type': 'Jenis',
  'buyerSupplierProfile.msglog.col.preview': 'Pratinjau',
  'buyerSupplierProfile.msglog.col.status': 'Status',
};
