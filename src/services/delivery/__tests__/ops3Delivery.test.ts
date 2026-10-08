// ─────────────────────────────────────────────────────────────────────────────
// OPS-3 — the three delivery-agreement items carried from the Operations review.
//
//   1. A line delivered LATE was shown to the supplier as "Overdue — Paragon is
//      waiting on this delivery". It is delivered; nothing is owed on it.
//   2. "Governed — flag over N%" computed its breach and showed it to nobody.
//   3. A draft line whose date has gone offered a Release that always refused.
//
// This file holds the derivations. What a person sees is in
// `pages-v2/ops3Delivery.page.test.tsx`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { schedulingAgreementStore } from '../stores/schedulingAgreementStore';
import { deriveDrawdownLedger, overToleranceOf } from '../ledger';
import { toAgreementItemRows } from '../summary';
import { deriveAgreementView } from '../views';
import { deliveryShipmentPoolFor } from '../pool';
import type { SchedulingAgreementItem } from '../types';
import { deriveDeliveryChase } from '../../chase/deliveryChase';
import { deliveredLateKeys, shapeObligations } from '../../chase/supplierObligations';
import { deliveryDateIsPast } from '../../transitions/policies';
import { DECLARED_PRESENT } from '../../data/fixturePresent';
import { SDC_SIMULATED_NOW } from '../../sdc';

afterEach(() => schedulingAgreementStore.reset());

const views = () =>
  schedulingAgreementStore
    .all()
    .map((a) => deriveAgreementView(a, deliveryShipmentPoolFor(a.supplierId), SDC_SIMULATED_NOW, null));

const itemOf = (agreementId: string, lineSeq = 10): SchedulingAgreementItem =>
  schedulingAgreementStore.get(agreementId)!.items.find((i) => i.lineSeq === lineSeq)!;

/** Release every draft line of an item and scale one of them, in the store. */
const releaseAll = (agreementId: string, scaleSeq?: number, plannedQty?: number) =>
  schedulingAgreementStore.update(agreementId, (a) => ({
    ...a,
    items: a.items.map((i) => ({
      ...i,
      scheduleLines: i.scheduleLines.map((l) => ({
        ...l,
        state: 'released' as const,
        ...(l.releaseSeq === scaleSeq && plannedQty !== undefined ? { plannedQty } : {}),
      })),
    })),
  }));

describe('OPS-3 · 1 — a line delivered late is not an obligation', () => {
  it('the population is real: the corpus holds late lines AND missed lines', () => {
    const fulfilments = views().flatMap((v) =>
      v.items.flatMap((i) => i.fulfillment.map((f) => f.fulfillment)),
    );
    expect(fulfilments).toContain('late');
    expect(fulfilments).toContain('missed');
    expect(deliveredLateKeys(views()).size).toBeGreaterThan(0);
  });

  it('⚠️ no obligation is a delivered-late line; every MISSED line is still overdue', () => {
    const vs = views();
    const late = deliveredLateKeys(vs);
    const obligations = shapeObligations(vs, SDC_SIMULATED_NOW);
    expect(obligations.filter((o) => late.has(o.key))).toEqual([]);
    const missed = vs.flatMap((v) =>
      v.items.flatMap((i) =>
        i.fulfillment
          .filter((f) => f.fulfillment === 'missed')
          .map((f) => `${v.agreement.id}-${i.item.lineSeq}-${f.releaseSeq}`),
      ),
    );
    expect(missed.length).toBeGreaterThan(0);
    const overdue = obligations.filter((o) => o.kind === 'overdue').map((o) => o.key);
    expect([...overdue].sort()).toEqual([...missed].sort());
  });

  it('the BUYER’s chase still holds the late lines — lateness is a performance fact there', () => {
    const vs = views();
    const alerts = deriveDeliveryChase(vs, SDC_SIMULATED_NOW)
      .filter((e) => e.mode === 'non-compliance-alert')
      .map((e) => `${e.agreementId}-${e.itemSeq}-${e.releaseSeq}`);
    for (const key of deliveredLateKeys(vs)) expect(alerts).toContain(key);
  });

  it('named: sa-0002 line 4 was delivered late and line 5 was missed', () => {
    const vs = views().filter((v) => v.agreement.id === 'sa-0002');
    expect([...deliveredLateKeys(vs)]).toEqual(['sa-0002-10-4']);
    expect(
      shapeObligations(vs, SDC_SIMULATED_NOW)
        .filter((o) => o.kind === 'overdue')
        .map((o) => o.key),
    ).toEqual(['sa-0002-10-5']);
  });
});

