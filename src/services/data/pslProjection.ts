// ─────────────────────────────────────────────────────────────────────────────
// PSL EXPIRY PROJECTION (law 0.5) — the fifth entity projection, beside
// `complianceProjection`, `invoiceProjection`, `obligationProjection` and
// `contractExpiry`, and following the same shape: a pure function of
// `(row, now)`, no store, no clock of its own.
//
// ⚠️ **EVERY CONVENTION BELOW IS COPIED FROM `contractExpiry.ts` DELIBERATELY,
// AND EACH ONE CARRIES ITS REASON RATHER THAN ITS PROVENANCE** — a convention
// inherited without its argument is a convention that gets re-derived wrongly.
//
//   1. ONE `if … return` PER OUTCOME, NEVER A TERNARY. `projectionGate`'s
//      write-site matcher recognises `return 'X'` and does not see a state
//      inside a conditional expression — a ternary here would leave these
//      states reading `stored-in-fixtures` in the gate while this file computed
//      them.
//   2. THE IN-FORCE GUARD IS LOAD-BEARING. A clock may only retire a listing
//      that is still running. A `Withdrawn` or `Rejected` listing did not run
//      out, it was stopped; a `Proposed` one has not started. A bare
//      `isPast(validUntil)` re-labels a refused proposal as "expired", which is
//      a different and false sentence. `pslProjection.test.ts` ships both
//      acquittals as assertions.
//   3. `null` DAYS KEEPS THE STORED LIFECYCLE. An unreadable or absent date
//      must not manufacture an alarm — `documentExpiry`'s `'no-expiry'` arm and
//      `contractDisplayStatus`'s same choice.
//   4. ITS OWN WINDOW CONSTANT, NOT A SHARED ONE. See
//      `PSL_EXPIRING_WINDOW_DAYS`.
//
// ── ⚠️ PUBLICATION IS NOT PROJECTED HERE, AND THAT IS THE POINT ─────────────
//   Operator ruling: publication and in-force are INDEPENDENT axes. A listing
//   may be published and expired, or in force and unpublished. So this file
//   NEVER reads `publishedAt` — `isPublished` lives on the record
//   (`pslListing.ts`), is decided by null-or-not, and needs no clock at all.
//   Folding publication into `PslDisplayStatus` would make the two axes one
//   union and delete half the states the ruling requires to exist.
// ─────────────────────────────────────────────────────────────────────────────

import {
  isInForceLifecycle,
  PSL_STATUSES,
  type PslLifecycle,
  type PslListing,
  type PslStatus,
} from './pslListing';
import { daysUntil, isPast } from './dayProjection';

const MS_PER_DAY = 86_400_000;

// ─── The cap (R2–R4) ─────────────────────────────────────────────────────────

/**
 * THE PORTAL-WIDE DEFAULT VALIDITY CAP, IN DAYS.
 *
 * ⚠️ **THIS IS A CONSTANT STANDING IN FOR A SETTING THAT DOES NOT EXIST YET,
 * AND THE SHAPE IS THE TREE'S OWN.** `lib/enforcement.ts` already models
 * exactly this situation: a governed value the ledger may carry, a ceiling that
 * applies when it does not, and a `source` that SAYS WHICH — its
 * `NO_SETTING_RECORDED` member exists because *"nothing has been decided" is a
 * different sentence from "somebody chose this", and an operator acts on the
 * difference.* `PslCapSource` below is that member set, at three.
 *
 * The setting VERB (`t_psl_cap_set`, on the `t_enforcement_set` pattern) is P3.
 * When it lands, `effectiveCap` gains a ledger lookup ahead of this constant
 * and `NO_SETTING_RECORDED` starts meaning what it says. Nothing else moves.
 */
export const PSL_DEFAULT_CAP_DAYS = 365;

