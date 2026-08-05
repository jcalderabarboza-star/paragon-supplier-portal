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

describe('2B-1 · R-2 — the feedstock group, declared ahead of its members', () => {
  it('MG-10 is declared, on the upstream axis, and 2B-2 SPENT the decision', () => {
    expect(groupLabel('MG-10')).toBe(
      'Oleochemical feedstocks (upstream of the formulation grain)',
    );
    expect(MATERIAL_GROUPS.find((g) => g.group === 'MG-10')?.axis).toBe('upstream-input');
    // ⚠️ INVERTED AT 2B-2, AND THE INVERSION IS THE WHOLE ARGUMENT. At 2B-1 this
    // asserted MEMBER-LESS: a group declared ahead of its members is a decision
    // RECORDED, one invented during an adoption is a decision SMUGGLED. 2B-2 is
    // the adoption, and the standing decision was spent on exactly the
    // population R-2 described — nothing was decided inside the diff.
    expect(masterGroups).toContain('MG-10');
    // The should-cost taxonomy still has no MG-10 member: its `sc-*` rows model
    // FORMULATION materials, and a feedstock is upstream of that grain by
    // definition. The two vocabularies disagreeing in POPULATION is fine; what
    // 2B-1 fixed was them disagreeing in MEANING.
    expect(taxonomyMembers('MG-10')).toEqual([]);
  });

  it('the five feedstocks were adopted at 2B-2, and only those five', () => {
    for (const code of [
      'RM-COCO-8200',
      'RM-LAURIC-7200',
      'RM-MYRST-7310',
      'RM-PALM-7100',
      'RM-STEAR-7300',
    ]) {
      expect(code in MATERIAL_MASTER, `${code} was adopted at 2B-2`).toBe(true);
      expect(MATERIAL_MASTER[code].materialGroup, `${code} is a feedstock`).toBe('MG-10');
    }
    // Derived the other way too, so the group cannot quietly collect a member a
    // later batch never argued for.
    //
    // ⚠️ SIX AT 2B-5b-ii, AND THE SIXTH WAS ARGUED FOR. `RM-PSTN-7150` (RBD Palm
    // Stearin) joins by R-2's OWN STATED CRITERION rather than by resembling its
    // neighbours: a palm fraction is *"an INPUT TO the materials in MG-01..06,
    // not a member of them"*, and `RM-PALM-7100` is already here. **THE TEST OF
    // A GROUP DECLARED AHEAD OF ITS MEMBERS IS WHETHER A LATER BATCH CAN APPLY
    // IT WITHOUT RE-ARGUING IT**, and this is the first one to try. Named
    // explicitly below so a seventh member still cannot arrive silently.
    const mg10 = Object.values(MATERIAL_MASTER)
      .filter((m) => m.materialGroup === 'MG-10')
      .map((m) => m.materialCode)
      .sort();
    expect(mg10).toEqual([
      'RM-COCO-8200',
      'RM-LAURIC-7200',
      'RM-MYRST-7310',
      'RM-PALM-7100',
      'RM-PSTN-7150',
      'RM-STEAR-7300',
    ]);
    // ⚠️ AND THE NEAR-MISS THAT MG-10 DOES **NOT** ABSORB, pinned beside it:
    // `RM-STEAR-7300` is *Stearic Acid*, a fatty acid; `RM-PSTN-7150` is a
    // triglyceride fraction. Four shared letters, two substances. They are both
    // in MG-10 because both are feedstocks — NOT because they are the same
    // thing, and the labels are asserted so nobody later merges them.
    expect(MATERIAL_MASTER['RM-STEAR-7300'].label).toBe('Stearic Acid — Double Pressed (Halal)');
    expect(MATERIAL_MASTER['RM-PSTN-7150'].label).toBe('RBD Palm Stearin — Specialty Fat');
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

  it('an aluminium closure is why the functional axis was chosen — and 2B-3 SPENT it', () => {
    // The concrete case a pure-substrate axis would scatter: two codes in the
    // tree are closures made of metal. Under substrate they would land in MG-22
    // (metal packaging), away from the plastic closures they are sourced
    // alongside.
    //
    // ⚠️ INVERTED AT 2B-3, which is what this assertion was FOR. At 2B-1 it
    // pinned both as unadopted, so that R-1 could be read as a decision recorded
    // ahead of its members rather than one invented to justify a row already
    // written. 2B-3 authored `PK-ALCP-2441` and applied the standing decision:
    // it is at MG-21, WITH the plastic closures, not at MG-22 with the metal.
    expect('PK-ALCP-2441' in MATERIAL_MASTER).toBe(true);
    expect(MATERIAL_MASTER['PK-ALCP-2441'].materialGroup).toBe('MG-21');
    // MG-22 STILL has no member — the payout stated from the other side. If the
    // substrate axis had won, this is the assertion that would have flipped.
    expect(masterGroups).not.toContain('MG-22');
    // The second aluminium closure is in the undeclared `MAT-*` third space,
    // which no batch adopts. It stays out, and it is the reason MG-22 keeps a
    // candidate without keeping a member.
    expect('MAT-77014' in MATERIAL_MASTER).toBe(false);
  });
});
