// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · 2B-5b-i — THE SHARED REFERENTIAL-INTEGRITY HARNESS.
//
// ── WHY THIS IS A MODULE AND NOT A COPIED HELPER ────────────────────────────
//   2B-5a wrote a five-axis check for ONE lane (outbound chase → scheduling
//   agreement) and, on its first run, TWO OF ITS FIVE AXES PASSED GREEN WHILE
//   THE DATA WAS WRONG: both filtered on the referenced item being found, the
//   item was not found, so both examined zero refs and reported an all-clear
//   about nothing. That is `EMPTY-INPUT-REPORTS-CLEAN-01`, third instance, in
//   the batch about it. The fix there was a hand-written `examinedItems()`
//   guard, asserted separately from the axis it guarded.
//
//   A guard you have to REMEMBER to write is the same guard that was missing.
//   So when 2B-5b-i found the identical defect shape in a SECOND lane (ASN →
//   purchase order), the answer was not a second copy of the guard:
//
//     ⚠️ AN AXIS CANNOT RETURN ITS DISAGREEMENTS WITHOUT ALSO RETURNING HOW
//        MANY REFERENCES IT ACTUALLY LOOKED AT. THE VACUITY GUARD IS NOT A
//        SEPARATE ASSERTION TO REMEMBER; IT IS PART OF THE RESULT TYPE.
//
//   `AxisResult` has no constructor that yields `wrong` without `examined`,
//   and `resolved` is counted where the resolution happens rather than
//   re-derived by the caller — which is exactly where 2B-5a's copy drifted.
//
// ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
//   It does not assert. Call sites own their expectations, because the two
//   lanes have different populations and different open axes: the chase lane
//   is fully repaired, the ASN lane's MATERIAL axis is deliberately open until
//   5b-ii (see `asnRefIntegrity.test.ts`). A harness that asserted for them
//   would have to be told which failures are expected, and a check that knows
//   which failures to allow is a whitelist.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The outcome of running ONE axis over a reference population.
 *
 * `total` — every reference offered.
 * `resolved` — those whose target object was found. **The vacuity number**: an
 *   axis that can only speak about resolved references is silent on the rest,
 *   and `resolved === 0` is the shape that reports clean about nothing.
 * `wrong` — human-readable disagreements, one line each, for the resolved set.
 */
export interface AxisResult {
  readonly total: number;
  readonly resolved: number;
  readonly wrong: readonly string[];
}

/**
 * Run one referential axis.
 *
 * @param refs     every reference to consider.
 * @param resolve  find the object a reference names; `undefined` when it names
 *                 nothing that exists. Unresolved refs are counted, never
 *                 silently skipped.
 * @param agrees   does the reference agree with the object it resolved to?
 * @param report   describe a disagreement (only called when `agrees` is false).
 */
export function axis<Ref, Obj>(
  refs: readonly Ref[],
  resolve: (ref: Ref) => Obj | undefined,
  agrees: (ref: Ref, obj: Obj) => boolean,
  report: (ref: Ref, obj: Obj) => string,
): AxisResult {
  let resolved = 0;
  const wrong: string[] = [];
  for (const ref of refs) {
    const obj = resolve(ref);
    if (obj === undefined) continue;
    resolved += 1;
    if (!agrees(ref, obj)) wrong.push(report(ref, obj));
  }
  return { total: refs.length, resolved, wrong: Object.freeze(wrong) };
}

/**
 * The references that resolve to nothing at all — the axis-1 population, and
 * the reason every other axis needs `resolved` reported beside its verdict.
 */
export function unresolved<Ref, Obj>(
  refs: readonly Ref[],
  resolve: (ref: Ref) => Obj | undefined,
  report: (ref: Ref) => string,
): readonly string[] {
  return Object.freeze(refs.filter((r) => resolve(r) === undefined).map(report));
}
