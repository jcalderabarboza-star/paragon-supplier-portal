// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · H1 — THE HALAL MECHANISM, TESTED AND NOT WIRED.
//
// Five claims, and they fail for different reasons on purpose:
//
//   1. THE SEED IS A CLASS RULE, not 42 opinions. Every row's value equals its
//      DECLARED GROUP's provisional rule — with NO exception, unlike BPOM's one
//      documented deviation — and the rule derives from the 2B-1 registry's
//      `axis` rather than from any group number.
//   2. ⚠️ PACKAGING IS `'UNDETERMINED'`, NOT THE BPOM AXIS RULE. The two
//      modules DISAGREE on every packaging group, deliberately, and the
//      disagreement is asserted so that copying the neighbouring rule goes red.
//   3. `'UNDETERMINED'` REFUSES IDENTICALLY TO AN UNKNOWN CODE, and the reason
//      reaches only the message: there is no field a caller could read to
//      proceed on either.
//   4. NOTHING IS WIRED. `inferHalal` is live, untouched, and still the only
//      thing the receiving surface runs. `halalOf` has no production consumer.
//   5. THE FIRING SET MOVED BY ZERO — asserted against the prose predicate, not
//      assumed from the fact that no description changed.
//
// ── AND ONE MEASUREMENT THAT IS THE REAL RESULT OF THE BATCH ────────────────
//   Pointed at the master's own labels, the prose parse and the class rule
//   agree on FOUR of 42 rows and disagree on THIRTY-EIGHT. See
//   `HALAL-PROSE-READS-AN-ANSWER-01` below: the four it fires on are the four
//   whose labels claim the material ALREADY IS halal — an answer, not a
//   question — which is a different defect from the fail-open it is filed for.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { PROVISIONAL_BPOM_BY_GROUP } from '../bpom';
import {
  PROVISIONAL_HALAL_BY_GROUP,
  halalOf,
  provisionalHalalForAxis,
  provisionalHalalForGroup,
} from '../halal';
import { MATERIAL_GROUPS } from '../materialGroups';
import { MATERIAL_MASTER } from '../fixtures';
import type { HalalApplicability } from '../types';

const ENTRIES = Object.values(MATERIAL_MASTER);
const CODES = Object.keys(MATERIAL_MASTER).sort();

/** The predicate `inferHalal` applies (`GRInspectionWizard.tsx:272-275`).
 *  Deliberately a COPY, on `bpomApplicability.test.ts`'s precedent: importing it
 *  would couple a regulatory pin to a component's export surface, and the point
 *  is to detect the day the two stop agreeing.
 *
 *  ⚠️ AND A COUNTERFACTUAL, STATED RATHER THAN GLOSSED. `inferHalal` reads an
 *  `AsnLineItem` / `ShipmentLineItem` `description`, NEVER a master label. What
 *  the comparisons below measure is the MECHANISM applied to the master's
 *  population — the same counterfactual `bpomApplicability.test.ts` runs when it
 *  applies the prefix rule to all 42 codes. The receiving-lane measurement is a
 *  different quantity and is recorded in `findings.md` (it fires on four fixture
 *  lines, NONE of them receivable). */
const proseRuleSays = (label: string) => label.toLowerCase().includes('halal');

const PACKAGING_GROUPS = MATERIAL_GROUPS.filter(
  (g) => g.axis === 'packaging-substrate' || g.axis === 'packaging-function',
).map((g) => g.group);

