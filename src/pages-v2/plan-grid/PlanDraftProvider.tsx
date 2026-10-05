// ────────────────────────────────────────────────────────────────────────────
// B3 · PlanDraftProvider — where the PLANNED overlay lives for the session
// (C6 §1). React state and nothing else: NOT the query cache (a planned value
// in a cache entry is a planned value inside a seam array), NOT browser storage
// (plan state is never persisted client-side; durable drafts are B9's governed
// `Plan` entity). A reload drops every unpushed change, and the banner says so
// before it happens.
//
// The rules are `planDraft.ts`'s, pure; this component only holds the state
// and hands the push its dispatcher.
//
// PLN-4 · A PUSH AT VOLUME. The push dispatches through `useIntakeCommitBatch`
// (no refresh per row; ONE at the end), pauses between rows so the page paints
// and takes input, and reports "Pushing 23 of 50…" and then the push's summary
// through a SEPARATE context (`usePushStatus`). Separate because progress
// changes on every row, and the overlay's context is read by the grid: a
// per-row change there would re-render the grid fifty times per push.
//
// PLN-5 · UNDO. Every act that changes the overlay — an edit, a paste, a
// Delete, a remove — goes through `update(.., record)`, which keeps the step
// (`diffEntries`) on a stack; `undo()` takes back the newest step that still
// stands (`applyUndo`). The latest draft is held in a ref as well as in state,
// so two acts in one tick each see the other's result.
// ────────────────────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NumberConvention } from '../../lib/localeNumber';
import type { BucketId } from '../../services/planning/bucket';
import { useIntakeCommitBatch } from '../../services/query/commandHooks';
import type { PlanRow } from './planGridModel';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyReasonToRows,
  applyPaste,
  applyPushOutcomes,
  conventionOf,
  applyUndo,
  diffEntries,
  dismissRefusal,
  pushEntries,
  reconcile,
  removeEntries,
  removeEntry,
  setMagnitudeConfirmed,
  setReason,
  summarizePush,
  type EditContext,
  type EditOrigin,
  type PlanDraft,
  type PushProgress,
  type PushSummary,
  type SeamCell,
  type UndoStep,
} from './planDraft';

export interface PlanDraftApi {
  readonly draft: PlanDraft;
  readonly convention: NumberConvention;
  readonly pushing: boolean;
  /** B4b · `ctx` carries the rows and SOMO's totals an allocation edit is measured against. */
  edit(row: PlanRow, bucket: BucketId, raw: string, origin: EditOrigin, ctx?: EditContext): void;
  paste(
    rows: readonly PlanRow[],
    horizon: readonly BucketId[],
    anchor: { row: number; col: number },
    text: string,
    totalOf?: EditContext['totalOf'],
  ): { planned: number; refused: number; outside: number };
  setReason(seamRef: string, reason: string): void;
  /** PLN-4 · one reason onto each selected row that owes one; returns how many took it. */
  applyReason(seamRefs: readonly string[], reason: string): number;
  /** R2 · confirm (or withdraw) a value the magnitude gate holds. */
  confirmMagnitude(seamRef: string, confirmed: boolean): void;
  remove(seamRef: string): void;
  /** PLN-5 · Delete over a selection: removes the PLANNED changes among them; returns how many. */
  removeMany(seamRefs: readonly string[]): number;
  /** PLN-5 · Ctrl+Z: takes back the newest overlay change that still stands; returns how many rows. */
  undo(): number;
  dismissRefusal(key: string): void;
  push(seamRefs: readonly string[]): Promise<void>;
  reconcile(seam: (seamRef: string) => SeamCell | undefined): void;
}

const PlanDraftContext = createContext<PlanDraftApi | null>(null);

/** PLN-4 · where a push stands, and what the last one did. */
export interface PushStatus {
  /** Present while a push runs — "Pushing 23 of 50…". */
  readonly progress: PushProgress | null;
  /** The last finished push — "N committed, M refused" with the reasons. */
  readonly last: PushSummary | null;
  dismissLast(): void;
}
const PushStatusContext = createContext<PushStatus | null>(null);

/**
 * PLN-4 · a pause that lets the browser paint and handle input between two
 * rows of a push. A macrotask, not a microtask: an awaited promise that resolves
 * at once never gives the browser a frame, which is how 50 rows froze the page.
 */
