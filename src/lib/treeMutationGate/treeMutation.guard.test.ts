// ─────────────────────────────────────────────────────────────────────────────
// THE GUARD — no spec writes into the tree it is testing.
//
// The mechanism, the population and the reach limits live in `derive.ts`. This
// file is the claim plus the controls that make the claim worth reading.
//
// ⚠️ **PROBED IN BOTH DIRECTIONS, AND THE ORDER IS THE POINT.** A guard is
// habitually probed only for "does it catch the bad thing?", so one that is
// wrong about what it should ACCEPT ships looking like a working guard. Every
// control below therefore has a twin: the known-BAD is convicted AND NAMED, and
// a known-GOOD read-only spec is acquitted, by the same instrument in the same
// run.
//
// ⚠️ **AND THE POPULATION IS DERIVED FROM DISK, NOT FROM THE THING UNDER TEST**
// (§86). If the population came from `treeMutations` itself, a mutant that broke
// the matcher would empty the population, and the suite would go red on the
// population control while the assertion that matters never executed — a kill
// indistinguishable from having nothing to look at.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  specFiles,
  treeMutations,
  findRepoRoot,
  MENTIONS_FS,
  PROJECT_NAME,
  REPO_ROOT,
} from './derive';

/** A synthetic spec on disk, OUTSIDE the tree under test — which is the rule
 *  this file exists to enforce, so breaking it here would be absurd. */
