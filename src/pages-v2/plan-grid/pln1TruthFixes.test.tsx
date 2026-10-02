// ────────────────────────────────────────────────────────────────────────────
// PLN-1 · THE TRUTH FIXES — one spec per defect R-PLN measured in the browser,
// each written so it would have gone red against the tree that shipped it.
//
//  #1  a paste into an OPEN editor was swallowed by that one field, and the note
//      kept the previous paste's success          → `routePaste`
//  #3  the Exceptions tab could not see "awaiting" and was fixed monthly
//                                                   → exceptions parity, per grain
//  #7  page chrome counted another tab's rows and claimed "the one figure"
//                                                   → chrome guard + derived hint
//  ·   a committed cell re-opened, then failed with "(Committed->Committed)"
//                                                   → COMMITTED, read-only, own words
//  R2  typed and pasted values follow the seat; a 10× slip is held for a confirm,
//      and every edited cell shows its reading     → magnitude gate + reading
//
// (#4, the requisition's value, is driven through the dispatcher in
// `services/transitions/intakeCommittedValue.test.ts`.)
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';

import { renderWithProviders } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import { planGridEn, planGridId } from '../../lib/i18n/planGrid';
import { MockPlanningService } from '../../services/data/mock/MockPlanningService';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { intakeLineStore } from '../../services/data/mock/stores/intakeLineStore';
import { purchaseRequisitionStore } from '../../services/data/mock/stores/purchaseRequisitionStore';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { VIEWS, viewGrainAndHorizon } from '../../services/planning/views';
import { somoHorizon } from '../../services/planning/facts';
import { measureOf } from '../../services/planning/measures';
import type { BucketGrain } from '../../services/planning/bucket';
import PlanGrid from '../PlanGrid';
import { visibleMeasures } from './visibleMeasures';
import { applyPlanView, buildPlanBlocks, DEFAULT_PLAN_FILTER, DEFAULT_PLAN_SORT, isEditableCell, type PlanRow } from './planGridModel';
import { PlanDraftProvider, usePlanDraft } from './PlanDraftProvider';
import TimePhasedGrid from './TimePhasedGrid';
import { pushReasonKey } from './PlannedChangesPanel';
import {
  EMPTY_DRAFT,
  applyEdit,
  applyPaste,
  blockedBy,
  cellKey,
  magnitudeFlag,
  pushBlocked,
  pushEntries,
  routePaste,
  setMagnitudeConfirmed,
  setReason,
  type EditOrigin,
  type PlanDraftEntry,
} from './planDraft';

afterEach(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  intakeLineStore.reset();
  purchaseRequisitionStore.reset();
});

