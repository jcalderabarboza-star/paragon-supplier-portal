// ────────────────────────────────────────────────────────────────────────────
// WHERE ONE RENDERED TIMESTAMP CAME FROM — derived from the VALUE, never from
// the row.
//
// ⚠️ **THE PROBLEM THIS ANSWERS.** Two supplier-document stamps are minted by
// the store from the WALL CLOCK at the moment the act happens — the
// anti-backdating discipline, ruled and deliberate: a caller that could supply
// `declaredAt` could backdate its own declaration against an expiry deadline
// (`MockCommandService.declarationFrom`), and the same argument holds for
// `rejectedAt`. Every OTHER date on these surfaces is a fixture literal shifted
// onto `DECLARED_PRESENT`. So one value on the screen answers to a different
// clock from its neighbours, and a reader has no way to tell which.
//
// ── WHY THE VALUE AND NOT THE ROW ───────────────────────────────────────────
// The obvious discriminator is the id: the store mints `doc-9xxx` for a
// runtime creation and the fixtures are `doc-0xx` / `doc-1xx` / `doc-2xx`
// (`supplierDocumentStore.nextNumber`). **It is wrong, and wrong in the
// direction that produces a false disclosure.** A SEEDED row can be rejected
// AGAIN at runtime — `t_supplierdoc_submit` accepts `Rejected` as a `from`, so
// `doc-012` can travel `Rejected → Under Review → Rejected` and come back
// carrying a wall-clock `rejectedAt` under its original fixture id. An
// id-keyed discriminator would call that value seeded and say nothing, which
// is the one outcome the disclosure exists to prevent.
//
// So the question asked here is about the VALUE: *is this exact string the one
// the seeded corpus carries for this document and this field?* Re-reject
// `doc-012` and the string changes, so the answer changes with it. That is the
// property the marker needs and the id does not have.
//
// ── WHAT IS DELIBERATELY NOT USED ───────────────────────────────────────────
// · **A list of fixture ids.** Forbidden by ruling, and it would rot: it is the
//   inherited list this project derives populations to avoid.
// · **The string's FORMAT.** The seeded value carries an offset and no
//   milliseconds (`…T09:24:00+07:00`); `new Date().toISOString()` carries `Z`
//   and milliseconds. That really does follow the value — and nothing in the
//   types, the store or any gate CONTRACTS it. A future fixture authored in `Z`
//   form would flip to "session" silently, with nobody touching this file, and
//   the disclosure would become a lie. A heuristic is not a derivation.
// · **A comparison against `DECLARED_PRESENT`.** REJECTED, and the reason is
//   structural rather than circumstantial: such a test separates the two kinds
//   only by an ACCIDENT of where the wall clock and the seeded literals happen
//   to sit relative to `P`. Both operands move independently of provenance — a
//   fixture may legitimately carry a date after `P` (every certificate expiry on
//   these surfaces does), and where the wall clock falls relative to `P` is a
//   fact about the calendar, not about who wrote the value. **A discriminator
//   whose correctness depends on the wall clock's relation to `P` is not a
//   provenance test**; it is a coincidence that has been holding.
//
//   ⚠️ **AND IT WAS MEASURED FAILING, WHICH IS WHY THIS BULLET IS PHRASED AS A
//   RULE AND NOT AS A PREFERENCE.** On the corpus as it stood when this module
//   was written, a SEEDED refusal sat after `P` — so a `later than P ⇒ session`
//   test called a seeded value a session one, on the one row the disclosure
//   exists for. That literal has since been repaired and no seeded act instant
//   sits after `P` any more (`actInstantCoherence.test.ts` is the gate that
//   keeps it that way), so the comparison would happen to succeed today. **The
//   repair removed the counter-example, not the objection** — equality against
//   the seeded corpus is what follows the VALUE, and it is what this module
//   ships.
// · **A stored provenance field**, the shape `FxPin.liveness` uses. It is the
//   right long-term answer and it is a change to the store, the verbs and a
//   certificate field — out of scope by ruling, and it would have to be
//   backfilled for every row already minted.
//
// ── WHAT THIS DOES NOT DECIDE ───────────────────────────────────────────────
// Nothing about the certificate: not its validity, not its scheme, not whether
// anybody verified it. Only which clock wrote one string.
// ────────────────────────────────────────────────────────────────────────────

import { DOCUMENTS } from './mock/fixtures/supplierDocuments';

/**
 * Which clock produced a rendered stamp.
 *
 * `SEEDED` — the value the fixture corpus carries, shifted onto the declared
 * present with the rest of its family. `SESSION` — minted by the store from the
 * wall clock when the act was dispatched in this browser session. There is no
 * third answer and no unknown: the store is in-memory, so a value that is not
 * the seeded one was written here, now.
 */
export type StampOrigin = 'SEEDED' | 'SESSION';

/** The two wall-clock-minted supplier-document stamps a surface renders. */
export type StampField = 'rejectedAt' | 'declaredAt';

/** The seeded value for one document and field, or `undefined` when the corpus
 *  has none — a document the store minted at runtime has no seeded row at all,
 *  and no fixture row carries a declaration. */
function seededValue(documentId: string, field: StampField): string | undefined {
  const row = DOCUMENTS.find((d) => d.id === documentId);
  if (!row) return undefined;
  return field === 'rejectedAt' ? row.rejectedAt : row.declaration?.declaredAt;
}

/**
 * Where `value` — the exact string about to be rendered — came from.
 *
 * Equality against the seeded corpus is the whole test. It follows the value,
 * so a re-refused fixture row is `SESSION` on the same id that was `SEEDED` a
 * moment earlier, and it self-corrects: the day a fixture seeds a declaration,
 * that declaration's stamp becomes `SEEDED` here with no edit.
 */
export function stampOrigin(
  documentId: string,
  field: StampField,
  value: string,
): StampOrigin {
  return value === seededValue(documentId, field) ? 'SEEDED' : 'SESSION';
}
