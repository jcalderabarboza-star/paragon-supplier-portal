import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import {
  DataSheetGrid,
  keyColumn,
  intColumn,
  type Column,
  type CellComponent,
  type CellProps,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import PlanCellMarker from './plan-grid/PlanCellMarker';
import IntakePushPanel from './plan-grid/IntakePushPanel';
import { useQuotations } from '../services/query/hooks';
import { formatIDR, formatNumber } from '../lib/format';
import { mockSuppliers } from '../data/mockSuppliers';
import {
  AWARD_CRITERIA,
  DEFAULT_WEIGHTS,
  awardScenarioRows,
  buildWhatIfOverlay,
  SAMPLE_INTAKE_LINES,
  type AwardCriterionKey,
  type AwardScenarioRow,
  type PrIntakeLine,
  type WhatIfWeights,
} from './plan-grid/planGridModel';

// The editable weights row: the engine's int cells can be cleared to null; we
// coerce back to a non-null WhatIfWeights on change (guards the recompute NaN).
type WeightRow = Record<AwardCriterionKey, number | null>;

// ────────────────────────────────────────────────────────────────────────────
// PlanGrid (Stage G · G1.2a) — the READ-ONLY procurement-execution grid.
//
// First lazy-loaded route on main; the react-datasheet-grid engine ships in
// this page's async chunk (route-split — see AppRouter). The engine is strictly
// data-in / data-out: it renders the arrays we pass and emits edit events for
// the what-if WEIGHTS grid; every score is recomputed in pure TS
// (planGridModel), and the seam `aiCompositeScore` is NEVER written back. The
// registry (`purchaseRequisitions`, gate-2 shut) keeps every honest marker
// SIMULATED — green is structurally unreachable. NOTHING here dispatches (G1.2b).
// ────────────────────────────────────────────────────────────────────────────

const AWARD_RFQ = 'rfq-003';

// Fixed DSG heights (px). Each DSG's container is PINNED to its height via
// `--plan-dsg-h` + planGrid.css so it cannot auto-shrink to few-row content —
// the react-resize-detector feedback loop that pinning removes (see planGrid.css).
// These are the ONE source of truth for both the `height` prop and the pin.
const DSG_H = { weights: 88, award: 176, intake: 216 } as const;
const dsgVar = (h: number) => ({ '--plan-dsg-h': `${h}px` }) as React.CSSProperties;

const supplierName = (id: string): string =>
  mockSuppliers.find((s) => s.id === id)?.name ?? id;

// A read-only mono data cell (DP-3: mono + data-navy). The engine passes
// rowData; we render — it computes nothing.
function dataCell<T>(get: (r: T) => React.ReactNode): CellComponent<T> {
  return ({ rowData }) => (
    <div className="w-full px-2 text-right">
      <Data className="text-xs">{get(rowData)}</Data>
    </div>
  );
}

function textCell<T>(
  get: (r: T) => React.ReactNode,
  className = 'text-text-primary',
): CellComponent<T> {
  return ({ rowData }) => (
    <div className={`w-full px-2 truncate text-sm ${className}`}>{get(rowData)}</div>
  );
}

interface AwardDisplayRow extends AwardScenarioRow {
  supplierName: string;
  whatIf: number;
}

const PlanGrid: React.FC = () => {
  const { t } = useTranslation();
  const quotationsQuery = useQuotations();
  const quotations = quotationsQuery.data?.items ?? [];

  // The editable what-if weights (client state). Editing a weight cell in the
  // weights grid updates this; the award what-if column recomputes in pure TS.
  const [weights, setWeights] = useState<WhatIfWeights>(DEFAULT_WEIGHTS);

  const awardRows = useMemo(
    () => awardScenarioRows(quotations, AWARD_RFQ),
    [quotations],
  );

  // C6 §2: the PLANNED overlay is a SEPARATE id-keyed map, recomputed from the
  // weights — never merged into the seam rows. The seam `aiCompositeScore` below
  // is read straight off awardRows and is structurally untouched by this.
  const overlay = useMemo(
    () => buildWhatIfOverlay(awardRows, weights),
    [awardRows, weights],
  );

  const awardDisplay: AwardDisplayRow[] = useMemo(
    () =>
      awardRows.map((r) => ({
        ...r,
        supplierName: supplierName(r.supplierId),
        whatIf: overlay[r.id],
      })),
    [awardRows, overlay],
  );

  // The weights grid is ONE editable row; each criterion is an editable int
  // cell. The engine emits the change; we lift it into `weights` (coercing a
  // cleared/null cell back to 0 so the pure-TS recompute never sees NaN).
  const weightsRow = useMemo<WeightRow[]>(() => [{ ...weights }], [weights]);
  const weightColumns = useMemo<Column<WeightRow>[]>(
    () =>
      AWARD_CRITERIA.map((c) => ({
        ...keyColumn<WeightRow, typeof c.key>(c.key, intColumn),
        title: t(c.labelKey),
        minWidth: 90,
      })),
    [t],
  );
  const onWeightsChange = (rows: WeightRow[]) => {
    const r = rows[0];
    if (!r) return;
    setWeights({
      compliance: r.compliance ?? 0,
      price: r.price ?? 0,
      leadTime: r.leadTime ?? 0,
      reliability: r.reliability ?? 0,
    });
  };

  const awardColumns = useMemo<Column<AwardDisplayRow>[]>(
    () => [
      {
        title: t('planGrid.award.col.supplier'),
        disabled: true,
        grow: 2,
        minWidth: 180,
        component: textCell<AwardDisplayRow>((r) => r.supplierName),
      },
      ...AWARD_CRITERIA.map((c) => ({
        title: t(c.labelKey),
        disabled: true,
        minWidth: 90,
        component: dataCell<AwardDisplayRow>((r) => r[c.scoreField]),
      })),
      {
        title: t('planGrid.award.col.seamScore'),
        disabled: true,
        minWidth: 110,
        component: dataCell<AwardDisplayRow>((r) => (
          <span className="font-semibold text-data-navy">{r.aiCompositeScore}</span>
        )),
      },
      {
        title: t('planGrid.award.col.whatIfScore'),
        disabled: true,
        minWidth: 120,
        component: ({ rowData }: CellProps<AwardDisplayRow>) => (
          <div className="w-full px-2 text-right">
            <span className="inline-flex items-center rounded-sm border border-info/30 bg-info-soft px-1.5 py-0.5 font-mono text-xs font-semibold text-info">
              {rowData.whatIf}
            </span>
          </div>
        ),
      },
    ],
    [t],
  );

  const intakeColumns = useMemo<Column<PrIntakeLine>[]>(
    () => [
      {
        title: t('planGrid.intake.col.material'),
        disabled: true,
        grow: 2,
        minWidth: 170,
        component: textCell<PrIntakeLine>((r) => r.material),
      },
      {
        title: t('planGrid.intake.col.source'),
        disabled: true,
        minWidth: 120,
        component: textCell<PrIntakeLine>(
          (r) => t(`planGrid.source.${r.source}`),
          'text-text-secondary',
        ),
      },
      {
        title: t('planGrid.intake.col.lane'),
        disabled: true,
        grow: 2,
        minWidth: 180,
        component: textCell<PrIntakeLine>(
          (r) => r.suggestedSource ?? t('planGrid.empty.dash'),
          'text-text-secondary',
        ),
      },
      {
        title: t('planGrid.intake.col.segment'),
        disabled: true,
        minWidth: 90,
        component: textCell<PrIntakeLine>(
          (r) => r.segment ?? t('planGrid.empty.dash'),
          'text-text-secondary',
        ),
      },
      {
        title: t('planGrid.intake.col.suggestedQty'),
        disabled: true,
        minWidth: 110,
        component: dataCell<PrIntakeLine>((r) => `${formatNumber(r.suggestedQty)} ${r.uom}`),
      },
      {
        title: t('planGrid.intake.col.acceptedQty'),
        disabled: true,
        minWidth: 110,
        component: dataCell<PrIntakeLine>((r) => `${formatNumber(r.acceptedQty)} ${r.uom}`),
      },
      {
        title: t('planGrid.intake.col.adjusted'),
        disabled: true,
        minWidth: 110,
        component: ({ rowData }: CellProps<PrIntakeLine>) => (
          <div className="w-full px-2 text-sm">
            <span
              className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium ${
                rowData.wasAdjusted
                  ? 'border-warning/30 bg-warning-soft text-warning-hover'
                  : 'border-border-subtle bg-bg-hover text-text-tertiary'
              }`}
            >
              {t(rowData.wasAdjusted ? 'planGrid.adjusted.yes' : 'planGrid.adjusted.no')}
            </span>
          </div>
        ),
      },
      {
        title: t('planGrid.intake.col.period'),
        disabled: true,
        minWidth: 90,
        component: dataCell<PrIntakeLine>((r) => r.period),
      },
      {
        title: t('planGrid.intake.col.estValue'),
        disabled: true,
        minWidth: 130,
        component: dataCell<PrIntakeLine>((r) => formatIDR(r.estimatedValue, { compact: true })),
      },
      {
        title: t('planGrid.intake.col.provenance'),
        disabled: true,
        grow: 2,
        minWidth: 170,
        component: ({ rowData }: CellProps<PrIntakeLine>) => (
          <div className="w-full px-2">
            <PlanCellMarker capability="purchaseRequisitions" planState={rowData.planState} />
          </div>
        ),
      },
    ],
    [t],
  );

  const PLAN_CRUMB = [t('planGrid.crumb.acquire'), t('planGrid.crumb.planGrid')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={PLAN_CRUMB}
        title={t('planGrid.header.title')}
        subtitle={t('planGrid.header.subtitle')}
        actions={<LivenessPill capability="purchaseRequisitions" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('planGrid.meta.summary', {
          quotations: awardRows.length,
          lines: SAMPLE_INTAKE_LINES.length,
        })}
      </PageMetaLine>

      {/* Honest framing: read-only sandbox, SIMULATED, nothing pushed */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('planGrid.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('planGrid.honesty.body')}</p>
        </div>
      </div>

      {/* ── Award scenario — what-if overlay ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-text-primary">
          {t('planGrid.award.title')}
        </h2>
        <p className="mb-1 text-sm text-text-secondary">{t('planGrid.award.subtitle')}</p>
        <p className="mb-3 text-xs text-text-tertiary">
          {t('planGrid.award.col.whatIfScore')} — {t('planGrid.clientComputed')}. {t('planGrid.whatif.hint')}
        </p>

        {/* Editable what-if weights (the ONE editable engine surface in 1.2a) */}
        <div
          data-testid="whatif-weights"
          className="mb-4 rounded-lg border border-border-subtle bg-bg-surface p-4"
        >
          <div className="mb-2 text-label uppercase text-text-tertiary">
            {t('planGrid.whatif.label')}
          </div>
          {/* jsdom-reliable readout of the current weights (also the accessible
              text alternative to the virtualized grid header) */}
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            {AWARD_CRITERIA.map((c) => (
              <span key={c.key}>
                {t(c.labelKey)}: <Data className="text-data-navy">{weights[c.key]}</Data>
              </span>
            ))}
          </div>
          <div className="plan-dsg max-w-md" style={dsgVar(DSG_H.weights)}>
            <DataSheetGrid<WeightRow>
              value={weightsRow}
              columns={weightColumns}
              onChange={onWeightsChange}
              gutterColumn={false}
              lockRows
              disableContextMenu
              height={DSG_H.weights}
            />
          </div>
        </div>

        <div
          className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
          style={dsgVar(DSG_H.award)}
        >
          <DataSheetGrid<AwardDisplayRow>
            value={awardDisplay}
            columns={awardColumns}
            gutterColumn={false}
            lockRows
            rowKey="id"
            height={DSG_H.award}
          />
        </div>
      </section>

      {/* ── Requisition intake — review (C7 §2) ──────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-text-primary">
          {t('planGrid.intake.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('planGrid.intake.subtitle')}</p>
        <div
          className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
          style={dsgVar(DSG_H.intake)}
        >
          <DataSheetGrid<PrIntakeLine>
            value={SAMPLE_INTAKE_LINES as PrIntakeLine[]}
            columns={intakeColumns}
            gutterColumn={false}
            lockRows
            rowKey="id"
            height={DSG_H.intake}
          />
        </div>
      </section>

      {/* ── Adjust & push — the ONE governed mutation (C6-LOCK, plain DOM) ── */}
      <IntakePushPanel lines={SAMPLE_INTAKE_LINES} />
    </AppShellV2>
  );
};

export default PlanGrid;
