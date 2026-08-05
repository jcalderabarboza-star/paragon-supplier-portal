// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-4a — THE BPOM MECHANISM, TESTED AND NOT WIRED.
//
// Four claims, and they fail for different reasons on purpose:
//
//   1. THE SEED IS A CLASS RULE, not 35 opinions. Every row's value equals its
//      DECLARED GROUP's provisional rule, and the rule itself derives from the
//      2B-1 registry rather than from a typed list of group numbers.
//   2. `'UNDETERMINED'` REFUSES IDENTICALLY TO AN UNKNOWN CODE. Not "similarly".
//      The two outcomes are indistinguishable in effect, and there is no field
//      on the outcome a caller could read to proceed on either.
//   3. NOTHING IS WIRED. `inferBpom` is live, untouched, and still the only
//      thing the receiving surface runs.
//   4. THE FIRING SET MOVED BY ZERO. Asserted against the prefix predicate, not
//      assumed from the fact that no code changed.
//
// ── AND ONE MEASUREMENT THAT IS THE REAL RESULT OF THE BATCH ────────────────
//   The prefix rule and the class rule AGREE on 25 of the master's 35 rows and
//   DISAGREE on ten. The agreement is not evidence; the disagreement is the
//   finding. See `PREFIX-RULE-ASSERTS-A-NEGATIVE-01` below.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { PROVISIONAL_BPOM_BY_GROUP, bpomOf, provisionalBpomForGroup } from '../bpom';
import { MATERIAL_GROUPS } from '../materialGroups';
import { MATERIAL_MASTER } from '../fixtures';
import type { BpomApplicability } from '../types';

const ENTRIES = Object.values(MATERIAL_MASTER);
const CODES = Object.keys(MATERIAL_MASTER).sort();

/** The predicate `inferBpom` applies (`GRInspectionWizard.tsx:129-131`).
 *  Deliberately a COPY, for the same reason `materialIdentity.test.ts` copies
 *  it: importing it would couple a regulatory pin to a component's export
 *  surface, and the point is to detect the day the two stop agreeing. */
const prefixRuleSays = (code: string) => code.startsWith('AI-') || code.startsWith('FR-');

