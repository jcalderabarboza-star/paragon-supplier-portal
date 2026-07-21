// ─────────────────────────────────────────────────────────────────────────────
// Delivery Agreement — Batch 2: the release step (pure).
//
// The ONE transition that moves a ScheduleLine from 'draft' (SAP LPA internal
// character — adjustable, NOT transmitted to the vendor) to 'released'
// (transmitted as an FRC/JIT delivery schedule; now a commitment the chase engine
// can later push on). This is the HONESTY BOUNDARY of the delivery lane: before
// it, a line is an internal plan; after it, a promise the vendor has been given.
//
// PURE and IMMUTABLE — data in, a NEW item out. Never mutates its input, never
// reads a clock (`now` is injected last, the SDC selector convention — cf.
// chaseList(publication, rows, now) in ../sdc/consolidation.ts), never dispatches,
// never touches the ledger. `deriveDrawdownLedger` already counts state ===
// 'released'; Batch 2 only PRODUCES released lines and leaves ledger.ts untouched.
//
// Rejections follow the pure-SDC-lane idiom: a discriminated { ok } union with a
// string-literal reason enum (cf. DispatchUnit / ParseReason in ../sdc/ingest.ts)
// — never a throw (that is the read layer's DataError) and never a CommandResult
// (that is the dispatcher layer, which sits ABOVE this module). Nothing here is
// ever a silent success: a selection that resolves to nothing is an honest
// NO_LINES_SELECTED, not an empty ok.
//
// ── ADJUDICATED DECISIONS (Batch-2 build locks) ──────────────────────────────
//   A  NO actor parameter. Attribution rides the dispatcher (actorKey(scope) into
//      the TransitionEvent) when the release later gets a CommandTarget. Pure
//      domain code takes `now` and nothing else about the caller.
//   B  The freeze is ENFORCED, not merely asserted: `adjustDraftLine` REFUSES a
//      released line. `readonly` does not survive a spread, so without this guard
//      "released is frozen" would be a comment, not a law.
//   C  `sapReleaseNumber` is DECLARED on the line but never written here — SAP
//      assigns it on transmission (Pattern B). The portal never mints a competing
//      identity (honesty guard 6).
//   D  NO 'block' enforcement on release — recorded as a known-unimplemented arm
//      on DrawdownEnforcement (see types.ts), not silently dead.
//   E  BOTH selection arms: a horizon date (the real FRC/JIT "release the next N
//      periods" motion) AND an explicit seq set (what a UI selection produces).
//
// SCOPE: no chase engine, no fulfillment match, no SAP posting, no UI.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScheduleLine, SchedulingAgreementItem } from './types';

// ─── Rejection vocabulary ─────────────────────────────────────────────────────

/**
 * Why a release or adjustment was refused. Every arm is an HONEST refusal — the
 * caller is told what happened rather than handed a silent no-op.
 */
export type ReleaseReason =
  /** The selection resolved to zero releasable lines (honest silence, NOT an
   *  empty success). Also covers an empty `releaseSeqs` array and a horizon that
   *  lands before the first line — or one whose whole range is already released. */
  | 'NO_LINES_SELECTED'
  /** An explicit `releaseSeqs` / `adjustDraftLine` seq that no line carries. */
  | 'UNKNOWN_RELEASE_SEQ'
  /** An explicitly-named line is already 'released'. Note the deliberate split:
   *  the HORIZON arm skips already-released lines silently (re-releasing a horizon
   *  is a natural operator repeat — cf. the best-effort cascade no-op in
   *  ../transitions/dispatcher.ts), while an EXPLICITLY named line is refused
   *  (the operator named THAT line and deserves to be told — cf. the dispatcher's
   *  ILLEGAL_TRANSITION on an explicit verb). Also the freeze law (Decision B). */
  | 'ALREADY_RELEASED'
  /** One release call spanned mixed FRC/JIT lines. SAP transmits FRC and JIT as
   *  SEPARATE release documents, so one call may never straddle both. Under
   *  Decision E (releaseType is stamped per-item by the generator) this cannot
   *  arise from seeded data — guarded anyway, so the later mixed-horizon case is
   *  safe to act on. */
  | 'RELEASE_TYPE_MISMATCH';

// ─── Selection (Decision E — both arms) ───────────────────────────────────────

/**
 * WHICH lines to release, within ONE item.
 *
 * · `{ horizonDate }` — the real SAP motion: transmit the schedule THROUGH a
 *   horizon (inclusive), i.e. "release the next N periods". Already-released
 *   lines in range are skipped, so a repeat is idempotent.
 * · `{ releaseSeqs }` — an explicit set, which is what a UI checkbox selection
 *   produces and the only way to express "skip line 3". A horizon cannot say it.
 */
export type ReleaseSelection =
  | { readonly horizonDate: string }
  | { readonly releaseSeqs: readonly number[] };

