// ─────────────────────────────────────────────────────────────────────────────
// SDC-1a — the P2 planner-consolidation READ-MODEL (pure selectors).
//
// The master-spreadsheet replacement's engine (design v2 §5): across all
// suppliers × materials × periods, demand (the published forecast) vs supplier
// confirmation vs fulfilment state — who responded, who confirmed in full,
// who's short, who's silent. READ-ONLY: every function here is pure (data in →
// view-model out, zero mutation, no new command); the fixture arrays arrive as
// ARGUMENTS (the whatIfScore pattern), so the SDC-4 useDataService repoint
// swaps the feed without touching a selector.
//
// THE BOUNDARY (design §5, addendum §6 — held):
//   · Response tracking = OURS. Line states, rollups, deficits, the chase list.
//   · Coverage PROJECTION (network netting, projected-shortage-date) = SOMO's.
//     Never computed here.
//   · The ONE projection that is ours: the supplier-coverage indicator
//     (addendum §6) — per-supplier sufficiency over OUR objects + published
//     lines only. It is MODELED (computed, not measured): the surface marks it
//     with ModelMarker Σ, never the DP-3 observed grammar.
//
// Design canon: docs/Supplier_Data_Collaboration_Design_v2.md §3.2/§5 +
// docs/SDC-0_Build_Freeze_Addendum.md §6/§7.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ForecastLine,
  ForecastPublication,
  IncomingShipment,
  InventoryDeclaration,
  RequirementResponse,
  SupplierMaterialRelationship,
  Uom,
} from './types';
import { declarationGranularity, declarationRecency } from './inventory';

// ─── Policy constants (P2 display layer — NOT schema) ─────────────────────────

/**
 * SDC-1 ruling F-1: the response deadline is a NAMED POLICY CONSTANT in the P2
 * layer — days after `publishedAt` before an unanswered line counts as overdue.
 * PRE-SDC-5 INTERIM: deadline offsets are chase-RULE data (design §6, properties
 * of the publication + supplier relationship) and get a real data model when the
 * chase engine lands; per addendum §7 they are NOT backfilled into the SDC-0
 * objects now.
 */
export const RESPONSE_DUE_DAYS = 7;

/**
 * The at-risk floor for the supplier-coverage indicator: coverage ratio ≥ 1 is
 * covered; ≥ this floor is at-risk; below it is uncovered. A display-layer
 * banding knob (like RESPONSE_DUE_DAYS), tuned at the real-planner validation
 * checkpoint — not a schema fact.
 */
export const COVERAGE_AT_RISK_FLOOR = 0.8;

// ─── Small pure date helpers (UTC, bucket-native) ─────────────────────────────

const DAY_MS = 86_400_000;

/** ISO timestamp `days` after `iso`. */
function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString();
}

/** The last instant-of-day ms of a period bucket ('2026-08' → 2026-08-31 UTC). */
function bucketEndMs(bucket: string): number {
  const [y, m] = bucket.split('-').map(Number);
  // Day 0 of the NEXT month = the last day of this bucket's month.
  return Date.UTC(y, m, 0);
}

/** Whole days from `nowIso` until `endMs` (negative when already past). */
function daysUntil(nowIso: string, endMs: number): number {
  return Math.floor((endMs - Date.parse(nowIso)) / DAY_MS);
}

// ─── The current publication ──────────────────────────────────────────────────

/**
 * The publication the planner consolidates AGAINST: the latest governed snapshot
 * by `publishedAt`. Older publications stay in the input — they are the record
 * of what each supplier answered (we are the SoR for what the supplier saw,
 * design §3.2), which is exactly what staleness detection reads.
 */
export function currentPublication(
  publications: readonly ForecastPublication[],
): ForecastPublication | null {
  // ⚠️ B4b-2 · A TIE GOES TO THE ONE RECORDED LATER (`>=`, not `>`). The SDC
  // clock is a frozen present, so two revisions published in one session carry
  // ONE `publishedAt`; with `>` the FIRST kept its place and a superseded
  // revision read as current — for the supplier and in the consolidation — while
  // the planner's panel (which reads state) said otherwise. Found by the
  // net-change spec's unequal-count case. The store hands publications out in
  // the order it recorded them, which is the order they were published.
  let latest: ForecastPublication | null = null;
  for (const p of publications) {
    if (latest === null || Date.parse(p.publishedAt) >= Date.parse(latest.publishedAt)) {
      latest = p;
    }
  }
  return latest;
}

