import { describe, it, expect } from 'vitest';
import { resources } from '../i18n';
import { registrationEn, registrationId } from './registration';
import { contractsEn, contractsId } from './contracts';
import { buyerWhatsAppEn, buyerWhatsAppId } from './buyerWhatsApp';
import { supplierWhatsAppEn, supplierWhatsAppId } from './supplierWhatsApp';
import { sourcingEn, sourcingId } from './sourcing';
import { rfqsEn, rfqsId } from './rfqs';
import { requisitionsEn, requisitionsId } from './requisitions';
import { buyerOrdersEn, buyerOrdersId } from './buyerOrders';
import { goodsReceiptEn, goodsReceiptId } from './goodsReceipt';
import { discoveryEn, discoveryId } from './discovery';
import { riskEn, riskId } from './risk';
import { shipmentsEn, shipmentsId } from './shipments';
import { complianceEn, complianceId } from './compliance';
import { supplierDashboardEn, supplierDashboardId } from './supplierDashboard';
import { widgetEn, widgetId } from './widget';
import { supplierOrdersEn, supplierOrdersId } from './supplierOrders';
import { supplierShipmentsEn, supplierShipmentsId } from './supplierShipments';
import { supplierInvoicesEn, supplierInvoicesId } from './supplierInvoices';
import { supplierDocumentsEn, supplierDocumentsId } from './supplierDocuments';
// — Batch 6 (tail sweep) —
import { buyerSuppliersEn, buyerSuppliersId } from './buyerSuppliers';
import { buyerSupplierProfileEn, buyerSupplierProfileId } from './buyerSupplierProfile';
import { buyerAnalyticsEn, buyerAnalyticsId } from './buyerAnalytics';
import { buyerScorecardEn, buyerScorecardId } from './buyerScorecard';
import { buyerInventoryEn, buyerInventoryId } from './buyerInventory';
import { marketplaceEn, marketplaceId } from './marketplace';
import { buyerDashboardEn, buyerDashboardId } from './buyerDashboard';
import { supplierMyStorefrontEn, supplierMyStorefrontId } from './supplierMyStorefront';
import { supplierStorefrontEn, supplierStorefrontId } from './supplierStorefront';
import { supplierInventoryEn, supplierInventoryId } from './supplierInventory';
import { supplierPerformanceEn, supplierPerformanceId } from './supplierPerformance';
// — Coverage sweep (sprint close) —
import { buyerInvoicesEn, buyerInvoicesId } from './buyerInvoices';
// — I3.4 halal-renewal walkthrough (FORK-1=(c)) —
import { learnEn, learnId } from './learn';
// — Stage G · G1.2a plan grid —
import { planGridEn, planGridId } from './planGrid';
// — Phase A/1 intake review (sourcing spine) —
import { intakeReviewEn, intakeReviewId } from './intakeReview';
// — SDC-1b planner consolidation —
import { sdcConsolidationEn, sdcConsolidationId } from './sdcConsolidation';
// — SDC-2b P1 supplier forecast confirmations —
import { sdcSupplierEn, sdcSupplierId } from './sdcSupplier';
// — Comm Hub C2 inbound confirm-before-commit —
import { commHubInboundEn, commHubInboundId } from './commHubInbound';

