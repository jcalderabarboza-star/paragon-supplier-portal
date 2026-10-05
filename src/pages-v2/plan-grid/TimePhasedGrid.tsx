// ────────────────────────────────────────────────────────────────────────────
// B2 · TimePhasedGrid — the read-only planning grid (Design 1 §4.3, §7 core).
//
// Engine: react-datasheet-grid, the one already installed (FORK-G1; nothing is
// added). It RENDERS the rows `planGridModel` builds; sort, filter and the
// exception order are the model's, so a test reaches them without a browser.
//
// ⚠️ KEY COLUMNS STAY VISIBLE BY THE ENGINE'S OWN STICKY COLUMNS, NOT BY CSS.
// DSG has no left pinning, but its GUTTER column is `position: sticky` on the
// left and `stickyRightColumn` is sticky on the right (`.dsg-cell-gutter` /
// `.dsg-cell-sticky-right` in the engine's stylesheet). The gutter carries the
// material code, description, unit and measure; the sticky right column carries
// the horizon totals. Both stay in view while the buckets scroll.
//
// ⚠️ WHAT THIS ENGINE CANNOT DO IS NOT FAKED HERE. Row grouping, range fill, set
// filters, the status bar, Excel export, the column chooser and saved layouts
// are SE-14, specified in Design 1 §7; none is approximated in page code.
//
// ── B3 · GOVERNED EDITS (Design 1 §5.1–§5.2, §5.4) ──────────────────────────
// An `acceptedQty` cell on a material row is editable because the REGISTRY says
// so (`isEditableCell` reads `measureOf(..).editable`); every other cell stays
// read-only. An edit or a paste never touches a row: it goes to the
// `PlanDraftProvider` overlay, keyed by the cell's seam row, and the cell
// renders `seam + overlay` with the PLANNED marker (and EXTERNAL for a paste).
// The engine's own paste is intercepted before it runs, so a paste over a
// read-only column is judged — and refused — cell by cell rather than silently
// skipped. `setRowData` is never called: nothing typed reaches the seam rows.
//
// ── B4b · ALLOCATION AND PUBLISH (Design 1 §5.3, Design 2 §2.3) ─────────────
// A supplier's `allocation` cell is editable where the seam anchored it to the
// OPEN DRAFT publication (`editAnchor`); its edit is measured against SOMO's
// total at the cell and pushes as `t_publication_allocate`. The publication
// panel (plain DOM) sits above the grid on the plan views.
//
// ── PLN-5 · ERGONOMICS (R-PLN P1, the last Planning batch) ─────────────────
//  · THE GRID IS ABOVE THE FOLD AND IS THE ONE SCROLLER. The chrome above it is
//    summarised (`CompactNotice`, the publication panel folds to one line), and
//    the grid's height is FITTED to what is left of the viewport (`useFitHeight`)
//    so the page does not scroll to work the plan — the rows scroll inside the
//    grid, one scrollbar rather than two.
//  · KEYBOARD TRUTH (`keyRef`, capture phase, before the engine's own handler):
//    an editor opened by typing or Enter is in ENTER mode — ←/→ commit it and
//    move, exactly as a spreadsheet does, so "Enter, →, type" can never write
//    into the cell just left; F2 or a click opens CARET mode, where ←/→ move the
//    caret. Typing into a read-only or committed cell is REFUSED WITH ITS REASON
//    at the cell and on the key line, never swallowed. Delete and Ctrl+Z act on
//    PLANNED changes only (`removeMany` / `undo`); a seam figure is never blanked.
//    Ctrl+C copies what the cells DISPLAY (the planned value where one is
//    planned) as TSV, through the engine's own copy (`copyValue`).
//  · The material label is never truncated: the code is stated ONCE, on the
//    block's first row, and the measure is a sub-label (`PlanRowLabel`).
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Sigma } from 'lucide-react';
import { DataSheetGrid, type CellProps, type Column, type DataSheetGridRef } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './planGrid.css';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import LivenessPill from '../../components/ui-v2/LivenessPill';
import CompactNotice from './CompactNotice';
import { formatNumber } from '../../lib/format';
import { usePlanningFacts } from '../../services/query/planningHooks';
import { useConsolidationRows, usePublicationWorkspace } from '../../services/query/sdcBuyerHooks';
import { totalKey } from '../../services/sdc';
import { VIEWS, viewGrainAndHorizon, type ViewId } from '../../services/planning/views';
import type { BucketGrain } from '../../services/planning/bucket';
import { COLUMNS, bucketColumns, bucketColumnId } from '../../services/planning/columns';
import { measureOf, type MeasureId } from '../../services/planning/measures';
import { somoHorizon } from '../../services/planning/facts';
import { planningSupplierName } from '../../services/planning/somoFixture';
import { visibleMeasures } from './visibleMeasures';
import { usePlanDraft } from './PlanDraftProvider';
import { PlannedChangesBar, PlannedChangesDetails, cellRefusalText } from './PlannedChangesPanel';
import PublicationPanel, { draftOfGrain } from './PublicationPanel';
import { EMPTY_DRAFT, applyEdit, cellKey, magnitudeFlag, routePaste, type CellRefusal, type EditContext, type PlanDraftEntry } from './planDraft';
import { useFitHeight } from './useFitHeight';
import { useGridRoles } from './useGridRoles';
import { copyText, decideKey, type EditMode } from './gridKeys';
import {
  DEFAULT_PLAN_FILTER,
  DEFAULT_PLAN_SORT,
  applyPlanView,
  blocksOfViewType,
  buildPlanBlocks,
  flattenPlanRows,
  isEditableCell,
  exceptionReasons,
  isPlanException,
  planCellText,
  staleKey,
  type PlanFilter,
  type PlanRow,
  type PlanSort,
  type PlanSortColumn,
  PLAN_SORT_COLUMNS,
} from './planGridModel';

