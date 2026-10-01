// ────────────────────────────────────────────────────────────────────────────
// M2 · OPERATOR RULING 1 (2026-10-01), PINNED — NO MODULE PART REACHES A
// GOVERNED COMPLIANCE CHECK.
//
//   > The sub-toggles "Halal certificate notice" (GRC) and "Sourcing gates"
//   > (SRC) are NOT module parts: switching off a compliance check is never a
//   > module decision; it stays governed only by the enforcement ledger.
//
// A part is a switch. If any part's verbs or routes included a compliance check,
// switching the part off would remove the check through a door the enforcement
// ledger does not watch. So the set of check VERBS and check ROUTES is derived
// here, and every part is asserted disjoint from it.
//
// ── THE DERIVATION ──────────────────────────────────────────────────────────
//   · THE CHECKS. The governed vocabulary is `GOVERNED_CHECK_IDS` (read from
//     `lib/enforcement`). Their EVALUATORS are the functions that answer a check;
//     the seed below names them, and each is asserted to be an `export function`
//     in source, so a renamed or deleted evaluator is red rather than silently
//     dropping out of the seed. `decideSourcing` is in it because the ruling
//     names the PSL publish gates as a compliance check.
//   · CHECK VERBS = (a) every transition of a flow whose wired target ANSWERS
//     for a governed check id (`readState(checkId) !== null` — the target's own
//     contract, upstream of anything probed here), and (b) every transition
//     whose policy hooks include a hook whose bound body calls an evaluator
//     (the bodies are read from every source file that binds a hook).
//   · CHECK ROUTES = every router path whose page reaches, through its
//     surface-layer value imports (`pages-v2`, `components`, `hooks`), a file
//     that calls an evaluator or spells a governed check id.
//
// Membership controls come first: the known check verbs and routes must be IN
// the derived sets and a known non-check must be OUT, so an empty or a runaway
// derivation cannot read as a clean pin.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { getKnownFlows, POLICY_HOOKS } from '../transitions';
import { GOVERNED_CHECK_IDS } from '../../lib/enforcement';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { WIRED_COMMAND_TARGETS, commandTargetFor } from '../data/mock/MockCommandService';
import { getModules, type ModuleSpec } from './registry';

const SRC = join(process.cwd(), 'src');
const read = (f: string) => stripSourceComments(readFileSync(f, 'utf8'), 'delete');

/** Every non-test source file under a directory. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const ALL_SOURCE = sourceFiles(SRC);

/**
 * The evaluators — the functions that ANSWER a compliance check. A seed, named
 * because the ruling names the checks; each is held to its definition below.
 */
const EVALUATORS = ['verifyHalalAtReceipt', 'halalOf', 'bpomOf', 'decideSourcing'] as const;

const callsEvaluator = (text: string) => EVALUATORS.some((e) => new RegExp(`\\b${e}\\s*\\(`).test(text));
const spellsCheckId = (text: string) => GOVERNED_CHECK_IDS.some((id) => text.includes(`'${id}'`));

// ── CHECK VERBS ─────────────────────────────────────────────────────────────

/** Hook name → its bound body, from every file that binds one. */
function hookBodies(): Map<string, string> {
  const bodies = new Map<string, string>();
  for (const f of ALL_SOURCE) {
    const text = read(f);
    const sites = [...text.matchAll(/bindPolicyHook\(\s*POLICY_HOOKS\.(\w+)/g)];
    sites.forEach((m, i) => {
      const end = i + 1 < sites.length ? sites[i + 1].index! : text.length;
      bodies.set(m[1], (bodies.get(m[1]) ?? '') + text.slice(m.index!, end));
    });
  }
  return bodies;
}
const HOOK_BODIES = hookBodies();
const CHECK_HOOKS = [...HOOK_BODIES].filter(([, body]) => callsEvaluator(body)).map(([h]) => h);
/** The same hooks by the VALUE a flow lists (`POLICY_HOOKS.X` → its name string). */
const CHECK_HOOK_NAMES: readonly string[] = CHECK_HOOKS.map((k) => (POLICY_HOOKS as Record<string, string>)[k]);

const CHECK_GOVERNING_FLOWS = WIRED_COMMAND_TARGETS.filter((entity) =>
  GOVERNED_CHECK_IDS.some((id) => commandTargetFor(entity)?.readState(id) != null),
);

const CHECK_VERBS = new Set(
  getKnownFlows().flatMap((f) =>
    f.transitions
      .filter(
        (t) =>
          CHECK_GOVERNING_FLOWS.includes(f.entity) ||
          (t.policyHooks ?? []).some((h) => CHECK_HOOK_NAMES.includes(h)),
      )
      .map((t) => t.id),
  ),
);

// ── CHECK ROUTES ────────────────────────────────────────────────────────────

const SURFACE_DIRS = ['pages-v2', 'components', 'hooks'].map((d) => join(SRC, d) + sep);
const inSurface = (f: string) => SURFACE_DIRS.some((d) => f.startsWith(d));

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Value imports only — `import type` loads nothing at runtime. */
function importsOf(file: string): string[] {
  const text = read(file);
  const specs = [
    ...[...text.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^'"]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
    ...[...text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
  ];
  return specs.map((s) => resolveImport(file, s)).filter((x): x is string => x !== null);
}

/** The surface-layer closure of a page: it stops at the service seam. */
function surfaceClosure(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f) || !inSurface(f)) continue;
    seen.add(f);
    stack.push(...importsOf(f));
  }
  return seen;
}

