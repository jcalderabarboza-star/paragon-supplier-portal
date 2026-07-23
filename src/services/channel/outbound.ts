// ─────────────────────────────────────────────────────────────────────────────
// C3 — the OUTBOUND REQUEST MODEL (headless). What makes "absence of a fresh
// reply = staleness" real. Derives from chase (5a–5e) + the send-event store.
// NO live sender — no channel transport exists (deferred to the integration lane);
// an outbound record is "composed — not sent", SIMULATED via the LivenessRegistry.
//
// ── LAW 1 · RESULTS-IN (the 5c discipline, verbatim) ─────────────────────────
//   C3 consumes `SupplierChaseView[]` — the ratified two-grain view — and does
//   NOT re-derive from consolidation / fulfillment internals. That coupling is
//   exactly what 5c was ratified to prevent. The view already carries supplierId,
//   severity, dataReasons, and commitmentEntries (agreementId/itemSeq/releaseSeq/
//   dueDate/materialCode).
//
// ── LAW 2 · "COMPOSED / AWAITING / STALE" IS DERIVED, NEVER STORED ────────────
//   The queue status is computed by `deriveOutboundQueue`, never persisted. A
//   stored `composed|queued|sent` enum duplicating derivable state is the
//   clock-projected-literal family (law 0.5) and WILL drift against re-derivation.
//   The ONLY stored fact is the ask EVENT (see LAW 3). Status falls out of
//   (chase reason present?, ask on record?, reply since the ask?).
//
// ── LAW 3 · "SENT ON D" IS AN EVENT AND MUST PERSIST ─────────────────────────
//   Deriving "we asked at dueAt" from cadence would FABRICATE an ask that may not
//   have happened — violating the chase engine's own "never a fabricated urgency"
//   rule. So the ask is a real, minimal, append-only store fact
//   (`outboundRequestStore`). `sentAt` is stamped by the shared `sdcClock` (the
//   SIMULATED 2026-08-25 timeline), never a wall-clock, so staleness resolves
//   deterministically. The record stores STRUCTURAL refs (agreementId/itemSeq/
//   releaseSeq/dueAt), NEVER a frozen `SupplierChaseView` snapshot (it would go
//   stale against re-derivation).
//
// ── LAW 4 · STALENESS IS CHANNEL-AGNOSTIC ────────────────────────────────────
//   Staleness is "no fresh SUBMITTED response since we asked" (store fact:
//   `submittedAt > sentAt`), NOT "no fresh channel reply." A reply arriving via
//   the portal, the magic-link grid, or an XLSX import freshens exactly as much as
//   a channel reply would — so `deriveOutboundQueue` takes a channel-agnostic
//   `SupplierReplyFact[]` (the caller folds every reply store into it), keeping C3
//   independent of C1's linkage (the ratified parallelism).
//
//   SEMANTIC (reported): asks are SUPPLIER-grain, replies are LINE-grain, so
//   "freshened" is defined as **ANY reply since the latest ask** (supplier-grain),
//   NOT "all awaiting lines answered." Rationale: the ask is "please update us";
//   a single substantive response since the ask proves the supplier is responsive
//   and did not ghost us. Remaining line-level gaps stay the chase engine's job —
//   conflating them into staleness would nag a responsive supplier. This is why
//   the reply fact is an INDEPENDENT input, not the chase view's presence: an
//   `awaiting` supplier can have BOTH a live chase reason AND a fresh reply.
//
// ── LAW 5 · HONESTY ──────────────────────────────────────────────────────────
//   No transport exists → a record is "composed — not sent" (SIMULATED via the
//   LivenessRegistry two-gate: `deliveryAgreements` is null-backed → amber). NEVER
//   imply a message was sent. `correlationAnchor` is null until a real dispatch
//   links it (C2/C4) — an honest absent value, not a fake receipt.
//
// PURE + DETERMINISTIC: data in, queue out, zero mutation, no clock read in the
// derivation (`now` injected last — the SDC-selector convention). Acyclic: channel
// imports chase + sdc; neither imports channel.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChaseSeverityLevel, DeliveryChaseEntry, SupplierChaseView } from '../chase';
import { sdcClock, type ChaseReason } from '../sdc';
import type { Channel } from './types';

// ─── Stored vocabulary (the ask EVENT — LAW 3) ────────────────────────────────

/**
 * A structural reference to what an outbound request is about — the delivery-chase
 * grain, stripped of any DERIVED assessment (mode/severity). Stored on the record
 * and re-derivable for a composed entry. NEVER a frozen chase-view snapshot.
 */
export interface OutboundSubjectRef {
  readonly agreementId: string;
  readonly itemSeq: number;
  /** Line grain (nudge/alert); absent for an item-level drift subject. */
  readonly releaseSeq?: number;
  /** The obligation date being chased (the line's release date / drift anchor). */
  readonly dueAt: string;
  readonly materialCode: string;
}

/**
 * One outbound request — the persisted ASK EVENT (LAW 3). Deliberately carries NO
 * status field: composed/awaiting/stale is DERIVED (LAW 2), so there is nothing
 * here to drift. `correlationAnchor` links to the SDC dispatch a reply is later
 * confirmed on (C2) — null until then (LAW 5, honest absent value).
 */
export interface OutboundRequestRecord {
  readonly id: string;
  readonly supplierId: string;
  readonly subjectRefs: readonly OutboundSubjectRef[];
  readonly channel: Channel;
  /** ISO-UTC, stamped by `sdcClock` — never a wall-clock (LAW 3). */
  readonly sentAt: string;
  /** → an SDC `SubmissionSession.auditCorrelationId` once a reply is confirmed. */
  readonly correlationAnchor: string | null;
}

