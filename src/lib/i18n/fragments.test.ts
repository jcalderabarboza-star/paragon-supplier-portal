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