/** The patch a DRAFT line accepts. A released line accepts none (Decision B). */
export interface ScheduleLinePatch {
  readonly plannedQty?: number;
  readonly releaseDate?: string;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export type ReleaseResult =
  | {
      readonly ok: true;
      /** A NEW item — the input is never mutated. */
      readonly item: SchedulingAgreementItem;
      /** Exactly which seqs flipped, ascending. Makes a PARTIAL release (a horizon
       *  that skipped already-released lines) observable rather than silent. */
      readonly releasedSeqs: readonly number[];
    }
  | { readonly ok: false; readonly reason: ReleaseReason; readonly detail?: string };

export type AdjustResult =
  | {
      readonly ok: true;
      readonly item: SchedulingAgreementItem;
      readonly adjustedSeq: number;
    }
  | { readonly ok: false; readonly reason: ReleaseReason; readonly detail?: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Narrow the selection union. Both arms are object literals, so key-test it. */
function isHorizon(sel: ReleaseSelection): sel is { readonly horizonDate: string } {
  return 'horizonDate' in sel;
}

/** Replace exactly the lines named by `seqs`, preserving order. Returns a NEW
 *  item with a NEW lines array — the input item and every untouched line object
 *  are reused by reference but never mutated. */
function withLines(
  item: SchedulingAgreementItem,
  seqs: ReadonlySet<number>,
  patch: (line: ScheduleLine) => ScheduleLine,
): SchedulingAgreementItem {
  return {
    ...item,
    scheduleLines: item.scheduleLines.map((l) => (seqs.has(l.releaseSeq) ? patch(l) : l)),
  };
}

// ─── The release transition ───────────────────────────────────────────────────

/**
 * Release the selected DRAFT lines of ONE item: flip them to 'released' and stamp
 * `releasedAt = now`.
 *
 * GRAIN is deliberately WITHIN ONE ITEM. Items carry independent `releaseType`
 * and independent `drawdownPolicy` (the ctr-003 seed pairs an FRC/Case-B item with
 * a JIT/Case-C one), and SAP transmits FRC and JIT as separate release documents —
 * an agreement-level release would have to straddle both. A caller wanting two
 * items calls twice.
 *
 * INVARIANT: `releasedAt` present ⟺ `state === 'released'`. Set together here,
 * and unreachable afterwards because a released line refuses every adjustment.
 *
 * NOT enforced (Decision D): a release that would push releasedQty past the
 * drawdown envelope is NOT refused, even under enforcement 'block'. Note that
 * under the generator invariant it cannot happen from generated lines anyway —
 * Σ plannedQty === agreedTotalQty exactly, so releasing the FULL calendar lands
 * on the envelope, never past it.
 *
 * PURE: no mutation, no clock read, no dispatch, no ledger touch.
 */
export function releaseScheduleLines(
  item: SchedulingAgreementItem,
  selection: ReleaseSelection,
  now: string,
): ReleaseResult {
  const lines = item.scheduleLines;
  let targets: ScheduleLine[];

  if (isHorizon(selection)) {
    // Horizon arm: everything dated on or before the horizon that is still draft.
    // Already-released lines in range are SKIPPED silently — re-releasing a
    // horizon is a natural operator repeat, not an error.
    targets = lines.filter((l) => l.releaseDate <= selection.horizonDate && l.state === 'draft');
  } else {
    // Explicit arm: every named seq must exist and must still be draft. An
    // explicitly named line is never silently skipped.
    targets = [];
    for (const seq of selection.releaseSeqs) {
      const line = lines.find((l) => l.releaseSeq === seq);
      if (!line) {
        return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no schedule line ${seq}` };
      }
      if (line.state === 'released') {
        return {
          ok: false,
          reason: 'ALREADY_RELEASED',
          detail: `line ${seq} was released at ${line.releasedAt ?? 'unknown'}`,
        };
      }
      // Tolerate a duplicated seq in the caller's array without double-counting.
      if (!targets.some((t) => t.releaseSeq === seq)) targets.push(line);
    }
  }

  if (targets.length === 0) {
    return {
      ok: false,
      reason: 'NO_LINES_SELECTED',
      detail: 'the selection resolved to no releasable draft lines',
    };
  }

  // One release document carries ONE release character.
  const types = new Set(targets.map((l) => l.releaseType));
  if (types.size > 1) {
    return {
      ok: false,
      reason: 'RELEASE_TYPE_MISMATCH',
      detail: `one release cannot span ${[...types].sort().join(' + ')}`,
    };
  }

  const seqs = new Set(targets.map((l) => l.releaseSeq));
  return {
    ok: true,
    item: withLines(item, seqs, (l) => ({ ...l, state: 'released', releasedAt: now })),
    releasedSeqs: [...seqs].sort((a, b) => a - b),
  };
}

// ─── The freeze guard (Decision B) ────────────────────────────────────────────

/**
 * Adjust ONE draft line. This is the enforced half of the honesty boundary: a
 * 'draft' line has internal character and is freely adjustable, a 'released' line
 * has been transmitted to the vendor and is FROZEN — adjusting it would mean a new
 * release document (an amendment), which is a later batch and deliberately NOT
 * offered here. Refusing an edit that cannot yet be honestly recorded beats
 * allowing a silent one.
 *
 * Without this function the freeze would be unenforceable: every ScheduleLine
 * field is `readonly`, but `readonly` does not survive a spread — `{...line,
 * plannedQty: 999}` compiles against a released line. Routing adjustments through
 * here makes the illegal edit impossible THROUGH THIS MODULE, and testable.
 *
 * Stamps `adjustedAt = now` (injected, never read). A released line can never
 * acquire one, since it never gets past the guard.
 */
export function adjustDraftLine(
  item: SchedulingAgreementItem,
  releaseSeq: number,
  patch: ScheduleLinePatch,
  now: string,
): AdjustResult {
  const line = item.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
  if (!line) {
    return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no schedule line ${releaseSeq}` };
  }
  if (line.state === 'released') {
    return {
      ok: false,
      reason: 'ALREADY_RELEASED',
      detail: `line ${releaseSeq} is released and frozen; an adjustment requires a new release`,
    };
  }

  const next: ScheduleLine = {
    ...line,
    ...(patch.plannedQty !== undefined ? { plannedQty: patch.plannedQty } : {}),
    ...(patch.releaseDate !== undefined ? { releaseDate: patch.releaseDate } : {}),
    adjustedAt: now,
  };
  return {
    ok: true,
    item: withLines(item, new Set([releaseSeq]), () => next),
    adjustedSeq: releaseSeq,
  };
}
