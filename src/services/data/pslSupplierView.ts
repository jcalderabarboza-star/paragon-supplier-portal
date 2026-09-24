// ─────────────────────────────────────────────────────────────────────────────
// THE PREFERRED SUPPLIER LIST — P4 · WHAT THE SUPPLIER IS SHOWN.
//
// Operator ruling R5: a listing is INTERNAL until the team deliberately
// PUBLISHES it, and only then may the supplier see its own status. R5(c): once
// published, the supplier sees the CURRENT status — a change after publication
// reaches them without re-publishing. R5(b): publication is never undone; a
// listing that must stop is WITHDRAWN.
//
// ── ⚠️ WHY THIS FILE EXISTS AT ALL, WHICH IS THE WHOLE DESIGN ──────────────
//   `pslNoSupplierRead.test.ts` asserts that NO supplier surface reaches ANY
//   PSL module, by walking the transitive IMPORT CLOSURE of every supplier-side
//   route. P4 creates the first sanctioned supplier read — and it creates it
//   WITHOUT weakening that assertion by one character.
//
//   The mechanism is a measured property of this tree rather than a trick:
//   `DataServiceContext.tsx` imports `type { IDataService }` and NOTHING ELSE;
//   the concrete `mockDataService` is constructed in `main.tsx` and INJECTED.
//   So no page's import closure ever reaches `MockProcurementService`, and a
//   read enforced THERE is invisible to the guard by construction.
//
//   ⚠️ **THE COROLLARY IS THE RULE THIS FILE ENFORCES: THE PROJECTION RUNS
//   SERVICE-SIDE, NEVER ON THE PAGE.** A supplier surface that computed its own
//   badge would have to value-import `pslProjection.ts`, which IS a PSL module,
//   and the only way to keep the guard green would be an EXEMPTION. An
//   exemption is a hand-written list with one entry, and `pslModules.ts`'s own
//   header records that this guard's two predecessors were hand-written lists
//   that had both already gone stale. So `SupplierPslView` below carries only
//   RENDERABLE STRINGS: every clock comparison, every cap bound and every label
//   lookup has already happened by the time a page sees it.
//
//   ⚠️ **AND THE TREE'S OWN SUPPLIER-SIDE HABIT IS THE OPPOSITE ONE, WHICH IS
//   WHY IT IS NAMED HERE RATHER THAN LEFT TO BE COPIED.**
//   `SupplierCertsExpiringWidget.tsx` imports `documentDisplayState` and
//   projects ON THE PAGE. That is safe only because `documentDisplayState.ts`
//   is not a guarded module. Copying it here would put the hole in the guard.
//
// ── ⚠️ WHAT IS DELIBERATELY ABSENT, AND WHY ABSENCE IS THE POINT ───────────
//   Ruling R-B. SHOWN: status · scope (codes and labels) · validFrom · the
//   EFFECTIVE end date · the display status · `publishedAt`. Everything else on
//   `PslListing` is HIDDEN, and the hard hides each carry their own reason:
//
//     · `justification`      — prose authored FOR THE BUYER TEAM. "No qualified
//                              alternative within the lead-time window" is a
//                              negotiating position, not a status.
//     · `capJustification`   — an EXCEPTION rationale; the most internal string
//                              on the record.
//     · the other three cap fields and the cap SOURCE — a supplier who can see
//                              a cap can compute the uncapped grant, and
//                              `NO_SETTING_RECORDED` vs `PORTAL_DEFAULT` is a
//                              statement about Paragon's own governance.
//     · `evidenceRefs`       — WHICH of the supplier's documents the buyer
//                              leaned on discloses internal weighting.
//     · `statusHistory`      — every entry carries a `reason` written for
//                              internal readers, and the SEQUENCE discloses
//                              that a designation was downgraded.
//                              ⚠️ **ONE INSTANT IS DERIVED FROM IT AND SHOWN:
//                              `withdrawnAt`.** See its own note below — the
//                              alternative was a sentence that names a date on
//                              which the listing was NOT withdrawn, which
//                              browser QA caught rendering *"withdrawn on 19
//                              Mar 2027"*. No reason and no sequence crosses.
//     · `proposedBy` / `decidedBy` / `publishedBy` — all three are
//                              `UNATTRIBUTED: NO_PERSON_IN_SESSION` today, so
//                              there is nothing to show; and when an IdP lands,
//                              naming the internal decider to the counterparty
//                              is a NEW disclosure that must be ruled on then
//                              rather than inherited by default.
//     · the AUTHORED `validUntil` — it is the PRE-CAP number. Rendered beside
//                              the effective date it invites the supplier to
//                              read the longer one as their entitlement.
//
//   ⚠️ **AND `id` IS HIDDEN TOO, WHICH IS NOT PEDANTRY.** `psl-NNN` ids are
//   store-minted in dispatch order, so a supplier who sees `psl-003` learns the
//   SIZE of a corpus that spans every other supplier. `viewKey` below exists
//   because React needs a key and the id cannot be it.
//
// ── LAW 0.5 — NOTHING CLOCK-PROJECTED IS STORED ────────────────────────────
//   `displayStatus` and `effectiveUntil` are computed from `(row, nowIso)` at
//   read, by the SAME `pslProjection.ts` functions the buyer surfaces call.
//   There is no second ladder and no stored badge.
// ─────────────────────────────────────────────────────────────────────────────