const BUYER = { personaType: 'buyer' as const, supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const RM = VIEWS.find((v) => v.viewId === 'rm-plan')!;
const RM_HORIZON = somoHorizon('month').slice(0, RM.horizonLength);
const RM_MEASURES = visibleMeasures(RM.measuresShown);

const acceptedRow = (code: string): PlanRow => {
  const out = derivePlanningFacts({ horizon: RM_HORIZON, measures: RM_MEASURES, materialCodes: [code] });
  if (!out.ok) throw new Error('refused');
  return buildPlanBlocks(out.facts, RM_HORIZON, RM_MEASURES).flatMap((b) => b.rows).find((r) => r.measureId === 'acceptedQty')!;
};

// ─── #1 · paste routing ──────────────────────────────────────────────────────

describe('PLN-1 #1 · a multi-cell paste is the GRID\'s, even into an open editor', () => {
  // The exact clipboard measured at R-PLN: one row of five copied cells.
  const MEASURED = '1000\t2000\t3,000\t4000\t5000';

  it('the measured row, pasted while an editor is open, goes to the grid', () => {
    expect(routePaste(MEASURED, true)).toBe('grid');
  });

  it('a column (newline-separated) into an open editor also goes to the grid; a trailing newline adds no cell', () => {
    expect(routePaste('111\n222\n333', true)).toBe('grid');
    expect(routePaste('111\n', true)).toBe('field');
  });

  it('KNOWN-GOOD: one token into an open editor is the field\'s own paste; with no editor everything is the grid\'s', () => {
    expect(routePaste('4500', true)).toBe('field');
    expect(routePaste('4500', false)).toBe('grid');
    expect(routePaste(MEASURED, false)).toBe('grid');
  });

  it('and the grid paste the router admits plans every cell of the measured row', () => {
    const row = acceptedRow('SIM-RM-0001');
    const r = applyPaste(EMPTY_DRAFT, [row], RM_HORIZON, { row: 0, col: 0 }, MEASURED, 'en');
    // R2: `3,000` under EN is three thousand, no longer refused as ambiguous
    expect(r).toMatchObject({ planned: 5, refused: 0, outside: 0 });
  });
});

// ─── #3 · exceptions ─────────────────────────────────────────────────────────

const blocksFor = async (viewId: 'rm-plan' | 'pm-plan' | 'exceptions', grain: BucketGrain) => {
  const view = VIEWS.find((v) => v.viewId === viewId)!;
  const { horizonLength } = viewGrainAndHorizon(view, grain);
  const horizon = somoHorizon(grain).slice(0, horizonLength);
  const measures = visibleMeasures(view.measuresShown);
  const page = await new MockPlanningService().getPlanningFacts(BUYER, { horizon, measures });
  return buildPlanBlocks(page.items, horizon, measures);
};
const exceptionCodes = (blocks: Awaited<ReturnType<typeof blocksFor>>) =>
  applyPlanView(blocks, { ...DEFAULT_PLAN_FILTER, exceptionsOnly: true }, DEFAULT_PLAN_SORT).map((b) => b.materialCode).sort();

describe('PLN-1 #3 · the Exceptions tab lists exactly the exceptions its plan view flags', () => {
  it.each([
    ['rm-plan', 'month'],
    ['pm-plan', 'week'],
  ] as const)('%s → exceptions at %s: the same set, member for member', async (planView, grain) => {
    const plan = exceptionCodes(await blocksFor(planView, grain));
    const exc = exceptionCodes(await blocksFor('exceptions', grain));
    // population control — the comparison is over a real, non-trivial set
    expect(plan.length).toBeGreaterThan(50);
    expect(exc).toEqual(plan);
  });

  it('NAMED: SIM-PM-0004 is an AWAITING exception (allocated, unconfirmed) and the Exceptions tab lists it', async () => {
    const exc = await blocksFor('exceptions', 'month');
    const b = exc.find((x) => x.materialCode === 'SIM-PM-0004');
    expect(b?.exceptions).toMatchObject({ awaiting: true, shortfall: false });
    expect(exceptionCodes(exc)).toContain('SIM-PM-0004');
    // and a covered material is not on it
    expect(exceptionCodes(exc)).not.toContain('SIM-RM-0001');
  });

  it('the exceptions view follows the current grain, at that grain\'s horizon', () => {
    const exc = VIEWS.find((v) => v.viewId === 'exceptions')!;
    expect(viewGrainAndHorizon(exc, 'month')).toEqual({ grain: 'month', horizonLength: 12 });
    expect(viewGrainAndHorizon(exc, 'week')).toEqual({ grain: 'week', horizonLength: 16 });
    // a fixed-grain view ignores it
    expect(viewGrainAndHorizon(RM, 'week')).toEqual({ grain: 'month', horizonLength: 12 });
  });

  it('on the page: Packaging, then Exceptions, opens the WEEKLY exceptions; Raw materials then Exceptions, the monthly', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    fireEvent.click(screen.getByRole('tab', { name: 'Packaging' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Exceptions' }));
    expect(screen.getByTestId('tp-view-exceptions')).toHaveAttribute('data-grain', 'week');
    fireEvent.click(screen.getByRole('tab', { name: 'Raw materials' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Exceptions' }));
    expect(screen.getByTestId('tp-view-exceptions')).toHaveAttribute('data-grain', 'month');
  });
});

// ─── committed cells ─────────────────────────────────────────────────────────

describe('PLN-1 · a committed cell is read-only and says so in its own words', () => {
  const committed = (): PlanRow => {
    const row = acceptedRow('SIM-RM-0001');
    return { ...row, committedCells: { ...(row.committedCells ?? {}), '2026-09': true } };
  };

  it('the registry check refuses a committed cell; its pending neighbour stays editable', () => {
    const row = committed();
    expect(isEditableCell(row, '2026-09')).toBe(false);
    expect(isEditableCell(row, '2026-10')).toBe(true);
  });

  it.each(['TYPED', 'PASTE'] as const)('a %s edit of a committed cell is refused COMMITTED and plans nothing', (origin: EditOrigin) => {
    const row = committed();
    const d = applyEdit(EMPTY_DRAFT, row, '2026-09', '9999', origin, 'en');
    expect(d.entries.size).toBe(0);
    expect(d.refusals.get(cellKey(row.id, '2026-09'))).toMatchObject({ reason: 'COMMITTED' });
  });

  it('a push the spine refuses because the line moved on is rendered in own words, never the trail', () => {
    expect(pushReasonKey('ILLEGAL_TRANSITION:Committed->Committed')).toBe('planGrid.edit.push.alreadyCommitted');
    expect(pushReasonKey('ILLEGAL_TRANSITION:Dismissed->Committed')).toBe('planGrid.edit.push.lineDismissed');
    // an unowned head falls through to the spine's own sentence
    expect(pushReasonKey('INTAKE_QTY_FLOOR:x')).toBeUndefined();
    for (const map of [planGridEn, planGridId]) {
      for (const k of ['planGrid.edit.push.alreadyCommitted', 'planGrid.edit.push.lineDismissed', 'planGrid.edit.refused.COMMITTED']) {
        expect(map[k], k).toBeTruthy();
        expect(map[k]).not.toMatch(/->|ILLEGAL_TRANSITION|Committed\b/);
      }
    }
  });
});

// ─── #7 · page chrome ────────────────────────────────────────────────────────

/** A claim the chrome may not make: a count of what is editable, or a count interpolated from one tab's data. */
const CHROME_CLAIMS: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: 'EN · the one/only figure', re: /\b(the\s+one|only|sole|single)\s+(figure|thing|field|value)\b/i },
  { label: 'ID · satu-satunya', re: /satu-satunya/i },
  { label: 'count interpolation', re: /\{\{\s*(quotations|lines|count|n|materials|rows)\s*\}\}/ },
];
const claimsIn = (text: string) => CHROME_CLAIMS.filter((c) => c.re.test(text)).map((c) => c.label);
const CHROME_KEYS = ['planGrid.header.subtitle', 'planGrid.meta.views', 'planGrid.honesty.title', 'planGrid.honesty.body', 'planGrid.edit.hint'];

describe('PLN-1 #7 · the page chrome counts nothing and claims no "one figure"', () => {
  it('⚠ POPULATION CONTROL — every chrome key exists in both locales', () => {
    for (const map of [planGridEn, planGridId]) for (const k of CHROME_KEYS) expect(map[k], k).toMatch(/\S{3}/);
  });

  it('⚠ POSITIVE CONTROL — the strings PLN-1 retired are caught', () => {
    expect(claimsIn('Sample planning surface — {{quotations}} quotations, {{lines}} intake lines')).toContain('count interpolation');
    expect(claimsIn('Accepted quantity is the one figure you can change: select a cell')).toContain('EN · the one/only figure');
    expect(claimsIn('Jumlah yang diterima adalah satu-satunya angka yang dapat Anda ubah')).toContain('ID · satu-satunya');
  });

  it('the shipped chrome claims nothing, in either locale', () => {
    for (const [name, map] of [['en', planGridEn], ['id', planGridId]] as const) {
      for (const k of CHROME_KEYS) expect(claimsIn(map[k]), `${name}/${k}: ${map[k]}`).toEqual([]);
    }
  });

  it.each(['en', 'id'] as const)('%s — the edit hint names EVERY editable measure the view shows, from the registry', async (lng) => {
    await i18n.changeLanguage(lng);
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const hint = (await screen.findByTestId('tp-edit-hint')).textContent ?? '';
    const editable = RM_MEASURES.filter((m) => measureOf(m).editable !== false);
    // population control: the registry has more than one editable measure here
    expect(editable).toEqual(expect.arrayContaining(['acceptedQty', 'allocation']));
    for (const m of editable) expect(hint).toContain(i18n.t(measureOf(m).labelKey));
  });

  it('the subtitle and meta line describe the plan, not the award tab', () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByText(/Time-phased plan by material and bucket/)).toBeInTheDocument();
    expect(screen.queryByText(/quotations/i)).toBeNull();
  });
});

// ─── R2 · magnitude gate and reading ─────────────────────────────────────────

const entry = (value: number, baseline: number | null): PlanDraftEntry => ({
  seamRef: 's', rowId: 'r', materialCode: 'M', supplierId: null, uom: 'KG', bucket: '2026-09',
  measureId: 'acceptedQty', raw: String(value), value, baseline, origin: 'TYPED', reason: 'r', planState: 'PLANNED',
});

describe('R2 · a value more than 10× or under 0.1× its baseline is held for a confirm', () => {
  it('the band, at its edges — 10× and 0.1× are inside; just past them is flagged', () => {
    expect(magnitudeFlag(entry(100_000, 10_000))).toBe(false);
    expect(magnitudeFlag(entry(100_001, 10_000))).toBe(true);
    expect(magnitudeFlag(entry(1_000, 10_000))).toBe(false);
    expect(magnitudeFlag(entry(999, 10_000))).toBe(true);
  });

  it('the measured slip — "12.000" under EN read as 12 against a delivered 10,950 — is flagged', () => {
    const row = acceptedRow('SIM-RM-0001');
    const d = applyEdit(EMPTY_DRAFT, row, '2026-09', '12.000', 'TYPED', 'en');
    const e = [...d.entries.values()][0];
    expect(e).toMatchObject({ value: 12, raw: '12.000' });
    expect(magnitudeFlag(e)).toBe(true);
  });

  it('no baseline (or a zero one) gives no ratio — the flag stays down rather than guessing', () => {
    expect(magnitudeFlag(entry(5, null))).toBe(false);
    expect(magnitudeFlag(entry(5, 0))).toBe(false);
  });

  it('flagged → blocked as MAGNITUDE_UNCONFIRMED; confirmed → free; a re-edit withdraws the confirmation', () => {
    const row = acceptedRow('SIM-RM-0001');
    let d = applyEdit(EMPTY_DRAFT, row, '2026-09', '12', 'TYPED', 'en');
    const ref = row.seamRefs!['2026-09'];
    d = setReason(d, ref, 'checked');
    expect(blockedBy(d.entries.get(ref)!)).toBe('MAGNITUDE_UNCONFIRMED');
    d = setMagnitudeConfirmed(d, ref, true);
    expect(pushBlocked(d.entries.get(ref)!)).toBe(false);
    d = applyEdit(d, row, '2026-09', '13', 'TYPED', 'en');
    expect(blockedBy(d.entries.get(ref)!)).toBe('MAGNITUDE_UNCONFIRMED');
  });
});

describe('R2 · the push holds a flagged row BEFORE dispatch, and lets it go once confirmed', () => {
  it('unconfirmed → blocked MAGNITUDE_UNCONFIRMED and nothing dispatched; confirmed → one commit at the planner’s value', async () => {
    const row = acceptedRow('SIM-RM-0003');
    const ref = row.seamRefs!['2026-09'];
    let d = applyEdit(EMPTY_DRAFT, row, '2026-09', '12', 'TYPED', 'en');
    d = setReason(d, ref, 'checked the plant plan');
    const calls: number[] = [];
    const commit = async (v: { acceptedQty: number }) => {
      calls.push(v.acceptedQty);
      return { correlationId: 'c1', transitionId: 't_intake_commit', status: 'done' } as const;
    };
    expect(await pushEntries([d.entries.get(ref)!], commit, 'en')).toEqual([
      { seamRef: ref, kind: 'blocked', reason: 'MAGNITUDE_UNCONFIRMED' },
    ]);
    expect(calls).toEqual([]);
    d = setMagnitudeConfirmed(d, ref, true);
    expect((await pushEntries([d.entries.get(ref)!], commit, 'en'))[0].kind).toBe('dispatched');
    expect(calls).toEqual([12]);
  });
});

/** Makes the edits a cell would make, through the provider's own `edit`. */
const Seed: React.FC<{ row: PlanRow; edits: readonly [string, string, EditOrigin][] }> = ({ row, edits }) => {
  const api = usePlanDraft()!;
  return (
    <button type="button" onClick={() => edits.forEach(([b, raw, o]) => api.edit(row, b, raw, o))}>
      seed
    </button>
  );
};

describe('R2 · on the page — the reading, the flag and the confirm', () => {
  it.each([
    ['en', '12.000', '“12.000” = 12 KG', true],
    ['id', '12.000', '“12.000” = 12.000 KG', false],
  ] as const)('%s — typed "%s" shows its reading %s; flagged: %s', async (lng, raw, reading, flagged) => {
    await i18n.changeLanguage(lng);
    const row = acceptedRow('SIM-RM-0001');
    const ref = row.seamRefs!['2026-09'];
    renderWithProviders(
      <PlanDraftProvider>
        <Seed row={row} edits={[['2026-09', raw, 'TYPED']]} />
        <TimePhasedGrid viewId="rm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid' },
    );
    fireEvent.click(screen.getByText('seed'));
    expect(screen.getByTestId(`plan-draft-reading-${ref}`).textContent).toBe(reading);
    expect(screen.queryByTestId(`plan-draft-magnitude-${ref}`) !== null).toBe(flagged);
    if (flagged) {
      const box = within(screen.getByTestId(`plan-draft-magnitude-${ref}`)).getByRole('checkbox') as HTMLInputElement;
      expect(box.checked).toBe(false);
      fireEvent.click(box);
      expect((screen.getByTestId(`plan-draft-confirm-${ref}`) as HTMLInputElement).checked).toBe(true);
    }
  });
});
