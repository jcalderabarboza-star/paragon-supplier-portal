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
// ── PG-1 · THE FRAME IS CALM (R-PG, operator ruling 11 October 2026) ────────
// Measured on built main at 1600×900: 64% of the screen stood above the first
// number, and 81% at 1366×768. Three notices, a folded panel, a filter row and a
// hint are now ONE summary strip and one filter row; the sample statement and
// the edit hint are in the page's "About this data"; the publication and the
// planned changes open in drawers. Rows come in two heights and alternate BY
// MATERIAL. PLN-5's `CompactNotice` and the folded panel it names below are gone.
//
// ── PG-2 · THE GRID IS CALM (R-PG proposals 3, 4, 5 and 8) ──────────────────
//  · ONE ROW PER MATERIAL — its shortfall per bucket, so only an exception
//    carries ink. It opens, on its own label, to the measures chosen in the
//    measures menu (`flattenPlanRows` with a layout; the model decides, the
//    engine renders).
//  · THE HORIZON FITS THE SCREEN. A bucket column is as wide as the widest
//    figure the grid holds (`widestFigure`) and no wider; the key column takes
//    what is left, between a floor and what its longest label needs
//    (`planColumnWidths`). Twelve months stand without sideways scroll wherever
//    the figures allow it; where they do not, the grid scrolls — a figure is
//    never clipped to make the claim true.
//  · The totals pane is two figures: the shortfall over the horizon and the
//    first short bucket. Why a material is an exception is said on its row.
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

import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Ban, Check, ChevronDown, ChevronRight, ClipboardPaste, Pencil, Sigma } from 'lucide-react';
import { DataSheetGrid, type CellProps, type Column, type DataSheetGridRef } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './planGrid.css';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import Dialog from '../../components/ui-v2/Dialog';
import { Checkbox, FormField, Select, TextInput } from '../../components/ui-v2/Form';
import LivenessPill from '../../components/ui-v2/LivenessPill';
import { Card } from '../../components/ui-v2/Card';
import Notice from '../../components/ui-v2/Notice';
import SidePanel from '../../components/ui-v2/SidePanel';
import { LinkButton, RowButton, ToggleChip } from '../../components/ui-v2/Actions';
import { formatBucketShort, formatNumber } from '../../lib/format';
import { usePlanningFacts } from '../../services/query/planningHooks';
import { useConsolidationRows, usePublicationWorkspace } from '../../services/query/sdcBuyerHooks';
import { totalKey } from '../../services/sdc';
import { VIEWS, viewGrainAndHorizon, type ViewId } from '../../services/planning/views';
import type { BucketGrain } from '../../services/planning/bucket';
import { COLUMNS, bucketColumns, bucketColumnId } from '../../services/planning/columns';
import { measureOf, type MeasureId } from '../../services/planning/measures';
import { somoHorizon } from '../../services/planning/facts';
import { supplierNameOf } from '../../services/masterData/lookup';
import { visibleMeasures } from './visibleMeasures';
import { usePlanDraft } from './PlanDraftProvider';
import { PlannedChangesBar, PlannedChangesDetails, cellRefusalText, usePushTargets } from './PlannedChangesPanel';
import PlanPushControls from './PlanPushControls';
import PublicationPanel, { PublicationSummary, draftOfGrain } from './PublicationPanel';
import { EMPTY_DRAFT, applyEdit, cellKey, magnitudeFlag, routePaste, type CellRefusal, type EditContext, type PlanDraftEntry } from './planDraft';
import { useFitHeight } from './useFitHeight';
import { useKeepPlace } from './useKeepPlace';
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
  isPlanException,
  planCellText,
  staleKey,
  type PlanFilter,
  type PlanRow,
  type PlanSort,
  type PlanSortColumn,
  PLAN_SORT_COLUMNS,
  isShortIn,
  DEFAULT_OPEN_MEASURES,
  widestFigure,
  type PlanLayout,
} from './planGridModel';

/**
 * PG-1 · two row heights, the planner's choice, remembered per browser. Compact
 * is the two 13px lines a supplier row's label needs and nothing more.
 */
export type PlanDensity = 'compact' | 'comfortable';
export const ROW_H: Readonly<Record<PlanDensity, number>> = { compact: 26, comfortable: 32 };
const DENSITY_KEY = 'paragon.planGrid.density';
const readDensity = (): PlanDensity => {
  try {
    return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
  } catch {
    return 'comfortable';
  }
};
// PLN-2 · fits the longest planning-master supplier name on one line (measured in the browser).
// PLN-5 · and the longest material label, now that the label has the gutter's width to itself.
// PG-2 · this is the key column's CEILING now; `planColumnWidths` gives it what the horizon leaves.
const GUTTER_W = 420;
/** PG-2 · the key column's floor: a label wraps to its second line before the column goes under this. */
const GUTTER_MIN = 208;
/** PLN-5 · the grid's height when nothing can be measured (jsdom), and its floor in a short window. */
const GRID_H = 560;
const GRID_MIN_H = 300;
/** PG-2 · the horizon totals: the shortfall over the horizon and the first short bucket. */
const AGG_W = 112;
/** PG-2 · a bucket column: a 12px mono character, the cell's padding, and the least it is ever given. */
const FIGURE_CH = 7.2;
const CELL_PAD = 9;
const BUCKET_MIN = 48;
/** PG-2 · under this a cell has no room for a marker's WORD beside its figure. */
const NARROW_BELOW = 88;
/** PG-2 · a 12px label character, the chevron and padding beside it, the grid's own scrollbar. */
const LABEL_CH = 6.5;
const LABEL_PAD = 44;
const SCROLLBAR_W = 10;
/** PG-3 · the TIGHT step: an 11px mono character (the smallest type the portal renders) and 2px of padding a side. */
const FIGURE_CH_TIGHT = 6.6;
const CELL_PAD_TIGHT = 5;
const BUCKET_MIN_TIGHT = 40;
/** The bucket column where nothing can be measured (jsdom) — the width it had before PG-2. */
const BUCKET_FALLBACK = 112;

