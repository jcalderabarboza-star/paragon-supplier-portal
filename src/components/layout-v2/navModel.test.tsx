// ────────────────────────────────────────────────────────────────────────────
// N1 · THE SIDEBAR BY PROCESS, HELD BOTH WAYS.
//
// The router population is DERIVED from the router SOURCE, never from this
// file's tables (`ROUTE-SMOKE-GUARD-IS-SELF-REFERENTIAL-01`), and it carries a
// membership control first so an empty derivation cannot read as clean. The
// two orders are pinned as literals ON PURPOSE: the order is the operator's
// ruling, so a change to it must be a visible edit to this spec.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import i18n, { resources } from '../../lib/i18n';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { ModuleActivationContext } from '../../context/ModuleActivationContext';
import { NO_PERSON } from '../../context/noPerson';
import {
  defaultActivation,
  effectiveActivation,
  type ModuleActivationSetting,
  type ModuleActivationView,
} from '../../services/modules/activation';
import { moduleOfRoute } from '../../services/modules/registry';
import SidebarV2 from './SidebarV2';
import { BUYER_NAV, NON_DESTINATION_ROUTES, SUPPLIER_NAV, visibleNav, type NavGroup } from './navModel';

const routerSrc = stripSourceComments(
  readFileSync(join(process.cwd(), 'src', 'router', 'AppRouter.tsx'), 'utf8'),
  'delete',
);
/** Every `<Route path="…">` in the router SOURCE. */
const ROUTER_PATHS = [...routerSrc.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

const SIDES: readonly (readonly [string, readonly NavGroup[]])[] = [
  ['buyer', BUYER_NAV],
  ['supplier', SUPPLIER_NAV],
];
const shape = (groups: readonly NavGroup[]) => groups.map((g) => [g.labelKey, g.items.map((i) => i.path)]);
const navPaths = (groups: readonly NavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.path));
const ALL_NAV_PATHS = new Set([...navPaths(BUYER_NAV), ...navPaths(SUPPLIER_NAV)]);

