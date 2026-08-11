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

  it('all 42 master rows carry the field, and each equals its GROUP rule — with ONE recorded exception', () => {
    // The pin that makes "seeded from class, all provisional" a MEASURED fact
    // rather than a claim in a header. ⚠️ WHEN A ROW IS RATIFIED INDIVIDUALLY,
    // THIS NARROWS AND THE RATIFICATION IS RECORDED — it must not be loosened
    // to let a per-row override slip in unannounced.
    expect(ENTRIES).toHaveLength(42);
    const drifted = ENTRIES.filter(
      (e) => e.bpomApplicable !== provisionalBpomForGroup(e.materialGroup),
    ).map((e) => `${e.materialCode} (${e.materialGroup}) = ${e.bpomApplicable}`);
    // ⚠️ THIS IS THE NARROWING THE COMMENT ABOVE PROMISED, AND IT IS AN EXACT
    // SET OF ONE — not a loosened predicate, not an "allow overrides" flag.
    // `RM-EMUL-9440` is the first row in the master whose value rests on a
    // DOCUMENT rather than on its group's class default: `doc-201`, a **BPOM
    // Notification (SAMPLE-BPOM-0005A)** issued by BPOM and linked to
    // `PO-2025-00131`, the parent of the ASN line this code was authored from.
    // MG-02's class rule would say `UNDETERMINED` — nobody has ruled — but
    // somebody DID rule, in a document, about this supply.
    //
    // **A CLASS DEFAULT IS WHAT YOU USE WHEN NOBODY HAS DECIDED. IT IS NOT
    // EVIDENCE, AND IT DOES NOT OUTRANK EVIDENCE.** The exception is listed by
    // name so a second one cannot arrive quietly and turn a recorded
    // ratification into a second, undocumented mechanism.
    expect(drifted).toEqual(['RM-EMUL-9440 (MG-02) = APPLICABLE']);
    expect(provisionalBpomForGroup('MG-02')).toBe('UNDETERMINED');
    // …and it is the ONLY row anywhere in the master that deviates.
    expect(
      ENTRIES.filter((e) => e.bpomApplicable !== provisionalBpomForGroup(e.materialGroup)),
    ).toHaveLength(1);
  });

  it('the three-way split is 20 / 11 / 11, and VERP implies NOT_APPLICABLE', () => {
    const count = (v: BpomApplicability) =>
      ENTRIES.filter((e) => e.bpomApplicable === v).length;
    // 2B-4a measured 16 / 9 / 10 over 35 rows. 2B-5b-ii authored seven:
    // +4 APPLICABLE (`FR-ROUD-4470`, `AI-NIAC-6612`, `AI-HYALU-6615`,
    // `RM-EMUL-9440`), +2 NOT_APPLICABLE (both packaging), +1 UNDETERMINED
    // (`RM-PSTN-7150`, MG-10 — a group nobody has ruled on).
    expect(count('APPLICABLE')).toBe(20);
    expect(count('NOT_APPLICABLE')).toBe(11);
    expect(count('UNDETERMINED')).toBe(11);
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
    // ELEVEN at 2B-5b-ii — `RM-PSTN-7150` joins, MG-10, a group nobody has
    // ruled on. Note which authored row did NOT: `RM-EMUL-9440` had a document.
    expect(undetermined).toHaveLength(11);
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
  it('they agree on 30 of the 42 master rows — and the agreement is STILL not evidence', () => {
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
    // ⚠️ 25/25 AT 2B-4a, 31 ANSWERABLE AND 30 AGREEING AT 2B-5b-ii — AND THE
    // ONE DISAGREEMENT IS WORTH MORE THAN THE THIRTY AGREEMENTS. `RM-EMUL-9440`
    // is the first row where the master has a determination the prefix rule
    // contradicts: master APPLICABLE (on `doc-201`), prefix `false`. Until now
    // the two mechanisms had never actually disagreed on an ANSWERABLE row —
    // the fail-open was always visible as silence (`UNDETERMINED`) or as a
    // vocabulary the master could not resolve at all.
    expect(answerable).toHaveLength(31);
    expect(agree).toHaveLength(30);
    const contradicted = answerable.filter((c) => {
      const o = bpomOf(c);
      return o.ok && o.applicable !== prefixRuleSays(c);
    });
    expect(contradicted).toEqual(['RM-EMUL-9440']);
    // Stated as the two claims side by side, because this is the row 2B-4b
    // exists to settle.
    expect(bpomOf('RM-EMUL-9440')).toEqual({ ok: true, applicable: true });
    expect(prefixRuleSays('RM-EMUL-9440')).toBe(false);
  });

  it('THE TEN: where the prefix rule states a confident NO and nobody has ruled', () => {
    // This is the fail-open that is NOT `BPOM-OFF-BY-SPACE-01`. That one is
    // about a vocabulary OUTSIDE the master. These ten are INSIDE it: the
    // master resolves every one, the prefix rule returns `false` for every one,
    // and `false` IS AN ASSERTION — "this lot needs no BPOM lot check". A
    // prefix rule has no way to say "undetermined", so every code it does not
    // recognise becomes a negative it has no basis for.
    // ⚠️ ELEVEN AT 2B-5b-ii. `RM-PSTN-7150` (RBD Palm Stearin, MG-10) joins the
    // set — an ASN line that IS RECEIVED TODAY, where the prefix rule says "no
    // check" and the master says "nobody ruled". The other ten were fixture
    // rows; this one arrives on the receiving surface.
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
      'RM-PSTN-7150',
      'RM-STEAR-7300',
    ]);
    // Every one of them: prefix rule says NO CHECK, master says NO RULING.
    expect(undetermined.filter(prefixRuleSays)).toEqual([]);
  });

  it('⚠️ THE FIRING SET MOVED BY THREE — the first batch of the arc that could', () => {
    // The dispatch's standing requirement, and 2B-5b-ii is the batch that
    // breaks it ON PURPOSE. 2B-2, 2B-3 and 2B-4a moved it by ZERO because the
    // mechanisms are disjoint: `inferBpom` reads a PREFIX, those batches wrote a
    // MASTER FIELD nothing calls. **THIS BATCH IS THE FIRST TO ASSIGN CODES**,
    // and three of the seven took `AI-`/`FR-` mnemonics. No compliance rule was
    // consulted; a naming convention moved three lots' treatment. Pinned against
    // the predicate rather than inferred from what the diff touched.
    expect(CODES.filter(prefixRuleSays)).toEqual([
      'AI-CENT-6900',
      'AI-HYALU-6610',
      'AI-HYALU-6615',
      'AI-NIAC-6601',
      'AI-NIAC-6605',
      'AI-NIAC-6612',
      'AI-PANTO-6640',
      'AI-PEPTIDE-8801',
      'AI-RETA-6750',
      'AI-SALI-6800',
      'AI-VITC-6720',
      'AI-VITC-6730',
      'FR-EMIN-4420',
      'FR-MKOV-5510',
      'FR-MKOV-5520',
      'FR-ROUD-4470',
      'FR-WARD-4410',
      'FR-WARD-4430',
      'FR-WARD-4440',
    ]);
    // ⚠️ INVERTED AT 2B-5b-ii, AND THIS IS THE SHARPEST ASSERTION IN THE FILE.
    // At 2B-4a the two sets were IDENTICAL — sixteen and sixteen — and that was
    // recorded as the strongest form of "the behaviour did not move": on every
    // row the new mechanism could answer, it answered what the old one answered,
    // and the entire value of the swap lay in the rows it REFUSED.
    //
    // **THEY ARE NO LONGER IDENTICAL. TWENTY VS NINETEEN, DIFFERING BY EXACTLY
    // `RM-EMUL-9440`** — the row whose value rests on `doc-201` rather than on a
    // class default. The master now says a received lot needs a BPOM check and
    // the wizard says it does not, in writing, about a line that is delivered
    // today. Until this batch the fail-open was always a SILENCE (an
    // `UNDETERMINED`, or a vocabulary the master could not resolve). It is now a
    // CONTRADICTION, which is what `BPOM-OFF-BY-SPACE-01`'s amendment says and
    // what 2B-4b exists to settle.
    const applicable = CODES.filter((c) => MATERIAL_MASTER[c].bpomApplicable === 'APPLICABLE');
    const firing = CODES.filter(prefixRuleSays);
    expect(applicable).toHaveLength(20);
    expect(firing).toHaveLength(19);
    expect(applicable.filter((c) => !firing.includes(c))).toEqual(['RM-EMUL-9440']);
    // And nothing fires that the master does NOT mark applicable — the
    // disagreement runs in one direction only, which is the direction that
    // matters: the master is stricter than the wizard, never looser.
    expect(firing.filter((c) => !applicable.includes(c))).toEqual([]);
  });
});

