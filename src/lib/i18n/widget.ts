// Dashboard-widget i18n fragment. Namespace: widget.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// ONE fragment covers the SHARED ExpandableWidget shell + all 13 adapter widgets,
// so translating once flips every widget on BOTH the Buyer and Supplier dashboards.
// Count-dependent flag phrases use i18next INTERPOLATION ({{count}}, {{expired}},
// {{maxDays}}, …). Where English inflects singular/plural (BuyerAlertsBar's
// "exception(s)") explicit `.one` / `.other` siblings are selected in-component by
// a `count === 1` ternary (no reliance on the i18next plural resolver, matching
// the flat-key convention already shipped in i18n.ts); ID keeps both keys for
// parity even though Bahasa does not inflect the noun.
// Honest-by-construction: the Live/Sample tokens are DISPLAY-translation only —
// the `live` boolean still structurally gates which token renders. StatusPill
// children (statuses, priority/severity, disposition) inside expandedRows localize
// centrally via statusLabel/priorityLabel and are NOT re-declared here; mono <Data>
// (counts, dates, currency, doc numbers) is never keyed.
export const widgetEn: Record<string, string> = {
  // — Shared shell (ExpandableWidget) —
  'widget.honesty.live': 'Live',
  'widget.honesty.sample': 'Sample',
  // Harvest-gated waiting-state (I3.3): a capability whose real data source has not
  // yet landed. Specific, not generic — names the Track-R certificate harvest.
  'widget.honesty.awaitingHarvest': 'Sample — awaiting Track-R harvest',
  // Harvest-gated (G1.1): the PR intake is wired but has no live producer yet
  // (SOMO F2 / internal Grid) — names the missing producer, not a generic sample.
  'widget.honesty.awaitingProducer': 'Sample — awaiting live PR producer (SOMO / Grid)',
  // Harvest-gated (SDC-1): the forecast publications the planner consolidates
  // are SIMULATED fixtures on the C8 grain until the real SOMO C8 feed lands.
  'widget.honesty.awaitingC8Feed': 'Sample — awaiting SOMO C8 feed',
  'widget.honesty.awaitingSupplierIdentities': 'Sample — awaiting real supplier identities',
  // Harvest-gated (SDC-3b): the InventoryDeclaration target is wired, but the SOH
  // shown is SIMULATED until real supplier identities submit over a live portal (F1).
  'widget.honesty.awaitingSupplierFeed': 'Sample — awaiting live supplier feed',
  // DISCOVERY-REAL-SUBJECTS-01 (C) — the discovery candidate pool has no source.
  'widget.honesty.awaitingDiscoveryFeed': 'Sample — awaiting supplier-discovery feed',
  // D-CENSUS-8 — the VERB axis of ProvenanceMarker. Says the narrow true thing
  // and no more: acting here really dispatches and is really recorded, in an
  // in-memory ledger that does not survive a reload and never reaches SAP.
  // Deliberately NOT "Live" and deliberately not green — the feed is still fixture.
  'widget.honesty.commandsDispatch': 'Commands dispatch — in-memory ledger',
  // The PER-VALUE axis (`SessionStampMarker`), distinct from the feed axis above:
  // one rendered timestamp was minted by the store from the wall clock when the
  // act was dispatched, while the surrounding fixtures are shifted onto the
  // declared present. `{{date}}` is `formatDate(DECLARED_PRESENT)`, derived at
  // render — never a literal, so the sentence cannot carry an older present.
  //
  // ⚠️ IT CLAIMS NOTHING ABOUT THE CERTIFICATE and nothing about the OTHER dates
  // on the page: a seeded row can render past `P` — a certificate `expiryDate`
  // is a HORIZON and several on that surface do, `doc-002`'s furthest of them —
  // so "the rest of the portal is dated {{date}}" would be false where it shows.
  'widget.honesty.sessionStamp': 'Recorded this session',
  'widget.honesty.sessionStampNote':
    "Written from this device's clock at the moment the action was recorded, not from this portal's fixed demonstration present of {{date}}.",
  'widget.allClear': 'All clear',
  'widget.aria.expand': 'Expand {{title}}',
  'widget.aria.show': 'Show {{title}}',
  'widget.aria.collapse': 'Collapse {{title}}',
  'widget.aria.closeFullscreen': 'Close fullscreen',
  // — Orders to confirm (Supplier) —
  'widget.ordersToConfirm.title': 'Orders to confirm',
  'widget.ordersToConfirm.action': 'Confirm orders',
  'widget.ordersToConfirm.flag': '{{count}} awaiting confirmation',
  // — Inbound shipments / ASN (Buyer) —
  'widget.asnInbound.title': 'Inbound shipments (ASN)',
  'widget.asnInbound.action': 'View inbound',
  'widget.asnInbound.flag.withDiscrepancy': '{{count}} inbound · {{discrepancy}} discrepancy',
  'widget.asnInbound.flag.plain': '{{count}} inbound',
  // — Compliance / expiring certs (Buyer) —
  'widget.compliance.title': 'Compliance — expiring certs',
  'widget.compliance.action': 'View compliance',
  'widget.compliance.flag.withExpired': '{{count}} flagged · {{expired}} expired',
  'widget.compliance.flag.expiring': '{{count}} expiring',
  // — Goods receipts / 3-way match (Buyer) —
  'widget.goodsReceipt.title': 'Goods receipts — 3-way match',
  'widget.goodsReceipt.action': 'Review receipts',
  'widget.goodsReceipt.flag.withVariance': '{{count}} to review · {{variance}} variance',
  'widget.goodsReceipt.flag.plain': '{{count}} to review',
  // — Inventory / low stock (Buyer) —
  'widget.inventory.title': 'Inventory — low stock',
  'widget.inventory.action': 'View inventory',
  'widget.inventory.flag.withCritical': '{{count}} low · {{critical}} critical',
  'widget.inventory.flag.plain': '{{count}} low',
  // — Invoices / AP aging (Buyer) —
  'widget.invoiceAging.title': 'Invoices — AP aging',
  'widget.invoiceAging.action': 'Open AP queue',
  'widget.invoiceAging.flag': '{{count}} overdue · {{maxDays}}d max',
  // — Open purchase orders (Buyer) —
  'widget.openPo.title': 'Open purchase orders',
  'widget.openPo.action': 'View open POs',
  'widget.openPo.flag': '{{count}} not yet acknowledged',
  // — RFQs awaiting award (Buyer) —
  'widget.rfqAward.title': 'RFQs awaiting award',
  'widget.rfqAward.action': 'Go to sourcing',
  'widget.rfqAward.held': 'Deadline status held until RFQ dates are anchored',
  'widget.rfqAward.flag.toAward': '{{count}} to award',
  // — Risk alerts (Buyer) —
  'widget.risk.title': 'Risk alerts',
  'widget.risk.action': 'View risk',
  'widget.risk.flag.withCritical': '{{count}} active · {{critical}} critical',
  'widget.risk.flag.active': '{{count}} active',
  // — Certificates / expiring (Supplier) —
  'widget.certsExpiring.title': 'Certificates — expiring',
  'widget.certsExpiring.action': 'View documents',
  'widget.certsExpiring.flag.expiring': '{{count}} expiring',
  'widget.certsExpiring.flag.expired': '{{count}} expired',
  'widget.certsExpiring.empty': 'No certificates expiring or expired.',
  'widget.certsExpiring.col.document': 'Document',
  'widget.certsExpiring.col.expires': 'Expires',
  'widget.certsExpiring.col.status': 'Status',
  'widget.certsExpiring.state.expired': 'Expired',
  'widget.certsExpiring.state.expiring': 'Expiring soon',
  // — Invoice payment (Supplier) —
  'widget.invoicePayment.title': 'Invoice payment',
  'widget.invoicePayment.action': 'View invoices',
  'widget.invoicePayment.flag.withOverdue': '{{count}} unpaid · {{overdue}} overdue',
  'widget.invoicePayment.flag.awaiting': '{{count}} awaiting payment',
  // — RFQs to respond (Supplier) —
  'widget.rfqRespond.title': 'RFQs to respond',
  'widget.rfqRespond.action': 'Respond',
  'widget.rfqRespond.flag.withLate': '{{count}} open · {{late}} past deadline',
  'widget.rfqRespond.flag.toRespond': '{{count}} to respond',
  // -- Expanded-table chrome (column headers + empty copy) -------------------
  // These were EN LITERALS inside each widget's `expandedRows`. The window
  // shell was localized and its table was not, so an Indonesian reader opened a
  // translated card onto an English table.
  'widget.row.open': 'Open {{record}}',
  'widget.invoiceAging.col.invoice': 'Invoice #',
  'widget.invoiceAging.col.supplier': 'Supplier',
  'widget.invoiceAging.col.amount': 'Amount',
  'widget.invoiceAging.col.daysPastDue': 'Days past due',
  'widget.invoiceAging.col.match': 'Match',
  'widget.invoiceAging.empty': 'No overdue invoices.',
  'widget.rfqAward.col.rfq': 'RFQ #',
  'widget.rfqAward.col.title': 'Title',
  'widget.rfqAward.col.quotes': 'Quotes',
  'widget.rfqAward.col.awardBy': 'Award by',
  'widget.rfqAward.col.status': 'Status',
  'widget.rfqAward.empty': 'No RFQs are awaiting an award decision.',
  'widget.openPo.col.po': 'PO #',
  'widget.openPo.col.supplier': 'Supplier',
  'widget.openPo.col.orderDate': 'Order date',
  'widget.openPo.col.status': 'Status',
  'widget.openPo.empty': 'No open purchase orders.',
  'widget.goodsReceipt.col.gr': 'GR #',
  'widget.goodsReceipt.col.po': 'PO #',
  'widget.goodsReceipt.col.supplier': 'Supplier',
  'widget.goodsReceipt.col.received': 'Received',
  'widget.goodsReceipt.col.status': 'Status',
  'widget.goodsReceipt.empty': 'No receipts are awaiting a decision.',
  'widget.asnInbound.col.asn': 'ASN #',
  'widget.asnInbound.col.poRef': 'PO ref',
  'widget.asnInbound.col.carrier': 'Carrier',
  'widget.asnInbound.col.eta': 'ETA',
  'widget.asnInbound.col.status': 'Status',
  'widget.asnInbound.empty': 'No inbound shipments.',
  'widget.inventory.col.material': 'Material',
  'widget.inventory.col.description': 'Description',
  'widget.inventory.col.onHand': 'On hand',
  'widget.inventory.col.daysSupply': 'Days supply',
  'widget.inventory.col.status': 'Status',
  'widget.inventory.empty': 'No low or blocked stock.',
  'widget.risk.col.level': 'Level',
  'widget.risk.col.alert': 'Alert',
  'widget.risk.col.detail': 'Detail',
  'widget.risk.empty': 'No active risk alerts.',
  'widget.compliance.col.supplier': 'Supplier',
  'widget.compliance.col.certificate': 'Certificate',
  'widget.compliance.col.expires': 'Expires',
  'widget.compliance.col.daysLeft': 'Days left',
  'widget.compliance.col.status': 'Status',
  'widget.compliance.empty': 'No certificates expiring or expired.',
  // — Buyer triage bar (BuyerAlertsBar) —
  'widget.alertsBar.allClear': 'All clear — no open exceptions',
  'widget.alertsBar.exception.one': 'open exception',
  'widget.alertsBar.exception.other': 'open exceptions',
  'widget.alertsBar.flag.overdueInvoices': 'Overdue invoices',
  'widget.alertsBar.flag.unackPo': 'Unacknowledged POs >48h',
  'widget.alertsBar.flag.rfqAward': 'RFQs awaiting award',
  'widget.alertsBar.flag.receiptsReview': 'Receipts to review',
  'widget.alertsBar.flag.inboundAsn': 'Inbound ASNs',
};

