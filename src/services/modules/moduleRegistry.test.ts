// ────────────────────────────────────────────────────────────────────────────
// M1 · THE MODULE REGISTRY, HELD BOTH WAYS (Design 5 §A.6).
//
// Every population here is DERIVED from something upstream of the registry —
// the router SOURCE, `getKnownFlows()`, `ALL_CAPABILITIES`, the i18n resources —
// never from the registry's own tables (`ROUTE-SMOKE-GUARD-IS-SELF-REFERENTIAL-01`:
// a guard that reads only its own table cannot see the tree drift away from it).
// Each derivation carries a membership control first, so an empty population
// can never read as a clean one.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getKnownFlows } from '../transitions';
import { ALL_CAPABILITIES } from '../liveness/registry';
import { resources } from '../../lib/i18n';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import {
  MODULE_CODES,
  MODULE_PHASES,
  getModules,
  moduleOf,
  modulesOfAtom,
  moduleOfRoute,
  type ModuleCode,
  type ModuleSpec,
} from './registry';

const ROUTER = join(process.cwd(), 'src', 'router', 'AppRouter.tsx');
const routerSrc = stripSourceComments(readFileSync(ROUTER, 'utf8'), 'delete');

/** Every `<Route path="…">` in the router SOURCE. */
const ROUTER_PATHS = [...routerSrc.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

/** Every flow entity the registry knows. */
const FLOW_ENTITIES = getKnownFlows().map((f) => f.entity);

/** Items appearing in more than one module's list — the "assigned twice" red. */
const claimedTwice = (pick: (m: ModuleSpec) => readonly string[]): string[] => {
  const seen = new Map<string, ModuleCode[]>();
  for (const m of getModules()) for (const x of pick(m)) seen.set(x, [...(seen.get(x) ?? []), m.code]);
  return [...seen].filter(([, codes]) => codes.length > 1).map(([x, codes]) => `${x}:${codes.join('+')}`);
};

/**
 * The first cycle in a dependency graph, or null. Exported through the spec's
 * own probes rather than the registry: it exists to be fired at a known-bad
 * graph as well as the real one.
 */
function findCycle(modules: readonly Pick<ModuleSpec, 'code' | 'dependsOn'>[]): string[] | null {
  const deps = new Map(modules.map((m) => [m.code, m.dependsOn.map((d) => d.code)]));
  const state = new Map<string, 'visiting' | 'done'>();
  const walk = (code: string, path: string[]): string[] | null => {
    if (state.get(code) === 'done') return null;
    if (state.get(code) === 'visiting') return [...path.slice(path.indexOf(code)), code];
    state.set(code, 'visiting');
    for (const d of deps.get(code as ModuleCode) ?? []) {
      const c = walk(d, [...path, code]);
      if (c) return c;
    }
    state.set(code, 'done');
    return null;
  };
  for (const m of modules) {
    const c = walk(m.code, []);
    if (c) return c;
  }
  return null;
}

describe('the populations are real — membership controls first', () => {
  it('the router derivation sees known routes, and a route the router lacks is absent', () => {
    expect(ROUTER_PATHS).toContain('/supplier/shipments');
    expect(ROUTER_PATHS).toContain('/buyer/plan-grid'); // a multi-line (Suspense) route
    expect(ROUTER_PATHS).toContain('*');
    expect(ROUTER_PATHS).toContain('/buyer/platform/modules/admin'); // M2's admin page
    expect(ROUTER_PATHS).not.toContain('/buyer/platform/modules/nope'); // a path the router lacks
  });

  it('the flow derivation sees the new machine and an old one', () => {
    expect(FLOW_ENTITIES).toContain('moduleActivation');
    expect(FLOW_ENTITIES).toContain('purchaseOrder');
  });

  it('every code the union declares has exactly one spec, and PLT alone is always on', () => {
    // Ruled 2026-10-01: the table's fifteen switchable modules + PLT is the
    // count (the design's prose miscounted). It is derived here from the union
    // rather than restated (FLOOR-IN-PROSE-01).
    expect(getModules().map((m) => m.code)).toEqual([...MODULE_CODES]);
    expect(getModules().filter((m) => m.alwaysOn).map((m) => m.code)).toEqual(['PLT']);
  });
});

describe('route ↔ module — bilateral', () => {
  it('every router path is in EXACTLY one module', () => {
    const unassigned = ROUTER_PATHS.filter((p) => !getModules().some((m) => m.routes.includes(p)));
    expect(unassigned, 'a route in no module').toEqual([]);
    expect(claimedTwice((m) => m.routes), 'a route in two modules').toEqual([]);
  });

  it('every registry route is a router path — a route the router lacks is red', () => {
    const phantom = getModules().flatMap((m) => m.routes).filter((p) => !ROUTER_PATHS.includes(p));
    expect(phantom).toEqual([]);
  });

  it('known placements', () => {
    expect(moduleOfRoute('/supplier/shipments')).toEqual({ code: 'SHP', part: null });
    expect(moduleOfRoute('/buyer/chase')).toEqual({ code: 'SDC', part: 'chase' });
    expect(moduleOfRoute('/buyer/dashboard')?.code).toBe('PLT');
    expect(moduleOfRoute('/nowhere')).toBeNull();
  });

  it('every route except the redirect and the 404 sits in a ModuleGate naming ITS OWN path', () => {
    // Derived from the source: the element of each <Route> must open with
    // `<ModuleGate path="<the same path>">`. A gate naming another route's path
    // would read the wrong module's switch.
    const routes = [...routerSrc.matchAll(/<Route\s+path="([^"]+)"\s+element=\{\s*(<[A-Za-z]+(?:\s+path="([^"]*)")?)/g)];
    expect(routes.length).toBe(ROUTER_PATHS.length);
    const wrong = routes
      // PLN-3 · a redirect is excluded by its ELEMENT, not by a path list:
      // `/buyer/intake-review` became one (into the Plan Grid's intake-review
      // view) and `/` always was — a redirect paints no gated page.
      .filter(([, path, open]) => path !== '*' && !open.startsWith('<Navigate'))
      .filter(([, path, open, gatePath]) => !open.startsWith('<ModuleGate') || gatePath !== path)
      .map(([, path]) => path);
    expect(wrong).toEqual([]);
    // The redirects the element filter excludes, by name — and only those.
    expect(routes.filter(([, , open]) => open.startsWith('<Navigate')).map(([, path]) => path).sort()).toEqual(['/', '/buyer/intake-review']);
    // KNOWN-BAD twin: the same matcher over a synthetic route whose gate names
    // a different path must report it.
    const bad = '<Route path="/a" element={<ModuleGate path="/b"><A /></ModuleGate>} />';
    const [m] = [...bad.matchAll(/<Route\s+path="([^"]+)"\s+element=\{\s*(<[A-Za-z]+(?:\s+path="([^"]*)")?)/g)];
    expect(m[3]).not.toBe(m[1]);
  });

  it('a buyer-scoped module owns no supplier route', () => {
    const leaks = getModules()
      .filter((m) => m.scope === 'buyer')
      .flatMap((m) => m.routes.filter((r) => r.startsWith('/supplier/')).map((r) => `${m.code}:${r}`));
    expect(leaks).toEqual([]);
  });
});