const ROW_H = 30;
// PLN-2 · fits the longest planning-master supplier name on one line (measured in the browser).
// PLN-5 · and the longest material label, now that the label has the gutter's width to itself.
const GUTTER_W = 420;
/** PLN-5 · the grid's height when nothing can be measured (jsdom), and its floor in a short window. */
const GRID_H = 560;
const GRID_MIN_H = 300;
/** PLN-5 · the horizon totals: four figures and the exception reason, each labelled. */
const AGG_W = 400;

// PLN-2 · the supplier's NAME, from the planning supplier master — never its id.
const supplierLabel = planningSupplierName;

/**
 * PLN-5 · THE Σ ON A MODELED FIGURE — a small glyph BEFORE the figure in a slot
 * of its own, so it can never overlap the number. The word ("Modeled") is the
 * glyph's accessible name and its title explains it. Exported for the row
 * label, which marks a modeled MEASURE even where every cell is a dash.
 */
export const ModeledMark: React.FC = () => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex w-3 shrink-0 justify-center text-text-tertiary" title={t('planGrid.tp.modeledTitle')} data-testid="tp-modeled">
      <Sigma size={10} aria-hidden="true" />
      <span className="sr-only">{t('planGrid.tp.modeled')}</span>
    </span>
  );
};

/**
 * ONE bucket cell. Exported so the null rule and the marker rule are testable
 * without the virtualised engine (which lays out no rows under jsdom).
 *
 * ⚠️ PLN-5 · REVERSED BY RULING: A DERIVED CELL CARRIES ITS Σ ONLY ON A FIGURE.
 * It carried a "MODELED" pill even when empty, which put the word on every dash
 * and zero of a shortfall row and over the figures beside it. The ROW now says
 * the measure is modeled (`PlanRowLabel`), so a dash or a zero there is still
 * read as computed; the cell marks only a figure the model actually produced.
 */
export const PlanBucketCell: React.FC<{
  value: number | null | undefined;
  derived: boolean;
  /** B3 · the overlay entry for this cell — rendered INSTEAD of the seam value, marked. */
  planned?: PlanDraftEntry;
  /** B3 · the last edit of this cell that was refused, with its reason. */
  refusal?: CellRefusal;
  /** B3 · the seam holds this figure as COMMITTED (an editable cell only). */
  committed?: boolean;
  /** PLN-3 · the cell's intake line was DISMISSED in the intake view. */
  dismissed?: boolean;
  /** PLN-5 · a SHORTFALL figure: above zero it is the variance, coloured as such. */
  shortfall?: boolean;
}> = ({ value, derived, planned, refusal, committed, dismissed, shortfall }) => {
  const { t } = useTranslation();
  // ⚠️ THE OVERLAY IS SHOWN, NEVER MERGED: the seam value stays in the row and
  // the planned one is read from the draft by seamRef, marked as PLANNED.
  const text = planCellText(planned ? planned.value : value, formatNumber);
  const refusalText = refusal ? cellRefusalText(t, refusal) : '';
  // R2 · every edited cell carries its READING — what was entered and what it
  // was read as — and a value the magnitude gate holds is marked at the cell.
  const reading = planned
    ? t('planGrid.edit.reading', { raw: planned.raw, value: formatNumber(planned.value), uom: planned.uom })
    : '';
  const flagged = planned ? magnitudeFlag(planned) && planned.magnitudeConfirmed !== true : false;
  const shown = planned ? planned.value : value;
  const modeled = derived && typeof shown === 'number' && shown !== 0;
  const short = shortfall === true && typeof shown === 'number' && shown > 0;
  return (
    <div
      className={`flex w-full items-center justify-end gap-1 px-2 ${planned ? 'bg-info-soft' : ''} ${refusal ? 'ring-1 ring-inset ring-danger/60' : flagged ? 'ring-1 ring-inset ring-warning' : ''}`}
      data-testid="tp-cell"
      data-reading={reading || undefined}
      title={
        refusal
          ? `“${refusal.raw}” — ${refusalText}`
          : committed && !planned
            ? t('planGrid.edit.committedTitle')
            : dismissed && !planned
              ? t('planGrid.edit.dismissedTitle')
              : reading || undefined
      }
    >
      {flagged && (
        <span className="text-[10px] font-semibold text-warning-hover" data-testid="tp-cell-magnitude" aria-label={t('planGrid.edit.push.magnitudeUnconfirmed')}>
          ×?
        </span>
      )}
      {modeled && <ModeledMark />}
      {refusal && (
        <span className="text-[10px] font-semibold text-danger" data-testid="tp-cell-refusal" aria-label={refusalText}>
          !
        </span>
      )}
      {planned && (
        <span
          className="text-[9px] font-semibold uppercase text-info"
          data-testid="tp-cell-planned"
          title={t('planGrid.edit.plannedTitle')}
        >
          {planned.origin === 'PASTE' ? t('planGrid.edit.externalShort') : t('planGrid.edit.plannedShort')}
        </span>
      )}
      {committed && !planned && (
        <span className="text-[9px] font-semibold uppercase text-text-tertiary" title={t('planGrid.plan.committed')}>
          ✓
        </span>
      )}
      {dismissed && !planned && (
        <span
          className="text-[9px] font-semibold uppercase text-text-tertiary"
          data-testid="tp-cell-dismissed"
          title={t('planGrid.edit.dismissedTitle')}
        >
          {t('planGrid.edit.dismissedShort')}
        </span>
      )}
      {text === '—' ? (
        <span className="text-xs text-text-tertiary">{text}</span>
      ) : (
        <Data className={`text-xs ${short ? 'font-semibold !text-danger' : ''}`} data-testid={short ? 'tp-cell-short' : undefined}>
          {text}
        </Data>
      )}
    </div>
  );
};

