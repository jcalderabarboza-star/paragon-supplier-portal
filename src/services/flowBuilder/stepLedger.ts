// ────────────────────────────────────────────────────────────────────────────
// FB-4 · THE STEP LEDGER — one row per act on an added step. Append-only.
//
// IN MEMORY, like every document in the fixture: a completion is lost on reload
// with the document it belongs to (Design 6 v2 §9). The versions themselves are
// kept across reloads; the record of who met their steps is durable only once a
// backend exists.
//
// THE ONLY WRITER IS THE `processStep` COMMAND TARGET, plus `markUsed`, which
// the dispatcher calls through the overlay when the act behind the steps
// succeeds. A row is never edited otherwise and never removed.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';

export interface StepRow {
  readonly seq: number;
  /** The process, the document and the step: what was commanded. */
  readonly entity: string;
  readonly docId: string;
  readonly stepId: string;
  /** The version that defined the step when it was taken. */
  readonly versionId: string;
  readonly versionLabel: string;
  readonly decision: 'completed' | 'declined';
  readonly by: ActorAttribution;
  readonly at: string;
  /** Why it was declined; empty on a completion. */
  readonly reason: string;
  /** What a data-capture step recorded. */
  readonly values: Readonly<Record<string, unknown>>;
  /** A check that stood aside for a Super Admin, with the reason they gave. */
  readonly bypass?: { readonly rules: readonly string[]; readonly reason: string };
  /**
   * The act behind the step has been taken since, so this completion is spent:
   * a document that comes round to the same act meets the step again.
   */
  readonly used: boolean;
}

let rows: StepRow[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const publish = (next: StepRow[]): void => {
  rows = next;
  for (const l of listeners) l();
};

export const stepLedger = {
  all(): readonly StepRow[] {
    return rows;
  },
  forDocument(entity: string, docId: string): readonly StepRow[] {
    return rows.filter((r) => r.entity === entity && r.docId === docId);
  },
  append(row: Omit<StepRow, 'seq' | 'at' | 'used'>): StepRow {
    const made: StepRow = { ...row, seq: ++seq, at: DECLARED_PRESENT_INSTANT, used: false };
    publish([...rows, made]);
    return made;
  },
  /** Spend every unspent row of these steps on this document. */
  markUsed(entity: string, docId: string, stepIds: readonly string[]): void {
    if (!rows.some((r) => !r.used && r.entity === entity && r.docId === docId && stepIds.includes(r.stepId))) return;
    publish(
      rows.map((r) =>
        !r.used && r.entity === entity && r.docId === docId && stepIds.includes(r.stepId) ? { ...r, used: true } : r,
      ),
    );
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Test isolation. */
  reset(): void {
    seq = 0;
    publish([]);
  },
};
