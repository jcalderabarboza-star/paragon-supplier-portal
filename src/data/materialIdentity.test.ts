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
// ── THE SECOND HAND-PICK — FOUND AT 2B-3, CLOSED AT 2B-4a ───────────────────
//   The 2B-0 header claimed the walk covered "the two code-bearing field names
//   the TYPE SYSTEM declares". THAT SENTENCE WAS FALSE IN ITS SECOND HALF: the
//   module scope derived, the FIELD-NAME scope was a literal pair, and no type
//   declared anything — `materialCode`, `sapCode` and `linkedTo` are all
//   `string`. 2B-3 found the code the pair hid (`CatalogItem.sapCode`, five
//   values in `supplierStorefront.ts`, three of them nowhere else in the tree)
//   and pinned it WITHOUT widening, because deciding whether a supplier
//   catalogue's `sapCode` is Paragon identity is a SPACE DECLARATION and 2B-1's
//   R-3 put declarations with the operator.
//
//   ⚠️ THE OPERATOR RULED AT 2B-4a: **sapCode counts. The population is
//   TWELVE, not nine.** A field holding `MAT-*` values that overlap the third
//   space IS material identity, whatever the field is named — because the whole
//   lesson of `MAT-SPACE-UNDECLARED-01` is that a space nobody declares is
//   covered by no rule written about the spaces that were.
//
//   The ruling is executed as a DERIVATION and not as a third literal: the
//   field set is CLOSED over the tree from the master's own key set (see the
//   block above `deriveFieldSet`). A fourth code-bearing key arriving anywhere
//   widens the census without anybody editing this file — which is the only
//   version of this fix that does not need making again.
//
// ── ⚠️ THE THIRD HAND-PICK, FOUND BY THE SECOND ONE'S FIX AND STILL OPEN ────
//   `MEANING-SCOPE-IS-A-HAND-PICK-01`. The POPULATION derives, the LANE SET
//   derives, the FIELD SET now derives — and what counts as a MEANING is still
//   `/description/i`, a shape-match on a field name. The three codes 2B-4a
//   admitted enter MUTE, because the storefront states its meaning under a key
//   called `material`; read that key too and the tree holds THREE live identity
//   violations nobody has seen (one meaning on two codes, and two codes with
//   two meanings each). MEASURED and pinned below, NOT applied.
//
//   The transferable shape, and it is why this is filed as its own class:
//   EACH TIME A LEVEL WAS FIXED, THE NEXT LEVEL UP WAS STILL A HAND-PICK.
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
// ── WHAT 2B-4a CHANGED HERE ─────────────────────────────────────────────────
//   The field set (above). Several assertions were INVERTED rather than
//   deleted, per the 2B-2 convention: `SAPCODE-INVISIBLE-TO-THE-CENSUS-01` now
//   records that the blind spot is closed, and the master-absent figure records
//   that it went UP — 9 → 12 — on a batch that added no code to the tree. A
//   figure that only ever improves while its scope stays narrower than the tree
//   is a figure improving about itself.
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

/** ONE STRING CELL IN THE TREE — the key it sat under, its value, the meaning
 *  its own object states, and the module. Collected for EVERY key, because the
 *  code-bearing FIELD SET is derived from these rather than declared above
 *  them (2B-4a). Nothing here knows the name `materialCode`. */