describe('2B-4a — the seed is a CLASS RULE, and the rule DERIVES', () => {
  it('every declared group has a provisional ruling, and the set derives from the registry', () => {
    // `CENSUS-MUST-DERIVE-01` applied to the rule's own domain: the keys are the
    // registry's groups, not a list somebody kept in step by hand. A group added
    // to `materialGroups.ts` without a thought about BPOM appears here
    // automatically — as `'UNDETERMINED'`, which refuses.
    expect(Object.keys(PROVISIONAL_BPOM_BY_GROUP).sort()).toEqual(
      MATERIAL_GROUPS.map((g) => g.group).sort(),
    );
  });

  it('packaging is NOT_APPLICABLE by the registry AXIS, never by a group number', () => {
    // ⚠️ THE POINT OF DERIVING IT. The 2B-4a dispatch enumerated the packaging
    // groups as "MG-20..24". `MG-25` (glass) was declared at 2B-1 — AFTER that
    // enumeration was formed — and is covered here without anybody editing a
    // list. A rule written as a list of group numbers is a census matching a
    // shape, one field over.
    const packaging = MATERIAL_GROUPS.filter(
      (g) => g.axis === 'packaging-substrate' || g.axis === 'packaging-function',
    ).map((g) => g.group);
    expect(packaging).toContain('MG-25');
    for (const g of packaging) {
      expect(PROVISIONAL_BPOM_BY_GROUP[g], `${g} is packaging`).toBe('NOT_APPLICABLE');
    }
  });

  it('the THREE ruled ingredient groups are APPLICABLE and every other group is UNDETERMINED', () => {
    expect(
      Object.entries(PROVISIONAL_BPOM_BY_GROUP)
        .filter(([, v]) => v === 'APPLICABLE')
        .map(([g]) => g)
        .sort(),
    ).toEqual(['MG-04', 'MG-05', 'MG-06']);
    expect(
      Object.entries(PROVISIONAL_BPOM_BY_GROUP)
        .filter(([, v]) => v === 'UNDETERMINED')
        .map(([g]) => g)
        .sort(),
    ).toEqual(['MG-01', 'MG-02', 'MG-03', 'MG-10']);
  });

  it('an UNDECLARED group defaults to UNDETERMINED — fail-CLOSED, not fail-open', () => {
    // The property `inferBpom` structurally lacks: an unrecognised input there
    // comes back `false`, which is an ASSERTION that no check is required.
    expect(provisionalBpomForGroup('MG-99')).toBe('UNDETERMINED');
    expect(bpomOf('RM-SPOOF').ok).toBe(false);
  });

  it('all 35 master rows carry the field, and each equals its GROUP rule', () => {
    // The pin that makes "seeded from class, all provisional" a MEASURED fact
    // rather than a claim in a header. ⚠️ WHEN A ROW IS RATIFIED INDIVIDUALLY,
    // THIS NARROWS AND THE RATIFICATION IS RECORDED — it must not be loosened
    // to let a per-row override slip in unannounced.
    expect(ENTRIES).toHaveLength(35);
    const drifted = ENTRIES.filter(
      (e) => e.bpomApplicable !== provisionalBpomForGroup(e.materialGroup),
    ).map((e) => `${e.materialCode} (${e.materialGroup}) = ${e.bpomApplicable}`);
    expect(drifted).toEqual([]);
  });

  it('the three-way split is 16 / 9 / 10, and VERP implies NOT_APPLICABLE', () => {
    const count = (v: BpomApplicability) =>
      ENTRIES.filter((e) => e.bpomApplicable === v).length;
    expect(count('APPLICABLE')).toBe(16);
    expect(count('NOT_APPLICABLE')).toBe(9);
    expect(count('UNDETERMINED')).toBe(10);
    // A CROSS-CHECK, not a second rule. Every packaging-material row also
    // carries `materialType: 'VERP'`, so the class rule and the SAP taxonomy
    // agree — asserted rather than encoded, because two rules for one fact is
    // how they drift apart.
    for (const e of ENTRIES) {
      if (e.materialType === 'VERP') {
        expect(e.bpomApplicable, e.materialCode).toBe('NOT_APPLICABLE');
      }
    }
  });

  it('the value is NEVER a boolean — a truthiness read cannot be accidentally right', () => {
    // ⚠️ THE ENCODING DECISION, PINNED. The dispatch specified the states as
    // `true | false | UNDETERMINED`. In a `boolean | 'UNDETERMINED'` union the
    // string member is TRUTHY, so `if (e.bpomApplicable)` compiles, reads as
    // obviously correct, and silently converts an absence of determination into
    // a determination. As three strings, that mistake is wrong for EVERY value
    // and fails on first contact instead of on the one case it was built for.
    for (const e of ENTRIES) expect(typeof e.bpomApplicable).toBe('string');
  });
});

