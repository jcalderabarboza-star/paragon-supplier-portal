// ────────────────────────────────────────────────────────────────────────────
// CP-3 · E4 — THE OPENING ACT ON THE ENFORCEMENT LEDGER.
//
// E2 shipped the ledger EMPTY and said why: D-ENF-4 was unruled, so seeding in
// either direction would have manufactured provenance. **D-ENF-4 IS NOW RULED**
// (operator, PROVISIONAL, pending team ratification):
//
//   EVERY CHECK OPENS AT ITS SHIPPED BEHAVIOUR. NOTHING RELAXES ON OUR
//   AUTHORITY.
//
// So the two checks that BLOCK TODAY open at full rigour, and this module is the
// act that records it. It is what makes E4 a MIGRATION rather than a change:
// the wizard stops hard-coding its consequence and starts reading one, and the
// one it reads is the one it was already applying.
//
// ── ⚠️ TWO ROWS, NOT THREE — THE RULING'S OWN COUNT WAS CORRECTED ───────────
//   The dispatch listed three rows: `bpom.lot`, `halal.seal`, and "the
//   unanswered-required clause". The third IS NOT A THIRD CHECK. It is the
//   SHARED SHAPE of the other two — the two clauses at
//   `GRInspectionWizard.tsx` `qualityValid` that block a required-and-unanswered
//   check. The count came from reading `GOVERNED_CHECK_IDS` (three members) as
//   the seed list; the tree says otherwise.
//
//   ⚠️ **`halal.certificate` IS DELIBERATELY NOT SEEDED.** It is authored at H3
//   (`verifyHalalAtReceipt`) and WIRED NOWHERE — it runs nowhere and blocks
//   nothing, so it has no shipped behaviour to open at. A row at `BLOCK` for it
//   would PUT A DECISION ON THE RECORD THAT NOBODY TOOK, which is precisely
//   what E2 refused to do and precisely why it refused. Its empty entry already
//   derives `BLOCK / NO_SETTING_RECORDED`, which is the TRUE state: maximum
//   rigour, and honestly sourced as undecided rather than dressed as chosen.
//   Recorded against the ruling, not just in the outcome (operator, at E4).
//
// ── ⚠️ THE ACTOR IS `UNATTRIBUTED`, AND THAT IS THE HONEST FORM ─────────────
//   "A NAMED RECORDED ACT" MEANS THE ACT IS NAMED ON THE RECORD — a dispatched
//   verb, a DR-10 event, a ledger row — NOT that a human is named. Nothing in
//   this system can name a human (`ENF-NO-PERSON-IN-IDENTITY-01`); that is F1.
//   Inventing a `personId` / `displayName` to seed with would be the
//   manufactured provenance E2 refused, one layer down and harder to see.
//
//   The policy already permits this, and permits it for the right reason: an
//   opening act at full rigour is NOT A LOOSENING (the baseline for an unset
//   check is `MAXIMUM_RIGOUR`, so this is a no-op in the strict direction), and
//   **THE SAFEST ACT IS ALWAYS AVAILABLE TO ANYBODY**. A seed that needed a
//   named person could not run at all today, and the alternative to running it
//   is not "no row" — it is a forged one.
//
// ── ⚠️ `MAXIMUM_RIGOUR`, NEVER THE LITERAL `'BLOCK'` ────────────────────────
//   The literal is the fail-open shape here. Append a stricter mode to
//   `ENFORCEMENT_MODES` tomorrow and a hard-coded `'BLOCK'` SILENTLY BECOMES A
//   RELAXATION — a seed that ships one notch below the ceiling, recorded as a
//   deliberate act, on the authority of nobody. Taking the ceiling from the ramp
//   means "nothing relaxes on our authority" holds by construction rather than
//   by remembering to edit this file.
//
// ── ⚠️ IT NEVER SUPERSEDES A RECORDED ACT ───────────────────────────────────
//   A check that ALREADY names a setting is skipped. The ledger is append-only,
//   so appending here would not overwrite — it would do something worse: record
//   a SECOND decision, at a later `setAt`, that supersedes a real operator's
//   act with a boot-time default. The seed opens a ledger; it does not close
//   one.
// ────────────────────────────────────────────────────────────────────────────

