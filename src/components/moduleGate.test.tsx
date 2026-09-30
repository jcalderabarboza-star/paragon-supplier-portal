// ────────────────────────────────────────────────────────────────────────────
// M1 · AN OFF MODULE'S ROUTE RENDERS READ-ONLY (Design 5 §A.3, §A.6).
//
// The page stays — its lists keep answering — and three things change: a
// banner names the module, its phase and who can switch it on; every guarded
// verb slot on the page renders the module notice in place of its control;
// and the module leaves the navigation. Each is probed against its ON twin in
// the same render setup, so "no control" can never be the page failing to load.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER, BUYER } from '../test/test-utils';
import i18n from '../lib/i18n';
import SupplierShipments from '../pages-v2/SupplierShipments';
import BuyerRequisitions from '../pages-v2/BuyerRequisitions';
import BuyerShipments from '../pages-v2/BuyerShipments';
import { ModuleActivationContext, ModuleGate } from '../context/ModuleActivationContext';
import {
  defaultActivation,
  effectiveActivation,
  type ModuleActivationSetting,
  type ModuleActivationView,
} from '../services/modules/activation';
import { availabilityWithModules } from '../services/modules/availability';
import { NO_PERSON } from '../context/noPerson';
import { PERSONA_SYSTEM_ROLES } from '../services/transitions/businessRoles';
import { mockDataService } from '../services/data/mock/mockDataService';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '../services/data/mock/stores/asnStore';

const row = (code: ModuleActivationSetting['code'], enabled: boolean, extra: Partial<ModuleActivationSetting> = {}, seq = 1): ModuleActivationSetting => ({
  code,
  phase: code.startsWith('side:') ? null : enabled ? 'Active' : 'Planned',
  enabled,
  parts: {},
  reason: 'spec',
  setBy: NO_PERSON,
  setAt: '2026-09-30T00:00:00.000Z',
  seq,
  ...extra,
});
const SHP_OFF = effectiveActivation([row('INV', false, {}, 1), row('GRC', false, {}, 2), row('SHP', false, {}, 3)]);

const shipmentsAt = (view: ModuleActivationView | null) =>
  renderWithProviders(
    <ModuleActivationContext.Provider value={view}>
      <ModuleGate path="/supplier/shipments">
        <SupplierShipments />
      </ModuleGate>
    </ModuleActivationContext.Provider>,
    { identity: SUPPLIER, route: '/supplier/shipments' },
  );