describe('flow ↔ module — bilateral', () => {
  it('every registered flow is in EXACTLY one module', () => {
    const unassigned = FLOW_ENTITIES.filter((e) => !getModules().some((m) => m.flows.includes(e)));
    expect(unassigned, 'a flow in no module').toEqual([]);
    expect(claimedTwice((m) => m.flows), 'a flow in two modules').toEqual([]);
  });

  it('every registry flow is a registered flow', () => {
    const phantom = getModules().flatMap((m) => m.flows).filter((e) => !FLOW_ENTITIES.includes(e));
    expect(phantom).toEqual([]);
  });

  it('every transition resolves to a module, and the governance verb to PLT', () => {
    const orphans = getKnownFlows().flatMap((f) => f.transitions).filter((t) => moduleOf(t.id) === null).map((t) => t.id);
    expect(orphans).toEqual([]);
    expect(moduleOf('t_module_set')).toEqual({ code: 'PLT', part: null });
    expect(moduleOf('t_asn_submit')).toEqual({ code: 'SHP', part: null });
    expect(moduleOf('t_gr_hold')).toEqual({ code: 'GRC', part: 'qualityHold' });
    expect(moduleOf('t_nope')).toBeNull();
  });

  it('every atom is placed somewhere, and the atoms that serve TWO modules are named, not assumed away', () => {
    const atoms = [...new Set(getKnownFlows().flatMap((f) => f.transitions.map((t) => t.requiredRole)))];
    expect(atoms.filter((a) => modulesOfAtom(a).length === 0)).toEqual([]);
    expect(modulesOfAtom('asn:create')).toEqual([{ code: 'SHP', part: null }]);
    expect(modulesOfAtom('module:set')).toEqual([{ code: 'PLT', part: null }]);
    // Derived, and pinned by NAME. ⚠️ PLN-3 (R1): it was `['pr:create']` — the
    // intake commit (PLN) and `t_pr_create` (REQ) shared that atom. The intake
    // verbs hold `intake:triage` now, so NO atom spans two modules, and each of
    // the two is placed in its own.
    const spanning = atoms.filter((a) => new Set(modulesOfAtom(a).map((m) => m.code)).size > 1).sort();
    expect(spanning).toEqual([]);
    expect(modulesOfAtom('pr:create').map((m) => m.code).sort()).toEqual(['REQ']);
    expect(modulesOfAtom('intake:triage').map((m) => m.code).sort()).toEqual(['PLN']);
    // Anti-vacuity: the derivation still sees an atom serving SEVERAL places —
    // within one module — so the empty list above is the tree, not the matcher.
    expect(modulesOfAtom('gr:inspect').length).toBeGreaterThan(1);
  });
});

