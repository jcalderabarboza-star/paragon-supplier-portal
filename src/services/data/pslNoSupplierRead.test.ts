// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ NO SUPPLIER-FACING PSL READ EXISTS. THIS IS THE ASSERTION THAT MAKES P4
// SAFE TO BUILD LATER.
//
// Operator ruling: a listing is INTERNAL until the team deliberately PUBLISHES
// it, and only then may the supplier see its own status. **P1 builds no publish
// verb and no supplier view**, so today the correct number of PSL fields
// reachable from a supplier seat is ZERO — published or not.
//
// ── ⚠️ WHY THE CLAIM IS ABOUT REACHABILITY AND NOT ABOUT A FIELD ───────────
//   A structural check ("`Supplier` carries no PSL field") is true and nearly
//   worthless: the leak this guards against is a supplier PAGE importing the
//   corpus directly, which no field-shape check can see. So the population is
//   the TRANSITIVE IMPORT CLOSURE of every supplier-side surface, and the claim
//   is that no PSL module is in it.
//
//   The closure is walked over source with the shipped `stripSourceComments`,
//   so a PSL module NAMED IN A COMMENT — this header does it repeatedly — can
//   never be mistaken for an import.
//
// ── ⚠️ AND THE SEAM IS DELIBERATELY *NOT* EXEMPT ───────────────────────────
//   `pslSourcingSeam.ts` is buyer-side machinery (a future policy hook on
//   `t_rfq_publish`). If a supplier surface ever reaches it, that is the same
//   leak wearing a different name, so it is in the forbidden set with the rest.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { MockSupplierService } from './mock/MockSupplierService';
import { MockCommandService } from './mock/MockCommandService';
import { rfqStore } from './mock/stores/rfqStore';
import { rfqFlow } from '../transitions/flows/rfq.flow';
import { POLICY_HOOKS } from '../transitions/policyHooks';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { seedPslListings } from './mock/pslSeed';
import { pslStore } from './mock/stores/pslStore';
import type { PslListing } from './pslListing';
import { DataError } from './types';
import type { QueryScope } from './types';
import { pslModules } from '../../test/pslModules';

/**
 * THE CORPUS, GROWN RATHER THAN IMPORTED.
 *
 * ⚠️ **`PSL_LISTINGS` IS GONE AND THIS IS ITS REPLACEMENT** (PSL P3, operator
 * ruling h). The nine rows are no longer `PslListing` literals in a frozen
 * fixture — they are PAYLOADS in `pslSeed.ts`, dispatched through
 * `t_psl_propose` and its siblings under LANE-CORRECT scopes. So the corpus
 * does not exist until the seed has run, which is why this is a FUNCTION and
 * not a const: a module-scope read would capture `[]`.
 *
 * ⚠️ **AND THAT IS THE `EMPTY-INPUT-REPORTS-CLEAN-01` SHAPE, WHICH IS WHY THE
 * SEED'S OWN OUTCOME IS ASSERTED BELOW AND EVERY POPULATION GUARD IN THIS FILE
 * ASSERTS MEMBERSHIP.** "No row is malformed" passes vacuously over `[]`.
 */
const pslRows = (): readonly PslListing[] => pslStore.all();

// ⚠️ SEEDED ONCE, THROUGH THE REAL VERBS. `pslStore.reset()` runs first so the
// file does not depend on whatever order vitest loaded modules in.
beforeAll(async () => {
  pslStore.reset();
  const outcome = await seedPslListings();
  // The seed's own refusal is REPORTED rather than swallowed: a half-seeded
  // store would make every assertion below a different, quieter test.
  expect(outcome.status, outcome.reason ?? '').toBe('seeded');
});


const SRC = resolve(process.cwd(), 'src');

/**
 * Every module the PSL lives in. A supplier surface may reach none of them.
 *
 * ⚠️ **DERIVED FROM THE TREE, NOT LISTED (B-S4d).** The array that stood here
 * named seven paths and asserted ONE direction only — *"every module named here
 * exists"* — so a PSL module that gained no entry was invisible to this guard,
 * forever and silently. It had already happened: P2 shipped `PslGateNotice.tsx`
 * and the list never grew.
 *
 * ⚠️ **AND P3 WOULD HAVE TURNED THAT FROM UNTIDINESS INTO A LEAK.** This
 * guard's own rule is that **a TYPE-ONLY IMPORT IS NOT A REACH** — correctly,
 * since a type is erased — and every store in this tree type-imports its row
 * type. So `pslStore.ts` inherits membership from nothing: on a hand list it
 * would simply have been absent, and a supplier surface value-importing the
 * store would have reached the whole corpus with this file green.
 *
 * Derived, it is a member by its own NAME, so a value import of it is caught
 * directly. `rfqSourcingGate.ts` is not `psl*`-named and is added explicitly,
 * for the reason it was on the old list: it is the P2 gate and a supplier
 * reaching it is the same leak wearing a different name.
 */
