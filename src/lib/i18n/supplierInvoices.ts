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
  'supplierInvoices.crumb.invoices': 'MY INVOICES',
  // — Page header —
  'supplierInvoices.header.title': 'My Invoices',
  'supplierInvoices.header.subtitle':
    'Submit and track invoices · view payment status and remittance advice — {{supplier, stop}}.',
  'supplierInvoices.action.export': 'Export',
  // — Meta line (count sibling; trailing <Data> date rendered after the phrase) —
  'supplierInvoices.meta.summary.one': '{{count}} invoice · last submitted',
  'supplierInvoices.meta.summary.other': '{{count}} invoices · last submitted',
  // — KPI cards —
  'supplierInvoices.kpi.received.eyebrow': 'Payments Released',
  'supplierInvoices.kpi.pending.eyebrow': 'Pending Payment',
  'supplierInvoices.kpi.disputed.eyebrow': 'Disputed',
  'supplierInvoices.kpi.invoiceCount.one': '{{count}} invoice',
  'supplierInvoices.kpi.invoiceCount.other': '{{count}} invoices',
  // — Dispute banner (label <strong> · <Data> numbers · body) —
  'supplierInvoices.banner.dispute.label': 'Invoice dispute: ',
  'supplierInvoices.banner.dispute.body':
    '— payment is held until Paragon finance resolves the dispute. Open the invoice to read the reason.',
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
  'supplierInvoices.action.remittance': 'Payment details',
  'supplierInvoices.action.resolve': 'Resolve',
  'supplierInvoices.action.view': 'View',
  // — Inline scaffolding toasts (mutation toasts stay under invoice.*) —
  'supplierInvoices.toast.export.title': 'Invoice report not available yet — no file was downloaded.',
  'supplierInvoices.toast.resolve.title': 'Dispute resolution not available yet',
  'supplierInvoices.toast.resolve.desc':
    'Nothing was changed — contact your Paragon Finance Controller to resolve this dispute.',
  'supplierInvoices.toast.downloadPdf.title': 'Remittance advice not available yet — no PDF was downloaded.',
  // — Ariba info banner (interleaved <strong>) —
  'supplierInvoices.ariba.pre': 'Full e-invoicing with ',
  'supplierInvoices.ariba.strong': 'SAP Ariba integration',
  'supplierInvoices.ariba.post':
    ' is planned for Phase 2 of the Paragon Odyssey program.',
  // — Side panel (detail) —
  'supplierInvoices.panel.detail.title': 'Invoice {{invoiceNumber}}',
  'supplierInvoices.panel.close': 'Close',
  'supplierInvoices.panel.viewRemittance': 'View payment details',
  'supplierInvoices.panel.downloadPdf': 'Download PDF',
  // — Section headings —
  'supplierInvoices.section.keyFacts': 'Key facts',
  'supplierInvoices.section.lifecycle': 'Payment lifecycle',
  'supplierInvoices.section.remittance': 'Payment details',
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
    'This invoice is disputed. Payment is held until Paragon finance resolves it.',
  'supplierInvoices.note.disputeReason':
    'Paragon’s reason: {{reason}}',
  'supplierInvoices.note.disputeNoReason':
    'Paragon recorded no reason.',
  'supplierInvoices.note.overdue':
    'Payment is past its due date. Nothing in the portal escalates it — contact your Paragon Finance Controller.',
  // — Remittance section —
  'supplierInvoices.remittance.processed':
    'The bank has confirmed remittance of this payment.',
  'supplierInvoices.remittance.released':
    'Paragon has released this payment. The bank has not confirmed remittance yet, so this is not a record that the money has reached your account.',
  'supplierInvoices.remittance.bankUnknown':
    'Not held in the portal',
  'supplierInvoices.remittance.invoiceNo': 'Invoice no',
  'supplierInvoices.remittance.amountPaid': 'Amount',
  'supplierInvoices.remittance.paymentDate': 'Released on',
  'supplierInvoices.remittance.bankCredited': 'Bank account',
  'supplierInvoices.remittance.reference': 'Reference',
  'supplierInvoices.remittance.paymentNote': 'Payment note:',
  // — New-invoice panel —
  'supplierInvoices.new.title': 'New invoice',
  'supplierInvoices.new.cancel': 'Cancel',
  'supplierInvoices.new.createDraft': 'Create draft',
  'supplierInvoices.new.intro':
    'Draft an invoice against one of your confirmed purchase orders. It opens on the order\'s lines, at the order\'s prices, for the quantity received and accepted. The invoice number is assigned on creation; you submit it for approval from the list.',
  'supplierInvoices.new.poLabel': 'Purchase order',
  'supplierInvoices.new.poPlaceholder': 'Select a confirmed PO…',
  'supplierInvoices.new.noPos': 'No confirmed POs available to invoice.',
  // — New invoice: the lines (E2E-2). The amount is no longer typed; it is the
  // total of the lines, each capped at the quantity received and accepted.
  'supplierInvoices.new.nothingReceived':
    'Nothing has been received and accepted on this order yet, so there is nothing to invoice. An invoice is raised for what Paragon has received.',
  'supplierInvoices.new.lines.title': 'Lines to invoice',
  'supplierInvoices.new.lines.note':
    'Each quantity opens on what was received and accepted. You may invoice less, never more. Whether the invoice matches the order and the receipt is decided after you submit it.',
  'supplierInvoices.new.lines.unitPrice': 'Order unit price',
  'supplierInvoices.new.lines.accepted': 'Received and accepted',
  'supplierInvoices.new.lines.qtyLabel': 'Quantity to invoice for {{material}}',
  'supplierInvoices.new.lines.lineTotal': 'Line total:',
  'supplierInvoices.new.lines.total': 'Invoice amount',
  'supplierInvoices.new.lines.allZero': 'Every line is at zero. Invoice a quantity on at least one line.',
  'supplierInvoices.new.lines.invalid': 'A line\'s quantity cannot be invoiced as typed. Correct it and create the draft again.',
  'supplierInvoices.new.po.required':
    'Select the purchase order this invoice is raised against.',
  'supplierInvoices.new.qty.refused.empty':
    'Enter the quantity to invoice — a blank is not a quantity of zero. Type 0 to leave this line off the invoice.',
  'supplierInvoices.new.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 4500.',
  'supplierInvoices.new.qty.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  'supplierInvoices.new.qty.refused.exceedsReceived':
    'More than was received and accepted on this line ({{max}} {{uom}}). Invoice that quantity or less.',
  // — Empty state (all-empty early return) —
  'supplierInvoices.empty.title': 'No invoices yet',
  'supplierInvoices.empty.subtitle': 'No invoices on file for {{supplier, stop}}.',
  'supplierInvoices.empty.message':
    'Submitted invoices and payment status will appear here.',
  'supplierInvoices.empty.fallbackSupplier': 'this supplier',
};

