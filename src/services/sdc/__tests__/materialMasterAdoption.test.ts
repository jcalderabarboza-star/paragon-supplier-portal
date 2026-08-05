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

const ADOPTED = Object.keys(MATERIAL_MASTER)
  .filter((c) => !(SEED as readonly string[]).includes(c))
  .sort();

describe('2B-2 — the adoption is exactly 25 codes, and they are the ones that STATED a meaning', () => {
  it('collected a real population (guards a vacuous pass)', () => {
    expect(REFS.length).toBeGreaterThan(80);
    expect(laneRefs.length).toBeGreaterThan(40);
  });

  it('adopted 25, on top of the 5 seed entries', () => {
    expect(ADOPTED).toHaveLength(25);
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(30);
  });

  it('every adopted code came from the DECLARED document lane', () => {
    // The rule that keeps `adoption is not discovery` executable: a code the
    // master names must have been ratified from a space we declared owning.
    // Adopt one from the `MAT-*` space and this names it.
    const notFromTheLane = ADOPTED.filter((c) => laneMeanings(c).length === 0);
    expect(notFromTheLane).toEqual([]);
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

  it('MG-10 was declared member-less at 2B-1 and now has its five', () => {
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
      'RM-STEAR-7300',
    ]);
  });

  it('MG-21 and MG-22 gained NO members — R-1 decided 2B-3 rows, not 2B-2 rows', () => {
    // R-1's substrate-vs-function split was argued over the aluminium closures.
    // Neither is adopted here (both are mute or in the third space), so the
    // split's real consequence is still ahead of it. Pinned so a later reader
    // does not conclude the argument was settled by this batch.
    for (const empty of ['MG-21', 'MG-22']) {
      const members = Object.values(MATERIAL_MASTER).filter(
        (m) => m.materialGroup === empty && !(SEED as readonly string[]).includes(m.materialCode),
      );
      expect(members, `${empty} gained no members at 2B-2`).toEqual([]);
    }
    // The seed's flip-top cap is still the only thing at MG-21.
    expect(
      Object.values(MATERIAL_MASTER)
        .filter((m) => m.materialGroup === 'MG-21')
        .map((m) => m.materialCode),
    ).toEqual(['PK-CAPF-8820']);
  });
});

describe('2B-4 GATE — the mechanism is not authored, and that is deliberate', () => {
  it('NO master entry carries a bpomApplicable field', () => {
    // "Mechanism may be authored early, behaviour may not be wired early." The
    // field is absent from all 30 entries — asserted rather than trusted,
    // because the tempting version of this batch adds it as an inert column and
    // calls it harmless. It is not harmless: a fail-closed rule keyed on it
    // would refuse essentially every GR line while the ASN store still speaks a
    // vocabulary the master cannot resolve.
    const carriers = Object.values(MATERIAL_MASTER)
      .filter((m) => 'bpomApplicable' in (m as Record<string, unknown>))
      .map((m) => m.materialCode);
    expect(carriers).toEqual([]);
  });
});
