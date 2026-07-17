// ────────────────────────────────────────────────────────────────────────────
// Mutable IncomingShipment store (SDC-3a).
//
// Same contract as the other creation stores: reads resolve FROM here; the
// report command ADDS a new leg (births 'Booked'); the authored-unwired
// advance verbs (ship/arrive/cancel) mutate IMMUTABLY when they wire. Seeded
// from the SDC-0 SIMULATED fixtures; `reset()` restores the seed. Keyed by id.
// ────────────────────────────────────────────────────────────────────────────

import { INCOMING_SHIPMENTS } from '../../../sdc';
import type { IncomingShipment } from '../../../sdc';

function clone(s: IncomingShipment): IncomingShipment {
  return { ...s };
}

let rows: IncomingShipment[] = INCOMING_SHIPMENTS.map(clone);
let seq = 0;

export const incomingShipmentStore = {
  /** All shipment legs (the mutable source reads resolve from). */
  all(): readonly IncomingShipment[] {
    return rows;
  },
  /** One leg by id, or undefined. */
  get(id: string): IncomingShipment | undefined {
    return rows.find((s) => s.id === id);
  },
  /** IMMUTABLE update — swap in a new leg + new array (advance verbs, 3b+). */
  update(id: string, next: (s: IncomingShipment) => IncomingShipment): void {
    rows = rows.map((s) => (s.id === id ? next(s) : s));
  },
  /** Add a newly-reported leg (creation). New array reference. */
  add(shipment: IncomingShipment): void {
    rows = [shipment, ...rows];
  },
  /** Store-assigned id for a report (distinct 9xxx range; fixtures are 0xxx). */
  nextNumber(): string {
    seq += 1;
    return `ish-${9000 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = INCOMING_SHIPMENTS.map(clone);
    seq = 0;
  },
};
