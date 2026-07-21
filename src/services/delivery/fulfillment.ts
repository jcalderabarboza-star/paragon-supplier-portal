// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 3: the fulfillment-match derivation (pure, DERIVED).
//
// The derivation that makes deliveredQty real: match an existing SDC
// IncomingShipment to the RELEASED schedule line it draws down, and DERIVE the
// ReleaseFulfillment axis ('pending'|'fulfilled'|'late'|'missed') at read time.
// NEVER stored on the line (Decision A, types.ts:73) — computed here from
// (releaseDate, the matched shipment, now), exactly like the DrawdownLedger.
//
// It mirrors the SDC lane's honesty precedent one-for-one: shipmentDisplayLifecycle
// (../sdc/shipment.ts) derives a display value from a linked ASN and carries a
// `derivedFromAsn` flag when the value was INFERRED rather than authoritative. Here
// the same shape: an explicit `fulfilledBy` binding on the line is AUTHORITATIVE
// (inferred:false); a proximity match is INFERRED (inferred:true) — flagged, never
// silently authoritative (honesty guard 2 — "shown and correctable").
//
// PURE and DETERMINISTIC: data in, a read-view out. No mutation, no dispatch, no
// ledger touch, and NO clock read — `now` is injected last (the SDC selector
// convention, cf. chaseList(publication, rows, now)). The caller passes the shared
// SIMULATED clock (sdcClock.now()); this module never calls argless `new Date()`.
//
// ── HONESTY LOCK (spec §6.2 — the hard rule) ─────────────────────────────────
//   ONLY a CONFIRMED match feeds the governed deliveredQty. This derivation is
//   READ-ONLY: it never writes `actualQty` onto a line. A line carries a stored
//   `actualQty` only once its match has been CONFIRMED (an explicit binding, a
//   later confirm step) — and `deriveDrawdownLedger` (ledger.ts:64, UNTOUCHED)
//   sums exactly those. An INFERRED-but-unconfirmed match surfaces in this view
//   (with its observed `actualQty` + `inferred:true`) but NEVER inflates the
//   governed total: the ledger reads the LINE, not this view. A guess reads
//   "proposed", never "delivered".
//
// ── SCOPE ────────────────────────────────────────────────────────────────────
//   Pure derivation only. NO chase engine, NO SAP posting, NO UI, NO confirm/write
//   path, NO cross-release allocation (a shipment is consumed by at most ONE
//   release per pass; splitting one delivery across releases is a later batch).
//   Matches ONLY `state === 'released'` lines — a draft is an internal plan, not a
//   transmitted commitment, so nothing fulfills it (same discipline as "chase only
//   on released").
//
// ── KNOWN LIMITATION (recorded, not papered over — cf. the 'block' arm) ──────
//   `eta` gated on lifecycle 'Arrived' is the drawdown-date PROXY. IncomingShipment
//   carries no true arrival / goods-receipt timestamp; `eta` is the honest
//   best-available. The real on-time/late verdict wants the SAP GR POSTING DATE,
//   which arrives with the F2 ASN/GR feed. Until then, on-time vs late is computed
//   against `eta` — accurate to the day, but an estimate, not a posted receipt.
// ─────────────────────────────────────────────────────────────────────────────

import type { IncomingShipment } from '../sdc/types';
import type { ReleaseFulfillment, ScheduleLine, SchedulingAgreementItem } from './types';

const DAY_MS = 86_400_000;

// ─── Named policy constants (co-located with the derivation — the ledger-preset /
//     RESPONSE_DUE_DAYS idiom) ────────────────────────────────────────────────

/** The date-proximity window (days) for an INFERRED match: a candidate whose `eta`
 *  is within this many days of the release date can draw it down. Not a schema
 *  fact — a banding knob, tuned at the real-feed validation checkpoint. */
export const MATCH_WINDOW_DAYS = 7;

/** Grace (days) past a release date before an undrawn RELEASED line reads 'missed'.
 *  Within grace it stays the honest 'pending', never a premature 'missed'. */
