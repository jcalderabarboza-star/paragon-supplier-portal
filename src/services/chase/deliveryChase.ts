// ─────────────────────────────────────────────────────────────────────────────
// SDC-5a — the pure DELIVERY-CHASE derivation (headless, DERIVED).
//
// The chase engine, upgraded from chasing DATA ("reply to my forecast request")
// to chasing COMMITMENTS ("honour the calendar you signed"). This module reads a
// delivery agreement's ALREADY-DERIVED fulfillment and classifies each released
// line — and each drifting item — into a chase entry the planner acts on.
//
// ── STRUCTURAL FRAME (ratified) ──────────────────────────────────────────────
//   This is a NEW NEUTRAL module: `chase` depends on `delivery` (and, at 5b, on
//   `sdc`); neither `delivery` nor `sdc` depends on `chase`. `sdc` never imports
//   `delivery` (that would be circular) — the unification of the two chase
//   families composes HERE, one level up. 5a carries the delivery family only.
//
// ── A VIEW OVER EXISTING STATES (no new fulfillment logic) ────────────────────
//   Chase is a pure VIEW over `deriveFulfillment`'s output — it reads the SAME
//   pending/fulfilled/late/missed the Delivery Overview shows (carried on the
//   `DeliveryAgreementView` the service already derived), and adds ONE thing of
//   its own: the anticipatory "approaching-due" lens, computed here from
//   (releaseDate, now) — NEVER a new state on `fulfillment.ts` (untouched).
//
// ── HONEST BY CONSTRUCTION ────────────────────────────────────────────────────
//   Every entry is a derived assessment over a REAL fulfillment state, never a
//   fabricated urgency. A non-compliance alert fires only on a genuinely
//   late/missed line; the anticipatory nudge fires only on a pending line whose
//   date is genuinely within the window (never on a fine, far-off line, and never
//   on a delivered one). SIMULATED end to end (no channel send, no SAP) — 5a is
//   headless, so the honesty guarantee is the tests.
//
// PURE and DETERMINISTIC: data in, entries out, zero mutation, NO clock read —
// `now` is injected last (the SDC-selector convention, cf.
// deriveFulfillment(item, shipments, now) / chaseList(publication, rows, now)).
// This module never calls argless `new Date()`.
// ─────────────────────────────────────────────────────────────────────────────

import type { CommitmentClass } from '../sdc/types';
import { commitmentClassOf } from '../delivery/generator';
import type { DeliveryAgreementView } from '../delivery/views';

const DAY_MS = 86_400_000;

// ─── Named policy knobs (co-located, the RESPONSE_DUE_DAYS / MATCH_WINDOW_DAYS
//     idiom — display-layer chase rules, not schema facts; tuned at the
//     real-planner validation checkpoint) ───────────────────────────────────────

/** The anticipatory window (days): a released, still-pending line whose release
 *  date is now..+this-many days out warrants a "your release is coming up" nudge.
 *  Below 0 (past date) is not "approaching" — it is graced-or-failed, never nudged. */
export const ANTICIPATION_DAYS = 7;

/** How many late-or-missed lines on one item constitute DRIFT (a pattern, not a
 *  single miss). At/above this, the item earns one drift entry on top of its
 *  per-line alerts. */
export const DRIFT_COUNT = 2;

// ─── The chase entry ──────────────────────────────────────────────────────────

/**
 * The three escalating chase modes (design note §"the pushy system"):
 *  · anticipatory-nudge — ahead of the release date (the NEW lens, computed here).
 *  · non-compliance-alert — a commitment already failed (late OR missed).
 *  · drift — a PATTERN of slippage on one item (≥ DRIFT_COUNT late/missed lines).
 */
export type ChaseMode = 'anticipatory-nudge' | 'non-compliance-alert' | 'drift';

/** Commitment hardness → escalation register. `commitmentClassOf` drives it
 *  uniformly: firm (JIT) → hard/urgent, semi-firm (FRC) → soft/advisory. The MODE
 *  conveys the KIND of chase; SEVERITY conveys how hard to push, per the signed
 *  commitment class. */
export type ChaseSeverity = 'hard' | 'soft';

/**
 * One chase entry at COMMITMENT grain (supplier + agreement + item + release) —
 * NOT supplier-keyed (the two-grain bind with the sdc supplier-keyed data-chase is
 * 5b/5c's job). `releaseSeq` is ABSENT on a drift entry: drift is an ITEM-level
 * pattern that cannot be attributed to one release. `dueDate` is the obligation
 * date being chased (the line's release date; for drift, the EARLIEST offending
 * line's date — "behind since").
 */
