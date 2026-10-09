// ────────────────────────────────────────────────────────────────────────────
// M1 · THE MODULE REGISTRY — Design 5 Part A, §A.1–§A.2 (operator ruling
// 2026-09-28, D1–D8 adopted as recommended).
//
// A module is the smallest set of routes, flows and reads a person would switch
// on together. The GROUPING below is a judgement; the FACTS it groups are not,
// and each is held bilaterally by `moduleRegistry.test.ts`:
//   · every `AppRouter` path is in exactly one module's `routes`, and a route the
//     router lacks is red (derived from the router SOURCE, the `allRoutes.smoke`
//     precedent — never from this file's own table);
//   · every `getKnownFlows()` entity is in exactly one module's `flows`;
//   · the dependency graph is acyclic, PLT has none, and every edge names a
//     registered code;
//   · every part's verbs are real transitions of its own module's flows.
//
// ⚠️ **THE DESIGN IS PINNED TO `81c98403`; THIS FILE IS DERIVED AGAINST THE TREE
// IT LANDS ON.** Two flows arrived after the pin and are placed where the design
// already said their machines would go: `intakeLine` in PLN (*"the intake
// machine, Design 1"*) and `forecastPublication` in SDC (*"the publication
// machine (Design 2)"*). SDC's dependency on PLN is therefore HARD now — the
// design wrote it as *"once Design 2 lands"*, and it has.
//
// ⚠️ **TWO PARTS OF §A.1.3 ARE NOT HERE, BY OPERATOR RULING (2026-10-01).**
// `GRC · Halal certificate notice` and `SRC · Sourcing gates` are NOT module
// parts: switching off a compliance check is never a module decision, and it
// stays governed only by the enforcement ledger. A part that switched one off
// would make the surface stop TELLING (the H4 certificate notice) or stop
// APPLYING (the PSL publish gates) a check through a door the enforcement
// ledger does not watch. `moduleParts.complianceCheck.test.ts` derives the set
// of compliance-check verbs and routes and pins that no part reaches one.
//
// ⚠️ **THE COUNT IS THE TABLE'S: FIFTEEN SWITCHABLE MODULES + PLT (ruled
// 2026-10-01).** The design's prose said "fourteen"; its own table and union
// hold fifteen. Derive it from `MODULE_CODES`, never from a sentence.
//
// PLT is never written as a dependency. The design lists it for SUP, MAT and
// REQ and states *"everything → PLT"*; PLT is always on, so the edge can never
// block anything, and writing it on some rows but not others would make the
// graph say something it does not mean.
// ────────────────────────────────────────────────────────────────────────────

import type { Capability } from '../liveness/registry';
// From the INDEX, not `../transitions/registry`: the index is what registers the
// shipped flows, and a module read before any flow registered would place no
// verb in any module (`EMPTY-INPUT-REPORTS-CLEAN-01`, the §42b import defect).
import { getKnownFlows } from '../transitions';
import type { QueryScope } from '../data/types';
import type { PersonaType } from '../../context/CurrentIdentityContext';

/** PLT plus the switchable modules of the design's table (fifteen, ruled 2026-10-01). */
export const MODULE_CODES = [
  'PLT', 'SUP', 'CMP', 'PSL', 'MAT', 'REQ', 'PLN', 'SDC',
  'COM', 'SRC', 'CTR', 'ORD', 'SHP', 'GRC', 'INV', 'INT',
] as const;
export type ModuleCode = (typeof MODULE_CODES)[number];

export type ModuleScope = 'cross-cutting' | 'buyer' | 'supplier';

/** §A.2 — the four phases. Active/Activating are ON; Planned/Backlog are OFF. */
export const MODULE_PHASES = ['Active', 'Activating', 'Planned', 'Backlog'] as const;
export type ModulePhase = (typeof MODULE_PHASES)[number];

