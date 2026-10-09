// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE SURFACES. What a person meets on the page for the rulings of
// 9 October 2026: the lane chips that really filter, modules that switch with
// no reload, the Super Admin reason prompt, the note a document carries, and
// the Super Admin activity view.
//
// The command-level halves are in `services/data/mock/adm1SuperAdmin.test.ts`.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import i18n from '../lib/i18n';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import type { QueryScope } from '../services/data/types';
import BuyerDashboard from './BuyerDashboard';
import ModulesAdmin from './ModulesAdmin';
import SuperAdminActivity from './SuperAdminActivity';
import BypassReasonDialog from '../components/v2-features/BypassReasonDialog';
import SuperAdminBypassNote from '../components/v2-features/SuperAdminBypassNote';
import { ModuleActivationProvider, ModuleGate, useRouteModuleOff } from '../context/ModuleActivationContext';
import { moduleActivationStore } from '../services/data/mock/stores/moduleActivationStore';
import { moduleDeployment } from '../services/modules/deployment';
import { invoiceStore } from '../services/data/mock/stores/invoiceStore';
import { MockCommandService, commandAuditSink } from '../services/data/mock/MockCommandService';
import { askBypassReason } from '../services/identity/bypassReasonPrompt';
import { rolesHolding } from '../services/transitions/businessRoles';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import {
  ALERT_GROUP_ATOMS,
  ALERT_GROUP_IDS,
  activeLaneFor,
  buyerLaneIds,
  heldLanes,
} from './dashboard/buyerDashboardDerivations';

const named = (roles: readonly string[], personId: string): CurrentIdentity => ({
  ...BUYER,
  businessRoles: roles,
  actor: { kind: 'RESOLVED', person: { personId } },
});
// The person is read off the roster, never spelled (C10 §6.3).
const SUPER_ADMIN = named(['super_admin'], SAMPLE_PEOPLE.find((p) => p.role === 'super_admin')!.personId);
const SUPER_ADMIN_ID = SAMPLE_PEOPLE.find((p) => p.role === 'super_admin')!.personId;
const seatWith = (roles: readonly string[]): CurrentIdentity => ({ ...BUYER, businessRoles: roles });