export interface DeliveryChaseEntry {
  readonly supplierId: string;
  readonly agreementId: string;
  readonly itemSeq: number;
  /** Line grain for nudge/alert; absent for the item-level drift entry. */
  readonly releaseSeq?: number;
  readonly mode: ChaseMode;
  readonly type: CommitmentClass;
  readonly severity: ChaseSeverity;
  readonly dueDate: string;
  readonly materialCode: string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** firm → hard, semi-firm → soft (uniform across modes; §3 matrix). */
function severityOf(type: CommitmentClass): ChaseSeverity {
  return type === 'firm' ? 'hard' : 'soft';
}

/** The date-only portion — release dates are 'YYYY-MM-DD'; comparing day-granular
 *  (not against a 12:00 clock instant) keeps the window boundary crisp. */
function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Whole days from `fromDay` to `toDay` (negative when `toDay` is in the past).
 *  Both args are date-only 'YYYY-MM-DD' → UTC midnight → integer day math. */
function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(toDay) - Date.parse(fromDay)) / DAY_MS);
}

// Worst-first ordering — hard before soft; within severity, an already-failed
// alert before a drift pattern before a look-ahead nudge (the documented
// precedence: alert > drift > nudge).
const SEVERITY_RANK: Record<ChaseSeverity, number> = { hard: 0, soft: 1 };
const MODE_RANK: Record<ChaseMode, number> = {
  'non-compliance-alert': 0,
  drift: 1,
  'anticipatory-nudge': 2,
};

// ─── The derivation ───────────────────────────────────────────────────────────

/**
 * Derive the delivery chase list over already-derived agreement views. PURE —
 * views in, entries out, zero mutation, no clock read (`now` injected).
 *
 * Per released line (reading the view's derived `fulfillment`, worst-wins):
 *   · late | missed → a non-compliance-alert entry.
 *   · pending AND within the anticipatory window → an anticipatory-nudge entry.
 *   · fulfilled, or pending-but-not-approaching → NO entry (no fabricated urgency).
 * A line is only ever ONE line-level mode (late/missed and pending are mutually
 * exclusive fulfillment states, so no line double-classifies).
 *
 * Per item: ≥ DRIFT_COUNT late-or-missed lines earns ONE additional drift entry
 * (item grain, no releaseSeq) that COMPOSES with the per-line alerts.
 *
 * Draft lines never appear here — `fulfillment` covers only RELEASED lines
 * (deriveFulfillment omits drafts), so "chase only on released" holds by
 * construction (honesty guard 1).
 */
export function deriveDeliveryChase(
  views: readonly DeliveryAgreementView[],
  now: string,
): readonly DeliveryChaseEntry[] {
  const nowDay = dayOf(now);
  const entries: DeliveryChaseEntry[] = [];

  for (const { agreement, items } of views) {
    for (const { item, fulfillment } of items) {
      const type = commitmentClassOf(item.releaseType);
      const severity = severityOf(type);
      const lineBySeq = new Map(item.scheduleLines.map((l) => [l.releaseSeq, l]));

      let offenders = 0;
      let earliestOffenderDate: string | null = null;

      for (const f of fulfillment) {
        const line = lineBySeq.get(f.releaseSeq);
        if (!line) continue; // defensive — every fulfillment view maps to a released line.

        if (f.fulfillment === 'missed' || f.fulfillment === 'late') {
          offenders += 1;
          if (earliestOffenderDate === null || dayOf(line.releaseDate) < dayOf(earliestOffenderDate)) {
            earliestOffenderDate = line.releaseDate;
          }
          entries.push({
            supplierId: agreement.supplierId,
            agreementId: agreement.id,
            itemSeq: item.lineSeq,
            releaseSeq: line.releaseSeq,
            mode: 'non-compliance-alert',
            type,
            severity,
            dueDate: line.releaseDate,
            materialCode: item.materialCode,
          });
        } else if (f.fulfillment === 'pending') {
          const daysOut = daysBetween(nowDay, dayOf(line.releaseDate));
          if (daysOut >= 0 && daysOut <= ANTICIPATION_DAYS) {
            entries.push({
              supplierId: agreement.supplierId,
              agreementId: agreement.id,
              itemSeq: item.lineSeq,
              releaseSeq: line.releaseSeq,
              mode: 'anticipatory-nudge',
              type,
              severity,
              dueDate: line.releaseDate,
              materialCode: item.materialCode,
            });
          }
        }
        // 'fulfilled' → nothing to chase.
      }

      if (offenders >= DRIFT_COUNT && earliestOffenderDate !== null) {
        entries.push({
          supplierId: agreement.supplierId,
          agreementId: agreement.id,
          itemSeq: item.lineSeq,
          mode: 'drift',
          type,
          severity,
          dueDate: earliestOffenderDate,
          materialCode: item.materialCode,
        });
      }
    }
  }

  // Deterministic worst-first order: severity, then mode (alert > drift > nudge),
  // then soonest dueDate, then a stable (supplier, agreement, item, release) key.
  return entries.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      MODE_RANK[a.mode] - MODE_RANK[b.mode] ||
      (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0) ||
      a.supplierId.localeCompare(b.supplierId) ||
      (a.agreementId < b.agreementId ? -1 : a.agreementId > b.agreementId ? 1 : 0) ||
      a.itemSeq - b.itemSeq ||
      (a.releaseSeq ?? -1) - (b.releaseSeq ?? -1),
  );
}