interface Cell {
  readonly field: string;
  readonly value: string;
  readonly meaning: string | null;
  /** The meaning under a DELIBERATELY WIDER key rule — see
   *  `MEANING-SCOPE-IS-A-HAND-PICK-01`. Measured, never used by the identity
   *  property; the widening is a declaration nobody has made. */
  readonly meaningWide: string | null;
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
const siblingMatching = (o: Record<string, unknown>, re: RegExp): string | null => {
  for (const k of Object.keys(o)) {
    if (re.test(k) && typeof o[k] === 'string' && o[k] !== '') return o[k] as string;
  }
  return null;
};

const meaningOf = (o: Record<string, unknown>) => siblingMatching(o, /description/i);

/** ⚠️ `MEANING-SCOPE-IS-A-HAND-PICK-01`. The SAME rule with ONE more key name.
 *  Its results are MEASURED and reported below; they never feed the identity
 *  property, because widening what counts as a meaning is a declaration and
 *  2B-1's R-3 put declarations with the operator. */
const meaningWideOf = (o: Record<string, unknown>) =>
  siblingMatching(o, /description|^material$/i);

const collect = (root: unknown, module: string, out: Cell[]) => {
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
    const meaning = meaningOf(o);
    const meaningWide = meaningWideOf(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      // A value identical to its own field name is a COLUMN-KEY MAP, not a code
      // (`sdc/ingest.ts:134` `IMPORT_DECLARE_COLUMN`). Stated as a general rule
      // rather than an exclusion of one literal, so it also covers the next one.
      if (typeof v === 'string' && v !== '' && v !== k) {
        out.push({ field: k, value: v, meaning, meaningWide, module });
      } else if (Array.isArray(v)) {
        // A bare `string[]` states no meaning of its own; the parent's is
        // carried and the ONE-MEANING check discards it below if it is null.
        for (const e of v) {
          if (typeof e === 'string' && e !== '' && e !== k) {
            out.push({ field: k, value: e, meaning: null, meaningWide: null, module });
          }
        }
      }
      walk(v);
    }
  };
  walk(root);
};

const CELLS: Cell[] = [];

for (const [file, load] of Object.entries(sourceModules)) {
  if (IS_TEST_MODULE.test(file)) continue;
  const mod = await load();
  for (const value of Object.values(mod)) collect(value, file, CELLS);
}

// ─── ⚠️ THE FIELD SET DERIVES (2B-4a) ───────────────────────────────────────
//
// Seeded from the MASTER's own key set — the one declared statement of what a
// Paragon material code IS — and closed over the tree: a field is CODE-BEARING
// if any of its values is a known code, and its own values then become known
// codes. `sapCode` enters on the SECOND round, exactly the way the operator
// ruled it in: it holds no master code, but two of its five values are already
// in the `MAT-*` third space that `materialCode` reaches.
//
// ⚠️ AND THE CLOSURE ALONE IS UNSOUND — `FIELD-SET-CLOSURE-OVERRUNS-01`. Run
// without the disqualifier below it admits `SupplierDocument.linkedTo`, a
// FREE-TEXT reference field holding values like 'All materials' and
// 'PO-2025-00107 / PK-PETB-8801'. One of its thirteen values IS a material
// code, so it is admitted; its OTHER values then become "material codes", and
// in two more rounds the census has swallowed `poNumber` and `poReference` and
// is reporting 26 purchase-order numbers as material identity — 83 codes and 48
// master-absent instead of 47 and 12. DERIVING A SCOPE TRANSITIVELY IS NOT THE
// SAME ACT AS DERIVING A POPULATION: one free-text field is a bridge between
// two identifier spaces, and a closure walks across it without noticing.
//
// THE DISQUALIFIER, and it is not a shape rule about codes: a field is rejected
// if any of its values PROPERLY CONTAINS a known code without BEING one. That
// says nothing about what a code looks like — it says that a cell holding
// 'PO-2025-00107 / PK-PETB-8801' is not one identifier under ANY reading of
// what identifiers look like. A CELL THAT CONTAINS AN IDENTIFIER IS A
// REFERENCE; ONLY A CELL THAT IS ONE IS IDENTITY.
const VALUES_BY_FIELD = new Map<string, Set<string>>();
for (const c of CELLS) {
  if (!VALUES_BY_FIELD.has(c.field)) VALUES_BY_FIELD.set(c.field, new Set());
  VALUES_BY_FIELD.get(c.field)!.add(c.value);
}

const deriveFieldSet = () => {
  let codes = new Set<string>(Object.keys(MATERIAL_MASTER));
  let fields: string[] = [];
  let disqualified = new Map<string, string[]>();
  for (let round = 0; round < 8; round += 1) {
    const admitted: string[] = [];
    const rejected = new Map<string, string[]>();
    for (const [field, values] of VALUES_BY_FIELD) {
      if (![...values].some((v) => codes.has(v))) continue;
      const impure = [...values]
        .filter((v) => !codes.has(v) && [...codes].some((c) => v.includes(c)))
        .sort();
      if (impure.length > 0) rejected.set(field, impure);
      else admitted.push(field);
    }
    admitted.sort();
    const next = new Set<string>(Object.keys(MATERIAL_MASTER));
    for (const f of admitted) for (const v of VALUES_BY_FIELD.get(f)!) next.add(v);
    const stable = admitted.join('|') === fields.join('|') && next.size === codes.size;
    fields = admitted;
    codes = next;
    disqualified = rejected;
    if (stable) break;
  }
  return { fields, codes: [...codes].sort(), disqualified };
};

