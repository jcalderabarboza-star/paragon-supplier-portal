// ─────────────────────────────────────────────────────────────────────────────
// PF-0 · THE LOOSE-END CENSUS — every hole in the shipped flow catalog, named.
//
// ⚠️ **THIS FILE IS AN EXEMPTION LIST, NOT A TO-DO LIST.** Every row is a loose
// end that SHIPS TODAY. None is fixed by this batch (the fence: D-1 is the
// operator's, per state). What the census buys is that each one is DELIBERATE
// and REPORTED, instead of merely present.
//
// ── ⚠️ THE CENSUS IS BILATERAL, AND THAT IS THE LOAD-BEARING HALF ───────────
//   `flowGraph.test.ts` fails in BOTH directions:
//
//     · A DERIVED LOOSE END WITH NO ROW HERE → RED. A new hole cannot ship
//       silently; somebody has to write down what it is and why.
//     · A ROW HERE THAT IS NO LONGER A LOOSE END → RED. Fixing an edge FORCES
//       the deletion of its exemption, **so the census can only shrink
//       truthfully.**
//
//   The second direction is the one nothing normally checks, and it is the one
//   that rots: an exemption list that survives its own subject is a document
//   asserting a defect the tree no longer has (`C9-STALE-BY-FIX-01`, the same
//   class one layer down). Here it cannot survive, because the check derives the
//   truth first and compares second.
//
// ── THE PRECEDENTS THIS OBEYS ───────────────────────────────────────────────
//   `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01` — the authored list is a STRICT
//   SUBSET of the derived truth, and the derivation is authority. This file
//   never enumerates flows, states or transitions on its own account; it only
//   annotates keys that `analyzeAllFlows` produced.
//   `CENSUS-MUST-DERIVE-01` — a population is derived, never shape-matched.
//
// ── ⚠️ THE KEY IS `entity#kind#subject` AND CARRIES NO PROSE ────────────────
//   `note` is for a reader and is never compared. A census keyed on its own
//   wording would go red every time somebody improved a sentence, which trains
//   people to regenerate the file instead of reading it — and a census that gets
//   regenerated routinely is not a census.
// ─────────────────────────────────────────────────────────────────────────────

import type { LooseEndKind } from './flowGraph';

/**
 * WHY a loose end is exempt. A CLOSED vocabulary, and the closure is the point:
 * four different situations that a single "known issue" would flatten into one.
 *
 * ⚠️ **NO CATCH-ALL MEMBER.** There is no `OTHER` and no `WONT_FIX` — one such
 * member turns a closed vocabulary into free text wearing an enum's clothes
 * (`OVERRIDE_REASONS`, same argument). A hole that fits none of these four is a
 * hole nobody has understood yet, and it should be red until somebody does.
 */
export type LooseEndReason =
  /** The resolving edge is INTENDED and not yet authored. A real gap, booked.
   *  `t_invoice_resolve` is the shape these are missing. */
  | 'deferred-edge'
  /** The states/verbs exist in the catalog and NOTHING WIRES THE PATH to them
   *  (FORK-2 hybrid: author all flows, wire per Stage-2 surface). */
  | 'authored-unwired'
  /** A sub-flow that is documented substrate — rolled up by its parent and never
   *  instantiated on its own, so it has no creation verb and no resting edges. */
  | 'substrate-only'
  /** The `initial` state IS how instances come into existence, with no creation
   *  verb by design: the entity exists because its subject does. */
  | 'born-state';

/** One exempted loose end. `entity`/`kind`/`subject` must match a DERIVED key. */
export interface CensusEntry {
  readonly entity: string;
  readonly kind: LooseEndKind;
  readonly subject: string;
  readonly reason: LooseEndReason;
  /** For a human. NEVER compared — see the header. */
  readonly note: string;
}

/**
 * THE CENSUS. **NINE rows — down from EIGHTEEN at PF-0**, and the shrink is the
 * point: PF-1a repaired seven, PF-1b two more, and the bilateral gate FORCED
 * every exemption out. A row cannot outlive its subject here, so this list can
 * only get shorter truthfully. All nine are derived first and annotated second.
 *
 * **Deleted at PF-1a (D-1, ruled per state):** rfq `Draft` × 2 + `t_rfq_publish`
 * (creation now births at Draft, so publish fires and the declared initial is
 * true) · advanceShipNotice `Discrepancy` · requirementResponse `Disputed` ·
 * purchaseRequisition `Rejected` (resolution edges on the `t_invoice_resolve`
 * pattern) · goodsReceipt `Quality Hold` (the resume edge behind an affordance
 * that already shipped).
 *
 * **Deleted at PF-1b (D-1 extended to the supplier lane):** requirementResponse
 * `Draft` + `t_requirementresponse_promote` — creation births at `Draft` and
 * promote is the submission.
 *
 * ⚠️ **THE SETTLEMENT PAIRS ARE NOT IN IT, AND THEIR ABSENCE IS THE D-2 RULING
 * WORKING.** `Posted to SAP` and `Payment Released` were unreachable, and
 * `Posting to SAP` / `Releasing Payment` were exit-less, in the DECLARED data —
 * truthfully, because `settle()`'s finalize advanced them from inside the
 * adapter. They are absent here because the declaration was made honest
 * (`settlesTo`), not because the reader was told to look away.
 */