import { MockCommandService } from './MockCommandService';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import type { CommandResult, QueryScope } from '../types';
import {
  MAXIMUM_RIGOUR,
  settingInForce,
  type GovernedCheckId,
} from '../../../lib/enforcement';

/**
 * THE CHECKS THIS SEED OPENS — the ones that BLOCK TODAY, and only those.
 *
 * ⚠️ **NOT `GOVERNED_CHECK_IDS`.** Deriving the seed list from the vocabulary is
 * the mistake the ruling's count came from: the vocabulary names every check a
 * mode MAY govern, and this names the ones that HAVE a shipped behaviour to
 * open at. `halal.certificate` is in the first list and not the second, and a
 * check authored tomorrow must be placed here CONSCIOUSLY rather than acquire a
 * recorded decision by joining a union.
 */
export const SEEDED_CHECKS: readonly GovernedCheckId[] = Object.freeze([
  /** `qualityValid`: `l.halal.required && !l.halalSealCheck` (H2). */
  'halal.seal',
  /** `qualityValid`: `l.bpom.applicable && !l.bpomLotCheck` (2B-4b). */
  'bpom.lot',
]);

/**
 * WHO RECORDED IT — an explicit absence carrying the reason, never a person.
 * See the header: this is the honest form, not a placeholder for one.
 */
const SEED_ACTOR = Object.freeze({
  kind: 'UNATTRIBUTED',
  reason: 'NO_PERSON_IN_SESSION',
} as const);

/** Enforcement settings are a buyer governance record; the verb is buyer-only. */
const BUYER_SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };

/** What the seed did to ONE check — reported rather than assumed. */
export interface EnforcementSeedOutcome {
  readonly checkId: GovernedCheckId;
  /**
   * `recorded` — the opening act landed.
   * `already-recorded` — the ledger already names this check; skipped (see the
   *   header: the seed opens a ledger, it does not close one).
   * `refused` — the dispatch failed. THE LEDGER STAYS EMPTY FOR THIS CHECK,
   *   which derives `BLOCK / NO_SETTING_RECORDED`. What is lost is PROVENANCE,
   *   never enforcement — the un-governed state is the safe state.
   */
  readonly status: 'recorded' | 'already-recorded' | 'refused';
  /** The dispatcher's own words, when it refused. */
  readonly reason?: string;
}

/**
 * Record the opening act for every check that blocks today.
 *
 * ⚠️ **THROUGH THE DISPATCHED VERB, NOT INTO THE STORE.** The whole point of
 * `t_enforcement_set` is that a governed relaxation lands in the DR-10 trail;
 * a seed written straight to the store would be the one recorded decision the
 * audit could not see, and it would be the FIRST one. It also means the seed
 * passes the same policy every later act does — a seed that could bypass
 * `enforcementSetGoverned` would be a second, weaker authoring path.
 *
 * Idempotent by the skip above, and safe to call more than once.
 */
export async function seedEnforcementLedger(
  commands: MockCommandService = new MockCommandService(),
): Promise<readonly EnforcementSeedOutcome[]> {
  const outcomes: EnforcementSeedOutcome[] = [];
  for (const checkId of SEEDED_CHECKS) {
    if (settingInForce(enforcementSettingStore.all(), checkId)) {
      outcomes.push({ checkId, status: 'already-recorded' });
      continue;
    }
    const result: CommandResult = await commands.dispatch(BUYER_SCOPE, {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: checkId,
      // No `reviewBy`. Full rigour is not a relaxation, so there is nothing to
      // renew — and the store keeps the absence rather than inventing a date.
      payload: { mode: MAXIMUM_RIGOUR, setBy: SEED_ACTOR },
    });
    outcomes.push(
      result.status === 'failed'
        ? { checkId, status: 'refused', reason: result.reason }
        : { checkId, status: 'recorded' },
    );
  }
  return outcomes;
}
