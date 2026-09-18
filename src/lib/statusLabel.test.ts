import { describe, it, expect } from 'vitest';
import { CANONICAL_STATUSES } from './statusTone';
import {
  statusLabelKey,
  statusResourcesEn,
  statusResourcesId,
  __statusInternals,
} from './statusLabel';
import { resources } from './i18n';
import {
  PSL_LIFECYCLES,
  PSL_STATUSES,
  type PslLifecycle,
} from '../services/data/pslListing';
import type { PslDisplayStatus } from '../services/data/pslProjection';

const { STATUS_ID, slug } = __statusInternals;

describe('statusLabel — SSoT invariants (SEAT2-I18N-CHROME-01)', () => {
  it('every canonical status (statusTone.ts) has an ID translation', () => {
    const missing = CANONICAL_STATUSES.filter((s) => !(s in STATUS_ID));
    expect(missing).toEqual([]);
  });

  it('every canonical status resolves to a key present in both en and id resources', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    for (const status of CANONICAL_STATUSES) {
      const key = statusLabelKey(status);
      expect(key).not.toBeNull();
      expect(en[key as string]).toBeDefined();
      expect(id[key as string]).toBeDefined();
    }
  });

  it('EN resource value equals the canonical string (byte-identical to pre-i18n pills)', () => {
    for (const status of CANONICAL_STATUSES) {
      expect(statusResourcesEn[slug(status)]).toBe(status);
    }
  });

  it('ID differs from EN for the shared vocabulary (real translation, not fallback)', () => {
    // codes / loanwords intentionally kept identical across locales
    const keepAsIs = new Set(['EDI 846', 'Normal', 'Manual', 'Onboarding']);
    for (const status of CANONICAL_STATUSES) {
      if (keepAsIs.has(status)) continue;
      expect(statusResourcesId[slug(status)]).not.toBe(status);
    }
  });

  it('slugs are unique (no key collisions)', () => {
    const slugs = CANONICAL_STATUSES.map(slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('statusLabelKey returns null for unknown / non-canonical labels', () => {
    expect(statusLabelKey('Totally Made Up')).toBeNull();
    expect(statusLabelKey('')).toBeNull();
  });

  it('statusLabelKey trims surrounding whitespace', () => {
    expect(statusLabelKey('  Delivered  ')).toBe('status.delivered');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE PSL VOCABULARY IS REGISTERED — THE DIRECTION THE SUITE ABOVE CANNOT SEE.
//
// Every test above iterates `CANONICAL_STATUSES`, which IS `Object.keys(
// STATUS_TONE)`. **A word that was never registered is absent from the very
// population that checks registration**, so the suite was green while
// `Proposed` / `Listed` / `Withdrawn` rendered in English in both locales. That
// is not a weak assertion; it is a population that cannot contain its own gap.
//
// ── WHY HERE AND NOT IN A NEW FILE ─────────────────────────────────────────
//   This file is already the instrument for *"a status word has an ID
//   translation and resolves in both locales"* — the claim is identical and a
//   second file would be a second place for one rule. The other half of the PSL
//   strings, the `psl.*` fragment keys, is ALREADY covered by
//   `lib/i18n/fragments.test.ts`, whose population is derived from the module
//   graph, so `psl.ts` joined it the moment the file existed. Nothing here
//   duplicates that.
//
// ── THE POPULATION IS THE UNION TYPES, SO A NEW MEMBER IS RED UNTIL BOTH ───
//   `PSL_STATUSES` and `PSL_LIFECYCLES` are the shipped runtime arrays.
//   `PslDisplayStatus` adds three words that exist only as type members, so
//   they are listed once below and pinned to the union BY `tsc` in BOTH
//   directions — add a member to the type and this file stops compiling.
// ─────────────────────────────────────────────────────────────────────────────

/** The display words that are not lifecycle members. */
const PSL_DISPLAY_ONLY = ['Scheduled', 'Expiring', 'Expired'] as const;

/** ⚠️ `tsc` PIN, BOTH WAYS. Every listed word must BE a `PslDisplayStatus`, and
 *  every `PslDisplayStatus` must be a lifecycle or one of these. A fourth
 *  display arm added to the projection is a COMPILE error here until it is
 *  named — which is what makes the guard cover words nobody has written yet. */
type PslCovered = PslLifecycle | (typeof PSL_DISPLAY_ONLY)[number];
const _pslDisplayOnlyAreDisplayStatuses: readonly PslDisplayStatus[] = PSL_DISPLAY_ONLY;
const _pslCoversTheUnion: PslCovered extends PslDisplayStatus
  ? PslDisplayStatus extends PslCovered
    ? true
    : never
  : never = true;

/** Rendered by `PslStatusCell` as a literal rather than a union member: there is
 *  no "not listed" listing, so no type can carry the word. Named here because a
 *  reader sees it beside the others and it must localise like them. */
const PSL_CELL_LITERALS = ['Not Listed'] as const;

const PSL_VOCABULARY: readonly string[] = [
  ...PSL_STATUSES,
  ...PSL_LIFECYCLES,
  ...PSL_DISPLAY_ONLY,
  ...PSL_CELL_LITERALS,
];

describe('⚠️ the PSL vocabulary is registered and localised (PR #364 smoke defect)', () => {
  it('REACH — the vocabulary is non-empty and the matcher works BOTH ways', () => {
    // §42b: over an empty vocabulary every claim below passes having examined
    // nothing. And the bilateral control the dispatch asked for, by name:
    expect(PSL_VOCABULARY.length).toBeGreaterThan(8);
    // The two `tsc` pins are READ here so they are not dead declarations. Their
    // real work happens at compile time; this makes the file honest about it.
    expect(_pslCoversTheUnion).toBe(true);
    expect(_pslDisplayOnlyAreDisplayStatuses).toHaveLength(PSL_DISPLAY_ONLY.length);
    // KNOWN-GOOD — the word that was already correct, and whose correctness is
    // what proved this was a missed key rather than an untranslated vocabulary.
    expect(STATUS_ID.Rejected).toBe('Ditolak');
    // KNOWN-BAD — the word the operator saw in English. It must now resolve,
    // and it must NOT resolve to the English.
    expect(STATUS_ID.Proposed).toBeDefined();
    expect(STATUS_ID.Proposed).not.toBe('Proposed');
  });

  it('⚠️ every PSL word is a member of the canonical status vocabulary', () => {
    // THE DIRECTION THAT WAS MISSING. Not "does the registered word have an ID"
    // but "is the word registered at all".
    const unregistered = PSL_VOCABULARY.filter((w) => !CANONICAL_STATUSES.includes(w));
    expect(unregistered).toEqual([]);
  });

  it('⚠️ every PSL word resolves to a key that EXISTS IN BOTH LOCALES', () => {
    const en = resources.en.translation as Record<string, string>;
    const id = resources.id.translation as Record<string, string>;
    const broken: string[] = [];
    for (const word of PSL_VOCABULARY) {
      const key = statusLabelKey(word);
      if (key === null) {
        broken.push(`${word}: no key`);
        continue;
      }
      if (en[key] === undefined) broken.push(`${word}: missing en[${key}]`);
      if (id[key] === undefined) broken.push(`${word}: missing id[${key}]`);
    }
    expect(broken).toEqual([]);
  });

  it('⚠️ and the ID is a TRANSLATION, not the English word copied through', () => {
    // The failure the operator actually saw would pass a mere "a key exists"
    // check if the key's ID value were the English string. Every PSL word is a
    // real term in both languages — none is a loanword like `Manual` or
    // `Onboarding`, which is why this list needs no exemption.
    const id = resources.id.translation as Record<string, string>;
    const untranslated = PSL_VOCABULARY.filter((w) => {
      const key = statusLabelKey(w);
      return key !== null && id[key] === w;
    });
    expect(untranslated).toEqual([]);
  });

  it('every PSL word carries a tone, so no pill falls through to neutral silently', () => {
    // `statusTone` returns `neutral` for an unknown label, so a missing entry is
    // invisible on screen. This is the assertion that makes it visible.
    for (const word of PSL_VOCABULARY) {
      expect(CANONICAL_STATUSES, word).toContain(word);
    }
  });
});