import { type PslListing, type PslStatus } from './pslListing';
import {
  effectiveValidUntil,
  pslDisplayStatus,
  pslScopeCodes,
  type PslCapSetting,
  type PslDisplayStatus,
} from './pslProjection';
import { materialEntry } from '../sdc/materialMaster';

/**
 * One scope entry, as the supplier reads it.
 *
 * ⚠️ `code` is DATA and is never translated (C9 §3 makes it contractually
 * opaque). `label` is the master's own product name, or `null` when the master
 * does not know the code — NOT the code echoed back, because a surface must be
 * able to tell "this is what it is called" from "we have nothing but the
 * token". `labelOf` echoes by design and is the wrong instrument here.
 */
export interface SupplierPslScopeItem {
  readonly code: string;
  readonly label: string | null;
}

/**
 * WHAT A SUPPLIER SEES OF ONE OF ITS OWN PUBLISHED LISTINGS.
 *
 * Every member is a string a page can render with no further derivation. There
 * is deliberately no `PslListing` reachable from here — see the header.
 */
export interface SupplierPslView {
  /**
   * A stable React key built ONLY from shown values.
   *
   * ⚠️ It is not the listing id and must never become one: the id discloses the
   * corpus size (header). Nothing resolves it, and it is not an identifier the
   * supplier could quote back to Paragon.
   */
  readonly viewKey: string;
  /** The designation itself. A member of the CENTRAL vocabulary — the surface
   *  renders it through `statusLabelKey`, never through a PSL-local map. */
  readonly status: PslStatus;
  /** The validity axis as one word, computed. Also central vocabulary. */
  readonly displayStatus: PslDisplayStatus;
  readonly scope: readonly SupplierPslScopeItem[];
  /** The day the designation takes effect. Authored, shown. */
  readonly validFrom: string;
  /** The day it ACTUALLY ends — `validUntil` bounded by the cap. `null` when
   *  `validFrom` is unreadable, exactly as `effectiveValidUntil` returns it;
   *  the surface renders an em dash rather than inventing a date. */
  readonly effectiveUntil: string | null;
  /** When the team shared it. Non-empty by construction: an unpublished listing
   *  never becomes a view. */
  readonly publishedAt: string;
  /**
   * The day the designation was WITHDRAWN, or `null` when it was not.
   *
   * ⚠️ **THIS IS A NARROW, DELIBERATE EXCEPTION TO "statusHistory IS HIDDEN",
   * AND IT EXISTS BECAUSE WITHOUT IT THE SENTENCE ON THE SCREEN IS FALSE.**
   * Browser QA read *"This designation was withdrawn on 19 Mar 2027"* — a
   * FUTURE date, on something already withdrawn, because the surface had
   * nothing but `effectiveUntil` to put in the sentence. That is the validity's
   * end, not the day it stopped, and a supplier reading it would plan against a
   * designation that no longer exists.
   *
   * ⚠️ **WHAT IS DISCLOSED IS ONE INSTANT, NEVER THE LEDGER.** R-B hides
   * `statusHistory` because its entries carry REASONS written for internal
   * readers and because the SEQUENCE discloses that a designation was
   * downgraded. Neither is true of a single date on which a listing the
   * supplier was already told about stopped applying to them — that is the
   * fact the sentence asserts, and the alternative is to assert it falsely or
   * not at all.
   */
  readonly withdrawnAt: string | null;
}

/**
 * Project ONE published listing into what its supplier may see.
 *
 * ⚠️ **`nowIso` IS A PARAMETER AND IS NEVER READ FROM THE CLOCK HERE.** The
 * caller decides the instant; `readingInstantGate` classifies this site as
 * FORWARDED and follows the caller. `MockProcurementService` supplies
 * `DECLARED_PRESENT`.
 *
 * ⚠️ It does NOT check publication. That is the SERVICE's second filter, kept
 * separate so a probe can kill it alone — folding it in here would make one
 * predicate out of two, and a single mutation would then read as two.
 */
export function toSupplierPslView(
  row: PslListing,
  nowIso: string,
  ledger?: readonly PslCapSetting[],
): SupplierPslView {
  const codes = pslScopeCodes(row);
  const scope = codes.map((code) => ({
    code,
    label: materialEntry(code)?.label ?? null,
  }));
  const effectiveUntil = effectiveValidUntil(row, ledger);
  // ⚠️ THE LAST WITHDRAWAL, not the first: `statusHistory` is append-only and a
  // listing's lifecycle can only reach `Withdrawn` once today, but reading the
  // LAST entry is correct under any future machine that could re-enter it,
  // whereas reading the first would silently report a stale instant.
  const withdrawnAt =
    row.lifecycle === 'Withdrawn'
      ? ([...row.statusHistory].reverse().find((h) => h.lifecycle === 'Withdrawn')?.at ?? null)
      : null;
  return {
    viewKey: `${row.validFrom}|${effectiveUntil ?? 'none'}|${codes.join(',')}`,
    status: row.status,
    displayStatus: pslDisplayStatus(row, nowIso, ledger),
    scope,
    validFrom: row.validFrom,
    effectiveUntil,
    publishedAt: row.publishedAt ?? '',
    withdrawnAt,
  };
}
