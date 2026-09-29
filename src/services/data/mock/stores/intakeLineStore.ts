// ────────────────────────────────────────────────────────────────────────────
// Intake-line TRIAGE store (A2 / Design 1 B2).
//
// ── ⚠️ IT STORES THE ACT, NEVER THE LINE ────────────────────────────────────
//
// The producer's rows live in `fixtures/prIntake.ts` and are read-only; this
// store holds, per line id, ONLY what a dispatched verb produced: the triage
// state, the quantity a planner committed, the reason they gave, and when.
//
// **That split is the whole design, and it is not tidiness.** A store that
// copied the producer's row would pin yesterday's content the first time the
// fixture changed — and it would make a triage field and a producer field
// indistinguishable on disk, so a hand-edited blob could assert that somebody
// had dismissed a line in exactly the shape of a dismissal somebody performed.
// Here an unknown line id is a row this store REFUSES on read, because the
// producer's set is the authority on which lines exist.
//
// ── ⚠️ IT PERSISTS, AND THE RULING IS NOT THE ONE C6 §1 FORBIDS ─────────────
//
// C6 §1 forbids persisting PLAN STATE client-side, and that stands: a planned
// quantity nobody committed is not a fact about the world, and writing one to
// a browser would make it look like one. **A triage decision is the opposite
// kind of thing.** Dismissing a line IS an act, performed by a person, and the
// surface that held it in `useState` said so itself — it rendered *"this
// session only · not persisted"*, which was honest about a defect rather than a
// design. Design 1 §5.2 names the remedy in one clause: *the triage is a
// recorded fact (dismiss survives reload and is visible to a colleague)*.
//
// `customRoles.ts` is the precedent copied here rather than re-derived, down to
// the operator's reason for it: *an honest statement does not repair an
// experience that looks like a defect*. The honest-read discipline comes with
// it — **absent, corrupt and unparseable are distinguished from empty**, every
// row is re-validated through the same predicates the verbs use, and a refusal
// is reported rather than absorbed (`readState().unreadable`).
//
// ── ⚠️ WHAT IS DELIBERATELY NOT STORED, AND WHY EACH ONE WOULD BE A SECOND
//     ANSWER THAT CAN BE WRONG ─────────────────────────────────────────────
//
//   · `wasAdjusted` — derived from the two quantities (A1-R2; retired as a
//     stored boolean because nothing ever checked the three agreed).
//   · `planState`   — derived from `state`; a commit is the only exit from
//     PLANNED (C6 §3), so the machine already answers it.
//   · `prNumber`    — derived by looking up the requisition that NAMES this
//     line. A stored copy would have to be written by the cascade's consequence
//     back into the cascade's source, and the two could then disagree: a line
//     claiming a requisition that does not name it back is precisely the
//     duplicate this machine exists to make impossible.
//
// ── ⚠️ AND IT JOINS NO ANCHORED FAMILY ──────────────────────────────────────
//
// `committedAt` is written by the dispatcher at the instant of the act, so
// there is nothing AUTHORED here for `shiftFields` to re-anchor. Declaring a
// family over a corpus that opens empty would be `EMPTY-INPUT-REPORTS-CLEAN-01`
// wearing an anchor — `materialRequestStore`'s ruling, transferred because the
// ground transfers with it.
// ────────────────────────────────────────────────────────────────────────────

import {
  isIntakeLineState,
  type IntakeLineState,
} from '../../../transitions/flows/intakeLine.flow';

/** The storage key. Namespaced like every other Paragon browser key. */
export const INTAKE_TRIAGE_KEY = 'paragon.intakeTriage';

/**
 * The envelope version. A stored blob whose version this code does not know is
 * UNREADABLE, never partially trusted — a best-effort read of an unknown shape
 * is how a triage decision comes back meaning something else.
 */
const STORE_VERSION = 1;

/** What one dispatched act recorded against one intake line. */
export interface IntakeTriageRecord {
  /** The producer's line id. The record's identity — one record per line. */
  readonly lineId: string;
  readonly state: IntakeLineState;
  /** The quantity committed. Present only on a `Committed` record. */
  readonly committedQty?: number;
  /** The planner's stated reason. Present only when they moved the number. */
  readonly overrideReason?: string;
  /** ISO instant of the commit — the machine's own fact. */
  readonly committedAt?: string;
}

/**
 * What the last read found — including what it REFUSED and whether it could be
 * parsed at all, so a surface can state a rejection rather than absorb it.
 */
export interface IntakeTriageReadState {
  readonly records: readonly IntakeTriageRecord[];
  /** Rows the read threw away, each with the reason it was thrown away. */
  readonly rejected: readonly { readonly lineId: string; readonly reason: string }[];
  /**
   * The blob existed and could not be understood. **Distinct from empty** — an
   * empty store means nobody has triaged anything, which is a legitimate and
   * common answer; this means somebody's decisions are on disk and unreadable.
   */
  readonly unreadable: boolean;
}

const EMPTY_READ: IntakeTriageReadState = Object.freeze({
  records: [],
  rejected: [],
  unreadable: false,
});

let rows: IntakeTriageRecord[] = [];
let readState: IntakeTriageReadState = EMPTY_READ;
let hydrated = false;

/**
 * Which line ids the PRODUCER has emitted. Injected rather than imported, so
 * the store never reaches into a fixture and a spec can hand it any population.
 *
 * ⚠️ **NULL MEANS "NOT YET TOLD", AND IT IS NOT THE SAME AS AN EMPTY SET.** An
 * empty set would refuse every stored row as naming an unknown line — which is
 * exactly what a read taken before the seam registered would look like, and it
 * would look identical to a corrupt store. Until it is set, a stored row's line
 * id is not checked against anything and the row survives on its own shape.
 */
