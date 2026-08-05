// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · B2a → 2B-0 — MATERIAL IDENTITY, PINNED OVER A LANE SET THAT DERIVES.
//
// The B2a deliverable was a PROPERTY, not a diff:
//
//   ONE CODE, ONE MEANING   — no material code carries two descriptions.
//   ONE MEANING, ONE CODE   — no material description rides two codes.
//
// Both still hold. What changed at 2B-0 is WHERE they are checked.
//
// ── WHY THIS FILE WAS REWRITTEN — `DERIVED-OVER-A-CHOSEN-SCOPE-01` ───────────
//   The B2a version built its population by importing FOUR fixture modules by
//   name (inventory, PO, GR, shipments). The population was derived from those
//   modules; the MODULES were a hand-picked literal. `CENSUS-MUST-DERIVE-01`
//   caught a stale literal in the population and left the identical defect one
//   level up, where it is harder to see because an import list reads like a
//   fact rather than a claim.
//
//   What it cost, concretely: `mockRfqs.ts` was not in the list. The old file
//   asserted that the B2a-freed codes were "no longer squatted on by the
//   document lane" — AND IT PASSED WHILE `RM-EMUL-3310` SAT AT `mockRfqs.ts:113`.
//   The assertion was true of the four lanes it searched and was written as if
//   it were true of the lane. AN ASSERTION THAT A THING IS ABSENT IS ONLY AS
//   STRONG AS THE SCOPE IT SEARCHED.
//
//   The second half is worse than the miss. `materialIds` is a bare `string[]`
//   — it carries NO meaning — so a code reached only through it can never
//   contradict another meaning. Both directional checks were structurally BLIND
//   to that lane. The code had not left the document lane; it had left the part
//   of the lane capable of disagreeing.
//
//   So the lane set below is not an import list, and it is not a glob of
//   `src/data/` either — A GLOB OF ONE DIRECTORY IS THE SAME HAND-PICK ONE
//   DIRECTORY UP. It is every non-test module in the tree, walked generically
//   for the two code-bearing field names the TYPE SYSTEM declares, plus a
//   raw-source guard (below) that does not depend on the walk reaching anything.
//
// ── THE ONE EXCLUSION, STATED RATHER THAN HIDDEN ────────────────────────────
//   Test files are excluded. This IS a hand-pick, so it is named and argued
//   rather than left in a regex nobody reads: test fixtures deliberately carry
//   spoof codes (`RM-SPOOF`, `PK-UITEST-1`, `RM-TEST-0001`, `EM-CETE-2201`)
//   whose whole purpose is to be unresolvable. They are inputs to refusal
//   proofs, not document-lane facts, and folding them into the population would
//   make every census report a tree that does not exist. Nothing else is
//   excluded — if a module holds material data, it is in scope.
//
// ── WHY A REGULATORY PIN LIVES IN AN IDENTITY TEST ──────────────────────────
//   `inferBpom` (`GRInspectionWizard.tsx:129-131`) decides whether a received
//   lot needs a BPOM lot check by reading the material code's PREFIX, and it
//   FAILS OPEN. That makes every code-space edit a potential regulatory change.
//   B2a pinned the firing set so a cleanup could not move it by accident.
//   2B-0 widens that pin too — and the widening found `BPOM-OFF-BY-SPACE-01`
//   (below), which is a LIVE fail-open rather than a latent one.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { SHOULD_COST_MATERIALS } from '../services/data/mock/fixtures/commodityBaskets';
import { MATERIAL_MASTER } from '../services/sdc/fixtures';

// ─── The derived population ──────────────────────────────────────────────────

/** One material reference as some module states it. `module` is carried so a
 *  failure names the file that disagrees, not just the pair. */
interface MaterialRef {
  readonly code: string;
  readonly meaning: string | null;
  readonly module: string;
}

/** Named, argued in the header. Everything else is in scope. */
const IS_TEST_MODULE = /\.test\.tsx?$|__tests__|^\/src\/test\//;

const sourceModules = import.meta.glob('/src/**/*.ts') as Record<
  string,
  () => Promise<Record<string, unknown>>
>;

/** Every non-test source file's TEXT — used by the guard that does not depend
 *  on the module walk reaching anything. `.tsx` included deliberately: "material
 *  data lives in .ts files" is exactly the kind of assumption this batch exists
 *  to stop making, and a raw read costs nothing to check it. */
