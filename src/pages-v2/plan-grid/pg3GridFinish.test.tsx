// ────────────────────────────────────────────────────────────────────────────
// PG-3 · the plan grid's open calls from PG-2, ruled 12 October 2026.
//
// Measured on built main at 1366×768: the weekly view's sixteen weeks were
// 1,280px of grid in a 1,054px box; a window resize threw the planner back to
// the first row with nothing selected; a committed or pasted figure in a narrow
// column was told apart by its colour alone; and the planned-changes drawer
// asked for a reason in two places. What this file holds is what replaced that.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import { PlanBucketCell, PlanRowLabel, PlanRowsContext, planColumnWidths, type PlanRowsApi } from './TimePhasedGrid';
import { EMPTY_DRAFT, applyEdit } from './planDraft';
import { NO_PLACE, useKeepPlace, type PlaceableGrid } from './useKeepPlace';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS, viewGrainAndHorizon } from '../../services/planning/views';
import { formatNumber } from '../../lib/format';
import { planGridEn, planGridId } from '../../lib/i18n/planGrid';
import { visibleMeasures } from './visibleMeasures';
import { blocksOfViewType, buildPlanBlocks, summaryRowOf, widestFigure, type PlanBlock } from './planGridModel';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

/** What a plan view lists — the grid's own pipeline, over the real seam. */
const blocksOf = async (viewId: 'rm-plan' | 'pm-plan'): Promise<{ blocks: readonly PlanBlock[]; horizon: readonly string[] }> => {
  const v = VIEWS.find((x) => x.viewId === viewId)!;
  const { grain, horizonLength, materialType } = viewGrainAndHorizon(v, 'month');
  const horizon = somoHorizon(grain).slice(0, horizonLength);
  const measures = visibleMeasures(v.measuresShown);
  const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon, measures });
  return { blocks: blocksOfViewType(buildPlanBlocks(page.items, horizon, measures), materialType), horizon };
};

const api = (over: Partial<PlanRowsApi> = {}): PlanRowsApi => ({ isOpen: () => false, toggle: vi.fn(), narrow: true, ...over });
const draw = (value: PlanRowsApi, node: React.ReactElement) =>
  renderWithProviders(<PlanRowsContext.Provider value={value}>{node}</PlanRowsContext.Provider>).container;

// ─── 1 · sixteen weeks at 1366×768 ──────────────────────────────────────────

