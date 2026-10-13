// ─────────────────────────────────────────────────────────────────────────────
// MD-4 / MD-5 — the change-request command target, and the checks its acts ask.
//
// No act here writes a master record. The one place a record appears is a
// SAMPLE answer recorded on a demo deployment, and even that goes through the
// sync applier as a run of its own, stamped SAMPLE, so the replica's one-writer
// rule holds and the record says where it came from.
// ─────────────────────────────────────────────────────────────────────────────
import { bindPolicyHook, POLICY_HOOKS, type CommandTarget, type PolicyDecision } from '../../transitions';
import { SUPERSET_ROLES } from '../../transitions/businessRoles';
import { asActorAttribution, type ActorAttribution } from '../../../lib/enforcement';
import { NO_PERSON } from '../../../context/noPerson';
import { DECLARED_PRESENT_INSTANT } from '../fixturePresent';
import { moduleDeployment } from '../../modules/deployment';
import {
  REVIEWER_LANE,
  baseOf,
  cleanProposed,
  fieldsSapChanged,
  isMdrKind,
  isOpen,
  objectOfKind,
  overlaps,
  validateProposal,
  type MasterDataRequest,
  type MdrKind,
  type MdrState,
} from '../../masterData/changeRequest';
import { recordOf } from '../../masterData/replica';
import { applySyncRun } from '../../masterData/syncApplier';
import { masterDataRequestStore } from './stores/masterDataRequestStore';

const no = (reason: string): PolicyDecision => ({ ok: false, reason });
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const actorOf = (scope: { actor?: unknown }): ActorAttribution => asActorAttribution(scope.actor) ?? NO_PERSON;

/** The key a sample answer gives a material SAP "created": a sample key, never one that could be SAP's. */
const sampleKeyOf = (request: MasterDataRequest): string => `SAMPLE-${request.number}`;

/**
 * Deliver what a SAMPLE answer says SAP did, as a sync run of its own. The
 * record arrives the way every record arrives — through the applier — and is
 * stamped SAMPLE. The run id is the request number, so recording the same
 * answer twice changes nothing the second time.
 */
function deliverSampleRecord(request: MasterDataRequest, resultKey: string): void {
  const object = objectOfKind(request.kind);
  const current = request.subjectKey ? recordOf(object, request.subjectKey) : null;
  applySyncRun({
    id: `SAMPLE-ANSWER-${request.number}`,
    source: 'SAMPLE',
    at: DECLARED_PRESENT_INSTANT,
    mode: 'DELTA',
    objects: [],
    records: [{ object, key: resultKey, data: { ...(current?.data ?? {}), ...request.proposed } }],
  });
}

