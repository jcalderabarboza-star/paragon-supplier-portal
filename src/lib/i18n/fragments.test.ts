import { describe, it, expect } from 'vitest';
import { resources } from '../i18n';

// ─────────────────────────────────────────────────────────────────────────────
// PAGE i18n FRAGMENTS — EN/ID PARITY, OVER A **DERIVED** POPULATION.
//
// ⚠️ **WHAT THIS REPLACES, AND WHY IT MATTERED.** This file used to carry a
// hand-maintained `FRAGMENTS` array — 43 rows, one import and one row per
// fragment, appended by hand each batch. Nothing asserted the list was
// complete, so a fragment added without an edit here was a fragment **whose
// EN/ID parity nothing checked**. Measured at the time of this batch: four
// fragments were absent — `emptyState`, `loadingState`, `roles`,
// `supplierApplications` — and one of them, `roles`, is 93 keys of the role
// catalogue, a surface shipped three batches ago.
//
// The population is now derived from the module graph, so a new fragment is
// covered **the moment the file exists**, with nobody editing this file. That
// is the property a hand list cannot have, and the one the mutation probe
// checks: add a fragment, and this suite grows without a diff here.
//
// ⚠️ **WHAT A FRAGMENT IS — A STRUCTURAL PROPERTY, NOT A JUDGEMENT.** A module
// under `src/lib/i18n/` that exports BOTH `<name>En` and `<name>Id`. That is
// the whole definition, which is what makes deriving it honest rather than a
// guess dressed as a derivation. **There is therefore NO EXEMPTION LIST**:
// `stepKind.ts` is not "excluded", it simply has no `En`/`Id` pair (it exports
// a key map, `STEP_KIND_KEY`). If somebody gives it one tomorrow it joins the
// population automatically — an exclusion that cannot outlive its subject,
// because it was never declared, only observed.
//
// ⚠️ **THE GLOB EXCLUDES SIBLING SUITES AT THE PATTERN, NOT IN THE LOOP.**
// `import.meta.glob('./*.ts', { eager: true })` EAGERLY IMPORTS the sibling
// `*.test.ts` files, which REGISTERS THEIR `describe` BLOCKS INSIDE THIS FILE —
// the prototype ran 193 tests instead of 1 and passed, which is a suite
// silently running other people's tests under this file's name. Filtering by
// filename inside the loop does not help: the import has already happened.
// ─────────────────────────────────────────────────────────────────────────────

