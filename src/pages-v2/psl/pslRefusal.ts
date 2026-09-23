// ─────────────────────────────────────────────────────────────────────────────
// A PSL REFUSAL, IN THE READER'S LANGUAGE.
//
// ⚠️ **WHY THIS EXISTS BESIDE `describeRefusal` RATHER THAN INSIDE IT.** That
// translator owns the NINE dispatcher refusal kinds and adds no vocabulary of
// its own — a policy refusal reaches it as `POLICY_REJECTED:<hook>:<reason>`
// and it correctly renders *"a rule refused this"* plus the hook's own English
// sentence. That sentence is written for a developer reading a trail, and it is
// English in both locales.
//
// **The defect this prevents is already on the record.** Browser QA (Wave E)
// found an Indonesian operator reading an English sentence assembled out of a
// dispatcher constant, and `refusalMessage.ts` exists because of it. Fifteen
// new hooks would have re-created it fifteen times.
//
// ── ⚠️ KEYED TO THE HOOK'S REFUSAL HEAD, NOT TO A SUBSTRING OF ITS PROSE ───
//   Every PSL hook refuses with `PSL_<HEAD>: <sentence>`. The HEAD is the
//   stable part — it is what a type can check and what a test can pin — and the
//   sentence is free to be rewritten. Matching on the prose would make every
//   copy edit a silent behaviour change.
//
// ── ⚠️ AND THE MAP IS GATED IN BOTH DIRECTIONS, NEVER TRUSTED ─────────────
//   `pslRefusal.test.ts` DERIVES every head the shipped hooks actually emit by
//   scanning `policies.ts`, and asserts:
//     · every emitted head has a key here (a new hook cannot ship untranslated);
//     · every key here names a head some hook emits (a key cannot outlive the
//       refusal it was written for).
//   A one-sided assertion would pass on an empty map (§39), and a map that
//   outlived its hook is the `FORWARD-PROMISE-HAS-NO-HANDLER-01` shape.
//
// ── ⚠️ `null` IS THE HONEST ANSWER AND EVERY CALLER'S FALLBACK SURVIVES ────
//   An unrecognised reason returns `null`, so a call site reads
//   `pslRefusalKey(reason) ?? describeRefusal(reason) ?? reason` and an
//   unrecognised refusal renders exactly as it would have without this module.
//   `refusalMessage.ts`'s rule, copied with its reason: a translator that
//   absorbed a foreign string would make an ungoverned refusal READ as governed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The refusal heads the PSL hooks emit, each mapped to its `psl.refusal.*` key.
 *
 * ⚠️ **A CLOSED RECORD, SO A TYPO IS A `tsc` FAILURE RATHER THAN A MISSING
 * TRANSLATION AT RUNTIME.** `i18n`'s `t()` returns the key itself for an
 * unknown key, which renders as a dotted identifier on a governance screen —
 * visible, but only to somebody who happens to be looking.
 */
export const PSL_REFUSAL_KEYS: Readonly<Record<string, string>> = Object.freeze({
  PSL_SUPPLIER_UNKNOWN: 'psl.refusal.supplierUnknown',
  PSL_SCOPE_EMPTY: 'psl.refusal.scopeEmpty',
  PSL_SCOPE_UNKNOWN_CODE: 'psl.refusal.scopeUnknownCode',
  PSL_STATUS_UNKNOWN: 'psl.refusal.statusUnknown',
  PSL_VALIDITY_UNREADABLE: 'psl.refusal.validityUnreadable',
  PSL_VALIDITY_INVERTED: 'psl.refusal.validityInverted',
  PSL_JUSTIFICATION_BLANK: 'psl.refusal.justificationBlank',
  PSL_DECISION_BLANK: 'psl.refusal.decisionBlank',
  PSL_DECIDER_IS_PROPOSER: 'psl.refusal.deciderIsProposer',
  PSL_SEAT_HOLDS_BOTH_AUTHORITIES: 'psl.refusal.seatHoldsBoth',
  PSL_STATUS_UNCHANGED: 'psl.refusal.statusUnchanged',
  PSL_RENEWAL_UNREADABLE: 'psl.refusal.validityUnreadable',
  PSL_RENEWAL_DOES_NOT_EXTEND: 'psl.refusal.renewalDoesNotExtend',
  PSL_RENEWAL_EXCEEDS_CAP: 'psl.refusal.renewalExceedsCap',
  PSL_ALREADY_PUBLISHED: 'psl.refusal.alreadyPublished',
  PSL_CAP_NOT_A_DURATION: 'psl.refusal.capNotADuration',
  PSL_CAP_ABOVE_CEILING: 'psl.refusal.capAboveCeiling',
  PSL_CAP_JUSTIFICATION_BLANK: 'psl.refusal.capJustificationBlank',
  PSL_DEFAULT_CAP_NOT_A_DURATION: 'psl.refusal.capNotADuration',
  PSL_DEFAULT_CAP_ABOVE_CEILING: 'psl.refusal.capAboveCeiling',
});

/**
 * The `psl.refusal.*` key for a dispatcher reason, or `null`.
 *
 * The reason arrives as `POLICY_REJECTED:<hook>:PSL_<HEAD>: <sentence>`, so the
 * head is looked for anywhere in the string rather than at position zero — the
 * dispatcher owns the prefix and may change how it composes one.
 */
export function pslRefusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  for (const head of Object.keys(PSL_REFUSAL_KEYS)) {
    // The colon is part of the match so `PSL_CAP_ABOVE_CEILING` cannot be found
    // inside a longer head that happens to start with it.
    if (reason.includes(`${head}:`)) return PSL_REFUSAL_KEYS[head];
  }
  return null;
}