export const LOOSE_END_CENSUS: readonly CensusEntry[] = Object.freeze([
  // ── goodsReceiptLine ───────────────────────────────────────────────────────
  {
    entity: 'goodsReceiptLine',
    kind: 'initial-integrity',
    subject: 'Pending',
    reason: 'substrate-only',
    note:
      '⚠️ THE SCHEMA CANNOT BRING A LINE INTO EXISTENCE — zero creation verbs, zero inbound edges to ' +
      '`Pending`, and no CommandTarget. The line sub-flow is rolled up by the GR header (`grRollup`) ' +
      'and never instantiated on its own; it is documented substrate, and the analyzer seeds its ' +
      'reachability from `initial` so this is reported ONCE instead of smeared over six states.',
  },
  {
    entity: 'goodsReceiptLine',
    kind: 'exit-less-state',
    subject: 'Quarantined',
    reason: 'deferred-edge',
    note:
      'Quarantine is a HOLDING state — the release-or-return edge is what makes it one — and it has ' +
      'neither. Same shape as the GR header\'s Quality Hold, one grain down.',
  },

  // ── invoiceMatch ───────────────────────────────────────────────────────────
  {
    entity: 'invoiceMatch',
    kind: 'initial-integrity',
    subject: 'Pending',
    reason: 'substrate-only',
    note:
      'No creation verb: the match sub-flow is rolled up by the invoice header (`invoiceRollup`) and ' +
      'never instantiated. Documented substrate, same as the GR line.',
  },
  {
    entity: 'invoiceMatch',
    kind: 'exit-less-state',
    subject: 'Qty Mismatch',
    reason: 'substrate-only',
    note:
      'A variance verdict with NO RE-MATCH EDGE — once the rollup lands here the sub-flow cannot ' +
      'progress. Substrate rather than deferred-edge: the flow is never instantiated, so the missing ' +
      'edge has never been reachable by anything. It becomes a deferred-edge the day it is.',
  },
  {
    entity: 'invoiceMatch',
    kind: 'exit-less-state',
    subject: 'Price Variance',
    reason: 'substrate-only',
    note: 'The twin of `Qty Mismatch`, and the same reasoning applies unchanged.',
  },

  // ── rfq — ⚠️ NO ROWS. All three are GONE (PF-1a · D-1). ────────────────────
  // The three that stood here were one cause: `initial: 'Draft'` contradicting a
  // creation verb that births at `Open`. Creation now births at `Draft`, so the
  // initial is true, `Draft` is reachable, and `t_rfq_publish` fires. Kept as a
  // comment and not silently deleted, because "this flow used to be the worst
  // one in the census" is the fact a reader of a shrinking list most wants.

  // ── purchaseRequisition ────────────────────────────────────────────────────
  {
    entity: 'purchaseRequisition',
    kind: 'unauthored-cascade',
    subject: 't_pr_source',
    reason: 'authored-unwired',
    note:
      'Declares `trigger: \'cascade\'` — "another transition fans out into me" — and NO SOURCE NAMES ' +
      'IT in `cascades.ts`. The sentence has no subject: nothing can fire it, and its `from` states ' +
      'are reachable, so it is not even caught as a dead transition.',
  },
  {
    entity: 'purchaseRequisition',
    kind: 'unauthored-cascade',
    subject: 't_pr_convert',
    reason: 'authored-unwired',
    note: 'The PR→PO conversion cascade, unauthored for the same reason as `t_pr_source`.',
  },

  // ── compliance ─────────────────────────────────────────────────────────────
  {
    entity: 'compliance',
    kind: 'initial-integrity',
    subject: 'Missing',
    reason: 'born-state',
    note:
      'NO creation verb BY DESIGN, and the registration comment says so: a required compliance cell ' +
      'exists because the requirement matrix says a supplier × scheme needs a certificate, so ' +
      '`Missing` is the natural born-state. The one row here that is an intended shape rather than a ' +
      'gap — which is exactly why the reason vocabulary distinguishes it from `substrate-only`.',
  },

  // ── requirementResponse — ⚠️ NO ROWS. Both are GONE (PF-1b · D-1). ─────────
  // `Draft` (unreachable) and `t_requirementresponse_promote` (dead) were the
  // RFQ contradiction in a second flow, and they were the two rows PF-1a
  // deliberately did NOT sweep along: D-1 rested on a stated fact about SOURCING
  // practice, and whether a supplier drafts before submitting was a different
  // question. The operator answered it — SUPPLIERS DRAFT TOO — so creation
  // births at `Draft` and promote is the submission. Kept as a comment because
  // "this flow was ruled separately, and on purpose" is the fact a reader of a
  // shrinking list would otherwise have to reconstruct.

  // ── enforcement ────────────────────────────────────────────────────────────
  {
    entity: 'enforcement',
    kind: 'initial-integrity',
    subject: 'Governed',
    reason: 'substrate-only',
    note:
      'A DEGENERATE SINGLE-STATE LEDGER MACHINE with no creation verb: the entity IS the governed ' +
      'check, and the governed checks are a frozen closed vocabulary in `lib/enforcement.ts`, not ' +
      'rows anybody creates. The recording verb is statePreserving, so it is neither an entry nor an ' +
      'exit, and the state is correctly declared terminal. ' +
      '⚠️ THIS NOTE DELIBERATELY DOES NOT SPELL THE VOCABULARY\'S IDENTIFIER: the enforcement ' +
      'consumer census (`lib/enforcement.test.ts`) matches TEXT, so writing the name here would have ' +
      'enrolled a document that imports nothing as a CONSUMER of that module. `DESCRIBE-DONT-RENDER-01` ' +
      '— name the mechanism, never render it.',
  },
]);
