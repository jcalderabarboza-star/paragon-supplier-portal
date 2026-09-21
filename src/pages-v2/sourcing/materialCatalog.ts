// ─────────────────────────────────────────────────────────────────────────────
// THE RFQ MATERIAL CATALOG'S SHAPE — a picked material either NAMES A MASTER
// CODE or DECLARES THAT IT HAS NONE. There is no third state and no `null`.
//
// ── ⚠️ WHY THIS TYPE EXISTS, WHICH IS A DEFECT AND NOT A REFACTOR ───────────
//   `MATERIAL_CATALOG` was `Record<RFQCategory, string[]>` — 23 display strings
//   — and `buildRfqCreatePayload` shipped those strings STRAIGHT INTO
//   `materialIds`, a field every consumer joins on as a master code. Measured
//   before the fix: the catalog's intersection with `MATERIAL_MASTER`'s KEY
//   space was EMPTY, so **every RFQ a buyer raised was unjoinable**, and three
//   readers said so in three different ways — the PSL gate returned
//   `UNDECIDABLE`, the should-cost spread returned `silent: 'unmapped'`, and the
//   master lookup returned `undefined`.
//
//   ⚠️ **AND THE TREE ALREADY FORBADE EXACTLY THIS, ONE FILE AWAY.**
//   `requisitionPrefill.ts` refuses to carry a requisition's display string into
//   `materialIds` because doing so *"would mint an RFQ naming a material master
//   that does not exist"*. That refusal was correct and load-bearing; what it
//   did not know is that the picker beside it was doing the thing it refused,
//   23 ways. A closed door next to an open one.
//
// ── ⚠️ WHY "NO CODE" IS A DECLARED MEMBER AND NEVER A NULL ──────────────────
//   An absent/`null` code reads as an OMISSION — something nobody filled in.
//   `CODE_LESS` reads as a FINDING: somebody looked, and the master does not
//   carry this material. The two are different facts and only one of them is
//   true here. The discriminated-union shape is the tree's own convention
//   (`PslExemption`, `CompetitionVerdict`, `EligibilityVerdict`), and it buys
//   the same thing here it buys there: a reader must handle the case to compile.
//
// ── ⚠️ THESE CODES ARE PLACEHOLDERS, AND THAT IS THE OPERATOR'S STANDING NOTE
//   SAP's real material master will replace `MATERIAL_MASTER`. So the bias in
//   authoring this mapping was to **invent nothing and leave honest gaps
//   visible**: 9 entries carry a code, 14 declare they have none, and not one
//   code here was minted for the purpose. Every code is an existing
//   `MATERIAL_MASTER` key, asserted at `materialCatalog.test.ts`.
//
// ── ⚠️ NO MASTER FIELD NAMES AN `RFQCategory`, AND THIS BATCH DOES NOT CLOSE
//   THAT (R6). Measured: `label` / `canonicalUom` / `materialGroup` /
//   `materialType` are present on 42/42 master rows and an RFQ category on
//   **0/42**. The master classifies by `materialGroup` (MG-02…MG-25, on two
//   different axes by ruling R-1); the wizard classifies by `RFQCategory`.
//   Nothing in this tree reconciles the two taxonomies. **THE CATALOG IS THAT
//   RECONCILIATION, WRITTEN AS DATA** — which is precisely why it survives this
//   batch rather than being derived away from the master. A derivation over
//   `materialGroup` was measured and rejected: 8 of 42 master rows become
//   unreachable, two of them (`RM-EMUL-3310`, `RM-HUMEC-3405`) carried by 5 of
//   the 14 seeded RFQs, so a buyer could not re-raise events the seed contains.
// ─────────────────────────────────────────────────────────────────────────────

// ── ⚠️ `CodeLessReason` NOW LIVES IN `src/data/`, AND ONLY THE TYPE MOVED ────
//   R8 needs it on the `MaterialRequest` DTO, and **nothing under
//   `src/services/` imports from `src/pages-v2/`** — derived before the move,
//   with every apparent hit turning out to be a `// Relocated from
//   src/pages-v2/…` comment rather than an import. So the union went to the
//   neutral layer both sides already reach, and it is RE-EXPORTED here so this
//   module stays the one place the catalog's shape is read from. The DATA
//   (`MATERIAL_CATALOG`, in `BuyerSourcing.tsx`) and every const in this file
//   are untouched: moving a module-scope const would retire its `path::NAME`
//   key in `moduleScopeLiteralGate` and fire a dead-key failure, which is
//   exactly why only the type moved.
export type { CodeLessReason } from '../../data/materialCatalogReason';
export {
  CODE_LESS_REASONS,
  isCodeLessReason,
} from '../../data/materialCatalogReason';

import type { CodeLessReason } from '../../data/materialCatalogReason';

/** One pickable row in the wizard's material step. */
export type CatalogEntry =
  | {
      readonly kind: 'CODED';
      /** An existing `MATERIAL_MASTER` key. Never minted, never a placeholder
       *  of this file's own invention. */
      readonly code: string;
      readonly label: string;
    }
  | {
      readonly kind: 'CODE_LESS';
      readonly reason: CodeLessReason;
      readonly label: string;
    };

/**
 * The SELECTION IDENTITY of an entry — the React key, and what the wizard draft
 * stores.
 *
 * ⚠️ **A CODED ENTRY IS IDENTIFIED BY ITS CODE, NOT BY ITS LABEL**, so the
 * selection survives a label edit; a code-less entry has only its label to be
 * identified by, which is exactly the poverty the code would have removed.
 */
export const entryKey = (e: CatalogEntry): string =>
  e.kind === 'CODED' ? e.code : e.label;

/**
 * THE CODES A SELECTION PUTS ON THE PAYLOAD — and it is a FILTER, never a map.
 *
 * ⚠️ **A CODE-LESS ENTRY CONTRIBUTES NOTHING, WHICH IS THE WHOLE POINT.** The
 * alternative every earlier design reached for — a placeholder, a `TEMP-` code,
 * the label itself — was measured and refused: a temporary code and a code that
 * is simply missing return **byte-identical** results at the master lookup, the
 * should-cost spread and the search filter, so nothing downstream could ever
 * ask which one it was holding. Contributing nothing is the only option under
 * which `materialIds` means one thing.
 */
export const codesOfKeys = (
  entries: readonly CatalogEntry[],
  keys: readonly string[],
): string[] =>
  entries
    .filter((e): e is Extract<CatalogEntry, { kind: 'CODED' }> => e.kind === 'CODED')
    .filter((e) => keys.includes(e.code))
    .map((e) => e.code);

/** The labels a selection renders, in the entries' own order. */
export const labelsOfKeys = (
  entries: readonly CatalogEntry[],
  keys: readonly string[],
): string[] => entries.filter((e) => keys.includes(entryKey(e))).map((e) => e.label);

/** The code-less entries in a selection — what the surface must be honest about. */
export const codeLessOfKeys = (
  entries: readonly CatalogEntry[],
  keys: readonly string[],
): Array<Extract<CatalogEntry, { kind: 'CODE_LESS' }>> =>
  entries
    .filter((e): e is Extract<CatalogEntry, { kind: 'CODE_LESS' }> => e.kind === 'CODE_LESS')
    .filter((e) => keys.includes(e.label));
