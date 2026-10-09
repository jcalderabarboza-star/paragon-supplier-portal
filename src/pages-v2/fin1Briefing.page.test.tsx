// ────────────────────────────────────────────────────────────────────────────
// FIN-1 · THE SUPPLIER BRIEFING'S SHIP-NOTICE AND PROFILE ACTIONS.
//
// The ship-notice action printed the raw day difference, so an order whose
// requested date had passed read "Delivery in -517d", and it and the profile
// action were English in both locales.
//
// Held here, in EN and ID:
//   1. the badge counts from the declared present, with one sentence for a
//      date ahead, one for today and one for a date that has passed;
//   2. no negative count is ever printed;
//   3. both actions read in the reader's locale.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '../services/data/mock/stores/goodsReceiptStore';
import { receivedOnOrder } from '../services/data/orderReceipt';
import { POStatus } from '../services/data/types';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import { daysUntil } from '../services/data/dayProjection';
import i18n from '../lib/i18n';
import SupplierDashboard from './SupplierDashboard';

const LOCALES = ['en', 'id'] as const;
const tr = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts) as string;

beforeEach(async () => {
  purchaseOrderStore.reset();
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  purchaseOrderStore.reset();
  await i18n.changeLanguage('en');
});

const seat = (supplierId: string): CurrentIdentity => ({ ...SUPPLIER, supplierId, supplierName: supplierId });
// E2E-2 — an order that is fully received is not asked for a ship notice, so it
// is not in the briefing; the population is derived with the page's own read.
const due = () =>
  purchaseOrderStore
    .all()
    .filter((po) => po.status === POStatus.CONFIRMED)
    .filter((po) => !receivedOnOrder(po, goodsReceiptStore.all()).fullyReceived)
    .map((po) => ({ po, days: daysUntil(po.requestedDeliveryDate, DECLARED_PRESENT)! }))
    .filter(({ days }) => days <= 7);
const briefing = async () => {
  const title = await screen.findByText(tr('supplierDashboard.briefing.title'));
  return title.closest('section')!;
};
/** The badge texts in the briefing, each exactly as rendered. */
const badges = (section: Element) =>
  [...section.querySelectorAll('span')]
    .filter((el) => el.children.length === 1 && el.firstElementChild!.getAttribute('aria-hidden') === 'true')
    .map((el) => el.textContent!.trim());
/** `DECLARED_PRESENT` moved by whole days, as a `YYYY-MM-DD`. */
const fromPresent = (n: number) =>
  new Date(Date.parse(DECLARED_PRESENT) + n * 86_400_000).toISOString().slice(0, 10);
const badgeFor = (days: number) =>
  days > 0
    ? tr(`supplierDashboard.briefing.asn.badgeAhead.${days === 1 ? 'one' : 'other'}`, { count: days })
    : days === 0
      ? tr('supplierDashboard.briefing.asn.badgeToday')
      : tr(`supplierDashboard.briefing.asn.badgePassed.${days === -1 ? 'one' : 'other'}`, { count: -days });

/** What the two actions used to print, in English, to every reader. */
const RETIRED = ['Create ASN', 'Delivery in -', 'ASN must be submitted', 'Complete company profile', 'When ready', 'Update profile'];