const nextTask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export const PlanDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const convention = conventionOf(i18n.language);
  const batch = useIntakeCommitBatch();
  const batchRef = useRef(batch);
  batchRef.current = batch;
  const [draft, setDraftState] = useState<PlanDraft>(EMPTY_DRAFT);
  const draftRef = useRef<PlanDraft>(EMPTY_DRAFT);
  const undoStack = useRef<UndoStep[]>([]);
  /** The one way the overlay changes; `record` keeps the act on the undo stack. */
  const update = useCallback((fn: (d: PlanDraft) => PlanDraft, record = false): PlanDraft => {
    const before = draftRef.current;
    const next = fn(before);
    if (next === before) return before;
    if (record) {
      const step = diffEntries(before, next);
      if (step) undoStack.current.push(step);
    }
    draftRef.current = next;
    setDraftState(next);
    return next;
  }, []);
  const setDraft = (fn: (d: PlanDraft) => PlanDraft) => update(fn);
  const [pushing, setPushing] = useState(false);
  const [progress, setProgress] = useState<PushProgress | null>(null);
  const [last, setLast] = useState<PushSummary | null>(null);

  const edit = useCallback<PlanDraftApi['edit']>(
    (row, bucket, raw, origin, ctx) => void update((d) => applyEdit(d, row, bucket, raw, origin, convention, ctx), true),
    [convention, update],
  );

  const paste = useCallback<PlanDraftApi['paste']>(
    (rows, horizon, anchor, text, totalOf) => {
      const r = applyPaste(draftRef.current, rows, horizon, anchor, text, convention, totalOf);
      update(() => r.draft, true);
      return { planned: r.planned, refused: r.refused, outside: r.outside };
    },
    [convention, update],
  );

  const push = useCallback<PlanDraftApi['push']>(
    async (seamRefs) => {
      const rows = seamRefs.map((ref) => draft.entries.get(ref)).filter((e) => e !== undefined);
      if (rows.length === 0) return;
      setPushing(true);
      setLast(null);
      setProgress({ done: 0, total: rows.length });
      const b = batchRef.current;
      try {
        const outcomes = await pushEntries(rows, b.commit, convention, b.allocate, {
          onProgress: setProgress,
          yieldBetween: nextTask,
        });
        setDraft((d) => applyPushOutcomes(d, outcomes));
        setLast(summarizePush(outcomes));
        // ⚠️ ONE refresh, after the last row — never one per row (PLN-4).
        const went = (alloc: boolean) =>
          outcomes.some((o) => o.kind === 'dispatched' && (draft.entries.get(o.seamRef)?.measureId === 'allocation') === alloc);
        b.refresh({ intake: went(false), allocate: went(true) });
      } finally {
        setProgress(null);
        setPushing(false);
      }
    },
    [draft, convention],
  );

  const api = useMemo<PlanDraftApi>(
    () => ({
      draft,
      convention,
      pushing,
      edit,
      paste,
      setReason: (ref, reason) => setDraft((d) => setReason(d, ref, reason)),
      applyReason: (refs, reason) => {
        const r = applyReasonToRows(draftRef.current, refs, reason);
        update(() => r.draft);
        return r.applied;
      },
      confirmMagnitude: (ref, confirmed) => setDraft((d) => setMagnitudeConfirmed(d, ref, confirmed)),
      remove: (ref) => void update((d) => removeEntry(d, ref), true),
      removeMany: (refs) => {
        const r = removeEntries(draftRef.current, refs);
        update(() => r.draft, true);
        return r.removed;
      },
      undo: () => {
        // The newest step that still stands; a step wholly past undoing is dropped.
        while (undoStack.current.length > 0) {
          const step = undoStack.current.pop()!;
          const r = applyUndo(draftRef.current, step);
          if (r.restored > 0) {
            update(() => r.draft);
            return r.restored;
          }
        }
        return 0;
      },
      dismissRefusal: (key) => setDraft((d) => dismissRefusal(d, key)),
      push,
      reconcile: (seam) => setDraft((d) => reconcile(d, seam)),
    }),
    [draft, convention, pushing, edit, paste, push, update],
  );

  const status = useMemo<PushStatus>(() => ({ progress, last, dismissLast: () => setLast(null) }), [progress, last]);

  return (
    <PlanDraftContext.Provider value={api}>
      <PushStatusContext.Provider value={status}>{children}</PushStatusContext.Provider>
    </PlanDraftContext.Provider>
  );
};

/** PLN-4 · the push's progress and its last summary, or null outside a provider. */
export const usePushStatus = (): PushStatus | null => useContext(PushStatusContext);

/** The overlay, or null outside a provider (the grid then stays read-only). */
export const usePlanDraft = (): PlanDraftApi | null => useContext(PlanDraftContext);
