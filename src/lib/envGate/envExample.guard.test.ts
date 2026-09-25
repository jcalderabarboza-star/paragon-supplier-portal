// ─────────────────────────────────────────────────────────────────────────────
// THE GUARD — `.env.example` lists every environment variable this tree reads,
// and lists nothing else.
//
// The mechanism, the population and the reach limits live in `derive.ts`. This
// file is the claim plus the controls that make the claim worth reading.
//
// ⚠️ **THE NEEDLES BELOW ARE ASSEMBLED, NEVER WRITTEN OUT, AND THAT IS NOT
// STYLE.** This spec is itself inside the population the gate walks. A probe
// source containing the literal characters `process` `.env.` `ANYTHING` would
// be read by the shipped matcher as a real read in a real file, and the gate
// would then demand that `.env.example` document the gate's own test fixtures.
// `access()` interpolates the owner, so no contiguous literal exists on disk —
// and `the spec is in its own population` is asserted rather than assumed, so
// this paragraph cannot quietly stop being true.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  sourceFiles,
  envReads,
  envNamesInSource,
  listedNames,
  ENV_EXAMPLE,
} from './derive';

/** `process.env.X` / `import.meta.env['X']`, built so the literal never lands on disk. */
const access = (owner: 'process' | 'import.meta', tail: string): string => `${owner}.env${tail}`;

describe('env gate · THE POPULATION, before any claim about it', () => {
  const files = sourceFiles().map((f) => f.replace(/\\/g, '/'));

  it('⚠️ the source population is real and holds known-true members BY NAME', () => {
    // A count over an empty derivation reads exactly like a clean tree
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`), so membership is asserted, not size.
    expect(files.length).toBeGreaterThan(300);
    // One from each of the four places env vars are actually read, so a walk
    // that quietly stopped covering `scripts/`, the repo root or `gate/` is red.
    expect(files.some((f) => f.endsWith('/src/main.tsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('/middleware.js'))).toBe(true);
    expect(files.some((f) => f.endsWith('/scripts/gates.mjs'))).toBe(true);
    expect(files.some((f) => f.endsWith('/vite.config.ts'))).toBe(true);
    // …and THIS spec, which is the premise of the header's note about needles.
    expect(files.some((f) => f.endsWith('/src/lib/envGate/envExample.guard.test.ts'))).toBe(true);
    // The walk must not wander into dependencies or build output.
    expect(files.some((f) => f.includes('/node_modules/'))).toBe(false);
    expect(files.some((f) => f.includes('/dist/'))).toBe(false);
  });

  it('⚠️ and `.env.example` is on disk and parses to real names', () => {
    const listed = listedNames();
    expect(listed).toContain('VITE_CHAOS');
    expect(listed).toContain('GATE_SECRET');
    expect(listed).not.toContain('A_VARIABLE_NOBODY_DECLARED');
    // Prose in this file must not read as a declaration. The heading lines and
    // the `cp .env.example .env.local` instruction are the ones that would.
    expect(listed.every((n) => /^[A-Z][A-Z0-9_]*$/.test(n))).toBe(true);
  });
});

describe('env gate · THE MATCHER, before any claim about the tree', () => {
  it('⚠️ NAMES a dotted read, for BOTH owners', () => {
    expect(envNamesInSource(`const a = ${access('process', '.GATE_USER')};`)).toEqual(['GATE_USER']);
    expect(envNamesInSource(`const b = ${access('import.meta', '.VITE_CHAOS')};`)).toEqual([
      'VITE_CHAOS',
    ]);
  });

  it('⚠️ NAMES a bracketed read — the form this tree does not use TODAY', () => {
    expect(envNamesInSource(`const a = ${access('process', "['GATE_SECRET']")};`)).toEqual([
      'GATE_SECRET',
    ]);
    expect(envNamesInSource(`const b = ${access('import.meta', '["VITE_CHAOS_MIN_MS"]')};`)).toEqual(
      ['VITE_CHAOS_MIN_MS'],
    );
  });

  it('⚠️ ACQUITS a name that appears only in a COMMENT', () => {
    // Five source comments in this tree name env vars in prose. Counting them
    // would make `.env.example` document whatever a comment happened to say.
    // The acquittal must be on the merits, so the SAME source read as code is
    // convicted in the same assertion — an acquittal by not looking is the
    // failure this control exists to separate from a real one.
    const line = access('process', '.ONLY_IN_A_COMMENT');
    expect(envNamesInSource(`// ${line}\nconst x = 1;`)).toEqual([]);
    expect(envNamesInSource(`/* ${line} */\nconst x = 1;`)).toEqual([]);
    expect(envNamesInSource(`const x = ${line};`)).toEqual(['ONLY_IN_A_COMMENT']);
  });

  it('⚠️ DEFAULT-DENY — an access it cannot NAME is UNRESOLVED, never a pass', () => {
    // The shape that makes a name-only scan report CLEAN on a file reading three
    // secrets. It must arrive as a finding, not as silence.
    expect(envNamesInSource(`const { GATE_USER } = ${access('process', '')};`)).toEqual([null]);
    expect(envNamesInSource(`const all = { ...${access('process', '')} };`)).toEqual([null]);
    const key = 'k';
    expect(envNamesInSource(`const v = ${access('process', `[${key}]`)};`)).toEqual([null]);
  });

  it('⚠️ a source with no env access produces nothing — not simply always red', () => {
    expect(envNamesInSource(`import { join } from 'node:path';\nconst x = join('a', 'b');`)).toEqual(
      [],
    );
  });

  it('⚠️ and `listedNames` reads a dotenv file, not just any line with an "="', () => {
    expect(
      listedNames(
        [
          '# a heading with = a sign in it',
          '  Set to exactly "on" = no',
          'REAL_ONE=',
          '# COMMENTED_ONE=value',
          'lower_case=nope',
        ].join('\n'),
      ),
    ).toEqual(['REAL_ONE', 'COMMENTED_ONE']);
  });
});