const sourceText = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** A sibling key that reads as a description. Derived from the object, not from
 *  a list of field names this file happens to know about. */
const meaningOf = (o: Record<string, unknown>): string | null => {
  for (const k of Object.keys(o)) {
    if (/description/i.test(k) && typeof o[k] === 'string' && o[k] !== '') {
      return o[k] as string;
    }
  }
  return null;
};

const collect = (root: unknown, module: string, out: MaterialRef[]) => {
  // Per-module `seen`, not shared: a module that re-exports another's fixture
  // legitimately exposes the same codes, and attributing them to whichever file
  // the walk happened to reach first would make the report depend on iteration
  // order. Duplicates are harmless — every assertion below is over DISTINCT
  // codes and DISTINCT code×meaning pairs.
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
    // A value identical to its own field name is a COLUMN-KEY MAP, not a code
    // (`sdc/ingest.ts:134` `IMPORT_DECLARE_COLUMN`). Stated as a general rule
    // rather than an exclusion of one literal, so it also covers the next one.
    if (typeof o.materialCode === 'string' && o.materialCode !== 'materialCode') {
      out.push({ code: o.materialCode, meaning: meaningOf(o), module });
    }
    if (Array.isArray(o.materialIds)) {
      for (const c of o.materialIds) {
        // A bare `string[]` carries no meaning. Recorded as `null` rather than
        // skipped — a code that states no meaning is the thing 2B-3 must
        // author one for, and skipping it is how it stayed invisible.
        if (typeof c === 'string') out.push({ code: c, meaning: null, module });
      }
    }
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(root);
};

const REFS: MaterialRef[] = [];
const BEARING_MODULES: string[] = [];

for (const [file, load] of Object.entries(sourceModules)) {
  if (IS_TEST_MODULE.test(file)) continue;
  const before = REFS.length;
  const mod = await load();
  for (const value of Object.values(mod)) collect(value, file, REFS);
  if (REFS.length > before) BEARING_MODULES.push(file);
}

const CODES = [...new Set(REFS.map((r) => r.code))].sort();
const meaningsOf = (code: string) => [
  ...new Set(REFS.filter((r) => r.code === code && r.meaning).map((r) => r.meaning!)),
];
const modulesOf = (code: string) => [
  ...new Set(REFS.filter((r) => r.code === code).map((r) => r.module)),
];

/** Group `REFS` by one field, collecting the distinct values of the other. */
const distinctBy = (key: 'code' | 'meaning', value: 'code' | 'meaning') => {
  const out = new Map<string, Map<string, string[]>>();
  for (const r of REFS) {
    if (r.meaning === null) continue; // a null meaning cannot contradict one
    const k = r[key] as string;
    const v = r[value] as string;
    if (!out.has(k)) out.set(k, new Map());
    const inner = out.get(k)!;
    if (!inner.has(v)) inner.set(v, []);
    inner.get(v)!.push(r.module);
  }
  return out;
};

/** Render the offenders so a failure reads as a report, not a diff of counts. */
const offenders = (grouped: ReturnType<typeof distinctBy>) =>
  [...grouped.entries()]
    .filter(([, inner]) => inner.size > 1)
    .map(([k, inner]) => ({
      [k === '' ? '(blank)' : k]: [...inner.entries()].map(
        ([v, mods]) => `${v} @ ${[...new Set(mods)].sort().join(', ')}`,
      ),
    }));

// ─── The three spaces, named by MODULE (ownership), never by code shape ──────
// `materialCode` is contractually OPAQUE (C9 §3). Membership of a space is
// decided by WHICH FILE DECLARES THE CODE, never by what the code looks like.

const inModules = (re: RegExp) =>
  [...new Set(REFS.filter((r) => re.test(r.module)).map((r) => r.code))].sort();

/** The declared document lane (`C8-MASTER-DECL`). */
const DOCUMENT_LANE = inModules(/^\/src\/data\/mock[^/]*\.ts$/);
/** The master-governed lane — the master itself and the delivery fixtures that
 *  derive every unit from it via `requireUom`. */
