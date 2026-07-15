// ────────────────────────────────────────────────────────────────────────────
// intakeReviewModel (Phase A/1) — the PURE triage model behind the review
// surface, tested HEADLESS.
//
// The load-bearing guarantees of FORK-C=(c2), provable without a DOM:
//  · accept-as-suggested ROUTES to the existing push with NO override — the
//    payload quantity IS the suggestion, it never carries a `reason`, and no
//    DR-10 decision is built (nothing was overridden). One mutation path.
//  · dismiss is EPHEMERAL — a pure set operation on client state that never
//    touches a line, a payload, or the seam. Restore is its exact inverse.
//  · a committed line outranks a stale dismissal (push is the ONLY exit from
//    PLANNED — a dismissal cannot mask a commit, C6 §3).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { PR_INTAKE_LINES } from '../../services/data/mock/fixtures/prIntake';
import { applyPushResult, PLANNED_ROW } from '../plan-grid/planGridModel';
import {
  buildAcceptPush,
  triageStatus,
  triageCounts,
  dismissLine,
  restoreLine,
} from './intakeReviewModel';

// pil-somo-001 (Glycerin): accepted === suggested (a clean as-suggested line).
const AS_SUGGESTED = PR_INTAKE_LINES.find((l) => !l.wasAdjusted)!;
// pil-somo-002 (Niacinamide): producer-recorded adjustment (accepted ≠ suggested).
const PRODUCER_ADJUSTED = PR_INTAKE_LINES.find((l) => l.wasAdjusted)!;

describe('buildAcceptPush — accept-as-suggested is NOT an override (FORK-C c2)', () => {
  it('pushes the SUGGESTED quantity — even when the fixture carries a producer adjustment', () => {
    expect(buildAcceptPush(AS_SUGGESTED).payload.quantity).toBe(AS_SUGGESTED.suggestedQty);
    // As-suggested means THE SUGGESTION: a producer-recorded acceptedQty is not
    // silently committed by a triage accept — that path is the plan-grid drawer.
    expect(buildAcceptPush(PRODUCER_ADJUSTED).payload.quantity).toBe(
      PRODUCER_ADJUSTED.suggestedQty,
    );
    expect(buildAcceptPush(PRODUCER_ADJUSTED).payload.quantity).not.toBe(
      PRODUCER_ADJUSTED.acceptedQty,
    );
  });

  it('never carries a reason and never builds a DR-10 decision (nothing overridden)', () => {
    for (const line of PR_INTAKE_LINES) {
      const push = buildAcceptPush(line);
      expect('reason' in push.payload).toBe(false);
      expect(push.decision).toBeUndefined();
    }
  });

  it('rides the C7 provenance through: source, requiredDate=period, material, uom', () => {
    const { payload } = buildAcceptPush(AS_SUGGESTED);
    expect(payload.source).toBe(AS_SUGGESTED.source);
    expect(payload.requiredDate).toBe(AS_SUGGESTED.period);
    expect(payload.material).toBe(AS_SUGGESTED.material);
    expect(payload.uom).toBe(AS_SUGGESTED.uom);
  });
});

describe('dismissLine / restoreLine — honest EPHEMERAL client state (never the seam)', () => {
  it('dismiss adds the id to a NEW set; the input set is never mutated', () => {
    const before: ReadonlySet<string> = new Set<string>();
    const after = dismissLine(before, AS_SUGGESTED.id);
    expect(after.has(AS_SUGGESTED.id)).toBe(true);
    expect(before.has(AS_SUGGESTED.id)).toBe(false); // purity — no in-place write
    expect(before.size).toBe(0);
  });

  it('restore is the exact inverse and is equally pure', () => {
    const dismissed = dismissLine(new Set<string>(), AS_SUGGESTED.id);
    const restored = restoreLine(dismissed, AS_SUGGESTED.id);
    expect(restored.has(AS_SUGGESTED.id)).toBe(false);
    expect(dismissed.has(AS_SUGGESTED.id)).toBe(true); // input untouched
  });

  it('a dismissal never touches the line itself — the seam rows are not writable', () => {
    const snapshot = JSON.stringify(PR_INTAKE_LINES);
    dismissLine(new Set<string>(), PRODUCER_ADJUSTED.id);
    expect(JSON.stringify(PR_INTAKE_LINES)).toBe(snapshot);
  });
});

describe('triageStatus — committed > dismissed > pending', () => {
  it('a line with no push state and no dismissal is pending', () => {
    expect(triageStatus(AS_SUGGESTED, undefined, new Set())).toBe('pending');
    expect(triageStatus(AS_SUGGESTED, PLANNED_ROW, new Set())).toBe('pending');
  });

  it('a dismissed line reads dismissed', () => {
    const dismissed = dismissLine(new Set<string>(), AS_SUGGESTED.id);
    expect(triageStatus(AS_SUGGESTED, undefined, dismissed)).toBe('dismissed');
  });

  it('a committed line reads accepted — and outranks a stale dismissal (C6 §3)', () => {
    const committed = applyPushResult({ ok: true, entityId: 'PR-2026-9001' });
    expect(triageStatus(AS_SUGGESTED, committed, new Set())).toBe('accepted');
    const dismissed = dismissLine(new Set<string>(), AS_SUGGESTED.id);
    expect(triageStatus(AS_SUGGESTED, committed, dismissed)).toBe('accepted');
  });

  it('a failed push stays pending (both failure channels leave the row PLANNED, C6 §6)', () => {
    const failed = applyPushResult({ ok: false, reason: 'SCOPE_DENIED' });
    expect(triageStatus(AS_SUGGESTED, failed, new Set())).toBe('pending');
  });
});

describe('triageCounts — the review-queue summary', () => {
  it('partitions the whole inbound set across pending / accepted / dismissed', () => {
    const committed = applyPushResult({ ok: true, entityId: 'PR-2026-9001' });
    const pushStates = { [AS_SUGGESTED.id]: committed };
    const dismissed = dismissLine(new Set<string>(), PRODUCER_ADJUSTED.id);

    const counts = triageCounts(PR_INTAKE_LINES, pushStates, dismissed);
    expect(counts.total).toBe(PR_INTAKE_LINES.length);
    expect(counts.accepted).toBe(1);
    expect(counts.dismissed).toBe(1);
    expect(counts.pending).toBe(PR_INTAKE_LINES.length - 2);
    expect(counts.pending + counts.accepted + counts.dismissed).toBe(counts.total);
  });
});
