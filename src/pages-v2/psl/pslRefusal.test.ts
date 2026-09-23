// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ EVERY PSL REFUSAL HAS WORDS IN BOTH LOCALES — BOTH DIRECTIONS.
//
// The defect this guards is already on this tree's record. Browser QA (Wave E)
// found an Indonesian operator reading an English sentence assembled out of a
// dispatcher constant, and `refusalMessage.ts` exists because of it. Fifteen
// new hooks could have re-created it fifteen times.
//
// ── ⚠️ THE POPULATION IS DERIVED FROM THE SHIPPED HOOKS ────────────────────
//   The heads are read out of `policies.ts` — the file that actually emits
//   them — rather than listed here. A hand list would be a second vocabulary
//   and would go stale the first time a hook was added, which is
//   `ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`.
//
//   BOTH directions are asserted, because a one-sided assertion passes over an
//   empty map (§39):
//     · every head the hooks emit HAS a key  — a new hook cannot ship untranslated;
//     · every key here NAMES a head some hook emits — a key cannot outlive the
//       refusal it was written for (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { PSL_REFUSAL_KEYS, pslRefusalKey } from './pslRefusal';
import { pslEn, pslId } from '../../lib/i18n/psl';

const POLICIES = resolve(process.cwd(), 'src/services/transitions/policies.ts');

/**
 * Every `PSL_<HEAD>:` a shipped hook emits.
 *
 * ⚠️ Comments are STRIPPED first, so a head DISCUSSED in prose — and this
 * lane's comments discuss several — cannot be mistaken for one emitted.
 */
function emittedHeads(): readonly string[] {
  const code = stripSourceComments(readFileSync(POLICIES, 'utf8'), 'blank', POLICIES);
  return [...new Set([...code.matchAll(/\b(PSL_[A-Z0-9_]+):/g)].map((m) => m[1]))].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the derivation reads the shipped hooks', () => {
  it('⚠️ THE MATCHER FINDS HEADS, AND KNOWN MEMBERS BY NAME', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: over an empty head set both directions
    // below pass having examined nothing.
    const heads = emittedHeads();
    expect(heads.length).toBeGreaterThan(10);
    expect(heads).toContain('PSL_SUPPLIER_UNKNOWN');
    expect(heads).toContain('PSL_CAP_ABOVE_CEILING');
    expect(heads).toContain('PSL_SEAT_HOLDS_BOTH_AUTHORITIES');
  });

  it('⚠️ AND COMMENTS CANNOT BE MISTAKEN FOR EMISSIONS', () => {
    const commented = stripSourceComments(
      "// PSL_NOT_A_REAL_HEAD: discussed only\nconst y = 1;\n",
      'blank',
      'probe.ts',
    );
    expect(/PSL_NOT_A_REAL_HEAD:/.test(commented)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ BOTH DIRECTIONS — no untranslated refusal, no orphan key', () => {
  it('every head a hook emits has a `psl.refusal.*` key', () => {
    const missing = emittedHeads().filter((h) => !(h in PSL_REFUSAL_KEYS));
    expect(missing, `these refusals would reach a reader in English: ${missing}`).toEqual([]);
  });

  it('⚠️ AND EVERY KEY NAMES A HEAD SOME HOOK EMITS — no orphans', () => {
    const emitted = new Set(emittedHeads());
    const orphans = Object.keys(PSL_REFUSAL_KEYS).filter((h) => !emitted.has(h));
    expect(orphans, `these keys outlived their refusal: ${orphans}`).toEqual([]);
  });

  it('every mapped key EXISTS in both locales, with different words', () => {
    for (const key of Object.values(PSL_REFUSAL_KEYS)) {
      expect(pslEn[key], `EN is missing ${key}`).toBeTruthy();
      expect(pslId[key], `ID is missing ${key}`).toBeTruthy();
      // ⚠️ **AND THEY MUST DIFFER.** A key whose ID value is the English
      // sentence is an untranslated string wearing a translated key's clothes,
      // and an `i18n` probe aimed at a token spelled the same in both locales
      // makes an assertion that cannot fail.
      expect(pslId[key], `${key} is identical in both locales`).not.toBe(pslEn[key]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE RESOLVER — probed at a real dispatcher reason shape', () => {
  it('it finds the head inside a `POLICY_REJECTED:<hook>:<reason>` envelope', () => {
    // The shape a surface actually receives. Matching at position zero would
    // have found nothing — the dispatcher owns the prefix.
    const real =
      'POLICY_REJECTED:psl_cap_within_ceiling:PSL_CAP_ABOVE_CEILING: 731 days exceeds…';
    expect(pslRefusalKey(real)).toBe('psl.refusal.capAboveCeiling');
  });

  it('⚠️ AND IT RETURNS `null` FOR A REASON IT DOES NOT OWN — every fallback survives', () => {
    // `refusalMessage.ts`'s rule, copied with its reason: a translator that
    // absorbed a foreign string would make an ungoverned refusal READ as
    // governed. Every call site is `pslRefusalKey(r) ?? describeRefusal(r) ?? r`.
    expect(pslRefusalKey('ROLE_NOT_PERMITTED:psl:decide')).toBeNull();
    expect(pslRefusalKey('MISSING_FIELDS:justification')).toBeNull();
    expect(pslRefusalKey(undefined)).toBeNull();
    expect(pslRefusalKey('')).toBeNull();
  });

  it('⚠️ A LONGER HEAD IS NOT MATCHED BY A SHORTER ONE IT CONTAINS', () => {
    // `PSL_DEFAULT_CAP_ABOVE_CEILING` must not resolve through
    // `PSL_CAP_ABOVE_CEILING`. The colon in the matcher is what prevents it,
    // and this is the assertion that says so rather than trusting the comment.
    expect(pslRefusalKey('PSL_DEFAULT_CAP_ABOVE_CEILING: 900 days…')).toBe(
      'psl.refusal.capAboveCeiling',
    );
    expect(pslRefusalKey('PSL_DEFAULT_CAP_NOT_A_DURATION: …')).toBe(
      'psl.refusal.capNotADuration',
    );
  });
});
