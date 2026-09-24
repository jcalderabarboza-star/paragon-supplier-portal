// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ EVERY REFUSAL THAT NAMES A PERSON IS ACCOUNTED FOR — DERIVED, NOT LISTED.
//
// The population is "which shipped hook refusals interpolate a `personId`?",
// and it is read out of `policies.ts` — the file that emits them — rather than
// written here. A hand list would be a second vocabulary and would go stale the
// first time a hook was added (`ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`), which
// is exactly how the defect this module fixes survived: the material-request
// refusal had no head, nothing enumerated it, and it reached a reader.
//
// ── ⚠️ THE POPULATION IS THREE AND IS DISPOSED OF THREE DIFFERENT WAYS ─────
//   Each head must be accounted for, and the accounting is asserted:
//     · `PSL_DECIDER_IS_PROPOSER`             → owned by `PSL_REFUSAL_KEYS`;
//     · `MATERIALREQUEST_DECIDER_IS_REQUESTER`→ owned here;
//     · `SAMPLE_ACTOR_CANNOT_LOOSEN`          → UNREACHABLE from any surface,
//       and the unreachability is asserted rather than assumed, so the day a
//       surface dispatches `t_enforcement_set` this goes red and asks for copy.
//
//   A head accounted for NOWHERE is a refusal that will reach a reader in a
//   developer's English with an internal id inside it. That is the failure this
//   file exists to make impossible to ship quietly.
//
// ── ⚠️ AND BOTH DIRECTIONS, BECAUSE ONE PASSES OVER AN EMPTY MAP (§39) ─────
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripSourceComments } from '../lib/sourceScan/stripComments';
import { PERSON_NAMING_REFUSAL_KEYS, personNamingRefusalKey } from './personNamingRefusal';
import { PSL_REFUSAL_KEYS } from './psl/pslRefusal';
import { identityEn, identityId } from '../lib/i18n/identity';
import { SAMPLE_PERSON_PREFIX } from '../services/identity/sampleRoster';

const POLICIES = resolve(process.cwd(), 'src/services/transitions/policies.ts');
const SRC = resolve(process.cwd(), 'src');

/**
 * Every refusal HEAD whose sentence interpolates a `personId`.
 *
 * ⚠️ **COMMENTS ARE STRIPPED FIRST, AND THIS LANE IS WHY.** `policies.ts`'s own
 * comments quote the defective sentence verbatim — including the head and the
 * `personId` — so a scan that read comments as code would derive heads nobody
 * emits and demand copy for them. Three matchers written in this batch made
 * exactly that false accusation before being repointed at the shared stripper.
 *
 * ⚠️ **AND THE HEAD IS TAKEN FROM THE TEXT BEFORE THE CALL, NOT FROM A LIST.**
 * `personRefusalToken(` is the one producer of a rendered `personId` in the
 * service layer, so each call site is a person-naming refusal by construction;
 * the head is the last `UPPER_SNAKE:` that precedes it inside the same reason.
 */
