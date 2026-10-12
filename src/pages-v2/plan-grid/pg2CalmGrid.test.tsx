// ────────────────────────────────────────────────────────────────────────────
// PG-2 · the plan grid itself is calm (R-PG proposals 3, 4, 5 and 8; operator
// rulings of 11 October 2026).
//
// Measured on built main after PG-1: 582 materials were 4,084 rows, four of
// twelve months stood in a 1600-wide window and two in a 1366-wide one, and
// every edited line pushed was refused for a reason nobody had been asked for.
// What this file holds is what replaced that — one row per material, the
// measures an open one shows, the widths that fit the horizon, and the reason
// asked before the push — each against the real seam.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { screen, fireEvent, within, waitFor, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import PlanGrid from '../PlanGrid';
import Dialog, { anchoredPlace } from '../../components/ui-v2/Dialog';
import Button from '../../components/ui-v2/Button';
import SidePanel from '../../components/ui-v2/SidePanel';
import IdentityPanel from '../../components/layout-v2/IdentityPanel';
import TimePhasedGrid, {
  PlanBucketCell,
  PlanRowLabel,
  PlanRowsContext,
  planColumnWidths,
  readOpenMeasures,
  type PlanRowsApi,
} from './TimePhasedGrid';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import { EMPTY_DRAFT, applyEdit, fillMissingReasons, reasonMissing, setReason } from './planDraft';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { SAMPLE_PEOPLE } from '../../services/identity/sampleRoster';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS, viewGrainAndHorizon } from '../../services/planning/views';
import type { MeasureId } from '../../services/planning/measures';
import { formatBucketShort, formatNumber } from '../../lib/format';
import { planGridEn, planGridId } from '../../lib/i18n/planGrid';
import { visibleMeasures } from './visibleMeasures';
import {
  DEFAULT_OPEN_MEASURES,
  blocksOfViewType,
  buildPlanBlocks,
  exceptionReasons,
  flattenPlanRows,
  isShortIn,
  summaryRowOf,
  widestFigure,
  type PlanBlock,
  type PlanRow,
} from './planGridModel';

const PLANNING_1: CurrentIdentity = {
  ...BUYER,
  businessRoles: ['planning'],
  actor: { kind: 'RESOLVED', person: { personId: SAMPLE_PEOPLE.find((p) => p.role === 'planning' && p.ordinal === 1)!.personId } },
};

afterEach(async () => {
  await i18n.changeLanguage('en');
  window.localStorage.removeItem('paragon.planGrid.measures');
});

/** What the raw-material plan lists — the grid's own pipeline, over the real seam. */
const rmBlocks = async (): Promise<{ blocks: readonly PlanBlock[]; horizon: readonly string[]; measures: readonly MeasureId[] }> => {
  const v = VIEWS.find((x) => x.viewId === 'rm-plan')!;
  const { grain, horizonLength, materialType } = viewGrainAndHorizon(v, 'month');
  const horizon = somoHorizon(grain).slice(0, horizonLength);
  const measures = visibleMeasures(v.measuresShown);
  const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon, measures });
  return { blocks: blocksOfViewType(buildPlanBlocks(page.items, horizon, measures), materialType), horizon, measures };
};

// ─── 1 · one row per material ───────────────────────────────────────────────