/** B3 · a read-only cell, which still shows a refused paste aimed at it. */
const ReadOnlyBucketCell: React.FC<{ row: PlanRow; bucket: string; derived: boolean }> = ({ row, bucket, derived }) => {
  const api = usePlanDraft();
  return (
    <PlanBucketCell
      value={row.cells[bucket]}
      derived={derived}
      refusal={api?.draft.refusals.get(cellKey(row.id, bucket))}
      // PLN-1 · a committed cell is read-only now, and still says it is committed.
      committed={row.committedCells?.[bucket]}
      // PLN-3 · and a dismissed one says it was set aside.
      dismissed={row.dismissedCells?.[bucket]}
      // PLN-5 · the shortfall row's figures are the variance.
      shortfall={row.measureId === 'confirmedDeficit'}
    />
  );
};

/**
 * B3 · an EDITABLE cell. While the engine has it in focus it is a text field
 * holding the raw token; when focus leaves, a changed token becomes ONE
 * `GridEditRequest` (origin TYPED) to the overlay — never `setRowData`.
 * Escape abandons the edit.
 */
const EditableBucketCell: React.FC<{
  row: PlanRow;
  bucket: string;
  focus: boolean;
  /** B4b · read at commit time: the rows and SOMO's totals an allocation is measured against. */
  editContext: () => EditContext;
}> = ({ row, bucket, focus, editContext }) => {
  const { t } = useTranslation();
  const api = usePlanDraft();
  const seamRef = row.seamRefs![bucket];
  const planned = api?.draft.entries.get(seamRef);
  const refusal = api?.draft.refusals.get(cellKey(row.id, bucket));
  const initial = planned?.raw ?? (row.cells[bucket] === null || row.cells[bucket] === undefined ? '' : String(row.cells[bucket]));
  const [text, setText] = useState(initial);
  const textRef = useRef(initial);
  const startRef = useRef(initial);
  const cancelled = useRef(false);
  const wasFocused = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (focus && !wasFocused.current) {
      startRef.current = initial;
      textRef.current = initial;
      setText(initial);
      cancelled.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    if (!focus && wasFocused.current && !cancelled.current && textRef.current !== startRef.current) {
      api?.edit(row, bucket, textRef.current, 'TYPED', editContext());
    }
    wasFocused.current = focus;
  }, [focus]);

  if (!focus) {
    return (
      <PlanBucketCell
        value={row.cells[bucket]}
        derived={false}
        planned={planned}
        refusal={refusal}
        committed={row.committedCells?.[bucket]}
      />
    );
  }
  return (
    <input
      ref={inputRef}
      data-testid="tp-cell-input"
      aria-label={
        row.supplierId
          ? t('planGrid.edit.allocationCellLabel', { material: row.materialCode, bucket, supplier: supplierLabel(row.supplierId) })
          : t('planGrid.edit.cellLabel', { material: row.materialCode, bucket })
      }
      inputMode="decimal"
      className="h-full w-full bg-white px-2 text-right font-mono text-xs text-data-navy outline-none"
      value={text}
      onChange={(e) => {
        textRef.current = e.target.value;
        setText(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancelled.current = true;
      }}
    />
  );
};

/**
 * The row's key-column label — exported so it is tested directly (the
 * virtualised body lays out no rows under jsdom; `PlanBucketCell`'s precedent).
 *
 * ⚠️ PLN-5 · THE LABEL IS NEVER TRUNCATED, AND THE CODE IS SAID ONCE. Every row
 * carried the code, the unit and "measure — label" on one `truncate`d line, so a
 * long label ("Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion") lost
 * its end on every row of its block. The block's FIRST row now states the label
 * on a line of its own with the code, unit and measure under it; every other
 * row states only what tells it apart — its measure (and its supplier).
 */
export const PlanRowLabel: React.FC<{ row: PlanRow }> = ({ row }) => {
  const { t } = useTranslation();
  const spec = measureOf(row.measureId);
  const measure = t(spec.labelKey);
  const modeled = spec.derivation === 'derived' ? <ModeledMark /> : null;
  const supplier = row.supplierId ? supplierLabel(row.supplierId) : null;
  if (row.blockHead) {
    return (
      <div className="flex w-full min-w-0 flex-col justify-center px-2 leading-[13px]" data-testid="tp-row-label" data-head="true">
        <span className="whitespace-nowrap text-xs font-medium text-text-primary" data-testid="tp-material-label">
          {row.materialLabel}
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-text-tertiary">
          <Data className="text-[11px] font-semibold">{row.materialCode}</Data>
          <span>· {row.uom} ·</span>
          <span data-testid="tp-measure">{measure}</span>
          {modeled}
          {supplier && <span data-testid="tp-supplier-name">· {supplier}</span>}
        </span>
      </div>
    );
  }
  if (supplier) {
    return (
      <span
        className="flex w-full min-w-0 flex-col justify-center pl-5 pr-2 leading-[13px] text-text-secondary"
        data-testid="tp-supplier-row-label"
        title={t('planGrid.tp.supplierRow', { measure, supplier })}
      >
        <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
          <span data-testid="tp-measure">{measure}</span>
          {modeled}
        </span>
        <span className="whitespace-nowrap text-xs" data-testid="tp-supplier-name">
          {supplier}
        </span>
      </span>
    );
  }
  return (
    <div className="flex w-full min-w-0 items-center gap-1 pl-5 pr-2 text-xs text-text-secondary" data-testid="tp-row-label">
      <span className="whitespace-nowrap" data-testid="tp-measure">{measure}</span>
      {modeled}
    </div>
  );
};

