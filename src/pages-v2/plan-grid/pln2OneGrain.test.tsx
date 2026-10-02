// ────────────────────────────────────────────────────────────────────────────
// PLN-2 · ONE MATERIAL, ONE GRAIN (R-PLN P0 #2).
//
// ⚠️ WHAT THIS WOULD HAVE CAUGHT, MEASURED IN THE BROWSER AT R-PLN: SIM-PM-0068
// (packaging) was listed in the Raw-materials tab by MONTH and in the Packaging
// tab by WEEK. A planner committed it in 2026-11 and in a week of November, and
// the cascade minted two requisitions for one requirement. Every piece was legal
// on its own: the generator emitted every synthetic material at both grains, each
// view listed every type, and each commit was the first on its own intake line.
// The defect is a property of the PAIR, which is why each change below is pinned
// on the pair and not on one line.
//
// The supplier half: the same row read "Allocation · sup-sim-015", cut off by an
// ellipsis, because four surfaces each fell back to the id for the 28 synthetic
// suppliers the supplier master does not hold.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import PlanGrid from '../PlanGrid';
import TimePhasedGrid, { PlanRowLabel } from './TimePhasedGrid';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { formatNumber } from '../../lib/format';
import { oneGrainClash } from './PlannedChangesPanel';
import { blocksOfViewType, buildPlanBlocks, type PlanRow } from './planGridModel';
import { visibleMeasures } from './visibleMeasures';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS, viewGrainAndHorizon, viewTypeAgreesWithGrain, type ViewSpec } from '../../services/planning/views';
import { crossGrainCommitment, generatedIntakeLine, somoIntakeLineId } from '../../services/planning/somoIntake';
import {
  PLANNING_GRAIN_OF_TYPE,
  PLANNING_MATERIALS,
  PLANNING_SUPPLIERS,
  generatedDemand,
  isGeneratedMaterial,
  planningGrainOf,
  planningMaster,
  planningSupplierName,
  suppliersFor,
} from '../../services/planning/somoFixture';
import { mockSuppliers } from '../../data/mockSuppliers';
import type { BucketGrain } from '../../services/planning/bucket';
import type { QueryScope } from '../../services/data/types';

const BUYER: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const view = (id: string) => VIEWS.find((v) => v.viewId === id)!;

/** What a plan tab lists — the grid's own pipeline, over the real seam. */
const listed = async (viewId: 'rm-plan' | 'pm-plan' | 'exceptions', current: BucketGrain) => {
  const v = view(viewId);
  const { grain, horizonLength, materialType } = viewGrainAndHorizon(v, current);
  const horizon = somoHorizon(grain).slice(0, horizonLength);
  const measures = visibleMeasures(v.measuresShown);
  const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon, measures });
  return { page, blocks: blocksOfViewType(buildPlanBlocks(page.items, horizon, measures), materialType) };
};

afterEach(async () => {
  await i18n.changeLanguage('en');
});

// ─── 1 · each plan view lists one type, at its own grain ─────────────────────

