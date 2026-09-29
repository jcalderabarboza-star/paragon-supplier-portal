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
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { DataSheetGrid, type CellProps, type Column } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './planGrid.css';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import ModelMarker from '../../components/ui-v2/ModelMarker';
import LivenessPill from '../../components/ui-v2/LivenessPill';
import { formatNumber } from '../../lib/format';
import { mockSuppliers } from '../../data/mockSuppliers';
import { usePlanningFacts } from '../../services/query/planningHooks';
import { useConsolidationRows } from '../../services/query/sdcBuyerHooks';
import { VIEWS, type ViewId } from '../../services/planning/views';
import { COLUMNS, bucketColumns, bucketColumnId } from '../../services/planning/columns';
import { measureOf, type MeasureId } from '../../services/planning/measures';
import { somoHorizon } from '../../services/planning/facts';
import { visibleMeasures } from './visibleMeasures';
import {
  DEFAULT_PLAN_FILTER,
  DEFAULT_PLAN_SORT,
  applyPlanView,
  buildPlanBlocks,
  flattenPlanRows,
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
export const PlanBucketCell: React.FC<{ value: number | null | undefined; derived: boolean }> = ({
  value,
  derived,
}) => {
  const { t } = useTranslation();
  const text = planCellText(value, formatNumber);
  return (
    <div className="flex w-full items-center justify-end gap-1 px-2" data-testid="tp-cell">
      {derived && (
        <ModelMarker label={t('planGrid.tp.modeled')} title={t('planGrid.tp.modeledTitle')} />
      )}
      {text === '—' ? (
        <span className="text-xs text-text-tertiary">{text}</span>
      ) : (
        <Data className="text-xs">{text}</Data>
      )}
    </div>
  );
};

const TimePhasedGrid: React.FC<{ viewId: Extract<ViewId, 'rm-plan' | 'pm-plan' | 'exceptions'> }> = ({ viewId }) => {
  const { t } = useTranslation();
  const view = VIEWS.find((v) => v.viewId === viewId)!;
  const grain = view.grain === 'week' ? 'week' : 'month';
  const horizon = useMemo(() => somoHorizon(grain).slice(0, view.horizonLength), [grain, view.horizonLength]);
  const measures = useMemo(() => visibleMeasures(view.measuresShown), [view.measuresShown]);

  const factsQuery = usePlanningFacts(horizon, measures);
  const consolidation = useConsolidationRows();
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
        disabled: true,
        minWidth: 104,
        component: ({ rowData }: CellProps<PlanRow>) => (
          <PlanBucketCell
            value={rowData.cells[bucket]}
            derived={
              generated.ok
                ? (generated.byId.get(bucketColumnId(rowData.measureId as MeasureId, bucket))?.derived ?? false)
                : rowData.derived
            }
          />
        ),
      })),
    [horizon, generated],
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
          className="plan-dsg tp-grid overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
          data-testid="tp-grid"
          style={{ '--plan-dsg-h': `${GRID_H}px` } as React.CSSProperties}
        >
          <DataSheetGrid<PlanRow>
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