/** Is a phase an ON phase? Derived here once, so the hook and the gate agree. */
export const phaseIsOn = (phase: ModulePhase): boolean =>
  phase === 'Active' || phase === 'Activating';

export type DependencyKind = 'hard' | 'soft';

/** §A.1.4 — the side toggles, the "channel" analogue (D1). */
export const MODULE_SIDES = ['side:buyer', 'side:supplier'] as const;
export type SideId = (typeof MODULE_SIDES)[number];

/** What `t_module_set` may address: a module code, or a side. */
export type ActivationSubject = ModuleCode | SideId;

export interface ModulePart {
  readonly id: string;
  readonly nameKey: string;
  readonly verbs: readonly string[];
  readonly routes: readonly string[];
}

export interface ModuleSpec {
  readonly code: ModuleCode;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly scope: ModuleScope;
  /** Exact `AppRouter` paths; bilateral with the router source. */
  readonly routes: readonly string[];
  /** Flow entity keys; bilateral with `getKnownFlows()`. */
  readonly flows: readonly string[];
  readonly capabilities: readonly Capability[];
  readonly dependsOn: readonly { readonly code: ModuleCode; readonly kind: DependencyKind }[];
  readonly parts: readonly ModulePart[];
  /** PLT only — the platform cannot be switched off, or nobody could switch it back on. */
  readonly alwaysOn?: true;
}

const name = (code: ModuleCode) => `modules.name.${code}`;
const desc = (code: ModuleCode) => `modules.description.${code}`;
const part = (id: string, verbs: readonly string[], routes: readonly string[] = []): ModulePart => ({
  id,
  nameKey: `modules.part.${id}`,
  verbs,
  routes,
});

/** Every transition id of the named flows — a part that governs a whole flow. */
const verbsOf = (...entities: string[]): string[] =>
  getKnownFlows()
    .filter((f) => entities.includes(f.entity))
    .flatMap((f) => f.transitions.map((t) => t.id));

const hard = (code: ModuleCode) => ({ code, kind: 'hard' as const });
const soft = (code: ModuleCode) => ({ code, kind: 'soft' as const });

/**
 * The registry. Built by a function rather than a literal because two parts
 * govern WHOLE flows, and a whole flow's verbs are read from the flow registry
 * rather than copied here — a copied list decays the day a verb is added.
 */