describe('PLN-2 · a plan view lists ONE material type — the type planned at its grain', () => {
  it('NAMED: SIM-PM-0068 is listed by Packaging (weekly) and NOT by Raw materials (monthly)', async () => {
    const rm = (await listed('rm-plan', 'month')).blocks.map((b) => b.materialCode);
    const pm = (await listed('pm-plan', 'week')).blocks.map((b) => b.materialCode);
    expect(pm).toContain('SIM-PM-0068');
    expect(rm).not.toContain('SIM-PM-0068');
    // and the mirror, on a raw material
    expect(rm).toContain('SIM-RM-0001');
    expect(pm).not.toContain('SIM-RM-0001');
  });

  it.each([
    ['rm-plan', 'ROH', 'month'],
    ['pm-plan', 'VERP', 'week'],
  ] as const)('%s lists every block as %s at the %s grain — and a non-trivial number of them', async (viewId, type, grain) => {
    const { blocks } = await listed(viewId, grain);
    expect(blocks.length).toBeGreaterThan(500);
    expect(blocks.filter((b) => b.materialType !== type).map((b) => b.materialCode)).toEqual([]);
    expect(viewGrainAndHorizon(view(viewId), grain)).toMatchObject({ grain: PLANNING_GRAIN_OF_TYPE[type], materialType: type });
  });

  it('the Exceptions view lists the type of the grain it follows', async () => {
    const month = (await listed('exceptions', 'month')).blocks;
    const week = (await listed('exceptions', 'week')).blocks;
    expect(month.every((b) => b.materialType === 'ROH')).toBe(true);
    expect(week.every((b) => b.materialType === 'VERP')).toBe(true);
    expect(month.length).toBeGreaterThan(0);
    expect(week.length).toBeGreaterThan(0);
  });

  it('the view-type step is what removes the other type — KNOWN-GOOD: without it a dated source reaches the view', async () => {
    // A real packaging material reaches the MONTHLY seam through the publication
    // (month-native). Without the view's type it would be listed under Raw materials.
    const { page } = await listed('rm-plan', 'month');
    const v = view('rm-plan');
    const horizon = somoHorizon('month').slice(0, v.horizonLength);
    const unfiltered = buildPlanBlocks(page.items, horizon, visibleMeasures(v.measuresShown));
    expect(unfiltered.some((b) => b.materialType === 'VERP')).toBe(true);
    expect(blocksOfViewType(unfiltered, 'ROH').some((b) => b.materialType === 'VERP')).toBe(false);
  });

  it('every registry view declares a type that agrees with its grain; a raw-materials view at a weekly grain does not', () => {
    for (const v of VIEWS) expect(viewTypeAgreesWithGrain(v), v.viewId).toBe(true);
    const wrong: ViewSpec = { ...view('rm-plan'), grain: 'week' };
    expect(viewTypeAgreesWithGrain(wrong)).toBe(false);
  });

  it('on the page: the summary counts the view’s own type — the materials the grid lists', async () => {
    const typed = (await listed('rm-plan', 'month')).blocks.length;
    renderWithProviders(
      <PlanDraftProvider>
        <TimePhasedGrid viewId="rm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid' },
    );
    await waitFor(() => expect(screen.getByTestId('tp-summary').textContent).toMatch(new RegExp(`^${formatNumber(typed)} materials`)));
  });

  it('on the page: the type is the VIEW’s statement — there is no material-type select to change it', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const rm = screen.getByTestId('tp-view-rm-plan');
    expect(within(rm).queryByTestId('tp-filter-type')).toBeNull();
    expect(within(rm).getByTestId('tp-view-type')).toHaveAttribute('data-material-type', 'ROH');
    expect(within(rm).getByTestId('tp-view-type').textContent).toBe('Raw materials (RM) · planned monthly');
    fireEvent.click(screen.getByRole('tab', { name: 'Packaging' }));
    const pm = screen.getByTestId('tp-view-pm-plan');
    expect(within(pm).getByTestId('tp-view-type')).toHaveAttribute('data-material-type', 'VERP');
    expect(within(pm).getByTestId('tp-view-type').textContent).toBe('Packaging (PM) · planned weekly');
  });

  it('ID — the view’s type reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(within(screen.getByTestId('tp-view-rm-plan')).getByTestId('tp-view-type').textContent).toBe(
      'Bahan baku (RM) · direncanakan bulanan',
    );
  });
});

// ─── 2 · the generator emits one grain per material ──────────────────────────