describe('FIN-1 · the ship-notice action counts from the declared present', () => {
  it('CONTROL — the corpus holds confirmed orders whose requested date has passed, by name', () => {
    const rows = due();
    expect(rows.map((r) => r.po.poNumber)).toContain('PO-2025-00107');
    expect(rows.find((r) => r.po.poNumber === 'PO-2025-00107')!.days).toBeLessThan(0);
    // An order that is not confirmed is not in the population.
    expect(purchaseOrderStore.all().some((po) => po.status !== POStatus.CONFIRMED)).toBe(true);
  });

  it.each(LOCALES)('[%s] every seeded order reads its own count, never a negative one', async (lng) => {
    await i18n.changeLanguage(lng);
    for (const supplierId of [...new Set(due().map((r) => r.po.supplierId))]) {
      const view = renderWithProviders(<SupplierDashboard />, { identity: seat(supplierId) });
      const section = await briefing();
      const text = section.textContent!;
      for (const { po, days } of due().filter((r) => r.po.supplierId === supplierId)) {
        expect(text, po.poNumber).toContain(tr('supplierDashboard.briefing.asn.title', { po: po.poNumber }));
        expect(badges(section), po.poNumber).toContain(badgeFor(days));
        expect(badgeFor(days), po.poNumber).toContain(String(Math.abs(days)));
      }
      expect(badges(section).length, supplierId).toBeGreaterThan(0);
      for (const badge of badges(section)) expect(badge, supplierId).not.toMatch(/-\s*\d/);
      view.unmount();
    }
  });

  // The corpus only reaches the "passed" arm, so the other arms are reached by
  // moving one order's requested date relative to the declared present.
  it.each(
    LOCALES.flatMap((lng) => [-2, -1, 0, 1, 5].map((days) => [lng, days] as const)),
  )('[%s] a requested date %i day(s) from the present reads the matching sentence', async (lng, days) => {
    await i18n.changeLanguage(lng);
    const target = due().find((r) => r.po.poNumber === 'PO-2025-00107')!.po;
    purchaseOrderStore.update(target.id, (po) => ({ ...po, requestedDeliveryDate: fromPresent(days) }));
    renderWithProviders(<SupplierDashboard />, { identity: seat(target.supplierId) });
    const section = await briefing();
    const text = section.textContent!;
    expect(badges(section)).toContain(badgeFor(days));
    const others = [-2, -1, 0, 1, 5].filter((d) => d !== days).map(badgeFor);
    for (const other of others) expect(badges(section)).not.toContain(other);
    expect(text).toContain(
      tr(days < 0 ? 'supplierDashboard.briefing.asn.descPassed' : 'supplierDashboard.briefing.asn.desc', {
        date: '',
      }).split('.').slice(-2)[0].trim(),
    );
  });

  it('an order due more than a week ahead is not in the briefing', async () => {
    const target = due().find((r) => r.po.poNumber === 'PO-2025-00107')!.po;
    purchaseOrderStore.update(target.id, (po) => ({ ...po, requestedDeliveryDate: fromPresent(8) }));
    renderWithProviders(<SupplierDashboard />, { identity: seat(target.supplierId) });
    const text = (await briefing()).textContent!;
    expect(text).not.toContain(tr('supplierDashboard.briefing.asn.title', { po: target.poNumber }));
  });
});

describe('FIN-1 · both actions read in the reader’s locale', () => {
  it('CONTROL — the two locales differ on every sentence checked below', () => {
    for (const key of [
      'supplierDashboard.briefing.asn.cta',
      'supplierDashboard.briefing.asn.badgeToday',
      'supplierDashboard.briefing.profile.title',
      'supplierDashboard.briefing.profile.badge',
      'supplierDashboard.briefing.profile.desc',
      'supplierDashboard.briefing.profile.cta',
    ]) {
      expect(i18n.t(key, { lng: 'en' }), key).not.toBe(i18n.t(key, { lng: 'id' }));
      expect(i18n.t(key, { lng: 'id' }), key).not.toBe(key);
    }
    // And every counted or dated sentence, with its values filled in.
    for (const key of [
      'supplierDashboard.briefing.asn.title',
      'supplierDashboard.briefing.asn.badgeAhead.one',
      'supplierDashboard.briefing.asn.badgeAhead.other',
      'supplierDashboard.briefing.asn.badgePassed.one',
      'supplierDashboard.briefing.asn.badgePassed.other',
      'supplierDashboard.briefing.asn.desc',
      'supplierDashboard.briefing.asn.descPassed',
    ]) {
      const fill = { count: 3, po: 'PO-X', date: '1 Jan 2026' };
      const en = i18n.t(key, { ...fill, lng: 'en' }) as string;
      const id = i18n.t(key, { ...fill, lng: 'id' }) as string;
      expect(en, key).not.toBe(id);
      expect(id, key).not.toBe(key);
      // A count is printed as a count: no sign, in either locale.
      expect(en, key).not.toMatch(/-\s*\d/);
      expect(id, key).not.toMatch(/-\s*\d/);
    }
  });

  it.each(LOCALES)('[%s] the profile and ship-notice actions are that locale’s own', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<SupplierDashboard />, { identity: seat('sup-007') });
    const text = (await briefing()).textContent!;
    for (const key of [
      'supplierDashboard.briefing.asn.cta',
      'supplierDashboard.briefing.profile.title',
      'supplierDashboard.briefing.profile.badge',
      'supplierDashboard.briefing.profile.desc',
      'supplierDashboard.briefing.profile.cta',
    ]) {
      expect(text, key).toContain(tr(key));
    }
    const other = lng === 'en' ? 'id' : 'en';
    expect(text).not.toContain(i18n.t('supplierDashboard.briefing.profile.title', { lng: other }));
    expect(text).not.toContain(i18n.t('supplierDashboard.briefing.asn.cta', { lng: other }));
  });

  it('[id] nothing the two actions used to print in English is left', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SupplierDashboard />, { identity: seat('sup-007') });
    const text = (await briefing()).textContent!;
    for (const phrase of RETIRED) expect(text, phrase).not.toContain(phrase);
  });

  it('the profile action no longer promises payment terms', async () => {
    renderWithProviders(<SupplierDashboard />, { identity: seat('sup-007') });
    expect((await briefing()).textContent).not.toMatch(/Net 15/);
  });
});
