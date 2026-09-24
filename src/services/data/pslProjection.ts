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
// ── ⚠️ THE CAP LEDGER IS A PARAMETER, NOT A STORE READ INSIDE A PURE FN ────
//   P3 built `t_psl_cap_set`, so the portal default is now a RECORDED DECISION
//   on an append-only ledger rather than a module constant. `effectiveCap` and
//   everything downstream of it therefore take the ledger as an OPTIONAL last
//   parameter, defaulted to `pslCapSettingStore.all()` —
//   `effectiveEnforcement(ledger, checkId, instant)`'s shape, with the default
//   added so a policy hook needs no wiring and `pslSourcingSeam`'s own
//   `rows = …` convention is matched rather than contradicted.
//
//   ⚠️ **AND P1's "NOTHING ELSE MOVES" WAS WRONG, WHICH IS RECORDED RATHER
//   THAN QUIETLY FIXED.** The sentence read *"`effectiveCap` gains a ledger
//   lookup ahead of this constant and `NO_SETTING_RECORDED` starts meaning what
//   it says. Nothing else moves."* Measured when the verb landed: a ledger read
//   at the leaf is invisible to a caller that wants to ask *"what would this
//   render under a DIFFERENT ledger?"*, which is what every probe and the
//   default-cap spec need. So the parameter threads through **eight** function
//   signatures, all of them additive and all of them defaulted. The list is in
//   the P3 batch report; the point recorded here is that the cost was real.
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
import {
  PSL_DEFAULT_CAP_SETTING_ID,
  pslCapSettingStore,
  pslSettingInForce,
  type PslCapSetting,
} from './mock/stores/pslCapSettingStore';

const MS_PER_DAY = 86_400_000;

// ─── The cap (R2–R4) ─────────────────────────────────────────────────────────

/**
 * THE FALLBACK VALIDITY CAP, IN DAYS — what applies when NOBODY HAS RECORDED A
 * PORTAL DEFAULT.
 *
 * ⚠️ **IT STOPPED BEING "A CONSTANT STANDING IN FOR A SETTING THAT DOES NOT
 * EXIST YET" AT P3, AND THE OLD SENTENCE IS REPLACED RATHER THAN LEFT TO BE
 * READ CHARITABLY.** `t_psl_cap_set` exists, `pslCapSettingStore` holds its
 * ledger, and `effectiveCap` looks that ledger up AHEAD of this constant. What
 * this number now is, exactly: the value in force over an EMPTY ledger.
 *
 * The shape is `lib/enforcement.ts`'s and the reason is unchanged — a governed
 * value the ledger may carry, a ceiling when it does not, and a `source` that
 * SAYS WHICH, because *"nothing has been decided" is a different sentence from
 * "somebody chose this", and an operator acts on the difference.* **Do not
 * restate how many members `PslCapSource` holds**: the sentence here said
 * *"that member set, at three"* and P3 made it four, which is
 * `FLOOR-IN-PROSE-01` in a doc comment two declarations above the union it
 * miscounts. Count the union.
 *
 * ⚠️ **AND THE LEDGER IS NOT SEEDED, DELIBERATELY** — the store ships empty on
 * `enforcementSettingStore`'s ruling, so `NO_SETTING_RECORDED` is the honest
 * cold-start answer rather than a decision nobody took.
 */
export const PSL_DEFAULT_CAP_DAYS = 365;