describe('PLN-2 · the SOMO generator emits ONE grain per material, by type', () => {
  it('every generated material has a figure at its own grain only — over both whole horizons', () => {
    const months = somoHorizon('month');
    const weeks = somoHorizon('week');
    const offLane: string[] = [];
    let inLane = 0;
    for (const code of PLANNING_MATERIALS.filter(isGeneratedMaterial)) {
      const own = planningGrainOf(code);
      for (const b of months) if (generatedDemand(code, b) !== null) (own === 'month' ? inLane++ : offLane.push(`${code}@${b}`));
      for (const b of weeks) if (generatedDemand(code, b) !== null) (own === 'week' ? inLane++ : offLane.push(`${code}@${b}`));
    }
    expect(offLane.slice(0, 5)).toEqual([]);
    // population control: the scan saw the corpus, not an empty generator
    expect(inLane).toBeGreaterThan(10_000);
  });

  it('NAMED: SIM-PM-0068 has weekly proposals and no monthly one — so no monthly intake line exists', () => {
    expect(planningGrainOf('SIM-PM-0068')).toBe('week');
    expect(planningGrainOf('SIM-RM-0001')).toBe('month');
    expect(generatedIntakeLine(somoIntakeLineId('SIM-PM-0068', '2026-W45'))).toMatchObject({ suggestedQty: 45_750, uom: 'PCS' });
    expect(generatedIntakeLine(somoIntakeLineId('SIM-PM-0068', '2026-11'))).toBeNull();
    expect(generatedIntakeLine(somoIntakeLineId('SIM-RM-0001', '2026-W45'))).toBeNull();
  });

  it('the seam emits no fact at all for a generated material off its grain — not a row of dashes', async () => {
    const monthly = (await listed('rm-plan', 'month')).page.items;
    const weekly = (await listed('pm-plan', 'week')).page.items;
    expect(monthly.filter((f) => f.materialCode.startsWith('SIM-PM-'))).toEqual([]);
    expect(weekly.filter((f) => f.materialCode.startsWith('SIM-RM-'))).toEqual([]);
    expect(monthly.some((f) => f.materialCode === 'SIM-RM-0001')).toBe(true);
    expect(weekly.some((f) => f.materialCode === 'SIM-PM-0068')).toBe(true);
  });

  it('a type the master holds is planned at exactly one grain — the lane table is total and one-to-one', () => {
    const types = new Set(Object.values(planningMaster()).map((e) => e.materialType));
    for (const t of types) expect(PLANNING_GRAIN_OF_TYPE[t], t).toBeDefined();
    expect(new Set(Object.values(PLANNING_GRAIN_OF_TYPE)).size).toBe(Object.keys(PLANNING_GRAIN_OF_TYPE).length);
  });
});

// ─── 3 · the guard: one material × period commits at most once ───────────────

