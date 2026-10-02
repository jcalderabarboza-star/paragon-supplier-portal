// ────────────────────────────────────────────────────────────────────────────
// N1 · THE SIDEBAR, BY PROCESS — one group per source-to-pay stage, in order.
//
// The ORDER below is the operator's (N1): a reader scanning down the sidebar
// walks the process from plan to pay, then the supplier base, then insight,
// then the platform. Each group's MODULE SET is never written here: it is
// derived from its items' routes through the module registry (`moduleOfRoute`),
// so a group's visibility follows the switches it actually depends on.
//
// `navModel.test.ts` holds it: every item in exactly one group, both orders
// pinned, every router path either in the nav or on `NON_DESTINATION_ROUTES`
// with its reason, and every item placed in a module.
// ────────────────────────────────────────────────────────────────────────────

import {
  LayoutDashboard,
  Search,
  Store,
  Users,
  FileText,
  ShoppingCart,
  Boxes,
  Truck,
  ClipboardCheck,
  Receipt,
  Inbox,
  BarChart2,
  Award,
  AlertTriangle,
  ShieldCheck,
  ScrollText,
  CalendarClock,
  BellRing,
  MessageCircle,
  Table2,
  Workflow,
  BookOpen,
  Handshake,
  type LucideIcon,
  UserPlus,
  PackagePlus,
  ListChecks,
  Blocks,
} from 'lucide-react';
import { matchPath } from 'react-router-dom';
import { routeOffReason, type ModuleActivationView } from '../../services/modules/activation';

export interface NavItem {
  readonly labelKey: string;
  readonly icon: LucideIcon;
  readonly path: string;
}

export interface NavGroup {
  readonly labelKey: string;
  readonly items: readonly NavItem[];
}

export const BUYER_NAV: readonly NavGroup[] = [
  {
    labelKey: 'nav.section.home',
    items: [{ labelKey: 'nav.buyer.dashboard', icon: LayoutDashboard, path: '/buyer/dashboard' }],
  },
  {
    labelKey: 'nav.section.plan',
    items: [
      { labelKey: 'nav.buyer.planGrid', icon: Table2, path: '/buyer/plan-grid' },
      // PLN-3 · Intake Review is a view of the Plan Grid now (Design 1 D8); its
      // old route redirects there, so the grid's own entry is the one door.
      { labelKey: 'nav.buyer.requisitions', icon: FileText, path: '/buyer/purchase-requisition' },
    ],
  },
  {
    labelKey: 'nav.section.source',
    items: [
      { labelKey: 'nav.buyer.sourcing', icon: FileText, path: '/buyer/sourcing' },
      { labelKey: 'nav.buyer.preferredSuppliers', icon: ListChecks, path: '/buyer/preferred-suppliers' },
      { labelKey: 'nav.buyer.materialRequests', icon: PackagePlus, path: '/buyer/material-requests' },
      { labelKey: 'nav.buyer.discovery', icon: Search, path: '/buyer/discovery' },
      // Not in N1's item list, and kept: it was a nav destination before N1 and
      // dropping it would leave a page reachable only through Discovery's link.
      // It sits beside Discovery because both are SUP's `discovery` part.
      { labelKey: 'nav.buyer.marketplace', icon: Store, path: '/marketplace' },
    ],
  },
  {
    labelKey: 'nav.section.contract',
    items: [
      { labelKey: 'nav.buyer.contracts', icon: ScrollText, path: '/buyer/contracts' },
      { labelKey: 'nav.buyer.deliveryAgreements', icon: CalendarClock, path: '/buyer/delivery-agreements' },
    ],
  },
  {
    labelKey: 'nav.section.collaborate',
    items: [
      { labelKey: 'nav.buyer.collaboration', icon: Handshake, path: '/buyer/collaboration' },
      { labelKey: 'nav.buyer.chase', icon: BellRing, path: '/buyer/chase' },
      { labelKey: 'nav.buyer.commHub', icon: MessageCircle, path: '/buyer/comm-hub' },
    ],
  },
  {
    labelKey: 'nav.section.orderReceive',
    items: [
      { labelKey: 'nav.buyer.purchaseOrders', icon: ShoppingCart, path: '/buyer/orders' },
      { labelKey: 'nav.buyer.shipments', icon: Truck, path: '/buyer/shipments' },
      { labelKey: 'nav.buyer.goodsReceipt', icon: ClipboardCheck, path: '/buyer/goods-receipt' },
    ],
  },
  {
    labelKey: 'nav.section.pay',
    items: [{ labelKey: 'nav.buyer.invoices', icon: Receipt, path: '/buyer/invoices' }],
  },
  {
    labelKey: 'nav.section.suppliers',
    items: [
      { labelKey: 'nav.buyer.suppliers', icon: Users, path: '/buyer/suppliers' },
      { labelKey: 'nav.buyer.supplierApplications', icon: UserPlus, path: '/buyer/supplier-applications' },
      { labelKey: 'nav.buyer.compliance', icon: ShieldCheck, path: '/buyer/compliance' },
    ],
  },
  {
    labelKey: 'nav.section.insights',
    items: [
      { labelKey: 'nav.buyer.analytics', icon: BarChart2, path: '/buyer/analytics' },
      { labelKey: 'nav.buyer.scorecard', icon: Award, path: '/buyer/scorecard' },
      { labelKey: 'nav.buyer.risk', icon: AlertTriangle, path: '/buyer/risk' },
      { labelKey: 'nav.buyer.inventory', icon: Boxes, path: '/buyer/inventory' },
    ],
  },
  {
    // ── THE PLATFORM GROUPING ────────────────────────────────────────────────
    // Settings-shaped items, deliberately apart from the day-to-day work
    // sections. WHO I AM is in the avatar panel; MANAGING WHO ANYONE IS is a
    // page — and a role catalogue is the second, not the first.
    //
    // A Users page is NOT here and that is a ruling: the portal holds no people
    // (staff identity is the corporate directory's, unconnected), so it would
    // show an empty list and "0 assigned" on every role, with the honest marker
    // doing all the work. Shipping the shape without the substance is the class
    // this project spends its time removing.
    labelKey: 'nav.section.platform',
    items: [
      { labelKey: 'nav.buyer.modules', icon: Blocks, path: '/buyer/platform/modules' },
      { labelKey: 'nav.buyer.roles', icon: ShieldCheck, path: '/buyer/roles' },
      { labelKey: 'nav.buyer.processFlows', icon: Workflow, path: '/buyer/process-flows' },
      // GL-1 — the glossary. LISTED IN BOTH PERSONAS' NAV, under one
      // persona-neutral key and one persona-neutral path, because the term chips
      // that lead here sit on both sides' refusal sites.
      { labelKey: 'nav.glossary', icon: BookOpen, path: '/glossary' },
    ],
  },
];

