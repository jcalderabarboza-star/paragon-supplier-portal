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
import {
  shipmentDisplayState,
  isDelayed,
  daysLate,
  daysInTransit,
} from './shipmentDisplayState';
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

// ─────────────────────────────────────────────────────────────────────────────
// THE DAY COUNTS — THE AUTHORED LITERALS, MOVED HERE RATHER THAN DELETED.
//
// `Shipment.delayDays` and `Shipment.daysInTransit` were stored differences
// against the read instant and are retired (law 0.5, the #318 rule). Their
// AUTHORED VALUES are the evidence of what the fixtures MEANT, so they become
// per-row pins here — `DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`'s
// shape: a NAMED member reached through a VALUE, never a row count.
//
// ⚠️ **HALF OF THIS AGREEMENT IS CIRCULAR AND IT IS DISCLOSED, NOT BURIED.**
// `FAMILY_ANCHORS.shipment.why` names *"the retired `daysInTransit`
// back-solve"* as one of the four instruments that CHOSE 2026-05-20. So the
// five IN-FLIGHT rows agreeing is true by construction and is evidence of
// nothing. Two things here are independent of the anchor and they are the
// reason this file can make a claim at all:
//
//   · the ten ARRIVED rows equal `actualArrival − shipDate` — a difference
//     between two STORED dates, invariant under any shift whatsoever;
//   · `delayDays` is NOT named in that `why`, so shp-018 is one genuinely
//     independent confirmation. One row, and it is stated as one row.
// ─────────────────────────────────────────────────────────────────────────────

/** The authored literals, read off `mockShipments.ts` before they were deleted. */
const AUTHORED_TRANSIT: Record<string, number> = {
  'shp-004': 5, 'shp-005': 28, 'shp-006': 1, 'shp-007': 3, 'shp-008': 7,
  'shp-009': 7, 'shp-010': 33, 'shp-011': 1, 'shp-012': 1, 'shp-013': 1,
  'shp-014': 9, 'shp-015': 1, 'shp-016': 10, 'shp-017': 11, 'shp-018': 12,
};
const AUTHORED_DELAY: Record<string, number> = { 'shp-018': 6 };

