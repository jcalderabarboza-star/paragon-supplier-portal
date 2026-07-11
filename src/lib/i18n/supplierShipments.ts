// SupplierShipments i18n fragment (Batch 5). Namespace: supplierShipments.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention in
// i18n.ts / discovery.ts — no reliance on the i18next plural resolver).
//
// Central maps are NOT re-declared here:
//   • ASN status pills (Draft / Submitted / In Transit / Delivered /
//     Discrepancy) localize via statusLabel.ts — including the inline
//     "filtered by {status}" chrome, which resolves the raw filter token
//     through statusLabelKey().
//   • The already-shipped `asn.*` command/toast/drawer-form keys live directly
//     in i18n.ts (toasts pre-migrated); the wizard "Submit ASN" complete-label
//     reuses `asn.submit.confirm`.
// This page does NOT render ShipmentMode (the ASN shape has no `mode` field), so
// no useModeLabel() integration and no mode.* keys here.
//
// Mono DATA is never translated (ASN/PO numbers, tracking refs, dates, weights,
// cartons, quantities — rendered via <Data> / formatters). Sample/mock proper
// nouns (carrier names, cities, warehouse/material data, dock-appointment fixture
// values, phone number) stay EN with `// i18n-defer` markers at the call sites.
export const supplierShipmentsEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierShipments.crumb.transact': 'TRANSACT',
  'supplierShipments.crumb.shipments': 'SHIPMENTS & ASN',
  // — Page header —
  'supplierShipments.header.title': 'Shipments & ASN',
  'supplierShipments.header.subtitle':
    'Advance Ship Notices · Paragon WMS integration · EDI 856 — {{name}}.',
  // — Meta line —
  'supplierShipments.meta.summary':
    '{{shipments}} shipments · {{pos}} confirmed POs ready to ship',
  // — KPI tiles (ASN status counts) —
  'supplierShipments.kpi.draft.eyebrow': 'Draft',
  'supplierShipments.kpi.submitted.eyebrow': 'Submitted',
  'supplierShipments.kpi.inTransit.eyebrow': 'In Transit',
  'supplierShipments.kpi.delivered.eyebrow': 'Delivered',
  'supplierShipments.kpi.discrepancy.eyebrow': 'Discrepancy',
  // — Sub-tabs —
  'supplierShipments.tab.myShipments': 'My Shipments',
  'supplierShipments.tab.createAsn': 'Create ASN',
  'supplierShipments.tab.dock': 'Dock Appointments',
  // — Pending-ASN panel (confirmed POs awaiting ASN) —
  'supplierShipments.pending.awaiting.one':
    '{{count}} confirmed purchase order awaiting ASN',
  'supplierShipments.pending.awaiting.other':
    '{{count}} confirmed purchase orders awaiting ASN',
  'supplierShipments.pending.req': 'Req.',
  // — ASN list —
  'supplierShipments.list.heading': 'Advance Ship Notices',
  'supplierShipments.list.filteredBy': 'filtered by {{status}}',
  'supplierShipments.list.empty': 'No ASNs match the selected filter.',
  // — Table columns —
  'supplierShipments.col.asn': 'ASN #',
  'supplierShipments.col.poRef': 'PO ref',
  'supplierShipments.col.status': 'Status',
  'supplierShipments.col.carrier': 'Carrier',
  'supplierShipments.col.tracking': 'Tracking',
  'supplierShipments.col.eta': 'ETA',
  'supplierShipments.col.actions': 'Actions',
  // — Row aria / controls —
  'supplierShipments.aria.expand': 'Expand',
  'supplierShipments.aria.collapse': 'Collapse',
  // — Actions / CTAs —
  'supplierShipments.action.resolve': 'Resolve',
  'supplierShipments.action.cancel': 'Cancel',
  'supplierShipments.action.exportEdi': 'Export EDI 856',
  // — Expanded row: shipment details —
  'supplierShipments.detail.heading': 'Shipment details',
  'supplierShipments.detail.origin': 'Origin',
  'supplierShipments.detail.destinationWarehouse': 'Destination warehouse',
  'supplierShipments.detail.totalCartons': 'Total cartons',
  'supplierShipments.detail.grossWeight': 'Gross weight',
  'supplierShipments.detail.temperature': 'Temperature',
  'supplierShipments.detail.lineItems': 'Line items ({{count}})',
  'supplierShipments.detail.noLineItems': 'No line items in this draft.',
  // — Expanded row: line-item sub-table columns —
  'supplierShipments.lineItems.col.material': 'Material',
  'supplierShipments.lineItems.col.ordered': 'Ordered',
  'supplierShipments.lineItems.col.shipped': 'Shipped',
  'supplierShipments.lineItems.col.lot': 'Lot',
  // — Empty state (all-empty early return) —
  'supplierShipments.empty.title': 'No shipments yet',
  'supplierShipments.empty.subtitle':
    'No advance ship notices or confirmed purchase orders to ship.',
  'supplierShipments.empty.message':
    'ASNs and shippable confirmed POs will appear here.',
  // — Dock Appointments tab —
  'supplierShipments.dock.heading': 'Your scheduled dock appointments',
  'supplierShipments.dock.field.date': 'Date',
  'supplierShipments.dock.field.time': 'Time',
  'supplierShipments.dock.field.dock': 'Dock',
  'supplierShipments.dock.field.location': 'Location',
  'supplierShipments.dock.notice.arrivePre': 'Please arrive',
  'supplierShipments.dock.notice.arriveEmphasis': '15 minutes before your slot',
  'supplierShipments.dock.notice.arrivePost':
    'Bring a printed copy of your ASN and packing list. Contact the receiving team at',
  'supplierShipments.dock.notice.arriveTail': 'if you anticipate delays.',
  'supplierShipments.dock.info.pre':
    'Dock appointment requests for new ASNs are processed by the Paragon Inbound Team. Confirmation is sent via',
  'supplierShipments.dock.info.post': 'within 2 hours of ASN submission.',
  // — Wizard: step 1 (select PO) —
  'supplierShipments.wizard.select.title': 'Select PO',
  'supplierShipments.wizard.select.short': 'Select PO',
  'supplierShipments.wizard.select.desc':
    'Choose a confirmed purchase order to ship.',
  'supplierShipments.wizard.select.empty':
    'No confirmed POs pending ASN submission.',
  'supplierShipments.wizard.select.qty': 'Qty:',
  'supplierShipments.wizard.select.delivery': 'Delivery:',
  'supplierShipments.wizard.select.supplier': 'Supplier:',
  'supplierShipments.wizard.select.requestedDelivery': 'Requested Delivery:',
  'supplierShipments.wizard.select.deliveryAddress': 'Delivery Address:',
  'supplierShipments.wizard.select.channel': 'Channel:',
  // — Wizard: step 2 (shipment details) —
  'supplierShipments.wizard.details.title': 'Shipment details',
  'supplierShipments.wizard.details.short': 'Details',
  'supplierShipments.wizard.details.desc':
    'Carrier, tracking, dates, and batch info.',
  'supplierShipments.wizard.details.logistics.eyebrow': 'Carrier & tracking',
  'supplierShipments.wizard.details.logistics.title': 'Logistics',
  'supplierShipments.wizard.details.logistics.desc':
    'Provided by the carrier upon pickup.',
  'supplierShipments.wizard.details.field.carrier': 'Carrier *',
  'supplierShipments.wizard.details.field.tracking': 'Tracking number *',
  'supplierShipments.wizard.details.field.shipDate': 'Ship date *',
  'supplierShipments.wizard.details.field.eta': 'Estimated arrival *',
  'supplierShipments.wizard.details.packaging.eyebrow': 'Packaging',
  'supplierShipments.wizard.details.packaging.title': 'Cargo & batch',
  'supplierShipments.wizard.details.packaging.desc':
    'Optional — fill what you have.',
  'supplierShipments.wizard.details.field.packages': 'Number of packages',
  'supplierShipments.wizard.details.field.weight': 'Total weight (KG)',
  'supplierShipments.wizard.details.field.batch': 'Batch number *',
  'supplierShipments.wizard.details.field.lot': 'Lot number',
  'supplierShipments.wizard.details.docs.eyebrow': 'Documents & notes',
  'supplierShipments.wizard.details.docs.title': 'Supporting documents',
  'supplierShipments.wizard.details.docs.desc':
    'Packing list and special handling instructions.',
  'supplierShipments.wizard.details.field.packingList': 'Packing list',
  'supplierShipments.wizard.details.chooseFile': 'Choose file',
  'supplierShipments.wizard.details.noFile': 'No file chosen',
  'supplierShipments.wizard.details.field.notes': 'Special handling notes',
  // — Wizard: step 3 (confirm & submit) —
  'supplierShipments.wizard.review.title': 'Confirm & submit',
  'supplierShipments.wizard.review.short': 'Review',
  'supplierShipments.wizard.review.desc': 'Verify before transmitting EDI 856.',
  'supplierShipments.wizard.review.summary.eyebrow': 'Review',
  'supplierShipments.wizard.review.summary.title': 'ASN summary',
  'supplierShipments.wizard.review.summary.desc':
    'All values shown will be transmitted to Paragon.',
  'supplierShipments.wizard.review.field.poNumber': 'PO number',
  'supplierShipments.wizard.review.field.material': 'Material',
  'supplierShipments.wizard.review.field.quantity': 'Quantity',
  'supplierShipments.wizard.review.field.carrier': 'Carrier',
  'supplierShipments.wizard.review.field.tracking': 'Tracking',
  'supplierShipments.wizard.review.field.shipDate': 'Ship date',
  'supplierShipments.wizard.review.field.eta': 'ETA',
  'supplierShipments.wizard.review.field.packages': 'Packages',
  'supplierShipments.wizard.review.field.batch': 'Batch number',
  'supplierShipments.wizard.review.field.lot': 'Lot number',
  'supplierShipments.wizard.review.confirm':
    'I confirm all shipment details are accurate and the goods match the purchase order specifications.',
  // — Input placeholders (example codes kept verbatim) —
  'supplierShipments.placeholder.tracking': 'e.g. JNE2026001234',
  'supplierShipments.placeholder.batch': 'e.g. PKG-2026-441',
  'supplierShipments.placeholder.lot': 'e.g. LOT-2026-001',
  'supplierShipments.placeholder.notes':
    'Temperature controlled, fragile, hazmat info…',
  // — Submit side-panel —
  'supplierShipments.submitPanel.title': 'Submit {{asnNumber}}',
  // — Export toast —
  'supplierShipments.toast.export.title': 'EDI 856 export generated',
  'supplierShipments.toast.export.desc': 'Download will start shortly.',
};