/**
 * The channel-agnostic reply projection (LAW 4): the supplier's LATEST submitted
 * response across ANY source, folded by the caller from the SDC reply stores.
 * Supplier-grain, matching the "any reply freshens" semantic.
 */
export interface SupplierReplyFact {
  readonly supplierId: string;
  readonly latestSubmittedAt: string;
}

// ─── Derived vocabulary (never stored — LAW 2) ────────────────────────────────

/**
 * The DERIVED request status:
 *  · composed — a live chase reason with no ask on record → compose one.
 *  · awaiting — an ask is on record AND a reply arrived since it → responsive.
 *  · stale    — an ask is on record AND no reply since it → the supplier went quiet.
 */
export type OutboundStatus = 'composed' | 'awaiting' | 'stale';

/** One derived queue entry (supplier-grain — asks are supplier-grain, LAW 4). */
export interface OutboundQueueEntry {
  readonly supplierId: string;
  /** DERIVED (LAW 2) — never read from a stored field. */
  readonly status: OutboundStatus;
  readonly severity: ChaseSeverityLevel;
  readonly dataReasons: readonly ChaseReason[];
  /** From the record when asked; re-derived from the view when composed. */
  readonly subjectRefs: readonly OutboundSubjectRef[];
  readonly lastSentAt: string | null;
  readonly lastChannel: Channel | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** The structural subject ref of a delivery-chase entry (drops mode/severity). */
export function subjectRefOf(entry: DeliveryChaseEntry): OutboundSubjectRef {
  return {
    agreementId: entry.agreementId,
    itemSeq: entry.itemSeq,
    ...(entry.releaseSeq !== undefined ? { releaseSeq: entry.releaseSeq } : {}),
    dueAt: entry.dueDate,
    materialCode: entry.materialCode,
  };
}

/**
 * Build an outbound request record, stamping `sentAt` from the shared `sdcClock`
 * (LAW 3 — never a wall-clock). The factory C4 uses before `outboundRequestStore.
 * append`; kept headless so the clock discipline is testable in isolation.
 */
export function makeOutboundRequest(input: {
  readonly id: string;
  readonly supplierId: string;
  readonly subjectRefs: readonly OutboundSubjectRef[];
  readonly channel: Channel;
  readonly correlationAnchor?: string | null;
}): OutboundRequestRecord {
  return {
    id: input.id,
    supplierId: input.supplierId,
    subjectRefs: input.subjectRefs,
    channel: input.channel,
    sentAt: sdcClock.now(),
    correlationAnchor: input.correlationAnchor ?? null,
  };
}

// Worst-first ordering: harder severity, then the more-actionable status
// (stale escalate > composed ask > awaiting wait), then a stable supplier key.
const SEVERITY_RANK: Record<ChaseSeverityLevel, number> = { hard: 0, soft: 1, none: 2 };
const STATUS_RANK: Record<OutboundStatus, number> = { stale: 0, composed: 1, awaiting: 2 };

// ─── The derivation ───────────────────────────────────────────────────────────

/**
 * Derive the outbound queue over the current chase views + the ask/reply facts.
 * PURE — inputs in, queue out, zero mutation, no clock read (`now` injected).
 *
 * One entry per supplier that has something to communicate (i.e. per chase view).
 * `sentRecords`/`replies` are clamped to `<= now` so a future-dated ask or reply
 * cannot pre-resolve the timeline. Timestamps are ISO-UTC, so lexicographic
 * comparison is chronological (the chase modules' own convention).
 */
export function deriveOutboundQueue(
  chaseViews: readonly SupplierChaseView[],
  sentRecords: readonly OutboundRequestRecord[],
  replies: readonly SupplierReplyFact[],
  now: string,
): readonly OutboundQueueEntry[] {
  // Latest ask per supplier (on the timeline).
  const latestSent = new Map<string, OutboundRequestRecord>();
  for (const r of sentRecords) {
    if (r.sentAt > now) continue;
    const cur = latestSent.get(r.supplierId);
    if (cur === undefined || r.sentAt > cur.sentAt) latestSent.set(r.supplierId, r);
  }
  // Latest reply per supplier (on the timeline) — channel-agnostic (LAW 4).
  const latestReply = new Map<string, string>();
  for (const f of replies) {
    if (f.latestSubmittedAt > now) continue;
    const cur = latestReply.get(f.supplierId);
    if (cur === undefined || f.latestSubmittedAt > cur) latestReply.set(f.supplierId, f.latestSubmittedAt);
  }

  const entries: OutboundQueueEntry[] = chaseViews.map((view) => {
    const sent = latestSent.get(view.supplierId) ?? null;
    let status: OutboundStatus;
    if (sent === null) {
      status = 'composed';
    } else {
      const reply = latestReply.get(view.supplierId);
      // "Any reply since the latest ask" freshens (LAW 4 semantic).
      status = reply !== undefined && reply > sent.sentAt ? 'awaiting' : 'stale';
    }
    return {
      supplierId: view.supplierId,
      status,
      severity: view.overallSeverity,
      dataReasons: view.dataReasons,
      subjectRefs: sent !== null ? sent.subjectRefs : view.commitmentEntries.map(subjectRefOf),
      lastSentAt: sent?.sentAt ?? null,
      lastChannel: sent?.channel ?? null,
    };
  });

  return entries.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      a.supplierId.localeCompare(b.supplierId),
  );
}