let knownLineIds: ReadonlySet<string> | null = null;

/**
 * Tell the store which lines exist. Called by the read seam, which is the only
 * module that knows the producer's set.
 */
export function setKnownIntakeLineIds(ids: Iterable<string>): void {
  knownLineIds = new Set(ids);
}

/** Why this row cannot be trusted, or `null`. The verbs' own predicates. */
function refusalFor(row: unknown, seen: ReadonlySet<string>): string | null {
  if (typeof row !== 'object' || row === null) return 'not a record';
  const r = row as Record<string, unknown>;
  if (typeof r.lineId !== 'string' || r.lineId.trim() === '') return 'lineId is not an id';
  if (seen.has(r.lineId)) return `'${r.lineId}' appears twice in the store`;
  if (knownLineIds !== null && !knownLineIds.has(r.lineId)) {
    return `'${r.lineId}' names no intake line the producers emitted`;
  }
  // The SAME membership predicate the flow exports — not a second spelling of
  // the union, which is the copy that drifts the day a state is added.
  if (!isIntakeLineState(r.state)) return `'${String(r.state)}' is not a triage state`;
  if (r.committedQty !== undefined) {
    if (typeof r.committedQty !== 'number' || !Number.isFinite(r.committedQty) || r.committedQty <= 0) {
      // The floor the policy hook enforces at dispatch, re-applied at read: a
      // blob edited by hand must clear the same bar the verb did.
      return 'committedQty is not a quantity above zero';
    }
  }
  if (r.overrideReason !== undefined && typeof r.overrideReason !== 'string') {
    return 'overrideReason is not text';
  }
  if (r.committedAt !== undefined && typeof r.committedAt !== 'string') {
    return 'committedAt is not an instant';
  }
  // ⚠️ A `Committed` row with no quantity is REFUSED rather than defaulted. The
  // quantity is what the commit committed; a record of the act missing the
  // substance of the act is not a lighter version of the record, it is a claim
  // that something was committed with nothing in it.
  if (r.state === 'Committed' && typeof r.committedQty !== 'number') {
    return 'a committed line records no quantity';
  }
  return null;
}

function readFromStorage(): IntakeTriageReadState {
  let raw: string | null = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return EMPTY_READ;
    raw = window.localStorage.getItem(INTAKE_TRIAGE_KEY);
  } catch {
    // Private browsing / disabled storage. Nothing stored is a legitimate
    // answer; an inaccessible store is not a corrupt one.
    return EMPTY_READ;
  }
  if (raw === null) return EMPTY_READ;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_READ, unreadable: true };
  }
  const env = parsed as { v?: unknown; triage?: unknown } | null;
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.triage)) {
    return { ...EMPTY_READ, unreadable: true };
  }

  const kept: IntakeTriageRecord[] = [];
  const rejected: { lineId: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const [i, row] of (env.triage as readonly unknown[]).entries()) {
    const refusal = refusalFor(row, seen);
    const r = (row ?? {}) as Record<string, unknown>;
    const label = typeof r.lineId === 'string' ? r.lineId : `row ${i}`;
    if (refusal) {
      rejected.push({ lineId: label, reason: refusal });
      continue;
    }
    seen.add(label);
    kept.push(row as IntakeTriageRecord);
  }
  return { records: kept, rejected, unreadable: false };
}

function hydrate(): void {
  if (hydrated) return;
  readState = readFromStorage();
  hydrated = true;
  rows = [...readState.records];
}

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      INTAKE_TRIAGE_KEY,
      JSON.stringify({ v: STORE_VERSION, triage: rows }),
    );
  } catch {
    // Quota / private browsing. The in-session act still stands and is already
    // on the audit trail; what is lost is durability, and losing it silently is
    // better than refusing an act the dispatcher accepted and recorded.
  }
}

export const intakeLineStore = {
  /** Every triage record. */
  all(): readonly IntakeTriageRecord[] {
    hydrate();
    return rows;
  },
  /** One line's triage record, or undefined when nobody has acted on it. */
  get(lineId: string): IntakeTriageRecord | undefined {
    hydrate();
    return rows.find((r) => r.lineId === lineId);
  },
  /**
   * The triage state of a line. **`'Pending'` is the answer for a line with no
   * record** — `Pending` is the born state and a line exists because a producer
   * emitted it, not because somebody acted on it (the flow has no creation
   * edge). `null` means the line id names nothing, which is the answer
   * `readState` owes the dispatcher.
   */
  stateOf(lineId: string): IntakeLineState | null {
    hydrate();
    if (knownLineIds !== null && !knownLineIds.has(lineId)) return null;
    return rows.find((r) => r.lineId === lineId)?.state ?? 'Pending';
  },
  /**
   * Record a triage act. One record per line, replaced in place — the machine
   * is a state machine, not a ledger, and the DR-10 event stream is where the
   * history of the acts lives.
   */
  put(record: IntakeTriageRecord): void {
    hydrate();
    const rest = rows.filter((r) => r.lineId !== record.lineId);
    rows = [...rest, record];
    persist();
  },
  /** What the last read found, including what it refused. */
  readState(): IntakeTriageReadState {
    hydrate();
    return readState;
  },
  /** Forget everything, in memory AND on disk (test isolation). */
  reset(): void {
    rows = [];
    readState = EMPTY_READ;
    hydrated = false;
    knownLineIds = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(INTAKE_TRIAGE_KEY);
      }
    } catch {
      // nothing to do; the in-memory state is already clear
    }
  },
  /** Drop the in-memory copy WITHOUT touching storage — what a reload does. */
  rehydrate(): void {
    rows = [];
    readState = EMPTY_READ;
    hydrated = false;
    hydrate();
  },
};
