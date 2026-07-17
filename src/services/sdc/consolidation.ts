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
  let latest: ForecastPublication | null = null;
  for (const p of publications) {
    if (latest === null || Date.parse(p.publishedAt) > Date.parse(latest.publishedAt)) {
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
 *    own-facts discipline); it only sets the muted `draftInProgress` hint.
 *  · confirmed-full / short — a submitted confirmation against the current
 *    version, OR one carried forward from a superseded version whose line did
 *    NOT move (`carriedForward: true` — design §3.2: presumed-valid, not
 *    voided). `short` carries the deficit the planner chases.
 *  · stale-against-current — the response answered a SUPERSEDED planVersion and
 *    the line has MOVED since (or the answered snapshot can't be located, in
 *    which case `answeredQty` is null — flagged rather than presumed valid).
 *    Exact-match interim: the tolerance knob (re-confirm only beyond tolerance)
 *    is SDC-4's delta-on-read; until then any movement flags.
 */
export type LineResponseState =
  | { readonly kind: 'awaiting'; readonly draftInProgress: boolean }
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
    };

/** One consolidation row: a current published line + its collaboration state. */
export interface ConsolidationRow {
  /** Stable row key (DSG rowKey): supplier|material|period. */
  readonly id: string;
  readonly line: ForecastLine;
  readonly state: LineResponseState;
}

const lineKey = (supplierId: string, materialCode: string, periodBucket: string): string =>
  `${supplierId}|${materialCode}|${periodBucket}`;

/** The submitted (non-Draft) responses keyed by line, latest submission first. */
function latestSubmittedByLine(
  responses: readonly RequirementResponse[],
): Map<string, RequirementResponse> {
  const byLine = new Map<string, RequirementResponse>();
  for (const r of responses) {
    if (r.status === 'Draft') continue;
    const k = lineKey(r.supplierId, r.materialCode, r.periodBucket);
    const prev = byLine.get(k);
    if (!prev || r.submissionVersion > prev.submissionVersion) byLine.set(k, r);
  }
  return byLine;
}

/** Fresh-or-carried: fold a confirmation into full/short against a demand qty. */
function confirmationState(
  response: RequirementResponse,
  demandQty: number,
  carriedForward: boolean,
): LineResponseState {
  const confirmed = response.forecastConfirmation.confirmedQty;
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
  const submitted = latestSubmittedByLine(responses);

  return current.lines.map((line) => {
    const k = lineKey(line.supplierId, line.materialCode, line.periodBucket);
    const response = submitted.get(k);

    if (!response) {
      const draftInProgress = responses.some(
        (r) =>
          r.status === 'Draft' &&
          lineKey(r.supplierId, r.materialCode, r.periodBucket) === k,
      );
      return { id: k, line, state: { kind: 'awaiting', draftInProgress } };
    }

    // Answered the current snapshot → fresh full/short.
    if (
      response.publicationId === current.publicationId &&
      response.planVersion === current.planVersion
    ) {
      return { id: k, line, state: confirmationState(response, line.forecastQty, false) };
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
    if (answeredLine && answeredLine.forecastQty === line.forecastQty) {
      return { id: k, line, state: confirmationState(response, line.forecastQty, true) };
    }
    return {
      id: k,
      line,
      state: {
        kind: 'stale-against-current',
        response,
        answeredQty: answeredLine?.forecastQty ?? null,
        currentQty: line.forecastQty,
      },
    };
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
 */
export type ChaseReason = 'overdue' | 'partial-response';

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
  for (const r of supplierRollups(rows)) {
    if (r.awaitingLines === 0) continue;
    if (overdue) entries.push({ supplierId: r.supplierId, reason: 'overdue', awaitingLines: r.awaitingLines, dueAt });
    else if (r.answeredLines > 0)
      entries.push({ supplierId: r.supplierId, reason: 'partial-response', awaitingLines: r.awaitingLines, dueAt });
    // A silent supplier BEFORE the deadline is not chased yet.
  }
  return entries.sort(
    (a, b) =>
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
 * MODELED, permanently: this is a computed sufficiency heuristic, not a
 * measured fact — the surface marks it Σ (ModelMarker), never DP-3 observed.
 */
export type CoverageStatus =
  | { readonly kind: 'no-declaration' }
  | { readonly kind: 'covered'; readonly ratio: number }
  | { readonly kind: 'at-risk'; readonly ratio: number; readonly unbridgeable: boolean }
  | { readonly kind: 'uncovered'; readonly ratio: number; readonly unbridgeable: boolean };

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
    // Latest SOH declaration for the pair — absent ⇒ honest blank.
    let latestDecl: InventoryDeclaration | null = null;
    for (const d of declarations) {
      if (d.supplierId !== supplierId || d.materialCode !== materialCode) continue;
      if (latestDecl === null || Date.parse(d.declaredAt) > Date.parse(latestDecl.declaredAt)) {
        latestDecl = d;
      }
    }
    if (latestDecl === null) {
      return { supplierId, materialCode, committedDemandQty: demand, uom, status: { kind: 'no-declaration' } as const };
    }

    const soh = latestDecl.batches.reduce((s, b) => s + b.qty, 0);
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
      return { supplierId, materialCode, committedDemandQty: demand, uom, status: { kind: 'covered', ratio } as const };
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
    return { supplierId, materialCode, committedDemandQty: demand, uom, status: { kind, ratio, unbridgeable } };
  });
}