/**
 * ⚠️ **FLOW DEFINITIONS ARE EXCLUDED, AND THE RULE IS STATED RATHER THAN THE
 * FILENAMES.** `psl.flow.ts` and `pslCapSetting.flow.ts` are glob members and
 * are NOT part of what this guard protects. A `FlowDefinition` is a declaration
 * — states, transition ids, role atoms, hook NAMES — and **cannot yield a
 * `PslListing`**. Every page that imports the transitions barrel registers all
 * of them already, on both sides, exactly as it has for the other twenty flows
 * since Step 3.1.
 *
 * ⚠️ **AND THE EXCLUSION IS SELF-POLICING RATHER THAN TRUSTED.** A flow file
 * that ever imported the corpus would make this a hole, so the spec below
 * asserts that each excluded file's OWN closure reaches no PSL module. Excluded
 * by a stated property, checked by the property — not by name.
 */
const FLOW_DIR = resolve(process.cwd(), 'src/services/transitions/flows');
const isFlowDefinition = (m: string): boolean => m.startsWith(FLOW_DIR);

const PSL_FLOW_FILES = pslModules().filter(isFlowDefinition);

const PSL_MODULES = [
  ...pslModules().filter((m) => !isFlowDefinition(m)),
  resolve(process.cwd(), 'src/services/data/rfqSourcingGate.ts'),
];

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/**
 * ⚠️ **MEMOISED, AND THE CAUSE IS SYSCALLS RATHER THAN PARSING — WHICH IS WHY
 * `importsOf`'s CACHE DID NOT ALREADY COVER IT.** `importsOf` caches the read
 * and the comment-strip, so each file is parsed once. Nothing cached the
 * RESOLUTION: every edge re-probed the filesystem with up to five `existsSync`
 * calls, on every walk, and `closure` is walked once per (boundary × surface)
 * pair — 3 × 12 in the load-bearing probe alone, plus 12 more in the unbounded
 * one. The same handful of edges was therefore resolved thousands of times.
 *
 * ⚠️ **THE CAUSE IS REMOVED RATHER THAN BUDGETED, WHICH IS THE ORDER #369 SET**
 * when it gave `chaosAmbience` a necessary-condition pre-filter instead of a
 * larger timeout. A budget buys silence; removing the work buys headroom, and
 * only the second one helps the next seat who adds a surface.
 *
 * ⚠️ **AND THE MEMO IS ONLY SOUND BECAUSE THE FILESYSTEM CANNOT MOVE UNDER
 * IT.** `resolveImport` is a pure function of `(fromFile, spec)` for a FIXED
 * tree, so caching it would be a live defect in a suite where a spec wrote
 * files — which is exactly what `treeMutationGate` was built at #369 to forbid.
 * The cache rests on that guard, not on a habit.
 *
 * A cached `null` is a real answer (an unresolvable specifier), so the hit test
 * is `!== undefined`; `if (hit)` would re-probe every unresolved edge forever
 * and quietly give back the cost this exists to remove.
 */
const resolveCache = new Map<string, string | null>();

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const key = `${fromFile}\u0000${spec}`;
  const hit = resolveCache.get(key);
  if (hit !== undefined) return hit;
  const base = resolve(dirname(fromFile), spec);
  let out: string | null = null;
  if (existsSync(base) && /\.(ts|tsx)$/.test(base)) {
    out = base;
  } else {
    for (const e of EXTS) {
      if (existsSync(base + e)) {
        out = base + e;
        break;
      }
    }
  }
  resolveCache.set(key, out);
  return out;
}

/**
 * RELATIVE **RUNTIME** IMPORT SPECIFIERS in one file, comments stripped.
 *
 * ⚠️ **`import type` IS EXCLUDED, AND THE FIRST DRAFT DID NOT EXCLUDE IT —
 * WHICH PRODUCED 22 FALSE ACCUSATIONS ON THE FIRST FULL RUN.** Every supplier
 * surface appeared to "reach" `pslListing.ts` and `pslProjection.ts`, through
 * `GlossaryTermChip` → `lib/glossary` → `governance.glossary.ts`, which imports
 * `PslStatus` / `PslLifecycle` / `PslCapSource` **as types**. A type-only import
 * is ERASED at build: no module is loaded, no value crosses, nothing can leak.
 * Counting it is derivation rule 2 exactly — a widened matcher accusing
 * fully-correct code — and it would have made this guard un-satisfiable without
 * deleting a glossary entry that ought to exist.
 *
 * ⚠️ The exclusion is NARROW: only a statement whose keyword pair is literally
 * `import type` / `export type` is dropped. An INLINE specifier
 * (`import { foo, type Bar } from 'x'`) still loads the module at runtime and is
 * still counted — dropping those would be the opposite error, and the one that
 * hides a real leak.
 */
const importCache = new Map<string, string[]>();