/**
 * THE ABSOLUTE CEILING. No per-listing override may exceed it.
 *
 * ⚠️ **730 DAYS IS THE OPERATOR'S RULING, NOT A PLACEHOLDER — CORRECTED AT P3
 * (ruling i).** The sentence here read *"its value is an OPEN OPERATOR DECISION
 * … 730 days is a PLACEHOLDER chosen only so the bound is exercisable"*, and it
 * stayed true exactly as long as nothing enforced the number. P3 gave it two
 * verbs that REFUSE on it (`PSL_CAP_WITHIN_CEILING`,
 * `PSL_DEFAULT_CAP_WITHIN_CEILING`) and a refusal sentence that STATES it, so a
 * person now meets this figure. A number a surface quotes back to somebody is
 * not a placeholder, whatever a comment says.
 *
 * It is still pinned by `pslProjection.test.ts` as a RANGE rather than an
 * equality — longer than the default, and not unbounded — because a later
 * ruling that moves it must redden the verbs that quote it and not a projection
 * test that was never about the number.
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
  /**
   * No override on this listing, and NOBODY HAS SET A PORTAL DEFAULT EITHER, so
   * `PSL_DEFAULT_CAP_DAYS` applies.
   *
   * ⚠️ **THIS MEMBER NOW MEANS WHAT IT SAYS, WHICH IS WHAT P3 WAS FOR.** Until
   * `t_psl_cap_set` existed it was the only answer the constant could give, so
   * it could not distinguish *"nothing has been decided"* from *"somebody chose
   * this"* — the exact difference `EnforcementModeSource` was split to carry.
   */
  | 'NO_SETTING_RECORDED'
  /** No override on this listing, and a portal default HAS been recorded
   *  through `t_psl_cap_set`. Somebody chose this, and an operator acts on the
   *  difference — which is the whole reason it is a separate member rather
   *  than a second meaning for `NO_SETTING_RECORDED`. */
  | 'PORTAL_DEFAULT'
  /**
   * The cap that would otherwise apply EXCEEDS the ceiling, so the ceiling
   * applies. Named separately so "bounded" is never mistaken for "chosen".
   *
   * ⚠️ **UNREACHABLE THROUGH THE MACHINE, AND KEPT ANYWAY — THE REASON IS THE
   * WHOLE OF ITS JUSTIFICATION.** Both cap verbs refuse a value above
   * `PSL_CAP_CEILING_DAYS`, so no dispatch can produce a row or a setting that
   * lands here. What CAN is a later ruling that LOWERS the ceiling: a 700-day
   * override or portal default recorded legitimately under a 730-day ceiling
   * would exceed a 365-day one the day it is ruled, and this arm is what stops
   * that cap staying silently in force above the new bound. Deleting the arm
   * would make the ceiling advisory for every row recorded before it moved.
   *
   * ⚠️ **AND ITS COVERAGE MOVED FROM SEEDED TO SYNTHETIC AT P3** (operator
   * ruling h). The retired corpus carried `psl-005` with a 2000-day override
   * precisely to exercise this arm from DATA; the machine now refuses that row,
   * so `pslProjection.test.ts` covers it with SYNTHETIC inputs — both an
   * over-ceiling override and an over-ceiling portal default — and says so at
   * the site.
   */
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
export function effectiveCap(
  row: Pick<PslListing, 'capDaysOverride'>,
  ledger: readonly PslCapSetting[] = pslCapSettingStore.all(),
): PslCap {
  const override = row.capDaysOverride;
  if (override !== null) {
    // The ceiling bounds an override even though the verb refuses one above it:
    // a row recorded under a HIGHER ceiling must not stay in force above a
    // lower one the day a ruling moves it. See `CEILING_BOUNDED`.
    if (override > PSL_CAP_CEILING_DAYS)
      return { days: PSL_CAP_CEILING_DAYS, source: 'CEILING_BOUNDED' };
    return { days: override, source: 'LISTING_OVERRIDE' };
  }
  // No override. The PORTAL DEFAULT applies — recorded, or the constant.
  const setting = pslSettingInForce(ledger, PSL_DEFAULT_CAP_SETTING_ID);
  const days = setting === null ? PSL_DEFAULT_CAP_DAYS : setting.days;
  // The default is itself bounded, for the reason above and for the one this
  // line already carried: a future ruling that lowers the ceiling below the
  // default cannot leave the default silently in force above it.
  if (days > PSL_CAP_CEILING_DAYS)
    return { days: PSL_CAP_CEILING_DAYS, source: 'CEILING_BOUNDED' };
  // ONE `if … return` PER OUTCOME, never a ternary (convention 1 at the top of
  // this file): `projectionGate`'s write-site matcher recognises `return '...'`
  // and cannot see a member inside a conditional expression.
  if (setting === null) return { days, source: 'NO_SETTING_RECORDED' };
  return { days, source: 'PORTAL_DEFAULT' };
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
  ledger?: readonly PslCapSetting[],
): string | null {
  const from = Date.parse(row.validFrom.slice(0, 10));
  if (!Number.isFinite(from)) return null;
  const capped = new Date(from + effectiveCap(row, ledger).days * MS_PER_DAY)
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
  ledger?: readonly PslCapSetting[],
): PslDisplayStatus {
  if (!isInForceLifecycle(row.lifecycle)) return row.lifecycle;
  // The START boundary, on the same `isPast` convention as the end — a listing
  // effective TODAY is effective, because `isPast(0)` is true.
  const begun = daysUntil(row.validFrom, nowIso);
  if (begun !== null && !isPast(begun)) return 'Scheduled';
  const days = daysUntil(effectiveValidUntil(row, ledger), nowIso);
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
  ledger?: readonly PslCapSetting[],
): boolean {
  const shown = pslDisplayStatus(row, nowIso, ledger);
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
  ledger?: readonly PslCapSetting[],
): PslStatus | null {
  // Stage 1 — the clock. Discard everything not in force.
  const inForce = rows.filter((r) => isPslInForce(r, nowIso, ledger));
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
  ledger?: readonly PslCapSetting[],
): PslListing[] {
  return orderListingsForDisplay(
    rows.filter((r) => r.supplierId === supplierId),
    nowIso,
    ledger,
  );
}

