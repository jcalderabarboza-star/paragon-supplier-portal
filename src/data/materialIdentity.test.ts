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
import { MATERIAL_SPACES, spaceOfModule } from '../services/sdc/materialSpaces';
// 2B-5b-ii — the GR RUNTIME input, read directly. The census walks the tree and
// answers "which codes exist"; the 2B-4 gate is about "which codes can reach the
// wizard", and only `MOCK_ASNS` answers that. Kept as a separate import so the
// two questions cannot be conflated the way population and exposure were.
import { MOCK_ASNS } from '../services/data/mock/fixtures/supplierShipments';
// 2B-4b — the mechanism the GR wizard now runs. Imported (not restated) on
// purpose, and note the asymmetry with `wouldRequireBpom` below: the RETIRED
// rule is a local copy so its record survives its deletion; the LIVE rule is an
// import so this file cannot drift from what the product does.
import { bpomOf } from '../services/sdc/bpom';

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
  /** Every string value on the SAME OBJECT, by key. Carried so the MEANING field
   *  set can be derived after the fact instead of being decided at walk time —
   *  deciding it here is what made it a hand-pick (2B-4a). Shared by reference
   *  across all cells of one object. */
  readonly siblings: Readonly<Record<string, string>>;
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
    const siblings: Record<string, string> = {};
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string' && o[k] !== '') siblings[k] = o[k] as string;
    }
    const NO_SIBLINGS: Readonly<Record<string, string>> = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      // A value identical to its own field name is a COLUMN-KEY MAP, not a code
      // (`sdc/ingest.ts:134` `IMPORT_DECLARE_COLUMN`). Stated as a general rule
      // rather than an exclusion of one literal, so it also covers the next one.
      if (typeof v === 'string' && v !== '' && v !== k) {
        out.push({ field: k, value: v, meaning, siblings, module });
      } else if (Array.isArray(v)) {
        // A bare `string[]` states no meaning of its own — the array is not an
        // object, so there are no siblings to read. `RFQ.materialIds` is still
        // mute after 2B-5a, and that is a fact about the shape, not a scope.
        for (const e of v) {
          if (typeof e === 'string' && e !== '' && e !== k) {
            out.push({ field: k, value: e, meaning: null, siblings: NO_SIBLINGS, module });
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

// ─── ⚠️ R-B's BOUNDARY (ratified at 2B-5a) — TWO GATES, DIFFERENT JOBS ──────
//
//   A CLOSURE MAY WIDEN A SPACE IT IS ALREADY IN. IT MAY NOT ENTER A NEW ONE.
//
// The two gates below are INDEPENDENT and it took building them to see that:
//
//   · CONTAINMENT (above) is a SOUNDNESS gate on CELLS. It is what actually
//     stops `linkedTo`, and R-B does NOT — those PO numbers live in
//     `mockPurchaseOrders.ts`, which is a DECLARED space, so a space-based
//     boundary waves them through. `FIELD-SET-CLOSURE-OVERRUNS-01` credited R-B
//     with work the containment rule was doing.
//   · SPACE (here) is an AUTHORITY gate on MODULES. A field whose codes come
//     from a module no declaration names is DECLINED AND REPORTED — never
//     silently admitted, and never silently dropped either.
//
// ⚠️ AND THE SECOND GATE INDICTS 2B-4a. Admitting `sapCode` necessarily enters
// `supplierStorefront.ts`, which no declaration named at the time. THE CLOSURE
// SHOULD HAVE HALTED AND ASKED. It widened on its own authority instead, and the
// operator's ruling happened to sanction it afterwards — luck, not governance.
// The declaration now exists (`materialSpaces.ts`, R-D), so the same widening is
// authorised rather than assumed.
const spaceIdOf = (module: string) => spaceOfModule(module)?.spaceId ?? null;

const MODULES_BY_VALUE = new Map<string, Set<string>>();
for (const c of CELLS) {
  if (!MODULES_BY_VALUE.has(c.value)) MODULES_BY_VALUE.set(c.value, new Set());
  MODULES_BY_VALUE.get(c.value)!.add(c.module);
}

/**
 * Is this value reachable inside a DECLARED space?
 *
 * ⚠️ THE GATE IS ON THE VALUE, NOT ON THE FIELD, AND THE FIRST BUILD GOT THAT
 * WRONG. Applied to every module a field touches, R-B rejects `materialCode`
 * ITSELF — that field is re-exported through barrel modules (`channel/index.ts`)
 * which declare nothing and own nothing. A barrel is not a space. What R-B
 * actually says is that a closure may widen a space it is ALREADY IN, so the
 * question is whether each NEW value LIVES in a declared space — reachable
 * through at least one module that a declaration names.
 */
const inDeclaredSpace = (value: string) =>
  [...(MODULES_BY_VALUE.get(value) ?? [])].some((m) => spaceIdOf(m) !== null);

/**
 * ONE closure, run twice — once over CODES (seeded from the master's keys) and
 * once over MEANINGS (seeded from the master's labels). Same three rules both
 * times, which is the point: a meaning scope derived by a DIFFERENT rule from
 * the code scope would just be a fourth hand-pick with extra steps.
 */
const derive = (seed: readonly string[], universe = VALUES_BY_FIELD, containmentGate = true) => {
  let known = new Set<string>(seed);
  let fields: string[] = [];
  let impureFields = new Map<string, string[]>();
  let undeclaredFields = new Map<string, string[]>();
  for (let round = 0; round < 8; round += 1) {
    const admitted: string[] = [];
    const impure = new Map<string, string[]>();
    const undeclared = new Map<string, string[]>();
    for (const [field, values] of universe) {
      if (![...values].some((v) => known.has(v))) continue;
      // GATE 1 — soundness. A cell that CONTAINS a known value without BEING one
      // is a REFERENCE, not identity.
      const dirty = containmentGate
        ? [...values].filter((v) => !known.has(v) && [...known].some((c) => v.includes(c))).sort()
        : [];
      if (dirty.length > 0) {
        impure.set(field, dirty);
        continue;
      }
      // GATE 2 — authority (R-B). Every value this field would ADD must live in
      // a DECLARED space. A field that would carry the census into a module no
      // declaration names is DECLINED AND REPORTED — the operator declares, the
      // closure does not.
      const unnamed = [...values].filter((v) => !known.has(v) && !inDeclaredSpace(v)).sort();
      if (unnamed.length > 0) {
        undeclared.set(field, unnamed);
        continue;
      }
      admitted.push(field);
    }
    admitted.sort();
    const next = new Set<string>(seed);
    for (const f of admitted) for (const v of universe.get(f)!) next.add(v);
    const stable = admitted.join('|') === fields.join('|') && next.size === known.size;
    fields = admitted;
    known = next;
    impureFields = impure;
    undeclaredFields = undeclared;
    if (stable) break;
  }
  return { fields, values: [...known].sort(), impureFields, undeclaredFields };
};

const CODE_DERIVATION = derive(Object.keys(MATERIAL_MASTER));
const CODE_FIELDS = CODE_DERIVATION.fields;
const DISQUALIFIED_FIELDS = CODE_DERIVATION.impureFields;
const UNDECLARED_FIELDS = CODE_DERIVATION.undeclaredFields;

// ─── ⚠️ THE MEANING SCOPE DERIVES (2B-5a, closing MEANING-SCOPE-IS-A-HAND-PICK-01)
//
// Seeded from the master's own `label` values — the one declared statement of
// what a Paragon material MEANS, exactly as the code closure is seeded from its
// declared keys. `material` (the storefront's own word for the item) is admitted
// on the first round because one catalogue row states a master label byte for
// byte; `title` and `remittanceNote` are correctly REFUSED by the containment
// gate, because an RFQ title and a payment note CONTAIN a meaning rather than
// BEING one — the same distinction, in the other vocabulary.
//
// ⚠️ AND IT RUNS OVER A NARROWER UNIVERSE THAN THE CODE CLOSURE, FOR A REASON
// THE FIRST BUILD DID NOT HAVE. Run over the whole tree, R-B correctly DECLINES
// `material`: the same key appears in `buyerRequisitions.ts`, a module no
// declaration names. That refusal is right and the fix is not to declare the PR
// lane — a purchase requisition carries a material NAME and no material CODE, so
// it is a meaning source with nothing to be a meaning OF. A MEANING FIELD IS A
// FIELD THAT STATES MEANINGS **FOR CODES**, so the meaning closure runs over the
// sibling values of code-bearing objects only. `title` is still a sibling of
// `materialIds` and is still refused — by containment, on its own merits.
const CODE_BEARING_SIBLINGS = new Set(CELLS.filter((c) => CODE_FIELDS.includes(c.field)).map((c) => c.siblings));
const SIBLING_VALUES_BY_FIELD = new Map<string, Set<string>>();
for (const sib of CODE_BEARING_SIBLINGS) {
  for (const [k, v] of Object.entries(sib)) {
    if (CODE_FIELDS.includes(k)) continue;
    if (!SIBLING_VALUES_BY_FIELD.has(k)) SIBLING_VALUES_BY_FIELD.set(k, new Set());
    SIBLING_VALUES_BY_FIELD.get(k)!.add(v);
  }
}

//
// ⚠️ AND THE CONTAINMENT GATE IS **OFF** FOR MEANINGS — a third thing building
// this found, and it is not a convenience. Containment is sound for IDENTIFIERS
// and unsound for MEANINGS, because the two compose differently:
//
//   'PO-2025-00107 / PK-PETB-8801' contains a code and IS NOT ONE.
//   'Cetearyl Alcohol — Vegetable Origin' contains a label and IS ONE.
//
// MEANINGS COMPOSE BY REFINEMENT; IDENTIFIERS DO NOT. A more specific meaning
// properly containing a less specific one is `IDENTITY-GRAIN-ASYMMETRY-01` —
// a pinned, deliberate state of this tree, not a contamination — and running
// the identifier gate over meanings REJECTS `description`, the single most
// load-bearing meaning field in the tree.
//
// What keeps `RFQ.title` out is therefore NOT containment but ARITY, and that
// argument is already canon (2B-3: `RFQ.uom` is a header field whose arity is
// ONE while `materialIds`'s is N). It falls out of the shape: a bare `string[]`
// is not an object, so a code reached through one has NO SIBLINGS to read a
// meaning from. The RFQ lane stays mute after 2B-5a, and that is a fact about
// the shape rather than a gap in the scope.
const MEANING_DERIVATION = derive(
  Object.values(MATERIAL_MASTER).map((m) => m.label),
  SIBLING_VALUES_BY_FIELD,
  false,
);
const MEANING_FIELDS = MEANING_DERIVATION.fields;

/** The meaning an object states, read through the DERIVED meaning field set.
 *  First admitted key wins, in the object's own key order — the same rule the
 *  narrow `/description/i` version used, over a scope that is no longer typed
 *  by hand. */
const derivedMeaningOf = (siblings: Readonly<Record<string, string>>): string | null => {
  for (const k of Object.keys(siblings)) if (MEANING_FIELDS.includes(k)) return siblings[k];
  return null;
};

const CODE_CELLS = CELLS.filter((c) => CODE_FIELDS.includes(c.field));

/** ⚠️ THE NARROW population — `/description/i` only. Kept ALIVE beside the
 *  derived one, not replaced by it: the two disagree on exactly the rows 2B-5b
 *  must rule on, and a reader has to be able to see the difference rather than
 *  take the new number on trust. */
const REFS: MaterialRef[] = CODE_CELLS.map((c) => ({
  code: c.value,
  meaning: c.meaning,
  module: c.module,
}));

/** The DERIVED population — the meaning scope closed over the tree. */
const REFS_DERIVED: MaterialRef[] = CODE_CELLS.map((c) => ({
  code: c.value,
  meaning: derivedMeaningOf(c.siblings),
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

/** Group a population by one field, collecting the distinct values of the other. */
const distinctBy = (
  key: 'code' | 'meaning',
  value: 'code' | 'meaning',
  population: readonly MaterialRef[] = REFS,
) => {
  const out = new Map<string, Map<string, string[]>>();
  for (const r of population) {
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
/** The ASN + chase lane, DECLARED at 2B-1 (R-3) as `paragon.asn_chase_lane` and
 *  booked for retirement at 2B-5b. Read from the REGISTRY rather than from a
 *  regex in this file — `materialSpaces.ts` is the declaration site now. */
const ASN_CHASE_MODULES = MATERIAL_SPACES.find(
  (s) => s.spaceId === 'paragon.asn_chase_lane',
)!.modules;
const ASN_CHASE_CODES = inModules(ASN_CHASE_MODULES);
/** ⚠️ The part of it that is still third-space vocabulary — `MAT-SPACE-UNDECLARED-01`.
 *  SEVEN after 2B-5a, not nine: the two chase codes were never a vocabulary. */
const UNDECLARED_SPACE = ASN_CHASE_CODES.filter((c) => !(c in MATERIAL_MASTER));

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
  it('the master names FORTY-TWO — 5 seeded · 25 adopted 2B-2 · 5 authored 2B-3 · 7 authored 2B-5b-ii', () => {
    expect(Object.keys(MATERIAL_MASTER)).toHaveLength(42);
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
    // ⚠️ `MAT-10045` IS GONE — R-D corrected the pointer to `PK-PETB-8803`.
    // ⚠️ AND AT 2B-5b-ii THE TWO ASN-LANE POINTERS FOLLOWED THEIR TARGETS: the
    // codes they named were authored as master rows and retired off `MAT-*`, so
    // `c101` and `c201` now point at `RM-PSTN-7150` and `RM-EMUL-9440`. THE
    // POINTERS WERE NEVER WRONG — 2B-5a called them *"correct pointers into a
    // retiring space"*, and this is the space finishing its retirement.
    expect(sapCodes).toEqual([
      'MAT-10046',
      'MAT-10089',
      'PK-PETB-8803',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);

    // ⚠️ NONE OF THE FIVE IS INVISIBLE NOW. The raw scan and the module walk
    // agree, which is the property the 2B-3 pin recorded the absence of.
    expect(sapCodes.filter((c) => !CODES.includes(c))).toEqual([]);

    // ⚠️ THE OVERLAP THAT ADMITTED THIS FIELD IS GONE — and the field stays in.
    // 2B-4a admitted `sapCode` to the census because two of its values were IN
    // the third space; that space is empty at 2B-5b-ii, so the overlap no longer
    // exists. The field is not re-litigated: R-D declared what `sapCode` MEANS
    // (a pointer to a Paragon master code), and a declaration does not lapse
    // when the evidence that prompted it is repaired. **A SCOPE ADMITTED ON
    // EVIDENCE IS KEPT ON A DECLARATION, OR IT SILENTLY NARROWS AGAIN THE DAY
    // THE EVIDENCE IS FIXED** — which is how `MEANING-SCOPE-IS-A-HAND-PICK-01`
    // stayed invisible for three batches.
    expect(sapCodes.filter((c) => UNDECLARED_SPACE.includes(c))).toEqual([]);
    expect(UNDECLARED_SPACE).toEqual([]);

    // THE SPACE QUESTION 2B-4a LEFT OPEN, ANSWERED AT 2B-5a (R-D): the storefront
    // is NOT a space. `sapCode` is a POINTER — a supplier's claim about which
    // Paragon master code its catalogue item is. The three buckets are pinned in
    // full by `storefrontPointer.test.ts`; only the census consequence is here.
    expect(sapCodes.filter((c) => c in MATERIAL_MASTER)).toEqual([
      'PK-PETB-8803',
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);

    // ⚠️ WHAT THE RULING DID **NOT** SETTLE, kept open on purpose. The
    // population question is answered; the SPACE question is not. Nine of the
    // twelve sit in the two modules `MAT-SPACE-UNDECLARED-01` names; three sit
    // in the storefront. Whether that is ONE space of twelve or two spaces
    // sharing two codes is still a declaration nobody has made, and C9 §5 still
    // requires a `MaterialRef` to name its space. Counting a code is not
    // placing it.
    //
    // ⚠️ NINE → TWO AT 2B-5b-ii, and what is LEFT is the whole story. 2B-4a
    // measured twelve; 2B-5a corrected one pointer and two chase refs and the
    // count landed back on nine WITH DIFFERENT MEMBERS; 2B-5b-ii authored the
    // seven ASN codes and the third space emptied. The two survivors are
    // `MAT-10046` and `MAT-10089` — the UNBACKED STOREFRONT POINTERS, on which
    // no operator has ruled. **THEY ARE NOT A REMAINDER OF THE THIRD SPACE.**
    // R-D established that the storefront is a pointer surface, not a code
    // space: these are two supplier CLAIMS about Paragon codes that do not
    // exist, and repairing them means authoring master rows from catalogue
    // prose — an adoption, on evidence no batch has been given.
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toEqual(['MAT-10046', 'MAT-10089']);
    expect(absent).not.toContain('MAT-10234');
    expect(absent).not.toContain('MAT-20500');
    expect(absent.filter((c) => UNDECLARED_SPACE.includes(c))).toEqual([]);
    // …and every one of the seven is resolvable now, asserted by name so a
    // regression names the row rather than moving a count.
    for (const c of [
      'FR-ROUD-4470',
      'AI-NIAC-6612',
      'AI-HYALU-6615',
      'RM-PSTN-7150',
      'RM-EMUL-9440',
      'PK-PETB-8804',
      'PK-ALCP-2450',
    ]) {
      expect(c in MATERIAL_MASTER, `${c} authored at 2B-5b-ii`).toBe(true);
    }
  });

  it('MEANING-SCOPE-IS-A-HAND-PICK-01 — CLOSED at 2B-5a: the meaning set DERIVES', () => {
    // ⚠️ INVERTED, NOT DELETED. At 2B-4a this pinned the blind spot: the code
    // field set derived and `/description/i` did not, so three admitted codes
    // entered MUTE and could not contradict anything. The meaning set now closes
    // over the tree from the master's own LABELS, by the same three rules the
    // code closure uses — seed, containment, declared space.
    expect(MEANING_FIELDS).toContain('material');
    expect(MEANING_FIELDS).toContain('description');
    // ⚠️ AND THE REFUSALS ARE THE PROOF THE RULE IS NOT JUST "ADMIT MORE".
    // An RFQ `title` and a remittance `note` both CONTAIN a master label and are
    // both refused by the containment gate — a sentence that mentions a meaning
    // is not a meaning, exactly as a cell that mentions a code is not a code.
    expect(MEANING_FIELDS).not.toContain('title');
    expect(MEANING_FIELDS).not.toContain('remittanceNote');
  });

  it('⚠️ THE FOURTH LEVEL, RESOLVED AND DEFERRED — what the widening actually found', () => {
    // At 2B-4a this measured three live identity violations behind the narrow
    // meaning scope and applied none of them. 2B-5a applies the scope. Two of
    // the three survive as REAL, and they are 2B-5b's by R-E.
    //
    // ── A · ONE MEANING, TWO CODES — RESOLVED HERE (R-D) ────────────────────
    // `MAT-10045` and the master's `PK-PETB-8803` both said 'PET Bottle 100ml
    // Airless Pump'. The storefront pointer was WRONG, not a second code: it
    // named a code no Paragon space contains. Corrected to `PK-PETB-8803`, so
    // the meaning now rides ONE code and the direction is clean.
    expect(MATERIAL_MASTER['PK-PETB-8803'].label).toBe('PET Bottle 100ml Airless Pump');
    expect(CODES).not.toContain('MAT-10045');
    expect(
      offenders(distinctBy('meaning', 'code', REFS_DERIVED)),
      'ONE MEANING, ONE CODE holds over the DERIVED scope',
    ).toEqual([]);

    // ── B and C · ONE CODE, TWO MEANINGS — DEFERRED TO 2B-5b (R-E) ──────────
    // ⚠️ THIS IS AN EXACT SET, NOT A WHITELIST, AND THE DIFFERENCE IS THE POINT.
    // A whitelist says "ignore these" and grows; this says "there are EXACTLY
    // these two, and here is what each says" — a third offender is red, and one
    // of these two silently vanishing is ALSO red. `ADOPTION-QUEUE-01`'s shape
    // was a list that absorbed new members for three batches; this cannot.
    //
    // Why they are not adjudicated here: both are lane-vs-lane INSIDE the space
    // 2B-5b retires, and under R-1 DECLARED OWNERSHIP DECIDES. The storefront is
    // a POINTER space (R-D), not an identity space, so it has no ownership to
    // win with — and ruling for the ASN lane today would settle by implication
    // what 2B-5b is chartered to settle.
    const twoMeanings = [...distinctBy('code', 'meaning', REFS_DERIVED).entries()]
      .filter(([, inner]) => inner.size > 1)
      .map(([code, inner]) => ({ code, meanings: [...inner.keys()].sort() }))
      .sort((x, y) => x.code.localeCompare(y.code));
    // ⚠️ FOUR, NOT TWO — and the extra pair is a finding the derived scope
    // SUBSUMES rather than creates. `AI-NIAC-6601` and `RM-EMUL-3320` are the two
    // SDC-0 SEED entries of `IDENTITY-GRAIN-ASYMMETRY-01`, where the document lane
    // is MORE SPECIFIC than the master. Already filed, already the operator's, and
    // previously visible only through a bespoke master-vs-lane comparison. Once
    // `label` is an admitted meaning field it becomes an instance of the GENERAL
    // property — which is what a derived scope is for, and worth more than the
    // bespoke check it absorbs.
    // ⚠️ FOUR → TWO AT 2B-5b-ii. **VIOLATIONS B AND C DISSOLVED BY DECLARED
    // OWNERSHIP, WHICH IS WHAT R-1 SAID WOULD HAPPEN AND 5b-i COULD NOT DELIVER.**
    // 5b-i reported that they could NOT dissolve because there was nothing to
    // retire onto; authoring supplied it. The master now DECLARES one meaning
    // per code, and both lanes read it:
    //   · `RM-PSTN-7150` — the ASN said *'Specialty fat blend — RBD stearin'*
    //     and `c101` said *'RBD Palm Stearin — Specialty Fat'*. The master
    //     declares the latter and the ASN line took it.
    //   · `RM-EMUL-9440` — *'Sample Blend PF-20 emulsifier'* vs *'…Emulsifier'*.
    // ⚠️ AND C's TRAP IS RESOLVED THE RIGHT WAY ROUND. It was pinned as two
    // strings unequal as written and EQUAL under `toLowerCase`, precisely so
    // nobody could make it vanish by normalising the capital — which would have
    // decided by tidying that a shipped line and a catalogue offer are the same
    // purchasable item. **THEY WERE NOT MADE EQUAL. A THIRD RECORD DECLARED
    // WHICH ONE IS THE MEANING, AND THE OTHER TWO NOW QUOTE IT.** Normalisation
    // hides a disagreement; declaration ends one.
    expect(twoMeanings).toEqual([
      {
        code: 'AI-NIAC-6601',
        meanings: ['Niacinamide (Vitamin B3)', 'Niacinamide USP Grade 99.5% (Vitamin B3)'],
      },
      {
        code: 'RM-EMUL-3320',
        meanings: ['Cetearyl Alcohol', 'Cetearyl Alcohol — Vegetable Origin'],
      },
    ]);
    // PARTITIONED BY FINDING, so two dispositions cannot be read as one. What
    // survives is EXACTLY the `IDENTITY-GRAIN-ASYMMETRY-01` seed pair — SDC-0
    // data, the operator's, and untouched by every batch of this arc.
    for (const c of ['AI-NIAC-6601', 'RM-EMUL-3320']) {
      expect(c in MATERIAL_MASTER, c + ' is SDC-0 seed data, the operator\'s').toBe(true);
    }
    for (const c of ['RM-PSTN-7150', 'RM-EMUL-9440']) {
      expect(c in MATERIAL_MASTER, c + ' was authored, not adjudicated away').toBe(true);
    }

    // ⚠️ C'S TRAP, KEPT AS A SENTENCE BECAUSE IT IS THE TRANSFERABLE PART EVEN
    // NOW THAT THE INSTANCE IS GONE: the two `MAT-40220` strings differed by ONE
    // CAPITAL LETTER, and NORMALISING CASE WOULD HAVE MADE IT DISAPPEAR WITHOUT
    // ANYONE DECIDING WHETHER THE TWO LANES DESCRIBED THE SAME PURCHASABLE ITEM
    // — a shipped line carrying lot `LOT-B5540` and a catalogue offer with a
    // 45-day lead time. They probably did. "Probably" is an adoption, and the
    // easiest fix would have been the wrong one.
    //
    // ⚠️ THE DECISION WAS ACTUALLY MADE, at 2B-5b-ii, and the shape of the
    // resolution is what the trap was protecting: the master authored ONE row,
    // `RM-EMUL-9440`, on four sources including two documents, and BOTH lanes
    // now quote its label. **THE STRINGS ARE EQUAL BECAUSE SOMETHING DECLARED
    // WHICH ONE IS THE MEANING — NOT BECAUSE A COMPARISON WAS LOOSENED.** The
    // difference is invisible in the diff and total in the reasoning, which is
    // why it is asserted rather than described.
    expect(new Set(REFS_DERIVED.filter((r) => r.code === 'RM-EMUL-9440').map((r) => r.meaning)))
      .toEqual(new Set(['Sample Blend PF-20 Emulsifier']));
    expect(MATERIAL_MASTER['RM-EMUL-9440'].label).toBe('Sample Blend PF-20 Emulsifier');
  });

  it('the NARROW and DERIVED scopes disagree on EXACTLY the deferred rows', () => {
    // The reason both populations are kept alive rather than one replacing the
    // other: a reader must be able to see what the widening changed, and the
    // answer must be a short, checkable list rather than a new number to trust.
    const narrow = new Set(
      [...distinctBy('code', 'meaning')].filter(([, i]) => i.size > 1).map(([c]) => c),
    );
    const derived = new Set(
      [...distinctBy('code', 'meaning', REFS_DERIVED)].filter(([, i]) => i.size > 1).map(([c]) => c),
    );
    expect([...narrow]).toEqual([]);
    // ⚠️ TWO AT 2B-5b-ii, and the pair that leaves is the pair AUTHORING could
    // reach. What the widening still finds that the narrow scope cannot is
    // exactly `IDENTITY-GRAIN-ASYMMETRY-01`'s seed pair — which no batch of
    // this arc was chartered to touch.
    expect([...derived].sort()).toEqual(['AI-NIAC-6601', 'RM-EMUL-3320']);
  });

  it('the THIRD SPACE IS EMPTY — MAT-SPACE-UNDECLARED-01 CLOSES at 2B-5b-ii', () => {
    // ⚠️ `MAT-SPACE-UNDECLARED-01`. Nine codes, in two modules, owned by us, and
    // named by NOTHING: not `C8-MASTER-DECL`, not `MOCK-RETIREMENT-01`'s blast
    // radius (scoped to `src/data/mock*.ts`), not C9 §5's per-party space count
    // (which says Paragon holds TWO), and — until this file — not the pin.
    // Membership is by MODULE, never by prefix: the codes happen to share one,
    // and `materialCode` is contractually opaque, so the shape is not the test.
    // ⚠️ SEVEN AT 2B-5a, NOT NINE — AND NOTHING WAS RETIRED. `MAT-10234` and
    // `MAT-20500` left because they were never this space's vocabulary: both
    // were SUBJECT REFERENCES that contradicted the agreement they named on
    // supplier, item sequence AND material code. Corrected at 2B-5a, and the
    // chase lane now names the material its own subject carries.
    // THE SEVEN THAT REMAINED WERE THE REAL POPULATION, every one an ASN LINE —
    // which is why they, and only they, carried the BPOM blast radius.
    //
    // ⚠️ **EMPTY AT 2B-5b-ii, AND THE ASSERTION IS INVERTED RATHER THAN
    // DELETED.** The seven were authored as canonical master rows and the ASN
    // lines took those codes; `MAT-*` names nothing in the tree. This pin now
    // says the space is gone, so RE-INTRODUCING one turns it red — a deleted
    // assertion would have let the vocabulary come back silently, which is the
    // whole reason this arc inverts instead of deleting.
    expect(UNDECLARED_SPACE).toEqual([]);
    // No `MAT-*` code survives ANYWHERE in the census, stated separately: the
    // space could be empty by the module rule while the prefix lived on
    // somewhere the rule does not look.
    expect(CODES.filter((c) => c.startsWith('MAT-'))).toEqual(['MAT-10046', 'MAT-10089']);
    // …and those two are storefront POINTERS, not a code space (R-D). They are
    // supplier claims about Paragon codes that do not exist, and no operator has
    // ruled on them. **THE PREFIX SURVIVING IS NOT THE SPACE SURVIVING**, and
    // the two facts are asserted apart so neither can stand in for the other.
    expect(ASN_CHASE_CODES.filter((c) => c.startsWith('MAT-'))).toEqual([]);
    expect(ASN_CHASE_CODES).toContain('AI-NIAC-6601');
    expect(ASN_CHASE_CODES).toContain('PK-PETB-8810');
    // It is disjoint from the declared lane — which is precisely why every rule
    // written about the declared lane leaves it untouched.
    expect(UNDECLARED_SPACE.filter((c) => DOCUMENT_LANE.includes(c))).toEqual([]);
  });

  it("the TREE's master-absent population: 39 → 14 → 9 → 12 → 9 → 2, and BOTH directions are the finding", () => {
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
    //
    // ⚠️ AND NOW IT FALLS, TO **TWO** — the first honest DOWN in the series,
    // because for the first time the scope did not move while the number did.
    // Every earlier fall was adoption or authoring inside an already-declared
    // lane; the rise at 2B-4a was the scope catching up. This fall is seven
    // codes leaving the population by being authored, measured over the SAME
    // derived scope that produced the rise. **A NUMBER IS ONLY COMPARABLE TO
    // ITS PREDECESSOR WHEN THE SCOPE BEHIND IT DID NOT MOVE**, which is why the
    // series is written out rather than reported as a delta.
    expect(CODES.length).toBe(44);
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toEqual(['MAT-10046', 'MAT-10089']);
    // ⚠️ THE TWO SETS ARE NO LONGER RELATED AT ALL. "master-absent" and "third
    // space" were the same set for exactly one batch, then nine-vs-seven, and
    // now the third space is EMPTY while two codes remain master-absent. The
    // survivors are storefront pointers, and a pointer is not a space.
    expect(UNDECLARED_SPACE).toEqual([]);
    expect(absent.filter((c) => UNDECLARED_SPACE.includes(c))).toEqual([]);
    // The population itself did NOT shrink — 44 codes before and after. Nothing
    // was deleted to reach two; seven became resolvable.
    expect(CODES.length).toBe(44);
    // What held across every widening and every fall: none of them is in the
    // document lane.
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

  it('⚠️ THE 2B-4 GATE OPENS — the GR runtime input is now 100% master-resolvable', () => {
    // The distinction the capability headline hides, and the reason
    // `bpomApplicable` is authored-not-wired at 2B-4a. The GR FIXTURE lane
    // resolves completely (above). The GR RUNTIME INPUT does not: the wizard is
    // fed `asnStore`, seeded from `MOCK_ASNS` in the UNDECLARED space, and not
    // one of those codes is in the master. A fail-closed rule keyed on master
    // membership would refuse essentially every received line today.
    //
    // ⚠️ INVERTED AT 2B-5b-ii. THE GATE WAS THE ONE PRECONDITION 2B-4b HAD, AND
    // IT IS DISCHARGED: every code `asnStore` can hand the wizard is in the
    // master, so a fail-closed rule keyed on master membership would refuse
    // NOTHING that is legitimately received. The seven that would have been
    // refused were authored, not exempted.
    const grRuntimeCodes = [
      ...new Set(MOCK_ASNS.flatMap((a) => a.lineItems.map((l) => l.materialCode))),
    ].sort();
    expect(grRuntimeCodes).toHaveLength(7);
    expect(grRuntimeCodes.filter((c) => !(c in MATERIAL_MASTER))).toEqual([]);
    expect(UNDECLARED_SPACE).toEqual([]);
    //
    // ⚠️ AND WHAT REMAINS OPEN IS A DIFFERENT DEFECT WEARING THE SAME NUMBER.
    // `BPOM-OFF-BY-SPACE-01` does NOT close here. Its blast radius was SEVEN —
    // corrected at 2B-5a from nine and twelve, because the census POPULATION
    // and the REGULATORY EXPOSURE are different quantities. Those same seven
    // lines still receive the wrong answer; they simply no longer receive it
    // for the reason the finding is NAMED after. The space is gone; the
    // fail-open is not. **A FINDING NAMED AFTER ITS CAUSE OUTLIVES ITS CAUSE**,
    // and the two ASN lines below are the proof — measured, not narrated.
    const master = (c: string) => MATERIAL_MASTER[c];
    expect(master('RM-EMUL-9440').bpomApplicable).toBe('APPLICABLE');
    expect(master('RM-PSTN-7150').bpomApplicable).toBe('UNDETERMINED');
    // `inferBpom`'s prefix rule, restated: neither fires.
    expect(['RM-EMUL-9440', 'RM-PSTN-7150'].filter(
      (c) => c.startsWith('AI-') || c.startsWith('FR-'),
    )).toEqual([]);
    // So the master now DISAGREES WITH THE WIZARD IN WRITING on one row and
    // records an explicit ABSENCE OF DETERMINATION on another, and the wizard
    // reads neither field. That is what 2B-4b wires.
    //
    // ⚠️ AND 2B-4b WIRED IT. `BPOM-OFF-BY-SPACE-01` IS CLOSED — at seven, as a
    // CONTRADICTION rather than a silence. The wizard now reads
    // `bpomApplicable` through one refusal-shaped lookup: `RM-EMUL-9440`
    // requires the check (the master won, which is the whole point) and
    // `RM-PSTN-7150` REFUSES the line rather than passing it silently. The
    // sentence above is kept verbatim because it is the state 2B-4b inherited,
    // and a finding's history is not improved by editing out the part that made
    // the fix necessary.
    expect(CODES.filter((c) => !(c in MATERIAL_MASTER))).toEqual(['MAT-10046', 'MAT-10089']);
  });
});

describe('BPOM-OFF-BY-SPACE-01 — CLOSED at 2B-4b, and the record of the fail-open is kept', () => {
  // ⚠️ THE PREDICATE THIS BLOCK MEASURES NO LONGER EXISTS IN THE PRODUCT.
  // `inferBpom` was deleted at 2B-4b; `wouldRequireBpom` is now a HISTORICAL
  // RESTATEMENT, and every measurement below is what the retired rule WOULD have
  // said. That is deliberate and it is the more useful half of the record: the
  // before-and-after of a regulatory swap is worthless if the "before" is
  // deleted along with the code.
  //
  // It was always a COPY and never an import — originally so that a regulatory
  // pin was not coupled to a component's export surface. That choice is what
  // makes these measurements survive the retirement at all; an imported
  // predicate would have taken the whole record with it when the function went.
  const wouldRequireBpom = (code: string) => code.startsWith('AI-') || code.startsWith('FR-');

  it('pins the exact set of codes that trigger a BPOM lot check', () => {
    const firing = CODES.filter(wouldRequireBpom);
    // `AI-CENT-6900` is NEW to this pin — not because anything changed, but
    // because it lives in the RFQ lane the old scope could not see.
    // ⚠️ SIXTEEN → NINETEEN AT 2B-5b-ii, and this is the ONE batch of the whole
    // arc where the firing set MOVES. Three of the seven authored rows took
    // `AI-`/`FR-` codes, so the prefix rule now fires on them. **THE MOVEMENT IS
    // A CONSEQUENCE OF THE NAMING, NOT OF A REGULATORY DECISION** — nobody ruled
    // that these three lots need a BPOM check; they were given codes whose first
    // three characters the wizard happens to parse. That is the cleanest
    // available statement of what is wrong with `inferBpom`: the same authoring
    // act moved a compliance outcome by choosing a mnemonic.
    expect(firing).toEqual([
      'AI-CENT-6900',
      'AI-HYALU-6610',
      'AI-HYALU-6615', // ← 2B-5b-ii (was MAT-55031, not firing)
      'AI-NIAC-6601',
      'AI-NIAC-6605',
      'AI-NIAC-6612', // ← 2B-5b-ii (was MAT-55022, not firing)
      'AI-PANTO-6640',
      'AI-PEPTIDE-8801',
      'AI-RETA-6750',
      'AI-SALI-6800',
      'AI-VITC-6720',
      'AI-VITC-6730',
      'FR-EMIN-4420',
      'FR-MKOV-5510',
      'FR-MKOV-5520',
      'FR-ROUD-4470', // ← 2B-5b-ii (was MAT-88201, not firing)
      'FR-WARD-4410',
      'FR-WARD-4430',
      'FR-WARD-4440',
    ]);
  });

  it('⚠️ the firing set moved by THREE, and every one of the seven is accounted for', () => {
    // The dispatch required the movement reported LINE BY LINE and stopped if it
    // moved in a direction that could not be explained. Asserted here rather
    // than described in a PR body, one row per authored code, with the master's
    // own determination beside the prefix rule's guess.
    const rows = [
      // was          → now              prefix fires   master says
      ['MAT-88201', 'FR-ROUD-4470', true, 'APPLICABLE'],
      ['MAT-55022', 'AI-NIAC-6612', true, 'APPLICABLE'],
      ['MAT-55031', 'AI-HYALU-6615', true, 'APPLICABLE'],
      ['MAT-88207', 'PK-PETB-8804', false, 'NOT_APPLICABLE'],
      ['MAT-77014', 'PK-ALCP-2450', false, 'NOT_APPLICABLE'],
      ['MAT-30110', 'RM-PSTN-7150', false, 'UNDETERMINED'],
      ['MAT-40220', 'RM-EMUL-9440', false, 'APPLICABLE'],
    ] as const;
    for (const [was, now, fires, says] of rows) {
      expect(CODES, `${was} is retired`).not.toContain(was);
      expect(wouldRequireBpom(was), `${was} never fired`).toBe(false);
      expect(wouldRequireBpom(now), `${now} prefix`).toBe(fires);
      expect(MATERIAL_MASTER[now].bpomApplicable, `${now} master`).toBe(says);
    }
    expect(rows.filter(([, , fires]) => fires)).toHaveLength(3);
    expect(CODES.filter(wouldRequireBpom)).toHaveLength(19);

    // ⚠️ THE FOUR ROWS WHERE THE TWO MECHANISMS NOW DISAGREE IN WRITING, which
    // is the state 2B-4b inherits and strictly better than the state before:
    //   · `PK-PETB-8804` / `PK-ALCP-2450` — prefix false, master NOT_APPLICABLE.
    //     AGREE. Packaging genuinely needs no lot check.
    //   · `RM-PSTN-7150` — prefix says false, master says UNDETERMINED. The
    //     prefix ASSERTS A NEGATIVE where the master records that NOBODY RULED.
    //   · `RM-EMUL-9440` — prefix says false, master says APPLICABLE, **on
    //     `doc-201`, a BPOM Notification linked to this line's own parent PO.**
    //     The wizard reads the prefix and not the field.
    const disagree = rows.filter(
      ([, now, fires]) =>
        (MATERIAL_MASTER[now].bpomApplicable === 'APPLICABLE') !== fires ||
        MATERIAL_MASTER[now].bpomApplicable === 'UNDETERMINED',
    );
    expect(disagree.map(([, now]) => now)).toEqual(['RM-PSTN-7150', 'RM-EMUL-9440']);
  });

  it('⚠️ INVERTED AT 2B-4b — the two silent lines are no longer silent', () => {
    // ⚠️ INVERTED TWICE, NEVER DELETED, and the two inversions are the arc.
    //
    //   · At 2B-5b-ii this said: the ESCAPE BY SPACE is over and the fail-open
    //     is not. `MOCK_ASNS` seeds `asnStore`, which feeds
    //     `GRInspectionWizard.buildDraftFromAsn`, which set the BPOM flag from
    //     `inferBpom(li.materialCode)` — and four of the seven received lines
    //     got a silent `false`, two of them wrongly.
    //   · At 2B-4b the fail-open is over as well. The wizard reads the master.
    //
    // The historical measurement is kept FIRST and unchanged, because the fix is
    // only legible next to what it replaced.
    expect(UNDECLARED_SPACE).toEqual([]);
    const runtime = [...new Set(MOCK_ASNS.flatMap((a) => a.lineItems.map((l) => l.materialCode)))];
    const silent = runtime.filter((c) => !wouldRequireBpom(c)).sort();
    expect(silent).toEqual(['PK-ALCP-2450', 'PK-PETB-8804', 'RM-EMUL-9440', 'RM-PSTN-7150']);
    // Of those four, two were correct (packaging) and two were not.
    expect(silent.filter((c) => MATERIAL_MASTER[c].bpomApplicable === 'NOT_APPLICABLE')).toEqual([
      'PK-ALCP-2450',
      'PK-PETB-8804',
    ]);
    expect(silent.filter((c) => MATERIAL_MASTER[c].bpomApplicable !== 'NOT_APPLICABLE')).toEqual([
      'RM-EMUL-9440',
      'RM-PSTN-7150',
    ]);

    // ── AND NOW THE LIVE ANSWER, from the mechanism the wizard actually runs ──
    // Not "the master disagrees" — the master DECIDES. Every one of the four
    // that used to take a silent `false` now takes an explicit outcome, and the
    // two wrong ones are the two that changed.
    expect(bpomOf('PK-ALCP-2450')).toEqual({ ok: true, applicable: false }); // unchanged, correctly
    expect(bpomOf('PK-PETB-8804')).toEqual({ ok: true, applicable: false }); // unchanged, correctly
    expect(bpomOf('RM-EMUL-9440')).toEqual({ ok: true, applicable: true }); // silent no → CHECK REQUIRED
    expect(bpomOf('RM-PSTN-7150')).toEqual({
      ok: false,
      reason: 'UNDETERMINED_APPLICABILITY',
      materialCode: 'RM-PSTN-7150',
    }); // silent no → the LINE REFUSES

    // THE PROPERTY, not the four examples: over the runtime input there is no
    // longer any code on which the wizard returns a negative it has no basis
    // for. Every answer is either a determination or a refusal.
    expect(
      runtime.filter((c) => {
        const o = bpomOf(c);
        return o.ok && !o.applicable && MATERIAL_MASTER[c].bpomApplicable !== 'NOT_APPLICABLE';
      }),
    ).toEqual([]);
  });

  it('two fragrance concentrates, opposite regulatory treatment', () => {
    // The pair that makes the defect impossible to argue with. Same class of
    // material; the ONLY thing that differs is which fixture space the code was
    // authored in.
    // ⚠️ RENAMED AT 2B-4b, because the old name `rendered` claimed something
    // that is no longer true: the wizard does not render this. It renders
    // `bpomOf`. This models WHAT THE RETIRED RULE WOULD HAVE PRODUCED, which is
    // exactly what a before-and-after needs and nothing more.
    const prefixWouldHaveRendered = (code: string) => ({
      code,
      meaning: meaningsOf(code)[0] ?? null,
      bpomRequired: wouldRequireBpom(code),
    });
    // ⚠️ THE PAIR NOW AGREES — AND THE REASON IS WORSE THAN THE DISAGREEMENT.
    // `MAT-88201` was authored as `FR-ROUD-4470` at 2B-5b-ii, so the two
    // fragrance concentrates finally receive the same regulatory treatment.
    // **NOBODY DECIDED THAT.** No compliance rule was consulted, no
    // determination was made about rose-oud concentrate; a mnemonic beginning
    // `FR-` was chosen because its group is MG-05, and the wizard parses the
    // first three characters. The 2B-0 pair proved a prefix rule fails open on
    // whole vocabularies; the same pair now proves the other half:
    // **A PREFIX RULE DOES NOT ONLY FAIL OPEN. IT ALSO SUCCEEDS BY ACCIDENT,
    // AND THE TWO ARE INDISTINGUISHABLE FROM THE OUTPUT.**
    expect(prefixWouldHaveRendered('FR-ROUD-4470')).toEqual({
      code: 'FR-ROUD-4470',
      meaning: 'Fragrance Concentrate — Rose Oud',
      bpomRequired: true, // ← right answer, no reasoning behind it
    });
    expect(prefixWouldHaveRendered('FR-WARD-4440')).toEqual({
      code: 'FR-WARD-4440',
      meaning: 'Wardah EDP Parfum Concentrate — Rose & Oud',
      bpomRequired: true,
    });
    // The master, which DID have a rule, agrees on both — so this row is
    // correct twice over and the wizard still cannot tell you why.
    expect(MATERIAL_MASTER['FR-ROUD-4470'].bpomApplicable).toBe('APPLICABLE');
    expect(MATERIAL_MASTER['FR-WARD-4440'].bpomApplicable).toBe('APPLICABLE');
    // THE ORIGINAL SENTENCE STANDS AND IS STILL THE TRANSFERABLE PART: A PREFIX
    // RULE DOES NOT FAIL OPEN ON UNKNOWN PREFIXES ONLY. IT FAILS OPEN ON ENTIRE
    // VOCABULARIES. `RM-PSTN-7150` and `RM-EMUL-9440` were what was left of it.
    expect(prefixWouldHaveRendered('RM-EMUL-9440').bpomRequired).toBe(false);
    expect(MATERIAL_MASTER['RM-EMUL-9440'].bpomApplicable).toBe('APPLICABLE');
    // ⚠️ AND THE ACCIDENT IS OVER TOO — not because the mnemonics changed, but
    // because nothing reads them. Both fragrance concentrates now require the
    // check FOR A REASON: a determination recorded against each row. Same
    // outcome as the accident produced, arrived at by a mechanism that can say
    // why, which is the entire difference the swap buys.
    expect(bpomOf('FR-ROUD-4470')).toEqual({ ok: true, applicable: true });
    expect(bpomOf('FR-WARD-4440')).toEqual({ ok: true, applicable: true });
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
    //
    // ⚠️ AND THE STANDING ASSERTION FINALLY BREAKS AT 2B-5b-ii — DELIBERATELY,
    // ON A BATCH THAT SAID IT WOULD. Four batches moved the firing set by zero
    // because adoption and authoring write the MASTER while the predicate reads
    // a PREFIX. 2B-5b-ii is the first to hand codes NEW PREFIXES, and the set
    // moved 16 → 19. **THAT IS NOT A COUNTEREXAMPLE TO THE RULE; IT IS THE RULE
    // AT ITS SHARPEST.** The mechanism that a regulatory outcome should depend
    // on did not change. The mnemonic did.
    const firing = CODES.filter(wouldRequireBpom);
    expect(firing).toHaveLength(19);
    expect(['MAT-10046', 'MAT-10089'].filter(wouldRequireBpom)).toEqual([]);
    const absent = CODES.filter((c) => !(c in MATERIAL_MASTER));
    expect(absent).toEqual(['MAT-10046', 'MAT-10089']);
    expect(absent.filter(wouldRequireBpom)).toEqual([]);
  });

  it('2B-2 and 2B-3 added 30 codes and moved the firing set by ZERO', () => {
    // Worth asserting explicitly rather than inferring from the pin above. The
    // predicate reads a PREFIX; adoption and authoring write the MASTER. They
    // are disjoint mechanisms, so two batches that made 30 codes
    // master-resolvable changed nothing regulatory — which is exactly why
    // `bpomApplicable` remains the 2B-4 gate's business and not theirs.
    const firing = CODES.filter(wouldRequireBpom);
    expect(firing.filter((c) => c in MATERIAL_MASTER)).toHaveLength(19);
    // ⚠️ EVERY FIRING CODE IS NOW MASTER-RESOLVABLE — `AI-CENT-6900` was the
    // last one outside, and 2B-3 authored it. That property survives 2B-5b-ii's
    // three new members, which arrived master-resolvable by construction.
    expect(firing.filter((c) => !(c in MATERIAL_MASTER))).toEqual([]);
    // ⚠️ AND THE CONTRAST IS THE POINT OF KEEPING THIS TEST. 2B-2 and 2B-3 made
    // THIRTY codes master-resolvable and moved the firing set by ZERO. 2B-5b-ii
    // made SEVEN resolvable and moved it by THREE. The difference is not how
    // many codes, or how much evidence, or which lane — **it is whether the
    // authored code's first three characters happened to be `AI-` or `FR-`.**
    // Two batches of careful adoption changed nothing regulatory; one naming
    // decision changed three lots' treatment.
    expect(UNDECLARED_SPACE).toEqual([]);
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