describe('PG-2 · a material is ONE row — its shortfall per bucket, summed over its suppliers', () => {
  it('⚠ POPULATION CONTROL — the seam holds materials with several shortfall rows, with none, and short and not', async () => {
    const { blocks, horizon } = await rmBlocks();
    const shortRows = (b: PlanBlock) => b.rows.filter((r) => r.measureId === 'confirmedDeficit').length;
    expect(blocks.length).toBeGreaterThan(100);
    // a sum over ONE row could not tell a sum from a copy
    expect(blocks.filter((b) => shortRows(b) > 1).length).toBeGreaterThan(5);
    expect(blocks.filter((b) => b.exceptions.shortfall).length).toBeGreaterThan(5);
    expect(blocks.filter((b) => !b.exceptions.shortfall).length).toBeGreaterThan(5);
    expect(horizon).toHaveLength(12);
  });

  it('cell by cell: the row is the sum of the shortfall rows the block holds — and "no figure" stays no figure', async () => {
    const { blocks, horizon } = await rmBlocks();
    let nulls = 0;
    let sums = 0;
    for (const b of blocks) {
      const row = summaryRowOf(b, horizon);
      const short = b.rows.filter((r) => r.measureId === 'confirmedDeficit');
      for (const bucket of horizon) {
        const present = short.map((r) => r.cells[bucket]).filter((v): v is number => typeof v === 'number');
        const expected = present.length === 0 ? null : present.reduce((a, c) => a + c, 0);
        expect(row.cells[bucket], `${b.materialCode} ${bucket}`).toBe(expected);
        if (expected === null) nulls++;
        else if (present.length > 1) sums++;
      }
      // the row, the view and the total read the same rows: they cannot disagree
      const total = horizon.reduce((a, bucket) => a + (row.cells[bucket] ?? 0), 0);
      expect(total, b.materialCode).toBe(b.agg.deficit ?? 0);
      for (const bucket of horizon) expect((row.cells[bucket] ?? 0) > 0, `${b.materialCode} ${bucket}`).toBe(isShortIn(b, bucket));
    }
    // both shapes were really met, or the assertions above ran over one of them only
    expect(nulls).toBeGreaterThan(0);
    expect(sums).toBeGreaterThan(0);
  });

  it('the row is the material’s, never a measure’s: not editable, anchored to nothing, and it knows what is inside', async () => {
    const { blocks, horizon } = await rmBlocks();
    const b = blocks.find((x) => x.rows.some((r) => r.seamRefs))!;
    const row = summaryRowOf(b, horizon);
    expect(row.id).toBe(`${b.materialCode}|summary`);
    expect(row.supplierId).toBeNull();
    expect(row.seamRefs).toBeUndefined();
    expect(row.blockHead).toBe(true);
    expect(row.summary!.reasons).toEqual(exceptionReasons(b.exceptions));
    const refs = b.rows.flatMap((r) => Object.values(r.seamRefs ?? {}));
    expect(refs.length).toBeGreaterThan(0);
    expect([...row.summary!.detailRefs].sort()).toEqual([...refs].sort());
    // an edit aimed at it is refused as the portal's own figure
    const refused = applyEdit(EMPTY_DRAFT, row, horizon[0], '5', 'TYPED', 'en');
    expect(refused.entries.size).toBe(0);
    expect([...refused.refusals.values()][0]).toMatchObject({ reason: 'READ_ONLY', source: 'PORTAL' });
  });

  it('closed, the grid is one row per material; open, a material shows the chosen measures and nothing else', async () => {
    const { blocks, horizon } = await rmBlocks();
    const chosen = new Set<MeasureId>(['demand', 'allocation']);
    const closed = flattenPlanRows(blocks, { open: new Set(), measures: chosen }, horizon);
    expect(closed).toHaveLength(blocks.length);
    expect(closed.every((r) => r.summary !== undefined)).toBe(true);
    expect(closed.map((r) => r.materialCode)).toEqual(blocks.map((b) => b.materialCode));

    const target = blocks.find((b) => b.rows.some((r) => r.measureId === 'allocation') && b.rows.some((r) => r.measureId === 'confirmed'))!;
    const one = flattenPlanRows(blocks, { open: new Set([target.materialCode]), measures: chosen }, horizon);
    const inside = one.filter((r) => r.materialCode === target.materialCode && !r.summary);
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.map((r) => r.id)).toEqual(target.rows.filter((r) => chosen.has(r.measureId)).map((r) => r.id));
    expect(new Set(inside.map((r) => r.measureId))).toEqual(chosen);
    // exactly one head per material — the engine draws its rule above a head
    expect(one.filter((r) => r.blockHead)).toHaveLength(blocks.length);
    expect(one).toHaveLength(blocks.length + inside.length);
    // every other material is still its one row
    expect(one.filter((r) => r.materialCode !== target.materialCode)).toHaveLength(blocks.length - 1);

    // KNOWN-GOOD: with no measure chosen an open material is still its one row
    expect(flattenPlanRows(blocks, { open: 'all', measures: new Set() }, horizon)).toHaveLength(blocks.length);
    // and "all" opens every material
    const all = flattenPlanRows(blocks, { open: 'all', measures: chosen }, horizon);
    expect(all.length).toBe(blocks.length + blocks.reduce((n, b) => n + b.rows.filter((r) => chosen.has(r.measureId)).length, 0));
  });

  it('without a layout the rows are every row, as built — what an edit is measured against', async () => {
    const { blocks } = await rmBlocks();
    const all = flattenPlanRows(blocks);
    expect(all).toHaveLength(blocks.reduce((n, b) => n + b.rows.length, 0));
    expect(all.some((r) => r.summary)).toBe(false);
    // WHY it matters: an allocation is refused when the material's suppliers would
    // hold more than SOMO's total, and a sibling supplier's row is not among the
    // rows of a CLOSED material — measured against those, the sum would miss it.
    const closed = flattenPlanRows(blocks, { open: new Set(), measures: new Set(DEFAULT_OPEN_MEASURES) }, []);
    expect(all.filter((r) => r.measureId === 'allocation').length).toBeGreaterThan(10); // population control
    expect(closed.filter((r) => r.measureId === 'allocation')).toEqual([]);
    const grid = readFileSync(resolve(__dirname, 'TimePhasedGrid.tsx'), 'utf8');
    expect(grid).toMatch(/const allRows = useMemo\(\(\) => flattenPlanRows\(visible\), \[visible\]\);/);
    expect(grid).toMatch(/editContextRef\.current = \{ rows: allRows, totalOf \};/);
  });
});

// ─── 2 · the label and the cells of the one row ─────────────────────────────

