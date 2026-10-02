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
import { screen, within, fireEvent, render } from '@testing-library/react';
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
import SidebarV2, { sidebarNavScroll } from './SidebarV2';
import PageHeader from '../ui-v2/PageHeader';
import {
  BUYER_NAV,
  DETAIL_ROUTE_PARENT,
  NON_DESTINATION_ROUTES,
  NO_SECTION_ROUTES,
  SUPPLIER_NAV,
  navSectionKeyFor,
  visibleNav,
  type NavGroup,
} from './navModel';

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

// ════════════════════════════════════════════════════════════════════════════
// H1 · BREADCRUMB ↔ NAV PARITY. The first breadcrumb segment is the sidebar
// group, derived by `navSectionKeyFor` and prepended by `PageHeader`. Held both
// ways over the router's own population, rendered in EN and ID.
// ════════════════════════════════════════════════════════════════════════════

/** A concrete URL for a route pattern: every `:param` filled. */
const concrete = (pattern: string): string => pattern.replace(/:[A-Za-z]+/g, 'x-1');
const groupOf = (groups: readonly NavGroup[], path: string) =>
  groups.find((g) => g.items.some((i) => i.path === path))?.labelKey;

describe('H1 · every route opens under a nav group, or is named as opening under none', () => {
  it('the non-destinations split exactly into detail routes and no-section routes', () => {
    expect([...Object.keys(DETAIL_ROUTE_PARENT), ...NO_SECTION_ROUTES].sort()).toEqual(
      Object.keys(NON_DESTINATION_ROUTES).sort(),
    );
  });

  it('every detail route names a parent that is a nav item', () => {
    expect(Object.values(DETAIL_ROUTE_PARENT).filter((p) => !ALL_NAV_PATHS.has(p))).toEqual([]);
  });

  it('every router path resolves to a group, except the no-section routes, which resolve to none', () => {
    const wrong = ROUTER_PATHS.filter((p) =>
      NO_SECTION_ROUTES.includes(p) ? navSectionKeyFor(concrete(p)) !== null : navSectionKeyFor(concrete(p)) === null,
    );
    expect(wrong).toEqual([]);
    // the control: an unknown path opens under nothing
    expect(navSectionKeyFor('/buyer/not-a-real-route')).toBeNull();
  });

  it.each(SIDES)('%s: every nav item opens under the group that holds it', (_side, groups) => {
    const wrong = groups.flatMap((g) =>
      g.items
        .filter((i) => navSectionKeyFor(concrete(i.path)) !== g.labelKey)
        .map((i) => `${i.path} → ${navSectionKeyFor(i.path)}`),
    );
    expect(wrong).toEqual([]);
  });

  it('a path on both sides sits in groups with the same label, so the side cannot change the crumb', () => {
    const both = navPaths(BUYER_NAV).filter((p) => navPaths(SUPPLIER_NAV).includes(p));
    expect(both).toContain('/glossary');
    expect(both.filter((p) => groupOf(BUYER_NAV, p) !== groupOf(SUPPLIER_NAV, p))).toEqual([]);
  });

  it('a detail route opens under its list: contract detail → Contract, a storefront → Source', () => {
    expect(navSectionKeyFor('/buyer/contracts/ctr-013')).toBe('nav.section.contract');
    expect(navSectionKeyFor('/marketplace/supplier/sup-007')).toBe('nav.section.source');
    expect(navSectionKeyFor('/buyer/platform/modules/admin')).toBe('nav.section.platform');
  });

  it('the retired section vocabulary is gone from every breadcrumb key, EN and ID', () => {
    const RETIRED = /^(acquire|transact|settle|intelligence|dashboards|pengadaan|akuisisi|transaksi|penyelesaian|intelijen)$/i;
    const stale = (['en', 'id'] as const).flatMap((lng) =>
      Object.entries(resources[lng].translation as Record<string, string>)
        .filter(([k, v]) => /crumb/i.test(k) && RETIRED.test(v.trim()))
        .map(([k, v]) => `${lng}:${k}=${v}`),
    );
    expect(stale).toEqual([]);
  });
});