const MASTER_GOVERNED = inModules(/^\/src\/services\/(sdc\/fixtures|delivery\/)/);
/** ⚠️ THE SPACE NO DECLARATION NAMES — `MAT-SPACE-UNDECLARED-01`. */
const UNDECLARED_SPACE = inModules(
  /^\/src\/services\/(data\/mock\/fixtures\/supplierShipments|channel\/outboundFixtures)\.ts$/,
);

describe('2B-0 — the lane set DERIVES (DERIVED-OVER-A-CHOSEN-SCOPE-01)', () => {
  it('actually collected a population (guards a vacuous pass)', () => {
    // Every assertion below is a "no offenders" or "exact set" shape, several of
    // which an empty REFS would satisfy trivially. This is the floor that makes
    // the rest mean something.
    expect(REFS.length).toBeGreaterThan(80);
    expect(CODES.length).toBeGreaterThan(40);
  });

  it('reaches modules the hand-picked import list did not', () => {
    // The four the B2a version knew about, plus the ones it did not. Asserted by
    // NAME because the miss is the finding: this list is what a derived scope
    // buys, and a regression that shrinks it back should read as a loss.
    expect(BEARING_MODULES).toEqual(
      expect.arrayContaining([
        '/src/data/mockGoodsReceipts.ts',
        '/src/data/mockInventory.ts',
        '/src/data/mockPurchaseOrders.ts',
        '/src/data/mockShipments.ts',
        // ── not in the B2a import list ──
        '/src/data/mockRfqs.ts',
        '/src/services/data/mock/fixtures/supplierShipments.ts',
        '/src/services/delivery/demoFixtures.ts',
        '/src/services/delivery/demoFixturesScale.ts',
        '/src/services/sdc/fixtures.ts',
      ]),
    );
  });

  it('no source file declares a material code the walk never reached', () => {
    // The guard that does NOT depend on the walk. Reads raw text — so it covers
    // `.tsx`, unexported constants, and any module the walk failed to traverse.
    // It cannot recognise an unknown code by shape (opacity forbids that), so it
    // works the only honest way available: every literal written UNDER a
    // code-bearing key must appear in the derived population.
    const missed: string[] = [];
    for (const [file, text] of Object.entries(sourceText)) {
      if (IS_TEST_MODULE.test(file)) continue;
      const literals = [
        ...[...text.matchAll(/materialCode:\s*'([^']+)'/g)].map((m) => m[1]),
        ...[...text.matchAll(/materialIds:\s*\[([^\]]*)\]/g)].flatMap((m) =>
          [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]),
        ),
      ];
      for (const lit of literals) {
        if (lit === 'materialCode') continue; // the column-key map, per the rule above
        if (!CODES.includes(lit)) missed.push(`${lit} @ ${file}`);
      }
    }
    expect(missed).toEqual([]);
  });
});

describe('CP-2 · B2a — the identity property, now over the WHOLE tree', () => {
  // THE HEADLINE RESULT, and it should not be read as a regression report:
  // widening the scope from four modules to every non-test module in the tree
  // found ZERO new collisions in either direction. B2a's property survived.
  it('NO material code carries two different meanings', () => {
    expect(offenders(distinctBy('code', 'meaning'))).toEqual([]);
  });

  it('NO material meaning rides two different codes', () => {
    expect(offenders(distinctBy('meaning', 'code'))).toEqual([]);
  });
});