// ─── Line response states (the discriminated union) ───────────────────────────

/**
 * The per-line collaboration state, derived by joining the CURRENT publication's
 * lines against the responses (supplier × material × period).
 *
 *  · awaiting — no SUBMITTED response. SDC-1 ruling F-2: a Draft is NOT a
 *    response (the planner never acts on an uncommitted supplier draft —
 *    own-facts discipline).
 *
 *    ⚠️ PF-1b — THE `draftInProgress` HINT IS GONE, and the FIELD went with
 *    it rather than only its render (operator ruling). It carried no response
 *    content, which is why it survived design review; what it carried was
 *    EXISTENCE. Once creation births every commitment at `Draft`, that flag
 *    became A NEAR-REAL-TIME SIGNAL THAT A NAMED SUPPLIER HAD STARTED
 *    COMPOSING AN ANSWER — disclosed by nobody's choice.
 *
 *      **EXISTENCE IS PART OF WHAT `Draft` MAKES INVISIBLE.** The supplier did
 *      not consent to being observed composing.
 *
 *    Deleting the render alone would have left the fact CROSSING THE SEAM in
 *    the buyer's payload, unrendered — a disclosure nobody can see and nobody
 *    removed. So the union member is gone: `awaiting` now says exactly what it
 *    means, which is that nothing has been submitted.
 *  · acknowledged — SDC-2b-EXT: a VISIBILITY response (the supplier saw the
 *    visibility-only line and answered with an acknowledgment + optional
 *    signal). Honestly DISTINCT from the commitment states: it never reads
 *    confirmed-full/short because there is no commitment to measure.
 *  · confirmed-full / short — a submitted confirmation against the current
 *    version, OR one carried forward from a superseded version whose line did
 *    NOT move (`carriedForward: true` — design §3.2: presumed-valid, not
 *    voided). `short` carries the deficit the planner chases.
 *  · stale-against-current — the response answered a SUPERSEDED planVersion and
 *    the line has MOVED since (or the answered snapshot can't be located, in
 *    which case `answeredQty` is null — flagged rather than presumed valid).
 *    Exact-match interim: the tolerance knob (re-confirm only beyond tolerance)
 *    is SDC-4's delta-on-read; until then any movement flags. Applies to
 *    acknowledgments the same way — "acknowledged 800, now 1 000" is flagged.
 */
export type LineResponseState =
  | { readonly kind: 'awaiting' }
  | {
      readonly kind: 'acknowledged';
      readonly response: RequirementResponse;
      readonly carriedForward: boolean;
    }
  | {
      readonly kind: 'confirmed-full';
      readonly response: RequirementResponse;
      readonly carriedForward: boolean;
    }
  | {
      readonly kind: 'short';
      readonly response: RequirementResponse;
      readonly deficitQty: number;
      readonly carriedForward: boolean;
    }
  | {
      readonly kind: 'stale-against-current';
      readonly response: RequirementResponse;
      /** The demand qty in the version the supplier answered (null: not found). */
      readonly answeredQty: number | null;
      readonly currentQty: number;
    }
  /**
   * ⚠️ A3 · SDC-R5 — AN ACCEPTED COMMITMENT WAS CUT BY A REVISION, AND THE
   * BUYER HAS NOT TAKEN THE NEW NUMBER YET. Derived, never stored: the latest
   * answer is still with the buyer (`Submitted` / `UnderReview`) and an earlier
   * version on its `supersedes` chain was retired FROM `Accepted` with a higher
   * quantity. Before A3 the same cut read as plain `short` — "short by N" with
   * no mark that the planner had already planned on the larger figure (Probe B).
   * Chased HARD: it outranks overdue on the chase list, because a plan is
   * already standing on a number that has gone away.
   */
  | {
      readonly kind: 'revised-after-accept';
      readonly response: RequirementResponse;
      /** The quantity the buyer accepted before the revision cut it. */
      readonly acceptedQty: number;
      /** acceptedQty − the revised confirmedQty (always > 0 by derivation). */
      readonly cutQty: number;
    };

