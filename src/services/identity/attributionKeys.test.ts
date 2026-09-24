import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { ATTRIBUTION_KEYS, attributionKeysIn, isAttributionKey } from './attributionKeys';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';

// ─────────────────────────────────────────────────────────────────────────────
// THE ATTRIBUTION-KEY POPULATION — pinned to the TYPE, in both directions.
//
// ⚠️ **THE POPULATION IS "EVERY FIELD DECLARED `ActorAttribution`", NOT "EVERY
// FIELD WRITTEN FROM `scope.actor`" — AND THE SECOND WAS TRIED FIRST AND WAS
// WRONG.** A grep for `\w+By:\s*scope\.actor` returns SIX keys and reads like an
// answer. It misses `proposedBy`, `publishedBy` and `capDecidedBy`, which
// `MockCommandService` assigns through a local (`const actor = scope.actor ??
// NO_PERSON`) rather than inline — `RESOLVE-NON-LITERAL-IDS-01` applied to a
// census of write sites instead of one of dispatch ids. It also misses `setBy`
// and `overriddenBy`, which were not written from `scope.actor` at all.
//
// ⚠️ **AND THE RIGHT QUESTION IS NOT "WHAT DO WE WRITE?" BUT "WHERE COULD AN
// ACTOR COME TO REST?"** A field typed `ActorAttribution` is a field a forged
// actor could land in, whether or not any shipped code writes it today.
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..', '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

/**
 * Every property name declared with type `ActorAttribution` (or a union with
 * it) anywhere in `src/`, read through TypeScript's own parser.
 *
 * ⚠️ **THE PARSER, NOT A REGEX** — `stripComments.ts`'s argument, one layer up:
 * a declaration can wrap across lines, carry a `| null`, or sit behind
 * `readonly`, and a line-oriented matcher gets at least one of those wrong.
 *
 * ⚠️ **AND `actor` IS EXCLUDED BY A STATED RULE RATHER THAN BY NAME.** It is the
 * `QueryScope`'s OWN field — the session seam — so refusing it in a payload
 * would be refusing the thing that replaces payload attribution. The rule is
 * "declared on a scope or a dispatcher parameter, not on a stored record", and
 * it is applied by checking the enclosing declaration rather than by listing the
 * word.
 */
function attributionFields(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of sourceFiles(SRC)) {
    if (/\.test\.tsx?$/.test(file)) continue;
    const text = stripSourceComments(fs.readFileSync(file, 'utf8'), 'blank', file);
    const sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      if (
        (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) &&
        node.type &&
        /\bActorAttribution\b/.test(node.type.getText(sf)) &&
        ts.isIdentifier(node.name)
      ) {
        const key = node.name.text;
        const rel = path.relative(SRC, file).split(path.sep).join('/');
        found.set(key, [...(found.get(key) ?? []), rel]);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
  }
  return found;
}

/**
 * The seam's own field. Excluded from the refusable set by RULE: it is how an
 * actor legitimately reaches the dispatcher, so refusing it would refuse the
 * replacement for the thing being refused.
 */
const SEAM_FIELD = 'actor';

describe('POPULATION GUARD — the derivation sees the tree', () => {
  const fields = attributionFields();

  it('finds a real, non-trivial population', () => {
    // §42b: a clean answer over an empty population is indistinguishable from a
    // correct one. Membership, never a bare count.
    expect(fields.size).toBeGreaterThan(5);
    expect([...fields.keys()]).toContain('setBy');
    expect([...fields.keys()]).toContain('proposedBy');
    // The known-FALSE control: a field this tree does not have must be absent.
    expect([...fields.keys()]).not.toContain('signedByWhoever');
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);

  it('⚠️ FINDS THE THREE A WRITE-SITE GREP MISSES — the defect this replaced', () => {
    // `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: these three are exactly what the
    // first (write-site) derivation lost, because `MockCommandService` assigns
    // them through a local rather than inline. Naming them keeps the parser
    // derivation honest about the thing it was chosen for.
    for (const key of ['proposedBy', 'publishedBy', 'capDecidedBy']) {
      expect([...fields.keys()], `${key} is what the write-site grep missed`).toContain(key);
    }
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);
});

describe('⚠️ ATTRIBUTION_KEYS IS PINNED TO THE TYPE — both directions', () => {
  const derived = [...attributionFields().keys()].filter((k) => k !== SEAM_FIELD).sort();

  it('every declared attribution field is refusable', () => {
    const missing = derived.filter((k) => !ATTRIBUTION_KEYS.includes(k));
    expect(
      missing,
      'a field typed ActorAttribution is NOT refused in a payload — a forged actor\n' +
        'could come to rest there (C10 §6.2):\n' +
        missing.join('\n'),
    ).toEqual([]);
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);

  it('every refusable key is a declared attribution field', () => {
    const orphan = ATTRIBUTION_KEYS.filter((k) => !derived.includes(k));
    expect(
      orphan,
      'the refusal names keys nothing declares — a stale list refusing ghosts:\n' +
        orphan.join('\n'),
    ).toEqual([]);
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);

  it('⚠️ AND THE SEAM FIELD IS DELIBERATELY NOT REFUSABLE', () => {
    // `scope.actor` is how an actor legitimately arrives. Refusing it would
    // refuse the replacement for the thing this whole gate exists to refuse.
    expect(attributionFields().has(SEAM_FIELD)).toBe(true);
    expect(ATTRIBUTION_KEYS).not.toContain(SEAM_FIELD);
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);
});

describe('attributionKeysIn — presence, not truthiness', () => {
  it('reports a key the caller wrote, whatever its value', () => {
    expect(attributionKeysIn({ setBy: undefined })).toEqual(['setBy']);
    expect(attributionKeysIn({ setBy: null })).toEqual(['setBy']);
    expect(attributionKeysIn({ grantedBy: { kind: 'UNATTRIBUTED' } })).toEqual(['grantedBy']);
  });

  it('⚠️ A CLEAN PAYLOAD IS CLEAN — the known-GOOD half', () => {
    // Without this, a function that returned every key unconditionally would
    // pass the case above and refuse every command in the portal.
    expect(attributionKeysIn({ mode: 'BLOCK', reviewBy: '2027-01-31' })).toEqual([]);
    expect(attributionKeysIn({})).toEqual([]);
  });

  it('reports EVERY key present, not the first', () => {
    expect([...attributionKeysIn({ setBy: 1, grantedBy: 2 })].sort()).toEqual(['grantedBy', 'setBy']);
  });

  it('isAttributionKey agrees with the array, both ways', () => {
    for (const k of ATTRIBUTION_KEYS) expect(isAttributionKey(k)).toBe(true);
    expect(isAttributionKey('mode')).toBe(false);
    expect(isAttributionKey(SEAM_FIELD)).toBe(false);
  });
});
