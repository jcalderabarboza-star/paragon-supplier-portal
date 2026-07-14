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
  'widget.openPo.flag': '{{count}} unacknowledged >48h',
  // — RFQs awaiting award (Buyer) —
  'widget.rfqAward.title': 'RFQs awaiting award',
  'widget.rfqAward.action': 'Go to sourcing',
  'widget.rfqAward.flag.withOverdue': '{{count}} pending · {{overdue}} past deadline',
  'widget.rfqAward.flag.toAward': '{{count}} to award',
  // — Risk alerts (Buyer) —
  'widget.risk.title': 'Risk alerts',
  'widget.risk.action': 'View risk',
  'widget.risk.flag.withCritical': '{{count}} active · {{critical}} critical',
  'widget.risk.flag.active': '{{count}} active',
  // — Certificates / expiring (Supplier) —
  'widget.certsExpiring.title': 'Certificates — expiring',
  'widget.certsExpiring.action': 'View documents',
  'widget.certsExpiring.flag.withExpired': '{{count}} flagged · {{expired}} expired',
  'widget.certsExpiring.flag.expiring': '{{count}} expiring',
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
  'widget.openPo.flag': '{{count}} belum diakui >48j',
  // — RFQs awaiting award (Buyer) —
  'widget.rfqAward.title': 'RFQ menunggu pemenangan',
  'widget.rfqAward.action': 'Ke sourcing',
  'widget.rfqAward.flag.withOverdue': '{{count}} menunggu · {{overdue}} lewat tenggat',
  'widget.rfqAward.flag.toAward': '{{count}} untuk dimenangkan',
  // — Risk alerts (Buyer) —
  'widget.risk.title': 'Peringatan risiko',
  'widget.risk.action': 'Lihat risiko',
  'widget.risk.flag.withCritical': '{{count}} aktif · {{critical}} kritis',
  'widget.risk.flag.active': '{{count}} aktif',
  // — Certificates / expiring (Supplier) —
  'widget.certsExpiring.title': 'Sertifikat — akan kedaluwarsa',
  'widget.certsExpiring.action': 'Lihat dokumen',
  'widget.certsExpiring.flag.withExpired': '{{count}} ditandai · {{expired}} kedaluwarsa',
  'widget.certsExpiring.flag.expiring': '{{count}} akan kedaluwarsa',
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