function importsOf(file: string): string[] {
  // ⚠️ MEMOISED, AND IT IS NOT AN OPTIMISATION — IT IS WHAT MAKES THE CLAIM
  // MEASURABLE. Fourteen supplier surfaces share most of their closure, so an
  // unmemoised walk re-reads and re-strips the same hundreds of files and the
  // spec TIMED OUT at 5s. **A timed-out probe never ran its assertion**, and a
  // green suite with this file quietly timing out would be a guard that reports
  // nothing while looking present.
  const hit = importCache.get(file);
  if (hit) return hit;
  const code = stripSourceComments(readFileSync(file, 'utf8'), 'blank', file);
  const out: string[] = [];
  // `import … from 'x'`, `export … from 'x'`, and bare `import 'x'`.
  const re = /(?:^|\n)(\s*(?:import|export)\b[^;'"]*?from\s*)['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (/^\s*(?:import|export)\s+type\b/.test(m[1] ?? '')) continue;
    out.push(m[2] ?? m[3]);
  }
  importCache.set(file, out);
  return out;
}

/**
 * ⚠️ **THE ONE BOUNDARY THE WALK DOES NOT CROSS, AND IT IS NAMED RATHER THAN
 * PATTERNED — PSL P2 (operator ruling pending).**
 *
 * P2 puts the sourcing gate on `t_rfq_publish` / `t_rfq_award` as policy hooks.
 * `policies.ts` is the tree's ONE hook-binding registry: every hook in the
 * platform binds there at import time, and the dispatcher resolves them by name
 * at dispatch time. There is no buyer-only composition point — one dispatcher
 * serves both personas — so **a PSL-reading policy hook and an absolute
 * import-closure claim are mutually exclusive by construction.** Measured, not
 * predicted: wiring the hooks put 12 supplier surfaces × 4 PSL modules = 48
 * edges into this guard's population, every one of them through this file.
 *
 * ⚠️ **WHAT IS LOST AND WHAT REPLACES IT, STATED PLAINLY.** What is lost is the
 * claim that PSL BYTES never enter a supplier surface's module graph. That
 * claim was never the guard's own stated purpose — its header says the leak it
 * exists to catch is *"a supplier PAGE importing the corpus directly"* — and it
 * was never true of the bundle either: this platform ships every fixture to
 * every client and scopes tenancy client-side (CLAUDE.md). What replaces it is
 * STRONGER in the dimension that matters and is asserted below: **no supplier
 * seat can reach either verb at all**, so the hooks that read the PSL can never
 * run for one, and nothing they return carries a listing.
 *
 * The boundary is ONE ABSOLUTE PATH, not a directory or a regex. A second
 * module wanting the same exemption has to be added here by hand, which is the
 * point: an exemption nobody notices is how a guard dies.
 */
const POLICY_BINDINGS = resolve(process.cwd(), 'src/services/transitions/policies.ts');

/**
 * ⚠️ **TWO MORE BOUNDARIES, ADDED AT P3 BECAUSE THE DERIVED POPULATION FOUND
 * THEM — AND FINDING THEM IS WHAT THE DERIVATION WAS FOR.**
 *
 * The hand-written module list could not have surfaced either of these: it did
 * not name `pslStore.ts`, `pslCapSettingStore.ts`, `psl.flow.ts`,
 * `pslCapSetting.flow.ts` or `lib/i18n/psl.ts`, so the closure was never asked
 * about them. The glob asks, and the answer was 60 offending edges — every one
 * of them through exactly TWO files.
 *
 * **MEASURED, not predicted.** The shortest path from `SupplierDashboard.tsx`
 * to the corpus store is:
 *
 *   SupplierDashboard → ProvenanceMarker → services/liveness/index →
 *   services/liveness/registry → mock/MockCommandService → mock/stores/pslStore
 *
 * and to the copy fragment:
 *
 *   SupplierDashboard → OrdersToConfirmWidget → lib/format → lib/i18n →
 *   lib/i18n/psl
 *
 * ── ⚠️ WHY EACH IS A BOUNDARY AND NOT A DEFECT ─────────────────────────────
 *
 * **1. `MockCommandService.ts` — THE ONE COMMAND SERVICE, FOR BOTH PERSONAS.**
 * Every `CommandTarget` in the platform binds there, so it imports every store;
 * `LivenessRegistry` reads its `WIRED_COMMAND_TARGETS` census to decide whether
 * a capability renders SIMULATED or LIVE, and `ProvenanceMarker` renders that
 * on BOTH sides. This is `policies.ts`'s situation verb for verb: **a
 * PSL-writing command target and an absolute import-closure claim are mutually
 * exclusive by construction**, because one dispatcher serves both personas and
 * there is no buyer-only composition point.
 *
 * What replaces the claim is STRONGER in the dimension that matters, and it is
 * asserted below: `pslTarget.readScopeOwner` returns `null`, so **a supplier is
 * refused at SCOPE on every PSL verb** — before any hook runs and before any
 * row is read — and `getPslListings` gates on `personaType` so a supplier scope
 * reads `[]`, published or not.
 *
 * **2. `lib/i18n.ts` — THE ONE TRANSLATION BUNDLE.** Every locale fragment in
 * the platform registers there and every page loads it. `lib/i18n/psl.ts`
 * carries COPY — verb labels, refusal sentences, a subtitle — and not one
 * `PslListing`. Reaching it tells a supplier surface what a button on a screen
 * they cannot open would have said.
 *
 * ⚠️ **BOTH ARE ABSOLUTE PATHS, NOT DIRECTORIES OR REGEXES**, for the reason
 * the first boundary already states: *an exemption nobody notices is how a
 * guard dies.* And both are proved load-bearing by the unbounded probe below —
 * remove them and the offenders come straight back.
 */
const COMMAND_SERVICE = resolve(process.cwd(), 'src/services/data/mock/MockCommandService.ts');
const I18N_BUNDLE = resolve(process.cwd(), 'src/lib/i18n.ts');

/** The three named composition points. A fourth has to be added BY HAND. */
const BOUNDARIES: ReadonlySet<string> = new Set([
  POLICY_BINDINGS,
  COMMAND_SERVICE,
  I18N_BUNDLE,
]);

/**
 * The transitive closure of files reachable from `entry`, by import.
 *
 * `stopAt` is the boundary set: a member is RECORDED as reached (so a probe can
 * prove the boundary really sits on the path) but is not TRAVERSED THROUGH.
 * Defaulted, so the probe below can run the same walker with the boundary
 * removed and watch this guard fire.
 */
function closure(entry: string, stopAt: ReadonlySet<string> = BOUNDARIES): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (stopAt.has(f)) continue;
    for (const spec of importsOf(f)) {
      const r = resolveImport(f, spec);
      if (r && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

/**
 * THE SUPPLIER SURFACES, derived from the ROUTER rather than from a filename
 * convention. A `Supplier*.tsx` glob would miss `CommHubInbound`
 * (`/supplier/comm-hub`) and would wrongly sweep in `BuyerSupplierProfile`.
 */
function supplierSurfaceFiles(): string[] {
  const routerPath = resolve(SRC, 'router/AppRouter.tsx');
  const code = stripSourceComments(readFileSync(routerPath, 'utf8'), 'blank', routerPath);
  const components = [
    ...code.matchAll(/path="\/supplier\/[^"]*"\s+element=\{<([A-Za-z0-9_]+)/g),
  ].map((m) => m[1]);
  const imports = new Map<string, string>();
  for (const m of code.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g)) {
    imports.set(m[1], m[2]);
  }
  const files: string[] = [];
  for (const c of new Set(components)) {
    const spec = imports.get(c);
    if (!spec) continue;
    const r = resolveImport(routerPath, spec);
    if (r) files.push(r);
  }
  return files;
}

const surfaces = supplierSurfaceFiles();

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the instrument is looking at the shipped tree', () => {
  it('the supplier surfaces were derived from the router and are many', () => {
    // §42b / EMPTY-INPUT-REPORTS-CLEAN-01: over an empty surface set every
    // claim below passes having examined nothing, and the pass is
    // indistinguishable from a working guard.
    expect(surfaces.length).toBeGreaterThan(8);
    // KNOWN-GOOD members, by name.
    const names = surfaces.map((f) => f.replace(/\\/g, '/'));
    expect(names.some((n) => n.endsWith('SupplierOrders.tsx'))).toBe(true);
    expect(names.some((n) => n.endsWith('SupplierDocuments.tsx'))).toBe(true);
    // KNOWN-BAD: a BUYER page must not be in the supplier population.
    expect(names.some((n) => n.endsWith('BuyerSupplierProfile.tsx'))).toBe(false);
  });

  it('every PSL module named here exists', () => {
    for (const m of PSL_MODULES) expect(existsSync(m), m).toBe(true);
  });

  it('⚠️ THE DERIVED SET IS REAL AND COVERS THE GLOB — both directions (B-S4d)', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: a walker returning `[]` would make every
    // claim in this file pass having examined nothing. Membership, by name,
    // never a count.
    const rel = PSL_MODULES.map((m) => relative(process.cwd(), m).split(sep).join('/'));
    expect(rel).toContain('src/services/data/pslListing.ts');
    expect(rel).toContain('src/services/data/pslProjection.ts');
    expect(rel).toContain('src/services/data/pslSourcingSeam.ts');
    expect(rel).toContain('src/services/data/rfqSourcingGate.ts');
    expect(rel).toContain('src/components/v2-features/PslStatusCell.tsx');
    expect(rel).toContain('src/components/v2-features/PslListingsSection.tsx');

    // ⚠️ THE DIRECTION THE HAND LIST NEVER HAD. These four are the P2 and P3
    // modules the old array would have had to be edited to gain — and the
    // STORE is the one that mattered, because a type-imported store inherits
    // membership from nothing and would have been reachable with this file
    // green.
    expect(rel).toContain('src/components/v2-features/PslGateNotice.tsx');
    expect(rel).toContain('src/services/data/mock/stores/pslStore.ts');
    expect(rel).toContain('src/services/data/mock/stores/pslCapSettingStore.ts');
    expect(rel).toContain('src/services/data/pslLeadCheck.ts');

    // COVERAGE, stated as the property: every `psl*` / `Psl*` source file in
    // the tree that is NOT a flow definition is in the set. Derived on both
    // sides from the same walker, so this asserts the SET rather than a sample.
    const glob = pslModules().map((m) => relative(process.cwd(), m).split(sep).join('/'));
    const protectedGlob = pslModules()
      .filter((m) => !isFlowDefinition(m))
      .map((m) => relative(process.cwd(), m).split(sep).join('/'));
    expect(protectedGlob.every((g) => rel.includes(g))).toBe(true);
    expect(protectedGlob.length).toBeGreaterThan(8);

    // ⚠️ AND THE EXCLUSION IS VISIBLE RATHER THAN SILENT: the flow files ARE
    // glob members and are deliberately not in the protected set. A reader who
    // greps for `psl.flow.ts` here finds it named, with the rule beside it.
    expect(glob).toContain('src/services/transitions/flows/psl.flow.ts');
    expect(glob).toContain('src/services/transitions/flows/pslCapSetting.flow.ts');
    expect(rel).not.toContain('src/services/transitions/flows/psl.flow.ts');
    expect(rel).not.toContain('src/services/transitions/flows/pslCapSetting.flow.ts');

    // KNOWN-BAD: a spec is not a module, and the retired fixture is gone.
    expect(rel.some((r) => /\.test\.(ts|tsx)$/.test(r))).toBe(false);
    expect(rel).not.toContain('src/services/data/mock/fixtures/pslListings.ts');
  });

  it('⚠️ THE FLOW EXCLUSION IS SELF-POLICING — a flow file reaches no corpus', () => {
    // ⚠️ **THE HALF THAT KEEPS AN EXCLUSION FROM BEING A HOLE.** Flow
    // definitions are excluded on a stated property — *a `FlowDefinition`
    // cannot yield a `PslListing`* — so the property is CHECKED rather than
    // trusted. The day `psl.flow.ts` imports the store, this goes red and the
    // exclusion has to be re-argued instead of quietly covering a leak.
    expect(PSL_FLOW_FILES.length).toBe(2);
    for (const f of PSL_FLOW_FILES) {
      const reach = closure(f, new Set());
      const hits = PSL_MODULES.filter((m) => reach.has(m));
      expect(hits, `${f} reaches a PSL corpus module`).toEqual([]);
    }
  });

  it('⚠️ AND THE TYPE-ONLY GAP IS CLOSED BY MEMBERSHIP, NOT BY THE WALKER', () => {
    // ⚠️ **THE RESIDUAL IS STATED RATHER THAN PAPERED OVER.** `pslStore.ts`
    // reaches NO other PSL module — its only PSL import is `import type
    // { PslListing }`, which this walker correctly drops. So it could never
    // have been caught transitively, and it is caught because the derivation
    // makes it a member in its own right.
    const store = importsOf(resolve(SRC, 'services/data/mock/stores/pslStore.ts'));
    expect(store.filter((x) => x.includes('pslListing'))).toEqual([]);
    expect(PSL_MODULES).toContain(resolve(SRC, 'services/data/mock/stores/pslStore.ts'));

    // ⚠️ AND WHAT IS DELIBERATELY *NOT* CAUGHT, so nobody reads the sentence
    // above as a stronger claim than it is: a supplier surface that TYPE-ONLY
    // imports `PslListing` and nothing else is not a reach and must not be
    // flagged — no data crosses an erased import.
  });

  it('⚠️ THE INSTRUMENT CAN FIRE — a BUYER surface DOES reach the PSL', () => {
    // The control that separates "no supplier reaches it" from "the walker
    // reaches nothing". Without this, deleting `importsOf`'s regex body would
    // leave every assertion below green.
    const buyer = closure(resolve(SRC, 'pages-v2/BuyerSuppliers.tsx'));
    const hit = PSL_MODULES.filter((m) => buyer.has(m));
    expect(hit.length).toBeGreaterThan(0);
  });

  it('⚠️ comments cannot be mistaken for imports', () => {
    // This file names every PSL module in prose and imports two of them.
    // ⚠️ The value import moved at P3 — the frozen fixture is retired and the
    // corpus is GROWN — so the known-good member is the seed rather than
    // `./mock/fixtures/pslListings`. The claim is unchanged: a module NAMED
    // only in prose must not appear, and `pslSourcingSeam` is named repeatedly
    // above and imported nowhere.
    const self = importsOf(resolve(SRC, 'services/data/pslNoSupplierRead.test.ts'));
    expect(self).toContain('./mock/pslSeed');
    expect(self).toContain('./mock/stores/pslStore');
    expect(self.filter((s) => s.includes('pslSourcingSeam'))).toEqual([]);
  });

  it('⚠️ A TYPE-ONLY IMPORT IS NOT A REACH — and an INLINE type specifier IS', () => {
    // BOTH DIRECTIONS on the rule that made this guard satisfiable. Without the
    // first, the whole tree is guilty; without the second, a real leak hides.
    // KNOWN-GOOD, first: the walker DOES find value imports in the same
    // neighbourhood — `index.ts` loads every glossary registry for real.
    const index = importsOf(resolve(SRC, 'lib/glossary/index.ts'));
    expect(index).toContain('./governance.glossary');

    // THE EXCLUSION: `governance.glossary.ts` names the PSL modules on
    // `import type` lines, and every one of its imports is type-only — so the
    // honest answer for that file is the EMPTY list, not merely "no psl".
    // Asserting the whole list rather than a filtered one is what says the
    // walker read the file and dropped everything, rather than read nothing.
    const glossary = importsOf(resolve(SRC, 'lib/glossary/governance.glossary.ts'));
    expect(glossary).toEqual([]);

    // KNOWN-BAD for the exclusion: `PslStatusCell` names `pslListing` on an
    // `import type` line but ALSO loads `pslListings` and `pslProjection` for
    // values — the value imports must survive the filter.
    const cell = importsOf(resolve(SRC, 'components/v2-features/PslStatusCell.tsx'));
    // ⚠️ `pslStore` rather than `pslListings` at P3 (B-S4c): the cell's default
    // corpus is the STORE now, because a cell defaulted to a frozen snapshot
    // would render yesterday's designation beside a queue that had just changed
    // it, with nothing going red.
    expect(cell.some((x) => x.includes('pslStore'))).toBe(true);
    expect(cell.some((x) => x.includes('pslProjection'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ NO SUPPLIER SURFACE REACHES ANY PSL MODULE', () => {
  it('not one supplier-side route can import the listing corpus, the projection or the seam', () => {
    const offenders: string[] = [];
    for (const surface of surfaces) {
      const reach = closure(surface);
      for (const m of PSL_MODULES) {
        if (reach.has(m)) {
          offenders.push(`${surface.replace(/\\/g, '/')} → ${m.replace(/\\/g, '/')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  }, 30000);

  it('⚠️ EACH BOUNDARY IS INDIVIDUALLY LOAD-BEARING — drop one and it FIRES', () => {
    // ⚠️ **THE UNBOUNDED PROBE BELOW PROVES THE SET IS NEEDED; THIS PROVES
    // EVERY MEMBER OF IT IS.** Without this, a boundary that had stopped
    // holding anything back would sit in the set forever, and the set would
    // read as three decisions when it was one decision and two habits.
    for (const boundary of BOUNDARIES) {
      const without = new Set([...BOUNDARIES].filter((b) => b !== boundary));
      const offenders: string[] = [];
      for (const surface of surfaces) {
        const reach = closure(surface, without);
        for (const m of PSL_MODULES) if (reach.has(m)) offenders.push(surface);
      }
      expect(
        offenders.length,
        `${boundary} holds nothing back — retire it rather than leaving it`,
      ).toBeGreaterThan(0);
    }
    // ⚠️ **30 s, AND IT IS INSURANCE ON TOP OF A REMOVED CAUSE — NOT INSTEAD
    // OF ONE.** `resolveImport` is now memoised (see its site), which took this
    // file from 2997–3914 ms to 1505–2185 ms and this describe's walks from
    // 1037–1419 ms to 346–591 ms, measured three runs each on a quiet machine.
    // The budget is still taken because HEADROOM AT THIS RATIO HAS ALREADY
    // PROVED INSUFFICIENT IN THIS SUITE: `pageWidth.guard` sat at ~4.5x the
    // 5000 ms default and timed out anyway in a full-suite run, and this test
    // timed out once at ~2-3x before the memo. A per-test budget is the tree's
    // standing answer for whole-tree walks — `readingInstant`, `stripComments`,
    // `projectionGate`, `dayCounts`, `moduleScopeLiteralGate`, `storedFieldGate`
    // and `pageWidth.guard` all carry one.
    // ⚠️ A GLOBAL `testTimeout` IS REFUSED: it would hide every future slow test.
    // ⚠️ NO ASSERTION IS TOUCHED — only the budget. A timed-out probe never ran
    // its assertion, which is the one red that proves nothing.
  }, 30000);

  it('⚠️ A SUPPLIER IS REFUSED AT SCOPE ON EVERY PSL VERB — what replaces the claim', () => {
    // ⚠️ **THIS IS THE ASSERTION THAT PAYS FOR THE `MockCommandService`
    // BOUNDARY.** The bytes are in a supplier's module graph — they always were
    // for every other lane, and this platform ships every fixture to every
    // client and scopes tenancy client-side. What must be true instead is that
    // a supplier seat cannot reach a PSL verb at all.
    //
    // `pslTarget.readScopeOwner` returns `null`, which the dispatcher treats as
    // "NO SUPPLIER MAY ACT ON THIS" rather than "nothing to compare" (§86), so
    // the refusal lands at SCOPE — before the role gate, before any hook, and
    // before any row is read. The refusal kind is therefore identical for a
    // listing that exists and one that does not, which is what stops it being
    // an existence oracle across a tenancy boundary.
    const supplierScope: QueryScope = {
      personaType: 'supplier',
      supplierId: 'sup-002',
      businessRoles: ['commercial', 'fulfilment', 'back_office'],
      actor: NO_PERSON,
    };
    const commands = new MockCommandService();
    const real = pslRows()[0];
    expect(real, 'the corpus is empty — this spec would be vacuous').toBeDefined();

    // ⚠️ THE **CODE**, NEVER THE MESSAGE. `dispatcher.ts` throws
    // `new DataError('SCOPE_DENIED', "command on psl 'psl-001' denied for
    // scope")` — the message is PROSE and does not contain the kind, which is
    // exactly why `describeRefusal` returns `null` for a thrown error and
    // `describeDataError` exists. A `toThrow(/SCOPE_DENIED/)` here would be
    // matching a sentence somebody may reword.
    const kindOf = async (input: Parameters<typeof commands.dispatch>[1]): Promise<string> => {
      try {
        await commands.dispatch(supplierScope, input);
        return 'NOT_REFUSED';
      } catch (e) {
        return e instanceof DataError ? e.code : `THREW_${String(e)}`;
      }
    };

    return (async () => {
      for (const [transitionId, payload] of [
        ['t_psl_grant', { reason: 'x' }],
        ['t_psl_reject', { reason: 'x' }],
        ['t_psl_withdraw', { reason: 'x' }],
        ['t_psl_publish', {}],
        ['t_psl_change_status', { status: 'Validated', reason: 'x' }],
        ['t_psl_renew', { validUntil: '2030-01-01', reason: 'x' }],
        ['t_psl_cap_override', { capDaysOverride: 30, capJustification: 'x' }],
      ] as const) {
        expect(
          await kindOf({
            transitionId,
            entity: 'psl',
            entityId: real.id,
            payload: { ...payload },
          }),
          transitionId,
        ).toBe('SCOPE_DENIED');
      }
      // ⚠️ AND THE SAME REFUSAL ON A ROW THAT DOES NOT EXIST — the half that
      // says the refusal KIND is not an existence oracle across the tenancy
      // boundary (§86, `ownerlessScope.test.ts`).
      expect(
        await kindOf({
          transitionId: 't_psl_publish',
          entity: 'psl',
          entityId: 'psl-does-not-exist',
          payload: {},
        }),
      ).toBe('SCOPE_DENIED');

      // ⚠️ KNOWN-GOOD CONTROL: a BUYER seat holding the atom is NOT refused at
      // scope. Without it, a dispatcher that refused everything would pass every
      // assertion above.
      const buyerPublish = await commands.dispatch(
        {
          personaType: 'buyer',
          supplierId: null,
          businessRoles: ['procurement'],
          actor: NO_PERSON,
        },
        { transitionId: 't_psl_publish', entity: 'psl', entityId: real.id, payload: {} },
      );
      expect(buyerPublish.status).not.toBe(undefined);
    })();
  });

  it('⚠️ THE BOUNDARY IS LOAD-BEARING — remove it and this guard FIRES', () => {
    // ⚠️ **THE HALF THAT STOPS THE EXEMPTION BEING A HOLE.** An exemption is
    // only honest if you can show what it is holding back. Run the SAME walker
    // over the SAME population with no boundary and the offenders reappear —
    // so the boundary is a decision about one named edge, not a walker that
    // quietly stopped finding things.
    const unbounded: string[] = [];
    for (const surface of surfaces) {
      const reach = closure(surface, new Set());
      for (const m of PSL_MODULES) if (reach.has(m)) unbounded.push(surface);
    }
    expect(unbounded.length).toBeGreaterThan(0);
  });

  it('⚠️ AND THE BOUNDARY REALLY SITS ON THE PATH — it is not a no-op', () => {
    // The other direction. If no supplier surface reached `policies.ts` at all,
    // the boundary would be decoration and the clean result above would be
    // reporting on a walk that never met it — `CLEAN-AFTER-THE-FIX-REPORTS-THE-
    // FIX-01` with a boundary instead of a repair.
    const reaching = surfaces.filter((f) => closure(f).has(POLICY_BINDINGS));
    expect(reaching.length).toBeGreaterThan(0);
    // …and a DIRECT PSL import by a supplier surface would still be caught,
    // because the boundary excludes exactly one file and nothing downstream of
    // the surfaces themselves. Proven on the buyer control, which imports the
    // cell directly rather than through any policy: it is still convicted.
    const buyer = closure(resolve(SRC, 'pages-v2/BuyerSuppliers.tsx'));
    expect(PSL_MODULES.filter((m) => buyer.has(m)).length).toBeGreaterThan(0);
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE CLAIM THAT REPLACES THE ONE THE BOUNDARY GAVE UP — AND IT IS ABOUT
// REACHABILITY BY A SEAT, WHICH IS WHAT "NO SUPPLIER-FACING READ" ALWAYS MEANT.
//
// The PSL is read inside three policy hooks on `t_rfq_publish` and
// `t_rfq_award`. If a supplier seat cannot reach those verbs, it cannot reach
// the hooks, and the module edge the boundary excludes carries no read.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ NO SUPPLIER SEAT CAN REACH THE VERBS WHOSE HOOKS READ THE PSL', () => {
  const svcCmd = new MockCommandService();
  const supplier: QueryScope = {
    personaType: 'supplier',
    supplierId: 'sup-002',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON,
  };
  const buyerSeat: QueryScope = {
    personaType: 'buyer',
    supplierId: null,
    businessRoles: PERSONA_SYSTEM_ROLES.buyer,
    actor: NO_PERSON,
  };

  beforeEach(() => {
    rfqStore.reset();
  });

  it('the two gated verbs carry the PSL hooks — without this the claim is vacuous', () => {
    const publish = rfqFlow.transitions.find((t) => t.id === 't_rfq_publish')!;
    const award = rfqFlow.transitions.find((t) => t.id === 't_rfq_award')!;
    expect(publish.policyHooks).toContain(POLICY_HOOKS.RFQ_PUBLISH_COMPETITION);
    expect(award.policyHooks).toContain(POLICY_HOOKS.RFQ_AWARD_AWARDEE_INTEGRITY);
  });

  it('⚠️ a supplier is refused at SCOPE on publish — before any hook runs', async () => {
    const draft = rfqStore.all().find((r) => r.status === 'Draft' && r.invitedSupplierIds.length > 1)!;
    // THROWN, not returned: `rfqTarget.readScopeOwner` is null, which denies
    // every supplier scope at the dispatcher's step 2 — ahead of the role gate
    // and far ahead of the policy gate.
    await expect(
      svcCmd.dispatch(supplier, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: draft.id }),
    ).rejects.toThrow(/denied for scope/);
    expect(rfqStore.get(draft.id)!.status).toBe('Draft');
  });

  it('⚠️ a supplier is refused at SCOPE on award too', async () => {
    const open = rfqStore.all().find((r) => r.status === 'Open')!;
    await expect(
      svcCmd.dispatch(supplier, {
        transitionId: 't_rfq_award',
        entity: 'rfq',
        entityId: open.id,
        payload: { awardedQuotationId: 'qt-003a', awardedSupplierId: 'sup-002' },
      }),
    ).rejects.toThrow(/denied for scope/);
  });

  it('⚠️ KNOWN-GOOD CONTROL — a BUYER seat does reach the hook, and is judged by it', async () => {
    // Without this, the two refusals above are equally consistent with a verb
    // nobody can fire, and "no supplier can reach it" would prove nothing about
    // the gate (rule 4 — assert a known-GOOD input passes first).
    const draft = rfqStore.all().find((r) => r.status === 'Draft' && r.invitedSupplierIds.length > 1)!;
    const res = await svcCmd.dispatch(buyerSeat, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: draft.id,
    });
    expect(res.status, res.reason).toBe('done');
  });

  it('⚠️ AND A HOOK REFUSAL NAMES NO LISTING — the refusal is not a read either', async () => {
    // The last door: a supplier cannot reach these verbs, but the refusal TEXT
    // of a gate that reads the PSL must still not carry PSL data, or the day a
    // supplier-facing verb acquires one of these hooks the leak arrives with it.
    const zero = rfqStore.all().find((r) => r.invitedSupplierIds.length === 0 && r.status === 'Draft')!;
    const res = await svcCmd.dispatch(buyerSeat, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: zero.id,
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('COMPETITION_UNDER_FLOOR');
    for (const l of pslRows()) expect(res.reason!.includes(l.id), l.id).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE SUPPLIER READ PATH CARRIES NO PSL FIELD', () => {
  const svc = new MockSupplierService();
  const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-002' };

  it('a supplier reading its OWN record gets no PSL field, published or not', async () => {
    const me = await svc.getCurrent(supplierScope);
    expect(me).not.toBeNull();
    const keys = Object.keys(me!);
    expect(keys.length).toBeGreaterThan(10); // the record is real, not a stub
    for (const k of keys) {
      expect(/psl/i.test(k), `supplier record exposes ${k}`).toBe(false);
    }
    // and the serialised record names no listing id — the leak a key-name scan
    // would miss if a listing were embedded under an innocuous key.
    const blob = JSON.stringify(me);
    for (const l of pslRows()) expect(blob.includes(l.id), l.id).toBe(false);
  });

  it('⚠️ AND sup-002 IS THE MULTI-LISTING SUPPLIER — the test is not vacuous', () => {
    // Asserting "no PSL data" about a supplier that holds none proves nothing.
    // sup-002 holds several, one of them PUBLISHED, so if publication ever
    // leaked into the supplier read this is where it surfaces.
    const held = pslRows().filter((r) => r.supplierId === 'sup-002');
    expect(held.length).toBeGreaterThan(1);
    expect(held.some((r) => r.publishedAt !== null)).toBe(true);
  });

  it('the supplier list read stays empty for a supplier persona', async () => {
    const page = await svc.list(supplierScope);
    expect(page.items).toEqual([]);
  });
});