function buildModules(): readonly ModuleSpec[] {
  return Object.freeze([
    {
      code: 'PLT', nameKey: name('PLT'), descriptionKey: desc('PLT'), scope: 'cross-cutting', alwaysOn: true,
      routes: ['/login', '/buyer/dashboard', '/supplier/dashboard', '/buyer/roles', '/buyer/roles/:roleId',
        '/buyer/process-flows', '/glossary', '/', '*',
        // M2 · Design 5 §A.5 — the roadmap board and the admin page. In PLT, so
        // the page that switches modules can never be switched off itself.
        '/buyer/platform/modules', '/buyer/platform/modules/admin'],
      flows: ['role', 'moduleActivation'],
      capabilities: ['identity', 'dashboard'], dependsOn: [], parts: [],
    },
    {
      code: 'SUP', nameKey: name('SUP'), descriptionKey: desc('SUP'), scope: 'cross-cutting',
      routes: ['/buyer/suppliers', '/buyer/suppliers/:id', '/buyer/discovery', '/marketplace',
        '/marketplace/supplier/:id', '/buyer/supplier-applications', '/register', '/supplier/storefront'],
      flows: ['supplierApplication'],
      capabilities: ['suppliers', 'supplierDiscovery', 'supplierApplications', 'supplierRegistration'],
      dependsOn: [],
      parts: [
        part('applications', verbsOf('supplierApplication'), ['/buyer/supplier-applications']),
        part('discovery', [], ['/buyer/discovery', '/marketplace', '/marketplace/supplier/:id']),
        part('selfRegistration', [], ['/register']),
      ],
    },
    {
      code: 'CMP', nameKey: name('CMP'), descriptionKey: desc('CMP'), scope: 'cross-cutting',
      routes: ['/buyer/compliance', '/supplier/documents'],
      flows: ['supplierDocument', 'compliance', 'materialRuling'],
      capabilities: ['compliance', 'supplierDocuments'],
      dependsOn: [hard('SUP')],
      parts: [
        part('buyerRequests', ['t_supplierdoc_request', 't_supplierdoc_verify', 't_supplierdoc_reject']),
        part('supplierUploads', ['t_supplierdoc_declare', 't_supplierdoc_submit']),
      ],
    },
    {
      code: 'PSL', nameKey: name('PSL'), descriptionKey: desc('PSL'), scope: 'buyer',
      routes: ['/buyer/preferred-suppliers'],
      flows: ['psl', 'pslCapSetting'],
      capabilities: ['psl'],
      dependsOn: [hard('SUP')], parts: [],
    },
    {
      code: 'MAT', nameKey: name('MAT'), descriptionKey: desc('MAT'), scope: 'buyer',
      routes: ['/buyer/material-requests'],
      flows: ['materialRequest'],
      capabilities: ['materialRequests'],
      dependsOn: [], parts: [],
    },
    {
      code: 'REQ', nameKey: name('REQ'), descriptionKey: desc('REQ'), scope: 'buyer',
      routes: ['/buyer/purchase-requisition'],
      flows: ['purchaseRequisition'],
      capabilities: ['purchaseRequisitions'],
      dependsOn: [], parts: [],
    },
    {
      code: 'PLN', nameKey: name('PLN'), descriptionKey: desc('PLN'), scope: 'buyer',
      routes: ['/buyer/intake-review', '/buyer/plan-grid'],
      flows: ['intakeLine'],
      capabilities: ['somoPlanParameters'],
      dependsOn: [hard('REQ'), hard('SUP')], parts: [],
    },
    {
      code: 'SDC', nameKey: name('SDC'), descriptionKey: desc('SDC'), scope: 'cross-cutting',
      routes: ['/buyer/collaboration', '/buyer/inventory', '/buyer/chase', '/supplier/forecasts', '/supplier/inventory'],
      flows: ['requirementResponse', 'inventoryDeclaration', 'incomingShipment', 'forecastPublication'],
      capabilities: ['forecastPublications', 'inventory'],
      dependsOn: [hard('SUP'), hard('PLN')],
      parts: [
        part('confirmations', verbsOf('requirementResponse')),
        part('stockOnHand', verbsOf('inventoryDeclaration')),
        part('incomingShipments', verbsOf('incomingShipment')),
        part('chase', [], ['/buyer/chase']),
      ],
    },
    {
      code: 'COM', nameKey: name('COM'), descriptionKey: desc('COM'), scope: 'cross-cutting',
      routes: ['/buyer/comm-hub', '/supplier/comm-hub', '/supplier/whatsapp'],
      flows: [],
      capabilities: ['messaging'],
      dependsOn: [hard('SDC')],
      parts: [part('whatsapp', [], ['/supplier/whatsapp'])],
    },
    {
      code: 'SRC', nameKey: name('SRC'), descriptionKey: desc('SRC'), scope: 'cross-cutting',
      routes: ['/buyer/sourcing', '/supplier/rfqs'],
      flows: ['rfq', 'quotation', 'stageResponse'],
      capabilities: ['rfqs'],
      dependsOn: [hard('SUP'), soft('PSL'), soft('REQ'), soft('MAT')],
      parts: [part('fxPin', ['t_rfq_fx_pin'])],
    },
    {
      code: 'CTR', nameKey: name('CTR'), descriptionKey: desc('CTR'), scope: 'cross-cutting',
      routes: ['/buyer/contracts', '/buyer/contracts/:id', '/buyer/delivery-agreements', '/supplier/delivery-agreements'],
      flows: ['deliveryRelease', 'deliveryPolicy', 'contract', 'obligation'],
      capabilities: ['contracts', 'deliveryAgreements'],
      dependsOn: [hard('SUP'), soft('SRC')],
      parts: [
        part('deliveryReleases', ['t_delivery_release', 't_delivery_adjust', 't_delivery_confirm']),
        part('drawdownPolicy', ['t_delivery_policy_set']),
      ],
    },
    {
      code: 'ORD', nameKey: name('ORD'), descriptionKey: desc('ORD'), scope: 'cross-cutting',
      routes: ['/buyer/orders', '/supplier/orders'],
      flows: ['purchaseOrder'],
      capabilities: ['purchaseOrders'],
      dependsOn: [hard('SUP')], parts: [],
    },
    {
      code: 'SHP', nameKey: name('SHP'), descriptionKey: desc('SHP'), scope: 'cross-cutting',
      routes: ['/buyer/shipments', '/supplier/shipments'],
      flows: ['advanceShipNotice', 'shipment'],
      capabilities: ['advanceShipNotices', 'shipments'],
      dependsOn: [hard('ORD')], parts: [],
    },
    {
      code: 'GRC', nameKey: name('GRC'), descriptionKey: desc('GRC'), scope: 'buyer',
      routes: ['/buyer/goods-receipt'],
      flows: ['goodsReceipt', 'goodsReceiptLine', 'enforcement'],
      capabilities: ['goodsReceipts'],
      dependsOn: [hard('SHP'), soft('CMP')],
      parts: [
        part('inspectionWizard', ['t_gr_create', 't_gr_start_inspection', 't_gr_record_inspection', 't_gr_approve', 't_gr_partial_approve', 't_gr_reject', 't_gr_post']),
        part('qualityHold', ['t_gr_hold', 't_gr_request_retest']),
      ],
    },
    {
      code: 'INV', nameKey: name('INV'), descriptionKey: desc('INV'), scope: 'cross-cutting',
      routes: ['/buyer/invoices', '/supplier/invoices'],
      flows: ['invoice', 'invoiceMatch'],
      capabilities: ['invoices'],
      dependsOn: [hard('ORD'), hard('GRC')],
      parts: [
        part('disputes', ['t_invoice_dispute', 't_invoice_resolve']),
        part('paymentRelease', ['t_invoice_release_payment']),
      ],
    },
    {
      code: 'INT', nameKey: name('INT'), descriptionKey: desc('INT'), scope: 'cross-cutting',
      routes: ['/buyer/analytics', '/buyer/scorecard', '/buyer/risk', '/supplier/performance'],
      flows: [],
      capabilities: ['analytics', 'scorecards', 'risk', 'commodityIntel'],
      dependsOn: [soft('ORD'), soft('INV'), soft('GRC'), soft('SDC')], parts: [],
    },
  ] satisfies ModuleSpec[]);
}

