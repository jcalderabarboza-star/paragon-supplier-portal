// ────────────────────────────────────────────────────────────────────────────
// THE HONESTY BANNER MAY NOT COUNT ITS OWN WRITES.
//
// ⚠️ **THIS EXISTS BECAUSE THE SAME SENTENCE HAS GONE FALSE TWICE, IN TWO
// LOCALES, AND THE SECOND TIME NOTHING STRUCTURAL HAD CHANGED TO CATCH IT.**
//
//   · R1b wrote `sdc.honesty.body` as *"ONE action writes: resolving a supplier
//     dispute"*. True on the day.
//   · The ID half of that same correction was MISSED, and was found by a browser
//     pass rather than by a test — the spec file above this one says so in its
//     own comment.
//   · Wave C added `_review`, `_accept` and `_dispute` to the page. The sentence
//     went false again, in both locales, **with no file edited**.
//
// The page spec caught the third instance, and that is worth keeping — but a
// spec that asserts the CURRENT wording has to be rewritten on every wave, and
// a test rewritten on every wave is a test nobody trusts. `FLOOR-IN-PROSE-01`'s
// remedy is DELETION IN FAVOUR OF A DERIVATION, never correction to a newer
// number: *"four actions write"* is the same defect with a fresher date.
//
// ⚠️ **SO THIS GUARDS THE CLASS, NOT THE WORDING.** It does not know or care how
// many verbs the page dispatches — it asserts only that the banner does not
// CLAIM a number of them. A banner with no count cannot go stale when a wave
// lands, which is the only property that actually holds.
//
// ⚠️ **AND IT IS PROBED BOTH WAYS (rule 4), WITH THE POSITIVE CONTROL BEING THE
// EXACT STRINGS THIS BATCH DELETED.** A clean run over a just-repaired tree
// proves the repair and NOTHING about whether the instrument can fire
// (`CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`, §71). So the retired sentences are
// fed back through the matcher and asserted CAUGHT — a different measurement,
// on different input, from the green over the shipped strings.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { sdcConsolidationEn, sdcConsolidationId } from './sdcConsolidation';

/**
 * A claim about HOW MANY acts write. Deliberately NOT "contains a digit": the
 * banner legitimately names the `SOMO C8` feed, and a digit matcher would
 * condemn it — rule 2, where widening manufactures false accusations as readily
 * as narrowing manufactures blind spots.
 *
 * Each pattern is a cardinality ATTACHED TO A WRITING NOUN, in one of the two
 * shipped locales. The `except`/`kecuali` pair is the same claim worn as an
 * exception clause — *"read-only except X"* asserts the count is one without
 * writing the word.
 */
const CARDINALITY_CLAIMS: readonly { readonly label: string; readonly re: RegExp }[] = [
  { label: 'EN · n actions/writes', re: /\b(one|two|three|four|five|1|2|3|4|5)\s+(action|write)s?\b/i },
  { label: 'EN · only/sole action', re: /\b(only|sole|single)\s+(action|write|thing)\b/i },
  { label: 'EN · read-only except', re: /read-only\s+except/i },
  { label: 'ID · n tindakan', re: /\b(satu|dua|tiga|empat|lima)\s+tindakan\b/i },
  { label: 'ID · satu-satunya', re: /satu-satunya/i },
  { label: 'ID · hanya-baca kecuali', re: /hanya-baca\s+kecuali/i },
];

const claimsFound = (text: string): readonly string[] =>
  CARDINALITY_CLAIMS.filter((c) => c.re.test(text)).map((c) => c.label);

/** The banner, in both shipped locales. Derived from the maps, not transcribed. */
const BANNER_KEYS = ['sdc.honesty.title', 'sdc.honesty.body'] as const;
const LOCALES = [
  { name: 'en', map: sdcConsolidationEn },
  { name: 'id', map: sdcConsolidationId },
] as const;

describe('the SDC honesty banner carries no cardinality', () => {
  // ⚠️ POPULATION FIRST, AS MEMBERSHIP — never a count.
  // `EMPTY-INPUT-REPORTS-CLEAN-01`: an instrument reading an empty map reports
  // "no cardinality claims anywhere" and looks exactly like a working guard.
  it('⚠ POPULATION CONTROL — both locales actually carry both banner keys', () => {
    for (const { name, map } of LOCALES) {
      for (const key of BANNER_KEYS) {
        expect(
          typeof (map as Record<string, string>)[key],
          `${name} is missing ${key} — the guard below would have read undefined`,
        ).toBe('string');
        expect((map as Record<string, string>)[key].length).toBeGreaterThan(20);
      }
    }
  });

  it('⚠ POSITIVE CONTROL — the sentences this batch RETIRED are caught', () => {
    // The exact strings that stood on main before wave C. If the matcher cannot
    // see these, its green below means nothing.
    const retiredEn =
      'Consolidation view — read-only except dispute resolution. ONE action writes: resolving a supplier dispute — nothing else here edits, dispatches, or publishes.';
    const retiredId =
      'Tampilan konsolidasi — hanya-baca kecuali penyelesaian sanggahan. SATU tindakan menulis: menyelesaikan sanggahan pemasok.';

    expect(claimsFound(retiredEn)).toEqual(
      expect.arrayContaining(['EN · n actions/writes', 'EN · read-only except']),
    );
    expect(claimsFound(retiredId)).toEqual(
      expect.arrayContaining(['ID · n tindakan', 'ID · hanya-baca kecuali']),
    );
  });

  it('⚠ NEGATIVE CONTROL — the SOMO C8 feed name is not mistaken for a count', () => {
    // The banner names `SOMO C8`. A digit-based matcher would condemn it, and
    // the resulting "fix" would delete a true statement to satisfy a broken
    // instrument. Asserted so a future widening cannot quietly do that.
    expect(claimsFound('The SOMO C8 feed has not landed — the page flips live only when it does.')).toEqual([]);
  });

  it('the SHIPPED banner claims no number of writes, in either locale', () => {
    for (const { name, map } of LOCALES) {
      for (const key of BANNER_KEYS) {
        const text = (map as Record<string, string>)[key];
        expect(
          claimsFound(text),
          `${name}/${key} counts its own writes — this sentence goes false on the next wave with no file edited. Name the KIND of act and let the derived sections say which: ${text}`,
        ).toEqual([]);
      }
    }
  });
});
