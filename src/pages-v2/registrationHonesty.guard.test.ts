// ────────────────────────────────────────────────────────────────────────────
// B3 · /register IS A WALKTHROUGH, AND IT SAYS SO — the guard.
//
// ⚠️ **THE DEFECT THIS GUARDS WAS INVISIBLE TO EVERY EXISTING INSTRUMENT, AND
// THAT IS WHY IT SURVIVED SO LONG.** `SupplierRegistration.tsx` minted
// `String(10000 + Math.floor(Math.random() * 90000))` and rendered it to an
// external party as `APP-2026-{n}` under the label "Application number". No
// test asserted its absence, because nothing was wrong with the CODE — the
// component rendered exactly what it was told to. The lie was in what the
// string CLAIMED, and a claim is not a type error.
//
// So this guard reads the source and the locale maps directly. It is
// deliberately not a render test: a render test proves what one path shows,
// and the fabrication could return on any of the three request-type paths.
//
// ⚠️ **BILATERAL THROUGHOUT (rule 4).** Every "this is gone" assertion is paired
// with a "this is still here" one, in the same test, over the same input. A
// one-directional guard that only checked for absences would pass identically
// against an EMPTY file, a renamed file, or a read that silently failed —
// `EMPTY-INPUT-REPORTS-CLEAN-01`, which is why the population control below is
// the FIRST test and asserts membership rather than a size.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { registrationEn, registrationId } from '../lib/i18n/registration';

const RAW = readFileSync(resolve(__dirname, 'SupplierRegistration.tsx'), 'utf-8');

/**
 * ⚠️ **COMMENTS ARE STRIPPED, AND THE FIRST RUN OF THIS GUARD IS WHY.**
 *
 * It went red on three assertions and every one of them was matching the
 * EXPLANATION of a deletion rather than the deletion. The source now carries a
 * paragraph saying the vendor-number field is gone and why — and a naive scan
 * reads that paragraph as the field. Same shape as the field-read census that
 * matched an i18n key rather than a read: **a name-based matcher matches the
 * name wherever it appears, and prose is where a careful codebase writes the
 * name most often.** In a tree that comments this heavily, that is not an edge
 * case; it is the common case.
 *
 * The stripper is deliberately conservative — block comments, full-line `//`
 * comments, and a trailing `//` only on a line that holds no quote and no
 * colon. It can leave a comment behind (a false accusation, which is loud and
 * gets fixed) but cannot eat a line of code (a blind spot, which is silent).
 * Rule 2's asymmetry, chosen on purpose rather than fallen into.
 *
 * ⚠️ **AND THE FIRST VERSION OF THIS FUNCTION FELL INTO IT ANYWAY, WHICH IS
 * WHY THE PROBE BELOW EXISTS AND WHY IT RAN FIRST.** It guarded the trailing
 * cut with `(?<!:)`, reasoning that a URL's `//` is always preceded by a colon.
 * It is not: `https://host//path` has a second `//` preceded by a letter, and
 * the stripper cut a live line in half there. The six real assertions in this
 * file were GREEN on that version — a clean reading from an instrument with a
 * hole in it. Only the synthetic probe went red.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      if (line.trim().startsWith('//')) return '';
      const at = line.indexOf('//');
      if (at < 0) return line;
      const before = line.slice(0, at);
      // A quote or a colon before the marker means it could be inside a string
      // or a URL. Leave the whole line rather than guess.
      return /['"`:]/.test(before) ? line : before;
    })
    .join('\n');

const SOURCE = stripComments(RAW);

/** The locale maps, as a pair, so no assertion can be made in one language. */
const LOCALES = [
  ['EN', registrationEn],
  ['ID', registrationId],
] as const;

describe('POPULATION CONTROL — nothing below means anything without this', () => {
  it('⚠️ THE STRIPPER IS PROBED BOTH WAYS BEFORE ANYTHING IS BELIEVED', () => {
    // Rule 4, on the instrument rather than on the tree. A stripper that ate
    // everything would make every absence assertion below pass, and a stripper
    // that ate nothing would make them all fail for the wrong reason. Both
    // directions, over one synthetic input.
    const synthetic = [
      '// a comment naming s4Vendor and Math.random',
      "const keep = 's4Vendor';",
      '/* a block naming s4Vendor */',
      "const url = 'https://host.example//path'; // trailing s4Vendor",
      'const plain = 1; // cut me',
    ].join('\n');
    const stripped = stripComments(synthetic);

    // KNOWN-BAD: prose occurrences are gone.
    expect(stripped).not.toContain('a comment naming');
    expect(stripped).not.toContain('a block naming');
    expect(stripped).not.toContain('cut me');
    // KNOWN-GOOD: code survives, INCLUDING the `//` inside a URL — the shape
    // that broke the first version of this stripper.
    expect(stripped).toContain("const keep = 's4Vendor';");
    expect(stripped).toContain('https://host.example//path');
    // ⚠️ AND THE COST OF BEING CONSERVATIVE, ASSERTED RATHER THAN ASSUMED: a
    // trailing comment on a line that holds a string is LEFT BEHIND. That is a
    // false accusation waiting to happen, and it is the direction chosen — it
    // fails loudly on a line somebody can read, instead of silently deleting
    // one from the population.
    expect(stripped).toContain('trailing s4Vendor');
  });

  it('the source really was read, and the locale maps really are populated', () => {
    // Membership, never a count: a wrong path returns '' and every absence
    // assertion in this file would then pass over nothing.
    expect(SOURCE).toContain('const SupplierRegistration');
    expect(SOURCE).toContain('registration.success.headline');
    for (const [name, map] of LOCALES) {
      expect(Object.keys(map).length, name).toBeGreaterThan(100);
      // A key this batch does NOT touch — proof the map is the real one.
      expect(map, name).toHaveProperty('registration.step.expansion.title');
    }
  });
});