describe('OPS-3 · 2 — "Governed — flag over N%" flags', () => {
  it('as seeded, no item is over its tolerance — and the roll-up says so on every row', () => {
    for (const a of schedulingAgreementStore.all()) {
      for (const i of a.items) expect(overToleranceOf(deriveDrawdownLedger(i))).toBeNull();
    }
    const rows = toAgreementItemRows(views(), SDC_SIMULATED_NOW);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.overToleranceQty === null)).toBe(true);
  });

  it('⚠️ a governed item released beyond its tolerance is flagged, with the quantity over', () => {
    // sa-1006: 60,000 agreed, 10% tolerance → ceiling 66,000. Line 4 is 15,000.
    expect(itemOf('sa-1006').agreedTotalQty).toBe(60000);
    releaseAll('sa-1006', 4, 25000);
    const ledger = deriveDrawdownLedger(itemOf('sa-1006'));
    expect(ledger.releasedQty).toBe(70000);
    expect(overToleranceOf(ledger)).toMatchObject({ kind: 'over-envelope', overageQty: 10000 });
    const row = toAgreementItemRows(views(), SDC_SIMULATED_NOW).find(
      (r) => r.agreementId === 'sa-1006',
    )!;
    expect(row.overToleranceQty).toBe(10000);
  });

  it('exactly AT the ceiling is within tolerance; one unit over is flagged', () => {
    releaseAll('sa-1006', 4, 21000); // 45,000 + 21,000 = 66,000 = the ceiling
    expect(overToleranceOf(deriveDrawdownLedger(itemOf('sa-1006')))).toBeNull();
    releaseAll('sa-1006', 4, 21001);
    expect(overToleranceOf(deriveDrawdownLedger(itemOf('sa-1006')))).toMatchObject({
      overageQty: 6001,
    });
  });

  it('over the agreed total but inside the tolerance is not flagged', () => {
    releaseAll('sa-1006', 4, 18000); // 63,000 — over 60,000, under 66,000
    const ledger = deriveDrawdownLedger(itemOf('sa-1006'));
    expect(ledger.remainingQty).toBe(-3000);
    expect(overToleranceOf(ledger)).toBeNull();
  });

  it('a reference-only item flags nothing however far it is released — by design', () => {
    // sa-1004: tolerance unlimited, enforcement ignore.
    releaseAll('sa-1004', 4, 900000);
    const ledger = deriveDrawdownLedger(itemOf('sa-1004'));
    expect(ledger.enforced).toBe(false);
    expect(ledger.releasedQty).toBeGreaterThan(ledger.agreedTotalQty);
    expect(overToleranceOf(ledger)).toBeNull();
  });
});

describe('OPS-3 · 3 — a past-dated draft line is known to be past, by the dispatcher’s own rule', () => {
  it('the declared present is not past; the day before it is', () => {
    expect(deliveryDateIsPast(DECLARED_PRESENT)).toBe(false);
    expect(deliveryDateIsPast('2026-08-30')).toBe(true);
    expect(deliveryDateIsPast('2026-09-01')).toBe(false);
  });

  it('the corpus holds both kinds of draft line — past-dated and not', () => {
    const drafts = schedulingAgreementStore
      .all()
      .flatMap((a) => a.items.flatMap((i) => i.scheduleLines.filter((l) => l.state === 'draft')));
    expect(drafts.some((l) => deliveryDateIsPast(l.releaseDate))).toBe(true);
    expect(drafts.some((l) => !deliveryDateIsPast(l.releaseDate))).toBe(true);
  });
});