describe('the retired day counts, recomputed at the declared present', () => {
  it('POPULATION CONTROL — every pinned id is still a row', () => {
    for (const id of [...Object.keys(AUTHORED_TRANSIT), ...Object.keys(AUTHORED_DELAY)]) {
      expect(byId(id), `${id} is gone — the pins below would be vacuous`).toBeDefined();
    }
    expect(Object.keys(AUTHORED_TRANSIT).length).toBeGreaterThan(10);
  });

  it('⚠️ `daysInTransit` reproduces EVERY authored literal, by name', () => {
    for (const [id, authored] of Object.entries(AUTHORED_TRANSIT)) {
      expect(daysInTransit(byId(id)!, NOW), id).toBe(authored);
    }
  });

  it('⚠️ THE INDEPENDENT HALF — arrived rows equal `actualArrival − shipDate`', () => {
    // Invariant under ANY anchor, so this survives a re-anchor that would make
    // the in-flight half meaningless. It is the only part of the transit
    // agreement that is evidence rather than construction.
    const arrived = mockShipments.filter((s) => s.actualArrival);
    expect(arrived.length).toBeGreaterThan(8);
    for (const s of arrived) {
      const span = -(daysUntil(s.shipDate, `${s.actualArrival}T00:00:00.000Z`) as number);
      expect(daysInTransit(s, NOW), s.id).toBe(span);
      // …and it does not move when the clock does, which is what makes it a fact.
      expect(daysInTransit(s, '2027-06-01T00:00:00.000Z'), s.id).toBe(span);
    }
  });

  it('⚠️ an IN-FLIGHT row DOES move with the clock — the other meaning', () => {
    const s = byId('shp-018')!;
    expect(s.actualArrival).toBeUndefined();
    const at = daysInTransit(s, NOW)!;
    const later = daysInTransit(s, '2026-09-30T00:00:00.000Z')!;
    expect(later).toBeGreaterThan(at);
    // One field, two meanings — asserted rather than described. This is why a
    // stored `number` could not say which it was.
  });

  it('⚠️ `daysLate` reproduces the one authored literal, and is null otherwise', () => {
    for (const [id, authored] of Object.entries(AUTHORED_DELAY)) {
      expect(daysLate(byId(id)!, NOW), id).toBe(authored);
    }
    const late = mockShipments.filter((s) => daysLate(s, NOW) !== null).map((s) => s.id);
    expect(late).toEqual(['shp-018']);
  });

  it('⚠️ NOT-YET-DEPARTED IS `null`, NOT A NEGATIVE COUNT — the #331 regression', () => {
    // THE PROBE FIRES AT A DEFECT THE TREE REALLY SHIPPED
    // (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). #331 returned the raw negative
    // and `BuyerShipments`' timeline guards on TRUTHINESS, so the panel
    // rendered `-2 hari` — browser-verified before this fix. The stored field
    // it replaced was `undefined` on these rows, which is falsy, so nothing
    // rendered at all. Named rows, not a count.
    const notDeparted = mockShipments.filter(
      (s) => !s.actualArrival && (daysUntil(s.shipDate, NOW) as number) > 0,
    );
    expect(notDeparted.map((s) => s.id)).toEqual(['shp-001', 'shp-002', 'shp-003']);
    for (const s of notDeparted) {
      expect(daysInTransit(s, NOW), s.id).toBeNull();
    }
  });

  it('…and each of those three DOES report transit once its ship date passes', () => {
    // The complement, so the guard cannot be satisfied by returning `null`
    // always — which is the one-sided-probe failure rule 4 exists for.
    for (const id of ['shp-001', 'shp-002', 'shp-003']) {
      const s = byId(id)!;
      const after = `${s.shipDate}T00:00:00.000Z`;
      expect(daysInTransit(s, after), id).toBe(0);
      const later = new Date(Date.parse(after) + 3 * 86_400_000).toISOString();
      expect(daysInTransit(s, later), id).toBe(3);
    }
  });

  it('⚠️ BOTH FIELDS MOVE TOGETHER when the instant moves — one clock, asserted', () => {
    const s = byId('shp-018')!;
    const a = { late: daysLate(s, NOW)!, transit: daysInTransit(s, NOW)! };
    const laterIso = '2026-09-30T00:00:00.000Z';
    const b = { late: daysLate(s, laterIso)!, transit: daysInTransit(s, laterIso)! };
    const dLate = b.late - a.late;
    const dTransit = b.transit - a.transit;
    // The SAME delta, because both are differences against the same argument.
    // A producer that read a clock of its own would break this and nothing
    // else here would notice.
    expect(dLate).toBe(dTransit);
    expect(dLate).toBeGreaterThan(0);
  });
  it('⚠️ THE COUNT AND THE STATE CANNOT DISAGREE — the point of the batch', () => {
    // The page used to hold two independent answers to `is this late?`. There
    // is now one, and this is the assertion that keeps it that way.
    for (const s of mockShipments) {
      const late = daysLate(s, NOW);
      expect(late !== null, s.id).toBe(isDelayed(s, NOW));
      // ⚠️ AND THE MAGNITUDE AGREES WITH THE STATE, NOT ONLY ITS PRESENCE.
      // `Delayed` with 0 days, or a positive count on a row that is not
      // Delayed, is the contradiction this batch exists to make impossible —
      // and a presence-only check cannot see either.
      if (isDelayed(s, NOW)) expect(late, s.id).toBeGreaterThan(0);
      else expect(late, s.id).toBeNull();
    }
    // NON-VACUITY: the loop must have taken both branches.
    expect(mockShipments.some((s) => isDelayed(s, NOW))).toBe(true);
    expect(mockShipments.some((s) => !isDelayed(s, NOW))).toBe(true);
  });
});