export const DELIVERY_GRACE_DAYS = 3;

// ─── The read-view (one per RELEASED line) ────────────────────────────────────

/**
 * One released schedule line joined with its DERIVED fulfillment. `inferred`
 * mirrors `derivedFromAsn`: true = matched by proximity (a proposal — shown and
 * correctable), false = matched by an explicit stored binding, OR no match at all
 * (matchedRef absent disambiguates the two false cases). `actualQty` /
 * `qtyVariance` are the OBSERVED drawdown — informational in this view; they feed
 * the governed ledger ONLY once the match is confirmed onto the line (honesty
 * lock). `qtyVariance` (shipQty − plannedQty) is ALWAYS surfaced on a match — a
 * short or over delivery is never hidden.
 */
export interface ReleaseFulfillmentView {
  readonly releaseSeq: number;
  readonly fulfillment: ReleaseFulfillment;
  /** The drawing-down shipment's SAP identity (`asnRef`) if present, else its
   *  portal id (honesty guard 6 — carry SAP's number, never mint one). Absent ⇒
   *  no match. */
  readonly matchedRef?: string;
  /** true = proximity-inferred (a flagged proposal); false = explicit binding or
   *  no match. Never silently authoritative when true. */
  readonly inferred: boolean;
  /** The matched shipment's qty (the observed drawdown amount). Absent ⇒ no match. */
  readonly actualQty?: number;
  /** shipQty − plannedQty. ALWAYS present on a match — the delivery variance is
   *  visible even when it doesn't gate the match. */
  readonly qtyVariance?: number;
  /** true when >1 candidate sat in the window: the pick was deterministic, but the
   *  ambiguity is surfaced rather than silently resolved. */
  readonly ambiguous?: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** The date-only portion of an ISO instant. Both release dates ('YYYY-MM-DD') and
 *  etas (date-only or full ISO) share the leading 'YYYY-MM-DD', which sorts
 *  lexically === chronologically — so on-time/late compares to the DAY. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Whether a shipment is a valid DRAWDOWN candidate for this item's material: a
 * shipment TO Paragon (a principal-to-distributor leg is supply-visibility, never
 * a Paragon drawdown), physically Arrived (a Booked/Shipped leg is in transit, a
 * Cancelled one never fulfills), of the exact material, carrying a dateable `eta`.
 */
function isDrawdownCandidate(s: IncomingShipment, materialCode: string): boolean {
  return (
    s.direction === 'to-paragon' &&
    s.lifecycle === 'Arrived' &&
    s.materialCode === materialCode &&
    s.eta !== undefined
  );
}

/** SAP identity first (asnRef), portal id as the honest fallback. */
function matchedRefOf(s: IncomingShipment): string {
  return s.asnRef ?? s.id;
}

/** Whether a candidate's arrival day sits within the match window of a release. */
function withinWindow(etaDay: string, releaseDate: string): boolean {
  return Math.abs(Date.parse(etaDay) - Date.parse(releaseDate)) <= MATCH_WINDOW_DAYS * DAY_MS;
}

/** Matched → on/before the release date is 'fulfilled', after is 'late' (still a
 *  real delivery — its actualQty is present, so the ledger counts it once
 *  confirmed). Day-granular. */
function statusForMatch(etaDay: string, releaseDate: string): ReleaseFulfillment {
  return etaDay <= releaseDate ? 'fulfilled' : 'late';
}

/** Unmatched → 'missed' only once the grace-adjusted date has PASSED `now`;
 *  otherwise the honest default 'pending' (never premature-missed). */
function statusForUnmatched(releaseDate: string, now: string): ReleaseFulfillment {
  const graceDeadlineMs = Date.parse(releaseDate) + DELIVERY_GRACE_DAYS * DAY_MS;
  return Date.parse(now) > graceDeadlineMs ? 'missed' : 'pending';
}

/** Build the view for a matched line (explicit-binding OR inferred). */
function matchedView(
  line: ScheduleLine,
  s: IncomingShipment,
  inferred: boolean,
  ambiguous: boolean,
): ReleaseFulfillmentView {
  return {
    releaseSeq: line.releaseSeq,
    fulfillment: statusForMatch(dayOf(s.eta!), line.releaseDate),
    matchedRef: matchedRefOf(s),
    inferred,
    actualQty: s.qty,
    qtyVariance: s.qty - line.plannedQty,
    ...(ambiguous ? { ambiguous: true } : {}),
  };
}

/** Deterministic tie-break for >1 in-window candidate: closest arrival, then
 *  smallest absolute qty variance, then lowest id. Never random, never silent. */
function pickOrder(a: IncomingShipment, b: IncomingShipment, line: ScheduleLine): number {
  const rel = Date.parse(line.releaseDate);
  const da = Math.abs(Date.parse(dayOf(a.eta!)) - rel);
  const db = Math.abs(Date.parse(dayOf(b.eta!)) - rel);
  if (da !== db) return da - db;
  const va = Math.abs(a.qty - line.plannedQty);
  const vb = Math.abs(b.qty - line.plannedQty);
  if (va !== vb) return va - vb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ─── The derivation ───────────────────────────────────────────────────────────

/**
 * Derive fulfillment for one Item's RELEASED lines. PURE — data in, read-view out,
 * zero mutation, no clock read, no ledger touch.
 *
 * ONE view per released line (draft lines are omitted — nothing fulfills an
 * untransmitted plan). Resolution is two passes so an explicit binding always wins
 * its shipment before inference can claim it:
 *
 *   Pass 1 — every line with a stored `fulfilledBy` binds its named shipment
 *            (matched by asnRef or id) and RESERVES it (inferred:false).
 *   Pass 2 — every still-unmatched line infers over the UNRESERVED candidates in
 *            its window (inferred:true; >1 ⇒ ambiguous + deterministic pick).
 *
 * A shipment is consumed by at most ONE line per pass (no silent cross-release
 * splitting). Quantity never GATES a match — the variance is surfaced instead.
 */
export function deriveFulfillment(
  item: SchedulingAgreementItem,
  shipments: readonly IncomingShipment[],
  now: string,
): readonly ReleaseFulfillmentView[] {
  const released = item.scheduleLines.filter((l) => l.state === 'released');
  const candidates = shipments.filter((s) => isDrawdownCandidate(s, item.materialCode));
  const consumed = new Set<string>();
  const views = new Map<number, ReleaseFulfillmentView>();

  // Pass 1 — explicit bindings win and reserve their shipment.
  for (const line of released) {
    if (line.fulfilledBy === undefined) continue;
    const bound = candidates.find(
      (s) => !consumed.has(s.id) && (s.asnRef === line.fulfilledBy || s.id === line.fulfilledBy),
    );
    if (!bound) continue; // binding names an unseen/ineligible shipment → falls to pass 2 / unmatched.
    consumed.add(bound.id);
    views.set(line.releaseSeq, matchedView(line, bound, false, false));
  }

  // Pass 2 — inference over the remaining candidates.
  for (const line of released) {
    if (views.has(line.releaseSeq)) continue;
    const inWindow = candidates.filter(
      (s) => !consumed.has(s.id) && withinWindow(dayOf(s.eta!), line.releaseDate),
    );
    if (inWindow.length === 0) {
      views.set(line.releaseSeq, {
        releaseSeq: line.releaseSeq,
        fulfillment: statusForUnmatched(line.releaseDate, now),
        inferred: false,
      });
      continue;
    }
    const chosen = [...inWindow].sort((a, b) => pickOrder(a, b, line))[0];
    consumed.add(chosen.id);
    views.set(line.releaseSeq, matchedView(line, chosen, true, inWindow.length > 1));
  }

  // Emit in releaseSeq order (the released lines' own order).
  return released.map((l) => views.get(l.releaseSeq)!);
}
