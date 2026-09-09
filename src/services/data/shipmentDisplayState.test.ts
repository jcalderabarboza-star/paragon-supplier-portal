// The delay classifier, and the three rows that are all the evidence there will
// ever be.
//
// ⚠️ **`shipment` IS TARGET-LESS — NO VERB CAN GROW A FOURTH ROW.** It has no
// `CommandTarget` (`WIRED_COMMAND_TARGETS` does not list it) and every
// transition in `shipment.flow.ts` is `surfaced: false, because: 'external-fact',
// owner: 'tms'`. So a fixture can only be grown BY HAND, and the honest position
// is to say what the three rows do and do not prove rather than to imply a
// population. They prove the rule DISCRIMINATES on all three of its axes:
//
//   shp-018  no arrival, ETA past      -> CONVICTED   (the positive)
//   shp-017  arrived, one day late     -> ACQUITTED   (arrival acquits)
//   shp-006  no arrival, ETA == today  -> ACQUITTED   (the zero boundary)
//
// One conviction is thin and is named as thin. What makes it more than one row
// is that the two acquittals fail for DIFFERENT reasons — remove either arm of
// the rule and a different named row flips. A single-axis probe could not say
// that.
//
// ⚠️ **EVERY VALUE HERE IS DERIVED THROUGH `shiftFields`, NOT READ OFF THE
// AUTHORED LITERALS.** `mockShipments` exports a shifted view, and the raw dates
// (`2026-05-14` for shp-018) sit nine days from what a consumer sees. Reading
// the literals is how a dispatch cited `shp-017` as 2026-05-12/13 when the tree
// serves 2026-08-23/24. The specs below read `mockShipments`, never the raw array.

import { describe, it, expect } from 'vitest';
import { mockShipments, type ShipmentStatus } from '../../data/mockShipments';
import { shipmentDisplayState, isDelayed } from './shipmentDisplayState';
import { daysUntil } from './dayProjection';
import { DECLARED_PRESENT } from './fixturePresent';
import { getFlow } from '../transitions/index';

const NOW = `${DECLARED_PRESENT}T00:00:00.000Z`;
const byId = (id: string) => mockShipments.find((s) => s.id === id);

describe('shipment delay — the population and its controls', () => {
  it('the corpus is real and the subjects are present', () => {
    // Population control first: every assertion below names a row, so a renamed
    // or dropped row must fail LOUDLY rather than pass over nothing.
    expect(mockShipments.length).toBeGreaterThan(10);
    for (const id of ['shp-006', 'shp-017', 'shp-018']) {
      expect(byId(id), `${id} is gone — this file's probes are vacuous`).toBeDefined();
    }
  });

  it('⚠️ EXACTLY ONE ROW IS DELAYED, AND IT IS NAMED — not counted', () => {
    // A count would be satisfied by the wrong row. §71's shape: name the member.
    const delayed = mockShipments.filter((s) => isDelayed(s, NOW)).map((s) => s.id);
    expect(delayed).toEqual(['shp-018']);
  });

  it('shp-018 CONVICTS — no arrival and an ETA in the past', () => {
    const s = byId('shp-018')!;
    expect(s.actualArrival).toBeUndefined();
    expect(daysUntil(s.estimatedArrival, NOW)).toBeLessThan(0);
    expect(shipmentDisplayState(s, NOW)).toBe('Delayed');
    // …and the stored cursor is a real flow state, which is the exclusion closing.
    expect(getFlow('shipment')!.states).toContain(s.status);
    expect(s.status).toBe('Customs Clearance');
  });

  it('⚠️ shp-017 ACQUITS — arrived a day late, and late-on-arrival is not Delayed', () => {
    // THE RULING, MADE CHECKABLE. The naive rule convicts this row; the shipped
    // one must not. `Delayed` is a TRANSIT state — a shipment that has arrived
    // is delivered, late, and lateness after the fact belongs to a scorecard.
    const s = byId('shp-017')!;
    expect(s.actualArrival).toBeDefined();
    // The naive rule really would convict it — asserted, so the acquittal is
    // about the rule and not about a row that was never at risk.
    expect(String(s.actualArrival) > s.estimatedArrival).toBe(true);
    expect(daysUntil(s.estimatedArrival, NOW)).toBeLessThan(0);
    expect(shipmentDisplayState(s, NOW)).toBe('Delivered');
    expect(isDelayed(s, NOW)).toBe(false);
  });

  it('⚠️ shp-006 ACQUITS AT EXACTLY ZERO — the boundary row, and the reason for `< 0`', () => {
    // The zero boundary is decided in `dayProjection.ts` and READ here, never
    // re-ruled: `days <= 0` is the MINORITY convention (1 of 3), and this lane
    // joins `computeStatus` and `isOverdue` on `< 0`. shp-006 is the row that
    // makes the difference visible, so it is pinned by name: the day someone
    // "unifies" the conventions, this goes red rather than quiet.
    const s = byId('shp-006')!;
    expect(s.actualArrival).toBeUndefined();
    expect(daysUntil(s.estimatedArrival, NOW)).toBe(0);
    expect(shipmentDisplayState(s, NOW)).toBe('In Transit');
    // …and one day later it IS delayed. The boundary is a boundary.
    const nextDay = new Date(Date.parse(NOW) + 86_400_000).toISOString();
    expect(shipmentDisplayState(s, nextDay)).toBe('Delayed');
  });

  it('the rule discriminates on BOTH axes, probed at the function', () => {
    const base = { status: 'In Transit' as ShipmentStatus, estimatedArrival: '2026-08-01' };
    // past ETA, no arrival -> delayed
    expect(shipmentDisplayState({ ...base }, NOW)).toBe('Delayed');
    // past ETA, arrived -> passthrough, whatever the arrival date says
    expect(shipmentDisplayState({ ...base, actualArrival: '2026-09-30' }, NOW)).toBe('In Transit');
    // future ETA, no arrival -> passthrough
    expect(shipmentDisplayState({ ...base, estimatedArrival: '2027-01-01' }, NOW)).toBe('In Transit');
    // an unreadable ETA is not a verdict
    expect(shipmentDisplayState({ ...base, estimatedArrival: '' }, NOW)).toBe('In Transit');
  });
});

describe('the union now equals the machine', () => {
  it('⚠️ `ShipmentStatus` == `getFlow(shipment).states`, both directions', () => {
    // The latent exclusion, closed and held closed. `Delayed` was the ninth
    // member of an eight-state machine; a bilateral set assertion is what stops
    // a tenth arriving the same way.
    const stored = [...new Set(mockShipments.map((s) => String(s.status)))].sort();
    const declared = [...getFlow('shipment')!.states].sort();
    for (const s of stored) expect(declared, `${s} is stored but not a flow state`).toContain(s);
    expect(stored).not.toContain('Delayed');
    // CONTROL: the derivation is not empty and really did read the corpus.
    expect(stored.length).toBeGreaterThan(4);
  });

  it('no fixture row stores the computed literal', () => {
    expect(mockShipments.map((s) => String(s.status))).not.toContain('Delayed');
  });
});
