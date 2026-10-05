// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · PLANNER ERGONOMICS (R-PLN P1, the last Planning batch).
//
// Measured on built main before this batch, at 1600×900:
//  · the grid began at 929 px — below the fold, under two full banners and a
//    280 px publication panel — inside a page that scrolled as well as the grid;
//  · "Enter, →, 7000" wrote 7000 onto the END of the cell just left ("5007") and
//    the next cell never got it; typing into a read-only cell did nothing, and
//    said nothing;
//  · Delete and Ctrl+Z did nothing a planner could see; Ctrl+C copied empty cells;
//  · every row repeated the code and cut the material label to fit;
//  · a "MODELED" pill sat on every dash and zero of a shortfall row.
//
// Each spec below fails on the tree before PLN-5. The keyboard WIRING (capture
// phase, before the engine) is proven in the browser; the decisions it makes are
// proven here, through the pure `decideKey` the handler asks.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, act, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import PlanGrid from '../PlanGrid';
import TimePhasedGrid, { EditableBucketCell, PlanBucketCell, PlanRowLabel } from './TimePhasedGrid';
import { PlanDraftProvider, usePlanDraft, type PlanDraftApi } from './PlanDraftProvider';
import PublicationPanel from './PublicationPanel';
import { buildPlanBlocks, exceptionReasons, isPlanException, type PlanExceptions, type PlanRow } from './planGridModel';
import { visibleMeasures } from './visibleMeasures';
import { EMPTY_DRAFT, applyEdit, applyPushOutcomes, applyUndo, diffEntries, removeEntries, setReason } from './planDraft';
import { copyText, decideKey, type KeyContext, type KeyInput } from './gridKeys';
import { fitHeight, FIT_SLACK } from './useFitHeight';
import { applyGridRoles } from './useGridRoles';
import { derivePlanningFacts } from '../../services/data/mock/planningFacts';
import { somoHorizon } from '../../services/planning/facts';
import { VIEWS } from '../../services/planning/views';
import { planGridEn, planGridId } from '../../lib/i18n/planGrid';
import { intakeReviewId } from '../../lib/i18n/intakeReview';
import { requisitionsId } from '../../lib/i18n/requisitions';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

const PM = VIEWS.find((v) => v.viewId === 'pm-plan')!;
const HORIZON = somoHorizon('week').slice(0, PM.horizonLength);
const MEASURES = visibleMeasures(PM.measuresShown);

/** A material's rows in the weekly plan, from the seam. */
const blockRows = (code: string): PlanRow[] => {
  const out = derivePlanningFacts({ horizon: HORIZON, measures: MEASURES, materialCodes: [code] });
  if (!out.ok) throw new Error('refused');
  return buildPlanBlocks(out.facts, HORIZON, MEASURES).flatMap((b) => b.rows);
};
const accepted = (code: string) => blockRows(code).find((r) => r.measureId === 'acceptedQty')!;
/** The first bucket from which three consecutive buckets carry a seam row. */
const run3 = (row: PlanRow): number => HORIZON.findIndex((_, i) => [0, 1, 2].every((d) => row.seamRefs?.[HORIZON[i + d]]));
const demand = (code: string) => blockRows(code).find((r) => r.measureId === 'demand')!;

// ─── the keyboard, as the handler decides it ────────────────────────────────

const key = (k: string, mods: Partial<Omit<KeyInput, 'key'>> = {}): KeyInput => ({ key: k, ctrl: false, meta: false, alt: false, shift: false, ...mods });
const ctx = (c: Partial<KeyContext> = {}): KeyContext => ({ editorOpen: false, mode: 'enter', editable: true, ...c });