describe('CP-2 · B2a — the document lane no longer CONTRADICTS the master', () => {
  const shared = DOCUMENT_LANE.filter((c) => c in MATERIAL_MASTER);

  it('lists exactly the codes the document lane and the master both name', () => {
    // CORRECTED at 2B-0. The B2a version listed two, because its scope excluded
    // the RFQ lane where `RM-EMUL-3310` lives.
    expect(shared).toEqual(['AI-NIAC-6601', 'RM-EMUL-3310', 'RM-EMUL-3320']);
  });

  it('each shared code that states a meaning means the master thing', () => {
    const both = shared
      .map((c) => ({ code: c, master: MATERIAL_MASTER[c].label, document: meaningsOf(c) }))
      .filter((r) => r.document.length > 0);
    expect(both).toEqual([
      {
        code: 'AI-NIAC-6601',
        master: 'Niacinamide (Vitamin B3)',
        // Same substance; the document line states the grade the master leaves
        // unspecified. Booked to 2B as master content — and note that the
        // PROVISIONAL ruling `D-IDENTITY-GRAIN = SPECIFICATION` (findings.md)
        // would make the master's silence a defect rather than an open question.
        document: ['Niacinamide USP Grade 99.5% (Vitamin B3)'],
      },
      {
        code: 'RM-EMUL-3320',
        master: 'Cetearyl Alcohol',
        document: ['Cetearyl Alcohol — Vegetable Origin'],
      },
    ]);
    // `RM-EMUL-3310` is deliberately absent from the list above: it is in the
    // document lane, and it states NO meaning there. See the next describe.
    expect(meaningsOf('RM-EMUL-3310')).toEqual([]);
  });

  it('the B2a-freed codes — stated TRUTHFULLY, not as the old scope saw them', () => {
    // ⚠️ THE ASSERTION THIS FILE USED TO GET WRONG. The old version said both
    // codes were "no longer squatted on by the document lane" and PASSED, because
    // `mockRfqs.ts` was outside its scope. The truth, over the derived lane set:
    //
    //   PK-PETB-8810 — genuinely gone from the document lane (it survives only
    //                  in the master-governed fixtures, where it belongs).
    //   RM-EMUL-3310 — STILL IN THE DOCUMENT LANE, at the RFQ that names it.
    //                  Not a squat (the master owns the code and the RFQ's title
    //                  agrees with the master's meaning), but PRESENT — and the
    //                  old assertion denied it.
    expect(DOCUMENT_LANE).not.toContain('PK-PETB-8810');
    expect(MASTER_GOVERNED).toContain('PK-PETB-8810');

    expect(DOCUMENT_LANE).toContain('RM-EMUL-3310');
    expect(modulesOf('RM-EMUL-3310')).toEqual(
      expect.arrayContaining(['/src/data/mockRfqs.ts']),
    );
  });
});

describe('2B-0 — codes the lane names but gives NO meaning (2B-3 input)', () => {
  it('pins the six, RED on arrival and whitelisted by finding-id', () => {
    // A code reached only through `materialIds` states no meaning at all. The
    // parent RFQ's TITLE is not a meaning on a code — it is a sentence about a
    // sourcing event that happens to mention one. These six are why 2B-3 AUTHORS
    // a meaning rather than ratifying one, and they are pinned so the count
    // cannot drift silently in either direction.
    //
    // WHITELIST, by finding: five are `ADOPTION-QUEUE-01`'s RFQ-only codes;
    // `RM-EMUL-3310` is master-resolvable and therefore harmless today, but it
    // is listed because its silence is exactly what hid it from the old pin.
    const mute = DOCUMENT_LANE.filter((c) => meaningsOf(c).length === 0);
    expect(mute).toEqual([
      'AI-CENT-6900',
      'PK-ALCP-2441',
      'PK-PETB-8803',
      'PK-PETB-8825',
      'RM-EMUL-3310',
      'RM-HUMEC-3405',
    ]);
  });
});

describe('MAT-SPACE-UNDECLARED-01 — the third space, and the real 2B input', () => {
  it('the master names five codes', () => {
    expect(Object.keys(MATERIAL_MASTER).sort()).toEqual([
      'AI-NIAC-6601',
      'PK-CAPF-8820',
      'PK-PETB-8810',
      'RM-EMUL-3310',
      'RM-EMUL-3320',
    ]);
  });

  it('the DECLARED document lane holds 33 codes, 30 of them master-absent', () => {
    // The figure `C8-MASTER-DECL` and C9 §6.4 are about. It is the DOCUMENT
    // LANE's answer, not the tree's — see the next assertion.
    expect(DOCUMENT_LANE.length).toBe(33);
    expect(DOCUMENT_LANE.filter((c) => !(c in MATERIAL_MASTER)).length).toBe(30);
  });

  it('a THIRD Paragon space exists that no declaration names', () => {
    // ⚠️ `MAT-SPACE-UNDECLARED-01`. Nine codes, in two modules, owned by us, and
    // named by NOTHING: not `C8-MASTER-DECL`, not `MOCK-RETIREMENT-01`'s blast
    // radius (scoped to `src/data/mock*.ts`), not C9 §5's per-party space count
    // (which says Paragon holds TWO), and — until this file — not the pin.
    // Membership is by MODULE, never by prefix: the codes happen to share one,
    // and `materialCode` is contractually opaque, so the shape is not the test.
    expect(UNDECLARED_SPACE).toEqual([
      'MAT-10234',
      'MAT-20500',
      'MAT-30110',
      'MAT-40220',
      'MAT-55022',
      'MAT-55031',
      'MAT-77014',
      'MAT-88201',
      'MAT-88207',
    ]);
    // It is disjoint from the declared lane — which is precisely why every rule
    // written about the declared lane leaves it untouched.
    expect(UNDECLARED_SPACE.filter((c) => DOCUMENT_LANE.includes(c))).toEqual([]);
  });

  it("the TREE's master-absent population is 39, not 30", () => {
    // The number a 2B dispatch actually has to plan against. 30 + 9.
    expect(CODES.length).toBe(44);
    expect(CODES.filter((c) => !(c in MATERIAL_MASTER)).length).toBe(39);
  });
});