describe('PLN-2 · INTAKE_ONE_GRAIN — one material × period commits at most once, across grains', () => {
  const svc = new MockCommandService();
  const commit = (lineId: string, qty: number) =>
    svc.dispatch(BUYER, {
      transitionId: 't_intake_commit',
      entity: 'intakeLine',
      entityId: lineId,
      payload: { acceptedQty: qty, acceptedQtyRaw: String(qty) },
    });
  const prsFor = (lineId: string) => purchaseRequisitionStore.all().filter((p) => p.intakeLineId === lineId);
  /**
   * The world R-PLN measured, reconstructed in the triage store: a commit
   * already recorded at the OTHER grain. The generator can no longer emit that
   * line, so it is placed as a record — the state a stored triage from before
   * this batch, or a producer emitting both grains (F1's real SOMO), leaves.
   */
  const alreadyCommitted = (lineId: string) =>
    intakeLineStore.put({ lineId, state: 'Committed', committedQty: 1, committedAt: '2026-09-01T00:00:00.000Z' });

  beforeEach(() => {
    intakeLineStore.reset();
    purchaseRequisitionStore.reset();
  });

  it('NAMED: SIM-PM-0068 committed for 2026-11 → a week of November is REFUSED by name, and no second requisition exists', async () => {
    alreadyCommitted('pil-somo-SIM-PM-0068@2026-11');
    const line = somoIntakeLineId('SIM-PM-0068', '2026-W45');
    const r = await commit(line, 45_750);
    expect(r.status).toBe('failed');
    expect(r.reason).toMatch(/INTAKE_ONE_GRAIN: SIM-PM-0068 2026-W45 overlaps 2026-11, already committed on intake line 'pil-somo-SIM-PM-0068@2026-11'/);
    expect(prsFor(line)).toEqual([]);
    expect(intakeLineStore.stateOf(line)).toBe('Pending');
  });

  it('a week that STRADDLES the month boundary overlaps it (W44 ends on 1 November)', async () => {
    alreadyCommitted('pil-somo-SIM-PM-0068@2026-11');
    expect((await commit(somoIntakeLineId('SIM-PM-0068', '2026-W44'), 2_850)).reason).toMatch(/INTAKE_ONE_GRAIN/);
  });

  it('KNOWN-GOOD: a week wholly outside the committed month commits and mints its one requisition', async () => {
    alreadyCommitted('pil-somo-SIM-PM-0068@2026-11');
    const line = somoIntakeLineId('SIM-PM-0068', '2026-W43');
    expect((await commit(line, 186_700)).status).not.toBe('failed');
    expect(prsFor(line)).toHaveLength(1);
  });

  it('the other direction: a raw material committed for a week refuses its month, by name', async () => {
    alreadyCommitted('pil-somo-SIM-RM-0001@2026-W45');
    const month = somoIntakeLineId('SIM-RM-0001', '2026-11');
    const suggested = generatedIntakeLine(month)!.suggestedQty;
    const r = await commit(month, suggested);
    expect(r.reason).toMatch(/INTAKE_ONE_GRAIN: SIM-RM-0001 2026-11 overlaps 2026-W45/);
    expect(prsFor(month)).toEqual([]);
  });

  it('KNOWN-GOOD: another material in the same period is untouched', async () => {
    alreadyCommitted('pil-somo-SIM-PM-0068@2026-11');
    const line = somoIntakeLineId('SIM-PM-0002', '2026-W45');
    const qty = generatedIntakeLine(line)!.suggestedQty;
    expect((await commit(line, qty)).status).not.toBe('failed');
  });

  it('the rule, both ways, on ids alone', () => {
    const m = 'pil-somo-SIM-PM-0068@2026-11';
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2026-W45', [m])).toBe(m);
    expect(crossGrainCommitment(m, ['pil-somo-SIM-PM-0068@2026-W45'])).toBe('pil-somo-SIM-PM-0068@2026-W45');
    // half-open: W48 (23–29 Nov) is inside, W49 (30 Nov–6 Dec) straddles, W50 is outside
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2026-W49', [m])).toBe(m);
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2026-W50', [m])).toBeNull();
    // same grain is not this rule's (legality and replay answer it); nor is another material
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2026-12', [m])).toBeNull();
    expect(crossGrainCommitment('pil-somo-SIM-PM-0002@2026-W45', [m])).toBeNull();
    // an authored C7 line names no material code, so it is outside the rule
    expect(crossGrainCommitment('pil-grid-001', [m])).toBeNull();
    // a week that OPENS on the 1st (2027-W05 is Mon 1 Feb) belongs to February only
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2027-W05', ['pil-somo-SIM-PM-0068@2027-01'])).toBeNull();
    expect(crossGrainCommitment('pil-somo-SIM-PM-0068@2027-W05', ['pil-somo-SIM-PM-0068@2027-02'])).toBe('pil-somo-SIM-PM-0068@2027-02');
  });

  it('KNOWN-GOOD: a DISMISSED line at the other grain commits nothing, so it blocks nothing', async () => {
    intakeLineStore.put({ lineId: 'pil-somo-SIM-PM-0068@2026-11', state: 'Dismissed' });
    const line = somoIntakeLineId('SIM-PM-0068', '2026-W45');
    expect((await commit(line, 45_750)).status).not.toBe('failed');
    expect(prsFor(line)).toHaveLength(1);
  });

  it('on the page: pushing the week shows the refusal in the panel’s own words, and the row stays PLANNED', async () => {
    alreadyCommitted('pil-somo-SIM-PM-0068@2026-11');
    const pm = view('pm-plan');
    const horizon = somoHorizon('week').slice(0, pm.horizonLength);
    const measures = visibleMeasures(pm.measuresShown);
    const out = derivePlanningFacts({ horizon, measures, materialCodes: ['SIM-PM-0068'] });
    if (!out.ok) throw new Error('refused');
    const row = buildPlanBlocks(out.facts, horizon, measures).flatMap((b) => b.rows).find((r) => r.measureId === 'acceptedQty')!;
    const ref = row.seamRefs!['2026-W45'];
    expect(ref).toBe('pil-somo-SIM-PM-0068@2026-W45');
    const Seed: React.FC = () => {
      const api = usePlanDraft()!;
      return (
        <button type="button" onClick={() => api.edit(row, '2026-W45', String(row.cells['2026-W45']), 'TYPED')}>
          seed
        </button>
      );
    };
    renderWithProviders(
      <PlanDraftProvider>
        <Seed />
        <TimePhasedGrid viewId="pm-plan" currentGrain="week" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid' },
    );
    fireEvent.click(screen.getByText('seed'));
    fireEvent.click(screen.getByTestId(`plan-push-row-${ref}`));
    const failure = await screen.findByTestId(`plan-draft-failure-${ref}`);
    expect(failure).toHaveTextContent('SIM-PM-0068 is already committed for 2026-11, which overlaps 2026-W45');
    expect(failure.textContent).not.toMatch(/INTAKE_ONE_GRAIN|pil-somo-/);
    expect(prsFor(ref)).toEqual([]);
    expect(screen.getByTestId('plan-draft-banner')).toBeInTheDocument();
  });

  it('the refusal reaches the planner in the surface’s own words, EN and ID — never the developer trail', async () => {
    const reason =
      "INTAKE_ONE_GRAIN: SIM-PM-0068 2026-W45 overlaps 2026-11, already committed on intake line 'pil-somo-SIM-PM-0068@2026-11' — one material and period commits once, at one grain";
    const clash = oneGrainClash(`POLICY_REJECTED: ${reason}`)!;
    expect(clash).toEqual({ material: 'SIM-PM-0068', period: '2026-W45', committed: '2026-11' });
    const en = i18n.t('planGrid.edit.push.oneGrain', clash);
    expect(en).toBe(
      'Not pushed — SIM-PM-0068 is already committed for 2026-11, which overlaps 2026-W45 — one requirement is committed once, monthly or weekly, never both.',
    );
    await i18n.changeLanguage('id');
    const id = i18n.t('planGrid.edit.push.oneGrain', clash);
    expect(id).toMatch(/^Tidak terkirim — SIM-PM-0068 sudah dikomit untuk 2026-11/);
    for (const text of [en, id]) expect(text).not.toMatch(/INTAKE_ONE_GRAIN|pil-somo-/);
    expect(oneGrainClash('INTAKE_QTY_FLOOR: acceptedQty is 0')).toBeNull();
  });
});

