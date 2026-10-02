// ────────────────────────────────────────────────────────────────────────────
// PLN-3 · IntakeReviewView — the grid's `intake-review` view (Design 1 D8).
//
// ⚠️ **THIS IS WHERE THE INTAKE REVIEW PAGE WENT, AND NOTHING IT DID IS LOST.**
// D8 ruled: *"Retire; two surfaces with independent state is how F2 happened."*
// The page listed the four authored lines; the grid committed generated SOMO
// lines the page never listed, so a planner could not set one aside, and the
// queue's counts described four lines out of thousands (R-PLN P0 #6). This view
// reads the SAME `getIntakeLines` population the plan tabs commit, so a line
// dismissed here reads dismissed in its plan-tab cell, and the old route lands
// here (`/buyer/intake-review` → `/buyer/plan-grid?view=intake-review`).
//
// Carried over from the page: the queue summary, the honesty banner, the
// handoff notice, Accept as delivered / Dismiss / Restore per row, the
// committed → PR label, the producer's adjustment, the "why", the provenance
// marker and the refusal text. Carried over from the grid's old Intake tab: the
// Adjust drawer, which is still the one place a changed quantity is pushed.
//
// ⚠️ **ONE ATOM GOVERNS EVERY CONTROL HERE — `intake:triage`, THE PLANNING
// LANE'S (R1).** All three verbs hold it, so one availability reading gates the
// mode, and the notice sits once in the header (§74).
// ────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { DataSheetGrid, type CellProps, type Column } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './planGrid.css';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Data from '../../components/ui-v2/Data';
import Button from '../../components/ui-v2/Button';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import PlanCellMarker from './PlanCellMarker';
import IntakeAdjustDrawer from './IntakeAdjustDrawer';
import FullScreenSection from './FullScreenSection';
import { dataCell, textCell } from './cells';
import { useIntakeReview } from '../../services/query/hooks';
import { useIntakeCommit, useIntakeDismiss, useIntakeRestore } from '../../services/query/commandHooks';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import type { VerbAvailability } from '../../services/transitions/handoff';
import { useRefusalText } from '../../hooks/useRefusalText';
import { INTAKE_TRIAGE_ATOM } from '../../services/transitions/flows/intakeLine.flow';
import { DataError, type IntakeLine } from '../../services/data/types';
import { formatIDR, formatNumber } from '../../lib/format';
import { selectedLine } from './planGridModel';
import {
  DEFAULT_INTAKE_STATE_FILTER,
  buildAcceptCommit,
  filterIntakeLines,
  intakeLineCode,
  triageCounts,
  type IntakeStateFilter,
} from '../intake-review/intakeReviewModel';

const GRID_H = 420;
const DRAWER_H = 216;
// i18n-defer: machine state ids, not copy — each renders as t(`intakeReview.filter.${id}`).
const STATE_FILTERS: readonly IntakeStateFilter[] = ['Pending', 'Dismissed', 'Committed', 'all'];

/**
 * What a row's triage cell needs from the view. A context rather than props:
 * the engine re-mounts cells as it virtualises, and a refusal or an in-flight
 * mark must outlive a scroll.
 */
interface IntakeTriageApi {
  readonly availability: VerbAvailability;
  readonly inFlightId: string | null;
  readonly refusals: Readonly<Record<string, string>>;
  readonly accept: (line: IntakeLine) => void;
  readonly dismiss: (line: IntakeLine) => void;
  readonly restore: (line: IntakeLine) => void;
}

const IntakeTriageContext = createContext<IntakeTriageApi | null>(null);

/**
 * The triage the view holds, as a provider. Exported so the row cell is tested
 * with the real hooks, outside the virtualised engine (which lays out no rows
 * under jsdom — `PlanBucketCell`'s precedent).
 *
 * ⚠️ WHAT IS `useState` HERE IS ONLY WHAT IS NOT A FACT: which row has a request
 * in flight, and the last refusal per row. The decision itself is the machine's.
 */
export const IntakeTriageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const commit = useIntakeCommit();
  const dismissLine = useIntakeDismiss();
  const restoreLine = useIntakeRestore();
  const availability = useVerbAvailability(INTAKE_TRIAGE_ATOM);
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [refusals, setRefusals] = useState<Record<string, string>>({});

  // One place every dispatch lands, so a returned `failed` and a thrown
  // `DataError` both leave the row where it was, with a reason a reader can use.
  const run = async (lineId: string, fire: () => Promise<{ status: string; reason?: string }>) => {
    setInFlightId(lineId);
    setRefusals((r) => {
      const { [lineId]: _dropped, ...rest } = r;
      return rest;
    });
    try {
      const result = await fire();
      if (result.status === 'failed') setRefusals((r) => ({ ...r, [lineId]: result.reason ?? 'failed' }));
    } catch (e) {
      setRefusals((r) => ({ ...r, [lineId]: e instanceof DataError ? e.code : 'ERROR' }));
    } finally {
      setInFlightId(null);
    }
  };

  const api: IntakeTriageApi = {
    availability,
    inFlightId,
    refusals,
    accept: (line) => void run(line.id, () => commit.mutateAsync(buildAcceptCommit(line))),
    dismiss: (line) => void run(line.id, () => dismissLine.mutateAsync({ lineId: line.id })),
    restore: (line) => void run(line.id, () => restoreLine.mutateAsync({ lineId: line.id })),
  };
  return <IntakeTriageContext.Provider value={api}>{children}</IntakeTriageContext.Provider>;
};

