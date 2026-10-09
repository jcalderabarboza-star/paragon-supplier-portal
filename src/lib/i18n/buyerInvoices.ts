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
  'buyerInvoices.crumb.invoices': 'INVOICES & PAYMENT',
  // — Page header —
  'buyerInvoices.header.title': 'Invoices & Payment',
  'buyerInvoices.header.subtitle':
    '3-way match · approval queue · payment release · SAP FI integration.',
  // — Bulk actions + their toasts —
  'buyerInvoices.action.sapApExport': 'SAP AP Export',
  'buyerInvoices.action.exportReport': 'Export Report',
  'buyerInvoices.toast.sapExport.title': 'SAP AP export not available yet — nothing was sent to SAP.',
  'buyerInvoices.toast.agingReport.title': 'Aging report not available yet — no file was downloaded.',
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
    ' — payment is held until each dispute is resolved. Open an invoice to read its reason.',
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
  // — The SAP-boundary interim: waiting, failed, retried —
  'buyerInvoices.action.retrySettle': 'Retry settlement',
  'buyerInvoices.settle.inFlight': 'Awaiting SAP settlement — no FI document yet',
  'buyerInvoices.settle.notRetryable':
    'Settlement was refused. Asking again will not change the answer — the invoice stays here until the refusal is resolved.',
  // — Footer action by status —
  'buyerInvoices.footer.reviewMatch': 'Review match',
  // The primary slot on a `Matched` invoice. It names the CONSEQUENCE
  // ("for payment") rather than the bare verb, because the seat pressing it is
  // authorising money and the next act is the release.
  'buyerInvoices.footer.approve': 'Approve for payment',
  'buyerInvoices.footer.approveAgain':
    'Approve again',
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
  'buyerInvoices.approval.unnamed':
    'No named person approved this invoice. A named person approves it again before its payment is released.',
  'buyerInvoices.approve.refused.unattributed':
    'This seat names no person, and an approval is recorded against the person who decided it. Choose a sample user on the identity panel, then approve again.',
  'buyerInvoices.approve.refused.alreadyNamed':
    'This invoice already has a named approver. A second approval would overwrite who decided it.',
  'buyerInvoices.release.refused.approvalUnnamed':
    'No named person approved this invoice, so its payment is not released. A named person approves it again first.',
  'buyerInvoices.field.status': 'Status',
  'buyerInvoices.field.channel': 'Channel',
  'buyerInvoices.field.fiDocument': 'FI document',
  'buyerInvoices.field.grDocument': 'GR document',
  'buyerInvoices.field.bankAccount': 'Bank account',
  'buyerInvoices.field.paymentDate': 'Payment date',
  'buyerInvoices.field.pending': '— pending —',
  // — 3-way match explanations (keyed off matchStatus) —
  'buyerInvoices.match.matched':
    'Recorded as matched. This row carries no match figures.',
  'buyerInvoices.match.pendingGr':
    'Awaiting goods receipt posting in SAP before match can complete.',
  'buyerInvoices.match.pending': 'Not matched yet: no receipt is posted on this purchase order.',
  'buyerInvoices.match.qtyMismatch':
    'Recorded as a quantity mismatch. This row carries no match figures.',
  'buyerInvoices.match.priceVariance':
    'Recorded as a price variance. This row carries no match figures.',
  'buyerInvoices.match.cause.WITHIN':
    'The invoice is within what was received and accepted on the purchase order, after earlier invoices.',
  'buyerInvoices.match.cause.EXCEEDS_RECEIVED':
    'Invoiced for more than was received and accepted: {{invoiced}} is invoiced and {{payable}} is payable on what was received.',
  'buyerInvoices.match.cause.ALREADY_INVOICED':
    'Earlier invoices on this purchase order already claim what was received: {{already}} is already invoiced and {{payable}} is left to pay.',
  'buyerInvoices.match.cause.EXCEEDS_ORDER':
    'The invoice is above the whole order at purchase-order prices: {{invoiced}} invoiced against {{ordered}} ordered. The match compares totals and does not read an invoice\u2019s lines, so the portal cannot say which price or quantity differs.',
  'buyerInvoices.match.figure.ordered':
    'Ordered (confirmed quantity × PO price)',
  'buyerInvoices.match.figure.received':
    'Received and accepted',
  'buyerInvoices.match.figure.already':
    'Already invoiced',
  'buyerInvoices.match.figure.invoiced':
    'This invoice',
  'buyerInvoices.match.poTotalDisagrees':
    'The purchase order states a total of {{stated}}, but its lines come to {{lines}}; the match uses the lines.',
  'buyerInvoices.field.releasedBy':
    'Payment released by',
  'buyerInvoices.attribution.noPerson':
    'Not recorded — no person in session',
  'buyerInvoices.attribution.idpDown':
    'Not recorded — identity provider unavailable',
  'buyerInvoices.field.bankUnknown':
    'Not held in the portal',
  'buyerInvoices.release.refused.unnamed':
    'This invoice was approved by a named person, so its payment must be released by a named person who is not the approver. Pick a sample user on the identity panel, then try again.',
  'buyerInvoices.confirm.body.midUnknown':
    ' will be released. The supplier’s bank account is not held in the portal — SAP pays to the account on the vendor record.',
  'buyerInvoices.section.disputeReason':
    'Dispute reason',
  'buyerInvoices.dispute.noReason':
    'No reason was recorded for this dispute.',
  // — Confirm-release warning (interleaved <Data> amount + bank) —
  'buyerInvoices.confirm.title': 'Confirm payment release',
  'buyerInvoices.confirm.body.pre': 'This action cannot be undone. Payment of ',
  'buyerInvoices.confirm.body.mid': ' will be transferred to ',
  'buyerInvoices.confirm.body.post':
    '. Verify bank details before confirming.',
  // D-CENSUS-8 precision, at the moment of commit. The page marker already
  // carries the two census axes (sample feed · commands really dispatch); this
  // is the THIRD thing a reader needs here and only here, because this is the
  // one verb on the page that crosses the SAP boundary.
  'buyerInvoices.confirm.simulatedSettle':
    'The release itself is governed and real: it dispatches, the trail records it, and the invoice moves to Releasing Payment. The SAP settlement callback that mints the FI document is SIMULATED — no payment leaves any bank.',
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
    'This remittance advice is a preview — no payment was processed and no notification was sent to the supplier.',
  'buyerInvoices.toast.downloadPdf.title': 'Remittance PDF not available yet',
  'buyerInvoices.toast.downloadPdf.desc':
    'No file was downloaded — PDF download is not wired to a real system.',
  // — Escalate toast —
  'buyerInvoices.toast.escalate.title':
    '{{invoiceNumber}} — escalation not available yet',
  'buyerInvoices.toast.escalate.desc':
    'Nothing was routed. Escalation to Finance is not wired to a real channel.',
  // — Wrapper empty state —
  'buyerInvoices.empty.title': 'No invoices',
  'buyerInvoices.empty.subtitle':
    'There are no invoices to match or pay for this view.',
};