describe('PG-2 · the material’s row opens on its own label, and only a shortage carries ink', () => {
  const api = (open: boolean, toggle = vi.fn(), narrow = false): PlanRowsApi => ({ isOpen: () => open, toggle, narrow });
  const block = async (pick: (b: PlanBlock) => boolean) => {
    const { blocks, horizon } = await rmBlocks();
    const b = blocks.find(pick)!;
    expect(b).toBeDefined(); // population control
    return { b, horizon, row: summaryRowOf(b, horizon) };
  };

  it('the label is a button that says whether the material is open, and pressing it asks the grid to toggle that material', async () => {
    const { row } = await block((b) => b.exceptions.shortfall);
    const toggle = vi.fn();
    const { rerender } = renderWithProviders(
      <PlanRowsContext.Provider value={api(false, toggle)}>
        <PlanRowLabel row={row} />
      </PlanRowsContext.Provider>,
    );
    const label = screen.getByTestId('tp-row-label');
    expect(label.tagName).toBe('BUTTON');
    expect(label).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(label);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledWith(row.materialCode);
    rerender(
      <PlanRowsContext.Provider value={api(true, toggle)}>
        <PlanRowLabel row={row} />
      </PlanRowsContext.Provider>,
    );
    expect(screen.getByTestId('tp-row-label')).toHaveAttribute('aria-expanded', 'true');
  });

  it('why it is an exception is said on the row — awaiting and stale in words; "short" is its own red figures', async () => {
    const { row: awaiting } = await block((b) => b.exceptions.awaiting && !b.exceptions.shortfall);
    renderWithProviders(<PlanRowLabel row={awaiting} />);
    expect(screen.getAllByTestId('tp-exception-reason').map((e) => e.textContent!.replace(/^ · /, ''))).toEqual(['Awaiting']);

    const { row: short } = await block((b) => b.exceptions.shortfall && !b.exceptions.awaiting && !b.exceptions.stale);
    const { container } = renderWithProviders(<PlanRowLabel row={short} />);
    expect(within(container).queryByTestId('tp-exception-reason')).toBeNull();
  });

  it('a closed material says how many changes are planned inside it', async () => {
    const { blocks, horizon } = await rmBlocks();
    const b = blocks.find((x) => x.rows.some((r) => r.measureId === 'acceptedQty' && horizon.some((k) => r.seamRefs?.[k] && r.committedCells?.[k] === false)))!;
    const accepted = b.rows.find((r) => r.measureId === 'acceptedQty')!;
    const buckets = horizon.filter((k) => accepted.seamRefs?.[k] && accepted.committedCells?.[k] === false).slice(0, 1);
    expect(buckets).toHaveLength(1); // population control
    const Seed: React.FC = () => {
      const draft = usePlanDraft()!;
      return (
        <button type="button" onClick={() => draft.edit(accepted, buckets[0], '77', 'TYPED')}>
          seed
        </button>
      );
    };
    renderWithProviders(
      <PlanDraftProvider>
        <Seed />
        <PlanRowLabel row={summaryRowOf(b, horizon)} />
      </PlanDraftProvider>,
    );
    expect(screen.queryByTestId('tp-summary-planned')).toBeNull();
    fireEvent.click(screen.getByText('seed'));
    expect(screen.getByTestId('tp-summary-planned').textContent).toBe(' · 1 planned');
  });

  it('on the material’s row a shortage is tinted and red; a zero and a dash are grey — and the Σ is said once, in the header', () => {
    const { container: short } = renderWithProviders(<PlanBucketCell value={500} derived shortfall summary />);
    const cell = within(short).getByTestId('tp-cell');
    expect(cell.className).toMatch(/\bbg-critical-soft\b/);
    expect(within(short).getByTestId('tp-cell-short').className).toMatch(/text-critical/);
    // the word is there for a screen reader; the glyph is not repeated on every figure
    expect(within(short).getByTestId('tp-modeled').className).toBe('sr-only');
    expect(short.querySelector('svg')).toBeNull();

    for (const v of [0, null]) {
      const { container } = renderWithProviders(<PlanBucketCell value={v} derived shortfall summary />);
      expect(within(container).getByTestId('tp-cell').className).not.toMatch(/bg-critical-soft/);
      expect(within(container).queryByTestId('tp-cell-short')).toBeNull();
    }
    const { container: zero } = renderWithProviders(<PlanBucketCell value={0} derived shortfall summary />);
    expect(zero.querySelector('.font-mono')!.className).toMatch(/text-text-tertiary/);
    // KNOWN-GOOD: inside a material (not the summary row) a modeled figure keeps its glyph and no tint
    const { container: inside } = renderWithProviders(<PlanBucketCell value={500} derived shortfall />);
    expect(within(inside).getByTestId('tp-cell').className).not.toMatch(/bg-critical-soft/);
    expect(inside.querySelector('svg')).not.toBeNull();
  });

  it('in a NARROW column a marker’s word is kept for a screen reader and the cell shows the state; wide, the word is printed', async () => {
    const { blocks, horizon } = await rmBlocks();
    const row = blocks.flatMap((b) => b.rows).find((r) => r.measureId === 'acceptedQty' && horizon.some((k) => r.seamRefs?.[k] && r.committedCells?.[k] === false))!;
    const bucket = horizon.find((k) => row.seamRefs?.[k] && row.committedCells?.[k] === false)!;
    const typed = applyEdit(EMPTY_DRAFT, row, bucket, '4321', 'TYPED', 'en').entries.get(row.seamRefs![bucket])!;
    const pasted = applyEdit(EMPTY_DRAFT, row, bucket, '4321', 'PASTE', 'en').entries.get(row.seamRefs![bucket])!;
    const draw = (narrow: boolean, node: React.ReactElement) =>
      renderWithProviders(<PlanRowsContext.Provider value={api(false, vi.fn(), narrow)}>{node}</PlanRowsContext.Provider>).container;

    const wide = draw(false, <PlanBucketCell value={100} derived={false} planned={typed} />);
    expect(within(wide).getByTestId('tp-cell-planned').className).not.toMatch(/sr-only/);
    expect(within(wide).getByTestId('tp-cell')).not.toHaveAttribute('data-narrow');

    const narrowTyped = draw(true, <PlanBucketCell value={100} derived={false} planned={typed} />);
    expect(within(narrowTyped).getByTestId('tp-cell-planned').className).toMatch(/\bsr-only\b/);
    expect(within(narrowTyped).getByTestId('tp-cell-planned').textContent).toBe('Plan');
    expect(within(narrowTyped).getByTestId('tp-cell').className).toMatch(/\bbg-info-soft\b/);
    // a PASTED figure is told apart from a typed one by the cell, since the word is not printed
    const narrowPasted = draw(true, <PlanBucketCell value={100} derived={false} planned={pasted} />);
    expect(within(narrowPasted).getByTestId('tp-cell-planned').textContent).toBe('Ext');
    expect(within(narrowPasted).getByTestId('tp-cell').className).toMatch(/\bbg-warning-soft\b/);
    expect(within(narrowPasted).getByTestId('tp-cell').className).not.toMatch(/\bbg-info-soft\b/);
    // committed: the word for a screen reader, the figure in the committed colour
    const narrowCommitted = draw(true, <PlanBucketCell value={100} derived={false} committed />);
    expect(within(narrowCommitted).getByTestId('tp-cell-committed').className).toMatch(/\bsr-only\b/);
    expect(within(narrowCommitted).getByTestId('tp-cell-committed').textContent).toBe('Committed');
    expect(narrowCommitted.querySelector('.font-mono')!.className).toMatch(/text-success/);
    // …and the figure itself is never the part that gives way
    for (const c of [wide, narrowTyped, narrowPasted, narrowCommitted]) expect(c.querySelector('.font-mono')!.className).toMatch(/\bshrink-0\b/);
  });
});

