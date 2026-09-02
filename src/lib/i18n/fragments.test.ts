import { describe, it, expect } from 'vitest';
import { resources } from '../i18n';
import { registrationEn, registrationId } from './registration';
import { contractsEn, contractsId } from './contracts';
import { buyerCommHubEn, buyerCommHubId } from './buyerCommHub';
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
// — PF-1 process flows —
import { processFlowsEn, processFlowsId } from './processFlows';
// — PF-2 purpose annotations —
import { processFlowPurposeEn, processFlowPurposeId } from './processFlowPurpose';
// — GL-1 glossary surface (chrome only; the definitions are not i18n keys) —
import { glossaryEn, glossaryId } from './glossary';
// — Surface residuals: the seat-identity guard —
import { identityEn, identityId } from './identity';
// — The read path's failure surface (31 consumer pages, both personas) —
import { errorStateEn, errorStateId } from './errorState';
import { wizardEn, wizardId } from './wizard';

// Page i18n fragments must keep EN/ID key sets in lockstep — a key present in EN
// but missing in ID silently falls back to English at runtime (an invisible
// untranslated string). This guard runs per batch as fragments are added.
const FRAGMENTS = [
  { name: 'registration', en: registrationEn, id: registrationId },
  { name: 'contracts', en: contractsEn, id: contractsId },
  { name: 'buyerCommHub', en: buyerCommHubEn, id: buyerCommHubId },
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
  // — PF-1 process flows —
  { name: 'processFlows', en: processFlowsEn, id: processFlowsId },
  // — PF-2 purpose annotations (bilaterally pinned to the registry in
  //   `services/transitions/annotations.test.ts`; this guard is the i18n half) —
  { name: 'processFlowPurpose', en: processFlowPurposeEn, id: processFlowPurposeId },
  // GL-1 — the glossary PAGE CHROME. The definitions themselves are deliberately
  // NOT here: they live on the glossary entries, EN and ID on the same object,
  // which is what makes a vocabulary correction one edit rather than two.
  { name: 'glossary', en: glossaryEn, id: glossaryId },
  // The seat-identity guard's two arms. Both must exist in both locales: the
  // arm that fires is chosen by PERSONA, so a missing ID string would be
  // invisible until a supplier seat with an unresolvable tenant hit it.
  { name: 'identity', en: identityEn, id: identityId },
  { name: 'errorState', en: errorStateEn, id: errorStateId },
  // The shared multi-step chrome. Five consumers render this footer, so a
  // key present in EN and missing in ID would be five screens, not one.
  { name: 'wizard', en: wizardEn, id: wizardId },
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

  // ── CP-0 · 2e-c-6 — the half a key-set comparison cannot see ──────────────
  // Matching key sets prove a string EXISTS in Indonesian. They say nothing about
  // whether it still says the same thing. A translation that drops an
  // interpolation is the failure mode that matters here: the FX refusal names the
  // currencies that need a rate and the vintage it is judging, and an Indonesian
  // string missing `{{currencies}}` is not a slightly-worse refusal — it is a
  // refusal that does not name its cause, which is the whole honesty claim, gone
  // for half the userbase, with every existing guard still green.
  //
  // i18next silently renders a string with no placeholder rather than erroring,
  // so nothing else in the suite would catch it.
  const placeholders = (s: string): string[] =>
    [...s.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]).sort();

  for (const { name, en, id } of FRAGMENTS) {
    it(`${name}: EN and ID interpolate the SAME variables`, () => {
      for (const [k, enValue] of Object.entries(en)) {
        expect(placeholders(id[k] ?? ''), `${name} · ${k}`).toEqual(placeholders(enValue));
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