/** One consolidation row: a current published line + its collaboration state. */
export interface ConsolidationRow {
  /** Stable row key (DSG rowKey): supplier|material|period. */
  readonly id: string;
  readonly line: ForecastLine;
  readonly state: LineResponseState;
  /**
   * A3 · WHAT THE ROW'S ANSWER REVISES, when it revises anything: the state the
   * version it `supersedes` was retired from. `'Disputed'` is what lets the
   * buyer's queue say "revised in answer to your dispute" instead of presenting
   * the answer as if nobody had objected to its predecessor (Probe A). Absent on
   * a first answer, and on a row with no answer at all.
   */
  readonly revisionOf?: 'Disputed' | 'Accepted';
}

/**
 * B4b-2 · THE SAME COMMITMENT — quantity AND class unchanged. The carry-forward
 * below and the supplier's net-change (`netChangeOf`) both read this, so the
 * buyer's "presumed valid" and the supplier's "no re-confirmation needed" can
 * never disagree about one line.
 */
export const sameCommitment = (
  a: Pick<ForecastLine, 'forecastQty' | 'commitmentClass'>,
  b: Pick<ForecastLine, 'forecastQty' | 'commitmentClass'>,
): boolean => a.forecastQty === b.forecastQty && a.commitmentClass === b.commitmentClass;

const lineKey = (supplierId: string, materialCode: string, periodBucket: string): string =>
  `${supplierId}|${materialCode}|${periodBucket}`;

/**
 * A3 · SDC-R6 — WHICH ANSWER IS LATEST, ORDERED, NEVER BY INSERTION.
 *
 * `(publishedAt of the answered publication, submissionVersion, submittedAt)`,
 * compared in that order. Before A3 this compared `submissionVersion` alone and
 * kept whichever row came first on a tie — and ties were real, because the
 * version restarted per publication (Probe A left two `v1` rows on one line),
 * so the winner was decided by `add` prepending. It picked correctly by accident
 * of the store's insertion order; a store that appended would have picked the
 * old answer. An answer to a publication nobody can find sorts before every
 * answer to one that exists (`publishedAt` −∞) rather than being guessed.
 */
export function compareAnswerRecency(
  publications: readonly ForecastPublication[],
  a: RequirementResponse,
  b: RequirementResponse,
): number {
  const at = (r: RequirementResponse) => {
    const p = publications.find((x) => x.publicationId === r.publicationId);
    return p ? Date.parse(p.publishedAt) : Number.NEGATIVE_INFINITY;
  };
  const sub = (r: RequirementResponse) =>
    r.submittedAt ? Date.parse(r.submittedAt) : Number.NEGATIVE_INFINITY;
  return (
    Math.sign(at(a) - at(b)) ||
    Math.sign(a.submissionVersion - b.submissionVersion) ||
    Math.sign(sub(a) - sub(b))
  );
}

/** The submitted responses keyed by line, latest answer per line. A `Draft` is
 *  not a response (F-2) and a `Superseded` one has been replaced (A3). */
function latestSubmittedByLine(
  publications: readonly ForecastPublication[],
  responses: readonly RequirementResponse[],
): Map<string, RequirementResponse> {
  const byLine = new Map<string, RequirementResponse>();
  for (const r of responses) {
    if (r.status === 'Draft' || r.status === 'Superseded') continue;
    const k = lineKey(r.supplierId, r.materialCode, r.periodBucket);
    const prev = byLine.get(k);
    if (!prev || compareAnswerRecency(publications, r, prev) > 0) byLine.set(k, r);
  }
  return byLine;
}

/**
 * A3 · the version `response` revises, and what it was retired from — read off
 * the `supersedes` link and the prior's `supersededFrom` stamp. One hop: the
 * DIRECT predecessor is what the buyer's queue describes.
 */
export function revisionOf(
  response: RequirementResponse,
  responses: readonly RequirementResponse[],
): 'Disputed' | 'Accepted' | undefined {
  if (!response.supersedes) return undefined;
  return responses.find((r) => r.id === response.supersedes)?.supersededFrom;
}

