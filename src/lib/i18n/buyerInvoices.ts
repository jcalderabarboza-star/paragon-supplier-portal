// BuyerInvoices i18n fragment (coverage sweep — sprint close). Namespace:
// buyerInvoices.*  Flat dot-keys, mirrors src/lib/i18n.ts and the Batch-5
// supplierInvoices.ts pattern. Wired into i18n.ts by import + spread into both
// en/id objects + added to the FRAGMENTS array in fragments.test.ts.
//
// BuyerInvoices was an early partial migration: the toast/command verbs were
// keyed under the seeded `invoice.*` namespace, but the STATIC SCAFFOLDING
// (header, KPI tiles, banners, tabs, table, drawer) was never extracted and so
// slipped Batches 1–6. This fragment closes that gap.
//
// Invoice/match STATUS chips render through <StatusPill>, which localizes
// centrally via statusLabel.ts / priorityLabel.ts — they are NOT re-keyed here.
// The one plain-text match heading in the drawer is localized in-component via
// statusLabelKey (not a pill). Mono DATA (invoice/PO numbers, IDR amounts,
// dates, SAP FI/GR refs, bank accounts, channel enum, fixture values) is never
// translated. Count-dependent phrases use explicit `.one`/`.other` siblings
// selected by a `count === 1` ternary (flat-key convention, no plural resolver).
export const buyerInvoicesEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerInvoices.crumb.transact': 'TRANSACT',
  'buyerInvoices.crumb.invoices': 'INVOICES & PAYMENT',
  // — Page header —
  'buyerInvoices.header.title': 'Invoices & Payment',
  'buyerInvoices.header.subtitle':
    '3-way match · approval queue · payment release · SAP FI integration.',
  // — Bulk actions + their toasts —
  'buyerInvoices.action.sapApExport': 'SAP AP Export',
  'buyerInvoices.action.exportReport': 'Export Report',
  'buyerInvoices.toast.sapExport.title': 'Exporting to SAP AP batch',
  'buyerInvoices.toast.agingReport.title': 'Downloading aging report',
  // — Meta line (count sibling; trailing formatted date rendered after) —
  'buyerInvoices.meta.summary.one': '{{count}} invoice · last updated',
  'buyerInvoices.meta.summary.other': '{{count}} invoices · last updated',
  // — KPI cards —
  'buyerInvoices.kpi.pendingApproval.eyebrow': 'Pending Approval',
  'buyerInvoices.kpi.released.eyebrow': 'Payments Released',
  'buyerInvoices.kpi.disputed.eyebrow': 'Disputed',
  'buyerInvoices.kpi.overdue.eyebrow': 'Overdue',
  'buyerInvoices.kpi.invoiceCount.one': '{{count}} invoice',
  'buyerInvoices.kpi.invoiceCount.other': '{{count}} invoices',
  // — Overdue banner (count sibling label · data list built in-component) —
  'buyerInvoices.banner.overdue.label.one': '{{count}} overdue invoice: ',
  'buyerInvoices.banner.overdue.label.other': '{{count}} overdue invoices: ',
  'buyerInvoices.banner.overdue.item': '{{invoice}} ({{days}}d overdue)',
  // — Dispute banner (invoice numbers interleaved as data) —
  'buyerInvoices.banner.dispute.label': 'Invoice dispute: ',
  'buyerInvoices.banner.dispute.body':
    ' — Quantity mismatch on PT Sample Packaging. Credit note required before payment.',
  // — Tabs —
  'buyerInvoices.tab.queue': 'Invoice Queue',
  'buyerInvoices.tab.analytics': 'Spend Analytics',
  'buyerInvoices.tab.aging': 'Aging Analysis',
  // — Status filter chips —
  'buyerInvoices.filter.all': 'All',
  'buyerInvoices.filter.pendingMatch': 'Pending Match',
  'buyerInvoices.filter.approved': 'Approved',
  'buyerInvoices.filter.released': 'Released',
  'buyerInvoices.filter.disputed': 'Disputed',
  'buyerInvoices.filter.overdue': 'Overdue',
  // — Queue table columns —
  'buyerInvoices.table.invoiceNo': 'Invoice #',
  'buyerInvoices.table.supplier': 'Supplier',
  'buyerInvoices.table.poRef': 'PO ref',
  'buyerInvoices.table.amount': 'Amount',
  'buyerInvoices.table.match': '3-way match',
  'buyerInvoices.table.status': 'Status',
  'buyerInvoices.table.dueDate': 'Due date',
  'buyerInvoices.table.sapFi': 'SAP FI',
  'buyerInvoices.table.actions': 'Actions',
  'buyerInvoices.table.via': 'via {{channel}}',
  'buyerInvoices.table.paid': 'Paid',
  'buyerInvoices.table.daysOverdue': '{{days}}d overdue',
  'buyerInvoices.table.empty': 'No invoices match the current filters.',
  // — Analytics tab —
  'buyerInvoices.analytics.monthlyFlow': 'Monthly Invoice Flow (Rp jT)',
  'buyerInvoices.analytics.matchSummary': '3-Way Match Summary',
  'buyerInvoices.chart.released': 'Released',
  'buyerInvoices.chart.pending': 'Pending',
  'buyerInvoices.chart.amount': 'Amount',
  'buyerInvoices.matchTile.autoMatched': 'Auto-Matched',
  'buyerInvoices.matchTile.pendingGr': 'Pending GR',
  'buyerInvoices.matchTile.qtyMismatch': 'Qty Mismatch',
  'buyerInvoices.matchTile.priceVariance': 'Price Variance',
  // — Aging tab —
  'buyerInvoices.aging.reportTitle': 'Invoice Aging Report (Rp jT)',
  'buyerInvoices.aging.bucket': 'Aging bucket',
  'buyerInvoices.aging.count': 'Count',
  'buyerInvoices.aging.amount': 'Amount',
  'buyerInvoices.aging.pctAp': '% of AP',
  'buyerInvoices.aging.risk': 'Risk',
  'buyerInvoices.aging.current': 'Current',
  'buyerInvoices.aging.phase2.label': 'Phase 2 — SAP FI Integration:',
  'buyerInvoices.aging.phase2.body':
    'Aging will pull from SAP AP open items. Payment runs triggered via SAP F110.',
  // — Detail drawer: title + footer actions —
  'buyerInvoices.panel.title': 'Invoice {{invoiceNumber}}',
  'buyerInvoices.action.close': 'Close',
  'buyerInvoices.action.dispute': 'Dispute',
  'buyerInvoices.action.cancel': 'Cancel',
  'buyerInvoices.action.confirmRelease': 'Confirm release — {{amount}}',
  'buyerInvoices.action.raiseDispute': 'Raise dispute',
  'buyerInvoices.action.back': 'Back',
  'buyerInvoices.action.sendToSupplier': 'Send to supplier',
  // — Footer action by status —
  'buyerInvoices.footer.reviewMatch': 'Review match',
  'buyerInvoices.footer.releasePayment': 'Release payment',
  'buyerInvoices.footer.resolveDispute': 'Resolve dispute',
  'buyerInvoices.footer.sendRemittance': 'Send remittance',
  'buyerInvoices.footer.escalate': 'Escalate',
  // — Drawer section headings —
  'buyerInvoices.section.keyFacts': 'Key facts',
  'buyerInvoices.section.match': '3-way match',
  'buyerInvoices.section.sapDocs': 'SAP documents',
  'buyerInvoices.section.payment': 'Payment',
  'buyerInvoices.section.raiseDispute': 'Raise a dispute',
  'buyerInvoices.section.remittance': 'Remittance advice',
  // — Drawer field labels (<dt>) —
  'buyerInvoices.field.supplier': 'Supplier',
  'buyerInvoices.field.poReference': 'PO reference',
  'buyerInvoices.field.amount': 'Amount',
  'buyerInvoices.field.paymentTerms': 'Payment terms',
  'buyerInvoices.field.dueDate': 'Due date',
  'buyerInvoices.field.approver': 'Approver',
  'buyerInvoices.field.status': 'Status',
  'buyerInvoices.field.channel': 'Channel',
  'buyerInvoices.field.fiDocument': 'FI document',
  'buyerInvoices.field.grDocument': 'GR document',
  'buyerInvoices.field.bankAccount': 'Bank account',
  'buyerInvoices.field.paymentDate': 'Payment date',
  'buyerInvoices.field.pending': '— pending —',
  // — 3-way match explanations (keyed off matchStatus) —
  'buyerInvoices.match.matched':
    'PO, GR and invoice quantities + prices all reconcile.',
  'buyerInvoices.match.pendingGr':
    'Awaiting goods receipt posting in SAP before match can complete.',
  'buyerInvoices.match.pending': 'Match not yet started.',
  'buyerInvoices.match.qtyMismatch':
    'Delivered quantity does not match invoiced quantity. Credit note required.',
  'buyerInvoices.match.priceVariance':
    'Invoice unit price exceeds PO price by more than tolerance.',
  // — Confirm-release warning (interleaved <Data> amount + bank) —
  'buyerInvoices.confirm.title': 'Confirm payment release',
  'buyerInvoices.confirm.body.pre': 'This action cannot be undone. Payment of ',
  'buyerInvoices.confirm.body.mid': ' will be transferred to ',
  'buyerInvoices.confirm.body.post':
    '. Verify bank details before confirming.',
  // — Dispute form —
  'buyerInvoices.dispute.srLabel': 'Dispute reason for {{invoiceNumber}}',
  'buyerInvoices.dispute.placeholder':
    'Reason (e.g. quantity mismatch vs GR, price variance)…',
  'buyerInvoices.dispute.note':
    'A credit note will be required before payment can be released.',
  // — Remittance advice —
  'buyerInvoices.remit.invoiceNo': 'Invoice no',
  'buyerInvoices.remit.downloadPdf': 'Download PDF',
  'buyerInvoices.remit.note':
    'This remittance advice confirms payment has been processed. The supplier will receive notification via their preferred communication channel.',
  'buyerInvoices.toast.downloadPdf.title': 'Downloading remittance PDF',
  'buyerInvoices.toast.downloadPdf.desc': 'File will be available in a moment.',
  // — Escalate toast —
  'buyerInvoices.toast.escalate.title': '{{invoiceNumber}} escalated',
  'buyerInvoices.toast.escalate.desc':
    'Routed to Finance Controller for urgent action.',
  // — Wrapper empty state —
  'buyerInvoices.empty.title': 'No invoices',
  'buyerInvoices.empty.subtitle':
    'There are no invoices to match or pay for this view.',
};

