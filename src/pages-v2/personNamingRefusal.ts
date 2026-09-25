// ─────────────────────────────────────────────────────────────────────────────
// A REFUSAL THAT NAMES A PERSON, IN THE READER'S LANGUAGE — AND WITHOUT THE ID.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR WAS FOUND IN THE BROWSER, NOT BY A SPEC**, and
// it is worth stating exactly because the shape is reusable. The material-
// request four-eyes refusal rendered:
//
//     "…(materialrequest_decider_not_requester:the requester
//      (sim-usr-procurement-1) may not also decide this request — …)"
//
// A `personId` is an INTERNAL TOKEN. Printing one where a person is meant is
// the same class of dishonesty D-ID-3 forbids in the other direction: there,
// a surface must not CAPTURE a person as typed text; here, it must not PRINT
// one as an identifier. The reader learns a string they cannot act on, and a
// governed surface reads like a debugger.
//
// ── ⚠️ THE SERVICE REFUSAL IS NOT THE DEFECT, AND IS DELIBERATELY UNCHANGED ──
//   `policies.ts` still interpolates the `personId`, and
//   `materialRequestCommand.test.ts` pins that it does — naming the STABLE
//   identifier is the stronger developer trail (D-ID-1: an id is permanent, a
//   label is resolved at read and can change). The defect was never that the
//   reason carried an id; it was that a SURFACE rendered the reason raw.
//   `pslRefusal.ts` is the model the strategist named, and this is precisely
//   its shape: PSL's service reason names the id too, and no reader has ever
//   seen it, because the page keys on the HEAD and renders its own copy.
//
// ── ⚠️ KEYED TO THE HEAD, NEVER TO A SUBSTRING OF THE PROSE ────────────────
//   Same contract as `pslRefusal.ts`, and the same reason: the head is what a
//   type can check and a test can pin; the sentence is free to be rewritten.
//   Matching the prose would make every copy edit a silent behaviour change.
//
// ── ⚠️ WHICH HEADS THIS MAP HOLDS, AND WHY ────────────────────────────────
//   Derived, not chosen — `personNamingRefusal.test.ts` re-derives the set of
//   person-naming heads from `policies.ts` every run and requires each to be
//   accounted for. Do NOT restate the cardinality here: the sentence that stood
//   in this spot opened *"WHY THIS MAP HOLDS ONE ENTRY AND NOT THREE"* and was
//   falsified by the next batch to add a hook (`FLOOR-IN-PROSE-01`, in a
//   comment about a derived population).
//
//     · `PSL_DECIDER_IS_PROPOSER`        — owned by `PSL_REFUSAL_KEYS`, and a
//       second key for it here would be a second vocabulary. The spec asserts
//       that ownership rather than assuming it.
//     · `MATERIALREQUEST_DECIDER_IS_REQUESTER` — reachable from a page, and the
//       one this module was built for.
//     · `SAMPLE_ACTOR_CANNOT_LOOSEN`     — ⚠️ **OWNED HERE SINCE CALL-OFF STEP
//       1, HAVING BEEN EXEMPT AS "UNREACHABLE" BEFORE IT.** The exemption was
//       argued from the ENFORCEMENT emission (*"no hook dispatches
//       `t_enforcement_set`"*), which remains true and is still asserted. But a
//       head is not an emission: `delivery_policy_governed` emits this same head
//       from a verb the drawdown-tolerance editor dispatches on a shipped buyer
//       surface, and the derivation returns a SET — so ONE exemption silently
//       covered TWO emissions and the gate would have read green while a
//       `sim-usr-*` id reached an operator. **Account for the head, never for
//       the site.**
//
// ── ⚠️ `null` IS THE HONEST ANSWER AND EVERY FALLBACK SURVIVES ─────────────
//   An unrecognised reason returns `null`, so a call site reads
//   `personNamingRefusalKey(r) ?? refusalText(r) ?? r` and renders exactly what
//   it rendered before. `refusalMessage.ts`'s rule, copied with its reason: a
//   translator that absorbed a foreign string would make an ungoverned refusal
//   READ as governed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Refusal heads whose rendered copy NAMES THE PERSON, mapped to the key that
 * carries that copy. The copy takes a `{{person}}` interpolation, and the only
 * honest source for it is `personLabel` — the one read-time resolver, which is
 * what attaches the `(SAMPLE)` marker.
 */
export const PERSON_NAMING_REFUSAL_KEYS: Readonly<Record<string, string>> = Object.freeze({
  MATERIALREQUEST_DECIDER_IS_REQUESTER: 'identity.refusal.deciderIsRequester',
  // ⚠️ **IT JOINED AT CALL-OFF STEP 1, AND THE EXEMPTION THAT COVERED IT IS
  // DELETED RATHER THAN NARROWED.** The reasoning in the header above — *"no
  // `.tsx` and no hook dispatches `t_enforcement_set`, so no reader can ever
  // receive it"* — was true of the ENFORCEMENT emission and still is. It was
  // never true of the head: `delivery_policy_governed` emits the SAME head from
  // a verb the tolerance editor dispatches on a shipped buyer surface.
  //
  // **The derivation returns a SET of heads, so one exemption covered both
  // emissions** — the gate would have stayed green while a `sim-usr-*` id
  // reached an operator's screen in a governance refusal. That is the precise
  // shape this module exists to make impossible, arriving through the door the
  // module held open for itself.
  SAMPLE_ACTOR_CANNOT_LOOSEN: 'identity.refusal.sampleCannotLoosen',
});

/**
 * The `identity.refusal.*` key for a dispatcher reason, or `null`.
 *
 * The reason arrives as `POLICY_REJECTED:<hook>:<HEAD>: <sentence>`, so the head
 * is looked for anywhere in the string rather than at position zero — the
 * dispatcher owns the prefix and may change how it composes one.
 */
export function personNamingRefusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  for (const head of Object.keys(PERSON_NAMING_REFUSAL_KEYS)) {
    // The colon is part of the match so a head cannot be found inside a longer
    // one that happens to start with it.
    if (reason.includes(`${head}:`)) return PERSON_NAMING_REFUSAL_KEYS[head];
  }
  return null;
}