const CHECK_SITES = new Set(ALL_SOURCE.filter((f) => inSurface(f) && (callsEvaluator(read(f)) || spellsCheckId(read(f)))));

const ROUTER = join(SRC, 'router', 'AppRouter.tsx');
const routerSrc = read(ROUTER);

/** Router path → the page file it mounts (the first component inside its ModuleGate). */
function pageOfRoute(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of routerSrc.matchAll(/<ModuleGate path="([^"]+)">([\s\S]*?)<\/ModuleGate>/g)) {
    const comp = [...m[2].matchAll(/<([A-Z]\w*)/g)].map((x) => x[1]).find((c) => c !== 'Suspense');
    if (!comp) continue;
    const imp =
      routerSrc.match(new RegExp(`import\\s+${comp}\\s+from\\s+'([^']+)'`)) ??
      routerSrc.match(new RegExp(`const\\s+${comp}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\('([^']+)'\\)`));
    const file = imp ? resolveImport(ROUTER, imp[1]) : null;
    if (file) out.set(m[1], file);
  }
  return out;
}
const PAGES = pageOfRoute();

const CHECK_ROUTES = new Set(
  [...PAGES].filter(([, file]) => [...surfaceClosure(file)].some((f) => CHECK_SITES.has(f))).map(([p]) => p),
);

const rel = (f: string) => relative(SRC, f).split(sep).join('/');

/** Every (module.part → check verb/route) a part reaches. Empty is the ruling. */
function partsReachingChecks(modules: readonly ModuleSpec[]): string[] {
  return modules.flatMap((m) =>
    m.parts.flatMap((p) => [
      ...p.verbs.filter((v) => CHECK_VERBS.has(v)).map((v) => `${m.code}.${p.id} → verb ${v}`),
      ...p.routes.filter((r) => CHECK_ROUTES.has(r)).map((r) => `${m.code}.${p.id} → route ${r}`),
    ]),
  );
}

describe('ruling 1 — the derived compliance-check set is real (controls first)', () => {
  it('every evaluator in the seed is an exported function in source', () => {
    for (const e of EVALUATORS) {
      const definers = ALL_SOURCE.filter((f) => new RegExp(`export function ${e}\\s*[<(]`).test(read(f)));
      expect(definers.length, `${e} is defined once`).toBe(1);
    }
    // …and the detector rejects a name nobody defines.
    expect(ALL_SOURCE.some((f) => /export function verifyKosherAtReceipt\s*[<(]/.test(read(f)))).toBe(false);
  });

  it('the check VERBS hold the PSL publish gate and the enforcement verb, and not a plain GR verb', () => {
    expect(CHECK_HOOKS).toEqual(expect.arrayContaining(['RFQ_PUBLISH_INVITEES_ELIGIBLE', 'RFQ_PUBLISH_COMPETITION']));
    expect(CHECK_GOVERNING_FLOWS).toEqual(['enforcement']);
    expect(CHECK_VERBS).toContain('t_rfq_publish');
    expect(CHECK_VERBS).toContain('t_enforcement_set');
    expect(CHECK_VERBS).not.toContain('t_gr_hold');
    expect(CHECK_VERBS).not.toContain('t_module_set');
  });

  it('the check ROUTES hold the receipt wizard and sourcing, and not a page with no check', () => {
    expect([...CHECK_SITES].map(rel)).toEqual(
      expect.arrayContaining(['components/v2-features/GRInspectionWizard.tsx', 'pages-v2/BuyerSourcing.tsx']),
    );
    // A file that only NAMES an evaluator in a comment is not a check site.
    expect([...CHECK_SITES].map(rel)).not.toContain('components/v2-features/PslGateNotice.tsx');
    expect(PAGES.get('/supplier/whatsapp')).toBeDefined();
    expect(CHECK_ROUTES).toContain('/buyer/goods-receipt');
    expect(CHECK_ROUTES).toContain('/buyer/sourcing');
    expect(CHECK_ROUTES).not.toContain('/supplier/whatsapp');
    expect(CHECK_ROUTES).not.toContain('/buyer/platform/modules/admin');
  });
});

describe('ruling 1 — no part reaches a compliance check', () => {
  it('fires at the two parts the ruling removed (known-bad first)', () => {
    const removed: ModuleSpec[] = getModules().map((m) =>
      m.code === 'SRC'
        ? { ...m, parts: [...m.parts, { id: 'sourcingGates', nameKey: 'x', verbs: ['t_rfq_publish'], routes: [] }] }
        : m.code === 'GRC'
          ? { ...m, parts: [...m.parts, { id: 'halalNotice', nameKey: 'x', verbs: [], routes: ['/buyer/goods-receipt'] }] }
          : m,
    );
    expect(partsReachingChecks(removed)).toEqual([
      'SRC.sourcingGates → verb t_rfq_publish',
      'GRC.halalNotice → route /buyer/goods-receipt',
    ]);
  });

  it('the shipped registry: no part’s verbs or routes include a governed compliance check', () => {
    expect(partsReachingChecks(getModules())).toEqual([]);
  });
});
