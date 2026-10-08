// ─────────────────────────────────────────────────────────────────────────────
// OPS-2b — THE SAMPLE BPOM RULINGS the ledger opens with.
//
// OPS-2 opened the ledger EMPTY, on the ground that a seeded row would claim
// Compliance ruled something nobody ruled. Measured consequence: the master
// records no BPOM determination for eleven raw materials, so every receipt
// carrying one of them was stopped until somebody ruled it by hand. The
// operator's ruling (2026-10-08): *"SAMPLE BPOM rulings for ten of the eleven
// raw materials; leave one 'pending — Compliance to rule'."*
//
// So these ten rows are SAMPLE DATA, and they say so three ways: the reason
// opens with the word, the person who made them is a sample person (the read
// renders the SAMPLE marker from the roster, `personLabel`), and this file is
// the only place they come from.
//
// ⚠️ EACH IS RULED *APPLICABLE*, AND THAT IS THE STRICT DIRECTION. A ruling of
// "applies" asks the receiving clerk for the lot check; a ruling of "does not
// apply" would ask for nothing. Sample data that removes a check would be a
// loosening nobody ruled, so none of these does.
//
// ⚠️ THE ONE LEFT PENDING IS NAMED, NOT IMPLIED. `BPOM_PENDING_SPECIMEN` has no
// row here on purpose — it is the material that still reads "pending —
// Compliance to rule" and stops its receipt. `ops2bEnforcement.test.ts` pins
// the two sets against the master in both directions, so a material the master
// later leaves undetermined is red there rather than silently ruled here.
//
// ⚠️ THE STAMP IS DERIVED FROM THE DECLARED PRESENT, a week before it, so the
// rows keep their place when the present is bumped. No clock is read.
// ─────────────────────────────────────────────────────────────────────────────

import type { MaterialRuling } from '../../sdc/materialRuling';
import { SAMPLE_ACTORS } from '../../identity/sampleActors';
import { DECLARED_PRESENT } from '../fixturePresent';

/** The raw material whose BPOM applicability nobody has ruled — left so. */
export const BPOM_PENDING_SPECIMEN = 'RM-COCO-8200';

/** The ten raw materials carrying a SAMPLE BPOM ruling, in master order. */
export const SAMPLE_BPOM_RULED: readonly string[] = Object.freeze([
  'RM-EMUL-3310',
  'RM-EMUL-3320',
  'RM-EMUL-9410',
  'RM-EMUL-9430',
  'RM-LAURIC-7200',
  'RM-MYRST-7310',
  'RM-PALM-7100',
  'RM-STEAR-7300',
  'RM-HUMEC-3405',
  'RM-PSTN-7150',
]);

const WEEK_MS = 7 * 86_400_000;
const SEEDED_AT = new Date(
  Date.parse(`${DECLARED_PRESENT}T09:00:00.000Z`) - WEEK_MS,
).toISOString();

/** The ledger's opening rows. A fresh array each call — the store owns its own. */
export const sampleMaterialRulings = (): MaterialRuling[] =>
  SAMPLE_BPOM_RULED.map((materialCode, i) => ({
    materialCode,
    regime: 'bpom' as const,
    applicable: true,
    reason:
      'SAMPLE ruling — illustrative. BPOM is treated as applying to this raw material, so its lot is checked at receipt.',
    setBy: SAMPLE_ACTORS.compliance1,
    setAt: SEEDED_AT,
    seq: i + 1,
  }));