/**
 * THE ABSOLUTE CEILING. No per-listing override may exceed it.
 *
 * ⚠️ **ITS VALUE IS AN OPEN OPERATOR DECISION AND THE DESIGN DOES NOT DEPEND ON
 * IT.** 730 days (two years) is a PLACEHOLDER chosen only so the bound is
 * exercisable; it is pinned by `pslProjection.test.ts` as a range a reader would
 * call "longer than the default and not unbounded", never as an equality, so a
 * ruling that moves it does not redden a test that was never about the number.
 *
 * ⚠️ **AND THE POLICY'S CONTRACT-TERM EXCEPTION IS NOT IMPLEMENTED HERE.** The
 * policy allows a validity longer than the cap where a signed contract runs
 * longer. `Contract` carries no material codes, so nothing can say which
 * contract covers which listed material — see `pslListing.ts`'s stated limits.
 * The ceiling below is therefore ABSOLUTE in P1, with no exception arm, which
 * is the honest shape: an exception that cannot be evidenced must not be
 * expressible.
 */
export const PSL_CAP_CEILING_DAYS = 730;

/**
 * THE WINDOW BEFORE EXPIRY WITHIN WHICH A LISTING READS AS EXPIRING.
 *
 * ⚠️ **DELIBERATELY ITS OWN NUMBER.** `dayProjection`'s own note is the rule:
 * *"collapsing two windows because they are both windows is how one surface
 * silently adopts another's policy."* This is not `DOCUMENT_EXPIRING_WINDOW_DAYS`
 * (180, the document shelf), not `EXPIRING_WINDOW_DAYS` (90, the halal cert
 * registry) and not `CONTRACT_RENEWAL_HORIZON_DAYS` (180, a planning horizon).
 *
 * 90 days is the lead time a buyer needs to open a competitive event before a
 * designation lapses and the field reopens — which is the decision this badge
 * exists to inform, and a different question from all three above.
 *
 * ⚠️ A per-row term (contracts' `noticeRequiredDays`) was considered and
 * rejected: a contract's notice period is an AUTHORED TERM of that agreement,
 * already collected and already rendered. A listing has no negotiated notice
 * period — inventing a per-row field nothing produces would be a stored value
 * with no reader, which is what `storedFieldGate` exists to catch.
 */
export const PSL_EXPIRING_WINDOW_DAYS = 90;

/**
 * WHY the cap in force is the cap in force.
 *
 * Every member names a different reason and none overstates —
 * `EnforcementModeSource`'s rule, which exists because *"a provenance field
 * that overstates is worse than an absent one, because it is actionable."*
 */
export type PslCapSource =
  /** The listing carries its own override and it is within the ceiling. */
  | 'LISTING_OVERRIDE'
  /** No override on this listing. The portal default applies — and nothing has
   *  been DECIDED for it, because the setting verb is P3. */
  | 'NO_SETTING_RECORDED'
  /** An override exists and EXCEEDS the ceiling, so the ceiling applies. Named
   *  separately so "bounded" is never mistaken for "chosen". */
  | 'CEILING_BOUNDED';

export interface PslCap {
  /** The cap actually in force, in days. */
  readonly days: number;
  readonly source: PslCapSource;
}

/**
 * The cap in force for one listing: the per-listing override if present, else
 * the portal default, bounded in every case by `PSL_CAP_CEILING_DAYS`.
 *
 * ⚠️ NO CLOCK. The cap is a duration, not an instant — it is decidable from the
 * row alone, which is why this function takes no `now`.
 */
export function effectiveCap(row: Pick<PslListing, 'capDaysOverride'>): PslCap {
  const override = row.capDaysOverride;
  if (override === null) {
    // The default is itself bounded, so a future ruling that lowers the ceiling
    // below the default cannot leave the default silently in force above it.
    if (PSL_DEFAULT_CAP_DAYS > PSL_CAP_CEILING_DAYS)
      return { days: PSL_CAP_CEILING_DAYS, source: 'CEILING_BOUNDED' };
    return { days: PSL_DEFAULT_CAP_DAYS, source: 'NO_SETTING_RECORDED' };
  }
  if (override > PSL_CAP_CEILING_DAYS)
    return { days: PSL_CAP_CEILING_DAYS, source: 'CEILING_BOUNDED' };
  return { days: override, source: 'LISTING_OVERRIDE' };
}

