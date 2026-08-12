// ─────────────────────────────────────────────────────────────────────────────
// GL-0 · THE GLOSSARY CONTRACT.
//
// ⚠️ **GL-0's "NO PAGE, NO LINK, NO RENDER" HAS BEEN SPENT — GL-1 BUILT BOTH.**
// The fence was a batch boundary, not a property of this file, and leaving the
// sentence standing would have made the header lie the moment it was crossed.
// `pages-v2/Glossary.tsx` renders every registry, and `ui-v2/GlossaryTermChip`
// links refusal sites to it. What ships HERE is unchanged: the VOCABULARY —
// one definition, in one place, for terms that existed only as type members.
//
// ── WHY, AND IT IS NOT A REFERENCE PAGE ─────────────────────────────────────
//   The procurement team's review is running. A glossary is what makes their
//   vocabulary corrections CHEAP: a term becomes ONE definition in ONE place,
//   so *"that is not what we call a quality hold"* is an EDIT rather than an
//   archaeology across nineteen surfaces.
//
// ── ⚠️ EXHAUSTIVENESS IS THE WHOLE MECHANISM ────────────────────────────────
//   Every registry below is `Record<Member, GlossaryEntry>` over a union that
//   already exists, pinned with `satisfies`. Two things follow, and both are
//   the point:
//     · A VOCABULARY MEMBER CANNOT EXIST WITHOUT A DEFINITION — add a member to
//       the source union and this file stops compiling.
//     · A DEFINITION CANNOT OUTLIVE ITS MEMBER — delete the member and the
//       stale key stops compiling.
//   The `FX_REFUSAL_KEY` / `REFUSAL_CENSUS` pattern, at scale. **The gate is
//   `tsc`, not a test** — there is nothing to run and nothing to keep in sync.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ONE term. `term` is NOT stored — it is the record's key, which is the union
 * member itself, so a term and its identity cannot disagree.
 */
export interface GlossaryEntry {
  /** EN definition. Plain sentence, no jargon it does not itself define. */
  readonly en: string;
  /** ID definition. **Authored from birth, not back-filled** — a term that
   *  exists in one locale only is a term the ID-speaking half of the review
   *  cannot correct, which is the audience this batch is for. */
  readonly id: string;
  /**
   * Where a reader goes to act on this term.
   *
   * ⚠️ **OPTIONAL, AND STILL ABSENT ON EVERY ENTRY. ABSENT RENDERS NOTHING** —
   * and GL-1, which built the page and the chips, did not populate one. The
   * glossary closes the DEFINITIONAL half of `HALAL-REFUSAL-DEAD-ENDS-01` — a
   * refusal that told you only that you were stuck can now at least be looked
   * up, from the refusal itself. **THE ROUTING HALF STAYS OPEN**,
   * because the destination does not exist: who rules on a halal
   * determination, where they do it, and what the clerk does meanwhile are
   * unanswered (D-COMP-HALAL-4). The field is declared so the shape is agreed;
   * it is empty so nothing reads as closed that is not. **Do not populate it
   * to make a row look finished.**
   */
  readonly remedyRoute?: string;
}

/** A registry of definitions keyed by the members of one source union. */
export type GlossaryOf<Member extends string> = Readonly<Record<Member, GlossaryEntry>>;