export const buyerInvoicesId: Record<string, string> = {
  // — Breadcrumb —
  'buyerInvoices.crumb.invoices': 'FAKTUR & PEMBAYARAN',
  // — Page header —
  'buyerInvoices.header.title': 'Faktur & Pembayaran',
  'buyerInvoices.header.subtitle':
    'Pencocokan 3 arah · antrean persetujuan · pelepasan pembayaran · integrasi SAP FI.',
  // — Bulk actions + their toasts —
  'buyerInvoices.action.sapApExport': 'Ekspor SAP AP',
  'buyerInvoices.action.exportReport': 'Ekspor Laporan',
  'buyerInvoices.toast.sapExport.title': 'Ekspor SAP AP belum tersedia — tidak ada yang dikirim ke SAP.',
  'buyerInvoices.toast.agingReport.title': 'Laporan umur belum tersedia — tidak ada berkas yang diunduh.',
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
    ' — pembayaran ditahan sampai setiap sengketa diselesaikan. Buka faktur untuk membaca alasannya.',
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
  // — Interim batas SAP: menunggu, gagal, dicoba ulang —
  'buyerInvoices.action.retrySettle': 'Coba selesaikan lagi',
  'buyerInvoices.settle.inFlight': 'Menunggu penyelesaian SAP — dokumen FI belum ada',
  'buyerInvoices.settle.notRetryable':
    'Penyelesaian ditolak. Mengulang permintaan tidak akan mengubah jawabannya — faktur tetap di sini sampai penolakan itu diselesaikan.',
  // — Footer action by status —
  'buyerInvoices.footer.reviewMatch': 'Tinjau pencocokan',
  'buyerInvoices.footer.approve': 'Setujui untuk pembayaran',
  'buyerInvoices.footer.approveAgain':
    'Setujui lagi',
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
  'buyerInvoices.approval.unnamed':
    'Tidak ada orang bernama yang menyetujui faktur ini. Seseorang yang bernama menyetujuinya lagi sebelum pembayarannya dirilis.',
  'buyerInvoices.approve.refused.unattributed':
    'Kursi ini tidak menyebut siapa pun, dan persetujuan dicatat atas nama orang yang memutuskannya. Pilih pengguna contoh di panel identitas, lalu setujui lagi.',
  'buyerInvoices.approve.refused.alreadyNamed':
    'Faktur ini sudah memiliki penyetuju bernama. Persetujuan kedua akan menimpa siapa yang memutuskannya.',
  'buyerInvoices.release.refused.approvalUnnamed':
    'Tidak ada orang bernama yang menyetujui faktur ini, sehingga pembayarannya tidak dirilis. Seseorang yang bernama menyetujuinya lagi terlebih dahulu.',
  'buyerInvoices.field.status': 'Status',
  'buyerInvoices.field.channel': 'Kanal',
  'buyerInvoices.field.fiDocument': 'Dokumen FI',
  'buyerInvoices.field.grDocument': 'Dokumen GR',
  'buyerInvoices.field.bankAccount': 'Rekening bank',
  'buyerInvoices.field.paymentDate': 'Tanggal pembayaran',
  'buyerInvoices.field.pending': '— menunggu —',
  // — 3-way match explanations —
  'buyerInvoices.match.matched':
    'Tercatat cocok. Baris ini tidak memuat angka pencocokan.',
  'buyerInvoices.match.pendingGr':
    'Menunggu pencatatan penerimaan barang di SAP sebelum pencocokan dapat selesai.',
  'buyerInvoices.match.pending': 'Belum dicocokkan: belum ada penerimaan yang diposting untuk pesanan pembelian ini.',
  'buyerInvoices.match.qtyMismatch':
    'Tercatat sebagai ketidaksesuaian kuantitas. Baris ini tidak memuat angka pencocokan.',
  'buyerInvoices.match.priceVariance':
    'Tercatat sebagai selisih harga. Baris ini tidak memuat angka pencocokan.',
  'buyerInvoices.match.cause.WITHIN':
    'Faktur berada dalam nilai yang diterima dan disetujui pada pesanan pembelian, setelah faktur sebelumnya.',
  'buyerInvoices.match.cause.EXCEEDS_RECEIVED':
    'Ditagih melebihi yang diterima dan disetujui: {{invoiced}} ditagih dan {{payable}} dapat dibayar atas yang diterima.',
  'buyerInvoices.match.cause.ALREADY_INVOICED':
    'Faktur sebelumnya pada pesanan pembelian ini sudah menagih yang diterima: {{already}} sudah ditagih dan {{payable}} tersisa untuk dibayar.',
  'buyerInvoices.match.cause.EXCEEDS_ORDER':
    'Faktur melebihi seluruh pesanan pada harga pesanan pembelian: {{invoiced}} ditagih terhadap {{ordered}} dipesan. Pencocokan membandingkan total dan tidak membaca baris faktur, sehingga portal tidak dapat menyebutkan harga atau kuantitas mana yang berbeda.',
  'buyerInvoices.match.figure.ordered':
    'Dipesan (kuantitas dikonfirmasi × harga PO)',
  'buyerInvoices.match.figure.received':
    'Diterima dan disetujui',
  'buyerInvoices.match.figure.already':
    'Sudah ditagih',
  'buyerInvoices.match.figure.invoiced':
    'Faktur ini',
  'buyerInvoices.match.poTotalDisagrees':
    'Pesanan pembelian menyatakan total {{stated}}, tetapi baris-barisnya berjumlah {{lines}}; pencocokan memakai baris.',
  'buyerInvoices.field.releasedBy':
    'Pembayaran dirilis oleh',
  'buyerInvoices.attribution.noPerson':
    'Tidak tercatat — tidak ada orang dalam sesi',
  'buyerInvoices.attribution.idpDown':
    'Tidak tercatat — penyedia identitas tidak tersedia',
  'buyerInvoices.field.bankUnknown':
    'Tidak disimpan di portal',
  'buyerInvoices.release.refused.unnamed':
    'Faktur ini disetujui oleh orang yang bernama, sehingga pembayarannya harus dirilis oleh orang bernama yang bukan penyetujunya. Pilih pengguna contoh pada panel identitas, lalu coba lagi.',
  'buyerInvoices.confirm.body.midUnknown':
    ' akan dirilis. Rekening bank pemasok tidak disimpan di portal — SAP membayar ke rekening pada data vendor.',
  'buyerInvoices.section.disputeReason':
    'Alasan sengketa',
  'buyerInvoices.dispute.noReason':
    'Tidak ada alasan yang dicatat untuk sengketa ini.',
  // — Confirm-release warning —
  'buyerInvoices.confirm.title': 'Konfirmasi pelepasan pembayaran',
  'buyerInvoices.confirm.body.pre':
    'Tindakan ini tidak dapat dibatalkan. Pembayaran sebesar ',
  'buyerInvoices.confirm.body.mid': ' akan ditransfer ke ',
  'buyerInvoices.confirm.body.post':
    '. Verifikasi detail bank sebelum mengonfirmasi.',
  'buyerInvoices.confirm.simulatedSettle':
    'Pelepasan itu sendiri diatur dan nyata: perintahnya terkirim, jejaknya tercatat, dan faktur berpindah ke Merilis Pembayaran. Callback penyelesaian SAP yang menerbitkan dokumen FI bersifat SIMULASI — tidak ada dana yang keluar dari bank mana pun.',
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
    'Bukti pembayaran ini adalah pratinjau — tidak ada pembayaran yang diproses dan tidak ada notifikasi yang dikirim ke pemasok.',
  'buyerInvoices.toast.downloadPdf.title': 'PDF bukti pembayaran belum tersedia',
  'buyerInvoices.toast.downloadPdf.desc':
    'Tidak ada berkas yang diunduh — unduhan PDF belum tersambung ke sistem nyata.',
  // — Escalate toast —
  'buyerInvoices.toast.escalate.title':
    '{{invoiceNumber}} — eskalasi belum tersedia',
  'buyerInvoices.toast.escalate.desc':
    'Tidak ada yang diteruskan. Eskalasi ke Keuangan belum tersambung ke kanal nyata.',
  // — Wrapper empty state —
  'buyerInvoices.empty.title': 'Belum ada faktur',
  'buyerInvoices.empty.subtitle':
    'Tidak ada faktur untuk dicocokkan atau dibayar pada tampilan ini.',
};
