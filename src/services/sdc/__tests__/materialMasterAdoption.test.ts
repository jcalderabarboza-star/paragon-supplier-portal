// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-2 — THE ADOPTION, RE-DERIVED FROM THE TREE ON EVERY RUN.
//
// `materialIdentity.test.ts` pins the identity PROPERTY (one code one meaning,
// both directions). This file pins the ADOPTION ITSELF, and it is a different
// question: not "do the lanes agree with each other" but "does the master say
// what the lane it adopted from says".
//
// ── WHY THIS IS DERIVED AND NOT A TABLE ─────────────────────────────────────
//   A hand-written table of 25 code → label → unit rows would be a SECOND copy
//   of the master, and the failure mode of a second copy is that it drifts and
//   agrees with nothing. `CENSUS-MUST-DERIVE-01`, and its 2B-0 sharpening
//   `DERIVED-OVER-A-CHOSEN-SCOPE-01`, both say the same thing: the population
//   comes from the tree.
//
//   So the walk below re-reads every non-test module, and asserts that for each
//   adopted code the master's `label` IS the lane's stated meaning and the
//   master's `canonicalUom` IS the unit the lane's own qty rows carry. Edit a
//   fixture description without the master and this goes red naming the code.
//
// ── THE UNIT CLAIM IS MEASURED, NOT ASSUMED ─────────────────────────────────
//   Every adopted code shows EXACTLY ONE unit across every module that names
//   it. That is asserted here as a property of the population rather than
//   assumed by the adoption: a second unit appearing on any code is a
//   COLLISION, not a rounding call, and it must stop the build rather than get
//   resolved by whichever row the walk reached last.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { MATERIAL_GROUPS, groupLabel } from '../materialGroups';
import { MATERIAL_MASTER } from '../fixtures';

/** The five SDC-0 seed entries. Named because "everything else" is the set this
 *  batch is about, and because seed data is what 2B-2 was told not to author. */
const SEED = [
  'AI-NIAC-6601',
  'PK-CAPF-8820',
  'PK-PETB-8810',
  'RM-EMUL-3310',
  'RM-EMUL-3320',
] as const;

// ─── The derived population (same walk shape as the identity pin) ────────────

interface Ref {
  readonly code: string;
  readonly meaning: string | null;
  readonly unit: string | null;
  readonly module: string;
}

const IS_TEST_MODULE = /\.test\.tsx?$|__tests__|^\/src\/test\//;
const sourceModules = import.meta.glob('/src/**/*.ts') as Record<
  string,
  () => Promise<Record<string, unknown>>
>;

const siblingMatching = (o: Record<string, unknown>, re: RegExp): string | null => {
  for (const k of Object.keys(o)) {
    if (re.test(k) && typeof o[k] === 'string' && o[k] !== '') return o[k] as string;
  }
  return null;
};