describe('env gate · THE CLAIM', () => {
  const reads = envReads(sourceFiles());
  const listed = new Set(listedNames());
  const readNames = new Set(reads.filter((r) => r.name !== null).map((r) => r.name as string));

  it('⚠️ EVERY variable the code reads is listed in .env.example', () => {
    const undocumented = [...new Set(reads.filter((r) => r.name && !listed.has(r.name)))].map(
      (r) => `${r.file} reads ${r.name as string}`,
    );
    expect(
      undocumented,
      'A variable the tree reads and `.env.example` does not list is invisible to ' +
        'an engineer cloning this repository cold — which is the only way they ' +
        'will ever meet it. Add it to `.env.example` with its default and one ' +
        'line on what it does; if it is set by a platform or by the tooling and ' +
        'is not theirs to set, list it commented-out under section 4 and say so.',
    ).toEqual([]);
  });

  it('⚠️ and EVERY variable .env.example lists is really read', () => {
    // The other direction, without which the file accretes entries nobody can
    // refute and stops being evidence of anything.
    const decorative = [...listed].filter((n) => !readNames.has(n));
    expect(
      decorative,
      'A name in `.env.example` that nothing reads is a promise the tree does ' +
        'not keep. Delete it, or make it real.',
    ).toEqual([]);
  });

  it('⚠️ and NO env access was left UNRESOLVED', () => {
    const unresolved = reads.filter((r) => r.name === null).map((r) => `${r.file} (unnamed access)`);
    expect(
      unresolved,
      'An `env` access this gate cannot resolve to a NAME is refused rather ' +
        'than passed, so the gate\'s silence means one thing. Destructure after ' +
        'naming (`const u = process.env.GATE_USER`) rather than before it.',
    ).toEqual([]);
  });

  it('⚠️ ANTI-VACUITY — the run really examined reads, and they are NAMED', () => {
    // Without this the three assertions above are satisfied by a run in which
    // the matcher found nothing at all. `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`:
    // the shipped matcher, over the LIVE population, returning NAMED members —
    // never a count, because a count is satisfied by the wrong match.
    expect(readNames).toContain('GATE_SECRET'); // server-side, middleware.js
    expect(readNames).toContain('VITE_CHAOS_MIN_MS'); // client, withChaos.ts
    expect(readNames).toContain('VERCEL_ENV'); // build-time, vite.config.ts
    expect(readNames).toContain('GITHUB_ACTIONS'); // tooling, scripts/gates.mjs
    expect(readNames).toContain('MODE'); // vite built-in, queryClient.ts
    // And the needle-assembly note in this file's header is load-bearing: if it
    // ever stopped holding, these fixtures would appear here as real reads.
    expect(readNames).not.toContain('ONLY_IN_A_COMMENT');
    expect(readNames).not.toContain('A_VARIABLE_NOBODY_DECLARED');
  });

  it('⚠️ the two sides are the SAME SET, stated once as the thing being claimed', () => {
    expect([...readNames].sort()).toEqual([...listed].sort());
  });

  it('⚠️ `.env.example` is a file a person can actually copy', () => {
    const text = readFileSync(ENV_EXAMPLE, 'utf8');
    // Every listed name carries a stated default on a nearby line — the half of
    // the requirement a set comparison cannot see.
    expect(text).toMatch(/# default:/);
    expect(text.split(/\r?\n/).filter((l) => /^#\s*default:/.test(l.trim())).length).toBe(
      listed.size,
    );
  });
});
