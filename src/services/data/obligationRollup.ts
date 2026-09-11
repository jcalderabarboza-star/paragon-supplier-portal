// ────────────────────────────────────────────────────────────────────────────
// THE OBLIGATION ROLLUP — a contract's obligation counters, COMPUTED.
//
// ── WHAT THIS RETIRES ───────────────────────────────────────────────────────
//   `Contract.obligationCount` and `Contract.obligationsMet` were stored
//   integers on the contract row, written by 13 fixtures and by the New Contract
//   wizard, and read by NOTHING — swept across every commit in the repository,
//   with `.performanceScore` (7 read sites) as the bilateral control on the same
//   matcher in the same run. Measured against the obligation store they
//   disagreed on **8 of 13** contracts: `obligationsMet` on 8, `obligationCount`
//   on 1 (`ctr-013` claimed 3 against a store holding 0).
//
//   ⚠️ **THE DIRECTION WAS UNIFORM AND IT IS WHAT DECIDED THE DISPOSAL.** The
//   stored `met` was ≥ the true count on every row, never below, while
//   `obligationCount` agreed on 12 of 13 — so the obligation fixture was not
//   thin. `ctr-008` is the decisive row: it stored `obligationCount: 4,
//   obligationsMet: 4` — *every obligation met* — while one of its own four
//   obligations was `Overdue` and one `In Progress`. That is a header
//   contradicting its own lines, not a gap in the lines.
//
// ── ⚠️ THE LAW, AND THE EXTENSION THIS FILE IS ──────────────────────────────
//   #318 retired `Contract.daysUntilExpiry` and `ComplianceRow.daysLeft`, and
//   #331 retired `Shipment.daysInTransit` and `Shipment.delayDays`, on one rule:
//
//       A STORED VALUE MUST NOT BE A FUNCTION OF THE READ INSTANT.
//
//   **That rule names its independent variable, and the variable is not the
//   point of it.** All four retired fields were differences against `now`, so
//   the rule was written in the only vocabulary those four needed — and
//   `dayCounts.ts` inherited the narrowness at the matcher (`\w*[Dd]ays\w*`) and
//   in its own discriminator. The general form, stated here because this is the
//   first field to need it:
//
//       ⚠️ A STORED VALUE MUST NOT BE A FUNCTION OF DATA THE TREE ALSO HOLDS
//       SEPARATELY. The read instant is ONE such variable. Another stored
//       collection is another, and it fails the same way for the same reason:
//       the two sources drift, and nothing makes them meet.
//
//   ⚠️ **AND THE TWO CLASSES ARE NOT THE SAME BATCH, WHICH IS WHY THE
//   EXTENSION IS STATED RATHER THAN ASSUMED.** A clock field is wrong the day
//   after it is typed and its computed replacement REPRODUCES the authored
//   literal once the fixtures are anchored — that is exactly what #331
//   measured before retiring: all 16 shipment literals reproduced at
//   `DECLARED_PRESENT`. Here the computed value CONTRADICTS the authored one on
//   8 of 13 rows. A clock retirement is a no-op on the data; this one is a
//   correction to it, and a batch that treats them as one shape will expect the
//   wrong evidence.
//
// ── ⚠️ WHY THIS FUNCTION TAKES NO `now` ─────────────────────────────────────
//   Every other projection in this directory is `(row, nowIso)`. This one is
//   `(contractId, obligations)` and the difference is the finding, not an
//   omission: `met` is decided by `isObligationComplete`, which reads
//   `completedDate` and no clock. Accepting a `nowIso` it never used would put
//   this file back in the class it exists to distinguish itself from.
//
// ── ⚠️ WHAT DOES *NOT* CHANGE, SO THE NEXT READER DOES NOT LOOK FOR IT ──────
//   `obligation` has no `CommandTarget` (`getKnownFlows()` minus
//   `WIRED_COMMAND_TARGETS`), so `t_obligation_complete` cannot fire and nothing
//   in the product writes `completedDate`. The counters are honest about the
//   store; the store is still fixture-only. Wiring the target is filed, not
//   built here.
// ────────────────────────────────────────────────────────────────────────────

import type { ContractObligation } from '../../data/mockObligations';
import { isObligationComplete } from './obligationProjection';

/** A contract's obligation counters. Both derived; neither stored. */
export interface ObligationRollup {
  /** Every obligation this contract owns. */
  readonly total: number;
  /** Those of them that are complete — `isObligationComplete`, one source. */
  readonly met: number;
}

/**
 * Roll `obligations` up for one contract.
 *
 * Pure, and over an INJECTED collection rather than an imported fixture: that is
 * what lets `obligationRollup.test.ts` add an obligation and watch the count
 * move with no fixture edited — the property the stored integers could never
 * have had.
 */
export function obligationRollup(
  contractId: string,
  obligations: readonly ContractObligation[],
): ObligationRollup {
  let total = 0;
  let met = 0;
  for (const o of obligations) {
    if (o.contractId !== contractId) continue;
    total += 1;
    if (isObligationComplete(o)) met += 1;
  }
  return { total, met };
}