describe('PG-3 · the weekly view stands without sideways scroll at 1366×768', () => {
  // the view widths measured in the browser on built main: 1366×768 and 1600×900
  const W1366 = 1063;
  const W1600 = 1295;
  const taken = (w: { gutter: number; bucketMin: number; totals: boolean }, buckets: number) =>
    w.gutter + buckets * w.bucketMin + (w.totals ? 112 : 0);

  it('⚠ POPULATION CONTROL — the weekly view is sixteen weeks of figures in the thousands', async () => {
    const { blocks, horizon } = await blocksOf('pm-plan');
    expect(horizon).toHaveLength(16);
    expect(horizon.every((b) => /^\d{4}-W\d{2}$/.test(b))).toBe(true);
    expect(blocks.length).toBeGreaterThan(10);
    expect(widestFigure(blocks, formatNumber)).toBeGreaterThanOrEqual(5);
  });

  it('with the seam’s own figures the sixteen weeks fit at 1366×768 — tight, the totals pane given up', async () => {
    const { blocks, horizon } = await blocksOf('pm-plan');
    const figureChars = widestFigure(blocks, formatNumber);
    const w = planColumnWidths({ containerW: W1366, buckets: horizon.length, figureChars, labelChars: 44 });
    expect(w.fits).toBe(true);
    expect(w.tight).toBe(true);
    expect(w.totals).toBe(false);
    expect(taken(w, horizon.length)).toBeLessThanOrEqual(W1366 - 7); // 7px: the engine's own scrollbar
    // a figure is never clipped: the column holds the widest one at the tight type (11px mono, 6.6px)
    expect(w.bucketMin).toBeGreaterThanOrEqual(Math.ceil(figureChars * 6.6) + 4);
    expect(w.gutter).toBeGreaterThanOrEqual(208);
    // KNOWN-GOOD beside it: at 1600×900 the same view fits as it is, and gives nothing up
    const wide = planColumnWidths({ containerW: W1600, buckets: horizon.length, figureChars, labelChars: 44 });
    expect(wide).toMatchObject({ fits: true, tight: false, totals: true });
  });

  it('the monthly view at 1366×768 is untouched: twelve months as they were, nothing given up', async () => {
    const { blocks, horizon } = await blocksOf('rm-plan');
    const w = planColumnWidths({ containerW: 1061, buckets: horizon.length, figureChars: widestFigure(blocks, formatNumber), labelChars: 44 });
    expect(w).toMatchObject({ fits: true, tight: false, totals: true });
  });

  it('the steps are taken IN ORDER — as it is, then tight, then the totals pane — and the first that fits is kept', () => {
    const at = (figureChars: number) => planColumnWidths({ containerW: 1061, buckets: 12, figureChars, labelChars: 30 });
    expect(at(7)).toMatchObject({ fits: true, tight: false, totals: true });
    expect(at(8)).toMatchObject({ fits: true, tight: true, totals: true }); // tight is enough: the totals stay
    expect(at(9)).toMatchObject({ fits: true, tight: true, totals: false });
    // …and where no step fits, the view stands AS IT IS and scrolls — never tight and still scrolling
    expect(at(13)).toMatchObject({ fits: false, tight: false, totals: true });
  });

  it('the tight step is what the grid is drawn with: 11px figures, 2px of padding, the pane mounted only where it stands', () => {
    const grid = readFileSync(resolve(__dirname, 'TimePhasedGrid.tsx'), 'utf8');
    const css = readFileSync(resolve(__dirname, 'planGrid.css'), 'utf8');
    expect(grid).toMatch(/data-tight=\{widths\.tight \? '' : undefined\}/);
    expect(grid).toMatch(/stickyRightColumn=\{widths\.totals \? aggregates : undefined\}/);
    expect(css).toMatch(/\.tp-grid\[data-tight\] \.dsg-cell \.tp-figure,[^{]*\{\s*font-size: 0\.6875rem;/);
    const wide = draw(api({ narrow: true, tight: false }), <PlanBucketCell value={1234} derived={false} />);
    const tight = draw(api({ narrow: true, tight: true }), <PlanBucketCell value={1234} derived={false} />);
    expect(within(wide).getByTestId('tp-cell').className).toMatch(/\bpx-1\b/);
    expect(within(tight).getByTestId('tp-cell').className).toMatch(/\bpx-0\.5\b/);
    expect(within(tight).getByTestId('tp-cell').className).not.toMatch(/\bpx-1\b/);
    expect(tight.querySelector('.tp-figure')!.textContent).toBe('1,234');
  });

  it('where the totals pane gave its width up, a material’s label states its total in its title — and only there', async () => {
    const { blocks, horizon } = await blocksOf('rm-plan');
    const b = blocks.find((x) => x.exceptions.shortfall)!;
    const row = summaryRowOf(b, horizon);
    const total = Object.values(row.cells).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    expect(total).toBeGreaterThan(0); // population control
    const folded = draw(api({ totals: false }), <PlanRowLabel row={row} />);
    expect(within(folded).getByTestId('tp-row-label').getAttribute('title')).toContain(`Short, total: ${formatNumber(total)}`);
    const standing = draw(api({ totals: true }), <PlanRowLabel row={row} />);
    expect(within(standing).getByTestId('tp-row-label').getAttribute('title')).not.toContain('Short, total');
  });
});

// ─── 2 · never colour alone ─────────────────────────────────────────────────

describe('PG-3 · in a narrow column a state carries a small mark beside its colour', () => {
  const entries = async () => {
    const { blocks, horizon } = await blocksOf('rm-plan');
    const row = blocks.flatMap((b) => b.rows).find((r) => r.measureId === 'acceptedQty' && horizon.some((k) => r.seamRefs?.[k] && r.committedCells?.[k] === false))!;
    const bucket = horizon.find((k) => row.seamRefs?.[k] && row.committedCells?.[k] === false)!;
    return {
      typed: applyEdit(EMPTY_DRAFT, row, bucket, '4321', 'TYPED', 'en').entries.get(row.seamRefs![bucket])!,
      pasted: applyEdit(EMPTY_DRAFT, row, bucket, '4321', 'PASTE', 'en').entries.get(row.seamRefs![bucket])!,
    };
  };
  const markOf = (c: HTMLElement) => c.querySelector('[data-testid=tp-cell-mark]');

  it('committed, pasted and dismissed each have their own mark — an icon, in the cell’s corner', async () => {
    const { pasted, typed } = await entries();
    const cases = [
      ['committed', <PlanBucketCell key="c" value={100} derived={false} committed />],
      ['pasted', <PlanBucketCell key="p" value={100} derived={false} planned={pasted} />],
      // FB-1 (operator ruling) — a typed change is not told by its tint alone.
      ['planned', <PlanBucketCell key="t" value={100} derived={false} planned={typed} />],
      ['dismissed', <PlanBucketCell key="d" value={100} derived={false} dismissed />],
    ] as const;
    const drawn = new Set<string>();
    for (const [name, node] of cases) {
      const c = draw(api(), node);
      const mark = markOf(c)!;
      expect(mark, name).not.toBeNull();
      expect(mark.getAttribute('data-mark'), name).toBe(name);
      expect(mark.querySelector('svg'), name).not.toBeNull();
      // it hangs in the corner and takes none of the figure's width
      expect(mark.className, name).toMatch(/\babsolute\b/);
      expect(within(c).getByTestId('tp-cell').className, name).toMatch(/\brelative\b/);
      // the word is still there for a screen reader, so the mark itself is not announced
      expect(mark.getAttribute('aria-hidden'), name).toBe('true');
      drawn.add(mark.querySelector('svg')!.innerHTML);
    }
    expect(drawn.size).toBe(cases.length); // a different drawing each, not one icon in four colours
  });

  it('a pasted figure that is committed underneath reads as PASTED — the overlay is what is shown', async () => {
    const { pasted } = await entries();
    const c = draw(api(), <PlanBucketCell value={100} derived={false} planned={pasted} committed />);
    expect(markOf(c)!.getAttribute('data-mark')).toBe('pasted');
  });

  it('a typed change over a committed figure reads as TYPED, and a pasted one is never drawn as typed', async () => {
    const { typed, pasted } = await entries();
    expect(markOf(draw(api(), <PlanBucketCell value={100} derived={false} planned={typed} committed />))!.getAttribute('data-mark')).toBe('planned');
    expect(markOf(draw(api(), <PlanBucketCell value={100} derived={false} planned={pasted} />))!.getAttribute('data-mark')).toBe('pasted');
  });

  it('KNOWN-GOOD — a plain figure carries no mark; in a WIDE column nothing does, the word is printed', async () => {
    const { typed, pasted } = await entries();
    expect(markOf(draw(api(), <PlanBucketCell value={100} derived={false} />))).toBeNull();
    for (const node of [
      <PlanBucketCell key="c" value={100} derived={false} committed />,
      <PlanBucketCell key="p" value={100} derived={false} planned={pasted} />,
      <PlanBucketCell key="t" value={100} derived={false} planned={typed} />,
      <PlanBucketCell key="d" value={100} derived={false} dismissed />,
    ]) {
      expect(markOf(draw(api({ narrow: false }), node))).toBeNull();
    }
  });
});

// ─── 3 · a resize keeps the planner's place ─────────────────────────────────

describe('PG-3 · a re-mounted grid is put back where the planner was', () => {
  const setup = () => {
    const wrap = document.createElement('div');
    const scroller = document.createElement('div');
    scroller.className = 'dsg-container';
    wrap.appendChild(scroller);
    const grid: PlaceableGrid & { setActiveCell: ReturnType<typeof vi.fn>; setSelection: ReturnType<typeof vi.fn> } = {
      setActiveCell: vi.fn(),
      setSelection: vi.fn(),
    };
    const hook = renderHook(({ k }: { k: string }) => useKeepPlace(k, { current: wrap }, { current: grid }), {
      initialProps: { k: '208:60:t' },
    });
    return { scroller, grid, hook };
  };
  const SEL = { min: { col: 3, row: 41 }, max: { col: 5, row: 44 } };

  it('the scroll position and the selection are put back on the new grid', async () => {
    const { scroller, grid, hook } = setup();
    act(() => {
      hook.result.current.onScroll({ scrollTop: 520, scrollLeft: 36 });
      hook.result.current.onActive({ col: 3, row: 41 });
      hook.result.current.onSelection(SEL);
    });
    expect(scroller.scrollTop).toBe(0); // the hook only listens while the grid stands
    hook.rerender({ k: '305:53:t' });
    expect(grid.setSelection).toHaveBeenCalledTimes(1);
    expect(grid.setSelection).toHaveBeenCalledWith(SEL);
    expect(grid.setActiveCell).not.toHaveBeenCalled();
    expect([scroller.scrollTop, scroller.scrollLeft]).toEqual([520, 36]);
    // the new grid reports "nothing selected" and "at the top" on its way in: not believed
    hook.result.current.onActive(null);
    hook.result.current.onSelection(null);
    hook.result.current.onScroll({ scrollTop: 0, scrollLeft: 0 });
    // …so a second resize arriving BEFORE the first has settled (a window being dragged) still has the place
    expect(hook.result.current.place().selection).toEqual(SEL);
    hook.rerender({ k: '250:56:t' });
    expect(grid.setSelection).toHaveBeenCalledTimes(2);
    expect(grid.setSelection).toHaveBeenLastCalledWith(SEL);
    scroller.scrollTop = 0; // the engine scrolls as it takes its active cell
    await waitFor(() => expect(scroller.scrollTop).toBe(520));
    expect(hook.result.current.place()).toEqual({ top: 520, left: 36, active: { col: 3, row: 41 }, selection: SEL });
    // …and a later resize still has it
    hook.rerender({ k: '208:60:t' });
    expect(grid.setSelection).toHaveBeenCalledTimes(3);
    expect(grid.setSelection).toHaveBeenLastCalledWith(SEL);
  });

  it('one active cell and no range: the active cell is put back', () => {
    const { grid, hook } = setup();
    act(() => hook.result.current.onActive({ col: 2, row: 7 }));
    hook.rerender({ k: '305:53:t' });
    expect(grid.setActiveCell).toHaveBeenCalledWith({ col: 2, row: 7 });
    expect(grid.setSelection).not.toHaveBeenCalled();
  });

  it('KNOWN-GOOD — a render under the SAME key moves nothing, and a first mount has nothing to put back', async () => {
    const { scroller, grid, hook } = setup();
    expect(hook.result.current.place()).toEqual(NO_PLACE);
    act(() => hook.result.current.onSelection(SEL));
    scroller.scrollTop = 77;
    hook.rerender({ k: '208:60:t' });
    expect(grid.setSelection).not.toHaveBeenCalled();
    expect(grid.setActiveCell).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(77);
    // after a restore has settled, the grid's reports are believed again
    hook.rerender({ k: '305:53:t' });
    await waitFor(() => {
      hook.result.current.onScroll({ scrollTop: 900, scrollLeft: 0 });
      expect(hook.result.current.place().top).toBe(900);
    });
  });

  it('the grid is wired to it: keyed on the widths, fed by the engine’s own scroll, active-cell and selection events', () => {
    const grid = readFileSync(resolve(__dirname, 'TimePhasedGrid.tsx'), 'utf8');
    expect(grid).toMatch(/const place = useKeepPlace\(widthsKey, wrapRef, gridRef\);/);
    expect(grid).toMatch(/onScrollCapture=\{\(ev\) => \{[^}]*classList\?\.contains\('dsg-container'\)\) place\.onScroll\(el\);/s);
    expect(grid).toMatch(/onActiveCellChange=\{\(\{ cell \}\) => \{\s+place\.onActive\(cell\);/);
    expect(grid).toMatch(/onSelectionChange=\{\(\{ selection: s \}\) => \{\s+place\.onSelection\(s\);/);
  });
});

// ─── 4 · one reason field ───────────────────────────────────────────────────

describe('PG-3 · the planned-changes drawer asks for a reason in ONE place', () => {
  it('the field above the table is gone from the source and from both languages; the footer’s and the row’s own remain', () => {
    const panel = readFileSync(resolve(__dirname, 'PlannedChangesPanel.tsx'), 'utf8');
    const footer = readFileSync(resolve(__dirname, 'PlanPushControls.tsx'), 'utf8');
    const provider = readFileSync(resolve(__dirname, 'PlanDraftProvider.tsx'), 'utf8');
    for (const gone of ['plan-bulk-reason', 'plan-bulk-apply', 'plan-select-owed', 'bulkReason', 'applyReason(']) {
      expect(panel, gone).not.toContain(gone);
      expect(provider, gone).not.toContain(gone);
    }
    for (const dict of [planGridEn, planGridId]) {
      expect(Object.keys(dict).filter((k) => k.startsWith('planGrid.edit.bulk.') || k === 'planGrid.edit.col.select')).toEqual([]);
    }
    // KNOWN-GOOD: the footer's one field, and a row's own reason, still written where they were
    expect(footer.match(/data-testid="plan-push-reason"/g)).toHaveLength(1);
    expect(panel).toMatch(/aria-label=\{t\('planGrid\.edit\.reasonFor'/);
    expect(panel).toMatch(/onChange=\{\(ev\) => api\.setReason\(e\.seamRef, ev\.target\.value\)\}/);
    expect(planGridEn['planGrid.edit.push.reasonAsk_other']).toBe('Reason for the {{n}} changes that need one');
    expect(planGridId['planGrid.edit.push.reasonAsk_other']).toBe('Alasan untuk {{n}} perubahan yang memerlukannya');
  });
});
