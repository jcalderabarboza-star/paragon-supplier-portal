import React, { useMemo, useState } from 'react';
import { Info, Lock, MessageCircle } from 'lucide-react';
import { DataSheetGrid, type Column, type CellProps } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import ModelMarker from '../components/ui-v2/ModelMarker';
import PlanCellMarker from './plan-grid/PlanCellMarker';
import FullScreenSection from './plan-grid/FullScreenSection';
import { dataCell, textCell } from './plan-grid/cells';
import { formatDate, formatNumber } from '../lib/format';
import { mockSuppliers } from '../data/mockSuppliers';
import {
  FORECAST_PUBLICATIONS,
  REQUIREMENT_RESPONSES,
  INVENTORY_DECLARATIONS,
  INCOMING_SHIPMENTS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  MATERIAL_MASTER,
  currentPublication,
  consolidationRows,
  supplierRollups,
  chaseList,
  supplierCoverageEntries,
  type ConsolidationRow,
  type SupplierCoverageEntry,
  type CommitmentClass,
} from '../services/sdc';

// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration (SDC-1b) — the P2 planner consolidation view: the
// master-spreadsheet replacement (RFP p.13) on screen.
//
// READ-ONLY end-to-end: this page renders the SDC-1a pure selectors over the
// SDC-0 fixtures — no mutation, no command, no dispatch (P1 supplier submission
// is SDC-2). The DSG engine ships in this page's async chunk (lazy route, shared
// with PlanGrid — see AppRouter); every honest marker derives from the registry
// (`forecastPublications`: gate-2 shut on the SOMO C8 feed → green structurally
// unreachable, the pill reads "Sample — awaiting SOMO C8 feed").
//
// THE BOUNDARY (design §5, addendum §6): response tracking is OURS; network
// coverage-projection stays SOMO's. The ONE projection rendered here is the
// per-supplier coverage indicator — MODELED, Σ-marked (ModelMarker), never
// wearing the DP-3 observed grammar; a missing declaration renders an HONEST
// BLANK, never a fabricated zero (the CI-2 honest-silence pattern).
// ────────────────────────────────────────────────────────────────────────────

// The pinned SIMULATED clock the pure selectors receive (`now` is injected —
// SDC-1a purity). The fixture cycle lives in Aug–Oct 2026; this as-of sits past
// the R2 response deadline (2026-08-22) so the chase list shows its overdue
// state deterministically. Declared on the meta line — never presented as the
// real clock. Swapped for the live clock when the feed flips (SDC-4).
const SIMULATED_ASOF = '2026-08-25T12:00:00.000Z';

// The consolidation read — module-scope like the fixtures themselves (static
// SIMULATED inputs → static derivation; the SDC-4 repoint moves these behind
// useDataService without touching a selector).
const CURRENT = currentPublication(FORECAST_PUBLICATIONS);
const ROWS = consolidationRows(FORECAST_PUBLICATIONS, REQUIREMENT_RESPONSES);
const ROLLUPS = supplierRollups(ROWS);
const CHASE = CURRENT ? chaseList(CURRENT, ROWS, SIMULATED_ASOF) : [];
const COVERAGE = supplierCoverageEntries(
  FORECAST_PUBLICATIONS,
  INVENTORY_DECLARATIONS,
  INCOMING_SHIPMENTS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  SIMULATED_ASOF,
);
const COVERAGE_BY_PAIR = new Map<string, SupplierCoverageEntry>(
  COVERAGE.map((c) => [`${c.supplierId}|${c.materialCode}`, c]),
);

// Fixed DSG height (px) — same one-source-of-truth pattern as PlanGrid: the
// `height` prop AND the `--plan-dsg-h` pin (anti-trembling, planGrid.css).
const DSG_H = { grid: 256 } as const;
const dsgVar = (h: number) => ({ '--plan-dsg-h': `${h}px` }) as React.CSSProperties;

const supplierName = (id: string): string =>
  mockSuppliers.find((s) => s.id === id)?.name ?? id;

const CLASS_LABEL_KEY: Record<CommitmentClass, string> = {
  firm: 'sdc.class.firm',
  'semi-firm': 'sdc.class.semiFirm',
  'visibility-only': 'sdc.class.visibilityOnly',
};

/** The PERIOD-level commitment class (period-global firm, design §3.1): one
 *  class per bucket in the fixtures; 'mixed' only if a bucket ever splits. */
