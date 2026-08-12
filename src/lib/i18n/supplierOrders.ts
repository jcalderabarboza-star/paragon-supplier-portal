// SupplierOrders i18n fragment (Batch 5). Namespace: supplierOrders.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention
// already shipped in i18n.ts — no reliance on the i18next plural resolver).
// Canonical StatusPill children (PO statuses: Sent / Acknowledged / Confirmed /
// Partially Delivered / Delivered / Closed) localize centrally via statusLabel.ts
// and are NOT re-declared here. PO-confirm toasts + the editing-mode confirm
// button already live under the shared `po.confirm.*` family in i18n.ts and are
// reused, not duplicated. Mono DATA (doc numbers, dates, currency, quantities via
// <Data>/formatters), the `PO {poNumber}` panel title, and fixture-derived content
// (line-item descriptions, channel value) stay EN as data / i18n-defer.
export const supplierOrdersEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierOrders.crumb.transact': 'TRANSACT',
  'supplierOrders.crumb.myOrders': 'MY ORDERS',
  // — Page header —
  'supplierOrders.header.title': 'My Orders',
  'supplierOrders.header.subtitle':
    'Purchase orders received from Paragon Corp — {{supplier}}.',
  // — Meta line —
  'supplierOrders.meta.orders.one': '{{count}} order',
  'supplierOrders.meta.orders.other': '{{count}} orders',
  'supplierOrders.meta.lastUpdated': 'last updated',
  // — KPI cards —
  'supplierOrders.kpi.openOrders.eyebrow': 'Open Orders',
  'supplierOrders.kpi.openOrders.needsAction': 'Needs your action',
  'supplierOrders.kpi.openOrders.cleared': 'All actions cleared',
  'supplierOrders.kpi.inProgress.eyebrow': 'In Progress',
  'supplierOrders.kpi.inProgress.subtitle': 'Confirmed · awaiting delivery',
  'supplierOrders.kpi.totalValue.eyebrow': 'Total Value Pending',
  'supplierOrders.kpi.totalValue.subtitle': 'Not yet delivered',
  'supplierOrders.kpi.delivered.eyebrow': 'Delivered',
  'supplierOrders.kpi.delivered.subtitle': 'Completed POs',
  // — Sub-tabs —
  'supplierOrders.tab.all': 'All orders',
  'supplierOrders.tab.action': 'Needs action',
  'supplierOrders.tab.progress': 'In progress',
  'supplierOrders.tab.completed': 'Completed',
  // — Needs-confirmation banner —
  'supplierOrders.banner.needConfirmation.one':
    '{{count}} order needs your confirmation:',
  'supplierOrders.banner.needConfirmation.other':
    '{{count}} orders need your confirmation:',
  'supplierOrders.banner.instruction':
    'click a row to confirm quantities and delivery date.',
  // — Table columns —
  'supplierOrders.col.po': 'PO #',
  'supplierOrders.col.orderDate': 'Order date',
  'supplierOrders.col.requestedDelivery': 'Requested delivery',
  'supplierOrders.col.items': 'Items',
  'supplierOrders.col.value': 'Value',
  'supplierOrders.col.status': 'Status',
  'supplierOrders.col.action': 'Action',
  'supplierOrders.table.empty': 'No orders in this category.',
  // — Row / footer actions —
  'supplierOrders.action.confirm': 'Confirm',
  'supplierOrders.action.createAsn': 'Create ASN',
  'supplierOrders.action.view': 'View',
  'supplierOrders.action.close': 'Close',
  'supplierOrders.action.requestChange': 'Request change instead',
  'supplierOrders.action.backToConfirm': 'Back to confirm',
  'supplierOrders.action.submitChange': 'Submit change request',
  'supplierOrders.action.createAsnNow': 'Create ASN now',
  // — Side panel: key facts —
  'supplierOrders.panel.keyFacts': 'Key facts',
  'supplierOrders.panel.lineItems': 'Line items',
  'supplierOrders.panel.lineItemsConfirm': 'Line items — confirm quantities',
  'supplierOrders.panel.totalValue': 'Total value',
  'supplierOrders.panel.channel': 'Channel',
  // — Side panel: line-items table —
  'supplierOrders.panel.col.material': 'Material',
  'supplierOrders.panel.col.ordered': 'Ordered',
  'supplierOrders.panel.col.confirmed': 'Confirmed',
  // — Side panel: the confirm-quantity refusals (CP-0 · W1 · 2f-c) —
  'supplierOrders.confirm.qty.refused.empty':
    'Enter the quantity you are confirming — a cleared cell is not a confirmation of none. To short-confirm, type the reduced quantity.',
  'supplierOrders.confirm.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 5000.',
  'supplierOrders.confirm.qty.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  // The courtesy mirror of the dispatcher policy (0 < qty ≤ ordered) — the
  // policy remains the enforcement; this names the bound in the operator's
  // language before a dispatch is attempted.
  'supplierOrders.confirm.qty.outOfBounds':
    'Confirm between 1 and {{ordered}} {{uom}} — the ordered quantity. To change the order itself, use Request change.',
  // — Side panel: delivery & notes (editing) —
  'supplierOrders.panel.deliveryNotes': 'Delivery & notes',
  'supplierOrders.panel.confirmedDeliveryDate': 'Confirmed delivery date',
  'supplierOrders.panel.notesLabel': 'Notes for Paragon',
  'supplierOrders.panel.notesPlaceholder': 'Optional message…',
  'supplierOrders.panel.diffWarning':
    'Confirmed values differ from the original PO. Paragon will review your changes.',
  // — Side panel: change request —
  'supplierOrders.panel.changeRequest': 'Change request',
  'supplierOrders.panel.changeRequestHint':
    'Describe the change needed (e.g. reduced quantity, alternative delivery date).',
  'supplierOrders.panel.changeRequestPlaceholder': 'What needs to change?',
  // — Side panel: confirmed summary —
  'supplierOrders.panel.orderConfirmed': 'Order confirmed',
  'supplierOrders.panel.confirmedAt': 'Confirmed at',
  'supplierOrders.panel.deliveryShort': 'Delivery',
  'supplierOrders.panel.totalQty': 'Total qty',
  'supplierOrders.panel.next': 'Next',
  'supplierOrders.panel.notesPrefix': 'Notes:',
  'supplierOrders.panel.title': 'PO {{poNumber}}',
  'supplierOrders.units': 'units',
  // — Toasts (page-local; PO-confirm toasts reuse shared po.confirm.*) —
  'supplierOrders.toast.changeSubmitted.title':
    'Change request for {{poNumber}} submitted',
  'supplierOrders.toast.changeSubmitted.desc': 'Paragon team will review.',
  'supplierOrders.toast.asnCreation.title': 'ASN creation for {{poNumber}}',
  'supplierOrders.toast.asnContinue': 'Open My Shipments & ASN to create it there.',
  'supplierOrders.toast.creatingAsn.title': 'ASN creation not available from this card — nothing was created for {{poNumber}}.',
  // — Empty state (all-empty early return) —
  'supplierOrders.empty.title': 'No purchase orders yet',
  'supplierOrders.empty.subtitle':
    'No purchase orders on file for {{supplier}}.',
  'supplierOrders.empty.message':
    'Purchase orders issued by Paragon Corp will appear here.',
};