/**
 * A3 · SDC-R5 — the highest quantity ACCEPTED anywhere on `response`'s
 * `supersedes` chain, when it exceeds the response's own. Walks the whole chain
 * (a cut can be revised again before the buyer looks), guarded against a cycle
 * by the visited set rather than trusted not to have one.
 */
function acceptedAboveOnChain(
  response: RequirementResponse,
  responses: readonly RequirementResponse[],
): number | null {
  const own = response.forecastConfirmation?.confirmedQty;
  if (own === undefined) return null;
  let best: number | null = null;
  const seen = new Set<string>([response.id]);
  let next = response.supersedes;
  while (next && !seen.has(next)) {
    seen.add(next);
    const prior = responses.find((r) => r.id === next);
    if (!prior) break;
    const q = prior.forecastConfirmation?.confirmedQty;
    if (prior.supersededFrom === 'Accepted' && q !== undefined && q > own && (best === null || q > best)) {
      best = q;
    }
    next = prior.supersedes;
  }
  return best;
}

/**
 * Fresh-or-carried: fold a response into its state against a demand qty.
 * An ACKNOWLEDGMENT (invariant #11: no forecastConfirmation) discriminates
 * FIRST — it is never measured as a commitment (SDC-2b-EXT honesty rule).
 */
function answeredState(
  response: RequirementResponse,
  demandQty: number,
  carriedForward: boolean,
): LineResponseState {
  if (response.acknowledgment) return { kind: 'acknowledged', response, carriedForward };
  const confirmed = response.forecastConfirmation!.confirmedQty;
  return confirmed >= demandQty
    ? { kind: 'confirmed-full', response, carriedForward }
    : { kind: 'short', response, deficitQty: demandQty - confirmed, carriedForward };
}

/**
 * The consolidation join: every line of the CURRENT publication, each with its
 * derived response state. Pure; the inputs are never mutated.
 */
export function consolidationRows(
  publications: readonly ForecastPublication[],
  responses: readonly RequirementResponse[],
): readonly ConsolidationRow[] {
  const current = currentPublication(publications);
  if (current === null) return [];
  const submitted = latestSubmittedByLine(publications, responses);

  return current.lines.map((line): ConsolidationRow => {
    const k = lineKey(line.supplierId, line.materialCode, line.periodBucket);
    const response = submitted.get(k);

    // ⚠️ PF-1b — NOTHING IS DERIVED FROM THE DRAFTS HERE. `awaiting` is the
    // whole answer: a line with no submitted response is unanswered, and whether
    // somebody is mid-draft is theirs to disclose by submitting.
    if (!response) return { id: k, line, state: { kind: 'awaiting' } };

    const origin = revisionOf(response, responses);
    const withOrigin = (row: ConsolidationRow): ConsolidationRow =>
      origin ? { ...row, revisionOf: origin } : row;

    // A3 · SDC-R5 — an accepted figure cut by a revision the buyer has not yet
    // taken. Checked FIRST: it outranks full / short / stale, because what it
    // reports is not the line's quantity but a plan standing on a number that
    // has gone away.
    if (response.status === 'Submitted' || response.status === 'UnderReview') {
      const accepted = acceptedAboveOnChain(response, responses);
      if (accepted !== null) {
        return withOrigin({
          id: k,
          line,
          state: {
            kind: 'revised-after-accept',
            response,
            acceptedQty: accepted,
            cutQty: accepted - response.forecastConfirmation!.confirmedQty,
          },
        });
      }
    }

    // Answered the current snapshot → fresh full/short.
    if (
      response.publicationId === current.publicationId &&
      response.planVersion === current.planVersion
    ) {
      return withOrigin({ id: k, line, state: answeredState(response, line.forecastQty, false) });
    }

    // Answered a superseded snapshot: carry forward presumed-valid when the line
    // did NOT move (design §3.2 — voiding forces re-confirmation churn); flag
    // stale when it moved or the answered snapshot can't be verified.
    const answeredPub = publications.find(
      (p) =>
        p.publicationId === response.publicationId &&
        p.planVersion === response.planVersion,
    );
    const answeredLine = answeredPub?.lines.find(
      (l) =>
        l.supplierId === line.supplierId &&
        l.materialCode === line.materialCode &&
        l.periodBucket === line.periodBucket,
    );
    // B4b-2 · the SAME rule the supplier's net-change reads (`sameCommitment`):
    // quantity AND class. A line re-classed firm at the same quantity is a new
    // commitment, and an answer given to its semi-firm predecessor is not one.
    if (answeredLine && sameCommitment(answeredLine, line)) {
      return withOrigin({ id: k, line, state: answeredState(response, line.forecastQty, true) });
    }
    return withOrigin({
      id: k,
      line,
      state: {
        kind: 'stale-against-current',
        response,
        answeredQty: answeredLine?.forecastQty ?? null,
        currentQty: line.forecastQty,
      },
    });
  });
}

