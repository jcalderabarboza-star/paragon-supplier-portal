// FB-1 — the command target and the two shape checks of the `flowVersion` flow.
// `materialRulingTarget.ts`'s layout: the target and its hooks sit together
// because the hooks read the same store the target writes.
//
// A FACTORY, because one check asks "can a command write through this
// process?", and the answer is the target table this target is a row of.
import { bindPolicyHook, getFlow, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { asActorAttribution } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import {
  BUILDER_PROCESSES,
  findingKey,
  isContentShaped,
  type FlowVersionContent,
  type VersionActKind,
} from '../../flowBuilder/flowVersion';
import { flowVersionStore } from '../../flowBuilder/flowVersionStore';
import { errorsOf, validateVersion, type ValidationWorld } from '../../flowBuilder/validateVersion';
import { moduleDeployment } from '../../modules/deployment';

const no = (reason: string): PolicyDecision => ({ ok: false, reason });
/** `<rule code>:<element>` — what `findingKey` writes. */
const ACKNOWLEDGED_KEY = /^R\d\d:.+$/;

/** The act each transition records. `save` and `create` are not acts on the history. */
const ACT_OF: Readonly<Record<string, VersionActKind>> = Object.freeze({
  t_flowversion_propose: 'propose',
  t_flowversion_withdraw: 'withdraw',
  t_flowversion_return: 'return',
  t_flowversion_approve: 'approve',
  t_flowversion_reject: 'reject',
  t_flowversion_activate: 'activate',
  t_flowversion_supersede: 'supersede',
  t_flowversion_retire: 'retire',
  t_flowversion_restore: 'restore',
});

/** What the builder can put in force today. The rest of a version's shape waits for its batch. */
function notBuilt(content: FlowVersionContent): string | null {
  if (content.forks.length > 0) return 'a fork';
  if (content.checks.length > 0) return 'a check';
  if (content.steps.some((s) => s.kind === 'scan' || s.scan !== undefined)) return 'a scan step';
  if (content.steps.some((s) => s.when !== undefined)) return 'a step on a fork';
  return null;
}

export function makeFlowVersionTarget(
  wiredEntities: () => readonly string[],
  /** The world as it is now — the ONE the surfaces and the overlay judge by. */
  world: () => ValidationWorld,
): CommandTarget {
  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_REASON_AUTHORED, ({ payload }) =>
    typeof payload.reason === 'string' && payload.reason.trim() !== ''
      ? { ok: true }
      : no('FLOWVERSION_REASON_BLANK: an act on a change to a process states why, in words'),
  );

  // A sample person may decide on a demo or preview deployment, and not on
  // production — the deployment's ONE answer, which module switching reads too.
  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_NOT_SAMPLE_IN_PROD, ({ scope }) =>
    moduleDeployment.barsActor(scope.actor)
      ? no(
          'FLOWVERSION_SAMPLE_IN_PRODUCTION: a sample person cannot approve or put in force a change ' +
            'to a process on a production deployment — a real person must',
        )
      : { ok: true },
  );

  // THE VALIDATION LIBRARY, ASKED AGAIN AT EVERY GATE: at proposal, at approval,
  // at activation and at restore — against the world as it is THEN.
  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_OBEYS_RULES, ({ entityId, toState }) => {
    const version = flowVersionStore.byId(entityId);
    if (!version) return { ok: true };
    const { content } = version;
    if (content.steps.length + content.forks.length + content.checks.length === 0) {
      return no(`FLOWVERSION_EMPTY: version ${version.label} adds nothing, so there is nothing to review`);
    }
    const missing = notBuilt(content);
    if (missing) {
      return no(
        `FLOWVERSION_ELEMENT_NOT_BUILT: version ${version.label} holds ${missing}, which the platform ` +
          'cannot apply yet — it would be approved and then not obeyed',
      );
    }
    const findings = validateVersion(content, world());
    const errors = errorsOf(findings);
    if (errors.some((f) => f.code === 'R02')) {
      return no(
        `FLOWVERSION_BASE_MOVED: version ${version.label} was written against version ` +
          `${content.baseVersion} of ${content.entity}, and the process has moved since. Start a draft from it.`,
      );
    }
    if (errors.length > 0) {
      return no(
        `FLOWVERSION_BREAKS_RULE: version ${version.label} breaks ` +
          [...new Set(errors.map((f) => `${f.code} (${f.element})`))].join(', '),
      );
    }
    if (toState === 'In Review') {
      const open = findings
        .filter((f) => f.severity === 'warning' && !version.acknowledged.includes(findingKey(f)))
        .map((f) => `${f.code} (${f.element})`);
      if (open.length > 0) {
        return no(
          `FLOWVERSION_WARNING_UNACKNOWLEDGED: version ${version.label} carries a warning nobody ` +
            `has acknowledged: ${[...new Set(open)].join(', ')}`,
        );
      }
    }
    return { ok: true };
  });

  bindPolicyHook(POLICY_HOOKS.FLOWVERSION_PROCESS_WRITABLE, ({ payload }) => {
    const process = String(payload.flow);
    if (!getFlow(process)) {
      return no(`FLOWVERSION_PROCESS_UNKNOWN: '${process}' is not a registered process`);
    }
    // A change to the process by which processes are changed would let the
    // builder gate itself. Not ruled, so refused: the narrower answer.
    if (BUILDER_PROCESSES.includes(process)) {
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
    // FB-2 · "Start a draft from this version". The source must be a version
    // this browser holds, and a change to the SAME process: its elements name
    // that process's acts, and would mean nothing in front of another's.
    if (payload.fromVersion !== undefined) {
      const source = flowVersionStore.byId(String(payload.fromVersion));
      if (!source) {
        return no(`FLOWVERSION_SOURCE_UNKNOWN: '${String(payload.fromVersion)}' is not a version this browser holds`);
      }
      if (source.content.entity !== process) {
        return no(
          `FLOWVERSION_SOURCE_OTHER_PROCESS: version ${source.label} is a change to ` +
            `${source.content.entity}, and a draft of ${process} cannot start from it`,
        );
      }
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
    // FB-2 · the acknowledged warnings ride the save. Each names a rule and
    // what it is about; anything else is not an acknowledgement.
    const acknowledged = payload.acknowledged;
    if (
      acknowledged !== undefined &&
      !(Array.isArray(acknowledged) && acknowledged.every((k) => typeof k === 'string' && ACKNOWLEDGED_KEY.test(k)))
    ) {
      return no('FLOWVERSION_ACKNOWLEDGED_MALFORMED: an acknowledgement names a rule and what it is about');
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
        {
          entity: process,
          baseVersion: getFlow(process)!.version,
          title: String(payload.title),
          from: payload.fromVersion === undefined ? undefined : flowVersionStore.byId(String(payload.fromVersion))?.content,
        },
        asActorAttribution(scope.actor) ?? NO_PERSON,
      );
      return { entityId: created.id };
    },
    applyTransition: (id, toState, payload, scope, transitionId, bypass) => {
      const act = transitionId ? ACT_OF[transitionId] : undefined;
      if (!act) {
        flowVersionStore.save(
          id,
          payload.content as FlowVersionContent,
          (payload.acknowledged as readonly string[] | undefined) ?? [],
          asActorAttribution(scope.actor) ?? NO_PERSON,
        );
        return;
      }
      // WHO from the session, WHEN from the store, WHY from the act. A
      // supersede is the platform's own: nobody declared it, and its reason is
      // the version that replaced this one.
      flowVersionStore.move(id, {
        act,
        to: toState,
        by: act === 'supersede' ? null : (asActorAttribution(scope.actor) ?? NO_PERSON),
        reason: act === 'supersede' ? String(payload.supersededBy ?? '') : String(payload.reason).trim(),
        ...(bypass ? { bypass: { rules: [...bypass.rules], reason: bypass.reason } } : {}),
      });
    },
  };
}
