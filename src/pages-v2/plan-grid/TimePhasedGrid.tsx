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
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DataSheetGrid, type CellProps, type Column, type DataSheetGridRef } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './planGrid.css';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import ModelMarker from '../../components/ui-v2/ModelMarker';
import LivenessPill from '../../components/ui-v2/LivenessPill';
import { formatNumber } from '../../lib/format';
import { mockSuppliers } from '../../data/mockSuppliers';
import { usePlanningFacts } from '../../services/query/planningHooks';
import { useConsolidationRows, usePublicationWorkspace } from '../../services/query/sdcBuyerHooks';
import { totalKey } from '../../services/sdc';
import { VIEWS, type ViewId } from '../../services/planning/views';
import { COLUMNS, bucketColumns, bucketColumnId } from '../../services/planning/columns';
import { measureOf, type MeasureId } from '../../services/planning/measures';
import { somoHorizon } from '../../services/planning/facts';
import { visibleMeasures } from './visibleMeasures';
import { usePlanDraft } from './PlanDraftProvider';
import PlannedChangesPanel, { cellRefusalText } from './PlannedChangesPanel';
import PublicationPanel, { draftOfGrain } from './PublicationPanel';
import { cellKey, type CellRefusal, type EditContext, type PlanDraftEntry } from './planDraft';
import {
  DEFAULT_PLAN_FILTER,
  DEFAULT_PLAN_SORT,
  applyPlanView,
  buildPlanBlocks,
  flattenPlanRows,
  isEditableCell,
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
const GRID_H = 560;

const supplierLabel = (id: string): string => mockSuppliers.find((s) => s.id === id)?.name ?? id;

/**
 * ONE bucket cell. Exported so the null rule and the marker rule are testable
 * without the virtualised engine (which lays out no rows under jsdom).
 *
 * ⚠️ A DERIVED CELL CARRIES ITS MARKER EVEN WHEN IT IS EMPTY: "the portal would
 * compute this, and has nothing to compute from" is still a computed cell.
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
}> = ({ value, derived, planned, refusal, committed }) => {
  const { t } = useTranslation();
  // ⚠️ THE OVERLAY IS SHOWN, NEVER MERGED: the seam value stays in the row and
  // the planned one is read from the draft by seamRef, marked as PLANNED.
  const text = planCellText(planned ? planned.value : value, formatNumber);
  const refusalText = refusal ? cellRefusalText(t, refusal) : '';
  return (
    <div
      className={`flex w-full items-center justify-end gap-1 px-2 ${planned ? 'bg-info-soft' : ''} ${refusal ? 'ring-1 ring-inset ring-danger/60' : ''}`}
      data-testid="tp-cell"
      title={refusal ? `“${refusal.raw}” — ${refusalText}` : undefined}
    >
      {derived && (
        <ModelMarker label={t('planGrid.tp.modeled')} title={t('planGrid.tp.modeledTitle')} />
      )}
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
      {text === '—' ? (
        <span className="text-xs text-text-tertiary">{text}</span>
      ) : (
        <Data className="text-xs">{text}</Data>
      )}
    </div>
  );
};

/** B3 · a read-only cell, which still shows a refused paste aimed at it. */
const ReadOnlyBucketCell: React.FC<{ row: PlanRow; bucket: string; derived: boolean }> = ({ row, bucket, derived }) => {
  const api = usePlanDraft();
  return (
    <PlanBucketCell value={row.cells[bucket]} derived={derived} refusal={api?.draft.refusals.get(cellKey(row.id, bucket))} />
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

const TimePhasedGrid: React.FC<{ viewId: Extract<ViewId, 'rm-plan' | 'pm-plan' | 'exceptions'> }> = ({ viewId }) => {
  const { t } = useTranslation();
  const view = VIEWS.find((v) => v.viewId === viewId)!;
  const grain = view.grain === 'week' ? 'week' : 'month';
  const horizon = useMemo(() => somoHorizon(grain).slice(0, view.horizonLength), [grain, view.horizonLength]);
  const measures = useMemo(() => visibleMeasures(view.measuresShown), [view.measuresShown]);

  const factsQuery = usePlanningFacts(horizon, measures);
  const draftApi = usePlanDraft();
  const gridRef = useRef<DataSheetGridRef>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ r0: number; r1: number; c0: number; c1: number } | null>(null);
  const [pasteNote, setPasteNote] = useState<{ planned: number; refused: number; outside: number } | null>(null);
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
  const [sort, setSort] = useState<PlanSort>(DEFAULT_PLAN_SORT);

  const staleKeys = useMemo(
    () =>
      new Set(
        (consolidation.data ?? [])
          .filter((r) => r.state.kind === 'stale-against-current')
          .map((r) => staleKey(r.line.supplierId, r.line.materialCode, r.line.periodBucket)),
      ),
    [consolidation.data],
  );

  const blocks = useMemo(
    () => buildPlanBlocks(factsQuery.data?.items ?? [], horizon, measures, staleKeys),
    [factsQuery.data, horizon, measures, staleKeys],
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
  const selectedRefs = useMemo(() => {
    if (!selection) return [];
    const out: string[] = [];
    for (let r = selection.r0; r <= selection.r1; r++) {
      for (let c = selection.c0; c <= selection.c1; c++) {
        const ref = rows[r]?.seamRefs?.[horizon[c]];
        if (ref) out.push(ref);
      }
    }
    return out;
  }, [selection, rows, horizon]);

  // B3 · the paste, judged cell by cell. Intercepted in the CAPTURE phase so
  // the engine's own handler (which would skip a read-only cell in silence and
  // write the rest into the rows) never runs. A paste while a cell's text field
  // has focus is left to the field.
  const pasteRef = useRef<(e: ClipboardEvent) => void>(() => {});
  pasteRef.current = (e: ClipboardEvent) => {
    const active = gridRef.current?.activeCell;
    if (!draftApi || !active || !wrapRef.current) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement && wrapRef.current.contains(focused)) return;
    const text = e.clipboardData?.getData('text/plain');
    if (text === undefined || text === null) return;
    const col = horizon.indexOf((active.colId ?? '').replace(/^bucket:/, ''));
    if (col < 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setPasteNote(draftApi.paste(rows, horizon, { row: active.row, col }, text, totalOf));
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => pasteRef.current(e);
    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
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
        disabled: ({ rowData }: { rowData: PlanRow }) => !draftApi || !isEditableCell(rowData, bucket),
        minWidth: 112,
        component: ({ rowData, focus }: CellProps<PlanRow>) =>
          draftApi && isEditableCell(rowData, bucket) ? (
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
    [horizon, generated, draftApi],
  );

  const gutter = useMemo(
    () => ({
      title: <span className="px-2 text-xs">{t('planGrid.tp.keyColumn')}</span>,
      // ⚠️ `basis`, NOT `minWidth`: the engine sizes its sticky columns from
      // `basis` and defaults it to 40 px (useColumns.js), so a `minWidth` alone
      // rendered a 40-px gutter whose text ran over the buckets — found in
      // browser QA, invisible to jsdom.
      basis: 360,
      minWidth: 360,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => (
        <div className="flex w-full min-w-0 items-center gap-2 px-2 text-xs">
          <Data className={`w-28 shrink-0 ${rowData.blockHead ? 'font-semibold' : 'text-text-tertiary'}`}>
            {rowData.materialCode}
          </Data>
          <span className="w-10 shrink-0 text-text-tertiary">{rowData.uom}</span>
          <span className="min-w-0 truncate text-text-secondary" title={rowData.materialLabel}>
            {rowData.supplierId
              ? t('planGrid.tp.supplierRow', {
                  measure: t(measureOf(rowData.measureId).labelKey),
                  supplier: supplierLabel(rowData.supplierId),
                })
              : `${t(measureOf(rowData.measureId).labelKey)} — ${rowData.materialLabel}`}
          </span>
        </div>
      ),
    }),
    [t],
  );

  const aggregates = useMemo(
    () => ({
      title: (
        <span className="flex items-center gap-1 px-2 text-xs">
          {t('planGrid.tp.aggregates')}
          <ModelMarker label={t('planGrid.tp.modeled')} title={t('planGrid.tp.modeledTitle')} />
        </span>
      ),
      basis: 330,
      minWidth: 330,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => {
        const b = rowData.blockHead ? blockOf.get(rowData.materialCode) : undefined;
        if (!b) return <span />;
        return (
          <div className="grid w-full grid-cols-4 gap-1 px-2 text-right text-xs" data-testid="tp-aggregates">
            <Data>{planCellText(b.agg.demand, formatNumber)}</Data>
            <Data>{planCellText(b.agg.confirmed, formatNumber)}</Data>
            <Data className={(b.agg.deficit ?? 0) > 0 ? 'text-danger' : ''}>
              {planCellText(b.agg.deficit, formatNumber)}
            </Data>
            <Data>{b.agg.firstShortBucket ?? '—'}</Data>
          </div>
        );
      },
    }),
    [t, blockOf],
  );

  return (
    <div data-testid={`tp-view-${viewId}`}>
      {/* SIMULATED while the SOMO fixture feeds it — said before any number. */}
      <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
        <div>
          <div className="font-semibold text-warning-hover">{t('planGrid.tp.banner.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('planGrid.tp.banner.body')}</p>
        </div>
        <LivenessPill capability="forecastPublications" />
      </div>

      {viewId !== 'exceptions' && <PublicationPanel grain={grain} />}
      {viewId !== 'exceptions' && (
        <p className="mb-2 text-xs text-text-tertiary" data-testid="tp-edit-hint">
          {t('planGrid.edit.hint')}
        </p>
      )}
      <PlannedChangesPanel selectedRefs={selectedRefs} />
      {pasteNote && (
        <p className="mb-2 text-xs text-text-secondary" data-testid="tp-paste-note">
          {t('planGrid.edit.pasteNote', {
            planned: formatNumber(pasteNote.planned),
            refused: formatNumber(pasteNote.refused),
            outside: formatNumber(pasteNote.outside),
          })}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.filter.type')}</span>
          <select
            data-testid="tp-filter-type"
            className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5"
            value={filter.materialType}
            onChange={(e) => setFilter({ ...filter, materialType: e.target.value as PlanFilter['materialType'] })}
          >
            <option value="all">{t('planGrid.tp.filter.all')}</option>
            <option value="ROH">{t('planGrid.tp.filter.rm')}</option>
            <option value="VERP">{t('planGrid.tp.filter.pm')}</option>
          </select>
        </label>
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
      </div>

      <p className="mb-2 text-xs text-text-tertiary" data-testid="tp-summary">
        {t('planGrid.tp.summary', {
          materials: formatNumber(visible.length),
          rows: formatNumber(rows.length),
          exceptions: formatNumber(exceptionCount),
        })}
        {filter.exceptionsOnly ? ` · ${t('planGrid.tp.exceptionsOrder')}` : ''}
      </p>

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
          style={{ '--plan-dsg-h': `${GRID_H}px` } as React.CSSProperties}
        >
          <DataSheetGrid<PlanRow>
            ref={gridRef}
            onActiveCellChange={({ cell }) => {
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
            height={GRID_H}
          />
        </div>
      )}
    </div>
  );
};

export default TimePhasedGrid;
