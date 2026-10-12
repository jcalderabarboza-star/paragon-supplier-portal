// FB-1 — the command target and the two shape checks of the `flowVersion` flow.
// `materialRulingTarget.ts`'s layout: the target and its hooks sit together
// because the hooks read the same store the target writes.
//
// A FACTORY, because one check asks "can a command write through this
// process?", and the answer is the target table this target is a row of.
import { bindPolicyHook, getFlow, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { asActorAttribution } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import { isContentShaped, type FlowVersionContent } from '../../flowBuilder/flowVersion';
import { flowVersionStore } from '../../flowBuilder/flowVersionStore';

const no = (reason: string): PolicyDecision => ({ ok: false, reason });

export function makeFlowVersionTarget(wiredEntities: () => readonly string[]): CommandTarget {
  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE, ({ payload }) => {
    const process = String(payload.flow);
    if (!getFlow(process)) {
      return no(`FLOWVERSION_PROCESS_UNKNOWN: '${process}' is not a registered process`);
    }
    // A change to the process by which processes are changed would let the
    // builder gate itself. Not ruled, so refused: the narrower answer.
    if (process === 'flowVersion') {
      return no('FLOWVERSION_PROCESS_SELF: a change cannot be drafted against the process that changes processes');
    }
    if (!wiredEntities().includes(process)) {
      return no(
        `FLOWVERSION_PROCESS_NOT_WRITABLE: no command can write through '${process}', ` +
          'so a step in front of one of its acts could never be met',
      );
    }
    if (typeof payload.title !== 'string' || payload.title.trim() === '') {
      return no('FLOWVERSION_TITLE_BLANK: a change is named, so it can be found again');
    }
    return { ok: true };
  });

  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_CONTENT_WELL_FORMED, ({ entityId, payload }) => {
    const version = flowVersionStore.byId(entityId);
    const content = payload.content;
    if (!isContentShaped(content)) {
      return no('FLOWVERSION_CONTENT_MALFORMED: the content is not a list of steps, forks and checks');
    }
    // A save may change what the change SAYS. Which process it is about, and the
    // shipped version it was composed against, were fixed when it was created.
    if (version && (content.entity !== version.content.entity || content.baseVersion !== version.content.baseVersion)) {
      return no(
        `FLOWVERSION_CONTENT_MOVED: version ${version.label} is a change to ` +
          `${version.content.entity} version ${version.content.baseVersion}, and a save cannot make it another`,
      );
    }
    return { ok: true };
  });

  return {
    readState: (id) => flowVersionStore.byId(id)?.state ?? null,
    // Buyer-only: no supplier may act on a change to a process.
    readScopeOwner: () => null,
    readEntity: (id) => flowVersionStore.byId(id) ?? null,
    creationOwner: () => null,
    create: (payload, _toState, scope) => {
      const process = String(payload.flow);
      const created = flowVersionStore.create(
        // The shipped version is READ here, never taken from the payload.
        { entity: process, baseVersion: getFlow(process)!.version, title: String(payload.title) },
        asActorAttribution(scope.actor) ?? NO_PERSON,
      );
      return { entityId: created.id };
    },
    applyTransition: (id, _toState, payload, scope) => {
      flowVersionStore.save(id, payload.content as FlowVersionContent, asActorAttribution(scope.actor) ?? NO_PERSON);
    },
  };
}