describe('2B-4b — the gate: WIRED, and the prefix rule is GONE', () => {
  // ⚠️ INVERTED, NOT DELETED — and this is the assertion the discipline was
  // built for. At 2B-4a this block said the wizard still ran the prefix rule and
  // `bpomOf` had no consumer, and its own comment said a future batch would have
  // to delete it deliberately. 2B-4b is that batch. Every claim below is the
  // exact negation of the claim it replaces, so the file records the swap rather
  // than merely reflecting whatever is true today.
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
   * erases at build. An `import type` cannot invoke `bpomOf`; it is gone from
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

  it('the GR wizard runs the MASTER LOOKUP, and the prefix parse is not in the file', () => {
    const src = sources();
    const wizard = src['/src/components/v2-features/GRInspectionWizard.tsx'];
    expect(wizard).toBeDefined();

    // WAS: `toContain("materialCode.startsWith('AI-')")` and `not.toContain('bpomOf')`.
    expect(wizard).not.toContain("materialCode.startsWith('AI-')");
    expect(wizard).not.toContain("materialCode.startsWith('FR-')");
    expect(wizard).toContain('bpomOf(');

    // NOT MERELY CALLED — LOAD-BEARING. The outcome is what the step gate reads,
    // so a refusal cannot be reduced to a message beside a check that still
    // passes. `GRInspectionWizard.test.tsx` proves the behaviour; this proves
    // the wiring is the one the behaviour runs through.
    expect(wizard).toContain('if (!l.bpom.ok) return false;');
    // ⚠️ CP-3 · E4 — the applicable-and-unanswered clause now reads its
    // consequence off the enforcement ledger (`lotBlocks`), measured delta ZERO.
    // Added here because this census asserted only the REFUSAL line and would
    // therefore have stayed green through the migration — its halal twin caught
    // it and this one did not, which is a coverage difference rather than a
    // design one. The refusal line above stays mode-free: a mode may relax the
    // consequence of an answer and never the absence of a question.
    expect(wizard).toContain(
      'if (l.bpom.applicable && !l.bpomLotCheck && lotBlocks) return false;',
    );
  });

  it('NO PREFIX PARSE SURVIVES IN PRODUCTION CODE — derived, not enumerated', () => {
    // The dispatch's constraint: `materialCode` is contractually opaque (C9 §3)
    // and a prefix rule contradicts our own ratified contract. Stated as a
    // property over the whole tree rather than as a list of files somebody has
    // to remember to extend.
    const src = sources();
    expect(Object.keys(src).length).toBeGreaterThan(400);

    const parsers = Object.entries(src)
      .filter(([, t]) => /startsWith\('(AI|FR|RM|PK|MAT)-'\)/.test(t))
      .map(([f]) => f)
      .sort();

    // ⚠️ THE SITES THAT REMAIN ARE ALL TESTS, AND THAT IS NOT A LOOPHOLE — IT IS
    // THE RECORD. A retired rule has to be restated somewhere to prove it is
    // retired and to hold the before-and-after of the swap; deleting those
    // restatements would delete the evidence along with the defect. What must
    // not survive is a parse on a path a receipt can travel.
    expect(parsers.length).toBeGreaterThan(0); // else the regex is broken, not the tree
    expect(parsers.filter((f) => !/\.test\.tsx?$/.test(f))).toEqual([]);
  });

  it('the module HAS a consumer now, and it is the receiving surface', () => {
    // WAS: `expect(importers).toEqual([])` under the header "NOTHING IN THE TREE
    // IMPORTS THE MECHANISM". `sdc/bpom.ts` was DECLARED INERT — an artifact
    // that existed so the wiring batch had something to wire. It is not inert.
    const src = sources();
    const importers = Object.entries(src)
      .filter(([f]) => !f.endsWith('/sdc/bpom.ts'))
      .filter(([, text]) => text.includes("/bpom'"))
      .map(([f]) => f)
      .sort();

    const production = importers.filter((f) => !/\.test\.tsx?$/.test(f));
    const typeOnly = production.filter((f) => importsTypeOnly(src[f], "/bpom'"));
    const callers = production.filter((f) => !typeOnly.includes(f));

    // Derived rather than listed: exactly one NON-TEST caller, and it is the
    // GR wizard. A second production caller means the lookup has spread to a
    // surface nobody reviewed, which is worth failing over.
    expect(callers).toEqual(['/src/components/v2-features/GRInspectionWizard.tsx']);

    // ⚠️ AND EXACTLY ONE TYPE-ONLY REFERENCE, NAMED (`CENSUS-COUNTS-TYPE-IMPORTS-01`).
    // `src/lib/enforcement.ts` imports `BpomRefusalReason` to derive — at
    // COMPILE TIME — the refusal shapes that sit OUTSIDE the enforcement
    // domain, so a third refusal reason authored here cannot drift in as a
    // governed verdict. It calls nothing. A SECOND type-only reference fails
    // this too: an erased import is not a wire, but it is still a coupling
    // somebody should have to look at.
    expect(typeOnly).toEqual(['/src/lib/enforcement.ts']);

    // ⚠️ THE LIMIT OF THIS CHECK, STATED AND UNCHANGED FROM 2B-4a: Vite's
    // `import.meta.glob` EXCLUDES THE MODULE IT IS WRITTEN IN, so this scan
    // cannot see its own file — which is itself an importer. Recorded rather
    // than worked around: a check that cannot see itself must say so, or the
    // next reader takes its silence for coverage.
    expect(src['/src/services/sdc/__tests__/bpomApplicability.test.ts']).toBeUndefined();
  });
});
