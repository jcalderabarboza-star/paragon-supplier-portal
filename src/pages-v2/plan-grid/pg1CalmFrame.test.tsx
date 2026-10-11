// ────────────────────────────────────────────────────────────────────────────
// PG-1 · the plan grid's frame is calm (R-PG, operator ruling 11 October 2026).
//
// Measured on built main: 64% of a 1600×900 screen stood above the grid's first
// number, and 81% of a 1366×768 one. What this file holds is what replaced it —
// the view the page opens on and what it lists, the one strip, the row heights,
// the bands, and the two drawers — each against the real seam.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import PlanGrid from '../PlanGrid';
import SidePanel from '../../components/ui-v2/SidePanel';
import TimePhasedGrid, { ROW_H } from './TimePhasedGrid';
import { PlanDraftProvider } from './PlanDraftProvider';
import PublicationPanel from './PublicationPanel';
import { forecastPublicationStore } from '../../services/data/mock/stores/forecastPublicationStore';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS, viewGrainAndHorizon } from '../../services/planning/views';
import { formatNumber } from '../../lib/format';
import { visibleMeasures } from './visibleMeasures';
import {
  DEFAULT_PLAN_FILTER,
  DEFAULT_PLAN_SORT,
  applyPlanView,
  blocksOfViewType,
  buildPlanBlocks,
  isPlanException,
  isShortIn,
  type PlanBlock,
} from './planGridModel';

afterEach(async () => {
  await i18n.changeLanguage('en');
  window.localStorage.removeItem('paragon.planGrid.density');
});

/** What the Exceptions view lists at the monthly grain — the grid's own pipeline, over the real seam. */
const monthlyBlocks = async (): Promise<{ blocks: readonly PlanBlock[]; horizon: readonly string[] }> => {
  const v = VIEWS.find((x) => x.viewId === 'exceptions')!;
  const { grain, horizonLength, materialType } = viewGrainAndHorizon(v, 'month');
  const horizon = somoHorizon(grain).slice(0, horizonLength);
  const measures = visibleMeasures(v.measuresShown);
  const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon, measures });
  return { blocks: blocksOfViewType(buildPlanBlocks(page.items, horizon, measures), materialType), horizon };
};

const shortCells = (b: PlanBlock, bucket: string): number[] =>
  b.rows.filter((r) => r.measureId === 'confirmedDeficit').map((r) => r.cells[bucket] ?? 0);

// ─── 1 · "Shortages this month" ─────────────────────────────────────────────

