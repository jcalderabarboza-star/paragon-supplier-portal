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
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { MockSupplierService } from './mock/MockSupplierService';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import type { QueryScope } from './types';

const SRC = resolve(process.cwd(), 'src');

/** Every module the PSL lives in. A supplier surface may reach none of them. */
const PSL_MODULES = [
  'src/services/data/pslListing.ts',
  'src/services/data/pslProjection.ts',
  'src/services/data/pslSourcingSeam.ts',
  'src/services/data/mock/fixtures/pslListings.ts',
  'src/components/v2-features/PslStatusCell.tsx',
  'src/components/v2-features/PslListingsSection.tsx',
].map((p) => resolve(process.cwd(), p));

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec);
  if (existsSync(base) && /\.(ts|tsx)$/.test(base)) return base;
  for (const e of EXTS) {
    if (existsSync(base + e)) return base + e;
  }
  return null;
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

/** The transitive closure of files reachable from `entry`, by import. */
function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length > 0) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
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
    const self = importsOf(resolve(SRC, 'services/data/pslNoSupplierRead.test.ts'));
    expect(self).toContain('./mock/fixtures/pslListings');
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
    expect(cell.some((x) => x.includes('pslListings'))).toBe(true);
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
    for (const l of PSL_LISTINGS) expect(blob.includes(l.id), l.id).toBe(false);
  });

  it('⚠️ AND sup-002 IS THE MULTI-LISTING SUPPLIER — the test is not vacuous', () => {
    // Asserting "no PSL data" about a supplier that holds none proves nothing.
    // sup-002 holds several, one of them PUBLISHED, so if publication ever
    // leaked into the supplier read this is where it surfaces.
    const held = PSL_LISTINGS.filter((r) => r.supplierId === 'sup-002');
    expect(held.length).toBeGreaterThan(1);
    expect(held.some((r) => r.publishedAt !== null)).toBe(true);
  });

  it('the supplier list read stays empty for a supplier persona', async () => {
    const page = await svc.list(supplierScope);
    expect(page.items).toEqual([]);
  });
});