const GREETING = 'Good morning — here is what needs you today';
const alertCards = (): HTMLElement[] => screen.queryAllByTestId(/^alert-(?!lane-)/);
const lanesOf = (cards: HTMLElement[]): string[] => cards.map((c) => c.getAttribute('data-lane') ?? '');

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('ADM-1 · item 8 — the lane chips really filter', () => {
  it('every alert group has ONE owning lane, derived from the atom that clears it', () => {
    expect(Object.keys(ALERT_GROUP_ATOMS).sort()).toEqual([...ALERT_GROUP_IDS].sort());
    for (const id of ALERT_GROUP_IDS) {
      const owners = rolesHolding(ALERT_GROUP_ATOMS[id]);
      expect(owners, id).toHaveLength(1);
      expect(buyerLaneIds(), id).toContain(owners[0]);
    }
    // Named, so a re-cut of the lanes is seen here and not only in a count.
    expect(rolesHolding(ALERT_GROUP_ATOMS.overdueInvoices)).toEqual(['finance']);
    expect(rolesHolding(ALERT_GROUP_ATOMS.receipts)).toEqual(['receiving']);
    expect(rolesHolding(ALERT_GROUP_ATOMS.halal)).toEqual(['compliance']);
    expect(rolesHolding(ALERT_GROUP_ATOMS.contracts)).toEqual(['procurement']);
  });

  it('the seeded seat opens on All lanes; a chip shows only its lane; All lanes shows every group again', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText(GREETING);
    expect(screen.getByTestId('lane-chip-all')).toHaveAttribute('aria-pressed', 'true');
    const all = alertCards();
    const allLanes = lanesOf(all);
    // The population can separate lanes, or the filter below proves nothing.
    expect(new Set(allLanes).size).toBeGreaterThan(1);
    expect(allLanes).toContain('finance');
    // Each card carries its lane as a tag a person can read.
    for (const card of all) {
      const id = card.getAttribute('data-testid')!.slice('alert-'.length);
      expect(screen.getByTestId(`alert-lane-${id}`).textContent).not.toBe('');
    }

    fireEvent.click(screen.getByTestId('lane-chip-finance'));
    const finance = alertCards();
    expect(finance.length).toBe(allLanes.filter((l) => l === 'finance').length);
    expect(finance.length).toBeLessThan(all.length);
    expect(new Set(lanesOf(finance))).toEqual(new Set(['finance']));
    // The heading counts what is shown.
    expect(screen.getByText(`Alerts · ${finance.length} exception groups`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lane-chip-all'));
    expect(lanesOf(alertCards())).toEqual(allLanes);
  });

  it('a lane with no alert group says so rather than showing another lane\'s', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText(GREETING);
    expect(lanesOf(alertCards())).not.toContain('requisitioner');
    fireEvent.click(screen.getByTestId('lane-chip-requisitioner'));
    expect(alertCards()).toHaveLength(0);
    expect(screen.getByTestId('alerts-none-for-lane')).toHaveTextContent(
      'No alert group belongs to this lane right now.',
    );
  });

  it('the KPI cards are labelled "Whole platform" and a chip does not change one figure in them', async () => {
    renderWithProviders(<BuyerDashboard />);
    await screen.findByText(GREETING);
    const scope = screen.getByTestId('kpi-scope');
    expect(scope).toHaveTextContent('Whole platform');
    expect(scope).toHaveTextContent('Not filtered by lane.');
    const kpis = (): string => scope.nextElementSibling!.textContent ?? '';
    const before = kpis();
    expect(before).toMatch(/\d/);
    fireEvent.click(screen.getByTestId('lane-chip-receiving'));
    expect(kpis()).toBe(before);
  });

  it('a seat narrowed to ONE lane opens on that lane; All lanes is one press away', async () => {
    renderWithProviders(<BuyerDashboard />, { identity: seatWith(['receiving']) });
    await screen.findByText(GREETING);
    expect(screen.getByTestId('lane-chip-receiving')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('lane-chip-all')).toHaveAttribute('aria-pressed', 'false');
    expect(new Set(lanesOf(alertCards()))).toEqual(new Set(['receiving']));
    expect(screen.getAllByTestId(/^queue-open-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId('lane-chip-all'));
    expect(screen.getByTestId('lane-chip-all')).toHaveAttribute('aria-pressed', 'true');
    expect(new Set(lanesOf(alertCards())).size).toBeGreaterThan(1);
  });

  it('activeLaneFor: one held lane opens on it; several open on All; a lane no longer held is not honoured', () => {
    expect(activeLaneFor(null, ['finance'])).toBe('finance');
    expect(activeLaneFor(null, ['finance', 'receiving'])).toBeNull();
    expect(activeLaneFor('all', ['finance'])).toBeNull();
    expect(activeLaneFor('receiving', ['finance', 'receiving'])).toBe('receiving');
    expect(activeLaneFor('receiving', ['finance'])).toBe('finance');
    expect(activeLaneFor('receiving', [])).toBeNull();
  });

  it('a Super Admin (or Admin, or the manager\'s seat) holds every lane: every chip, and no row is a handoff', async () => {
    for (const role of ['super_admin', 'admin', 'buyer_all']) {
      expect(heldLanes([role]), role).toEqual(buyerLaneIds());
    }
    expect(heldLanes(['finance'])).toEqual(['finance']);
    expect(heldLanes(['supplier'])).toEqual([]);
    renderWithProviders(<BuyerDashboard />, { identity: SUPER_ADMIN });
    await screen.findByText(GREETING);
    for (const lane of buyerLaneIds()) expect(screen.getByTestId(`lane-chip-${lane}`), lane).toBeInTheDocument();
    expect(screen.queryAllByTestId(/^handoff-/)).toHaveLength(0);
    expect(screen.getByTestId('lane-chip-all')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Indonesian: the label, the legend and the empty-lane sentence', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDashboard />);
    const scope = await screen.findByTestId('kpi-scope');
    expect(scope).toHaveTextContent('Seluruh platform');
    expect(scope).toHaveTextContent('Tidak disaring menurut jalur.');
    expect(screen.getByText('Menyaring peringatan dan antrean tindakan')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lane-chip-requisitioner'));
    expect(screen.getByTestId('alerts-none-for-lane')).toHaveTextContent(
      'Saat ini tidak ada kelompok peringatan milik jalur ini.',
    );
  });
});

describe('ADM-1 · item 4 — a module switches with no reload: sidebar, groups and the open page', () => {
  beforeEach(() => {
    moduleActivationStore.reset();
    moduleDeployment.set('PREVIEW');
  });
  afterEach(() => moduleDeployment.reset());

  const nav = (): string =>
    Array.from(document.querySelectorAll('aside nav > div'))
      .map((g) => `${g.querySelector('div')?.textContent}: ${Array.from(g.querySelectorAll('li')).map((l) => l.textContent).join(' | ')}`)
      .join(' ## ');
  const flip = async (code: string): Promise<void> => {
    fireEvent.click(within(screen.getByTestId(`module-toggle-${code}`)).getByRole('switch'));
    fireEvent.change(screen.getByTestId('modules-batch-reason'), { target: { value: 'ADM-1 spec' } });
    await waitFor(() => expect(screen.getByTestId('modules-save')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('modules-save'));
  };

  it('as Super Admin: three modules off and on again — the item leaves, an emptied group leaves, and both come back', async () => {
    // ONE render for the whole walk: nothing below remounts, so every change
    // seen in the sidebar arrived with no reload.
    renderWithProviders(
      <ModuleActivationProvider>
        <ModulesAdmin />
      </ModuleActivationProvider>,
      { identity: SUPER_ADMIN, route: '/buyer/platform/modules/admin' },
    );
    await screen.findByTestId('module-row-PSL');
    expect(screen.getByTestId('modules-admin')).toHaveAttribute('data-read-only', 'editable');
    const before = nav();
    expect(before).toContain('Preferred suppliers');
    expect(before).toContain('Pay: Invoices');
    expect(before).toContain('Sourcing events');

    // 1 · PSL — one item of a group that keeps others.
    await flip('PSL');
    await waitFor(() => expect(nav()).not.toContain('Preferred suppliers'));
    expect(nav()).toContain('Source: Sourcing events');

    // 2 · INV — the only item of its group, so the GROUP leaves.
    await flip('INV');
    await waitFor(() => expect(nav()).not.toContain('Invoices'));
    expect(nav()).not.toContain('Pay:');

    // 3 · ORD — a module WITH dependants. SHP still depends on it, so the
    //     switch-off is refused and the item stays.
    fireEvent.click(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch'));
    expect(await screen.findByTestId('module-blocked-ORD')).toHaveTextContent('SHP');
    fireEvent.change(screen.getByTestId('modules-batch-reason'), { target: { value: 'ADM-1 spec' } });
    await waitFor(() => expect(screen.getByTestId('modules-save')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('modules-save'));
    await waitFor(() =>
      expect(screen.getByTestId('module-row-ORD').querySelector('[data-outcome="refused"]')).not.toBeNull(),
    );
    expect(nav()).toContain('Purchase Orders');
    // Put the refused row back so the next save carries only what is meant.
    fireEvent.click(within(screen.getByTestId('module-toggle-ORD')).getByRole('switch'));

    // Back ON, in the order the dependencies need: the sidebar is restored whole.
    await flip('INV');
    await waitFor(() => expect(nav()).toContain('Pay: Invoices'));
    await flip('PSL');
    await waitFor(() => expect(nav()).toBe(before));
  });

  it('an OPEN page reacts too: a page standing under its module gate is told it is off, with no remount', async () => {
    // What every page reads to know its module is off (`useRouteModuleOff`,
    // behind `ModuleOffNotice`). The probe counts its own mounts, so "no
    // reload" is asserted rather than assumed.
    let mounts = 0;
    const OpenPage: React.FC = () => {
      const off = useRouteModuleOff();
      React.useEffect(() => {
        mounts += 1;
      }, []);
      return <div data-testid="open-page" data-off={off === null ? 'on' : 'off'} />;
    };
    renderWithProviders(
      <ModuleActivationProvider>
        <ModulesAdmin />
        <ModuleGate path="/buyer/preferred-suppliers">
          <OpenPage />
        </ModuleGate>
      </ModuleActivationProvider>,
      { identity: SUPER_ADMIN, route: '/buyer/platform/modules/admin' },
    );
    await screen.findByTestId('module-row-PSL');
    expect(screen.getByTestId('open-page')).toHaveAttribute('data-off', 'on');
    await flip('PSL');
    await waitFor(() => expect(screen.getByTestId('open-page')).toHaveAttribute('data-off', 'off'));
    await flip('PSL');
    await waitFor(() => expect(screen.getByTestId('open-page')).toHaveAttribute('data-off', 'on'));
    expect(mounts).toBe(1);
  });
});

describe('ADM-1 · the Super Admin reason prompt', () => {
  it('names the check, takes one line, and hands it back; the confirm is held until there is a reason', async () => {
    renderWithProviders(<BypassReasonDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    let answer: string | null | undefined;
    act(() => {
      void askBypassReason(['INVOICE_RELEASER_IS_APPROVER']).then((v) => {
        answer = v;
      });
    });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Super Admin — state the reason');
    expect(within(dialog).getByTestId('bypass-reason-rules')).toHaveTextContent(
      'The person who approved an invoice may not release its payment',
    );
    expect(dialog).toHaveTextContent('Super Admin — four-eyes bypassed');
    const input = within(dialog).getByTestId('bypass-reason-input');
    expect(document.activeElement).toBe(input);
    const confirm = within(dialog).getByTestId('bypass-reason-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: '  Second approver is on leave  ' } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(answer).toBe('Second approver is on leave'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape and Cancel hand back nothing — the act stays refused', async () => {
    renderWithProviders(<BypassReasonDialog />);
    for (const close of ['escape', 'cancel'] as const) {
      let answer: string | null | undefined;
      act(() => {
        void askBypassReason(['PSL_DECIDER_IS_PROPOSER']).then((v) => {
          answer = v;
        });
      });
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByTestId('bypass-reason-input'), { target: { value: 'typed, then abandoned' } });
      if (close === 'escape') fireEvent.keyDown(document, { key: 'Escape' });
      else fireEvent.click(within(dialog).getByTestId('bypass-reason-cancel'));
      await waitFor(() => expect(answer).toBeNull());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  });

  it('Indonesian, and a check it has no name for is still named by its head', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BypassReasonDialog />);
    act(() => {
      void askBypassReason(['SAMPLE_ACTOR_CANNOT_LOOSEN', 'A_HEAD_WITH_NO_LABEL']);
    });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Super Admin — nyatakan alasannya');
    const rules = within(dialog).getByTestId('bypass-reason-rules');
    expect(rules).toHaveTextContent('Identitas contoh tidak boleh melonggarkan pengaturan yang diatur');
    expect(rules).toHaveTextContent('A_HEAD_WITH_NO_LABEL');
    fireEvent.keyDown(document, { key: 'Escape' });
  });
});

describe('ADM-1 · the document note and the activity view', () => {
  const svc = new MockCommandService();
  const scope = (identity: CurrentIdentity): QueryScope => ({
    personaType: 'buyer',
    supplierId: null,
    businessRoles: identity.businessRoles,
    actor: identity.actor,
  });
  let invoiceId = '';

  beforeEach(async () => {
    invoiceStore.reset();
    commandAuditSink.clear();
    const inv = invoiceStore.all().find((i) => i.status === 'Approved' && i.approvedBy?.kind !== 'RESOLVED')!;
    invoiceId = inv.id;
    const s = scope(SUPER_ADMIN);
    await svc.dispatch(s, { transitionId: 't_invoice_reapprove', entity: 'invoice', entityId: invoiceId, payload: {} });
    const released = await svc.dispatch(s, {
      transitionId: 't_invoice_release_payment',
      entity: 'invoice',
      entityId: invoiceId,
      payload: {},
      bypassReason: 'Month-end close',
    });
    expect(released.status, released.reason).not.toBe('failed');
  });

  it('the invoice carries "Super Admin — four-eyes bypassed": who, the check, the reason; another invoice carries nothing', () => {
    const { container } = renderWithProviders(
      <>
        <SuperAdminBypassNote entity="invoice" entityId={invoiceId} />
        <SuperAdminBypassNote entity="invoice" entityId="inv-untouched" />
      </>,
    );
    const note = screen.getByTestId(`super-admin-bypass-invoice-${invoiceId}`);
    expect(note).toHaveTextContent('Super Admin — four-eyes bypassed');
    expect(note).toHaveTextContent('Super Admin 1 (SAMPLE)');
    expect(note).toHaveTextContent('The person who approved an invoice may not release its payment');
    expect(note).toHaveTextContent('Reason: Month-end close');
    expect(note.textContent).not.toContain(SUPER_ADMIN_ID);
    expect(container.querySelector('[data-testid="super-admin-bypass-invoice-inv-untouched"]')).toBeNull();
  });

  it('the activity view lists both acts for Compliance, filters to the bypass, and searches', async () => {
    renderWithProviders(<SuperAdminActivity />, { identity: seatWith(['compliance']) });
    const table = await screen.findByTestId('super-admin-activity-table');
    const rows = within(table).getAllByTestId(/^super-admin-act-/);
    expect(rows).toHaveLength(2);
    // Newest first: the release that passed the check, then the approval.
    expect(rows[0]).toHaveAttribute('data-bypassed', 'yes');
    expect(rows[0]).toHaveTextContent('t_invoice_release_payment');
    expect(rows[0]).toHaveTextContent(`invoice · ${invoiceId}`);
    expect(rows[0]).toHaveTextContent('Super Admin — four-eyes bypassed');
    expect(rows[0]).toHaveTextContent('Month-end close');
    expect(rows[0]).toHaveTextContent('Super Admin 1 (SAMPLE)');
    expect(rows[1]).toHaveAttribute('data-bypassed', 'no');
    expect(rows[1]).toHaveTextContent('No check was passed');
    expect(table.textContent).not.toContain(SUPER_ADMIN_ID);
    expect(screen.getByTestId('super-admin-activity-session')).toHaveTextContent('starts empty after a reload');

    fireEvent.click(screen.getByTestId('super-admin-filter-bypassed'));
    expect(within(table).getAllByTestId(/^super-admin-act-/)).toHaveLength(1);
    expect(screen.getByTestId('super-admin-count')).toHaveTextContent('1 act');
    fireEvent.click(screen.getByTestId('super-admin-filter-refused'));
    expect(screen.getByTestId('super-admin-activity-empty')).toHaveTextContent('No recorded act matches this filter.');
    fireEvent.click(screen.getByTestId('super-admin-filter-all'));
    fireEvent.change(screen.getByTestId('super-admin-search'), { target: { value: 'reapprove' } });
    expect(screen.getAllByTestId(/^super-admin-act-/)).toHaveLength(1);
  });

  it('the Super Admin reads it too; every other seat is told whose view it is and shown no act', async () => {
    const { unmount } = renderWithProviders(<SuperAdminActivity />, { identity: SUPER_ADMIN });
    expect(await screen.findByTestId('super-admin-activity-table')).toBeInTheDocument();
    unmount();
    for (const role of ['admin', 'procurement', 'finance']) {
      const view = renderWithProviders(<SuperAdminActivity />, { identity: seatWith([role]) });
      expect(await screen.findByTestId('super-admin-activity-not-for-seat')).toHaveTextContent(
        'This view is for the Super Admin and for Compliance.',
      );
      expect(screen.queryByTestId('super-admin-activity-table')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('Indonesian: the title, the stamp and the empty state', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<SuperAdminActivity />, { identity: seatWith(['compliance']) });
    expect(await screen.findByRole('heading', { name: 'Aktivitas Super Admin' })).toBeInTheDocument();
    expect(screen.getByTestId('super-admin-activity-table')).toHaveTextContent('Super Admin — empat-mata dilewati');
    commandAuditSink.clear();
  });
});