function personNamingHeads(): readonly string[] {
  const code = stripSourceComments(readFileSync(POLICIES, 'utf8'), 'blank', POLICIES);
  const heads: string[] = [];
  for (const m of code.matchAll(/personRefusalToken\(/g)) {
    const at = m.index ?? 0;
    const before = code.slice(Math.max(0, at - 200), at);
    // ⚠️ **THE BACKTICK IS LOAD-BEARING, AND MY OWN CONTROL IS WHAT PUT IT
    // THERE.** The first matcher asked only for `UPPER_SNAKE:` followed by a
    // space — which `const SOME_CONSTANT: string` satisfies, so a type
    // annotation sitting nearer the call than the head would have been reported
    // AS the head. A reason head always OPENS a template literal, and nothing
    // else in TypeScript does.
    const found = [...before.matchAll(/`([A-Z][A-Z0-9_]{4,}):(?= |\$\{)/g)];
    if (found.length > 0) heads.push(found[found.length - 1][1]);
  }
  return [...new Set(heads)].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the derivation reads the shipped hooks', () => {
  it('⚠️ IT FINDS THE KNOWN MEMBERS BY NAME, NEVER A COUNT', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: over an empty head set every direction
    // below passes having examined nothing. A count would be satisfied by the
    // wrong three.
    const heads = personNamingHeads();
    expect(heads).toContain('PSL_DECIDER_IS_PROPOSER');
    expect(heads).toContain('MATERIALREQUEST_DECIDER_IS_REQUESTER');
    expect(heads).toContain('SAMPLE_ACTOR_CANNOT_LOOSEN');
  });

  it('⚠️ AND COMMENTS CANNOT BE MISTAKEN FOR EMISSIONS — the known-false control', () => {
    // `policies.ts` really does quote the defective sentence in a comment, so
    // this is not hypothetical: without the stripper the derivation reports a
    // head that no hook emits.
    const commented = stripSourceComments(
      "// FAKE_HEAD_NOT_EMITTED: ${personRefusalToken(x)}\nconst y = 1;\n",
      'blank',
      'probe.ts',
    );
    expect(/FAKE_HEAD_NOT_EMITTED/.test(commented)).toBe(false);
  });

  it('⚠️ A TYPE ANNOTATION IS NOT A REASON HEAD — probed BOTH ways', () => {
    // ⚠️ **THIS CONTROL FIRED ON ITS FIRST RUN AND CHANGED THE MATCHER.** The
    // derivation originally asked for `UPPER_SNAKE:` followed by a space, and
    // `const SOME_CONSTANT: string` matches that — so a type annotation sitting
    // nearer a call than the head would have been captured instead of it. Rule
    // 2, on a proximity window, caught only because the known-BAD input was
    // written down beside the known-good one.
    const HEAD = /`([A-Z][A-Z0-9_]{4,}):(?= |\$\{)/;
    expect(HEAD.test('const SOME_CONSTANT: string = x;\n')).toBe(false);
    expect(HEAD.test('  reason: { KEY_LIKE_THIS: 1 },\n')).toBe(false);
    // And the known-GOOD inputs, or the tightening above would have made an
    // assertion that cannot fail (rule 4).
    expect(HEAD.test('`A_REAL_HEAD: the sentence`')).toBe(true);
    expect(HEAD.test('`A_REAL_HEAD: ${token(x)}`')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EVERY PERSON-NAMING HEAD IS ACCOUNTED FOR', () => {
  /**
   * A head is REACHABLE by a reader only if some surface can dispatch the verb
   * that runs its hook. `t_enforcement_set` has no dispatcher outside the
   * service layer and the specs — derived here rather than asserted in prose,
   * because the claim is what licenses shipping that refusal untranslated.
   */
  function enforcementSetIsDispatchableFromASurface(): boolean {
    const files = [
      ...walk(resolve(SRC, 'pages-v2')),
      ...walk(resolve(SRC, 'components')),
      ...walk(resolve(SRC, 'hooks')),
    ];
    return files.some((f) => {
      const code = stripSourceComments(readFileSync(f, 'utf8'), 'blank', f);
      return code.includes("'t_enforcement_set'") || code.includes('"t_enforcement_set"');
    });
  }

  it('every head is owned by a key map, or is provably unreachable', () => {
    const unaccounted = personNamingHeads().filter(
      (h) =>
        !(h in PERSON_NAMING_REFUSAL_KEYS) &&
        !(h in PSL_REFUSAL_KEYS) &&
        h !== 'SAMPLE_ACTOR_CANNOT_LOOSEN',
    );
    expect(
      unaccounted,
      `these refusals would reach a reader with a personId inside: ${unaccounted}`,
    ).toEqual([]);
  });

  it('⚠️ AND THE ONE EXEMPTION IS EARNED EVERY RUN — no surface dispatches t_enforcement_set', () => {
    // The moment one does, `SAMPLE_ACTOR_CANNOT_LOOSEN` becomes reader-facing
    // and needs copy. This is the assertion that says so instead of a comment.
    expect(enforcementSetIsDispatchableFromASurface()).toBe(false);
  });

  it('⚠️ AND EVERY KEY HERE NAMES A HEAD SOME HOOK EMITS — no orphans', () => {
    const emitted = new Set(personNamingHeads());
    const orphans = Object.keys(PERSON_NAMING_REFUSAL_KEYS).filter((h) => !emitted.has(h));
    expect(orphans, `these keys outlived their refusal: ${orphans}`).toEqual([]);
  });

  it('every mapped key EXISTS in both locales, with different words', () => {
    for (const key of Object.values(PERSON_NAMING_REFUSAL_KEYS)) {
      expect(identityEn[key], `EN is missing ${key}`).toBeTruthy();
      expect(identityId[key], `ID is missing ${key}`).toBeTruthy();
      // A key whose ID value is the English sentence is an untranslated string
      // wearing a translated key's clothes.
      expect(identityId[key], `${key} is identical in both locales`).not.toBe(identityEn[key]);
      // And both must carry the interpolation, or the person silently vanishes
      // from the copy in one locale only.
      expect(identityEn[key]).toContain('{{person}}');
      expect(identityId[key]).toContain('{{person}}');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE RESOLVER — probed at a real dispatcher reason shape', () => {
  it('it finds the head inside a `POLICY_REJECTED:<hook>:<reason>` envelope', () => {
    // The shape a surface actually receives, and the one that leaked: matching
    // at position zero would find nothing.
    // ⚠️ The person id is BUILT FROM THE PREFIX CONSTANT rather than written as
    // a literal: the C10 §6.3 pin refuses a module minting a fixture person id
    // of its own, and no entitlement was added for this spec.
    const real =
      'POLICY_REJECTED:materialrequest_decider_not_requester:' +
      `MATERIALREQUEST_DECIDER_IS_REQUESTER: the requester (${SAMPLE_PERSON_PREFIX}procurement-1) ` +
      'may not also decide…';
    expect(personNamingRefusalKey(real)).toBe('identity.refusal.deciderIsRequester');
  });

  it('⚠️ AND IT RETURNS `null` FOR A REASON IT DOES NOT OWN — every fallback survives', () => {
    expect(personNamingRefusalKey('ROLE_NOT_PERMITTED:materialRequest:decide')).toBeNull();
    expect(personNamingRefusalKey('MISSING_FIELDS:justification')).toBeNull();
    expect(personNamingRefusalKey('PSL_DECIDER_IS_PROPOSER: …')).toBeNull();
    expect(personNamingRefusalKey(undefined)).toBeNull();
    expect(personNamingRefusalKey('')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}
