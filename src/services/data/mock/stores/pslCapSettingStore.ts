// ────────────────────────────────────────────────────────────────────────────
// Mutable PSL cap-setting store — PSL P3. THE APPEND-ONLY LEDGER.
//
// `enforcementSettingStore`'s shape, line for line, and for its reasons.
//
// ⚠️ IT SHIPS EMPTY, AND THAT IS A RULING RATHER THAN AN OVERSIGHT.
//   An empty ledger derives `PSL_DEFAULT_CAP_DAYS` with the source
//   `NO_SETTING_RECORDED` (`effectiveCap`), which is exactly what
//   `pslProjection.ts` promised this verb would make true: *"nothing has been
//   DECIDED for it, because the setting verb is P3."* Seeding a value would put
//   a decision on the record that nobody took, and the projection's provenance
//   would then claim an author for a constant — which is the thing
//   `EnforcementModeSource` exists to prevent: *a provenance field that
//   overstates is worse than an absent one, because it is actionable.*
//
// ⚠️ THERE IS NO `update`, AND THERE IS DELIBERATELY NEVER GOING TO BE ONE.
//   SUPERSEDING ON AN APPEND-ONLY LEDGER MEANS APPENDING. A mutable
//   current-value record would make the history unauditable: you could see
//   which cap bites and never which decision put it there, and the cap is what
//   bounds every designation in the platform.
//
// ⚠️ `setAt` IS STORE-ASSIGNED, never payload-supplied — the `pinnedAt`
//   discipline. It is also this ledger's ordering key, so a forgeable one would
//   let a caller insert itself ahead of a decision it did not know about.
//
// ⚠️ THE KEY IS `settingId` ALONE, AND THE SHAPE DOES NOT ASSUME IT.
//   A FLAT ARRAY, not `Record<PslSettingId, …>`: a map would bake one field
//   into the store, an array bakes nothing. Adding a dimension later (a cap per
//   category, say) touches the selector's predicate and nothing here.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../../../lib/enforcement';

/**
 * THE SETTING KEYS THIS PLATFORM GOVERNS. A closed set of exactly one member,
 * declared as a SET rather than as a literal so a second portal-wide PSL
 * setting (a default expiring window, say) is a new member and not a new
 * machine.
 *
 * ⚠️ **IT LIVES HERE RATHER THAN IN `pslCapSetting.flow.ts`, AND THE DIRECTION
 * IS WHY.** `effectiveCap` must read the key to look this ledger up, and
 * `pslProjection.ts` is in the DATA layer — declaring the key in a flow file
 * would hand the data layer a runtime edge on the transitions layer for one
 * string. `GovernedCheckId` sits in `lib/enforcement.ts` rather than in
 * `enforcement.flow.ts` for exactly this reason, and this follows it.
 */
export const PSL_SETTING_IDS = Object.freeze(['psl.default_cap_days'] as const);

export type PslSettingId = (typeof PSL_SETTING_IDS)[number];

/** True when `id` names a PSL setting this platform governs. An unknown key
 *  must read as `NOT_FOUND` at the target rather than be silently created. */
export function isPslSettingId(id: string): id is PslSettingId {
  return (PSL_SETTING_IDS as readonly string[]).includes(id);
}

/** The one key `effectiveCap` looks up. Named once, read by the projection and
 *  by the target, so the two cannot address different rows of one ledger. */
export const PSL_DEFAULT_CAP_SETTING_ID: PslSettingId = 'psl.default_cap_days';

/** ONE recorded decision about a portal-wide PSL setting. */
export interface PslCapSetting {
  readonly settingId: PslSettingId;
  /** The cap, in days. Proven a positive integer within the ceiling by
   *  `PSL_DEFAULT_CAP_WITHIN_CEILING` before it reaches this store. */
  readonly days: number;
  /** Who decided. An `ActorAttribution`, never a name — today always
   *  `UNATTRIBUTED: NO_PERSON_IN_SESSION`, which is the honest absence a
   *  name-shaped field could never be. */
  readonly setBy: ActorAttribution;
  /** Store-assigned. Never a payload field. */
  readonly setAt: string;
}

/** THE SEED: none. See the header — an unrecorded default is the honest state,
 *  and `NO_SETTING_RECORDED` is what says so. */
const SEED: readonly PslCapSetting[] = Object.freeze([]);

let rows: PslCapSetting[] = [...SEED];

export const pslCapSettingStore = {
  /** The whole ledger, oldest first (the mutable source reads resolve from). */
  all(): readonly PslCapSetting[] {
    return rows;
  },
  /** Every recorded setting for one key, in ledger order. The superseded ones
   *  are here too — that is the point of an append-only ledger. */
  forSetting(settingId: string): readonly PslCapSetting[] {
    return rows.filter((s) => s.settingId === settingId);
  },
  /** Record a new decision. APPEND ONLY, and a new array reference so a
   *  memoised read genuinely recomputes. */
  append(setting: PslCapSetting): void {
    rows = [...rows, setting];
  },
  /** Restore the (empty) seed — test isolation. */
  reset(): void {
    rows = [...SEED];
  },
};

/**
 * THE SETTING IN FORCE for one key, or `null` when nothing has been recorded.
 *
 * ⚠️ **THE LAST APPEND WINS, AND THAT IS THE WHOLE SELECTOR.** There is no
 * `reviewBy` here and therefore no ratchet — a cap does not lapse back to a
 * default, it stands until somebody records another one. `settingInForce`'s
 * enforcement twin needs the extra arm because a RELAXATION must tighten when
 * its review date passes; a validity cap relaxes nothing on its own.
 *
 * Pure: it takes the ledger as a PARAMETER, exactly as `effectiveEnforcement`
 * does, so a caller can ask "what would the cap be under this ledger?" without
 * a store in the question.
 */
export function pslSettingInForce(
  ledger: readonly PslCapSetting[] | undefined,
  settingId: string,
): PslCapSetting | null {
  if (!ledger || ledger.length === 0) return null;
  let found: PslCapSetting | null = null;
  for (const s of ledger) if (s.settingId === settingId) found = s;
  return found;
}
