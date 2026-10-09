// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · THE SUPER ADMIN ACTIVITY VIEW, DERIVED FROM THE AUDIT TRAIL.
//
// Every command the dispatcher takes is already an event that carries the scope
// it ran under, the person, the document and — since ADM-1 — the rule that
// stood aside and the reason. So "every Super Admin act" is a FILTER over that
// trail, never a second ledger that could disagree with it.
//
// ⚠️ **AN ACT IS AN EVENT THAT HAPPENED.** A refused command is on the trail
// too and is not an act; `status` keeps the two apart so the view can show a
// refusal as a refusal instead of dropping it or dressing it as done.
//
// ⚠️ **ONLY ACTS A PERSON TOOK.** A cascade fan-out runs under the automation
// grant on a synthetic scope and is not a Super Admin act, whoever triggered
// the source — it carries no attribution, and that is what excludes it.
// ─────────────────────────────────────────────────────────────────────────────
import type { TransitionEvent } from '../transitions/events';
import { holdsSuperAdmin, SUPER_ADMIN_REASON_REQUIRED } from '../identity/superAdmin';
import { isAttributed } from '../../lib/enforcement';

export interface SuperAdminAct {
  /** The event's correlation id — the row's identity. */
  readonly id: string;
  /** When, as the dispatcher stamped it. */
  readonly at: string;
  /** Who — the Super Admin's `personId`. Resolved to a label at render. */
  readonly personId: string;
  /** What — the transition id. */
  readonly transitionId: string;
  /** The document, when the dispatcher knew one. */
  readonly entity: string | null;
  readonly entityId: string | null;
  /** `done` / `submitted` are acts; `failed` is a refusal. */
  readonly status: TransitionEvent['outcome'];
  /** The rules that stood aside. Empty for an ordinary act. */
  readonly bypassedRules: readonly string[];
  /** The stated reason, when a rule stood aside. */
  readonly reason: string | null;
  /** Why it was refused, when it was. */
  readonly refusal: string | null;
  /** The refusal was the bypass's own: a check stood aside and no reason was stated. */
  readonly refusedForNoReason: boolean;
}

/** Every event a Super Admin seat's named person raised, newest first. */
export function superAdminActs(events: readonly TransitionEvent[]): readonly SuperAdminAct[] {
  const acts: SuperAdminAct[] = [];
  for (const e of events) {
    if (!holdsSuperAdmin(e.scope)) continue;
    const who = e.attribution;
    if (!who || !isAttributed(who)) continue;
    acts.push({
      id: e.correlationId,
      at: e.ts,
      personId: who.person.personId,
      transitionId: e.event,
      entity: e.subject?.entity ?? null,
      entityId: e.subject?.entityId ?? null,
      status: e.outcome,
      bypassedRules: e.bypass?.rules ?? [],
      reason: e.bypass?.reason ?? null,
      refusal: e.outcome === 'failed' ? (e.reason ?? null) : null,
      refusedForNoReason:
        e.outcome === 'failed' && (e.reason ?? '').includes(`${SUPER_ADMIN_REASON_REQUIRED}:`),
    });
  }
  return acts.reverse();
}

export type SuperAdminActFilter = 'all' | 'bypassed' | 'refused';

export function filterSuperAdminActs(
  acts: readonly SuperAdminAct[],
  filter: SuperAdminActFilter,
  needle: string,
): readonly SuperAdminAct[] {
  const q = needle.trim().toLowerCase();
  return acts.filter((a) => {
    if (filter === 'bypassed' && a.bypassedRules.length === 0) return false;
    if (filter === 'refused' && a.status !== 'failed') return false;
    if (q === '') return true;
    return [a.transitionId, a.entity ?? '', a.entityId ?? '', a.reason ?? '', ...a.bypassedRules]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
}

/** The bypasses recorded against one document, oldest first — what the document carries. */
export function bypassesOn(
  events: readonly TransitionEvent[],
  entity: string,
  entityId: string,
): readonly SuperAdminAct[] {
  return superAdminActs(events)
    .filter((a) => a.entity === entity && a.entityId === entityId && a.bypassedRules.length > 0 && a.status !== 'failed')
    .reverse();
}
