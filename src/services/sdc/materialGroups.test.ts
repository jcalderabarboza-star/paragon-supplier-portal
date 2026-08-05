// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-1 — THE MATERIAL-GROUP VOCABULARY, PINNED AGAINST ITS REGISTRY.
//
// `MG-COLLISION-21-01` was possible because the MG vocabulary had NO
// DECLARATION SITE: it existed as string literals on materials and as prose in
// two files' section comments, so a second meaning had nothing to contradict.
// `materialGroups.ts` is the missing site. These are the assertions that make it
// load-bearing rather than decorative.
//
// EVERY GROUP SET BELOW IS DERIVED FROM THE CONSUMERS, NEVER HAND-LISTED
// (`CENSUS-MUST-DERIVE-01`). A hand-listed set would pass while a new fixture
// quietly introduced `MG-31`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { SHOULD_COST_MATERIALS } from '../data/mock/fixtures/commodityBaskets';
import { MATERIAL_MASTER } from './fixtures';
import { MATERIAL_GROUPS, declaredGroups, groupLabel } from './materialGroups';

/** Groups the MASTER uses — derived. */
const masterGroups = [
  ...new Set(Object.values(MATERIAL_MASTER).map((e) => e.materialGroup)),
].sort();

/** Groups the SHOULD-COST TAXONOMY uses — derived. */
const taxonomyGroups = [...new Set(SHOULD_COST_MATERIALS.map((m) => m.group))].sort();

const taxonomyMembers = (group: string) =>
  SHOULD_COST_MATERIALS.filter((m) => m.group === group).map((m) => m.name);

describe('2B-1 — the registry is the ONE declaration site', () => {
  it('declares each group number exactly once', () => {
    const ids = MATERIAL_GROUPS.map((g) => g.group);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('every group the MASTER uses is declared', () => {
    expect(masterGroups.filter((g) => groupLabel(g) === null)).toEqual([]);
  });

  it('every group the TAXONOMY uses is declared', () => {
    expect(taxonomyGroups.filter((g) => groupLabel(g) === null)).toEqual([]);
  });

  it('an undeclared group returns honest silence, never a fallback label', () => {
    // The `uomOf` refusal shape, applied to labels: a group nobody declared has
    // no meaning, and inventing one is how a vocabulary acquires a second.
    expect(groupLabel('MG-77')).toBeNull();
  });
});

describe('MG-COLLISION-21-01 — RESOLVED per R-1 (declared ownership decides)', () => {
  it('MG-21 means CLOSURES, and the master is untouched', () => {
    expect(groupLabel('MG-21')).toBe('Closures');
    // ⚠️ THE MASTER STANDS. R-1 ruled the taxonomy moves, so `sdc/fixtures.ts`
    // — ratified seed data — needed no edit at all. This assertion is here to
    // make that a checked fact rather than a claim in a PR body.
    expect(MATERIAL_MASTER['PK-CAPF-8820'].materialGroup).toBe('MG-21');
    expect(MATERIAL_MASTER['PK-CAPF-8820'].label).toBe('Flip-Top Cap 24mm');
  });

  it('the taxonomy now agrees: its closure basket is in MG-21', () => {
    expect(taxonomyMembers('MG-21')).toEqual(['PP caps/closures']);
  });

  it('glass moved to MG-25 and took its whole membership with it', () => {
    expect(groupLabel('MG-25')).toBe('Glass packaging');
    expect(taxonomyMembers('MG-25')).toEqual(['Glass bottles/jars']);
  });

  it('NO group number carries two meanings across the two vocabularies', () => {
    // The structural check the vocabulary never had. Both consumers resolve
    // through ONE registry, so agreement is not a coincidence to be re-verified
    // by a human reading two files side by side — it is an invariant.
    const offenders = declaredGroups()
      .map((g) => ({
        group: g,
        registry: groupLabel(g),
        masterUses: masterGroups.includes(g),
        taxonomyUses: taxonomyGroups.includes(g),
      }))
      .filter((r) => r.registry === null);
    expect(offenders).toEqual([]);
    // …and no consumer references a number the registry does not know.
    expect([...masterGroups, ...taxonomyGroups].filter((g) => !declaredGroups().includes(g))).toEqual(
      [],
    );
  });
});

describe('2B-1 · R-2 — the feedstock group exists, ahead of its members', () => {
  it('MG-10 is declared, on the upstream axis, and MEMBER-LESS', () => {
    expect(groupLabel('MG-10')).toBe(
      'Oleochemical feedstocks (upstream of the formulation grain)',
    );
    expect(MATERIAL_GROUPS.find((g) => g.group === 'MG-10')?.axis).toBe('upstream-input');
    // Member-less is the POINT, not an oversight: 2B-2 assigns the five, and a
    // group declared ahead of its members is a decision recorded rather than one
    // smuggled inside an adoption diff.
    expect(taxonomyMembers('MG-10')).toEqual([]);
    expect(masterGroups).not.toContain('MG-10');
  });

  it('the five feedstocks are still master-absent — no adoption happened here', () => {
    for (const code of [
      'RM-COCO-8200',
      'RM-LAURIC-7200',
      'RM-MYRST-7310',
      'RM-PALM-7100',
      'RM-STEAR-7300',
    ]) {
      expect(code in MATERIAL_MASTER, `${code} must not be adopted before 2B-2`).toBe(false);
    }
  });

  it('MG-10 sits in the band the numbering already implied', () => {
    // `MG-0x` ingredients · `MG-1x` upstream · `MG-2x` packaging. The 07..19 gap
    // was always there; R-2's group is placed INSIDE it rather than at the next
    // free integer, because the tens digit already encodes KIND and a feedstock
    // is a different kind rather than a seventh sort of ingredient.
    const axisOf = (g: string) => MATERIAL_GROUPS.find((e) => e.group === g)?.axis;
    for (const g of declaredGroups()) {
      const band = g.slice(3, 4);
      if (band === '0') expect(axisOf(g)).toBe('formulation-ingredient');
      if (band === '1') expect(axisOf(g)).toBe('upstream-input');
      if (band === '2') expect(axisOf(g)).toMatch(/^packaging-/);
    }
  });
});

describe('2B-1 — the cost of R-1, inspectable rather than buried', () => {
  it('MG-21 is the ONLY group on a functional axis', () => {
    // Recorded in DATA because it is the price R-1 knowingly paid: the packaging
    // series classifies by substrate/form, and one member of it classifies by
    // function. A future reader can ask which groups cut across, and get an
    // answer, instead of rediscovering the mix by reading every entry.
    const functional = MATERIAL_GROUPS.filter((g) => g.axis === 'packaging-function');
    expect(functional.map((g) => g.group)).toEqual(['MG-21']);
  });

  it('an aluminium closure is why the functional axis was chosen', () => {
    // The concrete case a pure-substrate axis would scatter: two codes in the
    // tree are closures made of metal. Under substrate they would land in MG-22
    // (metal packaging), away from the plastic closures they are sourced
    // alongside. Both are pending adoption, so this decides real rows in 2B-3.
    // Neither is adopted here.
    expect('PK-ALCP-2441' in MATERIAL_MASTER).toBe(false);
    expect('MAT-77014' in MATERIAL_MASTER).toBe(false);
  });
});
