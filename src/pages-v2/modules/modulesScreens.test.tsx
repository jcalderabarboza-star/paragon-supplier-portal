// ────────────────────────────────────────────────────────────────────────────
// M2 · THE TWO SCREENS, HELD (Design 5 §A.5, §A.6 row M2).
//
//   · the board's four columns are the phase union and every module appears
//     exactly once — under the defaults AND under a ledger that moves modules;
//   · Save dispatches ONLY the changed rows, one `t_module_set` each, under one
//     causation anchor, switch-offs deepest first;
//   · a blocked switch-off names its dependants — before Save from the form,
//     and after Save from the dispatcher's refusal — and the other rows apply;
//   · an UNATTRIBUTED seat, and a seat without `module:set`, see the page
//     read-only;
//   · an Activating module's page shows its banner, an Active one's does not.
//
// Every page probe is mounted under the real `ModuleActivationProvider` over
// the mock service, so what is asserted is what the store holds afterwards —
// never the page's own idea of it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, BUYER_NAMED_COMPLIANCE } from '../../test/test-utils';
import i18n from '../../lib/i18n';
import ModulesAdmin from '../ModulesAdmin';
import ModulesBoard from '../ModulesBoard';
import BuyerOrders from '../BuyerOrders';
import { ModuleActivationProvider, ModuleGate } from '../../context/ModuleActivationContext';
import { mockDataService } from '../../services/data/mock/mockDataService';
import { moduleActivationStore } from '../../services/data/mock/stores/moduleActivationStore';
import { moduleDeployment } from '../../services/modules/deployment';
import {
  defaultActivation,
  effectiveActivation,
  type ModuleActivationSetting,
} from '../../services/modules/activation';
import { MODULE_PHASES, getModules, type ModuleCode } from '../../services/modules/registry';
import { NO_PERSON } from '../../context/noPerson';
import { boardColumns, cardFacts } from './boardModel';
import {
  blockedSwitchOffs,
  changesOf,
  defaultForm,
  formFromView,
  orderChanges,
  setEnabled,
  setPhase,
} from './adminModel';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';

const act = (code: ModuleCode, phase: ModuleActivationSetting['phase'], enabled: boolean, seq: number): ModuleActivationSetting => ({
  code,
  phase,
  enabled,
  parts: {},
  reason: 'spec',
  setBy: NO_PERSON,
  setAt: '2026-10-01T00:00:00.000Z',
  seq,
});

const ALL = getModules().map((m) => m.code);

beforeEach(() => {
  moduleActivationStore.reset();
  moduleDeployment.set('PREVIEW');
});
afterEach(async () => {
  moduleDeployment.reset();
  vi.restoreAllMocks();
  await i18n.changeLanguage('en');
});

// ── THE BOARD ───────────────────────────────────────────────────────────────

