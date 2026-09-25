// ────────────────────────────────────────────────────────────────────────────
// THE SENTENCE-STOP FORMATTER — one full stop where copy follows a name.
//
// ⚠️ **THE DEFECT: A NAME IS DATA, AND SOME NAMES END IN A FULL STOP.**
// `Sample Vitamins Co.` · `Sample Aromatics Sdn. Bhd.` ·
// `Sample Salicylics & Niacinamide Ltd.` are legal forms, not typos — the
// fictional-identity guard (`data/supplierIdentity.test.ts`) admits `Ltd.`,
// `Co.`, `Sdn.`, `Bhd.`, `Pte.` BY NAME as jurisdiction forms. When copy puts
// its own sentence-ending stop straight after one, the reader gets two:
//
//     'Listing psl-015 raised for Sample Salicylics & Niacinamide Ltd.. It is…'
//
// Measured on screen (browser QA, both locales) before this module existed.
//
// ── ⚠️ WHY THE REMEDY IS HERE AND NOT IN THE DATA ──────────────────────────
//   **The name is never edited to fit the copy.** A supplier's legal name is a
//   fact about the supplier; a sentence is a fact about the sentence. Editing
//   the first to suit the second is the same class as `readScopeOwner: () =>
//   null` — a data value bent to make a rendering behave.
//
// ── ⚠️ WHY IT IS DECLARED IN THE COPY, NOT APPLIED AT THE CALL SITE ────────
//   `t('psl.toast.proposed', { supplier: stopName(name) })` produces the same
//   output and puts the remedy SOMEWHERE OTHER THAN WHERE THE STOP IS VISIBLE,
//   so every future call site has to remember. A rule enforced by memory is the
//   instrument this repository exists because it does not trust. Written as
//   `{{supplier, stop}}.` the decision and the stop it answers are the SAME
//   BYTES — the `i18n-defer:` property, applied to punctuation.
//
//   It also makes the two locales INDEPENDENT, which they must be. Measured:
//   `sdcSup.empty.subtitle` reads `'…published to {{supplier}} yet.'` in EN
//   (no adjacency, no defect) and `'…diterbitkan ke {{supplier}}.'` in ID (the
//   defect). A remedy driven by reading EN copy does not see the ID string.
//
// ── ⚠️ AND WHY IT IS UNCONDITIONAL — THIS IS THE LOAD-BEARING PART ─────────
//   **EVERY interpolation immediately followed by `.` carries it, whatever the
//   variable holds.** A date, an id, a count, a UoM can never end in a stop, so
//   the formatter is a NO-OP on them — which is exactly why applying it to them
//   costs nothing and removes the only thing that could rot: the per-site
//   judgement *"is this variable a name?"*
//
//   That judgement is where the class comes back. `{{material}}` is free text
//   (C7 GG-4) and `{{company}}` is operator-typed, so both are unbounded today;
//   `{{supplier}}` is bounded only until arc 1 makes the certificate registry
//   operator-editable and arc 3 lets a supplier raise their own application.
//   A seat that has to decide will one day decide wrong; a seat with one form
//   cannot. Same argument the merge doctrine makes for `--merge`.
//
//   The unconditionality is also what removes the ALLOWLIST. Under a
//   "names only" rule, the ~14 system tokens would need a bilateral exemption
//   list stating why each can never end in a stop. Under this rule there is
//   nothing to exempt and nothing to maintain.
//
// ── THE GUARD IS WHAT ENFORCES IT, NOT THIS COMMENT ────────────────────────
//   `src/lib/i18n/nameStop.guard.test.ts` derives the population — every
//   interpolation immediately followed by `.`, in every fragment, BOTH locales,
//   including `src/lib/i18n.ts` and multi-line concatenated values — and
//   requires the formatter on each. It re-decides itself: a new string written
//   with a bare `{{x}}.` is a defect the day it lands, with nobody editing the
//   gate.
// ────────────────────────────────────────────────────────────────────────────

import type { i18n as I18nInstance } from 'i18next';

/**
 * The format specifier, named ONCE so the strings, the registration and the
 * guard cannot drift apart. The guard imports this rather than spelling
 * `'stop'` a third time.
 */
export const NAME_STOP_FORMAT = 'stop';

/**
 * Drop **one** trailing full stop, so the copy's own stop is the only one.
 *
 * ⚠️ **EXACTLY ONE, AND EXACTLY TRAILING.** `Sdn. Bhd.` keeps its interior stop
 * and loses only the last — the abbreviation stays an abbreviation. A value
 * that does not end in `.` is returned unchanged, which is what makes the
 * formatter safe to apply unconditionally.
 *
 * ⚠️ **TRAILING WHITESPACE IS NOT TRIMMED.** Trimming is a SECOND decision
 * about a different defect, and a formatter that quietly makes two changes is a
 * formatter nobody can reason about. `'Co. '` is left alone here and would be a
 * data problem, visible as one.
 */
export function stopName(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s.endsWith('.') ? s.slice(0, -1) : s;
}

/**
 * Register `stopName` as the `stop` interpolation formatter.
 *
 * ⚠️ **IT THROWS RATHER THAN NO-OPS WHEN THE FORMATTER SERVICE IS ABSENT, AND
 * THAT IS THE WHOLE POINT OF THE FUNCTION.** i18next resolves an UNKNOWN format
 * specifier by logging a warning and returning the value unformatted — so a
 * registration that silently failed would render `Ltd..` again while every gate
 * stayed green. That is silent optimism on a path the reader sees, so the
 * failure is made loud and immediate instead: a broken boot beats a quiet
 * revert to the defect.
 *
 * Must be called AFTER `init()`, which is when `services.formatter` exists.
 */
export function registerNameStop(instance: I18nInstance): void {
  const formatter = instance.services?.formatter;
  if (!formatter) {
    throw new Error(
      'registerNameStop: i18next has no formatter service — the `stop` format ' +
        'would resolve to an unformatted value and the double full stop would ' +
        'return silently. Call this after init().',
    );
  }
  formatter.add(NAME_STOP_FORMAT, (value: unknown) => stopName(value));
}