/** A row's triage: the act its state admits, or what was decided, and why a dispatch was refused. */
export const IntakeTriageCell: React.FC<{ line: IntakeLine }> = ({ line }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const api = useContext(IntakeTriageContext);
  if (!api) return null;
  const busy = api.inFlightId === line.id;
  const held = api.availability.kind === 'held';
  const refusal = api.refusals[line.id];
  return (
    <div className="flex w-full flex-col items-start gap-0.5 px-2" data-testid={`intake-triage-${line.id}`}>
      {line.state === 'Committed' && (
        <Data className="text-xs text-text-secondary">
          {line.prNumber
            ? t('intakeReview.committed.label', { pr: line.prNumber })
            : t('intakeReview.committed.noPr')}
        </Data>
      )}
      {line.state === 'Dismissed' && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-sm border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
            {t('intakeReview.dismissed.label')}
          </span>
          {held && (
            <Button
              variant="secondary"
              className="!px-2 !py-0.5 text-xs"
              disabled={busy}
              aria-label={t('intakeReview.restore.aria', { material: line.material })}
              onClick={() => api.restore(line)}
            >
              {t('intakeReview.action.restore')}
            </Button>
          )}
        </div>
      )}
      {line.state === 'Pending' && held && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="!px-2 !py-0.5 text-xs"
            disabled={busy}
            aria-label={t('intakeReview.accept.aria', { material: line.material })}
            onClick={() => api.accept(line)}
          >
            {busy ? t('intakeReview.action.accepting') : t('intakeReview.action.accept')}
          </Button>
          <Button
            variant="secondary"
            className="!px-2 !py-0.5 text-xs"
            disabled={busy}
            aria-label={t('intakeReview.dismiss.aria', { material: line.material })}
            onClick={() => api.dismiss(line)}
          >
            {t('intakeReview.action.dismiss')}
          </Button>
        </div>
      )}
      {refusal && (
        <div className="text-[11px] text-danger" role="alert">
          {refusalText(refusal) ?? t('intakeReview.failed.label', { reason: refusal })}
        </div>
      )}
    </div>
  );
};

/**
 * The intake view's columns. Exported so a row is rendered with the REAL cells
 * outside the virtualised engine, which lays out no rows under jsdom.
 */
