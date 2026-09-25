// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ EVERY DELIVERY REFUSAL A READER CAN RECEIVE HAS COPY — DERIVED, BOTH WAYS.
//
// `pslRefusal.test.ts`'s contract, copied with its reasons. The population is
// "which refusal HEADS do the delivery hooks emit?", read out of `policies.ts`
// rather than listed here, because a hand list is a second vocabulary that goes
// stale the first time a hook is added.
//
// Both directions, because one passes over an empty map (§39):
//   · every emitted head has a key — a new hook cannot ship untranslated;
//   · every key names an emitted head — a key cannot outlive its refusal
//     (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
//
// ⚠️ **COMMENTS ARE STRIPPED FIRST.** `policies.ts`'s own comments quote heads;
// a scan that read them as code would demand copy for refusals nothing emits.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { DELIVERY_REFUSAL_KEYS, deliveryRefusalKey } from './deliveryRefusal';
import { PERSON_NAMING_REFUSAL_KEYS } from '../../pages-v2/personNamingRefusal';
import { resources } from '../../lib/i18n';

const en = resources.en.translation as Record<string, string>;
const id = resources.id.translation as Record<string, string>;

const POLICIES = resolve(process.cwd(), 'src/services/transitions/policies.ts');

/**
 * Every `DELIVERY_*` refusal head the shipped hooks emit.
 *
 * A head always OPENS a template literal and is followed by `: ` or `: ${`,
 * which is the discriminator `personNamingRefusal.test.ts` earned the hard way:
 * a looser `UPPER_SNAKE:` also matches a TypeScript type annotation.
 */
function emittedHeads(): readonly string[] {
  const code = stripSourceComments(readFileSync(POLICIES, 'utf8'), 'blank', POLICIES);
  const heads = [...code.matchAll(/['"`](DELIVERY_[A-Z0-9_]{3,}):(?= |\$\{)/g)].map((m) => m[1]);
  return [...new Set(heads)].sort();
}

describe('REACH — the derivation reads the shipped hooks', () => {
  it('⚠️ IT FINDS KNOWN MEMBERS BY NAME, NEVER A COUNT', () => {
    const heads = emittedHeads();
    expect(heads).toContain('DELIVERY_ACTOR_UNATTRIBUTED');
    expect(heads).toContain('DELIVERY_RELEASE_BACKDATED');
    expect(heads).toContain('DELIVERY_NOTHING_TO_CONFIRM');
  });

  it('⚠️ AND A COMMENT IS NOT AN EMISSION — the known-false control', () => {
    const commented = stripSourceComments(
      "// 'DELIVERY_FAKE_HEAD: never emitted'\nconst y = 1;\n",
      'blank',
      'probe.ts',
    );
    expect(/DELIVERY_FAKE_HEAD/.test(commented)).toBe(false);
  });

  it('⚠️ AND A TYPE ANNOTATION IS NOT A HEAD — probed BOTH ways', () => {
    const HEAD = /['"`](DELIVERY_[A-Z0-9_]{3,}):(?= |\$\{)/;
    expect(HEAD.test('const DELIVERY_RIGOUR: number = 1;\n')).toBe(false);
    expect(HEAD.test("  reason: 'DELIVERY_REAL_HEAD: the sentence'")).toBe(true);
    expect(HEAD.test('`DELIVERY_REAL_HEAD: ${token(x)}`')).toBe(true);
  });
});

describe('⚠️ EVERY EMITTED HEAD IS ACCOUNTED FOR', () => {
  it('every one has a key here, or is owned by the person-naming map', () => {
    const unaccounted = emittedHeads().filter(
      (h) => !(h in DELIVERY_REFUSAL_KEYS) && !(h in PERSON_NAMING_REFUSAL_KEYS),
    );
    expect(
      unaccounted,
      `these refusals would reach a reader in a developer's English: ${unaccounted}`,
    ).toEqual([]);
  });

  it('⚠️ AND EVERY KEY NAMES A HEAD SOME HOOK EMITS — no orphans', () => {
    const emitted = new Set(emittedHeads());
    const orphans = Object.keys(DELIVERY_REFUSAL_KEYS).filter((h) => !emitted.has(h));
    expect(orphans, `these keys outlived their refusal: ${orphans}`).toEqual([]);
  });

  it('every key EXISTS in both locales, with different words', () => {
    for (const key of Object.values(DELIVERY_REFUSAL_KEYS)) {
      expect(en[key], `EN is missing ${key}`).toBeTruthy();
      expect(id[key], `ID is missing ${key}`).toBeTruthy();
      // A key whose ID value is the English sentence is an untranslated string
      // wearing a translated key's clothes.
      expect(id[key], `${key} is identical in both locales`).not.toBe(en[key]);
    }
  });
});

describe('⚠️ THE RESOLVER — probed at a real dispatcher reason shape', () => {
  it('it finds the head inside a `POLICY_REJECTED:<hook>:<reason>` envelope', () => {
    const real =
      'POLICY_REJECTED:delivery_release_not_backdated:DELIVERY_RELEASE_BACKDATED: this line ' +
      'is due 2026-01-08, which is already past…';
    expect(deliveryRefusalKey(real)).toBe('delivery.refusal.releaseBackdated');
  });

  it('⚠️ AND IT RETURNS `null` FOR A REASON IT DOES NOT OWN — every fallback survives', () => {
    expect(deliveryRefusalKey('ROLE_NOT_PERMITTED:deliveryRelease:release')).toBeNull();
    expect(deliveryRefusalKey('SAMPLE_ACTOR_CANNOT_LOOSEN: …')).toBeNull();
    expect(deliveryRefusalKey(undefined)).toBeNull();
    expect(deliveryRefusalKey('')).toBeNull();
  });
});