// ─── 3 · the horizon fits ───────────────────────────────────────────────────

describe('PG-2 · twelve months stand without sideways scroll wherever the figures allow it', () => {
  const sum = (w: { gutter: number; bucketMin: number }, buckets: number) => w.gutter + buckets * w.bucketMin + 112;

  it('at the two measured widths, with the seam’s own figures and labels, the horizon fits', async () => {
    const { blocks, horizon } = await rmBlocks();
    const figureChars = widestFigure(blocks, formatNumber);
    expect(figureChars).toBeGreaterThanOrEqual(5); // population control: thousands, with their separator
    // the two grid widths measured in the browser on built main: 1366×768 and 1600×900
    for (const containerW of [1061, 1295]) {
      const w = planColumnWidths({ containerW, buckets: horizon.length, figureChars, labelChars: 44 });
      expect(w.fits, String(containerW)).toBe(true);
      expect(sum(w, horizon.length), String(containerW)).toBeLessThanOrEqual(containerW - 7); // 7px: the engine's own scrollbar
      expect(w.gutter).toBeGreaterThanOrEqual(208);
      expect(w.gutter).toBeLessThanOrEqual(420);
    }
  });

  it('a figure is never clipped to make it fit: a column is as wide as the widest figure, and the grid scrolls when that is too wide', () => {
    for (const figureChars of [3, 7, 9, 13]) {
      const w = planColumnWidths({ containerW: 1061, buckets: 12, figureChars, labelChars: 30 });
      // 7.2px is a 12px mono character, measured; the column holds the figure with room to spare
      expect(w.bucketMin, String(figureChars)).toBeGreaterThanOrEqual(Math.ceil(figureChars * 7.2) + 8);
    }
    const tooWide = planColumnWidths({ containerW: 1061, buckets: 12, figureChars: 13, labelChars: 30 });
    expect(tooWide.fits).toBe(false);
    expect(sum(tooWide, 12)).toBeGreaterThan(1061);
    expect(tooWide.gutter).toBe(208); // the floor, not less
    // KNOWN-GOOD beside it: the same window with ordinary figures fits
    expect(planColumnWidths({ containerW: 1061, buckets: 12, figureChars: 7, labelChars: 30 }).fits).toBe(true);
  });

  it('the key column takes what the horizon leaves — never more than its longest label needs', () => {
    const roomy = planColumnWidths({ containerW: 1900, buckets: 12, figureChars: 7, labelChars: 30 });
    const longer = planColumnWidths({ containerW: 1900, buckets: 12, figureChars: 7, labelChars: 50 });
    expect(longer.gutter).toBeGreaterThan(roomy.gutter);
    expect(planColumnWidths({ containerW: 1900, buckets: 12, figureChars: 7, labelChars: 500 }).gutter).toBe(420);
    // a tight window gives the label less, and says the columns are narrow
    const tight = planColumnWidths({ containerW: 1061, buckets: 12, figureChars: 7, labelChars: 50 });
    expect(tight.gutter).toBeLessThan(longer.gutter);
    expect(tight.narrow).toBe(true);
    expect(planColumnWidths({ containerW: 2400, buckets: 12, figureChars: 7, labelChars: 30 }).narrow).toBe(false);
  });

  it('where nothing can be measured the grid keeps the widths it had — and claims no fit', () => {
    expect(planColumnWidths({ containerW: 0, buckets: 12, figureChars: 7, labelChars: 30 })).toEqual({ gutter: 420, bucketMin: 112, narrow: false, fits: false });
  });

  it('a bucket’s header is short — "Oct", "W41" — with the year where the caller asks, in both languages', async () => {
    expect(formatBucketShort('2026-10')).toBe('Oct');
    expect(formatBucketShort('2026-08', true)).toBe('Aug 26');
    expect(formatBucketShort('2027-01', true)).toBe('Jan 27');
    expect(formatBucketShort('2026-W41')).toBe('W41');
    expect(formatBucketShort('2027-W01', true)).toBe('W01 27');
    // neither a month nor a week: returned as it came, never a dash that un-names a column
    expect(formatBucketShort('2026-Q4')).toBe('2026-Q4');
    await i18n.changeLanguage('id');
    expect(formatBucketShort('2026-10')).toBe('Okt');
    expect(formatBucketShort('2026-08', true)).toBe('Agu 26');
  });

  it('the engine is mounted only once the view is measured, and afresh when the widths change', () => {
    // Found in the browser, where jsdom lays nothing out: a view opened on cached
    // facts mounted at the unmeasured widths and stayed 1,877px wide in a 1,054px
    // box, with the sideways scroll switched off over it. The engine keeps the
    // column sizes it was mounted with, so the source is what a spec can hold.
    const grid = readFileSync(resolve(__dirname, 'TimePhasedGrid.tsx'), 'utf8');
    const css = readFileSync(resolve(__dirname, 'planGrid.css'), 'utf8');
    expect(grid).toMatch(/measure\(\);\s+setMeasured\(true\);/);
    expect(grid).toMatch(/factsQuery\.isLoading \|\| !measured \?/);
    expect(grid).toMatch(/const widthsKey = `\$\{widths\.gutter\}:\$\{widths\.bucketMin\}`;/);
    expect(grid).toMatch(/<DataSheetGrid<PlanRow>\s+key=\{widthsKey\}/);
    // the sideways scroll is switched off ONLY where the rule says the horizon fits
    expect(grid).toMatch(/data-fits=\{widths\.fits \? '' : undefined\}/);
    expect(css).toMatch(/\.tp-grid\[data-fits\] \.dsg-container \{\s*overflow-x: hidden;/);
    expect(css.match(/overflow-x: hidden/g)).toHaveLength(1);
  });

  it('`widestFigure` counts EVERY row — a column sized to the rows in sight would clip an opened material', async () => {
    const { blocks } = await rmBlocks();
    const all = widestFigure(blocks, formatNumber);
    const shortOnly = widestFigure(
      blocks.map((b) => ({ ...b, rows: b.rows.filter((r) => r.measureId === 'confirmedDeficit') })),
      formatNumber,
    );
    expect(all).toBeGreaterThan(shortOnly);
    expect(widestFigure([], formatNumber)).toBe(1);
  });
});

// ─── 4 · the measures menu ──────────────────────────────────────────────────

describe('PG-2 · the measures an open material shows are the planner’s choice, remembered', () => {
  const OFFERED: readonly MeasureId[] = ['demand', 'suggestedQty', 'acceptedQty', 'allocation', 'confirmed', 'confirmedDeficit', 'incoming'];

  it('nothing stored: the default four, of those the view offers', () => {
    expect([...readOpenMeasures(OFFERED)]).toEqual(DEFAULT_OPEN_MEASURES);
    expect([...readOpenMeasures(['demand', 'confirmed', 'incoming'])]).toEqual(['demand', 'confirmed']);
  });

  it('a stored choice is taken — in the view’s order, and only ids the view offers', () => {
    window.localStorage.setItem('paragon.planGrid.measures', JSON.stringify(['incoming', 'demand', 'no-such-measure', 'rop']));
    expect([...readOpenMeasures(OFFERED)]).toEqual(['demand', 'incoming']);
    // an empty choice is a choice: the material then shows its one row only
    window.localStorage.setItem('paragon.planGrid.measures', '[]');
    expect([...readOpenMeasures(OFFERED)]).toEqual([]);
  });

  it('an unreadable stored value is the default, never a crash', () => {
    for (const junk of ['{', '"demand"', '{"demand":true}', 'null']) {
      window.localStorage.setItem('paragon.planGrid.measures', junk);
      expect([...readOpenMeasures(OFFERED)], junk).toEqual(DEFAULT_OPEN_MEASURES);
    }
  });

  it('on the page: the menu is the shared pop-up hung from its button; a tick changes the grid and is remembered', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=rm-plan' });
    const button = await screen.findByTestId('tp-measures-button');
    expect(button.textContent).toBe('Measures · 4 of 10');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(button);
    const menu = screen.getByTestId('tp-measures-menu');
    expect(menu).toHaveAttribute('role', 'dialog');
    expect(menu).toHaveAttribute('aria-modal', 'true');
    expect(menu.parentElement).toHaveAttribute('data-anchored');
    const ticks = within(menu).getAllByRole('checkbox') as HTMLInputElement[];
    expect(ticks).toHaveLength(10);
    expect(ticks.filter((c) => c.checked)).toHaveLength(4);
    expect(within(menu).getByTestId('tp-measures-note').textContent).toBe('The shortfall is always shown: it is the material’s own row.');
    // the per-supplier shortfall is offered as that — the material's own row is their sum
    expect(within(menu).getByLabelText('Shortfall, by supplier')).not.toBeChecked();

    // every material open: the row count is the materials plus what the four measures add
    fireEvent.click(screen.getByTestId('tp-open-all'));
    const rowsOf = () => Number(/· ([\d,]+) rows/.exec(screen.getByTestId('tp-summary').textContent!)![1].replace(/,/g, ''));
    const materials = Number(/^([\d,]+) materials/.exec(screen.getByTestId('tp-summary').textContent!)![1].replace(/,/g, ''));
    await waitFor(() => expect(rowsOf()).toBeGreaterThan(materials));
    const four = rowsOf();
    fireEvent.click(within(menu).getByLabelText('Demand'));
    expect(screen.getByTestId('tp-measures-button').textContent).toBe('Measures · 3 of 10');
    expect(rowsOf()).toBeLessThan(four);
    expect(JSON.parse(window.localStorage.getItem('paragon.planGrid.measures')!)).toEqual(['acceptedQty', 'allocation', 'confirmed']);
    // close all: one row per material again
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByTestId('tp-open-all'));
    expect(rowsOf()).toBe(materials);
  });

  it('on arrival every material is closed: the grid is as many rows as materials', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=rm-plan' });
    const summary = await screen.findByTestId('tp-summary');
    await waitFor(() => expect(summary.textContent).toMatch(/^[\d,]+ materials · [\d,]+ rows/));
    const [, m, r] = /^([\d,]+) materials · ([\d,]+) rows/.exec(summary.textContent!)!;
    expect(Number(m.replace(/,/g, ''))).toBeGreaterThan(100); // population control
    expect(r).toBe(m);
    expect(screen.getByTestId('tp-open-all')).toHaveAttribute('data-open', '0');
    expect(screen.getByTestId('tp-open-all').textContent).toBe('Open all');
  });
});