// Page i18n fragments must keep EN/ID key sets in lockstep — a key present in EN
// but missing in ID silently falls back to English at runtime (an invisible
// untranslated string). This guard runs per batch as fragments are added.
const FRAGMENTS = [
  { name: 'registration', en: registrationEn, id: registrationId },
  { name: 'contracts', en: contractsEn, id: contractsId },
  { name: 'buyerWhatsApp', en: buyerWhatsAppEn, id: buyerWhatsAppId },
  { name: 'supplierWhatsApp', en: supplierWhatsAppEn, id: supplierWhatsAppId },
  { name: 'sourcing', en: sourcingEn, id: sourcingId },
  { name: 'rfqs', en: rfqsEn, id: rfqsId },
  { name: 'requisitions', en: requisitionsEn, id: requisitionsId },
  { name: 'buyerOrders', en: buyerOrdersEn, id: buyerOrdersId },
  { name: 'goodsReceipt', en: goodsReceiptEn, id: goodsReceiptId },
  { name: 'discovery', en: discoveryEn, id: discoveryId },
  { name: 'risk', en: riskEn, id: riskId },
  { name: 'shipments', en: shipmentsEn, id: shipmentsId },
  { name: 'compliance', en: complianceEn, id: complianceId },
  { name: 'supplierDashboard', en: supplierDashboardEn, id: supplierDashboardId },
  { name: 'widget', en: widgetEn, id: widgetId },
  { name: 'supplierOrders', en: supplierOrdersEn, id: supplierOrdersId },
  { name: 'supplierShipments', en: supplierShipmentsEn, id: supplierShipmentsId },
  { name: 'supplierInvoices', en: supplierInvoicesEn, id: supplierInvoicesId },
  { name: 'supplierDocuments', en: supplierDocumentsEn, id: supplierDocumentsId },
  // — Batch 6 (tail sweep) —
  { name: 'buyerSuppliers', en: buyerSuppliersEn, id: buyerSuppliersId },
  { name: 'buyerSupplierProfile', en: buyerSupplierProfileEn, id: buyerSupplierProfileId },
  { name: 'buyerAnalytics', en: buyerAnalyticsEn, id: buyerAnalyticsId },
  { name: 'buyerScorecard', en: buyerScorecardEn, id: buyerScorecardId },
  { name: 'buyerInventory', en: buyerInventoryEn, id: buyerInventoryId },
  { name: 'marketplace', en: marketplaceEn, id: marketplaceId },
  { name: 'buyerDashboard', en: buyerDashboardEn, id: buyerDashboardId },
  { name: 'supplierMyStorefront', en: supplierMyStorefrontEn, id: supplierMyStorefrontId },
  { name: 'supplierStorefront', en: supplierStorefrontEn, id: supplierStorefrontId },
  { name: 'supplierInventory', en: supplierInventoryEn, id: supplierInventoryId },
  { name: 'supplierPerformance', en: supplierPerformanceEn, id: supplierPerformanceId },
  // — Coverage sweep (sprint close) —
  { name: 'buyerInvoices', en: buyerInvoicesEn, id: buyerInvoicesId },
  // — I3.4 halal-renewal walkthrough (FORK-1=(c)) —
  { name: 'learn', en: learnEn, id: learnId },
  // — Stage G · G1.2a plan grid —
  { name: 'planGrid', en: planGridEn, id: planGridId },
  // — Phase A/1 intake review (sourcing spine) —
  { name: 'intakeReview', en: intakeReviewEn, id: intakeReviewId },
  // — SDC-1b planner consolidation —
  { name: 'sdcConsolidation', en: sdcConsolidationEn, id: sdcConsolidationId },
  // — SDC-2b P1 supplier forecast confirmations —
  { name: 'sdcSupplier', en: sdcSupplierEn, id: sdcSupplierId },
  // — Comm Hub C2 inbound confirm-before-commit —
  { name: 'commHubInbound', en: commHubInboundEn, id: commHubInboundId },
];

describe('page i18n fragments — EN/ID parity (SEAT2-I18N-BATCH)', () => {
  for (const { name, en, id } of FRAGMENTS) {
    it(`${name}: EN and ID expose the identical key set`, () => {
      const enKeys = Object.keys(en).sort();
      const idKeys = Object.keys(id).sort();
      expect(idKeys).toEqual(enKeys);
    });

    it(`${name}: no value is empty`, () => {
      for (const [k, v] of Object.entries(en)) expect(v, `en ${k}`).toBeTruthy();
      for (const [k, v] of Object.entries(id)) expect(v, `id ${k}`).toBeTruthy();
    });

    it(`${name}: every key is wired into the i18n resources (both locales)`, () => {
      const en2 = resources.en.translation as Record<string, string>;
      const id2 = resources.id.translation as Record<string, string>;
      for (const k of Object.keys(en)) {
        expect(en2[k], `en resources ${k}`).toBeDefined();
        expect(id2[k], `id resources ${k}`).toBeDefined();
      }
    });
  }

  it('ID differs from EN for a meaningful share (real translation, not copy)', () => {
    for (const { name, en, id } of FRAGMENTS) {
      const keys = Object.keys(en);
      const differing = keys.filter((k) => id[k] !== en[k]).length;
      // codes/loanwords/interpolation-only keys can legitimately match; most differ
      expect(differing / keys.length, name).toBeGreaterThan(0.6);
    }
  });
});