/** PLN-5 · what the last keystroke did, said on the key line (role=status). */
type KeyNote =
  | { readonly kind: 'refused'; readonly refusal: CellRefusal }
  | { readonly kind: 'deleted'; readonly n: number }
  | { readonly kind: 'nothingToDelete' }
  | { readonly kind: 'undone'; readonly n: number }
  | { readonly kind: 'nothingToUndo' }
  | { readonly kind: 'copied'; readonly n: number };

/** PLN-5 · is focus in a text field OUTSIDE the grid (search, a reason box)? Then keys are that field's. */
const typingElsewhere = (wrap: HTMLElement | null): boolean => {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  const field = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable;
  return field && !(wrap?.contains(el) ?? false);
};

const TimePhasedGrid: React.FC<{
  viewId: Extract<ViewId, 'rm-plan' | 'pm-plan' | 'exceptions'>;
  /** PLN-1 · the grain of the plan tab the planner was last in — a `current`-grain view follows it. */
  currentGrain?: BucketGrain;
}> = ({ viewId, currentGrain = 'month' }) => {
  const { t } = useTranslation();
  const view = VIEWS.find((v) => v.viewId === viewId)!;
  const { grain, horizonLength, materialType } = viewGrainAndHorizon(view, currentGrain);
  const horizon = useMemo(() => somoHorizon(grain).slice(0, horizonLength), [grain, horizonLength]);
  const measures = useMemo(() => visibleMeasures(view.measuresShown), [view.measuresShown]);

  const factsQuery = usePlanningFacts(horizon, measures);
  const draftApi = usePlanDraft();
  const gridRef = useRef<DataSheetGridRef>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ r0: number; r1: number; c0: number; c1: number } | null>(null);
  const [pasteNote, setPasteNote] = useState<{ planned: number; refused: number; outside: number } | null>(null);
  const [keyNote, setKeyNote] = useState<KeyNote | null>(null);
  /** PLN-5 · how the open editor was opened: typing/Enter → ENTER mode (←/→ move), F2/click → CARET mode. */
  const editModeRef = useRef<EditMode>('enter');
  const viewRef = useRef<HTMLDivElement>(null);
  const hasDraft = draftApi !== null;
  const draftRef = useRef(draftApi);
  draftRef.current = draftApi;
  const consolidation = useConsolidationRows();
  // B4b · the open draft of this grain — SOMO's totals an allocation is measured against.
  const workspace = usePublicationWorkspace();
  const openDraft = useMemo(() => draftOfGrain(workspace.data?.records ?? [], grain), [workspace.data, grain]);
  const lockedExceptions = viewId === 'exceptions';
  // The sort choices, labelled from the COLUMN REGISTRY (B1) — one source for
  // the words, so a sort option can never read differently from its column.
  const sortColumns = useMemo(
    () =>
      PLAN_SORT_COLUMNS.map((id) => ({
        id,
        labelKey: COLUMNS.find((c) => c.id === id)?.labelKey ?? id,
      })),
    [],
  );
  const [filter, setFilter] = useState<PlanFilter>({ ...DEFAULT_PLAN_FILTER, exceptionsOnly: lockedExceptions });
  // PLN-4 · the planned-changes list, below the grid — open until the planner folds it.
  const [changesOpen, setChangesOpen] = useState(true);
  const changesRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<PlanSort>(DEFAULT_PLAN_SORT);
  // PLN-1 · a paste note describes the rows it was made against; a new filter
  // or order is a different set of rows, so the note goes — and so does a key note.
  useEffect(() => {
    setPasteNote(null);
    setKeyNote(null);
  }, [filter, sort]);
  // PLN-5 · the publication panel folds to one line; open, it is the panel it always was.
  const [publicationOpen, setPublicationOpen] = useState(false);

  // PLN-1 · THE HINT NAMES WHAT IS EDITABLE BY ASKING THE REGISTRY. It said
  // "accepted quantity is the one figure you can change" after B4b made
  // allocation editable too — a count in prose, gone false with no file edited.
  const editableLabels = useMemo(
    () =>
      measures
        .filter((m) => measureOf(m).editable !== false)
        .map((m) => t(measureOf(m).labelKey))
        .join(' · '),
    [measures, t],
  );

  const staleKeys = useMemo(
    () =>
      new Set(
        (consolidation.data ?? [])
          .filter((r) => r.state.kind === 'stale-against-current')
          .map((r) => staleKey(r.line.supplierId, r.line.materialCode, r.line.periodBucket)),
      ),
    [consolidation.data],
  );

  // ⚠️ PLN-2 · THE VIEW DECIDES THE MATERIAL TYPE, NOT THE PLANNER. Raw
  // materials are planned monthly and packaging weekly (`PLANNING_GRAIN_OF_TYPE`),
  // so each plan view lists exactly one type; a material reaching a view of the
  // other grain through a dated source (an open PO, an incoming shipment) is not
  // listed there. A "Material type" select used to offer all types in both
  // views, which is how one packaging requirement was planned in a month AND in a
  // week of it.
  const blocks = useMemo(
    () =>
      blocksOfViewType(buildPlanBlocks(factsQuery.data?.items ?? [], horizon, measures, staleKeys), materialType),
    [factsQuery.data, horizon, measures, staleKeys, materialType],
  );
  const visible = useMemo(() => applyPlanView(blocks, filter, sort), [blocks, filter, sort]);
  const rows = useMemo(() => flattenPlanRows(visible) as PlanRow[], [visible]);
  const blockOf = useMemo(() => new Map(visible.map((b) => [b.materialCode, b])), [visible]);
  const exceptionCount = useMemo(() => blocks.filter((b) => isPlanException(b.exceptions)).length, [blocks]);

  // B3 · what the SEAM holds per editable cell, for C6 §3's clear-when-agreed.
  // B4b · an allocation anchor's seam is the DRAFT: whatever it holds, it holds
  // as recorded (the allocate act landed), and "no line" is a share of zero —
  // the value a pushed zero is compared with.
  const seamIndex = useMemo(() => {
    const m = new Map<string, { value: number | null; committed: boolean }>();
    for (const f of factsQuery.data?.items ?? []) {
      if (measureOf(f.measureId).editable === false) continue;
      if (f.supplierId === null) m.set(f.sourceRef, { value: f.value, committed: f.provenance.planState === 'committed' });
      else if (f.editAnchor) m.set(f.editAnchor, { value: f.value ?? 0, committed: true });
    }
    return m;
  }, [factsQuery.data]);
  const totalOf = useMemo<EditContext['totalOf']>(
    () => (code, bucket) => openDraft?.totals[totalKey(code, bucket)],
    [openDraft],
  );
  const editContextRef = useRef<EditContext>({ rows: [], totalOf });
  editContextRef.current = { rows, totalOf };
  const reconcileRef = useRef(draftApi?.reconcile);
  reconcileRef.current = draftApi?.reconcile;
  useEffect(() => {
    reconcileRef.current?.((ref) => seamIndex.get(ref));
  }, [seamIndex]);

  // B3 · the grid selection, as seam rows — what "Push selection" acts on.
  const refsIn = (sel: typeof selection): string[] => {
    if (!sel) return [];
    const out: string[] = [];
    for (let r = sel.r0; r <= sel.r1; r++) {
      for (let c = sel.c0; c <= sel.c1; c++) {
        const ref = rows[r]?.seamRefs?.[horizon[c]];
        if (ref) out.push(ref);
      }
    }
    return out;
  };
  const selectedRefs = useMemo(() => refsIn(selection), [selection, rows, horizon]);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // B3 · the paste, judged cell by cell. Intercepted in the CAPTURE phase so
  // the engine's own handler (which would skip a read-only cell in silence and
  // write the rest into the rows) never runs. A paste while a cell's text field
  // has focus is left to the field.
  const pasteRef = useRef<(e: ClipboardEvent) => void>(() => {});
  pasteRef.current = (e: ClipboardEvent) => {
    const active = gridRef.current?.activeCell;
    if (!draftApi || !active || !wrapRef.current) return;
    const focused = document.activeElement;
    const editor = focused instanceof HTMLInputElement && wrapRef.current.contains(focused) ? focused : null;
    const text = e.clipboardData?.getData('text/plain');
    if (text === undefined || text === null) return;
    // ⚠️ PLN-1 · EVERY PASTE AIMED AT THE GRID RESETS THE NOTE FIRST. It used to
    // be written only by a grid paste and never cleared, so a paste the grid
    // never received kept the last one's "10 planned · 0 refused".
    setPasteNote(null);
    if (routePaste(text, editor !== null) === 'field') return;
    const col = horizon.indexOf((active.colId ?? '').replace(/^bucket:/, ''));
    if (col < 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // A multi-cell paste into an OPEN editor: the editor is abandoned unchanged
    // (Escape is the engine's and the cell's own "leave without committing")
    // and the paste is the grid's, anchored at the cell being edited.
    if (editor) editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    setPasteNote(draftApi.paste(rows, horizon, { row: active.row, col }, text, totalOf));
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => pasteRef.current(e);
    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, []);

  // ── PLN-5 · KEYBOARD TRUTH ────────────────────────────────────────────────
  // Capture phase, so it decides before the engine's own document handler.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const api = draftRef.current;
    const wrap = wrapRef.current;
    if (!api || !wrap || e.isComposing || typingElsewhere(wrap)) return;
    const focused = document.activeElement;
    const editorOpen = focused instanceof HTMLInputElement && wrap.contains(focused);
    const active = gridRef.current?.activeCell;
    const col = active ? horizon.indexOf((active.colId ?? '').replace(/^bucket:/, '')) : -1;
    const row = active ? rows[active.row] : undefined;
    const bucket = col >= 0 ? horizon[col] : undefined;
    const action = decideKey(
      { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, shift: e.shiftKey },
      { editorOpen, mode: editModeRef.current, editable: row !== undefined && bucket !== undefined && isEditableCell(row, bucket) },
    );
    if (action.kind === 'pass') return;
    if (action.kind === 'mode') {
      editModeRef.current = action.mode;
      return; // the engine opens the editor; the key lands in it
    }
    if (action.kind === 'undo') {
      // Ctrl+Z needs no active cell: it is about the overlay, not about a cell.
      e.preventDefault();
      e.stopImmediatePropagation();
      const n = api.undo();
      setKeyNote(n > 0 ? { kind: 'undone', n } : { kind: 'nothingToUndo' });
      return;
    }
    if (!active || !row || bucket === undefined) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (action.kind === 'commitMove') {
      const next = Math.max(0, Math.min(horizon.length - 1, col + action.dir));
      // Leaving the cell is what commits it (the cell's own focus-out); the engine then sits on the next one.
      gridRef.current?.setActiveCell({ col: `bucket:${horizon[next]}`, row: active.row });
      return;
    }
    if (action.kind === 'delete') {
      const sel = selectionRef.current ?? { r0: active.row, r1: active.row, c0: col, c1: col };
      const n = api.removeMany(refsIn(sel));
      setKeyNote(n > 0 ? { kind: 'deleted', n } : { kind: 'nothingToDelete' });
      return;
    }
    // refuse — a read-only or committed cell. The reason is the overlay's own
    // rule (`applyEdit`), asked directly: the provider's state lands on the next
    // render, and the line must not wait for it.
    editModeRef.current = 'enter';
    const refusal = applyEdit(EMPTY_DRAFT, row, bucket, e.key, 'TYPED', api.convention, editContextRef.current).refusals.get(
      cellKey(row.id, bucket),
    );
    api.edit(row, bucket, e.key, 'TYPED', editContextRef.current);
    if (refusal) setKeyNote({ kind: 'refused', refusal });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);
  // A click opens an editor in CARET mode — the planner pointed into the text.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onDown = () => {
      editModeRef.current = 'caret';
    };
    wrap.addEventListener('mousedown', onDown, true);
    return () => wrap.removeEventListener('mousedown', onDown, true);
  });
  // Ctrl+C says what it copied (the engine's own copy writes the TSV — `copyValue`).
  useEffect(() => {
    const onCopy = () => {
      const active = gridRef.current?.activeCell;
      if (!active || typingElsewhere(wrapRef.current)) return;
      const focused = document.activeElement;
      if (focused instanceof HTMLInputElement && wrapRef.current?.contains(focused)) return;
      const sel = selectionRef.current;
      const n = sel ? (sel.r1 - sel.r0 + 1) * (sel.c1 - sel.c0 + 1) : 1;
      setKeyNote({ kind: 'copied', n });
    };
    document.addEventListener('copy', onCopy, true);
    return () => document.removeEventListener('copy', onCopy, true);
  }, []);

  // The bucket columns are GENERATED (B1) — once per measure, so each cell reads
  // the governance of ITS measure's column (`b:<measure>:<bucket>`).
  const generated = useMemo(() => {
    const byId = new Map<string, { derived: boolean }>();
    for (const m of measures) {
      const out = bucketColumns(horizon, m);
      if (!out.ok) return { ok: false as const, reason: out.reason };
      for (const c of out.columns) byId.set(c.id, { derived: c.derivation === 'derived' });
    }
    return { ok: true as const, byId };
  }, [horizon, measures]);

  const columns: Column<PlanRow>[] = useMemo(
    () =>
      horizon.map((bucket) => ({
        id: `bucket:${bucket}`,
        title: <Data className="text-xs">{bucket}</Data>,
        // THE REGISTRY DECIDES: only a cell `isEditableCell` admits can enter
        // edit mode, and only while a draft exists to receive the edit.
        disabled: ({ rowData }: { rowData: PlanRow }) => !hasDraft || !isEditableCell(rowData, bucket),
        minWidth: 112,
        // PLN-5 · Ctrl+C copies what the cell DISPLAYS: the planned value where
        // one is planned, else the seam's, formatted as shown; a dash is no
        // value, so it copies as an empty cell rather than as "—".
        copyValue: ({ rowData }: { rowData: PlanRow }) => copyText(rowData, bucket, draftRef.current?.draft.entries),
        component: ({ rowData, focus }: CellProps<PlanRow>) =>
          hasDraft && isEditableCell(rowData, bucket) ? (
            <EditableBucketCell row={rowData} bucket={bucket} focus={focus} editContext={() => editContextRef.current} />
          ) : (
            <ReadOnlyBucketCell
              row={rowData}
              bucket={bucket}
              derived={
                generated.ok
                  ? (generated.byId.get(bucketColumnId(rowData.measureId as MeasureId, bucket))?.derived ?? false)
                  : rowData.derived
              }
            />
          ),
      })),
    // ⚠️ PLN-5 · NOT `draftApi`: it is a new object on every overlay change, and a
    // new column set re-mounts every cell — an editor open at that moment lost
    // what was typed into it. The cells read the overlay from its context.
    [horizon, generated, hasDraft],
  );

  const gutter = useMemo(
    () => ({
      title: <span className="px-2 text-xs">{t('planGrid.tp.keyColumn')}</span>,
      // ⚠️ `basis`, NOT `minWidth`: the engine sizes its sticky columns from
      // `basis` and defaults it to 40 px (useColumns.js), so a `minWidth` alone
      // rendered a 40-px gutter whose text ran over the buckets — found in
      // browser QA, invisible to jsdom.
      //
      // ⚠️ PLN-2 · A SUPPLIER ROW STATES ITS SUPPLIER IN FULL. The label was one
      // `truncate`d line, so "Allocation · Sample Personal Care Emulsifiers GmbH"
      // ended in an ellipsis and the supplier — the one word that tells two
      // allocation rows apart — was the part cut off. The measure and the name
      // now sit on two lines of their own, and the gutter is wide enough for the
      // longest name the planning supplier master holds on one line.
      basis: GUTTER_W,
      minWidth: GUTTER_W,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => <PlanRowLabel row={rowData} />,
    }),
    [t],
  );

  // PLN-5 · the horizon totals, each sub-column LABELLED in the header (they were
  // four bare figures under one run-on title), and the exception's REASON beside
  // them — short, awaiting or stale — so an exception row says why it is one.
  const aggregates = useMemo(
    () => ({
      title: (
        <div className="grid w-full grid-cols-[1fr_1fr_1fr_1fr_76px] gap-1 px-2 text-right text-[10px] leading-[12px]" data-testid="tp-agg-header" title={t('planGrid.tp.aggregates')}>
          <span>{t('planGrid.tp.agg.demand')}</span>
          <span>{t('planGrid.tp.agg.confirmed')}</span>
          <span className="inline-flex items-center justify-end gap-0.5">
            <ModeledMark />
            {t('planGrid.tp.agg.shortfall')}
          </span>
          <span>{t('planGrid.tp.agg.firstShort')}</span>
          <span className="text-left">{t('planGrid.tp.agg.exception')}</span>
        </div>
      ),
      basis: AGG_W,
      minWidth: AGG_W,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => {
        const b = rowData.blockHead ? blockOf.get(rowData.materialCode) : undefined;
        if (!b) return <span />;
        const reasons = exceptionReasons(b.exceptions);
        return (
          <div className="grid w-full grid-cols-[1fr_1fr_1fr_1fr_76px] items-center gap-1 px-2 text-right text-xs" data-testid="tp-aggregates">
            <Data>{planCellText(b.agg.demand, formatNumber)}</Data>
            <Data>{planCellText(b.agg.confirmed, formatNumber)}</Data>
            <Data className={(b.agg.deficit ?? 0) > 0 ? 'font-semibold !text-danger' : ''}>
              {planCellText(b.agg.deficit, formatNumber)}
            </Data>
            <Data>{b.agg.firstShortBucket ?? '—'}</Data>
            <span className="truncate text-left text-[11px]" data-testid="tp-exception-reason" title={reasons.map((r) => t(`planGrid.tp.exc.${r}Title`)).join(' · ') || undefined}>
              {reasons.length === 0 ? (
                <span className="text-text-tertiary">—</span>
              ) : (
                reasons.map((r) => (
                  <span key={r} className={`mr-1 ${r === 'short' ? 'font-semibold text-danger' : 'text-warning-hover'}`}>
                    {t(`planGrid.tp.exc.${r}`)}
                  </span>
                ))
              )}
            </span>
          </div>
        );
      },
    }),
    [t, blockOf],
  );

  // PLN-5 · the grid fills what the viewport has left below the chrome, so the
  // page does not scroll to work the plan: the rows scroll inside the grid.
  const gridH = useFitHeight(wrapRef, { fallback: GRID_H, min: GRID_MIN_H, reserveSelector: '[data-testid=plan-draft-bar]', scope: viewRef });
  useGridRoles(wrapRef, { label: t(`planGrid.view.${viewId}`), rowCount: rows.length });

  const keyNoteText = (n: KeyNote): string => {
    switch (n.kind) {
      case 'refused':
        return t('planGrid.edit.key.refused', { raw: n.refusal.raw, reason: cellRefusalText(t, n.refusal) });
      case 'deleted':
        return t('planGrid.edit.key.deleted', { count: n.n, n: formatNumber(n.n) });
      case 'nothingToDelete':
        return t('planGrid.edit.key.nothingToDelete');
      case 'undone':
        return t('planGrid.edit.key.undone', { count: n.n, n: formatNumber(n.n) });
      case 'nothingToUndo':
        return t('planGrid.edit.key.nothingToUndo');
      case 'copied':
        return t('planGrid.edit.key.copied', { count: n.n, n: formatNumber(n.n) });
    }
  };

  return (
    <div ref={viewRef} data-testid={`tp-view-${viewId}`} data-grain={grain}>
      {/* SIMULATED while the SOMO fixture feeds it — said before any number, in
          one line (PLN-5); the whole statement is one click away and in the DOM. */}
      <CompactNotice
        tone="warning"
        title={t('planGrid.tp.banner.title')}
        body={t('planGrid.tp.banner.body')}
        aside={<LivenessPill capability="forecastPublications" />}
        testId="tp-banner"
      />

      {viewId !== 'exceptions' && (
        <PublicationPanel grain={grain} collapsible open={publicationOpen} onToggle={() => setPublicationOpen((o) => !o)} />
      )}
      {pasteNote && (
        <p className="mb-1.5 text-xs text-text-secondary" data-testid="tp-paste-note">
          {t('planGrid.edit.pasteNote', {
            planned: formatNumber(pasteNote.planned),
            refused: formatNumber(pasteNote.refused),
            outside: formatNumber(pasteNote.outside),
          })}
        </p>
      )}

      <div className="mb-1.5 flex flex-wrap items-end gap-3 text-sm">
        {materialType && (
          <div className="flex flex-col gap-1">
            <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.filter.type')}</span>
            <span
              data-testid="tp-view-type"
              data-material-type={materialType}
              className="rounded-md border border-border-subtle bg-bg-subtle px-2 py-1.5 text-text-secondary"
            >
              {t(materialType === 'ROH' ? 'planGrid.tp.filter.rm' : 'planGrid.tp.filter.pm')}
              {' · '}
              {t(grain === 'month' ? 'planGrid.tp.typeMonthly' : 'planGrid.tp.typeWeekly')}
            </span>
          </div>
        )}
        <label className="flex min-w-[16rem] flex-col gap-1">
          <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.search')}</span>
          <input
            data-testid="tp-search"
            className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5"
            value={filter.search}
            placeholder={t('planGrid.tp.searchPlaceholder')}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.sortBy')}</span>
          <div className="flex gap-1">
            <select
              data-testid="tp-sort-col"
              className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5"
              value={sort.colId}
              disabled={filter.exceptionsOnly}
              onChange={(e) => setSort({ ...sort, colId: e.target.value as PlanSortColumn })}
            >
              {sortColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.labelKey)}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="tp-sort-dir"
              disabled={filter.exceptionsOnly}
              className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5 disabled:opacity-50"
              onClick={() => setSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
            >
              {t(sort.dir === 'asc' ? 'planGrid.tp.asc' : 'planGrid.tp.desc')}
            </button>
          </div>
        </label>
        <label className="flex items-center gap-2 pb-1.5">
          <input
            type="checkbox"
            data-testid="tp-exceptions"
            checked={filter.exceptionsOnly}
            disabled={lockedExceptions}
            onChange={(e) => setFilter({ ...filter, exceptionsOnly: e.target.checked })}
          />
          <span>{t('planGrid.tp.exceptions')}</span>
        </label>
        <p className="ml-auto pb-1.5 text-xs text-text-tertiary" data-testid="tp-summary">
          {t('planGrid.tp.summary', {
            materials: formatNumber(visible.length),
            rows: formatNumber(rows.length),
            exceptions: formatNumber(exceptionCount),
          })}
          {filter.exceptionsOnly ? ` · ${t('planGrid.tp.exceptionsOrder')}` : ''}
        </p>
      </div>

      {/* PLN-5 · ONE line under the filters: what is editable and how, or what
          the last key did — a refusal, a delete, an undo, a copy — with its reason. */}
      <div className="mb-1.5 flex min-h-[18px] flex-wrap items-baseline gap-x-3 text-xs">
        {viewId !== 'exceptions' && !keyNote && (
          <p className="text-text-tertiary" data-testid="tp-edit-hint">
            {t('planGrid.edit.hint', { measures: editableLabels })}
          </p>
        )}
        {keyNote && (
          <p
            className={keyNote.kind === 'refused' ? 'font-medium text-danger' : 'text-text-secondary'}
            data-testid="tp-key-note"
            data-kind={keyNote.kind}
            role="status"
          >
            {keyNoteText(keyNote)}
          </p>
        )}
      </div>

      {factsQuery.data?.horizonRefusal || !generated.ok ? (
        <p className="text-sm text-danger" data-testid="tp-refused">
          {t('planGrid.tp.refused', {
            reason: factsQuery.data?.horizonRefusal?.reason ?? (generated.ok ? '' : generated.reason),
          })}
        </p>
      ) : factsQuery.isLoading ? (
        <p className="text-sm text-text-tertiary">{t('planGrid.tp.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="tp-empty">
          {t('planGrid.tp.empty')}
        </p>
      ) : (
        // Height-pinned like every DSG on this page (`--plan-dsg-h`): a grid that
        // auto-shrinks to its content feeds the resize loop that made it tremble.
        <div
          ref={wrapRef}
          className="plan-dsg tp-grid overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
          data-testid="tp-grid"
          data-fit-height={gridH}
          style={{ '--plan-dsg-h': `${gridH}px` } as React.CSSProperties}
        >
          <DataSheetGrid<PlanRow>
            ref={gridRef}
            onActiveCellChange={({ cell }) => {
              // PLN-5 · a key note speaks of the cell it was made in; moving on retires it.
              setKeyNote((n) => (n?.kind === 'copied' ? n : null));
              const i = cell ? horizon.indexOf((cell.colId ?? '').replace(/^bucket:/, '')) : -1;
              setSelection(cell && i >= 0 ? { r0: cell.row, r1: cell.row, c0: i, c1: i } : null);
            }}
            onSelectionChange={({ selection: s }) => {
              if (!s) return setSelection(null);
              const col = (id: string | undefined, fallback: number) => {
                const i = horizon.indexOf((id ?? '').replace(/^bucket:/, ''));
                return i < 0 ? fallback : i;
              };
              setSelection({
                r0: Math.min(s.min.row, s.max.row),
                r1: Math.max(s.min.row, s.max.row),
                c0: col(s.min.colId, s.min.col),
                c1: col(s.max.colId, s.max.col),
              });
            }}
            value={rows}
            columns={columns}
            gutterColumn={gutter}
            stickyRightColumn={aggregates}
            rowKey="id"
            lockRows
            disableContextMenu
            rowHeight={ROW_H}
            headerRowHeight={36}
            height={gridH}
          />
        </div>
      )}

      {/* ⚠️ PLN-4 · THE PLANNED CHANGES SIT BELOW THE GRID AND IN A STICKY BAR,
          NEVER ABOVE IT. Above, fifty rows pushed the grid 2,743 px down the
          page (measured on built main); here the grid keeps its place whatever
          is planned, the bar stays in sight, and the list folds away. */}
      <div ref={changesRef}>
        <PlannedChangesDetails open={changesOpen} />
      </div>
      <PlannedChangesBar
        selectedRefs={selectedRefs}
        open={changesOpen}
        onToggle={() => {
          const opening = !changesOpen;
          setChangesOpen(opening);
          if (opening) requestAnimationFrame(() => changesRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }));
        }}
      />
    </div>
  );
};

export default TimePhasedGrid;