export interface PlanColumnWidths {
  readonly gutter: number;
  readonly bucketMin: number;
  readonly narrow: boolean;
  readonly fits: boolean;
  /** PG-3 · the figures stand at the smallest type and the least padding. */
  readonly tight: boolean;
  /** PG-3 · the horizon-totals pane stands beside the buckets; false where it had to give its width up. */
  readonly totals: boolean;
}

/**
 * PG-3 · the steps a view takes to stand without sideways scroll, in order:
 * as it is; then with its figures TIGHT; then tight with the totals pane given
 * up. The first that fits is taken. Where none does, the view stands as it is
 * and scrolls — a figure is never clipped to make the claim true.
 */
const WIDTH_STEPS = [
  { tight: false, totals: true },
  { tight: true, totals: true },
  { tight: true, totals: false },
] as const;

/**
 * PG-2 · THE COLUMN WIDTHS, as a pure rule. A bucket column is as wide as the
 * widest figure and no wider; the key column takes what the horizon leaves,
 * never under its floor and never over what its longest label needs. `fits` says
 * whether the whole horizon stands without sideways scroll — it is false when
 * the figures are too wide for the window, and the grid then scrolls.
 */
export function planColumnWidths(m: {
  containerW: number;
  buckets: number;
  figureChars: number;
  labelChars: number;
}): PlanColumnWidths {
  if (m.containerW <= 0)
    return { gutter: GUTTER_W, bucketMin: BUCKET_FALLBACK, narrow: false, fits: false, tight: false, totals: true };
  const needed = Math.min(GUTTER_W, Math.max(GUTTER_MIN, Math.ceil(m.labelChars * LABEL_CH) + LABEL_PAD));
  const at = (step: (typeof WIDTH_STEPS)[number]): PlanColumnWidths => {
    const bucketMin = step.tight
      ? Math.max(BUCKET_MIN_TIGHT, Math.ceil(m.figureChars * FIGURE_CH_TIGHT) + CELL_PAD_TIGHT)
      : Math.max(BUCKET_MIN, Math.ceil(m.figureChars * FIGURE_CH) + CELL_PAD);
    const free = m.containerW - (step.totals ? AGG_W : 0) - SCROLLBAR_W;
    const left = free - m.buckets * bucketMin;
    const gutter = Math.min(needed, Math.max(GUTTER_MIN, left));
    return {
      gutter,
      bucketMin,
      narrow: (free - gutter) / Math.max(1, m.buckets) < NARROW_BELOW,
      fits: left >= GUTTER_MIN,
      ...step,
    };
  };
  for (const step of WIDTH_STEPS) {
    const w = at(step);
    if (w.fits) return w;
  }
  return at(WIDTH_STEPS[0]);
}

/**
 * PG-2 · which measures an open material shows, remembered per browser. Only
 * ids the view offers are taken; anything else stored — or nothing — is the
 * default four.
 */
const MEASURES_KEY = 'paragon.planGrid.measures';
export const readOpenMeasures = (offered: readonly MeasureId[]): ReadonlySet<MeasureId> => {
  const fallback = new Set(DEFAULT_OPEN_MEASURES.filter((m) => offered.includes(m)));
  try {
    const raw = window.localStorage.getItem(MEASURES_KEY);
    if (raw === null) return fallback;
    const stored: unknown = JSON.parse(raw);
    if (!Array.isArray(stored)) return fallback;
    return new Set(offered.filter((m) => stored.includes(m)));
  } catch {
    return fallback;
  }
};

/**
 * PG-2 · what a row label and a cell ask of the grid they stand in: is this
 * material open, open or close it, and is a bucket column too narrow for a
 * marker's word. A context, not a prop — the engine's column objects must not
 * change when a material opens, or every cell would re-mount.
 */
export interface PlanRowsApi {
  isOpen(materialCode: string): boolean;
  toggle(materialCode: string): void;
  readonly narrow: boolean;
  /** PG-3 · the figures stand tight: 11px and 2px of padding a side. */
  readonly tight?: boolean;
  /** PG-3 · the totals pane stands; where it does not, a material's label states its total in its title. */
  readonly totals?: boolean;
}
export const PlanRowsContext = createContext<PlanRowsApi>({ isOpen: () => false, toggle: () => {}, narrow: false });

