// ─────────────────────────────────────────────────────────────────────────────
// FB-3 / FB-4 — A CHANGE TO A PROCESS, WALKED TO A STATE, for specs.
//
// Every state is reached THROUGH THE DISPATCHER, by the acts and the people the
// shipped rules accept: drafted and proposed by Compliance, approved by a
// different person, switched on, retired. Never a row written by hand — a state
// a spec invented is a state no rule was asked about.
//
// The change is the one the operator's walk uses: a Finance approval in front
// of approving a requisition.
// ─────────────────────────────────────────────────────────────────────────────
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { purchaseRequisitionStore } from '../services/data/mock/stores/purchaseRequisitionStore';
import type { CommandResult, QueryScope } from '../services/data/types';
import { emptyContent, type AddedStep, type FlowVersion, type FlowVersionContent } from '../services/flowBuilder/flowVersion';
import { stepKey } from '../services/flowBuilder/flowOverlay';
import { flowVersionStore } from '../services/flowBuilder/flowVersionStore';
import { getFlow } from '../services/transitions';

const commands = new MockCommandService();

/** A buyer seat that adopts the n-th sample person of a role, read off the roster. */
export function seatOf(role: string, ordinal = 1): QueryScope {
  const p = SAMPLE_PEOPLE.find((x) => x.role === role && x.ordinal === ordinal);
  if (!p) throw new Error(`no sample person ${role} ${ordinal}`);
  return {
    personaType: 'buyer',
    supplierId: null,
    businessRoles: [...p.roles],
    actor: { kind: 'RESOLVED', person: { personId: p.personId } },
  };
}

/** The same lane with nobody named. */
export const unnamedSeat = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
});

export const GATED_ENTITY = 'purchaseRequisition';
export const GATED_ACT = 't_pr_approve';
export const FINANCE_STEP = 's_approval_1';

export const financeApproval = (over: Partial<AddedStep> = {}): AddedStep => ({
  id: FINANCE_STEP,
  kind: 'approval',
  before: GATED_ACT,
  order: 1,
  lane: 'finance',
  label: { en: 'Finance approval', id: 'Persetujuan Keuangan' },
  instruction: {
    en: 'Check the budget line before the requisition is approved.',
    id: 'Periksa pos anggaran sebelum permintaan disetujui.',
  },
  differentFrom: [],
  ...over,
});

export const contentWith = (...steps: AddedStep[]): FlowVersionContent => ({
  ...emptyContent(GATED_ENTITY, getFlow(GATED_ENTITY)!.version),
  steps,
});

export const act = (
  scope: QueryScope,
  transitionId: string,
  entityId: string | undefined,
  payload: Record<string, unknown> = {},
  extra: { bypassReason?: string } = {},
): Promise<CommandResult> =>
  commands.dispatch(scope, { transitionId, entity: transitionId.startsWith('t_step_') ? 'processStep' : transitionId.startsWith('t_flowversion_') ? 'flowVersion' : GATED_ENTITY, entityId, payload, ...extra });

const must = (r: CommandResult, what: string): CommandResult => {
  if (r.status === 'failed') throw new Error(`${what} was refused: ${r.reason}`);
  return r;
};

export const VERSION_STATES_REACHED = ['Draft', 'In Review', 'Approved', 'Active', 'Retired', 'Rejected'] as const;

/**
 * A change, walked to `state`. Drafted and proposed by Compliance 1; decided
 * and switched by the Admin — a different person, so four eyes hold.
 */
export async function versionAt(
  state: (typeof VERSION_STATES_REACHED)[number],
  content: FlowVersionContent = contentWith(financeApproval()),
): Promise<FlowVersion> {
  const author = seatOf('compliance');
  const decider = seatOf('admin');
  const made = must(
    await act(author, 't_flowversion_create', undefined, { flow: content.entity, title: 'Finance approval above the threshold' }),
    'create',
  );
  const id = made.entityId!;
  must(await act(author, 't_flowversion_save', id, { content: { ...content, baseVersion: flowVersionStore.byId(id)!.content.baseVersion } }), 'save');
  const steps: readonly [string, QueryScope, string][] =
    state === 'Draft'
      ? []
      : state === 'Rejected'
        ? [['t_flowversion_propose', author, 'proposed for the walk'], ['t_flowversion_reject', decider, 'rejected for the walk']]
        : [
            ['t_flowversion_propose', author, 'proposed for the walk'],
            ['t_flowversion_approve', decider, 'approved for the walk'],
            ['t_flowversion_activate', decider, 'switched on for the walk'],
            ['t_flowversion_retire', decider, 'switched off for the walk'],
          ].slice(0, ['In Review', 'Approved', 'Active', 'Retired'].indexOf(state) + 1) as [string, QueryScope, string][];
  for (const [transitionId, scope, reason] of steps) must(await act(scope, transitionId, id, { reason }), transitionId);
  return flowVersionStore.byId(id)!;
}

/** A requisition resting where the gated act can be taken. */
export const pendingRequisition = (): string => {
  const pr = purchaseRequisitionStore.all().find((r) => r.status === 'Pending Approval');
  if (!pr) throw new Error('no requisition in Pending Approval — the walk would examine nothing');
  return pr.id;
};

/** The key of the Finance step on the pending requisition, with the change in force. */
export async function activeStepKey(): Promise<string> {
  await versionAt('Active');
  return stepKey(GATED_ENTITY, pendingRequisition(), FINANCE_STEP);
}