describe('H1 — the seed is a CLASS RULE, and the rule DERIVES FROM THE AXIS', () => {
  it('every declared group has a provisional ruling, and the set derives from the registry', () => {
    // `CENSUS-MUST-DERIVE-01` applied to the rule's own domain: the keys are the
    // registry's groups, not a list somebody kept in step by hand. A group added
    // to `materialGroups.ts` without a thought about halal appears here
    // automatically — as `'UNDETERMINED'`, which refuses.
    expect(Object.keys(PROVISIONAL_HALAL_BY_GROUP).sort()).toEqual(
      MATERIAL_GROUPS.map((g) => g.group).sort(),
    );
  });

  it('NO GROUP NUMBER IS DATA in the module — measured against bpom.ts, which has three', () => {
    // The structural difference between the two rules, asserted rather than
    // claimed in a header. `bpom.ts` names `MG-04`/`MG-05`/`MG-06` as quoted
    // literals; this rule reads the `axis` and nothing else, so there is no list
    // for a new group to be missing from.
    const src = import.meta.glob('/src/services/sdc/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    expect(src['/src/services/sdc/halal.ts']).toBeDefined();
    expect(/'MG-\d/.test(src['/src/services/sdc/halal.ts'])).toBe(false);
    // …and the control, so a broken regex cannot pass this vacuously.
    expect(/'MG-\d/.test(src['/src/services/sdc/bpom.ts'])).toBe(true);
    // C9 §3, ratified: no prefix or substring rule decides anything here.
    expect(src['/src/services/sdc/halal.ts']).not.toContain('startsWith(');
  });

  it('⚠️ PACKAGING IS UNDETERMINED — Seat 3, D-COMP-HALAL-1 — and NOT the BPOM rule', () => {
    // THE REFINEMENT, PINNED. BPOM excludes packaging and rules it
    // `NOT_APPLICABLE` by the same registry axis. Halal may not: `doc-001` is an
    // MUI halal certificate linked to a PET bottle material, and
    // `AdaptiveContext.tsx:89` puts `packaging` inside its `isHalal` selector.
    // We do not know, so the seed says we do not know.
    expect(PACKAGING_GROUPS).toContain('MG-25');
    for (const g of PACKAGING_GROUPS) {
      expect(PROVISIONAL_HALAL_BY_GROUP[g], `${g} is packaging`).toBe('UNDETERMINED');
      // ⚠️ THE TWO REGIMES DISAGREE, ON EVERY PACKAGING GROUP, IN WRITING.
      // Copying the neighbouring rule because the shape was available turns this
      // red — which is the entire job of this assertion.
      expect(PROVISIONAL_BPOM_BY_GROUP[g], `${g} under BPOM`).toBe('NOT_APPLICABLE');
    }
  });

  it('everything that ENTERS or FEEDS a formulation is REQUIRED, and nothing else is ruled', () => {
    const ingredientAxes = MATERIAL_GROUPS.filter(
      (g) => g.axis === 'formulation-ingredient' || g.axis === 'upstream-input',
    ).map((g) => g.group);
    for (const g of ingredientAxes) {
      expect(PROVISIONAL_HALAL_BY_GROUP[g], g).toBe('REQUIRED');
    }
    // Stated as a partition so a third value cannot appear without failing.
    expect(
      Object.entries(PROVISIONAL_HALAL_BY_GROUP)
        .filter(([, v]) => v === 'REQUIRED')
        .map(([g]) => g)
        .sort(),
    ).toEqual([...ingredientAxes].sort());
    expect(
      Object.entries(PROVISIONAL_HALAL_BY_GROUP)
        .filter(([, v]) => v === 'UNDETERMINED')
        .map(([g]) => g)
        .sort(),
    ).toEqual([...PACKAGING_GROUPS].sort());
    // ⚠️ NO GROUP IS RULED `'NOT_REQUIRED'`. Not an omission — see the split
    // test below, which states it as a property of the whole master.
    expect(Object.values(PROVISIONAL_HALAL_BY_GROUP)).not.toContain('NOT_REQUIRED');
  });

  it('an UNDECLARED group — and an UNDECLARED AXIS — default to UNDETERMINED', () => {
    // Fail-CLOSED, not fail-open. The property the prose parse structurally
    // lacks: a description it does not match comes back `false`, which is an
    // ASSERTION that no halal check is required.
    expect(provisionalHalalForGroup('MG-99')).toBe('UNDETERMINED');
    expect(halalOf('RM-SPOOF').ok).toBe(false);
    // ⚠️ THE THIRD BRANCH, EXERCISED. `MaterialGroupAxis` is exhaustive today,
    // so a future axis cannot be reached through the registry — and a default
    // nobody can exercise is a claim, not a mechanism.
    expect(provisionalHalalForAxis('a-kind-of-classification-nobody-has-declared')).toBe(
      'UNDETERMINED',
    );
    expect(provisionalHalalForAxis('formulation-ingredient')).toBe('REQUIRED');
  });

  it('all 42 master rows carry the field, and each equals its GROUP rule — NO exceptions', () => {
    // The pin that makes "seeded from class, all provisional" a MEASURED fact
    // rather than a claim in a header. ⚠️ WHEN A ROW OR A GROUP IS RATIFIED,
    // THIS NARROWS AND THE RATIFICATION IS RECORDED — it must not be loosened
    // to let a per-row override slip in unannounced.
    expect(ENTRIES).toHaveLength(42);
    const drifted = ENTRIES.filter(
      (e) => e.halalApplicable !== provisionalHalalForGroup(e.materialGroup),
    ).map((e) => `${e.materialCode} (${e.materialGroup}) = ${e.halalApplicable}`);
    // ⚠️ EXACTLY ZERO, AND THE CONTRAST WITH BPOM IS THE POINT. That field
    // carries ONE recorded deviation (`RM-EMUL-9440`, on `doc-201` — a
    // determination somebody actually made). NOTHING in this tree is a halal
    // determination somebody made about a MATERIAL: `doc-001` is a certificate
    // about a SUPPLIER'S material, which is `D-COMP-HALAL-2`'s grain question
    // and not this field's answer. So there is no evidence to deviate on, and
    // no deviation is authored to make the seed look better-evidenced.
    expect(drifted).toEqual([]);
  });

  it('the three-way split is 31 / 0 / 11 — and the ZERO is an assertion, not a gap', () => {
    const count = (v: HalalApplicability) =>
      ENTRIES.filter((e) => e.halalApplicable === v).length;
    expect(count('REQUIRED')).toBe(31);
    expect(count('UNDETERMINED')).toBe(11);
    // ⚠️ **ZERO `'NOT_REQUIRED'`, DELIBERATELY.** No row in this master has a
    // basis for saying a halal determination is unnecessary. The one group where
    // that could have been argued by analogy — packaging, which BPOM excludes —
    // is precisely the group Seat 3 ruled UNDETERMINED. A state left unused is
    // honest; a state filled in to make the enum look exercised is a fabricated
    // determination, which is what this whole field exists to prevent.
    expect(count('NOT_REQUIRED')).toBe(0);
    // The consequence, stated where a reader will hit it: `halalOf` CANNOT
    // return `{ ok: true, required: false }` against today's master.
    expect(CODES.filter((c) => { const o = halalOf(c); return o.ok && !o.required; })).toEqual([]);
    // A CROSS-CHECK, not a second rule. Every packaging row also carries
    // `materialType: 'VERP'` and every ingredient row `'ROH'`, so the class rule
    // and the SAP taxonomy agree — asserted rather than encoded, because two
    // rules for one fact is how they drift apart.
    for (const e of ENTRIES) {
      expect(e.halalApplicable, e.materialCode).toBe(
        e.materialType === 'VERP' ? 'UNDETERMINED' : 'REQUIRED',
      );
    }
  });

  it('the value is NEVER a boolean — a truthiness read cannot be accidentally right', () => {
    // The 2B-4a encoding decision, applied unchanged: in a
    // `boolean | 'UNDETERMINED'` union the string member is TRUTHY, so
    // `if (e.halalApplicable)` compiles, reads as obviously correct, and
    // silently converts an absence of determination into a determination.
    for (const e of ENTRIES) expect(typeof e.halalApplicable).toBe('string');
  });
});

describe('H1 — UNDETERMINED REFUSES IDENTICALLY TO AN UNKNOWN CODE', () => {
  const undeterminedCode = CODES.find(
    (c) => MATERIAL_MASTER[c].halalApplicable === 'UNDETERMINED',
  )!;

  it('both refusals carry the SAME shape and NOTHING to proceed on', () => {
    const unknown = halalOf('RM-NOT-IN-THE-MASTER');
    const undetermined = halalOf(undeterminedCode);
    expect(unknown.ok).toBe(false);
    expect(undetermined.ok).toBe(false);
    // ⚠️ NOT A STYLE POINT. `required` is absent from BOTH — there is no field a
    // caller could read, default, or coerce in either case. A refusal that
    // carries a usable value is a quarantine wearing a refusal's name.
    expect('required' in unknown).toBe(false);
    expect('required' in undetermined).toBe(false);
    expect(Object.keys(unknown).sort()).toEqual(Object.keys(undetermined).sort());
  });

  it('the reason NAMES what is missing, and it reaches ONLY the message', () => {
    // Identical in EFFECT, different in FACT. Absence of a code and absence of a
    // determination are not the same thing — the same distinction C9 §5.3 ruled
    // on for `ADJUDICATED_UNRESOLVED` (somebody looked and could not close it)
    // versus a missing row (nobody looked). ⚠️ NO CALLER MAY BRANCH ON THE
    // REASON TO PROCEED: the two outcomes are structurally interchangeable above
    // except for this key, so a consumer written with ONE refusal branch cannot
    // accidentally acquire a second.
    expect(halalOf('RM-NOT-IN-THE-MASTER')).toEqual({
      ok: false,
      reason: 'UNKNOWN_MATERIAL',
      materialCode: 'RM-NOT-IN-THE-MASTER',
    });
    expect(halalOf(undeterminedCode)).toEqual({
      ok: false,
      reason: 'UNDETERMINED_APPLICABILITY',
      materialCode: undeterminedCode,
    });
  });

  it('UNDETERMINED IS NOT QUARANTINE — no consumer can obtain a value from it', () => {
    // Quarantine STORES AN UNTRUSTWORTHY FACT AND LETS WORK PROCEED ON IT.
    // `'UNDETERMINED'` STORES AN EXPLICIT ABSENCE OF DETERMINATION AND REFUSES.
    // Stated as a property over the WHOLE master rather than one example.
    const undetermined = CODES.filter(
      (c) => MATERIAL_MASTER[c].halalApplicable === 'UNDETERMINED',
    );
    expect(undetermined).toHaveLength(11);
    expect(undetermined.filter((c) => halalOf(c).ok)).toEqual([]);
    // And they are exactly the packaging rows — the eleven `D-COMP-HALAL-1` is
    // about, and 4 of the 9 receivable lines live in this set.
    expect(
      undetermined.every((c) => PACKAGING_GROUPS.includes(MATERIAL_MASTER[c].materialGroup)),
    ).toBe(true);
  });

  it('a determination DOES answer — the refusal is not a blanket one', () => {
    // The floor that stops the three tests above passing vacuously: if `halalOf`
    // refused everything they would all still be green.
    expect(halalOf('RM-PSTN-7150')).toEqual({ ok: true, required: true });
    expect(halalOf('AI-NIAC-6601')).toEqual({ ok: true, required: true });
    expect(halalOf('PK-PETB-8810')).toEqual({
      ok: false,
      reason: 'UNDETERMINED_APPLICABILITY',
      materialCode: 'PK-PETB-8810',
    });
  });
});

describe('HALAL-PROSE-READS-AN-ANSWER-01 — the two mechanisms, MEASURED', () => {
  const proseFires = CODES.filter((c) => proseRuleSays(MATERIAL_MASTER[c].label));

  it('the prose parse fires on FOUR of 42 labels — and every one asserts an ANSWER', () => {
    // ⚠️ THE FINDING, AND IT IS NOT THE FAIL-OPEN. Every label the parse matches
    // says the material ALREADY IS halal — *Halal Emulsifier*, *Halal Certified*,
    // *(Halal)*, *Halal, Food & Cosmetic Grade*. The rule reads a CLAIM OF
    // COMPLIANCE and returns "a check is required". Those are different facts,
    // and the substring cannot tell them apart in either direction: the same
    // predicate returns `true` for *"non-halal"* and *"halal audit failed"*.
    expect(proseFires).toEqual([
      'RM-EMUL-9410',
      'RM-EMUL-9430',
      'RM-LAURIC-7200',
      'RM-STEAR-7300',
    ]);
    for (const c of proseFires) {
      expect(MATERIAL_MASTER[c].label.toLowerCase()).toMatch(/halal/);
    }
  });

  it('they agree on 4 rows and DISAGREE on 38 — and the disagreement is the finding', () => {
    // The class rule says REQUIRED on 31 rows. The prose parse says "check" on
    // four of them and states a CONFIDENT NEGATIVE on the other 27 — including
    // `RM-PSTN-7150` (RBD Palm Stearin), the single most halal-load-bearing row
    // in the master, whose label happens not to contain the word.
    const answerable = CODES.filter((c) => halalOf(c).ok);
    expect(answerable).toHaveLength(31);
    const agree = answerable.filter((c) => {
      const o = halalOf(c);
      return o.ok && o.required === proseRuleSays(MATERIAL_MASTER[c].label);
    });
    expect(agree).toEqual(proseFires);
    expect(answerable.length - agree.length).toBe(27);
    // ⚠️ AND ON THE ELEVEN THE MASTER REFUSES, THE PROSE PARSE ANSWERS ANYWAY —
    // `false`, on every one. That is the shape `PREFIX-RULE-ASSERTS-A-NEGATIVE-01`
    // named one regulation over: a mechanism with no way to say "undetermined"
    // converts every non-match into a determination it has no basis for. Here it
    // does so on the exact eleven rows `doc-001` gives us reason to doubt.
    const refused = CODES.filter((c) => !halalOf(c).ok);
    expect(refused).toHaveLength(11);
    expect(refused.filter((c) => proseRuleSays(MATERIAL_MASTER[c].label))).toEqual([]);
  });

  it('⚠️ THE FIRING SET MOVED BY ZERO — asserted, not assumed', () => {
    // The dispatch's standing requirement. The two mechanisms are DISJOINT: the
    // parse reads a supplier-typed `description` on a line, this batch writes a
    // master field nothing calls. Pinned against the predicate rather than
    // inferred from what the diff touched, because "I did not edit that file" is
    // not a measurement.
    expect(proseFires).toHaveLength(4);
    expect(CODES.filter((c) => MATERIAL_MASTER[c].halalApplicable === 'REQUIRED')).toHaveLength(
      31,
    );
    // The one-directional containment, stated: everything the parse fires on is
    // also REQUIRED under the class rule, so H2 can only ADD checks, never
    // remove one. Nothing moves from checked to unchecked.
    const required = CODES.filter((c) => MATERIAL_MASTER[c].halalApplicable === 'REQUIRED');
    expect(proseFires.filter((c) => !required.includes(c))).toEqual([]);
  });
});

describe('H2 — WIRED, and the prose parse is GONE', () => {
  // ⚠️ INVERTED, NOT DELETED — the `bpomApplicability.test.ts` discipline, and
  // this file was written at H1 saying a future batch would have to flip every
  // claim below deliberately. H2 is that batch. Each assertion is the exact
  // negation of the one it replaces, so the file records the SWAP rather than
  // merely reflecting whatever is true today.
  const sources = () =>
    import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

  /**
   * Does this file reference `spec` ONLY through `import type`?
   *
   * ⚠️ `CENSUS-COUNTS-TYPE-IMPORTS-01` (CP-3 · E1). The importer scan below
   * counts TEXT, so on its own it cannot tell a CALL from a reference that
   * erases at build. An `import type` cannot invoke `halalOf`; it is gone from
   * the bundle. The two are therefore separated rather than merged in either
   * direction — merging them upward would let a real wire hide behind the word
   * "type", and merging them downward would widen "consumer" to mean "mentions".
   *
   * ⚠️ THE LIMIT, STATED: this reads whole LINES, so a multi-line
   * `import type {\n … } from '…'` would read as a value import and fail the
   * check loudly rather than pass it quietly. Fail-loud is the right direction
   * for a census.
   */
  const importsTypeOnly = (text: string, spec: string): boolean => {
    const lines = text.split('\n').filter((line) => line.includes(spec));
    return lines.length > 0 && lines.every((line) => /^\s*import type\b/.test(line));
  };

  /**
   * ⚠️ CODE ONLY — COMMENTS ARE EXEMPT, AND THE EXEMPTION IS THE POINT.
   *
   * The retired rule is RESTATED in a comment on purpose: a rule has to be
   * written down somewhere to prove it is retired, and the before-and-after of
   * a swap is evidence. A check that cannot tell code from record would force
   * deleting the evidence along with the defect. What must not survive is a
   * parse on a path a receipt can travel.
   *
   * No comment-STRIPPING heuristics (they mangle strings and regex literals,
   * and the failure direction would be a silent miss). A line either IS a
   * comment line or it is code.
   */
  const codeLines = (text: string) =>
    text
      .split('\n')
      .map((line, n) => ({ n: n + 1, line }))
      .filter(({ line }) => !/^\s*(?:\/\/|\/\*|\*)/.test(line));

  it('the GR wizard runs the MASTER LOOKUP, and the prose parse is not in the file', () => {
    const src = sources();
    const wizard = src['/src/components/v2-features/GRInspectionWizard.tsx'];
    expect(wizard).toBeDefined();

    // WAS: `toContain('const inferHalal = …')` and `not.toContain('halalOf(')`.
    // ⚠️ Asserted over CODE lines: the function's text survives in the file as
    // the record of what was removed, one comment block above its replacement.
    expect(codeLines(wizard).filter(({ line }) => line.includes('inferHalal'))).toEqual([]);
    expect(wizard).toContain('halalOf(materialCode)');

    // NOT MERELY CALLED — LOAD-BEARING. The outcome is what the step gate reads,
    // so a refusal cannot be reduced to a banner beside a check that still
    // passes. `GRInspectionWizard.test.tsx` proves the behaviour; this proves the
    // wiring is the one the behaviour runs through.
    expect(wizard).toContain('if (!l.halal.ok) return false;');
    // ⚠️ CP-3 · E4 — THE CLAUSE GAINED A CONJUNCT, AND THIS CENSUS CAUGHT IT.
    // The required-and-unanswered clause now reads its CONSEQUENCE off the
    // enforcement ledger (`sealBlocks`) instead of hard-coding it. The delta is
    // ZERO — the seeded mode is `BLOCK` and `blocks('BLOCK')` is the `true` the
    // clause used to assume — and `GRInspectionWizard.test.tsx` measures that
    // per check and per receivable line.
    //
    // ⚠️ THE REFUSAL LINE ABOVE IS DELIBERATELY UNCHANGED, and the contrast is
    // the point of updating both in one place: a mode may relax the consequence
    // of an ANSWER and may never relax the ABSENCE OF A QUESTION. If a
    // `Blocks` term ever appears on the `!l.halal.ok` line, the assertion above
    // goes red, which is how this census keeps saying something after E4.
    expect(wizard).toContain(
      'if (l.halal.required && !l.halalSealCheck && sealBlocks) return false;',
    );
  });

  it('⚠️ NO PROSE PARSE SURVIVES IN PRODUCTION CODE — derived, not a file list', () => {
    // The dispatch's constraint, asserted the way C9 §7.3's discharge was: a
    // PROPERTY OVER THE WHOLE TREE, not a list of files somebody has to remember
    // to extend. Both parses died in this batch — `inferHalal` (the receiving
    // surface) and `isHalal` (`AdaptiveContext`, the one nobody had found).
    const src = sources();
    expect(Object.keys(src).length).toBeGreaterThan(400);

    // A CASE-FOLDED SUBSTRING TEST against a `halal` literal — the shape of the
    // defect, in any of the spellings JavaScript offers, not just the one that
    // was there.
    //
    // ⚠️ `toLowerCase()` IS PART OF THE PATTERN, DELIBERATELY. A bare
    // `toggles.includes('halal')` (`BuyerDiscovery.tsx:416`) is an ARRAY
    // MEMBERSHIP TEST ON A LITERAL UI TOGGLE ID — not a parse of prose, and
    // matching it would make this pin noisy. **A noisy pin trains people to
    // widen the exemption**, which is the one outcome that would retire the
    // check without anybody deciding to.
    const PROSE_PARSE =
      /toLowerCase\(\)\s*\.\s*(?:includes|indexOf|startsWith|endsWith|search)\(\s*['"`][^'"`]*halal|match\(\s*\/[^/]*halal/i;

    const offenders = Object.entries(src)
      .filter(([f]) => !/\.test\.tsx?$/.test(f))
      .flatMap(([f, text]) =>
        codeLines(text)
          .filter(({ line }) => PROSE_PARSE.test(line))
          .map(({ n }) => `${f}:${n}`),
      )
      .sort();

    // ⚠️ AN EXACT SET OF ONE, NOT AN ALLOWLIST — so a second cannot arrive
    // quietly. `DISCOVERY-CHIP-PROSE-FILTER-01`, reported and NOT fixed here:
    //
    //   supplier.certifications.filter((c) => !c.toLowerCase().includes('halal'))
    //
    // It is a DISPLAY DEDUPE on the buyer discovery card — the halal chip is
    // already rendered from the `halalCertified` boolean, and this drops it from
    // the generic certifications list so it does not appear twice. **It decides
    // nothing regulatory and sits on no path a receipt can travel**, which is
    // why it is out of H2's scope; it is still a prose test over a cert string,
    // which is why it is NAMED here rather than excluded by a cleverer regex.
    // Line moved 213 → 220 at D-CENSUS-8 (the page gained a ProvenanceMarker import
    // and the endorsement-retraction comment above the card's brand chips), then
    // 220 → 214 at PF-2a, when `DISCOVERY-ENDORSEMENT-01` deleted the whole brand
    // block those chips lived in. Both shifts are the same expression moving under
    // an unrelated edit: same file, same line of code, same reason it is out of
    // scope. The address is re-pinned rather than loosened: an exact set of
    // one is the whole point, and a line-number shift is cheap to re-read.
    expect(offenders).toEqual(['/src/pages-v2/BuyerDiscovery.tsx:214']);

    // The two that DID die in this batch, asserted by absence at their own
    // addresses rather than trusted to the count above.
    expect(
      codeLines(src['/src/components/v2-features/GRInspectionWizard.tsx']).filter(({ line }) =>
        PROSE_PARSE.test(line),
      ),
    ).toEqual([]);
    expect(
      codeLines(src['/src/context/AdaptiveContext.tsx']).filter(({ line }) =>
        PROSE_PARSE.test(line),
      ),
    ).toEqual([]);
    // …and `isHalal` is gone from the CODE. Its text survives one comment block
    // above, as the record of what was retired and why — the same exemption, for
    // the same reason.
    expect(
      codeLines(src['/src/context/AdaptiveContext.tsx']).filter(({ line }) =>
        line.includes('isHalal'),
      ),
    ).toEqual([]);

    // The control: the regex is not broken. It still matches the restatements
    // kept as the record — in a comment here, and in test files that hold the
    // before-half of the swap.
    const anyHit = Object.values(src).filter((text) => PROSE_PARSE.test(text)).length;
    expect(anyHit, 'the regex matches nothing at all — the pin is vacuous').toBeGreaterThan(0);
  });

  it('the module HAS a consumer now, and it is the receiving surface', () => {
    const src = sources();
    const importers = Object.entries(src)
      .filter(([f]) => !f.endsWith('/sdc/halal.ts'))
      .filter(([, text]) => text.includes("/halal'"))
      .map(([f]) => f)
      .sort();
    const production = importers.filter((f) => !/\.test\.tsx?$/.test(f));
    const typeOnly = production.filter((f) => importsTypeOnly(src[f], "/halal'"));
    const callers = production.filter((f) => !typeOnly.includes(f));

    // WAS: `toEqual([])` under the header "NO PRODUCTION MODULE IMPORTS IT".
    // Derived rather than listed: exactly one NON-TEST caller, and it is the GR
    // wizard. A second production caller means the lookup has spread to a
    // surface nobody reviewed, which is worth failing over.
    expect(callers).toEqual(['/src/components/v2-features/GRInspectionWizard.tsx']);

    // ⚠️ AND EXACTLY ONE TYPE-ONLY REFERENCE, NAMED (`CENSUS-COUNTS-TYPE-IMPORTS-01`).
    // `src/lib/enforcement.ts` imports `HalalRefusalReason` to derive — at
    // COMPILE TIME — the refusal shapes that sit OUTSIDE the enforcement
    // domain, so a third refusal reason authored here cannot drift in as a
    // governed verdict. It calls nothing. A SECOND type-only reference fails
    // this too: an erased import is not a wire, but it is still a coupling
    // somebody should have to look at.
    expect(typeOnly).toEqual(['/src/lib/enforcement.ts']);

    // ⚠️ THE LIMIT OF THIS CHECK, STATED: Vite's `import.meta.glob` EXCLUDES THE
    // MODULE IT IS WRITTEN IN, so this scan cannot see its own file — which is
    // itself an importer. Recorded rather than worked around: a check that
    // cannot see itself must say so, or the next reader takes its silence for
    // coverage.
    expect(src['/src/services/sdc/__tests__/halalApplicability.test.ts']).toBeUndefined();
  });

  it('the module is NOT re-exported from the sdc barrel — same precedent as bpom.ts', () => {
    // A regulatory lookup that arrives in a barrel export reaches surfaces
    // nobody reviewed. `bpom.ts` is not in `index.ts` either.
    const src = sources();
    expect(src['/src/services/sdc/index.ts']).not.toContain("'./halal'");
    expect(src['/src/services/sdc/index.ts']).not.toContain("'./bpom'");
  });
});