function periodClass(bucket: string): CommitmentClass | 'mixed' {
  const classes = new Set(
    (CURRENT?.lines ?? [])
      .filter((l) => l.periodBucket === bucket)
      .map((l) => l.commitmentClass),
  );
  return classes.size === 1 ? [...classes][0] : 'mixed';
}

// Quiet-outlined chip base (DP-3 status-chip grammar: soft tint, thin border).
const CHIP = 'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium';
const CHIP_NEUTRAL = `${CHIP} border-border-subtle bg-bg-hover text-text-secondary`;
const CHIP_SUCCESS = `${CHIP} border-success/30 bg-success-soft text-success`;
const CHIP_WARNING = `${CHIP} border-warning/30 bg-warning-soft text-warning-hover`;
const CHIP_DANGER = `${CHIP} border-danger/30 bg-danger-soft text-danger`;
const CHIP_INFO = `${CHIP} border-info/30 bg-info-soft text-info`;

const BuyerCollaboration: React.FC = () => {
  const { t } = useTranslation();

  // The period filter — 'all' or one horizon bucket of the current publication.
  const [period, setPeriod] = useState<string>('all');

  const visibleRows = useMemo(
    () => (period === 'all' ? ROWS : ROWS.filter((r) => r.line.periodBucket === period)),
    [period],
  );

  // The carried-forward token: presumed valid (design §3.2), a muted note —
  // deliberately NOT a warning (the line did not move; nothing was voided).
  const carriedToken = useMemo(
    () => (
      <span className={`${CHIP_NEUTRAL} text-[10px]`} title={t('sdc.state.carriedTitle')}>
        {t('sdc.state.carried')}
      </span>
    ),
    [t],
  );

  const columns = useMemo<Column<ConsolidationRow>[]>(
    () => [
      {
        title: t('sdc.col.supplier'),
        disabled: true,
        grow: 2,
        minWidth: 160,
        component: textCell<ConsolidationRow>((r) => supplierName(r.line.supplierId)),
      },
      {
        title: t('sdc.col.material'),
        disabled: true,
        grow: 2,
        minWidth: 230,
        component: ({ rowData }: CellProps<ConsolidationRow>) => (
          <div className="w-full truncate px-2 text-sm">
            <Data className="text-xs">{rowData.line.materialCode}</Data>{' '}
            <span className="text-xs text-text-secondary">
              {MATERIAL_MASTER[rowData.line.materialCode]?.label ?? ''}
            </span>
          </div>
        ),
      },
      {
        title: t('sdc.col.period'),
        disabled: true,
        minWidth: 90,
        component: dataCell<ConsolidationRow>((r) => r.line.periodBucket),
      },
      {
        // Per-line class chip: an ECHO of the period-level class (the filter bar
        // owns it) — neutral, never a health state, never a per-material lock.
        title: t('sdc.col.class'),
        disabled: true,
        minWidth: 110,
        component: ({ rowData }: CellProps<ConsolidationRow>) => (
          <div className="w-full px-2">
            <span className={CHIP_NEUTRAL}>
              {t(CLASS_LABEL_KEY[rowData.line.commitmentClass])}
            </span>
          </div>
        ),
      },
      {
        title: t('sdc.col.demand'),
        disabled: true,
        minWidth: 120,
        component: dataCell<ConsolidationRow>(
          (r) => `${formatNumber(r.line.forecastQty)} ${r.line.uom}`,
        ),
      },
      {
        title: t('sdc.col.confirmed'),
        disabled: true,
        minWidth: 120,
        component: dataCell<ConsolidationRow>((r) => {
          // Awaiting has nothing; an acknowledgment COMMITS nothing (SDC-2b-EXT
          // invariant #11) — both render the honest dash, never a fabricated qty.
          if (r.state.kind === 'awaiting' || r.state.kind === 'acknowledged')
            return t('sdc.empty.dash');
          const fc = r.state.response.forecastConfirmation;
          return fc ? `${formatNumber(fc.confirmedQty)} ${r.line.uom}` : t('sdc.empty.dash');
        }),
      },
      {
        title: t('sdc.col.deficit'),
        disabled: true,
        minWidth: 110,
        component: ({ rowData }: CellProps<ConsolidationRow>) => (
          <div className="w-full px-2 text-right">
            {rowData.state.kind === 'short' ? (
              <Data className="text-xs text-danger">
                −{formatNumber(rowData.state.deficitQty)} {rowData.line.uom}
              </Data>
            ) : (
              <span className="text-xs text-text-tertiary">{t('sdc.empty.dash')}</span>
            )}
          </div>
        ),
      },
      {
        title: t('sdc.col.state'),
        disabled: true,
        grow: 2,
        minWidth: 240,
        component: ({ rowData }: CellProps<ConsolidationRow>) => {
          const s = rowData.state;
          return (
            <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
              {s.kind === 'awaiting' && (
                <>
                  <span className={CHIP_NEUTRAL}>{t('sdc.state.awaiting')}</span>
                  {s.draftInProgress && (
                    // F-2: a Draft is NOT a response — a muted hint, never actionable.
                    <span className="text-[10px] italic text-text-tertiary">
                      {t('sdc.state.draftHint')}
                    </span>
                  )}
                </>
              )}
              {s.kind === 'acknowledged' && (
                <>
                  {/* SDC-2b-EXT: a visibility response — honestly DISTINCT from
                      the commitment states (neutral, never the success chip). */}
                  <span className={CHIP_NEUTRAL}>{t('sdc.state.acknowledged')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {s.kind === 'confirmed-full' && (
                <>
                  <span className={CHIP_SUCCESS}>{t('sdc.state.confirmedFull')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {s.kind === 'short' && (
                <>
                  <span className={CHIP_DANGER}>{t('sdc.state.short')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {s.kind === 'stale-against-current' && (
                <span className={CHIP_WARNING}>
                  {s.answeredQty === null
                    ? t('sdc.state.staleUnverified', {
                        current: formatNumber(s.currentQty),
                      })
                    : t('sdc.state.stale', {
                        answered: formatNumber(s.answeredQty),
                        current: formatNumber(s.currentQty),
                      })}
                </span>
              )}
            </div>
          );
        },
      },
      {
        // The supplier-coverage indicator (addendum §6) — the ONE projection
        // that is ours. MODELED, Σ-marked; honest blank when nothing declared.
        title: t('sdc.col.coverage'),
        disabled: true,
        grow: 2,
        minWidth: 190,
        component: ({ rowData }: CellProps<ConsolidationRow>) => {
          const cov = COVERAGE_BY_PAIR.get(
            `${rowData.line.supplierId}|${rowData.line.materialCode}`,
          );
          // Visibility-only pair: no committed demand → no sufficiency read.
          if (!cov) {
            return (
              <div className="w-full px-2 text-xs text-text-tertiary">{t('sdc.empty.dash')}</div>
            );
          }
          const st = cov.status;
          if (st.kind === 'no-declaration') {
            // The honest blank — never a fabricated zero, no Σ (nothing computed).
            return (
              <div className="w-full px-2 text-xs italic text-text-tertiary">
                {t('sdc.coverage.noDeclaration')}
              </div>
            );
          }
          const chipCls =
            st.kind === 'covered'
              ? CHIP_SUCCESS
              : st.kind === 'at-risk'
                ? CHIP_WARNING
                : CHIP_DANGER;
          const label =
            st.kind === 'covered'
              ? t('sdc.coverage.covered')
              : st.kind === 'at-risk'
                ? t('sdc.coverage.atRisk')
                : t('sdc.coverage.uncovered');
          const ratio = Number.isFinite(st.ratio) ? ` · ${st.ratio.toFixed(2)}×` : '';
          const unbridgeable = st.kind !== 'covered' && st.unbridgeable;
          return (
            <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
              <span className={chipCls}>
                {label}
                {ratio}
                {unbridgeable ? ` — ${t('sdc.coverage.unbridgeable')}` : ''}
              </span>
              <ModelMarker
                label={t('sdc.coverage.model')}
                title={t('sdc.coverage.modelTitle')}
              />
              {/* SDC-3b — a total-only declaration: the ratio is honest but expiry
                  bridgeability is UNKNOWN. Marked, never assumed no-risk. */}
              {st.expiryBlind && (
                <span
                  className="text-[10px] italic text-text-tertiary"
                  title={t('sdc.coverage.expiryBlindTitle')}
                >
                  {t('sdc.coverage.expiryBlind')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: t('sdc.col.provenance'),
        disabled: true,
        grow: 2,
        minWidth: 170,
        component: ({ rowData }: CellProps<ConsolidationRow>) => (
          <div className="w-full px-2">
            <PlanCellMarker
              capability="forecastPublications"
              planState={rowData.line.provenance.planState}
            />
          </div>
        ),
      },
    ],
    [t, carriedToken],
  );

  const horizon = CURRENT?.horizon ?? [];
  const CRUMB = [t('sdc.crumb.section'), t('sdc.crumb.page')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('sdc.header.title')}
        subtitle={t('sdc.header.subtitle')}
        actions={<LivenessPill capability="forecastPublications" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('sdc.meta.summary', {
          lines: ROWS.length,
          suppliers: ROLLUPS.length,
          planVersion: CURRENT?.planVersion ?? t('sdc.empty.dash'),
          asOf: formatDate(SIMULATED_ASOF),
        })}
      </PageMetaLine>

      {/* Honest framing: read-only consolidation, SIMULATED feed, nothing dispatches */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('sdc.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('sdc.honesty.body')}</p>
        </div>
      </div>

      {/* ── Period filter bar — the PERIOD owns the commitment class ───────── */}
      <div data-testid="sdc-period-bar" className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              period === 'all'
                ? 'border-action bg-action-soft text-action'
                : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {t('sdc.period.all')}
          </button>
          {horizon.map((bucket) => (
            <button
              key={bucket}
              type="button"
              onClick={() => setPeriod(bucket)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                period === bucket
                  ? 'border-action bg-action-soft text-action'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Data className="text-xs">{bucket}</Data>
              {periodClass(bucket) === 'firm' && <Lock size={12} aria-hidden="true" />}
            </button>
          ))}
        </div>
        {/* The period-level commitmentClass badges — per-line chips only ECHO these */}
        <div className="mt-2 flex flex-wrap gap-2">
          {horizon.map((bucket) => {
            const cls = periodClass(bucket);
            return (
              <span key={bucket} className={CHIP_NEUTRAL}>
                {cls === 'firm' ? (
                  <>
                    <Lock size={11} aria-hidden="true" />
                    {t('sdc.period.locked', { period: bucket })}
                  </>
                ) : (
                  <>
                    {bucket} · {t(cls === 'mixed' ? 'sdc.class.mixed' : CLASS_LABEL_KEY[cls])}
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── The consolidation grid (read-only DSG, full-screen-capable) ────── */}
      <section className="mb-8">
        <FullScreenSection title={t('sdc.grid.title')} normalHeight={DSG_H.grid}>
          {({ dsgHeight }) => (
            <>
              <p className="mb-1 text-sm text-text-secondary">{t('sdc.grid.subtitle')}</p>
              <p className="mb-3 text-xs text-text-tertiary">{t('sdc.coverage.legend')}</p>
              <div
                className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
                style={dsgVar(dsgHeight)}
              >
                <DataSheetGrid<ConsolidationRow>
                  value={visibleRows as ConsolidationRow[]}
                  columns={columns}
                  gutterColumn={false}
                  lockRows
                  rowKey="id"
                  height={dsgHeight}
                />
              </div>
            </>
          )}
        </FullScreenSection>
      </section>

      {/* ── Chase list — the pre-scheduler manual WhatsApp interim ─────────── */}
      <section className="mb-8" data-testid="sdc-chase">
        <h2 className="mb-1 text-base font-semibold text-text-primary">
          {t('sdc.chase.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('sdc.chase.subtitle')}</p>

        {/* Supplier response rollup — context for the chase */}
        <div className="mb-3 flex flex-wrap gap-2">
          <span className={CHIP_SUCCESS}>
            {t('sdc.rollup.responded')}:{' '}
            {ROLLUPS.filter((r) => r.rollup === 'responded').length}
          </span>
          <span className={CHIP_INFO}>
            {t('sdc.rollup.partial')}: {ROLLUPS.filter((r) => r.rollup === 'partial').length}
          </span>
          <span className={CHIP_NEUTRAL}>
            {t('sdc.rollup.silent')}: {ROLLUPS.filter((r) => r.rollup === 'silent').length}
          </span>
        </div>

        {CHASE.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            {t('sdc.chase.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
            {CHASE.map((entry) => (
              <li
                key={entry.supplierId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <MessageCircle size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                <span className="min-w-[10rem] font-medium text-text-primary">
                  {supplierName(entry.supplierId)}
                </span>
                <span className={entry.reason === 'overdue' ? CHIP_WARNING : CHIP_INFO}>
                  {t(
                    entry.reason === 'overdue'
                      ? 'sdc.chase.reason.overdue'
                      : 'sdc.chase.reason.partial',
                  )}
                </span>
                <span className="text-text-secondary">
                  {t('sdc.chase.awaitingLines', { n: entry.awaitingLines })}
                </span>
                <span className="ml-auto text-xs text-text-tertiary">
                  {t('sdc.chase.due', { date: formatDate(entry.dueAt) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShellV2>
  );
};

export default BuyerCollaboration;