// ─── Supplier rollup (responded / partial / silent) ───────────────────────────

export type SupplierRollupKind = 'responded' | 'partial' | 'silent';

export interface SupplierRollup {
  readonly supplierId: string;
  readonly totalLines: number;
  /** Lines with a submitted response — fresh, carried, or stale (a stale line
   *  WAS answered; calling that supplier silent would be false — the re-confirm
   *  request is a P3 trigger, not a chase-list fact). */
  readonly answeredLines: number;
  readonly awaitingLines: number;
  readonly rollup: SupplierRollupKind;
}

/** Per-supplier response rollup over the consolidation rows. */
export function supplierRollups(
  rows: readonly ConsolidationRow[],
): readonly SupplierRollup[] {
  const bySupplier = new Map<string, { total: number; answered: number; awaiting: number }>();
  for (const row of rows) {
    const s =
      bySupplier.get(row.line.supplierId) ??
      bySupplier.set(row.line.supplierId, { total: 0, answered: 0, awaiting: 0 }).get(row.line.supplierId)!;
    s.total += 1;
    if (row.state.kind === 'awaiting') s.awaiting += 1;
    else s.answered += 1;
  }
  return [...bySupplier.entries()].map(([supplierId, s]) => ({
    supplierId,
    totalLines: s.total,
    answeredLines: s.answered,
    awaitingLines: s.awaiting,
    rollup:
      s.answered === 0 ? 'silent' : s.awaiting === 0 ? 'responded' : 'partial',
  }));
}

// ─── The chase list (pre-scheduler, design §5) ────────────────────────────────

/**
 * Why a supplier is on the chase list:
 *  · overdue — the response deadline has passed and lines are still awaiting
 *    (covers silent AND partially-responded suppliers past the due date).
 *  · partial-response — started but incomplete, surfaced even before the
 *    deadline (a nudgeable state the planner may act on early).
 *  · revised-after-accept — A3 · SDC-R5: a commitment the buyer accepted was
 *    revised DOWN and the buyer has not taken the new number. Chased HARD —
 *    listed regardless of deadline and sorted first.
 */
export type ChaseReason = 'overdue' | 'partial-response' | 'revised-after-accept';

export interface ChaseEntry {
  readonly supplierId: string;
  readonly reason: ChaseReason;
  readonly awaitingLines: number;
  /** The interim policy deadline: publishedAt + RESPONSE_DUE_DAYS. */
  readonly dueAt: string;
}

/**
 * The manual chase list the planner works via the existing WhatsApp chrome —
 * ~60% of the chase value at zero scheduler cost (design §5). `now` is injected
 * (pure; the page passes the clock in). Sorted overdue-first, then most
 * awaiting lines, then supplierId for stability.
 */
