// ────────────────────────────────────────────────────────────────────────────
// i18n primitive (Phase 0.6; extended v2.2 I18N-01).
//
// react-i18next pipeline. Bilingual EN/ID is a platform requirement (I18N-01):
// strings are externalized as keys, ID-first for supplier surfaces. The
// PO-confirm proof (Step 3.10) is the FIRST surface on the pattern — its keys
// carry real EN + an ID stub. The existing-page key sweep is Phase 3′; new
// surfaces use keys from here on. English stays the default runtime locale
// until the sweep flips ID-first.
// ────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { statusResourcesEn, statusResourcesId } from './statusLabel';
import { enumResourcesEn, enumResourcesId } from './priorityLabel';
import { modeResourcesEn, modeResourcesId } from './modeLabel';
import { categoryResourcesEn, categoryResourcesId } from './categoryLabel';
import { channelResourcesEn, channelResourcesId } from './channelLabel';
import { registrationEn, registrationId } from './i18n/registration';
import { contractsEn, contractsId } from './i18n/contracts';
import { buyerWhatsAppEn, buyerWhatsAppId } from './i18n/buyerWhatsApp';
import { supplierWhatsAppEn, supplierWhatsAppId } from './i18n/supplierWhatsApp';
import { sourcingEn, sourcingId } from './i18n/sourcing';
import { rfqsEn, rfqsId } from './i18n/rfqs';
import { requisitionsEn, requisitionsId } from './i18n/requisitions';
import { buyerOrdersEn, buyerOrdersId } from './i18n/buyerOrders';
import { goodsReceiptEn, goodsReceiptId } from './i18n/goodsReceipt';
import { discoveryEn, discoveryId } from './i18n/discovery';
import { riskEn, riskId } from './i18n/risk';
import { shipmentsEn, shipmentsId } from './i18n/shipments';
import { complianceEn, complianceId } from './i18n/compliance';
import { supplierDashboardEn, supplierDashboardId } from './i18n/supplierDashboard';
import { widgetEn, widgetId } from './i18n/widget';
import { supplierOrdersEn, supplierOrdersId } from './i18n/supplierOrders';
import { supplierShipmentsEn, supplierShipmentsId } from './i18n/supplierShipments';
import { supplierInvoicesEn, supplierInvoicesId } from './i18n/supplierInvoices';
import { supplierDocumentsEn, supplierDocumentsId } from './i18n/supplierDocuments';
import { learnEn, learnId } from './i18n/learn';
// — Batch 6 (tail sweep) —
import { buyerSuppliersEn, buyerSuppliersId } from './i18n/buyerSuppliers';
import { buyerSupplierProfileEn, buyerSupplierProfileId } from './i18n/buyerSupplierProfile';
import { buyerAnalyticsEn, buyerAnalyticsId } from './i18n/buyerAnalytics';
import { buyerScorecardEn, buyerScorecardId } from './i18n/buyerScorecard';
import { buyerInventoryEn, buyerInventoryId } from './i18n/buyerInventory';
import { marketplaceEn, marketplaceId } from './i18n/marketplace';
import { buyerDashboardEn, buyerDashboardId } from './i18n/buyerDashboard';
import { supplierMyStorefrontEn, supplierMyStorefrontId } from './i18n/supplierMyStorefront';
import { supplierStorefrontEn, supplierStorefrontId } from './i18n/supplierStorefront';
import { supplierInventoryEn, supplierInventoryId } from './i18n/supplierInventory';
import { supplierPerformanceEn, supplierPerformanceId } from './i18n/supplierPerformance';
// — Coverage sweep (sprint close) —
import { buyerInvoicesEn, buyerInvoicesId } from './i18n/buyerInvoices';
// — Stage G · G1.2a plan grid —
import { planGridEn, planGridId } from './i18n/planGrid';
// — Phase A/1 intake review (sourcing spine) —
import { intakeReviewEn, intakeReviewId } from './i18n/intakeReview';
// — SDC-1b planner consolidation (Supplier Data Collaboration) —
import { sdcConsolidationEn, sdcConsolidationId } from './i18n/sdcConsolidation';
// — SDC-2b P1 supplier forecast-confirmation surface —
import { sdcSupplierEn, sdcSupplierId } from './i18n/sdcSupplier';

