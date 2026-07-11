// SupplierInvoices i18n fragment (Batch 5). Namespace: supplierInvoices.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator
// (import + spread into both en/id translation objects + add to the FRAGMENTS
// array in fragments.test.ts).
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Invoice STATUS chips (Draft / Pending Approval / Approved / Payment Released /
// Remittance Received / Overdue / Disputed) render through <StatusPill>, which
// localizes centrally via statusLabel.ts — they are NOT re-keyed here. Mutation
// toasts already live under the seeded `invoice.*` namespace in i18n.ts and are
// left untouched; only the inline scaffolding toasts (export / resolve / PDF)
// are keyed here. Mono DATA (invoice/PO numbers, IDR amounts, dates, SAP refs,
// channel enum, buyer/bank fixture values) is never translated.
export const supplierInvoicesEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierInvoices.crumb.settle': 'SETTLE',
  'supplierInvoices.crumb.invoices': 'MY INVOICES',
  // — Page header —
  'supplierInvoices.header.title': 'My Invoices',
  'supplierInvoices.header.subtitle':
    'Submit and track invoices · view payment status and remittance advice — {{supplier}}.',
  'supplierInvoices.action.export': 'Export',
  // — Meta line (count sibling; trailing <Data> date rendered after the phrase) —
  'supplierInvoices.meta.summary.one': '{{count}} invoice · last submitted',
  'supplierInvoices.meta.summary.other': '{{count}} invoices · last submitted',
  // — KPI cards —
  'supplierInvoices.kpi.received.eyebrow': 'Payments Received',
  'supplierInvoices.kpi.pending.eyebrow': 'Pending Payment',
  'supplierInvoices.kpi.disputed.eyebrow': 'Disputed',
  'supplierInvoices.kpi.invoiceCount.one': '{{count}} invoice',
  'supplierInvoices.kpi.invoiceCount.other': '{{count}} invoices',
  // — Dispute banner (label <strong> · <Data> numbers · body) —
  'supplierInvoices.banner.dispute.label': 'Invoice dispute: ',
  'supplierInvoices.banner.dispute.body':
    '— Quantity mismatch. Credit note required before payment can be released.',
  // — Table columns —
  'supplierInvoices.table.invoiceNo': 'Invoice #',
  'supplierInvoices.table.poRef': 'PO ref',
  'supplierInvoices.table.amount': 'Amount',
  'supplierInvoices.table.status': 'Status',
  'supplierInvoices.table.dueDate': 'Due date',
  'supplierInvoices.table.paymentDate': 'Payment date',
  'supplierInvoices.table.action': 'Action',
  'supplierInvoices.table.via': 'via {{channel}}',
  // — Row actions —
  'supplierInvoices.action.remittance': 'Remittance',
  'supplierInvoices.action.resolve': 'Resolve',
  'supplierInvoices.action.view': 'View',
  // — Inline scaffolding toasts (mutation toasts stay under invoice.*) —
  'supplierInvoices.toast.export.title': 'Downloading invoice report',
  'supplierInvoices.toast.resolve.title': 'Resolve dispute',
  'supplierInvoices.toast.resolve.desc':
    'Contact Paragon Finance Controller to resolve dispute.',
  'supplierInvoices.toast.downloadPdf.title': 'Downloading remittance advice PDF',
  // — Ariba info banner (interleaved <strong>) —
  'supplierInvoices.ariba.pre': 'Full e-invoicing with ',
  'supplierInvoices.ariba.strong': 'SAP Ariba integration',
  'supplierInvoices.ariba.post':
    ' is planned for Phase 2 of the Paragon Odyssey program.',
  // — Side panel (detail) —
  'supplierInvoices.panel.detail.title': 'Invoice {{invoiceNumber}}',
  'supplierInvoices.panel.close': 'Close',
  'supplierInvoices.panel.viewRemittance': 'View remittance',
  'supplierInvoices.panel.downloadPdf': 'Download PDF',
  // — Section headings —
  'supplierInvoices.section.keyFacts': 'Key facts',
  'supplierInvoices.section.lifecycle': 'Payment lifecycle',
  'supplierInvoices.section.remittance': 'Remittance advice',
  // — Payment-lifecycle timeline (event titles + step timestamps) —
  'supplierInvoices.timeline.submitted': 'Invoice submitted',
  'supplierInvoices.timeline.pending': 'Pending approval',
  'supplierInvoices.timeline.approved': 'Approved',
  'supplierInvoices.timeline.released': 'Payment released',
  'supplierInvoices.timeline.received': 'Remittance received',
  'supplierInvoices.timeline.cleared': 'Cleared',
  'supplierInvoices.timeline.disputed': 'Disputed',
  'supplierInvoices.timeline.confirmed': 'Confirmed',
  // — Detail field labels (<dt>) —
  'supplierInvoices.field.poReference': 'PO reference',
  'supplierInvoices.field.amount': 'Amount',
  'supplierInvoices.field.submitted': 'Submitted',
  'supplierInvoices.field.dueDate': 'Due date',
  'supplierInvoices.field.status': 'Status',
  'supplierInvoices.field.channel': 'Channel',
  'supplierInvoices.field.buyerContact': 'Buyer contact',
  'supplierInvoices.field.bankAccount': 'Bank account',
  'supplierInvoices.field.sapFiDoc': 'SAP FI doc',
  'supplierInvoices.field.paymentRef': 'Payment ref',
  'supplierInvoices.field.pending': '— pending —',
  // — Detail state notes —
  'supplierInvoices.note.disputed':
    'This invoice is disputed. Contact Paragon Finance Controller to resolve before payment can be released.',
  'supplierInvoices.note.overdue':
    'Payment is overdue. Paragon Finance has been escalated.',
  // — Remittance section —
  'supplierInvoices.remittance.processed':
    'Payment has been processed and credited to your account.',
  'supplierInvoices.remittance.invoiceNo': 'Invoice no',
  'supplierInvoices.remittance.amountPaid': 'Amount paid',
  'supplierInvoices.remittance.paymentDate': 'Payment date',
  'supplierInvoices.remittance.bankCredited': 'Bank credited',
  'supplierInvoices.remittance.reference': 'Reference',
  'supplierInvoices.remittance.paymentNote': 'Payment note:',
  // — New-invoice panel —
  'supplierInvoices.new.title': 'New invoice',
  'supplierInvoices.new.cancel': 'Cancel',
  'supplierInvoices.new.createDraft': 'Create draft',
  'supplierInvoices.new.intro':
    'Draft an invoice against one of your confirmed purchase orders. The invoice number is assigned on creation; you submit it for approval from the list.',
  'supplierInvoices.new.poLabel': 'Purchase order',
  'supplierInvoices.new.poPlaceholder': 'Select a confirmed PO…',
  'supplierInvoices.new.noPos': 'No confirmed POs available to invoice.',
  'supplierInvoices.new.amountLabel': 'Amount (IDR)',
  'supplierInvoices.new.amountPlaceholder': 'e.g. 250000000',
  // — Empty state (all-empty early return) —
  'supplierInvoices.empty.title': 'No invoices yet',
  'supplierInvoices.empty.subtitle': 'No invoices on file for {{supplier}}.',
  'supplierInvoices.empty.message':
    'Submitted invoices and payment status will appear here.',
  'supplierInvoices.empty.fallbackSupplier': 'this supplier',
};