describe('THE FABRICATED APPLICATION NUMBER IS GONE', () => {
  it('nothing on this surface mints or renders a document number', () => {
    // The mint.
    expect(SOURCE).not.toMatch(/Math\.random/);
    // The render. `APP-2026-` was built by interpolation, so the literal prefix
    // is what to look for rather than the whole token.
    expect(SOURCE).not.toMatch(/APP-\d{4}/);
    expect(SOURCE).not.toMatch(/appNumber/);

    // KNOWN-GOOD CONTROL, same input: real application numbers still exist —
    // they are minted by the store and named on the row they belong to. This
    // page simply is not where they come from.
    expect(SOURCE).toContain('SuccessScreen');
  });

  it('the label that framed it, and the promises beside it, are gone in BOTH locales', () => {
    // ⚠️ Every one of these was a claim made to an external party that nothing
    // in this platform could keep. `next.2` and `next.3` promised an email and
    // onboarding credentials: approving an application mints nothing and sends
    // nothing (B4 parked, C10 §1), so they were
    // `FORWARD-PROMISE-HAS-NO-HANDLER-01` under EVERY option on the table, not
    // only the one that was ruled.
    const retired = [
      'registration.success.title',
      'registration.success.subtitle',
      'registration.success.appNumberLabel',
      'registration.success.nextTitle',
      'registration.success.next.1',
      'registration.success.next.2',
      'registration.success.next.3',
      'registration.success.next.4',
      'registration.success.questions',
    ];
    for (const [name, map] of LOCALES) {
      for (const key of retired) {
        expect(map, `${name} · ${key}`).not.toHaveProperty(key);
        expect(SOURCE, `source · ${key}`).not.toContain(key);
      }
    }
  });

  it('and one honest ending replaces them, in BOTH locales', () => {
    // The other direction. Without this, deleting the whole success panel would
    // pass the test above.
    const kept = [
      'registration.success.headline',
      'registration.success.body',
      'registration.success.restart',
    ];
    for (const [name, map] of LOCALES) {
      for (const key of kept) {
        expect(map, `${name} · ${key}`).toHaveProperty(key);
        expect(map[key].trim(), `${name} · ${key}`).not.toBe('');
      }
      // ⚠️ AND THE TWO LOCALES MUST DIFFER. A fragment that "has the key" in
      // both maps while holding the English string in each is the exact defect
      // browser QA caught one batch ago, and an EN-only suite cannot see it.
      expect(map['registration.success.headline'], name).toBeTruthy();
    }
    expect(registrationId['registration.success.headline']).not.toBe(
      registrationEn['registration.success.headline'],
    );
    expect(registrationId['registration.success.body']).not.toBe(
      registrationEn['registration.success.body'],
    );
    expect(registrationId['registration.success.restart']).not.toBe(
      registrationEn['registration.success.restart'],
    );
  });
});

describe('THE VENDOR NUMBER FIELD LEFT WITH ITS STRINGS', () => {
  it('the eight reconciliation strings are DELETED, not corrected', () => {
    // ⚠️ **THEY WERE NEVER A RECONCILIATION.** The field taught `e.g. 1000456`
    // for an identifier space that holds ZERO rows anywhere in this tree, while
    // the governed roster keys on `sapBpNumber`. There were not two populated
    // spaces to reconcile — there was one space and a copy defect. Correcting
    // the placeholder would have kept a free-text box that could still name a
    // vendor nobody can find; the vendor is now RESOLVED on the buyer door.
    const retired = [
      'registration.step.expansion.field.s4Vendor.label',
      'registration.step.expansion.field.s4Vendor.placeholder',
      'registration.review.field.s4Vendor',
      'registration.validation.s4Vendor.required',
    ];
    for (const [name, map] of LOCALES) {
      for (const key of retired) {
        expect(map, `${name} · ${key}`).not.toHaveProperty(key);
      }
    }
    expect(SOURCE).not.toContain('s4Vendor');
    // The `1000456` shape itself, wherever it might have been re-typed.
    expect(SOURCE).not.toContain('1000456');

    // KNOWN-GOOD CONTROL: the expansion STEP survives — it still collects
    // categories and a reason, so deleting one field left no step without an
    // ending. Only the field that named a register went.
    for (const [name, map] of LOCALES) {
      expect(map, name).toHaveProperty('registration.step.expansion.title');
      expect(map, name).toHaveProperty(
        'registration.step.expansion.field.reason.label',
      );
    }
    expect(SOURCE).toContain('expansionReason');
  });
});

describe('THERE IS NO PERSONA GUARD, AND THAT IS THE RULING', () => {
  it('/register refuses nobody, because there is nobody to refuse', () => {
    // `NoSupplierIdentity` is this tree's refusal precedent and its PRINCIPLE
    // transfers — refuse in full, name the arm, never suggest an act that
    // changes nothing. Its SHAPE does not: a refusal must name the party it
    // refuses, and `middleware.js` fronts every path (`matcher: '/(.*)'`), so
    // every visitor to `/register` already holds Paragon's shared credential.
    // There is no anonymous applicant. The page states what it is instead.
    expect(SOURCE).not.toContain('NoSupplierIdentity');

    // And it is still outside the shell, by design — a pre-login door has no
    // sidebar to go back to.
    expect(SOURCE).not.toContain('AppShellV2');

    // KNOWN-GOOD CONTROL: the honesty marker the surface has carried since
    // D-CENSUS-8 is untouched. This batch deletes claims; it does not delete
    // the thing that was already telling the truth.
    expect(SOURCE).toContain('ProvenanceMarker');
    expect(SOURCE).toContain('capability="supplierRegistration"');
  });
});