describe('2B-4a — UNDETERMINED REFUSES IDENTICALLY TO AN UNKNOWN CODE', () => {
  const undeterminedCode = CODES.find(
    (c) => MATERIAL_MASTER[c].bpomApplicable === 'UNDETERMINED',
  )!;

  it('both refusals carry the SAME shape and NOTHING to proceed on', () => {
    const unknown = bpomOf('RM-NOT-IN-THE-MASTER');
    const undetermined = bpomOf(undeterminedCode);
    expect(unknown.ok).toBe(false);
    expect(undetermined.ok).toBe(false);
    // ⚠️ NOT A STYLE POINT. `applicable` is absent from BOTH — there is no
    // field a caller could read, default, or coerce in either case. A refusal
    // that carries a usable value is a quarantine wearing a refusal's name.
    expect('applicable' in unknown).toBe(false);
    expect('applicable' in undetermined).toBe(false);
    // Structurally indistinguishable except for the key that NAMES what is
    // missing — which exists so a refusal can say WHICH, not so a caller can
    // pick one to ignore.
    expect(Object.keys(unknown).sort()).toEqual(Object.keys(undetermined).sort());
  });

  it('the reason NAMES what is missing, and the two are different facts', () => {
    // Identical in EFFECT, different in FACT. Absence of a code and absence of
    // a determination are not the same thing — the same distinction C9 §5.3
    // ruled on for `ADJUDICATED_UNRESOLVED` (somebody looked and could not
    // close it) versus a missing row (nobody looked).
    expect(bpomOf('RM-NOT-IN-THE-MASTER')).toEqual({
      ok: false,
      reason: 'UNKNOWN_MATERIAL',
      materialCode: 'RM-NOT-IN-THE-MASTER',
    });
    expect(bpomOf(undeterminedCode)).toEqual({
      ok: false,
      reason: 'UNDETERMINED_APPLICABILITY',
      materialCode: undeterminedCode,
    });
  });

  it('UNDETERMINED IS NOT QUARANTINE — no consumer can obtain a value from it', () => {
    // Quarantine STORES AN UNTRUSTWORTHY FACT AND LETS WORK PROCEED ON IT.
    // `'UNDETERMINED'` STORES AN EXPLICIT ABSENCE OF DETERMINATION AND REFUSES.
    // Stated as a property over the WHOLE master rather than one example: not
    // one of the ten undetermined rows yields an `ok` outcome, at any code.
    const undetermined = CODES.filter(
      (c) => MATERIAL_MASTER[c].bpomApplicable === 'UNDETERMINED',
    );
    expect(undetermined).toHaveLength(10);
    expect(undetermined.filter((c) => bpomOf(c).ok)).toEqual([]);
  });

  it('a determination DOES answer — the refusal is not a blanket one', () => {
    // The floor that stops the three tests above passing vacuously: if `bpomOf`
    // refused everything they would all still be green.
    expect(bpomOf('AI-NIAC-6601')).toEqual({ ok: true, applicable: true });
    expect(bpomOf('PK-PETB-8810')).toEqual({ ok: true, applicable: false });
  });
});

describe('PREFIX-RULE-ASSERTS-A-NEGATIVE-01 — the two mechanisms, MEASURED', () => {
  it('they agree on 25 of the 35 master rows — and the agreement is not evidence', () => {
    // ⚠️ THE AGREEMENT IS AN ARTEFACT OF HOW THESE FIXTURES WERE AUTHORED.
    // `AI-` codes are actives and `FR-` codes are fragrance BECAUSE SOMEBODY
    // TYPED THEM THAT WAY, not because a prefix carries meaning — C9 §3 says it
    // carries none. A rule that is right about the data it was written against,
    // wrong about the data it was not, and unable to say which is which, is
    // exactly what a shape-matched census looks like in regulatory clothes.
    const answerable = CODES.filter((c) => bpomOf(c).ok);
    const agree = answerable.filter((c) => {
      const o = bpomOf(c);
      return o.ok && o.applicable === prefixRuleSays(c);
    });
    expect(answerable).toHaveLength(25);
    expect(agree).toHaveLength(25);
  });

  it('THE TEN: where the prefix rule states a confident NO and nobody has ruled', () => {
    // This is the fail-open that is NOT `BPOM-OFF-BY-SPACE-01`. That one is
    // about a vocabulary OUTSIDE the master. These ten are INSIDE it: the
    // master resolves every one, the prefix rule returns `false` for every one,
    // and `false` IS AN ASSERTION — "this lot needs no BPOM lot check". A
    // prefix rule has no way to say "undetermined", so every code it does not
    // recognise becomes a negative it has no basis for.
    const undetermined = CODES.filter((c) => !bpomOf(c).ok);
    expect(undetermined).toEqual([
      'RM-COCO-8200',
      'RM-EMUL-3310',
      'RM-EMUL-3320',
      'RM-EMUL-9410',
      'RM-EMUL-9430',
      'RM-HUMEC-3405',
      'RM-LAURIC-7200',
      'RM-MYRST-7310',
      'RM-PALM-7100',
      'RM-STEAR-7300',
    ]);
    // Every one of them: prefix rule says NO CHECK, master says NO RULING.
    expect(undetermined.filter(prefixRuleSays)).toEqual([]);
  });

  it('THE FIRING SET IS UNCHANGED BY THIS BATCH — asserted, not assumed', () => {
    // The dispatch's standing requirement. 2B-2 and 2B-3 moved it by zero and
    // so must this. The mechanisms are disjoint: `inferBpom` reads a PREFIX,
    // this batch writes a MASTER FIELD nothing calls. Pinned against the
    // predicate rather than inferred from "we did not edit a code".
    expect(CODES.filter(prefixRuleSays)).toEqual([
      'AI-CENT-6900',
      'AI-HYALU-6610',
      'AI-NIAC-6601',
      'AI-NIAC-6605',
      'AI-PANTO-6640',
      'AI-PEPTIDE-8801',
      'AI-RETA-6750',
      'AI-SALI-6800',
      'AI-VITC-6720',
      'AI-VITC-6730',
      'FR-EMIN-4420',
      'FR-MKOV-5510',
      'FR-MKOV-5520',
      'FR-WARD-4410',
      'FR-WARD-4430',
      'FR-WARD-4440',
    ]);
    // …and the sixteen the class rule marks APPLICABLE are the SAME sixteen.
    // Worth stating explicitly because it is the strongest form of "the
    // behaviour did not move": on every row the new mechanism can answer at
    // all, it answers what the old one answers. THE ENTIRE VALUE OF THE SWAP
    // IS IN THE ROWS IT REFUSES.
    expect(CODES.filter((c) => MATERIAL_MASTER[c].bpomApplicable === 'APPLICABLE')).toEqual(
      CODES.filter(prefixRuleSays),
    );
  });
});

