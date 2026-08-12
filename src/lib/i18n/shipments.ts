// BuyerShipments i18n fragment (Batch 4). Namespace: shipments.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Canonical StatusPill children (shipment statuses: In Transit, At Dock,
// Delivered, Customs Clearance, Pending ASN, ASN Received, Arrived at Port,
// Unloading, Delayed) are localized centrally via statusLabel.ts and are NOT
// re-declared here. Sub-tab / KPI-eyebrow labels that happen to be status words
// DO get their own keys (they are plain chrome text, not pills — matching the
// goodsReceipt.tab.* / kpi.* precedent). Mono DATA (ASN/PO/SH numbers, dates,
// weights, tracking refs, container #) renders via <Data>/formatters and is
// never keyed. Fixture-derived content (supplier / carrier / city proper nouns,
// `Dock A-1` facility labels) and the Sea/Air/Road transport-mode enum (no
// central label map) are left as EN literals in the page (i18n-defer).
export const shipmentsEn: Record<string, string> = {
  // — Breadcrumb —
  'shipments.crumb.transact': 'TRANSACT',
  'shipments.crumb.shipments': 'SHIPMENTS & ASN',
  // — Page header —
  'shipments.header.title': 'Shipments & ASN',
  'shipments.header.subtitle':
    'Inbound shipment tracking, advance shipment notices, and dock scheduling.',
  'shipments.action.export': 'Export',
  'shipments.action.dockSchedule': 'Dock Schedule',
  'shipments.action.manualAsn': 'Manual ASN Entry',
  // — Meta line —
  'shipments.meta.summary.one': '{{count}} active shipment · last updated {{date}}',
  'shipments.meta.summary.other': '{{count}} active shipments · last updated {{date}}',
  // — KPI cards —
  'shipments.kpi.inTransit.eyebrow': 'In Transit',
  'shipments.kpi.inTransit.subtitle': 'At sea, in air, or on road',
  'shipments.kpi.atDock.eyebrow': 'At Dock / Unloading',
  'shipments.kpi.atDock.subtitle': 'Currently at NDC J6',
  'shipments.kpi.delayed.eyebrow': 'Delayed',
  'shipments.kpi.delayed.subtitle': 'Past ETA',
  'shipments.kpi.arrivingToday.eyebrow': 'Arriving Today',
  // — Sub-tabs —
  'shipments.tab.all': 'All',
  'shipments.tab.pending': 'Pending ASN',
  'shipments.tab.inTransit': 'In Transit',
  'shipments.tab.atDock': 'At Dock',
  'shipments.tab.delivered': 'Delivered',
  'shipments.tab.delayed': 'Delayed',
  // — Search —
  'shipments.search.placeholder': 'Search by ASN, PO, supplier, or tracking number...',
  // — Table column headers —
  'shipments.table.col.asnPo': 'ASN / PO',
  'shipments.table.col.supplier': 'Supplier',
  'shipments.table.col.mode': 'Mode',
  'shipments.table.col.route': 'Route',
  'shipments.table.col.shipDate': 'Ship Date',
  'shipments.table.col.eta': 'ETA',
  'shipments.table.col.packages': 'Packages',
  'shipments.table.col.dock': 'Dock',
  'shipments.table.col.status': 'Status',
  'shipments.table.daysLate': '+{{days}}d late',
  'shipments.table.empty': 'No shipments match the current filters.',
  // — Dock schedule (FormSection) —
  'shipments.dock.eyebrow': 'OPERATIONS',
  'shipments.dock.title': "Today's Dock Schedule",
  'shipments.dock.description':
    'Live view of dock assignments for inbound shipments at NDC J6.',
  'shipments.dock.col.dock': 'Dock',
  // — Side panel: key facts —
  'shipments.panel.keyFacts': 'Key facts',
  'shipments.panel.asnNumber': 'ASN #',
  'shipments.panel.poNumber': 'PO #',
  'shipments.panel.supplier': 'Supplier',
  'shipments.panel.carrier': 'Carrier',
  'shipments.panel.trackingNumber': 'Tracking #',
  'shipments.panel.mode': 'Mode',
  'shipments.panel.containerNumber': 'Container #',
  'shipments.panel.origin': 'Origin',
  'shipments.panel.destination': 'Destination',
  'shipments.panel.shipDate': 'Ship Date',
  'shipments.panel.eta': 'ETA',
  'shipments.panel.actualArrival': 'Actual Arrival',
  'shipments.panel.packages': 'Packages',
  'shipments.panel.totalWeight': 'Total Weight',
  'shipments.panel.dock': 'Dock',
  'shipments.panel.notScheduled': 'Not scheduled',
  // — Side panel: line items —
  'shipments.panel.lineItems': 'Line items',
  'shipments.panel.col.material': 'Material',
  'shipments.panel.col.description': 'Description',
  'shipments.panel.col.qty': 'Qty',
  'shipments.panel.col.uom': 'UoM',
  // — Side panel: lifecycle + dock assignment —
  'shipments.panel.lifecycle': 'Shipment lifecycle',
  'shipments.panel.dockAssignment': 'Dock Assignment',
  'shipments.panel.dockScheduled': 'Scheduled {{time}} today',
  'shipments.panel.notYetScheduled': 'Not yet scheduled',
  'shipments.panel.scheduleDock': 'Schedule dock',
  // — Timeline milestone labels —
  'shipments.timeline.poCreated': 'PO Created',
  'shipments.timeline.asnSubmitted': 'ASN Submitted',
  'shipments.timeline.shippedFromOrigin': 'Shipped from Origin',
  'shipments.timeline.inTransit': 'In Transit',
  'shipments.timeline.arrivedAtPort': 'Arrived at Port',
  'shipments.timeline.customsCleared': 'Customs Cleared',
  'shipments.timeline.dockedAtNdc': 'Docked at NDC',
  'shipments.timeline.unloadedGrPosted': 'Unloaded & GR Posted',
  'shipments.timeline.pending': 'Pending',
  'shipments.timeline.cleared': 'Cleared',
  'shipments.timeline.onHold': 'On hold',
  'shipments.timeline.complete': 'Complete',
  'shipments.timeline.daysInTransit.one': '{{count}} day',
  'shipments.timeline.daysInTransit.other': '{{count}} days',
  // — Toasts —
  'shipments.toast.export.title': 'Shipments export not available yet',
  'shipments.toast.export.desc': 'No file was generated — shipments export is not wired to a real system.',
  'shipments.toast.manualAsn.title': 'Manual ASN entry',
  'shipments.toast.manualAsn.desc': 'Form will open in a future release.',
  'shipments.toast.dockSchedule.title': 'Dock schedule expanded',
  'shipments.toast.dockSchedule.desc': 'Scroll down to view assignments.',
  // D-CENSUS-8 — was 'Reminder sent' / 'Notified {{supplier}}'. Nothing is sent:
  // there is no outbound channel write on this page. Retracted to the same shape
  // the manual-ASN and dock-scheduler toasts in this very file already use.
  'shipments.toast.reminder.title': 'Reminder not available yet',
  'shipments.toast.reminder.desc':
    'Supplier reminders for {{asn}} will send once the channel seam is connected. Nothing was sent to {{supplier}}.',
  'shipments.toast.tracking.title': 'Carrier tracking not available yet — nothing was opened.',
  'shipments.toast.tracking.desc': 'Carrier: {{carrier}} · {{tracking}}',
  'shipments.toast.carrierAlerted.title': 'Carrier escalation not available yet',
  'shipments.toast.carrierAlerted.desc':
    'No escalation ticket was opened for {{asn}}. Carrier contact is not wired to a real system.',
  'shipments.toast.dockScheduler.title': 'Dock scheduler',
  'shipments.toast.dockScheduler.desc': 'Schedule UI will open in a future release.',
  // — Side-panel footer actions —
  'shipments.footer.sendReminder': 'Send reminder to supplier',
  'shipments.footer.trackShipment': 'Track shipment',
  'shipments.footer.beginGr': 'Begin GR process',
  'shipments.footer.viewGr': 'View GR',
  'shipments.footer.contactCarrier': 'Contact carrier',
  // — Empty state (all-empty early return) —
  'shipments.empty.title': 'No shipments yet',
  'shipments.empty.subtitle': 'No inbound shipments or ASNs to track.',
  'shipments.empty.message':
    'Shipments and advance ship notices will appear here as suppliers dispatch orders.',
};