export const widgetId: Record<string, string> = {
  // — Shared shell (ExpandableWidget) —
  'widget.honesty.live': 'Langsung',
  'widget.honesty.sample': 'Sampel',
  'widget.honesty.awaitingHarvest': 'Sampel — menunggu panen data Track-R',
  'widget.honesty.awaitingProducer': 'Sampel — menunggu produsen PR live (SOMO / Grid)',
  'widget.honesty.awaitingC8Feed': 'Sampel — menunggu feed data C8 SOMO',
  'widget.honesty.awaitingSupplierIdentities': 'Sampel — menunggu identitas pemasok sungguhan',
  'widget.honesty.awaitingSupplierFeed': 'Sampel — menunggu feed pemasok live',
  'widget.honesty.awaitingDiscoveryFeed': 'Sampel — menunggu feed penemuan pemasok',
  'widget.honesty.commandsDispatch': 'Perintah dijalankan — buku besar in-memory',
  'widget.honesty.sessionStamp': 'Dicatat pada sesi ini',
  'widget.honesty.sessionStampNote':
    'Ditulis dari jam perangkat ini pada saat tindakan dicatat, bukan dari waktu kini tetap portal ini, yaitu {{date}}.',
  'widget.allClear': 'Semua beres',
  'widget.aria.expand': 'Perluas {{title}}',
  'widget.aria.show': 'Tampilkan {{title}}',
  'widget.aria.collapse': 'Ciutkan {{title}}',
  'widget.aria.closeFullscreen': 'Tutup layar penuh',
  // — Orders to confirm (Supplier) —
  'widget.ordersToConfirm.title': 'Pesanan untuk dikonfirmasi',
  'widget.ordersToConfirm.action': 'Konfirmasi pesanan',
  'widget.ordersToConfirm.flag': '{{count}} menunggu konfirmasi',
  // — Inbound shipments / ASN (Buyer) —
  'widget.asnInbound.title': 'Pengiriman masuk (ASN)',
  'widget.asnInbound.action': 'Lihat pengiriman masuk',
  'widget.asnInbound.flag.withDiscrepancy': '{{count}} masuk · {{discrepancy}} selisih',
  'widget.asnInbound.flag.plain': '{{count}} masuk',
  // — Compliance / expiring certs (Buyer) —
  'widget.compliance.title': 'Kepatuhan — sertifikat akan kedaluwarsa',
  'widget.compliance.action': 'Lihat kepatuhan',
  'widget.compliance.flag.withExpired': '{{count}} ditandai · {{expired}} kedaluwarsa',
  'widget.compliance.flag.expiring': '{{count}} akan kedaluwarsa',
  // — Goods receipts / 3-way match (Buyer) —
  'widget.goodsReceipt.title': 'Penerimaan barang — pencocokan tiga arah',
  'widget.goodsReceipt.action': 'Tinjau penerimaan',
  'widget.goodsReceipt.flag.withVariance': '{{count}} untuk ditinjau · {{variance}} selisih',
  'widget.goodsReceipt.flag.plain': '{{count}} untuk ditinjau',
  // — Inventory / low stock (Buyer) —
  'widget.inventory.title': 'Inventaris — stok rendah',
  'widget.inventory.action': 'Lihat inventaris',
  'widget.inventory.flag.withCritical': '{{count}} rendah · {{critical}} kritis',
  'widget.inventory.flag.plain': '{{count}} rendah',
  // — Invoices / AP aging (Buyer) —
  'widget.invoiceAging.title': 'Faktur — umur AP',
  'widget.invoiceAging.action': 'Buka antrean AP',
  'widget.invoiceAging.flag': '{{count}} jatuh tempo · maks {{maxDays}}h',
  // — Open purchase orders (Buyer) —
  'widget.openPo.title': 'Pesanan pembelian terbuka',
  'widget.openPo.action': 'Lihat PO terbuka',
  'widget.openPo.flag': '{{count}} belum diakui',
  // — RFQs awaiting award (Buyer) —
  'widget.rfqAward.title': 'RFQ menunggu pemenangan',
  'widget.rfqAward.action': 'Ke sourcing',
  'widget.rfqAward.held': 'Status tenggat ditahan sampai tanggal RFQ ditambatkan',
  'widget.rfqAward.flag.toAward': '{{count}} untuk dimenangkan',
  // — Risk alerts (Buyer) —
  'widget.risk.title': 'Peringatan risiko',
  'widget.risk.action': 'Lihat risiko',
  'widget.risk.flag.withCritical': '{{count}} aktif · {{critical}} kritis',
  'widget.risk.flag.active': '{{count}} aktif',
  // — Certificates / expiring (Supplier) —
  'widget.certsExpiring.title': 'Sertifikat — akan kedaluwarsa',
  'widget.certsExpiring.action': 'Lihat dokumen',
  'widget.certsExpiring.flag.expiring': '{{count}} akan kedaluwarsa',
  'widget.certsExpiring.flag.expired': '{{count}} kedaluwarsa',
  'widget.certsExpiring.empty': 'Tidak ada sertifikat yang akan atau telah kedaluwarsa.',
  'widget.certsExpiring.col.document': 'Dokumen',
  'widget.certsExpiring.col.expires': 'Kedaluwarsa',
  'widget.certsExpiring.col.status': 'Status',
  'widget.certsExpiring.state.expired': 'Kedaluwarsa',
  'widget.certsExpiring.state.expiring': 'Akan kedaluwarsa',
  // — Invoice payment (Supplier) —
  'widget.invoicePayment.title': 'Pembayaran faktur',
  'widget.invoicePayment.action': 'Lihat faktur',
  'widget.invoicePayment.flag.withOverdue': '{{count}} belum dibayar · {{overdue}} jatuh tempo',
  'widget.invoicePayment.flag.awaiting': '{{count}} menunggu pembayaran',
  // — RFQs to respond (Supplier) —
  'widget.rfqRespond.title': 'RFQ untuk direspons',
  'widget.rfqRespond.action': 'Respons',
  'widget.rfqRespond.flag.withLate': '{{count}} terbuka · {{late}} lewat tenggat',
  'widget.rfqRespond.flag.toRespond': '{{count}} untuk direspons',
  // -- Expanded-table chrome (column headers + empty copy) -------------------
  'widget.row.open': 'Buka {{record}}',
  'widget.invoiceAging.col.invoice': 'No. faktur',
  'widget.invoiceAging.col.supplier': 'Pemasok',
  'widget.invoiceAging.col.amount': 'Jumlah',
  'widget.invoiceAging.col.daysPastDue': 'Hari lewat tempo',
  'widget.invoiceAging.col.match': 'Pencocokan',
  'widget.invoiceAging.empty': 'Tidak ada faktur jatuh tempo.',
  'widget.rfqAward.col.rfq': 'No. RFQ',
  'widget.rfqAward.col.title': 'Judul',
  'widget.rfqAward.col.quotes': 'Penawaran',
  'widget.rfqAward.col.awardBy': 'Tetapkan sebelum',
  'widget.rfqAward.col.status': 'Status',
  'widget.rfqAward.empty': 'Tidak ada RFQ yang menunggu keputusan penetapan.',
  'widget.openPo.col.po': 'No. PO',
  'widget.openPo.col.supplier': 'Pemasok',
  'widget.openPo.col.orderDate': 'Tanggal pesanan',
  'widget.openPo.col.status': 'Status',
  'widget.openPo.empty': 'Tidak ada pesanan pembelian terbuka.',
  'widget.goodsReceipt.col.gr': 'No. GR',
  'widget.goodsReceipt.col.po': 'No. PO',
  'widget.goodsReceipt.col.supplier': 'Pemasok',
  'widget.goodsReceipt.col.received': 'Diterima',
  'widget.goodsReceipt.col.status': 'Status',
  'widget.goodsReceipt.empty': 'Tidak ada penerimaan yang menunggu keputusan.',
  'widget.asnInbound.col.asn': 'No. ASN',
  'widget.asnInbound.col.poRef': 'Ref. PO',
  'widget.asnInbound.col.carrier': 'Pengangkut',
  'widget.asnInbound.col.eta': 'Perkiraan tiba',
  'widget.asnInbound.col.status': 'Status',
  'widget.asnInbound.empty': 'Tidak ada pengiriman masuk.',
  'widget.inventory.col.material': 'Material',
  'widget.inventory.col.description': 'Deskripsi',
  'widget.inventory.col.onHand': 'Tersedia',
  'widget.inventory.col.daysSupply': 'Hari pasokan',
  'widget.inventory.col.status': 'Status',
  'widget.inventory.empty': 'Tidak ada stok rendah atau diblokir.',
  'widget.risk.col.level': 'Tingkat',
  'widget.risk.col.alert': 'Peringatan',
  'widget.risk.col.detail': 'Rincian',
  'widget.risk.empty': 'Tidak ada peringatan risiko aktif.',
  'widget.compliance.col.supplier': 'Pemasok',
  'widget.compliance.col.certificate': 'Sertifikat',
  'widget.compliance.col.expires': 'Kedaluwarsa',
  'widget.compliance.col.daysLeft': 'Sisa hari',
  'widget.compliance.col.status': 'Status',
  'widget.compliance.empty': 'Tidak ada sertifikat yang kedaluwarsa atau akan kedaluwarsa.',
  // — Buyer triage bar (BuyerAlertsBar) —
  'widget.alertsBar.allClear': 'Semua beres — tidak ada pengecualian terbuka',
  'widget.alertsBar.exception.one': 'pengecualian terbuka',
  'widget.alertsBar.exception.other': 'pengecualian terbuka',
  'widget.alertsBar.flag.overdueInvoices': 'Faktur jatuh tempo',
  'widget.alertsBar.flag.unackPo': 'PO belum diakui >48j',
  'widget.alertsBar.flag.rfqAward': 'RFQ menunggu pemenangan',
  'widget.alertsBar.flag.receiptsReview': 'Penerimaan untuk ditinjau',
  'widget.alertsBar.flag.inboundAsn': 'ASN masuk',
};
