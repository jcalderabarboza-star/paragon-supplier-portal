// ────────────────────────────────────────────────────────────────────────────
// The intake-triage store (A2) — the HONEST READ.
//
// It persists, so it can be handed a blob nobody in this codebase wrote: an
// older version, a hand edit, a half-written write. The discipline is
// `customRoles.ts`'s, copied rather than re-derived:
//
//   · **absent, corrupt and unparseable are distinguished from empty** — an
//     empty store means nobody has triaged anything, which is legitimate and
//     common; an unreadable one means somebody's decisions are on disk and
//     cannot be read, which is not;
//   · every row is re-validated through the same predicates the verbs use; and
//   · a refusal is REPORTED, never absorbed.
//
// ⚠️ **AND THE STORE HOLDS ACTS, NOT LINES.** The producer's rows are the
// fixture's and are read-only. A row here naming a line no producer emitted is
// refused, because a stored triage must not be able to resurrect a requirement
// nobody asked for.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import {
  INTAKE_TRIAGE_KEY,
  intakeLineStore,
  setKnownIntakeLineIds,
} from './intakeLineStore';
import { PR_INTAKE_LINES } from '../fixtures/prIntake';

const KNOWN = PR_INTAKE_LINES.map((l) => l.id);
const A = 'pil-somo-001';

/** Write a raw blob the way a previous session (or a hand edit) would have. */
const seed = (value: unknown) => {
  window.localStorage.setItem(INTAKE_TRIAGE_KEY, JSON.stringify(value));
  intakeLineStore.rehydrate();
  setKnownIntakeLineIds(KNOWN);
  intakeLineStore.rehydrate();
};

const envelope = (triage: unknown[]) => ({ v: 1, triage });

beforeEach(() => {
  intakeLineStore.reset();
  window.localStorage.removeItem(INTAKE_TRIAGE_KEY);
  setKnownIntakeLineIds(KNOWN);
});

describe('the born state — Pending, and the fixture is the authority on existence', () => {
  it('a line nobody has triaged reads Pending with no record', () => {
    expect(intakeLineStore.get(A)).toBeUndefined();
    expect(intakeLineStore.stateOf(A)).toBe('Pending');
  });

  it('an id no producer emitted reads null — the answer the dispatcher needs', () => {
    expect(intakeLineStore.stateOf('pil-invented')).toBeNull();
  });

  // ⚠️ **`null` IS NOT THE SAME AS AN EMPTY KNOWN-SET, AND THE DIFFERENCE IS
  // A READ TAKEN TOO EARLY.** Before the seam declares the producer's rows,
  // checking membership against an empty set would refuse every line — which
  // looks exactly like a corrupt store. Until it is told, the store does not
  // check, and a row survives on its own shape.
  it('before the producer set is declared, a line is not refused for being unknown', () => {
    intakeLineStore.reset(); // clears the known-set too
    expect(intakeLineStore.stateOf('pil-anything')).toBe('Pending');
  });
});

describe('persistence — a decision survives the reload that used to erase it', () => {
  it('a dismissal written now is present after the in-memory copy is dropped', () => {
    intakeLineStore.put({ lineId: A, state: 'Dismissed' });
    intakeLineStore.rehydrate(); // what a reload does: memory gone, disk intact
    expect(intakeLineStore.stateOf(A)).toBe('Dismissed');
  });

  it('one record per line — a later act REPLACES the earlier one', () => {
    intakeLineStore.put({ lineId: A, state: 'Dismissed' });
    intakeLineStore.put({ lineId: A, state: 'Pending' });
    expect(intakeLineStore.all().filter((r) => r.lineId === A)).toHaveLength(1);
    expect(intakeLineStore.stateOf(A)).toBe('Pending');
  });

  it('reset clears memory AND disk; rehydrate clears only memory', () => {
    intakeLineStore.put({ lineId: A, state: 'Dismissed' });
    expect(window.localStorage.getItem(INTAKE_TRIAGE_KEY)).not.toBeNull();
    intakeLineStore.reset();
    expect(window.localStorage.getItem(INTAKE_TRIAGE_KEY)).toBeNull();
    expect(intakeLineStore.all()).toEqual([]);
  });
});