describe('BPOM-OFF-BY-SPACE-01 — the fail-open is LIVE, not latent', () => {
  // The predicate `inferBpom` applies, restated here over the derived
  // population. Deliberately a COPY and not an import: importing it would couple
  // a regulatory pin to a component's export surface, and the point is to detect
  // the day the two stop agreeing.
  const wouldRequireBpom = (code: string) => code.startsWith('AI-') || code.startsWith('FR-');

  it('pins the exact set of codes that trigger a BPOM lot check', () => {
    const firing = CODES.filter(wouldRequireBpom);
    // `AI-CENT-6900` is NEW to this pin — not because anything changed, but
    // because it lives in the RFQ lane the old scope could not see.
    expect(firing).toEqual([
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
  });

  it('EVERY code in the undeclared space silently escapes the check', () => {
    // ⚠️ THE LIVE DEFECT. `MOCK_ASNS` (`supplierShipments.ts`) seeds `asnStore`,
    // which feeds `GRInspectionWizard.buildDraftFromAsn` (`:150-165`), which sets
    // `bpomRequired: inferBpom(li.materialCode)`. Not one of these nine fires.
    // The wizard renders that today — no code-space change required.
    expect(UNDECLARED_SPACE.filter(wouldRequireBpom)).toEqual([]);
  });

  it('two fragrance concentrates, opposite regulatory treatment', () => {
    // The pair that makes the defect impossible to argue with. Same class of
    // material; the ONLY thing that differs is which fixture space the code was
    // authored in.
    const rendered = (code: string) => ({
      code,
      meaning: meaningsOf(code)[0] ?? null,
      bpomRequired: wouldRequireBpom(code),
    });
    expect(rendered('MAT-88201')).toEqual({
      code: 'MAT-88201',
      meaning: 'Fragrance concentrate – Rose Oud',
      bpomRequired: false, // ← the fail-open
    });
    expect(rendered('FR-WARD-4440')).toEqual({
      code: 'FR-WARD-4440',
      meaning: 'Wardah EDP Parfum Concentrate — Rose & Oud',
      bpomRequired: true,
    });
    // THE SHARPENED RULE, pinned as a sentence because it is the transferable
    // part: A PREFIX RULE DOES NOT FAIL OPEN ON UNKNOWN PREFIXES ONLY. IT FAILS
    // OPEN ON ENTIRE VOCABULARIES.
  });

  it('no code B2a introduced changes its regulatory class', () => {
    // Stated as the RULE rather than the list, so it also governs the next sweep.
    const introduced: readonly [string, string][] = [
      ['RM-EMUL-3310', 'RM-EMUL-9410'],
      ['RM-EMUL-3320', 'RM-EMUL-9430'],
      ['RM-EMUL-9420', 'RM-EMUL-3320'],
      ['PK-PETB-8810', 'PK-PETB-8802'],
      ['PK-PETB-8810', 'PK-PETB-8803'],
      ['PK-PET-1100', 'PK-PETB-8801'],
      ['PK-PET-1110', 'PK-PETB-8802'],
      ['FR-WARDA-2401', 'FR-WARD-4410'],
      ['FR-EMINA-3550', 'FR-EMIN-4420'],
    ];
    for (const [before, after] of introduced) {
      expect(wouldRequireBpom(before), `${before} → ${after}`).toBe(wouldRequireBpom(after));
    }
  });
});

describe('MG-COLLISION-21-01 — CLOSED at 2B-1 (R-1: declared ownership decides)', () => {
  const groupMembers = (group: string) =>
    SHOULD_COST_MATERIALS.filter((m) => m.group === group).map((m) => m.name);

  it('MG-21 means CLOSURES in both vocabularies now', () => {
    // ⚠️ THIS ASSERTION WAS INVERTED AT 2B-1, AND THAT IS WHAT IT WAS FOR. At
    // 2B-0 it pinned the CONTRADICTION — master says closures, taxonomy says
    // glass — so the vocabulary could not be changed by accident, only on
    // purpose. R-1 is the purpose: the master owns material identity, material
    // group is part of identity, so the TAXONOMY moved and the master stood.
    // The deeper fix is `sdc/materialGroups.ts` — the registry the vocabulary
    // never had — pinned in its own suite.
    expect(MATERIAL_MASTER['PK-CAPF-8820'].label).toBe('Flip-Top Cap 24mm');
    expect(MATERIAL_MASTER['PK-CAPF-8820'].materialGroup).toBe('MG-21');
    expect(groupMembers('MG-21')).toEqual(['PP caps/closures']);
    // Glass took a new number rather than the master taking a new group.
    expect(groupMembers('MG-25')).toEqual(['Glass bottles/jars']);
    expect(groupMembers('MG-20')).not.toContain('PP caps/closures');
  });

  it('STILL blocks every packaging adoption — the group fix is not an adoption', () => {
    // 2B-1 removed the REASON for the block (MG-21 now carries one meaning) but
    // not the block: resolving a vocabulary is not adopting a code, and the 30
    // stay master-absent until 2B-2 says otherwise. Kept here so the two events
    // cannot be conflated by a later reader — a cleared blocker looks a lot like
    // a completed task if nothing distinguishes them.
    const packagingAwaitingAdoption = [
      'PK-ALCP-2441',
      'PK-CART-9901',
      'PK-CART-9910',
      'PK-PETB-8801',
      'PK-PETB-8802',
      'PK-PETB-8803',
      'PK-PETB-8825',
    ];
    for (const code of packagingAwaitingAdoption) {
      expect(code in MATERIAL_MASTER, `${code} must not be adopted before 2B-1`).toBe(false);
    }
  });
});

describe('INSTANCE-DATA-IN-A-TYPE-LABEL-01 — two meanings that must NOT be adopted verbatim', () => {
  it('pins the labels that carry a lot or a batch', () => {
    // A LOT AND A BATCH ARE INSTANCES, NOT TYPES. Adopting these labels
    // faithfully would make a batch number part of a material identity —
    // permanently, in the master, on a code meant to outlive every batch of it.
    //
    // Carried verbatim from the 2B pre-work report because it is the caveat to
    // the split's own framing: "7a ratifies a stated meaning" is true for 23 of
    // 25 — FOR THESE TWO, RATIFYING THE STATED MEANING IS EXACTLY THE WRONG ACT,
    // AND ADOPTING IT FAITHFULLY IS HOW THE DEFECT BECOMES PERMANENT.
    expect(meaningsOf('FR-WARD-4410')).toEqual(['Wardah Signature Floral Compound — Lot A']);
    expect(meaningsOf('FR-MKOV-5520')).toEqual([
      'Make Over Oud & Amber Accord — Batch Q2-2025',
    ]);
    // Neither is adopted yet — 2B-2 must trim the instance data first.
    expect('FR-WARD-4410' in MATERIAL_MASTER).toBe(false);
    expect('FR-MKOV-5520' in MATERIAL_MASTER).toBe(false);
  });

  it('no OTHER stated meaning in the lane carries a lot or batch marker', () => {
    // Derived, so the class cannot grow silently: if a new fixture line arrives
    // carrying "Lot X" or "Batch Y" in a description, this goes red and names it.
    const carriers = DOCUMENT_LANE.filter((c) =>
      meaningsOf(c).some((m) => /\b(lot|batch)\b/i.test(m)),
    );
    expect(carriers).toEqual(['FR-MKOV-5520', 'FR-WARD-4410']);
  });
});