describe('PLN-5 · keyboard truth — what a key does (decideKey)', () => {
  it('ENTER mode: ← / → commit the open cell and MOVE — never a caret move into the cell just left', () => {
    expect(decideKey(key('ArrowRight'), ctx({ editorOpen: true, mode: 'enter' }))).toEqual({ kind: 'commitMove', dir: 1 });
    expect(decideKey(key('ArrowLeft'), ctx({ editorOpen: true, mode: 'enter' }))).toEqual({ kind: 'commitMove', dir: -1 });
  });

  it('CARET mode (F2 or a click): ← / → are the editor’s caret keys', () => {
    expect(decideKey(key('ArrowRight'), ctx({ editorOpen: true, mode: 'caret' }))).toEqual({ kind: 'pass' });
    expect(decideKey(key('F2'), ctx())).toEqual({ kind: 'mode', mode: 'caret' });
  });

  it('Enter and a typed key on an editable cell open ENTER mode; the engine opens the editor', () => {
    expect(decideKey(key('Enter'), ctx())).toEqual({ kind: 'mode', mode: 'enter' });
    expect(decideKey(key('7'), ctx({ editable: true }))).toEqual({ kind: 'mode', mode: 'enter' });
  });

  it('a typed key on a READ-ONLY or committed cell is REFUSED — not swallowed', () => {
    expect(decideKey(key('7'), ctx({ editable: false }))).toEqual({ kind: 'refuse' });
    expect(decideKey(key('a'), ctx({ editable: false }))).toEqual({ kind: 'refuse' });
    // KNOWN-GOOD: a non-printable key on that cell is not a refusal (navigation passes).
    expect(decideKey(key('ArrowDown'), ctx({ editable: false }))).toEqual({ kind: 'pass' });
    expect(decideKey(key('c', { ctrl: true }), ctx({ editable: false }))).toEqual({ kind: 'pass' });
  });

  it('Delete and Backspace act on the overlay; Ctrl+Z / ⌘Z undo it — but inside an open editor they are the editor’s', () => {
    expect(decideKey(key('Delete'), ctx())).toEqual({ kind: 'delete' });
    expect(decideKey(key('Backspace'), ctx({ editable: false }))).toEqual({ kind: 'delete' });
    expect(decideKey(key('z', { ctrl: true }), ctx())).toEqual({ kind: 'undo' });
    expect(decideKey(key('Z', { meta: true }), ctx())).toEqual({ kind: 'undo' });
    expect(decideKey(key('z', { ctrl: true }), ctx({ editorOpen: true }))).toEqual({ kind: 'pass' });
    expect(decideKey(key('Delete'), ctx({ editorOpen: true }))).toEqual({ kind: 'pass' });
    // Ctrl+Shift+Z is not undo.
    expect(decideKey(key('z', { ctrl: true, shift: true }), ctx())).toEqual({ kind: 'pass' });
  });
});

// ─── delete and undo, on the overlay only ───────────────────────────────────

describe('PLN-5 · Delete removes PLANNED changes only; Ctrl+Z takes the last overlay change back', () => {
  const row = accepted('SIM-PM-0016');
  const at = run3(row);
  const [b0, b1] = [HORIZON[at], HORIZON[at + 1]];
  const ref0 = row.seamRefs![b0];

  it('removeEntries removes the planned rows it is given, skips one already PUSHING, and says how many', () => {
    let d = applyEdit(EMPTY_DRAFT, row, b0, '100', 'TYPED', 'en');
    d = applyEdit(d, row, b1, '200', 'TYPED', 'en');
    d = applyPushOutcomes(d, [{ seamRef: row.seamRefs![b1], kind: 'dispatched', correlationId: 'c1' }]);
    const r = removeEntries(d, [ref0, row.seamRefs![b1], 'no-such-ref']);
    expect(r.removed).toBe(1);
    expect(r.draft.entries.has(ref0)).toBe(false);
    expect(r.draft.entries.get(row.seamRefs![b1])?.planState).toBe('PUSHING');
    // Nothing planned → nothing removed, the draft untouched (the "nothing to delete" line).
    expect(removeEntries(EMPTY_DRAFT, [ref0])).toEqual({ draft: EMPTY_DRAFT, removed: 0 });
  });

  it('an edit is a step; undo removes a new entry and restores a re-edited one to its prior figure', () => {
    const d1 = applyEdit(EMPTY_DRAFT, row, b0, '100', 'TYPED', 'en');
    const s1 = diffEntries(EMPTY_DRAFT, d1)!;
    const d2 = applyEdit(d1, row, b0, '150', 'TYPED', 'en');
    const s2 = diffEntries(d1, d2)!;
    const u2 = applyUndo(d2, s2);
    expect(u2.restored).toBe(1);
    expect(u2.draft.entries.get(ref0)?.value).toBe(100);
    const u1 = applyUndo(u2.draft, s1);
    expect(u1.draft.entries.has(ref0)).toBe(false);
  });

  it('a refused edit records no step — there is no overlay change to take back', () => {
    const d = applyEdit(EMPTY_DRAFT, demand('SIM-PM-0016'), b0, '5', 'TYPED', 'en');
    expect(d.refusals.size).toBe(1);
    expect(diffEntries(EMPTY_DRAFT, d)).toBeNull();
  });

  it('a step whose result no longer stands is NOT undone — a row since pushed stays pushed', () => {
    const d1 = applyEdit(EMPTY_DRAFT, row, b0, '100', 'TYPED', 'en');
    const s1 = diffEntries(EMPTY_DRAFT, d1)!;
    const pushed = applyPushOutcomes(d1, [{ seamRef: ref0, kind: 'dispatched', correlationId: 'c1' }]);
    expect(applyUndo(pushed, s1)).toEqual({ draft: pushed, restored: 0 });
  });

  it('a reason written AFTER the edit survives the undo of a re-edit', () => {
    const d1 = applyEdit(EMPTY_DRAFT, row, b0, '100', 'TYPED', 'en');
    const d2 = applyEdit(d1, row, b0, '150', 'TYPED', 'en');
    const s2 = diffEntries(d1, d2)!;
    const withReason = setReason(d2, ref0, 'carton change');
    const u = applyUndo(withReason, s2);
    expect(u.draft.entries.get(ref0)).toMatchObject({ value: 100, reason: 'carton change' });
  });

  it('a delete is a step too: Ctrl+Z after Delete puts the planned change back', () => {
    const d1 = applyEdit(EMPTY_DRAFT, row, b0, '100', 'TYPED', 'en');
    const del = removeEntries(d1, [ref0]).draft;
    const step = diffEntries(d1, del)!;
    expect(applyUndo(del, step).draft.entries.get(ref0)?.value).toBe(100);
  });
});