export const supplierOrdersId: Record<string, string> = {
  // — Breadcrumb —
  'supplierOrders.crumb.transact': 'TRANSAKSI',
  'supplierOrders.crumb.myOrders': 'PESANAN SAYA',
  // — Page header —
  'supplierOrders.header.title': 'Pesanan Saya',
  'supplierOrders.header.subtitle':
    'Pesanan pembelian diterima dari Paragon Corp — {{supplier}}.',
  // — Meta line —
  'supplierOrders.meta.orders.one': '{{count}} pesanan',
  'supplierOrders.meta.orders.other': '{{count}} pesanan',
  'supplierOrders.meta.lastUpdated': 'terakhir diperbarui',
  // — KPI cards —
  'supplierOrders.kpi.openOrders.eyebrow': 'Pesanan Terbuka',
  'supplierOrders.kpi.openOrders.needsAction': 'Perlu tindakan Anda',
  'supplierOrders.kpi.openOrders.cleared': 'Semua tindakan selesai',
  'supplierOrders.kpi.inProgress.eyebrow': 'Sedang Berjalan',
  'supplierOrders.kpi.inProgress.subtitle': 'Dikonfirmasi · menunggu pengiriman',
  'supplierOrders.kpi.totalValue.eyebrow': 'Total Nilai Tertunda',
  'supplierOrders.kpi.totalValue.subtitle': 'Belum terkirim',
  'supplierOrders.kpi.delivered.eyebrow': 'Terkirim',
  'supplierOrders.kpi.delivered.subtitle': 'PO Selesai',
  // — Sub-tabs —
  'supplierOrders.tab.all': 'Semua pesanan',
  'supplierOrders.tab.action': 'Perlu tindakan',
  'supplierOrders.tab.progress': 'Sedang berjalan',
  'supplierOrders.tab.completed': 'Selesai',
  // — Needs-confirmation banner —
  'supplierOrders.banner.needConfirmation.one':
    '{{count}} pesanan memerlukan konfirmasi Anda:',
  'supplierOrders.banner.needConfirmation.other':
    '{{count}} pesanan memerlukan konfirmasi Anda:',
  'supplierOrders.banner.instruction':
    'klik baris untuk mengonfirmasi kuantitas dan tanggal pengiriman.',
  // — Table columns —
  'supplierOrders.col.po': 'PO #',
  'supplierOrders.col.orderDate': 'Tanggal pesanan',
  'supplierOrders.col.requestedDelivery': 'Pengiriman diminta',
  'supplierOrders.col.items': 'Item',
  'supplierOrders.col.value': 'Nilai',
  'supplierOrders.col.status': 'Status',
  'supplierOrders.col.action': 'Tindakan',
  'supplierOrders.table.empty': 'Tidak ada pesanan dalam kategori ini.',
  // — Row / footer actions —
  'supplierOrders.action.confirm': 'Konfirmasi',
  'supplierOrders.action.createAsn': 'Buat ASN',
  'supplierOrders.action.view': 'Lihat',
  'supplierOrders.action.close': 'Tutup',
  'supplierOrders.action.requestChange': 'Minta perubahan sebagai gantinya',
  'supplierOrders.action.backToConfirm': 'Kembali ke konfirmasi',
  'supplierOrders.action.submitChange': 'Kirim permintaan perubahan',
  'supplierOrders.action.createAsnNow': 'Buat ASN sekarang',
  // — Side panel: key facts —
  'supplierOrders.panel.keyFacts': 'Fakta utama',
  'supplierOrders.panel.lineItems': 'Item baris',
  'supplierOrders.panel.lineItemsConfirm': 'Item baris — konfirmasi kuantitas',
  'supplierOrders.panel.totalValue': 'Total nilai',
  'supplierOrders.panel.channel': 'Kanal',
  // — Side panel: line-items table —
  'supplierOrders.panel.col.material': 'Material',
  'supplierOrders.panel.col.ordered': 'Dipesan',
  'supplierOrders.panel.col.confirmed': 'Dikonfirmasi',
  // — Panel samping: penolakan kuantitas konfirmasi (CP-0 · W1 · 2f-c) —
  'supplierOrders.confirm.qty.refused.empty':
    'Masukkan kuantitas yang Anda konfirmasi — sel yang dikosongkan bukan konfirmasi nol. Untuk konfirmasi sebagian, ketik kuantitas yang dikurangi.',
  'supplierOrders.confirm.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 5000.',
  'supplierOrders.confirm.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  'supplierOrders.confirm.qty.outOfBounds':
    'Konfirmasi antara 1 dan {{ordered}} {{uom}} — kuantitas yang dipesan. Untuk mengubah pesanan itu sendiri, gunakan Ajukan perubahan.',
  // — Side panel: delivery & notes (editing) —
  'supplierOrders.panel.deliveryNotes': 'Pengiriman & catatan',
  'supplierOrders.panel.confirmedDeliveryDate': 'Tanggal pengiriman dikonfirmasi',
  'supplierOrders.panel.notesLabel': 'Catatan untuk Paragon',
  'supplierOrders.panel.notesPlaceholder': 'Pesan opsional…',
  'supplierOrders.panel.diffWarning':
    'Nilai yang dikonfirmasi berbeda dari PO asli. Paragon akan meninjau perubahan Anda.',
  // — Side panel: change request —
  'supplierOrders.panel.changeRequest': 'Permintaan perubahan',
  'supplierOrders.panel.changeRequestHint':
    'Jelaskan perubahan yang diperlukan (mis. kuantitas dikurangi, tanggal pengiriman alternatif).',
  'supplierOrders.panel.changeRequestPlaceholder': 'Apa yang perlu diubah?',
  // — Side panel: confirmed summary —
  'supplierOrders.panel.orderConfirmed': 'Pesanan dikonfirmasi',
  'supplierOrders.panel.confirmedAt': 'Dikonfirmasi pada',
  'supplierOrders.panel.deliveryShort': 'Pengiriman',
  'supplierOrders.panel.totalQty': 'Total kuantitas',
  'supplierOrders.panel.next': 'Berikutnya',
  'supplierOrders.panel.notesPrefix': 'Catatan:',
  'supplierOrders.panel.title': 'PO {{poNumber}}',
  'supplierOrders.units': 'unit',
  // — Toasts (page-local; PO-confirm toasts reuse shared po.confirm.*) —
  'supplierOrders.toast.changeSubmitted.title':
    'Permintaan perubahan untuk {{poNumber}} dikirim',
  'supplierOrders.toast.changeSubmitted.desc': 'Tim Paragon akan meninjau.',
  'supplierOrders.toast.asnCreation.title': 'Pembuatan ASN untuk {{poNumber}}',
  'supplierOrders.toast.asnContinue':
    'Buka Pengiriman & ASN Saya untuk membuatnya di sana.',
  'supplierOrders.toast.creatingAsn.title': 'Pembuatan ASN tidak tersedia dari kartu ini — tidak ada yang dibuat untuk {{poNumber}}.',
  // — Empty state (all-empty early return) —
  'supplierOrders.empty.title': 'Belum ada pesanan pembelian',
  'supplierOrders.empty.subtitle':
    'Tidak ada pesanan pembelian tercatat untuk {{supplier}}.',
  'supplierOrders.empty.message':
    'Pesanan pembelian yang diterbitkan oleh Paragon Corp akan muncul di sini.',
};