const { fields: CODE_FIELDS, disqualified: DISQUALIFIED_FIELDS } = deriveFieldSet();

const REFS: MaterialRef[] = CELLS.filter((c) => CODE_FIELDS.includes(c.field)).map((c) => ({
  code: c.value,
  meaning: c.meaning,
  module: c.module,
}));

const BEARING_MODULES = [...new Set(REFS.map((r) => r.module))].sort();

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
    //
    // ⚠️ WIDENED AT 2B-4a, and the guard now covers the DERIVATION as well as
    // the walk: an empty field set produces an empty population, and every
    // "no offenders" assertion below would then pass with nothing in scope.
    // That is the `--passWithNoTests` shape one layer in — green because it
    // found nothing to do — and it is the exact failure `materialMasterAuthoring
    // .test.ts` hit at 2B-3 with nineteen vacuous assertions.
    expect(CELLS.length).toBeGreaterThan(1000);
    expect(CODE_FIELDS.length).toBeGreaterThan(2);
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
        // ── and the one the FIELD SET bought, at 2B-4a ──
        '/src/services/data/mock/fixtures/supplierStorefront.ts',
      ]),
    );
  });

  it('no source file declares a material code the walk never reached', () => {
    // The guard that does NOT depend on the walk. Reads raw text — so it covers
    // `.tsx`, unexported constants, and any module the walk failed to traverse.
    // It cannot recognise an unknown code by shape (opacity forbids that), so it
    // works the only honest way available: every literal written UNDER a
    // code-bearing key must appear in the derived population.
    //
    // ⚠️ AT 2B-0 THIS GREPPED TWO LITERAL KEY NAMES, which is the defect one
    // level in that `SAPCODE-INVISIBLE-TO-THE-CENSUS-01` found: the guard
    // inherited the walk's blind spot instead of covering it. The key names now
    // come from `CODE_FIELDS`, so the guard widens whenever the derivation does.
    const missed: string[] = [];
    for (const [file, text] of Object.entries(sourceText)) {
      if (IS_TEST_MODULE.test(file)) continue;
      for (const field of CODE_FIELDS) {
        const literals = [
          ...[...text.matchAll(new RegExp(`${field}:\\s*'([^']+)'`, 'g'))].map((m) => m[1]),
          ...[...text.matchAll(new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`, 'g'))].flatMap((m) =>
            [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]),
          ),
        ];
        for (const lit of literals) {
          if (lit === field) continue; // the column-key map, per the rule above
          if (!CODES.includes(lit)) missed.push(`${lit} @ ${file} (${field})`);
        }
      }
    }
    expect(missed).toEqual([]);
  });
});

describe('2B-4a — the FIELD SET derives too (the third level)', () => {
  it('the derived field set is exactly THREE keys, and nothing named them', () => {
    // ⚠️ THE OPERATOR RULING, EXECUTED AS A DERIVATION RATHER THAN AS A LIST.
    // "A field holding MAT-* values that overlap the third space IS material
    // identity, whatever the field is named." `sapCode` is admitted on the
    // SECOND round for precisely that reason — it holds no master code, and two
    // of its five values are already in the `MAT-*` space `materialCode`
    // reaches. Adding a fourth code-bearing key anywhere in the tree widens
    // this set without anybody editing it.
    expect(CODE_FIELDS).toEqual(['materialCode', 'materialIds', 'sapCode']);
  });

  it('⚠️ FIELD-SET-CLOSURE-OVERRUNS-01 — the disqualifier, and what it stops', () => {
    // Run as a bare closure, the derivation admits `SupplierDocument.linkedTo`
    // on the FIRST round — one of its thirteen values is a material code — and
    // then treats its other twelve as material codes too. Two rounds later the
    // census owns `poNumber` and `poReference` and reports 26 purchase-order
    // numbers as material identity: 83 codes, 48 master-absent.
    //
    // Pinned by NAME and by the exact values that disqualify it, so the
    // rejection is a recorded measurement rather than a filter nobody reads.
    expect([...DISQUALIFIED_FIELDS.keys()]).toEqual(['linkedTo']);
    expect(DISQUALIFIED_FIELDS.get('linkedTo')).toEqual([
      'PK-PETB-8801, PK-PETB-8810',
      'PO-2025-00107 / PK-PETB-8801',
      'PO-2025-00109 / PK-PETB-8802',
    ]);
    // And the consequence, asserted rather than described: no PO number is in
    // the material population.
    expect(CODES.filter((c) => c.startsWith('PO-'))).toEqual([]);
  });

  it('no admitted code properly contains another — the disqualifier is not vacuous', () => {
    // The rule would be free if codes never contained one another. They do not
    // HERE, which is why `materialCode` survives it — stated as a measurement
    // so that the day a code becomes a prefix of another, this reads as the
    // warning it is rather than as a silent narrowing of the census.
    expect(CODES.filter((a) => CODES.some((b) => b !== a && a.includes(b)))).toEqual([]);
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

  it('the overlap is now TOTAL — 3 codes → 28 → all 33', () => {
    // CORRECTED at 2B-0 (the B2a version listed two — its scope excluded the RFQ
    // lane where `RM-EMUL-3310` lives), WIDENED at 2B-2 by the adoptions, and
    // COMPLETED at 2B-3 by the five authored rows. Derived, not listed: what is
    // pinned is the count and its complement, so the complement going empty is
    // a measured result rather than an edited literal.
    expect(shared.length).toBe(33);
    expect(DOCUMENT_LANE.filter((c) => !(c in MATERIAL_MASTER))).toEqual([]);
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
  it('the master names THIRTY-FIVE — 5 seeded, 25 adopted at 2B-2, 5 authored at 2B-3', () => {
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(35);
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

  it('the DECLARED document lane still holds 33 codes — and now ZERO are master-absent', () => {
    // The figure `C8-MASTER-DECL` and C9 §6.4 are about. THE LANE DID NOT SHRINK
    // — neither adoption nor authoring deletes a document-lane code, they make
    // the master able to RESOLVE it. Same 33 codes across all three batches;
    // 3 resolved, then 28, now all of them.
    expect(DOCUMENT_LANE.length).toBe(33);
    expect(DOCUMENT_LANE.filter((c) => !(c in MATERIAL_MASTER))).toEqual([]);
  });

  it('SAPCODE-INVISIBLE-TO-THE-CENSUS-01 — CLOSED at 2B-4a (the population is TWELVE)', () => {
    // ⚠️ THIS ASSERTION WAS INVERTED, NOT DELETED, AND THAT IS WHAT IT WAS FOR.
    // At 2B-3 it pinned the blind spot: three of the five `sapCode` values were
    // invisible to every other assertion in this file, so the master-absent
    // figure was NINE with a two-field scope attached to it and TWELVE if the
    // field counted. Which was true was a DECLARATION, and 2B-1's R-3 put
    // declarations with the operator.
    //
    // THE OPERATOR RULED AT 2B-4a: sapCode counts. A field holding `MAT-*`
    // values that overlap the third space IS material identity, whatever the
    // field is named — because the lesson of `MAT-SPACE-UNDECLARED-01` is that
    // a space nobody declares is covered by no rule written about the spaces
    // that were. The ruling is executed as a DERIVATION (see the field-set
    // block above), so the census reaches it by mechanism rather than because
    // somebody typed the key.
    const sapCodes = [
      ...new Set(
        Object.entries(sourceText)
          .filter(([f]) => !IS_TEST_MODULE.test(f))
          .flatMap(([, text]) => [...text.matchAll(/sapCode:\s*'([^']+)'/g)].map((m) => m[1])),
      ),
    ].sort();
    expect(sapCodes).toEqual([
      'MAT-10045',
      'MAT-10046',
      'MAT-10089',
      'MAT-30110',
      'MAT-40220',
    ]);

    // ⚠️ NONE OF THE FIVE IS INVISIBLE NOW. The raw scan and the module walk
    // agree, which is the property the 2B-3 pin recorded the absence of.
    expect(sapCodes.filter((c) => !CODES.includes(c))).toEqual([]);

    // The two that were already in the third space still are. The storefront
    // field OVERLAPS `MAT-*` rather than holding an unrelated vocabulary — and
    // that overlap is what the derivation admits the field ON.
    expect(sapCodes.filter((c) => UNDECLARED_SPACE.includes(c))).toEqual([
      'MAT-30110',
      'MAT-40220',
    ]);

    // NINE WAS THE TWO-FIELD ANSWER. TWELVE IS THE TREE'S.
    expect(CODES.filter((c) => !(c in MATERIAL_MASTER))).toHaveLength(12);

    // ⚠️ WHAT THE RULING DID **NOT** SETTLE, kept open on purpose. The
    // population question is answered; the SPACE question is not. Nine of the
    // twelve sit in the two modules `MAT-SPACE-UNDECLARED-01` names; three sit
    // in the storefront. Whether that is ONE space of twelve or two spaces
    // sharing two codes is still a declaration nobody has made, and C9 §5 still
    // requires a `MaterialRef` to name its space. Counting a code is not
    // placing it.
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent.filter((c) => UNDECLARED_SPACE.includes(c))).toHaveLength(9);
    expect(absent.filter((c) => !UNDECLARED_SPACE.includes(c))).toEqual([
      'MAT-10045',
      'MAT-10046',
      'MAT-10089',
    ]);
  });

  it('⚠️ MEANING-SCOPE-IS-A-HAND-PICK-01 — the FOURTH level, and it is not empty', () => {
    // THE DERIVATION LADDER, one rung further, and the answer the 2B-4a dispatch
    // asked for: `CENSUS-MUST-DERIVE-01` fixed the POPULATION, `DERIVED-OVER-A-
    // CHOSEN-SCOPE-01` fixed the LANE SET, 2B-4a fixed the FIELD SET — and the
    // MEANING SET is STILL A LITERAL. `meaningOf` accepts any sibling key
    // matching `/description/i`, which is a shape-match on a field NAME: the
    // same defect, one field over.
    //
    // The three codes this batch admitted enter the population MUTE, because the
    // storefront states its meaning under a key called `material`. So they are
    // counted by the master-absent figure and are STRUCTURALLY INCAPABLE of
    // contradicting anything — which is exactly what `DERIVED-OVER-A-CHOSEN-
    // SCOPE-01` said about `materialIds` at 2B-0. A clean census is not evidence
    // of a clean tree if the new half is mute by construction.
    for (const c of ['MAT-10045', 'MAT-10046', 'MAT-10089']) {
      expect(meaningsOf(c), `${c} is in the census and states nothing`).toEqual([]);
    }

    // ⚠️ AND WIDENING BY ONE KEY IS NOT COSMETIC — MEASURED HERE, NOT APPLIED.
    // Reading `material` as a meaning too produces THREE live violations of the
    // identity property that no batch has ever seen. Pinned rather than fixed,
    // for the 2B-3 reason: applying it silently moves a headline result, and
    // whether a supplier catalogue's prose is a Paragon MEANING is the same
    // class of declaration as whether its `sapCode` is Paragon identity.
    const wideMeaning = (code: string) =>
      [
        ...new Set(
          CELLS.filter(
            (c) => CODE_FIELDS.includes(c.field) && c.value === code && c.meaningWide !== null,
          ).map((c) => c.meaningWide!),
        ),
      ].sort();
    // ONE MEANING, TWO CODES — the storefront's `MAT-10045` and the master's
    // `PK-PETB-8803` are both 'PET Bottle 100ml Airless Pump'. 2B-3 noticed this
    // in prose while sourcing that very label; here it is as data.
    expect(wideMeaning('MAT-10045')).toContain('PET Bottle 100ml Airless Pump');
    expect(MATERIAL_MASTER['PK-PETB-8803'].label).toBe('PET Bottle 100ml Airless Pump');
    // ONE CODE, TWO MEANINGS — twice. `MAT-30110` is 'Specialty fat blend — RBD
    // stearin' in the shipment lane and 'RBD Palm Stearin — Specialty Fat' in
    // the storefront; `MAT-40220` differs only in case, which is worse, not
    // better: a case difference is what a reader skims past.
    expect(meaningsOf('MAT-30110')).toEqual(['Specialty fat blend — RBD stearin']);
    expect(wideMeaning('MAT-30110')).toContain('RBD Palm Stearin — Specialty Fat');
    expect(meaningsOf('MAT-40220')).toEqual(['Emulgade SE-PF emulsifier']);
    expect(wideMeaning('MAT-40220')).toContain('Emulgade SE-PF Emulsifier');
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

  it("the TREE's master-absent population: 39 → 14 → 9 → 12, and the RISE is the finding", () => {
    // The number a 2B dispatch actually has to plan against: 30 + 9, then 5 + 9,
    // then 0 + 9 — and now 0 + 12. What NEVER moved is the second term through
    // three batches of adoption and authoring, because every one of them was
    // scoped to a DECLARED lane.
    //
    // ⚠️ AND IT WENT **UP** AT 2B-4a WITHOUT A SINGLE CODE BEING ADDED TO THE
    // TREE. The three arrivals were in `supplierStorefront.ts` the whole time;
    // what changed is that the census can now see the field they sit in. THAT IS
    // THE POINT OF THE WHOLE DERIVATION LADDER: a figure that improves every
    // batch while the scope stays narrower than the tree is a figure improving
    // about itself. The honest direction of this number, on the batch that
    // widened the scope, is UP.
    expect(CODES.length).toBe(47);
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toHaveLength(12);
    // ⚠️ NO LONGER HOMOGENEOUS, and 2B-3's phrasing has to go with it.
    // "master-absent" and "third space" were the same set for exactly one
    // batch. They are nine and twelve again, and the extra three are not in a
    // space anybody has declared either.
    expect(absent).not.toEqual(UNDECLARED_SPACE);
    expect(UNDECLARED_SPACE.every((c) => absent.includes(c))).toBe(true);
    // What DID hold across the widening: none of them is in the document lane.
    expect(absent.filter((c) => DOCUMENT_LANE.includes(c))).toEqual([]);
  });

  it('ALL FIVE document lanes are now 100% master-resolvable', () => {
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
    // ⚠️ AND THE FIFTH, at 2B-3. The RFQ lane was the last holdout and it was
    // the hardest one, because a `materialIds: string[]` states no meaning to
    // ratify — its five codes had to be AUTHORED rather than adopted.
    expect(unresolvedIn(/^\/src\/data\/mockRfqs\.ts$/)).toEqual([]);
  });

  it('but the GR gate STILL cannot be a master check — the 2B-4 gate, measured', () => {
    // The distinction the capability headline hides, and the reason
    // `bpomApplicable` is authored-not-wired at 2B-4a. The GR FIXTURE lane
    // resolves completely (above). The GR RUNTIME INPUT does not: the wizard is
    // fed `asnStore`, seeded from `MOCK_ASNS` in the UNDECLARED space, and not
    // one of those codes is in the master. A fail-closed rule keyed on master
    // membership would refuse essentially every received line today.
    //
    // ⚠️ THE GATE GOT WIDER AT 2B-4a, NOT NARROWER. Nine unresolvable codes
    // became twelve when the census reached the field they were hiding in — so
    // the batch that authored the mechanism also enlarged the population that
    // must be dealt with before the mechanism may be wired. 2B-4b inherits
    // twelve.
    expect(UNDECLARED_SPACE.filter((c) => c in MATERIAL_MASTER)).toEqual([]);
    expect(UNDECLARED_SPACE).toHaveLength(9);
    expect(CODES.filter((c) => !(c in MATERIAL_MASTER))).toHaveLength(12);
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

  it('2B-4a WIDENED THE CENSUS BY THREE CODES AND MOVED THE FIRING SET BY ZERO', () => {
    // ⚠️ THE STANDING ASSERTION, and this batch had two independent ways to
    // move it: a census widening that admits three new codes, and a
    // `bpomApplicable` field on all 35 master rows. Neither can, and both are
    // checked rather than argued.
    //
    //   · The three new codes are `MAT-*`, so the PREFIX predicate does not fire
    //     on them — measured, not assumed from what they look like.
    //   · `bpomApplicable` is a MASTER FIELD and `inferBpom` reads a STRING.
    //     Disjoint mechanisms; see `bpomApplicability.test.ts` for the pin that
    //     the wizard still runs the prefix rule.
    const firing = CODES.filter(wouldRequireBpom);
    expect(firing).toHaveLength(16);
    expect(['MAT-10045', 'MAT-10046', 'MAT-10089'].filter(wouldRequireBpom)).toEqual([]);
    // ⚠️ AND THE FAIL-OPEN GOT BIGGER. `BPOM-OFF-BY-SPACE-01` was nine codes
    // silently escaping the check; it is TWELVE. The widening did not create
    // the defect — it measured three more of it.
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toHaveLength(12);
    expect(absent.filter(wouldRequireBpom)).toEqual([]);
  });

  it('2B-2 and 2B-3 added 30 codes and moved the firing set by ZERO', () => {
    // Worth asserting explicitly rather than inferring from the pin above. The
    // predicate reads a PREFIX; adoption and authoring write the MASTER. They
    // are disjoint mechanisms, so two batches that made 30 codes
    // master-resolvable changed nothing regulatory — which is exactly why
    // `bpomApplicable` remains the 2B-4 gate's business and not theirs.
    const firing = CODES.filter(wouldRequireBpom);
    expect(firing.filter((c) => c in MATERIAL_MASTER)).toHaveLength(16);
    // ⚠️ EVERY FIRING CODE IS NOW MASTER-RESOLVABLE — `AI-CENT-6900` was the
    // last one outside, and 2B-3 authored it. THE SET DID NOT MOVE; only what
    // the master can say about its members did. That is the cleanest available
    // statement of why the prefix rule is not a master rule: total coverage of
    // the firing set changed nothing about which codes fire, because the master
    // is not consulted at all.
    expect(firing.filter((c) => !(c in MATERIAL_MASTER))).toEqual([]);
    // The fail-open that IS live remains the `MAT-*` one: none of those nine
    // fires, and none of them is resolvable either.
    expect(UNDECLARED_SPACE.filter(wouldRequireBpom)).toEqual([]);
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

  it('all SEVEN packaging codes resolve now — but by TWO different acts', () => {
    // At 2B-1 this listed seven codes and asserted every one was master-absent —
    // the block that a resolved vocabulary is not an adoption. 2B-2 split them
    // exactly along the line 2B-1 predicted: a code that STATES a meaning gets
    // ratified, a code that states none does not. 2B-3 took the other three.
    //
    // ⚠️ THE SPLIT IS PRESERVED HERE RATHER THAN COLLAPSED, because "all seven
    // resolve" is the uninteresting half. Four were RATIFIED against a string
    // the lane already carried; three were AUTHORED from an RFQ title. Both
    // produce a master row, and only one of them can be checked against the
    // lane. A later reader comparing the seven should be able to see which is
    // which without going to the register.
    const ratified = ['PK-CART-9901', 'PK-CART-9910', 'PK-PETB-8801', 'PK-PETB-8802'];
    for (const code of ratified) {
      expect(code in MATERIAL_MASTER, `${code} was adopted at 2B-2`).toBe(true);
      expect(meaningsOf(code).length, `${code} stated a meaning to ratify`).toBe(1);
    }
    // `PK-ALCP-2441` is the one R-1's substrate-vs-function split was argued
    // over, and it landed at MG-21 with the plastic closures.
    for (const code of ['PK-ALCP-2441', 'PK-PETB-8803', 'PK-PETB-8825']) {
      expect(code in MATERIAL_MASTER, `${code} was authored at 2B-3`).toBe(true);
      // AND STILL STATES NOTHING. Authoring made the code RESOLVABLE; it did not
      // make the lane describe it. `meaningsOf` is unchanged for all three.
      expect(meaningsOf(code), `${code} still states no meaning`).toEqual([]);
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