describe('PG-1 · "short in a bucket" is read off the shortfall rows the grid prints', () => {
  it('⚠ POPULATION CONTROL — the seam holds materials short NOW, short LATER only, and not short at all', async () => {
    const { blocks, horizon } = await monthlyBlocks();
    const now = horizon[0];
    const shortNow = blocks.filter((b) => isShortIn(b, now));
    const shortLaterOnly = blocks.filter((b) => b.exceptions.shortfall && !isShortIn(b, now));
    const notShort = blocks.filter((b) => !b.exceptions.shortfall);
    // all three are needed, or a filter that keeps everything (or nothing) would pass below
    expect(shortNow.length).toBeGreaterThan(5);
    expect(shortLaterOnly.length).toBeGreaterThan(0);
    expect(notShort.length).toBeGreaterThan(100);
  });

  it('KNOWN-GOOD and KNOWN-BAD, cell by cell: listed ⇔ a shortfall figure above zero stands in that bucket', async () => {
    const { blocks, horizon } = await monthlyBlocks();
    const now = horizon[0];
    for (const b of blocks) {
      const any = shortCells(b, now).some((v) => v > 0);
      expect(isShortIn(b, now), b.materialCode).toBe(any);
    }
    // a bucket nothing is planned in lists nothing
    expect(blocks.filter((b) => isShortIn(b, '1999-01'))).toEqual([]);
  });

  it('the view lists exactly those materials — every one short in the first bucket, none left out', async () => {
    const { blocks, horizon } = await monthlyBlocks();
    const now = horizon[0];
    const listed = applyPlanView(blocks, { ...DEFAULT_PLAN_FILTER, exceptionsOnly: true, shortIn: now }, DEFAULT_PLAN_SORT);
    const expected = blocks.filter((b) => shortCells(b, now).some((v) => v > 0)).map((b) => b.materialCode).sort();
    expect(listed.map((b) => b.materialCode).sort()).toEqual(expected);
    // every listed material's FIRST short bucket is the one asked for — the horizon starts there
    expect(listed.filter((b) => b.agg.firstShortBucket !== now).map((b) => b.materialCode)).toEqual([]);
    // and it is a strict subset of the exceptions: the plain Exceptions view lists more
    const all = applyPlanView(blocks, { ...DEFAULT_PLAN_FILTER, exceptionsOnly: true }, DEFAULT_PLAN_SORT);
    expect(all.length).toBeGreaterThan(listed.length);
    expect(listed.every((b) => isPlanException(b.exceptions))).toBe(true);
  });

  it('without a bucket the filter is the one it was — `shortIn: null` and an absent `shortIn` list the same', async () => {
    const { blocks } = await monthlyBlocks();
    const a = applyPlanView(blocks, DEFAULT_PLAN_FILTER, DEFAULT_PLAN_SORT).map((b) => b.materialCode);
    const b = applyPlanView(blocks, { ...DEFAULT_PLAN_FILTER, shortIn: null }, DEFAULT_PLAN_SORT).map((x) => x.materialCode);
    expect(b).toEqual(a);
    expect(a.length).toBe(blocks.length);
  });

  it('on the page: the landing view lists as many materials as the strip says are short now', async () => {
    const { blocks, horizon } = await monthlyBlocks();
    const n = blocks.filter((b) => isShortIn(b, horizon[0])).length;
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    await waitFor(() =>
      expect(screen.getByTestId('tp-short-now').textContent).toBe(`${formatNumber(n)} materials short in ${horizon[0]}`),
    );
    expect(screen.getByTestId('tp-summary').textContent).toMatch(new RegExp(`^${formatNumber(n)} materials · `));
    expect(screen.getByTestId('tp-view-exceptions')).toHaveAttribute('data-short-now', horizon[0]);
    // the Exceptions view beside it says the same count is short now, and lists MORE
    fireEvent.click(screen.getByRole('tab', { name: 'Exceptions' }));
    await waitFor(() => expect(screen.getByTestId('tp-short-now').textContent).toBe(`${formatNumber(n)} materials short in ${horizon[0]}`));
    expect(screen.getByTestId('tp-summary').textContent).not.toMatch(new RegExp(`^${formatNumber(n)} materials · `));
  });

  it('a weekly plan makes it "Shortages this week" — the label follows the grain the planner was last in', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByRole('tab', { name: 'Shortages this month' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Packaging' }));
    const tab = screen.getByRole('tab', { name: 'Shortages this week' });
    fireEvent.click(tab);
    expect(screen.getByTestId('tp-view-exceptions')).toHaveAttribute('data-grain', 'week');
    expect(screen.getByTestId('tp-view-exceptions').getAttribute('data-short-now')).toMatch(/^\d{4}-W\d{2}$/);
  });
});

// ─── 2 · the views are chips ────────────────────────────────────────────────

describe('PG-1 · the views are a row of chips — still a tablist of tabs, one selected', () => {
  it('six tabs in one tablist, drawn as chips, exactly one selected', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const list = screen.getByRole('tablist');
    expect(list).toHaveAttribute('data-variant', 'chips');
    const tabs = within(list).getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent)).toEqual(['Shortages this month']);
    expect(tabs[0].className).toMatch(/rounded-full/);
    expect(tabs[0].className).toMatch(/border-action/);
    expect(tabs[1].className).not.toMatch(/border-action\b/);
  });
});

// ─── 3 · row height ─────────────────────────────────────────────────────────

describe('PG-1 · two row heights, the planner’s choice, remembered', () => {
  const mount = () =>
    renderWithProviders(
      <PlanDraftProvider>
        <TimePhasedGrid viewId="rm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid' },
    );

  it('the heights are 26 and 32 — compact fits a supplier row’s two 13px lines and no more', () => {
    expect(ROW_H).toEqual({ compact: 26, comfortable: 32 });
    expect(ROW_H.compact).toBe(2 * 13);
  });

  it('opens comfortable; choosing compact changes the grid and is remembered for the next visit', async () => {
    const first = mount();
    const grid = await screen.findByTestId('tp-grid');
    expect(grid).toHaveAttribute('data-density', 'comfortable');
    expect(screen.getByTestId('tp-density-comfortable')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tp-density-compact')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('tp-density-compact'));
    expect(screen.getByTestId('tp-grid')).toHaveAttribute('data-density', 'compact');
    expect(screen.getByTestId('tp-density-compact')).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('paragon.planGrid.density')).toBe('compact');
    first.unmount();
    mount();
    expect(await screen.findByTestId('tp-grid')).toHaveAttribute('data-density', 'compact');
  });

  it('an unreadable or unknown stored value is comfortable, never a crash', async () => {
    window.localStorage.setItem('paragon.planGrid.density', 'huge');
    mount();
    expect(await screen.findByTestId('tp-grid')).toHaveAttribute('data-density', 'comfortable');
  });

  it('ID — the control reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    mount();
    expect(await screen.findByRole('group', { name: 'Tinggi baris' })).toBeInTheDocument();
    expect(screen.getByTestId('tp-density-compact').textContent).toBe('Rapat');
    expect(screen.getByTestId('tp-density-comfortable').textContent).toBe('Lega');
  });
});