const MODULES = import.meta.glob(['./*.ts', '!./*.test.ts'], { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

type Bundle = Record<string, string>;
interface Fragment {
  readonly name: string;
  readonly file: string;
  readonly en: Bundle;
  readonly id: Bundle;
}

const FRAGMENTS: readonly Fragment[] = Object.entries(MODULES)
  .flatMap(([file, mod]) => {
    const names = Object.keys(mod);
    return names
      .filter((n) => n.endsWith('En') && names.includes(`${n.slice(0, -2)}Id`))
      .map((n) => {
        const base = n.slice(0, -2);
        return {
          name: base,
          file,
          en: mod[n] as Bundle,
          id: mod[`${base}Id`] as Bundle,
        };
      });
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** Modules under `src/lib/i18n/` that are NOT fragments, and why — derived. */
const NON_FRAGMENTS = Object.entries(MODULES)
  .filter(([, mod]) => {
    const names = Object.keys(mod);
    return !names.some((n) => n.endsWith('En') && names.includes(`${n.slice(0, -2)}Id`));
  })
  .map(([file]) => file);

// ── PLURALS ─────────────────────────────────────────────────────────────────
//
// ⚠️ **A KEY-SET EQUALITY IS WRONG ABOUT WHAT IT MUST *ACCEPT*, AND THIS IS
// THE `PROBE THE GUARD BOTH WAYS` RULE FIRING ON A REAL FRAGMENT.** English has
// two plural categories (`one`, `other`); Indonesian has one (`other`). So
// `roles.page.reach_one` exists in EN and MUST NOT exist in ID — that is
// correct i18next, not a missing translation. The old `expect(idKeys).toEqual
// (enKeys)` would have reddened correct code the moment `roles` joined the
// population, and "the gate went red" would have looked like a found defect.
//
// The categories are read from `Intl.PluralRules` rather than hardcoded, so
// this stays right for a locale added later.
const ALL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;
const categoriesFor = (lng: string): readonly string[] =>
  [...new Intl.PluralRules(lng).resolvedOptions().pluralCategories].sort();

const EN_CATS = categoriesFor('en');
const ID_CATS = categoriesFor('id');

/** Split `foo_other` into `{ base: 'foo', cat: 'other' }`; a plain key has `cat: null`. */
const split = (key: string): { base: string; cat: string | null } => {
  for (const c of ALL_CATEGORIES) {
    if (key.endsWith(`_${c}`)) return { base: key.slice(0, -(c.length + 1)), cat: c };
  }
  return { base: key, cat: null };
};

/**
 * The BASE key set, plus which plural categories each base carries.
 *
 * A base counts as plural only when it actually carries a suffixed form —
 * `_other` is required in every CLDR language, so a plural key always has one,
 * and a plain key that merely happens to end in `_one` never gets a companion.
 */
const shapeOf = (bundle: Bundle) => {
  const cats = new Map<string, Set<string>>();
  const plain = new Set<string>();
  for (const key of Object.keys(bundle)) {
    const { base, cat } = split(key);
    if (cat === null) plain.add(key);
    else {
      if (!cats.has(base)) cats.set(base, new Set());
      cats.get(base)!.add(cat);
    }
  }
  return { plain, cats, bases: new Set([...plain, ...cats.keys()]) };
};

/** The value a locale renders for `base`: its plain key, else its `_other` form. */
const representative = (bundle: Bundle, base: string): string | undefined =>
  bundle[base] ?? bundle[`${base}_other`];

// ─────────────────────────────────────────────────────────────────────────────
// THE POPULATION GUARD RUNS FIRST AND ASSERTS MEMBERSHIP, NEVER A COUNT (§42b).
// Every assertion below is of the form "the two sides agree" — the exact shape
// that passes vacuously over an empty population. A glob that resolved nothing
// would make this whole file green while checking not one string.
// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION GUARD — the fragments were actually derived', () => {
  it('a known-GOOD fragment is present and a fabricated one is absent', () => {
    const names = FRAGMENTS.map((f) => f.name);
    // Known-good, spread across batches so one deletion cannot empty the probe.
    expect(names).toContain('wizard');
    expect(names).toContain('roles');
    expect(names).toContain('emptyState');
    expect(names).toContain('supplierApplications');
    // Known-BAD, same instrument, same run — without this the `toContain`
    // sweep above would pass on a matcher that returned everything.
    expect(names).not.toContain('nopeFragment');
    expect(names).not.toContain('i18n');
  });

  it('⚠️ `stepKind` is NOT a fragment, and the reason is structural rather than an exemption', () => {
    // It exports `STEP_KIND_KEY` — a key map, with no `En`/`Id` pair, so there
    // is nothing to compare between locales. This is asserted BOTH ways: the
    // module is in the glob (so it was seen and judged, not merely missed), and
    // it is not in the fragment set. Give it an `En`/`Id` pair tomorrow and it
    // joins the population with nobody editing this file — which is why there
    // is no allowlist row here to outlive its subject.
    expect(Object.keys(MODULES)).toContain('./stepKind.ts');
    expect(FRAGMENTS.map((f) => f.name)).not.toContain('stepKind');
    expect(NON_FRAGMENTS).toEqual(['./stepKind.ts']);
  });

  it('the glob did not eagerly import the sibling suites', () => {
    // Importing `./fragments.test.ts` or its neighbours would register THEIR
    // tests under this file. The pattern excludes them; this pins that it does.
    expect(Object.keys(MODULES).filter((f) => f.includes('.test.'))).toEqual([]);
  });

  it('the derived population is large enough to be the real one', () => {
    // A FLOOR, not an equality: this file must not need an edit when a
    // fragment is added, which is the whole point. It fires when the glob
    // silently stops resolving.
    expect(FRAGMENTS.length).toBeGreaterThan(40);
  });

  it('the plural categories come from Intl, and EN and ID genuinely differ', () => {
    // If these ever compared equal, the plural-aware assertions below would be
    // indistinguishable from the naive equality they replace.
    expect(EN_CATS).toEqual(['one', 'other']);
    expect(ID_CATS).toEqual(['other']);
    expect(EN_CATS).not.toEqual(ID_CATS);
  });
});

describe('page i18n fragments — EN/ID parity (SEAT2-I18N-BATCH)', () => {
  for (const { name, en, id } of FRAGMENTS) {
    it(`${name}: EN and ID expose the identical BASE key set`, () => {
      const enShape = shapeOf(en);
      const idShape = shapeOf(id);
      expect([...idShape.bases].sort()).toEqual([...enShape.bases].sort());
    });

    it(`${name}: every plural key carries exactly its own locale's categories`, () => {
      // Stronger than the equality this replaces: it does not merely tolerate
      // the EN/ID difference, it pins that each side carries the right forms.
      // A missing `_other` in ID renders the key raw at runtime.
      for (const [base, cats] of shapeOf(en).cats) {
        expect([...cats].sort(), `en ${base}`).toEqual([...EN_CATS]);
      }
      for (const [base, cats] of shapeOf(id).cats) {
        expect([...cats].sort(), `id ${base}`).toEqual([...ID_CATS]);
      }
    });

    it(`${name}: no value is empty`, () => {
      for (const [k, v] of Object.entries(en)) expect(v, `en ${k}`).toBeTruthy();
      for (const [k, v] of Object.entries(id)) expect(v, `id ${k}`).toBeTruthy();
    });

    it(`${name}: every key is wired into the i18n resources (each locale, its own keys)`, () => {
      // Each locale's OWN keys must be registered in ITS OWN bundle. The prior
      // version looked EN's keys up in the ID bundle too, which is exactly the
      // check that cannot survive a plural asymmetry — cross-locale coverage is
      // the base-key assertion above, where it belongs.
      const en2 = resources.en.translation as Record<string, string>;
      const id2 = resources.id.translation as Record<string, string>;
      for (const k of Object.keys(en)) expect(en2[k], `en resources ${k}`).toBeDefined();
      for (const k of Object.keys(id)) expect(id2[k], `id resources ${k}`).toBeDefined();
    });
  }

  // ── CP-0 · 2e-c-6 — the half a key-set comparison cannot see ──────────────
  // Matching key sets prove a string EXISTS in Indonesian. They say nothing about
  // whether it still says the same thing. A translation that drops an
  // interpolation is the failure mode that matters here: the FX refusal names the
  // currencies that need a rate and the vintage it is judging, and an Indonesian
  // string missing `{{currencies}}` is not a slightly-worse refusal — it is a
  // refusal that does not name its cause, which is the whole honesty claim, gone
  // for half the userbase, with every existing guard still green.
  //
  // i18next silently renders a string with no placeholder rather than erroring,
  // so nothing else in the suite would catch it.
  const placeholders = (s: string): string[] =>
    [...s.matchAll(/\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g)].map((m) => m[1]).sort();

  for (const { name, en, id } of FRAGMENTS) {
    it(`${name}: EN and ID interpolate the SAME variables`, () => {
      // Compared per BASE key: an EN plural form with no ID counterpart is
      // matched against ID's `_other`, which is the string ID actually renders
      // for every count. Comparing key-for-key would skip it entirely.
      for (const base of shapeOf(en).bases) {
        const enValue = representative(en, base);
        const idValue = representative(id, base);
        expect(placeholders(idValue ?? ''), `${name} · ${base}`).toEqual(
          placeholders(enValue ?? ''),
        );
      }
    });
  }

  it('ID differs from EN for a meaningful share (real translation, not copy)', () => {
    for (const { name, en, id } of FRAGMENTS) {
      const bases = [...shapeOf(en).bases];
      const differing = bases.filter(
        (b) => representative(id, b) !== representative(en, b),
      ).length;
      // codes/loanwords/interpolation-only keys can legitimately match; most differ
      expect(differing / bases.length, name).toBeGreaterThan(0.6);
    }
  });
});