/** The provider, driven as the grid drives it. */
let api: PlanDraftApi | null = null;
const Capture: React.FC = () => {
  api = usePlanDraft();
  return null;
};

describe('PLN-5 · the provider: one undo step per act, newest first', () => {
  it('edit, paste, Delete, then Ctrl+Z three times walks back exactly those acts', () => {
    const row = accepted('SIM-PM-0018');
    const rows = [row];
    renderWithProviders(
      <PlanDraftProvider>
        <Capture />
      </PlanDraftProvider>,
      { identity: { ...BUYER, businessRoles: ['planning'] } },
    );
    const at = run3(row);
    expect(at).toBeGreaterThanOrEqual(0); // population control: three anchored buckets in a row
    const ref = (i: number) => row.seamRefs![HORIZON[at + i]];
    act(() => api!.edit(row, HORIZON[at], '100', 'TYPED'));
    act(() => void api!.paste(rows, HORIZON, { row: 0, col: at + 1 }, '200\t300', undefined));
    act(() => void api!.removeMany([ref(0)]));
    expect([...api!.draft.entries.keys()]).toEqual([ref(1), ref(2)]);
    let n = 0;
    act(() => void (n = api!.undo())); // the Delete
    expect(n).toBe(1);
    expect(api!.draft.entries.has(ref(0))).toBe(true);
    act(() => void (n = api!.undo())); // the paste — both cells, one step
    expect(n).toBe(2);
    expect([...api!.draft.entries.keys()]).toEqual([ref(0)]);
    act(() => void (n = api!.undo())); // the edit
    expect(api!.draft.entries.size).toBe(0);
    act(() => void (n = api!.undo())); // nothing left
    expect(n).toBe(0);
  });
});