const REFS: Ref[] = [];
const collect = (root: unknown, module: string) => {
  const seen = new WeakSet<object>();
  const walk = (node: unknown) => {
    if (node === null || typeof node !== 'object') return;
    // Skip the master BY REFERENCE (2B-3). It is re-exported through several
    // modules, so excluding it by path would attribute its codes to whichever
    // file the walk reached them through — and the partition check below asks
    // where a code came FROM, which the master cannot answer about itself.
    if (node === (MATERIAL_MASTER as unknown as object)) return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const o = node as Record<string, unknown>;
    // The column-key rule from the identity pin: a value identical to its own
    // field name is a column map, not a code.
    if (typeof o.materialCode === 'string' && o.materialCode !== 'materialCode') {
      REFS.push({
        code: o.materialCode,
        meaning: siblingMatching(o, /description/i),
        unit: siblingMatching(o, /^uom$|unit/i),
        module,
      });
    }
    // Added at 2B-3: a bare `string[]` states no meaning, but it IS a source.
    // Without this arm the RFQ lane is invisible here and the partition check
    // below cannot tell an authored row from an unaccounted one.
    if (Array.isArray(o.materialIds)) {
      for (const c of o.materialIds) {
        if (typeof c === 'string') REFS.push({ code: c, meaning: null, unit: null, module });
      }
    }
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(root);
};

for (const [file, load] of Object.entries(sourceModules)) {
  if (IS_TEST_MODULE.test(file)) continue;
  for (const value of Object.values(await load())) collect(value, file);
}

/** Refs from the DECLARED document lane only — the space 2B-2 adopted FROM.
 *  Membership by module, never by code shape (C9 §3: codes are opaque). */
const laneRefs = REFS.filter((r) => /^\/src\/data\/mock[^/]*\.ts$/.test(r.module));
const laneMeanings = (code: string) => [
  ...new Set(laneRefs.filter((r) => r.code === code && r.meaning).map((r) => r.meaning!)),
];
const laneUnits = (code: string) => [
  ...new Set(laneRefs.filter((r) => r.code === code && r.unit).map((r) => r.unit!)),
];

/**
 * ⚠️ NARROWED AT 2B-3, and the narrowing is the point. This used to be "every
 * master code that is not seed". 2B-3 added five more non-seed rows — but they
 * are a DIFFERENT KIND OF ROW: they AUTHOR a meaning rather than ratify one, so
 * every assertion in this file (label IS the lane's string, unit IS the lane's
 * measured value) is meaningless against them. There is no lane string to be.
 *
 * So the subject is stated by its defining property rather than by subtraction:
 * an adoption is a master row whose meaning the document lane already carried.
 */
const ADOPTED = Object.keys(MATERIAL_MASTER)
  .filter((c) => !(SEED as readonly string[]).includes(c) && laneMeanings(c).length > 0)
  .sort();

/** 2B-3's rows, derived the same way the 2B-3 pin derives them: sourced ONLY by
 *  the RFQ lane, which carries codes in a bare `string[]` and states nothing. */
const AUTHORED = Object.keys(MATERIAL_MASTER)
  .filter((c) => {
    const src = [...new Set(REFS.filter((r) => r.code === c).map((r) => r.module))];
    return src.length === 1 && src[0] === '/src/data/mockRfqs.ts';
  })
  .sort();

/**
 * 2B-5b-ii's rows, derived by THEIR defining property rather than listed: master
 * codes whose only non-master source in the tree is the ASN lane module.
 *
 * ⚠️ THEY ARE NOT ADOPTIONS, AND `ADOPTED` CORRECTLY EXCLUDES THEM WITHOUT ANY
 * EDIT — `laneRefs` is scoped to `/src/data/mock*.ts`, the DECLARED document
 * lane, and `supplierShipments.ts` is not in it. That is the 2B-2 scope doing
 * its job three batches later: a batch that authored rows from an UNDECLARED
 * lane could not accidentally be counted as ratifying the declared one.
 */
const AUTHORED_ASN = Object.keys(MATERIAL_MASTER)
  .filter((c) => {
    const src = [...new Set(REFS.filter((r) => r.code === c).map((r) => r.module))];
    return (
      src.length === 1 && src[0] === '/src/services/data/mock/fixtures/supplierShipments.ts'
    );
  })
  .sort();

describe('2B-2 — the adoption is exactly 25 codes, and they are the ones that STATED a meaning', () => {
  it('collected a real population (guards a vacuous pass)', () => {
    expect(REFS.length).toBeGreaterThan(80);
    expect(laneRefs.length).toBeGreaterThan(40);
    // The 2B-3 lesson, applied here too: guard the population the assertions
    // ITERATE, not just the walk that feeds it. An empty `ADOPTED` would pass
    // every `filter(...).toEqual([])` below without asserting anything.
    expect(ADOPTED.length).toBe(25);
  });

  it('adopted 25 — on top of 5 seed, 5 authored at 2B-3 and 7 authored at 2B-5b-ii', () => {
    expect(ADOPTED).toHaveLength(25);
    expect(AUTHORED).toHaveLength(5);
    expect(AUTHORED_ASN).toHaveLength(7);
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
    // 5 + 25 + 5 + 7 = 42, stated as arithmetic so a row cannot go missing
    // between two counts that each look right.
    expect(SEED.length + ADOPTED.length + AUTHORED.length + AUTHORED_ASN.length).toBe(42);
  });

  it('⚠️ NO master code arrived from a fourth route', () => {
    // The rule that keeps `adoption is not discovery` executable, RESTATED at
    // 2B-3 rather than deleted. The old version asserted "every adopted code has
    // a lane meaning", which became a tautology the moment `ADOPTED` was defined
    // by that property. The invariant worth having is the partition itself:
    // every master row is SEEDED, ADOPTED from a stated meaning in the declared
    // document lane, or AUTHORED from the RFQ lane — and nothing else. Adopt a
    // code out of the `MAT-*` space and it lands in no bucket and is named here.
    //
    // ⚠️ THIS PIN DID ITS JOB AT 2B-5b-ii AND IT IS WORTH RECORDING THAT IT WAS
    // THE ONE THAT CAUGHT IT. Seven rows authored from the ASN lane landed in no
    // bucket and were named here, by code, before anything else in the suite
    // noticed them. The FIX WAS A FOURTH BUCKET WITH ITS OWN DERIVED DEFINITION
    // — not a widened filter, and not adding the seven to `AUTHORED`, which
    // would have made "authored from the RFQ lane" quietly untrue.
    const unaccounted = Object.keys(MATERIAL_MASTER).filter(
      (c) =>
        !(SEED as readonly string[]).includes(c) &&
        !ADOPTED.includes(c) &&
        !AUTHORED.includes(c) &&
        !AUTHORED_ASN.includes(c),
    );
    expect(unaccounted).toEqual([]);
    // …and the buckets do not overlap: a row cannot both ratify and author.
    expect(ADOPTED.filter((c) => AUTHORED.includes(c))).toEqual([]);
    expect(AUTHORED_ASN.filter((c) => ADOPTED.includes(c) || AUTHORED.includes(c))).toEqual([]);
    expect(AUTHORED_ASN).toEqual([
      'AI-HYALU-6615',
      'AI-NIAC-6612',
      'FR-ROUD-4470',
      'PK-ALCP-2450',
      'PK-PETB-8804',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);
  });
});

describe('2B-2 — the master says what the lane says (label)', () => {
  it('each adopted label IS the lane meaning it ratified', () => {
    const disagreeing = ADOPTED.map((code) => ({
      code,
      master: MATERIAL_MASTER[code].label,
      lane: laneMeanings(code),
    })).filter((r) => !(r.lane.length === 1 && r.lane[0] === r.master));
    // A drifted fixture description, a typo in the master, or a partial trim all
    // land here NAMED — the whole point of deriving rather than tabulating.
    expect(disagreeing).toEqual([]);
  });

  it('and no adopted code states two meanings to choose between', () => {
    const ambiguous = ADOPTED.filter((c) => laneMeanings(c).length !== 1);
    expect(ambiguous).toEqual([]);
  });
});

describe('2B-2 — the unit is MEASURED (zero collisions, per the dispatch)', () => {
  it('every adopted code shows exactly ONE unit across every module', () => {
    // "If any code now shows a second unit, STOP AND REPORT — that is a new
    // collision, not a rounding call." This is that stop, made automatic.
    const multiUnit = ADOPTED.map((c) => ({ code: c, units: laneUnits(c) })).filter(
      (r) => r.units.length !== 1,
    );
    expect(multiUnit).toEqual([]);
  });

  it('the canonical unit IS the observed one — never a chosen default', () => {
    const wrong = ADOPTED.map((code) => ({
      code,
      canonical: MATERIAL_MASTER[code].canonicalUom as string,
      observed: laneUnits(code)[0],
    })).filter((r) => r.canonical !== r.observed);
    expect(wrong).toEqual([]);
  });

  it('the split is 21 KG / 4 PCS, and it follows the material, not the prefix', () => {
    const byUnit = (u: string) => ADOPTED.filter((c) => MATERIAL_MASTER[c].canonicalUom === u);
    expect(byUnit('KG')).toHaveLength(21);
    expect(byUnit('PCS')).toHaveLength(4);
    expect(byUnit('L')).toHaveLength(0);
    expect(byUnit('ROLL')).toHaveLength(0);
  });
});

describe('2B-2 — groups come from the 2B-1 registry, and TYPE follows the AXIS', () => {
  it('every group the master uses is DECLARED', () => {
    // The registry `MG-REGISTRY-ABSENT-01` created. 25 new rows carrying a
    // group value would otherwise be 25 chances to invent a number quietly.
    const undeclared = Object.values(MATERIAL_MASTER)
      .map((m) => m.materialGroup)
      .filter((g) => groupLabel(g) === null);
    expect([...new Set(undeclared)]).toEqual([]);
  });

  it('materialType is DERIVED from the group axis, not asserted per row', () => {
    // ROH vs VERP is not an independent fact — packaging is VERP, everything
    // that enters or feeds a formula is ROH. Deriving it here means a row whose
    // group and type disagree is a red test rather than a plausible-looking
    // entry nobody re-reads.
    const axisOf = (group: string) =>
      MATERIAL_GROUPS.find((g) => g.group === group)?.axis ?? null;
    const mismatched = Object.values(MATERIAL_MASTER)
      .map((m) => ({
        code: m.materialCode,
        group: m.materialGroup,
        type: m.materialType,
        expected: axisOf(m.materialGroup)?.startsWith('packaging') ? 'VERP' : 'ROH',
      }))
      .filter((r) => r.type !== r.expected);
    expect(mismatched).toEqual([]);
  });

  it('MG-10 was declared member-less at 2B-1, took five at 2B-2 and a sixth at 2B-5b-ii', () => {
    // The ordering argument, made executable. A group declared ahead of its
    // members is a decision recorded; one invented during an adoption is a
    // decision smuggled — and this is the run where the recorded decision was
    // spent, on exactly the population R-2 described.
    const feedstocks = Object.values(MATERIAL_MASTER)
      .filter((m) => m.materialGroup === 'MG-10')
      .map((m) => m.materialCode)
      .sort();
    expect(feedstocks).toEqual([
      'RM-COCO-8200',
      'RM-LAURIC-7200',
      'RM-MYRST-7310',
      'RM-PALM-7100',
      'RM-PSTN-7150',
      'RM-STEAR-7300',
    ]);
    // ⚠️ AND THE 2B-2 SCOPE OF THIS CLAIM IS RESTATED RATHER THAN WIDENED: the
    // FIVE this batch spent R-2's decision on are still exactly five. The sixth
    // arrived three batches later, by the same criterion, from a different lane.
    expect(ADOPTED.filter((c) => MATERIAL_MASTER[c].materialGroup === 'MG-10')).toHaveLength(5);
  });

  it('MG-21 and MG-22 gained NO members from THIS batch — R-1 decided 2B-3 rows', () => {
    // R-1's substrate-vs-function split was argued over the aluminium closures,
    // and neither was adoptable at 2B-2 (one mute, one in the third space). The
    // prediction was that the split's real consequence was still ahead of it.
    //
    // ⚠️ 2B-3 IS THAT CONSEQUENCE — `PK-ALCP-2441` is now at MG-21. The scope of
    // this assertion is narrowed to `ADOPTED` rather than the assertion being
    // deleted, because "no 2B-2 row went to MG-21" is still true and is still
    // the fact that stops a later reader concluding the argument was settled by
    // the adoption batch. Where the split ACTUALLY paid out is pinned in
    // `materialMasterAuthoring.test.ts`.
    for (const empty of ['MG-21', 'MG-22']) {
      const members = ADOPTED.filter((c) => MATERIAL_MASTER[c].materialGroup === empty);
      expect(members, `${empty} gained no members at 2B-2`).toEqual([]);
    }
    // MG-21 now holds the seed's flip-top cap and 2B-3's aluminium cap — and
    // nothing from the 25.
    expect(
      Object.values(MATERIAL_MASTER)
        .filter((m) => m.materialGroup === 'MG-21')
        .map((m) => m.materialCode)
        .sort(),
    // ⚠️ THREE AT 2B-5b-ii — `PK-ALCP-2450` joins, and it is a SECOND aluminium
    // closure filed by function rather than substrate. R-1's split is no longer
    // a rule that fired once.
    ).toEqual(['PK-ALCP-2441', 'PK-ALCP-2450', 'PK-CAPF-8820']);
    // MG-22 is still empty outright, which is R-1's payout stated from the other
    // side: the tree's one metal closure did not go to the metal group.
    expect(Object.values(MATERIAL_MASTER).filter((m) => m.materialGroup === 'MG-22')).toEqual([]);
  });
});

describe('2B-4 GATE — the mechanism landed at 2B-4a; the BEHAVIOUR still has not', () => {
  it('EVERY master entry carries bpomApplicable — and nothing reads it', () => {
    // ⚠️ INVERTED AT 2B-4a, NOT DELETED. At 2B-2 this asserted the field was
    // ABSENT from all 30 entries — the pin that stopped a five-row batch adding
    // it as an inert column "while we are in here". 2B-4a is the batch that was
    // dispatched to add it, so the pin now records the other half of the same
    // rule: "MECHANISM MAY BE AUTHORED EARLY, BEHAVIOUR MAY NOT BE WIRED
    // EARLY." A deleted assertion and a discharged one look identical in a
    // diff; an inverted one does not.
    const missing = Object.values(MATERIAL_MASTER)
      .filter((m) => !('bpomApplicable' in (m as unknown as Record<string, unknown>)))
      .map((m) => m.materialCode);
    expect(missing).toEqual([]);
    // ⚠️ INVERTED AT 2B-4b. This used to read: "the half that has NOT changed,
    // and the reason the gate still stands — the GR wizard runs a prefix parse
    // and has never heard of this field." It has now heard of it. The 25 codes
    // this file adopted became reachable-and-answerable material the moment the
    // wizard started reading the master, which is what an adoption is FOR.
    // Pinned in full by `bpomApplicability.test.ts`; asserted here too because
    // this is the file a reader of the 2B-2 adoption reaches for.
    const wizard = import.meta.glob('/src/components/v2-features/GRInspectionWizard.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    })['/src/components/v2-features/GRInspectionWizard.tsx'] as string;
    expect(wizard).not.toContain("materialCode.startsWith('AI-')");
    expect(wizard).toContain('bpomOf(');
  });
});
