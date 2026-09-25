// ─────────────────────────────────────────────────────────────────────────────
// THE GUARD — the README's repository map names paths that exist, and names
// every top-level `src/` directory.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR IS MEASURED, NOT IMAGINED, AND IT IS THIS
// FILE'S OWN PREDECESSOR.** Until the handover pass, README's "Project
// Structure" block described `src/components/layout/`, `src/components/shared/`
// and `src/theme/` — none of which exist — and attributed five buyer pages and
// six supplier pages to `src/pages/`, which today holds exactly one file. It
// also promised "Coming Soon" placeholders for pages that have since been
// built. Every one of those claims was true when it was typed. **Nothing in the
// build could fail when they stopped being true**, which is `FLOOR-IN-PROSE-01`
// with a directory standing in for a number, and the ratified remedy is not a
// fresher paragraph — it is a derivation.
//
// ⚠️ **SO THE MAP IS PINNED IN BOTH DIRECTIONS.** Naming a path that does not
// exist is red (the rot above); and a top-level `src/` directory the map does
// not name is red too, because a map that may silently omit things is not a map
// a new engineer can rely on. One direction alone leaves the other open: the
// first lets the map shrink to nothing and stay green, the second lets it fill
// with paths that were deleted years ago.
//
// ⚠️ **WHAT THIS DOES NOT CLAIM.** It checks that the paths are REAL, never that
// the prose beside them is accurate. A gate that tried to check what a sentence
// MEANS would fire on the paragraph describing the defect it replaced — this
// tree has already ruled on that, at `scripts/gates.mjs`, and the ruling stands.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/treeMutationGate/derive';

const README = join(REPO_ROOT, 'README.md');

/** A token that looks like a path: a directory (trailing `/`) or a source file. */
const PATH_TOKEN = /^(?:[\w.@-]+\/)*(?:[\w.@-]+\/|[\w.@-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|css|html))$/;

export interface MapEntry {
  readonly token: string;
  /** Where the map places it: the repo root, `src/`, or `src/services/`. */
  readonly base: string;
}

/**
 * Every path the README's repository map names, with the base it is drawn
 * against.
 *
 * The map is an ASCII tree, so the BASE is decided by the line's own drawing:
 *   · a line starting in column 0        -> the repository root
 *   · a line starting `|--` / `` `-- ``  -> `src/`, the tree it is drawn inside
 *   · a line starting with the vertical  -> `src/services/`, the one sub-block
 * A continuation line of prose starts with the vertical too, which is why only
 * the FIRST token of a line is ever considered, and only when it looks like a
 * path. `cross-page features, ...` is prose; `transitions/` is not.
 */
export function readmeMapEntries(text: string = readFileSync(README, 'utf8')): MapEntry[] {
  const fences = text.split('```');
  // The map is the fenced block that draws `src/` as a tree.
  const block = fences.find((f) => /^src\/\s*$/m.test(f) && f.includes('├──'));
  if (block === undefined) return [];

  const out: MapEntry[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    let base: string;
    if (/^[\w.]/.test(line)) base = REPO_ROOT;
    else if (/^\s*[├└]──\s/.test(line)) base = join(REPO_ROOT, 'src');
    else if (/^\s*│/.test(line)) base = join(REPO_ROOT, 'src', 'services');
    else continue;

    const token = line.replace(/^[\s│├└─]+/, '').split(/\s+/)[0];
    if (token && PATH_TOKEN.test(token)) out.push({ token, base });
  }
  return out;
}

describe('README repository map · THE POPULATION, before any claim about it', () => {
  const entries = readmeMapEntries();

  it('⚠️ the map parses, and holds known-true members AT THE RIGHT BASE', () => {
    // A parse that silently returned nothing would make every assertion below
    // pass over an empty set (`EMPTY-INPUT-REPORTS-CLEAN-01`), so membership is
    // asserted and the BASE is asserted with it — a token found under the wrong
    // base would resolve against the wrong directory and prove nothing.
    expect(entries.length).toBeGreaterThan(20);
    const at = (token: string) => entries.find((e) => e.token === token)?.base;
    expect(at('middleware.js')).toBe(REPO_ROOT); // column 0
    expect(at('docs/contracts/')).toBe(REPO_ROOT); // column 0, nested token
    expect(at('services/')).toBe(join(REPO_ROOT, 'src')); // a tree branch
    expect(at('transitions/')).toBe(join(REPO_ROOT, 'src', 'services')); // the sub-block
  });

  it('⚠️ and PROSE inside the map is not read as a path', () => {
    // The continuation lines start with the same vertical the sub-block does.
    // If they were read as paths, this gate would demand directories named
    // after half-sentences — and would then be "fixed" by loosening it.
    const tokens = entries.map((e) => e.token);
    expect(tokens).not.toContain('cross-page');
    expect(tokens).not.toContain('communication');
    expect(tokens).not.toContain('source-derived');
    // The bilateral half: a real path on a vertical line IS read.
    expect(tokens).toContain('liveness/');
  });
});

describe('README repository map · THE CLAIM', () => {
  it('⚠️ every path the map names EXISTS', () => {
    const missing = readmeMapEntries()
      .filter((e) => !existsSync(join(e.base, e.token)))
      .map((e) => `${e.token} (looked under ${e.base.replace(/\\/g, '/')})`);
    expect(
      missing,
      "The README's repository map names a path that is not on disk. This is the " +
        'exact rot the map was rewritten to end: the previous one described ' +
        '`src/components/layout/`, `src/components/shared/` and `src/theme/` ' +
        'long after all three were gone. Fix the map, not this test.',
    ).toEqual([]);
  });

  it('⚠️ and every top-level src/ directory is NAMED in the map', () => {
    const src = join(REPO_ROOT, 'src');
    const onDisk = readdirSync(src).filter((n) => statSync(join(src, n)).isDirectory());
    const named = new Set(
      readmeMapEntries()
        .filter((e) => e.base === src)
        .map((e) => e.token.replace(/\/$/, '')),
    );
    const unlisted = onDisk.filter((d) => !named.has(d));
    expect(
      unlisted,
      'A directory under `src/` that the README does not mention is invisible to ' +
        'the engineer the map exists for. Add a line for it — a map that may ' +
        'silently omit things is not a map anybody can rely on.',
    ).toEqual([]);
  });

  it('⚠️ the Quick start still points at commands package.json really has', () => {
    // The other half of "clone to running app": a README naming a script that
    // was renamed sends a new engineer to a dead end on their first command.
    const text = readFileSync(README, 'utf8');
    const scripts = Object.keys(
      (JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      }).scripts,
    );
    const promised = [...text.matchAll(/`npm run ([\w:]+)`/g)].map((m) => m[1]);
    expect(promised.length).toBeGreaterThan(4); // the map above is not empty
    expect(promised).toContain('gates'); // named, never counted
    expect([...new Set(promised)].filter((s) => !scripts.includes(s))).toEqual([]);
  });
});