export const supplierShipmentsId: Record<string, string> = {
  // — Breadcrumb —
  'supplierShipments.crumb.transact': 'TRANSAKSI',
  'supplierShipments.crumb.shipments': 'PENGIRIMAN & ASN',
  // — Page header —
  'supplierShipments.header.title': 'Pengiriman & ASN',
  'supplierShipments.header.subtitle':
    'Advance Ship Notices · integrasi Paragon WMS · EDI 856 — {{name}}.',
  // — Meta line —
  'supplierShipments.meta.summary':
    '{{shipments}} pengiriman · {{pos}} PO terkonfirmasi siap dikirim',
  // — KPI tiles (ASN status counts) —
  'supplierShipments.kpi.draft.eyebrow': 'Draf',
  'supplierShipments.kpi.submitted.eyebrow': 'Diajukan',
  'supplierShipments.kpi.inTransit.eyebrow': 'Dalam Perjalanan',
  'supplierShipments.kpi.delivered.eyebrow': 'Terkirim',
  'supplierShipments.kpi.discrepancy.eyebrow': 'Selisih',
  // — Sub-tabs —
  'supplierShipments.tab.myShipments': 'Pengiriman Saya',
  'supplierShipments.tab.createAsn': 'Buat ASN',
  'supplierShipments.tab.dock': 'Janji Temu Dermaga',
  // — Pending-ASN panel (confirmed POs awaiting ASN) —
  'supplierShipments.pending.awaiting.one':
    '{{count}} pesanan pembelian terkonfirmasi menunggu ASN',
  'supplierShipments.pending.awaiting.other':
    '{{count}} pesanan pembelian terkonfirmasi menunggu ASN',
  'supplierShipments.pending.req': 'Diminta',
  // — ASN list —
  'supplierShipments.list.heading': 'Advance Ship Notices',
  'supplierShipments.list.filteredBy': 'disaring menurut {{status}}',
  'supplierShipments.list.empty':
    'Tidak ada ASN yang cocok dengan filter yang dipilih.',
  // — Table columns —
  'supplierShipments.col.asn': 'ASN #',
  'supplierShipments.col.poRef': 'Ref PO',
  'supplierShipments.col.status': 'Status',
  'supplierShipments.col.carrier': 'Kurir',
  'supplierShipments.col.tracking': 'Pelacakan',
  'supplierShipments.col.eta': 'ETA',
  'supplierShipments.col.actions': 'Tindakan',
  // — Row aria / controls —
  'supplierShipments.aria.expand': 'Perluas',
  'supplierShipments.aria.collapse': 'Ciutkan',
  // — Actions / CTAs —
  'supplierShipments.action.resolve': 'Selesaikan',
  'supplierShipments.action.cancel': 'Batal',
  'supplierShipments.action.exportEdi': 'Ekspor EDI 856',
  // — Expanded row: shipment details —
  'supplierShipments.detail.heading': 'Detail pengiriman',
  'supplierShipments.detail.origin': 'Asal',
  'supplierShipments.detail.destinationWarehouse': 'Gudang tujuan',
  'supplierShipments.detail.totalCartons': 'Total karton',
  'supplierShipments.detail.grossWeight': 'Berat kotor',
  'supplierShipments.detail.temperature': 'Suhu',
  'supplierShipments.detail.lineItems': 'Item baris ({{count}})',
  'supplierShipments.detail.noLineItems': 'Tidak ada item baris dalam draf ini.',
  // — Expanded row: line-item sub-table columns —
  'supplierShipments.lineItems.col.material': 'Material',
  'supplierShipments.lineItems.col.ordered': 'Dipesan',
  'supplierShipments.lineItems.col.shipped': 'Dikirim',
  'supplierShipments.lineItems.col.lot': 'Lot',
  // — Empty state (all-empty early return) —
  'supplierShipments.empty.title': 'Belum ada pengiriman',
  'supplierShipments.empty.subtitle':
    'Tidak ada advance ship notice atau pesanan pembelian terkonfirmasi untuk dikirim.',
  'supplierShipments.empty.message':
    'ASN dan PO terkonfirmasi yang dapat dikirim akan muncul di sini.',
  // — Dock Appointments tab —
  'supplierShipments.dock.heading': 'Janji temu dermaga terjadwal Anda',
  'supplierShipments.dock.field.date': 'Tanggal',
  'supplierShipments.dock.field.time': 'Waktu',
  'supplierShipments.dock.field.dock': 'Dermaga',
  'supplierShipments.dock.field.location': 'Lokasi',
  'supplierShipments.dock.notice.arrivePre': 'Harap tiba',
  'supplierShipments.dock.notice.arriveEmphasis': '15 menit sebelum slot Anda',
  'supplierShipments.dock.notice.arrivePost':
    'Bawa salinan cetak ASN dan daftar kemasan Anda. Hubungi tim penerima di',
  'supplierShipments.dock.notice.arriveTail':
    'jika Anda memperkirakan keterlambatan.',
  'supplierShipments.dock.info.pre':
    'Permintaan janji temu dermaga untuk ASN baru diproses oleh Tim Inbound Paragon. Konfirmasi dikirim via',
  'supplierShipments.dock.info.post': 'dalam 2 jam setelah pengajuan ASN.',
  // — Wizard: step 1 (select PO) —
  'supplierShipments.wizard.select.title': 'Pilih PO',
  'supplierShipments.wizard.select.short': 'Pilih PO',
  'supplierShipments.wizard.select.desc':
    'Pilih pesanan pembelian terkonfirmasi untuk dikirim.',
  'supplierShipments.wizard.select.empty':
    'Tidak ada PO terkonfirmasi yang menunggu pengajuan ASN.',
  'supplierShipments.wizard.select.qty': 'Jml:',
  'supplierShipments.wizard.select.delivery': 'Pengiriman:',
  'supplierShipments.wizard.select.supplier': 'Pemasok:',
  'supplierShipments.wizard.select.requestedDelivery': 'Pengiriman Diminta:',
  'supplierShipments.wizard.select.deliveryAddress': 'Alamat Pengiriman:',
  'supplierShipments.wizard.select.channel': 'Kanal:',
  // — Wizard: step 2 (shipment details) —
  'supplierShipments.wizard.details.title': 'Detail pengiriman',
  'supplierShipments.wizard.details.short': 'Detail',
  'supplierShipments.wizard.details.desc':
    'Kurir, pelacakan, tanggal, dan info batch.',
  'supplierShipments.wizard.details.logistics.eyebrow': 'Kurir & pelacakan',
  'supplierShipments.wizard.details.logistics.title': 'Logistik',
  'supplierShipments.wizard.details.logistics.desc':
    'Disediakan oleh kurir saat penjemputan.',
  'supplierShipments.wizard.details.field.carrier': 'Kurir *',
  'supplierShipments.wizard.details.field.tracking': 'Nomor pelacakan *',
  'supplierShipments.wizard.details.field.shipDate': 'Tanggal kirim *',
  'supplierShipments.wizard.details.field.eta': 'Perkiraan tiba *',
  'supplierShipments.wizard.details.packaging.eyebrow': 'Kemasan',
  'supplierShipments.wizard.details.packaging.title': 'Kargo & batch',
  'supplierShipments.wizard.details.packaging.desc':
    'Opsional — isi yang Anda miliki.',
  'supplierShipments.wizard.details.field.packages': 'Jumlah paket',
  'supplierShipments.wizard.details.field.weight': 'Total berat (KG)',
  'supplierShipments.wizard.details.field.batch': 'Nomor batch *',
  'supplierShipments.wizard.details.field.lot': 'Nomor lot',
  'supplierShipments.wizard.details.docs.eyebrow': 'Dokumen & catatan',
  'supplierShipments.wizard.details.docs.title': 'Dokumen pendukung',
  'supplierShipments.wizard.details.docs.desc':
    'Daftar kemasan dan instruksi penanganan khusus.',
  'supplierShipments.wizard.details.field.packingList': 'Daftar kemasan',
  'supplierShipments.wizard.details.chooseFile': 'Pilih berkas',
  'supplierShipments.wizard.details.noFile': 'Tidak ada berkas dipilih',
  'supplierShipments.wizard.details.field.notes': 'Catatan penanganan khusus',
  // — Wizard: step 3 (confirm & submit) —
  'supplierShipments.wizard.review.title': 'Konfirmasi & ajukan',
  'supplierShipments.wizard.review.short': 'Tinjau',
  'supplierShipments.wizard.review.desc':
    'Verifikasi sebelum mengirim EDI 856.',
  'supplierShipments.wizard.review.summary.eyebrow': 'Tinjau',
  'supplierShipments.wizard.review.summary.title': 'Ringkasan ASN',
  'supplierShipments.wizard.review.summary.desc':
    'Semua nilai yang ditampilkan akan dikirim ke Paragon.',
  'supplierShipments.wizard.review.field.poNumber': 'Nomor PO',
  'supplierShipments.wizard.review.field.material': 'Material',
  'supplierShipments.wizard.review.field.quantity': 'Kuantitas',
  'supplierShipments.wizard.review.field.carrier': 'Kurir',
  'supplierShipments.wizard.review.field.tracking': 'Pelacakan',
  'supplierShipments.wizard.review.field.shipDate': 'Tanggal kirim',
  'supplierShipments.wizard.review.field.eta': 'ETA',
  'supplierShipments.wizard.review.field.packages': 'Paket',
  'supplierShipments.wizard.review.field.batch': 'Nomor batch',
  'supplierShipments.wizard.review.field.lot': 'Nomor lot',
  'supplierShipments.wizard.review.confirm':
    'Saya mengonfirmasi semua detail pengiriman akurat dan barang sesuai dengan spesifikasi pesanan pembelian.',
  // — Input placeholders (example codes kept verbatim) —
  'supplierShipments.placeholder.tracking': 'mis. JNE2026001234',
  'supplierShipments.placeholder.batch': 'mis. PKG-2026-441',
  'supplierShipments.placeholder.lot': 'mis. LOT-2026-001',
  'supplierShipments.placeholder.notes':
    'Suhu terkontrol, mudah pecah, info hazmat…',
  // — Submit side-panel —
  'supplierShipments.submitPanel.title': 'Kirim {{asnNumber}}',
  // — Export toast —
  'supplierShipments.toast.export.title': 'Ekspor EDI 856 dibuat',
  'supplierShipments.toast.export.desc': 'Unduhan akan segera dimulai.',
};
