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
// ── WHAT 2B-2 CHANGED HERE ──────────────────────────────────────────────────
//   The 25 adoptions. Several assertions below were INVERTED rather than
//   deleted — the master-absent count, the packaging block, the instance-data
//   pin — because a pin that recorded a problem is the only thing that can
//   record its resolution. A deleted assertion and a fixed defect look
//   identical in a diff; an inverted one does not. What did NOT change: the
//   identity property itself, the BPOM firing set, and the undeclared space.
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

  it('the overlap went from THREE codes to TWENTY-EIGHT at 2B-2', () => {
    // CORRECTED at 2B-0 (the B2a version listed two — its scope excluded the RFQ
    // lane where `RM-EMUL-3310` lives), and WIDENED at 2B-2 by the adoptions.
    // Derived, not listed: what is pinned is the count and its complement, so a
    // 2B-3 adoption moves this deliberately rather than by editing a literal.
    expect(shared.length).toBe(28);
    expect(DOCUMENT_LANE.filter((c) => !(c in MATERIAL_MASTER))).toEqual([
      'AI-CENT-6900',
      'PK-ALCP-2441',
      'PK-PETB-8803',
      'PK-PETB-8825',
      'RM-HUMEC-3405',
    ]);
  });

  it('the ONLY remaining label disagreements are the two SEED entries', () => {
    // ⚠️ `IDENTITY-GRAIN-ASYMMETRY-01`, and it is a MEASURED result rather than a
    // list. Of the 28 shared codes, 27 state a meaning; 25 of those are 2B-2
    // adoptions and therefore agree with the master BY CONSTRUCTION. The two
    // that disagree are both SDC-0 SEED entries — and in both, THE DOCUMENT LANE
    // IS MORE SPECIFIC THAN THE MASTER, never the reverse.
    //
    // That asymmetry is the finding. The adopted rows ratified a stated grade
    // ("Feed Grade 98%", "99.5% — BHA", "High MW"), so the master now names
    // grades everywhere EXCEPT on the two codes it was seeded with. Under the
    // PROVISIONAL `D-IDENTITY-GRAIN = SPECIFICATION` that is a defect, not an
    // open question — but seed data is outside 2B-2's scope, so it is pinned
    // here and reported rather than quietly corrected.
    const disagreeing = shared
      .map((c) => ({ code: c, master: MATERIAL_MASTER[c].label, document: meaningsOf(c) }))
      .filter((r) => r.document.length > 0 && !r.document.includes(r.master));
    expect(disagreeing).toEqual([
      {
        code: 'AI-NIAC-6601',
        master: 'Niacinamide (Vitamin B3)',
        document: ['Niacinamide USP Grade 99.5% (Vitamin B3)'],
      },
      {
        code: 'RM-EMUL-3320',
        master: 'Cetearyl Alcohol',
        document: ['Cetearyl Alcohol — Vegetable Origin'],
      },
    ]);
    // `RM-EMUL-3310` is in neither list: it is in the document lane, and it
    // states NO meaning there. See the mute describe below.
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
  it('the master names THIRTY codes — five seeded, twenty-five adopted at 2B-2', () => {
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(30);
    // The five it was seeded with, still all present and still the only ones
    // this batch did not touch.
    for (const seed of [
      'AI-NIAC-6601',
      'PK-CAPF-8820',
      'PK-PETB-8810',
      'RM-EMUL-3310',
      'RM-EMUL-3320',
    ]) {
      expect(seed in MATERIAL_MASTER, `${seed} is seed data and must survive`).toBe(true);
    }
  });

  it('the DECLARED document lane still holds 33 codes — 5 master-absent, not 30', () => {
    // The figure `C8-MASTER-DECL` and C9 §6.4 are about. THE LANE DID NOT SHRINK
    // — adoption does not delete a document-lane code, it makes the master able
    // to resolve it. Same 33 codes; 28 now resolve.
    expect(DOCUMENT_LANE.length).toBe(33);
    expect(DOCUMENT_LANE.filter((c) => !(c in MATERIAL_MASTER)).length).toBe(5);
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

  it("the TREE's master-absent population fell 39 → 14, and WHERE matters", () => {
    // The number a 2B dispatch actually has to plan against — 30 + 9 before this
    // batch, 5 + 9 after it. What did NOT move is the second term: the third
    // space is untouched, because adoption is scoped to a DECLARED lane.
    expect(CODES.length).toBe(44);
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toHaveLength(14);
    expect(absent.filter((c) => UNDECLARED_SPACE.includes(c))).toHaveLength(9);
    expect(absent.filter((c) => DOCUMENT_LANE.includes(c))).toHaveLength(5);
  });

  it('FOUR of the five document lanes are now 100% master-resolvable', () => {
    // ⚠️ THE CAPABILITY BOUNDARY, stated as a derived fact rather than a claim
    // in a PR body. Every remaining unresolvable document-lane code lives in ONE
    // module — the RFQ lane — and every one of them is a code that states no
    // meaning (2B-3's population). The transacting lanes are clean.
    const unresolvedIn = (re: RegExp) =>
      inModules(re).filter((c) => !(c in MATERIAL_MASTER));
    expect(unresolvedIn(/^\/src\/data\/mockPurchaseOrders\.ts$/)).toEqual([]);
    expect(unresolvedIn(/^\/src\/data\/mockGoodsReceipts\.ts$/)).toEqual([]);
    expect(unresolvedIn(/^\/src\/data\/mockInventory\.ts$/)).toEqual([]);
    expect(unresolvedIn(/^\/src\/data\/mockShipments\.ts$/)).toEqual([]);
    expect(unresolvedIn(/^\/src\/data\/mockRfqs\.ts$/)).toEqual([
      'AI-CENT-6900',
      'PK-ALCP-2441',
      'PK-PETB-8803',
      'PK-PETB-8825',
      'RM-HUMEC-3405',
    ]);
  });

  it('but the GR gate STILL cannot be a master check — the 2B-4 gate, measured', () => {
    // The distinction the capability headline hides, and the reason
    // `bpomApplicable` is not wired in this batch. The GR FIXTURE lane resolves
    // completely (above). The GR RUNTIME INPUT does not: the wizard is fed
    // `asnStore`, seeded from `MOCK_ASNS` in the UNDECLARED space, and not one
    // of those nine codes is in the master. A fail-closed rule keyed on master
    // membership would refuse essentially every received line today.
    expect(UNDECLARED_SPACE.filter((c) => c in MATERIAL_MASTER)).toEqual([]);
    expect(UNDECLARED_SPACE).toHaveLength(9);
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

  it('2B-2 adopted 25 codes and moved the firing set by ZERO', () => {
    // Worth asserting explicitly rather than inferring from the pin above. The
    // predicate reads a PREFIX; adoption writes the MASTER. They are disjoint
    // mechanisms, so a batch that made 25 codes master-resolvable changed
    // nothing regulatory — which is exactly why `bpomApplicable` remains the
    // 2B-4 gate's business and not this batch's.
    const firing = CODES.filter(wouldRequireBpom);
    expect(firing.filter((c) => c in MATERIAL_MASTER)).toHaveLength(15);
    expect(firing.filter((c) => !(c in MATERIAL_MASTER))).toEqual(['AI-CENT-6900']);
    // …and the one that is NOT master-resolvable is an RFQ-mute code, so the
    // wizard never sees it. The fail-open that IS live remains the `MAT-*` one.
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

  it('2B-2 adopted the FOUR packaging codes that stated a meaning, and no more', () => {
    // At 2B-1 this listed seven codes and asserted every one was master-absent —
    // the block that a resolved vocabulary is not an adoption. 2B-2 is the
    // adoption, and it splits the seven exactly along the line 2B-1 predicted:
    // a code that STATES a meaning gets ratified, a code that states none does
    // not, and the group ruling is what made the first four safe to take.
    const adopted = ['PK-CART-9901', 'PK-CART-9910', 'PK-PETB-8801', 'PK-PETB-8802'];
    for (const code of adopted) {
      expect(code in MATERIAL_MASTER, `${code} was adopted at 2B-2`).toBe(true);
      expect(meaningsOf(code).length, `${code} stated a meaning to ratify`).toBe(1);
    }
    // The three left behind are RFQ-mute, and `PK-ALCP-2441` is the one R-1's
    // substrate-vs-function split was argued over. It is 2B-3's row, and this
    // pin is what stops it being swept in with a packaging batch.
    for (const code of ['PK-ALCP-2441', 'PK-PETB-8803', 'PK-PETB-8825']) {
      expect(code in MATERIAL_MASTER, `${code} states no meaning — 2B-3, not 2B-2`).toBe(false);
      expect(meaningsOf(code)).toEqual([]);
    }
  });
});

describe('INSTANCE-DATA-IN-A-TYPE-LABEL-01 — TRIMMED at 2B-2, completely', () => {
  it('the trim reached EVERY lane, not just the one being adopted from', () => {
    // ⚠️ THE ASSERTION THAT WOULD HAVE CAUGHT A PARTIAL TRIM, and the reason it
    // is worth having: the mutation probe at 2B-0 showed that trimming `— Lot A`
    // in ONE lane fails BOTH pins — the instance-data pin AND `ONE CODE, ONE
    // MEANING` — because the other lanes still carry the untrimmed string. The
    // marker was at SIX sites across four modules for `FR-WARD-4410`.
    //
    // `meaningsOf` collects DISTINCT meanings across the whole tree, so a single
    // untrimmed survivor anywhere makes these arrays length 2 and turns the
    // top-level identity property red as well. THE TRIM IS COMPLETE OR NOT AT
    // ALL, and this is the shape that enforces it.
    expect(meaningsOf('FR-WARD-4410')).toEqual(['Wardah Signature Floral Compound']);
    expect(meaningsOf('FR-MKOV-5520')).toEqual(['Make Over Oud & Amber Accord']);
  });

  it('the master adopted the TRIMMED type, and the lane agrees with it', () => {
    // Adoption ratifies a meaning the lane states. For these two, the lane's
    // stated meaning had to be CORRECTED FIRST — so what the master ratifies is
    // the type, and the lane now states the type too. Both sides, one edit.
    expect(MATERIAL_MASTER['FR-WARD-4410'].label).toBe('Wardah Signature Floral Compound');
    expect(MATERIAL_MASTER['FR-MKOV-5520'].label).toBe('Make Over Oud & Amber Accord');
    expect(meaningsOf('FR-WARD-4410')).toEqual([MATERIAL_MASTER['FR-WARD-4410'].label]);
    expect(meaningsOf('FR-MKOV-5520')).toEqual([MATERIAL_MASTER['FR-MKOV-5520'].label]);
  });

  it('NO stated meaning anywhere in the tree carries a lot or batch marker', () => {
    // Derived, and widened from the document lane to the WHOLE population: if a
    // new fixture line arrives carrying "Lot X" or "Batch Y" in a description,
    // this goes red and names it — in any space, including the undeclared one.
    const carriers = CODES.filter((c) => meaningsOf(c).some((m) => /\b(lot|batch)\b/i.test(m)));
    expect(carriers).toEqual([]);
  });

  it('⚠️ INSTANCE-DATA-HAS-NO-HOME-01 — but the RIGHT SHAPE already exists', () => {
    // Reported, not built (2B-2 dispatch: "say where it should live instead —
    // do not silently discard a fact to make a label clean").
    //
    // THE ANSWER IS NOT HYPOTHETICAL, and that is the interesting part. No
    // record type in the declared document lane carries a lot field: not
    // `InspectionResult` (it has `bpomLotCheck`, which is a CHECK RESULT, not a
    // lot identity), not `InventoryRecord`, not the shipment or PO line. But
    // `ASNLineItem` DOES (`services/data/types.ts`), it is rendered
    // (`SupplierShipments.tsx`), the ASN wizard captures it — and the space that
    // uses it correctly is the UNDECLARED one:
    //
    //     MAT-88201 · description 'Fragrance concentrate – Rose Oud'
    //                 lotNumber   'LOT-A4481'
    //
    //   TYPE IN THE DESCRIPTION, INSTANCE IN ITS OWN FIELD. The pattern the
    //   document lane needed was already implemented, correctly, in the space
    //   nobody had declared — which is a sharper version of the same lesson
    //   `MAT-SPACE-UNDECLARED-01` taught: undeclared is not the same as worse.
    const lotFieldSites = Object.entries(sourceText).filter(
      ([file, text]) =>
        /^\/src\/data\/mock(GoodsReceipts|Inventory|Shipments|PurchaseOrders)\.ts$/.test(file) &&
        /\b(batchNumber|lotNumber)\b/.test(text),
    );
    expect(lotFieldSites.map(([f]) => f)).toEqual([]);
    // And one of the two was never operationally real in the first place:
    // "Batch Q2-2025" sat on ONE PURCHASE ORDER LINE (`li-012a`, confirmedQty 0)
    // and nowhere else. A PO is a forward order; the batch it will be filled
    // from does not exist when the PO is raised. That marker was a copied
    // string, not a fact — which is why trimming it discards nothing.
    expect(modulesOf('FR-MKOV-5520').filter((m) => /^\/src\/data\//.test(m))).toEqual([
      '/src/data/mockPurchaseOrders.ts',
    ]);
  });
});