let built: readonly ModuleSpec[] | null = null;

/**
 * Every module spec. Built on first read, AFTER the shipped flows have
 * registered — the two whole-flow parts read the flow registry, and a registry
 * read at import time would see it empty (`EMPTY-INPUT-REPORTS-CLEAN-01`).
 */
export function getModules(): readonly ModuleSpec[] {
  if (built !== null) return built;
  const modules = buildModules();
  // Cached only once the flows are in: a build against an empty registry would
  // freeze two parts with no verbs, and a part governing nothing reads as ON.
  if (getKnownFlows().length > 0) built = modules;
  return modules;
}

export function getModule(code: ModuleCode): ModuleSpec {
  const m = getModules().find((s) => s.code === code);
  if (!m) throw new Error(`unknown module ${code}`);
  return m;
}

export const isModuleCode = (v: unknown): v is ModuleCode =>
  typeof v === 'string' && (MODULE_CODES as readonly string[]).includes(v);

export const isSideId = (v: unknown): v is SideId =>
  typeof v === 'string' && (MODULE_SIDES as readonly string[]).includes(v);

/** The module that owns a flow entity, or null (an unassigned flow — the bilateral test's red). */
export function moduleOfFlow(entity: string): ModuleCode | null {
  return getModules().find((m) => m.flows.includes(entity))?.code ?? null;
}

