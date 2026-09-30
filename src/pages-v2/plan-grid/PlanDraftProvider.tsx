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
// ────────────────────────────────────────────────────────────────────────────

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NumberConvention } from '../../lib/localeNumber';
import type { BucketId } from '../../services/planning/bucket';
import { useIntakeCommit, usePublicationAllocate } from '../../services/query/commandHooks';
import type { PlanRow } from './planGridModel';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyPaste,
  applyPushOutcomes,
  conventionOf,
  dismissRefusal,
  pushEntries,
  reconcile,
  removeEntry,
  setReason,
  type EditContext,
  type EditOrigin,
  type PlanDraft,
  type SeamCell,
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
  remove(seamRef: string): void;
  dismissRefusal(key: string): void;
  push(seamRefs: readonly string[]): Promise<void>;
  reconcile(seam: (seamRef: string) => SeamCell | undefined): void;
}

const PlanDraftContext = createContext<PlanDraftApi | null>(null);

export const PlanDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const convention = conventionOf(i18n.language);
  const commit = useIntakeCommit();
  const allocate = usePublicationAllocate();
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [pushing, setPushing] = useState(false);

  const edit = useCallback<PlanDraftApi['edit']>(
    (row, bucket, raw, origin, ctx) => setDraft((d) => applyEdit(d, row, bucket, raw, origin, convention, ctx)),
    [convention],
  );

  const paste = useCallback<PlanDraftApi['paste']>(
    (rows, horizon, anchor, text, totalOf) => {
      const r = applyPaste(draft, rows, horizon, anchor, text, convention, totalOf);
      setDraft(r.draft);
      return { planned: r.planned, refused: r.refused, outside: r.outside };
    },
    [draft, convention],
  );

  const push = useCallback<PlanDraftApi['push']>(
    async (seamRefs) => {
      const rows = seamRefs.map((ref) => draft.entries.get(ref)).filter((e) => e !== undefined);
      if (rows.length === 0) return;
      setPushing(true);
      try {
        const outcomes = await pushEntries(
          rows,
          (vars) => commit.mutateAsync(vars),
          convention,
          (vars) => allocate.mutateAsync(vars),
        );
        setDraft((d) => applyPushOutcomes(d, outcomes));
      } finally {
        setPushing(false);
      }
    },
    [draft, commit, allocate, convention],
  );

  const api = useMemo<PlanDraftApi>(
    () => ({
      draft,
      convention,
      pushing,
      edit,
      paste,
      setReason: (ref, reason) => setDraft((d) => setReason(d, ref, reason)),
      remove: (ref) => setDraft((d) => removeEntry(d, ref)),
      dismissRefusal: (key) => setDraft((d) => dismissRefusal(d, key)),
      push,
      reconcile: (seam) => setDraft((d) => reconcile(d, seam)),
    }),
    [draft, convention, pushing, edit, paste, push],
  );

  return <PlanDraftContext.Provider value={api}>{children}</PlanDraftContext.Provider>;
};

/** The overlay, or null outside a provider (the grid then stays read-only). */
export const usePlanDraft = (): PlanDraftApi | null => useContext(PlanDraftContext);