// ─── 5 · the reason is asked before the push ────────────────────────────────

describe('PG-2 · the reason is asked BEFORE the push — once, for every row of the push that owes one', () => {
  const PM = VIEWS.find((v) => v.viewId === 'pm-plan')!;
  const HORIZON = somoHorizon('week').slice(0, PM.horizonLength);
  const MEASURES = visibleMeasures(PM.measuresShown);
  /** Editable accepted-quantity cells of materials no other page spec commits (the cascade's replay key outlives a reset). */
  const cellsOf = (codes: readonly string[]) => {
    const out = derivePlanningFacts({ horizon: HORIZON, measures: MEASURES, materialCodes: [...codes] });
    if (!out.ok) throw new Error('refused');
    const cells: { row: PlanRow; bucket: string; raw: string }[] = [];
    for (const row of buildPlanBlocks(out.facts, HORIZON, MEASURES).flatMap((b) => b.rows).filter((r) => r.measureId === 'acceptedQty')) {
      for (const bucket of HORIZON) {
        const base = row.cells[bucket];
        if (row.seamRefs?.[bucket] && typeof base === 'number' && base > 0) cells.push({ row, bucket, raw: String(Math.round(base * 1.1)) });
      }
    }
    return cells;
  };
  const CELLS = cellsOf(['SIM-PM-0052', 'SIM-PM-0056']).slice(0, 3);
  const ref = (i: number) => CELLS[i].row.seamRefs![CELLS[i].bucket];

  beforeEach(() => {
    intakeLineStore.reset();
    purchaseRequisitionStore.reset();
  });

  it('⚠ POPULATION CONTROL — three editable cells, each leaving SOMO’s figure and so owing a reason', () => {
    expect(CELLS).toHaveLength(3);
    let d = EMPTY_DRAFT;
    for (const c of CELLS) d = applyEdit(d, c.row, c.bucket, c.raw, 'TYPED', 'en');
    expect([...d.entries.values()].filter(reasonMissing)).toHaveLength(3);
  });

  it('the rule: one reason goes onto each row that owes one and has none — a row with its own keeps it, a row that owes none takes none', () => {
    let d = EMPTY_DRAFT;
    for (const c of CELLS) d = applyEdit(d, c.row, c.bucket, c.raw, 'TYPED', 'en');
    d = setReason(d, ref(0), 'my own reason');
    // a fourth row at SOMO's own figure owes nothing
    const same = cellsOf(['SIM-PM-0058'])[0];
    d = applyEdit(d, same.row, same.bucket, String(same.row.cells[same.bucket]), 'TYPED', 'en');
    const sameRef = same.row.seamRefs![same.bucket];
    const out = fillMissingReasons(d, [...d.entries.keys()], '  Q4 launch  ');
    expect(out.applied).toBe(2);
    expect(out.draft.entries.get(ref(0))!.reason).toBe('my own reason');
    expect(out.draft.entries.get(ref(1))!.reason).toBe('Q4 launch');
    expect(out.draft.entries.get(ref(2))!.reason).toBe('Q4 launch');
    expect(out.draft.entries.get(sameRef)!.reason).toBe('');
    expect([...out.draft.entries.values()].filter(reasonMissing)).toEqual([]);
    // only the rows NAMED take it
    expect(fillMissingReasons(d, [ref(1)], 'x').draft.entries.get(ref(2))!.reason).toBe('');
    // a blank reason is no reason
    expect(fillMissingReasons(d, [...d.entries.keys()], '   ').applied).toBe(0);
  });

  const Seed: React.FC = () => {
    const api = usePlanDraft()!;
    return (
      <button type="button" onClick={() => CELLS.forEach((c) => api.edit(c.row, c.bucket, c.raw, 'TYPED'))}>
        seed
      </button>
    );
  };
  const mount = () => {
    renderWithProviders(
      <PlanDraftProvider>
        <Seed />
        <TimePhasedGrid viewId="pm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid', identity: PLANNING_1 },
    );
    fireEvent.click(screen.getByText('seed'));
  };

  it('from the bar: a push that owes a reason dispatches NOTHING and opens the drawer on the question', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    mount();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(within(screen.getByTestId('plan-draft-bar')).getByTestId('plan-push-all'));
    const drawer = await screen.findByRole('dialog');
    const field = within(drawer).getByTestId('plan-push-reason');
    expect(within(drawer).getByText('Reason for the 3 changes that need one')).toBeInTheDocument();
    expect(within(drawer).getByRole('alert').textContent).toBe('Write the reason first — nothing was pushed.');
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('plan-push-result')).toBeNull();
    dispatch.mockRestore();
  });

  it('in the drawer: empty, the push sends nothing and says so; written, it is recorded on each row and they commit', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    mount();
    fireEvent.click(screen.getByTestId('plan-changes-toggle'));
    const drawer = screen.getByRole('dialog');
    // asked, not yet refused: no error stands before the planner has tried
    expect(within(drawer).queryByText('Write the reason first — nothing was pushed.')).toBeNull();
    fireEvent.click(within(drawer).getByTestId('plan-push-all'));
    expect(within(drawer).getByText('Write the reason first — nothing was pushed.')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
    // one row keeps the reason the planner wrote on it
    fireEvent.change(within(drawer).getByLabelText(new RegExp(`Reason — ${CELLS[0].row.materialCode} ${CELLS[0].bucket}`)), { target: { value: 'supplier MOQ' } });
    expect(within(drawer).getByText('Reason for the 2 changes that need one')).toBeInTheDocument();
    fireEvent.change(within(drawer).getByTestId('plan-push-reason'), { target: { value: 'Q4 launch buffer' } });
    fireEvent.click(within(drawer).getByTestId('plan-push-all'));
    await waitFor(() => expect(screen.getByTestId('plan-push-result')).toHaveTextContent('Last push: 3 committed · 0 refused, of 3'), { timeout: 15000 });
    const committed = (i: number) => intakeLineStore.all().find((r) => r.lineId === ref(i))!;
    expect(committed(0)).toMatchObject({ state: 'Committed', overrideReason: 'supplier MOQ' });
    expect(committed(1)).toMatchObject({ state: 'Committed', overrideReason: 'Q4 launch buffer' });
    expect(committed(2)).toMatchObject({ state: 'Committed', overrideReason: 'Q4 launch buffer' });
    dispatch.mockRestore();
  }, 30000);

  it('KNOWN-GOOD: where no row owes a reason the question is not asked and the push goes at once', async () => {
    const same = cellsOf(['SIM-PM-0060'])[0];
    expect(same).toBeDefined(); // population control
    const Same: React.FC = () => {
      const api = usePlanDraft()!;
      return (
        <button type="button" onClick={() => api.edit(same.row, same.bucket, String(same.row.cells[same.bucket]), 'TYPED')}>
          seed
        </button>
      );
    };
    renderWithProviders(
      <PlanDraftProvider>
        <Same />
        <TimePhasedGrid viewId="pm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid', identity: PLANNING_1 },
    );
    fireEvent.click(screen.getByText('seed'));
    fireEvent.click(within(screen.getByTestId('plan-draft-bar')).getByTestId('plan-push-all'));
    await waitFor(() => expect(screen.getByTestId('plan-push-result')).toHaveTextContent('Last push: 1 committed · 0 refused, of 1'), { timeout: 15000 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('plan-push-reason')).toBeNull();
  }, 30000);

  it('the drawer holds its table at the table width, and its footer is the one solid button', () => {
    mount();
    fireEvent.click(screen.getByTestId('plan-changes-toggle'));
    const drawer = screen.getByRole('dialog');
    expect(drawer).toHaveAttribute('data-wide', 'table');
    expect(drawer.className).toMatch(/sm:w-\[1040px\]/);
    expect(drawer.querySelectorAll('[data-solid]')).toHaveLength(1);
    expect(within(drawer).getByTestId('plan-push-all')).toHaveAttribute('data-solid');
    // KNOWN-GOOD: the two other widths are what they were
    const { container: a } = render(<SidePanel open onClose={() => {}} title="a" wide>x</SidePanel>);
    expect(a.querySelector('aside')!.className).toMatch(/sm:w-\[760px\]/);
    const { container: b } = render(<SidePanel open onClose={() => {}} title="b">x</SidePanel>);
    expect(b.querySelector('aside')!.className).toMatch(/sm:w-\[480px\]/);
  });
});