describe('PLN-5 · an editor opens on TODAY’s figure, selected — a typed key replaces it', () => {
  it('after an undo took its planned change away, the field holds the seam figure, all of it selected', () => {
    const row = accepted('SIM-PM-0024');
    const b = HORIZON[run3(row)];
    const seam = String(row.cells[b]);
    const ctxOf = () => ({ rows: [row], totalOf: () => undefined });
    // The engine's focus prop, driven from outside — `rerender` would drop the providers.
    let setFocus: (f: boolean) => void = () => {};
    const Host: React.FC = () => {
      const [focus, set] = React.useState(false);
      setFocus = set;
      return <EditableBucketCell row={row} bucket={b} focus={focus} editContext={ctxOf} />;
    };
    renderWithProviders(
      <PlanDraftProvider>
        <Capture />
        <Host />
      </PlanDraftProvider>,
      { identity: { ...BUYER, businessRoles: ['planning'] } },
    );
    act(() => api!.edit(row, b, '6000', 'TYPED'));
    act(() => setFocus(true));
    expect((screen.getByTestId('tp-cell-input') as HTMLInputElement).value).toBe('6000');
    act(() => setFocus(false));
    act(() => void api!.undo());
    expect(api!.draft.entries.size).toBe(0);
    act(() => setFocus(true));
    const input = screen.getByTestId('tp-cell-input') as HTMLInputElement;
    expect(input.value).toBe(seam);
    // the whole figure is selected, so the first key typed REPLACES it (it was appended: 189,950 + 6000)
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, seam.length]);
  });
});

// ─── Ctrl+C copies what is displayed ────────────────────────────────────────

describe('PLN-5 · Ctrl+C copies the DISPLAYED values', () => {
  it('the planned value where one is planned, else the seam’s, formatted as shown; a dash copies as empty', () => {
    const row = accepted('SIM-PM-0020');
    const b = HORIZON.find((x) => row.cells[x] !== null && row.seamRefs?.[x])!;
    const seam = row.cells[b]!;
    expect(copyText(row, b, EMPTY_DRAFT.entries)).toBe(seam.toLocaleString('en-US'));
    const d = applyEdit(EMPTY_DRAFT, row, b, '4321', 'TYPED', 'en');
    expect(copyText(row, b, d.entries)).toBe('4,321');
    const empty = { ...row, cells: { ...row.cells, [b]: null } };
    expect(copyText(empty, b, EMPTY_DRAFT.entries)).toBe('');
  });
});

// ─── the row label ──────────────────────────────────────────────────────────

describe('PLN-5 · material labels are never truncated; the code is said once, the measure is a sub-label', () => {
  const LONG = 'Mono-Carton Box 70x40x180mm — Wardah Moisturizing Lotion';
  const head = (): PlanRow => ({ ...demand('SIM-PM-0022'), materialLabel: LONG, blockHead: true });

  it('the block’s first row states the label WHOLE on its own line, with code · unit · measure under it', () => {
    renderWithProviders(<PlanRowLabel row={head()} />);
    const label = screen.getByTestId('tp-material-label');
    expect(label.textContent).toBe(LONG);
    expect(label.className).not.toMatch(/truncate|ellipsis/);
    expect(label.className).toMatch(/whitespace-nowrap/);
    const row = screen.getByTestId('tp-row-label');
    expect(row.textContent).toContain('SIM-PM-0022');
    expect(within(row).getByTestId('tp-measure').textContent).toBe('Demand');
    expect(row.className).not.toMatch(/truncate/);
  });

  it('every other row states only its measure — no code, no label', () => {
    const rows = blockRows('SIM-PM-0022').filter((r) => !r.blockHead && r.supplierId === null);
    expect(rows.length).toBeGreaterThan(0); // population control
    renderWithProviders(<PlanRowLabel row={rows[0]} />);
    const el = screen.getByTestId('tp-row-label');
    expect(el.textContent).not.toContain('SIM-PM-0022');
    expect(el.textContent).not.toContain(rows[0].materialLabel);
    expect(within(el).getByTestId('tp-measure')).toBeInTheDocument();
  });

  it('a MODELED measure says so on its row — so its dashes and zeros still read as computed', () => {
    const shortRow = blockRows('SIM-PM-0022').find((r) => r.measureId === 'confirmedDeficit')!;
    expect(shortRow).toBeDefined();
    renderWithProviders(<PlanRowLabel row={shortRow} />);
    expect(screen.getByText('Modeled')).toBeInTheDocument();
    // KNOWN-GOOD: an authored measure's row carries no Σ.
    renderWithProviders(<PlanRowLabel row={{ ...demand('SIM-PM-0022'), blockHead: false }} />);
    expect(screen.getAllByText('Modeled')).toHaveLength(1);
  });
});

// ─── the cells and the totals ───────────────────────────────────────────────