describe('2B-4a — the gate: AUTHORED, NOT WIRED', () => {
  it('the GR wizard still runs the PREFIX rule, and this module has no consumer', async () => {
    // ⚠️ THE CONSTRAINT THE DISPATCH IS BUILT AROUND, checked rather than
    // promised. A future batch that wires `bpomOf` must delete this assertion
    // deliberately — which is the point.
    const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const wizard = sources['/src/components/v2-features/GRInspectionWizard.tsx'];
    expect(wizard).toBeDefined();
    expect(wizard).toContain("materialCode.startsWith('AI-')");
    expect(wizard).not.toContain('bpomOf');
    expect(wizard).not.toContain('bpomApplicable');

    // NOTHING IN THE TREE IMPORTS THE MECHANISM. `sdc/bpom.ts` is DECLARED
    // INERT the same way the C9 crosswalk shape is: an artifact that exists so
    // the wiring batch has something to wire, not dead code.
    //
    // ⚠️ NOTE FOR THE NEXT AUTHOR — the sibling module is deliberately NOT
    // named here. `ledgerTruth.test.ts`'s C9 §7.1 pin greps the tree for that
    // FILE NAME and cannot tell an import from a sentence, so writing it in a
    // comment turns its "zero consumers" assertion red
    // (`PROSE-COUNTS-AS-A-SITE-01`, filed at 2B-4a).
    //
    // ⚠️ TWO GUARDS AGAINST A VACUOUS PASS, because "nobody imports it" is the
    // shape that passes when the search is broken (`--passWithNoTests` one
    // layer in). The population is checked, and a file that DOES name the
    // module is checked to be findable — `sdc/bpom.ts` names itself in its own
    // header prose, so a scan returning literally nothing is a broken scan.
    expect(Object.keys(sources).length).toBeGreaterThan(400);
    expect(
      Object.entries(sources)
        .filter(([, t]) => t.includes('bpomOf'))
        .map(([f]) => f)
        .sort(),
      // Both are PROSE-or-declaration sites, not calls: `bpom.ts` declares it,
      // `types.ts` names it in the doc comment that sends a reader there.
    ).toEqual(['/src/services/sdc/bpom.ts', '/src/services/sdc/types.ts']);

    // ⚠️ AND THE LIMIT OF THIS CHECK, STATED: Vite's `import.meta.glob` EXCLUDES
    // THE MODULE IT IS WRITTEN IN, so this scan is structurally unable to see
    // its own file — which is the one file that DOES import `bpomOf`. Recorded
    // rather than worked around: a check that cannot see itself must say so, or
    // the next reader takes its silence for coverage.
    expect(sources['/src/services/sdc/__tests__/bpomApplicability.test.ts']).toBeUndefined();
    const importers = Object.entries(sources)
      .filter(([f]) => !f.endsWith('/sdc/bpom.ts'))
      .filter(([, text]) => text.includes("/bpom'"))
      .map(([f]) => f);
    expect(importers).toEqual([]);
  });
});
