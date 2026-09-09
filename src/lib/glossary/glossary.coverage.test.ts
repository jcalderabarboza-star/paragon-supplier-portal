// GL-0 — the glossary's coverage, pinned bilaterally, and the population reported.
//
// `tsc` already guarantees each registry is EXHAUSTIVE over its union (the
// `satisfies` pin). What tsc cannot say is whether the SCOPE is honest: that
// every registry points at a union that still exists, and that the definitions
// are real prose in both locales rather than placeholders. That is this file.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_GLOSSARY_TERMS, GLOSSARY_REGISTRIES } from './index';

const ROOT = join(__dirname, '..', '..', '..');

// ⚠️ THE FOUR PREDICATES, AT MODULE SCOPE SO THE PROBE BLOCK AT THE FOOT OF THIS
//   FILE EXERCISES THE SHIPPED ONES. They were inline arrows inside their own
//   `it()` blocks, which put them out of reach of any probe — so each could be
//   broken to match NOTHING and its `toEqual([])` would pass green over a
//   population this file separately proves non-empty. Extracting them changes no
//   behaviour; it makes the matcher addressable, which is the whole fix.
type Term = (typeof ALL_GLOSSARY_TERMS)[number];

/** A registry whose source file is gone, or which no longer declares its union.
 *
 *  ⚠️ TYPED ON `string`, NOT ON `Registry`'s LITERAL UNIONS, AND DELIBERATELY.
 *  `sourceFile` / `sourceType` are closed unions of the registries that EXIST,
 *  so a probe for "a registry pointing at a file that is GONE" cannot be
 *  expressed in them — the type forbids naming the very state the predicate
 *  detects. Widening here is strictly more general and still accepts every real
 *  row (asserted below, against `GLOSSARY_REGISTRIES[0]`). The spec-surface gate
 *  found this; `tsconfig.vitest.json` typechecks tests, which is what
 *  `TSC-SKIPS-TESTS-01` was closed to buy. */
const registryIsBroken = (r: { sourceFile: string; sourceType: string }): boolean => {
  let src: string;
  try {
    src = readFileSync(join(ROOT, r.sourceFile), 'utf8');
  } catch {
    return true;
  }
  return (
    !new RegExp(`\\b(?:type|const)\\s+${r.sourceType}\\b`).test(src) &&
    !new RegExp(`export\\s+type\\s+${r.sourceType}\\b`).test(src)
  );
};

/** A placeholder-length definition, in either locale. */
const isThin = (t: Pick<Term, 'en' | 'id'>): boolean =>
  t.en.trim().length < 25 || t.id.trim().length < 25;

/** EN and ID identical — the ID row was never authored. */
const isUntranslated = (t: Pick<Term, 'en' | 'id'>): boolean => t.en.trim() === t.id.trim();

/** A definition that merely spells its own term back out. */
const isEcho = (t: Pick<Term, 'term' | 'en'>): boolean => {
  const words = t.term.replace(/[._-]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean);
  const en = t.en.toLowerCase();
  return words.length > 0 && words.every((w) => en.includes(w)) && t.en.trim().length < 60;
};

