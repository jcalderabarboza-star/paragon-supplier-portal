import React, { useMemo, useState } from 'react';
import {
  DataSheetGrid,
  keyColumn,
  intColumn,
  type Column,
  type CellProps,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import { dataCell, textCell } from './plan-grid/cells';
import IntakeReviewView from './plan-grid/IntakeReviewView';
import CompactNotice from './plan-grid/CompactNotice';
import FullScreenSection from './plan-grid/FullScreenSection';
import SubTabs from '../components/ui-v2/SubTabs';
import TimePhasedGrid from './plan-grid/TimePhasedGrid';
import type { BucketGrain } from '../services/planning/bucket';
import { PlanDraftProvider } from './plan-grid/PlanDraftProvider';
import { useQuotations } from '../services/query/hooks';
import { planningSupplierName } from '../services/planning/somoFixture';
import {
  AWARD_CRITERIA,
  DEFAULT_WEIGHTS,
  awardScenarioRows,
  buildWhatIfOverlay,
  type AwardCriterionKey,
  type AwardScenarioRow,
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
// SIMULATED — green is structurally unreachable. (Since G1.2b the intake drawer
// dispatches, and since B3/B4b the time-phased views push through
// `PlanDraftProvider`; the award what-if itself still writes nothing.)
// ────────────────────────────────────────────────────────────────────────────

const AWARD_RFQ = 'rfq-003';

// Fixed DSG heights (px). Each DSG's container is PINNED to its height via
// `--plan-dsg-h` + planGrid.css so it cannot auto-shrink to few-row content —
// the react-resize-detector feedback loop that pinning removes (see planGrid.css).
// These are the ONE source of truth for both the `height` prop and the pin.
const DSG_H = { weights: 88, award: 176 } as const;
const dsgVar = (h: number) => ({ '--plan-dsg-h': `${h}px` }) as React.CSSProperties;

// PLN-2 · names from the planning supplier master, one resolver for every planning surface.
const supplierName = planningSupplierName;

// dataCell/textCell (the read-only mono/sans cell helpers) moved to the shared
// ./plan-grid/cells module when the SDC consolidation grid became the second
// DSG consumer (SDC-1b).

interface AwardDisplayRow extends AwardScenarioRow {
  supplierName: string;
  whatIf: number;
}

/**
 * B2 — the tabs. The time-phased views lead (the planning surface this page is
 * named for); the two sections that were the whole page until B2 keep their own
 * tabs and are otherwise untouched — nothing is removed, nothing re-derived.
 */
type PlanTab = 'rm' | 'pm' | 'exceptions' | 'award' | 'intake';

/**
 * PLN-3 · the view a link opens on — `?view=<ViewId>`. The retired Intake Review
 * route redirects to `?view=intake-review`, so its old links land on the queue
 * rather than on the raw-material plan.
 */
const TAB_OF_VIEW: Readonly<Record<string, PlanTab>> = {
  'rm-plan': 'rm',
  'pm-plan': 'pm',
  exceptions: 'exceptions',
  'intake-review': 'intake',
};

const PlanGrid: React.FC = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [tab, setTabState] = useState<PlanTab>(() => TAB_OF_VIEW[params.get('view') ?? ''] ?? 'rm');
  // PLN-1 · the grain of the plan tab the planner was last in. The Exceptions
  // tab follows it — it was fixed at the monthly grain, so weekly exceptions
  // had no list of their own.
  const [planGrain, setPlanGrain] = useState<BucketGrain>(() => (TAB_OF_VIEW[params.get('view') ?? ''] === 'pm' ? 'week' : 'month'));
  const setTab = (next: PlanTab) => {
    if (next === 'rm') setPlanGrain('month');
    if (next === 'pm') setPlanGrain('week');
    setTabState(next);
  };
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

  const PLAN_CRUMB = [t('planGrid.crumb.planGrid')];

  return (
    <AppShellV2>
      {/* PLN-5 summarised the chrome so the grid starts higher: the sandbox
          notice in one line, tight tabs. UI-1b took back the compact header —
          one page-title size everywhere (operator ruling, 9 October 2026). */}
      <PageHeader
        breadcrumb={PLAN_CRUMB}
        title={t('planGrid.header.title')}
        subtitle={t('planGrid.header.subtitle')}
        actions={<LivenessPill capability="purchaseRequisitions" />}
      />

      <PageMetaLine className="mb-2">
        {/* PLN-1 · it read "3 quotations, 4 intake lines" — two counts from the
            two SECONDARY tabs, standing over a 1,200-material plan. It names
            the tabs by their own labels now, and counts nothing: each view's
            summary line is where a count is derived. */}
        {t('planGrid.meta.views', {
          award: t('planGrid.tab.award'),
          intake: t('planGrid.tab.intake'),
        })}
      </PageMetaLine>

      {/* Honest framing: read-only sandbox, SIMULATED, nothing pushed */}
      <CompactNotice tone="info" title={t('planGrid.honesty.title')} body={t('planGrid.honesty.body')} testId="plan-honesty" />

      <SubTabs<PlanTab>
        className="mb-3"
        value={tab}
        onChange={setTab}
        options={[
          { id: 'rm', label: t('planGrid.tab.rm') },
          { id: 'pm', label: t('planGrid.tab.pm') },
          { id: 'exceptions', label: t('planGrid.tab.exceptions') },
          { id: 'award', label: t('planGrid.tab.award') },
          { id: 'intake', label: t('planGrid.tab.intake') },
        ]}
      />

      {/* B3 · ONE overlay for the three planning views, held for the page's
          life: switching tabs keeps a planned change, a reload drops it. */}
      <PlanDraftProvider>
        {tab === 'rm' && <TimePhasedGrid viewId="rm-plan" />}
        {tab === 'pm' && <TimePhasedGrid viewId="pm-plan" />}
        {tab === 'exceptions' && <TimePhasedGrid key={`exceptions-${planGrain}`} viewId="exceptions" currentGrain={planGrain} />}
      </PlanDraftProvider>

      {/* ── Award scenario — what-if overlay (full-screen-capable) ───────── */}
      {tab === 'award' && (
      <section className="mb-8">
        <FullScreenSection title={t('planGrid.award.title')} normalHeight={DSG_H.award}>
          {({ dsgHeight }) => (
            <>
              <p className="mb-1 text-sm text-text-secondary">{t('planGrid.award.subtitle')}</p>
              <p className="mb-3 text-xs text-text-tertiary">
                {t('planGrid.award.col.whatIfScore')} — {t('planGrid.clientComputed')}. {t('planGrid.whatif.hint')}
              </p>

              {/* Editable what-if weights (the ONE editable engine surface) */}
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
                style={dsgVar(dsgHeight)}
              >
                <DataSheetGrid<AwardDisplayRow>
                  value={awardDisplay}
                  columns={awardColumns}
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
      )}

      {/* ── PLN-3 · the intake-review view (Design 1 D8) — the retired Intake
          Review page lives here now, over the ONE intake population. ── */}
      {tab === 'intake' && <IntakeReviewView />}
    </AppShellV2>
  );
};

export default PlanGrid;