export const SUPPLIER_NAV: readonly NavGroup[] = [
  {
    labelKey: 'nav.section.home',
    items: [{ labelKey: 'nav.supplier.dashboard', icon: LayoutDashboard, path: '/supplier/dashboard' }],
  },
  {
    labelKey: 'nav.section.demand',
    items: [
      { labelKey: 'nav.supplier.forecasts', icon: Handshake, path: '/supplier/forecasts' },
      { labelKey: 'nav.supplier.inventory', icon: Boxes, path: '/supplier/inventory' },
    ],
  },
  {
    labelKey: 'nav.section.quote',
    items: [{ labelKey: 'nav.supplier.rfqs', icon: Search, path: '/supplier/rfqs' }],
  },
  {
    labelKey: 'nav.section.fulfil',
    items: [
      { labelKey: 'nav.supplier.orders', icon: ShoppingCart, path: '/supplier/orders' },
      { labelKey: 'nav.supplier.deliveryAgreements', icon: CalendarClock, path: '/supplier/delivery-agreements' },
      { labelKey: 'nav.supplier.shipments', icon: Truck, path: '/supplier/shipments' },
    ],
  },
  {
    labelKey: 'nav.section.getPaid',
    items: [{ labelKey: 'nav.supplier.invoices', icon: Receipt, path: '/supplier/invoices' }],
  },
  {
    labelKey: 'nav.section.comply',
    items: [{ labelKey: 'nav.supplier.documents', icon: FileText, path: '/supplier/documents' }],
  },
  {
    labelKey: 'nav.section.grow',
    items: [
      { labelKey: 'nav.supplier.performance', icon: BarChart2, path: '/supplier/performance' },
      { labelKey: 'nav.supplier.storefront', icon: Store, path: '/supplier/storefront' },
    ],
  },
  {
    labelKey: 'nav.section.talk',
    items: [
      { labelKey: 'nav.supplier.commHub', icon: Inbox, path: '/supplier/comm-hub' },
      { labelKey: 'nav.supplier.whatsapp', icon: MessageCircle, path: '/supplier/whatsapp' },
    ],
  },
  {
    // Not in N1's supplier list, and kept: GL-1 lists the glossary in BOTH
    // personas' nav (see the buyer Platform group), so the supplier side keeps
    // a Platform group holding it alone.
    labelKey: 'nav.section.platform',
    items: [{ labelKey: 'nav.glossary', icon: BookOpen, path: '/glossary' }],
  },
];

