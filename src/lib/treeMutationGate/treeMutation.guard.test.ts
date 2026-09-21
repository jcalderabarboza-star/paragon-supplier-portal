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
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { specFiles, treeMutations, MENTIONS_FS, REPO_ROOT } from './derive';

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
    // …and the walk really is rooted at this repo, not at someone's cwd.
    expect(REPO_ROOT.replace(/\\/g, '/')).toMatch(/paragon-supplier-portal$/);
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
