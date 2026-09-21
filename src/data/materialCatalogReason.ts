// ─────────────────────────────────────────────────────────────────────────────
// WHY A CATALOG ENTRY CARRIES NO MASTER CODE — the union, in the one layer both
// sides can reach.
//
// ── ⚠️ THIS FILE EXISTS FOR A LAYERING REASON AND NOTHING ELSE ──────────────
//   The union was declared in `pages-v2/sourcing/materialCatalog.ts`, which is
//   the right home for the catalog's SHAPE and the wrong one for a type the
//   `MaterialRequest` DTO has to name: **nothing under `src/services/` imports
//   from `src/pages-v2/`** (derived before the move — every apparent hit was a
//   `// Relocated from src/pages-v2/…` comment, not an import), and
//   `MaterialRequest.catalogReason` is a service-layer field.
//
//   ⚠️ **THE TYPE MOVED; THE DATA AND EVERY CONST DID NOT.** `MATERIAL_CATALOG`
//   stays in `BuyerSourcing.tsx` and `CatalogEntry` / `codesOfKeys` /
//   `entryKey` stay in `materialCatalog.ts`, which RE-EXPORTS this union so no
//   existing importer changes. Moving a module-scope CONST would have retired
//   its `path::NAME` key in `moduleScopeLiteralGate` and fired a dead-key
//   failure; a type carries no such key, which is why only the type moved.
//
//   The alternative — restating the five members in `types.ts` — was refused on
//   sight: a second copy of a closed union is the copy that drifts, and this
//   lane exists partly to avoid minting a parallel vocabulary.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WHY an entry carries no master code. Recorded per entry rather than as one
 * flag, because the four reasons have different futures: a `NO_MASTER_TARGET`
 * is waiting on master data, an `AMBIGUOUS_IN_MASTER` is waiting on a human to
 * choose, and `NOT_A_MATERIAL` will never acquire a code at all.
 *
 * ⚠️ **AND THAT DIFFERENCE IS EXACTLY THE TRIAGE A MATERIAL-REQUEST REVIEWER
 * NEEDS**, which is why `MaterialRequest.catalogReason` reuses this union
 * instead of mirroring it.
 */
export type CodeLessReason =
  /** Two or more master rows fit the label and nothing in the label separates
   *  them. Naming one would under-describe it; splitting the entry would change
   *  a rendered label. */
  | 'AMBIGUOUS_IN_MASTER'
  /** A single master row was proposed by a loose rule and no human has
   *  confirmed it. An unconfirmed match is not a match. */
  | 'UNCONFIRMED_LOOSE_MATCH'
  /** The only candidate row means something NARROWER than the entry — mapping
   *  to it would silently shrink what the buyer asked for. */
  | 'NARROWS_THE_MEANING'
  /** No master row fits at all. The common case, and the honest one. */
  | 'NO_MASTER_TARGET'
  /** Not a material. The buyer is describing something in free text. */
  | 'NOT_A_MATERIAL';

/**
 * The union's members, as data.
 *
 * ⚠️ **DERIVED-FROM, NOT DUPLICATED-OF: the union above is the authority and
 * this array is pinned EQUAL to it by `materialCatalog.test.ts`.** A verb that
 * must prove a payload's `catalogReason` is a permitted member needs a runtime
 * list, and `requiredFields` proves presence only — the
 * `APPLICATION_REQUEST_TYPE_KNOWN` lesson, one lane over: an off-list token
 * would otherwise reach `create` and be stored as a reason nothing recognises.
 */
export const CODE_LESS_REASONS = Object.freeze([
  'AMBIGUOUS_IN_MASTER',
  'UNCONFIRMED_LOOSE_MATCH',
  'NARROWS_THE_MEANING',
  'NO_MASTER_TARGET',
  'NOT_A_MATERIAL',
] as const);

/** True when `v` is one of the five permitted code-less reasons. */
export const isCodeLessReason = (v: unknown): v is CodeLessReason =>
  typeof v === 'string' && (CODE_LESS_REASONS as readonly string[]).includes(v);