describe('PLN-5 · a shortfall figure is coloured as the variance; the exception says why', () => {
  it('a shortfall above zero is marked short; zero and dash are not', () => {
    renderWithProviders(<PlanBucketCell value={500} derived shortfall />);
    expect(screen.getByTestId('tp-cell-short').className).toMatch(/text-danger/);
    renderWithProviders(<PlanBucketCell value={0} derived shortfall />);
    renderWithProviders(<PlanBucketCell value={null} derived shortfall />);
    expect(screen.getAllByTestId('tp-cell-short')).toHaveLength(1);
    // KNOWN-GOOD: a figure on another measure is never marked short.
    renderWithProviders(<PlanBucketCell value={500} derived={false} />);
    expect(screen.getAllByTestId('tp-cell-short')).toHaveLength(1);
  });

  it('the reason column reads the same flags as the exception filter — all eight combinations', () => {
    for (const shortfall of [false, true])
      for (const awaiting of [false, true])
        for (const stale of [false, true]) {
          const e: PlanExceptions = { shortfall, awaiting, stale };
          const r = exceptionReasons(e);
          expect(r.length > 0, JSON.stringify(e)).toBe(isPlanException(e));
          expect(r).toEqual([...(shortfall ? ['short'] : []), ...(awaiting ? ['awaiting'] : []), ...(stale ? ['stale'] : [])]);
        }
  });
});

// ─── the chrome ─────────────────────────────────────────────────────────────

describe('PLN-5 · the chrome is summarised, never removed', () => {
  it('both honesty notices keep their WHOLE statement in the page, one line until "Details"', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const sandbox = screen.getByTestId('plan-honesty');
    expect(sandbox.textContent).toContain(planGridEn['planGrid.honesty.title']);
    expect(sandbox.textContent).toContain(planGridEn['planGrid.honesty.body']);
    const toggle = screen.getByTestId('plan-honesty-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const somo = await screen.findByTestId('tp-banner');
    expect(somo.textContent).toContain(planGridEn['planGrid.tp.banner.body']);
  });

  it('on the grid the publication panel folds to one line that states the draft; "Show panel" opens all of it', async () => {
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    const panel = await screen.findByTestId('publication-panel');
    expect(panel).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('publication-summary').textContent).toMatch(/^No draft open for this grain · Published now: PUB-2026-08-RM-R2/);
    expect(screen.queryByTestId('publication-open')).toBeNull();
    fireEvent.click(screen.getByTestId('publication-toggle'));
    expect(await screen.findByTestId('publication-open')).toBeInTheDocument();
    expect(screen.getByTestId('publication-panel')).toHaveAttribute('data-open', 'true');
  });

  it('KNOWN-GOOD: mounted on its own, the panel is the full panel it always was', async () => {
    renderWithProviders(<PublicationPanel grain="month" />, { route: '/buyer/plan-grid' });
    expect(await screen.findByTestId('publication-open')).toBeInTheDocument();
    expect(screen.queryByTestId('publication-toggle')).toBeNull();
  });

  it('the summary, the filters and the hint share the space the grid used to start below', async () => {
    renderWithProviders(
      <PlanDraftProvider>
        <TimePhasedGrid viewId="rm-plan" />
      </PlanDraftProvider>,
      { route: '/buyer/plan-grid' },
    );
    const summary = await screen.findByTestId('tp-summary');
    // the summary sits in the filter row, not on a line of its own
    expect(summary.parentElement).toBe(screen.getByTestId('tp-search').closest('label')!.parentElement);
  });
});

describe('PLN-5 · one scrollbar: the grid’s height is what the page has left', () => {
  it('fitHeight: the space below the grid’s top, less the bar, the padding and the slack', () => {
    expect(fitHeight({ top: 446, areaBottom: 900, paddingBottom: 32, reserve: 0 }, { min: 300 })).toBe(422 - FIT_SLACK);
    expect(fitHeight({ top: 446, areaBottom: 900, paddingBottom: 32, reserve: 60 }, { min: 300 })).toBe(362 - FIT_SLACK);
    // a short window keeps a usable grid (the page then scrolls, said rather than squeezed)
    expect(fitHeight({ top: 446, areaBottom: 600, paddingBottom: 32, reserve: 0 }, { min: 300 })).toBe(300);
    // the slack is real: a sub-pixel top never yields the exact remainder
    expect(fitHeight({ top: 446.4, areaBottom: 900, paddingBottom: 32, reserve: 0 }, { min: 0 })).toBeLessThan(900 - 446.4 - 32);
  });
});

