// ────────────────────────────────────────────────────────────────────────────
// Mutable RequirementResponse store (SDC-2a).
//
// Same contract as quotationStore: reads resolve FROM here; commands mutate
// IMMUTABLY (new object + new array). Seeded from the SDC-0 SIMULATED fixtures
// (`REQUIREMENT_RESPONSES`); `reset()` restores the seed (test isolation).
// `forResponseKey` gives the create path the prior-submission set so
// `submissionVersion` is DERIVED (prior max + 1) — a re-confirmation against
// the same published line versions up, never overwrites (design §4:
// "versioned + audited"). Keyed by id; the store-assigned id doubles as the
// document number (the GR/invoice/PR/RFQ convention).
// ────────────────────────────────────────────────────────────────────────────

import { REQUIREMENT_RESPONSES } from '../../../sdc';
import type { RequirementResponse } from '../../../sdc';

function clone(r: RequirementResponse): RequirementResponse {
  return { ...r };
}

let rows: RequirementResponse[] = REQUIREMENT_RESPONSES.map(clone);
let seq = 0;

export const requirementResponseStore = {
  /** All requirement responses (the mutable source reads resolve from). */
  all(): readonly RequirementResponse[] {
    return rows;
  },
  /** One response by id, or undefined. */
  get(id: string): RequirementResponse | undefined {
    return rows.find((r) => r.id === id);
  },
  /**
   * Every response by the SAME supplier for the SAME material × period — the
   * response thread `submissionVersion` counts over.
   *
   * ⚠️ A3 · SDC-R6 — THE KEY NO LONGER INCLUDES THE PUBLICATION. It did, so the
   * first answer to a RE-PUBLISHED plan minted `v1` again beside the `v1` it
   * followed, and "which is latest" fell to insertion order (`add` prepends).
   * A re-publication is a new question about the same line, not a new line: the
   * thread spans publications, and each answer's own `publicationId` still says
   * which snapshot it bound.
   */
  forResponseKey(
    supplierId: string,
    materialCode: string,
    periodBucket: string,
  ): readonly RequirementResponse[] {
    return rows.filter(
      (r) =>
        r.supplierId === supplierId &&
        r.materialCode === materialCode &&
        r.periodBucket === periodBucket,
    );
  },
  /** IMMUTABLE update — swap in a new response + new array. */
  update(id: string, next: (r: RequirementResponse) => RequirementResponse): void {
    rows = rows.map((r) => (r.id === id ? next(r) : r));
  },
  /** Add a newly-submitted response (creation). New array reference. */
  add(response: RequirementResponse): void {
    rows = [response, ...rows];
  },
  /** Store-assigned id for a submit (distinct 9xxx range; fixtures are 0xxx). */
  nextNumber(): string {
    seq += 1;
    return `rr-${9000 + seq}`;
  },
  /** Restore the fixture seed (test isolation). */
  reset(): void {
    rows = REQUIREMENT_RESPONSES.map(clone);
    seq = 0;
  },
};
