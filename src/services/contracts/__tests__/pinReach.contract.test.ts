// @vitest-environment node
// -----------------------------------------------------------------------------
// ⚠️ EVERY PINNED CONTRACT STATES ITS PIN'S REACH, AND THE STATEMENT CANNOT DRIFT.
//
// ⚠️ **THE DEFECT THIS EXISTS AGAINST IS A READER'S ASSUMPTION, NOT A BROKEN
// GATE.** Twice in this corpus a pinned document was believed to guard a clause
// it never reached: a DTO field's MEANING assumed covered by a method-surface
// pin, and a repaired defect still asserted as current in a document whose pin
// passed — because that pin only checks that an unenforced row SAYS it is
// unenforced. **Both gates were working exactly as specified.** What was missing
// was any way for a reader to see where the guarding stopped.
//
// ⚠️ **A LIST OF GUARDED THINGS READS AS COMPLETENESS.** So each block states
// BOTH halves, and this file asserts the guarded half is EQUAL to the pin's own
// `describe` titles — both directions. Widen a pin without listing the new
// assertion and it reddens; drop a line from a block without narrowing the pin
// and it reddens too. **A reach statement that can drift is the overclaim one
// layer up**, which is the thing the block is for.
//
// ── WHAT A "PIN" IS HERE, AND THE TWO MATCHERS THAT GOT IT WRONG FIRST ───────
//   A pin READS THE DOCUMENT'S BYTES and asserts over them. Derived as: a module
//   naming the contract file AND calling `readFileSync`, plus any spec importing
//   such a module (the pins keep their derivations in sibling helpers, so a
//   spec-only matcher misses C11 and C12 entirely — it returned 0 for both).
//
//   ⚠️ **AND THE FIX FOR THAT OVER-WIDENED IN THE OTHER DIRECTION.** Following
//   every import hop swept in eleven specs that merely import a types module
//   whose COMMENT cites a contract. A comment citing a document is a POINTER,
//   not a pin. `readFileSync` is what separates them, and heuristic rule 2 is
//   the reason both halves are controlled below rather than one.
//
// ── §86 — THE POPULATION IS NOT DERIVED THROUGH THE THING UNDER TEST ─────────
//   The document half is markdown; the tree half is source text. A block edited
//   in a contract cannot change which specs exist, so this file can always tell
//   "I caught it" from "I have nothing to look at".
// -----------------------------------------------------------------------------
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CDIR = join(ROOT, 'docs', 'contracts');
/** This file's own path — see the self-exclusion in `sourceModules`. */
const SELF = join(ROOT, 'src', 'services', 'contracts', '__tests__', 'pinReach.contract.test.ts')
  .split('\\')
  .join('/');

const HEADING = '## Pin reach';
const NOT_GUARDED = 'NOT GUARDED — EVERYTHING ELSE ON THIS PAGE';
const SELF_PINNED = 'THIS BLOCK IS SELF-PINNED';

/**
 * ⚠️ **A GENERATED DOCUMENT IS NOT AN AUTHORED CONTRACT, AND THE GATES FOUND
 * THAT RATHER THAN REVIEW.** `C9-required-fields.md` is a `toMatchFileSnapshot`
 * rendering of the SDC material-master types module — its header says *"GENERATED …
 * DO NOT EDIT BY HAND"* — so appending a reach block to it reddened the snapshot
 * assertion that owns it. A pin reads it, which is why the first derivation
 * swept it in; the derivation was asking the wrong question.
 *
 * **The marker is read from the document's own bytes rather than listed here**,
 * so a second generated contract is excluded the day it is written, with no edit
 * to this file.
 */
const GENERATED = /GENERATED FROM|DO NOT EDIT BY HAND/;

/**
 * ⚠️ **THE MARKER IS A HEADER DIRECTIVE, AND IT IS READ ONLY IN THE HEADER.**
 * Scanning the whole file for it excluded `C11-invariants.md` — because V19's
 * own text QUOTES the marker while describing this rule. **A document that
 * MENTIONS a directive is not carrying it**, which is the same distinction that
 * separates a pin from a comment citing a contract, and it failed here on the
 * file that states the rule. Twenty lines is the header; a generated file
 * declares itself at the top or it is not declaring itself to a reader.
 */