export function chaseList(
  publication: ForecastPublication,
  rows: readonly ConsolidationRow[],
  now: string,
): readonly ChaseEntry[] {
  const dueAt = addDaysIso(publication.publishedAt, RESPONSE_DUE_DAYS);
  const overdue = Date.parse(now) > Date.parse(dueAt);
  const entries: ChaseEntry[] = [];
  // ⚠️ A3 · SDC-R5 — CHASED HARD. A supplier with an accepted commitment cut by
  // a revision is on the list whether or not the deadline has passed and whether
  // or not any line is awaiting: the planner is standing on a number the
  // supplier has withdrawn, and that is the one reason that does not wait for a
  // due date. It sorts above `overdue`.
  const cutBy = new Set(
    rows.filter((row) => row.state.kind === 'revised-after-accept').map((row) => row.line.supplierId),
  );
  for (const r of supplierRollups(rows)) {
    if (cutBy.has(r.supplierId)) {
      entries.push({ supplierId: r.supplierId, reason: 'revised-after-accept', awaitingLines: r.awaitingLines, dueAt });
      continue;
    }
    if (r.awaitingLines === 0) continue;
    if (overdue) entries.push({ supplierId: r.supplierId, reason: 'overdue', awaitingLines: r.awaitingLines, dueAt });
    else if (r.answeredLines > 0)
      entries.push({ supplierId: r.supplierId, reason: 'partial-response', awaitingLines: r.awaitingLines, dueAt });
    // A silent supplier BEFORE the deadline is not chased yet.
  }
  return entries.sort(
    (a, b) =>
      Number(b.reason === 'revised-after-accept') - Number(a.reason === 'revised-after-accept') ||
      Number(b.reason === 'overdue') - Number(a.reason === 'overdue') ||
      b.awaitingLines - a.awaitingLines ||
      a.supplierId.localeCompare(b.supplierId),
  );
}

// ─── The supplier-coverage indicator (addendum §6 — the ONE projection ours) ──

/**
 * The per-supplier sufficiency read: "does THIS supplier's declared SOH +
 * incoming cover THEIR firm/semi-firm horizon, given the principal lead time?"
 * Uses ONLY our objects + the published lines — no network netting, no
 * allocation-across-suppliers, no projected-shortage-date (those stay SOMO's).
 *
 *  · no-declaration — the supplier has not declared SOH: an HONEST BLANK. The
 *    indicator is never fabricated from a zero the supplier didn't state.
 *  · covered / at-risk / uncovered — banded coverage ratio (see
 *    COVERAGE_AT_RISK_FLOOR). `unbridgeable` is the principal-lead-time flag:
 *    a DISTRIBUTOR's shortfall that no principal replenishment ordered now can
 *    reach within the committed horizon (min principal lead time > days to the
 *    horizon end). For a manufacturer it stays false — we do not model their
 *    lead time yet (CapacityProfile is build-deferred), and we flag only what
 *    we can interpret.
 *
 * EXPIRY-BLINDNESS (SDC-3a total-first → SDC-3b): every banded status carries
 * `expiryBlind`, true when the SOH it read was a TOTAL-ONLY declaration (no
 * batch/expiry detail — `declarationGranularity` = 'total-only'). The ratio is
 * still honest (totalQty is the SOH floor), but the indicator CANNOT assess
 * whether stock expires before the committed horizon — so the surface must MARK
 * "batch/expiry detail not declared" and NEVER silently assume no-expiry-risk.
 * A batch-grain declaration feeds the full (expiry-aware) read (expiryBlind
 * false). `no-declaration` carries no flag — there is nothing to be blind about.
 *
 * MODELED, permanently: this is a computed sufficiency heuristic, not a
 * measured fact — the surface marks it Σ (ModelMarker), never DP-3 observed.
 */
export type CoverageStatus =
  | { readonly kind: 'no-declaration' }
  | { readonly kind: 'covered'; readonly ratio: number; readonly expiryBlind: boolean }
  | {
      readonly kind: 'at-risk';
      readonly ratio: number;
      readonly unbridgeable: boolean;
      readonly expiryBlind: boolean;
    }
  | {
      readonly kind: 'uncovered';
      readonly ratio: number;
      readonly unbridgeable: boolean;
      readonly expiryBlind: boolean;
    };

export interface SupplierCoverageEntry {
  readonly supplierId: string;
  readonly materialCode: string;
  /** Σ firm + semi-firm demand for the pair in the current publication. */
  readonly committedDemandQty: number;
  readonly uom: Uom;
  readonly status: CoverageStatus;
}

/**
 * Coverage entries for every supplier × material pair carrying firm/semi-firm
 * demand in the CURRENT publication (visibility-only lines are forward
 * visibility, not commitment — no sufficiency read).
 *
 * Supply side: the latest InventoryDeclaration (by declaredAt, Σ batches) plus
 * Σ IncomingShipment in Booked|Shipped — BOTH directions (a to-paragon leg
 * fulfils the demand directly; a principal-to-distributor leg replenishes the
 * supplier's stock). Arrived and Cancelled legs never count. A deliberately
 * simple sufficiency heuristic — banded, Σ-marked, tuned at the real-planner
 * validation checkpoint.
 */