describe('PLN-5 · the grid says it is a grid (role=grid, rows, headers)', () => {
  const engineDom = () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="dsg-container">
        <div class="dsg-row dsg-row-header"><div class="dsg-cell dsg-cell-gutter">Key</div><div class="dsg-cell">2026-08</div></div>
        <div class="dsg-row"><div class="dsg-cell dsg-cell-gutter">RM-1</div><div class="dsg-cell">10</div></div>
      </div>
      <div class="outside"><div class="dsg-cell">not the engine's</div></div>`;
    return root;
  };

  it('container grid with a label and the WHOLE row count; rows, column headers, row headers, cells', () => {
    const root = engineDom();
    applyGridRoles(root, { label: 'Raw-material plan', rowCount: 4084 });
    const grid = root.querySelector('.dsg-container')!;
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Raw-material plan');
    expect(grid.getAttribute('aria-rowcount')).toBe('4085');
    expect([...root.querySelectorAll('[role=row]')]).toHaveLength(2);
    expect([...root.querySelectorAll('[role=columnheader]')].map((e) => e.textContent)).toEqual(['Key', '2026-08']);
    expect([...root.querySelectorAll('[role=rowheader]')].map((e) => e.textContent)).toEqual(['RM-1']);
    expect([...root.querySelectorAll('[role=gridcell]')].map((e) => e.textContent)).toEqual(['10']);
    // KNOWN-GOOD: nothing outside the engine's grid is touched.
    expect(root.querySelector('.outside .dsg-cell')!.hasAttribute('role')).toBe(false);
  });
});

// ─── wording ────────────────────────────────────────────────────────────────

describe('PLN-5 · the ID wording a planner reads (ruling)', () => {
  const RETIRED = /\basupan\b|penghargaan|kotak-pasir|\boverride\b|\bukuran\b/i;
  it('no plan-grid, intake or requisition ID string carries a retired word', () => {
    const maps = { planGridId, intakeReviewId, requisitionsId };
    for (const [name, map] of Object.entries(maps)) {
      expect(Object.keys(map).length, name).toBeGreaterThan(20); // population control
      const hits = Object.entries(map).filter(([, v]) => RETIRED.test(v)).map(([k]) => k);
      expect(hits, name).toEqual([]);
    }
    // KNOWN-BAD: the instrument catches the strings it retired.
    expect(RETIRED.test('Tinjauan asupan')).toBe(true);
    expect(RETIRED.test('Simulasi penghargaan')).toBe(true);
    expect(RETIRED.test('Material · satuan · ukuran')).toBe(true);
  });

  it('the terms the ruling chose are the ones shown', () => {
    expect(planGridId['planGrid.tab.award']).toBe('Simulasi penetapan pemenang');
    expect(planGridId['planGrid.tab.intake']).toBe('Tinjauan usulan');
    expect(planGridId['planGrid.honesty.title']).toBe('Ruang uji perencanaan');
    expect(planGridId['planGrid.tp.keyColumn']).toBe('Material · satuan · besaran');
    expect(planGridId['planGrid.push.reasonRequired']).toBe('Alasan diperlukan untuk mengirim penyesuaian');
  });

  it('every PLN-5 key exists in both locales', () => {
    const mine = Object.keys(planGridEn).filter((k) => /^planGrid\.(chrome|tp\.agg|tp\.exc|edit\.key)\.|^planGrid\.publication\.(fold|unfold|summary)/.test(k));
    expect(mine.length).toBeGreaterThan(20); // population control
    for (const k of mine) {
      const base = k.replace(/_one$/, '_other');
      expect(planGridId[base] ?? planGridId[k], k).toMatch(/\S/);
    }
  });

  it('ID: the summarised chrome and the labelled totals are Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<PlanGrid />, { route: '/buyer/plan-grid' });
    expect(screen.getByTestId('plan-honesty').textContent).toContain('Ruang uji perencanaan');
    expect(screen.getByTestId('plan-honesty-toggle').textContent).toBe('Rincian');
    expect((await screen.findByTestId('publication-summary')).textContent).toMatch(/^Belum ada draf terbuka untuk satuan waktu ini/);
    expect(screen.getByTestId('publication-toggle').textContent).toBe('Tampilkan panel');
  });
});