// A confirmed PO with no ASN yet is what puts a Create control on the page
// (the pending panel) — without it the ON twin would have no control to find,
// and "no Create ASN button" when OFF would prove nothing.
beforeEach(async () => {
  purchaseOrderStore.reset();
  asnStore.reset();
  const confirmed = await mockDataService.commands.dispatch(
    { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier },
    { transitionId: 't_po_confirm', entity: 'purchaseOrder', entityId: 'po-008', payload: { confirmedQuantities: [150000] } },
  );
  expect(confirmed.status, confirmed.reason).toBe('done');
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('the supplier shipments page — ON, then OFF', () => {
  it('ON (the registry default): the action control renders, no notice, and the nav offers the module', async () => {
    shipmentsAt(null);
    expect(await screen.findByText('ASN-2025-00211')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Create ASN/ }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('module-off-banner')).toBeNull();
    expect(document.querySelectorAll('[data-handoff="module-off"]')).toHaveLength(0);
    const nav = document.querySelector('aside')!;
    expect(within(nav as HTMLElement).getByRole('button', { name: 'Shipments & ASN' })).toBeInTheDocument();
  });

  it('OFF: the documents stay readable, the banner names module, phase and owner', async () => {
    shipmentsAt(SHP_OFF);
    // Reading still works — an OFF module never hides a document.
    expect(await screen.findByText('ASN-2025-00211')).toBeInTheDocument();
    const banner = screen.getByTestId('module-off-banner');
    expect(banner.dataset.moduleOff).toBe('SHP');
    expect(banner.textContent).toContain('Shipments & ASN (SHP) is switched off');
    expect(within(banner).getByTestId('module-off-banner-phase').textContent).toBe('Phase: Planned');
    // The role that can switch it on is DERIVED from who holds `module:set`.
    expect(banner.textContent).toContain('until Compliance switches it on');
  });

  it('OFF: NO action control — every guarded verb slot renders the module notice instead', async () => {
    shipmentsAt(SHP_OFF);
    await screen.findByText('ASN-2025-00211');
    // The PO awaiting an ASN is still listed — only the act on it is gone.
    expect(screen.getByText('PO-2025-00108')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create ASN/ })).toBeNull();
    const slots = [...document.querySelectorAll<HTMLElement>('[data-handoff]')];
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.filter((s) => s.dataset.handoff !== 'module-off').map((s) => s.dataset.testid)).toEqual([]);
    expect(slots[0].textContent).toBe('Switched off — Shipments & ASN');
  });

  it('OFF: the module leaves the navigation; the dashboard (PLT) stays', async () => {
    shipmentsAt(SHP_OFF);
    await screen.findByText('ASN-2025-00211');
    const nav = document.querySelector('aside') as HTMLElement;
    expect(within(nav).queryByRole('button', { name: 'Shipments & ASN' })).toBeNull();
    expect(within(nav).getByRole('button', { name: /Dashboard/ })).toBeInTheDocument();
  });

  it('ID: the banner, the phase and the slot are Indonesian', async () => {
    await i18n.changeLanguage('id');
    shipmentsAt(SHP_OFF);
    await screen.findByText('ASN-2025-00211');
    const banner = screen.getByTestId('module-off-banner');
    expect(banner.textContent).toContain('Pengiriman & ASN (SHP) sedang dinonaktifkan');
    expect(within(banner).getByTestId('module-off-banner-phase').textContent).toBe('Fase: Direncanakan');
    expect(document.querySelector('[data-handoff="module-off"]')!.textContent).toBe('Dinonaktifkan — Pengiriman & ASN');
  });

  it('the supplier SIDE off makes the page read-only too, naming the side', async () => {
    shipmentsAt(effectiveActivation([row('side:supplier', false)]));
    await screen.findByText('ASN-2025-00211');
    const banner = screen.getByTestId('module-off-banner');
    expect(banner.dataset.moduleOff).toBe('side:supplier');
    expect(banner.textContent).toContain('Supplier side is switched off');
    expect(screen.queryByRole('button', { name: /Create ASN/ })).toBeNull();
  });
});

describe('the buyer shipments page — the header’s primary act is withdrawn too', () => {
  // Found by browser QA, not by a spec: "Manual ASN Entry" sits in the page
  // header's PRIMARY slot, outside the availability layer, and stayed rendered
  // on the read-only page. The secondary reads (Export, Dock schedule) stay.
  const at = (view: ModuleActivationView | null) =>
    renderWithProviders(
      <ModuleActivationContext.Provider value={view}>
        <ModuleGate path="/buyer/shipments">
          <BuyerShipments />
        </ModuleGate>
      </ModuleActivationContext.Provider>,
      { identity: BUYER, route: '/buyer/shipments' },
    );

  it('ON: the primary act renders, no notice', async () => {
    at(null);
    expect(await screen.findByRole('button', { name: /Manual ASN Entry/ })).toBeInTheDocument();
    expect(screen.queryByTestId('module-off-primary')).toBeNull();
  });

  it('OFF: the primary act is replaced by the notice; the reads stay', async () => {
    at(SHP_OFF);
    expect(await screen.findByTestId('module-off-primary')).toHaveTextContent('Switched off — Shipments & ASN');
    expect(screen.queryByRole('button', { name: /Manual ASN Entry/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Export/ })).toBeInTheDocument();
  });
});