// Persisted language choice (Batch 0). Non-VITE key; plain localStorage.
export const LANG_STORAGE_KEY = 'paragon.lang';
export type AppLang = 'en' | 'id';

function initialLng(): AppLang {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  }
  return 'en';
}

export const resources = {
  en: {
    translation: {
      ...statusResourcesEn,
      ...enumResourcesEn,
      ...modeResourcesEn,
      ...categoryResourcesEn,
      ...channelResourcesEn,
      ...registrationEn,
      ...contractsEn,
      ...buyerWhatsAppEn,
      ...supplierWhatsAppEn,
      ...sourcingEn,
      ...rfqsEn,
      ...requisitionsEn,
      ...buyerOrdersEn,
      ...goodsReceiptEn,
      ...discoveryEn,
      ...riskEn,
      ...shipmentsEn,
      ...complianceEn,
      ...supplierDashboardEn,
      ...widgetEn,
      ...supplierOrdersEn,
      ...supplierShipmentsEn,
      ...supplierInvoicesEn,
      ...supplierDocumentsEn,
      // — Batch 6 (tail sweep) —
      ...buyerSuppliersEn,
      ...buyerSupplierProfileEn,
      ...buyerAnalyticsEn,
      ...buyerScorecardEn,
      ...buyerInventoryEn,
      ...marketplaceEn,
      ...buyerDashboardEn,
      ...supplierMyStorefrontEn,
      ...supplierStorefrontEn,
      ...supplierInventoryEn,
      ...supplierPerformanceEn,
      // — Coverage sweep (sprint close) —
      ...buyerInvoicesEn,
      // — Stage G · G1.2a plan grid —
      ...planGridEn,
      // — Phase A/1 intake review (sourcing spine) —
      ...intakeReviewEn,
      // — SDC-1b planner consolidation —
      ...sdcConsolidationEn,
      // — SDC-2b supplier forecast confirmations —
      ...sdcSupplierEn,
      // — I3.4 halal-renewal walkthrough (FORK-1=(c)) —
      ...learnEn,
      'app.title': 'Paragon Supplier Portal',
      // — Shared chrome: sidebar nav (Batch 0, translate-once) —
      'nav.section.acquire': 'Acquire',
      'nav.section.transact': 'Transact',
      'nav.section.settle': 'Settle',
      'nav.section.intelligence': 'Intelligence',
      'nav.persona.buyer': 'Buyer',
      'nav.persona.supplier': 'Supplier',
      'nav.buyer.dashboard': 'Dashboard',
      'nav.buyer.discovery': 'Discovery',
      'nav.buyer.marketplace': 'Marketplace',
      'nav.buyer.suppliers': 'Suppliers',
      'nav.buyer.sourcing': 'Sourcing & RFQ',
      'nav.buyer.intakeReview': 'Intake Review',
      'nav.buyer.planGrid': 'Plan Grid',
      'nav.buyer.collaboration': 'Supplier Collaboration',
      'nav.buyer.requisitions': 'Requisitions',
      'nav.buyer.purchaseOrders': 'Purchase Orders',
      'nav.buyer.inventory': 'Inventory Visibility',
      'nav.buyer.shipments': 'Shipments',
      'nav.buyer.goodsReceipt': 'Goods Receipt',
      'nav.buyer.invoices': 'Invoices',
      'nav.buyer.contracts': 'Contracts',
      'nav.buyer.deliveryAgreements': 'Delivery Agreements',
      'nav.buyer.analytics': 'Analytics',
      'nav.buyer.scorecard': 'Scorecard',
      'nav.buyer.risk': 'Risk',
      'nav.buyer.compliance': 'Compliance',
      'nav.buyer.whatsapp': 'WhatsApp Hub',
      'nav.supplier.dashboard': 'Dashboard',
      'nav.supplier.rfqs': 'RFQs',
      'nav.supplier.forecasts': 'Forecasts',
      'nav.supplier.storefront': 'My Storefront',
      'nav.supplier.orders': 'My Orders',
      'nav.supplier.shipments': 'Shipments & ASN',
      'nav.supplier.inventory': 'My Inventory',
      'nav.supplier.invoices': 'Invoices',
      'nav.supplier.documents': 'Documents',
      'nav.supplier.performance': 'Performance',
      'nav.supplier.whatsapp': 'WhatsApp Hub',
      // — Delivery Agreement drawdown/compliance surface (read-only, SIMULATED) —
      'delivery.crumb.settle': 'Settle',
      'delivery.crumb.title': 'Delivery Agreements',
      'delivery.header.title': 'Delivery Agreements',
      'delivery.header.subtitle':
        'Scheduling-agreement drawdown and release fulfillment across suppliers — read-only.',
      'delivery.empty': 'No delivery agreements in scope.',
      'delivery.meta.summary': '{{count}} agreements · sample data, as of {{date}}',
      'delivery.honesty.title': 'Read-only, simulated feed.',
      'delivery.honesty.body':
        'This view derives drawdown and fulfillment from fixture data. Nothing here dispatches, releases, or posts to SAP.',
      'delivery.agreement.sapNumber': 'SAP agreement',
      'delivery.agreement.contract': 'Contract',
      'delivery.agreement.draftNote': 'Drafted — no releases transmitted yet.',
      'delivery.item.releaseType.FRC': 'Forecast (semi-firm)',
      'delivery.item.releaseType.JIT': 'Just-in-time (firm)',
      'delivery.policy.governed': 'Governed — flag over {{pct}}%',
      'delivery.policy.reference': 'Reference envelope — not enforced',
      'delivery.policy.deviation': 'Active policy changed from contract default',
      'delivery.kpi.agreed': 'Agreed',
      'delivery.kpi.released': 'Released',
      'delivery.kpi.delivered': 'Delivered',
      'delivery.kpi.remaining': 'Remaining',
      'delivery.drawdown.label': '{{pct}}% released of agreed',
      'delivery.calendar.title': 'Release calendar',
      'delivery.calendar.seq': '#',
      'delivery.calendar.date': 'Release date',
      'delivery.calendar.planned': 'Planned',
      'delivery.calendar.state': 'State',
      'delivery.calendar.fulfillment': 'Fulfillment',
      'delivery.calendar.drawdownCol': 'Drawn down',
      'delivery.calendar.varianceSuffix': 'vs planned',
      'delivery.calendar.etaFootnote':
        'On-time vs. late is computed against the shipment’s estimated arrival (ETA); the posted goods-receipt date arrives with the S/4HANA feed.',
      'delivery.state.draft': 'Draft',
      'delivery.state.released': 'Released',
      'delivery.fulfillment.pending': 'Pending',
      'delivery.fulfillment.fulfilled': 'Fulfilled',
      'delivery.fulfillment.late': 'Late',
      'delivery.fulfillment.missed': 'Missed',
      'delivery.match.proposed': 'proposed — matched by proximity',
      'delivery.rollup.hint': 'Open a contract to see its full delivery agreement.',
      // — Shared chrome: top bar —
      'topbar.search': 'Search... (Ctrl K)',
      'topbar.toggleNav': 'Toggle navigation',
      'topbar.notifications': 'Notifications',
      'topbar.userAvatar': 'User avatar',
      'topbar.language': 'Language',
      // — PO confirm (Step 3.10 proof surface) —
      'po.confirm.action': 'Confirm order',
      'po.confirm.submitting': 'Confirming…',
      'po.confirm.success.title': '{{poNumber}} confirmed',
      'po.confirm.success.desc': '{{correlationId}} recorded. Procurement notification pending live channel.',
      'po.confirm.failed.title': 'Could not confirm {{poNumber}}',
      'po.confirm.failed.desc': 'The order could not be confirmed ({{reason}}).',
      'po.confirm.denied.title': 'Not authorized',
      'po.confirm.denied.desc': 'You are not authorized to confirm this order.',
      // — ASN create / submit (Step 4 batch i) —
      'asn.create.action': 'Create ASN',
      'asn.submit.action': 'Submit',
      'asn.create.success.title': '{{asnNumber}} drafted',
      'asn.create.success.desc': 'Draft created from {{poNumber}}. {{correlationId}} recorded.',
      'asn.create.failed.title': 'Could not create ASN',
      'asn.create.failed.desc': 'The ASN could not be drafted ({{reason}}).',
      'asn.submit.success.title': '{{asnNumber}} submitted',
      'asn.submit.success.desc': '{{correlationId}} recorded. WMS transmission pending live channel.',
      'asn.submit.failed.title': 'Could not submit {{asnNumber}}',
      'asn.submit.failed.desc': 'Submission was rejected ({{reason}}).',
      'asn.submit.missingFields': 'Carrier, tracking number and ETA are required. ({{code}})',
      'asn.submit.confirm': 'Submit ASN',
      'asn.submit.form.intro': 'Provide the carrier, tracking number, and ETA for {{poNumber}}.',
      'asn.submit.form.carrier': 'Carrier',
      'asn.submit.form.tracking': 'Tracking number',
      'asn.submit.form.eta': 'Estimated arrival',
      'asn.denied.title': 'Not authorized',
      'asn.denied.desc': 'You are not authorized to act on this shipment.',
      'asn.discrepancy.deferred.title': 'Discrepancy handling pending',
      'asn.discrepancy.deferred.desc': 'Opens with goods-receipt reconciliation (pending live channel).',
      // — Goods receipt verbs (Step 4 batch ii) —
      'gr.create.action': 'New GR',
      'gr.create.success.title': '{{grNumber}} received',
      'gr.create.success.desc': '{{correlationId}} recorded. Inspection recorded at receipt.',
      'gr.create.failed.title': 'Could not create goods receipt',
      'gr.create.failed.desc': 'The goods receipt could not be created ({{reason}}).',
      'gr.dispose.success.title': '{{grNumber}} — {{disposition}}',
      'gr.dispose.success.desc': '{{correlationId}} recorded. Header disposition derived from the inspected lines.',
      'gr.dispose.failed.title': 'Could not finalize {{grNumber}}',
      'gr.dispose.failed.desc': 'Disposition was rejected ({{reason}}).',
      'gr.dispose.missingReason': 'A rejection reason is required to reject this receipt.',
      'gr.post.action': 'Post to SAP',
      'gr.post.posting.title': '{{grNumber}} posting to SAP',
      'gr.post.posting.desc': 'Submitted to SAP — awaiting the material-document callback. No document assigned yet.',
      'gr.post.posted.title': '{{grNumber}} posted to SAP',
      'gr.post.posted.desc': 'SAP assigned the material document on settlement.',
      'gr.post.failed.title': 'Could not post {{grNumber}}',
      'gr.post.failed.desc': 'Posting was rejected ({{reason}}).',
      'gr.denied.title': 'Not authorized',
      'gr.denied.desc': 'You are not authorized to act on this goods receipt.',
      // — Invoice verbs (Step 4 batch iii, DR-7) —
      'invoice.create.action': 'New invoice',
      'invoice.create.success.title': '{{invoiceNumber}} drafted',
      'invoice.create.success.desc': 'Draft created against {{poNumber}}. {{correlationId}} recorded.',
      'invoice.create.failed.title': 'Could not create invoice',
      'invoice.create.failed.desc': 'The invoice could not be drafted ({{reason}}).',
      'invoice.submit.action': 'Submit',
      'invoice.submit.success.title': '{{invoiceNumber}} submitted for approval',
      'invoice.submit.success.desc': '{{correlationId}} recorded. Awaiting 3-way match and approval.',
      'invoice.submit.failed.title': 'Could not submit {{invoiceNumber}}',
      'invoice.submit.failed.desc': 'Submission was rejected ({{reason}}).',
      'invoice.dispute.success.title': '{{invoiceNumber}} disputed',
      'invoice.dispute.success.desc': '{{correlationId}} recorded. Credit note required before payment.',
      'invoice.dispute.failed.title': 'Could not dispute {{invoiceNumber}}',
      'invoice.dispute.failed.desc': 'The dispute was rejected ({{reason}}).',
      'invoice.dispute.missingReason': 'A dispute reason is required.',
      'invoice.resolve.success.title': '{{invoiceNumber}} dispute resolved',
      'invoice.resolve.success.desc': '{{correlationId}} recorded. Returned for re-match.',
      'invoice.resolve.failed.title': 'Could not resolve {{invoiceNumber}}',
      'invoice.resolve.failed.desc': 'Resolution was rejected ({{reason}}).',
      'invoice.pay.action': 'Release payment',
      // Honest: NO "paid" claim before settlement mints the FI document (law 0.6).
      'invoice.pay.releasing.title': '{{invoiceNumber}} — releasing payment',
      'invoice.pay.releasing.desc': 'Submitted to SAP for payment — awaiting the FI-document callback. No payment posted yet.',
      'invoice.pay.released.title': '{{invoiceNumber}} — payment released',
      'invoice.pay.released.desc': 'SAP assigned the FI document on settlement.',
      'invoice.pay.failed.title': 'Could not release payment for {{invoiceNumber}}',
      'invoice.pay.failed.desc': 'Payment release was rejected ({{reason}}).',
      'invoice.match.deferred.title': 'Awaiting 3-way match',
      'invoice.match.deferred.desc': 'Match completes on goods-receipt posting in SAP.',
      'invoice.remittance.generated.title': 'Remittance advice generated',
      'invoice.remittance.generated.desc': 'Available to the supplier via {{channel}}.',
      'invoice.denied.title': 'Not authorized',
      'invoice.denied.desc': 'You are not authorized to act on this invoice.',
    },
  },
  id: {
    translation: {
      ...statusResourcesId,
      ...enumResourcesId,
      ...modeResourcesId,
      ...categoryResourcesId,
      ...channelResourcesId,
      ...registrationId,
      ...contractsId,
      ...buyerWhatsAppId,
      ...supplierWhatsAppId,
      ...sourcingId,
      ...rfqsId,
      ...requisitionsId,
      ...buyerOrdersId,
      ...goodsReceiptId,
      ...discoveryId,
      ...riskId,
      ...shipmentsId,
      ...complianceId,
      ...supplierDashboardId,
      ...widgetId,
      ...supplierOrdersId,
      ...supplierShipmentsId,
      ...supplierInvoicesId,
      ...supplierDocumentsId,
      // — Batch 6 (tail sweep) —
      ...buyerSuppliersId,
      ...buyerSupplierProfileId,
      ...buyerAnalyticsId,
      ...buyerScorecardId,
      ...buyerInventoryId,
      ...marketplaceId,
      ...buyerDashboardId,
      ...supplierMyStorefrontId,
      ...supplierStorefrontId,
      ...supplierInventoryId,
      ...supplierPerformanceId,
      // — Coverage sweep (sprint close) —
      ...buyerInvoicesId,
      // — Stage G · G1.2a plan grid —
      ...planGridId,
      // — Phase A/1 intake review (sourcing spine) —
      ...intakeReviewId,
      // — SDC-1b planner consolidation —
      ...sdcConsolidationId,
      // — SDC-2b supplier forecast confirmations —
      ...sdcSupplierId,
      // — I3.4 halal-renewal walkthrough (FORK-1=(c)) —
      ...learnId,
      'app.title': 'Portal Pemasok Paragon',
      // — Shared chrome: sidebar nav (Batch 0, translate-once) —
      'nav.section.acquire': 'Pengadaan',
      'nav.section.transact': 'Transaksi',
      'nav.section.settle': 'Penyelesaian',
      'nav.section.intelligence': 'Intelijen',
      'nav.persona.buyer': 'Pembeli',
      'nav.persona.supplier': 'Pemasok',
      'nav.buyer.dashboard': 'Dasbor',
      'nav.buyer.discovery': 'Penemuan',
      'nav.buyer.marketplace': 'Pasar',
      'nav.buyer.suppliers': 'Pemasok',
      'nav.buyer.sourcing': 'Sumber & RFQ',
      'nav.buyer.intakeReview': 'Tinjauan Asupan',
      'nav.buyer.planGrid': 'Grid Perencanaan',
      'nav.buyer.collaboration': 'Kolaborasi Pemasok',
      'nav.buyer.requisitions': 'Permintaan Pembelian',
      'nav.buyer.purchaseOrders': 'Pesanan Pembelian',
      'nav.buyer.inventory': 'Visibilitas Inventaris',
      'nav.buyer.shipments': 'Pengiriman',
      'nav.buyer.goodsReceipt': 'Penerimaan Barang',
      'nav.buyer.invoices': 'Faktur',
      'nav.buyer.contracts': 'Kontrak',
      'nav.buyer.deliveryAgreements': 'Perjanjian Pengiriman',
      'nav.buyer.analytics': 'Analitik',
      'nav.buyer.scorecard': 'Kartu Skor',
      'nav.buyer.risk': 'Risiko',
      'nav.buyer.compliance': 'Kepatuhan',
      'nav.buyer.whatsapp': 'Pusat WhatsApp',
      'nav.supplier.dashboard': 'Dasbor',
      'nav.supplier.rfqs': 'RFQ',
      'nav.supplier.forecasts': 'Prakiraan',
      'nav.supplier.storefront': 'Etalase Saya',
      'nav.supplier.orders': 'Pesanan Saya',
      'nav.supplier.shipments': 'Pengiriman & ASN',
      'nav.supplier.inventory': 'Inventaris Saya',
      'nav.supplier.invoices': 'Faktur',
      'nav.supplier.documents': 'Dokumen',
      'nav.supplier.performance': 'Kinerja',
      'nav.supplier.whatsapp': 'Pusat WhatsApp',
      // — Delivery Agreement drawdown/compliance surface (read-only, SIMULATED) —
      'delivery.crumb.settle': 'Penyelesaian',
      'delivery.crumb.title': 'Perjanjian Pengiriman',
      'delivery.header.title': 'Perjanjian Pengiriman',
      'delivery.header.subtitle':
        'Penarikan perjanjian penjadwalan dan pemenuhan rilis lintas pemasok — hanya-baca.',
      'delivery.empty': 'Tidak ada perjanjian pengiriman dalam cakupan.',
      'delivery.meta.summary': '{{count}} perjanjian · data contoh, per {{date}}',
      'delivery.honesty.title': 'Hanya-baca, umpan simulasi.',
      'delivery.honesty.body':
        'Tampilan ini menurunkan penarikan dan pemenuhan dari data contoh. Tidak ada yang dikirim, dirilis, atau diposkan ke SAP di sini.',
      'delivery.agreement.sapNumber': 'Perjanjian SAP',
      'delivery.agreement.contract': 'Kontrak',
      'delivery.agreement.draftNote': 'Draf — belum ada rilis yang dikirim.',
      'delivery.item.releaseType.FRC': 'Prakiraan (semi-tetap)',
      'delivery.item.releaseType.JIT': 'Just-in-time (tetap)',
      'delivery.policy.governed': 'Terkendali — tandai di atas {{pct}}%',
      'delivery.policy.reference': 'Amplop referensi — tidak ditegakkan',
      'delivery.policy.deviation': 'Kebijakan aktif berubah dari default kontrak',
      'delivery.kpi.agreed': 'Disepakati',
      'delivery.kpi.released': 'Dirilis',
      'delivery.kpi.delivered': 'Terkirim',
      'delivery.kpi.remaining': 'Sisa',
      'delivery.drawdown.label': '{{pct}}% dirilis dari yang disepakati',
      'delivery.calendar.title': 'Kalender rilis',
      'delivery.calendar.seq': '#',
      'delivery.calendar.date': 'Tanggal rilis',
      'delivery.calendar.planned': 'Direncanakan',
      'delivery.calendar.state': 'Status',
      'delivery.calendar.fulfillment': 'Pemenuhan',
      'delivery.calendar.drawdownCol': 'Ditarik',
      'delivery.calendar.varianceSuffix': 'vs rencana',
      'delivery.calendar.etaFootnote':
        'Tepat waktu vs. terlambat dihitung terhadap perkiraan kedatangan (ETA) pengiriman; tanggal penerimaan barang yang diposkan tiba bersama umpan S/4HANA.',
      'delivery.state.draft': 'Draf',
      'delivery.state.released': 'Dirilis',
      'delivery.fulfillment.pending': 'Menunggu',
      'delivery.fulfillment.fulfilled': 'Terpenuhi',
      'delivery.fulfillment.late': 'Terlambat',
      'delivery.fulfillment.missed': 'Terlewat',
      'delivery.match.proposed': 'usulan — dicocokkan berdasarkan kedekatan',
      'delivery.rollup.hint': 'Buka kontrak untuk melihat perjanjian pengirimannya secara lengkap.',
      // — Shared chrome: top bar —
      'topbar.search': 'Cari... (Ctrl K)',
      'topbar.toggleNav': 'Alihkan navigasi',
      'topbar.notifications': 'Notifikasi',
      'topbar.userAvatar': 'Avatar pengguna',
      'topbar.language': 'Bahasa',
      // — PO confirm (ID stub — refined in the Phase 3′ ID-first sweep) —
      'po.confirm.action': 'Konfirmasi pesanan',
      'po.confirm.submitting': 'Mengonfirmasi…',
      'po.confirm.success.title': '{{poNumber}} dikonfirmasi',
      'po.confirm.success.desc': '{{correlationId}} tercatat. Notifikasi pengadaan menunggu kanal langsung.',
      'po.confirm.failed.title': 'Tidak dapat mengonfirmasi {{poNumber}}',
      'po.confirm.failed.desc': 'Pesanan tidak dapat dikonfirmasi ({{reason}}).',
      'po.confirm.denied.title': 'Tidak berwenang',
      'po.confirm.denied.desc': 'Anda tidak berwenang mengonfirmasi pesanan ini.',
      // — ASN create / submit (ID stub — refined in the Phase 3′ ID-first sweep) —
      'asn.create.action': 'Buat ASN',
      'asn.submit.action': 'Kirim',
      'asn.create.success.title': '{{asnNumber}} dibuat',
      'asn.create.success.desc': 'Draf dibuat dari {{poNumber}}. {{correlationId}} tercatat.',
      'asn.create.failed.title': 'Tidak dapat membuat ASN',
      'asn.create.failed.desc': 'ASN tidak dapat dibuat ({{reason}}).',
      'asn.submit.success.title': '{{asnNumber}} dikirim',
      'asn.submit.success.desc': '{{correlationId}} tercatat. Transmisi WMS menunggu kanal langsung.',
      'asn.submit.failed.title': 'Tidak dapat mengirim {{asnNumber}}',
      'asn.submit.failed.desc': 'Pengiriman ditolak ({{reason}}).',
      'asn.submit.missingFields': 'Kurir, nomor pelacakan, dan ETA wajib diisi. ({{code}})',
      'asn.submit.confirm': 'Kirim ASN',
      'asn.submit.form.intro': 'Isi kurir, nomor pelacakan, dan ETA untuk {{poNumber}}.',
      'asn.submit.form.carrier': 'Kurir',
      'asn.submit.form.tracking': 'Nomor pelacakan',
      'asn.submit.form.eta': 'Perkiraan tiba',
      'asn.denied.title': 'Tidak berwenang',
      'asn.denied.desc': 'Anda tidak berwenang menindaklanjuti pengiriman ini.',
      'asn.discrepancy.deferred.title': 'Penanganan selisih tertunda',
      'asn.discrepancy.deferred.desc': 'Terbuka saat rekonsiliasi penerimaan barang (menunggu kanal langsung).',
      // — Goods receipt verbs (ID stub — refined in the Phase 3′ ID-first sweep) —
      'gr.create.action': 'GR Baru',
      'gr.create.success.title': '{{grNumber}} diterima',
      'gr.create.success.desc': '{{correlationId}} tercatat. Inspeksi dicatat saat penerimaan.',
      'gr.create.failed.title': 'Tidak dapat membuat penerimaan barang',
      'gr.create.failed.desc': 'Penerimaan barang tidak dapat dibuat ({{reason}}).',
      'gr.dispose.success.title': '{{grNumber}} — {{disposition}}',
      'gr.dispose.success.desc': '{{correlationId}} tercatat. Disposisi header diturunkan dari baris yang diinspeksi.',
      'gr.dispose.failed.title': 'Tidak dapat menyelesaikan {{grNumber}}',
      'gr.dispose.failed.desc': 'Disposisi ditolak ({{reason}}).',
      'gr.dispose.missingReason': 'Alasan penolakan wajib diisi untuk menolak penerimaan ini.',
      'gr.post.action': 'Kirim ke SAP',
      'gr.post.posting.title': '{{grNumber}} mengirim ke SAP',
      'gr.post.posting.desc': 'Dikirim ke SAP — menunggu callback dokumen material. Belum ada dokumen.',
      'gr.post.posted.title': '{{grNumber}} terkirim ke SAP',
      'gr.post.posted.desc': 'SAP menetapkan dokumen material saat penyelesaian.',
      'gr.post.failed.title': 'Tidak dapat mengirim {{grNumber}}',
      'gr.post.failed.desc': 'Pengiriman ditolak ({{reason}}).',
      'gr.denied.title': 'Tidak berwenang',
      'gr.denied.desc': 'Anda tidak berwenang menindaklanjuti penerimaan barang ini.',
      // — Invoice verbs (ID stub — refined in the Phase 3′ ID-first sweep) —
      'invoice.create.action': 'Faktur baru',
      'invoice.create.success.title': '{{invoiceNumber}} dibuat',
      'invoice.create.success.desc': 'Draf dibuat untuk {{poNumber}}. {{correlationId}} tercatat.',
      'invoice.create.failed.title': 'Tidak dapat membuat faktur',
      'invoice.create.failed.desc': 'Faktur tidak dapat dibuat ({{reason}}).',
      'invoice.submit.action': 'Kirim',
      'invoice.submit.success.title': '{{invoiceNumber}} dikirim untuk persetujuan',
      'invoice.submit.success.desc': '{{correlationId}} tercatat. Menunggu pencocokan 3 arah dan persetujuan.',
      'invoice.submit.failed.title': 'Tidak dapat mengirim {{invoiceNumber}}',
      'invoice.submit.failed.desc': 'Pengiriman ditolak ({{reason}}).',
      'invoice.dispute.success.title': '{{invoiceNumber}} disengketakan',
      'invoice.dispute.success.desc': '{{correlationId}} tercatat. Nota kredit diperlukan sebelum pembayaran.',
      'invoice.dispute.failed.title': 'Tidak dapat menyengketakan {{invoiceNumber}}',
      'invoice.dispute.failed.desc': 'Sengketa ditolak ({{reason}}).',
      'invoice.dispute.missingReason': 'Alasan sengketa wajib diisi.',
      'invoice.resolve.success.title': 'Sengketa {{invoiceNumber}} diselesaikan',
      'invoice.resolve.success.desc': '{{correlationId}} tercatat. Dikembalikan untuk pencocokan ulang.',
      'invoice.resolve.failed.title': 'Tidak dapat menyelesaikan {{invoiceNumber}}',
      'invoice.resolve.failed.desc': 'Penyelesaian ditolak ({{reason}}).',
      'invoice.pay.action': 'Rilis pembayaran',
      'invoice.pay.releasing.title': '{{invoiceNumber}} — merilis pembayaran',
      'invoice.pay.releasing.desc': 'Dikirim ke SAP untuk pembayaran — menunggu callback dokumen FI. Belum ada pembayaran.',
      'invoice.pay.released.title': '{{invoiceNumber}} — pembayaran dirilis',
      'invoice.pay.released.desc': 'SAP menetapkan dokumen FI saat penyelesaian.',
      'invoice.pay.failed.title': 'Tidak dapat merilis pembayaran untuk {{invoiceNumber}}',
      'invoice.pay.failed.desc': 'Rilis pembayaran ditolak ({{reason}}).',
      'invoice.match.deferred.title': 'Menunggu pencocokan 3 arah',
      'invoice.match.deferred.desc': 'Pencocokan selesai saat penerimaan barang diposting di SAP.',
      'invoice.remittance.generated.title': 'Bukti pembayaran dibuat',
      'invoice.remittance.generated.desc': 'Tersedia bagi pemasok melalui {{channel}}.',
      'invoice.denied.title': 'Tidak berwenang',
      'invoice.denied.desc': 'Anda tidak berwenang menindaklanjuti faktur ini.',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: initialLng(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18n;