describe('board columns — the phase union, every module once', () => {
  const check = (cols: ReturnType<typeof boardColumns>) => {
    expect(Object.keys(cols)).toEqual([...MODULE_PHASES]);
    const placed = MODULE_PHASES.flatMap((p) => cols[p]);
    expect([...placed].sort()).toEqual([...ALL].sort());
    expect(new Set(placed).size).toBe(placed.length);
  };

  it('under the registry defaults every module is Active', () => {
    const cols = boardColumns(defaultActivation());
    check(cols);
    expect(cols.Active).toEqual(ALL);
    expect(cols.Activating).toEqual([]);
  });

  it('under a ledger that moves modules, each lands in its latest phase and nowhere else', () => {
    const view = effectiveActivation([
      act('INT', 'Backlog', false, 1),
      act('COM', 'Planned', false, 2),
      act('PLN', 'Activating', true, 3),
      act('COM', 'Activating', true, 4), // a later act wins
    ]);
    const cols = boardColumns(view);
    check(cols);
    expect(cols.Activating).toEqual(['PLN', 'COM']);
    expect(cols.Planned).toEqual([]);
    expect(cols.Backlog).toEqual(['INT']);
  });

  it('card facts are derived — SHP needs ORD; INT reads four and needs none', () => {
    expect(cardFacts('SHP').needs).toEqual(['ORD']);
    expect(cardFacts('SHP').routes).toBe(2);
    expect(cardFacts('SHP').verbs).toBeGreaterThan(0);
    expect(cardFacts('INT')).toMatchObject({ needs: [], reads: ['ORD', 'INV', 'GRC', 'SDC'], verbs: 0 });
  });

  it('renders four columns with every module once, in EN and ID', async () => {
    renderWithProviders(
      <ModuleActivationProvider>
        <ModulesBoard />
      </ModuleActivationProvider>,
      { identity: BUYER_NAMED_COMPLIANCE, route: '/buyer/platform/modules' },
    );
    for (const p of MODULE_PHASES) expect(screen.getByTestId(`modules-column-${p}`)).toBeInTheDocument();
    const cards = document.querySelectorAll('[data-testid^="module-card-"]:not([data-testid*="-counts-"]):not([data-testid*="-deps-"])');
    expect([...cards].map((c) => c.getAttribute('data-testid')!.replace('module-card-', '')).sort()).toEqual([...ALL].sort());
    expect(screen.getByTestId('modules-board-admin-link')).toHaveAttribute('href', '/buyer/platform/modules/admin');
    // The navigation entry, under the Platform group.
    const nav = document.querySelector('aside') as HTMLElement;
    expect(within(nav).getByText('Platform')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Modules' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('module-card-ORD'));
    const drawer = await screen.findByTestId('module-drawer-ORD');
    expect(within(drawer).getByTestId('module-drawer-dependants')).toHaveTextContent('SHP');
    expect(within(drawer).getByTestId('module-drawer-dependants')).toHaveTextContent('INV');
    expect(within(drawer).getByTestId('module-drawer-flow-purchaseOrder')).toHaveTextContent('t_po_confirm');
    await i18n.changeLanguage('id');
    expect(await screen.findByText('Peta jalan modul')).toBeInTheDocument();
  });

  it('a seat without module:set gets the handoff naming compliance, not the link', () => {
    const procurementOnly: CurrentIdentity = { ...BUYER_NAMED_COMPLIANCE, businessRoles: ['procurement'] };
    renderWithProviders(<ModulesBoard />, { identity: procurementOnly, route: '/buyer/platform/modules' });
    expect(screen.queryByTestId('modules-board-admin-link')).toBeNull();
    expect(screen.getByTestId('modules-board-admin-handoff')).toHaveTextContent(/Compliance/);
  });
});

// ── THE ADMIN MODEL ─────────────────────────────────────────────────────────

describe('admin form — only what changed, in an order the rules admit', () => {
  it('an untouched form has no changes; one edited row is exactly one change', () => {
    const view = defaultActivation();
    expect(changesOf(defaultForm(), view)).toEqual([]);
    const form = setPhase(defaultForm(), 'PLN', 'Activating');
    expect(changesOf(form, view)).toEqual([
      { subject: 'PLN', payload: { phase: 'Activating', enabled: true }, switchesOff: false },
    ]);
  });

  it('flipping a module OFF moves its phase to an OFF one, and back ON to Active', () => {
    const off = setEnabled(defaultForm(), 'INT', false);
    expect(off.modules.INT).toMatchObject({ enabled: false, phase: 'Planned' });
    expect(setEnabled(off, 'INT', true).modules.INT).toMatchObject({ enabled: true, phase: 'Active' });
  });

  it('switch-offs go deepest first (INV before SHP before ORD); switch-ons shallowest first', () => {
    let form = defaultForm();
    for (const c of ['ORD', 'INV', 'SHP', 'GRC'] as const) form = setEnabled(form, c, false);
    expect(orderChanges(changesOf(form, defaultActivation())).map((c) => c.subject)).toEqual(['INV', 'GRC', 'SHP', 'ORD']);
    const allOff = effectiveActivation(['INV', 'GRC', 'SHP', 'ORD'].map((c, i) => act(c as ModuleCode, 'Planned', false, i + 1)));
    const back = formFromView(defaultActivation());
    expect(orderChanges(changesOf(back, allOff)).map((c) => c.subject)).toEqual(['ORD', 'SHP', 'GRC', 'INV']);
  });

  it('a blocked switch-off names the dependants still ON in the form', () => {
    const form = setEnabled(defaultForm(), 'ORD', false);
    expect(blockedSwitchOffs(form)).toEqual({ ORD: ['SHP', 'INV'] });
    expect(blockedSwitchOffs(setEnabled(setEnabled(form, 'INV', false), 'SHP', false))).toEqual({
      SHP: ['GRC'],
    });
  });
});

// ── THE ADMIN PAGE ──────────────────────────────────────────────────────────

const adminAs = (identity: CurrentIdentity) =>
  renderWithProviders(
    <ModuleActivationProvider>
      <ModulesAdmin />
    </ModuleActivationProvider>,
    { identity, route: '/buyer/platform/modules/admin' },
  );

const reason = (text: string) => fireEvent.change(screen.getByTestId('modules-batch-reason'), { target: { value: text } });

describe('admin page — Save dispatches only the changed rows', () => {
  it('one changed row → one t_module_set; untouched rows are never sent', async () => {
    const spy = vi.spyOn(mockDataService.commands, 'dispatch');
    adminAs(BUYER_NAMED_COMPLIANCE);
    expect(await screen.findByTestId('modules-admin')).toHaveAttribute('data-read-only', 'editable');
    fireEvent.change(screen.getByTestId('module-phase-PLN'), { target: { value: 'Activating' } });
    reason('pilot of the intake grid');
    expect(screen.getByTestId('modules-admin-change-count')).toHaveTextContent('1 module changed');
    fireEvent.click(screen.getByTestId('modules-save'));
    await waitFor(() => expect(screen.getByTestId('module-result-PLN')).toHaveAttribute('data-outcome', 'applied'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toMatchObject({
      transitionId: 't_module_set',
      entityId: 'PLN',
      payload: { phase: 'Activating', enabled: true, reason: 'pilot of the intake grid' },
    });
    expect(moduleActivationStore.ledger().map((r) => r.code)).toEqual(['PLN']);
  });

  it('two changed rows → two acts under ONE causation anchor (the first act’s correlation)', async () => {
    const spy = vi.spyOn(mockDataService.commands, 'dispatch');
    adminAs(BUYER_NAMED_COMPLIANCE);
    await screen.findByTestId('modules-admin');
    fireEvent.change(screen.getByTestId('module-phase-PLN'), { target: { value: 'Activating' } });
    fireEvent.click(within(screen.getByTestId('module-toggle-INT')).getByRole('switch'));
    reason('wave 2');
    fireEvent.click(screen.getByTestId('modules-save'));
    await waitFor(() => expect(screen.getByTestId('module-result-INT')).toBeInTheDocument());
    expect(spy.mock.calls.map((c) => c[1].entityId)).toEqual(['INT', 'PLN']); // the switch-off first
    const first = await spy.mock.results[0].value;
    expect(spy.mock.calls[0][2]).toBeUndefined();
    expect(spy.mock.calls[1][2]).toBe(first.correlationId);
  });

  it('a blocked switch-off: the form names the dependants, the refusal names them, and the other row still applies', async () => {
    adminAs(BUYER_NAMED_COMPLIANCE);
    await screen.findByTestId('modules-admin');
    fireEvent.click(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch'));
    expect(screen.getByTestId('module-blocked-ORD')).toHaveTextContent('SHP, INV');
    fireEvent.change(screen.getByTestId('module-phase-PLN'), { target: { value: 'Activating' } });
    reason('try orders off');
    fireEvent.click(screen.getByTestId('modules-save'));
    const refused = await screen.findByTestId('module-result-ORD');
    expect(refused).toHaveAttribute('data-outcome', 'refused');
    expect(refused).toHaveTextContent('SHP, INV');
    expect(within(refused).getByTestId('glossary-chip-CommandRefusal.POLICY_REJECTED')).toBeInTheDocument();
    expect(screen.getByTestId('module-result-PLN')).toHaveAttribute('data-outcome', 'applied');
    expect(moduleActivationStore.view().modules.ORD.enabled).toBe(true);
    expect(moduleActivationStore.view().modules.PLN.phase).toBe('Activating');
  });

  it('the refusal names the dependants in Indonesian too — derived, not parsed from the hook’s English', async () => {
    await i18n.changeLanguage('id');
    adminAs(BUYER_NAMED_COMPLIANCE);
    await screen.findByTestId('modules-admin');
    fireEvent.click(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch'));
    reason('coba');
    fireEvent.click(screen.getByTestId('modules-save'));
    const refused = await screen.findByTestId('module-result-ORD');
    expect(refused).toHaveTextContent('Tidak dinonaktifkan: SHP, INV masih bergantung padanya');
  });
});

describe('admin page — Reset returns the form to the registry defaults', () => {
  it('with INT recorded off, Reset puts it back ON in the form (one change) without dispatching', async () => {
    moduleActivationStore.append(act('INT', 'Backlog', false, moduleActivationStore.nextSeq()));
    const spy = vi.spyOn(mockDataService.commands, 'dispatch');
    adminAs(BUYER_NAMED_COMPLIANCE);
    await waitFor(() => expect(screen.getByTestId('module-phase-INT')).toHaveValue('Backlog'));
    expect(screen.getByTestId('modules-admin-change-count')).toHaveTextContent('0 modules changed');
    fireEvent.click(screen.getByTestId('modules-reset'));
    expect(screen.getByTestId('module-phase-INT')).toHaveValue('Active');
    expect(screen.getByTestId('modules-admin-change-count')).toHaveTextContent('1 module changed');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('admin page — read-only arms', () => {
  it('an UNATTRIBUTED seat sees it read-only with the adopt-a-sample-user notice', async () => {
    const spy = vi.spyOn(mockDataService.commands, 'dispatch');
    adminAs({ ...BUYER, actor: NO_PERSON });
    expect(await screen.findByTestId('modules-admin')).toHaveAttribute('data-read-only', 'unattributed');
    expect(screen.getByTestId('modules-admin-actor')).toHaveTextContent(/Adopt a sample user/);
    expect(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch')).toBeDisabled();
    expect(screen.getByTestId('module-phase-ORD')).toBeDisabled();
    expect(screen.getByTestId('modules-save')).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('the attributed twin is editable — so "disabled" above is the arm, not the page', async () => {
    adminAs(BUYER_NAMED_COMPLIANCE);
    expect(await screen.findByTestId('modules-admin')).toHaveAttribute('data-read-only', 'editable');
    expect(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch')).not.toBeDisabled();
    expect(screen.getByTestId('modules-admin-actor-sample')).toHaveTextContent('(SAMPLE)');
  });

  it('a seat without module:set is read-only with the handoff naming compliance', async () => {
    adminAs({ ...BUYER_NAMED_COMPLIANCE, businessRoles: ['procurement'] });
    expect(await screen.findByTestId('modules-admin')).toHaveAttribute('data-read-only', 'not-held');
    expect(screen.getByTestId('modules-admin-handoff')).toHaveTextContent(/Compliance/);
  });

  it('on a production deployment a SAMPLE person is read-only (ruling 3)', async () => {
    moduleDeployment.set(null);
    adminAs(BUYER_NAMED_COMPLIANCE);
    expect(await screen.findByTestId('modules-admin')).toHaveAttribute('data-read-only', 'production-sample');
  });

  it('the buyer side is never switchable; the supplier side is', async () => {
    adminAs(BUYER_NAMED_COMPLIANCE);
    await screen.findByTestId('modules-admin');
    expect(within(screen.getByTestId('modules-side-buyer')).getByRole('switch')).toBeDisabled();
    expect(within(screen.getByTestId('modules-side-supplier')).getByRole('switch')).not.toBeDisabled();
  });
});

// ── THE ACTIVATING BANNER ───────────────────────────────────────────────────

describe('the Activating phase shows its banner on the module’s pages', () => {
  const ordersAt = () =>
    renderWithProviders(
      <ModuleActivationProvider>
        <ModuleGate path="/buyer/orders">
          <BuyerOrders />
        </ModuleGate>
      </ModuleActivationProvider>,
      { identity: BUYER, route: '/buyer/orders' },
    );

  it('Active (recorded back from Activating): no banner', async () => {
    moduleActivationStore.append({ ...act('ORD', 'Activating', true, moduleActivationStore.nextSeq()) });
    moduleActivationStore.append({ ...act('ORD', 'Active', true, moduleActivationStore.nextSeq()) });
    ordersAt();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('module-activating-banner')).toBeNull());
  });

  it('Activating: the banner names the module and links to its guide', async () => {
    moduleActivationStore.append({ ...act('ORD', 'Activating', true, moduleActivationStore.nextSeq()) });
    ordersAt();
    const banner = await screen.findByTestId('module-activating-banner');
    expect(banner).toHaveAttribute('data-module-activating', 'ORD');
    expect(banner).toHaveTextContent('Purchase orders (ORD) is activating');
    expect(within(banner).getByTestId('module-activating-guide')).toHaveAttribute('href', '/buyer/process-flows');
    expect(screen.queryByTestId('module-off-banner')).toBeNull();
  });
});

// ── THE SWITCH IS NOT THE PHASE ─────────────────────────────────────────────
// G1 fix-first: in ID the drawer read "Berlaku: Aktif · Aktif" — the ledger
// act line is `{{phase}} · {{onOff}}`, and `modules.admin.on` had been given
// the phase word for Active. Pinned in BOTH locales over the whole phase union,
// so a later "Aktif" on either side is red, not only the one that was seen.

describe('the on/off labels never repeat a phase label', () => {
  it.each(['en', 'id'] as const)('%s — on, off and every phase are distinct words', async (lng) => {
    await i18n.changeLanguage(lng);
    const phases = MODULE_PHASES.map((p) => i18n.t(`modules.phase.${p}`).toLowerCase());
    const switches = [i18n.t('modules.admin.on'), i18n.t('modules.admin.off')].map((s) => s.toLowerCase());
    // Anti-vacuity: every key resolved to a translation, not to itself.
    for (const w of [...phases, ...switches]) expect(w).not.toMatch(/^modules\./);
    expect(new Set(switches).size).toBe(2);
    expect(switches.filter((s) => phases.includes(s))).toEqual([]);
  });
});