export const supplierInvoicesId: Record<string, string> = {
  // — Breadcrumb —
  'supplierInvoices.crumb.settle': 'PENYELESAIAN',
  'supplierInvoices.crumb.invoices': 'FAKTUR SAYA',
  // — Page header —
  'supplierInvoices.header.title': 'Faktur Saya',
  'supplierInvoices.header.subtitle':
    'Ajukan dan lacak faktur · lihat status pembayaran dan bukti pembayaran — {{supplier}}.',
  'supplierInvoices.action.export': 'Ekspor',
  // — Meta line —
  'supplierInvoices.meta.summary.one': '{{count}} faktur · terakhir diajukan',
  'supplierInvoices.meta.summary.other': '{{count}} faktur · terakhir diajukan',
  // — KPI cards —
  'supplierInvoices.kpi.received.eyebrow': 'Pembayaran Diterima',
  'supplierInvoices.kpi.pending.eyebrow': 'Menunggu Pembayaran',
  'supplierInvoices.kpi.disputed.eyebrow': 'Disengketakan',
  'supplierInvoices.kpi.invoiceCount.one': '{{count}} faktur',
  'supplierInvoices.kpi.invoiceCount.other': '{{count}} faktur',
  // — Dispute banner —
  'supplierInvoices.banner.dispute.label': 'Sengketa faktur: ',
  'supplierInvoices.banner.dispute.body':
    '— Ketidaksesuaian kuantitas. Nota kredit diperlukan sebelum pembayaran dapat dirilis.',
  // — Table columns —
  'supplierInvoices.table.invoiceNo': 'No. Faktur',
  'supplierInvoices.table.poRef': 'Ref PO',
  'supplierInvoices.table.amount': 'Jumlah',
  'supplierInvoices.table.status': 'Status',
  'supplierInvoices.table.dueDate': 'Jatuh Tempo',
  'supplierInvoices.table.paymentDate': 'Tanggal Pembayaran',
  'supplierInvoices.table.action': 'Tindakan',
  'supplierInvoices.table.via': 'via {{channel}}',
  // — Row actions —
  'supplierInvoices.action.remittance': 'Bukti Pembayaran',
  'supplierInvoices.action.resolve': 'Selesaikan',
  'supplierInvoices.action.view': 'Lihat',
  // — Inline scaffolding toasts —
  'supplierInvoices.toast.export.title': 'Mengunduh laporan faktur',
  'supplierInvoices.toast.resolve.title': 'Selesaikan sengketa',
  'supplierInvoices.toast.resolve.desc':
    'Hubungi Pengawas Keuangan Paragon untuk menyelesaikan sengketa.',
  'supplierInvoices.toast.downloadPdf.title': 'Mengunduh PDF bukti pembayaran',
  // — Ariba info banner —
  'supplierInvoices.ariba.pre': 'E-invoicing penuh dengan ',
  'supplierInvoices.ariba.strong': 'integrasi SAP Ariba',
  'supplierInvoices.ariba.post':
    ' direncanakan untuk Fase 2 program Paragon Odyssey.',
  // — Side panel (detail) —
  'supplierInvoices.panel.detail.title': 'Faktur {{invoiceNumber}}',
  'supplierInvoices.panel.close': 'Tutup',
  'supplierInvoices.panel.viewRemittance': 'Lihat bukti pembayaran',
  'supplierInvoices.panel.downloadPdf': 'Unduh PDF',
  // — Section headings —
  'supplierInvoices.section.keyFacts': 'Fakta utama',
  'supplierInvoices.section.lifecycle': 'Siklus hidup pembayaran',
  'supplierInvoices.section.remittance': 'Bukti pembayaran',
  // — Payment-lifecycle timeline —
  'supplierInvoices.timeline.submitted': 'Faktur diajukan',
  'supplierInvoices.timeline.pending': 'Menunggu persetujuan',
  'supplierInvoices.timeline.approved': 'Disetujui',
  'supplierInvoices.timeline.released': 'Pembayaran dirilis',
  'supplierInvoices.timeline.received': 'Bukti pembayaran diterima',
  'supplierInvoices.timeline.cleared': 'Selesai',
  'supplierInvoices.timeline.disputed': 'Disengketakan',
  'supplierInvoices.timeline.confirmed': 'Dikonfirmasi',
  // — Detail field labels (<dt>) —
  'supplierInvoices.field.poReference': 'Referensi PO',
  'supplierInvoices.field.amount': 'Jumlah',
  'supplierInvoices.field.submitted': 'Diajukan',
  'supplierInvoices.field.dueDate': 'Jatuh tempo',
  'supplierInvoices.field.status': 'Status',
  'supplierInvoices.field.channel': 'Kanal',
  'supplierInvoices.field.buyerContact': 'Narahubung pembeli',
  'supplierInvoices.field.bankAccount': 'Rekening bank',
  'supplierInvoices.field.sapFiDoc': 'Dokumen SAP FI',
  'supplierInvoices.field.paymentRef': 'Ref pembayaran',
  'supplierInvoices.field.pending': '— menunggu —',
  // — Detail state notes —
  'supplierInvoices.note.disputed':
    'Faktur ini disengketakan. Hubungi Pengawas Keuangan Paragon untuk menyelesaikannya sebelum pembayaran dapat dirilis.',
  'supplierInvoices.note.overdue':
    'Pembayaran telah jatuh tempo. Keuangan Paragon telah dieskalasi.',
  // — Remittance section —
  'supplierInvoices.remittance.processed':
    'Pembayaran telah diproses dan dikreditkan ke rekening Anda.',
  'supplierInvoices.remittance.invoiceNo': 'No. faktur',
  'supplierInvoices.remittance.amountPaid': 'Jumlah dibayar',
  'supplierInvoices.remittance.paymentDate': 'Tanggal pembayaran',
  'supplierInvoices.remittance.bankCredited': 'Bank dikreditkan',
  'supplierInvoices.remittance.reference': 'Referensi',
  'supplierInvoices.remittance.paymentNote': 'Catatan pembayaran:',
  // — New-invoice panel —
  'supplierInvoices.new.title': 'Faktur baru',
  'supplierInvoices.new.cancel': 'Batal',
  'supplierInvoices.new.createDraft': 'Buat draf',
  'supplierInvoices.new.intro':
    'Buat draf faktur untuk salah satu pesanan pembelian Anda yang telah dikonfirmasi. Nomor faktur ditetapkan saat pembuatan; Anda mengajukannya untuk persetujuan dari daftar.',
  'supplierInvoices.new.poLabel': 'Pesanan pembelian',
  'supplierInvoices.new.poPlaceholder': 'Pilih PO yang dikonfirmasi…',
  'supplierInvoices.new.noPos': 'Tidak ada PO dikonfirmasi yang tersedia untuk difakturkan.',
  'supplierInvoices.new.amountLabel': 'Jumlah (IDR)',
  'supplierInvoices.new.amountPlaceholder': 'mis. 250000000',
  // — Empty state (all-empty early return) —
  'supplierInvoices.empty.title': 'Belum ada faktur',
  'supplierInvoices.empty.subtitle': 'Tidak ada faktur untuk {{supplier}}.',
  'supplierInvoices.empty.message':
    'Faktur yang diajukan dan status pembayaran akan muncul di sini.',
  'supplierInvoices.empty.fallbackSupplier': 'pemasok ini',
};
