// ────────────────────────────────────────────────────────────────────────────
// Mutable SchedulingAgreement store — the delivery lane's FIRST write surface.
//
// Same contract as the SDC mock stores (cf. requirementResponseStore): reads
// resolve FROM here; the ONE write (release) mutates IMMUTABLY (a new agreement +
// new items array + new lines array, produced by Batch-2's pure
// `releaseScheduleLines`). `reset()` restores the seed (test isolation).
//
// SEED — the frozen ctr-003 anchor (all-draft) + the SIMULATED demo (sa-0002,
// partly-released) + the SIMULATED at-scale demo fleet (sa-1001…sa-1006, so the
// dense roll-up has breadth to scan). No DEEP CLONE is taken, deliberately: `releaseScheduleLines`
// is purely immutable (release.ts) and `update()` only ever SWAPS a whole fresh
// agreement into a new rows array — nothing here mutates the frozen fixtures in
// place, so seeding with the fixture references is safe. `reset()` restores the
// SEED references, so a test that released lines gets the pristine seed back.
//
// The ctr-003 anchor stays pristine STRUCTURALLY, not by special-casing: the seed
// is all-draft and nothing releases it, so it reads all-draft until (and only if)
// a release writes it.
// ────────────────────────────────────────────────────────────────────────────

import { SCHEDULING_AGREEMENTS } from '../fixtures';
import { SCHEDULING_AGREEMENT_DEMO } from '../demoFixtures';
import { SCALE_DEMO_AGREEMENTS } from '../demoFixturesScale';
import type { SchedulingAgreement } from '../types';

/** The immutable seed — the anchor(s) + the demo + the at-scale demo fleet.
 *  `reset()` restores these exact references (safe: nothing ever mutates them in
 *  place). ctr-003 / sa-0001 stays pristine (all-draft) structurally. */
const SEED: readonly SchedulingAgreement[] = [
  ...SCHEDULING_AGREEMENTS,
  SCHEDULING_AGREEMENT_DEMO,
  ...SCALE_DEMO_AGREEMENTS,
];

let rows: SchedulingAgreement[] = [...SEED];

export const schedulingAgreementStore = {
  /** All agreements — the mutable source the delivery reads resolve from. */
  all(): readonly SchedulingAgreement[] {
    return rows;
  },
  /** One agreement by id, or undefined. */
  get(id: string): SchedulingAgreement | undefined {
    return rows.find((a) => a.id === id);
  },
  /** IMMUTABLE update — swap in a new agreement + new array. The transform MUST
   *  return a new object (the release path does, via `releaseScheduleLines`). */
  update(id: string, transform: (a: SchedulingAgreement) => SchedulingAgreement): void {
    rows = rows.map((a) => (a.id === id ? transform(a) : a));
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = [...SEED];
  },
};