/**
 * Router paths that are deliberately NOT nav items, each with the reason. A
 * path here is not a destination a person picks from the sidebar: it is a
 * detail reached from its list, a page reached from another page, an entry
 * point before a session exists, or routing plumbing.
 */
export const NON_DESTINATION_ROUTES: Readonly<Record<string, string>> = {
  '/login': 'entry point before a session exists; the sidebar is only drawn inside one',
  '/register': 'supplier self-registration, reached from the login page before a session exists',
  '/buyer/suppliers/:id': 'detail route, reached from a supplier row in Suppliers or Preferred suppliers',
  '/marketplace/supplier/:id': 'detail route, a storefront reached from a Marketplace card',
  '/buyer/contracts/:id': 'detail route, reached from a contract row in Contracts or Delivery agreements',
  '/buyer/roles/:roleId': 'detail route, reached from a role row in Roles',
  '/buyer/platform/modules/admin': 'reached from the Modules board, which is its nav destination',
  '/': 'redirect to the buyer dashboard, not a page',
  '/buyer/intake-review': 'redirect to the Plan Grid intake-review view, where Intake Review lives since PLN-3 — not a page',
  '*': 'the 404 page for an unknown route, not a destination',
};

/**
 * H1 · THE BREADCRUMB'S FIRST SEGMENT IS THE SIDEBAR GROUP, DERIVED HERE.
 *
 * A page reached from the nav opens under the group that holds it; a detail
 * route opens under the group of the list it is reached from. Every page's
 * breadcrumb starts with this label (`PageHeader` prepends it), so a page can
 * never name a section the sidebar does not show — the old per-page section
 * keys (Acquire, Transact, Settle, Intelligence) are gone and cannot drift.
 *
 * `navModel.test.tsx` holds it both ways: every router path resolves to a group
 * or is on `NO_SECTION_ROUTES`, and every detail route's parent is a nav item.
 */
export const DETAIL_ROUTE_PARENT: Readonly<Record<string, string>> = {
  '/buyer/suppliers/:id': '/buyer/suppliers',
  '/marketplace/supplier/:id': '/marketplace',
  '/buyer/contracts/:id': '/buyer/contracts',
  '/buyer/roles/:roleId': '/buyer/roles',
  '/buyer/platform/modules/admin': '/buyer/platform/modules',
};

/** Non-destinations that open under no group: drawn before a session exists, or routing plumbing. */
export const NO_SECTION_ROUTES: readonly string[] = ['/login', '/register', '/', '/buyer/intake-review', '*'];

/** The nav group label key of the item at `path` on one side, or null. */
function groupKeyOf(groups: readonly NavGroup[], path: string): string | null {
  return groups.find((g) => g.items.some((i) => i.path === path))?.labelKey ?? null;
}

/**
 * The group label key a location opens under, or null when it opens under none.
 * The side comes from the location's prefix; a persona-neutral path (`/glossary`,
 * `/marketplace`) is looked up on the buyer side first, then the supplier side.
 */
export function navSectionKeyFor(pathname: string): string | null {
  const sides = pathname.startsWith('/supplier/') ? [SUPPLIER_NAV, BUYER_NAV] : [BUYER_NAV, SUPPLIER_NAV];
  const lookup = (path: string): string | null => {
    for (const side of sides) {
      const key = groupKeyOf(side, path);
      if (key) return key;
    }
    return null;
  };
  for (const side of sides) {
    for (const g of side) {
      if (g.items.some((i) => matchPath({ path: i.path, end: true }, pathname))) return g.labelKey;
    }
  }
  for (const [pattern, parent] of Object.entries(DETAIL_ROUTE_PARENT)) {
    if (matchPath({ path: pattern, end: true }, pathname)) return lookup(parent);
  }
  return null;
}

/**
 * The groups a seat sees. An item whose route is off leaves (Design 5 §A.3:
 * never a dead link; the route still renders read-only if reached), and a
 * group left with no item leaves too, so an empty group never renders.
 */
export function visibleNav(groups: readonly NavGroup[], activation: ModuleActivationView): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((item) => routeOffReason(item.path, activation) === null) }))
    .filter((g) => g.items.length > 0);
}