// ─── 6 · the anchored pop-up ────────────────────────────────────────────────

describe('PG-2 · an anchored pop-up is the shared dialog hung from a control — same trap, same Escape, no dimmed page', () => {
  it('the placement: under the control, right edges aligned, kept on the screen and no taller than what is left', () => {
    expect(anchoredPlace({ bottom: 44, right: 1351 }, { width: 1367, height: 768 })).toEqual({ top: 52, right: 16, maxHeight: 708 });
    // a control at the very edge keeps a margin
    expect(anchoredPlace({ bottom: 44, right: 1367 }, { width: 1367, height: 768 }).right).toBe(8);
    // a control near the foot never yields a pop-up with no height
    expect(anchoredPlace({ bottom: 760, right: 800 }, { width: 1367, height: 768 }).maxHeight).toBe(120);
  });

  const Host: React.FC<{ anchored: boolean }> = ({ anchored }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLSpanElement>(null);
    return (
      <div>
        <span ref={ref}>
          <Button onClick={() => setOpen(true)}>open</Button>
        </span>
        <Dialog open={open} onClose={() => setOpen(false)} title="Menu" testId="pop" anchor={anchored ? ref : undefined}>
          <Button>first</Button>
          <Button variant="primary">commit</Button>
        </Dialog>
      </div>
    );
  };

  it('it keeps everything the pop-up guarantees', async () => {
    renderWithProviders(<Host anchored />);
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();
    fireEvent.click(opener);
    const pop = screen.getByTestId('pop');
    expect(pop).toHaveAttribute('role', 'dialog');
    expect(pop).toHaveAttribute('aria-modal', 'true');
    expect(pop).toHaveAttribute('data-solid-scope');
    expect(pop.parentElement).toHaveAttribute('data-anchored');
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBe(pop);
    // focus moves in, to the body's first control
    expect(document.activeElement).toBe(within(pop).getByRole('button', { name: 'first' }));
    // Tab from the last control wraps to the first — the trap
    const all = [...pop.querySelectorAll('button')];
    all[all.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(all[0]);
    // the page is NOT dimmed, and a click outside still closes it
    const scrim = screen.getByTestId('pop-scrim');
    expect(scrim.className).not.toMatch(/bg-navy/);
    fireEvent.click(scrim);
    expect(screen.queryByTestId('pop')).toBeNull();
    // Escape closes it and focus goes back to the control
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('pop')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it('KNOWN-GOOD: without an anchor it is the centred pop-up it was, on a dimmed page', () => {
    renderWithProviders(<Host anchored={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('pop').parentElement).not.toHaveAttribute('data-anchored');
    expect(screen.getByTestId('pop-scrim').className).toMatch(/bg-navy/);
    expect(screen.getByTestId('pop').className).toMatch(/\brelative\b/);
  });

  it('the identity panel hangs from the avatar again — the anchored form, still modal, focus inside', async () => {
    renderWithProviders(<IdentityPanel />, { identity: BUYER });
    const avatar = screen.getByTestId('identity-avatar');
    avatar.focus(); // a real click focuses what it presses
    fireEvent.click(avatar);
    const panel = await screen.findByTestId('identity-panel');
    expect(panel.parentElement).toHaveAttribute('data-anchored');
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(panel.className).toMatch(/\bfixed\b/);
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(screen.getByTestId('identity-panel-scrim').className).not.toMatch(/bg-navy/);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('identity-panel')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(avatar));
  });
});

// ─── 7 · the intake view's notice ───────────────────────────────────────────

describe('PG-2 · the intake view has one strip; how the queue works is "About this data"', () => {
  it('the statement is in the page always and shown on request; the strip holds the queue’s counts', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid?view=intake-review' });
    const about = await screen.findByTestId('intake-about');
    expect(about).toHaveAttribute('hidden');
    expect(within(about).getByText('Recommend-first triage')).toBeInTheDocument();
    const strip = screen.getByTestId('intake-strip');
    expect(strip).toHaveAttribute('data-card');
    expect(within(strip).getByTestId('intake-summary')).toBeInTheDocument();
    // the strip stands ABOVE the grid and the statement is not between them
    const grid = await screen.findByTestId('intake-grid');
    expect(strip.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(about.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByTestId('plan-about-toggle'));
    expect(screen.getByTestId('intake-about')).not.toHaveAttribute('hidden');
    fireEvent.click(screen.getByTestId('plan-about-toggle'));
    expect(screen.getByTestId('intake-about')).toHaveAttribute('hidden');
  });
});

// ─── 8 · the words ──────────────────────────────────────────────────────────

describe('PG-2 · every new string exists in both languages', () => {
  it('EN and ID hold the same PG-2 keys (ID has no singular form)', () => {
    const mine = Object.keys(planGridEn).filter((k) => /^planGrid\.tp\.(measures\.|openAll|closeAll|plannedInside|agg\.shortTotal)|^planGrid\.edit\.push\.reason(Ask|Help|First)/.test(k));
    expect(mine.length).toBeGreaterThanOrEqual(13); // population control
    for (const k of mine) {
      if (k.endsWith('_one')) expect(planGridId[k as keyof typeof planGridId], k).toBeUndefined();
      else expect(planGridId[k as keyof typeof planGridId], k).toBeTruthy();
    }
    expect(planGridId['planGrid.tp.openAll']).toBe('Buka semua');
    expect(planGridId['planGrid.edit.push.reasonFirst']).toBe('Tulis alasannya dahulu — tidak ada yang dikirim.');
  });
});