export const shipmentsId: Record<string, string> = {
  // — Breadcrumb —
  'shipments.crumb.transact': 'TRANSAKSI',
  'shipments.crumb.shipments': 'PENGIRIMAN & ASN',
  // — Page header —
  'shipments.header.title': 'Pengiriman & ASN',
  'shipments.header.subtitle':
    'Pelacakan pengiriman masuk, pemberitahuan pengiriman di muka, dan penjadwalan dermaga.',
  'shipments.action.export': 'Ekspor',
  'shipments.action.dockSchedule': 'Jadwal Dermaga',
  'shipments.action.manualAsn': 'Entri ASN Manual',
  // — Meta line —
  'shipments.meta.summary.one': '{{count}} pengiriman aktif · terakhir diperbarui {{date}}',
  'shipments.meta.summary.other': '{{count}} pengiriman aktif · terakhir diperbarui {{date}}',
  // — KPI cards —
  'shipments.kpi.inTransit.eyebrow': 'Dalam Perjalanan',
  'shipments.kpi.inTransit.subtitle': 'Di laut, udara, atau jalan',
  'shipments.kpi.atDock.eyebrow': 'Di Dok / Bongkar Muat',
  'shipments.kpi.atDock.subtitle': 'Saat ini di NDC J6',
  'shipments.kpi.delayed.eyebrow': 'Terlambat',
  'shipments.kpi.delayed.subtitle': 'Melewati ETA',
  'shipments.kpi.arrivingToday.eyebrow': 'Tiba Hari Ini',
  // — Sub-tabs —
  'shipments.tab.all': 'Semua',
  'shipments.tab.pending': 'Menunggu ASN',
  'shipments.tab.inTransit': 'Dalam Perjalanan',
  'shipments.tab.atDock': 'Di Dok',
  'shipments.tab.delivered': 'Terkirim',
  'shipments.tab.delayed': 'Terlambat',
  // — Search —
  'shipments.search.placeholder': 'Cari berdasarkan ASN, PO, pemasok, atau nomor pelacakan...',
  // — Table column headers —
  'shipments.table.col.asnPo': 'ASN / PO',
  'shipments.table.col.supplier': 'Pemasok',
  'shipments.table.col.mode': 'Moda',
  'shipments.table.col.route': 'Rute',
  'shipments.table.col.shipDate': 'Tanggal Kirim',
  'shipments.table.col.eta': 'ETA',
  'shipments.table.col.packages': 'Paket',
  'shipments.table.col.dock': 'Dermaga',
  'shipments.table.col.status': 'Status',
  'shipments.table.daysLate': '+{{days}}h terlambat',
  'shipments.table.empty': 'Tidak ada pengiriman yang cocok dengan filter saat ini.',
  // — Dock schedule (FormSection) —
  'shipments.dock.eyebrow': 'OPERASI',
  'shipments.dock.title': 'Jadwal Dermaga Hari Ini',
  'shipments.dock.description':
    'Tampilan langsung penugasan dermaga untuk pengiriman masuk di NDC J6.',
  'shipments.dock.col.dock': 'Dermaga',
  // — Side panel: key facts —
  'shipments.panel.keyFacts': 'Fakta utama',
  'shipments.panel.asnNumber': 'No. ASN',
  'shipments.panel.poNumber': 'No. PO',
  'shipments.panel.supplier': 'Pemasok',
  'shipments.panel.carrier': 'Kurir',
  'shipments.panel.trackingNumber': 'No. Pelacakan',
  'shipments.panel.mode': 'Moda',
  'shipments.panel.containerNumber': 'No. Kontainer',
  'shipments.panel.origin': 'Asal',
  'shipments.panel.destination': 'Tujuan',
  'shipments.panel.shipDate': 'Tanggal Kirim',
  'shipments.panel.eta': 'ETA',
  'shipments.panel.actualArrival': 'Kedatangan Aktual',
  'shipments.panel.packages': 'Paket',
  'shipments.panel.totalWeight': 'Total Berat',
  'shipments.panel.dock': 'Dermaga',
  'shipments.panel.notScheduled': 'Belum dijadwalkan',
  // — Side panel: line items —
  'shipments.panel.lineItems': 'Item baris',
  'shipments.panel.col.material': 'Material',
  'shipments.panel.col.description': 'Deskripsi',
  'shipments.panel.col.qty': 'Jml',
  'shipments.panel.col.uom': 'Satuan',
  // — Side panel: lifecycle + dock assignment —
  'shipments.panel.lifecycle': 'Siklus hidup pengiriman',
  'shipments.panel.dockAssignment': 'Penugasan Dermaga',
  'shipments.panel.dockScheduled': 'Dijadwalkan {{time}} hari ini',
  'shipments.panel.notYetScheduled': 'Belum dijadwalkan',
  'shipments.panel.scheduleDock': 'Jadwalkan dermaga',
  // — Timeline milestone labels —
  'shipments.timeline.poCreated': 'PO Dibuat',
  'shipments.timeline.asnSubmitted': 'ASN Diajukan',
  'shipments.timeline.shippedFromOrigin': 'Dikirim dari Asal',
  'shipments.timeline.inTransit': 'Dalam Perjalanan',
  'shipments.timeline.arrivedAtPort': 'Tiba di Pelabuhan',
  'shipments.timeline.customsCleared': 'Bea Cukai Selesai',
  'shipments.timeline.dockedAtNdc': 'Merapat di NDC',
  'shipments.timeline.unloadedGrPosted': 'Dibongkar & GR Diposting',
  'shipments.timeline.pending': 'Menunggu',
  'shipments.timeline.cleared': 'Selesai',
  'shipments.timeline.onHold': 'Ditahan',
  'shipments.timeline.complete': 'Selesai',
  'shipments.timeline.daysInTransit.one': '{{count}} hari',
  'shipments.timeline.daysInTransit.other': '{{count}} hari',
  // — Toasts —
  'shipments.toast.export.title': 'Ekspor pengiriman belum tersedia',
  'shipments.toast.export.desc': 'Tidak ada berkas yang dibuat — ekspor pengiriman belum tersambung ke sistem nyata.',
  'shipments.toast.manualAsn.title': 'Entri ASN manual',
  'shipments.toast.manualAsn.desc': 'Formulir akan tersedia pada rilis mendatang.',
  'shipments.toast.dockSchedule.title': 'Jadwal dermaga diperluas',
  'shipments.toast.dockSchedule.desc': 'Gulir ke bawah untuk melihat penugasan.',
  'shipments.toast.reminder.title': 'Pengingat belum tersedia',
  'shipments.toast.reminder.desc':
    'Pengingat pemasok untuk {{asn}} akan dikirim setelah sambungan kanal aktif. Tidak ada yang dikirim ke {{supplier}}.',
  'shipments.toast.tracking.title': 'Pelacakan kurir belum tersedia — tidak ada yang dibuka.',
  'shipments.toast.tracking.desc': 'Kurir: {{carrier}} · {{tracking}}',
  'shipments.toast.carrierAlerted.title': 'Eskalasi kurir belum tersedia',
  'shipments.toast.carrierAlerted.desc':
    'Tidak ada tiket eskalasi yang dibuka untuk {{asn}}. Kontak kurir belum tersambung ke sistem nyata.',
  'shipments.toast.dockScheduler.title': 'Penjadwal dermaga',
  'shipments.toast.dockScheduler.desc': 'Antarmuka penjadwalan akan tersedia pada rilis mendatang.',
  // — Side-panel footer actions —
  'shipments.footer.sendReminder': 'Kirim pengingat ke pemasok',
  'shipments.footer.trackShipment': 'Lacak pengiriman',
  'shipments.footer.beginGr': 'Mulai proses GR',
  'shipments.footer.viewGr': 'Lihat GR',
  'shipments.footer.contactCarrier': 'Hubungi kurir',
  // — Empty state (all-empty early return) —
  'shipments.empty.title': 'Belum ada pengiriman',
  'shipments.empty.subtitle': 'Tidak ada pengiriman masuk atau ASN untuk dilacak.',
  'shipments.empty.message':
    'Pengiriman dan pemberitahuan pengiriman di muka akan muncul di sini saat pemasok mengirim pesanan.',
};