/**
 * PG-3 · in a narrow column a state is never colour alone (operator ruling): a
 * small mark stands in the cell's corner beside the colour — a tick where
 * committed, a paste mark where pasted, a bar where dismissed. It hangs in the
 * corner and takes none of the figure's width.
 */
const CELL_MARK = {
  committed: { Icon: Check, tone: 'text-success' },
  pasted: { Icon: ClipboardPaste, tone: 'text-warning-hover' },
  // FB-1 (operator ruling): a typed change is not told by its tint alone.
  planned: { Icon: Pencil, tone: 'text-info' },
  dismissed: { Icon: Ban, tone: 'text-text-tertiary' },
} as const;

// PLN-2 · the supplier's NAME, from the planning supplier master — never its id.
const supplierLabel = supplierNameOf;

/**
 * PLN-5 · THE Σ ON A MODELED FIGURE — a small glyph BEFORE the figure in a slot
 * of its own, so it can never overlap the number. The word ("Modeled") is the
 * glyph's accessible name and its title explains it. Exported for the row
 * label, which marks a modeled MEASURE even where every cell is a dash.
 */
export const ModeledMark: React.FC<{ quiet?: boolean }> = ({ quiet = false }) => {
  const { t } = useTranslation();
  // PG-2 · on a material's own row EVERY figure is the modeled shortfall, and the
  // column header says so once; the cell keeps the word for a screen reader only.
  if (quiet) {
    return (
      <span className="sr-only" data-testid="tp-modeled">
        {t('planGrid.tp.modeled')}
      </span>
    );
  }
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
  /** PG-2 · the material's own row: a short cell is tinted, and nothing else on the row carries ink. */
  summary?: boolean;
}> = ({ value, derived, planned, refusal, committed, dismissed, shortfall, summary = false }) => {
  const { t } = useTranslation();
  // PG-2 · in a narrow column a marker's WORD has no room beside the figure: the
  // word stays for a screen reader and in the cell's title, and the state is
  // shown by the cell — tinted where planned (amber where pasted), green where
  // committed, grey where dismissed.
  const { narrow, tight = false } = useContext(PlanRowsContext);
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
  const pasted = planned?.origin === 'PASTE';
  const tint = planned ? (narrow && pasted ? 'bg-warning-soft' : 'bg-info-soft') : summary && short ? 'bg-critical-soft' : '';
  const word = narrow ? 'sr-only' : 'text-label uppercase';
  const quiet = !planned && !short && (summary || (narrow && dismissed === true));
  const figure = short
    ? 'font-semibold !text-critical'
    : quiet
      ? '!text-text-tertiary'
      : narrow && committed && !planned
        ? '!text-success'
        : '';
  const mark: keyof typeof CELL_MARK | null = !narrow
    ? null
    : pasted
      ? 'pasted'
      : planned
        ? 'planned'
        : committed && !planned
          ? 'committed'
          : dismissed && !planned
            ? 'dismissed'
            : null;
  const Mark = mark ? CELL_MARK[mark].Icon : null;
  return (
    <div
      className={`relative flex h-full w-full items-center justify-end gap-1 overflow-hidden ${tight ? 'px-0.5' : narrow ? 'px-1' : 'px-2'} ${tint} ${refusal ? 'ring-1 ring-inset ring-critical/60' : flagged ? 'ring-1 ring-inset ring-warning' : ''}`}
      data-testid="tp-cell"
      data-narrow={narrow ? '' : undefined}
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
      {mark && Mark && (
        <span
          className={`pointer-events-none absolute left-px top-px ${CELL_MARK[mark].tone}`}
          data-testid="tp-cell-mark"
          data-mark={mark}
          aria-hidden="true"
        >
          <Mark size={9} strokeWidth={3} />
        </span>
      )}
      {flagged && (
        <span className="text-label text-warning-hover" data-testid="tp-cell-magnitude" aria-label={t('planGrid.edit.push.magnitudeUnconfirmed')}>
          ×?
        </span>
      )}
      {modeled && <ModeledMark quiet={summary || narrow} />}
      {refusal && (
        <span className="text-label text-critical" data-testid="tp-cell-refusal" aria-label={refusalText}>
          !
        </span>
      )}
      {planned && (
        <span
          className={`${word} text-info`}
          data-testid="tp-cell-planned"
          title={t('planGrid.edit.plannedTitle')}
        >
          {planned.origin === 'PASTE' ? t('planGrid.edit.externalShort') : t('planGrid.edit.plannedShort')}
        </span>
      )}
      {committed && !planned && (
        <span className={`${word} text-text-tertiary`} title={t('planGrid.plan.committed')} data-testid="tp-cell-committed">
          {narrow ? t('planGrid.plan.committed') : '✓'}
        </span>
      )}
      {dismissed && !planned && (
        <span
          className={`${word} text-text-tertiary`}
          data-testid="tp-cell-dismissed"
          title={t('planGrid.edit.dismissedTitle')}
        >
          {t('planGrid.edit.dismissedShort')}
        </span>
      )}
      {text === '—' ? (
        <span className="text-xs text-text-tertiary">{text}</span>
      ) : (
        <Data className={`tp-figure shrink-0 text-xs ${figure}`} data-testid={short ? 'tp-cell-short' : undefined}>
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
      summary={row.summary !== undefined}
    />
  );
};

/**
 * B3 · an EDITABLE cell. While the engine has it in focus it is a text field
 * holding the raw token; when focus leaves, a changed token becomes ONE
 * `GridEditRequest` (origin TYPED) to the overlay — never `setRowData`.
 * Escape abandons the edit.
 */
export const EditableBucketCell: React.FC<{
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
      // ⚠️ PLN-5 · THE FIELD HOLDS TODAY'S FIGURE BEFORE IT IS SELECTED. `text` is
      // state from the last time this cell was open; when its planned change
      // went away since (an undo, a Delete, a push that cleared it) the field
      // still held the old token, `select()` selected THAT, and React then wrote
      // the new one in — which drops the selection. The first key typed was then
      // APPENDED to the seam's figure: typing 6000 over 189,950 planned
      // 1,899,506,000 (browser QA). Writing the value first makes React's write a
      // no-op, so the selection — and the replace — survive.
      if (inputRef.current) inputRef.current.value = initial;
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
      className="h-full w-full bg-white px-1 text-right font-mono text-xs text-data-navy outline-none"
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
 * ⚠️ PLN-5 · THE LABEL IS NEVER TRUNCATED, AND THE CODE IS SAID ONCE.
 *
 * PG-2 · A MATERIAL IS ONE ROW, AND ITS LABEL OPENS IT. The material's own row
 * states the label, the code and the unit once, with why it is an exception and
 * how many changes are planned inside it; pressing it opens the material to its
 * measures. A row inside states only what tells it apart — its supplier and its
 * measure. In a narrow key column a label WRAPS to its second line; it is still
 * never cut, and its title holds it whole.
 */
export const PlanRowLabel: React.FC<{ row: PlanRow }> = ({ row }) => {
  const { t } = useTranslation();
  const rowsApi = useContext(PlanRowsContext);
  const draftApi = usePlanDraft();
  const spec = measureOf(row.measureId);
  const measure = t(spec.labelKey);
  const modeled = spec.derivation === 'derived' ? <ModeledMark /> : null;
  const supplier = row.supplierId ? supplierLabel(row.supplierId) : null;
  if (row.summary) {
    const open = rowsApi.isOpen(row.materialCode);
    const planned = draftApi ? row.summary.detailRefs.filter((ref) => draftApi.draft.entries.has(ref)).length : 0;
    // "Short" is the row's own figures, in red; the label adds what they cannot say.
    const reasons = row.summary.reasons.filter((r) => r !== 'short');
    const Chevron = open ? ChevronDown : ChevronRight;
    // PG-3 · where the totals pane gave its width up, the material's total is in its title.
    const shortTotal = Object.values(row.cells).reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
    const totalNote = rowsApi.totals === false ? ` · ${t('planGrid.tp.agg.shortTotal')}: ${formatNumber(shortTotal)}` : '';
    return (
      <RowButton
        padding="none"
        className="h-full"
        aria-expanded={open}
        onClick={() => rowsApi.toggle(row.materialCode)}
        title={`${row.materialLabel} · ${row.materialCode} · ${row.uom}${totalNote}`}
        data-testid="tp-row-label"
        data-head="true"
        data-material={row.materialCode}
      >
        <span className="flex min-w-0 items-center gap-1 px-1">
          <Chevron size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
          <span className="min-w-0 text-xs leading-[13px]">
            <span className="font-semibold text-text-primary" data-testid="tp-material-label">
              {row.materialLabel}
            </span>{' '}
            <Data className="text-text-tertiary">{row.materialCode}</Data>
            <span className="text-text-tertiary"> · {row.uom}</span>
            {reasons.map((r) => (
              <span key={r} className="text-warning-hover" data-testid="tp-exception-reason" title={t(`planGrid.tp.exc.${r}Title`)}>
                {' · '}
                {t(`planGrid.tp.exc.${r}`)}
              </span>
            ))}
            {planned > 0 && (
              <span className="text-info" data-testid="tp-summary-planned">
                {' · '}
                {t('planGrid.tp.plannedInside', { count: planned, n: formatNumber(planned) })}
              </span>
            )}
          </span>
        </span>
      </RowButton>
    );
  }
  if (supplier) {
    return (
      <span
        className="block w-full min-w-0 pl-6 pr-1 text-xs leading-[13px]"
        data-testid="tp-supplier-row-label"
        title={t('planGrid.tp.supplierRow', { measure, supplier })}
      >
        <span className="text-text-secondary" data-testid="tp-supplier-name">
          {supplier}
        </span>{' '}
        <span className="text-text-tertiary">
          · <span data-testid="tp-measure">{measure}</span>
        </span>
        {modeled}
      </span>
    );
  }
  return (
    <div className="flex w-full min-w-0 items-center gap-1 pl-6 pr-1 text-xs text-text-secondary" data-testid="tp-row-label">
      <span data-testid="tp-measure">{measure}</span>
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
  /** PG-1 · list only the materials short in the horizon's FIRST bucket — this month, or this week. */
  shortNow?: boolean;
  /** PG-1 · the page's "About this data" is open: the sample statement and the edit hint show. */
  aboutOpen?: boolean;
}> = ({ viewId, currentGrain = 'month', shortNow = false, aboutOpen = false }) => {
  const { t, i18n } = useTranslation();
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
  // PG-1 · the planned-changes list, in a drawer — closed until the planner opens it.
  const [changesOpen, setChangesOpen] = useState(false);
  // PG-2 · a push from the bar that still owes a reason opens the drawer ON the question.
  const [reasonAsked, setReasonAsked] = useState(0);
  // PG-2 · which materials are open (none, on arrival) and which measures an open one shows.
  const [openMaterials, setOpenMaterials] = useState<ReadonlySet<string> | 'all'>(() => new Set());
  const [openMeasures, setOpenMeasuresState] = useState<ReadonlySet<MeasureId>>(() => readOpenMeasures(measures));
  const setOpenMeasures = (next: ReadonlySet<MeasureId>) => {
    setOpenMeasuresState(next);
    try {
      window.localStorage.setItem(MEASURES_KEY, JSON.stringify([...next]));
    } catch {
      // a private window: the choice lasts for the page
    }
  };
  const [measuresMenu, setMeasuresMenu] = useState(false);
  const measuresButtonRef = useRef<HTMLSpanElement>(null);
  const [density, setDensityState] = useState<PlanDensity>(readDensity);
  const setDensity = (next: PlanDensity) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(DENSITY_KEY, next);
    } catch {
      // a private window: the choice lasts for the page
    }
  };
  const [sort, setSort] = useState<PlanSort>(DEFAULT_PLAN_SORT);
  // PLN-1 · a paste note describes the rows it was made against; a new filter
  // or order is a different set of rows, so the note goes — and so does a key note.
  useEffect(() => {
    setPasteNote(null);
    setKeyNote(null);
  }, [filter, sort]);
  // PG-1 · the publication is one line in the strip; its panel opens in a drawer.
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
  // PG-1 · "this month" is the horizon's first bucket: the horizon starts at the present.
  const nowBucket = horizon[0];
  const viewFilter = useMemo<PlanFilter>(
    () => ({ ...filter, shortIn: shortNow ? nowBucket : null }),
    [filter, shortNow, nowBucket],
  );
  const visible = useMemo(() => applyPlanView(blocks, viewFilter, sort), [blocks, viewFilter, sort]);
  const shortNowCount = useMemo(() => blocks.filter((b) => isShortIn(b, nowBucket)).length, [blocks, nowBucket]);
  // PG-1 · alternate MATERIALS, not rows: the band is what keeps a material's rows together to the eye.
  const bandOf = useMemo(() => new Map(visible.map((b, i) => [b.materialCode, i % 2 === 1])), [visible]);
  // PG-2 · what the grid RENDERS: one row per material, and an open material's chosen measures.
  const layout = useMemo<PlanLayout>(() => ({ open: openMaterials, measures: openMeasures }), [openMaterials, openMeasures]);
  const rows = useMemo(() => flattenPlanRows(visible, layout, horizon) as PlanRow[], [visible, layout, horizon]);
  // …and what an EDIT is measured against: every row, open or not (a sibling
  // supplier's allocation counts whether or not it is in sight).
  const allRows = useMemo(() => flattenPlanRows(visible), [visible]);
  const blockOf = useMemo(() => new Map(visible.map((b) => [b.materialCode, b])), [visible]);
  const openCount = openMaterials === 'all' ? visible.length : visible.filter((b) => openMaterials.has(b.materialCode)).length;
  const rowsApi = useMemo<PlanRowsApi>(
    () => ({
      isOpen: (code) => openMaterials === 'all' || openMaterials.has(code),
      toggle: (code) =>
        setOpenMaterials((cur) => {
          // "All open" is every material of the list as it stands; closing one names the rest.
          const next = new Set(cur === 'all' ? visible.map((b) => b.materialCode) : cur);
          if (next.has(code)) next.delete(code);
          else next.add(code);
          return next;
        }),
      narrow: false,
    }),
    [openMaterials, visible],
  );
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
  editContextRef.current = { rows: allRows, totalOf };
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
  const push = usePushTargets(selectedRefs);

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
      // The engine's own selection, read at the moment of the copy — what it copies.
      const sel = gridRef.current?.selection;
      const n = sel ? (sel.max.row - sel.min.row + 1) * (sel.max.col - sel.min.col + 1) : 1;
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

  // PG-2 · the widths: what the view is wide, what its widest figure and its
  // longest label need. Measured on the VIEW (never on the grid, whose own width
  // these decide), and re-measured when the window changes.
  const [containerW, setContainerW] = useState(0);
  // Set once the first measurement has been TAKEN, whatever it returned: where
  // nothing is laid out (jsdom) the width stays 0 and the grid still mounts.
  const [measured, setMeasured] = useState(false);
  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const measure = () => setContainerW((cur) => (cur === el.clientWidth ? cur : el.clientWidth));
    measure();
    setMeasured(true);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const plannedValues = draftApi?.draft.entries;
  const figureChars = useMemo(() => {
    let widest = widestFigure(blocks, formatNumber);
    for (const e of plannedValues?.values() ?? []) widest = Math.max(widest, formatNumber(e.value).length);
    return widest;
  }, [blocks, plannedValues]);
  const labelChars = useMemo(() => {
    let widest = 0;
    for (const b of blocks) {
      widest = Math.max(widest, `${b.materialLabel} ${b.materialCode} · ${b.uom}`.length);
      for (const r of b.rows) if (r.supplierId) widest = Math.max(widest, supplierLabel(r.supplierId).length + 4);
    }
    return widest;
  }, [blocks]);
  const widths = useMemo(
    () => planColumnWidths({ containerW, buckets: horizon.length, figureChars, labelChars }),
    [containerW, horizon.length, figureChars, labelChars],
  );
  const rowsContext = useMemo<PlanRowsApi>(
    () => ({ ...rowsApi, narrow: widths.narrow, tight: widths.tight, totals: widths.totals }),
    [rowsApi, widths.narrow, widths.tight, widths.totals],
  );
  // ⚠️ THE ENGINE KEEPS THE COLUMN SIZES IT WAS MOUNTED WITH (found in the
  // browser: a view opened on cached facts mounted at the unmeasured widths and
  // stayed 1,877px wide in a 1,054px box, with the sideways scroll switched off
  // over it). So the grid is not mounted until the view has been measured, and
  // it is mounted afresh when the widths change — a window resized, not a
  // material opened. The measurement is taken before the first paint, so the
  // wait is never seen.
  const widthsKey = `${widths.gutter}:${widths.bucketMin}:${widths.totals ? 't' : ''}`;
  // PG-3 · a fresh mount starts at the top with nothing selected: where the
  // planner was — the scroll position and the selection — is put back on it.
  const place = useKeepPlace(widthsKey, wrapRef, gridRef);
  const language = i18n.language;

  const columns: Column<PlanRow>[] = useMemo(
    () =>
      horizon.map((bucket, i) => ({
        id: `bucket:${bucket}`,
        // PG-2 · "Oct", not "2026-10": twelve of them fit. The year is said on the
        // first column and where it turns; the bucket's id is the title. The
        // present bucket — the one "Shortages this month" reads — is marked.
        title: (
          <span
            className={`block w-full text-center ${bucket === nowBucket ? 'font-semibold text-navy underline' : ''}`}
            title={bucket}
            data-testid="tp-bucket-head"
            data-bucket={bucket}
            data-now={bucket === nowBucket ? '' : undefined}
          >
            <Data className="text-xs">{formatBucketShort(bucket, i === 0 || /-(01|W01)$/.test(bucket))}</Data>
          </span>
        ),
        // THE REGISTRY DECIDES: only a cell `isEditableCell` admits can enter
        // edit mode, and only while a draft exists to receive the edit.
        disabled: ({ rowData }: { rowData: PlanRow }) => !hasDraft || !isEditableCell(rowData, bucket),
        minWidth: widths.bucketMin,
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
    [horizon, generated, hasDraft, widths.bucketMin, nowBucket, language],
  );

  const gutter = useMemo(
    () => ({
      title: (
        <span className="flex items-center gap-1 px-2 text-xs" data-testid="tp-key-header">
          {t('planGrid.tp.keyColumn')}
          <ModeledMark />
        </span>
      ),
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
      basis: widths.gutter,
      minWidth: widths.gutter,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => <PlanRowLabel row={rowData} />,
    }),
    [t, widths.gutter],
  );

  // PLN-5 · the horizon totals, each sub-column LABELLED in the header.
  // PG-2 · two of them — the shortfall over the horizon and the first short
  // bucket — on the material's own row. Demand and confirmed are per bucket
  // inside the material; why it is an exception is said on its label.
  const aggregates = useMemo(
    () => ({
      title: (
        <div className="grid w-full grid-cols-[minmax(0,1fr)_34px] gap-1 px-1 text-right text-label leading-[12px]" data-testid="tp-agg-header" title={t('planGrid.tp.aggregates')}>
          <span>{t('planGrid.tp.agg.shortTotal')}</span>
          <span>{t('planGrid.tp.agg.firstShort')}</span>
        </div>
      ),
      basis: AGG_W,
      minWidth: AGG_W,
      grow: 0,
      shrink: 0,
      component: ({ rowData }: { rowData: PlanRow }) => {
        const b = rowData.summary ? blockOf.get(rowData.materialCode) : undefined;
        if (!b) return <span />;
        return (
          <div className="grid w-full grid-cols-[minmax(0,1fr)_34px] items-center gap-1 px-1 text-right text-xs" data-testid="tp-aggregates">
            <Data className={(b.agg.deficit ?? 0) > 0 ? 'font-semibold !text-critical' : '!text-text-tertiary'}>
              {planCellText(b.agg.deficit, formatNumber)}
            </Data>
            <Data title={b.agg.firstShortBucket ?? undefined} className={b.agg.firstShortBucket ? '' : '!text-text-tertiary'}>
              {b.agg.firstShortBucket ? formatBucketShort(b.agg.firstShortBucket) : '—'}
            </Data>
          </div>
        );
      },
    }),
    [t, blockOf, language],
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
    <div ref={viewRef} data-testid={`tp-view-${viewId}`} data-grain={grain} data-short-now={shortNow ? nowBucket : undefined}>
      {/* SIMULATED while the SOMO fixture feeds it, and what is editable here.
          PG-1: both are part of "About this data" — always in the DOM, shown
          when the planner asks. The page's sample marker is always in sight. */}
      <div hidden={!aboutOpen} data-testid="tp-about">
        <Notice
          tone="sample"
          className="mb-2"
          title={t('planGrid.tp.banner.title')}
          action={<LivenessPill capability="forecastPublications" />}
          data-testid="tp-banner"
        >
          {t('planGrid.tp.banner.body')}
        </Notice>
        <p className="mb-2 text-xs text-text-secondary" data-testid="tp-edit-hint">
          {t('planGrid.edit.hint', { measures: editableLabels })}
        </p>
      </div>

      {/* PG-1 · THE SUMMARY STRIP — one line where three notices, a panel and a
          hint stood: what this view lists, how much of it is short now, where
          the forecast stands, and what the last key or paste did. */}
      <Card padding="none" className="mb-2" data-testid="tp-strip">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs text-text-secondary">
        {materialType && (
          <span data-testid="tp-view-type" data-material-type={materialType} className="font-semibold text-text-primary">
            {t(materialType === 'ROH' ? 'planGrid.tp.filter.rm' : 'planGrid.tp.filter.pm')}
            {' · '}
            {t(grain === 'month' ? 'planGrid.tp.typeMonthly' : 'planGrid.tp.typeWeekly')}
          </span>
        )}
        <span data-testid="tp-short-now" className={shortNowCount > 0 ? 'font-semibold text-critical' : ''}>
          {t('planGrid.strip.shortNow', { count: shortNowCount, n: formatNumber(shortNowCount), bucket: nowBucket })}
        </span>
        <span data-testid="tp-summary">
          {t('planGrid.tp.summary', {
            materials: formatNumber(visible.length),
            rows: formatNumber(rows.length),
            exceptions: formatNumber(exceptionCount),
          })}
          {viewFilter.exceptionsOnly ? ` · ${t('planGrid.tp.exceptionsOrder')}` : ''}
        </span>
        <span className="ml-auto flex min-w-0 items-center gap-2">
          <PublicationSummary grain={grain} />
          <LinkButton
            className="shrink-0"
            aria-expanded={publicationOpen}
            onClick={() => setPublicationOpen(true)}
            data-testid="publication-toggle"
          >
            {t('planGrid.publication.title')}
          </LinkButton>
        </span>
        </div>
      </Card>

      <div className="mb-2 flex flex-wrap items-end gap-3 text-sm">
        <FormField label={t('planGrid.tp.search')} className="min-w-[16rem]">
          <TextInput
            type="text"
            data-testid="tp-search"
            value={filter.search}
            placeholder={t('planGrid.tp.searchPlaceholder')}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </FormField>
        <FormField label={t('planGrid.tp.sortBy')}>
          <div className="flex gap-1">
            <Select
              data-testid="tp-sort-col"
              className="flex-1"
              value={sort.colId}
              disabled={filter.exceptionsOnly}
              onChange={(e) => setSort({ ...sort, colId: e.target.value as PlanSortColumn })}
            >
              {sortColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.labelKey)}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              data-testid="tp-sort-dir"
              disabled={filter.exceptionsOnly}
              onClick={() => setSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
            >
              {t(sort.dir === 'asc' ? 'planGrid.tp.asc' : 'planGrid.tp.desc')}
            </Button>
          </div>
        </FormField>
        {/* PG-2 · what an open material shows, and every material open or closed at once. */}
        <div className="flex flex-col gap-1" data-testid="tp-measures">
          <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.measures.label')}</span>
          <div className="flex items-center gap-2">
            <span ref={measuresButtonRef} className="inline-flex">
              <Button
                variant="secondary"
                aria-haspopup="dialog"
                aria-expanded={measuresMenu}
                onClick={() => setMeasuresMenu(true)}
                data-testid="tp-measures-button"
              >
                {t('planGrid.tp.measures.button', { shown: formatNumber(openMeasures.size), total: formatNumber(measures.length) })}
              </Button>
            </span>
            <LinkButton
              onClick={() => setOpenMaterials(openCount > 0 ? new Set() : 'all')}
              data-testid="tp-open-all"
              data-open={openCount}
            >
              {t(openCount > 0 ? 'planGrid.tp.closeAll' : 'planGrid.tp.openAll')}
            </LinkButton>
          </div>
        </div>
        <div className="flex flex-col gap-1" role="group" aria-label={t('planGrid.tp.density')} data-testid="tp-density" data-density={density}>
          <span className="text-label uppercase text-text-tertiary">{t('planGrid.tp.density')}</span>
          <div className="flex gap-1">
            {(['compact', 'comfortable'] as const).map((d) => (
              <ToggleChip key={d} selected={density === d} onClick={() => setDensity(d)} data-testid={`tp-density-${d}`}>
                {t(`planGrid.tp.density.${d}`)}
              </ToggleChip>
            ))}
          </div>
        </div>
        {/* ONE line beside the filters for what the last key or paste did — a
            refusal, a delete, an undo, a copy — with its reason. */}
        <div className="ml-auto min-w-0 pb-2 text-right text-xs">
          {pasteNote && (
            <p className="text-text-secondary" data-testid="tp-paste-note">
              {t('planGrid.edit.pasteNote', {
                planned: formatNumber(pasteNote.planned),
                refused: formatNumber(pasteNote.refused),
                outside: formatNumber(pasteNote.outside),
              })}
            </p>
          )}
          {keyNote && (
            <p
              className={keyNote.kind === 'refused' ? 'font-medium text-critical' : 'text-text-secondary'}
              data-testid="tp-key-note"
              data-kind={keyNote.kind}
              role="status"
            >
              {keyNoteText(keyNote)}
            </p>
          )}
        </div>
      </div>

      {factsQuery.data?.horizonRefusal || !generated.ok ? (
        <p className="text-sm text-critical" data-testid="tp-refused">
          {t('planGrid.tp.refused', {
            reason: factsQuery.data?.horizonRefusal?.reason ?? (generated.ok ? '' : generated.reason),
          })}
        </p>
      ) : factsQuery.isLoading || !measured ? (
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
          data-density={density}
          data-fits={widths.fits ? '' : undefined}
          data-narrow={widths.narrow ? '' : undefined}
          data-tight={widths.tight ? '' : undefined}
          data-totals={widths.totals ? undefined : 'folded'}
          onScrollCapture={(ev) => {
            const el = ev.target as HTMLElement;
            if (el.classList?.contains('dsg-container')) place.onScroll(el);
          }}
          style={{ '--plan-dsg-h': `${gridH}px` } as React.CSSProperties}
        >
          <PlanRowsContext.Provider value={rowsContext}>
          <DataSheetGrid<PlanRow>
            key={widthsKey}
            ref={gridRef}
            onActiveCellChange={({ cell }) => {
              place.onActive(cell);
              // PLN-5 · a key note speaks of the cell it was made in; moving on retires it.
              setKeyNote((n) => (n?.kind === 'copied' ? n : null));
              const i = cell ? horizon.indexOf((cell.colId ?? '').replace(/^bucket:/, '')) : -1;
              setSelection(cell && i >= 0 ? { r0: cell.row, r1: cell.row, c0: i, c1: i } : null);
            }}
            onSelectionChange={({ selection: s }) => {
              place.onSelection(s);
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
            stickyRightColumn={widths.totals ? aggregates : undefined}
            rowKey="id"
            lockRows
            disableContextMenu
            rowHeight={ROW_H[density]}
            rowClassName={({ rowData }) =>
              `${bandOf.get(rowData.materialCode) ? 'tp-band' : ''} ${rowData.blockHead ? 'tp-head' : 'tp-detail'}`.trim() || undefined
            }
            headerRowHeight={36}
            height={gridH}
          />
          </PlanRowsContext.Provider>
        </div>
      )}

      {/* ⚠️ PLN-4 · THE PLANNED CHANGES NEVER SIT ABOVE THE GRID. Above, fifty
          rows pushed it 2,743 px down the page (measured on built main). The
          sticky bar stays in sight and takes none of the grid's height.
          PG-1 · and the list is a DRAWER now, with the publication's: below the
          grid it made the page scroll. */}
      <PlannedChangesBar
        selectedRefs={selectedRefs}
        open={changesOpen && push.count > 0}
        onToggle={() => setChangesOpen((o) => !o)}
        onAskReason={() => {
          setChangesOpen(true);
          setReasonAsked((n) => n + 1);
        }}
      />
      <SidePanel
        wide="table"
        open={changesOpen && push.count > 0}
        onClose={() => setChangesOpen(false)}
        title={t('planGrid.edit.changesTitle')}
        footerActions={push.any && push.api ? <PlanPushControls selectedRefs={selectedRefs} asked={reasonAsked} /> : undefined}
      >
        <PlannedChangesDetails open />
      </SidePanel>
      <SidePanel wide open={publicationOpen} onClose={() => setPublicationOpen(false)} title={t('planGrid.publication.title')}>
        <PublicationPanel grain={grain} bare />
      </SidePanel>
      {/* PG-2 · the measures menu — the shared pop-up, hung from its button. */}
      <Dialog
        anchor={measuresButtonRef}
        open={measuresMenu}
        onClose={() => setMeasuresMenu(false)}
        title={t('planGrid.tp.measures.title')}
        testId="tp-measures-menu"
        widthClass="max-w-xs"
      >
        <div className="flex flex-col gap-2">
          {measures.map((m) => (
            <Checkbox
              key={m}
              data-testid={`tp-measure-${m}`}
              checked={openMeasures.has(m)}
              onChange={(e) => {
                const next = new Set(openMeasures);
                if (e.target.checked) next.add(m);
                else next.delete(m);
                // kept in the view's own order, whatever order they were ticked in
                setOpenMeasures(new Set(measures.filter((x) => next.has(x))));
              }}
            >
              {t(m === 'confirmedDeficit' ? 'planGrid.tp.measures.shortBySupplier' : measureOf(m).labelKey)}
            </Checkbox>
          ))}
          <p className="text-xs text-text-tertiary" data-testid="tp-measures-note">
            {t('planGrid.tp.measures.note')}
          </p>
        </div>
      </Dialog>
    </div>
  );
};

export default TimePhasedGrid;