const withSyntheticSpec = <T,>(source: string, run: (file: string) => T): T => {
  const dir = mkdtempSync(join(tmpdir(), 'tree-mutation-probe-'));
  const file = join(dir, 'synthetic.test.ts');
  writeFileSync(file, source, 'utf8');
  try {
    return run(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('tree-mutation gate · THE POPULATION, before any claim about it', () => {
  const files = specFiles();

  it('⚠️ the spec population is real and holds known-true members BY NAME', () => {
    // A count over an empty derivation reads exactly like a clean tree
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`), so membership is asserted, not size.
    const rel = files.map((f) => f.replace(/\\/g, '/'));
    expect(files.length).toBeGreaterThan(300);
    expect(rel.some((f) => f.endsWith('/src/lib/projectionGate/projectionGate.test.ts'))).toBe(true);
    expect(
      rel.some((f) => f.endsWith('/src/pages-v2/dashboard/buyerDashboardNoLiterals.guard.test.ts')),
    ).toBe(true);
    // …and the walk really is rooted at THIS REPOSITORY. Asserted from what
    // the repository DECLARES — `name` in its own package.json — never from the
    // folder somebody cloned into, which is a label and not an identity.
    expect(
      (JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { name: string }).name,
    ).toBe(PROJECT_NAME);
  });

  it('⚠️ the fs pre-filter admits every spec that imports fs, and only those', () => {
    // The pre-filter is what keeps this gate from becoming the next 5-second
    // timeout. It is only allowed to do that if it cannot drop a real writer:
    // no import, no binding, no call. Both directions, same instrument.
    expect(MENTIONS_FS.test("import { writeFileSync } from 'node:fs';")).toBe(true);
    expect(MENTIONS_FS.test("import fs from 'fs';")).toBe(true);
    expect(MENTIONS_FS.test("const fs = require('node:fs');")).toBe(true);
    expect(MENTIONS_FS.test("const fs = await import('node:fs');")).toBe(true);
    expect(MENTIONS_FS.test("import { render } from '@testing-library/react';")).toBe(false);
  });
});

/**
 * A synthetic repository on disk, OUTSIDE the tree under test, in a FIXED
 * layout:
 *
 *   <root>/                          package.json named `names.root`, or none
 *   <root>/paragon-supplier-portal/  package.json named `names.decoy`, or none
 *   <root>/outer/                    package.json named `names.outer`, or none
 *   <root>/outer/inner/deep/         never a package.json
 *
 * ⚠️ **THE LAYOUT IS FIXED AND EVERY PATH BELOW IS BUILT FROM STRING LITERALS,
 * WHICH IS NOT STYLE.** The first draft of this helper took caller-supplied
 * relative paths, and THE CLAIM three describes down convicted it: a target
 * assembled from a loop variable folds to `UNRESOLVED`, which this gate refuses
 * rather than passes. That is the gate working on the file that enforces it,
 * and the fix is the one its own failure message prescribes — make the write
 * foldable — never a widened acquittal.
 */
const withSyntheticRepo = <T,>(
  names: { root?: string; decoy?: string; outer?: string },
  run: (dirs: { root: string; decoy: string; deep: string }) => T,
): T => {
  const root = mkdtempSync(join(tmpdir(), 'repo-root-probe-'));
  const decoy = join(root, 'paragon-supplier-portal');
  const deep = join(root, 'outer', 'inner', 'deep');
  mkdirSync(decoy, { recursive: true });
  mkdirSync(deep, { recursive: true });
  if (names.root !== undefined)
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: names.root }), 'utf8');
  if (names.decoy !== undefined)
    writeFileSync(
      join(root, 'paragon-supplier-portal', 'package.json'),
      JSON.stringify({ name: names.decoy }),
      'utf8',
    );
  if (names.outer !== undefined)
    writeFileSync(
      join(root, 'outer', 'package.json'),
      JSON.stringify({ name: names.outer }),
      'utf8',
    );
  try {
    return run({ root, decoy, deep });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

describe('tree-mutation gate · THE ROOT, which used to be the folder name', () => {
  // ⚠️ **THE ASSERTION THAT STOOD HERE WAS `/paragon-supplier-portal$/` OVER
  // `process.cwd()`, AND IT WAS WRONG IN BOTH DIRECTIONS AT ONCE**: it convicted
  // this repository cloned into any other folder — a clean clone went red on a
  // gate that had found no defect, which is the worst reading an instrument can
  // produce — and it acquitted any OTHER repository sitting in a folder somebody
  // had named `paragon-supplier-portal`. Both directions are probed below
  // against synthetic directories, so the replacement is shown to be STRONGER
  // rather than merely different. A folder name is a label anybody can type;
  // `name` in package.json is the repository's own claim, and it travels with
  // the clone.

  it('⚠️ the decoy directory really is spelled the way the old check matched', () => {
    // Without this, the two probes below could pass while probing nothing: a
    // decoy misspelled against `PROJECT_NAME` is not the old check's input.
    expect(withSyntheticRepo({}, (d) => d.decoy.endsWith(PROJECT_NAME))).toBe(true);
  });

  it('⚠️ FINDS the root from a deep descendant — the walk is upward, not the cwd', () => {
    expect(findRepoRoot(join(REPO_ROOT, 'src', 'lib', 'treeMutationGate'))).toBe(REPO_ROOT);
    expect(findRepoRoot(REPO_ROOT)).toBe(REPO_ROOT);
  });

  it('⚠️ FOLDER-NAME INDEPENDENT — a clone under any other name still resolves', () => {
    // The defect this batch exists for, reproduced on disk: the same declared
    // identity, in a directory named nothing like it.
    withSyntheticRepo({ root: PROJECT_NAME }, ({ root, deep }) => {
      expect(root.endsWith(PROJECT_NAME)).toBe(false); // mkdtemp names it otherwise
      expect(findRepoRoot(deep)).toBe(resolve(root));
    });
  });

  it('⚠️ and the FOLDER NAME ALONE buys nothing — identity is what is DECLARED', () => {
    // The old check's false-ACQUITTAL direction, which is the one a one-sided
    // probe never reaches. A directory called `paragon-supplier-portal` whose
    // package.json says it is something else is not this repository.
    withSyntheticRepo({ decoy: 'some-other-project' }, ({ decoy }) => {
      expect(findRepoRoot(decoy)).toBe(null);
    });
  });

  it('⚠️ NO DECLARATION ANYWHERE is null — never a fallback to the start dir', () => {
    // A fallback would put the gate back where it began: walking whichever
    // directory it happened to be handed. Null is refused loudly at module
    // scope, so the gate cannot run against the wrong tree in silence.
    // (This reads the real ancestors of the OS temp dir, which is outside this
    // repository — stated because it is the one assumption the probe makes.)
    withSyntheticRepo({}, ({ deep }) => {
      expect(findRepoRoot(deep)).toBe(null);
    });
  });

  it('⚠️ the NEAREST DECLARING ancestor wins, not the first package.json seen', () => {
    withSyntheticRepo({ root: PROJECT_NAME, outer: 'unrelated-package' }, ({ root, deep }) => {
      // `outer` declares a different name, so it is walked PAST, not stopped at.
      expect(findRepoRoot(deep)).toBe(resolve(root));
    });
  });

  it("⚠️ a spec's process.cwd() really is the root this gate models it as", () => {
    // `evalPath` folds `process.cwd()` to REPO_ROOT, which is an assumption
    // about the RUNNER rather than an identity. Unasserted, it is how a gate
    // starts classifying every path against the wrong tree without saying so.
    expect(resolve(process.cwd())).toBe(REPO_ROOT);
  });
});

describe('tree-mutation gate · THE MATCHER, before any claim about the tree', () => {
  it('⚠️ CONVICTS a spec that writes into src/, and NAMES the target', () => {
    const found = withSyntheticSpec(
      [
        "import { writeFileSync } from 'node:fs';",
        "import { join } from 'node:path';",
        "it('x', () => {",
        "  writeFileSync(join(process.cwd(), 'src', 'pages-v2', '__probe__.ts'), 'x', 'utf8');",
        '});',
      ].join('\n'),
      (file) => treeMutations([file]),
    );
    expect(found).toHaveLength(1);
    expect(found[0].call).toBe('writeFileSync');
    expect(found[0].verdict).toBe('TRACKED');
    // NAMED, not counted: a count is satisfied by the wrong match.
    expect(found[0].target).toBe('src/pages-v2/__probe__.ts');
  });

  it('⚠️ ACQUITS the tmpdir form — the shape every writer here is meant to use', () => {
    const found = withSyntheticSpec(
      [
        "import { mkdtempSync, writeFileSync } from 'node:fs';",
        "import { tmpdir } from 'node:os';",
        "import { join } from 'node:path';",
        "it('x', () => {",
        "  const dir = mkdtempSync(join(tmpdir(), 'probe-'));",
        "  writeFileSync(join(dir, 'a.ts'), 'x', 'utf8');",
        '});',
      ].join('\n'),
      (file) => treeMutations([file]),
    );
    // Both calls are seen — the matcher is not silently blind to them — and
    // both are classified safe. An acquittal by NOT LOOKING is the failure this
    // control exists to separate from an acquittal on the merits.
    expect(found.map((m) => m.call).sort()).toEqual(['mkdtempSync', 'writeFileSync']);
    expect(found.every((m) => m.verdict === 'TMPDIR')).toBe(true);
  });

  it('⚠️ a READ-ONLY spec produces nothing — the guard is not simply always red', () => {
    const found = withSyntheticSpec(
      [
        "import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';",
        "it('x', () => {",
        "  readdirSync('src').forEach((f) => readFileSync(f, 'utf8'));",
        "  statSync('src'); existsSync('src');",
        '});',
      ].join('\n'),
      (file) => treeMutations([file]),
    );
    expect(found).toEqual([]);
  });

  it('⚠️ DEFAULT-DENY — an fs call nobody enumerated is a mutator, not a pass', () => {
    // The whole point of the read-only allowlist: a method this gate has never
    // heard of must arrive as a finding. A hardcoded mutator list would let it
    // through in silence, which is the direction that ends investigations.
    const found = withSyntheticSpec(
      [
        "import fs from 'node:fs';",
        "it('x', () => { fs.someApiNobodyListed('src/x.ts'); });",
      ].join('\n'),
      (file) => treeMutations([file]),
    );
    expect(found.map((m) => m.call)).toEqual(['someApiNobodyListed']);
    expect(found[0].verdict).toBe('TRACKED');
  });

  it('⚠️ an UNRESOLVABLE target is reported, never silently passed', () => {
    const found = withSyntheticSpec(
      [
        "import { writeFileSync } from 'node:fs';",
        'declare const somewhere: string;',
        "it('x', () => { writeFileSync(somewhere, 'x'); });",
      ].join('\n'),
      (file) => treeMutations([file]),
    );
    expect(found.map((m) => m.verdict)).toEqual(['UNRESOLVED']);
  });
});

describe('tree-mutation gate · THE CLAIM', () => {
  const mutations = treeMutations(specFiles());

  it('⚠️ NO spec writes into a tracked path', () => {
    const offenders = mutations
      .filter((m) => m.verdict === 'TRACKED')
      .map((m) => `${m.file}:${m.line} ${m.call}(${m.target})`);

    expect(
      offenders,
      'A spec that mutates the tree under test is a SHARED-STATE defect, not a ' +
        'local one: twelve specs walk src/ at COLLECT time and read every member ' +
        'they find, so a file that exists for a few milliseconds is a few ' +
        'milliseconds of ENOENT for whichever of them is mid-walk. Write to ' +
        'mkdtempSync(join(tmpdir(), "prefix-")) instead — projectionGate.test.ts ' +
        'and buyerDashboardNoLiterals.guard.test.ts are the worked examples. See ' +
        'docs/findings.md §106i.',
    ).toEqual([]);
  });

  it('⚠️ and NO spec writes to a target this gate could not resolve', () => {
    // Refused rather than passed, so the gate's silence means ONE thing. If a
    // legitimate write cannot be folded, make it foldable (a const, a join) —
    // do not widen the acquittal.
    const unresolved = mutations
      .filter((m) => m.verdict === 'UNRESOLVED')
      .map((m) => `${m.file}:${m.line} ${m.call}(…)`);
    expect(unresolved).toEqual([]);
  });

  it('⚠️ ANTI-VACUITY — the run really examined writers, and they are the safe kind', () => {
    // Without this the two assertions above are satisfied by a tree in which
    // the matcher found nothing at all. The tree DOES contain writers; every
    // one of them must be tmpdir-rooted, and at least one is named.
    expect(mutations.length).toBeGreaterThan(0);
    expect(new Set(mutations.map((m) => m.verdict))).toEqual(new Set(['TMPDIR']));
    expect(mutations.map((m) => m.file)).toContain('src/lib/projectionGate/projectionGate.test.ts');
    expect(mutations.map((m) => m.file)).toContain(
      'src/pages-v2/dashboard/buyerDashboardNoLiterals.guard.test.ts',
    );
  });
});