const row = (code: ModuleActivationSetting['code'], seq = 1): ModuleActivationSetting => ({
  code,
  phase: code.startsWith('side:') ? null : 'Planned',
  enabled: false,
  parts: {},
  reason: 'spec',
  setBy: NO_PERSON,
  setAt: '2026-10-01T00:00:00.000Z',
  seq,
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('the router population is derived, and it is not empty', () => {
  it('CONTROL: known paths are found (one multi-line), and a path the router lacks is not', () => {
    expect(ROUTER_PATHS).toContain('/supplier/shipments');
    expect(ROUTER_PATHS).toContain('/buyer/plan-grid');
    expect(ROUTER_PATHS).toContain('*');
    expect(ROUTER_PATHS).not.toContain('/buyer/nope');
  });
});

describe('N1 — the order is pinned, stage by stage', () => {
  it('buyer: Home · Plan · Source · Contract · Collaborate · Order & receive · Pay · Suppliers · Insights · Platform', () => {
    expect(shape(BUYER_NAV)).toEqual([
      ['nav.section.home', ['/buyer/dashboard']],
      ['nav.section.plan', ['/buyer/plan-grid', '/buyer/intake-review', '/buyer/purchase-requisition']],
      ['nav.section.source', ['/buyer/sourcing', '/buyer/preferred-suppliers', '/buyer/material-requests', '/buyer/discovery', '/marketplace']],
      ['nav.section.contract', ['/buyer/contracts', '/buyer/delivery-agreements']],
      ['nav.section.collaborate', ['/buyer/collaboration', '/buyer/chase', '/buyer/comm-hub']],
      ['nav.section.orderReceive', ['/buyer/orders', '/buyer/shipments', '/buyer/goods-receipt']],
      ['nav.section.pay', ['/buyer/invoices']],
      ['nav.section.suppliers', ['/buyer/suppliers', '/buyer/supplier-applications', '/buyer/compliance']],
      ['nav.section.insights', ['/buyer/analytics', '/buyer/scorecard', '/buyer/risk', '/buyer/inventory']],
      ['nav.section.platform', ['/buyer/platform/modules', '/buyer/roles', '/buyer/process-flows', '/glossary']],
    ]);
  });

  it('supplier: Home · Demand · Quote · Fulfil · Get paid · Comply · Grow · Talk · Platform', () => {
    expect(shape(SUPPLIER_NAV)).toEqual([
      ['nav.section.home', ['/supplier/dashboard']],
      ['nav.section.demand', ['/supplier/forecasts', '/supplier/inventory']],
      ['nav.section.quote', ['/supplier/rfqs']],
      ['nav.section.fulfil', ['/supplier/orders', '/supplier/delivery-agreements', '/supplier/shipments']],
      ['nav.section.getPaid', ['/supplier/invoices']],
      ['nav.section.comply', ['/supplier/documents']],
      ['nav.section.grow', ['/supplier/performance', '/supplier/storefront']],
      ['nav.section.talk', ['/supplier/comm-hub', '/supplier/whatsapp']],
      ['nav.section.platform', ['/glossary']],
    ]);
  });
});

describe.each(SIDES)('%s nav — every item in exactly one group, every group with an item', (_side, groups) => {
  it('no path appears twice on the side (one group per item)', () => {
    const paths = navPaths(groups);
    expect(paths.filter((p, i) => paths.indexOf(p) !== i)).toEqual([]);
  });

  it('no label key appears twice on the side, and no group key twice', () => {
    const keys = groups.flatMap((g) => g.items.map((i) => i.labelKey));
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    const gk = groups.map((g) => g.labelKey);
    expect(gk.filter((k, i) => gk.indexOf(k) !== i)).toEqual([]);
  });

  it('no group is authored empty', () => {
    expect(groups.filter((g) => g.items.length === 0).map((g) => g.labelKey)).toEqual([]);
  });
});

describe('every destination route is in the nav, or named as a non-destination', () => {
  it('no router path is left unaccounted for', () => {
    expect(ROUTER_PATHS.filter((p) => !ALL_NAV_PATHS.has(p) && !(p in NON_DESTINATION_ROUTES))).toEqual([]);
  });

  it('every nav path is a real route (no dead link)', () => {
    expect([...ALL_NAV_PATHS].filter((p) => !ROUTER_PATHS.includes(p))).toEqual([]);
  });

  it('every non-destination is a real route, is NOT also a nav item, and states its reason', () => {
    const keys = Object.keys(NON_DESTINATION_ROUTES);
    expect(keys.filter((p) => !ROUTER_PATHS.includes(p))).toEqual([]);
    expect(keys.filter((p) => ALL_NAV_PATHS.has(p))).toEqual([]);
    expect(Object.entries(NON_DESTINATION_ROUTES).filter(([, why]) => why.trim().length < 20).map(([p]) => p)).toEqual([]);
  });
});

describe('nav items map to modules (Design 5 registry)', () => {
  it('every nav item is placed in a module, and stays on its own side', () => {
    expect([...ALL_NAV_PATHS].filter((p) => moduleOfRoute(p) === null)).toEqual([]);
    expect(navPaths(BUYER_NAV).filter((p) => p.startsWith('/supplier/'))).toEqual([]);
    expect(navPaths(SUPPLIER_NAV).filter((p) => p.startsWith('/buyer/'))).toEqual([]);
  });

  it("each group's module set is DERIVED from its items, and is the one the stage means", () => {
    const sets = (groups: readonly NavGroup[]) =>
      Object.fromEntries(groups.map((g) => [g.labelKey, [...new Set(g.items.map((i) => moduleOfRoute(i.path)?.code))]]));
    expect(sets(BUYER_NAV)).toEqual({
      'nav.section.home': ['PLT'],
      'nav.section.plan': ['PLN', 'REQ'],
      'nav.section.source': ['SRC', 'PSL', 'MAT', 'SUP'],
      'nav.section.contract': ['CTR'],
      'nav.section.collaborate': ['SDC', 'COM'],
      'nav.section.orderReceive': ['ORD', 'SHP', 'GRC'],
      'nav.section.pay': ['INV'],
      'nav.section.suppliers': ['SUP', 'CMP'],
      'nav.section.insights': ['INT'],
      'nav.section.platform': ['PLT'],
    });
    expect(sets(SUPPLIER_NAV)).toEqual({
      'nav.section.home': ['PLT'],
      'nav.section.demand': ['SDC'],
      'nav.section.quote': ['SRC'],
      'nav.section.fulfil': ['ORD', 'CTR', 'SHP'],
      'nav.section.getPaid': ['INV'],
      'nav.section.comply': ['CMP'],
      'nav.section.grow': ['INT', 'SUP'],
      'nav.section.talk': ['COM'],
      'nav.section.platform': ['PLT'],
    });
  });
});

describe('every group and item label exists in EN and in ID', () => {
  const en = resources.en.translation as Record<string, string>;
  const id = resources.id.translation as Record<string, string>;
  const keys = [...new Set(SIDES.flatMap(([, gs]) => gs.flatMap((g) => [g.labelKey, ...g.items.map((i) => i.labelKey)])))];

  it('CONTROL: the key population holds a known group key', () => {
    expect(keys).toContain('nav.section.orderReceive');
  });

  it('no key is missing from either locale', () => {
    expect(keys.filter((k) => typeof en[k] !== 'string' || en[k].trim() === '')).toEqual([]);
    expect(keys.filter((k) => typeof id[k] !== 'string' || id[k].trim() === '')).toEqual([]);
  });
});

describe('a module switched off removes its items; a group left empty never renders', () => {
  const visible = (groups: readonly NavGroup[], view: ModuleActivationView) => shape(visibleNav(groups, view));

  it('KNOWN-GOOD: with every module on, nothing is removed', () => {
    expect(visible(BUYER_NAV, defaultActivation())).toEqual(shape(BUYER_NAV));
    expect(visible(SUPPLIER_NAV, defaultActivation())).toEqual(shape(SUPPLIER_NAV));
  });

  it('PSL off removes Preferred suppliers and keeps the rest of Source', () => {
    const groups = visibleNav(BUYER_NAV, effectiveActivation([row('PSL')]));
    expect(groups.find((g) => g.labelKey === 'nav.section.source')!.items.map((i) => i.path)).toEqual([
      '/buyer/sourcing',
      '/buyer/material-requests',
      '/buyer/discovery',
      '/marketplace',
    ]);
  });

  it('INV off removes Pay (buyer) and Get paid (supplier) whole', () => {
    const view = effectiveActivation([row('INV')]);
    expect(visibleNav(BUYER_NAV, view).map((g) => g.labelKey)).not.toContain('nav.section.pay');
    expect(visibleNav(SUPPLIER_NAV, view).map((g) => g.labelKey)).not.toContain('nav.section.getPaid');
    expect(visibleNav(BUYER_NAV, view)).toHaveLength(BUYER_NAV.length - 1);
  });

  const sidebarAt = (view: ModuleActivationView | null, supplier = false) =>
    renderWithProviders(
      <ModuleActivationContext.Provider value={view}>
        <SidebarV2 />
      </ModuleActivationContext.Provider>,
      supplier ? { identity: SUPPLIER, route: '/supplier/dashboard' } : { route: '/buyer/dashboard' },
    );

  it('RENDERED, ON twin: the Pay header and its Invoices item are drawn', () => {
    sidebarAt(null);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Pay')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Invoices' })).toBeInTheDocument();
  });

  it('RENDERED, OFF: INV off draws neither the Pay header nor an empty group', () => {
    sidebarAt(effectiveActivation([row('INV')]));
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryByText('Pay')).toBeNull();
    expect(within(nav).queryByRole('button', { name: 'Invoices' })).toBeNull();
    expect([...nav.children].filter((g) => g.querySelectorAll('li').length === 0)).toHaveLength(0);
  });

  it('RENDERED, ID: the supplier groups are drawn in order with Indonesian labels', async () => {
    await i18n.changeLanguage('id');
    sidebarAt(null, true);
    const nav = screen.getByRole('navigation');
    expect([...nav.children].map((g) => g.firstElementChild!.textContent)).toEqual([
      'Beranda', 'Permintaan', 'Penawaran', 'Pemenuhan', 'Terima pembayaran', 'Kepatuhan', 'Pertumbuhan', 'Komunikasi', 'Platform',
    ]);
  });
});