/** The flow entity that owns a transition id — read from the registry, never copied. */
function entityOfTransition(transitionId: string): string | null {
  for (const f of getKnownFlows()) if (f.transitions.some((t) => t.id === transitionId)) return f.entity;
  return null;
}

/**
 * `moduleOf(transitionId)` — the module a verb belongs to, and the part that
 * governs it (null when the module governs it directly). Derived from
 * `ModuleSpec.flows` and the flow registry; nothing is listed twice.
 */
export function moduleOf(transitionId: string): { code: ModuleCode; part: string | null } | null {
  const entity = entityOfTransition(transitionId);
  if (entity === null) return null;
  const code = moduleOfFlow(entity);
  if (code === null) return null;
  const p = getModule(code).parts.find((x) => x.verbs.includes(transitionId));
  return { code, part: p?.id ?? null };
}

/** The module that owns an exact router path, and the part governing it. */
export function moduleOfRoute(path: string): { code: ModuleCode; part: string | null } | null {
  const m = getModules().find((s) => s.routes.includes(path));
  if (!m) return null;
  const p = m.parts.find((x) => x.routes.includes(path));
  return { code: m.code, part: p?.id ?? null };
}

/** The side a route belongs to, by its persona prefix; neutral routes belong to none. */
export function sideOfRoute(path: string): SideId | null {
  if (path.startsWith('/supplier/')) return 'side:supplier';
  if (path.startsWith('/buyer/')) return 'side:buyer';
  return null;
}

export const sideOfPersona = (persona: PersonaType): SideId =>
  persona === 'supplier' ? 'side:supplier' : 'side:buyer';

export const sideOfScope = (scope: QueryScope): SideId => sideOfPersona(scope.personaType);

/**
 * The modules that HARD-depend on `code` — the ones that must be OFF before it
 * may go off (§A.3). Soft dependants degrade honestly and do not block.
 */
export function hardDependantsOf(code: ModuleCode): readonly ModuleCode[] {
  return getModules()
    .filter((m) => m.dependsOn.some((d) => d.code === code && d.kind === 'hard'))
    .map((m) => m.code);
}

/** The modules `code` HARD-depends on — every one must be ON before it may go on. */
export function hardDependenciesOf(code: ModuleCode): readonly ModuleCode[] {
  return getModule(code).dependsOn.filter((d) => d.kind === 'hard').map((d) => d.code);
}

/**
 * Every (module, part) an ATOM's verbs sit in, one entry per distinct pair —
 * for the surface's availability question. An atom is placed by the verbs that
 * require it, and it MAY serve more than one place: `gr:inspect` serves GRC's
 * inspection wizard, its quality hold and GRC itself. (`pr:create` served TWO
 * MODULES — REQ and the intake commit's PLN — until PLN-3 put the intake verbs
 * on the planning lane's own `intake:triage`.) The surface treats such an
 * atom as off only when EVERY place it serves is off (`atomOffReason`); the
 * dispatcher, which knows the exact verb, stays the authority per act.
 */
export function modulesOfAtom(atom: string): readonly { code: ModuleCode; part: string | null }[] {
  const hits = new Map<string, { code: ModuleCode; part: string | null }>();
  for (const f of getKnownFlows()) {
    for (const t of f.transitions) {
      if (t.requiredRole !== atom) continue;
      const m = moduleOf(t.id);
      if (m) hits.set(`${m.code}.${m.part ?? ''}`, m);
    }
  }
  return [...hits.values()];
}