export const buyerInvoicesId: Record<string, string> = {
  // — Breadcrumb —
  'buyerInvoices.crumb.transact': 'TRANSAKSI',
  'buyerInvoices.crumb.invoices': 'FAKTUR & PEMBAYARAN',
  // — Page header —
  'buyerInvoices.header.title': 'Faktur & Pembayaran',
  'buyerInvoices.header.subtitle':
    'Pencocokan 3 arah · antrean persetujuan · pelepasan pembayaran · integrasi SAP FI.',
  // — Bulk actions + their toasts —
  'buyerInvoices.action.sapApExport': 'Ekspor SAP AP',
  'buyerInvoices.action.exportReport': 'Ekspor Laporan',
  'buyerInvoices.toast.sapExport.title': 'Mengekspor ke batch SAP AP',
  'buyerInvoices.toast.agingReport.title': 'Mengunduh laporan umur',
  // — Meta line —
  'buyerInvoices.meta.summary.one': '{{count}} faktur · terakhir diperbarui',
  'buyerInvoices.meta.summary.other': '{{count}} faktur · terakhir diperbarui',
  // — KPI cards —
  'buyerInvoices.kpi.pendingApproval.eyebrow': 'Menunggu Persetujuan',
  'buyerInvoices.kpi.released.eyebrow': 'Pembayaran Dirilis',
  'buyerInvoices.kpi.disputed.eyebrow': 'Disengketakan',
  'buyerInvoices.kpi.overdue.eyebrow': 'Jatuh Tempo',
  'buyerInvoices.kpi.invoiceCount.one': '{{count}} faktur',
  'buyerInvoices.kpi.invoiceCount.other': '{{count}} faktur',
  // — Overdue banner —
  'buyerInvoices.banner.overdue.label.one': '{{count}} faktur jatuh tempo: ',
  'buyerInvoices.banner.overdue.label.other': '{{count}} faktur jatuh tempo: ',
  'buyerInvoices.banner.overdue.item': '{{invoice}} (lewat {{days}} hr)',
  // — Dispute banner —
  'buyerInvoices.banner.dispute.label': 'Sengketa faktur: ',
  'buyerInvoices.banner.dispute.body':
    ' — Ketidaksesuaian kuantitas pada PT Sample Packaging. Nota kredit diperlukan sebelum pembayaran.',
  // — Tabs —
  'buyerInvoices.tab.queue': 'Antrean Faktur',
  'buyerInvoices.tab.analytics': 'Analitik Belanja',
  'buyerInvoices.tab.aging': 'Analisis Umur',
  // — Status filter chips —
  'buyerInvoices.filter.all': 'Semua',
  'buyerInvoices.filter.pendingMatch': 'Menunggu Pencocokan',
  'buyerInvoices.filter.approved': 'Disetujui',
  'buyerInvoices.filter.released': 'Dirilis',
  'buyerInvoices.filter.disputed': 'Disengketakan',
  'buyerInvoices.filter.overdue': 'Jatuh Tempo',
  // — Queue table columns —
  'buyerInvoices.table.invoiceNo': 'No. Faktur',
  'buyerInvoices.table.supplier': 'Pemasok',
  'buyerInvoices.table.poRef': 'Ref PO',
  'buyerInvoices.table.amount': 'Jumlah',
  'buyerInvoices.table.match': 'Pencocokan 3 arah',
  'buyerInvoices.table.status': 'Status',
  'buyerInvoices.table.dueDate': 'Jatuh tempo',
  'buyerInvoices.table.sapFi': 'SAP FI',
  'buyerInvoices.table.actions': 'Tindakan',
  'buyerInvoices.table.via': 'via {{channel}}',
  'buyerInvoices.table.paid': 'Dibayar',
  'buyerInvoices.table.daysOverdue': 'lewat {{days}} hr',
  'buyerInvoices.table.empty': 'Tidak ada faktur yang cocok dengan filter saat ini.',
  // — Analytics tab —
  'buyerInvoices.analytics.monthlyFlow': 'Arus Faktur Bulanan (Rp jT)',
  'buyerInvoices.analytics.matchSummary': 'Ringkasan Pencocokan 3 Arah',
  'buyerInvoices.chart.released': 'Dirilis',
  'buyerInvoices.chart.pending': 'Menunggu',
  'buyerInvoices.chart.amount': 'Jumlah',
  'buyerInvoices.matchTile.autoMatched': 'Tercocok Otomatis',
  'buyerInvoices.matchTile.pendingGr': 'Menunggu GR',
  'buyerInvoices.matchTile.qtyMismatch': 'Selisih Kuantitas',
  'buyerInvoices.matchTile.priceVariance': 'Varians Harga',
  // — Aging tab —
  'buyerInvoices.aging.reportTitle': 'Laporan Umur Faktur (Rp jT)',
  'buyerInvoices.aging.bucket': 'Rentang umur',
  'buyerInvoices.aging.count': 'Jumlah',
  'buyerInvoices.aging.amount': 'Nilai',
  'buyerInvoices.aging.pctAp': '% dari AP',
  'buyerInvoices.aging.risk': 'Risiko',
  'buyerInvoices.aging.current': 'Lancar',
  'buyerInvoices.aging.phase2.label': 'Fase 2 — Integrasi SAP FI:',
  'buyerInvoices.aging.phase2.body':
    'Umur akan ditarik dari item terbuka SAP AP. Proses pembayaran dipicu via SAP F110.',
  // — Detail drawer: title + footer actions —
  'buyerInvoices.panel.title': 'Faktur {{invoiceNumber}}',
  'buyerInvoices.action.close': 'Tutup',
  'buyerInvoices.action.dispute': 'Sengketa',
  'buyerInvoices.action.cancel': 'Batal',
  'buyerInvoices.action.confirmRelease': 'Konfirmasi rilis — {{amount}}',
  'buyerInvoices.action.raiseDispute': 'Ajukan sengketa',
  'buyerInvoices.action.back': 'Kembali',
  'buyerInvoices.action.sendToSupplier': 'Kirim ke pemasok',
  // — Footer action by status —
  'buyerInvoices.footer.reviewMatch': 'Tinjau pencocokan',
  'buyerInvoices.footer.releasePayment': 'Rilis pembayaran',
  'buyerInvoices.footer.resolveDispute': 'Selesaikan sengketa',
  'buyerInvoices.footer.sendRemittance': 'Kirim bukti pembayaran',
  'buyerInvoices.footer.escalate': 'Eskalasi',
  // — Drawer section headings —
  'buyerInvoices.section.keyFacts': 'Fakta utama',
  'buyerInvoices.section.match': 'Pencocokan 3 arah',
  'buyerInvoices.section.sapDocs': 'Dokumen SAP',
  'buyerInvoices.section.payment': 'Pembayaran',
  'buyerInvoices.section.raiseDispute': 'Ajukan sengketa',
  'buyerInvoices.section.remittance': 'Bukti pembayaran',
  // — Drawer field labels (<dt>) —
  'buyerInvoices.field.supplier': 'Pemasok',
  'buyerInvoices.field.poReference': 'Referensi PO',
  'buyerInvoices.field.amount': 'Jumlah',
  'buyerInvoices.field.paymentTerms': 'Termin pembayaran',
  'buyerInvoices.field.dueDate': 'Jatuh tempo',
  'buyerInvoices.field.approver': 'Penyetuju',
  'buyerInvoices.field.status': 'Status',
  'buyerInvoices.field.channel': 'Kanal',
  'buyerInvoices.field.fiDocument': 'Dokumen FI',
  'buyerInvoices.field.grDocument': 'Dokumen GR',
  'buyerInvoices.field.bankAccount': 'Rekening bank',
  'buyerInvoices.field.paymentDate': 'Tanggal pembayaran',
  'buyerInvoices.field.pending': '— menunggu —',
  // — 3-way match explanations —
  'buyerInvoices.match.matched':
    'Kuantitas + harga PO, GR, dan faktur semuanya cocok.',
  'buyerInvoices.match.pendingGr':
    'Menunggu pencatatan penerimaan barang di SAP sebelum pencocokan dapat selesai.',
  'buyerInvoices.match.pending': 'Pencocokan belum dimulai.',
  'buyerInvoices.match.qtyMismatch':
    'Kuantitas yang dikirim tidak cocok dengan kuantitas yang difakturkan. Nota kredit diperlukan.',
  'buyerInvoices.match.priceVariance':
    'Harga satuan faktur melebihi harga PO di atas ambang toleransi.',
  // — Confirm-release warning —
  'buyerInvoices.confirm.title': 'Konfirmasi pelepasan pembayaran',
  'buyerInvoices.confirm.body.pre':
    'Tindakan ini tidak dapat dibatalkan. Pembayaran sebesar ',
  'buyerInvoices.confirm.body.mid': ' akan ditransfer ke ',
  'buyerInvoices.confirm.body.post':
    '. Verifikasi detail bank sebelum mengonfirmasi.',
  // — Dispute form —
  'buyerInvoices.dispute.srLabel': 'Alasan sengketa untuk {{invoiceNumber}}',
  'buyerInvoices.dispute.placeholder':
    'Alasan (mis. selisih kuantitas vs GR, varians harga)…',
  'buyerInvoices.dispute.note':
    'Nota kredit akan diperlukan sebelum pembayaran dapat dirilis.',
  // — Remittance advice —
  'buyerInvoices.remit.invoiceNo': 'No. faktur',
  'buyerInvoices.remit.downloadPdf': 'Unduh PDF',
  'buyerInvoices.remit.note':
    'Bukti pembayaran ini mengonfirmasi bahwa pembayaran telah diproses. Pemasok akan menerima notifikasi melalui kanal komunikasi pilihan mereka.',
  'buyerInvoices.toast.downloadPdf.title': 'Mengunduh PDF bukti pembayaran',
  'buyerInvoices.toast.downloadPdf.desc': 'File akan tersedia sebentar lagi.',
  // — Escalate toast —
  'buyerInvoices.toast.escalate.title': '{{invoiceNumber}} dieskalasi',
  'buyerInvoices.toast.escalate.desc':
    'Diteruskan ke Pengawas Keuangan untuk tindakan mendesak.',
  // — Wrapper empty state —
  'buyerInvoices.empty.title': 'Belum ada faktur',
  'buyerInvoices.empty.subtitle':
    'Tidak ada faktur untuk dicocokkan atau dibayar pada tampilan ini.',
};
