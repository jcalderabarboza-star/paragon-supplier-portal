// ────────────────────────────────────────────────────────────────────────────
// FB-4 · WHAT AN ACTIVE VERSION ADDS, AT RUNTIME (Design 6 v2 §7.1) — the
// dependency the dispatcher is handed.
//
// The dispatcher resolves every act through the one registry, exactly as it
// always has, and then asks this object what the version in force adds in front
// of it. NOTHING HERE CAN REMOVE A REFUSAL: the only answers are "a step is
// due" and "this person may not take the act", and both refuse.
//
// What is in force and what is due is `stepsDue.ts`, which a surface reads
// without pulling a command service into its imports. This module hands that
// one the world as it is (`liveWorld`) and re-exports it, so the service layer
// and the specs keep one address.
// ────────────────────────────────────────────────────────────────────────────

import { asActorAttribution, isAttributed } from '../../lib/enforcement';
import type { QueryScope } from '../data/types';
import type { PolicyDecision } from '../transitions/dispatcher';
import { stepCompleterMayNotAct } from '../transitions/policies';
import { liveWorld } from './liveWorld';
import { stepLedger } from './stepLedger';
import { dueStep, inForce, pendingDetail, provideWorld, standing, stepsInFrontOf, versionStampFor } from './stepsDue';

export * from './stepsDue';

// ONE WORLD: the composer, the Changes list, the checks that guard proposing
// and activating, and this overlay all judge a version by the same one.
provideWorld(() => liveWorld());

const personOf = (actor: unknown): string | null => {
  const a = asActorAttribution(actor);
  return a && isAttributed(a) ? a.person.personId : null;
};

export const flowOverlay = {
  /**
   * The step due in front of this act, as the refusal's detail: its key, with
   * `:declined` after it when the latest decision on it was a decline.
   */
  pendingStep(transitionId: string, entity: string, entityId: string): string | null {
    const due = dueStep(entity, entityId, transitionId);
    return due ? pendingDetail(due.key, due.declined !== null) : null;
  },
  /**
   * The separation an author asked for: whoever completed the step may not then
   * take the act. Asked after the shipped checks, and only if those passed.
   */
  check(ctx: {
    transitionId: string;
    entity: string;
    entityId: string;
    scope: QueryScope;
    exempt: (head: string) => boolean;
  }): PolicyDecision {
    const version = inForce(ctx.entity).version;
    const actor = personOf(ctx.scope.actor);
    if (!version || !actor) return { ok: true };
    for (const step of stepsInFrontOf(version, ctx.transitionId)) {
      if (!step.completerMayNotAct) continue;
      const row = standing(version, ctx.entity, ctx.entityId, step.id);
      if (row && personOf(row.by) === actor) {
        const decision = stepCompleterMayNotAct(ctx.exempt, actor, { step: step.id, label: version.label });
        if (!decision.ok) return decision;
      }
    }
    return { ok: true };
  },
  /** The act succeeded: the completions in front of it are spent. */
  consume(transitionId: string, entity: string, entityId: string): void {
    const version = inForce(entity).version;
    if (!version) return;
    const ids = stepsInFrontOf(version, transitionId).map((s) => s.id);
    if (ids.length > 0) stepLedger.markUsed(entity, entityId, ids);
  },
  versionLabel: versionStampFor,
};