describe('a page whose module is ON keeps its controls when ANOTHER module is off', () => {
  it('SHP off does not touch the requisitions page', async () => {
    renderWithProviders(
      <ModuleActivationContext.Provider value={SHP_OFF}>
        <ModuleGate path="/buyer/purchase-requisition">
          <BuyerRequisitions />
        </ModuleGate>
      </ModuleActivationContext.Provider>,
      { identity: BUYER, route: '/buyer/purchase-requisition' },
    );
    expect(await screen.findAllByText(/PR-/)).not.toHaveLength(0);
    expect(screen.queryByTestId('module-off-banner')).toBeNull();
    expect(document.querySelectorAll('[data-handoff="module-off"]')).toHaveLength(0);
  });
});

describe('the availability rule, pure', () => {
  const seat = ['requisitioner', 'procurement'] as const;
  const on = defaultActivation();

  it('an atom serving two modules is off only when BOTH are off (pr:create: REQ and PLN)', () => {
    const plnOff = effectiveActivation([row('SDC', false, {}, 1), row('PLN', false, {}, 2)]);
    expect(availabilityWithModules('pr:create', 'buyer', seat, plnOff, null).kind).toBe('held');
    const bothOff = effectiveActivation([row('COM', false, {}, 1), row('SDC', false, {}, 2), row('PLN', false, {}, 3), row('REQ', false, {}, 4)]);
    // Found by the mutation probe: with only PLN off, the FIRST place (REQ) is
    // the one still on, so "every" and "some" read alike. The mirror case — the
    // first place off, the second on — is what tells them apart. (Not reachable
    // through the verb, since PLN hard-depends on REQ; the rule is pure and must
    // hold for any view it is handed.)
    const reqOnlyOff = effectiveActivation([row('REQ', false, {}, 1)]);
    expect(availabilityWithModules('pr:create', 'buyer', seat, reqOnlyOff, null).kind).toBe('held');
    // Named by the FIRST place the atom serves, in flow-registration order.
    expect(availabilityWithModules('pr:create', 'buyer', seat, bothOff, null)).toMatchObject({ kind: 'module-off', off: { subject: 'REQ' } });
  });

  it('module before role: a seat WITHOUT the atom still reads the module notice when it is off', () => {
    expect(availabilityWithModules('asn:create', 'supplier', ['supplier'], on, null).kind).toBe('withheld');
    expect(availabilityWithModules('asn:create', 'supplier', ['supplier'], SHP_OFF, null).kind).toBe('module-off');
  });

  it('a read-only ROUTE wins over the atom’s own module', () => {
    const r = availabilityWithModules('pr:approve', 'buyer', seat, on, { subject: 'ORD', part: null });
    expect(r).toEqual({ kind: 'module-off', off: { subject: 'ORD', part: null } });
  });

  it('a part off withdraws an atom whose EVERY verb sits in it (rfq:fx-pin → SRC.fxPin)', () => {
    const fxOff = effectiveActivation([row('SRC', true, { parts: { fxPin: false } })]);
    expect(availabilityWithModules('rfq:fx-pin', 'buyer', ['procurement'], fxOff, null)).toEqual({
      kind: 'module-off',
      off: { subject: 'SRC', part: 'fxPin' },
    });
    expect(availabilityWithModules('rfq:fx-pin', 'buyer', ['procurement'], on, null).kind).toBe('held');
  });

  it('⚠️ and does NOT withdraw an atom that also fires a verb OUTSIDE it — the dispatcher refuses the verb instead', () => {
    // `gr:inspect` fires `t_gr_hold` / `t_gr_request_retest` (qualityHold) AND
    // `t_gr_start_inspection` (inspectionWizard). Withdrawing it with the hold
    // part would take the inspection start away too; so the surface keeps the
    // control and the DISPATCHER refuses `t_gr_hold` by name
    // (`moduleActivationCommand.test.ts`). Pinned so the gap is visible.
    const holdOff = effectiveActivation([row('GRC', true, { parts: { qualityHold: false } })]);
    expect(availabilityWithModules('gr:inspect', 'buyer', ['receiving'], holdOff, null).kind).toBe('held');
  });
});
