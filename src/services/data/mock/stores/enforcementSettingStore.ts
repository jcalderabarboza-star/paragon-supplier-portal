// ────────────────────────────────────────────────────────────────────────────
// Mutable EnforcementSetting store — CP-3 · E2. THE APPEND-ONLY LEDGER.
//
// ⚠️ IT SHIPS EMPTY, AND THAT IS A RULING RATHER THAN AN OVERSIGHT.
//   Seeding anything below `BLOCK` would relax shipped behaviour, which is
//   D-ENF-4 and UNRULED — so nothing is seeded, in either direction. An empty
//   ledger derives `BLOCK` with the source `NO_SETTING_RECORDED`
//   (`effectiveEnforcement`), so the un-governed state is the SAFE state and a
//   check nobody has ruled on is not thereby off. Seeding `BLOCK` explicitly was
//   also refused: it would put a decision on the record that nobody took, and
//   `AS_SET` would then claim an author for a constant.
//
// ⚠️ THERE IS NO `update`, AND THERE IS DELIBERATELY NEVER GOING TO BE ONE
//   (D2, ruled — the `fxPins` freeze). SUPERSEDING ON AN APPEND-ONLY LEDGER
//   MEANS APPENDING. There is no `supersedes` / `supersededBy` field either, for
//   the same reason: on a ledger, the successor IS the supersession.
//
//   The alternative — a mutable current-setting record — is refused because it
//   MAKES THE RATCHET UNAUDITABLE. The ratchet tightens against a `reviewBy`;
//   overwrite the record and the date it tightened against is gone, so you can
//   see that it bit and never why. The setting in force is DERIVED
//   (`settingInForce`), never stored, so "which mode is current" cannot drift
//   from the acts that justify it.
//
// ⚠️ `setAt` IS STORE-ASSIGNED, never payload-supplied — the `pinnedAt`
//   discipline. When a decision was recorded is a fact about the system, and a
//   caller that could set it could backdate its own audit entry. It is also the
//   ledger's ordering key, so a forgeable one would let a caller insert itself
//   ahead of a decision it did not know about.
//
// ⚠️ THE KEY IS `checkId` ALONE (D1, ruled) AND THE SHAPE DOES NOT ASSUME IT.
//   This is a FLAT ARRAY, not `Record<GovernedCheckId, …>` — `fxPins`' own
//   choice, for `fxPins`' own reason. A map would bake one field into the store;
//   an array bakes nothing. Adding a dimension later (supplier · plant ·
//   material) touches the selector's predicate and comparator and NOTHING HERE.
// ────────────────────────────────────────────────────────────────────────────

import type { EnforcementSetting } from '../../../../lib/enforcement';

/** THE SEED: none. See the header — this is D-ENF-4, and it is unruled. */
const SEED: readonly EnforcementSetting[] = Object.freeze([]);

let rows: EnforcementSetting[] = [...SEED];

export const enforcementSettingStore = {
  /** The whole ledger, oldest first (the mutable source reads resolve from). */
  all(): readonly EnforcementSetting[] {
    return rows;
  },
  /** Every recorded setting for one check, in ledger order. The superseded ones
   *  are here too — that is the point of an append-only ledger. */
  forCheck(checkId: string): readonly EnforcementSetting[] {
    return rows.filter((s) => s.checkId === checkId);
  },
  /** Record a new decision. APPEND ONLY — there is no update path to guard, and
   *  a new array reference so a memoised read genuinely recomputes. */
  append(setting: EnforcementSetting): void {
    rows = [...rows, setting];
  },
  /** Restore the (empty) seed — test isolation. */
  reset(): void {
    rows = [...SEED];
  },
};