export function makeMasterDataRequestTarget(): CommandTarget {
  bindPolicyHook(POLICY_HOOKS.MDR_PROPOSAL_VALID, ({ payload }) => {
    const finding = validateProposal({
      kind: payload.kind,
      subjectKey: payload.subjectKey,
      proposed: payload.proposed,
      reason: payload.reason,
    });
    if (finding) return no(`${finding.refusal}: ${finding.about}`);
    const kind = payload.kind as MdrKind;
    const proposal = { kind, subjectKey: text(payload.subjectKey) || null, proposed: cleanProposed(payload.proposed) };
    const open = masterDataRequestStore.all().find((r) => isOpen(r) && overlaps(r, proposal));
    if (open) return no(`MDR_DUPLICATE_OPEN: request ${open.number} already asks for this and is still open`);
    return { ok: true };
  });

  bindPolicyHook(POLICY_HOOKS.MDR_REVIEWER_LANE, ({ entityId, scope }) => {
    const request = masterDataRequestStore.get(entityId);
    if (!request) return { ok: true };
    const lane = REVIEWER_LANE[request.kind];
    const roles = scope.businessRoles ?? [];
    if (roles.includes(lane) || roles.some((r) => (SUPERSET_ROLES as ReadonlySet<string>).has(r))) return { ok: true };
    return no(`MDR_WRONG_LANE: a ${request.kind} request is reviewed by ${lane}, and this seat does not hold that lane`);
  });

  bindPolicyHook(POLICY_HOOKS.MDR_BASE_UNCHANGED, ({ entityId }) => {
    const request = masterDataRequestStore.get(entityId);
    if (!request) return { ok: true };
    const moved = fieldsSapChanged(request);
    if (moved.length === 0) return { ok: true };
    return no(
      `MDR_SAP_CHANGED_FIRST: SAP changed ${moved.join(', ')} after this request was written. ` +
        'Withdraw it and propose again against the record as it stands',
    );
  });

  bindPolicyHook(POLICY_HOOKS.MDR_NOTE_AUTHORED, ({ payload }) =>
    text(payload.note) === '' ? no('MDR_NOTE_BLANK: this act is recorded with the reason for it') : { ok: true },
  );

  bindPolicyHook(POLICY_HOOKS.MDR_SAP_ANSWER_ADMISSIBLE, ({ payload }) => {
    if (text(payload.sapRequestNumber) === '') {
      return no('MDR_SAP_NUMBER_BLANK: an answer from SAP carries SAP\'s own request number');
    }
    if (payload.sample === true && moduleDeployment.isProduction()) {
      return no('MDR_SAMPLE_ANSWER_IN_PRODUCTION: a sample answer stands in for SAP on a demo, and is not recorded on production');
    }
    if (payload.sample !== true) {
      return no('MDR_SAP_NOT_CONNECTED: SAP is not connected, so only an answer marked as a sample can be recorded here');
    }
    return { ok: true };
  });

  const append = (r: MasterDataRequest, act: string, state: MdrState, by: ActorAttribution, note: string | null): MasterDataRequest => ({
    ...r,
    state,
    history: [...r.history, { act, at: DECLARED_PRESENT_INSTANT, by, note }],
  });

  return {
    readState: (id) => masterDataRequestStore.get(id)?.state ?? null,
    // A buyer document: a supplier scope names no request.
    readScopeOwner: () => null,
    readEntity: (id) => masterDataRequestStore.get(id) ?? null,
    creationOwner: () => null,
    create: (payload, toState, scope) => {
      const kind = payload.kind as MdrKind;
      if (!isMdrKind(kind)) throw new Error('masterDataRequest: unreachable — the kind is checked before creation');
      const { id, number } = masterDataRequestStore.nextNumber();
      const proposed = cleanProposed(payload.proposed);
      const subjectKey = text(payload.subjectKey) || null;
      const by = actorOf(scope);
      masterDataRequestStore.add({
        id,
        number,
        kind,
        subjectKey,
        proposed,
        reason: text(payload.reason),
        state: toState as MdrState,
        proposedBy: by,
        proposedAt: DECLARED_PRESENT_INSTANT,
        base: baseOf(kind, subjectKey, proposed),
        sap: null,
        history: [{ act: 't_mdr_propose', at: DECLARED_PRESENT_INSTANT, by, note: text(payload.reason) }],
      });
      return { entityId: id };
    },
    applyTransition: (id, toState, payload, scope, transitionId) => {
      const by = actorOf(scope);
      const act = typeof transitionId === 'string' ? transitionId : `→ ${toState}`;
      const note = text(payload.note) || null;
      masterDataRequestStore.update(id, (r) => {
        const next = append(r, act, toState as MdrState, by, note);
        if (toState !== 'Completed in SAP' && toState !== 'Declined by SAP') return next;
        const completed = toState === 'Completed in SAP';
        const resultKey = completed ? r.subjectKey ?? sampleKeyOf(r) : null;
        return {
          ...next,
          sap: {
            sapRequestNumber: text(payload.sapRequestNumber),
            resultKey,
            reason: completed ? null : note,
            sample: payload.sample === true,
          },
        };
      });
      const after = masterDataRequestStore.get(id);
      if (after?.state === 'Completed in SAP' && after.sap?.sample && after.sap.resultKey) {
        deliverSampleRecord(after, after.sap.resultKey);
      }
    },
  };
}