// ─── 4 · supplier names from the master, in full ─────────────────────────────

describe('PLN-2 · a planning surface names a supplier from the supplier master — never by its id', () => {
  it('NAMED: sup-sim-015 (SIM-PM-0068’s supplier) has a name; a real supplier keeps the master’s', () => {
    expect(suppliersFor('SIM-PM-0068')).toEqual(['sup-sim-015']);
    expect(planningSupplierName('sup-sim-015')).toBe('Sample supplier 015');
    expect(planningSupplierName(mockSuppliers[0].id)).toBe(mockSuppliers[0].name);
  });

  it('every planning supplier resolves to a name that is not its id — all 40', () => {
    expect(PLANNING_SUPPLIERS.length).toBeGreaterThan(30);
    expect(PLANNING_SUPPLIERS.filter((id) => planningSupplierName(id) === id)).toEqual([]);
  });

  const allocationRow = (supplierId: string): PlanRow => ({
    id: `SIM-PM-0068|allocation|${supplierId}`,
    materialCode: 'SIM-PM-0068',
    materialLabel: 'Sample packaging 0068',
    materialType: 'VERP',
    uom: 'PCS',
    measureId: 'allocation',
    supplierId,
    cells: {},
    derived: false,
    blockHead: false,
  });

  it('the row label states the supplier’s NAME in full, on a line of its own that never truncates', () => {
    renderWithProviders(<PlanRowLabel row={allocationRow('sup-sim-015')} />);
    const name = screen.getByTestId('tp-supplier-name');
    expect(name.textContent).toBe('Sample supplier 015');
    expect(name.className).not.toMatch(/truncate|ellipsis/);
    expect(name.className).toMatch(/whitespace-nowrap/);
    expect(screen.getByTestId('tp-supplier-row-label')).toHaveAttribute('title', 'Allocation · Sample supplier 015');
    expect(document.body.textContent).not.toContain('sup-sim-');
  });

  it('the longest real supplier name is rendered whole', () => {
    const longest = [...mockSuppliers].sort((a, b) => b.name.length - a.name.length)[0];
    renderWithProviders(<PlanRowLabel row={allocationRow(longest.id)} />);
    expect(screen.getByTestId('tp-supplier-name').textContent).toBe(longest.name);
  });

  it('no planning surface resolves a supplier name on its own — one resolver, so none can fall back to the id', () => {
    const files = [
      'src/pages-v2/PlanGrid.tsx',
      'src/pages-v2/plan-grid/TimePhasedGrid.tsx',
      'src/pages-v2/plan-grid/PlannedChangesPanel.tsx',
      'src/pages-v2/plan-grid/PublicationPanel.tsx',
    ];
    for (const f of files) {
      const src = readFileSync(resolve(process.cwd(), f), 'utf-8');
      expect(src, f).not.toMatch(/mockSuppliers\.find\(/);
      // the surface's own name for the resolver IS the resolver — not a function that might fall back
      expect(src, f).toMatch(/const (supplierName|supplierLabel) = planningSupplierName;/);
      expect(src.match(/const (supplierName|supplierLabel) =/g), f).toHaveLength(1);
    }
  });
});