export function intakeReviewColumns(
  t: TFunction,
  select: (lineId: string) => void,
): Column<IntakeLine>[] {
  return [
    {
      title: t('planGrid.intake.col.select'),
      disabled: true,
      minWidth: 96,
      component: ({ rowData }: CellProps<IntakeLine>) => (
        <div className="w-full px-2">
          <button
            type="button"
            aria-label={t('planGrid.intake.select.action', { material: rowData.material })}
            onClick={(e) => {
              e.stopPropagation();
              select(rowData.id);
            }}
            className="inline-flex items-center rounded-md border border-action/40 bg-action-soft px-2 py-0.5 text-xs text-action hover:border-action"
          >
            {t('planGrid.intake.col.select')}
          </button>
        </div>
      ),
    },
    {
      title: t('planGrid.intake.col.code'),
      disabled: true,
      minWidth: 120,
      component: dataCell<IntakeLine>((r) => intakeLineCode(r) ?? t('planGrid.empty.dash')),
    },
    {
      title: t('planGrid.intake.col.material'),
      disabled: true,
      grow: 2,
      minWidth: 190,
      component: textCell<IntakeLine>((r) => r.material),
    },
    {
      title: t('planGrid.intake.col.source'),
      disabled: true,
      minWidth: 110,
      component: textCell<IntakeLine>((r) => t(`planGrid.source.${r.source}`), 'text-text-secondary'),
    },
    {
      title: t('planGrid.intake.col.period'),
      disabled: true,
      minWidth: 90,
      component: dataCell<IntakeLine>((r) => r.periodBucket),
    },
    {
      title: t('planGrid.intake.col.suggestedQty'),
      disabled: true,
      minWidth: 110,
      component: dataCell<IntakeLine>((r) => `${formatNumber(r.suggestedQty)} ${r.uom}`),
    },
    {
      // The DELIVERED quantity — what Accept commits and the baseline any
      // override is measured from (A1-R2). A producer's trim is SHOWN, never
      // charged to the planner.
      title: t('intakeReview.col.qty'),
      disabled: true,
      minWidth: 150,
      component: ({ rowData }: CellProps<IntakeLine>) => (
        <div className="w-full px-2 text-right leading-tight">
          <Data className="text-xs">{`${formatNumber(rowData.acceptedQty)} ${rowData.uom}`}</Data>
          {rowData.producerAdjusted && (
            <div className="text-[10px] text-text-tertiary" data-testid={`producer-adjusted-${rowData.id}`}>
              {t('planGrid.adjusted.byProducer', {
                producer: t(`planGrid.source.${rowData.source}`),
                from: formatNumber(rowData.suggestedQty),
                to: formatNumber(rowData.acceptedQty),
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('planGrid.intake.col.estValue'),
      disabled: true,
      minWidth: 110,
      component: dataCell<IntakeLine>((r) => formatIDR(r.estimatedValue, { compact: true })),
    },
    {
      title: t('intakeReview.col.why'),
      disabled: true,
      grow: 2,
      minWidth: 220,
      component: ({ rowData }: CellProps<IntakeLine>) => (
        <div className="w-full truncate px-2 text-xs text-text-secondary" title={rowData.deficit ?? undefined}>
          {rowData.deficit ?? t('planGrid.empty.dash')}
        </div>
      ),
    },
    {
      title: t('planGrid.intake.col.provenance'),
      disabled: true,
      minWidth: 150,
      component: ({ rowData }: CellProps<IntakeLine>) => (
        <div className="w-full px-2">
          <PlanCellMarker capability="purchaseRequisitions" planState={rowData.planState} />
        </div>
      ),
    },
    {
      title: t('intakeReview.col.actions'),
      disabled: true,
      minWidth: 250,
      component: ({ rowData }: CellProps<IntakeLine>) => <IntakeTriageCell line={rowData} />,
    },
  ];
}

const IntakeReviewBody: React.FC = () => {
  const { t } = useTranslation();
  const intakeQuery = useIntakeReview();
  const lines = intakeQuery.data?.items ?? [];
  const api = useContext(IntakeTriageContext)!;
  const [state, setState] = useState<IntakeStateFilter>(DEFAULT_INTAKE_STATE_FILTER);
  const [query, setQuery] = useState('');
  // The working set of one: which line the Adjust drawer edits (G1.3.2).
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const counts = useMemo(() => triageCounts(lines), [lines]);
  const visible = useMemo(() => filterIntakeLines(lines, { state, query }), [lines, state, query]);

  const columns = useMemo(() => intakeReviewColumns(t, setSelectedLineId), [t]);

  return (
    <div data-testid="tp-view-intake-review">
      {/* The queue summary — a partition of the WHOLE population, by the machine's state. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text-secondary" data-testid="intake-summary">
          {t('intakeReview.meta.summary', {
            total: formatNumber(counts.total),
            pending: formatNumber(counts.pending),
            committed: formatNumber(counts.committed),
            dismissed: formatNumber(counts.dismissed),
          })}
        </div>
        <HandoffNotice availability={api.availability} testId="handoff-intake-triage" />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('intakeReview.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('intakeReview.honesty.body')}</p>
          <p className="mt-1 text-text-secondary">{t('intakeReview.adjustHint')}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          data-testid="intake-search"
          aria-label={t('intakeReview.search.label')}
          placeholder={t('intakeReview.search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-72 rounded-md border border-border-subtle px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          {t('intakeReview.filter.state')}
          <select
            data-testid="intake-filter-state"
            value={state}
            onChange={(e) => setState(e.target.value as IntakeStateFilter)}
            className="rounded-md border border-border-subtle px-2 py-1.5 text-sm"
          >
            {STATE_FILTERS.map((s) => (
              <option key={s} value={s}>
                {t(`intakeReview.filter.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-text-tertiary" data-testid="intake-showing">
          {t('intakeReview.showing', { shown: formatNumber(visible.length), total: formatNumber(counts.total) })}
        </span>
      </div>

      <section className="mb-8">
        <FullScreenSection title={t('planGrid.intake.title')} normalHeight={GRID_H}>
          {({ dsgHeight }) =>
            // An empty list is said only once the read has answered: "no lines"
            // while loading would be a statement about the queue nobody made.
            intakeQuery.isSuccess && visible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-subtle bg-bg-surface px-4 py-8 text-center text-sm text-text-tertiary" data-testid="intake-empty">
                {t('intakeReview.empty')}
              </div>
            ) : (
              <div
                className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
                style={{ '--plan-dsg-h': `${dsgHeight}px` } as React.CSSProperties}
                data-testid="intake-grid"
              >
                <DataSheetGrid<IntakeLine>
                  value={visible as IntakeLine[]}
                  columns={columns}
                  gutterColumn={false}
                  lockRows
                  rowKey="id"
                  rowHeight={44}
                  height={dsgHeight}
                />
              </div>
            )
          }
        </FullScreenSection>
      </section>

      {/* Adjust & push — the ONE governed mutation of a changed quantity (C6-LOCK, plain DOM). */}
      <section className="mb-8">
        <FullScreenSection title={t('planGrid.drawer.title')} normalHeight={DRAWER_H}>
          {() => (
            <>
              <p className="mb-3 text-sm text-text-secondary">{t('planGrid.drawer.subtitle')}</p>
              <IntakeAdjustDrawer line={selectedLine(lines, selectedLineId)} />
            </>
          )}
        </FullScreenSection>
      </section>
    </div>
  );
};

const IntakeReviewView: React.FC = () => (
  <IntakeTriageProvider>
    <IntakeReviewBody />
  </IntakeTriageProvider>
);

export default IntakeReviewView;
