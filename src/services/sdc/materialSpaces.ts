// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5a — THE MATERIAL CODE-SPACE REGISTRY. One place a space is declared.
//
// ── WHY THIS FILE EXISTS (R-B, and the same shape as `materialGroups.ts`) ────
//   R-B ratified a stopping rule for the census's field-set closure:
//
//     A CLOSURE MAY WIDEN A SPACE IT IS ALREADY IN. IT MAY NOT ENTER A NEW ONE.
//     Entering a new space is a DECLARATION, and R-3 put declarations with the
//     operator.
//
//   That rule needs somewhere to read "which spaces are declared" FROM. Before
//   this file there was nowhere: spaces lived as three hand-written regexes
//   inside `materialIdentity.test.ts`, which is exactly the shape
//   `MG-COLLISION-21-01` found for material groups — A VOCABULARY WITH NO
//   DECLARATION SITE CANNOT DISAGREE WITH ITSELF OUT LOUD. The regexes are now
//   here, with the ruling that authorised each one attached to it.
//
// ── ⚠️ WHAT IMPLEMENTING R-B FALSIFIED, REPORTED RATHER THAN SMOOTHED ───────
//   R-B was ratified with the caveat that it was argued from ONE contaminant —
//   "a hypothesis with a good story, not a settled rule". Building it found two
//   things the story got wrong, and both matter:
//
//   (1) **R-B DOES NOT CATCH `linkedTo`.** The PO numbers that field leaks live
//       in `mockPurchaseOrders.ts`, which IS a declared space (the document
//       lane). A space-based boundary waves them straight through. What actually
//       stops them is the CONTAINMENT DISQUALIFIER — a property of CELLS, not of
//       spaces. So R-B is a SECOND, INDEPENDENT gate, not the one that did the
//       work `FIELD-SET-CLOSURE-OVERRUNS-01` credited it with.
//
//   (2) **R-B, APPLIED STRICTLY, WOULD HAVE BLOCKED THE OPERATOR'S OWN 2B-4a
//       RULING.** Admitting `sapCode` NECESSARILY enters `supplierStorefront.ts`
//       — a module no declaration named — so the letter of R-B forbids it while
//       the 2B-4a ruling requires it. The contradiction is real and the
//       resolution is the point of this file: **the closure may not enter a new
//       space ON ITS OWN AUTHORITY; the operator may declare one, and the
//       declaration is DATA the closure reads.** 2B-4a widened silently. It
//       should have HALTED AND REPORTED, and the ruling should have arrived as a
//       row below. The mechanism did not ask, and the ruling happened to
//       sanction it afterwards — which is luck, not governance.
// ─────────────────────────────────────────────────────────────────────────────

/** What a space HOLDS. Not every declared space holds identity. */
export type MaterialSpaceKind =
  /** Codes that ARE material identity, owned by the declaring party. */
  | 'identity'
  /** Values that POINT AT identity in another space — claims, not identity.
   *  Counted by the census (2B-4a ruling) and never joinable (C9 §4). */
  | 'pointer';

export interface MaterialSpaceEntry {
  readonly spaceId: string;
  readonly kind: MaterialSpaceKind;
  /** Modules whose material-bearing cells belong to this space. Membership is by
   *  OWNERSHIP (which file declares the code), NEVER by code shape — `materialCode`
   *  is contractually opaque (C9 §3). */
  readonly modules: RegExp;
  /** The ruling that authorised the declaration. A space with no ruling is a
   *  space somebody assumed. */
  readonly declaredBy: string;
  readonly note?: string;
}

/**
 * THE REGISTRY. Every module the material census may read a code from.
 *
 * ⚠️ **THE CAVEAT R-B SHIPPED WITH IS STILL TRUE AND IS NOT DISCHARGED HERE.**
 * These are still hand-written module patterns. What changed is that they are
 * now a DECLARATION SITE with an author and a ruling id, rather than three
 * regexes inside a test file — so a fourth one cannot be added without saying
 * who said so. **The boundary is one rung less derived than it looks**, exactly
 * as `SCOPE-DERIVATION-IS-RECURSIVE-01` predicts, and naming that here is
 * cheaper than discovering it in 2B-6.
 */
export const MATERIAL_SPACES: readonly MaterialSpaceEntry[] = Object.freeze([
  Object.freeze({
    spaceId: 'paragon.material_master',
    kind: 'identity' as const,
    modules: /^\/src\/services\/(sdc\/fixtures|delivery\/)/,
    declaredBy: 'C8-MASTER-DECL',
    note:
      'The master itself plus the delivery fixtures, which derive every unit ' +
      'from it via `requireUom` and therefore cannot name a code it does not hold.',
  }),
  Object.freeze({
    spaceId: 'paragon.document_lane',
    kind: 'identity' as const,
    modules: /^\/src\/data\/mock[^/]*\.ts$/,
    declaredBy: 'C8-MASTER-DECL',
    note: '100% master-resolvable since 2B-3. Booked for retirement by MOCK-RETIREMENT-01.',
  }),
  Object.freeze({
    spaceId: 'paragon.asn_chase_lane',
    kind: 'identity' as const,
    modules:
      /^\/src\/services\/(data\/mock\/fixtures\/supplierShipments|channel\/outboundFixtures)\.ts$/,
    declaredBy: 'R-3 (2B-1)',
    note:
      'DECLARED, BOOKED FOR RETIREMENT — 2B-5b. ⚠️ DEAD BY THE CODE, NOT ONLY BY ' +
      'POLICY: the one ASN creation path (`MockCommandService.ts:147-152`) builds ' +
      'line items from the parent PO, and every PO line is master-resolvable since ' +
      '2B-3, so NO DISPATCHED ASN CAN CARRY A CODE FROM THIS SPACE. The seven ASN ' +
      'line codes are a frozen legacy seed. The chase half was corrected at 2B-5a ' +
      'and contributes nothing — its two codes were never a vocabulary, they were ' +
      'wrong answers to a question the agreement had already answered.',
  }),
  Object.freeze({
    spaceId: 'paragon.supplier_catalogue_pointer',
    kind: 'pointer' as const,
    modules: /^\/src\/services\/data\/mock\/fixtures\/supplierStorefront\.ts$/,
    declaredBy: 'R-D (2B-5a)',
    note:
      '⚠️ NOT AN IDENTITY SPACE. `CatalogItem.sapCode` is the SUPPLIER\'S ASSERTION ' +
      'of which Paragon master code their catalogue item corresponds to — a claim ' +
      'about someone else\'s space, entered by the party that does not own it. The ' +
      'census COUNTS these values (2B-4a ruling) and nothing may JOIN on them ' +
      '(C9 §4): they carry no method, no source of truth and no route to ' +
      'resolution. THIS DECLARATION IS WHAT 2B-4a\'s CLOSURE SHOULD HAVE HALTED ' +
      'AND ASKED FOR, and did not.',
  }),
]);

/** The space a module belongs to, or `null` — an UNDECLARED module, which the
 *  census must refuse to enter on its own authority (R-B). Never a fallback. */
export const spaceOfModule = (module: string): MaterialSpaceEntry | null =>
  MATERIAL_SPACES.find((s) => s.modules.test(module)) ?? null;

/** Every declared space id, sorted. */
export const declaredSpaces = (): readonly string[] =>
  MATERIAL_SPACES.map((s) => s.spaceId).sort();