export function supplierCoverageEntries(
  publications: readonly ForecastPublication[],
  declarations: readonly InventoryDeclaration[],
  shipments: readonly IncomingShipment[],
  relationships: readonly SupplierMaterialRelationship[],
  now: string,
): readonly SupplierCoverageEntry[] {
  const current = currentPublication(publications);
  if (current === null) return [];

  // Group the pair's committed lines: demand total + the latest committed bucket.
  const pairs = new Map<
    string,
    { supplierId: string; materialCode: string; demand: number; uom: Uom; lastBucket: string }
  >();
  for (const line of current.lines) {
    if (line.commitmentClass === 'visibility-only') continue;
    const k = `${line.supplierId}|${line.materialCode}`;
    const p = pairs.get(k);
    if (!p) {
      pairs.set(k, {
        supplierId: line.supplierId,
        materialCode: line.materialCode,
        demand: line.forecastQty,
        uom: line.uom,
        lastBucket: line.periodBucket,
      });
    } else {
      p.demand += line.forecastQty;
      if (line.periodBucket > p.lastBucket) p.lastBucket = line.periodBucket;
    }
  }

  return [...pairs.values()].map(({ supplierId, materialCode, demand, uom, lastBucket }) => {
    // Latest SOH declaration for the pair — absent ⇒ honest blank. "Latest" is
    // by store-insertion recency (SDC-4a ruling c), NOT declaredAt: a fresh
    // declare stamped with the simulated clock must win over a future-dated seed.
    let latestDecl: InventoryDeclaration | null = null;
    for (const d of declarations) {
      if (d.supplierId !== supplierId || d.materialCode !== materialCode) continue;
      if (latestDecl === null || declarationRecency(d) > declarationRecency(latestDecl)) {
        latestDecl = d;
      }
    }
    if (latestDecl === null) {
      return { supplierId, materialCode, committedDemandQty: demand, uom, status: { kind: 'no-declaration' } as const };
    }

    // SDC-3a total-first: totalQty IS the SOH floor (Σ batches when detail is
    // present — invariant #6′ keeps them equal, so no second sum here).
    const soh = latestDecl.totalQty;
    // SDC-3b: a total-only declaration is EXPIRY-BLIND — the coverage read
    // cannot assess expiry bridgeability, so the surface must mark it (never
    // assume no-expiry-risk). Batch-grain feeds the full expiry-aware read.
    const expiryBlind = declarationGranularity(latestDecl) === 'total-only';
    const incoming = shipments.reduce(
      (s, sh) =>
        sh.supplierId === supplierId &&
        sh.materialCode === materialCode &&
        (sh.lifecycle === 'Booked' || sh.lifecycle === 'Shipped')
          ? s + sh.qty
          : s,
      0,
    );
    const ratio = demand > 0 ? (soh + incoming) / demand : Infinity;

    if (ratio >= 1) {
      return {
        supplierId,
        materialCode,
        committedDemandQty: demand,
        uom,
        status: { kind: 'covered', ratio, expiryBlind } as const,
      };
    }

    // Shortfall: can a principal replenishment ordered NOW still arrive inside
    // the committed horizon? Only interpretable for a distributor (design §7).
    const rel = relationships.find(
      (r) => r.supplierId === supplierId && r.materialCode === materialCode,
    );
    const leadTimes = (rel?.supplierType === 'distributor' ? rel.principals ?? [] : []).map(
      (p) => p.principalLeadTimeDays,
    );
    const unbridgeable =
      leadTimes.length > 0 && Math.min(...leadTimes) > daysUntil(now, bucketEndMs(lastBucket));

    const kind = ratio >= COVERAGE_AT_RISK_FLOOR ? ('at-risk' as const) : ('uncovered' as const);
    return {
      supplierId,
      materialCode,
      committedDemandQty: demand,
      uom,
      status: { kind, ratio, unbridgeable, expiryBlind },
    };
  });
}