describe('H1 · no breadcrumb segment repeats the group it opens under', () => {
  // Found in browser QA, not by a spec: Indonesian contract pages read
  // "KONTRAK · KONTRAK" because the page's own crumb and the Contract group are
  // the same word in that locale. Held over every crumb key, both locales, so a
  // collision in a language nobody re-reads is red here.
  const groupLabels = (lng: 'en' | 'id') => {
    const R = resources[lng].translation as Record<string, string>;
    return new Set([...BUYER_NAV, ...SUPPLIER_NAV].map((g) => R[g.labelKey].toLocaleUpperCase()));
  };
  const crumbEntries = (lng: 'en' | 'id') =>
    Object.entries(resources[lng].translation as Record<string, string>).filter(([k]) => /crumb/i.test(k));

  it('the population is real: crumb keys in both locales, and the group labels resolve', () => {
    expect(crumbEntries('en').length).toBeGreaterThan(30);
    expect(crumbEntries('id').length).toBe(crumbEntries('en').length);
    expect(groupLabels('id').has('KONTRAK')).toBe(true);
  });

  it.each(['en', 'id'] as const)('%s: no crumb key carries a group label', (lng) => {
    const labels = groupLabels(lng);
    expect(crumbEntries(lng).filter(([, v]) => labels.has(v.toLocaleUpperCase())).map(([k, v]) => `${k}=${v}`)).toEqual([]);
  });
});

describe('H1 · the header renders the section first — every nav and detail route, EN then ID', () => {
  const PATTERNS = [...ALL_NAV_PATHS, ...Object.keys(DETAIL_ROUTE_PARENT)];
  const header = (at: string) => renderWithProviders(<PageHeader breadcrumb={['Tail']} title="T" />, { route: at });

  it.each(['en', 'id'] as const)('%s: the eyebrow is "<group label> · Tail" at every route', async (lng) => {
    await i18n.changeLanguage(lng);
    const wrong: string[] = [];
    for (const p of PATTERNS) {
      const { unmount } = header(concrete(p));
      const expected = `${i18n.t(navSectionKeyFor(concrete(p))!)} · Tail`;
      const got = screen.getByTestId('page-breadcrumb').textContent;
      if (got !== expected) wrong.push(`${p}: ${got} ≠ ${expected}`);
      unmount();
    }
    expect(PATTERNS.length).toBeGreaterThan(30);
    expect(wrong).toEqual([]);
  });

  it('ID labels really differ from EN on a group, so the ID run can fail', async () => {
    await i18n.changeLanguage('id');
    expect(i18n.t('nav.section.orderReceive')).not.toBe(
      (resources.en.translation as Record<string, string>)['nav.section.orderReceive'],
    );
  });

  it('the 404 and a render outside any router prepend nothing', () => {
    const { unmount } = header('/buyer/not-a-real-route');
    expect(screen.getByTestId('page-breadcrumb').textContent).toBe('Tail');
    unmount();
    render(<PageHeader breadcrumb={['Tail']} title="T" />);
    expect(screen.getByTestId('page-breadcrumb').textContent).toBe('Tail');
  });
});

describe('the sidebar keeps its scroll position when a pick mounts the next page', () => {
  afterEach(() => sidebarNavScroll.reset());

  it('a scrolled nav is restored on the next mount, not reset to the top', () => {
    const first = renderWithProviders(<SidebarV2 />, { route: '/buyer/dashboard' });
    const nav = screen.getByRole('navigation');
    nav.scrollTop = 320;
    fireEvent.scroll(nav);
    expect(sidebarNavScroll.get()).toBe(320);
    first.unmount();
    renderWithProviders(<SidebarV2 />, { route: '/buyer/analytics' });
    expect(screen.getByRole('navigation').scrollTop).toBe(320);
  });

  it('the control: a fresh session starts at the top', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/dashboard' });
    expect(screen.getByRole('navigation').scrollTop).toBe(0);
  });

  it('switching persona starts the other list at the top', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/dashboard' });
    const nav = screen.getByRole('navigation');
    nav.scrollTop = 200;
    fireEvent.scroll(nav);
    expect(sidebarNavScroll.get()).toBe(200);
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(sidebarNavScroll.get()).toBe(0);
  });

  it('the active item is marked, for assistive tech and for the scroll-into-view', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/invoices' });
    expect(screen.getByRole('button', { name: 'Invoices' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Purchase Orders' })).not.toHaveAttribute('aria-current');
  });
});