describe('glossary coverage (GL-0)', () => {
  it('registers a non-empty scope — a glossary of nothing defines nothing', () => {
    expect(GLOSSARY_REGISTRIES.length).toBeGreaterThan(10);
    expect(ALL_GLOSSARY_TERMS.length).toBeGreaterThan(40);
  });

  it('every registry points at a source file that exists and names its union', () => {
    const broken = GLOSSARY_REGISTRIES.filter(registryIsBroken).map(
      (r) => `${r.sourceType} @ ${r.sourceFile}`,
    );
    expect(broken, `registry points at a union that is gone or moved:\n${broken.join('\n')}`)
      .toEqual([]);
  });

  it('every term carries real prose in BOTH locales', () => {
    const thin = ALL_GLOSSARY_TERMS.filter(isThin).map((t) => `${t.sourceType}.${t.term}`);
    expect(thin, `placeholder-length definition:\n${thin.join('\n')}`).toEqual([]);
  });

  it('no definition is the same string in both locales — an untranslated row', () => {
    const same = ALL_GLOSSARY_TERMS.filter(isUntranslated).map(
      (t) => `${t.sourceType}.${t.term}`,
    );
    expect(same, `EN and ID identical (ID was not authored):\n${same.join('\n')}`).toEqual([]);
  });

  it('no definition merely restates its own term', () => {
    // A definition whose EN text is just the term spelled out is a summary of
    // the implementation, not a definition — the PF-2 test, which came back
    // zero of ninety-one.
    const echoes = ALL_GLOSSARY_TERMS.filter(isEcho).map((t) => `${t.sourceType}.${t.term}`);
    expect(echoes, `definition restates the term:\n${echoes.join('\n')}`).toEqual([]);
  });

  it('remedyRoute is ABSENT everywhere — the routing half of the dead-end stays open', () => {
    // HALAL-REFUSAL-DEAD-ENDS-01: GL-0 closes the DEFINITIONAL half only. The
    // destination (who rules, where, what the clerk does meanwhile) does not
    // exist, so populating this field would make the row read as closed.
    const routed = ALL_GLOSSARY_TERMS.filter((t) => t.remedyRoute !== undefined)
      .map((t) => `${t.sourceType}.${t.term}`);
    expect(routed, `remedyRoute populated before a destination exists:\n${routed.join('\n')}`)
      .toEqual([]);
  });

  it('has no duplicate term within a registry', () => {
    for (const r of GLOSSARY_REGISTRIES) {
      const keys = Object.keys(r.entries);
      expect(new Set(keys).size, `duplicate term in ${r.sourceType}`).toBe(keys.length);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE PREDICATES THEMSELVES — FIRED AT KNOWN-POSITIVE INPUT.
//
// LANE (3). Five of the assertions above are `expect(…).toEqual([])` over a
// population the first `it` proves non-empty. That pair closes
// `EMPTY-INPUT-REPORTS-CLEAN-01` and is silent about the mode below it: **break
// a predicate so it matches NOTHING and its assertion passes green over the full
// glossary.** The population guard cannot see it, because the population is
// intact — it is the filter that is dead. Nothing in this file could previously
// have detected that, and nothing outside it can.
//
// SHAPE COPIED FROM §71's RETIRED PROBE (`dayProjection.test.ts` @ `3e0c1d2`,
// quoted into a comment there rather than deleted): fire the SHIPPED predicate at
// input that reconstructs the defect it exists to catch, and require it to return
// a NAMED verdict. Both directions, per rule 4 — a known-GOOD row must be
// ACQUITTED, or a predicate that condemns everything reads like one that works.
//
// ⚠️ WHY `remedyRoute` HAS NO PROBE, STATED RATHER THAN LEFT AS AN OMISSION: it
// is `t.remedyRoute !== undefined`, a property-presence check with no matcher to
// break. There is nothing there that can silently stop matching.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ the predicates still fire — LANE (3), what the population guard cannot stand in for', () => {
  it('registryIsBroken fires on a missing file and on a union that moved', () => {
    // (a) the file is gone — the `catch` arm.
    expect(registryIsBroken({ sourceFile: 'src/lib/glossary/no-such-file.ts', sourceType: 'X' }))
      .toBe(true);
    // (b) the file exists but no longer declares the union it is registered for.
    expect(
      registryIsBroken({ sourceFile: 'src/lib/glossary/index.ts', sourceType: 'UnionThatLeft' }),
    ).toBe(true);
    // KNOWN-GOOD, and it must be ACQUITTED: a real registry row, resolved
    // through the same reader, against the union it really declares.
    const live = GLOSSARY_REGISTRIES[0];
    expect(live, 'no registries — this probe is vacuous').toBeDefined();
    expect(registryIsBroken(live)).toBe(false);
  });

  it('isThin fires on a placeholder in EITHER locale, and passes real prose', () => {
    const REAL = 'A commitment a supplier makes that the buyer can later hold them to.';
    expect(isThin({ en: 'too short', id: REAL })).toBe(true);
    expect(isThin({ en: REAL, id: 'terlalu pendek' })).toBe(true);
    expect(isThin({ en: REAL, id: REAL })).toBe(false);
    // The boundary is a boundary: 24 characters is thin, 25 is not.
    expect(isThin({ en: 'x'.repeat(24), id: REAL })).toBe(true);
    expect(isThin({ en: 'x'.repeat(25), id: REAL })).toBe(false);
  });

  it('isUntranslated fires on an identical pair and tolerates whitespace only', () => {
    expect(isUntranslated({ en: 'Purchase order', id: 'Purchase order' })).toBe(true);
    expect(isUntranslated({ en: ' Purchase order ', id: 'Purchase order' })).toBe(true);
    expect(isUntranslated({ en: 'Purchase order', id: 'Pesanan pembelian' })).toBe(false);
  });

  it('isEcho fires on a definition that spells its own term back out', () => {
    expect(isEcho({ term: 'lead_time', en: 'The lead time.' })).toBe(true);
    expect(isEcho({ term: 'lead.time', en: 'The lead time for an order.' })).toBe(true);
    // NOT an echo: it uses the words but earns its length — the `< 60` arm is
    // what separates a real definition from a restatement, so it is probed.
    expect(
      isEcho({
        term: 'lead_time',
        en: 'The lead time is the interval between a purchase order being confirmed and goods arriving at the dock.',
      }),
    ).toBe(false);
    // NOT an echo: short, but does not contain the term's words at all.
    expect(isEcho({ term: 'lead_time', en: 'How long the supplier takes.' })).toBe(false);
  });
});