/**
 * The day a listing's designation ACTUALLY ends: the authored `validUntil`, or
 * the cap measured from `validFrom`, whichever comes FIRST.
 *
 * ⚠️ **COMPUTED, NEVER STORED, AND IT TAKES NO CLOCK.** It is arithmetic over
 * two authored dates and a constant. Storing it would be a value that goes
 * false the day the ceiling is ruled on, with nothing to notice — which is
 * `FLOOR-IN-PROSE-01` with a date attached.
 *
 * `null` when `validFrom` is unreadable: the cap cannot be measured from a day
 * that does not exist, and guessing one would manufacture an end date nobody
 * authored.
 */
export function effectiveValidUntil(
  row: Pick<PslListing, 'validFrom' | 'validUntil' | 'capDaysOverride'>,
): string | null {
  const from = Date.parse(row.validFrom.slice(0, 10));
  if (!Number.isFinite(from)) return null;
  const capped = new Date(from + effectiveCap(row).days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const authored = row.validUntil.slice(0, 10);
  if (!Number.isFinite(Date.parse(authored))) return capped;
  return authored < capped ? authored : capped;
}

// ─── The display projection ──────────────────────────────────────────────────

/**
 * What a reader sees on the validity axis.
 *
 * ⚠️ **A SUPERSET OF `PslLifecycle`, NOT A NARROWED UNION** — the same choice
 * `ContractDisplayStatus` makes and the opposite of `ObligationDisplayState`'s.
 * The stored union deliberately does NOT carry `Expiring` / `Expired`, so a
 * fixture cannot author a clock state; adding them HERE rather than there is
 * what keeps that true while still giving a surface one word to render.
 */
export type PslDisplayStatus = PslLifecycle | 'Scheduled' | 'Expiring' | 'Expired';

/**
 * A listing's display status, COMPUTED (law 0.5).
 *
 *   Scheduled := lifecycle is in-force AND validFrom is still in the future
 *   Expired   := lifecycle is in-force AND isPast(daysUntil(effectiveValidUntil))
 *   Expiring  := lifecycle is in-force AND days <= PSL_EXPIRING_WINDOW_DAYS
 *   otherwise the stored lifecycle, unchanged.
 *
 * ⚠️ The clock is compared against `effectiveValidUntil`, never the authored
 * `validUntil` — otherwise the cap would bound what the record SAYS while the
 * badge kept reading the uncapped date, and a listing would render in force
 * past its own ceiling.
 *
 * ⚠️ **`Scheduled` WAS ADDED BECAUSE A PROBE CONVICTED THE FIRST DRAFT, AND
 * THE DEFECT IS WORTH NAMING RATHER THAN QUIETLY PATCHING.** The first version
 * read only the END of the validity, so a listing granted today and effective
 * NEXT QUARTER was in force immediately — and a `Sole Source` row dated to
 * start later would have suspended competitive bidding from the day it was
 * typed. `pslSourcingSeam.test.ts`'s injected-instant spec found it by asking
 * the seam a question far enough in the past that nothing had started yet.
 * A validity has two ends; reading one of them is not reading it.
 */
export function pslDisplayStatus(
  row: Pick<PslListing, 'lifecycle' | 'validFrom' | 'validUntil' | 'capDaysOverride'>,
  nowIso: string,
): PslDisplayStatus {
  if (!isInForceLifecycle(row.lifecycle)) return row.lifecycle;
  // The START boundary, on the same `isPast` convention as the end — a listing
  // effective TODAY is effective, because `isPast(0)` is true.
  const begun = daysUntil(row.validFrom, nowIso);
  if (begun !== null && !isPast(begun)) return 'Scheduled';
  const days = daysUntil(effectiveValidUntil(row), nowIso);
  if (days === null) return row.lifecycle;
  if (isPast(days)) return 'Expired';
  if (days <= PSL_EXPIRING_WINDOW_DAYS) return 'Expiring';
  return row.lifecycle;
}

/**
 * Is this listing IN FORCE at `nowIso` — i.e. does it actually grant anything?
 *
 * ⚠️ **PUBLICATION IS NOT CONSULTED.** A listing that has not been published is
 * still in force for the buyer team; publication decides who has been TOLD, not
 * what is true. See this file's header.
 */
export function isPslInForce(
  row: Pick<PslListing, 'lifecycle' | 'validFrom' | 'validUntil' | 'capDaysOverride'>,
  nowIso: string,
): boolean {
  const shown = pslDisplayStatus(row, nowIso);
  return shown === 'Listed' || shown === 'Expiring';
}

// ─── Best status (the Directory badge) ───────────────────────────────────────

/**
 * THE BEST STATUS ACROSS A SUPPLIER'S LISTINGS — `null` when none is in force.
 *
 * ⚠️ **RESTRICTIVENESS IS THE AXIS, NOT DESIRABILITY, AND THE REASON DECIDES
 * THE ORDER.** This badge exists to warn a buyer that COMPETITIVE BIDDING IS
 * SUSPENDED for this supplier. `Sole Source` and `Mandatory` both suspend it;
 * `Validated` explicitly does not — a Validated supplier is pre-qualified and
 * STILL COMPETES. So the ladder ranks by how much competition is removed:
 *
 *      Sole Source  >  Mandatory  >  Validated
 *
 * Read as "which is the best supplier" the order would be arguable and the
 * badge would be decoration. Read as "may I run an event?" it is forced.
 *
 * ⚠️ **STAGE 1 RUNS FIRST, AND IT IS WHERE THE CLOCK LIVES.** Anything not in
 * force is DISCARDED before the ladder is consulted — an expired Mandatory
 * grants nothing, which is the policy's own sentence: *an expired status
 * reopens the field to competitive bidding.* A ladder applied first would let a
 * lapsed designation outrank a live one and tell a buyer not to bid when they
 * must.
 *
 * `null` means NOT LISTED, and a surface must never render it as "Expired" —
 * "never qualified" and "qualified, and the qualification lapsed" are different
 * facts and only the second implies an act somebody failed to take.
 */
export function bestPslStatus(
  rows: readonly PslListing[],
  nowIso: string,
): PslStatus | null {
  // Stage 1 — the clock. Discard everything not in force.
  const inForce = rows.filter((r) => isPslInForce(r, nowIso));
  if (inForce.length === 0) return null;
  // Stage 2 — the ladder, read off the vocabulary's own declaration order so
  // there is no second ranking to drift from it.
  for (const status of PSL_STATUSES) {
    if (inForce.some((r) => r.status === status)) return status;
  }
  return null;
}

/**
 * Every listing a supplier holds, in a stable order: in-force first, then by
 * restrictiveness, then by the day they end. A surface renders this directly,
 * so the order is part of the contract rather than a detail of the caller.
 */
export function listingsForSupplier(
  rows: readonly PslListing[],
  supplierId: string,
  nowIso: string,
): PslListing[] {
  const rank = (r: PslListing): number => PSL_STATUSES.indexOf(r.status);
  return rows
    .filter((r) => r.supplierId === supplierId)
    .slice()
    .sort((a, b) => {
      const af = isPslInForce(a, nowIso) ? 0 : 1;
      const bf = isPslInForce(b, nowIso) ? 0 : 1;
      if (af !== bf) return af - bf;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (effectiveValidUntil(a) ?? '').localeCompare(effectiveValidUntil(b) ?? '');
    });
}

/** The scope of one listing, as a short human string. Codes are DATA (opaque
 *  per C9 §3) and are never translated; the JOINING word is the caller's. */
export function pslScopeCodes(row: PslListing): readonly string[] {
  if (row.scope.kind === 'material') return row.scope.materialCodes;
  if (row.scope.kind === 'group') return [row.scope.group];
  return [row.scope.category];
}

/** Is a listing's scope one this listing can be matched on today? Only
 *  `'material'` has a producer (`pslListing.ts`), so this is how a consumer
 *  refuses the unreachable members WITHOUT pretending to handle them. */
export function hasMaterialScope(
  row: PslListing,
): row is PslListing & { scope: { kind: 'material'; materialCodes: readonly string[] } } {
  return row.scope.kind === 'material';
}

/** Re-exported so a consumer needs one import for the whole axis. */
export type { PslLifecycle, PslStatus };