// ─── 4 · bands ──────────────────────────────────────────────────────────────

describe('PG-1 · the plan reads in bands of materials', () => {
  const css = readFileSync(resolve(__dirname, 'planGrid.css'), 'utf8');
  const grid = readFileSync(resolve(__dirname, 'TimePhasedGrid.tsx'), 'utf8');

  it('the band, the rule above a material and the hover are drawn in tokens — on the sticky cells too', () => {
    expect(css).toMatch(/\.tp-grid \.dsg-row\.tp-band \.dsg-cell \{\s*background: theme\('colors\.bg-hover'\);/);
    expect(css).toMatch(/\.tp-grid \.dsg-row\.tp-head \.dsg-cell \{\s*box-shadow: inset 0 1px 0 theme\('colors\.border-input'\);/);
    expect(css).toMatch(/\.tp-grid \.dsg-row:not\(\.dsg-row-header\):hover \.dsg-cell \{\s*background: theme\('colors\.action\.soft'\);/);
    // `.dsg-cell` reaches the sticky gutter and totals cells — more specific than their opaque white
    expect(css).toMatch(/\.tp-grid \.dsg-cell-gutter,\s*\.tp-grid \.dsg-cell-sticky-right \{/);
  });

  it('the band alternates by MATERIAL — keyed on the material, never on the row index', () => {
    expect(grid).toMatch(/bandOf = useMemo\(\(\) => new Map\(visible\.map\(\(b, i\) => \[b\.materialCode, i % 2 === 1\]\)\)/);
    expect(grid).toMatch(/bandOf\.get\(rowData\.materialCode\) \? 'tp-band' : ''/);
    expect(grid).toMatch(/rowData\.blockHead \? 'tp-head' : ''/);
    expect(grid).not.toMatch(/rowIndex % 2/);
  });
});

// ─── 5 · the publication drawer ─────────────────────────────────────────────

describe('PG-1 · in its drawer, Publish is the final commit — and "Discard it" takes its place while it is asked', () => {
  const commands = new MockCommandService();
  const PLANNING: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
  beforeEach(() => forecastPublicationStore.reset());

  const openDraft = () =>
    commands.dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] },
      {
        transitionId: 't_publication_open',
        entity: 'forecastPublication',
        payload: { planVersion: 'PV-2026-08.2', grain: 'month', horizon: ['2026-08', '2026-09', '2026-10'], sourceRef: 'somo-emission@PV-2026-08.2', carryForwardFrom: 'PUB-2026-08-RM-R2' },
      },
    );

  it('one solid button at every moment: Publish, then the destructive confirmation in the critical colour', async () => {
    await openDraft();
    renderWithProviders(
      <SidePanel open onClose={() => {}} title="Forecast publication" wide>
        <PublicationPanel grain="month" bare />
      </SidePanel>,
      { identity: PLANNING, route: '/buyer/plan-grid' },
    );
    const drawer = screen.getByRole('dialog');
    const publish = await screen.findByTestId('publication-publish');
    expect(publish).toHaveAttribute('data-solid');
    expect(publish).toHaveClass('bg-action');
    expect(drawer.querySelectorAll('[data-solid]')).toHaveLength(1);
    // bare: the drawer supplies the heading — the panel does not repeat it
    expect(within(drawer).getAllByRole('heading', { name: 'Forecast publication' })).toHaveLength(1);

    fireEvent.click(screen.getByTestId('publication-discard'));
    const yes = screen.getByTestId('publication-discard-yes');
    expect(yes).toHaveAttribute('data-solid');
    expect(yes).toHaveClass('bg-critical', 'text-white');
    expect(screen.getByTestId('publication-publish')).not.toHaveAttribute('data-solid');
    expect(drawer.querySelectorAll('[data-solid]')).toHaveLength(1);

    fireEvent.click(screen.getByTestId('publication-discard-no'));
    expect(screen.getByTestId('publication-publish')).toHaveAttribute('data-solid');
    expect(drawer.querySelectorAll('[data-solid]')).toHaveLength(1);
  });

  it('KNOWN-GOOD: on its own the panel keeps its card and its heading', async () => {
    renderWithProviders(<PublicationPanel grain="month" />, { identity: PLANNING, route: '/buyer/plan-grid' });
    const panel = await screen.findByTestId('publication-panel');
    expect(panel).toHaveAttribute('data-card');
    expect(within(panel).getByRole('heading', { name: 'Forecast publication' })).toBeInTheDocument();
  });
});