const isGenerated = (file: string): boolean =>
  GENERATED.test(readFileSync(join(CDIR, file), 'utf8').split('\n').slice(0, 20).join('\n'));

const contracts = (): string[] =>
  readdirSync(CDIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .filter((f) => !isGenerated(f));

/** Every `.ts`/`.tsx` module under `src/`, with its text. */
function sourceModules(): Map<string, string> {
  const m = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) m.set(p.replace(/\\/g, '/'), readFileSync(p, 'utf8'));
    }
  };
  walk(join(ROOT, 'src'));
  // ⚠️ THIS FILE REMOVES ITSELF, AND THE REASON IS §86.
  // It NAMES contract files (in the controls below) and it READS files, so the
  // reader test would classify it as a pin for every contract it mentions and
  // then demand its own describe titles appear in those blocks. The gate would
  // be deriving its population THROUGH the thing it is probing.  hit the identical trap from the other side — its own spec
  // contained the two invented field names it asserts are ABSENT — and the
  // remedy is the same one: scope the corpus so the instrument is not in it.
  m.delete(SELF);
  return m;
}

const MODULES = sourceModules();
const DESCRIBE = /^describe\(\s*['"`](.+?)['"`]\s*,/gm;

const titlesIn = (src: string): string[] =>
  [...src.matchAll(DESCRIBE)].map((x) => x[1]);

const isSpec = (src: string): boolean => {
  DESCRIBE.lastIndex = 0;
  return /^describe\(/m.test(src);
};

/** Local modules a spec imports, resolved under `src/`. */
function importsOf(path: string): string[] {
  const src = MODULES.get(path) ?? '';
  const found: string[] = [];
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    const base = resolve(dirname(path), m[1]).replace(/\\/g, '/');
    for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (MODULES.has(cand)) found.push(cand);
    }
  }
  return found;
}

/** contract file -> the specs that assert over its BYTES. */
function pinnedContracts(): Map<string, string[]> {
  const outMap = new Map<string, string[]>();
  for (const c of contracts()) {
    const readers = [...MODULES.entries()]
      .filter(([, t]) => t.includes(c) && t.includes('readFileSync'))
      .map(([p]) => p);
    if (readers.length === 0) continue;
    const owners = [...MODULES.entries()]
      .filter(([p, t]) => isSpec(t) && (readers.includes(p) || importsOf(p).some((h) => readers.includes(h))))
      .map(([p]) => p)
      .sort();
    if (owners.length > 0) outMap.set(c, owners);
  }
  return outMap;
}

const PINNED = pinnedContracts();

/** The `## Pin reach` block's GUARDED bullet list, in document order. */
function guardedListed(contract: string): string[] {
  const md = readFileSync(join(CDIR, contract), 'utf8').replace(/\r\n/g, '\n');
  // ⚠️ **ANCHOR ON THE HEADING AT LINE START, NEVER ON THE SUBSTRING.** `indexOf`
  // found the words `## Pin reach` inside C12's own PROSE about pin-reach blocks
  // and inside C11's V19 row, so the window opened pages early and swallowed
  // every unrelated bullet between there and the real block — the block then
  // "claimed" assertions its pin never makes. A section parser reading from a
  // substring is a sampling instrument, and reading a list out of a sample is
  // the same error one layer up.
  const m = /^## Pin reach\s*$/m.exec(md);
  if (m === null) return [];
  const body = md.slice(m.index);
  const stop = body.indexOf(NOT_GUARDED);
  return [...(stop === -1 ? body : body.slice(0, stop)).matchAll(/^- (.+)$/gm)].map((x) => x[1].trim());
}

/** The union of `describe` titles across a contract's pin specs, in order. */
function guardedDerived(contract: string): string[] {
  const seen: string[] = [];
  for (const s of PINNED.get(contract) ?? []) {
    for (const t of titlesIn(MODULES.get(s) ?? '')) {
      if (!seen.includes(t)) seen.push(t);
    }
  }
  return seen;
}

describe('POPULATION CONTROLS — before any block is believed', () => {
  it('the contract directory and the source tree were both read', () => {
    expect(contracts().length).toBeGreaterThan(8);
    expect(MODULES.size).toBeGreaterThan(200);
  });

  it('⚠️ KNOWN-GOOD — contracts with a real pin are IN the population', () => {
    expect([...PINNED.keys()].sort()).toContain('C11-invariants.md');
    expect([...PINNED.keys()].sort()).toContain('C12-backend-spec.md');
    expect([...PINNED.keys()].sort()).toContain('C1-methods.md');
  });

  it('⚠️ KNOWN-BAD — a contract nothing reads is OUT, and a COMMENT is not a pin', () => {
    // `C4-snowflake.md` is named by nothing. `C2-schemas.md` is named only by a
    // comment in `dayProjection.ts`, which cites it BY LINE NUMBER — a pointer,
    // not an instrument. An earlier matcher counted it and was wrong.
    expect([...PINNED.keys()]).not.toContain('C4-snowflake.md');
    expect([...PINNED.keys()]).not.toContain('C2-schemas.md');
  });

  it('⚠️ a GENERATED document is excluded, and one really exists to exclude', () => {
    const all = readdirSync(CDIR).filter((f) => f.endsWith('.md') && f !== 'README.md');
    // KNOWN-GOOD: one really exists to exclude. If this returns [], the
    // exclusion is untested rather than unnecessary.
    expect(all.filter(isGenerated)).toContain('C9-required-fields.md');
    expect(contracts()).not.toContain('C9-required-fields.md');
    expect([...PINNED.keys()]).not.toContain('C9-required-fields.md');
    // ⚠️ KNOWN-BAD: a document that merely QUOTES the marker in its prose is NOT
    // generated. C11's V19 row does exactly that, and a whole-file scan excluded
    // the document that states the rule.
    expect(GENERATED.test(readFileSync(join(CDIR, 'C11-invariants.md'), 'utf8'))).toBe(true);
    expect(isGenerated('C11-invariants.md')).toBe(false);
    expect(contracts()).toContain('C11-invariants.md');
  });

  it('every pin spec really declares assertions — an empty spec would make equality vacuous', () => {
    for (const [c, specs] of PINNED) {
      for (const s of specs) {
        expect(titlesIn(MODULES.get(s) ?? '').length, `${c} <- ${s}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('⚠️ EVERY PINNED CONTRACT CARRIES A `## Pin reach` BLOCK', () => {
  it('with both halves stated, and the self-pin named', () => {
    const missing: string[] = [];
    for (const c of PINNED.keys()) {
      const md = readFileSync(join(CDIR, c), 'utf8');
      if (!/^## Pin reach\s*$/m.test(md)) missing.push(`${c}: no ${HEADING}`);
      else if (!md.includes(NOT_GUARDED)) missing.push(`${c}: guarded half only`);
      else if (!md.includes(SELF_PINNED)) missing.push(`${c}: block does not say it is self-pinned`);
    }
    expect(missing).toEqual([]);
  });

  it('⚠️ and an UNPINNED contract does not claim one — the reverse half', () => {
    const bogus: string[] = [];
    for (const c of contracts()) {
      if (PINNED.has(c)) continue;
      if (/^## Pin reach\s*$/m.test(readFileSync(join(CDIR, c), 'utf8'))) bogus.push(c);
    }
    expect(bogus).toEqual([]);
  });
});

describe('⚠️ THE BLOCK EQUALS THE PIN — both directions, per contract', () => {
  for (const c of [...PINNED.keys()].sort()) {
    it(`${c} — listed === derived`, () => {
      const derived = guardedDerived(c);
      const listed = guardedListed(c);
      expect(derived.length, 'the derivation returned nothing').toBeGreaterThan(0);
      // FORWARD: the pin gained an assertion the block does not list.
      expect(derived.filter((t) => !listed.includes(t)), 'in the PIN, missing from the block').toEqual([]);
      // REVERSE: the block claims an assertion the pin does not make.
      expect(listed.filter((t) => !derived.includes(t)), 'in the BLOCK, absent from the pin').toEqual([]);
    });
  }
});
