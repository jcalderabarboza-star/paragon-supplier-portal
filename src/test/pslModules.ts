// ─────────────────────────────────────────────────────────────────────────────
// EVERY PSL MODULE IN THE TREE — DERIVED, NEVER LISTED (B-S4d).
//
// ⚠️ **TWO SPECS CARRIED HAND-WRITTEN COPIES OF THIS LIST AND BOTH HAD ALREADY
// GONE STALE.** `pslNoSupplierRead.test.ts` named seven paths and
// `pslListings.fixture.test.ts` named six; neither contained
// `PslGateNotice.tsx`, which P2 shipped. Each asserted ONE direction only —
// *"every module named here exists"* — so a PSL module that gained no entry was
// invisible to both, forever and silently. That is `CENSUS-MUST-DERIVE-01` with
// two instances in one lane.
//
// ── ⚠️ AND P3 WOULD HAVE MADE IT A LEAK RATHER THAN AN UNTIDINESS ──────────
//   The supplier-read guard walks import closures and its own rule is that **a
//   TYPE-ONLY IMPORT IS NOT A REACH** — correctly, since a type is erased. But
//   every store in this tree type-imports its row type (`materialRequestStore
//   .ts`: `import type { MaterialRequest }`), so `pslStore.ts` inherits
//   membership from NOTHING. On a hand-written list it would simply have been
//   absent, and a supplier surface value-importing the store would have reached
//   the whole corpus with the guard green.
//
//   Derived, it is a member by its own name, and a value import of it is caught
//   directly. **That closes the gap the hand list could not**, and the residual
//   is stated rather than papered over: a supplier surface that type-imports
//   `PslListing` and nothing else is NOT caught and MUST NOT BE — no data
//   crosses an erased import, and flagging it would redden the tree for a
//   `import type` that renders nothing.
//
// ── ⚠️ THE GLOB IS THE POPULATION, AND IT IS ASSERTED IN BOTH DIRECTIONS ───
//   `pslModules()` returns repo-relative paths for every non-spec source file
//   whose BASENAME begins `psl` or `Psl`. Each consuming spec asserts:
//     · the derived set is non-empty and contains known members (so a broken
//       walker cannot report an empty population — `EMPTY-INPUT-REPORTS-
//       CLEAN-01`);
//     · every file it names EXISTS (the old one-directional check, kept);
//     · and the set COVERS the glob, which is the direction that was missing.
//
// ⚠️ **IT LIVES IN `src/test/`, WHICH `tsconfig.json` EXCLUDES.** It reads the
// filesystem, and a module under `src/` that imported `node:fs` would be pulled
// into the browser bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, basename, sep } from 'node:path';

const SRC = resolve(process.cwd(), 'src');

/** A source file, not a spec and not a declaration. */
function isSource(name: string): boolean {
  if (!/\.(ts|tsx)$/.test(name)) return false;
  if (/\.(test|spec)\.(ts|tsx)$/.test(name)) return false;
  if (name.endsWith('.d.ts')) return false;
  return true;
}

/**
 * Is this a PSL module?
 *
 * ⚠️ **THE BASENAME, CASE-SENSITIVELY ON THE FIRST THREE CHARACTERS.** `psl*`
 * catches the data and store modules, `Psl*` the components. A case-insensitive
 * match would sweep in anything containing those letters at a word start in a
 * longer name, and a path-wide match would claim every file in a directory that
 * happened to be called `psl`. Neither is what a leak check means by "a PSL
 * module".
 */
function isPslName(name: string): boolean {
  const base = basename(name).replace(/\.(ts|tsx)$/, '');
  return base.startsWith('psl') || base.startsWith('Psl');
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (isSource(entry) && isPslName(entry)) out.push(full);
  }
}

/**
 * Every PSL module in `src/`, as ABSOLUTE paths, sorted.
 *
 * Absolute because both consumers resolve imports against absolute paths and a
 * second normalisation is a second thing to get wrong.
 */
export function pslModules(): readonly string[] {
  const out: string[] = [];
  walk(SRC, out);
  return out.sort();
}

/** The same set as repo-relative POSIX paths, for a readable assertion message. */
export function pslModulesRelative(): readonly string[] {
  return pslModules().map((p) => relative(process.cwd(), p).split(sep).join('/'));
}