/**
 * THE ORDER ALONE — no filtering of any kind.
 *
 * ⚠️ **SPLIT OUT OF `listingsForSupplier` BECAUSE A MUTATION PROBE PROVED THE
 * COMBINED FUNCTION MADE A CALLER'S OWN TENANCY FILTER UNKILLABLE.** P4's
 * supplier read states tenancy and publication as two independent filters, each
 * required to be killable alone; but it then ordered through
 * `listingsForSupplier`, which filters by `supplierId` a second time. Deleting
 * the service's tenancy filter changed NOTHING and the probe came back
 * SURVIVED — a guard that reads as two statements and is one.
 *
 * ⚠️ **THE DEFECT WAS NOT THE REDUNDANCY, IT WAS THE MASKING.** A duplicated
 * filter is harmless until something relies on the first one being load-bearing;
 * then the second one silently holds the invariant and nothing can tell you
 * which. So the two jobs are now two functions, and a caller picks the one whose
 * contract it actually wants.
 *
 * `listingsForSupplier` is unchanged for its existing callers: same filter, same
 * order, same signature.
 */
export function orderListingsForDisplay(
  rows: readonly PslListing[],
  nowIso: string,
  ledger?: readonly PslCapSetting[],
): PslListing[] {
  const rank = (r: PslListing): number => PSL_STATUSES.indexOf(r.status);
  return rows
    .slice()
    .sort((a, b) => {
      const af = isPslInForce(a, nowIso, ledger) ? 0 : 1;
      const bf = isPslInForce(b, nowIso, ledger) ? 0 : 1;
      if (af !== bf) return af - bf;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return (effectiveValidUntil(a, ledger) ?? '').localeCompare(
        effectiveValidUntil(b, ledger) ?? '',
      );
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

// ─── THE ATTENTION PREDICATES — ONE DEFINITION, TWO CALLERS (P4 · R-C) ───────

/**
 * ⚠️ **ONE PREDICATE PER SIGNAL, EXPORTED, BECAUSE TWO SURFACES ASK THE SAME
 * QUESTION AND A SECOND DEFINITION IS HOW THEY COME TO DISAGREE.** The buyer
 * dashboard's alert card counts these rows and `/buyer/preferred-suppliers`
 * renders them behind a tab the card links to. Written twice they would drift
 * the first time one gained the cap ledger and the other did not —
 * `COUNT-RESTATED-ACROSS-INSTRUMENTS-01`, whose whole lesson is that *a wrong
 * number with an explanation gets believed*. Written once they cannot.
 *
 * ⚠️ **AND THEY RETURN ROWS, NEVER COUNTS.** A count is satisfied by the wrong
 * match; a named member is not. The equality spec compares ids, which is only
 * possible because these hand back the rows themselves.
 *
 * NO CLOCK IS READ HERE — `nowIso` is the caller's, forwarded, exactly as
 * every other function in this file takes it.
 */
export function pslExpiringRows(
  rows: readonly PslListing[],
  nowIso: string,
  ledger?: readonly PslCapSetting[],
): PslListing[] {
  return rows.filter((r) => pslDisplayStatus(r, nowIso, ledger) === 'Expiring');
}

/**
 * IN FORCE ON THE RECORD, OVER ON THE CALENDAR.
 *
 * ⚠️ **THE `lifecycle === 'Listed'` HALF IS NOT REDUNDANT AND DELETING IT WOULD
 * BE A SILENT WIDENING.** `pslDisplayStatus` returns the stored lifecycle
 * unchanged for anything not in force, so a `Withdrawn` row can never read
 * `Expired` — but `Listed` is the only lifecycle `isInForceLifecycle` admits,
 * and stating it here says WHICH population this is about rather than relying
 * on a fact one function away. The signal is *"the record still claims to grant
 * something and it no longer does"*, and that claim lives on the lifecycle.
 */
export function pslExpiredStillListedRows(
  rows: readonly PslListing[],
  nowIso: string,
  ledger?: readonly PslCapSetting[],
): PslListing[] {
  return rows.filter(
    (r) => r.lifecycle === 'Listed' && pslDisplayStatus(r, nowIso, ledger) === 'Expired',
  );
}

/** Re-exported so a consumer needs one import for the whole axis. */
export type { PslLifecycle, PslStatus };
export type { PslCapSetting };