export const supplierInvoicesId: Record<string, string> = {
  // — Breadcrumb —
  'supplierInvoices.crumb.invoices': 'FAKTUR SAYA',
  // — Page header —
  'supplierInvoices.header.title': 'Faktur Saya',
  'supplierInvoices.header.subtitle':
    'Ajukan dan lacak faktur · lihat status pembayaran dan bukti pembayaran — {{supplier, stop}}.',
  'supplierInvoices.action.export': 'Ekspor',
  // — Meta line —
  'supplierInvoices.meta.summary.one': '{{count}} faktur · terakhir diajukan',
  'supplierInvoices.meta.summary.other': '{{count}} faktur · terakhir diajukan',
  // — KPI cards —
  'supplierInvoices.kpi.received.eyebrow': 'Pembayaran Dirilis',
  'supplierInvoices.kpi.pending.eyebrow': 'Menunggu Pembayaran',
  'supplierInvoices.kpi.disputed.eyebrow': 'Disengketakan',
  'supplierInvoices.kpi.invoiceCount.one': '{{count}} faktur',
  'supplierInvoices.kpi.invoiceCount.other': '{{count}} faktur',
  // — Dispute banner —
  'supplierInvoices.banner.dispute.label': 'Sengketa faktur: ',
  'supplierInvoices.banner.dispute.body':
    '— pembayaran ditahan sampai keuangan Paragon menyelesaikan sengketa. Buka faktur untuk membaca alasannya.',
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
  'supplierInvoices.action.remittance': 'Rincian pembayaran',
  'supplierInvoices.action.resolve': 'Selesaikan',
  'supplierInvoices.action.view': 'Lihat',
  // — Inline scaffolding toasts —
  'supplierInvoices.toast.export.title': 'Laporan faktur belum tersedia — tidak ada berkas yang diunduh.',
  'supplierInvoices.toast.resolve.title': 'Penyelesaian sengketa belum tersedia',
  'supplierInvoices.toast.resolve.desc':
    'Tidak ada yang diubah — hubungi Pengawas Keuangan Paragon untuk menyelesaikan sengketa ini.',
  'supplierInvoices.toast.downloadPdf.title': 'Bukti pembayaran belum tersedia — tidak ada PDF yang diunduh.',
  // — Ariba info banner —
  'supplierInvoices.ariba.pre': 'E-invoicing penuh dengan ',
  'supplierInvoices.ariba.strong': 'integrasi SAP Ariba',
  'supplierInvoices.ariba.post':
    ' direncanakan untuk Fase 2 program Paragon Odyssey.',
  // — Side panel (detail) —
  'supplierInvoices.panel.detail.title': 'Faktur {{invoiceNumber}}',
  'supplierInvoices.panel.close': 'Tutup',
  'supplierInvoices.panel.viewRemittance': 'Lihat rincian pembayaran',
  'supplierInvoices.panel.downloadPdf': 'Unduh PDF',
  // — Section headings —
  'supplierInvoices.section.keyFacts': 'Fakta utama',
  'supplierInvoices.section.lifecycle': 'Siklus hidup pembayaran',
  'supplierInvoices.section.remittance': 'Rincian pembayaran',
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
    'Faktur ini disengketakan. Pembayaran ditahan sampai keuangan Paragon menyelesaikannya.',
  'supplierInvoices.note.disputeReason':
    'Alasan Paragon: {{reason}}',
  'supplierInvoices.note.disputeNoReason':
    'Paragon tidak mencatat alasan.',
  'supplierInvoices.note.overdue':
    'Pembayaran melewati tanggal jatuh tempo. Tidak ada eskalasi dari portal — hubungi Finance Controller Paragon Anda.',
  // — Remittance section —
  'supplierInvoices.remittance.processed':
    'Bank telah mengonfirmasi pengiriman dana pembayaran ini.',
  'supplierInvoices.remittance.released':
    'Paragon telah merilis pembayaran ini. Bank belum mengonfirmasi pengiriman dana, sehingga ini bukan catatan bahwa dana telah masuk ke rekening Anda.',
  'supplierInvoices.remittance.bankUnknown':
    'Tidak disimpan di portal',
  'supplierInvoices.remittance.invoiceNo': 'No. faktur',
  'supplierInvoices.remittance.amountPaid': 'Jumlah',
  'supplierInvoices.remittance.paymentDate': 'Dirilis pada',
  'supplierInvoices.remittance.bankCredited': 'Rekening bank',
  'supplierInvoices.remittance.reference': 'Referensi',
  'supplierInvoices.remittance.paymentNote': 'Catatan pembayaran:',
  // — New-invoice panel —
  'supplierInvoices.new.title': 'Faktur baru',
  'supplierInvoices.new.cancel': 'Batal',
  'supplierInvoices.new.createDraft': 'Buat draf',
  'supplierInvoices.new.intro':
    'Buat draf faktur untuk salah satu pesanan pembelian Anda yang telah dikonfirmasi. Draf dibuka dengan baris pesanan, pada harga pesanan, untuk kuantitas yang telah diterima dan disetujui. Nomor faktur ditetapkan saat pembuatan; Anda mengajukannya untuk persetujuan dari daftar.',
  'supplierInvoices.new.poLabel': 'Pesanan pembelian',
  'supplierInvoices.new.poPlaceholder': 'Pilih PO yang dikonfirmasi…',
  'supplierInvoices.new.noPos': 'Tidak ada PO dikonfirmasi yang tersedia untuk difakturkan.',
  // — Faktur baru: baris (E2E-2) —
  'supplierInvoices.new.nothingReceived':
    'Belum ada yang diterima dan disetujui pada pesanan ini, sehingga belum ada yang dapat difakturkan. Faktur dibuat untuk apa yang telah diterima Paragon.',
  'supplierInvoices.new.lines.title': 'Baris yang difakturkan',
  'supplierInvoices.new.lines.note':
    'Setiap kuantitas dibuka pada jumlah yang diterima dan disetujui. Anda boleh memfakturkan lebih sedikit, tidak pernah lebih banyak. Apakah faktur cocok dengan pesanan dan penerimaan diputuskan setelah Anda mengajukannya.',
  'supplierInvoices.new.lines.unitPrice': 'Harga satuan pesanan',
  'supplierInvoices.new.lines.accepted': 'Diterima dan disetujui',
  'supplierInvoices.new.lines.qtyLabel': 'Kuantitas yang difakturkan untuk {{material}}',
  'supplierInvoices.new.lines.lineTotal': 'Total baris:',
  'supplierInvoices.new.lines.total': 'Jumlah faktur',
  'supplierInvoices.new.lines.allZero': 'Semua baris bernilai nol. Fakturkan kuantitas pada setidaknya satu baris.',
  'supplierInvoices.new.lines.invalid': 'Kuantitas pada salah satu baris tidak dapat difakturkan sebagaimana diketik. Perbaiki lalu buat draf lagi.',
  'supplierInvoices.new.po.required':
    'Pilih pesanan pembelian yang menjadi dasar faktur ini.',
  'supplierInvoices.new.qty.refused.empty':
    'Masukkan kuantitas yang difakturkan — kolom kosong bukan berarti kuantitasnya nol. Ketik 0 untuk tidak memfakturkan baris ini.',
  'supplierInvoices.new.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 4500.',
  'supplierInvoices.new.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  'supplierInvoices.new.qty.refused.exceedsReceived':
    'Lebih banyak daripada yang diterima dan disetujui pada baris ini ({{max}} {{uom}}). Fakturkan kuantitas itu atau kurang.',
  // — Empty state (all-empty early return) —
  'supplierInvoices.empty.title': 'Belum ada faktur',
  'supplierInvoices.empty.subtitle': 'Tidak ada faktur untuk {{supplier, stop}}.',
  'supplierInvoices.empty.message':
    'Faktur yang diajukan dan status pembayaran akan muncul di sini.',
  'supplierInvoices.empty.fallbackSupplier': 'pemasok ini',
};