describe('the honest read — empty, absent, corrupt and unreadable are four answers', () => {
  it('ABSENT reads empty and NOT unreadable — nobody has triaged anything', () => {
    const state = intakeLineStore.readState();
    expect(state.records).toEqual([]);
    expect(state.rejected).toEqual([]);
    expect(state.unreadable).toBe(false);
  });

  it('EMPTY but present reads empty and NOT unreadable', () => {
    seed(envelope([]));
    expect(intakeLineStore.readState().unreadable).toBe(false);
    expect(intakeLineStore.readState().records).toEqual([]);
  });

  it('UNPARSEABLE JSON reads unreadable — distinct from empty', () => {
    window.localStorage.setItem(INTAKE_TRIAGE_KEY, '{not json');
    intakeLineStore.rehydrate();
    expect(intakeLineStore.readState().unreadable).toBe(true);
  });

  it('an UNKNOWN envelope version reads unreadable, never partially trusted', () => {
    seed({ v: 99, triage: [{ lineId: A, state: 'Dismissed' }] });
    expect(intakeLineStore.readState().unreadable).toBe(true);
    expect(intakeLineStore.all()).toEqual([]);
  });

  it('a well-formed blob reads back, and is NOT reported unreadable', () => {
    // The known-GOOD control. Every refusal below means nothing until this one
    // passes: a reader that rejected everything would satisfy all of them.
    seed(envelope([{ lineId: A, state: 'Dismissed' }]));
    expect(intakeLineStore.readState().unreadable).toBe(false);
    expect(intakeLineStore.readState().rejected).toEqual([]);
    expect(intakeLineStore.stateOf(A)).toBe('Dismissed');
  });
});

describe('row refusals — stated, never absorbed, and each one named', () => {
  const rejectionFor = (row: unknown) => {
    seed(envelope([row]));
    const { rejected } = intakeLineStore.readState();
    expect(rejected).toHaveLength(1);
    return rejected[0].reason;
  };

  it('refuses a row naming a line no producer emitted', () => {
    expect(rejectionFor({ lineId: 'pil-ghost', state: 'Pending' })).toMatch(
      /names no intake line/,
    );
  });

  it('refuses a state outside the union — through the flow’s own predicate', () => {
    expect(rejectionFor({ lineId: A, state: 'Approved' })).toMatch(/not a triage state/);
  });

  // ⚠️ **THE FLOOR THE POLICY HOOK ENFORCES AT DISPATCH IS RE-APPLIED AT
  // READ.** A hand-edited blob must clear the same bar the verb did, or the
  // store becomes the one way to get a zero-quantity commitment into the tree.
  it('refuses a committed quantity of zero or below', () => {
    expect(rejectionFor({ lineId: A, state: 'Committed', committedQty: 0 })).toMatch(
      /quantity above zero/,
    );
  });

  // A record of an act missing the substance of the act is not a lighter
  // version of the record; it is a claim that something was committed with
  // nothing in it.
  it('refuses a Committed row that records no quantity', () => {
    expect(rejectionFor({ lineId: A, state: 'Committed' })).toMatch(
      /records no quantity/,
    );
  });

  it('refuses a duplicate line id rather than letting the last write win', () => {
    seed(envelope([
      { lineId: A, state: 'Dismissed' },
      { lineId: A, state: 'Pending' },
    ]));
    const { records, rejected } = intakeLineStore.readState();
    expect(records).toHaveLength(1);
    expect(rejected[0].reason).toMatch(/appears twice/);
    expect(intakeLineStore.stateOf(A)).toBe('Dismissed');
  });

  it('refuses a malformed reason and a malformed instant', () => {
    expect(rejectionFor({ lineId: A, state: 'Dismissed', overrideReason: 7 })).toMatch(
      /not text/,
    );
    expect(rejectionFor({ lineId: A, state: 'Dismissed', committedAt: 7 })).toMatch(
      /not an instant/,
    );
  });

  it('keeps the GOOD rows beside the refused ones — one bad row is not a bad store', () => {
    seed(envelope([
      { lineId: 'pil-ghost', state: 'Pending' },
      { lineId: A, state: 'Dismissed' },
    ]));
    const { records, rejected, unreadable } = intakeLineStore.readState();
    expect(unreadable).toBe(false);
    expect(rejected).toHaveLength(1);
    expect(records.map((r) => r.lineId)).toEqual([A]);
  });
});