describe('the dependency graph', () => {
  it('is ACYCLIC — and the detector is fired at a known cycle first', () => {
    const cyclic = [
      { code: 'ORD' as ModuleCode, dependsOn: [{ code: 'SHP' as ModuleCode, kind: 'hard' as const }] },
      { code: 'SHP' as ModuleCode, dependsOn: [{ code: 'ORD' as ModuleCode, kind: 'hard' as const }] },
    ];
    expect(findCycle(cyclic)).toEqual(['ORD', 'SHP', 'ORD']);
    expect(findCycle(getModules())).toBeNull();
  });

  it('PLT has no dependencies, and every edge names a registered code other than itself', () => {
    expect(getModules().find((m) => m.code === 'PLT')!.dependsOn).toEqual([]);
    const bad = getModules().flatMap((m) =>
      m.dependsOn
        .filter((d) => !(MODULE_CODES as readonly string[]).includes(d.code) || d.code === m.code || d.code === 'PLT')
        .map((d) => `${m.code}->${d.code}`),
    );
    expect(bad).toEqual([]);
  });

  it('the design’s named hard edges are hard', () => {
    const hard = (a: ModuleCode, b: ModuleCode) =>
      getModules().find((m) => m.code === a)!.dependsOn.some((d) => d.code === b && d.kind === 'hard');
    expect(hard('INV', 'ORD')).toBe(true);
    expect(hard('SHP', 'ORD')).toBe(true);
    expect(hard('GRC', 'SHP')).toBe(true);
    expect(hard('PLN', 'REQ')).toBe(true);
    expect(hard('COM', 'SDC')).toBe(true);
    // …and the named soft ones are soft.
    expect(hard('SRC', 'PSL')).toBe(false);
    expect(getModules().find((m) => m.code === 'INT')!.dependsOn.every((d) => d.kind === 'soft')).toBe(true);
  });
});

describe('parts', () => {
  it('every part verb is a transition of ITS OWN module, and every part route is its module’s', () => {
    const wrong: string[] = [];
    for (const m of getModules()) {
      for (const p of m.parts) {
        for (const v of p.verbs) if (moduleOf(v)?.code !== m.code) wrong.push(`${m.code}.${p.id}:${v}`);
        for (const r of p.routes) if (!m.routes.includes(r)) wrong.push(`${m.code}.${p.id}:${r}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('every part governs SOMETHING — a verb or a route (a toggle no code enforces is refused)', () => {
    const empty = getModules().flatMap((m) =>
      m.parts.filter((p) => p.verbs.length === 0 && p.routes.length === 0).map((p) => `${m.code}.${p.id}`),
    );
    expect(empty).toEqual([]);
  });

  it('no verb sits in two parts', () => {
    const verbs = getModules().flatMap((m) => m.parts.flatMap((p) => p.verbs));
    expect(verbs.length).toBe(new Set(verbs).size);
  });

  it('a whole-flow part reads its verbs from the registry, not a copy', () => {
    const rr = getKnownFlows().find((f) => f.entity === 'requirementResponse')!.transitions.map((t) => t.id);
    const sdc = getModules().find((m) => m.code === 'SDC')!;
    expect(sdc.parts.find((p) => p.id === 'confirmations')!.verbs).toEqual(rr);
  });
});

describe('capability ↔ module — bilateral', () => {
  it('every liveness capability is claimed by EXACTLY one module', () => {
    const unclaimed = ALL_CAPABILITIES.filter((c) => !getModules().some((m) => m.capabilities.includes(c)));
    expect(unclaimed).toEqual([]);
    expect(claimedTwice((m) => m.capabilities)).toEqual([]);
    expect(ALL_CAPABILITIES).toContain('advanceShipNotices'); // membership control
  });
});

describe('every key the registry names exists in BOTH locales', () => {
  const en = resources.en.translation as Record<string, string>;
  const id = resources.id.translation as Record<string, string>;
  const keys = [
    ...getModules().flatMap((m) => [m.nameKey, m.descriptionKey, ...m.parts.map((p) => p.nameKey)]),
    ...MODULE_PHASES.map((p) => `modules.phase.${p}`),
    'modules.side.buyer', 'modules.side.supplier',
    'modules.off.moduleTitle', 'modules.off.partTitle', 'modules.off.sideTitle',
    'modules.off.phase', 'modules.off.body', 'modules.off.inline', 'modules.off.inlineHint',
  ];

  it('EN and ID', () => {
    expect(keys.length).toBeGreaterThan(40);
    expect(keys.filter((k) => !en[k])).toEqual([]);
    expect(keys.filter((k) => !id[k])).toEqual([]);
  });

  it('a divergent token proves the ID copy is not the EN copy', () => {
    expect(en['modules.name.SHP']).toBe('Shipments & ASN');
    expect(id['modules.name.SHP']).toBe('Pengiriman & ASN');
  });
});
